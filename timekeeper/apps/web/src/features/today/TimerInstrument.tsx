import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../../components/Button/Button';
import { StatusPill } from '../../components/StatusPill/StatusPill';
import { useProjects, useTasks, useRunningTimer, useStartTimer, useStopTimer } from '../../api/hooks';
import styles from './TimerInstrument.module.css';

interface TimerForm {
  projectId: number;
  taskId: number;
  notes: string;
}

export function TimerInstrument() {
  const { data: running } = useRunningTimer();
  const { data: projects = [] } = useProjects();
  const { register, watch, handleSubmit, reset } = useForm<TimerForm>();
  const selectedProjectId = watch('projectId');
  const { data: tasks = [] } = useTasks(selectedProjectId ? Number(selectedProjectId) : undefined);
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();
  const [elapsed, setElapsed] = useState('0:00:00');

  useEffect(() => {
    if (!running?.isRunning || !running?.timerStartedAt) {
      setElapsed('0:00:00');
      return;
    }
    const tick = () => {
      const ms = Date.now() - new Date(running.timerStartedAt!).getTime();
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setElapsed(`${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [running?.isRunning, running?.timerStartedAt]);

  const isRunning = Boolean(running?.isRunning);

  const onStart = handleSubmit(async (data) => {
    await startTimer.mutateAsync({
      projectId: Number(data.projectId),
      taskId: Number(data.taskId),
      notes: data.notes || undefined,
    });
    reset();
  });

  const onStop = async () => {
    await stopTimer.mutateAsync();
  };

  const currentProject = projects.find(p => p.id === running?.projectId);
  const currentTask = tasks.find(t => t.id === running?.taskId);

  return (
    <div className={`${styles.instrument}${isRunning ? ` ${styles.running}` : ''}`}
         role="region" aria-label="Live timer">
      <div className={styles.readout}>
        <span className={`${styles.elapsed}${isRunning ? ` ${styles.active}` : ''}`}
              aria-live="polite" aria-label="Elapsed time">
          {elapsed}
        </span>
        {isRunning && (
          <StatusPill variant="running" label="Running" />
        )}
      </div>

      {isRunning && running ? (
        <div>
          <p className={styles.meta}>
            {currentProject?.name} · {currentTask?.name ?? running.task?.name}
            {running.notes && ` — ${running.notes}`}
          </p>
        </div>
      ) : (
        <form onSubmit={onStart} aria-label="Start timer">
          <div className={styles.controls}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="timer-project">Project</label>
              <select id="timer-project" className={styles.select}
                      {...register('projectId', { required: true })}>
                <option value="">Select project…</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.clientName} — {p.name}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="timer-task">Task</label>
              <select id="timer-task" className={styles.select}
                      {...register('taskId', { required: true })}
                      disabled={!selectedProjectId}>
                <option value="">Select task…</option>
                {tasks.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="primary" disabled={startTimer.isPending}>
              Start
            </Button>
            <div className={`${styles.notes} ${styles.field}`}>
              <label className={styles.label} htmlFor="timer-notes">Notes (optional)</label>
              <input id="timer-notes" type="text" className={styles.notesInput}
                     placeholder="What are you working on?"
                     {...register('notes')} />
            </div>
          </div>
        </form>
      )}

      {isRunning && (
        <div className={styles.footer}>
          <Button variant="running" onClick={onStop} disabled={stopTimer.isPending}>
            Stop timer
          </Button>
          {running?.billable && <StatusPill variant="success" label="Billable" showDot={false} />}
        </div>
      )}
    </div>
  );
}
