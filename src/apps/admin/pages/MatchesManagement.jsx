import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus,
  Calendar,
  Clock,
  MapPin,
  Edit,
  Trash2,
  Eye,
  Filter,
  Download,
  CheckCircle,
  AlertCircle,
  Play,
  Loader2,
  Shield,
  UserPlus,
  ArrowRight,
  RefreshCw,
  ClipboardList
} from 'lucide-react'
import MatchesService from '../../../layers/application/services/MatchesService'
import SeasonService from '../../../layers/application/services/SeasonService'
import logger from '../../../shared/utils/logger'
import MatchOfficialAssignmentModal from '../components/MatchOfficialAssignmentModal'

const statusOptions = [
  { id: 'all', name: 'Tất cả trận' },
  { id: 'SCHEDULED', name: 'Đã lịch' },
  { id: 'IN_PROGRESS', name: 'Đang diễn ra' },
  { id: 'COMPLETED', name: 'Đã kết thúc' },
  { id: 'POSTPONED', name: 'Hoãn lại' },
  { id: 'CANCELLED', name: 'Đã hủy' }
]

const statusIcon = (status) => {
  const normalized = status?.toUpperCase() || ''
  switch (normalized) {
    case 'SCHEDULED':
    case 'TIMED':
      return <Clock size={16} className="text-blue-500" />
    case 'LIVE':
    case 'IN_PLAY':
    case 'IN_PROGRESS':
      return <Play size={16} className="text-red-500" />
    case 'FINISHED':
    case 'COMPLETED':
      return <CheckCircle size={16} className="text-green-500" />
    case 'POSTPONED':
    case 'CANCELLED':
      return <AlertCircle size={16} className="text-yellow-500" />
    default:
      return <Clock size={16} className="text-gray-500" />
  }
}

const statusBadge = (status) => {
  const normalized = status?.toUpperCase() || ''
  switch (normalized) {
    case 'SCHEDULED':
    case 'TIMED':
      return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">Đã lịch</span>
    case 'LIVE':
    case 'IN_PLAY':
    case 'IN_PROGRESS':
      return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium animate-pulse">Đang diễn ra</span>
    case 'FINISHED':
    case 'COMPLETED':
      return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">Kết thúc</span>
    case 'POSTPONED':
      return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">Hoãn</span>
    case 'CANCELLED':
      return <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">Hủy</span>
    default:
      return <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">{status}</span>
  }
}


const formatDate = (isoString) => {
  const date = new Date(isoString)
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  })
}

const formatTime = (isoString) => {
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

const MatchesManagement = () => {
  const navigate = useNavigate()

  // Tab state
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'today'

  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: 'all',
    seasonId: ''
  })
  const [seasons, setSeasons] = useState([])
  const [matches, setMatches] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [editingMatch, setEditingMatch] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showOfficialModal, setShowOfficialModal] = useState(false)
  const [selectedMatchForOfficials, setSelectedMatchForOfficials] = useState(null)

// Today matches state
  const [todayMatches, setTodayMatches] = useState([])
  const [todayLoading, setTodayLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0) // Lấy thêm dòng này từ main

  const getTodayRange = () => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    return {
      dateFrom: start.toISOString(),
      dateTo: end.toISOString()
    }
  }

  const fetchTodayMatches = async () => {
    setTodayLoading(true)
    try {
      const { dateFrom, dateTo } = getTodayRange()
      const response = await MatchesService.getAllMatches({
        dateFrom,
        dateTo,
        limit: 100
      })
      setTodayMatches(response.matches || [])
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to fetch today matches:', err)
    } finally {
      setTodayLoading(false)
    }
  }

  // Auto-refresh today matches when tab is active
  useEffect(() => {
    if (activeTab === 'today') {
      fetchTodayMatches()
      const interval = setInterval(fetchTodayMatches, 60000) // Refresh every 60 seconds
      return () => clearInterval(interval)
    }
  }, [activeTab])

  const getTodayStatusColor = (status) => {
    const s = status?.toUpperCase()
    if (s === 'IN_PROGRESS' || s === 'LIVE' || s === 'IN_PLAY') return 'bg-red-500 text-white animate-pulse'
    if (s === 'FINISHED' || s === 'COMPLETED') return 'bg-green-500 text-white'
    if (s === 'SCHEDULED' || s === 'TIMED') return 'bg-blue-100 text-blue-800'
    return 'bg-gray-200 text-gray-800'
  }

  const openOfficialModal = (match) => {
    setSelectedMatchForOfficials({
      matchId: match.id,
      homeTeamName: match.homeTeamName,
      awayTeamName: match.awayTeamName
    })
    setShowOfficialModal(true)
  }

  useEffect(() => {
    let isMounted = true
    const fetchSeasons = async () => {
      try {
        const data = await SeasonService.listSeasons()
        if (isMounted) {
          setSeasons(data || [])
        }
      } catch (err) {
        console.error('Failed to fetch seasons', err)
      }
    }

    fetchSeasons()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    const fetchMatches = async () => {
      try {
        setLoading(true)
        setError(null)

        // Use getAllMatches to fetch INTERNAL system matches (which includes the generated schedule)
        const response = await MatchesService.getAllMatches({
          status: filters.status === 'all' ? '' : filters.status,
          seasonId: filters.seasonId === 'all' ? '' : filters.seasonId,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          page: pagination.page,
          limit: pagination.limit
        })

        if (!isMounted) return

        setMatches(response.matches || [])
        setPagination(prev => ({
          ...prev,
          ...response.pagination,
          total: response.total
        }))

      } catch (err) {
        logger.error('Failed to load matches', err)
        if (isMounted) {
          setError('Không thể tải trận đấu từ máy chủ.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    fetchMatches()
    return () => {
      isMounted = false
    }
  }, [filters, pagination.page, pagination.limit, refreshKey])

  const totals = useMemo(() => {
    const counters = {
      scheduled: 0,
      finished: 0,
      live: 0
    }
    matches.forEach(match => {
      const status = match.status?.toUpperCase()
      if (status === 'FINISHED') counters.finished += 1
      else if (status === 'SCHEDULED' || status === 'TIMED') counters.scheduled += 1
      else if (status === 'LIVE' || status === 'IN_PLAY') counters.live += 1
    })
    return counters
  }, [matches])

  const handleSync = async () => {
    try {
      setSyncing(true)
      const result = await MatchesService.syncMatches({
        status: filters.status === 'all' ? '' : filters.status,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo
      })

      // Show success message
      if (result?.data?.results?.matches) {
        const { totalMatches, syncedMatches, skippedMatches } = result.data.results.matches
        alert(`✅ Đồng bộ thành công ${totalMatches || syncedMatches} trận đấu từ Football-Data.org API!\n\n${skippedMatches ? `⚠️ Đã bỏ qua ${skippedMatches} trận không đủ dữ liệu.` : ''}`)
      }

      // Force reload matches
      const response = await MatchesService.getExternalMatches({
        status: filters.status === 'all' ? '' : filters.status,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        page: pagination.page,
        limit: pagination.limit
      })
      setMatches(response.matches || [])
      setPagination(prev => ({
        ...prev,
        ...response.pagination,
        total: response.total
      }))
    } catch (err) {
      logger.error('Failed to sync matches', err)
      alert('Không thể đồng bộ dữ liệu trận đấu từ API.')
    } finally {
      setSyncing(false)
    }
  }

  const handleDelete = async (matchId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa trận này khỏi lịch thi đấu?')) {
      return
    }
    try {
      await MatchesService.deleteMatch(matchId)
      setMatches(prev => prev.filter(match => match.id !== matchId))
    } catch (err) {
      logger.error('Failed to delete match', err)
      alert('Không thể xóa trận đấu. Vui lòng thử lại.')
    }
  }

  const handleClearAll = async () => {
    if (!window.confirm('⚠️ DANGER: This will delete ALL matches in the database!\n\nUse this if you want to Reset the schedule to change team settings.\n\nAre you sure completely?')) {
      return
    }
    try {
      setLoading(true)
      await MatchesService.deleteAllMatches()
      setMatches([])
      setPagination(prev => ({ ...prev, total: 0, totalPages: 1 }))
      alert('All matches have been deleted successfully.')
    } catch (err) {
      console.error('Failed to delete all matches', err)
      alert('Failed to clear database.')
    } finally {
      setLoading(false)
    }
  }

  const openEditModal = (match) => {
    // Convert ISO string to format accepted by datetime-local (YYYY-MM-DDThh:mm)
    let formattedDate = ''
    if (match.scheduledKickoff) {
      const date = new Date(match.scheduledKickoff)
      // Adjust to local time string ISO format (ignoring timezone offset for simplicity in this context or handling it)
      // Actually, datetime-local expects local time. 
      // Safe generic way:
      const pad = (n) => n.toString().padStart(2, '0')
      formattedDate = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
    }

    setEditingMatch({
      id: match.id,
      status: match.status?.toUpperCase(),
      scheduledKickoff: formattedDate,
      venue: match.stadiumName || match.venue || '', // Display stadium name logic
      referee: match.referee || '',
      scoreHome: match.scoreHome ?? '',
      scoreAway: match.scoreAway ?? '',
      description: ''
    })
    setShowEditModal(true)
  }

  const handleUpdateMatch = async (event) => {
    event.preventDefault()
    if (!editingMatch) return
    try {
      let scheduledKickoff = undefined;
      if (editingMatch.scheduledKickoff && editingMatch.scheduledKickoff.trim() !== '') {
        // Check if valid date
        const parsed = new Date(editingMatch.scheduledKickoff);
        if (!isNaN(parsed.getTime())) {
          scheduledKickoff = parsed.toISOString();
        } else {
          console.warn('Invalid date string:', editingMatch.scheduledKickoff);
        }
      }

      // Preparing update payload
      const payload = {
        status: editingMatch.status?.toLowerCase(), // Normalize status
        venue: editingMatch.venue || null,
        referee: editingMatch.referee || null,
        scoreHome: editingMatch.scoreHome === '' ? null : Number(editingMatch.scoreHome),
        scoreAway: editingMatch.scoreAway === '' ? null : Number(editingMatch.scoreAway),
        scheduledKickoff,
        description: editingMatch.description
      }
      const updated = await MatchesService.updateMatch(editingMatch.id, payload)
      setMatches(prev => prev.map(match => (match.id === updated.id ? { ...match, ...updated } : match)))
      setShowEditModal(false)
    } catch (err) {
      console.error('Failed to update match', err)
      alert(`Could not update match. Error: ${err.message}`)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quản lý Trận đấu</h1>
            <p className="text-gray-600 mt-2">
              Quản lý lịch thi đấu, cập nhật kết quả và theo dõi trận đấu trong ngày.
            </p>
          </div>
          <div className="flex space-x-3">
            {activeTab === 'all' && (
              <>
                <button
                  onClick={handleSync}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={syncing}
                >
                  {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  <span>{syncing ? 'Đang đồng bộ...' : 'Đồng bộ trận đấu'}</span>
                </button>
                <button className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors">
                  <Download size={16} />
                  <span>Xuất lịch</span>
                </button>
                <Link
                  to="/admin/schedule"
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Calendar size={16} />
                  <span>Tạo lịch thi đấu</span>
                </Link>
              </>
            )}
            {activeTab === 'today' && (
              <button
                onClick={fetchTodayMatches}
                disabled={todayLoading}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
              >
                <RefreshCw size={16} className={todayLoading ? 'animate-spin' : ''} />
                <span>{todayLoading ? 'Đang tải...' : 'Làm mới'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'all'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          <Calendar size={18} />
          <span>Tất cả trận đấu</span>
        </button>
        <button
          onClick={() => setActiveTab('today')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'today'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          <Play size={18} />
          <span>Trận trong ngày</span>
          {todayMatches.length > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{todayMatches.length}</span>
          )}
        </button>
      </div>

      {/* All Matches Tab */}
      {activeTab === 'all' && (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-3">
                <Calendar size={18} className="text-gray-400" />
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                  placeholder="From"
                />
              </div>
              <div className="flex items-center space-x-3">
                <Calendar size={18} className="text-gray-400" />
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                  placeholder="To"
                />
              </div>
              <div className="flex items-center space-x-3">
                <Filter size={18} className="text-gray-400" />
                <select
                  value={filters.seasonId}
                  onChange={(e) => setFilters(prev => ({ ...prev, seasonId: e.target.value }))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                >
                  <option value="">Tất cả mùa giải</option>
                  {seasons.map(season => (
                    <option key={season.seasonId || season.id} value={season.seasonId || season.id}>
                      {season.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center space-x-3">
                <Filter size={18} className="text-gray-400" />
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                >
                  {statusOptions.map(option => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Matches ({pagination.total})</h2>
                <div className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}
                </div>
              </div>
            </div>

            {error && (
              <div className="p-6 text-red-600 bg-red-50 border-b border-red-100">
                {error}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Match</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Venue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Officials</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        <div className="flex items-center justify-center space-x-2">
                          <Loader2 className="animate-spin" size={20} />
                          <span>Loading matches...</span>
                        </div>
                      </td>
                    </tr>
                  ) : matches.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        No matches found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    matches.map(match => (
                      <tr key={match.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {statusIcon(match.status)}
                            <div className="ml-3">
                              <div className="font-medium text-gray-900">
                                {match.homeTeamName} vs {match.awayTeamName}
                              </div>
                              <div className="text-gray-500 text-sm">
                                Matchday {match.matchday ?? '—'}
                              </div>
                              {typeof match.scoreHome === 'number' && typeof match.scoreAway === 'number' && (
                                <div className="text-blue-600 font-bold text-sm">
                                  {match.scoreHome} - {match.scoreAway}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(match.utcDate)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatTime(match.utcDate)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900 space-x-2">
                            <MapPin size={14} className="text-gray-400" />
                            <span>{match.venue || 'TBC'}</span>
                          </div>
                          <div className="text-sm text-gray-500">{match.stage || match.groupName || 'League Phase'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => openOfficialModal(match)}
                            className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
                          >
                            <Shield size={14} />
                            <span>{match.referee || 'Phân công'}</span>
                          </button>
                          <div className="text-xs text-gray-500 mt-1">
                            {match.referee ? 'Nhấn để chỉnh sửa' : 'Chưa phân công'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {statusBadge(match.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
<button
                              onClick={() => navigate(`/admin/matches/${match.id}/lineup-review`)}
                              className="text-purple-600 hover:text-purple-900 transition-colors"
                              title="Duyệt đội hình"
                            >
                              <ClipboardList size={16} />
                            </button>
                            
                            <button
                              onClick={() => setEditingMatch(match)}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                              title="Xem chi tiết"
                            >
                              <Eye size={16} />
                            </button>

                            {/* Chỉ hiện nút Sửa nếu trận đấu CHƯA kết thúc (Logic từ Main) */}
                            {!['FINISHED', 'COMPLETED'].includes(match.status?.toUpperCase()) && (
                              <button
                                onClick={() => openEditModal(match)}
                                className="text-gray-600 hover:text-gray-900 transition-colors"
                                title="Chỉnh sửa thông tin"
                              >
                                <Edit size={16} />
                              </button>
                            )}

                            <button
                              onClick={() => handleDelete(match.id)}
                              className="text-red-600 hover:text-red-900 transition-colors"
                              title="Xóa trận đấu"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-500">
                Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-medium">{pagination.total}</span> results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <Calendar size={24} className="text-blue-500 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{pagination.total}</div>
                  <div className="text-gray-600 text-sm">Tổng trận đấu</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <CheckCircle size={24} className="text-green-500 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{totals.finished}</div>
                  <div className="text-gray-600 text-sm">Đã hoàn thành</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <Clock size={24} className="text-blue-500 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{totals.scheduled}</div>
                  <div className="text-gray-600 text-sm">Đã lên lịch</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <Play size={24} className="text-red-500 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{totals.live}</div>
                  <div className="text-gray-600 text-sm">Đang diễn ra</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Today Matches Tab */}
      {activeTab === 'today' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Trận đấu hôm nay</h2>
                <p className="text-gray-500 text-sm">
                  {new Date().toLocaleDateString('vi-VN')}
                  {lastUpdated && <span className="ml-2">(Cập nhật: {lastUpdated.toLocaleTimeString()})</span>}
                </p>
              </div>
            </div>
          </div>

          {todayLoading && todayMatches.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Loader2 className="animate-spin mx-auto mb-2" size={24} />
              Đang tải trận đấu hôm nay...
            </div>
          ) : todayMatches.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center text-gray-500">
              <Calendar size={48} className="mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900">Không có trận đấu nào hôm nay</h3>
              <p className="mt-1">Xem lịch thi đấu đầy đủ ở tab "Tất cả trận đấu".</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {todayMatches.map(match => (
                <div key={match.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex-1 flex items-center justify-center md:justify-start gap-8 w-full md:w-auto">
                    <div className="flex items-center gap-4 flex-1 justify-end text-right">
                      <span className="font-bold text-lg text-gray-900">{match.homeTeamName}</span>
                      {match.homeTeamLogo && (
                        <img src={match.homeTeamLogo} alt={match.homeTeamName} className="w-10 h-10 object-contain" />
                      )}
                    </div>

                    <div className="flex flex-col items-center min-w-[100px]">
                      {['IN_PROGRESS', 'LIVE', 'IN_PLAY', 'FINISHED', 'COMPLETED'].includes(match.status?.toUpperCase()) ? (
                        <span className="text-2xl font-bold font-mono">
                          {match.scoreHome} - {match.scoreAway}
                        </span>
                      ) : (
                        <span className="text-xl font-bold font-mono text-gray-400">vs</span>
                      )}
                      <span className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Clock size={12} />
                        {formatTime(match.utcDate)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 flex-1 justify-start text-left">
                      {match.awayTeamLogo && (
                        <img src={match.awayTeamLogo} alt={match.awayTeamName} className="w-10 h-10 object-contain" />
                      )}
                      <span className="font-bold text-lg text-gray-900">{match.awayTeamName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 mt-2 md:mt-0">
                    <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${getTodayStatusColor(match.status)}`}>
                      {match.status?.replace('_', ' ')}
                    </span>

                    <button
                      onClick={() => navigate(`/admin/matches/${match.id}/live`)}
                      className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 shadow-sm transition-all active:scale-95 font-medium"
                    >
                      {['IN_PROGRESS', 'LIVE', 'IN_PLAY'].includes(match.status?.toUpperCase()) ? (
                        <>
                          <Play size={18} /> Tiếp tục cập nhật
                        </>
                      ) : (
                        <>
                          Cập nhật trực tiếp <ArrowRight size={18} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showEditModal && editingMatch && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Update Match</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateMatch} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editingMatch.status}
                  onChange={(e) => setEditingMatch(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {statusOptions
                    .filter(option => option.id !== 'all')
                    .map(option => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  value={editingMatch.scheduledKickoff}
                  onChange={(e) => {
                    setEditingMatch(prev => ({ ...prev, scheduledKickoff: e.target.value }));
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Change Reason (Audit Log)</label>
                <input
                  type="text"
                  value={editingMatch.description}
                  onChange={(e) => setEditingMatch(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g. Rescheduled due to bad weather"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Home Score</label>
                  <input
                    type="number"
                    value={editingMatch.scoreHome}
                    onChange={(e) => setEditingMatch(prev => ({ ...prev, scoreHome: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Away Score</label>
                  <input
                    type="number"
                    value={editingMatch.scoreAway}
                    onChange={(e) => setEditingMatch(prev => ({ ...prev, scoreAway: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
                <input
                  type="text"
                  value={editingMatch.venue}
                  onChange={(e) => setEditingMatch(prev => ({ ...prev, venue: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referee</label>
                <input
                  type="text"
                  value={editingMatch.referee}
                  onChange={(e) => setEditingMatch(prev => ({ ...prev, referee: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Assignment Modal */}
      <MatchOfficialAssignmentModal
        isOpen={showOfficialModal}
        onClose={() => {
          setShowOfficialModal(false)
          setSelectedMatchForOfficials(null)
        }}
        match={selectedMatchForOfficials}
        onSuccess={() => {
          setRefreshKey(prev => prev + 1)
        }}
      />
    </div>
  )
}

export default MatchesManagement