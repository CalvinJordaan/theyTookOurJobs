import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { TimeEntry, Project, Client, Task, User, BudgetSummary, TimeReport, CapacityReport } from '@timekeeper/shared';

// ─── Users ───────────────────────────────────────────────────────────────────

export function useCurrentUser() {
  return useQuery({ queryKey: ['users', 'me'], queryFn: () => api.get<User>('/users/me') });
}

export function useUsers() {
  return useQuery({ queryKey: ['users'], queryFn: () => api.get<User[]>('/users') });
}

// ─── Projects ────────────────────────────────────────────────────────────────

export function useProjects() {
  return useQuery({ queryKey: ['projects'], queryFn: () => api.get<Project[]>('/projects') });
}

export function useProject(id: number) {
  return useQuery({ queryKey: ['projects', id], queryFn: () => api.get<Project>(`/projects/${id}`) });
}

export function useProjectBudget(id: number) {
  return useQuery({
    queryKey: ['projects', id, 'budget'],
    queryFn: () => api.get<BudgetSummary>(`/projects/${id}/budget`),
    refetchInterval: 30_000,
  });
}

export function useAllBudgets() {
  return useQuery({ queryKey: ['reports', 'budgets'], queryFn: () => api.get<BudgetSummary[]>('/reports/budgets') });
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export function useClients() {
  return useQuery({ queryKey: ['clients'], queryFn: () => api.get<Client[]>('/clients') });
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export function useTasks(projectId?: number) {
  return useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => api.get<Task[]>(projectId ? `/projects/${projectId}/tasks` : '/tasks'),
    enabled: projectId !== undefined ? projectId > 0 : true,
  });
}

// ─── Time Entries ─────────────────────────────────────────────────────────────

export function useTimeEntries(date?: string) {
  return useQuery({
    queryKey: ['time-entries', date],
    queryFn: () => api.get<TimeEntry[]>(`/time-entries${date ? `?date=${date}` : ''}`),
    refetchInterval: 15_000,
  });
}

export function useRunningTimer() {
  return useQuery({
    queryKey: ['timer', 'running'],
    queryFn: () => api.get<TimeEntry | null>('/time-entries/timer/running'),
    refetchInterval: 5_000,
  });
}

export function useCreateTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      projectId: number; taskId: number; spentDate: string;
      hours: number; notes?: string; billable?: boolean;
    }) => api.post<TimeEntry>('/time-entries', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-entries'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useUpdateTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; hours?: number; notes?: string; billable?: boolean }) =>
      api.patch<TimeEntry>(`/time-entries/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-entries'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useDeleteTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/time-entries/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-entries'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useStartTimer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { projectId: number; taskId: number; notes?: string; billable?: boolean }) =>
      api.post<TimeEntry>('/time-entries/timer/start', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-entries'] });
      qc.invalidateQueries({ queryKey: ['timer'] });
    },
  });
}

export function useStopTimer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<TimeEntry>('/time-entries/timer/stop', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-entries'] });
      qc.invalidateQueries({ queryKey: ['timer'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export function useTimeReport(filters: {
  from: string; to: string; projectId?: number;
  userId?: number; clientId?: number; billable?: boolean;
}) {
  return useQuery({
    queryKey: ['reports', 'time', filters],
    queryFn: () => {
      const params = new URLSearchParams({ from: filters.from, to: filters.to });
      if (filters.projectId) params.set('project_id', String(filters.projectId));
      if (filters.userId) params.set('user_id', String(filters.userId));
      if (filters.clientId) params.set('client_id', String(filters.clientId));
      if (filters.billable !== undefined) params.set('billable', String(filters.billable));
      return api.get<TimeReport>(`/reports/time?${params}`);
    },
  });
}

export function useCapacityReport(weekStart: string) {
  return useQuery({
    queryKey: ['reports', 'capacity', weekStart],
    queryFn: () => api.get<CapacityReport[]>(`/reports/capacity?week_start=${weekStart}`),
  });
}
