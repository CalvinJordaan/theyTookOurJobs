import type { CreateTaskInput } from '@timekeeper/shared';
import { notFound } from '../domain/errors.js';
import { taskRepo } from '../repositories/task.repository.js';
import { assertCan, type Actor } from './authz.js';
import { serializeTask } from './serializers.js';

export const taskService = {
  async list(actor: Actor, projectId?: number) {
    await assertCan(actor, 'task:read');
    const tasks = projectId
      ? await taskRepo.findForProject(projectId)
      : await taskRepo.findAll();
    return tasks.map(serializeTask);
  },

  async get(actor: Actor, id: number) {
    await assertCan(actor, 'task:read');
    const task = await taskRepo.findById(id);
    if (!task) throw notFound('Task', id);
    return serializeTask(task);
  },

  async create(actor: Actor, input: CreateTaskInput) {
    await assertCan(actor, 'task:write');
    const task = await taskRepo.create({ name: input.name, billableByDefault: input.billableByDefault ?? true });
    return serializeTask(task);
  },

  async update(actor: Actor, id: number, input: Partial<CreateTaskInput & { isActive: boolean }>) {
    await assertCan(actor, 'task:write');
    const task = await taskRepo.update(id, {
      ...(input.name ? { name: input.name } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });
    return serializeTask(task);
  },
};
