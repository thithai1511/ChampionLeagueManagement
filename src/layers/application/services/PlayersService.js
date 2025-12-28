import ApiService from './ApiService'
import APP_CONFIG from '../../../config/app.config'

class PlayersService {
  async listPlayers(filters = {}) {
    const params = {
      search: filters.search || '',
      teamId: filters.teamId || '',
      position: filters.position || '',
      nationality: filters.nationality || '',
      season: filters.season || '',
      page: filters.page || 1,
      limit: filters.limit || APP_CONFIG.UI.PAGINATION.DEFAULT_PAGE_SIZE,
      ...(filters.sortBy ? { sortBy: filters.sortBy } : {}),
      ...(filters.sortOrder ? { sortOrder: filters.sortOrder } : {})
    }

    const response = await ApiService.get(APP_CONFIG.API.ENDPOINTS.PLAYERS.LIST, params)
    
    // Map backend field names to frontend field names
    const players = (response?.data || []).map(player => ({
      id: player.player_id,
      name: player.full_name || player.display_name,
      displayName: player.display_name,
      dateOfBirth: player.date_of_birth,
      placeOfBirth: player.place_of_birth,
      nationality: player.nationality,
      position: player.preferred_position,
      secondaryPosition: player.secondary_position,
      heightCm: player.height_cm,
      weightKg: player.weight_kg,
      dominantFoot: player.dominant_foot,
      teamId: player.current_team_id,
      teamName: player.team_name,
      shirtNumber: player.shirt_number || null,
      goals: player.goals || 0,
      assists: player.assists || 0
    }))
    
    return {
      players,
      total: response?.total || 0,
      pagination: response?.pagination || { page: params.page, limit: params.limit, totalPages: 1 }
    }
  }

  async createPlayer(payload) {
    // Correct API: POST /api/players
    // Assuming ApiService handles /api prefix or relative to base
    return ApiService.post('/players', payload)
  }

  async syncPlayers(season) {
    return ApiService.post('/players/sync', { season })
  }

  async getPlayerById(id) {
    const endpoint = APP_CONFIG.API.ENDPOINTS.PLAYERS.DETAIL.replace(':id', id)
    const response = await ApiService.get(endpoint)
    return response?.data
  }

  async updatePlayer(id, payload) {
    const endpoint = APP_CONFIG.API.ENDPOINTS.PLAYERS.UPDATE.replace(':id', id)
    const response = await ApiService.put(endpoint, payload)
    return response?.data
  }

  async deletePlayer(id) {
    const endpoint = APP_CONFIG.API.ENDPOINTS.PLAYERS.DELETE.replace(':id', id)
    await ApiService.delete(endpoint)
    return true
  }
}

export default new PlayersService()


