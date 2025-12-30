import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Calendar, FileText, LogOut, Shield, Activity, Eye, ScrollText } from 'lucide-react';
import { useAuth } from '@/layers/application/context/AuthContext';

const SupervisorLayout = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/supervisor/my-assignments', label: 'Lịch Giám Sát', icon: Calendar },
    { path: '/supervisor/reports', label: 'Báo Cáo', icon: FileText },
    { path: '/supervisor/regulations', label: 'Quy định', icon: ScrollText },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-900 to-purple-800 shadow-xl border-b-4 border-indigo-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo & Title */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                <Shield size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Giám Sát Viên</h1>
                <p className="text-sm text-indigo-200">Supervisor Portal</p>
              </div>
            </div>

            {/* User Info & Logout */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-purple-800/50 rounded-lg border border-indigo-400/30">
                <Eye size={20} className="text-indigo-300" />
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{user?.username || 'Supervisor'}</p>
                  <p className="text-xs text-indigo-300">Giám sát viên</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 shadow-lg"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex gap-1 -mb-px">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-6 py-3 font-medium transition-all duration-200 border-b-4 ${
                    isActive
                      ? 'bg-purple-800/50 text-white border-indigo-400'
                      : 'text-indigo-200 hover:text-white hover:bg-purple-800/30 border-transparent'
                  }`
                }
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-purple-900 to-purple-800 text-center py-4 mt-12">
        <p className="text-sm text-indigo-200">
          © 2025 Champion League Management - Supervisor Portal
        </p>
      </footer>
    </div>
  );
};

export default SupervisorLayout;
