import ApiService from './ApiService'
import APP_CONFIG from '../../../config/app.config'

const ENDPOINTS = APP_CONFIG.API.ENDPOINTS.USERS

const withParams = (template, params = {}) =>
  template.replace(/:([a-zA-Z]+)/g, (_, key) => encodeURIComponent(params[key] ?? `:${key}`))

const normalizeRole = (payload = {}) => ({
  roleId: payload.role_id ?? payload.roleId ?? payload.id ?? null,
  code: payload.code ?? '',
  name: payload.name ?? payload.code ?? '',
  assignedAt: payload.assigned_at ?? payload.assignedAt ?? null
})

const normalizeUser = (payload = {}) => {
  const roles = Array.isArray(payload.roles)
    ? payload.roles.map((role) => normalizeRole(role))
    : []

  return {
    id: payload.user_id ?? payload.id ?? null,
    username: payload.username ?? '',
    email: payload.email ?? '',
    firstName: payload.first_name ?? payload.firstName ?? '',
    lastName: payload.last_name ?? payload.lastName ?? '',
    status: payload.status ?? 'active',
    createdAt: payload.created_at ?? payload.createdAt ?? null,
    lastLoginAt: payload.last_login_at ?? payload.lastLoginAt ?? null,
    mfaEnabled: Boolean(payload.mfa_enabled ?? payload.mfaEnabled ?? false),
    roles
  }
}

class UserService {
  async listUsers(params = {}) {
    const query = {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 50
    }
    const response = await ApiService.get(ENDPOINTS.LIST, query)
    const data = Array.isArray(response?.data) ? response.data.map(normalizeUser) : []
    return {
      data,
      total: response?.total ?? data.length,
      page: response?.page ?? query.page,
      pageSize: response?.pageSize ?? query.pageSize
    }
  }

  async getUser(userId) {
    const endpoint = withParams(ENDPOINTS.DETAIL, { id: userId })
    const response = await ApiService.get(endpoint)
    return normalizeUser(response)
  }

  async createUser(payload) {
    const response = await ApiService.post(ENDPOINTS.CREATE, payload)
    return response?.userId ?? response?.data?.userId ?? null
  }

  async updateUser(userId, payload) {
    const endpoint = withParams(ENDPOINTS.UPDATE, { id: userId })
    const response = await ApiService.put(endpoint, payload)
    return normalizeUser(response ?? {})
  }

  async deleteUser(userId) {
    const endpoint = withParams(ENDPOINTS.DELETE, { id: userId })
    await ApiService.delete(endpoint)
  }

  async getUserRoles(userId) {
    const endpoint = withParams(ENDPOINTS.ROLES, { id: userId })
    const response = await ApiService.get(endpoint)
    return Array.isArray(response) ? response.map(normalizeRole) : []
  }

  async assignRole(userId, roleId) {
    const endpoint = withParams(ENDPOINTS.ROLES, { id: userId })
    await ApiService.post(endpoint, { roleId })
  }

  async removeRole(userId, roleId) {
    const endpoint = withParams(ENDPOINTS.REMOVE_ROLE, { id: userId, roleId })
    await ApiService.delete(endpoint)
  }

  async getUserTeams(userId) {
    console.log('UserService.getUserTeams: Getting teams for user:', userId)
    const endpoint = withParams(ENDPOINTS.TEAMS, { id: userId })
    console.log('UserService.getUserTeams: Endpoint:', endpoint)
    
    try {
      const response = await ApiService.get(endpoint)
      console.log('UserService.getUserTeams: Raw response:', response)
      
      // Handle both array and wrapped response
      const teamsData = Array.isArray(response) ? response : (response?.data || [])
      console.log('UserService.getUserTeams: Teams data:', teamsData)
      
      const normalized = Array.isArray(teamsData) ? teamsData.map((team) => ({
        teamId: team.team_id ?? team.teamId ?? team.id,
        teamName: team.team_name ?? team.teamName ?? team.name ?? '',
        assignedAt: team.assigned_at ?? team.assignedAt ?? null,
        assignedBy: team.assigned_by ?? team.assignedBy ?? null
      })) : []
      
      console.log('UserService.getUserTeams: Normalized teams:', normalized)
      return normalized
    } catch (error) {
      console.error('UserService.getUserTeams: Error:', error)
      throw error
    }
  }

  async assignTeamToUser(userId, teamId) {
    console.log('UserService.assignTeamToUser:', { userId, teamId })
    const endpoint = withParams(ENDPOINTS.TEAMS, { id: userId })
    console.log('UserService.assignTeamToUser: Endpoint:', endpoint)
    
    try {
      const response = await ApiService.post(endpoint, { teamId })
      console.log('UserService.assignTeamToUser: Success response:', response)
      return response
    } catch (error) {
      console.error('UserService.assignTeamToUser: Error:', error)
      throw error
    }
  }

  async removeTeamFromUser(userId, teamId) {
    console.log('UserService.removeTeamFromUser:', { userId, teamId })
    const endpoint = withParams(ENDPOINTS.REMOVE_TEAM, { id: userId, teamId })
    console.log('UserService.removeTeamFromUser: Endpoint:', endpoint)
    
    try {
      const response = await ApiService.delete(endpoint)
      console.log('UserService.removeTeamFromUser: Success response:', response)
      return response
    } catch (error) {
      console.error('UserService.removeTeamFromUser: Error:', error)
      throw error
    }
  }

  async getUserOfficial(userId) {
    console.log('UserService.getUserOfficial: Getting official for user:', userId)
    const endpoint = withParams(ENDPOINTS.OFFICIAL, { id: userId })
    console.log('UserService.getUserOfficial: Endpoint:', endpoint)
    
    try {
      const response = await ApiService.get(endpoint)
      console.log('UserService.getUserOfficial: Raw response:', response)
      
      // If no official found, return null
      if (!response || !response.data) {
        return null
      }
      
      const official = response.data
      return {
        officialId: official.official_id ?? official.officialId ?? official.id,
        fullName: official.full_name ?? official.fullName ?? '',
        roleSpecialty: official.role_specialty ?? official.roleSpecialty ?? '',
        licenseNumber: official.license_number ?? official.licenseNumber ?? null,
        federationLevel: official.federation_level ?? official.federationLevel ?? null,
        status: official.status ?? 'active'
      }
    } catch (error) {
      console.error('UserService.getUserOfficial: Error:', error)
      // If 404, return null (no official assigned)
      if (error?.status === 404) {
        return null
      }
      throw error
    }
  }

  async assignOfficialToUser(userId, officialId) {
    console.log('UserService.assignOfficialToUser:', { userId, officialId })
    const endpoint = withParams(ENDPOINTS.OFFICIAL, { id: userId })
    console.log('UserService.assignOfficialToUser: Endpoint:', endpoint)
    
    try {
      const response = await ApiService.post(endpoint, { officialId })
      console.log('UserService.assignOfficialToUser: Success response:', response)
      return response
    } catch (error) {
      console.error('UserService.assignOfficialToUser: Error:', error)
      throw error
    }
  }

  async removeOfficialFromUser(userId) {
    console.log('UserService.removeOfficialFromUser:', { userId })
    const endpoint = withParams(ENDPOINTS.REMOVE_OFFICIAL, { id: userId })
    console.log('UserService.removeOfficialFromUser: Endpoint:', endpoint)
    
    try {
      const response = await ApiService.delete(endpoint)
      console.log('UserService.removeOfficialFromUser: Success response:', response)
      return response
    } catch (error) {
      console.error('UserService.removeOfficialFromUser: Error:', error)
      throw error
    }
  }
}

export default new UserService()
