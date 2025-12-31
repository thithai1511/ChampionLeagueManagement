import ApiService from './ApiService'
import APP_CONFIG from '../../../config/app.config'

const ENDPOINTS = APP_CONFIG.API.ENDPOINTS.PERMISSIONS

const normalizePermission = (payload = {}) => ({
  id: payload.permission_id ?? payload.permissionId ?? payload.id ?? null,
  code: payload.code ?? '',
  name: payload.name ?? payload.code ?? '',
  description: payload.description ?? ''
})

class PermissionService {
  async listPermissions() {
    const response = await ApiService.get(ENDPOINTS.LIST)
    // ApiService wraps arrays in {data: array}, extract it
    const permissionsArray = Array.isArray(response) ? response : (response?.data || [])
    return Array.isArray(permissionsArray) ? permissionsArray.map(normalizePermission) : []
  }
}

export default new PermissionService()
