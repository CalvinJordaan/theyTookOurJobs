import { useEffect, useRef } from 'react';
import type { BudgetSummary } from '@timekeeper/shared';
import styles from './BudgetMeter.module.css';

interface Props {
  budget: BudgetSummary;
}

export function BudgetMeter({ budget }: Props) {
  if (!budget.budget) {
    return (
      <div className={styles.meter} role="group" aria-label="Budget: no budget set">
        <div className={styles.label}>
          <span className={styles.consumed}>{budget.consumed.toFixed(2)} h</span>
          <span className={styles.budget}>No budget</span>
        </div>
      </div>
    );
  }

  const pct = Math.min(budget.percentage ?? 0, 100);
  const variant = budget.isOverBudget ? 'danger' : (pct >= 80 ? 'warning' : 'success');
  const label = budget.isOverBudget ? 'Over budget' : `${budget.percentage}%`;

  return (
    <div className={styles.meter}
         role="group"
         aria-label={`Budget: ${budget.consumed.toFixed(2)} of ${budget.budget.toFixed(2)} hours used`}>
      <div className={styles.label}>
        <span className={styles.consumed}>{budget.consumed.toFixed(2)} h</span>
        <span className={`${styles.pct} ${styles[variant]}`} aria-label={label}>{label}</span>
      </div>
      <div className={styles.bar}
           role="progressbar"
           aria-valuenow={pct}
           aria-valuemin={0}
           aria-valuemax={100}
           aria-label={`${pct}% of budget consumed`}>
        <BudgetFill pct={pct} variant={variant} />
      </div>
      <div className={styles.label}>
        <span className={styles.budget}>of {budget.budget.toFixed(2)} h budgeted</span>
      </div>
    </div>
  );
}

function BudgetFill({ pct, variant }: { pct: number; variant: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.style.setProperty('--fill-pct', `${pct}%`);
  }, [pct]);

  return <div ref={ref} className={`${styles.fill} ${styles[variant]}`} />;
}
