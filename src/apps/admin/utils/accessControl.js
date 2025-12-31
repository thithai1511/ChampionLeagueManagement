const ADMIN_ALLOWED_ROLES = ['super_admin', 'admin', 'team_admin', 'content_manager', 'match_official', 'competition_manager', 'supervisor']

export const hasAdminPortalAccess = (user) => {
  if (!user) return false
  if (Array.isArray(user.roles)) {
    return user.roles.some((role) => ADMIN_ALLOWED_ROLES.includes(role))
  }
  if (typeof user.role === 'string') {
    return ADMIN_ALLOWED_ROLES.includes(user.role)
  }
  return false
}

export const hasPermission = (user, permission) => {
  if (!permission) {
    return hasAdminPortalAccess(user)
  }
  if (!user) {
    return false
  }
  if ((Array.isArray(user.roles) && user.roles.includes('super_admin')) || user.role === 'super_admin') {
    return true
  }
  // Supervisors can view matches via AccessGuard's allowedRoles, but
  // they should NOT have editing permission for match management.
  if (permission === 'manage_matches' && Array.isArray(user.roles) && user.roles.includes('supervisor')) {
    return false
  }
  return Array.isArray(user.permissions) && user.permissions.includes(permission)
}

export const hasAnyPermission = (user, permissions = []) => {
  if (!Array.isArray(permissions) || permissions.length === 0) {
    return hasAdminPortalAccess(user)
  }
  return permissions.some((permission) => hasPermission(user, permission))
}

export { ADMIN_ALLOWED_ROLES }
