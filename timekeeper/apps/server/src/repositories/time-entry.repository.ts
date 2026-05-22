import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import type { TimeReportFilters } from '@timekeeper/shared';

const include = {
  project: { include: { client: true } },
  task: true,
  user: true,
} as const;

export type TimeEntryWithRelations = Prisma.TimeEntryGetPayload<{ include: typeof include }>;

export const timeEntryRepo = {
  findById(id: bigint) {
    return prisma.timeEntry.findUnique({ where: { id }, include });
  },

  findByUser(userId: number, spentDate?: string) {
    return prisma.timeEntry.findMany({
      where: {
        userId,
        ...(spentDate ? { spentDate: new Date(spentDate) } : {}),
      },
      include,
      orderBy: [{ spentDate: 'desc' }, { createdAt: 'desc' }],
    });
  },

  findRunningForUser(userId: number) {
    return prisma.timeEntry.findFirst({ where: { userId, isRunning: true }, include });
  },

  findForReport(filters: TimeReportFilters, userIds?: number[]) {
    const where: Prisma.TimeEntryWhereInput = {
      spentDate: { gte: new Date(filters.from), lte: new Date(filters.to) },
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(userIds ? { userId: { in: userIds } } : {}),
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      ...(filters.taskId ? { taskId: filters.taskId } : {}),
      ...(filters.billable !== undefined ? { billable: filters.billable } : {}),
      ...(filters.clientId ? { project: { clientId: filters.clientId } } : {}),
    };
    return prisma.timeEntry.findMany({ where, include, orderBy: [{ spentDate: 'asc' }, { createdAt: 'asc' }] });
  },

  sumHoursForProject(projectId: number, from?: Date, to?: Date) {
    return prisma.timeEntry.aggregate({
      where: {
        projectId,
        ...(from ? { spentDate: { gte: from, ...(to ? { lte: to } : {}) } } : {}),
      },
      _sum: { hours: true },
    });
  },

  create(data: Prisma.TimeEntryUncheckedCreateInput) {
    return prisma.timeEntry.create({ data, include });
  },

  update(id: bigint, data: Prisma.TimeEntryUncheckedUpdateInput) {
    return prisma.timeEntry.update({ where: { id }, data, include });
  },

  delete(id: bigint) {
    return prisma.timeEntry.delete({ where: { id } });
  },
};
