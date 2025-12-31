import ApiService from './ApiService'
import APP_CONFIG from '../../../config/app.config'
import logger from '../../../shared/utils/logger'

const STATS_ENDPOINTS = APP_CONFIG.API.ENDPOINTS.STATS

const DEFAULT_PLAYER_STATS = {
  goals: [],
  assists: [],
  'clean-sheets': [],
  minutes: []
}

const DEFAULT_OVERVIEW = {
  totals: {
    teams: 0,
    matches: 0,
    goals: 0,
    players: 0
  },
  trends: {
    teams: 0,
    matches: 0,
    goals: 0,
    players: 0
  },
  topPerformers: {},
  updatedAt: null
}

const FALLBACK_STATS = {
  goals: [
    {
      id: 'g1',
      rank: 1,
      player: 'Robert Lewandowski',
      team: 'Barcelona',
      teamLogo: 'BAR',
      value: 7,
      matches: 6,
      position: 'Forward',
      nationality: 'Poland',
      avatar: 'https://img.uefa.com/imgml/TP/players/1/2024/324x324/63706.jpg',
      recentMatches: [
        { opponent: 'Real Madrid', result: '3-2 W', contribution: '2 goals' },
        { opponent: 'Bayern Munich', result: '1-1 D', contribution: '1 goal' }
      ]
    },
    {
      id: 'g2',
      rank: 2,
      player: 'Viktor Gyokeres',
      team: 'Sporting CP',
      teamLogo: 'SCP',
      value: 5,
      matches: 6,
      position: 'Forward',
      nationality: 'Sweden',
      avatar: 'https://img.uefa.com/imgml/TP/players/1/2024/324x324/250104591.jpg'
    },
    {
      id: 'g3',
      rank: 3,
      player: 'Raphinha',
      team: 'Barcelona',
      teamLogo: 'BAR',
      value: 4,
      matches: 6,
      position: 'Winger',
      nationality: 'Brazil'
    }
  ],
  assists: [
    {
      id: 'a1',
      rank: 1,
      player: 'Raphinha',
      team: 'Barcelona',
      teamLogo: 'BAR',
      value: 4,
      matches: 6,
      position: 'Winger',
      nationality: 'Brazil'
    },
    {
      id: 'a2',
      rank: 2,
      player: 'Mohamed Salah',
      team: 'Liverpool',
      teamLogo: 'LIV',
      value: 3,
      matches: 6,
      position: 'Forward',
      nationality: 'Egypt'
    },
    {
      id: 'a3',
      rank: 3,
      player: 'Jamal Musiala',
      team: 'Bayern Munich',
      teamLogo: 'FCB',
      value: 3,
      matches: 6,
      position: 'Midfielder',
      nationality: 'Germany'
    }
  ],
  'clean-sheets': [
    {
      id: 'c1',
      rank: 1,
      player: 'Caoimhin Kelleher',
      team: 'Liverpool',
      teamLogo: 'LIV',
      value: 5,
      matches: 6,
      position: 'Goalkeeper',
      nationality: 'Ireland'
    },
    {
      id: 'c2',
      rank: 2,
      player: 'Yann Sommer',
      team: 'Inter',
      teamLogo: 'INT',
      value: 4,
      matches: 6,
      position: 'Goalkeeper',
      nationality: 'Switzerland'
    },
    {
      id: 'c3',
      rank: 3,
      player: 'David Raya',
      team: 'Arsenal',
      teamLogo: 'ARS',
      value: 4,
      matches: 6,
      position: 'Goalkeeper',
      nationality: 'Spain'
    }
  ],
  minutes: [
    {
      id: 'm1',
      rank: 1,
      player: 'Virgil van Dijk',
      team: 'Liverpool',
      teamLogo: 'LIV',
      value: 540,
      matches: 6,
      position: 'Defender',
      nationality: 'Netherlands'
    },
    {
      id: 'm2',
      rank: 2,
      player: 'William Saliba',
      team: 'Arsenal',
      teamLogo: 'ARS',
      value: 540,
      matches: 6,
      position: 'Defender',
      nationality: 'France'
    },
    {
      id: 'm3',
      rank: 3,
      player: 'Ruben Dias',
      team: 'Manchester City',
      teamLogo: 'MCI',
      value: 540,
      matches: 6,
      position: 'Defender',
      nationality: 'Portugal'
    }
  ]
}

const normalizeEntry = (entry = {}) => ({
  id: entry.id ?? entry.statId ?? null,
  category: entry.category ?? 'goals',
  rank: Number(entry.rank) || 0,
  player: entry.player ?? entry.name ?? 'Unknown Player',
  team: entry.team ?? entry.teamName ?? 'Unknown Team',
  teamLogo: entry.teamLogo ?? entry.teamLogoUrl ?? entry.teamInitials ?? (entry.team ?? '').slice(0, 3).toUpperCase(),
  value: Number(entry.value ?? entry.total ?? 0),
  matches: Number(entry.matches ?? entry.games ?? 0),
  season: entry.season ?? '2025-2026',
  position: entry.position ?? null,
  nationality: entry.nationality ?? null,
  age: entry.age ?? null,
  avatar: entry.avatar ?? null,
  bio: entry.bio ?? null,
  preferredFoot: entry.preferredFoot ?? null,
  height: entry.height ?? null,
  recentMatches: Array.isArray(entry.recentMatches) ? entry.recentMatches : []
})

const normalizePlayerStatsPayload = (payload = {}) => {
  const base = { ...DEFAULT_PLAYER_STATS }
  Object.keys(base).forEach((categoryKey) => {
    const category = categoryKey
    const rows = Array.isArray(payload?.[category]) ? payload[category] : []
    base[category] = rows.map((row) => normalizeEntry({ ...row, category }))
  })
  return base
}

const normalizeOverview = (payload = {}) => {
  const totals = payload.totals ?? {}
  const trends = payload.trends ?? payload.change ?? {}
  const top = payload.topPerformers ?? payload.top ?? {}
  return {
    totals: {
      teams: Number(totals.teams ?? totals.totalTeams ?? 0),
      matches: Number(totals.matches ?? totals.totalMatches ?? 0),
      goals: Number(totals.goals ?? totals.totalGoals ?? 0),
      players: Number(totals.players ?? totals.totalPlayers ?? 0)
    },
    trends: {
      teams: Number(trends.teams ?? trends.totalTeams ?? 0),
      matches: Number(trends.matches ?? trends.totalMatches ?? 0),
      goals: Number(trends.goals ?? trends.totalGoals ?? 0),
      players: Number(trends.players ?? trends.totalPlayers ?? 0)
    },
    topPerformers: top,
    updatedAt: payload.updatedAt ?? payload.generatedAt ?? null
  }
}

const handleApiResponse = (response) => {
  if (!response) {
    return DEFAULT_PLAYER_STATS
  }
  if (response.data) {
    return normalizePlayerStatsPayload(response.data)
  }
  return normalizePlayerStatsPayload(response)
}

class StatsService {
  async getOverview(params = {}) {
    try {
      const response = await ApiService.get(STATS_ENDPOINTS.OVERVIEW, params)
      const payload = response?.data ?? response
      return normalizeOverview(payload ?? {})
    } catch (error) {
      logger.error('Failed to load overview stats', error)
      return DEFAULT_OVERVIEW
    }
  }

  async getPlayerStats(params = {}) {
    try {
      const response = await ApiService.get(STATS_ENDPOINTS.PLAYERS, params)
      const normalized = handleApiResponse(response)
      const hasData = Object.values(normalized).some((items) => items.length > 0)
      return hasData ? normalized : FALLBACK_STATS
    } catch (error) {
      logger.error('Failed to load player stats', error)
      return FALLBACK_STATS
    }
  }

  async addPlayerStat(payload) {
    const response = await ApiService.post(STATS_ENDPOINTS.PLAYERS, payload)
    return response?.data ?? response ?? null
  }

  async updatePlayerStat(id, payload) {
    if (!id) {
      throw new Error('Player stat ID is required')
    }
    const endpoint = STATS_ENDPOINTS.PLAYER_DETAIL.replace(':id', id)
    const response = await ApiService.put(endpoint, payload)
    return response?.data ?? response ?? null
  }

  async deletePlayerStat(id) {
    if (!id) {
      throw new Error('Player stat ID is required')
    }
    const endpoint = STATS_ENDPOINTS.PLAYER_DETAIL.replace(':id', id)
    await ApiService.delete(endpoint)
    return true
  }

  async getPlayerStatDetail(id) {
    if (!id) {
      throw new Error('Player stat ID is required')
    }
    try {
      const endpoint = STATS_ENDPOINTS.PLAYER_DETAIL.replace(':id', id)
      const response = await ApiService.get(endpoint)
      const payload = response?.data ?? response
      return payload ? normalizeEntry(payload) : null
    } catch (error) {
      logger.error('Failed to load player stat detail', error)
      const fallback = Object.values(FALLBACK_STATS).flat().find((item) => item.id === id)
      return fallback ? normalizeEntry(fallback) : null
    }
  }

  // ============ NEW SEASON-BASED STATS METHODS ============

  /**
   * Get top scorers for a season (Vua phá lưới)
   */
  async getTopScorers(seasonId, limit = 20) {
    try {
      if (!seasonId) {
        logger.warn('getTopScorers called without seasonId')
        return []
      }
      const response = await ApiService.get(`/stats/season/${seasonId}/top-scorers`, { limit })
      console.log('[StatsService] getTopScorers response:', response)
      // Handle both { data: [...] } and direct array response
      const data = Array.isArray(response) ? response : (response?.data ?? [])
      console.log('[StatsService] getTopScorers parsed data:', data)
      return data
    } catch (error) {
      logger.error('Failed to load top scorers', error)
      console.error('[StatsService] getTopScorers error:', error)
      return []
    }
  }

  /**
   * Get card statistics for a season (Thẻ vàng/đỏ)
   */
  async getCardStats(seasonId) {
    try {
      if (!seasonId) {
        logger.warn('getCardStats called without seasonId')
        return []
      }
      const response = await ApiService.get(`/stats/season/${seasonId}/cards`)
      console.log('[StatsService] getCardStats response:', response)
      // Handle both { data: [...] } and direct array response
      const data = Array.isArray(response) ? response : (response?.data ?? [])
      return data
    } catch (error) {
      logger.error('Failed to load card stats', error)
      console.error('[StatsService] getCardStats error:', error)
      return []
    }
  }

  /**
   * Get Man of the Match statistics for a season
   */
  async getManOfMatchStats(seasonId) {
    try {
      const response = await ApiService.get(`/stats/season/${seasonId}/man-of-match`)
      return response?.data ?? []
    } catch (error) {
      logger.error('Failed to load man of match stats', error)
      return []
    }
  }

  /**
   * Get suspended players for a season (Cầu thủ bị treo giò)
   */
  async getSuspendedPlayers(seasonId) {
    try {
      const response = await ApiService.get(`/stats/season/${seasonId}/suspended`)
      return response?.data ?? []
    } catch (error) {
      logger.error('Failed to load suspended players', error)
      return []
    }
  }

  /**
   * Get comprehensive stats overview for a season
   */
  async getSeasonStatsOverview(seasonId) {
    try {
      const response = await ApiService.get(`/stats/season/${seasonId}/overview`)
      return response?.data ?? null
    } catch (error) {
      logger.error('Failed to load season stats overview', error)
      return null
    }
  }
}

export default new StatsService()
