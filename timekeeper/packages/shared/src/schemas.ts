import { z } from 'zod';

export const CreateTimeEntrySchema = z.object({
  projectId: z.number().int().positive(),
  taskId: z.number().int().positive(),
  spentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  hours: z.number().positive().max(24),
  notes: z.string().max(10000).nullable().optional(),
  billable: z.boolean().optional(),
});

export const UpdateTimeEntrySchema = z.object({
  projectId: z.number().int().positive().optional(),
  taskId: z.number().int().positive().optional(),
  spentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hours: z.number().positive().max(24).optional(),
  notes: z.string().max(10000).nullable().optional(),
  billable: z.boolean().optional(),
});

export const StartTimerSchema = z.object({
  projectId: z.number().int().positive(),
  taskId: z.number().int().positive(),
  notes: z.string().max(10000).nullable().optional(),
  billable: z.boolean().optional(),
});

export const TimeReportFiltersSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  userId: z.number().int().positive().optional(),
  projectId: z.number().int().positive().optional(),
  clientId: z.number().int().positive().optional(),
  taskId: z.number().int().positive().optional(),
  billable: z.boolean().optional(),
});

export const CreateProjectSchema = z.object({
  clientId: z.number().int().positive(),
  name: z.string().min(1).max(255),
  code: z.string().max(50).nullable().optional(),
  isBillable: z.boolean().default(true),
  budget: z.number().positive().nullable().optional(),
  budgetIsMonthly: z.boolean().default(false),
  overBudgetNotificationPercentage: z.number().min(0).max(100).default(80),
  showBudgetToAll: z.boolean().default(false),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export const CreateClientSchema = z.object({
  name: z.string().min(1).max(255),
});

export const CreateTaskSchema = z.object({
  name: z.string().min(1).max(255),
  billableByDefault: z.boolean().default(true),
});

export const CreateUserSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  weeklyCapacity: z.number().positive().max(168).default(40),
  isContractor: z.boolean().default(false),
  accessRole: z.enum(['administrator', 'project_manager', 'member']).default('member'),
});

export type CreateTimeEntryInput = z.infer<typeof CreateTimeEntrySchema>;
export type UpdateTimeEntryInput = z.infer<typeof UpdateTimeEntrySchema>;
export type StartTimerInput = z.infer<typeof StartTimerSchema>;
export type TimeReportFilters = z.infer<typeof TimeReportFiltersSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type CreateClientInput = z.infer<typeof CreateClientSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
