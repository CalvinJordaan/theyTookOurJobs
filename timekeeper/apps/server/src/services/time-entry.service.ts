import { Decimal } from '../domain/decimal.js';
import type { CreateTimeEntryInput, UpdateTimeEntryInput } from '@timekeeper/shared';
import { notFound, approvalLocked } from '../domain/errors.js';
import { timeEntryRepo } from '../repositories/time-entry.repository.js';
import { assignmentRepo } from '../repositories/assignment.repository.js';
import { assertCan, type Actor } from './authz.js';
import { serializeTimeEntry } from './serializers.js';
import { bus } from '../events/bus.js';

export const timeEntryService = {
  async list(actor: Actor, filters: { date?: string; userId?: number }) {
    await assertCan(actor, 'time_entry:read');
    const userId = actor.accessRole === 'administrator' && filters.userId
      ? filters.userId
      : actor.id;
    const entries = await timeEntryRepo.findByUser(userId, filters.date);
    return entries.map(serializeTimeEntry);
  },

  async get(actor: Actor, id: bigint) {
    await assertCan(actor, 'time_entry:read');
    const entry = await timeEntryRepo.findById(id);
    if (!entry) throw notFound('TimeEntry', id);
    if (actor.accessRole !== 'administrator' && entry.userId !== actor.id) {
      await assertCan(actor, 'time_entry:read', { projectId: entry.projectId });
    }
    return serializeTimeEntry(entry);
  },

  async create(actor: Actor, input: CreateTimeEntryInput) {
    await assertCan(actor, 'time_entry:create', { projectId: input.projectId });

    const taskAssignment = await assignmentRepo.findTaskAssignment(input.projectId, input.taskId);
    const billable = input.billable ?? taskAssignment?.billable ?? true;

    const entry = await timeEntryRepo.create({
      userId: actor.id,
      projectId: input.projectId,
      taskId: input.taskId,
      spentDate: new Date(input.spentDate),
      hours: new Decimal(input.hours.toFixed(2)),
      notes: input.notes ?? null,
      billable,
    });

    bus.emit('time_entry.created', { userId: actor.id }, {
      entryId: entry.id,
      projectId: entry.projectId,
      hours: input.hours,
    });

    await checkBudgetThreshold(actor, entry.projectId);

    return serializeTimeEntry(entry);
  },

  async update(actor: Actor, id: bigint, input: UpdateTimeEntryInput) {
    const existing = await timeEntryRepo.findById(id);
    if (!existing) throw notFound('TimeEntry', id);
    await assertCan(actor, 'time_entry:update', { entryUserId: existing.userId });
    if (existing.approvalStatus === 'approved') throw approvalLocked();

    const entry = await timeEntryRepo.update(id, {
      ...(input.projectId ? { projectId: input.projectId } : {}),
      ...(input.taskId ? { taskId: input.taskId } : {}),
      ...(input.spentDate ? { spentDate: new Date(input.spentDate) } : {}),
      ...(input.hours !== undefined ? { hours: new Decimal(input.hours.toFixed(2)) } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.billable !== undefined ? { billable: input.billable } : {}),
    });

    bus.emit('time_entry.updated', { userId: actor.id }, { entryId: entry.id, projectId: entry.projectId });
    await checkBudgetThreshold(actor, entry.projectId);

    return serializeTimeEntry(entry);
  },

  async delete(actor: Actor, id: bigint) {
    const existing = await timeEntryRepo.findById(id);
    if (!existing) throw notFound('TimeEntry', id);
    await assertCan(actor, 'time_entry:delete', { entryUserId: existing.userId });
    if (existing.approvalStatus === 'approved') throw approvalLocked();

    await timeEntryRepo.delete(id);
    bus.emit('time_entry.deleted', { userId: actor.id }, { entryId: id, projectId: existing.projectId });
  },
};

async function checkBudgetThreshold(actor: Actor, projectId: number) {
  const { projectRepo } = await import('../repositories/project.repository.js');
  const project = await projectRepo.findById(projectId);
  if (!project?.budget) return;

  const from = project.budgetIsMonthly
    ? new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    : undefined;

  const agg = await timeEntryRepo.sumHoursForProject(projectId, from);
  const consumed = parseFloat((agg._sum.hours ?? new Decimal(0)).toString());
  const budget = parseFloat(project.budget.toString());
  const percentage = Math.round((consumed / budget) * 100);

  if (percentage >= project.overBudgetNotificationPercentage) {
    bus.emit('budget.threshold_crossed', { userId: actor.id }, {
      projectId,
      consumed,
      budget,
      percentage,
    });
  }
}
