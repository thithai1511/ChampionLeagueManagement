import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast, { Toaster } from 'react-hot-toast'
import logger from '../../../shared/utils/logger'
import {
  Download,
  Edit,
  Eye,
  Filter,
  Loader2,
  Plus,
  Search,
  Shield,
  Trash2,
  Trophy,
  Users,
  X,
  Mail
} from 'lucide-react'
import TeamsService from '../../../layers/application/services/TeamsService'

const EMPTY_TEAM = {
  id: null,
  name: '',
  short_name: '',
  code: '',
  city: '',
  country: '',
  founded_year: ''
}

const TeamsManagement = () => {
  const navigate = useNavigate()

  const [searchTerm, setSearchTerm] = useState('')
  const [teams, setTeams] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [showTeamModal, setShowTeamModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Advanced filter state
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    country: '',
    foundedFrom: '',
    foundedTo: ''
  })
  const [appliedFilters, setAppliedFilters] = useState({})

  useEffect(() => {
    
    let isMounted = true
    setLoading(true)
    setError(null)

    const delay = setTimeout(async () => {
      try {
        const apiFilters = {
          search: searchTerm,
          page: pagination.page,
          limit: pagination.limit,
          status: appliedFilters.status || '',
          country: appliedFilters.country || ''
        }
        const response = await TeamsService.getAllTeams(apiFilters)
        if (!isMounted) return
        
        // Apply client-side filtering for founded year range
        let filteredTeams = response.teams || []
        if (appliedFilters.foundedFrom) {
          const fromYear = parseInt(appliedFilters.foundedFrom)
          filteredTeams = filteredTeams.filter(t => !t.founded_year || t.founded_year >= fromYear)
        }
        if (appliedFilters.foundedTo) {
          const toYear = parseInt(appliedFilters.foundedTo)
          filteredTeams = filteredTeams.filter(t => !t.founded_year || t.founded_year <= toYear)
        }
        
        setTeams(filteredTeams)
        setPagination(prev => ({
          ...prev,
          ...response.pagination,
          total: filteredTeams.length
        }))
      } catch (err) {
        logger.error('Failed to load teams', err)
        if (isMounted) {
          setError(err?.message || 'Unable to load teams from the server.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }, 300)

    return () => {
      isMounted = false
      clearTimeout(delay)
    }
  }, [searchTerm, pagination.page, pagination.limit, reloadKey, appliedFilters])

  const totalPlayers = useMemo(
    () => teams.reduce((sum, team) => sum + (team.playerCount || 0), 0),
    [teams]
  )

  const openCreateModal = () => {
    setIsCreating(true)
    setEditingTeam({ ...EMPTY_TEAM })
    setShowTeamModal(true)
  }

  const openEditModal = (team) => {
    setIsCreating(false)
    setEditingTeam({
      id: team.id,
      name: team.name,
      short_name: team.short_name || '',
      code: team.code || '',
      city: team.city || '',
      country: team.country || '',
      founded_year: team.founded_year || ''
    })
    setShowTeamModal(true)
  }

  const closeModal = () => {
    if (isSaving) return
    setShowTeamModal(false)
    setEditingTeam(null)
  }

  const handleDelete = async (teamId) => {
    const team = teams.find(t => t.id === teamId)
    const teamName = team?.name || `ID ${teamId}`
    const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa đội "${teamName}"?\n\nLưu ý: Thao tác này sẽ xóa tất cả dữ liệu liên quan (trận đấu, thống kê, đăng ký mùa giải...) và không thể hoàn tác.`)
    if (!confirmed) return
    try {
      await TeamsService.deleteTeam(teamId)
      toast.success(`Đã xóa đội "${teamName}" thành công`)
      setReloadKey(prev => prev + 1)
    } catch (err) {
      logger.error('Failed to delete team', err)
      // Show detailed error message from backend
      const errorMessage = err?.message || 'Không thể xóa đội. Vui lòng thử lại.'
      toast.error(errorMessage, { duration: 5000 })
    }
  }

  const handleSaveTeam = async (event) => {
    event.preventDefault()
    if (!editingTeam) return

    const teamName = (editingTeam.name || '').trim()
    if (!teamName) {
      toast.error('Tên đội là bắt buộc')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        name: teamName,
        short_name: editingTeam.short_name?.trim() ? editingTeam.short_name.trim() : null,
        code: editingTeam.code?.trim() ? editingTeam.code.trim() : null,
        city: editingTeam.city?.trim() ? editingTeam.city.trim() : null,
        country: editingTeam.country?.trim() ? editingTeam.country.trim() : null,
        founded_year: editingTeam.founded_year ? Number(editingTeam.founded_year) : null
      }

      if (isCreating) {
        await TeamsService.createTeam(payload)
        toast.success('Đã tạo đội')
      } else {
        await TeamsService.updateTeam(editingTeam.id, payload)
        toast.success('Đã cập nhật đội')
      }

      closeModal()
      setReloadKey(prev => prev + 1)
    } catch (err) {
      logger.error('Failed to save team', err)
      toast.error(err?.message || 'Không thể lưu đội. Vui lòng thử lại.')
    } finally {
      setIsSaving(false)
    }
  }

  const getStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'active':
        return 'bg-green-500'
      case 'inactive':
        return 'bg-gray-500'
      case 'suspended':
        return 'bg-red-500'
      default:
        return 'bg-blue-500'
    }
  }

  const formatInvitationDate = (dateString) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('vi-VN')
  }

  const formatDeadline = (dateString) => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    const now = new Date()
    const daysLeft = Math.ceil((date - now) / (1000 * 60 * 60 * 24))
    
    if (daysLeft < 0) return <span className="text-red-600 font-semibold">Đã hết hạn</span>
    if (daysLeft === 0) return <span className="text-orange-600 font-semibold">Hết hạn hôm nay</span>
    if (daysLeft <= 3) return <span className="text-orange-600">{daysLeft} ngày còn lại</span>
    return <span className="text-gray-600">{daysLeft} ngày còn lại</span>
  }

  // Generate suggested invitations (Phase 1)
  const handleGenerateSuggested = async () => {
    if (!selectedSeasonId) return
    setGeneratingInvitations(true)
    try {
      const response = await ApiService.post(`/seasons/${selectedSeasonId}/invitations/generate-suggested`)
      toast.success(response?.message || `Đã tạo ${response?.data?.created || 0} lời mời đề xuất`)
      setReloadKey(prev => prev + 1)
    } catch (err) {
      logger.error('Failed to generate invitations', err)
      toast.error(err?.message || 'Không thể tạo danh sách đề xuất')
    } finally {
      setGeneratingInvitations(false)
    }
  }

  // Send all pending invitations (Phase 2)
  const handleSendAllInvitations = async () => {
    if (!selectedSeasonId) return
    const pendingCount = invitations.filter(i => i.status === 'pending' || i.status === 'draft').length
    if (pendingCount === 0) {
      toast.error('Không có lời mời nào cần gửi')
      return
    }
    setSendingInvitations(true)
    try {
      const response = await ApiService.post(`/seasons/${selectedSeasonId}/invitations/send-all`, { deadlineDays: 14 })
      toast.success(response?.message || `Đã gửi ${response?.data?.sent || 0} lời mời`)
      setReloadKey(prev => prev + 1)
    } catch (err) {
      logger.error('Failed to send invitations', err)
      toast.error(err?.message || 'Không thể gửi lời mời')
    } finally {
      setSendingInvitations(false)
    }
  }

  // Update invitation status
  const handleUpdateInvitationStatus = async (invitationId, status, notes = '') => {
    try {
      await ApiService.patch(`/seasons/${selectedSeasonId}/invitations/${invitationId}/status`, { status, responseNotes: notes })
      toast.success('Đã cập nhật trạng thái')
      setReloadKey(prev => prev + 1)
    } catch (err) {
      logger.error('Failed to update invitation status', err)
      toast.error(err?.message || 'Không thể cập nhật trạng thái')
    }
  }

  // Open add invitation modal
  const handleOpenAddInvitationModal = () => {
    setEditingInvitation(null)
    setInvitationForm({
      teamId: '',
      inviteType: 'replacement',
      deadlineDays: 14
    })
    setShowInvitationModal(true)
  }

  // Open edit invitation modal
  const handleOpenEditInvitationModal = (invitation) => {
    setEditingInvitation(invitation)
    setInvitationForm({
      teamId: invitation.teamId,
      inviteType: invitation.inviteType,
      deadlineDays: 14
    })
    setShowInvitationModal(true)
  }

  // Save invitation (add or edit)
  const handleSaveInvitation = async () => {
    if (!invitationForm.teamId) {
      toast.error('Vui lòng chọn đội bóng')
      return
    }

    setSavingInvitation(true)
    try {
      if (editingInvitation) {
        // Update deadline
        await ApiService.patch(`/seasons/${selectedSeasonId}/invitations/${editingInvitation.invitationId}`, {
          deadlineDays: invitationForm.deadlineDays
        })
        toast.success('Đã cập nhật lời mời')
      } else {
        // Add new invitation
        await ApiService.post(`/seasons/${selectedSeasonId}/invitations`, {
          teamId: parseInt(invitationForm.teamId),
          inviteType: invitationForm.inviteType,
          deadlineDays: invitationForm.deadlineDays
        })
        toast.success('Đã thêm lời mời')
      }
      setShowInvitationModal(false)
      setReloadKey(prev => prev + 1)
    } catch (err) {
      logger.error('Failed to save invitation', err)
      toast.error(err?.message || 'Không thể lưu lời mời')
    } finally {
  return (
    <div>
      <Toaster position="top-right" />
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quản lý đội bóng</h1>
            <p className="text-gray-600 mt-2">Quản lý các đội bóng và lời mời tham gia giải đấu.</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={openCreateModal}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={16} />
              <span>Thêm đội</span>
            </button>
            <button
              type="button"
              onClick={() => toast('Xuất dữ liệu chưa được triển khai')}
              className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Download size={16} />
              <span>Xuất</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors bg-white text-blue-600 shadow-sm"
        >
          <Users size={18} />
          <span>Đội bóng</span>
        </button>
        <button
          onClick={() => navigate('/admin/season-registration-workflow')}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          title="Chức năng đã chuyển sang trang Quy trình đăng ký đội"
        >
          <Mail size={18} />
          <span>Lời mời đội bóng →</span>
        </button>
      </div>

      {/* Teams Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo tên, mã đội, hoặc quốc gia..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
                  className={`flex items-center space-x-2 px-4 py-2 border rounded-lg transition-colors ${
                    showAdvancedFilter || Object.values(appliedFilters).some(v => v)
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Filter size={16} />
                  <span>Bộ lọc</span>
                  {Object.values(appliedFilters).filter(v => v).length > 0 && (
                    <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {Object.values(appliedFilters).filter(v => v).length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Advanced Filter Panel */}
            {showAdvancedFilter && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Tất cả</option>
                      <option value="active">Đang hoạt động</option>
                      <option value="inactive">Không hoạt động</option>
                      <option value="suspended">Đình chỉ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quốc gia</label>
                    <input
                      type="text"
                      placeholder="Nhập tên quốc gia..."
                      value={filters.country}
                      onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Năm thành lập từ</label>
                    <input
                      type="number"
                      placeholder="VD: 1900"
                      value={filters.foundedFrom}
                      onChange={(e) => setFilters(prev => ({ ...prev, foundedFrom: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1800"
                      max="2100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Năm thành lập đến</label>
                    <input
                      type="number"
                      placeholder="VD: 2024"
                      value={filters.foundedTo}
                      onChange={(e) => setFilters(prev => ({ ...prev, foundedTo: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1800"
                      max="2100"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFilters({ status: '', country: '', foundedFrom: '', foundedTo: '' })
                      setAppliedFilters({})
                      setReloadKey(prev => prev + 1)
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Xóa bộ lọc
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedFilters({ ...filters })
                      setPagination(prev => ({ ...prev, page: 1 }))
                      setReloadKey(prev => prev + 1)
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Áp dụng
                  </button>
                </div>
              </div>
            )}
          </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Teams ({pagination.total})</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.page <= 1 || loading}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {error && <div className="p-6 text-red-600 bg-red-50 border-b border-red-100">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Founded</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Players</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center space-x-2">
                      <Loader2 className="animate-spin" size={20} />
                      <span>Loading teams...</span>
                    </div>
                  </td>
                </tr>
              ) : teams.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No teams found for the selected criteria.
                  </td>
                </tr>
              ) : (
                teams.map(team => (
                  <tr key={team.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center mr-3 overflow-hidden bg-gray-100 border border-gray-200">
                          {team.logo || team.crest ? (
                            <img 
                              src={team.logo || team.crest} 
                              alt={team.name}
                              className="w-8 h-8 object-contain"
                              onError={(e) => {
                                e.target.style.display = 'none'
                                e.target.nextElementSibling?.classList.remove('hidden')
                              }}
                            />
                          ) : null}
                          <div className={`${team.logo || team.crest ? 'hidden' : ''} w-full h-full flex items-center justify-center ${getStatusColor(team.status)} text-white`}>
                            <Shield size={20} />
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{team.name}</div>
                          <div className="text-gray-500 text-sm">{team.short_name || 'No short name'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded">{team.code || '-'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        {team.city && <div>{team.city}</div>}
                        {team.country && <div className="text-gray-500">{team.country}</div>}
                        {!team.city && !team.country && '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{team.founded_year || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getStatusColor(team.status)}`}
                      >
                        {team.status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{team.playerCount || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/teams/${team.id}`)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="View team details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(team)}
                          className="text-gray-600 hover:text-gray-900 transition-colors"
                          title="Edit team"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(team.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Delete team"
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
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Users size={24} className="text-blue-500 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{pagination.total}</div>
                <div className="text-gray-600 text-sm">Tổng đội bóng</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Shield size={24} className="text-green-500 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{totalPlayers}</div>
                <div className="text-gray-600 text-sm">Tổng cầu thủ</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Trophy size={24} className="text-yellow-500 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{teams.filter(t => t.status === 'active').length}</div>
                <div className="text-gray-600 text-sm">Đội đang hoạt động</div>
              </div>
            </div>
          </div>
        </div>

      {showTeamModal && editingTeam && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{isCreating ? 'Add Team' : 'Edit Team'}</h3>
              <button
                type="button"
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveTeam} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
                <input
                  type="text"
                  value={editingTeam.name}
                  onChange={(e) => setEditingTeam(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={isSaving}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Short Name</label>
                  <input
                    type="text"
                    value={editingTeam.short_name}
                    onChange={(e) => setEditingTeam(prev => ({ ...prev, short_name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                  <input
                    type="text"
                    value={editingTeam.code}
                    onChange={(e) => setEditingTeam(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSaving}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={editingTeam.city}
                    onChange={(e) => setEditingTeam(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={editingTeam.country}
                    onChange={(e) => setEditingTeam(prev => ({ ...prev, country: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSaving}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Founded Year</label>
                <input
                  type="number"
                  value={editingTeam.founded_year}
                  onChange={(e) => setEditingTeam(prev => ({ ...prev, founded_year: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1900"
                  max="2100"
                  disabled={isSaving}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Invitation Modal */}
      {showInvitationModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingInvitation ? 'Sửa lời mời' : 'Thêm lời mời'}
              </h3>
              <button onClick={() => setShowInvitationModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {!editingInvitation && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Đội bóng *</label>
                    <select
                      value={invitationForm.teamId}
                      onChange={(e) => setInvitationForm(prev => ({ ...prev, teamId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={savingInvitation}
                    >
                      <option value="">-- Chọn đội --</option>
                      {teams.map(team => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Loại lời mời</label>
                    <select
                      value={invitationForm.inviteType}
                      onChange={(e) => setInvitationForm(prev => ({ ...prev, inviteType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={savingInvitation}
                    >
                      <option value="replacement">Thay thế / Thủ công</option>
                      <option value="retained">Top 8 mùa trước</option>
                      <option value="promoted">Thăng hạng</option>
                    </select>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hạn trả lời (ngày)</label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={invitationForm.deadlineDays}
                  onChange={(e) => setInvitationForm(prev => ({ ...prev, deadlineDays: parseInt(e.target.value) || 14 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={savingInvitation}
                />
                <p className="mt-1 text-xs text-gray-500">Số ngày đội bóng có để phản hồi lời mời</p>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowInvitationModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={savingInvitation}
              >
                Hủy
              </button>
              <button
                onClick={handleSaveInvitation}
                disabled={savingInvitation || (!editingInvitation && !invitationForm.teamId)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {savingInvitation && <Loader2 size={16} className="animate-spin" />}
                <span>{editingInvitation ? 'Cập nhật' : 'Thêm'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeamsManagement
