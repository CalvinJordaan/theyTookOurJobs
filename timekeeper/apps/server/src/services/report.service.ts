import { Decimal } from '../domain/decimal.js';
import type { TimeReportFilters } from '@timekeeper/shared';
import { timeEntryRepo } from '../repositories/time-entry.repository.js';
import { projectRepo } from '../repositories/project.repository.js';
import { userRepo } from '../repositories/user.repository.js';
import { assignmentRepo } from '../repositories/assignment.repository.js';
import { assertCan, type Actor } from './authz.js';
import { serializeTimeEntry } from './serializers.js';
import { toHours } from '../domain/decimal.js';

export const reportService = {
  async timeReport(actor: Actor, filters: TimeReportFilters) {
    const isAdmin = actor.accessRole === 'administrator';
    let userIds: number[] | undefined;

    if (!isAdmin) {
      // Members/PMs only see entries they're allowed to see
      await assertCan(actor, 'report:read');
      if (filters.userId && filters.userId !== actor.id && actor.accessRole !== 'project_manager') {
        await assertCan(actor, 'report:read:all');
      }
      if (!filters.userId) {
        userIds = [actor.id];
      }
    }

    const entries = await timeEntryRepo.findForReport(filters, userIds);
    const serialized = entries.map(serializeTimeEntry);

    const totalHours = serialized.reduce((sum, e) => sum + e.hours, 0);
    const billableHours = serialized.filter(e => e.billable).reduce((sum, e) => sum + e.hours, 0);

    return {
      entries: serialized,
      totalHours: Math.round(totalHours * 100) / 100,
      billableHours: Math.round(billableHours * 100) / 100,
      nonBillableHours: Math.round((totalHours - billableHours) * 100) / 100,
    };
  },

  async projectBudget(actor: Actor, projectId: number) {
    const project = await projectRepo.findById(projectId);
    if (!project) {
      const { notFound } = await import('../domain/errors.js');
      throw notFound('Project', projectId);
    }

    await assertCan(actor, 'project:budget:read', { projectId });

    const from = project.budgetIsMonthly
      ? new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      : undefined;

    const agg = await timeEntryRepo.sumHoursForProject(projectId, from);
    const consumed = toHours(agg._sum.hours ?? new Decimal(0));
    const budget = project.budget ? toHours(project.budget) : null;
    const percentage = budget ? Math.round((consumed / budget) * 100) : null;

    return {
      projectId,
      projectName: project.name,
      clientName: project.client.name,
      budget,
      consumed: Math.round(consumed * 100) / 100,
      percentage,
      isOverBudget: budget !== null && consumed > budget,
    };
  },

  async allProjectBudgets(actor: Actor) {
    await assertCan(actor, 'report:read');
    const projects = actor.accessRole === 'administrator'
      ? await projectRepo.findAll()
      : await projectRepo.findByUser(actor.id);

    const results = await Promise.all(
      projects.map(p => reportService.projectBudget(actor, p.id).catch(() => null))
    );
    return results.filter(Boolean);
  },

  async capacityReport(actor: Actor, weekStart: string) {
    await assertCan(actor, 'report:read');
    const from = new Date(weekStart);
    const to = new Date(from.getTime() + 6 * 86400000);

    const users = await userRepo.findAll();

    const rows = await Promise.all(users.map(async u => {
      const agg = await timeEntryRepo.sumHoursForProject(0, from, to);
      const entries = await timeEntryRepo.findByUser(u.id);
      const weekEntries = entries.filter(e => {
        const d = e.spentDate;
        return d >= from && d <= to;
      });
      const loggedHours = weekEntries.reduce((s, e) => s + toHours(e.hours), 0);
      const capacity = toHours(u.weeklyCapacity);
      return {
        userId: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        weeklyCapacity: capacity,
        loggedHours: Math.round(loggedHours * 100) / 100,
        percentage: capacity > 0 ? Math.round((loggedHours / capacity) * 100) : 0,
      };
    }));

    return rows;
  },
};
