import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router';
import styles from './AppShell.module.css';

interface Props {
  children: ReactNode;
}

const NAV_ITEMS = [
  { to: '/today', label: 'Today', icon: TimerIcon },
  { to: '/week', label: 'Week', icon: GridIcon },
  { to: '/projects', label: 'Projects', icon: FolderIcon },
  { to: '/reports', label: 'Reports', icon: ChartIcon },
  { to: '/team', label: 'Team', icon: UsersIcon },
];

const PAGE_TITLES: Record<string, string> = {
  '/today': 'Today',
  '/week': 'Weekly Timesheet',
  '/projects': 'Projects',
  '/reports': 'Reports',
  '/team': 'Team',
};

export function AppShell({ children }: Props) {
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] ?? 'TimeKeeper';

  return (
    <div className={styles.shell}>
      <nav className={styles.rail} aria-label="Main navigation">
        <div className={styles.logo}>
          <div className={styles.logoMark} aria-hidden="true">TK</div>
          <span className={styles.logoText}>TimeKeeper</span>
        </div>
        <div className={styles.nav}>
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `${styles.navItem}${isActive ? ` ${styles.active}` : ''}`
              }
            >
              <Icon className={styles.navIcon} aria-hidden="true" />
              <span className={styles.navLabel}>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
      <div className={styles.main}>
        <header className={styles.topBar}>
          <h1 className={styles.topBarTitle}>{title}</h1>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}

function TimerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="9" cy="10" r="6" />
      <path d="M9 7v3l2 1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 1h4M9 1v2" strokeLinecap="round" />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="2" y="2" width="6" height="6" rx="1" />
      <rect x="10" y="2" width="6" height="6" rx="1" />
      <rect x="2" y="10" width="6" height="6" rx="1" />
      <rect x="10" y="10" width="6" height="6" rx="1" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M2 4a1 1 0 011-1h4l2 2h6a1 1 0 011 1v7a1 1 0 01-1 1H3a1 1 0 01-1-1V4z" strokeLinejoin="round" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M2 14h14M4 14V9M8 14V6M12 14V3" strokeLinecap="round" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="7" cy="6" r="3" />
      <path d="M1 16c0-3 2.7-5 6-5s6 2 6 5" strokeLinecap="round" />
      <path d="M13 3c1.7 0 3 1.3 3 3s-1.3 3-3 3M17 16c0-2-1.3-4-4-4" strokeLinecap="round" />
    </svg>
  );
}
