import ApiService from './ApiService'
import APP_CONFIG from '../../../config/app.config'
import logger from '../../../shared/utils/logger'

class TeamsService {
  normalizeTeam(payload = {}) {
    const teamId = payload.team_id ?? payload.teamId ?? payload.id
    return {
      id: teamId,
      name: payload.name,
      short_name: payload.short_name ?? payload.shortName ?? null,
      code: payload.code ?? null,
      city: payload.city ?? null,
      country: payload.country ?? null,
      founded_year: payload.founded_year ?? payload.foundedYear ?? null,
      status: payload.status ?? 'active',
      governing_body: payload.governing_body ?? payload.governingBody ?? null,
      description: payload.description ?? null,
      home_stadium_id: payload.home_stadium_id ?? payload.homeStadiumId ?? null,
      home_kit_description: payload.home_kit_description ?? payload.homeKitDescription ?? null
    }
  }

  // Get all teams
  async getAllTeams(filters = {}) {
    try {
      const params = {
        page: filters.page || 1,
        limit: filters.limit || APP_CONFIG.UI.PAGINATION.DEFAULT_PAGE_SIZE,
        country: filters.country || '',
        search: filters.search || '',
        status: filters.status || '',
        season: filters.season || ''
      }

      const response = await ApiService.get(APP_CONFIG.API.ENDPOINTS.TEAMS.LIST, params)

      // Map backend data structure to frontend structure
      const rawTeams =
        Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.data?.teams)
            ? response.data.teams
            : []

      const teams = rawTeams.map(team => ({
        id: team.team_id ?? team.id,
        name: team.name,
        short_name: team.short_name,
        code: team.code,
        city: team.city,
        country: team.country,
        founded_year: team.founded_year,
        status: team.status,
        governing_body: team.governing_body,
        description: team.description,
        playerCount: 0 // Will be populated separately if needed
      }))

      return {
        teams,
        pagination: response?.data?.pagination ?? {},
        total: response?.data?.total ?? teams.length
      }
    } catch (error) {
      logger.error('Failed to fetch teams:', error)
      throw error
    }
  }

  // Get team by ID
  async getTeamById(teamId, query = {}) {
    try {
      const endpoint = APP_CONFIG.API.ENDPOINTS.TEAMS.DETAIL.replace(':id', teamId)
      const response = await ApiService.get(endpoint, query)
      return this.normalizeTeam(response?.data ?? {})
    } catch (error) {
      console.error('Failed to fetch team:', error)
      throw error
    }
  }

  // Create new team
  async createTeam(teamData) {
    try {
      const response = await ApiService.post(APP_CONFIG.API.ENDPOINTS.TEAMS.CREATE, teamData)
      return this.normalizeTeam(response?.data ?? {})
    } catch (error) {
      console.error('Failed to create team:', error)
      throw error
    }
  }

  // Update team
  async updateTeam(teamId, teamData) {
    try {
      const endpoint = APP_CONFIG.API.ENDPOINTS.TEAMS.UPDATE.replace(':id', teamId)
      const response = await ApiService.put(endpoint, teamData)
      return this.normalizeTeam(response?.data ?? {})
    } catch (error) {
      console.error('Failed to update team:', error)
      throw error
    }
  }

  // Delete team
  async deleteTeam(teamId) {
    try {
      const endpoint = APP_CONFIG.API.ENDPOINTS.TEAMS.DELETE.replace(':id', teamId)
      await ApiService.delete(endpoint)
      return true
    } catch (error) {
      console.error('Failed to delete team:', error)
      const message = error.payload?.message || error.message || 'Failed to delete team'
      throw new Error(message)
    }
  }

  // Get team players
  async getTeamPlayers(teamId, query = {}) {
    try {
      const endpoint = APP_CONFIG.API.ENDPOINTS.TEAMS.PLAYERS.replace(':id', teamId)
      const response = await ApiService.get(endpoint, query)
      const raw = response?.data || []
      if (!Array.isArray(raw)) {
        return []
      }
      return raw.map((player) => ({
        id: player.player_id ?? player.id ?? null,
        name: player.display_name ?? player.full_name ?? player.name ?? 'Unknown',
        position: player.preferred_position ?? player.position ?? null,
        nationality: player.nationality ?? null,
        dateOfBirth: player.date_of_birth ?? player.dateOfBirth ?? null,
        shirtNumber: player.shirt_number ?? player.shirtNumber ?? null
      }))
    } catch (error) {
      console.error('Failed to fetch team players:', error)
      return []
    }
  }

  async getCompetitionSeasons(fromYear = 2020) {
    const response = await ApiService.get(APP_CONFIG.API.ENDPOINTS.TEAMS.SEASONS, { fromYear })
    return response.data || []
  }

  async getCompetitionStandings(filters = {}) {
    const response = await ApiService.get(APP_CONFIG.API.ENDPOINTS.TEAMS.STANDINGS, {
      season: filters.season || ''
    })
    return response.data
  }

  // --- New Methods for Season Player Queries ---

  // Super Admin: Get all approved players for a season
  async getApprovedSeasonPlayers(seasonId, filters = {}) {
    if (!seasonId) return [];

    const params = {
      season_id: seasonId
    };
    if (filters.team_id) params.team_id = filters.team_id;
    if (filters.position_code) params.position_code = filters.position_code;
    if (filters.player_type) params.nationality_type = filters.player_type;

    const response = await ApiService.get('/season-players/approved', params);

    // Exact contract mapping:
    // Backend returns: { season_id, total, players: [...] }

    // Case 1: ApiService returns Axios response object -> data is in response.data.players
    if (response?.data?.players && Array.isArray(response.data.players)) {
      return response.data.players;
    }

    // Case 2: ApiService returns data object directly (interceptor might unwrap it) -> data is in response.players
    if (response?.players && Array.isArray(response.players)) {
      return response.players;
    }

    // Default fallback
    return [];
  }

  // Admin Team: Get approved players for my team(s)
  async getMyTeamApprovedSeasonPlayers(seasonId, teamId) {
    if (!seasonId) return [];

    const params = {
      season_id: seasonId
    };
    if (teamId) {
      params.team_id = teamId;
    }

    const response = await ApiService.get('/season-players/my-team/approved', params);
    // ApiService wraps response in { data: ... } if parsed is object.
    // Backend returns { players: [...] } -> Wrapped as { data: { players: [...] } }
    console.log('[TeamsService] getMyTeamApprovedSeasonPlayers raw:', response);
    const payload = response?.data || response || {};
    return payload.players || [];
  }
}

export default new TeamsService()
