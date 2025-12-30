import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RefereeLayout from './components/RefereeLayout';
import MyMatchesPage from './pages/MyMatchesPage';
import MatchControlPage from './pages/MatchControlPage';
import ReportsPage from './pages/ReportsPage';

const RefereeApp = () => {
  return (
    <Routes>
      <Route path="/" element={<RefereeLayout />}>
        <Route index element={<Navigate to="my-matches" replace />} />
        <Route path="my-matches" element={<MyMatchesPage />} />
        <Route path="match/:matchId" element={<MatchControlPage />} />
        <Route path="reports" element={<ReportsPage />} />
      </Route>
    </Routes>
  );
};

export default RefereeApp;
