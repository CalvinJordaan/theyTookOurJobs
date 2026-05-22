import { Router } from 'express';
import { clientService } from '../../services/client.service.js';

export const clientsRouter: Router = Router();

clientsRouter.get('/', async (req, res, next) => {
  try {
    const clients = await clientService.list(req.actor);
    res.json(clients);
  } catch (err) { next(err); }
});

clientsRouter.get('/:id', async (req, res, next) => {
  try {
    const client = await clientService.get(req.actor, parseInt(req.params['id']!, 10));
    res.json(client);
  } catch (err) { next(err); }
});

clientsRouter.post('/', async (req, res, next) => {
  try {
    const client = await clientService.create(req.actor, req.body);
    res.status(201).json(client);
  } catch (err) { next(err); }
});

clientsRouter.patch('/:id', async (req, res, next) => {
  try {
    const client = await clientService.update(req.actor, parseInt(req.params['id']!, 10), req.body);
    res.json(client);
  } catch (err) { next(err); }
});
