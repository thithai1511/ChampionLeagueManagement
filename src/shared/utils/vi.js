export const ROLE_LABELS = {
  team_admin: 'Quản trị đội bóng',
  super_admin: 'Quản trị tối cao',
  admin: 'Quản trị viên',
  content_manager: 'Quản lý nội dung',
  match_official: 'Trọng tài',
  competition_manager: 'Quản lý giải đấu',
  viewer: 'Người xem',
  read_only: 'Chỉ đọc',
  readonly: 'Chỉ đọc',
  fan: 'Người hâm mộ',
  team_registrar: 'Quản lý đăng ký đội',
  teamregistrar: 'Quản lý đăng ký đội',
  team_manager: 'Quản lý đội',
  registrar: 'Đăng ký',
  referee: 'Trọng tài',
  official: 'Trọng tài',
  supervisor: 'Giám sát',
  competitionmanager: 'Quản lý giải đấu'
}

export const PERMISSION_LABELS = {
  manage_own_player_registrations: 'Quản lý đăng ký cầu thủ (đội của tôi)',
  view_own_team: 'Xem đội của tôi',
  approve_player_registrations: 'Duyệt đăng ký cầu thủ',
  manage_own_team_squad: 'Quản lý danh sách cầu thủ (đội của tôi)',
  manage_users: 'Quản lý người dùng',
  manage_rulesets: 'Quản lý bộ luật',
  view_audit_logs: 'Xem nhật ký hoạt động',
  manage_content: 'Quản lý nội dung',
  manage_matches: 'Quản lý trận đấu',
  manage_teams: 'Quản lý đội bóng',
  approve_registrations: 'Phê duyệt đăng ký'
}

export const USER_STATUS_LABELS = {
  active: 'Hoạt động',
  inactive: 'Không hoạt động',
  suspended: 'Tạm khóa',
  pending: 'Chờ duyệt',
  invited: 'Đã mời'
}

export const SEASON_STATUS_LABELS = {
  draft: 'Bản nháp',
  inviting: 'Mời tham dự',
  registering: 'Đang đăng ký',
  scheduled: 'Đã lên lịch',
  in_progress: 'Đang diễn ra',
  completed: 'Đã kết thúc',
  archived: 'Lưu trữ'
}

export const NEWS_CATEGORY_LABELS = {
  matches: 'Trận đấu',
  teams: 'Đội bóng',
  players: 'Cầu thủ',
  draws: 'Bốc thăm',
  awards: 'Giải thưởng',
  general: 'Tổng hợp'
}

export const MATCH_STATUS_LABELS = {
  live: 'Trực tiếp',
  in_play: 'Trực tiếp',
  'in play': 'Trực tiếp',
  inplay: 'Trực tiếp',
  paused: 'Tạm nghỉ',
  finished: 'Hết giờ',
  completed: 'Đã kết thúc',
  scheduled: 'Sắp diễn ra',
  timed: 'Sắp diễn ra',
  postponed: 'Hoãn',
  suspended: 'Tạm dừng',
  cancelled: 'Đã hủy',
  canceled: 'Đã hủy',
  awarded: 'Xử thắng'
}

export const COMPETITION_STAGE_LABELS = {
  'league phase': 'Vòng phân hạng',
  'group stage': 'Vòng bảng',
  'play-off round': 'Vòng play-off',
  'play off round': 'Vòng play-off',
  qualification: 'Vòng loại',
  qualifying: 'Vòng loại',
  'round of 16': 'Vòng 1/8',
  'last 16': 'Vòng 1/8',
  'quarter-finals': 'Tứ kết',
  'quarter final': 'Tứ kết',
  'quarter finals': 'Tứ kết',
  'semi-finals': 'Bán kết',
  'semi final': 'Bán kết',
  'semi finals': 'Bán kết',
  final: 'Chung kết',
  'third place': 'Tranh hạng ba',
  'preliminary round': 'Vòng sơ loại'
}

export const COMPETITION_NAME_LABELS = {
  'uefa champions league': 'Cúp C1 Việt Nam',
  'champions league': 'Cúp C1 Việt Nam',
  'uefa europa league': 'Cúp C2 Việt Nam',
  'europa league': 'Cúp C2 Việt Nam',
  'uefa europa conference league': 'Cúp C3 Việt Nam',
  'europa conference league': 'Cúp C3 Việt Nam',
  'uefa super cup': 'Siêu cúp Việt Nam',
  'super cup': 'Siêu cúp Việt Nam'
}

export const PLAYER_POSITION_LABELS = {
  gk: 'Thủ môn',
  goalkeeper: 'Thủ môn',
  df: 'Hậu vệ',
  defender: 'Hậu vệ',
  mf: 'Tiền vệ',
  midfielder: 'Tiền vệ',
  fw: 'Tiền đạo',
  forward: 'Tiền đạo',
  attacker: 'Tiền đạo',
  centerforward: 'Tiền đạo',
  centreforward: 'Tiền đạo',
  winger: 'Tiền đạo'
}

export const COUNTRY_LABELS = {
  england: 'Anh',
  wales: 'Xứ Wales',
  scotland: 'Scốt-len',
  ireland: 'Ai-len',
  'northern ireland': 'Bắc Ai-len',
  spain: 'Tây Ban Nha',
  france: 'Pháp',
  germany: 'Đức',
  italy: 'Ý',
  portugal: 'Bồ Đào Nha',
  netherlands: 'Hà Lan',
  belgium: 'Bỉ',
  switzerland: 'Thụy Sĩ',
  austria: 'Áo',
  czechia: 'Séc',
  'czech republic': 'Séc',
  croatia: 'Croatia',
  serbia: 'Serbia',
  ukraine: 'Ukraine',
  russia: 'Nga',
  turkey: 'Thổ Nhĩ Kỳ',
  greece: 'Hy Lạp',
  denmark: 'Đan Mạch',
  sweden: 'Thụy Điển',
  norway: 'Na Uy',
  poland: 'Ba Lan',
  hungary: 'Hungary',
  romania: 'Romania',
  bulgaria: 'Bulgaria',
  israel: 'Israel',
  cyprus: 'Síp',
  slovenia: 'Slovenia',
  slovakia: 'Slovakia',
  iceland: 'Iceland',
  egypt: 'Ai Cập',
  brazil: 'Brazil',
  argentina: 'Argentina',
  usa: 'Mỹ',
  'united states': 'Mỹ'
}

export const toRoleLabel = (role) => {
  const normalized = String(role?.code ?? role?.name ?? role ?? '')
    .trim()
    .toLowerCase()
  return ROLE_LABELS[normalized] ?? 'Vai trò'
}

export const toPermissionLabel = (permission) => {
  const normalized = String(permission?.code ?? permission?.name ?? permission ?? '')
    .trim()
    .toLowerCase()
  return PERMISSION_LABELS[normalized] ?? 'Quyền'
}

export const toNewsCategoryLabel = (category) => {
  const normalized = String(category ?? '').trim().toLowerCase()
  return NEWS_CATEGORY_LABELS[normalized] ?? 'Khác'
}

export const toUserStatusLabel = (status) => {
  const normalized = String(status ?? '').trim().toLowerCase()
  return USER_STATUS_LABELS[normalized] ?? 'Không rõ'
}

export const toSeasonStatusLabel = (status) => {
  const normalized = String(status ?? '').trim().toLowerCase()
  return SEASON_STATUS_LABELS[normalized] ?? 'Không rõ'
}

export const toMatchStatusLabel = (status) => {
  const normalized = String(status ?? '').trim().toLowerCase()
  return MATCH_STATUS_LABELS[normalized] ?? 'Không rõ'
}

export const toCompetitionStageLabel = (stage) => {
  const raw = String(stage ?? '').trim()
  if (!raw) return 'Vòng đấu'

  const normalized = raw
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const matchdayMatch = normalized.match(/^matchday\s*(\d+)$/i)
  if (matchdayMatch) return `Vòng ${matchdayMatch[1]}`

  const groupMatch = normalized.match(/^group\s+([a-z])$/i)
  if (groupMatch) return `Bảng ${groupMatch[1].toUpperCase()}`

  const mapped = COMPETITION_STAGE_LABELS[normalized]
  if (mapped) return mapped

  const containsLikelyEnglish = /[a-z]/i.test(raw) && !/[À-ỹ]/.test(raw)
  return containsLikelyEnglish ? 'Vòng đấu' : raw
}

export const toCompetitionNameLabel = (name) => {
  const raw = String(name ?? '').trim()
  if (!raw) return 'Giải đấu'

  const normalized = raw.toLowerCase().replace(/\s+/g, ' ').trim()
  const mapped = COMPETITION_NAME_LABELS[normalized]
  if (mapped) return mapped

  const containsLikelyEnglish = /[a-z]/i.test(raw) && !/[À-ỹ]/.test(raw)
  return containsLikelyEnglish ? 'Giải đấu' : raw
}

export const toPlayerPositionLabel = (position) => {
  const raw = String(position ?? '').trim()
  if (!raw) return 'Không rõ'

  const normalized = raw.toLowerCase().replace(/[_\s-]+/g, '')
  const mapped = PLAYER_POSITION_LABELS[normalized]
  if (mapped) return mapped

  const containsLikelyEnglish = /[a-z]/i.test(raw) && !/[À-ỹ]/.test(raw)
  return containsLikelyEnglish ? 'Không rõ' : raw
}

export const toCountryLabel = (country) => {
  const raw = String(country ?? '').trim()
  if (!raw) return 'Đang cập nhật'

  if (/^[A-Za-z]{2,3}$/.test(raw)) {
    try {
      const displayNames = typeof Intl !== 'undefined' && Intl.DisplayNames
        ? new Intl.DisplayNames(['vi'], { type: 'region' })
        : null
      const label = displayNames?.of?.(raw.toUpperCase())
      if (label) return label
    } catch {
      // ignore
    }
  }

  const mapped = COUNTRY_LABELS[raw.toLowerCase()]
  if (mapped) return mapped

  const containsLikelyEnglish = /[a-z]/i.test(raw) && !/[À-ỹ]/.test(raw)
  return containsLikelyEnglish ? 'Đang cập nhật' : raw
}
