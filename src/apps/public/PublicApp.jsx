import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PublicLayout from './components/PublicLayout';
import HomePage from './pages/HomePage';
import StandingsPage from './pages/StandingsPage';
import MatchesPage from './pages/MatchesPage';
import TeamsPage from './pages/TeamsPage';
import StatsPage from './pages/StatsPage';
import NewsPage from './pages/NewsPage';
import NewsDetailPage from './pages/NewsDetailPage';
import VideoPage from './pages/VideoPage';
import GamingPage from './pages/GamingPage';
import TeamProfilePage from './pages/TeamProfilePage';
import LineupSubmissionPage from './pages/LineupSubmissionPage';
import SignUpPage from './pages/SignUpPage';
import ProfilePage from './pages/ProfilePage';
import MatchCenterPage from './pages/MatchCenterPage';
import MatchDetailPage from './pages/MatchDetailPage';
import PlayerProfilePage from './pages/PlayerProfilePage';
import PlayerLookup from '../../pages/PlayerLookup';
import LoginPage from './pages/LoginPage';
import PortalHomePage from './pages/PortalHomePage';
import PortalGuard from './components/PortalGuard';
import HistoryPage from './pages/HistoryPage';
import { Navigate } from 'react-router-dom';

const PublicApp = () => {
  return (
    <Routes>
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="standings" element={<StandingsPage />} />
        <Route path="matches" element={<MatchesPage />} />
        <Route path="teams" element={<TeamsPage />} />
        <Route path="player-lookup" element={<PlayerLookup />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="news" element={<NewsPage />} />
        <Route path="news/:slug" element={<NewsDetailPage />} />
        <Route path="video" element={<VideoPage />} />
        <Route path="gaming" element={<GamingPage />} />
        <Route path="match-center" element={<MatchCenterPage />} />
        <Route path="matches/:matchId" element={<MatchDetailPage />} />
        <Route path="submit-lineup" element={<LineupSubmissionPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<SignUpPage />} />
        <Route path="signup" element={<Navigate to="/register" replace />} />
        <Route
          path="portal"
          element={
            <PortalGuard>
              <PortalHomePage />
            </PortalGuard>
          }
        />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="teams/:teamId" element={<TeamProfilePage />} />
        <Route path="players/:playerId" element={<PlayerProfilePage />} />
      </Route>
    </Routes>
  );
};

export default PublicApp;
