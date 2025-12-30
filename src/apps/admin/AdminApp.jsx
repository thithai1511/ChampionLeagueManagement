import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ErrorBoundary from '../../shared/components/ErrorBoundary'

// 1. Import Layout và các trang
import AdminLayout from './components/AdminLayout'
import DashboardPage from './pages/DashboardPage'
import TeamsManagement from './pages/TeamsManagement'
import TeamDetailsPage from './pages/TeamDetailsPage'
import MatchesManagement from './pages/MatchesManagement'
import PlayersManagement from './pages/PlayersManagement'
import NewsManagement from './pages/NewsManagement'
import CMSManagement from './pages/CMSManagement'
import MediaLibrary from './pages/MediaLibrary'
import UsersManagement from './pages/UsersManagement'
import RolesPermissions from './pages/RolesPermissions'
import SettingsPage from './pages/SettingsPage'
import ReportsPage from './pages/ReportsPage'
import StandingsPage from "../public/pages/StandingsPage";
import ScheduleManagement from './pages/ScheduleManagement';
import LiveMatchUpdatePage from './pages/LiveMatchUpdatePage';
import AccessGuard from './components/AccessGuard';
import MyTeamPage from './pages/MyTeamPage'
import OfficialsManagement from './pages/OfficialsManagement'

// Các trang tích hợp mới
import StatisticsPage from './pages/StatisticsPage'
import SeasonAndRulesPage from './pages/SeasonAndRulesPage'
import SeasonRegistrationWorkflowPage from './pages/SeasonRegistrationWorkflowPage'


const AdminApp = ({ onLogout, currentUser }) => {
  return (
    <ErrorBoundary>
      <Routes>
        {/* 2. Dùng AdminLayout làm route cha */}
        {/* Prop onLogout được truyền vào Layout để nó có thể truyền xuống Header */}
        <Route path="/" element={<AdminLayout onLogout={onLogout} currentUser={currentUser} />}>

        {/* 3. Các trang con sẽ được render bên trong <Outlet/> của AdminLayout */}
        <Route index element={<DashboardPage />} /> {/* trang mặc định khi vào /admin */}
        <Route path="dashboard" element={<DashboardPage />} />
        <Route
          path="teams"
          element={
            <AccessGuard permission="manage_teams" currentUser={currentUser}>
              <TeamsManagement />
            </AccessGuard>
          }
        />
        <Route
          path="teams/:teamId"
          element={
            <AccessGuard permission="manage_teams" currentUser={currentUser}>
              <TeamDetailsPage />
            </AccessGuard>
          }
        />
        <Route
          path="matches"
          element={
            <AccessGuard permission="manage_matches" currentUser={currentUser}>
              <MatchesManagement />
            </AccessGuard>
          }
        />
        <Route
          path="players"
          element={
            <AccessGuard
              anyPermissions={['manage_teams', 'manage_own_player_registrations']}
              currentUser={currentUser}
            >
              <PlayersManagement currentUser={currentUser} />
            </AccessGuard>
          }
        />
        <Route
          path="statistics"
          element={
            <AccessGuard permission="manage_matches" currentUser={currentUser}>
              <StatisticsPage />
            </AccessGuard>
          }
        />
        <Route path="standings/view" element={<StandingsPage />} />
        <Route
          path="news"
          element={
            <AccessGuard permission="manage_content" currentUser={currentUser}>
              <NewsManagement />
            </AccessGuard>
          }
        />
        <Route
          path="media"
          element={
            <AccessGuard permission="manage_content" currentUser={currentUser}>
              <MediaLibrary />
            </AccessGuard>
          }
        />
        <Route
          path="content"
          element={
            <AccessGuard permission="manage_content" currentUser={currentUser}>
              <CMSManagement />
            </AccessGuard>
          }
        />
        <Route
          path="users"
          element={
            <AccessGuard permission="manage_users" currentUser={currentUser}>
              <UsersManagement />
            </AccessGuard>
          }
        />
        <Route
          path="roles"
          element={
            <AccessGuard permission="manage_users" currentUser={currentUser}>
              <RolesPermissions />
            </AccessGuard>
          }
        />
        <Route path="reports" element={<ReportsPage />} />
        <Route
          path="settings"
          element={
            <AccessGuard permission="manage_users" currentUser={currentUser}>
              <SettingsPage />
            </AccessGuard>
          }
        />
        <Route
          path="seasons"
          element={
            <AccessGuard permission="manage_teams" currentUser={currentUser}>
              <SeasonAndRulesPage />
            </AccessGuard>
          }
        />
        <Route
          path="season-registration-workflow"
          element={
            <AccessGuard permission="manage_teams" currentUser={currentUser}>
              <SeasonRegistrationWorkflowPage />
            </AccessGuard>
          }
        />

        <Route
          path="schedule"
          element={
            <AccessGuard permission="manage_matches" currentUser={currentUser}>
              <ScheduleManagement />
            </AccessGuard>
          }
        />
        <Route
          path="matches/:matchId/live"
          element={
            <AccessGuard permission="manage_matches" currentUser={currentUser}>
              <LiveMatchUpdatePage />
            </AccessGuard>
          }
        />
        <Route
          path="officials"
          element={
            <AccessGuard permission="manage_matches" currentUser={currentUser}>
              <OfficialsManagement />
            </AccessGuard>
          }
        />

        {/* Fallback: avoid dead routes under /admin */}
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Bạn có thể thêm các route không cần layout ở đây, ví dụ: */}
      {/* <Route path="/login" element={<LoginPage />} /> */}
    </Routes>
    </ErrorBoundary>
  )
}

export default AdminApp
