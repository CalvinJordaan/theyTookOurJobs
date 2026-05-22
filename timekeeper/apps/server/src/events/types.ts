export interface DomainEvent<T = Record<string, unknown>> {
  id: string;
  name: string;
  occurredAt: string;
  actor: { userId: number };
  data: T;
}

export type TimerStartedEvent = DomainEvent<{ entryId: bigint; projectId: number; taskId: number }>;
export type TimerStoppedEvent = DomainEvent<{ entryId: bigint; hours: number }>;
export type TimeEntryCreatedEvent = DomainEvent<{ entryId: bigint; projectId: number; hours: number }>;
export type TimeEntryUpdatedEvent = DomainEvent<{ entryId: bigint; projectId: number }>;
export type TimeEntryDeletedEvent = DomainEvent<{ entryId: bigint; projectId: number }>;
export type BudgetThresholdCrossedEvent = DomainEvent<{
  projectId: number;
  consumed: number;
  budget: number;
  percentage: number;
}>;

export type AnyDomainEvent =
  | TimerStartedEvent
  | TimerStoppedEvent
  | TimeEntryCreatedEvent
  | TimeEntryUpdatedEvent
  | TimeEntryDeletedEvent
  | BudgetThresholdCrossedEvent;
