import { Routes, Route, Navigate } from 'react-router';
import { AppShell } from '../components/AppShell/AppShell';
import { TodayPage } from '../features/today/TodayPage';
import { WeekPage } from '../features/week/WeekPage';
import { ProjectsPage } from '../features/projects/ProjectsPage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { TeamPage } from '../features/team/TeamPage';

export function AppRouter() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/today" replace />} />
        <Route path="/today" element={<TodayPage />} />
        <Route path="/week" element={<WeekPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/team" element={<TeamPage />} />
      </Routes>
    </AppShell>
  );
}
