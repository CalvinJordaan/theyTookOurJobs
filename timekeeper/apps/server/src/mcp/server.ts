import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Request, Response } from 'express';
import { parseBearerTokenMap } from '../config/env.js';
import { userRepo } from '../repositories/user.repository.js';
import { logger } from '../lib/logger.js';
import { registerTimeEntryTools } from './tools/time-entry.tools.js';
import { registerProjectTools } from './tools/project.tools.js';
import { registerReportTools } from './tools/report.tools.js';
import { registerResources } from './resources/index.js';

const tokenMap = parseBearerTokenMap();

export async function handleMcpRequest(req: Request, res: Response): Promise<void> {
  const authHeader = req.headers['authorization'] ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  const userId = token ? tokenMap.get(token) : undefined;
  if (!userId) {
    res.status(401).json({ error: { code: 'unauthorized', message: 'Invalid or missing bearer token' } });
    return;
  }

  const user = await userRepo.findById(userId);
  if (!user || !user.isActive) {
    res.status(401).json({ error: { code: 'unauthorized', message: 'User not found or inactive' } });
    return;
  }

  const actor = { id: user.id, accessRole: user.accessRole };

  const server = new McpServer({
    name: 'TimeKeeper',
    version: '0.1.0',
  });

  registerTimeEntryTools(server, actor);
  registerProjectTools(server, actor);
  registerReportTools(server, actor);
  registerResources(server, actor);

  // Ping tool for walking-skeleton verification (Story 1.1)
  server.tool('ping', {}, async () => ({
    content: [{ type: 'text', text: 'pong' }],
  }));

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);

  try {
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    logger.error({ err }, 'MCP request error');
    if (!res.headersSent) {
      res.status(500).json({ error: { code: 'internal', message: 'Internal server error' } });
    }
  }
}
