import React, { useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { hasAdminPortalAccess, hasAnyPermission, hasPermission } from '../utils/accessControl'

const AccessGuard = ({ children, permission, anyPermissions, allowedRoles, disallowedRoles, currentUser }) => {
  // Memoize access check to prevent infinite loops
  // Use stable dependencies based on user ID and roles, not the entire user object
  const accessCheck = useMemo(() => {
    if (!currentUser || !hasAdminPortalAccess(currentUser)) {
      return { shouldRedirect: true, hasAccess: false }
    }

    const userRoles = Array.isArray(currentUser?.roles) ? currentUser.roles : []

    const isDisallowedRole =
      Array.isArray(disallowedRoles) && disallowedRoles.length > 0
        ? disallowedRoles.some((role) => userRoles.includes(role))
        : false

    // If user has a disallowed role, deny access immediately
    if (isDisallowedRole) {
      return { shouldRedirect: false, hasAccess: false }
    }

    // If user has an explicitly allowed role, grant access immediately
    const hasAllowedRole = Array.isArray(allowedRoles) && allowedRoles.length > 0
      ? allowedRoles.some((role) => userRoles.includes(role))
      : false

    if (hasAllowedRole) {
      return { shouldRedirect: false, hasAccess: true }
    }

    // If route specifies allowedRoles but the current user is an 'admin' role,
    // allow access so platform administrators keep access even if they are not
    // explicitly listed in allowedRoles
    if (userRoles.includes('admin') || userRoles.includes('super_admin')) {
      return { shouldRedirect: false, hasAccess: true }
    }

    // Otherwise evaluate permissions normally
    const isAllowed =
      Array.isArray(anyPermissions) && anyPermissions.length > 0
        ? hasAnyPermission(currentUser, anyPermissions)
        : hasPermission(currentUser, permission)

    return {
      shouldRedirect: false,
      hasAccess: isAllowed
    }
  }, [
    // Use stable dependencies instead of the entire currentUser object
    currentUser?.user_id || currentUser?.id,
    currentUser?.roles?.join(',') || '',
    permission,
    anyPermissions?.join(',') || '',
    allowedRoles?.join(',') || '',
    disallowedRoles?.join(',') || ''
  ])

  if (accessCheck.shouldRedirect) {
    return <Navigate to="/admin/login" replace />
  }

  // Use the computed accessCheck result
  if (!accessCheck.hasAccess) {
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
