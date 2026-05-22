import type { CreateClientInput } from '@timekeeper/shared';
import { notFound } from '../domain/errors.js';
import { clientRepo } from '../repositories/client.repository.js';
import { assertCan, type Actor } from './authz.js';
import { serializeClient } from './serializers.js';

export const clientService = {
  async list(actor: Actor) {
    await assertCan(actor, 'client:read');
    const clients = await clientRepo.findAll();
    return clients.map(serializeClient);
  },

  async get(actor: Actor, id: number) {
    await assertCan(actor, 'client:read');
    const client = await clientRepo.findById(id);
    if (!client) throw notFound('Client', id);
    return serializeClient(client);
  },

  async create(actor: Actor, input: CreateClientInput) {
    await assertCan(actor, 'client:write');
    const client = await clientRepo.create({ name: input.name });
    return serializeClient(client);
  },

  async update(actor: Actor, id: number, input: Partial<CreateClientInput & { isActive: boolean }>) {
    await assertCan(actor, 'client:write');
    const client = await clientRepo.update(id, {
      ...(input.name ? { name: input.name } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });
    return serializeClient(client);
  },
};
