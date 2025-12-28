import ApiService from './ApiService'
import APP_CONFIG from '../../../config/app.config'

const ENDPOINTS = APP_CONFIG.API.ENDPOINTS.ROLES

const withParams = (template, params = {}) =>
  template.replace(/:([a-zA-Z]+)/g, (_, key) => encodeURIComponent(params[key] ?? `:${key}`))

const normalizeRole = (payload = {}) => ({
  id: payload.role_id ?? payload.roleId ?? payload.id ?? null,
  code: payload.code ?? '',
  name: payload.name ?? payload.code ?? '',
  description: payload.description ?? '',
  isSystemRole: Boolean(payload.is_system_role ?? payload.isSystemRole ?? false)
})

const normalizePermission = (payload = {}) => ({
  id: payload.permission_id ?? payload.permissionId ?? payload.id ?? null,
  code: payload.code ?? '',
  name: payload.name ?? payload.code ?? '',
  description: payload.description ?? ''
})

class RoleService {
  async listRoles() {
    console.log('RoleService.listRoles: Calling API...')
    try {
      const response = await ApiService.get(ENDPOINTS.LIST)
      console.log('RoleService.listRoles: Raw response:', response)
      
      // ApiService wraps arrays in {data: array}, extract it
      const rolesArray = Array.isArray(response) ? response : (response?.data || [])
      console.log('RoleService.listRoles: Roles array:', rolesArray)
      
      const normalized = Array.isArray(rolesArray) ? rolesArray.map(normalizeRole) : []
      console.log('RoleService.listRoles: Normalized roles:', normalized)
      return normalized
    } catch (error) {
      console.error('RoleService.listRoles: Error:', error)
      throw error
    }
  }

  async getRolePermissions(roleId) {
    const endpoint = withParams(ENDPOINTS.PERMISSIONS, { id: roleId })
    const response = await ApiService.get(endpoint)
    return Array.isArray(response) ? response.map(normalizePermission) : []
  }

  async setRolePermissions(roleId, permissionIds = []) {
    const endpoint = withParams(ENDPOINTS.PERMISSIONS, { id: roleId })
    await ApiService.put(endpoint, { permissionIds })
  }

  async addPermission(roleId, permissionId) {
    const endpoint = withParams(ENDPOINTS.PERMISSIONS, { id: roleId })
    await ApiService.post(endpoint, { permissionId })
  }

  async removePermission(roleId, permissionId) {
    const endpoint = `${withParams(ENDPOINTS.PERMISSIONS, { id: roleId })}/${permissionId}`
    await ApiService.delete(endpoint)
  }
}

export default new RoleService()
