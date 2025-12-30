import React, { useState, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Lock, User, ArrowRight, Shield, Zap, Activity } from 'lucide-react'

// --- CẤU HÌNH ẢNH NỀN ---
const REMOTE_BACKGROUND = "https://images.unsplash.com/photo-1434648957308-5e6a859697e8?q=80&w=2574&auto=format&fit=crop"
import localBackground from '@/assets/images/background.jpg'

const LoginPage = ({ onLogin, isAuthenticated }) => {
  const location = useLocation()
  const redirectTo = location.state?.from || '/admin/dashboard'
  // ==========================================
  // LOGIC GIỮ NGUYÊN 100%
  // ==========================================
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const user = await onLogin(formData)
      // Check role and redirect match officials to referee portal
      if (user?.role === 'match_official' || user?.roles?.includes('match_official')) {
        window.location.href = '/referee/my-matches'
      }
    } catch (err) {
      setError(err?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  // const bgImage = REMOTE_BACKGROUND 
  const bgImage = localBackground

  // ==========================================
  // NEW UI - STRONG & CREATIVE (CYBER SPORT STYLE)
  // ==========================================
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center font-sans overflow-hidden bg-[#020617] text-white selection:bg-blue-500 selection:text-white">
      
      {/* 1. DYNAMIC BACKGROUND LAYERS */}
      <div className="absolute inset-0 z-0">
        {/* Base Image - Pure, No Filters, No Opacity reduction */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[3s] ease-out"
          style={{ 
            backgroundImage: `url('${bgImage}')`,
            transform: mounted ? 'scale(1.05)' : 'scale(1.1)'
          }}
        />
        
        {/* Đã xóa các lớp phủ (Gradient/Overlay/Noise) để giữ nguyên màu sắc gốc của ảnh nền */}
      </div>

      {/* 2. CREATIVE DECORATIONS */}
      {/* Đã xóa các khối sáng trang trí để không che khuất ảnh nền */}

      {/* 3. MAIN INTERFACE */}
      <div className={`relative z-10 w-full max-w-[460px] px-6 transition-all duration-700 cubic-bezier(0.175, 0.885, 0.32, 1.275) ${mounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'}`}>
        
        {/* THE CARD - Cấu trúc 2 lớp để tạo hiệu ứng viền phát sáng 3D */}
        <div className="group relative">
            
            {/* Layer Glow Border (Hiệu ứng viền sáng phía sau) */}
            <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-500 via-cyan-500 to-indigo-600 rounded-2xl opacity-50 blur-sm group-hover:opacity-100 transition duration-500 animate-tilt"></div>
            
            {/* Main Content Box */}
            <div className="relative bg-[#0a0f1e] rounded-2xl border border-white/10 shadow-[0_0_50px_-12px_rgba(59,130,246,0.5)] overflow-hidden">
              
              {/* Decorative Top Bar */}
              <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-cyan-400 to-indigo-600 shadow-[0_0_15px_rgba(56,189,248,0.5)]"></div>

              {/* Inner Content */}
              <div className="px-8 py-10">
                
                {/* Header: Mạnh mẽ, In hoa, Tracking rộng */}
                <div className="mb-10 text-center relative">
                  <div className="inline-flex items-center justify-center p-3 mb-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 shadow-inner">
                    <Shield className="w-10 h-10 text-blue-400" strokeWidth={1.5} />
                  </div>
                  <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-blue-200 tracking-wider uppercase drop-shadow-sm">
                    Cổng quản trị
                  </h1>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <div className="h-[1px] w-8 bg-blue-500/50"></div>
                    <p className="text-blue-400/60 text-[10px] font-bold tracking-[0.2em] uppercase">Cổng truy cập an toàn</p>
                    <div className="h-[1px] w-8 bg-blue-500/50"></div>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  {/* Error Box - Sharp & High Contrast */}
                  {error && (
                    <div className="bg-red-500/10 border-l-4 border-red-500 text-red-200 px-4 py-3 text-sm font-medium flex items-center shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                       <Activity className="w-4 h-4 mr-2 text-red-500 animate-pulse" />
                       {error}
                    </div>
                  )}

                  {/* Username Field */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-blue-300 uppercase tracking-wider ml-1">Tài khoản</label>
                    <div className="relative group/input">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                        <User size={18} className="text-blue-500/60 group-focus-within/input:text-cyan-400 transition-colors duration-300" />
                      </div>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        className="block w-full pl-11 pr-4 py-4 bg-[#020617]/50 border border-blue-900/30 rounded-lg text-white placeholder-blue-700/30 focus:outline-none focus:bg-[#020617]/80 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all font-mono tracking-wide"
                        placeholder="Tên đăng nhập"
                        required
                      />
                      {/* Decorative corner accent */}
                      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-blue-500/0 group-focus-within/input:border-cyan-400 transition-all duration-300"></div>
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-blue-300 uppercase tracking-wider ml-1">Mật khẩu</label>
                    <div className="relative group/input">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                        <Lock size={18} className="text-blue-500/60 group-focus-within/input:text-cyan-400 transition-colors duration-300" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="block w-full pl-11 pr-12 py-4 bg-[#020617]/50 border border-blue-900/30 rounded-lg text-white placeholder-blue-700/30 focus:outline-none focus:bg-[#020617]/80 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all font-mono tracking-wide"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-blue-500/40 hover:text-cyan-400 transition-colors z-10"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center cursor-pointer group">
                      <div className="relative">
                        <input type="checkbox" className="peer sr-only" />
                        <div className="w-4 h-4 border-2 border-blue-500/30 bg-[#020617] rounded-sm peer-checked:bg-cyan-500 peer-checked:border-cyan-500 transition-all"></div>
                        <div className="absolute top-0.5 left-0.5 opacity-0 peer-checked:opacity-100 text-black pointer-events-none transition-opacity">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                        </div>
                      </div>
                      <span className="ml-2.5 text-xs text-blue-400/70 group-hover:text-blue-300 font-medium transition-colors">Ghi nhớ đăng nhập</span>
                    </label>
                    <a href="#" className="text-xs text-cyan-500/80 hover:text-cyan-400 font-bold uppercase tracking-wide transition-colors border-b border-transparent hover:border-cyan-400/50">
                      Quên mật khẩu?
                    </a>
                  </div>

                  {/* Strong Action Button - Consistent spacing with public login */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group relative w-full overflow-hidden rounded-lg bg-blue-600 p-[1px] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900 mt-2"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 transition-all duration-300 group-hover:opacity-100 opacity-80" />
                    <span className="relative flex items-center justify-center w-full py-3.5 bg-[#0a0f1e] rounded-[7px] group-hover:bg-opacity-0 transition-all duration-300">
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                          <span className="text-white font-bold tracking-widest uppercase text-sm">Đang xác thực...</span>
                        </>
                      ) : (
                        <>
                          <span className="text-white font-bold tracking-widest uppercase text-sm group-hover:scale-105 transition-transform">Đăng nhập</span>
                          <ArrowRight size={18} className="ml-2 text-cyan-400 group-hover:translate-x-1 transition-transform duration-300" />
                        </>
                      )}
                    </span>
                    {/* Lighting effect on button */}
                    <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />
                  </button>

                </form>

                {/* Footer Info */}
                <div className="mt-8 pt-6 border-t border-white/5">
                  <div className="flex items-center justify-between text-[10px] text-blue-500/40 font-mono">
                     <div className="flex items-center gap-1.5">
                       <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
                       <span>HỆ THỐNG ĐANG HOẠT ĐỘNG</span>
                     </div>
                     <div className="tracking-widest opacity-70">V.2.5.0-RC</div>
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-[10px] text-blue-400/30 mb-1">CẦN HỖ TRỢ?</p>
                    <p className="text-[11px] text-blue-200/70 font-medium">Liên hệ quản trị viên để được cấp quyền truy cập.</p>
                  </div>
                </div>

              </div>
            </div>
        </div>
        
        {/* Shadow floor */}
        <div className="absolute -bottom-4 left-10 right-10 h-4 bg-black/50 blur-xl rounded-[100%]" />
      </div>
    </div>
  )
}

export default LoginPage
