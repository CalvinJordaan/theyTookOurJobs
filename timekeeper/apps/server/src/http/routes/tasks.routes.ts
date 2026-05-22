import { Router } from 'express';
import { taskService } from '../../services/task.service.js';

export const tasksRouter: Router = Router();

tasksRouter.get('/', async (req, res, next) => {
  try {
    const projectId = typeof req.query['project_id'] === 'string'
      ? parseInt(req.query['project_id'], 10) : undefined;
    const tasks = await taskService.list(req.actor, projectId);
    res.json(tasks);
  } catch (err) { next(err); }
});

tasksRouter.get('/:id', async (req, res, next) => {
  try {
    const task = await taskService.get(req.actor, parseInt(req.params['id']!, 10));
    res.json(task);
  } catch (err) { next(err); }
});

tasksRouter.post('/', async (req, res, next) => {
  try {
    const task = await taskService.create(req.actor, req.body);
    res.status(201).json(task);
  } catch (err) { next(err); }
});
