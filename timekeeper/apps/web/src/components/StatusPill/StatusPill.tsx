import styles from './StatusPill.module.css';

type StatusVariant = 'running' | 'success' | 'warning' | 'danger' | 'neutral';

interface Props {
  variant: StatusVariant;
  label: string;
  showDot?: boolean;
}

export function StatusPill({ variant, label, showDot = true }: Props) {
  return (
    <span className={`${styles.pill} ${styles[variant]}`} role="status">
      {showDot && <span className={styles.dot} aria-hidden="true" />}
      {label}
    </span>
  );
}
