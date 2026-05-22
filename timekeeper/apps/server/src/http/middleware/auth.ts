import type { Request, Response, NextFunction } from 'express';
import { parseBearerTokenMap } from '../../config/env.js';
import { userRepo } from '../../repositories/user.repository.js';
import type { Actor } from '../../services/authz.js';

const tokenMap = parseBearerTokenMap();

declare global {
  namespace Express {
    interface Request {
      actor: Actor;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
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

  req.actor = { id: user.id, accessRole: user.accessRole };
  next();
}
