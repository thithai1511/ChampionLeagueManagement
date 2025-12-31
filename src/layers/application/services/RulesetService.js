import ApiService from './ApiService'
import APP_CONFIG from '../../../config/app.config'

const ENDPOINTS = APP_CONFIG.API.ENDPOINTS.RULESETS

const withParams = (template, params = {}) =>
  template.replace(/:([a-zA-Z]+)/g, (_, key) => encodeURIComponent(params[key] ?? `:${key}`))

const DEFAULT_PARAMETERS = Object.freeze({
  squad: {
    minAge: 16,
    maxAge: 40,
    maxPlayers: 30,
    maxForeignPlayers: 5,
    squadDeadline: null
  },
  scoring: {
    goalTypes: ['open_play', 'penalty', 'free_kick', 'own_goal'],
    maxGoalTime: 120
  },
  ranking: {
    points: { win: 3, draw: 1, loss: 0 },
    tiebreakers: ['points', 'goal_difference', 'goals_for', 'head_to_head', 'fair_play']
  }
})

const createDefaultParameters = () => ({
  squad: { ...DEFAULT_PARAMETERS.squad },
  scoring: {
    ...DEFAULT_PARAMETERS.scoring,
    goalTypes: [...DEFAULT_PARAMETERS.scoring.goalTypes]
  },
  ranking: {
    points: { ...DEFAULT_PARAMETERS.ranking.points },
    tiebreakers: [...DEFAULT_PARAMETERS.ranking.tiebreakers]
  }
})

const toArray = (value) => {
  if (Array.isArray(value)) {
    return value
  }
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean)
  }
  return []
}

const normalizeRulesetSummary = (payload = {}) => {
  const id = payload.ruleset_id ?? payload.id
  return {
    id,
    name: payload.name ?? '',
    versionTag: payload.version_tag ?? payload.versionTag ?? '',
    description: payload.description ?? '',
    isActive: Boolean(payload.is_active ?? payload.isActive ?? false),
    effectiveFrom: payload.effective_from ?? payload.effectiveFrom ?? null,
    effectiveTo: payload.effective_to ?? payload.effectiveTo ?? null,
    createdAt: payload.created_at ?? payload.createdAt ?? null,
    updatedAt: payload.updated_at ?? payload.updatedAt ?? null
  }
}

const buildParametersFromDetail = (payload = {}) => {
  const params = createDefaultParameters()

  if (payload.playerConstraints) {
    params.squad = {
      ...params.squad,
      minAge: payload.playerConstraints.minAge ?? params.squad.minAge,
      maxAge: payload.playerConstraints.maxAge ?? params.squad.maxAge,
      maxPlayers: payload.playerConstraints.maxPlayers ?? params.squad.maxPlayers,
      maxForeignPlayers:
        payload.playerConstraints.maxForeignPlayers ?? params.squad.maxForeignPlayers,
      squadDeadline: payload.playerConstraints.squadDeadline ?? params.squad.squadDeadline
    }
  }

  if (payload.scoringRules) {
    params.scoring = {
      ...params.scoring,
      goalTypes:
        toArray(payload.scoringRules.acceptedGoalTypes).length > 0
          ? payload.scoringRules.acceptedGoalTypes
          : params.scoring.goalTypes,
      maxGoalTime: payload.scoringRules.maxGoalTime ?? params.scoring.maxGoalTime
    }
  }

  if (payload.rankingRules) {
    params.ranking = {
      ...params.ranking,
      points: {
        win: payload.rankingRules.pointsForWin ?? params.ranking.points.win,
        draw: payload.rankingRules.pointsForDraw ?? params.ranking.points.draw,
        loss: payload.rankingRules.pointsForLoss ?? params.ranking.points.loss
      },
      tiebreakers:
        toArray(payload.rankingRules.tieBreakingOrder).length > 0
          ? payload.rankingRules.tieBreakingOrder
          : params.ranking.tiebreakers
    }
  }

  return params
}

const normalizeSeasonAssignments = (assignments = []) => {
  if (!Array.isArray(assignments)) {
    return []
  }
  return assignments
    .map((item) => {
      const seasonId = Number(item.seasonId ?? item.season_id)
      if (!Number.isFinite(seasonId)) {
        return null
      }
      return {
        seasonId,
        assignedAt: item.assignedAt ?? item.assigned_at ?? null,
        seasonName: item.seasonName ?? item.season_name ?? null,
        seasonCode: item.seasonCode ?? item.season_code ?? null
      }
    })
    .filter(Boolean)
}

const normalizeRulesetDetail = (payload = {}) => ({
  ...normalizeRulesetSummary(payload),
  parameters: buildParametersFromDetail(payload),
  seasonAssignments: normalizeSeasonAssignments(payload.seasonAssignments)
})

const toNumber = (value, fallback) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const buildConstraintsPayload = (parameters = {}) => {
  const squad = parameters.squad ?? DEFAULT_PARAMETERS.squad
  const defaults = DEFAULT_PARAMETERS.squad
  const result = {
    minAge: toNumber(squad.minAge, defaults.minAge),
    maxAge: toNumber(squad.maxAge, defaults.maxAge),
    maxPlayers: toNumber(squad.maxPlayers, defaults.maxPlayers),
    maxForeignPlayers: toNumber(squad.maxForeignPlayers, defaults.maxForeignPlayers)
  }

  if (squad.squadDeadline) {
    result.squadDeadline = squad.squadDeadline
  }

  return {
    minAge: toNumber(squad.minAge, defaults.minAge),
    maxAge: toNumber(squad.maxAge, defaults.maxAge),
    maxPlayers: toNumber(squad.maxPlayers, defaults.maxPlayers),
    maxForeignPlayers: toNumber(squad.maxForeignPlayers, defaults.maxForeignPlayers),
    ...(squad.squadDeadline ? { squadDeadline: squad.squadDeadline } : {})
  }
}

const buildScoringPayload = (parameters = {}) => {
  const scoring = parameters.scoring ?? DEFAULT_PARAMETERS.scoring
  const goalTypes = toArray(scoring.goalTypes)
  return {
    maxGoalTime: toNumber(scoring.maxGoalTime, DEFAULT_PARAMETERS.scoring.maxGoalTime),
    acceptedGoalTypes: goalTypes.length > 0 ? goalTypes : DEFAULT_PARAMETERS.scoring.goalTypes
  }
}

const buildRankingPayload = (parameters = {}) => {
  const ranking = parameters.ranking ?? DEFAULT_PARAMETERS.ranking
  const tiebreakers = toArray(ranking.tiebreakers)
  return {
    pointsForWin: toNumber(ranking.points?.win, DEFAULT_PARAMETERS.ranking.points.win),
    pointsForDraw: toNumber(ranking.points?.draw, DEFAULT_PARAMETERS.ranking.points.draw),
    pointsForLoss: toNumber(ranking.points?.loss, DEFAULT_PARAMETERS.ranking.points.loss),
    tieBreakingOrder:
      tiebreakers.length > 0 ? tiebreakers : DEFAULT_PARAMETERS.ranking.tiebreakers
  }
}

class RulesetService {
  async listRulesets() {
    const response = await ApiService.get(ENDPOINTS.LIST)
    // ApiService.get() returns { data: ... } or array wrapped in { data: ... }
    const data = response?.data ?? response
    if (!Array.isArray(data)) {
      return []
    }
    return data.map(normalizeRulesetSummary)
  }

  async getRulesetById(rulesetId) {
    const endpoint = withParams(ENDPOINTS.DETAIL, { id: rulesetId })
    const response = await ApiService.get(endpoint)
    return normalizeRulesetDetail(response)
  }

  async saveRuleset(payload) {
    const { id, parameters, name, versionTag, description } = payload
    const baseBody = {
      name,
      versionTag,
      description: description ?? ''
    }

    if (payload.effectiveFrom) {
      baseBody.effectiveFrom = payload.effectiveFrom
    }

    if (payload.effectiveTo) {
      baseBody.effectiveTo = payload.effectiveTo
    }

    let rulesetId = id
    try {
      if (rulesetId) {
        const endpoint = withParams(ENDPOINTS.UPDATE, { id: rulesetId })
        await ApiService.put(endpoint, baseBody)
      } else {
        const response = await ApiService.post(ENDPOINTS.CREATE, baseBody)
        rulesetId = response?.rulesetId ?? response?.data?.rulesetId
      }

      if (!rulesetId) {
        throw new Error('Ruleset identifier missing after save')
      }

      await ApiService.put(
        withParams(ENDPOINTS.PLAYER_CONSTRAINTS, { id: rulesetId }),
        buildConstraintsPayload(parameters)
      )

      await ApiService.put(
        withParams(ENDPOINTS.SCORING_RULES, { id: rulesetId }),
        buildScoringPayload(parameters)
      )

      await ApiService.put(
        withParams(ENDPOINTS.RANKING_RULES, { id: rulesetId }),
        buildRankingPayload(parameters)
      )

      return this.getRulesetById(rulesetId)
    } catch (error) {
      // Extract error message properly from ApiService error object
      const errorMessage = error?.message || error?.error || 'Không thể lưu bộ quy tắc'
      const enhancedError = new Error(errorMessage)
      enhancedError.status = error?.status
      enhancedError.originalError = error
      throw enhancedError
    }
  }

  async publishRuleset(rulesetId) {
    const endpoint = withParams(ENDPOINTS.PUBLISH, { id: rulesetId })
    await ApiService.post(endpoint)
    return this.getRulesetById(rulesetId)
  }

  async assignRulesetToSeason(seasonId, rulesetId) {
    const endpoint = withParams(ENDPOINTS.ASSIGN_SEASON, { seasonId })
    await ApiService.post(endpoint, { rulesetId })
  }

  async deleteRuleset(rulesetId) {
    const endpoint = withParams(ENDPOINTS.DELETE, { id: rulesetId })
    await ApiService.delete(endpoint)
  }
}

export default new RulesetService()
