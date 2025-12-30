// Application Constants
// Centralized constants used across the application

// API Response Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
}

// Match Status Constants
export const MATCH_STATUS = {
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  FINISHED: 'finished',
  POSTPONED: 'postponed',
  CANCELLED: 'cancelled'
}

// Team Status Constants
export const TEAM_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended'
}

// Player Position Constants
export const PLAYER_POSITIONS = {
  GOALKEEPER: 'Thủ môn',
  DEFENDER: 'Hậu vệ',
  MIDFIELDER: 'Tiền vệ',
  FORWARD: 'Tiền đạo'
}

// Tournament Phase Constants
export const TOURNAMENT_PHASES = {
  LEAGUE: 'league',
  PLAYOFF: 'playoff',
  ROUND_OF_16: 'round_of_16',
  QUARTER_FINALS: 'quarter_finals',
  SEMI_FINALS: 'semi_finals',
  FINAL: 'final'
}

// Qualification Status Constants
export const QUALIFICATION_STATUS = {
  QUALIFIED: 'qualified',
  PLAYOFF: 'playoff',
  ELIMINATED: 'eliminated'
}

// News Category Constants
export const NEWS_CATEGORIES = {
  MATCHES: 'matches',
  TEAMS: 'teams',
  PLAYERS: 'players',
  DRAWS: 'draws',
  AWARDS: 'awards',
  GENERAL: 'general'
}

// User Role Constants
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  TEAM_ADMIN: 'team_admin',
  SUPERVISOR: 'supervisor',
  MATCH_OFFICIAL: 'match_official',
  VIEWER: 'viewer'
}

// Permission Constants
export const PERMISSIONS = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  ADMIN: 'admin',
  MANAGE_USERS: 'manage_users',
  MANAGE_RULESETS: 'manage_rulesets',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  MANAGE_MATCHES: 'manage_matches',
  MANAGE_TEAMS: 'manage_teams',
  MANAGE_CONTENT: 'manage_content',
  MANAGE_OWN_PLAYER_REGISTRATIONS: 'manage_own_player_registrations',
  VIEW_OWN_TEAM: 'view_own_team',
  APPROVE_PLAYER_REGISTRATIONS: 'approve_player_registrations',
  MANAGE_OWN_TEAM_SQUAD: 'manage_own_team_squad'
}

// Event Type Constants
export const EVENT_TYPES = {
  GOAL: 'goal',
  ASSIST: 'assist',
  YELLOW_CARD: 'yellow_card',
  RED_CARD: 'red_card',
  SUBSTITUTION: 'substitution',
  PENALTY: 'penalty',
  OWN_GOAL: 'own_goal',
  VAR_DECISION: 'var_decision'
}

// Competition Constants
export const COMPETITIONS = {
  CHAMPIONS_LEAGUE: 'champions_league',
  EUROPA_LEAGUE: 'europa_league',
  CONFERENCE_LEAGUE: 'conference_league',
  SUPER_CUP: 'super_cup',
  YOUTH_LEAGUE: 'youth_league'
}

// Date Format Constants
export const DATE_FORMATS = {
  DISPLAY: 'DD/MM/YYYY',
  API: 'YYYY-MM-DD',
  TIME: 'HH:mm',
  DATETIME: 'DD/MM/YYYY HH:mm',
  ISO: 'YYYY-MM-DDTHH:mm:ss.sssZ'
}

// Pagination Constants
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100]
}

// Cache Duration Constants (in seconds)
export const CACHE_DURATION = {
  STANDINGS: 300,    // 5 minutes
  MATCHES: 60,       // 1 minute
  TEAMS: 3600,       // 1 hour
  NEWS: 1800,        // 30 minutes
  STATS: 900,        // 15 minutes
  LIVE_DATA: 30      // 30 seconds
}

// File Upload Constants
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword']
}

// Validation Constants
export const VALIDATION = {
  TEAM_NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50
  },
  PLAYER_NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100
  },
  PLAYER_AGE: {
    MIN: 16,
    MAX: 45
  },
  MATCH_SCORE: {
    MIN: 0,
    MAX: 20
  },
  NEWS_TITLE: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 200
  },
  NEWS_CONTENT: {
    MIN_LENGTH: 50,
    MAX_LENGTH: 10000
  }
}

// UI Constants
export const UI = {
  BREAKPOINTS: {
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280,
    XXL: 1536
  },
  ANIMATION_DURATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500
  },
  Z_INDEX: {
    DROPDOWN: 1000,
    STICKY: 1020,
    FIXED: 1030,
    MODAL_BACKDROP: 1040,
    MODAL: 1050,
    POPOVER: 1060,
    TOOLTIP: 1070,
    TOAST: 1080
  }
}

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Lỗi mạng. Vui lòng kiểm tra kết nối và thử lại.',
  UNAUTHORIZED: 'Bạn không được phép thực hiện thao tác này.',
  FORBIDDEN: 'Truy cập bị từ chối. Bạn không có quyền truy cập tài nguyên này.',
  NOT_FOUND: 'Không tìm thấy tài nguyên được yêu cầu.',
  VALIDATION_ERROR: 'Vui lòng kiểm tra dữ liệu nhập và thử lại.',
  SERVER_ERROR: 'Lỗi máy chủ. Vui lòng thử lại sau.',
  TIMEOUT_ERROR: 'Yêu cầu bị quá thời gian. Vui lòng thử lại.',
  UNKNOWN_ERROR: 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.'
}

// Success Messages
export const SUCCESS_MESSAGES = {
  TEAM_CREATED: 'Tạo đội thành công',
  TEAM_UPDATED: 'Cập nhật đội thành công',
  TEAM_DELETED: 'Xóa đội thành công',
  MATCH_CREATED: 'Tạo lịch trận đấu thành công',
  MATCH_UPDATED: 'Cập nhật trận đấu thành công',
  MATCH_DELETED: 'Xóa trận đấu thành công',
  PLAYER_CREATED: 'Thêm cầu thủ thành công',
  PLAYER_UPDATED: 'Cập nhật cầu thủ thành công',
  PLAYER_DELETED: 'Xóa cầu thủ thành công',
  NEWS_PUBLISHED: 'Đăng bài thành công',
  LOGIN_SUCCESS: 'Đăng nhập thành công',
  LOGOUT_SUCCESS: 'Đăng xuất thành công'
}

export default {
  HTTP_STATUS,
  MATCH_STATUS,
  TEAM_STATUS,
  PLAYER_POSITIONS,
  TOURNAMENT_PHASES,
  QUALIFICATION_STATUS,
  NEWS_CATEGORIES,
  USER_ROLES,
  PERMISSIONS,
  EVENT_TYPES,
  COMPETITIONS,
  DATE_FORMATS,
  PAGINATION,
  CACHE_DURATION,
  UPLOAD_LIMITS,
  VALIDATION,
  UI,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
}
