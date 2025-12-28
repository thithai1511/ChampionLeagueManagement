import React, { useEffect, useState } from 'react'
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Users,
  Save,
  Loader2,
  X,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Calendar,
  User,
  FileText,
  RotateCcw,
  Check
} from 'lucide-react'
import PlayersService from '../../../layers/application/services/PlayersService'
import TeamsService from '../../../layers/application/services/TeamsService'
import SeasonService from '../../../layers/application/services/SeasonService'
import ApiService from '../../../layers/application/services/ApiService'
import { DB_POSITIONS, POSITION_GROUPS_LIST } from '../../../shared/constants/footballPositions'
import { hasPermission } from '../utils/accessControl'
import toast, { Toaster } from 'react-hot-toast'
import APP_CONFIG from '../../../config/app.config'

const PLAYER_TYPE_MAP = {
  domestic: 'Trong nước',
  foreign: 'Nước ngoài',
  u21: 'U21',
  u23: 'U23'
}

const PlayersManagement = ({ currentUser }) => {
  // Tab state
  const [activeTab, setActiveTab] = useState('pool') // 'pool' | 'lookup' | 'approval'
  
  // ========== POOL TAB STATE ==========
  const [searchTerm, setSearchTerm] = useState('')
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createMessage, setCreateMessage] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    date_of_birth: '',
    nationality: '',
    position: '',
    internal_team_id: ''
  })
  const [userTeams, setUserTeams] = useState([])
  // Registration state for pool tab
  const [selectedPlayersForRegistration, setSelectedPlayersForRegistration] = useState(new Set())
  const [playerRegistrationStatus, setPlayerRegistrationStatus] = useState({}) // playerId -> { status, season_id, etc }
  const [seasonsForRegistration, setSeasonsForRegistration] = useState([])
  const [selectedSeasonForRegistration, setSelectedSeasonForRegistration] = useState('')

  // ========== LOOKUP TAB STATE ==========
  const [lookupFilters, setLookupFilters] = useState({
    season_id: '',
    team_id: '',
    position_code: '',
    player_type: ''
  })
  const [lookupSeasons, setLookupSeasons] = useState([])
  const [seasonTeams, setSeasonTeams] = useState([])
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [lookupResult, setLookupResult] = useState(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)

  // ========== APPROVAL TAB STATE ==========
  const [approvalList, setApprovalList] = useState([])
  const [approvalLoading, setApprovalLoading] = useState(false)
  const [approvalError, setApprovalError] = useState(false)
  const [seasons, setSeasons] = useState([])
  const [allTeams, setAllTeams] = useState([])
  const [filterSeason, setFilterSeason] = useState('')
  const [filterTeam, setFilterTeam] = useState('')
  const [rejectId, setRejectId] = useState(null)
  const [approveId, setApproveId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canApprove = hasPermission(currentUser, 'approve_player_registrations')
  const isSuperAdmin = currentUser?.roles?.includes('super_admin')

  // Redirect if team_admin tries to access approval tab
  useEffect(() => {
    if (activeTab === 'approval' && !canApprove) {
      setActiveTab('pool')
    }
  }, [activeTab, canApprove])

  // ========== POOL TAB FUNCTIONS ==========
  const fetchPlayers = async () => {
    setLoading(true)
    try {
      const response = await PlayersService.listPlayers({
        search: searchTerm,
        limit: 100
      })
      setPlayers(response.players || [])
    } catch (err) {
      console.error('Failed to load players', err)
      setError('Không thể tải danh sách cầu thủ.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'pool') {
      fetchPlayers()
      loadPlayerRegistrationStatuses()
      loadSeasonsForRegistration()
    }
  }, [searchTerm, activeTab])

  const loadSeasonsForRegistration = async () => {
    try {
      const response = await ApiService.get('/seasons')
      const seasonsData = Array.isArray(response) ? response : (response?.data || [])
      setSeasonsForRegistration(seasonsData)
    } catch (err) {
      console.error('Failed to load seasons', err)
    }
  }

  const loadPlayerRegistrationStatuses = async () => {
    if (!currentUser?.teamIds?.length) return
    
    try {
      const response = await ApiService.get(APP_CONFIG.API.ENDPOINTS.PLAYER_REGISTRATIONS.LIST)
      const registrations = Array.isArray(response) ? response : (response?.data || [])
      
      const statusMap = {}
      registrations.forEach(reg => {
        if (reg.player_id) {
          statusMap[reg.player_id] = {
            status: reg.registration_status,
            season_id: reg.season_id,
            season_name: reg.season_name,
            registered_at: reg.registered_at
          }
        }
      })
      setPlayerRegistrationStatus(statusMap)
    } catch (err) {
      console.error('Failed to load registration statuses', err)
    }
  }

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const response = await TeamsService.getAllTeams({ limit: 100 })
        setUserTeams(response.teams || [])
        if (response.teams?.length === 1) {
          setFormData(prev => ({ ...prev, internal_team_id: response.teams[0].id }))
        }
      } catch (e) { console.error(e) }
    }
    loadTeams()
  }, [])

  const handleCreateChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setCreating(true)
    setCreateMessage(null)

    try {
      if (!formData.internal_team_id && userTeams.length > 0) {
        if (userTeams.length === 1) {
          formData.internal_team_id = userTeams[0].id
        } else {
          setCreateMessage({ type: 'error', text: 'Vui lòng chọn đội bóng.' })
          setCreating(false)
          return
        }
      }

      await PlayersService.createPlayer({
        name: formData.name,
        date_of_birth: formData.date_of_birth,
        nationality: formData.nationality,
        position: formData.position,
        internal_team_id: formData.internal_team_id
      })

      setCreateMessage({ type: 'success', text: 'Tạo cầu thủ thành công!' })
      setFormData(prev => ({
        ...prev,
        name: '',
        date_of_birth: '',
        nationality: '',
        position: ''
      }))
      fetchPlayers()
    } catch (err) {
      console.error(err)
      setCreateMessage({ type: 'error', text: err.message || 'Lỗi khi tạo cầu thủ.' })
    } finally {
      setCreating(false)
    }
  }

  // ========== LOOKUP TAB FUNCTIONS ==========
  // Fetch seasons on mount
  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const response = await ApiService.get('/seasons')
        const seasonsData = Array.isArray(response) ? response : (response?.data || [])
        setLookupSeasons(seasonsData)
      } catch (err) {
        console.error('Failed to fetch seasons', err)
        setLookupSeasons([])
      }
    }
    fetchSeasons()
  }, [])

  useEffect(() => {
    const fetchTeams = async () => {
      if (!lookupFilters.season_id) {
        setSeasonTeams([])
        setLookupFilters(prev => ({ ...prev, team_id: '' }))
        return
      }
      setLoadingTeams(true)
      try {
        const response = await ApiService.get(`/seasons/${lookupFilters.season_id}/teams`)
        setSeasonTeams(Array.isArray(response) ? response : (response?.data || []))
        // Auto-select first team if only one team
        const teams = Array.isArray(response) ? response : (response?.data || [])
        if (teams.length === 1 && currentUser?.teamIds?.length === 1) {
          setLookupFilters(prev => ({ ...prev, team_id: String(teams[0].id || teams[0].team_id) }))
        }
      } catch (err) {
        console.error('Failed to fetch teams', err)
        setSeasonTeams([])
      } finally {
        setLoadingTeams(false)
      }
    }

    const timerId = setTimeout(() => {
      if (lookupFilters.season_id) fetchTeams()
    }, 300)

    return () => clearTimeout(timerId)
  }, [lookupFilters.season_id, currentUser])

  const handleLookupSearch = async (e) => {
    if (e) e.preventDefault()
    if (!lookupFilters.season_id) {
      setLookupError('Vui lòng chọn mùa giải.')
      return
    }

    setLookupLoading(true)
    setLookupError(null)
    setLookupResult(null)
    setHasSearched(true)

    try {
      // Get approved players for the season (cầu thủ đã được duyệt trong mùa giải)
      const players = await TeamsService.getApprovedSeasonPlayers(lookupFilters.season_id, {
        team_id: lookupFilters.team_id,
        position_code: lookupFilters.position_code,
        player_type: lookupFilters.player_type
      })
      
      // Map to expected format
      const mappedPlayers = players.map(p => ({
        player_id: p.player_id,
        player_name: p.player_name,
        team_name: p.team_name,
        season_id: lookupFilters.season_id,
        shirt_number: p.shirt_number,
        position_code: p.position_code,
        player_type: p.player_type,
        registered_at: p.registered_at,
        registration_status: 'approved' // Only approved players shown here
      }))

      setLookupResult({ total: mappedPlayers.length, players: mappedPlayers })
    } catch (err) {
      console.error('Search failed', err)
      setLookupError(err?.message || 'Không thể tải danh sách cầu thủ.')
    } finally {
      setLookupLoading(false)
    }
  }

  // ========== APPROVAL TAB FUNCTIONS ==========
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const seasonsRes = await ApiService.get('/seasons')
        setSeasons(Array.isArray(seasonsRes) ? seasonsRes : (seasonsRes?.data || []))

        const teamsRes = await TeamsService.getAllTeams({ limit: 1000 })
        setAllTeams(teamsRes?.teams || teamsRes || [])
      } catch (err) {
        console.error('Failed to load filters', err)
      }
    }
    fetchFilters()
  }, [])

  const fetchPending = async () => {
    setApprovalLoading(true)
    setApprovalError(false)
    try {
      const params = { status: 'pending' }
      if (filterSeason) params.seasonId = filterSeason
      if (filterTeam) params.teamId = filterTeam

      const response = await ApiService.get(
        APP_CONFIG.API.ENDPOINTS.PLAYER_REGISTRATIONS.LIST,
        params
      )

      const dataArray = Array.isArray(response) ? response : (response?.data || [])
      setApprovalList(dataArray.map(item => ({
        ...item,
        registration_status: 'pending',
        reject_reason: item.reject_reason ?? null
      })))
    } catch (err) {
      console.error('Fetch pending error:', err)
      setApprovalError(true)
    } finally {
      setApprovalLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'approval') {
      fetchPending()
    }
  }, [filterSeason, filterTeam, activeTab])

  const handleApprove = async (id) => {
    setSubmitting(true)
    try {
      const endpoint = APP_CONFIG.API.ENDPOINTS.PLAYER_REGISTRATIONS.APPROVE.replace(':id', id)
      await ApiService.post(endpoint)
      toast.success('Duyệt hồ sơ thành công')
      fetchPending()
    } catch (err) {
      toast.error(err?.message || 'Duyệt hồ sơ thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  const submitReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối')
      return
    }

    setSubmitting(true)
    try {
      const endpoint = APP_CONFIG.API.ENDPOINTS.PLAYER_REGISTRATIONS.REJECT.replace(':id', rejectId)
      await ApiService.post(endpoint, { reason: rejectReason })
      toast.success('Từ chối hồ sơ thành công')
      setRejectId(null)
      setRejectReason('')
      fetchPending()
    } catch (err) {
      toast.error(err?.message || 'Từ chối hồ sơ thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('vi-VN')
  }

  const openPdf = (path) => {
    if (!path) return
    const normalized = path.replace(/\\/g, '/')
    window.open(`/${normalized}`, '_blank')
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Cầu thủ</h1>
          <p className="text-gray-500">Quản lý danh sách cầu thủ, tra cứu và duyệt đăng ký.</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('pool')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'pool'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users size={18} />
          <span>Gửi đơn đăng ký</span>
        </button>
        <button
          onClick={() => setActiveTab('lookup')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'lookup'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Search size={18} />
          <span>Tra cứu mùa giải</span>
        </button>
        {canApprove && (
          <button
            onClick={() => setActiveTab('approval')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'approval'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ShieldCheck size={18} />
            <span>Duyệt đăng ký</span>
            {approvalList.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{approvalList.length}</span>
            )}
          </button>
        )}
      </div>

      {/* Pool Tab */}
      {activeTab === 'pool' && (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              {showCreateForm ? <X size={20} /> : <Plus size={20} />}
              <span>{showCreateForm ? 'Đóng Form' : 'Thêm Cầu thủ Mới'}</span>
            </button>
          </div>

          {showCreateForm && (
            <div className="bg-white p-6 rounded-lg shadow-md border border-blue-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Plus size={18} className="mr-2 text-blue-600" />
                Thêm mới cầu thủ
              </h3>

              {createMessage && (
                <div className={`p-3 mb-4 rounded-md flex items-center ${createMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {createMessage.type === 'success' ? <CheckCircle size={18} className="mr-2" /> : <AlertCircle size={18} className="mr-2" />}
                  {createMessage.text}
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userTeams.length > 1 && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Đội bóng</label>
                    <select
                      name="internal_team_id"
                      value={formData.internal_team_id}
                      onChange={handleCreateChange}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      required
                    >
                      <option value="">-- Chọn đội --</option>
                      {userTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên <span className="text-red-500">*</span></label>
                  <input type="text" name="name" value={formData.name} onChange={handleCreateChange}
                    className="w-full border border-gray-300 rounded px-3 py-2" placeholder="Nguyễn Văn A" required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày sinh <span className="text-red-500">*</span></label>
                  <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleCreateChange}
                    className="w-full border border-gray-300 rounded px-3 py-2" required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quốc tịch</label>
                  <input type="text" name="nationality" value={formData.nationality} onChange={handleCreateChange}
                    className="w-full border border-gray-300 rounded px-3 py-2" placeholder="Vietnam" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vị trí thi đấu</label>
                  <select name="position" value={formData.position} onChange={handleCreateChange}
                    className="w-full border border-gray-300 rounded px-3 py-2">
                    <option value="">-- Chọn vị trí --</option>
                    {DB_POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                  </select>
                </div>

                <div className="md:col-span-2 flex justify-end mt-2">
                  <button type="submit" disabled={creating}
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-70 flex items-center">
                    {creating && <Loader2 size={16} className="animate-spin mr-2" />}
                    {creating ? 'Đang tạo...' : 'Tạo cầu thủ'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input type="text" placeholder="Tìm kiếm cầu thủ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedSeasonForRegistration}
                onChange={(e) => setSelectedSeasonForRegistration(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">-- Chọn mùa giải --</option>
                {seasonsForRegistration.map(s => (
                  <option key={s.season_id || s.id} value={s.season_id || s.id}>
                    {s.name} {s.code ? `(${s.code})` : ''}
                  </option>
                ))}
              </select>
              {selectedPlayersForRegistration.size > 0 && selectedSeasonForRegistration && (
                <button
                  onClick={() => {
                    // Save to localStorage and navigate to registration page
                    const selectedData = Array.from(selectedPlayersForRegistration).map(playerId => {
                      const player = players.find(p => p.id === playerId)
                      return {
                        player_id: playerId,
                        player_name: player?.name || player?.full_name,
                        season_id: selectedSeasonForRegistration
                      }
                    })
                    localStorage.setItem('selectedPlayersForRegistration', JSON.stringify(selectedData))
                    toast.success(`Đã chọn ${selectedPlayersForRegistration.size} cầu thủ. Vui lòng vào trang "Đăng ký mùa giải" để hoàn tất.`)
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Gửi đơn đăng ký ({selectedPlayersForRegistration.size})
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                <Loader2 size={32} className="animate-spin mb-2" />
                Đang tải...
              </div>
            ) : players.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Chưa có cầu thủ nào.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3 font-medium w-12">
                        <input
                          type="checkbox"
                          checked={players.length > 0 && players.every(p => selectedPlayersForRegistration.has(p.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPlayersForRegistration(new Set(players.map(p => p.id)))
                            } else {
                              setSelectedPlayersForRegistration(new Set())
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="px-6 py-3 font-medium">ID</th>
                      <th className="px-6 py-3 font-medium">Họ tên</th>
                      <th className="px-6 py-3 font-medium">Ngày sinh</th>
                      <th className="px-6 py-3 font-medium">Quốc tịch</th>
                      <th className="px-6 py-3 font-medium">Vị trí</th>
                      <th className="px-6 py-3 font-medium">Đội</th>
                      <th className="px-6 py-3 font-medium">Trạng thái đăng ký</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {players.map(player => {
                      const regStatus = playerRegistrationStatus[player.id]
                      return (
                        <tr key={player.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedPlayersForRegistration.has(player.id)}
                              onChange={(e) => {
                                const newSet = new Set(selectedPlayersForRegistration)
                                if (e.target.checked) {
                                  newSet.add(player.id)
                                } else {
                                  newSet.delete(player.id)
                                }
                                setSelectedPlayersForRegistration(newSet)
                              }}
                              className="rounded border-gray-300"
                            />
                          </td>
                          <td className="px-6 py-4 text-gray-500 text-sm">#{player.id}</td>
                          <td className="px-6 py-4 font-medium text-gray-900">{player.name || player.full_name}</td>
                          <td className="px-6 py-4 text-gray-600">{player.date_of_birth?.split('T')[0]}</td>
                          <td className="px-6 py-4 text-gray-600">{player.nationality}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-semibold 
                              ${player.position === 'GK' ? 'bg-yellow-100 text-yellow-800' :
                                player.position === 'FW' ? 'bg-red-100 text-red-800' :
                                player.position === 'MF' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                              {player.position}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-600 text-sm">{player.internal_team_id}</td>
                          <td className="px-6 py-4">
                            {regStatus ? (
                              <div className="flex flex-col gap-1">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded w-fit ${
                                  regStatus.status === 'approved' 
                                    ? 'bg-green-100 text-green-800' 
                                    : regStatus.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {regStatus.status === 'approved' ? 'Đã duyệt' : 
                                   regStatus.status === 'pending' ? 'Chờ duyệt' : 'Từ chối'}
                                </span>
                                {regStatus.season_name && (
                                  <span className="text-xs text-gray-500">{regStatus.season_name}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">Chưa đăng ký</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Lookup Tab */}
      {activeTab === 'lookup' && (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <form onSubmit={handleLookupSearch} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mùa giải <span className="text-red-500">*</span></label>
                <select
                  value={lookupFilters.season_id}
                  onChange={(e) => setLookupFilters(prev => ({ ...prev, season_id: e.target.value, team_id: '' }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">-- Chọn mùa giải --</option>
                  {lookupSeasons.map(s => (
                    <option key={s.season_id || s.id} value={s.season_id || s.id}>
                      {s.name} {s.code ? `(${s.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Đội bóng</label>
                <select value={lookupFilters.team_id} onChange={(e) => setLookupFilters(prev => ({ ...prev, team_id: e.target.value }))}
                  disabled={!lookupFilters.season_id || loadingTeams}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-100">
                  <option value="">Tất cả</option>
                  {seasonTeams.map(t => <option key={t.team_id} value={t.team_id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vị trí</label>
                <select value={lookupFilters.position_code} onChange={(e) => setLookupFilters(prev => ({ ...prev, position_code: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option value="">Tất cả vị trí</option>
                  {POSITION_GROUPS_LIST.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loại cầu thủ</label>
                <select value={lookupFilters.player_type} onChange={(e) => setLookupFilters(prev => ({ ...prev, player_type: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option value="">Tất cả</option>
                  <option value="domestic">Trong nước</option>
                  <option value="foreign">Nước ngoài</option>
                </select>
              </div>
              <div className="pt-1">
                <label className="block text-sm font-medium text-transparent mb-1">.</label>
                <button type="submit" disabled={lookupLoading}
                  className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-60">
                  {lookupLoading ? <Loader2 size={20} className="animate-spin" /> : <><Search size={20} /><span>Tìm kiếm</span></>}
                </button>
              </div>
            </form>
          </div>

          {lookupError && <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center"><AlertCircle size={20} className="mr-2" />{lookupError}</div>}
          
          {lookupLoading && <div className="flex justify-center p-12"><Loader2 size={40} className="animate-spin text-blue-500" /></div>}

          {!lookupLoading && !lookupResult && !lookupError && !hasSearched && (
            <div className="bg-blue-50 rounded-lg border border-blue-100 p-8 text-center text-blue-700">
              <Users size={48} className="mx-auto mb-3 opacity-50" />
              <p>Chọn mùa giải và nhấn Tìm kiếm.</p>
            </div>
          )}

          {!lookupLoading && hasSearched && lookupResult && lookupResult.players.length === 0 && (
            <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-12 text-center text-gray-500">Không tìm thấy dữ liệu.</div>
          )}

          {!lookupLoading && lookupResult && lookupResult.players.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h2 className="font-semibold text-gray-900 flex items-center"><Users size={18} className="mr-2" />Kết quả</h2>
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Tổng: {lookupResult.total}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 w-12">
                        <input
                          type="checkbox"
                          checked={lookupResult.players.length > 0 && lookupResult.players.every(p => selectedPlayersForRegistration.has(p.player_id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPlayersForRegistration(new Set(lookupResult.players.map(p => p.player_id)))
                            } else {
                              setSelectedPlayersForRegistration(new Set())
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="px-6 py-3">Cầu thủ</th>
                      <th className="px-6 py-3">Đội bóng</th>
                      <th className="px-6 py-3 text-center">Số áo</th>
                      <th className="px-6 py-3 text-center">Vị trí</th>
                      <th className="px-6 py-3">Loại</th>
                      <th className="px-6 py-3">Ngày đăng ký</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {lookupResult.players.map((player) => (
                      <tr key={`${player.season_id}-${player.player_id}`} className="bg-white hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedPlayersForRegistration.has(player.player_id)}
                            onChange={(e) => {
                              const newSet = new Set(selectedPlayersForRegistration)
                              if (e.target.checked) {
                                newSet.add(player.player_id)
                              } else {
                                newSet.delete(player.player_id)
                              }
                              setSelectedPlayersForRegistration(newSet)
                            }}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">{player.player_name}</td>
                        <td className="px-6 py-4">{player.team_name}</td>
                        <td className="px-6 py-4 text-center font-semibold">{player.shirt_number}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">{player.position_code}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-medium px-2.5 py-0.5 rounded capitalize ${player.player_type === 'foreign' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                            {PLAYER_TYPE_MAP[player.player_type] || player.player_type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-gray-600 text-sm">{formatDate(player.registered_at)}</span>
                            {player.registration_status && (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded w-fit ${
                                player.registration_status === 'approved' 
                                  ? 'bg-green-100 text-green-800' 
                                  : player.registration_status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {player.registration_status === 'approved' ? 'Đã duyệt' : 
                                 player.registration_status === 'pending' ? 'Chờ duyệt' : 'Từ chối'}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {selectedPlayersForRegistration.size > 0 && (
                <div className="p-4 bg-blue-50 border-t border-blue-200 flex justify-between items-center">
                  <span className="text-sm text-blue-800 font-medium">
                    Đã chọn {selectedPlayersForRegistration.size} cầu thủ
                  </span>
                  <button
                    onClick={() => {
                      // Save selected players to localStorage
                      const selectedPlayersData = Array.from(selectedPlayersForRegistration).map(playerId => {
                        const player = lookupResult.players.find(p => p.player_id === playerId)
                        return {
                          player_id: playerId,
                          player_name: player?.player_name,
                          position_code: player?.position_code,
                          player_type: player?.player_type,
                          season_id: lookupFilters.season_id,
                          team_id: lookupFilters.team_id
                        }
                      })
                      localStorage.setItem('selectedPlayersForRegistration', JSON.stringify(selectedPlayersData))
                      toast.success(`Đã chọn ${selectedPlayersForRegistration.size} cầu thủ. Vui lòng vào trang "Đăng ký mùa giải" để hoàn tất.`)
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    Chuyển đến đăng ký
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Approval Tab */}
      {activeTab === 'approval' && canApprove && (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-wrap gap-4 items-end">
            <div className="flex items-center gap-2 text-gray-600 mr-2">
              <Filter size={20} />
              <span className="font-medium text-sm">Bộ lọc:</span>
            </div>
            <div className="w-full md:w-48">
              <label className="block text-xs uppercase text-gray-500 font-semibold mb-1">Mùa giải</label>
              <select value={filterSeason} onChange={(e) => setFilterSeason(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Tất cả</option>
                {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="w-full md:w-56">
              <label className="block text-xs uppercase text-gray-500 font-semibold mb-1">Đội bóng</label>
              <select value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Tất cả</option>
                {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            {(filterSeason || filterTeam) && (
              <button onClick={() => { setFilterSeason(''); setFilterTeam('') }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">
                <RotateCcw size={16} /> Reset
              </button>
            )}
          </div>

          {approvalLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Loader2 size={40} className="animate-spin mb-4 text-blue-500" />
              <p>Đang tải danh sách chờ duyệt...</p>
            </div>
          ) : approvalError ? (
            <div className="bg-red-50 rounded-lg border border-red-200 p-8 text-center">
              <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-red-700">Không thể tải dữ liệu</h3>
              <button onClick={fetchPending} className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm">Thử lại</button>
            </div>
          ) : approvalList.length === 0 ? (
            <div className="bg-green-50 rounded-lg border border-dashed border-green-300 p-16 text-center">
              <div className="bg-green-100 p-4 rounded-full inline-block mb-4">
                <Check size={40} className="text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-green-800">
                {(filterSeason || filterTeam) ? 'Không có hồ sơ nào khớp bộ lọc' : 'Đã duyệt hết!'}
              </h3>
              <p className="text-green-600 mt-1">
                {(filterSeason || filterTeam) ? 'Thử bỏ bộ lọc để xem các hồ sơ khác.' : 'Không có hồ sơ nào đang chờ xử lý.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                  <thead className="bg-gray-50 text-gray-700 uppercase text-xs font-semibold border-b">
                    <tr>
                      <th className="px-6 py-4">Cầu thủ</th>
                      <th className="px-6 py-4">Đội bóng</th>
                      <th className="px-6 py-4">Mùa giải</th>
                      <th className="px-6 py-4 text-center">Hồ sơ</th>
                      <th className="px-6 py-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {approvalList.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-2 rounded-full text-blue-600"><User size={18} /></div>
                            <div>
                              <span className="font-semibold text-gray-900 block">{item.player_name}</span>
                              <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                <Calendar size={10} /> {formatDate(item.registered_at)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-700">{item.team_name}</td>
                        <td className="px-6 py-4 text-gray-600">{item.season_name}</td>
                        <td className="px-6 py-4 text-center">
                          {item.file_path ? (
                            <button onClick={() => openPdf(item.file_path)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100">
                              <FileText size={14} /> Xem PDF
                            </button>
                          ) : <span className="text-xs text-gray-400 italic">Không có</span>}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {canApprove && (
                            <div className="flex items-center justify-end gap-2">
                              <button disabled={submitting} onClick={() => handleApprove(item.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-xs font-semibold disabled:opacity-50">
                                <Check size={14} /> Duyệt
                              </button>
                              <button disabled={submitting} onClick={() => setRejectId(item.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-semibold disabled:opacity-50">
                                <X size={14} /> Từ chối
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <AlertCircle size={20} className="text-red-500" />
                Từ chối hồ sơ đăng ký
              </h3>
              <button onClick={() => setRejectId(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Lý do từ chối <span className="text-red-500">*</span></label>
              <textarea rows={4} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 text-sm"
                placeholder="Nhập lý do từ chối..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} autoFocus />
            </div>
            <div className="p-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-200">
              <button onClick={() => setRejectId(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">Hủy</button>
              <button disabled={submitting || !rejectReason.trim()} onClick={submitReject}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
                {submitting && <Loader2 size={16} className="animate-spin" />}
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PlayersManagement
