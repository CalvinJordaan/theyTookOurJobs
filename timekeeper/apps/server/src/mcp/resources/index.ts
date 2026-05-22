import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { projectService } from '../../services/project.service.js';
import { clientService } from '../../services/client.service.js';
import { taskService } from '../../services/task.service.js';
import { userService } from '../../services/user.service.js';
import { timeEntryService } from '../../services/time-entry.service.js';
import type { Actor } from '../../services/authz.js';
import { formatDate } from '../../lib/format.js';

export function registerResources(server: McpServer, actor: Actor): void {
  server.resource(
    'harvest://users',
    'All active users in the workspace',
    async () => {
      const users = await userService.list(actor);
      return { contents: [{ uri: 'harvest://users', mimeType: 'application/json', text: JSON.stringify(users) }] };
    }
  );

  server.resource(
    'harvest://projects',
    'All projects accessible to the current user',
    async () => {
      const projects = await projectService.list(actor);
      return { contents: [{ uri: 'harvest://projects', mimeType: 'application/json', text: JSON.stringify(projects) }] };
    }
  );

  server.resource(
    'harvest://clients',
    'All active clients',
    async () => {
      const clients = await clientService.list(actor);
      return { contents: [{ uri: 'harvest://clients', mimeType: 'application/json', text: JSON.stringify(clients) }] };
    }
  );

  server.resource(
    'harvest://tasks',
    'All active tasks in the task library',
    async () => {
      const tasks = await taskService.list(actor);
      return { contents: [{ uri: 'harvest://tasks', mimeType: 'application/json', text: JSON.stringify(tasks) }] };
    }
  );

  server.resource(
    'harvest://timesheet/today',
    "Current user's time entries for today",
    async () => {
      const today = formatDate(new Date());
      const entries = await timeEntryService.list(actor, { date: today });
      return {
        contents: [{
          uri: 'harvest://timesheet/today',
          mimeType: 'application/json',
          text: JSON.stringify({ date: today, entries }),
        }],
      };
    }
  );

  server.resource(
    'harvest://me',
    'Identity of the currently authenticated user',
    async () => {
      const user = await userService.me(actor);
      return { contents: [{ uri: 'harvest://me', mimeType: 'application/json', text: JSON.stringify(user) }] };
    }
  );
}
