import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Home,
  Loader2,
  Mail,
  Shield,
  Shirt,
  Target,
  Trophy,
  User,
  Users,
  XCircle
} from 'lucide-react'
import TeamsService from '../../../layers/application/services/TeamsService'
import SeasonService from '../../../layers/application/services/SeasonService'
import ApiService from '../../../layers/application/services/ApiService'
import toast, { Toaster } from 'react-hot-toast'
import TeamMatchLineup from '../components/TeamMatchLineup'

const PARTICIPATION_STEPS = [
  { key: 'invitation', label: 'Lời mời', icon: Mail },
  { key: 'confirmation', label: 'Xác nhận', icon: CheckCircle2 },
  { key: 'club_docs', label: 'Hồ sơ CLB', icon: FileText },
  { key: 'player_list', label: 'Danh sách cầu thủ', icon: Users },
  { key: 'fees', label: 'Lệ phí', icon: Target },
  { key: 'btc_approval', label: 'BTC duyệt', icon: Shield }
]

const TeamAdminDashboard = ({ currentUser }) => {
  const teamIds = useMemo(() => {
    return Array.isArray(currentUser?.teamIds) ? currentUser.teamIds : []
  }, [currentUser])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Team data
  const [team, setTeam] = useState(null)
  const [seasons, setSeasons] = useState([])
  const [selectedSeasonId, setSelectedSeasonId] = useState(null)

  // Fee Data
  const [feeStatus, setFeeStatus] = useState(null)
  const [feeLoading, setFeeLoading] = useState(false)

  // Invitation data
  const [invitations, setInvitations] = useState([])
  const [invitationsLoading, setInvitationsLoading] = useState(false)

  // Players data
  const [players, setPlayers] = useState([])
  const [playersLoading, setPlayersLoading] = useState(false)

  // Stats
  const [teamStats, setTeamStats] = useState({
    matchesPlayed: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0
  })

  // Active tab
  const [activeTab, setActiveTab] = useState('overview') // overview | invitations | club | players | schedule | lineup

  // Lineup Tab Data
  const [dashboardMatches, setDashboardMatches] = useState([])
  const [selectedLineupMatchId, setSelectedLineupMatchId] = useState(null)
  const [loadingMatches, setLoadingMatches] = useState(false)

  // BTC Requirements validation
  const BTC_REQUIREMENTS = {
    MIN_PLAYERS: 16,
    MAX_PLAYERS: 22,
    MAX_FOREIGN_PLAYERS: 5,
    MIN_PLAYER_AGE: 16,
    MIN_STADIUM_CAPACITY: 10000,
    REGISTRATION_FEE: 1000000000, // 1 tỷ đồng
  }

  // Calculate profile completion
  const profileCompletion = useMemo(() => {
    if (!team) return { complete: false, issues: [], percentage: 0 }

    const issues = []
    let completed = 0
    const total = 6 // Required fields

    // Check required fields
    if (team.name) completed++
    else issues.push('Tên CLB chưa điền')

    if (team.city) completed++
    else issues.push('Thành phố chưa điền')

    if (team.country === 'Việt Nam' || team.country === 'Vietnam') completed++
    else issues.push('CLB phải có trụ sở tại Việt Nam')

    if (team.stadium_name) completed++
    else issues.push('Tên sân nhà chưa điền')

    if (team.stadium_capacity && team.stadium_capacity >= BTC_REQUIREMENTS.MIN_STADIUM_CAPACITY) {
      completed++
    } else if (!team.stadium_capacity) {
      issues.push('Sức chứa sân nhà chưa điền')
    } else {
      issues.push(`Sân nhà cần tối thiểu ${BTC_REQUIREMENTS.MIN_STADIUM_CAPACITY.toLocaleString()} chỗ`)
    }

    if (team.phone || team.email) completed++
    else issues.push('Thông tin liên hệ (SĐT/Email) chưa điền')

    return {
      complete: issues.length === 0,
      issues,
      percentage: Math.round((completed / total) * 100)
    }
  }, [team])

  // Calculate players completion
  const playersCompletion = useMemo(() => {
    const issues = []
    const totalPlayers = players.length
    // Use player_type field (from season_player_registrations) instead of nationality
    // player_type: 'foreign' = ngoại binh, 'domestic' = nội binh
    const foreignPlayers = players.filter(p => {
      // Check player_type first (from registration data)
      if (p.player_type) {
        return p.player_type === 'foreign';
      }
      // Fallback to nationality check if player_type not available
      return p.nationality !== 'Việt Nam' && p.nationality !== 'Vietnam';
    }).length

    // Check player count
    if (totalPlayers < BTC_REQUIREMENTS.MIN_PLAYERS) {
      issues.push(`Cần tối thiểu ${BTC_REQUIREMENTS.MIN_PLAYERS} cầu thủ (hiện có ${totalPlayers})`)
    }
    if (totalPlayers > BTC_REQUIREMENTS.MAX_PLAYERS) {
      issues.push(`Tối đa ${BTC_REQUIREMENTS.MAX_PLAYERS} cầu thủ (hiện có ${totalPlayers})`)
    }

    // Check foreign players
    if (foreignPlayers > BTC_REQUIREMENTS.MAX_FOREIGN_PLAYERS) {
      issues.push(`Tối đa ${BTC_REQUIREMENTS.MAX_FOREIGN_PLAYERS} cầu thủ ngoại (hiện có ${foreignPlayers})`)
    }

    // Check player ages
    const today = new Date()
    const underagePlayersCount = players.filter(p => {
      if (!p.birth_date && !p.dateOfBirth) return false
      const birthDate = new Date(p.birth_date || p.dateOfBirth)
      const age = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000))
      return age < BTC_REQUIREMENTS.MIN_PLAYER_AGE
    }).length

    if (underagePlayersCount > 0) {
      issues.push(`${underagePlayersCount} cầu thủ chưa đủ ${BTC_REQUIREMENTS.MIN_PLAYER_AGE} tuổi`)
    }

    const isValid = totalPlayers >= BTC_REQUIREMENTS.MIN_PLAYERS &&
      totalPlayers <= BTC_REQUIREMENTS.MAX_PLAYERS &&
      foreignPlayers <= BTC_REQUIREMENTS.MAX_FOREIGN_PLAYERS &&
      underagePlayersCount === 0

    return {
      complete: isValid,
      issues,
      total: totalPlayers,
      foreign: foreignPlayers,
      percentage: totalPlayers >= BTC_REQUIREMENTS.MIN_PLAYERS
        ? Math.min(100, Math.round((totalPlayers / BTC_REQUIREMENTS.MIN_PLAYERS) * 100))
        : Math.round((totalPlayers / BTC_REQUIREMENTS.MIN_PLAYERS) * 100)
    }
  }, [players])

  // Get participation status - dynamic based on actual completion
  const participationStatus = useMemo(() => {
    // Find active invitation for selected season - check both season_id and seasonId
    const activeInvitation = invitations.find(inv => {
      const invSeasonId = inv.season_id ?? inv.seasonId
      const matchesSeason = invSeasonId === selectedSeasonId || invSeasonId === String(selectedSeasonId)
      // New registration statuses: DRAFT_INVITE, INVITED, ACCEPTED, SUBMITTED, APPROVED, REJECTED, etc.
      const hasValidStatus = ['INVITED', 'ACCEPTED', 'SUBMITTED', 'REQUEST_CHANGE', 'APPROVED'].includes(inv.status)
      return matchesSeason && hasValidStatus
    })

    // Normalize statuses for comparison
    const regStatus = String(activeInvitation?.status || '').toUpperCase()
    const fee = String(feeStatus?.fee_status || 'unpaid').toLowerCase()

    // Step 1: No invitation yet
    if (!activeInvitation) {
      return {
        current: 'invitation',
        label: 'Chờ lời mời từ BTC',
        color: 'gray',
        stepIndex: 0
      }
    }

    // Step 2: Invitation pending
    if (regStatus === 'INVITED') {
      return {
        current: 'invitation',
        label: 'Chờ xác nhận tham gia',
        color: 'yellow',
        stepIndex: 0
      }
    }

    // Step 3-4-5: Accepted -> Profile -> Fee -> Review
    if (['ACCEPTED', 'SUBMITTED', 'APPROVED', 'REQUEST_CHANGE'].includes(regStatus)) {

      // If profile/players not complete
      if (regStatus === 'ACCEPTED') {
        if (!profileCompletion.complete) return { current: 'club_docs', label: 'Đang bổ sung hồ sơ CLB', color: 'blue', stepIndex: 2 }
        if (!playersCompletion.complete) return { current: 'player_list', label: 'Đang bổ sung danh sách cầu thủ', color: 'blue', stepIndex: 3 }
      }

      // Fee Logic: If unpaid/pending, stay at fee step unless we are already APPROVED?
      // Actually, if we are APPROVED and fee is paid, we are good.
      // If we are APPROVED but fee is pending/unpaid (rare case if Approve sets Paid), we stick to Fee step.
      if (fee === 'unpaid' || fee === 'pending') {
        return {
          current: 'fees',
          label: fee === 'pending' ? 'Chờ xác nhận lệ phí' : 'Vui lòng nộp lệ phí',
          color: 'orange',
          stepIndex: 4
        }
      }

      // If Fee is Paid (or Waived)

      // Check Registration Status
      if (regStatus === 'SUBMITTED' || regStatus === 'REQUEST_CHANGE') {
        if (regStatus === 'REQUEST_CHANGE') {
          return { current: 'club_docs', label: 'Yêu cầu bổ sung hồ sơ', color: 'orange', stepIndex: 2 }
        }
        return { current: 'btc_approval', label: 'BTC đang thẩm định hồ sơ', color: 'purple', stepIndex: 5 }
      }

      if (regStatus === 'APPROVED' && (fee === 'paid' || fee === 'waived')) {
        return { current: 'completed', label: 'Đã hoàn tất thủ tục', color: 'green', stepIndex: 6 }
      }
    }

    // Rejected
    if (activeInvitation.status === 'REJECTED' || activeInvitation.status === 'DECLINED') {
      return {
        current: 'rejected',
        label: 'Bị từ chối / Loại',
        color: 'red',
        stepIndex: -1
      }
    }

    return {
      current: 'invitation',
      label: 'Chờ lời mời',
      color: 'gray',
      stepIndex: 0
    }
  }, [invitations, selectedSeasonId, profileCompletion, playersCompletion, feeStatus])

  // Fee Submission Handler
  const handleFeeSubmit = async (e) => {
    e.preventDefault()
    if (!feeStatus?.registration_id) {
      toast.error("Không tìm thấy thông tin đăng ký (Registration ID missing)")
      return
    }

    const formData = new FormData(e.target)
    const data = {
      transaction_code: formData.get('transactionCode'),
      team_note: formData.get('note'),
      evidence_url: formData.get('evidenceUrl') || ''
    }

    try {
      await ApiService.post(`/participation-fees/${feeStatus.registration_id}/submit`, data)
      toast.success("Đã gửi xác nhận lệ phí thành công!")

      // Reload fee
      const response = await ApiService.get(`/participation-fees/my?seasonId=${selectedSeasonId}`)
      setFeeStatus(response || null)
    } catch (err) {
      console.error("Fee submit error", err)
      toast.error(err?.response?.data?.error || "Gửi thất bại")
    }
  }

  // Fetch initial data
  useEffect(() => {
    const loadData = async () => {
      if (!teamIds.length) {
        setLoading(false)
        return
      }

      try {
        // Load team details
        const teamData = await TeamsService.getTeamById(teamIds[0])
        setTeam(teamData)

        // Load seasons
        const seasonsData = await SeasonService.listSeasons()
        setSeasons(seasonsData || [])
        if (seasonsData && seasonsData.length > 0) {
          const sorted = [...seasonsData].sort((a, b) => b.id - a.id)
          setSelectedSeasonId(sorted[0].id)
        }
      } catch (err) {
        console.error('Failed to load team data', err)
        setError('Không thể tải dữ liệu đội bóng')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [teamIds])

  // Load invitations when season changes
  useEffect(() => {
    if (!selectedSeasonId || !teamIds.length) return

    // Load registration directly from new endpoint
    const loadRegistration = async () => {
      setInvitationsLoading(true)
      try {
        // Use new endpoint that gets TOP 1 registration
        const response = await ApiService.get(`/seasons/${selectedSeasonId}/registrations/my`)
        console.log('[Dashboard] Raw registration:', response)

        // FIX: Correctly parse payload { data: { ... } }
        const registration = response?.data?.data || response?.data || null

        if (registration) {
          // Normalize for compatibility
          const normalized = {
            ...registration,
            invitationId: registration.registration_id,
            invitation_id: registration.registration_id,
            status: String(registration.registration_status || registration.status || '').toUpperCase(),
            fee_status: String(registration.fee_status || registration.feeStatus || 'unpaid').toLowerCase(),
            team_id: registration.team_id || registration.teamId,
            season_id: registration.season_id || registration.seasonId,
          }
          console.log('[Dashboard] Normalized registration:', normalized)

          setInvitations([normalized]) // Put in array to keep current structure working
          setFeeStatus(normalized)
        } else {
          setInvitations([])
          setFeeStatus(null)
        }

      } catch (err) {
        console.error('Failed to load registration', err)
        // Only set empty if 404, otherwise might be error
        if (err?.response?.status === 404) {
          setInvitations([])
          setFeeStatus(null)
        }
      } finally {
        setInvitationsLoading(false)
      }
    }

    loadRegistration()
  }, [selectedSeasonId, teamIds])

  // Load players when season changes

  // Load players when season changes
  useEffect(() => {
    if (!selectedSeasonId || !teamIds.length) return

    const loadPlayers = async () => {
      setPlayersLoading(true)
      try {
        const playersData = await TeamsService.getMyTeamApprovedSeasonPlayers(selectedSeasonId, teamIds[0])
        setPlayers(playersData || [])
      } catch (err) {
        console.error('Failed to load players', err)
        setPlayers([])
      } finally {
        setPlayersLoading(false)
      }
    }

    loadPlayers()
  }, [selectedSeasonId, teamIds])

  // Load matches for lineup when tab is active
  useEffect(() => {
    if (activeTab === 'lineup' && selectedSeasonId && teamIds.length && dashboardMatches.length === 0) {
      const loadLineupMatches = async () => {
        setLoadingMatches(true)
        try {
          // Fetch matches where status allows lineup submission (typically SCHEDULED or PREPARING)
          const response = await ApiService.get(`/seasons/${selectedSeasonId}/matches/by-status?status=SCHEDULED`)
          const responsePrep = await ApiService.get(`/seasons/${selectedSeasonId}/matches/by-status?status=PREPARING`)

          let matches = []
          if (response?.data) matches = [...matches, ...response.data]
          if (responsePrep?.data) matches = [...matches, ...responsePrep.data]

          // Filter valid matches for THIS team
          const myMatches = matches.filter(m =>
            m.home_team_id === Number(teamIds[0]) || m.away_team_id === Number(teamIds[0])
          )

          setDashboardMatches(myMatches)
          if (myMatches.length > 0) {
            setSelectedLineupMatchId(myMatches[0].match_id)
          }
        } catch (err) {
          console.error("Failed to load matches for lineup", err)
        } finally {
          setLoadingMatches(false)
        }
      }
      loadLineupMatches()
    }
  }, [activeTab, selectedSeasonId, teamIds, dashboardMatches.length])

  // Loading state for invitation response
  const [respondingToInvitation, setRespondingToInvitation] = useState(null)

  // Handle invitation response
  const handleInvitationResponse = async (registrationId, accept) => {
    // Prevent double clicks
    if (respondingToInvitation === registrationId) return

    setRespondingToInvitation(registrationId)
    try {
      let response
      if (accept) {
        response = await ApiService.post(`/registrations/${registrationId}/accept`)
        toast.success(response?.message || 'Đã chấp nhận lời mời! 🎉')
      } else {
        response = await ApiService.post(`/registrations/${registrationId}/decline`)
        toast.success(response?.message || 'Đã từ chối lời mời')
      }

      // Reload registrations
      const regResponse = await ApiService.get(`/teams/${teamIds[0]}/registrations`)
      const allRegistrations = regResponse?.data || []
      const myRegistrations = allRegistrations.filter(reg => {
        const regSeasonId = reg.season_id ?? reg.seasonId
        return regSeasonId === selectedSeasonId
      })

      const mappedInvitations = myRegistrations.map(reg => ({
        ...reg,
        invitation_id: reg.registration_id,
        status: reg.registration_status,
        team_id: reg.team_id,
        teamId: reg.team_id,
        season_id: reg.season_id,
        seasonId: reg.season_id
      }))

      setInvitations(mappedInvitations)
    } catch (err) {
      console.error('Invitation response error:', err)
      const errorMsg = err?.response?.data?.error || err?.message || 'Không thể cập nhật lời mời'
      toast.error(errorMsg)

      // Reload anyway to get fresh data
      try {
        const regResponse = await ApiService.get(`/teams/${teamIds[0]}/registrations`)
        const allRegistrations = regResponse?.data || []
        const myRegistrations = allRegistrations.filter(reg => {
          const regSeasonId = reg.season_id ?? reg.seasonId
          return regSeasonId === selectedSeasonId
        })
        const mappedInvitations = myRegistrations.map(reg => ({
          ...reg,
          invitation_id: reg.registration_id,
          status: reg.registration_status,
          team_id: reg.team_id,
          teamId: reg.team_id,
          season_id: reg.season_id,
          seasonId: reg.season_id
        }))
        setInvitations(mappedInvitations)
      } catch (e) {
        // Ignore reload error
      }
    } finally {
      setRespondingToInvitation(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    )
  }

  if (!teamIds.length) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-amber-900">
        <h2 className="text-lg font-semibold mb-2">Bạn chưa được gán đội bóng</h2>
        <p className="text-sm">
          Tài khoản này chưa được gán vào đội bóng nào. Vui lòng liên hệ quản trị viên giải đấu.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
            {team?.logo || team?.crest ? (
              <img src={team.logo || team.crest} alt={team.name} className="w-12 h-12 object-contain" />
            ) : (
              <Shield size={32} className="text-gray-400" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{team?.name || 'Đội của tôi'}</h1>
            <p className="text-gray-500">{team?.city}, {team?.country}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={selectedSeasonId || ''}
            onChange={(e) => setSelectedSeasonId(e.target.value ? parseInt(e.target.value) : null)}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Chọn mùa giải</option>
            {seasons.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Participation Status Stepper */}
      {selectedSeasonId && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Tiến độ tham gia mùa giải</h3>
          <div className="flex items-center justify-between overflow-x-auto pb-2">
            {PARTICIPATION_STEPS.map((step, index) => {
              const StepIcon = step.icon
              const stepIndex = participationStatus.stepIndex || 0
              const isCompleted = index < stepIndex
              const isActive = index === stepIndex
              const isRejected = participationStatus.current === 'rejected'

              // Determine step status based on actual data
              let stepStatus = 'pending'
              if (isCompleted) stepStatus = 'completed'
              else if (isActive) stepStatus = 'active'
              else if (isRejected) stepStatus = 'rejected'

              return (
                <React.Fragment key={step.key}>
                  <div className="flex flex-col items-center min-w-[80px]">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${stepStatus === 'completed' ? 'bg-green-500 border-green-500 text-white' :
                      stepStatus === 'active' ? 'bg-blue-100 border-blue-500 text-blue-600' :
                        stepStatus === 'rejected' ? 'bg-red-100 border-red-500 text-red-600' :
                          'bg-gray-100 border-gray-300 text-gray-400'
                      }`}>
                      {stepStatus === 'completed' ? <CheckCircle2 size={20} /> :
                        stepStatus === 'rejected' ? <XCircle size={20} /> :
                          <StepIcon size={20} />}
                    </div>
                    <span className={`text-xs mt-2 text-center ${stepStatus === 'active' ? 'font-semibold text-gray-900' :
                      stepStatus === 'completed' ? 'text-green-600' :
                        'text-gray-500'
                      }`}>
                      {step.label}
                    </span>
                  </div>
                  {index < PARTICIPATION_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              )
            })}
          </div>

          {/* Status message */}
          <div className={`mt-4 p-3 rounded-lg ${participationStatus.color === 'green' ? 'bg-green-50 border border-green-200' :
            participationStatus.color === 'red' ? 'bg-red-50 border border-red-200' :
              participationStatus.color === 'yellow' ? 'bg-yellow-50 border border-yellow-200' :
                participationStatus.color === 'orange' ? 'bg-orange-50 border border-orange-200' :
                  participationStatus.color === 'purple' ? 'bg-purple-50 border border-purple-200' :
                    'bg-blue-50 border border-blue-200'
            }`}>
            <span className={`text-sm font-medium ${participationStatus.color === 'green' ? 'text-green-700' :
              participationStatus.color === 'red' ? 'text-red-700' :
                participationStatus.color === 'yellow' ? 'text-yellow-700' :
                  participationStatus.color === 'orange' ? 'text-orange-700' :
                    participationStatus.color === 'purple' ? 'text-purple-700' :
                      'text-blue-700'
              }`}>
              Trạng thái: {participationStatus.label}
            </span>
          </div>

          {/* Progress Details */}
          {participationStatus.current === 'club_docs' && profileCompletion.issues.length > 0 && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={16} className="text-amber-600" />
                <span className="font-medium text-amber-800">Hồ sơ CLB cần bổ sung ({profileCompletion.percentage}% hoàn thành)</span>
              </div>
              <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
                {profileCompletion.issues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
              <Link
                to="/admin/club-profile"
                className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm"
              >
                Bổ sung hồ sơ CLB
                <ArrowRight size={16} />
              </Link>
            </div>
          )}

          {participationStatus.current === 'player_list' && playersCompletion.issues.length > 0 && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={16} className="text-amber-600" />
                <span className="font-medium text-amber-800">
                  Danh sách cầu thủ: {playersCompletion.total}/{BTC_REQUIREMENTS.MIN_PLAYERS} (tối thiểu)
                </span>
              </div>
              <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
                {playersCompletion.issues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
              <Link
                to="/admin/player-registrations"
                className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm"
              >
                Đăng ký cầu thủ
                <ArrowRight size={16} />
              </Link>
            </div>
          )}

          {participationStatus.current === 'fees' && (
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <Target size={20} className="text-blue-600" />
                <span className="font-semibold text-gray-800">Thông tin nộp lệ phí</span>
              </div>

              <div className="mb-4 text-sm text-gray-600">
                <p>Số tiền: <strong className="text-gray-900">{BTC_REQUIREMENTS.REGISTRATION_FEE.toLocaleString('vi-VN')} VND</strong></p>
                <p className="mt-1 italic text-xs">Vui lòng chuyển khoản và nhập mã giao dịch bên dưới.</p>
              </div>

              {!feeStatus ? (
                <div className="p-3 bg-red-50 text-red-600 rounded text-sm">
                  <p className="font-semibold">Chưa có thông tin đăng ký (Registration not found).</p>
                  <p className="text-xs mt-1 text-red-500 font-mono">
                    Debug info: Season ID: {selectedSeasonId}, Team ID: {teamIds[0]}
                  </p>
                  <p className="text-xs mt-1">Vui lòng liên hệ BTC để kiểm tra.</p>
                </div>
              ) : (
                <>
                  {/* ALERTS based on Status */}
                  {feeStatus.fee_status === 'pending' && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded flex items-center gap-2">
                      <Clock size={16} />
                      <span>Đã nộp hồ sơ thanh toán. Vui lòng chờ BTC xác nhận.</span>
                    </div>
                  )}
                  {(feeStatus.fee_status === 'paid' || feeStatus.fee_status === 'waived') && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded flex items-center gap-2">
                      <CheckCircle2 size={16} />
                      <span>{feeStatus.fee_status === 'waived' ? 'Được miễn lệ phí!' : 'Đã hoàn thành nghĩa vụ lệ phí!'}</span>
                    </div>
                  )}
                  {/* REJECTION ALERT (Show if UNPAID and has notes) */}
                  {feeStatus.fee_status === 'unpaid' && feeStatus.review_notes && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded">
                      <div className="flex items-center gap-2 font-semibold">
                        <XCircle size={16} />
                        <span>Yêu cầu nộp lại (Bị từ chối)</span>
                      </div>
                      <p className="text-sm mt-1">Lý do: {feeStatus.review_notes}</p>
                    </div>
                  )}

                  {/* FORM - Only Show if UNPAID */}
                  {feeStatus.fee_status === 'unpaid' && (
                    <form onSubmit={handleFeeSubmit} className="space-y-3 max-w-md">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mã giao dịch / Reference Code <span className="text-red-500">*</span></label>
                        <input
                          name="transactionCode"
                          required
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="VD: FT12345678"
                          defaultValue={feeStatus.submission_data?.payment?.transaction_code || ''}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                        <textarea
                          name="note"
                          rows="2"
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="Ngân hàng chuyển, người chuyển..."
                          defaultValue={feeStatus.submission_data?.payment?.team_note || ''}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Link ảnh/Minh chứng (tùy chọn)</label>
                        <input
                          name="evidenceUrl"
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="https://..."
                          defaultValue={feeStatus.submission_data?.payment?.evidence_url || ''}
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
                      >
                        Gửi xác nhận
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>
          )}

          {participationStatus.current === 'completed' && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={20} className="text-green-600" />
                <span className="font-medium text-green-800">
                  🎉 CLB đã đủ điều kiện tham gia mùa giải!
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        {[
          { key: 'overview', label: 'Tổng quan', icon: Home },
          { key: 'invitations', label: 'Lời mời', icon: Mail },
          { key: 'club', label: 'Hồ sơ CLB', icon: FileText },
          { key: 'players', label: 'Cầu thủ', icon: Users },
          { key: 'schedule', label: 'Lịch đấu', icon: Calendar },
          { key: 'lineup', label: 'Đội hình', icon: Shirt }
        ].map(tab => {
          const isLineup = tab.key === 'lineup'; // Using 'lineup' (singular) as per key
          const isFeeApproved = feeStatus && (feeStatus.fee_status === 'paid' || feeStatus.fee_status === 'waived');
          const isDisabled = isLineup && !isFeeApproved;

          return (
            <button
              key={tab.key}
              disabled={isDisabled}
              title={isDisabled ? "Vui lòng hoàn thành nộp lệ phí để mở khóa" : ""}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === tab.key
                ? 'bg-white text-blue-600 shadow-sm'
                : isDisabled
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
              {isDisabled && <AlertCircle size={14} className="text-amber-500" />}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* BTC Requirements Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield size={20} className="text-blue-600" />
              Yêu cầu đăng ký (Quy định BTC)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Profile Requirements */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700 text-sm">Hồ sơ CLB</h4>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    {team?.country === 'Việt Nam' || team?.country === 'Vietnam' ?
                      <CheckCircle2 size={14} className="text-green-500" /> :
                      <XCircle size={14} className="text-red-400" />}
                    <span className="text-gray-600">Trụ sở tại Việt Nam</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {team?.stadium_name ?
                      <CheckCircle2 size={14} className="text-green-500" /> :
                      <XCircle size={14} className="text-red-400" />}
                    <span className="text-gray-600">Có sân nhà</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {team?.stadium_capacity >= BTC_REQUIREMENTS.MIN_STADIUM_CAPACITY ?
                      <CheckCircle2 size={14} className="text-green-500" /> :
                      <XCircle size={14} className="text-red-400" />}
                    <span className="text-gray-600">
                      Sức chứa ≥ {BTC_REQUIREMENTS.MIN_STADIUM_CAPACITY.toLocaleString()} chỗ
                      {team?.stadium_capacity ? ` (${team.stadium_capacity.toLocaleString()})` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Player Requirements */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700 text-sm">Danh sách cầu thủ</h4>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    {playersCompletion.total >= BTC_REQUIREMENTS.MIN_PLAYERS ?
                      <CheckCircle2 size={14} className="text-green-500" /> :
                      <XCircle size={14} className="text-red-400" />}
                    <span className="text-gray-600">
                      {BTC_REQUIREMENTS.MIN_PLAYERS}-{BTC_REQUIREMENTS.MAX_PLAYERS} cầu thủ
                      ({playersCompletion.total} hiện tại)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {playersCompletion.foreign <= BTC_REQUIREMENTS.MAX_FOREIGN_PLAYERS ?
                      <CheckCircle2 size={14} className="text-green-500" /> :
                      <XCircle size={14} className="text-red-400" />}
                    <span className="text-gray-600">
                      Tối đa {BTC_REQUIREMENTS.MAX_FOREIGN_PLAYERS} ngoại binh
                      ({playersCompletion.foreign} hiện tại)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-green-500" />
                    <span className="text-gray-600">Độ tuổi tối thiểu {BTC_REQUIREMENTS.MIN_PLAYER_AGE}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fee info */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm">
                <Target size={14} className="text-amber-500" />
                <span className="text-gray-600">
                  Lệ phí tham gia: <strong className="text-gray-900">{BTC_REQUIREMENTS.REGISTRATION_FEE.toLocaleString('vi-VN')} VND</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Thống kê mùa giải</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Số trận đã đá</span>
                <span className="font-bold">{teamStats.matchesPlayed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Thắng - Hòa - Thua</span>
                <span className="font-bold">{teamStats.wins}-{teamStats.draws}-{teamStats.losses}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Bàn thắng / thua</span>
                <span className="font-bold">{teamStats.goalsFor} / {teamStats.goalsAgainst}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Thao tác nhanh</h3>
            <div className="space-y-2">
              <button
                onClick={() => setActiveTab('invitations')}
                className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2 text-blue-700">
                  <Mail size={18} />
                  Xem lời mời
                </span>
                <ChevronRight size={18} className="text-blue-500" />
              </button>
              <button
                onClick={() => setActiveTab('players')}
                className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2 text-green-700">
                  <Users size={18} />
                  Quản lý cầu thủ
                </span>
                <ChevronRight size={18} className="text-green-500" />
              </button>
              <button
                onClick={() => setActiveTab('lineup')}
                className="w-full flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2 text-purple-700">
                  <Shirt size={18} />
                  Xếp đội hình
                </span>
                <ChevronRight size={18} className="text-purple-500" />
              </button>
            </div>
          </div>

          {/* Players Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Đội hình ({players.length} cầu thủ)</h3>
            {playersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-gray-400" size={24} />
              </div>
            ) : players.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Chưa có cầu thủ đăng ký</p>
            ) : (
              <div className="space-y-2">
                {players.slice(0, 5).map(player => (
                  <div key={player.player_id || player.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <User size={16} className="text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{player.player_name || player.name}</p>
                      <p className="text-xs text-gray-500">{player.position_code || player.position}</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-600">#{player.shirt_number || '—'}</span>
                  </div>
                ))}
                {players.length > 5 && (
                  <button
                    onClick={() => setActiveTab('players')}
                    className="w-full text-center text-sm text-blue-600 hover:text-blue-700 py-2"
                  >
                    Xem tất cả ({players.length})
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'invitations' && (
        <div className="rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-500">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Mail size={24} className="text-blue-400" />
              Lời mời tham dự giải đấu
            </h3>
            <p className="text-slate-400 mt-1">Xem và phản hồi các lời mời từ Ban tổ chức</p>
          </div>
          {invitationsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-blue-400" size={32} />
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-12">
              <Mail size={64} className="mx-auto mb-4 text-slate-500" />
              <p className="text-slate-300 text-lg">Chưa có lời mời nào cho mùa giải này</p>
              <p className="text-slate-400 text-sm mt-2">Vui lòng chờ BTC gửi lời mời tham gia</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-500 space-y-4 p-4">
              {invitations.map(inv => {
                // Map backend status to display values
                const statusConfig = {
                  'INVITED': { label: '📩 Chờ xác nhận tham gia', color: 'bg-amber-400 text-black', canRespond: true },
                  'ACCEPTED': { label: '✅ Đã chấp nhận', color: 'bg-green-500 text-white', canRespond: false },
                  'DECLINED': { label: '❌ Đã từ chối', color: 'bg-red-500 text-white', canRespond: false },
                  'SUBMITTED': { label: '📋 Đã nộp hồ sơ', color: 'bg-blue-500 text-white', canRespond: false },
                  'REQUEST_CHANGE': { label: '⚠️ Cần chỉnh sửa', color: 'bg-orange-400 text-black', canRespond: false },
                  'APPROVED': { label: '🎉 Đã được duyệt', color: 'bg-emerald-500 text-white', canRespond: false },
                  'REJECTED': { label: '🚫 Không đạt', color: 'bg-rose-500 text-white', canRespond: false },
                }
                const config = statusConfig[inv.status] || { label: inv.status, color: 'bg-slate-400 text-black', canRespond: false }

                return (
                  <div
                    key={inv.invitation_id || inv.registration_id}
                    className="p-6 border-2 border-slate-500 rounded-xl hover:border-blue-400 hover:bg-slate-800/50 transition-all cursor-pointer"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-bold text-2xl text-white mb-2">
                          🏆 {seasons.find(s => s.id === inv.seasonId || s.id === inv.season_id)?.name || `Mùa giải ${inv.seasonId || inv.season_id}`}
                        </h4>
                        <p className="text-slate-300">
                          📅 Ngày nhận lời mời: <span className="text-white font-medium">{inv.created_at ? new Date(inv.created_at).toLocaleDateString('vi-VN') : '—'}</span>
                        </p>
                      </div>
                      <div className="flex flex-col items-start md:items-end gap-4">
                        <span className={`px-5 py-2.5 rounded-lg text-base font-bold shadow-md ${config.color}`}>
                          {config.label}
                        </span>
                        {config.canRespond && (
                          <div className="flex gap-4">
                            <button
                              onClick={() => handleInvitationResponse(inv.registration_id, true)}
                              disabled={respondingToInvitation === inv.registration_id}
                              className="px-8 py-4 bg-green-500 text-white rounded-xl hover:bg-green-400 transition-all font-bold text-lg shadow-xl hover:shadow-green-500/30 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
                            >
                              {respondingToInvitation === inv.registration_id ? (
                                <Loader2 size={20} className="animate-spin" />
                              ) : '✓'} CHẤP NHẬN
                            </button>
                            <button
                              onClick={() => handleInvitationResponse(inv.registration_id, false)}
                              disabled={respondingToInvitation === inv.registration_id}
                              className="px-8 py-4 bg-red-500 text-white rounded-xl hover:bg-red-400 transition-all font-bold text-lg shadow-xl hover:shadow-red-500/30 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
                            >
                              {respondingToInvitation === inv.registration_id ? (
                                <Loader2 size={20} className="animate-spin" />
                              ) : '✕'} TỪ CHỐI
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'club' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Hồ sơ câu lạc bộ</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-4">Thông tin CLB</h4>
              <dl className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Tên đội</dt>
                  <dd className="font-medium text-gray-900">{team?.name || '—'}</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Tên viết tắt</dt>
                  <dd className="font-medium text-gray-900">{team?.short_name || team?.code || '—'}</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Thành phố</dt>
                  <dd className="font-medium text-gray-900">{team?.city || '—'}</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Quốc gia</dt>
                  <dd className="font-medium text-gray-900">{team?.country || '—'}</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Năm thành lập</dt>
                  <dd className="font-medium text-gray-900">{team?.founded_year || '—'}</dd>
                </div>
              </dl>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-4">Sân nhà</h4>
              <dl className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Tên sân</dt>
                  <dd className="font-medium text-gray-900">{team?.stadium_name || '—'}</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Sức chứa</dt>
                  <dd className="font-medium text-gray-900">{team?.stadium_capacity ? team.stadium_capacity.toLocaleString() : '—'}</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Điện thoại</dt>
                  <dd className="font-medium text-gray-900">{team?.phone || '—'}</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Email</dt>
                  <dd className="font-medium text-gray-900">{team?.email || '—'}</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Website</dt>
                  <dd className="font-medium text-gray-900">
                    {team?.website ? (
                      <a href={team.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {team.website}
                      </a>
                    ) : '—'}
                  </dd>
                </div>
              </dl>
              {(!team?.stadium_name || !team?.phone) && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                  <AlertCircle size={16} className="inline mr-2" />
                  Vui lòng bổ sung thông tin sân nhà để hoàn thiện hồ sơ
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'players' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Danh sách cầu thủ</h3>
              <p className="text-sm text-gray-500 mt-1">Tối thiểu 16 - tối đa 22 cầu thủ, tối đa 5 ngoại binh</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${players.length >= 16 && players.length <= 22 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                {players.length} / 22 cầu thủ
              </span>
            </div>
          </div>
          {playersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-gray-400" size={32} />
            </div>
          ) : players.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users size={48} className="mx-auto mb-4 opacity-50" />
              <p>Chưa có cầu thủ đăng ký cho mùa giải này</p>
              <Link
                to="/admin/player-registrations"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Đăng ký cầu thủ
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số áo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cầu thủ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vị trí</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quốc tịch</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {players.map(player => (
                    <tr key={player.player_id || player.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                          {player.shirt_number || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{player.player_name || player.name}</div>
                        <div className="text-sm text-gray-500">{player.date_of_birth || '—'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                        {player.position_code || player.position || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                        {player.nationality || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Sẵn sàng
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Lịch thi đấu của đội</h3>
          <div className="text-center py-12 text-gray-500">
            <Calendar size={48} className="mx-auto mb-4 opacity-50" />
            <p>Lịch thi đấu sẽ được hiển thị sau khi giải đấu bắt đầu</p>
          </div>
        </div>
      )}

      {activeTab === 'lineup' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Xếp đội hình trận đấu</h3>

          {loadingMatches ? (
            <div className="text-center py-8"><Loader2 className="animate-spin inline mr-2" /> Đang tải danh sách trận đấu...</div>
          ) : dashboardMatches.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Shirt size={48} className="mx-auto mb-4 opacity-50" />
              <p>Chưa có trận đấu nào ở trạng thái có thể nộp đội hình.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chọn trận đấu:</label>
                <select
                  value={selectedLineupMatchId || ''}
                  onChange={(e) => setSelectedLineupMatchId(Number(e.target.value))}
                  className="block w-full max-w-md border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  {dashboardMatches.map(m => (
                    <option key={m.match_id} value={m.match_id}>
                      {new Date(m.scheduled_kickoff).toLocaleDateString('vi-VN')} - {m.home_team_name} vs {m.away_team_name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedLineupMatchId && (
                <TeamMatchLineup
                  seasonId={selectedSeasonId}
                  matchId={selectedLineupMatchId}
                  teamId={teamIds[0]}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TeamAdminDashboard





