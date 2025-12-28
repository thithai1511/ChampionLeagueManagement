import React, { useMemo, useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Search, Settings, User, LogOut, Sparkles, Menu, X } from 'lucide-react'
import { toRoleLabel } from '../../../shared/utils/vi'
import NotificationService from '../../../layers/application/services/NotificationService'
import ApiService from '../../../layers/application/services/ApiService'

const AdminHeader = ({ onLogout, currentUser }) => {
  const navigate = useNavigate()
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const [pendingInvitationsCount, setPendingInvitationsCount] = useState(0)
  const notificationRef = useRef(null)
  const profileRef = useRef(null)

  const displayName = useMemo(() => {
    if (!currentUser) {
      return 'Quản trị viên'
    }
    if (currentUser.firstName || currentUser.lastName) {
      return `${currentUser.firstName ?? ''} ${currentUser.lastName ?? ''}`.trim()
    }
    return currentUser.username ?? 'Quản trị viên'
  }, [currentUser])

  const displayRole = useMemo(() => {
    const role = currentUser?.roles?.[0]
    if (!role) return 'Quản trị hệ thống'
    return toRoleLabel(role)
  }, [currentUser])

  // Load notifications on mount and periodically
  useEffect(() => {
    const loadNotifications = async () => {
      setLoadingNotifications(true)
      try {
        const data = await NotificationService.getNotifications({ pageSize: 10 })
        setNotifications(data)
      } catch (error) {
        console.error('Failed to load notifications:', error)
        // Keep empty array on error
        setNotifications([])
      } finally {
        setLoadingNotifications(false)
      }
    }

    loadNotifications()
    
    // Refresh notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000)
    
    return () => clearInterval(interval)
  }, [])

  // Load pending invitations count for team admin
  useEffect(() => {
    const loadPendingInvitations = async () => {
      // Only for team admin with assigned teams
      if (!currentUser?.teamIds || currentUser.teamIds.length === 0) return
      
      try {
        const response = await ApiService.get('/invitations/my-pending-count')
        setPendingInvitationsCount(response.count || 0)
      } catch (error) {
        console.error('Failed to load pending invitations count:', error)
      }
    }

    loadPendingInvitations()
    
    // Refresh every 30 seconds
    const interval = setInterval(loadPendingInvitations, 30000)
    return () => clearInterval(interval)
  }, [currentUser])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false)
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const getNotificationColor = (type) => {
    switch (type) {
      case 'info': return 'border-l-cyan-400 bg-cyan-500/10'
      case 'warning': return 'border-l-amber-400 bg-amber-500/10'
      case 'success': return 'border-l-emerald-400 bg-emerald-500/10'
      case 'error': return 'border-l-rose-400 bg-rose-500/10'
      default: return 'border-l-white/10 bg-white/5'
    }
  }

  return (
    <header className="sticky top-0 z-40 px-6 py-3 bg-gradient-to-r from-[#0a1628]/90 via-[#071020]/85 to-[#0a1628]/90 backdrop-blur-xl border-b border-white/10">
      <div className="flex items-center justify-between">
        {/* Left Side */}
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl blur-lg opacity-30"></div>
              <div className="relative px-4 py-2 bg-gradient-to-r from-[#0a1628] to-[#071020] rounded-xl border border-blue-500/30">
                <h1 className="text-lg font-black tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-cyan-200">
                  Cổng quản trị
                </h1>
              </div>
            </div>
            {currentUser?.roles && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-full border border-blue-400/20 text-sm font-bold text-cyan-300">
                <Sparkles size={12} className="text-cyan-400" />
                {displayRole}
              </span>
            )}
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden md:block group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
            <div className="relative flex items-center bg-white/5 rounded-xl border border-white/10 focus-within:border-cyan-500/40 transition-all">
              <Search size={16} className="ml-3 text-blue-200/40" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                className="bg-transparent px-3 py-2.5 text-sm w-56 text-slate-100 placeholder:text-blue-200/30 focus:outline-none"
              />
            </div>
          </div>

          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="relative p-2.5 text-blue-200/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 hover:border-white/20 transition-all"
            >
              <Bell size={18} />
              {(notifications.length > 0 || pendingInvitationsCount > 0) && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-rose-500 to-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-rose-500/30 animate-pulse">
                  {notifications.length + pendingInvitationsCount}
                </span>
              )}
            </button>

            {isNotificationOpen && (
              <div className="absolute right-0 mt-2 w-80 ucl-glass-card overflow-hidden shadow-2xl z-50">
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-transparent">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <Bell size={16} className="text-cyan-400" />
                    Thông báo
                  </h3>
                  <span className="text-[10px] font-bold text-blue-200/50 uppercase tracking-wider">
                    {notifications.length + pendingInvitationsCount} mới
                  </span>
                </div>
                <div className="max-h-72 overflow-y-auto ucl-scrollbar">
                  {/* Pending Invitations for Team Admin */}
                  {pendingInvitationsCount > 0 && (
                    <div 
                      className="p-4 border-l-4 border-l-yellow-500 bg-yellow-500/10 hover:bg-white/5 transition-all cursor-pointer group"
                      onClick={() => {
                        navigate('/admin/dashboard')
                        setIsNotificationOpen(false)
                      }}
                    >
                      <div className="font-medium text-slate-100 text-sm group-hover:text-cyan-200 transition-colors">
                        🎯 Bạn có {pendingInvitationsCount} lời mời tham gia mùa giải đang chờ phản hồi
                      </div>
                      <div className="text-blue-200/40 text-xs mt-1">Nhấn để xem chi tiết</div>
                    </div>
                  )}
                  
                  {loadingNotifications ? (
                    <div className="p-4 text-center text-blue-200/50 text-sm">
                      Đang tải thông báo...
                    </div>
                  ) : notifications.length === 0 && pendingInvitationsCount === 0 ? (
                    <div className="p-4 text-center text-blue-200/50 text-sm">
                      Không có thông báo mới
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div 
                        key={notification.id} 
                        className={`p-4 border-l-4 ${getNotificationColor(notification.type)} hover:bg-white/5 transition-all cursor-pointer group`}
                        onClick={() => {
                          // Navigate to audit log when clicking notification
                          navigate('/admin/audit-log')
                          setIsNotificationOpen(false)
                        }}
                      >
                        <div className="font-medium text-slate-100 text-sm group-hover:text-cyan-200 transition-colors">{notification.title}</div>
                        <div className="text-blue-200/40 text-xs mt-1">{notification.time}</div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-3 border-t border-white/10 text-center bg-white/[0.02]">
                  <button 
                    onClick={() => {
                      navigate('/admin/audit-log')
                      setIsNotificationOpen(false)
                    }}
                    className="text-cyan-400 hover:text-cyan-300 text-xs font-bold uppercase tracking-wider hover:underline transition-all"
                  >
                    Xem tất cả thông báo →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Settings */}
          <button 
            onClick={() => navigate('/settings')}
            className="p-2.5 text-blue-200/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 hover:border-white/20 transition-all"
            title="Cài đặt"
          >
            <Settings size={18} />
          </button>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center gap-3 p-1.5 pr-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 hover:border-white/20 transition-all"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg blur opacity-50"></div>
                <div className="relative w-9 h-9 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg">
                  <User size={16} className="text-white" />
                </div>
              </div>
              <div className="hidden md:block text-left">
                <div className="text-sm font-bold text-white leading-tight">{displayName}</div>
                <div className="text-[10px] text-blue-200/50 capitalize uppercase tracking-wider">{displayRole}</div>
              </div>
            </button>

            {isProfileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 ucl-glass-card overflow-hidden shadow-2xl z-50">
                <div className="p-4 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-cyan-500/5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                      <User size={20} className="text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-white">{displayName}</div>
                      <div className="text-xs text-blue-200/50">{currentUser?.email ?? '—'}</div>
                    </div>
                  </div>
                </div>
                <div className="py-2">
                  <button className="w-full text-left px-4 py-2.5 text-sm text-blue-100/80 hover:text-cyan-200 hover:bg-white/5 transition-all flex items-center gap-2">
                    <User size={14} />
                    Cài đặt hồ sơ
                  </button>
                  <button className="w-full text-left px-4 py-2.5 text-sm text-blue-100/80 hover:text-cyan-200 hover:bg-white/5 transition-all flex items-center gap-2">
                    <Settings size={14} />
                    Tuỳ chọn tài khoản
                  </button>
                  <button className="w-full text-left px-4 py-2.5 text-sm text-blue-100/80 hover:text-cyan-200 hover:bg-white/5 transition-all flex items-center gap-2">
                    <Bell size={14} />
                    Trợ giúp & hỗ trợ
                  </button>
                </div>
                <div className="border-t border-white/10 p-2">
                  <button
                    onClick={onLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-rose-300 hover:bg-rose-500/10 rounded-lg transition-all flex items-center gap-2 font-medium"
                  >
                    <LogOut size={14} />
                    Đăng xuất
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default AdminHeader
