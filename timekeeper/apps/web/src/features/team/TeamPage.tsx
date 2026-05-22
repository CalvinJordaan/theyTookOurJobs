import { StatusPill } from '../../components/StatusPill/StatusPill';
import { useUsers } from '../../api/hooks';
import styles from './TeamPage.module.css';

const ROLE_LABELS: Record<string, string> = {
  administrator: 'Admin',
  project_manager: 'PM',
  member: 'Member',
};

export function TeamPage() {
  const { data: users = [], isLoading } = useUsers();

  if (isLoading) return <p>Loading team…</p>;

  return (
    <div className={styles.list}>
      {users.map(user => {
        const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();
        return (
          <article key={user.id} className={styles.card}>
            <div className={styles.avatar} aria-hidden="true">{initials}</div>
            <div className={styles.info}>
              <div className={styles.name}>{user.firstName} {user.lastName}</div>
              <div className={styles.email}>{user.email}</div>
            </div>
            <div className={styles.meta}>
              <span className={styles.capacity}>{user.weeklyCapacity} h/wk</span>
              <StatusPill
                variant="neutral"
                label={ROLE_LABELS[user.accessRole] ?? user.accessRole}
                showDot={false}
              />
              {!user.isActive && (
                <StatusPill variant="danger" label="Inactive" showDot={false} />
              )}
              {user.isContractor && (
                <StatusPill variant="warning" label="Contractor" showDot={false} />
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
