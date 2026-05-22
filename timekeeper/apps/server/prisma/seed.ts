import { PrismaClient, AccessRole } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding TimeKeeper demo data...');

  // Users
  const [admin, priya, maya, devon] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'sam@timekeeper.dev' },
      update: {},
      create: {
        firstName: 'Sam', lastName: 'Admin',
        email: 'sam@timekeeper.dev',
        accessRole: AccessRole.administrator,
        weeklyCapacity: new Decimal(40),
      },
    }),
    prisma.user.upsert({
      where: { email: 'priya@timekeeper.dev' },
      update: {},
      create: {
        firstName: 'Priya', lastName: 'Manager',
        email: 'priya@timekeeper.dev',
        accessRole: AccessRole.project_manager,
        weeklyCapacity: new Decimal(40),
      },
    }),
    prisma.user.upsert({
      where: { email: 'maya@timekeeper.dev' },
      update: {},
      create: {
        firstName: 'Maya', lastName: 'Member',
        email: 'maya@timekeeper.dev',
        accessRole: AccessRole.member,
        weeklyCapacity: new Decimal(40),
      },
    }),
    prisma.user.upsert({
      where: { email: 'devon@timekeeper.dev' },
      update: {},
      create: {
        firstName: 'Devon', lastName: 'Dev',
        email: 'devon@timekeeper.dev',
        accessRole: AccessRole.member,
        weeklyCapacity: new Decimal(40),
      },
    }),
  ]);

  // Clients
  const [acme, globex] = await Promise.all([
    prisma.client.upsert({
      where: { id: 1 },
      update: {},
      create: { name: 'Acme Corp' },
    }),
    prisma.client.upsert({
      where: { id: 2 },
      update: {},
      create: { name: 'Globex Industries' },
    }),
  ]);

  // Projects
  const [alpha, beta, internal] = await Promise.all([
    prisma.project.upsert({
      where: { id: 1 },
      update: {},
      create: {
        clientId: acme.id,
        name: 'Project Alpha',
        code: 'ALPHA',
        isBillable: true,
        budget: new Decimal(80),
        overBudgetNotificationPercentage: 80,
        showBudgetToAll: false,
      },
    }),
    prisma.project.upsert({
      where: { id: 2 },
      update: {},
      create: {
        clientId: acme.id,
        name: 'Project Beta',
        code: 'BETA',
        isBillable: true,
        budget: new Decimal(120),
        overBudgetNotificationPercentage: 80,
      },
    }),
    prisma.project.upsert({
      where: { id: 3 },
      update: {},
      create: {
        clientId: globex.id,
        name: 'Internal',
        code: 'INT',
        isBillable: false,
        budget: null,
      },
    }),
  ]);

  // Tasks
  const [design, dev, review, meetings, admin_task] = await Promise.all([
    prisma.task.upsert({ where: { id: 1 }, update: {}, create: { name: 'Design', billableByDefault: true } }),
    prisma.task.upsert({ where: { id: 2 }, update: {}, create: { name: 'Development', billableByDefault: true } }),
    prisma.task.upsert({ where: { id: 3 }, update: {}, create: { name: 'Code Review', billableByDefault: true } }),
    prisma.task.upsert({ where: { id: 4 }, update: {}, create: { name: 'Meetings', billableByDefault: false } }),
    prisma.task.upsert({ where: { id: 5 }, update: {}, create: { name: 'Admin', billableByDefault: false } }),
  ]);

  // Task assignments — assign tasks to projects
  await Promise.all([
    // Alpha gets design, dev, review, meetings
    prisma.taskAssignment.upsert({ where: { projectId_taskId: { projectId: alpha.id, taskId: design.id } }, update: {}, create: { projectId: alpha.id, taskId: design.id, billable: true } }),
    prisma.taskAssignment.upsert({ where: { projectId_taskId: { projectId: alpha.id, taskId: dev.id } }, update: {}, create: { projectId: alpha.id, taskId: dev.id, billable: true } }),
    prisma.taskAssignment.upsert({ where: { projectId_taskId: { projectId: alpha.id, taskId: review.id } }, update: {}, create: { projectId: alpha.id, taskId: review.id, billable: true } }),
    prisma.taskAssignment.upsert({ where: { projectId_taskId: { projectId: alpha.id, taskId: meetings.id } }, update: {}, create: { projectId: alpha.id, taskId: meetings.id, billable: false } }),
    // Beta gets dev, review
    prisma.taskAssignment.upsert({ where: { projectId_taskId: { projectId: beta.id, taskId: dev.id } }, update: {}, create: { projectId: beta.id, taskId: dev.id, billable: true } }),
    prisma.taskAssignment.upsert({ where: { projectId_taskId: { projectId: beta.id, taskId: review.id } }, update: {}, create: { projectId: beta.id, taskId: review.id, billable: true } }),
    // Internal gets meetings, admin
    prisma.taskAssignment.upsert({ where: { projectId_taskId: { projectId: internal.id, taskId: meetings.id } }, update: {}, create: { projectId: internal.id, taskId: meetings.id, billable: false } }),
    prisma.taskAssignment.upsert({ where: { projectId_taskId: { projectId: internal.id, taskId: admin_task.id } }, update: {}, create: { projectId: internal.id, taskId: admin_task.id, billable: false } }),
  ]);

  // User assignments
  await Promise.all([
    // Sam (admin) — all projects
    prisma.userAssignment.upsert({ where: { projectId_userId: { projectId: alpha.id, userId: admin.id } }, update: {}, create: { projectId: alpha.id, userId: admin.id, isProjectManager: true } }),
    prisma.userAssignment.upsert({ where: { projectId_userId: { projectId: beta.id, userId: admin.id } }, update: {}, create: { projectId: beta.id, userId: admin.id, isProjectManager: true } }),
    prisma.userAssignment.upsert({ where: { projectId_userId: { projectId: internal.id, userId: admin.id } }, update: {}, create: { projectId: internal.id, userId: admin.id } }),
    // Priya (PM) — Alpha as PM, Beta
    prisma.userAssignment.upsert({ where: { projectId_userId: { projectId: alpha.id, userId: priya.id } }, update: {}, create: { projectId: alpha.id, userId: priya.id, isProjectManager: true } }),
    prisma.userAssignment.upsert({ where: { projectId_userId: { projectId: beta.id, userId: priya.id } }, update: {}, create: { projectId: beta.id, userId: priya.id } }),
    // Maya — Alpha, Internal
    prisma.userAssignment.upsert({ where: { projectId_userId: { projectId: alpha.id, userId: maya.id } }, update: {}, create: { projectId: alpha.id, userId: maya.id } }),
    prisma.userAssignment.upsert({ where: { projectId_userId: { projectId: internal.id, userId: maya.id } }, update: {}, create: { projectId: internal.id, userId: maya.id } }),
    // Devon — Alpha, Beta, Internal
    prisma.userAssignment.upsert({ where: { projectId_userId: { projectId: alpha.id, userId: devon.id } }, update: {}, create: { projectId: alpha.id, userId: devon.id } }),
    prisma.userAssignment.upsert({ where: { projectId_userId: { projectId: beta.id, userId: devon.id } }, update: {}, create: { projectId: beta.id, userId: devon.id } }),
    prisma.userAssignment.upsert({ where: { projectId_userId: { projectId: internal.id, userId: devon.id } }, update: {}, create: { projectId: internal.id, userId: devon.id } }),
  ]);

  // Seed some time entries this week for the signature demo
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1);

  const fmt = (d: Date) => d.toISOString().split('T')[0]!;

  const d1 = fmt(monday);
  const d2 = fmt(new Date(monday.getTime() + 86400000));
  const d3 = fmt(new Date(monday.getTime() + 2 * 86400000));

  await Promise.all([
    prisma.timeEntry.upsert({ where: { id: 1n }, update: {}, create: { id: 1n, userId: maya.id, projectId: alpha.id, taskId: dev.id, spentDate: new Date(d1), hours: new Decimal(6), billable: true } }),
    prisma.timeEntry.upsert({ where: { id: 2n }, update: {}, create: { id: 2n, userId: maya.id, projectId: alpha.id, taskId: dev.id, spentDate: new Date(d2), hours: new Decimal(7.5), billable: true } }),
    prisma.timeEntry.upsert({ where: { id: 3n }, update: {}, create: { id: 3n, userId: devon.id, projectId: alpha.id, taskId: review.id, spentDate: new Date(d1), hours: new Decimal(4), billable: true, notes: 'Sprint 4 review' } }),
    prisma.timeEntry.upsert({ where: { id: 4n }, update: {}, create: { id: 4n, userId: devon.id, projectId: alpha.id, taskId: dev.id, spentDate: new Date(d2), hours: new Decimal(8), billable: true } }),
    prisma.timeEntry.upsert({ where: { id: 5n }, update: {}, create: { id: 5n, userId: priya.id, projectId: alpha.id, taskId: meetings.id, spentDate: new Date(d1), hours: new Decimal(2), billable: false } }),
    prisma.timeEntry.upsert({ where: { id: 6n }, update: {}, create: { id: 6n, userId: devon.id, projectId: beta.id, taskId: dev.id, spentDate: new Date(d3), hours: new Decimal(6), billable: true } }),
    prisma.timeEntry.upsert({ where: { id: 7n }, update: {}, create: { id: 7n, userId: maya.id, projectId: internal.id, taskId: meetings.id, spentDate: new Date(d3), hours: new Decimal(1), billable: false } }),
  ]);

  console.log(`Seeded: 4 users, 2 clients, 3 projects, 5 tasks, assignments, 7 time entries.`);
  console.log(`\nBearer tokens (set MCP_BEARER_TOKENS in .env):`);
  console.log(`  demo-token-admin:${admin.id}  (Sam, Administrator)`);
  console.log(`  demo-token-priya:${priya.id}  (Priya, Project Manager)`);
  console.log(`  demo-token-maya:${maya.id}   (Maya, Member)`);
  console.log(`  demo-token-devon:${devon.id}   (Devon, Member)`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
