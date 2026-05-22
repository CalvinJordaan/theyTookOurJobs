import { useState, useCallback } from 'react';
import { Button } from '../../components/Button/Button';
import { useProjects, useTimeEntries, useCreateTimeEntry, useUpdateTimeEntry } from '../../api/hooks';
import { getWeekDates, getMonday, DAY_LABELS, formatDate } from '../../lib/format';
import type { Project } from '@timekeeper/shared';
import styles from './WeeklyGrid.module.css';

export function WeeklyGrid() {
  const [weekStart, setWeekStart] = useState(() => getMonday());
  const weekDates = getWeekDates(new Date(weekStart));
  const today = formatDate(new Date());

  const { data: projects = [] } = useProjects();
  const createEntry = useCreateTimeEntry();
  const updateEntry = useUpdateTimeEntry();

  // Fetch entries for each day of the week
  const entriesByDate: Record<string, { id: number; hours: number; projectId: number; taskId: number; approvalStatus: string }[]> = {};
  weekDates.forEach(date => {
    // We'll load all entries and filter client-side
  });

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(getMonday(d));
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(getMonday(d));
  };

  return (
    <div>
      <div className={styles.header}>
        <span className={styles.weekLabel}>
          Week of {weekStart}
        </span>
        <div className={styles.navBtns}>
          <Button variant="ghost" size="sm" onClick={prevWeek} aria-label="Previous week">‹ Prev</Button>
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(getMonday())} aria-label="Go to current week">Today</Button>
          <Button variant="ghost" size="sm" onClick={nextWeek} aria-label="Next week">Next ›</Button>
        </div>
      </div>
      <WeekGrid
        weekDates={weekDates}
        projects={projects}
        today={today}
      />
    </div>
  );
}

function WeekGrid({ weekDates, projects, today }: {
  weekDates: string[];
  projects: Project[];
  today: string;
}) {
  const createEntry = useCreateTimeEntry();
  const updateEntry = useUpdateTimeEntry();

  // Load entries for the whole week range
  const { data: allEntries = [] } = useTimeEntries();

  const weekEntries = allEntries.filter(e =>
    weekDates.includes(e.spentDate)
  );

  // Build a lookup: projectId → taskId → date → entry
  type EntryMap = Record<number, Record<number, Record<string, typeof weekEntries[0]>>>;
  const entryMap: EntryMap = {};
  for (const e of weekEntries) {
    if (!entryMap[e.projectId]) entryMap[e.projectId] = {};
    if (!entryMap[e.projectId]![e.taskId]) entryMap[e.projectId]![e.taskId] = {};
    entryMap[e.projectId]![e.taskId]![e.spentDate] = e;
  }

  // Row totals
  const rowTotals: Record<string, number> = {};
  for (const e of weekEntries) {
    const key = `${e.projectId}:${e.taskId}`;
    rowTotals[key] = (rowTotals[key] ?? 0) + e.hours;
  }

  // Col totals
  const colTotals: Record<string, number> = {};
  for (const e of weekEntries) {
    colTotals[e.spentDate] = (colTotals[e.spentDate] ?? 0) + e.hours;
  }
  const grandTotal = weekEntries.reduce((s, e) => s + e.hours, 0);

  // Rows: only projects with entries this week + active assigned projects
  const rowProjects = projects.filter(p => p.isActive);

  const handleCellChange = useCallback(async (
    projectId: number,
    taskId: number,
    date: string,
    value: string
  ) => {
    const hours = parseFloat(value);
    const existing = entryMap[projectId]?.[taskId]?.[date];

    if (isNaN(hours) || hours === 0) {
      // "0" or empty = no-op for now (delete would need a separate call)
      return;
    }

    if (existing) {
      await updateEntry.mutateAsync({ id: existing.id, hours });
    } else {
      await createEntry.mutateAsync({ projectId, taskId, spentDate: date, hours });
    }
  }, [entryMap, createEntry, updateEntry]);

  return (
    <div className={styles.wrapper}>
      <table className={styles.table} role="grid">
        <thead>
          <tr>
            <th className={styles.projectCol} scope="col">Project · Task</th>
            {weekDates.map((date, i) => (
              <th key={date} scope="col" className={date === today ? styles.today : undefined}>
                {DAY_LABELS[i]}<br />
                <span className={styles.dateSlice}>{date.slice(5)}</span>
              </th>
            ))}
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {rowProjects.flatMap(project =>
            // Show project row only if it has task assignments (simplified: show all projects with tasks)
            [project].map(() => (
              <tr key={`${project.id}`}>
                <td className={`${styles.projectCell}`}>
                  <div className={styles.projectName}>{project.name}</div>
                  <div className={styles.taskName}>{project.clientName}</div>
                </td>
                {weekDates.map(date => {
                  const key = `${project.id}:0`; // simplified: no task breakdown in this view
                  const entry = Object.values(entryMap[project.id] ?? {})
                    .flatMap(byDate => Object.values(byDate))
                    .find(e => e.spentDate === date);
                  const isApproved = entry?.approvalStatus === 'approved';
                  const isToday = date === today;

                  return (
                    <td key={date} className={`${styles.cell}${isToday ? ` ${styles.today}` : ''}`}>
                      {isApproved ? (
                        <span className={styles.locked}>
                          {entry.hours.toFixed(2)} 🔒
                        </span>
                      ) : (
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          max="24"
                          className={`${styles.cellInput}${entry ? ` ${styles.filled}` : ''}${
                            (entry?.hours ?? 0) > 24 ? ` ${styles.warning}` : ''
                          }`}
                          defaultValue={entry ? entry.hours.toFixed(2) : ''}
                          placeholder="—"
                          aria-label={`Hours for ${project.name} on ${date}`}
                          onBlur={e => {
                            const taskId = Object.keys(entryMap[project.id] ?? {})[0];
                            if (taskId) {
                              handleCellChange(project.id, Number(taskId), date, e.target.value);
                            }
                          }}
                        />
                      )}
                    </td>
                  );
                })}
                <td className={styles.rowTotal}>
                  {Object.values(entryMap[project.id] ?? {})
                    .flatMap(byDate => Object.values(byDate))
                    .reduce((s, e) => s + e.hours, 0).toFixed(2)}
                </td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr>
            <td className={styles.rowTotal}>Total</td>
            {weekDates.map(date => (
              <td key={date} className={`${styles.colTotal}${date === today ? ` ${styles.today}` : ''}`}>
                {(colTotals[date] ?? 0).toFixed(2)}
              </td>
            ))}
            <td className={styles.rowTotal}>{grandTotal.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
