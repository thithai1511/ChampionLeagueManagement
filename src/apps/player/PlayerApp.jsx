import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PlayerLayout from './components/PlayerLayout';
import PlayerDashboard from './pages/PlayerDashboard';
import MyProfile from './pages/MyProfile';
import MyMatches from './pages/MyMatches';
import MyStatistics from './pages/MyStatistics';

const PlayerApp = () => {
  return (
    <PlayerLayout>
      <Routes>
        <Route path="/" element={<PlayerDashboard />} />
        <Route path="/profile" element={<MyProfile />} />
        <Route path="/matches" element={<MyMatches />} />
        <Route path="/statistics" element={<MyStatistics />} />
        <Route path="*" element={<Navigate to="/player" replace />} />
      </Routes>
    </PlayerLayout>
  );
};

export default PlayerApp;
