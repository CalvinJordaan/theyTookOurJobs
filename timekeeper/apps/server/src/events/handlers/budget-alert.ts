import type { BudgetThresholdCrossedEvent } from '../types.js';
import { logger } from '../../lib/logger.js';

// Per-project set of already-fired thresholds — re-arms if budget drops then rises again.
const fired = new Map<number, number>();

export function handleBudgetThreshold(event: BudgetThresholdCrossedEvent): void {
  const { projectId, percentage, budget, consumed } = event.data;
  const lastFiredAt = fired.get(projectId) ?? 0;

  // Single-fire per crossing: only alert if we haven't already fired for this threshold level
  if (percentage >= 100 && lastFiredAt < 100) {
    fired.set(projectId, percentage);
    logger.warn({ projectId, consumed, budget }, 'BUDGET ALERT: project is over budget (100%)');
  } else if (percentage >= 80 && lastFiredAt < 80) {
    fired.set(projectId, percentage);
    logger.warn({ projectId, consumed, budget, percentage }, 'BUDGET ALERT: project nearing budget (≥80%)');
  }
}

export function resetBudgetAlert(projectId: number): void {
  fired.delete(projectId);
}
