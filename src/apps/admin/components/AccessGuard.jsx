import React from 'react'
import { Navigate } from 'react-router-dom'
import { hasAdminPortalAccess, hasAnyPermission, hasPermission } from '../utils/accessControl'

const AccessGuard = ({ children, permission, anyPermissions, allowedRoles, disallowedRoles, currentUser }) => {
  if (!hasAdminPortalAccess(currentUser)) {
    return <Navigate to="/admin/login" replace />
  }

  const userRoles = Array.isArray(currentUser?.roles) ? currentUser.roles : []

  const hasAllowedRole = Array.isArray(allowedRoles) && allowedRoles.length > 0
    ? allowedRoles.some((role) => userRoles.includes(role))
    : false

  const isDisallowedRole = Array.isArray(disallowedRoles) && disallowedRoles.length > 0
    ? disallowedRoles.some((role) => userRoles.includes(role))
    : false

  // If user has an explicitly allowed role, grant access immediately.
  if (hasAllowedRole) {
    if (isDisallowedRole) {
      return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <h2 className="text-lg font-semibold mb-2">Không có quyền truy cập</h2>
          <p className="text-sm">Tài khoản của bạn không có quyền sử dụng chức năng này. Vui lòng liên hệ quản trị viên nếu cần cấp quyền.</p>
        </div>
      )
    }
    return children
  }

  // If route specifies allowedRoles but the current user is an 'admin' role,
  // allow access so platform administrators keep access even if they are not
  // explicitly listed in allowedRoles. Still respect disallowedRoles.
  if (userRoles.includes('admin')) {
    if (isDisallowedRole) {
      return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <h2 className="text-lg font-semibold mb-2">Không có quyền truy cập</h2>
          <p className="text-sm">Tài khoản của bạn không có quyền sử dụng chức năng này. Vui lòng liên hệ quản trị viên nếu cần cấp quyền.</p>
        </div>
      )
    }
    return children
  }

  // Otherwise evaluate permissions normally.
  const isAllowed = Array.isArray(anyPermissions) && anyPermissions.length > 0
    ? hasAnyPermission(currentUser, anyPermissions)
    : hasPermission(currentUser, permission)

  if (!isAllowed || isDisallowedRole) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <h2 className="text-lg font-semibold mb-2">Không có quyền truy cập</h2>
        <p className="text-sm">
          Tài khoản của bạn không có quyền sử dụng chức năng này. Vui lòng liên hệ quản trị viên nếu cần cấp quyền.
        </p>
      </div>
    )
  }

  return children
}

export default AccessGuard
