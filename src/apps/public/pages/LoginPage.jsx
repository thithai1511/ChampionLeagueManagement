import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Loader2, Lock, LogIn, ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '../../../layers/application/context/AuthContext'
import { hasAdminPortalAccess } from '../../admin/utils/accessControl'

const LoginPage = () => {
  const { login, status, isAuthenticated, user } = useAuth()
  const [formData, setFormData] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const successMessage = location.state?.registrationSuccess
    ? 'Tạo tài khoản thành công. Vui lòng đăng nhập để tiếp tục.'
    : ''

  const authStateLabel = useMemo(() => {
    if (status === 'checking') return 'Đang khôi phục phiên...'
    if (status === 'authenticating') return 'Đang đăng nhập...'
    if (status === 'authenticated') return 'Đã đăng nhập'
    return 'Chưa đăng nhập'
  }, [status])

  const resolveRedirect = (signedInUser) => {
    const userRoles = Array.isArray(signedInUser?.roles) ? signedInUser.roles : []
    const isSupervisor = signedInUser?.role === 'supervisor' || userRoles.includes('supervisor')
    const isMatchOfficial = signedInUser?.role === 'match_official' || userRoles.includes('match_official')
    const isReferee = signedInUser?.role === 'referee' || userRoles.includes('referee')
    
    // Redirect supervisor to supervisor portal
    if (isSupervisor) {
      return '/supervisor/my-assignments'
    }
    
    // Redirect match_official/referee to referee portal
    if (isMatchOfficial || isReferee) {
      return '/referee/my-matches'
    }
    
    const preferred = hasAdminPortalAccess(signedInUser) ? '/admin' : '/portal'
    const requested = location.state?.from
    const authPages = ['/login', '/register', '/signup']

    if (!requested || authPages.includes(requested)) {
      return preferred
    }

    if (requested.startsWith('/admin') && !hasAdminPortalAccess(signedInUser)) {
      return '/portal'
    }

    return requested
  }

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(resolveRedirect(user), { replace: true })
    }
  }, [isAuthenticated, user, navigate, location.state])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    try {
      const signedInUser = await login(formData)
      navigate(resolveRedirect(signedInUser), { replace: true })
    } catch (err) {
      setError(err?.message ?? 'Không thể đăng nhập. Vui lòng kiểm tra lại thông tin.')
    }
  }

  const isLoading = status === 'authenticating'

  return (
    <div className="py-14">
      <div className="uefa-container max-w-5xl mx-auto">
        <div className="mb-8 text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
            <ShieldCheck size={14} />
            Đăng nhập an toàn
          </p>
          <h1 className="mt-3 text-3xl font-bold text-gray-900">Chào mừng quay lại</h1>
          <p className="text-gray-600">Đăng nhập để truy cập cổng trải nghiệm của bạn.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-600/10 p-3 text-blue-600">
                <LogIn size={18} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Trạng thái xác thực</p>
                <p className="text-lg font-semibold text-gray-900">{authStateLabel}</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${status === 'authenticated' ? 'bg-green-500' : 'bg-gray-300'}`} />
                Người dùng đã đăng nhập sẽ được chuyển về cổng phù hợp tự động.
              </li>
              <li className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${status === 'authenticating' ? 'bg-amber-400' : 'bg-gray-300'}`} />
                Khi đang đăng nhập sẽ hiển thị trạng thái tải và ngăn gửi trùng.
              </li>
              <li className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${status === 'anonymous' ? 'bg-blue-400' : 'bg-gray-300'}`} />
                Khi chưa đăng nhập sẽ hiển thị nút đăng nhập và tạo tài khoản.
              </li>
            </ul>

            <div className="mt-6 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-semibold mb-1">Điều hướng theo vai trò</p>
              <p className="leading-relaxed">
                Vai trò quản trị (admin, super_admin, quản lý giải đấu) sẽ vào trang quản trị. Các vai trò khác sẽ vào cổng người dùng.
              </p>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              Chưa có tài khoản?{' '}
              <Link to="/register" className="font-semibold text-blue-700 hover:text-blue-800">
                Tạo mới
              </Link>
              .
            </div>
          </div>

          <div className="lg:col-span-3 rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-6">
              {successMessage && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                  {successMessage}
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tên đăng nhập hoặc email</label>
                <div className="relative">
                  <UserRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    autoComplete="username"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 pl-10 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="ten.email@vidu.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mật khẩu</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="current-password"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 pl-10 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-600">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  Ghi nhớ trên thiết bị này
                </label>
                <Link to="/reset-password" className="font-semibold text-blue-700 hover:text-blue-800">
                  Quên mật khẩu?
                </Link>
              </div>

              {/* Consistent button spacing with admin login (py-3.5) */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3.5 text-white font-semibold shadow-md hover:from-blue-700 hover:to-blue-800 transition disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Đang đăng nhập...
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    Đăng nhập
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
