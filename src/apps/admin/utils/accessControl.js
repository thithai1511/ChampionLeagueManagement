const ADMIN_ALLOWED_ROLES = ['super_admin', 'admin', 'team_admin', 'supervisor', 'match_official', 'competition_manager']

export const hasAdminPortalAccess = (user) => {
  if (!user || !Array.isArray(user.roles)) {
    return false
  }
  return user.roles.some((role) => ADMIN_ALLOWED_ROLES.includes(role))
}

export const hasPermission = (user, permission) => {
  if (!permission) {
    return hasAdminPortalAccess(user)
  }
  if (!user) {
    return false
  }
  if (Array.isArray(user.roles) && user.roles.includes('super_admin')) {
    return true
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
