import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

export const taskRepo = {
  findById(id: number) {
    return prisma.task.findUnique({ where: { id } });
  },

  findAll(activeOnly = true) {
    return prisma.task.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { name: 'asc' },
    });
  },

  findForProject(projectId: number) {
    return prisma.task.findMany({
      where: {
        isActive: true,
        taskAssignments: { some: { projectId, isActive: true } },
      },
      orderBy: { name: 'asc' },
    });
  },

  create(data: Prisma.TaskUncheckedCreateInput) {
    return prisma.task.create({ data });
  },

  update(id: number, data: Prisma.TaskUncheckedUpdateInput) {
    return prisma.task.update({ where: { id }, data });
  },
};
