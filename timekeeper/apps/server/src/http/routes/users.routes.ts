import { Router } from 'express';
import { userService } from '../../services/user.service.js';

export const usersRouter: Router = Router();

usersRouter.get('/me', async (req, res, next) => {
  try {
    const user = await userService.me(req.actor);
    res.json(user);
  } catch (err) { next(err); }
});

usersRouter.get('/', async (req, res, next) => {
  try {
    const users = await userService.list(req.actor);
    res.json(users);
  } catch (err) { next(err); }
});

usersRouter.get('/:id', async (req, res, next) => {
  try {
    const user = await userService.get(req.actor, parseInt(req.params['id']!, 10));
    res.json(user);
  } catch (err) { next(err); }
});

usersRouter.post('/', async (req, res, next) => {
  try {
    const user = await userService.create(req.actor, req.body);
    res.status(201).json(user);
  } catch (err) { next(err); }
});
