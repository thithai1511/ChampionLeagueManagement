import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, Search, Globe, ShoppingCart, Bell, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import uefaPrimaryMark from '@/assets/images/UEFA_Champions_League_logo.svg.png';
import { useAuth } from '../../../layers/application/context/AuthContext';
import LanguageSwitcher from '../../../components/LanguageSwitcher';
import { hasAdminPortalAccess } from '../../admin/utils/accessControl';
import { toRoleLabel } from '../../../shared/utils/vi';
import LiveMatchTicker from './LiveMatchTicker';

const PublicHeader = () => {
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const isAdmin = isAuthenticated && hasAdminPortalAccess(user);
  const userRoles = Array.isArray(user?.roles) && user.roles.length ? user.roles : ['viewer'];
  const displayName = user?.firstName || user?.lastName
    ? [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
    : user?.username ?? user?.email ?? 'Người dùng';
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const primaryDestination = isAdmin ? '/admin' : '/portal';

  const handleLogout = async () => {
    await logout();
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigationItems = [
    { name: t('nav.standings'), path: '/standings' },
    { name: t('nav.matches'), path: '/matches' },
    { name: t('nav.teams'), path: '/teams' },
    { name: t('nav.stats'), path: '/stats' },
    { name: t('nav.news'), path: '/news' },
    { name: t('nav.videos'), path: '/video' },
  ];

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled ? 'shadow-xl' : ''}`}>
      {/* Top Bar */}
      <div className="bg-[#1a2332] border-b border-white/5">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex items-center justify-between h-9 text-xs">
            <div className="flex items-center gap-6">
              <span className="text-white/70 font-medium hidden md:flex items-center gap-2">
                <Globe size={13} />
                Trang chính thức của Giải Bóng Đá Việt Nam
              </span>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <span className="text-white/30 hidden md:inline">|</span>
              {isAuthenticated ? (
                <div className="hidden md:flex items-center gap-3">
                  <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold uppercase text-white">
                      {initials}
                    </div>
                    <div className="leading-tight">
                      <p className="text-white text-xs font-semibold">{displayName}</p>
                      <p className="text-[10px] uppercase text-blue-100 font-semibold">{toRoleLabel(userRoles[0])}</p>
                    </div>
                  </div>
                  <Link
                    to={primaryDestination}
                    className="inline-flex items-center px-3 py-1 bg-[#00d4ff] text-[#0a1929] font-semibold rounded hover:bg-[#00b8e6] transition-all"
                  >
                    {isAdmin ? 'Quản trị' : 'Cổng'}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                  >
                    <LogOut size={14} />
                    Đăng xuất
                  </button>
                </div>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="hidden md:inline-flex items-center text-white/70 hover:text-white transition-colors"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    to="/register"
                    className="hidden md:inline-flex items-center px-3 py-1 bg-[#00d4ff] text-[#0a1929] font-semibold rounded hover:bg-[#00b8e6] transition-all"
                  >
                    Tạo tài khoản
                  </Link>
                  <Link
                    to="/admin/login"
                    className="hidden md:inline-flex items-center text-white/70 hover:text-white transition-colors"
                  >
                    Quản trị
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="bg-[#0a1929] border-b border-white/5">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden hover:border-[#00d4ff]/50 transition-all">
                <img
                  src={uefaPrimaryMark}
                  alt="Cúp C1 Việt Nam"
                  className="h-10 w-10 object-contain"
                />
              </div>
              <div className="hidden md:block">
                <div className="text-white font-bold text-lg leading-tight">UEFA</div>
                <div className="text-[#00d4ff] text-[10px] font-semibold uppercase tracking-wider">Cúp C1 Việt Nam</div>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center">
              {/* Competition Label - Static (only one competition) */}
              <div className="px-4 py-2">
                <span className="text-[#00d4ff] font-semibold text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#00d4ff] rounded-full"></span>
                  Cúp C1 Việt Nam
                </span>
              </div>

              {/* Main Navigation Items */}
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'text-[#00d4ff]'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              {isAuthenticated && (
                <Link
                  key="portal-nav"
                  to={primaryDestination}
                  className={`px-4 py-2 text-sm font-semibold transition-colors ${
                    location.pathname.startsWith(primaryDestination)
                      ? 'text-[#00d4ff]'
                      : 'text-white hover:text-white'
                  }`}
                >
                  {isAdmin ? 'Quản trị' : 'Cổng'}
                </Link>
              )}
            </nav>

            {/* Search and Actions */}
            <div className="flex items-center gap-2">
              <div className="relative hidden md:block">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  placeholder="Tìm kiếm đội, cầu thủ, trận đấu..."
                  className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#00d4ff]/50 focus:bg-white/10 w-64 transition-all"
                />
              </div>

              <button className="p-2 text-white/70 hover:text-white transition-colors md:hidden">
                <Search size={20} />
              </button>

              <button className="p-2 text-white/70 hover:text-white transition-colors relative">
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
              </button>

              <button className="p-2 text-white/70 hover:text-white transition-colors relative">
                <ShoppingCart size={20} />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#00d4ff] text-[#0a1929] text-[10px] font-bold rounded-full flex items-center justify-center">
                  0
                </span>
              </button>

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-white/70 hover:text-white transition-colors"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Live Match Ticker - API Integration */}
      <LiveMatchTicker />

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-[#0a1929] border-t border-white/5">
          <div className="max-w-[1400px] mx-auto px-4 py-6">
            <div className="space-y-6">
              {/* Navigation */}
              <div>
                <div className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-3">
                  Danh mục
                </div>
                {navigationItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`block px-4 py-2.5 rounded-lg text-sm transition-colors ${
                      location.pathname === item.path
                        ? 'text-[#00d4ff] font-semibold bg-white/5'
                        : 'text-white/80 hover:text-white hover:bg-white/5'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
                {isAuthenticated && (
                  <Link
                    to={primaryDestination}
                    className={`block px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                      location.pathname.startsWith(primaryDestination)
                        ? 'text-[#00d4ff] bg-white/5'
                        : 'text-white/80 hover:text-white hover:bg-white/5'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {isAdmin ? 'Quản trị' : 'Cổng'}
                  </Link>
                )}
              </div>

              {/* Account */}
              <div>
                <div className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-3">
                  Tài khoản
                </div>
                {isAuthenticated ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white font-semibold uppercase">
                        {initials}
                      </div>
                      <div>
                        <p className="text-white font-semibold">{displayName}</p>
                        <div className="mt-1 flex flex-wrap gap-1 text-[10px] uppercase text-blue-100">
                          {userRoles.map((role) => (
                            <span key={role} className="rounded-full bg-white/10 px-2 py-0.5 font-semibold">
                              {toRoleLabel(role)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Link
                      to={primaryDestination}
                      className="block px-4 py-2.5 rounded-lg text-sm text-[#0a1929] font-semibold bg-[#00d4ff] hover:bg-[#00b8e6] transition-colors text-center"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Vào {isAdmin ? 'Quản trị' : 'Cổng'}
                    </Link>
                    <Link
                      to="/profile"
                      className="block px-4 py-2.5 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors text-center"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Hồ sơ
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout()
                        setIsMobileMenuOpen(false)
                      }}
                      className="block w-full px-4 py-2.5 rounded-lg text-sm text-white/90 border border-white/10 hover:bg-white/5 transition-colors text-center"
                    >
                      Đăng xuất
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Link
                      to="/login"
                      className="block px-4 py-2.5 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Đăng nhập
                    </Link>
                    <Link
                      to="/register"
                      className="block px-4 py-2.5 rounded-lg text-sm text-[#0a1929] font-semibold bg-[#00d4ff] hover:bg-[#00b8e6] transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Tạo tài khoản
                    </Link>
                    <Link
                      to="/admin/login"
                      className="block px-4 py-2.5 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Đăng nhập quản trị
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default PublicHeader;
