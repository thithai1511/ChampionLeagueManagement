import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SupervisorLayout from './components/SupervisorLayout';
import MyAssignmentsPage from './pages/MyAssignmentsPage';
import MatchSupervisionPage from './pages/MatchSupervisionPage';
import ReportsPage from './pages/ReportsPage';
import RegulationsPageWrapper from '../../components/RegulationsPageWrapper';

const SupervisorApp = () => {
  return (
    <SupervisorLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/supervisor/my-assignments" replace />} />
        <Route path="/my-assignments" element={<MyAssignmentsPage />} />
        <Route path="/match/:matchId" element={<MatchSupervisionPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/regulations" element={<RegulationsPageWrapper />} />
      </Routes>
    </SupervisorLayout>
  );
};

export default SupervisorApp;
