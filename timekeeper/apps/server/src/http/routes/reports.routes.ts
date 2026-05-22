import { Router } from 'express';
import { reportService } from '../../services/report.service.js';
import { TimeReportFiltersSchema } from '@timekeeper/shared';
import { AppError } from '../../domain/errors.js';
import { z } from 'zod';

export const reportsRouter: Router = Router();

reportsRouter.get('/time', async (req, res, next) => {
  try {
    const filters = TimeReportFiltersSchema.parse({
      from: req.query['from'],
      to: req.query['to'],
      userId: req.query['user_id'] ? parseInt(req.query['user_id'] as string, 10) : undefined,
      projectId: req.query['project_id'] ? parseInt(req.query['project_id'] as string, 10) : undefined,
      clientId: req.query['client_id'] ? parseInt(req.query['client_id'] as string, 10) : undefined,
      taskId: req.query['task_id'] ? parseInt(req.query['task_id'] as string, 10) : undefined,
      billable: req.query['billable'] === 'true' ? true : req.query['billable'] === 'false' ? false : undefined,
    });
    const report = await reportService.timeReport(req.actor, filters);
    res.json(report);
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new AppError('validation', err.errors[0]?.message ?? 'Validation error'));
    } else { next(err); }
  }
});

reportsRouter.get('/budgets', async (req, res, next) => {
  try {
    const budgets = await reportService.allProjectBudgets(req.actor);
    res.json(budgets);
  } catch (err) { next(err); }
});

reportsRouter.get('/capacity', async (req, res, next) => {
  try {
    const weekStart = typeof req.query['week_start'] === 'string'
      ? req.query['week_start']
      : new Date().toISOString().split('T')[0]!;
    const rows = await reportService.capacityReport(req.actor, weekStart);
    res.json(rows);
  } catch (err) { next(err); }
});
