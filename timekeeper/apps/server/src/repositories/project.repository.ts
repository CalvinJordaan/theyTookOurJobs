import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

const include = { client: true } as const;
export type ProjectWithClient = Prisma.ProjectGetPayload<{ include: typeof include }>;

export const projectRepo = {
  findById(id: number) {
    return prisma.project.findUnique({ where: { id }, include });
  },

  findAll(activeOnly = true) {
    return prisma.project.findMany({
      where: activeOnly ? { isActive: true } : {},
      include,
      orderBy: [{ client: { name: 'asc' } }, { name: 'asc' }],
    });
  },

  findByUser(userId: number) {
    return prisma.project.findMany({
      where: {
        isActive: true,
        userAssignments: { some: { userId, isActive: true } },
      },
      include,
      orderBy: { name: 'asc' },
    });
  },

  findByClient(clientId: number) {
    return prisma.project.findMany({ where: { clientId, isActive: true }, include });
  },

  create(data: Prisma.ProjectUncheckedCreateInput) {
    return prisma.project.create({ data, include });
  },

  update(id: number, data: Prisma.ProjectUncheckedUpdateInput) {
    return prisma.project.update({ where: { id }, data, include });
  },
};
