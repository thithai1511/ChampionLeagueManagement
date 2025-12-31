const ENV = (typeof import.meta !== 'undefined' && import.meta.env)
  ? import.meta.env
  : (typeof process !== 'undefined' ? process.env : {});

const getEnvVar = (keys, fallback) => {
  const lookupKeys = Array.isArray(keys) ? keys : [keys];
  for (const key of lookupKeys) {
    const value = ENV?.[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return fallback;
};

// Application Configuration
export const APP_CONFIG = {
  // Environment Configuration
  ENVIRONMENT: 'development', // development | staging | production

  // API Configuration
  API: {
    BASE_URL: getEnvVar(['VITE_API_URL', 'REACT_APP_API_URL'], 'http://localhost:4001/api'),
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    ENDPOINTS: {
      // Authentication
      AUTH: {
        LOGIN: '/auth/login',
        LOGOUT: '/auth/logout',
        REFRESH: '/auth/refresh',
        PROFILE: '/auth/me',
        REGISTER: '/auth/register'
      },
      // Teams
      TEAMS: {
        LIST: '/teams',
        DETAIL: '/teams/:id',
        CREATE: '/teams',
        UPDATE: '/teams/:id',
        DELETE: '/teams/:id',
        PLAYERS: '/teams/:id/players',
        SEASONS: '/teams/seasons',
        STANDINGS: '/teams/standings'
      },
      // Matches
      MATCHES: {
        LIST: '/matches',
        DETAIL: '/matches/:id',
        CREATE: '/matches',
        UPDATE: '/matches/:id',
        DELETE: '/matches/:id',
        LIVE: '/matches/live',
        RESULTS: '/matches/:id/results'
      },
      // Players
      PLAYERS: {
        LIST: '/players',
        DETAIL: '/players/:id',
        CREATE: '/players',
        UPDATE: '/players/:id',
        DELETE: '/players/:id',
        STATS: '/players/:id/stats'
      },
      // Standings
      STANDINGS: {
        LEAGUE: '/standings/league',
        KNOCKOUT: '/standings/knockout',
        HISTORY: '/standings/history'
      },
      // News
      NEWS: {
        LIST: '/news',
        DETAIL: '/news/:id',
        CREATE: '/news',
        UPDATE: '/news/:id',
        DELETE: '/news/:id',
        CATEGORIES: '/news/categories'
      },
      // Audit logging
      AUDIT: {
        LIST: '/audit-events'
      },
      // Admin - Users & Roles
      USERS: {
        LIST: '/users',
        DETAIL: '/users/:id',
        CREATE: '/users',
        UPDATE: '/users/:id',
        DELETE: '/users/:id',
        ROLES: '/users/:id/roles',
        REMOVE_ROLE: '/users/:id/roles/:roleId',
        TEAMS: '/users/:id/teams',
        REMOVE_TEAM: '/users/:id/teams/:teamId',
        OFFICIAL: '/users/:id/official',
        REMOVE_OFFICIAL: '/users/:id/official'
      },
      ROLES: {
        LIST: '/roles',
        CREATE: '/roles',
        PERMISSIONS: '/roles/:id/permissions'
      },
      PERMISSIONS: {
        LIST: '/permissions'
      },
      RULESETS: {
        LIST: '/rulesets',
        DETAIL: '/rulesets/:id',
        CREATE: '/rulesets',
        UPDATE: '/rulesets/:id',
        DELETE: '/rulesets/:id',
        PUBLISH: '/rulesets/:id/publish',
        PLAYER_CONSTRAINTS: '/rulesets/:id/player-constraints',
        SCORING_RULES: '/rulesets/:id/scoring-rules',
        RANKING_RULES: '/rulesets/:id/ranking-rules',
        ASSIGN_SEASON: '/rulesets/seasons/:seasonId/assign'
      },
      SEASONS: {
        LIST: '/seasons',
        DETAIL: '/seasons/:id',
        CREATE: '/seasons',
        UPDATE: '/seasons/:id',
        DELETE: '/seasons/:id',
        METADATA: '/seasons/metadata'
      },
      SEASON_PLAYERS: {
        LIST: '/season-players',
        PENDING: '/season-players/pending',
        APPROVE: '/season-players/:id/approve',
        APPROVE_ALL: '/season-players/approve-all',
        REJECT: '/season-players/:id/reject'
      },
      PLAYER_REGISTRATIONS: {
        LIST: '/players/registrations',
        CREATE: '/players/registrations',
        UPDATE: '/players/registrations/:id',
        APPROVE: '/players/registrations/:id/approve',
        REJECT: '/players/registrations/:id/reject'
      },
      LEADERBOARD: {
        LIST: '/leaderboard',
        DETAIL: '/leaderboard/:id',
        CREATE: '/leaderboard',
        UPDATE: '/leaderboard/:id',
        DELETE: '/leaderboard/:id'
      },
      // Statistics
      STATS: {
        OVERVIEW: '/stats/overview',
        PLAYERS: '/stats/players',
        PLAYER_DETAIL: '/stats/players/:id',
        TEAMS: '/stats/teams',
        MATCHES: '/stats/matches'
      },
      // Media
      MEDIA: {
        UPLOAD: '/media/upload',
        LIST: '/media',
        DELETE: '/media/:id'
      }
    }
  },

  // Database Configuration
  DATABASE: {
    TYPE: 'postgresql', // postgresql | mysql | mongodb
    CONNECTION: {
      HOST: getEnvVar('DB_HOST', 'localhost'),
      PORT: getEnvVar('DB_PORT', 5432),
      DATABASE: getEnvVar('DB_NAME', 'uefa_champions_league'),
      USERNAME: getEnvVar('DB_USER', 'uefa_admin'),
      PASSWORD: getEnvVar('DB_PASS', 'uefa2025')
    },
    POOL: {
      MIN: 2,
      MAX: 10,
      IDLE_TIMEOUT: 30000
    }
  },

  // Security Configuration
  SECURITY: {
    JWT: {
      SECRET: getEnvVar('JWT_SECRET', 'uefa_champions_league_secret_2025'),
      EXPIRES_IN: '24h',
      REFRESH_EXPIRES_IN: '7d'
    },
    BCRYPT: {
      SALT_ROUNDS: 12
    },
    CORS: {
      ORIGIN: getEnvVar('CORS_ORIGIN', ['http://localhost:3000', 'http://localhost:3001']),
      CREDENTIALS: true
    },
    RATE_LIMITING: {
      WINDOW_MS: 15 * 60 * 1000, // 15 minutes
      MAX_REQUESTS: 100
    }
  },

  // Cache Configuration
  CACHE: {
    TYPE: 'redis', // redis | memory
    TTL: {
      STANDINGS: 300, // 5 minutes
      MATCHES: 60,    // 1 minute
      TEAMS: 3600,    // 1 hour
      NEWS: 1800,     // 30 minutes
      STATS: 900      // 15 minutes
    }
  },

  // File Upload Configuration
  UPLOAD: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'],
    STORAGE_PATH: getEnvVar('UPLOAD_PATH', './uploads'),
    CDN_URL: getEnvVar('CDN_URL', '')
  },

  // Notification Configuration
  NOTIFICATIONS: {
    EMAIL: {
      SMTP_HOST: getEnvVar('SMTP_HOST'),
      SMTP_PORT: getEnvVar('SMTP_PORT', 587),
      SMTP_USER: getEnvVar('SMTP_USER'),
      SMTP_PASS: getEnvVar('SMTP_PASS')
    },
    PUSH: {
      VAPID_PUBLIC_KEY: getEnvVar('VAPID_PUBLIC_KEY'),
      VAPID_PRIVATE_KEY: getEnvVar('VAPID_PRIVATE_KEY')
    }
  },

  // Feature Flags
  FEATURES: {
    LIVE_TICKER: true,
    FANTASY_FOOTBALL: true,
    VIDEO_STREAMING: true,
    SOCIAL_LOGIN: true,
    PUSH_NOTIFICATIONS: true,
    ANALYTICS: true
  },

  // UI Configuration
  UI: {
    THEME: {
      PRIMARY_COLOR: '#003399',
      SECONDARY_COLOR: '#0066cc',
      SUCCESS_COLOR: '#28a745',
      WARNING_COLOR: '#ffc107',
      ERROR_COLOR: '#dc3545'
    },
    PAGINATION: {
      DEFAULT_PAGE_SIZE: 20,
      MAX_PAGE_SIZE: 100
    },
    ANIMATIONS: {
      DURATION: 300,
      EASING: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }
  }
}

export default APP_CONFIG
