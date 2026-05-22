import { Router } from 'express';
import { projectService } from '../../services/project.service.js';
import { reportService } from '../../services/report.service.js';
import { taskService } from '../../services/task.service.js';
import { assignmentRepo } from '../../repositories/assignment.repository.js';

export const projectsRouter: Router = Router();

projectsRouter.get('/', async (req, res, next) => {
  try {
    const projects = await projectService.list(req.actor);
    res.json(projects);
  } catch (err) { next(err); }
});

projectsRouter.get('/:id', async (req, res, next) => {
  try {
    const project = await projectService.get(req.actor, parseInt(req.params['id']!, 10));
    res.json(project);
  } catch (err) { next(err); }
});

projectsRouter.get('/:id/budget', async (req, res, next) => {
  try {
    const budget = await reportService.projectBudget(req.actor, parseInt(req.params['id']!, 10));
    res.json(budget);
  } catch (err) { next(err); }
});

projectsRouter.get('/:id/tasks', async (req, res, next) => {
  try {
    const tasks = await taskService.list(req.actor, parseInt(req.params['id']!, 10));
    res.json(tasks);
  } catch (err) { next(err); }
});

projectsRouter.post('/', async (req, res, next) => {
  try {
    const project = await projectService.create(req.actor, req.body);
    res.status(201).json(project);
  } catch (err) { next(err); }
});

projectsRouter.patch('/:id', async (req, res, next) => {
  try {
    const project = await projectService.update(req.actor, parseInt(req.params['id']!, 10), req.body);
    res.json(project);
  } catch (err) { next(err); }
});

projectsRouter.delete('/:id/archive', async (req, res, next) => {
  try {
    const project = await projectService.archive(req.actor, parseInt(req.params['id']!, 10));
    res.json(project);
  } catch (err) { next(err); }
});
