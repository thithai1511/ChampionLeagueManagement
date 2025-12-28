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

  // Get participation status
  const participationStatus = useMemo(() => {
    // Default status
    let status = {
      current: 'invitation',
      label: 'Chờ lời mời',
      color: 'gray'
    }
    
    const activeInvitation = invitations.find(inv => 
      inv.status === 'accepted' || inv.status === 'qualified' || inv.status === 'pending'
    )
    
    if (!activeInvitation) {
      return status
    }

    switch (activeInvitation.status) {
      case 'pending':
      case 'sent':
        status = { current: 'invitation', label: 'Chờ xác nhận', color: 'yellow' }
        break
      case 'accepted':
        status = { current: 'club_docs', label: 'Đang bổ sung hồ sơ', color: 'blue' }
        break
      case 'submitted':
        status = { current: 'btc_approval', label: 'BTC đang thẩm định', color: 'purple' }
        break
      case 'qualified':
        status = { current: 'complete', label: 'Đã đủ điều kiện', color: 'green' }
        break
      case 'disqualified':
        status = { current: 'rejected', label: 'Bị loại', color: 'red' }
        break
      default:
        break
    }
    
    return status
  }, [invitations])

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

    const loadInvitations = async () => {
      setInvitationsLoading(true)
      try {
        // Get invitations for this team
        const response = await ApiService.get(`/seasons/${selectedSeasonId}/invitations`)
        const allInvitations = response?.data || []
        // Filter for this team
        const myInvitations = allInvitations.filter(inv => teamIds.includes(inv.teamId))
        setInvitations(myInvitations)
      } catch (err) {
        console.error('Failed to load invitations', err)
        setInvitations([])
      } finally {
        setInvitationsLoading(false)
      }
    }

    loadInvitations()
  }, [selectedSeasonId, teamIds])

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

  // Handle invitation response
  const handleInvitationResponse = async (invitationId, accept) => {
    try {
      await ApiService.patch(`/seasons/${selectedSeasonId}/invitations/${invitationId}/status`, {
        status: accept ? 'accepted' : 'declined',
        responseNotes: accept ? 'Đội bóng chấp nhận lời mời' : 'Đội bóng từ chối lời mời'
      })
      toast.success(accept ? 'Đã chấp nhận lời mời' : 'Đã từ chối lời mời')
      // Reload invitations
      const response = await ApiService.get(`/seasons/${selectedSeasonId}/invitations`)
      const allInvitations = response?.data || []
      setInvitations(allInvitations.filter(inv => teamIds.includes(inv.teamId)))
    } catch (err) {
      toast.error(err?.message || 'Không thể cập nhật lời mời')
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
              const isActive = participationStatus.current === step.key
              const isCompleted = PARTICIPATION_STEPS.findIndex(s => s.key === participationStatus.current) > index
              const isRejected = participationStatus.current === 'rejected'
              
              return (
                <React.Fragment key={step.key}>
                  <div className="flex flex-col items-center min-w-[80px]">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                      isCompleted ? 'bg-green-500 border-green-500 text-white' :
                      isActive ? `bg-${participationStatus.color}-100 border-${participationStatus.color}-500 text-${participationStatus.color}-600` :
                      'bg-gray-100 border-gray-300 text-gray-400'
                    }`}>
                      {isCompleted ? <CheckCircle2 size={20} /> : <StepIcon size={20} />}
                    </div>
                    <span className={`text-xs mt-2 text-center ${isActive ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
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
          <div className={`mt-4 p-3 rounded-lg bg-${participationStatus.color}-50 border border-${participationStatus.color}-200`}>
            <span className={`text-sm font-medium text-${participationStatus.color}-700`}>
              Trạng thái: {participationStatus.label}
            </span>
          </div>
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
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon size={16} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Lời mời tham dự giải</h3>
          </div>
          {invitationsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-gray-400" size={32} />
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Mail size={48} className="mx-auto mb-4 opacity-50" />
              <p>Chưa có lời mời nào cho mùa giải này</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {invitations.map(inv => (
                <div key={inv.invitationId} className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {seasons.find(s => s.id === inv.seasonId)?.name || `Mùa giải ${inv.seasonId}`}
                      </h4>
                      <p className="text-sm text-gray-500 mt-1">
                        Gửi lúc: {inv.invitedAt ? new Date(inv.invitedAt).toLocaleDateString('vi-VN') : '—'}
                      </p>
                      {inv.responseDeadline && (
                        <p className="text-sm text-gray-500">
                          Hạn phản hồi: {new Date(inv.responseDeadline).toLocaleDateString('vi-VN')}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        inv.status === 'accepted' || inv.status === 'qualified' ? 'bg-green-100 text-green-700' :
                        inv.status === 'pending' || inv.status === 'sent' ? 'bg-yellow-100 text-yellow-700' :
                        inv.status === 'declined' || inv.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {inv.statusLabel || inv.status}
                      </span>
                      {(inv.status === 'pending' || inv.status === 'sent') && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleInvitationResponse(inv.invitationId, true)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                          >
                            Chấp nhận
                          </button>
                          <button
                            onClick={() => handleInvitationResponse(inv.invitationId, false)}
                            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                          >
                            Từ chối
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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
                  <dd className="font-medium text-gray-900">{team?.venue || '—'}</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Sức chứa</dt>
                  <dd className="font-medium text-gray-900">—</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Địa chỉ</dt>
                  <dd className="font-medium text-gray-900">—</dd>
                </div>
              </dl>
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                <AlertCircle size={16} className="inline mr-2" />
                Vui lòng bổ sung thông tin sân nhà để hoàn thiện hồ sơ
              </div>
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
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                players.length >= 16 && players.length <= 22 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
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
          <div className="text-center py-12 text-gray-500">
            <Shirt size={48} className="mx-auto mb-4 opacity-50" />
            <p>Chức năng xếp đội hình sẽ được kích hoạt khi có trận đấu sắp diễn ra</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeamAdminDashboard


