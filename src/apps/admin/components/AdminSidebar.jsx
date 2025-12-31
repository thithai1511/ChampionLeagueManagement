import React, { useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { hasAnyPermission, hasPermission } from '../utils/accessControl'
import uclLogo from '@/assets/images/UEFA_CHAMPIONS_LEAGUE.png'
// 1. Import icon mới
import {
  Users,
  Calendar,
  UserCheck,
  FileText,
  Settings,
  Trophy,
  Target,
  Shield,
  Globe,
  Swords,
  PlayCircle,
  ScrollText,
  History,
  KeyRound,
  Sparkles,
  Zap,
  Award,
  AlertTriangle,
  Mail,
  Building2
} from 'lucide-react'

const MENU_SECTIONS = [
  {
    title: 'Đội của tôi',
    allowedRoles: ['team_admin'],
    disallowedRoles: ['super_admin'],
    items: [
      { name: 'Đội của tôi', path: '/admin/my-team', icon: Users, permission: 'view_own_team' },
      { name: 'Hồ sơ CLB', path: '/admin/club-profile', icon: Building2, permission: 'view_own_team' },
      {
        name: 'Đăng ký cầu thủ',
        path: '/admin/players',
        icon: UserCheck,
        anyPermissions: ['manage_teams', 'manage_own_player_registrations'],
        disallowedRoles: ['super_admin']
      },
      { name: 'Đăng ký mùa giải', path: '/admin/player-registrations', icon: FileText, permission: 'manage_own_player_registrations' },
      { name: 'Đăng ký thi đấu', path: '/admin/match-lineup-registration', icon: Target, permission: 'view_own_team' }
    ]
  },
  {
    title: 'Quản lý giải đấu',
    items: [
      { name: 'Mùa giải & Quy tắc', path: '/admin/seasons', icon: Swords, permission: 'manage_teams' },
      { name: 'Đội bóng', path: '/admin/teams', icon: Users, permission: 'manage_teams' },
      { name: 'Cầu thủ', path: '/admin/players', icon: UserCheck, anyPermissions: ['manage_teams', 'approve_player_registrations'] },
      { name: 'Trận đấu', path: '/admin/matches', icon: Calendar, permission: 'manage_matches' },
      { name: 'Thống kê', path: '/admin/statistics', icon: Trophy, permission: 'manage_matches' },
      { name: 'Trọng tài & Giám sát', path: '/admin/officials', icon: Shield, permission: 'manage_matches' },
      { name: 'Báo cáo Trọng tài', path: '/admin/referee-reports', icon: FileText, permission: 'manage_matches' },
      { name: 'Báo cáo Giám sát', path: '/admin/supervisor-reports', icon: FileText, permission: 'manage_matches' }
    ]
  },
  {
    title: 'Hệ thống',
    items: [
      { name: 'Quản lý người dùng', path: '/admin/users', icon: Shield, permission: 'manage_users' },
      { name: 'Vai trò & Quyền', path: '/admin/roles', icon: KeyRound, permission: 'manage_users' }
    ]
  },
  {
    title: 'Thông tin',
    items: [
      { name: 'Quy định', path: '/admin/regulations', icon: ScrollText }
    ]
  }
]

const AdminSidebar = ({ currentUser }) => {
  const location = useLocation()
  const navigate = useNavigate()

  const hasAllowedRole = (allowedRoles) => {
    if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
      return true
    }
    const roles = Array.isArray(currentUser?.roles) ? currentUser.roles : []
    return allowedRoles.some((role) => roles.includes(role))
  }

  const hasDisallowedRole = (disallowedRoles) => {
    if (!Array.isArray(disallowedRoles) || disallowedRoles.length === 0) {
      return false
    }
    const roles = Array.isArray(currentUser?.roles) ? currentUser.roles : []
    return disallowedRoles.some((role) => roles.includes(role))
  }

  const filteredMenu = useMemo(() => {
    return MENU_SECTIONS
      .filter((section) => hasAllowedRole(section.allowedRoles) && !hasDisallowedRole(section.disallowedRoles))
      .map((section) => {
        const items = section.items.filter((item) => {
          if (!hasAllowedRole(item.allowedRoles) || hasDisallowedRole(item.disallowedRoles)) {
            return false
          }

          // If the menu item explicitly allows certain roles, grant visibility
          // to those roles regardless of permission checks (useful for supervisor view-only links).
          if (Array.isArray(item.allowedRoles) && item.allowedRoles.length > 0 && hasAllowedRole(item.allowedRoles)) {
            return true
          }

          // Special case: supervisors should be able to SEE the Matches page (view-only)
          // even if they don't hold the 'manage_matches' permission.
          if (item.permission === 'manage_matches') {
            const roles = Array.isArray(currentUser?.roles) ? currentUser.roles : []
            if (roles.includes('supervisor') || currentUser?.role === 'supervisor') {
              return true
            }
          }

          return Array.isArray(item.anyPermissions)
            ? hasAnyPermission(currentUser, item.anyPermissions)
            : hasPermission(currentUser, item.permission)
        })

        return { ...section, items }
      })
      .filter((section) => section.items.length > 0)
  }, [currentUser])

  return (
    <aside className="w-72 bg-gradient-to-b from-[#0a1628] via-[#071020] to-[#030812] text-white h-screen flex flex-col overflow-hidden relative">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-600/10 to-transparent"></div>
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl"></div>
        {/* Star pattern overlay */}
        <div className="absolute inset-0 ucl-stars-pattern opacity-30"></div>
      </div>

      {/* Logo Section */}
      <div className="relative z-10 p-5 border-b border-white/10">
        <div 
          className="flex items-center gap-4 cursor-pointer group/logo"
          onClick={() => navigate('/admin/dashboard')}
        >
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl blur-lg opacity-60 group-hover:opacity-80 transition-opacity"></div>
            <div className="relative w-14 h-14 bg-gradient-to-br from-[#0a1628] to-[#071020] rounded-xl p-1.5 ring-1 ring-white/20 group-hover/logo:ring-cyan-400/50 transition-all">
              <img src={uclLogo} alt="UEFA Champions League" className="w-full h-full object-contain" />
            </div>
          </div>
          <div>
            <div className="font-black text-lg tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-cyan-200 group-hover/logo:from-cyan-200 group-hover/logo:via-blue-200 group-hover/logo:to-white transition-all">
              UEFA Admin
            </div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-blue-300/50 font-semibold flex items-center gap-1 group-hover/logo:text-cyan-300/70 transition-colors">
              <Sparkles size={10} className="text-cyan-400" />
              Champions League
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 mt-2 min-h-0 overflow-y-auto px-3 py-2 ucl-scrollbar relative z-10">
        {filteredMenu.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-5">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-blue-400/60 mb-3 px-3 flex items-center gap-2">
              <span className="w-6 h-[1px] bg-gradient-to-r from-blue-500/50 to-transparent"></span>
              {section.title}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
                return (
                  <li key={item.name}>
                    <Link
                      to={item.path}
                      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ${isActive
                          ? 'bg-gradient-to-r from-blue-600/30 via-blue-500/20 to-transparent text-white shadow-lg shadow-blue-500/10'
                          : 'text-blue-200/60 hover:text-white hover:bg-white/5'
                        }`}
                    >
                      {isActive && (
                        <>
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-cyan-400 via-blue-500 to-purple-500 rounded-r-full shadow-[0_0_10px_2px_rgba(59,130,246,0.5)]"></span>
                          <span className="absolute inset-0 rounded-xl ring-1 ring-blue-500/30"></span>
                        </>
                      )}
                      <span className={`relative z-10 p-1.5 rounded-lg transition-all duration-300 ${isActive
                          ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30'
                          : 'bg-white/5 text-blue-300/70 group-hover:bg-white/10 group-hover:text-cyan-300'
                        }`}>
                        <item.icon size={16} />
                      </span>
                      <span className={`font-medium text-sm transition-all duration-300 ${isActive ? 'translate-x-1' : 'group-hover:translate-x-1'}`}>
                        {item.name}
                      </span>
                      {isActive && (
                        <Zap size={12} className="ml-auto text-cyan-400 animate-pulse" />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* UCL Badge */}
      <div className="relative z-10 mt-auto border-t border-white/10 p-4">
        <div className="flex items-center justify-center gap-2 text-[10px] text-blue-400/40 uppercase tracking-widest">
          <Trophy size={12} />
          <span>Official Admin Portal</span>
        </div>
      </div>
    </aside>
  )
}

export default AdminSidebar
