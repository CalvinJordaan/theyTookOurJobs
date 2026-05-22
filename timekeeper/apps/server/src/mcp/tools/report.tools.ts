import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { reportService } from '../../services/report.service.js';
import type { Actor } from '../../services/authz.js';
import { AppError } from '../../domain/errors.js';

function mcpError(err: unknown) {
  const msg = err instanceof AppError ? err.message : 'Internal error';
  return { content: [{ type: 'text' as const, text: msg }], isError: true };
}

export function registerReportTools(server: McpServer, actor: Actor): void {
  server.tool(
    'run_time_report',
    'Run a filtered time report. Returns entries with total, billable, and non-billable hour summaries.',
    {
      from: z.string().describe('Start date YYYY-MM-DD'),
      to: z.string().describe('End date YYYY-MM-DD'),
      user_id: z.number().int().optional().describe('Filter by user'),
      project_id: z.number().int().optional().describe('Filter by project'),
      client_id: z.number().int().optional().describe('Filter by client'),
      task_id: z.number().int().optional().describe('Filter by task'),
      billable: z.boolean().optional().describe('Filter by billable flag'),
    },
    async (args) => {
      try {
        const report = await reportService.timeReport(actor, {
          from: args.from,
          to: args.to,
          userId: args.user_id,
          projectId: args.project_id,
          clientId: args.client_id,
          taskId: args.task_id,
          billable: args.billable,
        });
        const summary = `Total: ${report.totalHours}h  |  Billable: ${report.billableHours}h  |  Non-billable: ${report.nonBillableHours}h\nEntries: ${report.entries.length}`;
        return {
          content: [
            { type: 'text', text: summary },
            { type: 'text', text: JSON.stringify(report, null, 2) },
          ],
        };
      } catch (err) { return mcpError(err); }
    }
  );

  server.tool(
    'run_project_budget_report',
    'Get the hours budget status for a project — consumed vs budget, percentage used.',
    { project_id: z.number().int().positive().describe('Project ID') },
    async (args) => {
      try {
        const budget = await reportService.projectBudget(actor, args.project_id);
        const summary = budget.budget
          ? `${budget.projectName}: ${budget.consumed}h of ${budget.budget}h (${budget.percentage}%) — ${budget.isOverBudget ? 'OVER BUDGET' : 'within budget'}`
          : `${budget.projectName}: ${budget.consumed}h logged (no budget set)`;
        return {
          content: [
            { type: 'text', text: summary },
            { type: 'text', text: JSON.stringify(budget, null, 2) },
          ],
        };
      } catch (err) { return mcpError(err); }
    }
  );

  server.tool(
    'run_capacity_report',
    'Get team capacity report for a week — logged hours vs weekly capacity per user.',
    { week_start: z.string().describe('Monday of the week, YYYY-MM-DD') },
    async (args) => {
      try {
        const rows = await reportService.capacityReport(actor, args.week_start);
        return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
      } catch (err) { return mcpError(err); }
    }
  );
}
