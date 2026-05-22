export type AccessRole = 'administrator' | 'project_manager' | 'member';
export type ApprovalStatus = 'unsubmitted' | 'submitted' | 'approved' | 'rejected';

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  weeklyCapacity: number;
  isContractor: boolean;
  accessRole: AccessRole;
}

export interface Client {
  id: number;
  name: string;
  isActive: boolean;
}

export interface Project {
  id: number;
  clientId: number;
  clientName: string;
  name: string;
  code: string | null;
  isActive: boolean;
  isBillable: boolean;
  budget: number | null;
  budgetIsMonthly: boolean;
  overBudgetNotificationPercentage: number;
  showBudgetToAll: boolean;
  startsOn: string | null;
  endsOn: string | null;
}

export interface Task {
  id: number;
  name: string;
  isActive: boolean;
  billableByDefault: boolean;
}

export interface TaskAssignment {
  id: number;
  projectId: number;
  taskId: number;
  taskName: string;
  isActive: boolean;
  billable: boolean;
}

export interface UserAssignment {
  id: number;
  projectId: number;
  userId: number;
  isActive: boolean;
  isProjectManager: boolean;
}

export interface TimeEntry {
  id: number;
  userId: number;
  projectId: number;
  taskId: number;
  spentDate: string;
  hours: number;
  notes: string | null;
  billable: boolean;
  approvalStatus: ApprovalStatus;
  isRunning: boolean;
  timerStartedAt: string | null;
  createdAt: string;
  updatedAt: string;
  project?: Pick<Project, 'id' | 'name' | 'clientId' | 'clientName'>;
  task?: Pick<Task, 'id' | 'name'>;
  user?: Pick<User, 'id' | 'firstName' | 'lastName'>;
}

export interface BudgetSummary {
  projectId: number;
  projectName: string;
  clientName: string;
  budget: number | null;
  consumed: number;
  percentage: number | null;
  isOverBudget: boolean;
}

export interface TimeReport {
  entries: TimeEntry[];
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
}

export interface CapacityReport {
  userId: number;
  firstName: string;
  lastName: string;
  weeklyCapacity: number;
  loggedHours: number;
  percentage: number;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
