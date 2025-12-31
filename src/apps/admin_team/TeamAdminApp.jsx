import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import TeamAdminLayout from './components/TeamAdminLayout';
import TeamAdminDashboard from './pages/TeamAdminDashboard';
import ClubProfilePage from './pages/ClubProfilePage';
import PlayerRegistrationsPage from './pages/PlayerRegistrationsPage';
import RegulationsPageWrapper from '../../components/RegulationsPageWrapper';

const TeamAdminApp = ({ currentUser }) => {
  return (
    <TeamAdminLayout>
      <Routes>
        <Route path="/" element={<TeamAdminDashboard currentUser={currentUser} />} />
        <Route path="/club-profile" element={<ClubProfilePage currentUser={currentUser} />} />
        <Route path="/player-registrations" element={<PlayerRegistrationsPage currentUser={currentUser} />} />
        <Route path="/regulations" element={<RegulationsPageWrapper />} />
        <Route path="*" element={<Navigate to="/admin-team" replace />} />
      </Routes>
    </TeamAdminLayout>
  );
};

export default TeamAdminApp;
