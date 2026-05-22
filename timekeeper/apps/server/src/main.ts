import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { handleMcpRequest } from './mcp/server.js';
import { authMiddleware } from './http/middleware/auth.js';
import { errorHandler } from './http/middleware/error-handler.js';
import { timeEntriesRouter } from './http/routes/time-entries.routes.js';
import { projectsRouter } from './http/routes/projects.routes.js';
import { clientsRouter } from './http/routes/clients.routes.js';
import { tasksRouter } from './http/routes/tasks.routes.js';
import { usersRouter } from './http/routes/users.routes.js';
import { reportsRouter } from './http/routes/reports.routes.js';
import { bus } from './events/bus.js';
import { handleBudgetThreshold } from './events/handlers/budget-alert.js';
import type { BudgetThresholdCrossedEvent } from './events/types.js';

// Register event handlers
bus.on<BudgetThresholdCrossedEvent>('budget.threshold_crossed', handleBudgetThreshold);

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// MCP endpoint — stateless Streamable HTTP (per session)
app.all('/mcp', async (req, res) => {
  await handleMcpRequest(req, res);
});

// Health check (no auth)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// REST API — all routes require auth
app.use('/api', authMiddleware as express.RequestHandler);
app.use('/api/time-entries', timeEntriesRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/users', usersRouter);
app.use('/api/reports', reportsRouter);

app.use(errorHandler as express.ErrorRequestHandler);

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'TimeKeeper server started');
  logger.info(`  MCP endpoint: http://localhost:${env.PORT}/mcp`);
  logger.info(`  REST API:     http://localhost:${env.PORT}/api`);
  logger.info(`  Health:       http://localhost:${env.PORT}/health`);
});
