import type { TimeEntry, Project, Task, User, Client, UserAssignment, TaskAssignment } from '@prisma/client';
import type { TimeEntryWithRelations } from '../repositories/time-entry.repository.js';
import type { ProjectWithClient } from '../repositories/project.repository.js';
import { toHours } from '../domain/decimal.js';
import { dateToIso } from '../lib/format.js';

export function serializeTimeEntry(e: TimeEntryWithRelations) {
  const elapsed = e.isRunning && e.timerStartedAt
    ? parseFloat(((Date.now() - e.timerStartedAt.getTime()) / 3600000).toFixed(2))
    : 0;
  return {
    id: Number(e.id),
    userId: e.userId,
    projectId: e.projectId,
    taskId: e.taskId,
    spentDate: dateToIso(e.spentDate)!,
    hours: toHours(e.hours) + (e.isRunning ? elapsed : 0),
    notes: e.notes,
    billable: e.billable,
    approvalStatus: e.approvalStatus,
    isRunning: e.isRunning,
    timerStartedAt: e.timerStartedAt?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    project: e.project ? {
      id: e.project.id,
      name: e.project.name,
      clientId: e.project.clientId,
      clientName: e.project.client.name,
    } : undefined,
    task: e.task ? { id: e.task.id, name: e.task.name } : undefined,
    user: e.user ? { id: e.user.id, firstName: e.user.firstName, lastName: e.user.lastName } : undefined,
  };
}

export function serializeProject(p: ProjectWithClient) {
  return {
    id: p.id,
    clientId: p.clientId,
    clientName: p.client.name,
    name: p.name,
    code: p.code,
    isActive: p.isActive,
    isBillable: p.isBillable,
    budget: p.budget ? toHours(p.budget) : null,
    budgetIsMonthly: p.budgetIsMonthly,
    overBudgetNotificationPercentage: p.overBudgetNotificationPercentage,
    showBudgetToAll: p.showBudgetToAll,
    startsOn: p.startsOn ? dateToIso(p.startsOn) : null,
    endsOn: p.endsOn ? dateToIso(p.endsOn) : null,
  };
}

export function serializeUser(u: User) {
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    isActive: u.isActive,
    weeklyCapacity: toHours(u.weeklyCapacity),
    isContractor: u.isContractor,
    accessRole: u.accessRole,
  };
}

export function serializeClient(c: Client) {
  return { id: c.id, name: c.name, isActive: c.isActive };
}

export function serializeTask(t: Task) {
  return { id: t.id, name: t.name, isActive: t.isActive, billableByDefault: t.billableByDefault };
}
