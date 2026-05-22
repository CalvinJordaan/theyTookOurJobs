import { Router } from 'express';
import { z } from 'zod';
import { timeEntryService } from '../../services/time-entry.service.js';
import { timerService } from '../../services/timer.service.js';
import { CreateTimeEntrySchema, UpdateTimeEntrySchema, StartTimerSchema } from '@timekeeper/shared';
import { AppError } from '../../domain/errors.js';

export const timeEntriesRouter: Router = Router();

timeEntriesRouter.get('/', async (req, res, next) => {
  try {
    const date = typeof req.query['date'] === 'string' ? req.query['date'] : undefined;
    const userId = typeof req.query['user_id'] === 'string' ? parseInt(req.query['user_id'], 10) : undefined;
    const entries = await timeEntryService.list(req.actor, { date, userId });
    res.json(entries);
  } catch (err) { next(err); }
});

timeEntriesRouter.get('/:id', async (req, res, next) => {
  try {
    const entry = await timeEntryService.get(req.actor, BigInt(req.params['id']!));
    res.json(entry);
  } catch (err) { next(err); }
});

timeEntriesRouter.post('/', async (req, res, next) => {
  try {
    const input = CreateTimeEntrySchema.parse(req.body);
    const entry = await timeEntryService.create(req.actor, input);
    res.status(201).json(entry);
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new AppError('validation', err.errors[0]?.message ?? 'Validation error'));
    } else { next(err); }
  }
});

timeEntriesRouter.patch('/:id', async (req, res, next) => {
  try {
    const input = UpdateTimeEntrySchema.parse(req.body);
    const entry = await timeEntryService.update(req.actor, BigInt(req.params['id']!), input);
    res.json(entry);
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new AppError('validation', err.errors[0]?.message ?? 'Validation error'));
    } else { next(err); }
  }
});

timeEntriesRouter.delete('/:id', async (req, res, next) => {
  try {
    await timeEntryService.delete(req.actor, BigInt(req.params['id']!));
    res.status(204).end();
  } catch (err) { next(err); }
});

// Timer sub-routes
timeEntriesRouter.post('/timer/start', async (req, res, next) => {
  try {
    const input = StartTimerSchema.parse(req.body);
    const entry = await timerService.start(req.actor, input);
    res.status(201).json(entry);
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new AppError('validation', err.errors[0]?.message ?? 'Validation error'));
    } else { next(err); }
  }
});

timeEntriesRouter.post('/timer/stop', async (req, res, next) => {
  try {
    const entry = await timerService.stop(req.actor);
    res.json(entry);
  } catch (err) { next(err); }
});

timeEntriesRouter.get('/timer/running', async (req, res, next) => {
  try {
    const entry = await timerService.getCurrent(req.actor);
    res.json(entry);
  } catch (err) { next(err); }
});
