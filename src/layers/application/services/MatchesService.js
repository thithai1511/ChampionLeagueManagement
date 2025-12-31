import ApiService from './ApiService'
import APP_CONFIG from '../../../config/app.config'
import logger from '../../../shared/utils/logger'

class MatchesService {
  // Get all matches
  async getAllMatches(filters = {}) {
    try {
      const params = {
        page: filters.page || 1,
        limit: filters.limit || APP_CONFIG.UI.PAGINATION.DEFAULT_PAGE_SIZE,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.seasonId ? { seasonId: filters.seasonId } : {}),
        ...(filters.search || filters.team ? { search: filters.search || filters.team } : {}),
        ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
        ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
        ...(filters.teamId ? { teamId: filters.teamId } : {})
      }

      const response = await ApiService.get(APP_CONFIG.API.ENDPOINTS.MATCHES.LIST, params)

      // Map backend structure to frontend
      const matches = (response?.data || []).map(match => ({
        id: match.matchId,
        homeSeasonTeamId: match.homeSeasonTeamId, // Added for lineup generation
        homeTeamId: match.homeTeamId, // Added ID
        homeTeamName: match.homeTeamName,
        homeTeamShortName: match.homeTeamShortName,
        homeTeamLogo: match.homeTeamName?.includes("Monaco")
          ? "https://tmssl.akamaized.net/images/wappen/head/162.png"
          : (match.homeTeamLogo && !match.homeTeamLogo.includes('via.placeholder') && !match.homeTeamLogo.includes('placeholder')
            ? match.homeTeamLogo
            : null),
        awaySeasonTeamId: match.awaySeasonTeamId, // Added for lineup generation
        awayTeamId: match.awayTeamId, // Added ID
        awayTeamName: match.awayTeamName,
        awayTeamShortName: match.awayTeamShortName,
        awayTeamLogo: match.awayTeamName?.includes("Monaco")
          ? "https://tmssl.akamaized.net/images/wappen/head/162.png"
          : (match.awayTeamLogo && !match.awayTeamLogo.includes('via.placeholder') && !match.awayTeamLogo.includes('placeholder')
            ? match.awayTeamLogo
            : null),
        utcDate: match.scheduledKickoff && !match.scheduledKickoff.endsWith('Z') ? match.scheduledKickoff + 'Z' : match.scheduledKickoff,
        scheduledKickoff: match.scheduledKickoff && !match.scheduledKickoff.endsWith('Z') ? match.scheduledKickoff + 'Z' : match.scheduledKickoff, // Explicitly mapped for edit modal
        status: match.status,
        scoreHome: match.homeScore,
        scoreAway: match.awayScore,
        venue: match.stadiumName,
        matchday: match.matchdayNumber,
        updatedAt: match.updatedAt,
        seasonId: match.seasonId,
        // Detailed Infos
        mvp: match.mvp,
        events: match.events || [],
        stats: match.stats || { home: null, away: null },
        referee: match.referee // Added referee
      }))

      return {
        matches,
        pagination: response?.pagination || { page: params.page, limit: params.limit, totalPages: 1 },
        total: response?.total || 0
      }
    } catch (error) {
      logger.error('Failed to fetch matches:', error)
      throw error
    }
  }

  // Get live matches
  async getLiveMatches() {
    try {
      const response = await ApiService.get(APP_CONFIG.API.ENDPOINTS.MATCHES.LIVE)

      const rawMatches = response?.data || []
      return rawMatches.map(match => ({
        id: match.matchId,
        homeTeamId: match.homeTeamId,
        homeTeamName: match.homeTeamName,
        homeTeamShortName: match.homeTeamShortName,
        homeTeamLogo: match.homeTeamName?.includes("Monaco")
          ? "https://tmssl.akamaized.net/images/wappen/head/162.png"
          : (match.homeTeamLogo && !match.homeTeamLogo.includes('via.placeholder') && !match.homeTeamLogo.includes('placeholder')
            ? match.homeTeamLogo
            : null),
        awayTeamId: match.awayTeamId,
        awayTeamName: match.awayTeamName,
        awayTeamShortName: match.awayTeamShortName,
        awayTeamLogo: match.awayTeamName?.includes("Monaco")
          ? "https://tmssl.akamaized.net/images/wappen/head/162.png"
          : (match.awayTeamLogo && !match.awayTeamLogo.includes('via.placeholder') && !match.awayTeamLogo.includes('placeholder')
            ? match.awayTeamLogo
            : null),
        utcDate: match.scheduledKickoff && !match.scheduledKickoff.endsWith('Z') ? match.scheduledKickoff + 'Z' : match.scheduledKickoff,
        scheduledKickoff: match.scheduledKickoff && !match.scheduledKickoff.endsWith('Z') ? match.scheduledKickoff + 'Z' : match.scheduledKickoff,
        status: match.status,
        scoreHome: match.homeScore,
        scoreAway: match.awayScore,
        venue: match.stadiumName,
        matchday: match.matchdayNumber,
        updatedAt: match.updatedAt,
        seasonId: match.seasonId,
        mvp: match.mvp,
        events: match.events || [],
        stats: match.stats || { home: null, away: null },
        referee: match.referee
      }))
    } catch (error) {
      logger.error('Failed to fetch live matches:', error)
      throw error
    }
  }

  // Get match by ID
  async getMatchById(matchId) {
    try {
      const endpoint = APP_CONFIG.API.ENDPOINTS.MATCHES.DETAIL.replace(':id', matchId)
      const response = await ApiService.get(endpoint)
      const match = response?.data

      if (!match) {
        return null
      }

      // Map backend structure to frontend format (same as getAllMatches)
      const mappedMatch = {
        ...match,
        id: match.matchId,
        homeTeamId: match.homeTeamId,
        homeTeamName: match.homeTeamName,
        homeTeamShortName: match.homeTeamShortName,
        homeTeamLogo: match.homeTeamName?.includes("Monaco")
          ? "https://tmssl.akamaized.net/images/wappen/head/162.png"
          : (match.homeTeamLogo && !match.homeTeamLogo.includes('via.placeholder') && !match.homeTeamLogo.includes('placeholder')
            ? match.homeTeamLogo
            : null),
        awayTeamId: match.awayTeamId,
        awayTeamName: match.awayTeamName,
        awayTeamShortName: match.awayTeamShortName,
        awayTeamLogo: match.awayTeamName?.includes("Monaco")
          ? "https://tmssl.akamaized.net/images/wappen/head/162.png"
          : (match.awayTeamLogo && !match.awayTeamLogo.includes('via.placeholder') && !match.awayTeamLogo.includes('placeholder')
            ? match.awayTeamLogo
            : null),
        utcDate: match.scheduledKickoff && !match.scheduledKickoff.endsWith('Z')
          ? match.scheduledKickoff + 'Z'
          : match.scheduledKickoff,
        scheduledKickoff: match.scheduledKickoff && !match.scheduledKickoff.endsWith('Z')
          ? match.scheduledKickoff + 'Z'
          : match.scheduledKickoff,
        status: match.status,
        // Map scores to both formats for compatibility
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        scoreHome: match.homeScore,  // For frontend compatibility
        scoreAway: match.awayScore,  // For frontend compatibility
        home_score: match.homeScore,  // For frontend compatibility
        away_score: match.awayScore,  // For frontend compatibility
        venue: match.stadiumName,
        matchday: match.matchdayNumber,
        updatedAt: match.updatedAt,
        seasonId: match.seasonId,
        mvp: match.mvp,
        events: match.events || [],
        stats: match.stats || { home: null, away: null },
        referee: match.referee
      }

      return mappedMatch
    } catch (error) {
      logger.error('Failed to fetch match:', error)
      throw error
    }
  }

  // Create new match
  async createMatch(matchData) {
    try {
      const payload = {
        homeTeamId: matchData.homeTeamId,
        awayTeamId: matchData.awayTeamId,
        scheduledKickoff: matchData.scheduledKickoff || new Date().toISOString(),
        seasonId: matchData.seasonId,
        stadiumId: matchData.stadiumId,
        status: matchData.status || 'scheduled'
      }
      const response = await ApiService.post(APP_CONFIG.API.ENDPOINTS.MATCHES.CREATE, payload)
      return response?.data
    } catch (error) {
      logger.error('Failed to create match:', error)
      throw error
    }
  }

  // Update match
  async updateMatch(matchId, matchData) {
    try {
      const endpoint = APP_CONFIG.API.ENDPOINTS.MATCHES.UPDATE.replace(':id', matchId)
      const payload = {
        status: matchData.status,
        homeScore: matchData.scoreHome,
        awayScore: matchData.scoreAway,
        attendance: matchData.attendance,
        scheduledKickoff: matchData.scheduledKickoff,
        stadiumId: matchData.stadiumId,
        description: matchData.description,
        homeTeamKit: matchData.homeTeamKit,
        awayTeamKit: matchData.awayTeamKit
      }
      const response = await ApiService.put(endpoint, payload)

      // Map response back
      if (response?.data) {
        return {
          id: response.data.matchId,
          homeTeamName: response.data.homeTeamName,
          awayTeamName: response.data.awayTeamName,
          utcDate: response.data.scheduledKickoff,
          status: response.data.status,
          scoreHome: response.data.homeScore,
          scoreAway: response.data.awayScore,
          venue: response.data.stadiumName,
          matchday: response.data.matchdayNumber,
          updatedAt: response.data.updatedAt
        }
      }
      return response?.data
    } catch (error) {
      logger.error('Failed to update match:', error)
      throw error
    }
  }

  // Update match result
  async updateMatchResult(matchId, resultData) {
    try {
      const endpoint = APP_CONFIG.API.ENDPOINTS.MATCHES.RESULTS.replace(':id', matchId)
      const response = await ApiService.post(endpoint, resultData)
      return response?.data
    } catch (error) {
      logger.error('Failed to update match result:', error)
      throw error
    }
  }

  // Delete match
  async deleteMatch(matchId) {
    try {
      const endpoint = APP_CONFIG.API.ENDPOINTS.MATCHES.DELETE.replace(':id', matchId)
      await ApiService.delete(endpoint)
      return true
    } catch (error) {
      logger.error('Failed to delete match:', error)
      throw error
    }
  }

  async syncMatches(options = {}) {
    const payload = {
      ...(options.season ? { season: options.season } : {}),
      ...(options.status ? { status: options.status } : {}),
      ...(options.dateFrom ? { dateFrom: options.dateFrom } : {}),
      ...(options.dateTo ? { dateTo: options.dateTo } : {}),
      // Legacy support
      ...(options.count ? { count: options.count } : {}),
      ...(options.seasonId ? { season: String(options.seasonId) } : {}),
      ...(options.startDate ? { dateFrom: options.startDate } : {})
    }
    return ApiService.post('/matches/sync', payload)
  }

  // Get external matches from FootballMatches table (synced from Football-Data.org API)
  async getExternalMatches(filters = {}) {
    try {
      const params = {
        page: filters.page || 1,
        limit: filters.limit || APP_CONFIG.UI.PAGINATION.DEFAULT_PAGE_SIZE,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.season ? { season: filters.season } : {}),
        ...(filters.search ? { search: filters.search } : {}),
        ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
        ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
        ...(filters.teamId ? { teamId: filters.teamId } : {})
      }

      const response = await ApiService.get('/matches/external', params)

      // Map backend structure to frontend
      const matches = (response?.data || []).map(match => ({
        id: match.id,
        externalId: match.externalId,
        homeTeamId: match.homeTeamId, // Added
        homeTeamName: match.homeTeamName,
        awayTeamId: match.awayTeamId, // Added
        awayTeamName: match.awayTeamName,
        utcDate: match.utcDate,
        status: match.status,
        scoreHome: match.scoreHome,
        scoreAway: match.scoreAway,
        venue: match.venue,
        referee: match.referee,
        matchday: match.matchday,
        stage: match.stage,
        group: match.groupName,
        season: match.season,
        updatedAt: match.lastUpdated
      }))

      return {
        matches,
        pagination: response?.pagination || { page: params.page, limit: params.limit, totalPages: 1 },
        total: response?.total || 0
      }
    } catch (error) {
      logger.error('Failed to fetch external matches:', error)
      throw error
    }
  }

  async generateRandomMatches(options = {}) {
    const payload = {
      count: options.count || 10,
      seasonId: options.seasonId,
      startDate: options.startDate || new Date().toISOString()
    }
    return ApiService.post('/matches/generate/random', payload)
  }

  // Create matches in bulk
  async createBulkMatches(matches) {
    try {
      const response = await ApiService.post('/matches/bulk', { matches })
      return response?.count
    } catch (error) {
      logger.error('Failed to create bulk matches:', error)
      throw error
    }
  }

  // Generate Round Robin Schedule on Backend
  async generateRoundRobinSchedule(teamIds, seasonId = null, startDate = null) {
    try {
      const payload = {
        teamIds,
        seasonId,
        startDate
      }
      const response = await ApiService.post('/matches/generate/round-robin', payload)
      return response?.data || []
    } catch (error) {
      logger.error('Failed to generate round robin schedule:', error)
      throw error
    }
  }

  // Delete all matches (bulk delete)
  async deleteAllMatches(seasonId = null) {
    try {
      const params = seasonId ? { seasonId } : {}
      const response = await ApiService.delete('/matches/bulk', params)
      return response?.count
    } catch (error) {
      logger.error('Failed to delete all matches:', error)
      throw error
    }
  }

  // --- Match Details (Events, Lineups) ---

  async getMatchEvents(matchId) {
    try {
      const response = await ApiService.get(`/matches/${matchId}/events`)
      return response?.data?.data || []
    } catch (error) {
      logger.error('Failed to fetch match events:', error)
      return []
    }
  }

  async createMatchEvent(matchId, eventData) {
    try {
      const response = await ApiService.post(`/matches/${matchId}/events`, eventData)
      return response?.data
    } catch (error) {
      logger.error('Failed to create match event:', error)
      throw error
    }
  }

  async disallowMatchEvent(eventId, reason) {
    try {
      const response = await ApiService.post(`/matches/events/${eventId}/disallow`, { reason })
      return response?.data
    } catch (error) {
      logger.error('Failed to disallow match event:', error)
      throw error
    }
  }

  async deleteMatchEvent(eventId) {
    try {
      await ApiService.delete(`/matches/events/${eventId}`)
      return true
    } catch (error) {
      logger.error('Failed to delete match event:', error)
      throw error
    }
  }

  async getMatchLineups(matchId) {
    try {
      const response = await ApiService.get(`/matches/${matchId}/lineups`)
      // Backend returns { data: [...] }, axios unwraps to response.data = [...]
      return response?.data || []
    } catch (error) {
      logger.error('Failed to fetch match lineups:', error)
      return []
    }
  }

  async updateMatchLineups(matchId, lineups) {
    try {
      const response = await ApiService.post(`/matches/${matchId}/lineups`, lineups)
      return response?.data
    } catch (error) {
      logger.error('Failed to update match lineups:', error)
      throw error
    }
  }

  async finalizeMatch(matchId) {
    return this.updateMatch(matchId, { status: 'completed' })
  }
}

export default new MatchesService()

