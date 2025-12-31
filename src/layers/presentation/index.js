// Presentation Layer - Frontend Applications
// This layer handles all user interface and user experience

export { default as PublicApp } from '../../apps/public/PublicApp'
export { default as AdminApp } from '../../apps/admin/AdminApp'

// Public Portal Components
export { default as PublicHeader } from '../../apps/public/components/PublicHeader'
export { default as PublicFooter } from '../../apps/public/components/PublicFooter'
export { default as StandingsTable } from '../../apps/public/components/StandingsTable'
export { default as MatchCard } from '../../apps/public/components/MatchCard'
export { default as NewsCard } from '../../apps/public/components/NewsCard'
export { default as LiveTicker } from '../../apps/public/components/LiveTicker'

// Admin Dashboard Components
export { default as AdminHeader } from '../../apps/admin/components/AdminHeader'
export { default as AdminSidebar } from '../../apps/admin/components/AdminSidebar'

// Shared UI Components
export { default as LoadingSpinner } from '../../shared/components/LoadingSpinner'
export { default as ErrorBoundary } from '../../shared/components/ErrorBoundary'
export { default as Modal } from '../../shared/components/Modal'
export { default as Toast } from '../../shared/components/Toast'

// Presentation Layer Configuration
export const PRESENTATION_CONFIG = {
  PUBLIC_ROUTES: [
    '/',
    '/standings',
    '/matches',
    '/teams',
    '/stats',
    '/news',
    '/video',
    '/gaming'
  ],
  ADMIN_ROUTES: [
    '/admin/dashboard',
    '/admin/teams',
    '/admin/matches',
    '/admin/players',
    '/admin/news',
    '/admin/users',
    '/admin/settings',
  ],
  PROTECTED_ROUTES: [
    '/admin/*'
  ]
}
