import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ErrorBoundary from '../../shared/components/ErrorBoundary'

// 1. Chỉ cần import Layout và các trang
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
import RulesetManagement from './pages/RulesetManagement'
import PlayerStatsManagement from './pages/PlayerStatsManagement'
import RolesPermissions from './pages/RolesPermissions'
import AuditLog from './pages/AuditLog'
import SettingsPage from './pages/SettingsPage'
import ReportsPage from './pages/ReportsPage'
import StandingsPage from "../public/pages/StandingsPage";
import StandingsManagement from './pages/StandingsManagement';
import SeasonManagement from './pages/SeasonManagement'
import MatchDayManagement from './pages/MatchDayManagement';
import ScheduleManagement from './pages/ScheduleManagement';
import LiveMatchUpdatePage from './pages/LiveMatchUpdatePage';
import AccessGuard from './components/AccessGuard';
import SeasonPlayersManagement from './pages/SeasonPlayersManagement';
import SeasonPlayerApprovalPage from './pages/SeasonPlayerApprovalPage'
import MyTeamPage from './pages/MyTeamPage'
import PlayerRegistrationsPage from './pages/PlayerRegistrationsPage'
import OfficialsManagement from './pages/OfficialsManagement'
import SeasonAwardsPage from './pages/SeasonAwardsPage'
import SeasonDisciplinePage from './pages/SeasonDisciplinePage'


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
          path="standings"
          element={
            <AccessGuard permission="manage_matches" currentUser={currentUser}>
              <StandingsManagement />
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
          path="rulesets"
          element={
            <AccessGuard permission="manage_rulesets" currentUser={currentUser}>
              <RulesetManagement />
            </AccessGuard>
          }
        />
        <Route
          path="player-stats"
          element={
            <AccessGuard permission="manage_matches" currentUser={currentUser}>
              <PlayerStatsManagement />
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
          path="audit-log"
          element={
            <AccessGuard permission="view_audit_logs" currentUser={currentUser}>
              <AuditLog />
            </AccessGuard>
          }
        />
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
              <SeasonManagement />
            </AccessGuard>
          }
        />
        <Route
          path="season-players"
          element={
            <AccessGuard permission="manage_teams" currentUser={currentUser}>
              <SeasonPlayersManagement />
            </AccessGuard>
          }
        />
        <Route
          path="season-player-approvals"
          element={
            <AccessGuard
              anyPermissions={['approve_player_registrations', 'manage_own_player_registrations']}
              currentUser={currentUser}
            >
              <SeasonPlayerApprovalPage currentUser={currentUser} />
            </AccessGuard>
          }
        />

        <Route
          path="my-team"
          element={
            <AccessGuard
              permission="view_own_team"
              allowedRoles={['team_admin']}
              disallowedRoles={['super_admin']}
              currentUser={currentUser}
            >
              <MyTeamPage currentUser={currentUser} />
            </AccessGuard>
          }
        />

        <Route
          path="player-registrations"
          element={
            <AccessGuard
              permission="manage_own_player_registrations"
              allowedRoles={['team_admin']}
              disallowedRoles={['super_admin']}
              currentUser={currentUser}
            >
              <PlayerRegistrationsPage currentUser={currentUser} />
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
          path="matches-today"
          element={
            <AccessGuard permission="manage_matches" currentUser={currentUser}>
              <MatchDayManagement />
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
        <Route
          path="awards"
          element={
            <AccessGuard permission="view_reports" currentUser={currentUser}>
              <SeasonAwardsPage />
            </AccessGuard>
          }
        />
        <Route
          path="discipline"
          element={
            <AccessGuard permission="manage_matches" currentUser={currentUser}>
              <SeasonDisciplinePage />
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
