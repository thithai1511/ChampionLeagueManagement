import React, { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { hasAdminPortalAccess } from './apps/admin/utils/accessControl'
import { useAuth } from './layers/application/context/AuthContext'
import OfflineDetector from './shared/components/OfflineDetector'

// Lazy load apps for better performance
const PublicApp = lazy(() => import('./apps/public/PublicApp'))
const AdminApp = lazy(() => import('./apps/admin/AdminApp'))
const RefereeApp = lazy(() => import('./apps/referee/RefereeApp'))
const SupervisorApp = lazy(() => import('./apps/supervisor/SupervisorApp'))
const PlayerApp = lazy(() => import('./apps/player/PlayerApp'))
const TeamAdminApp = lazy(() => import('./apps/admin_team/TeamAdminApp'))
const LoginPage = lazy(() => import('./apps/admin/pages/LoginPage'))

// Loading component
const AppLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
    <div className="text-center">
      <div className="inline-block animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
      <p className="text-white text-lg font-semibold">Đang tải...</p>
    </div>
  </div>
)

const AdminRoute = ({ children }) => {
  const location = useLocation()
  const { isAuthenticated, user, status } = useAuth()
  const isAdminAuthenticated = isAuthenticated && hasAdminPortalAccess(user)

  if (status === 'checking') {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  }

  if (!isAdminAuthenticated) {
    return <Navigate to="/portal" replace />
  }

  return children
}

const RefereeRoute = ({ children }) => {
  const location = useLocation()
  const { isAuthenticated, user, status } = useAuth()
  // Check for match_official role (includes both user.role string or user.roles array)
  const isMatchOfficial = isAuthenticated && (
    user?.role === 'match_official' || 
    user?.roles?.includes('match_official')
  )

  if (status === 'checking') {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  }

  if (!isMatchOfficial) {
    return <Navigate to="/portal" replace />
  }

  return children
}

const SupervisorRoute = ({ children }) => {
  const location = useLocation()
  const { isAuthenticated, user, status } = useAuth()
  // Check for supervisor role
  const isSupervisor = isAuthenticated && (
    user?.role === 'supervisor' || 
    user?.roles?.includes('supervisor')
  )

  if (status === 'checking') {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  }

  if (!isSupervisor) {
    return <Navigate to="/portal" replace />
  }

  return children
}

const PlayerRoute = ({ children }) => {
  const location = useLocation()
  const { isAuthenticated, user, status } = useAuth()
  // Check for player role
  const isPlayer = isAuthenticated && (
    user?.role === 'player' || 
    user?.roles?.includes('player')
  )

  if (status === 'checking') {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  }

  if (!isPlayer) {
    return <Navigate to="/portal" replace />
  }

  return children
}

const TeamAdminRoute = ({ children }) => {
  const location = useLocation()
  const { isAuthenticated, user, status } = useAuth()
  // Check for team_admin role
  const isTeamAdmin = isAuthenticated && (
    user?.role === 'team_admin' || 
    user?.roles?.includes('team_admin')
  )

  if (status === 'checking') {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  }

  if (!isTeamAdmin) {
    return <Navigate to="/portal" replace />
  }

  return children
}

const AdminLoginRoute = ({ children }) => {
  const { isAuthenticated, user, status } = useAuth()
  
  if (status === 'checking') {
    return null
  }

  if (isAuthenticated && user) {
    const userRoles = Array.isArray(user.roles) ? user.roles : []
    const isSupervisor = user.role === 'supervisor' || userRoles.includes('supervisor')
    const isMatchOfficial = user.role === 'match_official' || userRoles.includes('match_official')
    
    // Redirect supervisor to supervisor portal
    if (isSupervisor) {
      return <Navigate to="/supervisor/my-assignments" replace />
    }
    
    // Redirect match_official to referee portal
    if (isMatchOfficial) {
      return <Navigate to="/referee/my-matches" replace />
    }
    
    // For other admin roles, redirect to admin dashboard
    const isAdminAuthenticated = hasAdminPortalAccess(user)
    if (isAdminAuthenticated) {
      return <Navigate to="/admin/dashboard" replace />
    }
    
    // If authenticated but not admin, redirect to portal
    return <Navigate to="/portal" replace />
  }

  return children
}

function App() {
  const { user, status, isAuthenticated, login, logout } = useAuth()
  const isAdminAuthenticated = isAuthenticated && hasAdminPortalAccess(user)

  const handleAdminLogin = async (credentials) => {
    const loggedInUser = await login(credentials)
    if (!hasAdminPortalAccess(loggedInUser)) {
      await logout()
      throw new Error('Tài khoản của bạn không có quyền truy cập khu vực quản trị.')
    }
    return loggedInUser
  }

  const handleAdminLogout = async () => {
    await logout()
  }

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-center">
          <div className="inline-block animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
          <p className="text-white text-lg font-semibold">Đang khôi phục phiên đăng nhập...</p>
        </div>
      </div>
    )
  }

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <div className="min-h-screen">
        <OfflineDetector />
        <Suspense fallback={<AppLoading />}>
          <Routes>
            {/* Public Portal Routes */}
            <Route path="/*" element={<PublicApp />} />
            
            {/* Referee Portal Routes */}
            <Route 
              path="/referee/*" 
              element={
                <RefereeRoute>
                  <RefereeApp />
                </RefereeRoute>
              } 
            />
            
            {/* Supervisor Portal Routes */}
            <Route 
              path="/supervisor/*" 
              element={
                <SupervisorRoute>
                  <SupervisorApp />
                </SupervisorRoute>
              } 
            />
            
            {/* Player Portal Routes */}
            <Route 
              path="/player/*" 
              element={
                <PlayerRoute>
                  <PlayerApp />
                </PlayerRoute>
              } 
            />
            
            {/* Team Admin Portal Routes */}
            <Route 
              path="/admin-team/*" 
              element={
                <TeamAdminRoute>
                  <TeamAdminApp currentUser={user} />
                </TeamAdminRoute>
              } 
            />
            
            {/* Admin Dashboard Routes */}
            <Route 
              path="/admin/login" 
              element={
                <AdminLoginRoute>
                  <LoginPage onLogin={handleAdminLogin} isAuthenticated={isAdminAuthenticated} />
                </AdminLoginRoute>
              } 
            />
            <Route 
              path="/admin/*" 
              element={
                <AdminRoute>
                  <AdminApp onLogout={handleAdminLogout} currentUser={user} />
                </AdminRoute>
              } 
            />
          </Routes>
        </Suspense>
      </div>
    </Router>
  )
}

export default App
