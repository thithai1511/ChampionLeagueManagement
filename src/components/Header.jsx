import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, ChevronDown, Search, Globe, User, ShoppingCart, Bell } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'

const Header = () => {
  const { t } = useTranslation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCompetitionDropdownOpen, setIsCompetitionDropdownOpen] = useState(false)
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navigationItems = [
    { name: t('nav.standings'), path: '/standings' },
    { name: t('nav.matches'), path: '/matches' },
    { name: t('nav.teams'), path: '/teams' },
    { name: 'Cầu thủ', path: '/player-lookup' },
    { name: t('nav.stats'), path: '/stats' },
    { name: t('nav.news'), path: '/news' },
    { name: t('nav.videos'), path: '/video' },
    { name: 'Game', path: '/gaming' },
  ]

  const competitions = [
    { name: 'Cúp C1 Việt Nam', path: '/champions-league', active: true },
    { name: 'Cúp C2 Việt Nam', path: '/europa-league' },
    { name: 'Cúp Conference', path: '/conference-league' },
    { name: 'Siêu cúp Việt Nam', path: '/super-cup' },
    { name: 'Giải trẻ', path: '/youth-league' },
    { name: 'Cúp C1 nữ', path: '/womens-champions-league' },
    { name: 'Cúp C1 Futsal', path: '/futsal-champions-league' },
  ]

  const userMenuItems = [
    { name: 'Hồ sơ của tôi', path: '/profile' },
    { name: 'Vé của tôi', path: '/tickets' },
    { name: 'Đội hình ảo', path: '/fantasy' },
    { name: 'Dự đoán', path: '/predictions' },
    { name: 'Cài đặt', path: '/settings' },
  ]

  return (
    <header className={`uefa-nav sticky top-0 z-50 transition-all duration-300 ${isScrolled ? 'shadow-lg' : ''}`}>
      {/* Top Bar */}
      <div className="bg-uefa-dark text-white py-2">
        <div className="uefa-container">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-6">
              <span className="font-medium">Trang web chính thức của UEFA</span>
              <div className="hidden md:flex items-center space-x-4">
                <LanguageSwitcher />
                <span className="text-uefa-gray">|</span>
                <a href="#" className="hover:text-uefa-gold transition-colors">
                  <Bell size={16} className="inline mr-1" />
                  Thông báo
                </a>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <a href="#" className="hover:text-uefa-gold transition-colors">Cửa hàng</a>
              <a href="#" className="hover:text-uefa-gold transition-colors">Vé</a>
              <a href="#" className="hover:text-uefa-gold transition-colors">Đội hình ảo</a>
              <a href="#" className="hover:text-uefa-gold transition-colors">Game</a>
              <span className="text-uefa-gray hidden md:inline">|</span>
              <div className="relative hidden md:block">
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center space-x-1 hover:text-uefa-gold transition-colors"
                >
                  <User size={16} />
                  <span>{t('nav.login')}</span>
                  <ChevronDown size={14} className={`transform transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isUserDropdownOpen && (
                  <div className="uefa-dropdown right-0">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="text-sm font-medium text-uefa-dark">Chào mừng trở lại!</p>
                      <p className="text-xs text-uefa-gray">Truy cập tài khoản UEFA của bạn</p>
                    </div>
                    {userMenuItems.map((item) => (
                      <Link
                        key={item.name}
                        to={item.path}
                        className="uefa-dropdown-item"
                        onClick={() => setIsUserDropdownOpen(false)}
                      >
                        {item.name}
                      </Link>
                    ))}
                    <div className="border-t border-gray-200 px-4 py-2">
                      <button className="text-sm text-uefa-red hover:text-uefa-dark transition-colors">
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="uefa-container">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-uefa-blue to-uefa-light-blue rounded-full flex items-center justify-center shadow-lg">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L13.09 8.26L20 9L13.09 15.74L12 22L10.91 15.74L4 9L10.91 8.26L12 2Z" fill="white"/>
                </svg>
              </div>
              <div className="hidden md:block">
                <div className="text-uefa-blue font-bold text-xl">UEFA</div>
                <div className="text-uefa-gray text-sm font-medium">Cúp C1 Việt Nam</div>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              {/* Competition Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsCompetitionDropdownOpen(!isCompetitionDropdownOpen)}
                  className="flex items-center space-x-1 text-uefa-dark-gray hover:text-uefa-blue font-medium transition-colors py-2"
                >
                  <span>Giải đấu</span>
                  <ChevronDown size={16} className={`transform transition-transform ${isCompetitionDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isCompetitionDropdownOpen && (
                  <div className="uefa-dropdown w-64">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="text-sm font-semibold text-uefa-dark">Giải đấu UEFA</p>
                    </div>
                    {competitions.map((competition) => (
                      <Link
                        key={competition.name}
                        to={competition.path}
                        className={`uefa-dropdown-item flex items-center justify-between ${competition.active ? 'text-uefa-blue font-semibold bg-uefa-light-gray' : ''}`}
                        onClick={() => setIsCompetitionDropdownOpen(false)}
                      >
                        <span>{competition.name}</span>
                        {competition.active && (
                          <span className="w-2 h-2 bg-uefa-blue rounded-full"></span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Main Navigation Items */}
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`uefa-nav-item py-2 px-1 border-b-2 border-transparent ${location.pathname === item.path ? 'active border-uefa-blue' : ''}`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Search and Actions */}
            <div className="flex items-center space-x-4">
              <div className="relative hidden md:block">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-uefa-gray" />
                <input
                  type="text"
                  placeholder="Tìm kiếm đội bóng, cầu thủ, trận đấu..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-uefa-blue focus:border-transparent w-80 transition-all duration-300"
                />
              </div>
              
              <button className="p-2 text-uefa-dark-gray hover:text-uefa-blue transition-colors md:hidden">
                <Search size={20} />
              </button>

              <button className="p-2 text-uefa-dark-gray hover:text-uefa-blue transition-colors relative">
                <ShoppingCart size={20} />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-uefa-red text-white text-xs rounded-full flex items-center justify-center">
                  0
                </span>
              </button>

              <button className="p-2 text-uefa-dark-gray hover:text-uefa-blue transition-colors relative">
                <Bell size={20} />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-uefa-red rounded-full"></span>
              </button>
              
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-uefa-dark-gray hover:text-uefa-blue transition-colors"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="uefa-mobile-menu">
          <div className="uefa-container py-4">
            <div className="space-y-4">
              {/* Competition Section */}
              <div>
                <div className="text-uefa-gray text-sm font-semibold uppercase tracking-wide mb-2">
                  Giải đấu
                </div>
                {competitions.map((competition) => (
                  <Link
                    key={competition.name}
                    to={competition.path}
                    className={`uefa-mobile-menu-item ${competition.active ? 'text-uefa-blue font-semibold' : ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {competition.name}
                  </Link>
                ))}
              </div>

              {/* Navigation Section */}
              <div>
                <div className="text-uefa-gray text-sm font-semibold uppercase tracking-wide mb-2">
                  Điều hướng
                </div>
                {navigationItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`uefa-mobile-menu-item ${location.pathname === item.path ? 'text-uefa-blue font-semibold' : ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

export default Header
