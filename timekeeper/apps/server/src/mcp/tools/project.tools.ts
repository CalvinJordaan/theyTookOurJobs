import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { projectService } from '../../services/project.service.js';
import { clientService } from '../../services/client.service.js';
import { taskService } from '../../services/task.service.js';
import { userService } from '../../services/user.service.js';
import type { Actor } from '../../services/authz.js';
import { AppError } from '../../domain/errors.js';

function mcpError(err: unknown) {
  const msg = err instanceof AppError ? err.message : 'Internal error';
  return { content: [{ type: 'text' as const, text: msg }], isError: true };
}

export function registerProjectTools(server: McpServer, actor: Actor): void {
  server.tool(
    'list_projects',
    'List projects accessible to the current user (all projects for admins).',
    { include_inactive: z.boolean().optional().describe('Include archived projects') },
    async () => {
      try {
        const projects = await projectService.list(actor);
        return { content: [{ type: 'text', text: JSON.stringify(projects, null, 2) }] };
      } catch (err) { return mcpError(err); }
    }
  );

  server.tool(
    'get_project',
    'Get a project by ID.',
    { id: z.number().int().positive() },
    async (args) => {
      try {
        const project = await projectService.get(actor, args.id);
        return { content: [{ type: 'text', text: JSON.stringify(project, null, 2) }] };
      } catch (err) { return mcpError(err); }
    }
  );

  server.tool(
    'list_clients',
    'List all active clients.',
    {},
    async () => {
      try {
        const clients = await clientService.list(actor);
        return { content: [{ type: 'text', text: JSON.stringify(clients, null, 2) }] };
      } catch (err) { return mcpError(err); }
    }
  );

  server.tool(
    'list_tasks',
    'List tasks. Optionally filter by project to see only assigned tasks.',
    { project_id: z.number().int().optional().describe('Filter to tasks assigned to this project') },
    async (args) => {
      try {
        const tasks = await taskService.list(actor, args.project_id);
        return { content: [{ type: 'text', text: JSON.stringify(tasks, null, 2) }] };
      } catch (err) { return mcpError(err); }
    }
  );

  server.tool(
    'get_current_user',
    'Get the identity of the currently authenticated user.',
    {},
    async () => {
      try {
        const user = await userService.me(actor);
        return { content: [{ type: 'text', text: JSON.stringify(user, null, 2) }] };
      } catch (err) { return mcpError(err); }
    }
  );

  server.tool(
    'list_users',
    'List all active users (all roles can call this).',
    {},
    async () => {
      try {
        const users = await userService.list(actor);
        return { content: [{ type: 'text', text: JSON.stringify(users, null, 2) }] };
      } catch (err) { return mcpError(err); }
    }
  );
}
