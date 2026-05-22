import type { CreateProjectInput } from '@timekeeper/shared';
import { notFound } from '../domain/errors.js';
import { projectRepo } from '../repositories/project.repository.js';
import { assertCan, type Actor } from './authz.js';
import { serializeProject } from './serializers.js';
import { Decimal } from '../domain/decimal.js';

export const projectService = {
  async list(actor: Actor) {
    await assertCan(actor, 'project:read');
    const projects = actor.accessRole === 'administrator'
      ? await projectRepo.findAll()
      : await projectRepo.findByUser(actor.id);
    return projects.map(serializeProject);
  },

  async get(actor: Actor, id: number) {
    await assertCan(actor, 'project:read');
    const project = await projectRepo.findById(id);
    if (!project) throw notFound('Project', id);
    return serializeProject(project);
  },

  async create(actor: Actor, input: CreateProjectInput) {
    await assertCan(actor, 'project:write');
    const project = await projectRepo.create({
      clientId: input.clientId,
      name: input.name,
      code: input.code ?? null,
      isBillable: input.isBillable ?? true,
      budget: input.budget ? new Decimal(input.budget.toFixed(2)) : null,
      budgetIsMonthly: input.budgetIsMonthly ?? false,
      overBudgetNotificationPercentage: input.overBudgetNotificationPercentage ?? 80,
      showBudgetToAll: input.showBudgetToAll ?? false,
      startsOn: input.startsOn ? new Date(input.startsOn) : null,
      endsOn: input.endsOn ? new Date(input.endsOn) : null,
    });
    return serializeProject(project);
  },

  async update(actor: Actor, id: number, input: Partial<CreateProjectInput>) {
    await assertCan(actor, 'project:write');
    const existing = await projectRepo.findById(id);
    if (!existing) throw notFound('Project', id);
    const project = await projectRepo.update(id, {
      ...(input.name ? { name: input.name } : {}),
      ...(input.code !== undefined ? { code: input.code } : {}),
      ...(input.isBillable !== undefined ? { isBillable: input.isBillable } : {}),
      ...(input.budget !== undefined ? { budget: input.budget ? new Decimal(input.budget.toFixed(2)) : null } : {}),
    });
    return serializeProject(project);
  },

  async archive(actor: Actor, id: number) {
    await assertCan(actor, 'project:write');
    const project = await projectRepo.update(id, { isActive: false });
    return serializeProject(project);
  },
};
