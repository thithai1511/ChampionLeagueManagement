// Application Layer - Business Logic & API Services
// This layer contains all business logic and API communication

// API Services
export { default as ApiService } from './services/ApiService'
export { default as AuthService } from './services/AuthService'
export { default as TeamsService } from './services/TeamsService'
export { default as MatchesService } from './services/MatchesService'
export { default as MatchService } from './services/MatchService'
export { default as PlayersService } from './services/PlayersService'
export { default as NewsService } from './services/NewsService'
export { default as StatsService } from './services/StatsService'
export { default as LeaderboardService } from './services/LeaderboardService'
export { default as UserService } from './services/UserService'
export { default as RoleService } from './services/RoleService'
export { default as PermissionService } from './services/PermissionService'
export { default as AuditLogService } from './services/AuditLogService'

// Business Logic
export { default as TournamentLogic } from './logic/TournamentLogic'
export { default as StandingsLogic } from './logic/StandingsLogic'
export { default as MatchLogic } from './logic/MatchLogic'
export { default as PlayerLogic } from './logic/PlayerLogic'

// State Management
export { default as AppStore } from './store/AppStore'
export { default as AuthStore } from './store/AuthStore'
export { default as TournamentStore } from './store/TournamentStore'

// Utilities
export { default as ApiClient } from './utils/ApiClient'
export { default as DataValidator } from './utils/DataValidator'
export { default as ErrorHandler } from './utils/ErrorHandler'

// Application Layer Configuration
export const APPLICATION_CONFIG = {
  BUSINESS_RULES: {
    TOURNAMENT: {
      MAX_TEAMS: 36,
      MATCHES_PER_TEAM: 8,
      QUALIFICATION_POSITIONS: {
        DIRECT: 8,
        PLAYOFF: 16,
        ELIMINATED: 12
      }
    },
    TEAMS: {
      MIN_PLAYERS: 15,
      MAX_PLAYERS: 25,
      MAX_FOREIGN_PLAYERS: 3
    },
    MATCHES: {
      DURATION: 90,
      EXTRA_TIME: 30,
      PENALTY_SHOOTOUT: true
    }
  },
  VALIDATION_RULES: {
    TEAM_NAME: {
      MIN_LENGTH: 2,
      MAX_LENGTH: 50,
      REQUIRED: true
    },
    PLAYER_AGE: {
      MIN: 16,
      MAX: 45
    },
    MATCH_SCORE: {
      MIN: 0,
      MAX: 20
    }
  }
}
