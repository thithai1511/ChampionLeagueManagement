import ApiService from './ApiService'
import APP_CONFIG from '../../../config/app.config'

const ENDPOINTS = APP_CONFIG.API.ENDPOINTS.SEASONS

const replacePathParams = (template, params = {}) =>
  template.replace(/:([a-zA-Z]+)/g, (_, key) => {
    const value = params[key]
    if (value === undefined || value === null) {
      throw new Error(`Missing path param: ${key}`)
    }
    return encodeURIComponent(String(value))
  })

const coerceNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === '') {
    return fallback
  }
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

const normalizeSeason = (payload = {}) => {
  const id = payload.id ?? payload.seasonId ?? payload.season_id
  return {
    id: Number.isFinite(Number(id)) ? Number(id) : null,
    name: payload.name ?? '',
    code: payload.code ?? '',
    status: payload.status ?? 'draft',
    startDate: payload.startDate ?? payload.start_date ?? null,
    endDate: payload.endDate ?? payload.end_date ?? null,
    tournamentId: payload.tournamentId ?? payload.tournament_id ?? null,
    tournamentName: payload.tournamentName ?? payload.tournament_name ?? '',
    rulesetId: payload.rulesetId ?? payload.ruleset_id ?? null,
    rulesetName: payload.rulesetName ?? payload.ruleset_name ?? '',
    description: payload.description ?? null,
    participationFee: coerceNumber(payload.participationFee ?? payload.participation_fee ?? 0, 0),
    maxTeams: coerceNumber(payload.maxTeams ?? payload.max_teams ?? 10, 10),
    expectedRounds: coerceNumber(payload.expectedRounds ?? payload.expected_rounds ?? 18, 18),
    invitationOpenedAt: payload.invitationOpenedAt ?? payload.invitation_opened_at ?? null,
    registrationDeadline: payload.registrationDeadline ?? payload.registration_deadline ?? null,
    createdAt: payload.createdAt ?? payload.created_at ?? null,
    updatedAt: payload.updatedAt ?? payload.updated_at ?? null,
    label: payload.label ?? payload.name ?? payload.code ?? ''
  }
}

const normalizeMetadata = (payload = {}) => ({
  statuses: Array.isArray(payload.statuses) ? payload.statuses : [],
  tournaments: Array.isArray(payload.tournaments)
    ? payload.tournaments.map((item) => ({
      id: Number(item.id ?? item.tournament_id ?? item.value ?? null),
      name: item.name ?? item.label ?? ''
    })).filter((item) => Number.isFinite(item.id) && item.name)
    : [],
  rulesets: Array.isArray(payload.rulesets)
    ? payload.rulesets.map((item) => ({
      id: Number(item.id ?? item.ruleset_id ?? item.value ?? null),
      name: item.name ?? item.label ?? ''
    })).filter((item) => Number.isFinite(item.id) && item.name)
    : []
})

const unwrapPayload = (payload) => {
  if (
    payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    Object.prototype.hasOwnProperty.call(payload, 'data')
  ) {
    return payload.data
  }
  return payload
}

class SeasonService {
  async listSeasons() {
    const response = await ApiService.get(ENDPOINTS.LIST)
    const collection = unwrapPayload(response)
    const items = Array.isArray(collection) ? collection : []
    return items.map(normalizeSeason).filter((season) => Number.isFinite(season.id))
  }

  async getSeasonById(id) {
    if (!Number.isFinite(Number(id))) {
      throw new Error('Invalid season id')
    }
    const response = await ApiService.get(replacePathParams(ENDPOINTS.DETAIL, { id }))
    return normalizeSeason(unwrapPayload(response))
  }

  async getMetadata() {
    const response = await ApiService.get(ENDPOINTS.METADATA)
    return normalizeMetadata(unwrapPayload(response) ?? {})
  }

  async createSeason(payload) {
    const response = await ApiService.post(ENDPOINTS.CREATE, payload)
    return normalizeSeason(unwrapPayload(response))
  }

  async updateSeason(id, payload) {
    if (!Number.isFinite(Number(id))) {
      throw new Error('Invalid season id')
    }
    const response = await ApiService.put(replacePathParams(ENDPOINTS.UPDATE, { id }), payload)
    return normalizeSeason(unwrapPayload(response))
  }

  async deleteSeason(id) {
    if (!Number.isFinite(Number(id))) {
      throw new Error('Invalid season id')
    }
    await ApiService.delete(replacePathParams(ENDPOINTS.DELETE, { id }))
  }

  /**
   * Remove a player from season registration (Super Admin only)
   * DELETE /api/season-players/:id
   */
  async removeSeasonPlayerRegistration(seasonPlayerId) {
    if (!Number.isFinite(Number(seasonPlayerId))) {
      throw new Error('Invalid season player id')
    }
    // Note: Endpoint is /api/season-players/:id
    await ApiService.delete(`/season-players/${seasonPlayerId}`)
  }

  /**
   * Update registration details (Super Admin only)
   * PUT /api/season-players/:id
   */
  async updateSeasonPlayerRegistration(seasonPlayerId, payload) {
    if (!Number.isFinite(Number(seasonPlayerId))) {
      throw new Error('Invalid season player id')
    }
    await ApiService.put(`/season-players/${seasonPlayerId}`, payload)
  }
}

export default new SeasonService()
