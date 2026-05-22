import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

export const userRepo = {
  findById(id: number) {
    return prisma.user.findUnique({ where: { id } });
  },

  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findAll(activeOnly = true) {
    return prisma.user.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  },

  create(data: Prisma.UserUncheckedCreateInput) {
    return prisma.user.create({ data });
  },

  update(id: number, data: Prisma.UserUncheckedUpdateInput) {
    return prisma.user.update({ where: { id }, data });
  },
};
