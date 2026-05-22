import type { User } from '@prisma/client';
import { forbidden } from '../domain/errors.js';
import { assignmentRepo } from '../repositories/assignment.repository.js';

export type Actor = Pick<User, 'id' | 'accessRole'>;

export type Action =
  | 'time_entry:create'
  | 'time_entry:read'
  | 'time_entry:update'
  | 'time_entry:delete'
  | 'timer:start'
  | 'timer:stop'
  | 'project:read'
  | 'project:write'
  | 'project:budget:read'
  | 'client:read'
  | 'client:write'
  | 'task:read'
  | 'task:write'
  | 'user:read'
  | 'user:write'
  | 'assignment:write'
  | 'report:read'
  | 'report:read:all'
  | 'timesheet:submit'
  | 'timesheet:approve';

export async function assertCan(
  actor: Actor,
  action: Action,
  context?: { projectId?: number; targetUserId?: number; entryUserId?: number }
): Promise<void> {
  const isAdmin = actor.accessRole === 'administrator';

  if (isAdmin) return; // Admins can do anything

  const isPM = actor.accessRole === 'project_manager';

  switch (action) {
    case 'project:write':
    case 'client:write':
    case 'task:write':
    case 'user:write':
    case 'assignment:write':
    case 'report:read:all':
      throw forbidden(`Only administrators can perform this action`);

    case 'timesheet:approve':
      if (!isPM) throw forbidden('Only administrators and project managers can approve timesheets');
      if (context?.projectId) {
        const assignment = await assignmentRepo.findUserAssignment(context.projectId, actor.id);
        if (!assignment?.isProjectManager) {
          throw forbidden('You are not a project manager for this project');
        }
      }
      return;

    case 'project:budget:read': {
      if (isPM) return;
      if (context?.projectId) {
        const { prisma } = await import('../repositories/prisma.js');
        const project = await prisma.project.findUnique({ where: { id: context.projectId } });
        if (project?.showBudgetToAll) return;
      }
      throw forbidden('You do not have permission to view budget data');
    }

    case 'time_entry:create':
    case 'timer:start': {
      if (context?.projectId) {
        const assignment = await assignmentRepo.findUserAssignment(context.projectId, actor.id);
        if (!assignment?.isActive) {
          throw forbidden('You are not assigned to this project');
        }
      }
      return;
    }

    case 'time_entry:update':
    case 'time_entry:delete': {
      if (context?.entryUserId !== undefined && context.entryUserId !== actor.id) {
        throw forbidden('You can only modify your own time entries');
      }
      return;
    }

    case 'time_entry:read':
    case 'project:read':
    case 'client:read':
    case 'task:read':
    case 'user:read':
    case 'report:read':
    case 'timer:stop':
    case 'timesheet:submit':
      return; // All authenticated users can read basic resources

    default:
      throw forbidden('Action not permitted');
  }
}
