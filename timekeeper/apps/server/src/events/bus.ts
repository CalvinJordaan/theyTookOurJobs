import { randomUUID } from 'crypto';
import type { AnyDomainEvent, DomainEvent } from './types.js';
import { logger } from '../lib/logger.js';

type Handler<T extends DomainEvent> = (event: T) => void | Promise<void>;

class EventBus {
  private readonly handlers = new Map<string, Handler<DomainEvent>[]>();

  on<T extends DomainEvent>(name: string, handler: Handler<T>): void {
    const existing = this.handlers.get(name) ?? [];
    existing.push(handler as Handler<DomainEvent>);
    this.handlers.set(name, existing);
  }

  emit<T extends AnyDomainEvent>(name: T['name'], actor: { userId: number }, data: T['data']): void {
    const event: DomainEvent = {
      id: randomUUID(),
      name,
      occurredAt: new Date().toISOString(),
      actor,
      data,
    };
    const handlers = this.handlers.get(name) ?? [];
    for (const h of handlers) {
      Promise.resolve(h(event)).catch(err =>
        logger.error({ err, event: name }, 'Event handler error')
      );
    }
    logger.debug({ event: name, actor: actor.userId }, 'Domain event emitted');
  }
}

export const bus = new EventBus();
