import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { timeEntryService } from '../../services/time-entry.service.js';
import { timerService } from '../../services/timer.service.js';
import type { Actor } from '../../services/authz.js';
import { AppError } from '../../domain/errors.js';

function mcpError(err: unknown): { content: Array<{ type: 'text'; text: string }>, isError: true } {
  const msg = err instanceof AppError ? err.message : 'Internal error';
  return { content: [{ type: 'text', text: msg }], isError: true };
}

export function registerTimeEntryTools(server: McpServer, actor: Actor): void {
  server.tool(
    'create_time_entry',
    'Create a time entry for a project and task. Returns the created entry.',
    {
      project_id: z.number().int().positive().describe('Project ID'),
      task_id: z.number().int().positive().describe('Task ID'),
      spent_date: z.string().describe('Date in YYYY-MM-DD format'),
      hours: z.number().positive().max(24).describe('Hours worked (decimal, e.g. 1.5)'),
      notes: z.string().optional().describe('Optional notes'),
      billable: z.boolean().optional().describe('Override billable flag (defaults from task assignment)'),
    },
    async (args) => {
      try {
        const entry = await timeEntryService.create(actor, {
          projectId: args.project_id,
          taskId: args.task_id,
          spentDate: args.spent_date,
          hours: args.hours,
          notes: args.notes ?? null,
          billable: args.billable,
        });
        return { content: [{ type: 'text', text: JSON.stringify(entry, null, 2) }] };
      } catch (err) { return mcpError(err); }
    }
  );

  server.tool(
    'list_time_entries',
    'List time entries for the current user (or a specific user if admin). Optionally filter by date.',
    {
      date: z.string().optional().describe('Filter by date YYYY-MM-DD'),
      user_id: z.number().int().optional().describe('Filter by user (admin only)'),
    },
    async (args) => {
      try {
        const entries = await timeEntryService.list(actor, { date: args.date, userId: args.user_id });
        return { content: [{ type: 'text', text: JSON.stringify(entries, null, 2) }] };
      } catch (err) { return mcpError(err); }
    }
  );

  server.tool(
    'get_time_entry',
    'Get a single time entry by ID.',
    { id: z.number().int().positive().describe('Time entry ID') },
    async (args) => {
      try {
        const entry = await timeEntryService.get(actor, BigInt(args.id));
        return { content: [{ type: 'text', text: JSON.stringify(entry, null, 2) }] };
      } catch (err) { return mcpError(err); }
    }
  );

  server.tool(
    'update_time_entry',
    'Update an existing time entry (own entries only, unless admin).',
    {
      id: z.number().int().positive().describe('Time entry ID'),
      hours: z.number().positive().max(24).optional(),
      notes: z.string().nullable().optional(),
      billable: z.boolean().optional(),
      spent_date: z.string().optional(),
    },
    async (args) => {
      try {
        const entry = await timeEntryService.update(actor, BigInt(args.id), {
          hours: args.hours,
          notes: args.notes,
          billable: args.billable,
          spentDate: args.spent_date,
        });
        return { content: [{ type: 'text', text: JSON.stringify(entry, null, 2) }] };
      } catch (err) { return mcpError(err); }
    }
  );

  server.tool(
    'delete_time_entry',
    'Delete a time entry (own entries only, unless admin).',
    { id: z.number().int().positive().describe('Time entry ID') },
    async (args) => {
      try {
        await timeEntryService.delete(actor, BigInt(args.id));
        return { content: [{ type: 'text', text: 'Time entry deleted.' }] };
      } catch (err) { return mcpError(err); }
    }
  );

  server.tool(
    'start_timer',
    'Start a live timer for a project/task. Automatically stops any running timer first.',
    {
      project_id: z.number().int().positive(),
      task_id: z.number().int().positive(),
      notes: z.string().optional(),
      billable: z.boolean().optional(),
    },
    async (args) => {
      try {
        const entry = await timerService.start(actor, {
          projectId: args.project_id,
          taskId: args.task_id,
          notes: args.notes ?? null,
          billable: args.billable,
        });
        return { content: [{ type: 'text', text: JSON.stringify(entry, null, 2) }] };
      } catch (err) { return mcpError(err); }
    }
  );

  server.tool(
    'stop_timer',
    'Stop the current running timer. Returns the finalized time entry with actual hours elapsed.',
    { entry_id: z.number().int().optional().describe('Specific entry ID to stop (omit for current)') },
    async (args) => {
      try {
        const entry = await timerService.stop(actor, args.entry_id ? BigInt(args.entry_id) : undefined);
        return { content: [{ type: 'text', text: JSON.stringify(entry, null, 2) }] };
      } catch (err) { return mcpError(err); }
    }
  );

  server.tool(
    'get_running_timer',
    'Get the currently running timer for the authenticated user, or null if none.',
    {},
    async () => {
      try {
        const entry = await timerService.getCurrent(actor);
        return { content: [{ type: 'text', text: entry ? JSON.stringify(entry, null, 2) : 'null' }] };
      } catch (err) { return mcpError(err); }
    }
  );
}
