import { Decimal } from '../domain/decimal.js';
import type { StartTimerInput } from '@timekeeper/shared';
import { notFound, forbidden } from '../domain/errors.js';
import { timeEntryRepo } from '../repositories/time-entry.repository.js';
import { assignmentRepo } from '../repositories/assignment.repository.js';
import { assertCan, type Actor } from './authz.js';
import { serializeTimeEntry } from './serializers.js';
import { bus } from '../events/bus.js';
import { formatDate } from '../lib/format.js';

export const timerService = {
  async start(actor: Actor, input: StartTimerInput) {
    await assertCan(actor, 'timer:start', { projectId: input.projectId });

    // Stop any currently running timer first
    const running = await timeEntryRepo.findRunningForUser(actor.id);
    if (running) {
      await stopTimer(actor, running.id);
    }

    const taskAssignment = await assignmentRepo.findTaskAssignment(input.projectId, input.taskId);
    const billable = input.billable ?? taskAssignment?.billable ?? true;
    const now = new Date();

    const entry = await timeEntryRepo.create({
      userId: actor.id,
      projectId: input.projectId,
      taskId: input.taskId,
      spentDate: new Date(formatDate(now)),
      hours: new Decimal('0.00'),
      notes: input.notes ?? null,
      billable,
      isRunning: true,
      timerStartedAt: now,
    });

    bus.emit('timer.started', { userId: actor.id }, {
      entryId: entry.id,
      projectId: entry.projectId,
      taskId: entry.taskId,
    });

    return serializeTimeEntry(entry);
  },

  async stop(actor: Actor, entryId?: bigint) {
    await assertCan(actor, 'timer:stop');

    const entry = entryId
      ? await timeEntryRepo.findById(entryId)
      : await timeEntryRepo.findRunningForUser(actor.id);

    if (!entry) throw notFound('Running timer', entryId ?? 'current');
    if (!entry.isRunning) {
      throw forbidden('Timer is not running');
    }
    if (entry.userId !== actor.id && actor.accessRole !== 'administrator') {
      throw forbidden('You can only stop your own timer');
    }

    return stopTimer(actor, entry.id);
  },

  async getCurrent(actor: Actor) {
    const entry = await timeEntryRepo.findRunningForUser(actor.id);
    return entry ? serializeTimeEntry(entry) : null;
  },
};

async function stopTimer(actor: Actor, entryId: bigint) {
  const entry = await timeEntryRepo.findById(entryId);
  if (!entry || !entry.isRunning || !entry.timerStartedAt) return null;

  const elapsedMs = Date.now() - entry.timerStartedAt.getTime();
  const elapsedHours = elapsedMs / 3600000;
  const rounded = Math.max(0.01, Math.round(elapsedHours * 100) / 100);

  const updated = await timeEntryRepo.update(entryId, {
    hours: new Decimal(rounded.toFixed(2)),
    isRunning: false,
    timerStartedAt: null,
  });

  bus.emit('timer.stopped', { userId: actor.id }, { entryId, hours: rounded });

  return serializeTimeEntry(updated);
}
