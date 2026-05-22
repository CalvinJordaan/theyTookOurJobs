import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

export const clientRepo = {
  findById(id: number) {
    return prisma.client.findUnique({ where: { id } });
  },

  findAll(activeOnly = true) {
    return prisma.client.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { name: 'asc' },
    });
  },

  create(data: Prisma.ClientUncheckedCreateInput) {
    return prisma.client.create({ data });
  },

  update(id: number, data: Prisma.ClientUncheckedUpdateInput) {
    return prisma.client.update({ where: { id }, data });
  },
};
