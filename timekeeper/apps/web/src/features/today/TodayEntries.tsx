import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../../components/Button/Button';
import { StatusPill } from '../../components/StatusPill/StatusPill';
import {
  useTimeEntries, useProjects, useTasks,
  useCreateTimeEntry, useDeleteTimeEntry,
} from '../../api/hooks';
import { formatDate } from '../../lib/format';
import styles from './TodayEntries.module.css';

interface AddForm {
  projectId: number;
  taskId: number;
  hours: number;
  notes: string;
}

export function TodayEntries() {
  const today = formatDate(new Date());
  const { data: entries = [], isLoading } = useTimeEntries(today);
  const { data: projects = [] } = useProjects();
  const [showAdd, setShowAdd] = useState(false);
  const { register, watch, handleSubmit, reset } = useForm<AddForm>();
  const selectedProjectId = watch('projectId');
  const { data: tasks = [] } = useTasks(selectedProjectId ? Number(selectedProjectId) : undefined);
  const createEntry = useCreateTimeEntry();
  const deleteEntry = useDeleteTimeEntry();

  const totalHours = entries.reduce((s, e) => s + e.hours, 0);

  const onAdd = handleSubmit(async (data) => {
    await createEntry.mutateAsync({
      projectId: Number(data.projectId),
      taskId: Number(data.taskId),
      spentDate: today,
      hours: Number(data.hours),
      notes: data.notes || undefined,
    });
    reset();
    setShowAdd(false);
  });

  return (
    <section className={styles.section} aria-label="Today's entries">
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Today · {today}</h2>
        <span className={styles.totalHours}>{totalHours.toFixed(2)} h</span>
      </div>

      {isLoading && <p className={styles.empty}>Loading…</p>}

      {!isLoading && entries.length === 0 && !showAdd && (
        <p className={styles.empty}>No time tracked today yet.</p>
      )}

      {entries.map(entry => (
        <article key={entry.id} className={styles.entry}>
          <div className={styles.entryMain}>
            <span className={styles.entryProject}>
              {entry.project?.clientName} — {entry.project?.name}
            </span>
            <span className={styles.entryTask}>{entry.task?.name}</span>
            {entry.notes && <span className={styles.entryNotes}>{entry.notes}</span>}
          </div>
          <StatusPill
            variant={entry.billable ? 'success' : 'neutral'}
            label={entry.billable ? 'Billable' : 'Non-bill.'}
            showDot={false}
          />
          <span className={styles.entryHours}>{entry.hours.toFixed(2)}</span>
          <button
            className={styles.deleteBtn}
            onClick={() => deleteEntry.mutate(entry.id)}
            aria-label={`Delete entry for ${entry.project?.name}`}
            disabled={entry.approvalStatus === 'approved'}
          >
            <TrashIcon />
          </button>
        </article>
      ))}

      {showAdd && (
        <form onSubmit={onAdd} className={styles.addEntryForm} aria-label="Add time entry">
          <select className={styles.input} {...register('projectId', { required: true })}>
            <option value="">Project…</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className={styles.input} {...register('taskId', { required: true })}
                  disabled={!selectedProjectId}>
            <option value="">Task…</option>
            {tasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input type="number" step="0.25" min="0.25" max="24" className={styles.input}
                 placeholder="Hours" {...register('hours', { required: true, min: 0.01 })} />
          <Button type="submit" disabled={createEntry.isPending}>Add</Button>
          <input type="text" className={styles.input} placeholder="Notes (optional)"
                 {...register('notes')} />
          <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
        </form>
      )}

      {!showAdd && (
        <Button variant="secondary" onClick={() => setShowAdd(true)}>
          + Add entry
        </Button>
      )}
    </section>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M2 3.5h10M5 3.5V2h4v1.5M5.5 6v4.5M8.5 6v4.5M3 3.5l.5 8h7l.5-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
