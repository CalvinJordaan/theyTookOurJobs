import { useState } from 'react';
import { Button } from '../../components/Button/Button';
import { StatusPill } from '../../components/StatusPill/StatusPill';
import { useTimeReport, useCapacityReport, useProjects, useClients } from '../../api/hooks';
import { getMonday, formatDate } from '../../lib/format';
import styles from './ReportsPage.module.css';

type Tab = 'time' | 'capacity';

export function ReportsPage() {
  const [tab, setTab] = useState<Tab>('time');

  return (
    <div>
      <div className={styles.tabs} role="tablist">
        <button
          role="tab"
          className={`${styles.tab}${tab === 'time' ? ` ${styles.active}` : ''}`}
          onClick={() => setTab('time')}
          aria-selected={tab === 'time'}
        >
          Time
        </button>
        <button
          role="tab"
          className={`${styles.tab}${tab === 'capacity' ? ` ${styles.active}` : ''}`}
          onClick={() => setTab('capacity')}
          aria-selected={tab === 'capacity'}
        >
          Capacity
        </button>
      </div>
      {tab === 'time' ? <TimeReport /> : <CapacityReport />}
    </div>
  );
}

function TimeReport() {
  const today = formatDate(new Date());
  const [from, setFrom] = useState(() => getMonday());
  const [to, setTo] = useState(today);
  const [projectId, setProjectId] = useState<number | undefined>();
  const [clientId, setClientId] = useState<number | undefined>();

  const { data: projects = [] } = useProjects();
  const { data: clients = [] } = useClients();
  const { data: report, isLoading } = useTimeReport({ from, to, projectId, clientId });

  const exportCsv = () => {
    if (!report) return;
    const rows = [
      ['Date', 'User', 'Project', 'Client', 'Task', 'Hours', 'Billable', 'Notes'],
      ...report.entries.map(e => [
        e.spentDate,
        `${e.user?.firstName ?? ''} ${e.user?.lastName ?? ''}`.trim(),
        e.project?.name ?? '',
        e.project?.clientName ?? '',
        e.task?.name ?? '',
        e.hours.toFixed(2),
        e.billable ? 'Yes' : 'No',
        e.notes ?? '',
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timekeeper-report-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className={styles.filters}>
        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="rpt-from">From</label>
          <input id="rpt-from" type="date" className={styles.input}
                 value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="rpt-to">To</label>
          <input id="rpt-to" type="date" className={styles.input}
                 value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="rpt-project">Project</label>
          <select id="rpt-project" className={styles.select}
                  value={projectId ?? ''}
                  onChange={e => setProjectId(e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">All projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="rpt-client">Client</label>
          <select id="rpt-client" className={styles.select}
                  value={clientId ?? ''}
                  onChange={e => setClientId(e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">All clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <Button variant="secondary" size="sm" className={styles.exportBtn} onClick={exportCsv}
                disabled={!report?.entries.length}>
          Export CSV
        </Button>
      </div>

      {report && (
        <div className={styles.summary} role="region" aria-label="Report summary">
          <div className={styles.summaryItem}>
            <span className={styles.summaryValue}>{report.totalHours.toFixed(2)}</span>
            <span className={styles.summaryLabel}>Total hours</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryValue}>{report.billableHours.toFixed(2)}</span>
            <span className={styles.summaryLabel}>Billable</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryValue}>{report.nonBillableHours.toFixed(2)}</span>
            <span className={styles.summaryLabel}>Non-billable</span>
          </div>
        </div>
      )}

      {isLoading && <p className={styles.empty}>Loading…</p>}

      {!isLoading && report && report.entries.length === 0 && (
        <p className={styles.empty}>No time tracked for these filters.</p>
      )}

      {!isLoading && report && report.entries.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">User</th>
              <th scope="col">Project</th>
              <th scope="col">Task</th>
              <th scope="col">Notes</th>
              <th scope="col">Billable</th>
              <th scope="col">Hours</th>
            </tr>
          </thead>
          <tbody>
            {report.entries.map(entry => (
              <tr key={entry.id}>
                <td>{entry.spentDate}</td>
                <td>{entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : '—'}</td>
                <td>{entry.project?.name ?? '—'}</td>
                <td>{entry.task?.name ?? '—'}</td>
                <td>{entry.notes ?? <span aria-hidden="true">—</span>}</td>
                <td>
                  <StatusPill
                    variant={entry.billable ? 'success' : 'neutral'}
                    label={entry.billable ? 'Yes' : 'No'}
                    showDot={false}
                  />
                </td>
                <td className={styles.hours}>{entry.hours.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className={styles.totalRow}>
              <td colSpan={6}>Total</td>
              <td className={styles.hours}>{report.totalHours.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </>
  );
}

function CapacityReport() {
  const weekStart = getMonday();
  const { data: rows = [], isLoading } = useCapacityReport(weekStart);

  return (
    <>
      <p>Week of {weekStart}</p>
      {isLoading && <p className={styles.empty}>Loading…</p>}
      {!isLoading && rows.length === 0 && <p className={styles.empty}>No data.</p>}
      {!isLoading && rows.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">User</th>
              <th scope="col">Capacity</th>
              <th scope="col">Logged</th>
              <th scope="col">%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.userId}>
                <td>{row.firstName} {row.lastName}</td>
                <td className={styles.hours}>{row.weeklyCapacity.toFixed(2)} h</td>
                <td className={styles.hours}>{row.loggedHours.toFixed(2)} h</td>
                <td className={styles.hours}>{row.percentage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
