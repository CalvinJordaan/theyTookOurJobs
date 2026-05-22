import type { CreateUserInput } from '@timekeeper/shared';
import { notFound } from '../domain/errors.js';
import { userRepo } from '../repositories/user.repository.js';
import { assertCan, type Actor } from './authz.js';
import { serializeUser } from './serializers.js';
import { Decimal } from '../domain/decimal.js';

export const userService = {
  async list(actor: Actor) {
    await assertCan(actor, 'user:read');
    const users = await userRepo.findAll();
    return users.map(serializeUser);
  },

  async get(actor: Actor, id: number) {
    await assertCan(actor, 'user:read');
    const user = await userRepo.findById(id);
    if (!user) throw notFound('User', id);
    return serializeUser(user);
  },

  async me(actor: Actor) {
    const user = await userRepo.findById(actor.id);
    if (!user) throw notFound('User', actor.id);
    return serializeUser(user);
  },

  async create(actor: Actor, input: CreateUserInput) {
    await assertCan(actor, 'user:write');
    const user = await userRepo.create({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      weeklyCapacity: new Decimal((input.weeklyCapacity ?? 40).toFixed(2)),
      isContractor: input.isContractor ?? false,
      accessRole: input.accessRole ?? 'member',
    });
    return serializeUser(user);
  },

  async update(actor: Actor, id: number, input: Partial<CreateUserInput & { isActive: boolean }>) {
    await assertCan(actor, 'user:write');
    const user = await userRepo.update(id, {
      ...(input.firstName ? { firstName: input.firstName } : {}),
      ...(input.lastName ? { lastName: input.lastName } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });
    return serializeUser(user);
  },
};
