import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

export const assignmentRepo = {
  findUserAssignment(projectId: number, userId: number) {
    return prisma.userAssignment.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
  },

  findTaskAssignment(projectId: number, taskId: number) {
    return prisma.taskAssignment.findUnique({
      where: { projectId_taskId: { projectId, taskId } },
    });
  },

  findUserAssignmentsForUser(userId: number) {
    return prisma.userAssignment.findMany({
      where: { userId, isActive: true },
      include: { project: { include: { client: true } } },
    });
  },

  findUserAssignmentsForProject(projectId: number) {
    return prisma.userAssignment.findMany({
      where: { projectId, isActive: true },
      include: { user: true },
    });
  },

  findTaskAssignmentsForProject(projectId: number) {
    return prisma.taskAssignment.findMany({
      where: { projectId, isActive: true },
      include: { task: true },
    });
  },

  createUserAssignment(data: Prisma.UserAssignmentUncheckedCreateInput) {
    return prisma.userAssignment.create({ data });
  },

  createTaskAssignment(data: Prisma.TaskAssignmentUncheckedCreateInput) {
    return prisma.taskAssignment.create({ data });
  },

  updateUserAssignment(id: number, data: Prisma.UserAssignmentUncheckedUpdateInput) {
    return prisma.userAssignment.update({ where: { id }, data });
  },

  updateTaskAssignment(id: number, data: Prisma.TaskAssignmentUncheckedUpdateInput) {
    return prisma.taskAssignment.update({ where: { id }, data });
  },
};
