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
  Upload,
  Users,
  X,
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Send
} from 'lucide-react'
import TeamsService from '../../../layers/application/services/TeamsService'
import ApiService from '../../../layers/application/services/ApiService'
import SeasonService from '../../../layers/application/services/SeasonService'
import TeamRegistrationWorkflow from '../components/TeamRegistrationWorkflow'

const EMPTY_TEAM = {
  id: null,
  name: '',
  short_name: '',
  code: '',
  city: '',
  country: '',
  founded_year: ''
}

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  accepted: 'bg-green-100 text-green-700 border-green-300',
  declined: 'bg-red-100 text-red-700 border-red-300',
  expired: 'bg-gray-100 text-gray-700 border-gray-300'
}

const STATUS_LABELS = {
  pending: 'Chờ phản hồi',
  accepted: 'Đã chấp nhận',
  declined: 'Đã từ chối',
  expired: 'Hết hạn'
}

const TeamsManagement = () => {
  const navigate = useNavigate()

  // Tab state
  const [activeTab, setActiveTab] = useState('teams') // 'teams' | 'invitations' | 'registration'
  
  // Registration workflow state
  const [registrationRefreshTrigger, setRegistrationRefreshTrigger] = useState(0)

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

  // Invitations state
  const [seasons, setSeasons] = useState([])
  const [selectedSeasonId, setSelectedSeasonId] = useState(null)
  const [invitations, setInvitations] = useState([])
  const [invitationsLoading, setInvitationsLoading] = useState(false)
  const [invitationStats, setInvitationStats] = useState(null)
  const [invitationSubTab, setInvitationSubTab] = useState('overview') // 'overview' | 'list'
  const [generatingInvitations, setGeneratingInvitations] = useState(false)
  const [sendingInvitations, setSendingInvitations] = useState(false)
  const [selectedDraftIds, setSelectedDraftIds] = useState([]) // For checkbox selection
  
  // Add/Edit invitation modal
  const [showInvitationModal, setShowInvitationModal] = useState(false)
  const [editingInvitation, setEditingInvitation] = useState(null)
  const [invitationForm, setInvitationForm] = useState({
    teamId: '',
    inviteType: 'manual',
    deadlineDays: 14
  })
  const [savingInvitation, setSavingInvitation] = useState(false)

  // Load seasons for invitations
  useEffect(() => {
    const loadSeasons = async () => {
      try {
        const data = await SeasonService.listSeasons()
        setSeasons(data || [])
        if (data && data.length > 0 && !selectedSeasonId) {
          setSelectedSeasonId(data[0].id)
        }
      } catch (err) {
        console.error('Failed to load seasons', err)
      }
    }
    loadSeasons()
  }, [])

  // Load invitations when season changes
  useEffect(() => {
    if (!selectedSeasonId || activeTab !== 'invitations') return
    
    const loadInvitations = async () => {
      setInvitationsLoading(true)
      try {
        const response = await ApiService.get(`/seasons/${selectedSeasonId}/invitations`)
        setInvitations(response?.data || [])
        
        // Load stats
        try {
          const statsResponse = await ApiService.get(`/seasons/${selectedSeasonId}/invitations/stats`)
          setInvitationStats(statsResponse?.data || null)
        } catch (e) {
          console.error('Failed to load invitation stats', e)
        }
      } catch (err) {
        console.error('Failed to load invitations', err)
        setInvitations([])
      } finally {
        setInvitationsLoading(false)
      }
    }
    loadInvitations()
  }, [selectedSeasonId, activeTab, reloadKey])

  useEffect(() => {
    if (activeTab !== 'teams') return
    
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
  }, [searchTerm, pagination.page, pagination.limit, reloadKey, activeTab, appliedFilters])

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
  // Logic: 8 đội top 8 BXH mùa trước + 2 đội thăng hạng = 10 đội
  const handleGenerateSuggested = async () => {
    if (!selectedSeasonId) return
    setGeneratingInvitations(true)
    try {
      const response = await ApiService.post(`/seasons/${selectedSeasonId}/invitations/generate-suggested`)
      
      // Show success message
      toast.success(response?.message || `Đã tạo ${response?.data?.created || 0} lời mời đề xuất`)
      
      // Show warnings if any
      const warnings = response?.warnings || response?.data?.errors || []
      if (warnings.length > 0) {
        setTimeout(() => {
          warnings.forEach((warning, index) => {
            setTimeout(() => {
              toast(warning, { icon: '⚠️', duration: 6000 })
            }, index * 500)
          })
        }, 1000)
      }
      
      setReloadKey(prev => prev + 1)
    } catch (err) {
      logger.error('Failed to generate invitations', err)
      const errorMsg = err?.response?.data?.error || err?.message || 'Không thể tạo danh sách đề xuất'
      const details = err?.response?.data?.details
      toast.error(details ? `${errorMsg}: ${details}` : errorMsg)
    } finally {
      setGeneratingInvitations(false)
    }
  }

  // Get draft invitations count
  const draftInvitations = useMemo(() => {
    return invitations.filter(i => i.status === 'draft')
  }, [invitations])

  // Toggle selection for a draft invitation
  const handleToggleSelect = (invitationId) => {
    setSelectedDraftIds(prev => 
      prev.includes(invitationId) 
        ? prev.filter(id => id !== invitationId)
        : [...prev, invitationId]
    )
  }

  // Toggle select all drafts
  const handleToggleSelectAll = () => {
    if (selectedDraftIds.length === draftInvitations.length) {
      setSelectedDraftIds([])
    } else {
      setSelectedDraftIds(draftInvitations.map(i => i.invitationId))
    }
  }

  // Send a single invitation (DRAFT_INVITE -> INVITED)
  const handleSendSingleInvitation = async (invitationId) => {
    setSendingInvitations(true)
    try {
      await ApiService.patch(`/seasons/${selectedSeasonId}/invitations/${invitationId}/status`, { 
        status: 'INVITED' 
      })
      toast.success('Đã gửi lời mời')
      setSelectedDraftIds(prev => prev.filter(id => id !== invitationId))
      setReloadKey(prev => prev + 1)
    } catch (err) {
      logger.error('Failed to send invitation', err)
      const errorMsg = err?.response?.data?.error || err?.message || 'Không thể gửi lời mời'
      // If already sent, just reload to refresh status
      if (errorMsg.includes('Invalid state transition') || errorMsg.includes('INVITED')) {
        toast.error('Lời mời này đã được gửi trước đó. Đang tải lại...')
        setReloadKey(prev => prev + 1)
      } else {
        toast.error(errorMsg)
      }
    } finally {
      setSendingInvitations(false)
    }
  }

  // Send selected invitations
  const handleSendSelectedInvitations = async () => {
    if (selectedDraftIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất một lời mời')
      return
    }
    
    setSendingInvitations(true)
    let sent = 0
    let skipped = 0
    let failed = 0
    
    try {
      for (const invitationId of selectedDraftIds) {
        try {
          await ApiService.patch(`/seasons/${selectedSeasonId}/invitations/${invitationId}/status`, { 
            status: 'INVITED' 
          })
          sent++
        } catch (err) {
          const errorMsg = err?.response?.data?.error || err?.message || ''
          // Skip already-sent items
          if (errorMsg.includes('Invalid state transition') || errorMsg.includes('INVITED')) {
            skipped++
          } else {
            failed++
            logger.error(`Failed to send invitation ${invitationId}`, err)
          }
        }
      }
      
      if (sent > 0) {
        let msg = `Đã gửi ${sent} lời mời`
        if (skipped > 0) msg += `, ${skipped} đã gửi trước`
        if (failed > 0) msg += `, ${failed} lỗi`
        toast.success(msg)
      } else if (skipped > 0) {
        toast.info(`${skipped} lời mời đã được gửi trước đó`)
      } else {
        toast.error('Không thể gửi lời mời')
      }
      
      setSelectedDraftIds([])
      setReloadKey(prev => prev + 1)
    } catch (err) {
      logger.error('Failed to send invitations', err)
      toast.error(err?.message || 'Không thể gửi lời mời')
    } finally {
      setSendingInvitations(false)
    }
  }

  // Send all draft invitations (Phase 2)
  const handleSendAllInvitations = async () => {
    if (!selectedSeasonId) return
    const draftCount = draftInvitations.length
    if (draftCount === 0) {
      toast.error('Không có lời mời nháp nào cần gửi')
      return
    }
    
    if (!window.confirm(`Bạn có chắc muốn gửi tất cả ${draftCount} lời mời?`)) {
      return
    }
    
    setSendingInvitations(true)
    try {
      const response = await ApiService.post(`/seasons/${selectedSeasonId}/invitations/send-all`, { deadlineDays: 14 })
      toast.success(response?.message || `Đã gửi ${response?.data?.sent || 0} lời mời`)
      setSelectedDraftIds([])
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
      // Handle specific error cases
      const errorMsg = err?.response?.data?.error || err?.message || 'Không thể lưu lời mời'
      toast.error(errorMsg)
    } finally {
      setSavingInvitation(false)
    }
  }

  // Delete invitation
  const handleDeleteInvitation = async (invitationId) => {
    if (!confirm('Bạn có chắc muốn xóa lời mời này?')) return

    try {
      await ApiService.delete(`/seasons/${selectedSeasonId}/invitations/${invitationId}`)
      toast.success('Đã xóa lời mời')
      setReloadKey(prev => prev + 1)
    } catch (err) {
      logger.error('Failed to delete invitation', err)
      toast.error(err?.message || 'Không thể xóa lời mời')
    }
  }

  const getInviteTypeLabel = (type) => {
    const labels = {
      'retained': 'Top 8 mùa trước',
      'promoted': 'Thăng hạng',
      'promotion': 'Đề xuất',
      'replacement': 'Thay thế',
      'manual': 'Thủ công'
    }
    return labels[type] || type || 'Khác'
  }

  const getInviteTypeBadgeColor = (type) => {
    const colors = {
      'retained': 'bg-blue-500 text-white border-blue-600',
      'promoted': 'bg-green-500 text-white border-green-600',
      'promotion': 'bg-indigo-100 text-indigo-700 border-indigo-300',
      'replacement': 'bg-orange-500 text-white border-orange-600',
      'manual': 'bg-purple-100 text-purple-700 border-purple-300'
    }
    return colors[type] || 'bg-gray-200 text-gray-700 border-gray-400'
  }

  const getStatusBadgeColor = (status) => {
    const colors = {
      'draft': 'bg-gray-200 text-gray-700 border-gray-400',
      'pending': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'accepted': 'bg-green-100 text-green-700 border-green-200',
      'declined': 'bg-red-100 text-red-700 border-red-200',
      'submitted': 'bg-blue-100 text-blue-700 border-blue-200',
      'changes_requested': 'bg-orange-100 text-orange-700 border-orange-200',
      'approved': 'bg-green-200 text-green-800 border-green-400',
      'rejected': 'bg-red-200 text-red-800 border-red-400',
      'expired': 'bg-gray-100 text-gray-500 border-gray-200',
      'rescinded': 'bg-purple-100 text-purple-600 border-purple-200',
      'replaced': 'bg-purple-100 text-purple-600 border-purple-200'
    }
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  const getStatusLabel = (status) => {
    const labels = {
      'draft': 'Nháp (chưa gửi)',
      'pending': 'Đã gửi - Chờ phản hồi',
      'accepted': 'Đã chấp nhận',
      'declined': 'Đã từ chối',
      'submitted': 'Đã nộp hồ sơ',
      'changes_requested': 'Yêu cầu chỉnh sửa',
      'approved': 'Đã duyệt',
      'rejected': 'Không duyệt',
      'expired': 'Hết hạn',
      'rescinded': 'Đã thu hồi',
      'replaced': 'Đã thay thế'
    }
    return labels[status] || status
  }

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
            {activeTab === 'teams' && (
              <>
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
              </>
            )}
            {activeTab === 'invitations' && selectedSeasonId && (
              <button
                onClick={() => setReloadKey(prev => prev + 1)}
                className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Loader2 size={16} className={invitationsLoading ? 'animate-spin' : ''} />
                <span>Làm mới</span>
              </button>
            )}
            {activeTab === 'registration' && selectedSeasonId && (
              <button
                onClick={() => setRegistrationRefreshTrigger(prev => prev + 1)}
                className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Loader2 size={16} />
                <span>Làm mới</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('teams')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'teams'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users size={18} />
          <span>Đội bóng</span>
        </button>
        <button
          onClick={() => setActiveTab('invitations')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'invitations'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Mail size={18} />
          <span>Lời mời đội bóng</span>
        </button>
        <button
          onClick={() => setActiveTab('registration')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'registration'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <CheckCircle2 size={18} />
          <span>Đăng ký đội</span>
        </button>
      </div>

      {/* Teams Tab Content */}
      {activeTab === 'teams' && (
        <>
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
      </>
      )}

      {/* Invitations Tab Content */}
      {activeTab === 'invitations' && (
        <>
          {/* Season Selector and Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">Mùa giải:</label>
                <select
                  value={selectedSeasonId || ''}
                  onChange={(e) => setSelectedSeasonId(e.target.value ? parseInt(e.target.value) : null)}
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Chọn mùa giải...</option>
                  {seasons.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.name}
                    </option>
                  ))}
                </select>
              </div>
              {selectedSeasonId && (
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={handleOpenAddInvitationModal}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <Plus size={16} />
                    <span>Thêm lời mời</span>
                  </button>
                  <button
                    onClick={handleGenerateSuggested}
                    disabled={generatingInvitations}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {generatingInvitations ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    <span>Tạo danh sách đề xuất</span>
                  </button>
                  {selectedDraftIds.length > 0 && (
                    <button
                      onClick={handleSendSelectedInvitations}
                      disabled={sendingInvitations}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {sendingInvitations ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      <span>Gửi đã chọn ({selectedDraftIds.length})</span>
                    </button>
                  )}
                  <button
                    onClick={handleSendAllInvitations}
                    disabled={sendingInvitations || draftInvitations.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {sendingInvitations ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    <span>Gửi tất cả ({draftInvitations.length})</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sub-tabs */}
          {selectedSeasonId && (
            <div className="mb-4 flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => setInvitationSubTab('overview')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  invitationSubTab === 'overview' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Tổng quan
              </button>
              <button
                onClick={() => setInvitationSubTab('list')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  invitationSubTab === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Danh sách lời mời
              </button>
            </div>
          )}

          {/* Overview Sub-tab */}
          {selectedSeasonId && invitationSubTab === 'overview' && invitationStats && (
            <div className="space-y-6">
              {/* Progress Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tiến độ mời đội</h3>
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Đội đủ điều kiện</span>
                    <span className="font-semibold">{invitationStats.qualified || invitationStats.acceptedCount || 0} / 10</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-4 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, ((invitationStats.qualified || invitationStats.acceptedCount || 0) / 10) * 100)}%` }}
                    />
                  </div>
                </div>
                {(invitationStats.qualified || invitationStats.acceptedCount) >= 10 && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2 size={20} className="text-green-600" />
                    <span className="text-green-700 font-medium">Đã đủ 10 đội! Có thể sinh lịch thi đấu.</span>
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">Tổng mời</p>
                  <p className="text-2xl font-bold text-gray-900">{invitationStats.total || invitations.length}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">Chờ phản hồi</p>
                  <p className="text-2xl font-bold text-yellow-600">{invitationStats.totalPending || invitationStats.sent || 0}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">Đã chấp nhận</p>
                  <p className="text-2xl font-bold text-green-600">{invitationStats.acceptedCount || 0}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">Đã từ chối</p>
                  <p className="text-2xl font-bold text-red-600">{invitationStats.totalDeclined || 0}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">Hết hạn</p>
                  <p className="text-2xl font-bold text-gray-500">{invitationStats.totalExpired || 0}</p>
                </div>
              </div>

              {/* Quick Status Summary */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tình trạng theo loại mời</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['retained', 'promoted', 'replacement'].map(type => {
                    const typeInvs = invitations.filter(i => i.inviteType === type)
                    if (typeInvs.length === 0) return null
                    return (
                      <div key={type} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getInviteTypeBadgeColor(type)}`}>
                            {getInviteTypeLabel(type)}
                          </span>
                          <span className="text-gray-600 text-sm">({typeInvs.length} đội)</span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Chấp nhận:</span>
                            <span className="font-medium text-green-600">{typeInvs.filter(i => i.status === 'accepted').length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Chờ:</span>
                            <span className="font-medium text-yellow-600">{typeInvs.filter(i => i.status === 'pending' || i.status === 'sent').length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Từ chối:</span>
                            <span className="font-medium text-red-600">{typeInvs.filter(i => i.status === 'declined' || i.status === 'rejected').length}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* List Sub-tab */}
          {selectedSeasonId && invitationSubTab === 'list' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {invitationsLoading ? (
                <div className="text-center py-12">
                  <Loader2 size={32} className="animate-spin mx-auto text-blue-500" />
                  <p className="mt-4 text-gray-500">Đang tải...</p>
                </div>
              ) : invitations.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Mail size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="mb-4">Chưa có lời mời nào cho mùa giải này</p>
                  <button
                    onClick={handleGenerateSuggested}
                    disabled={generatingInvitations}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {generatingInvitations ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    <span>Tạo danh sách đề xuất</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Info banner for draft invitations */}
                  {draftInvitations.length > 0 && (
                    <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-800">
                        <AlertCircle size={16} />
                        <span className="text-sm">
                          Có <strong>{draftInvitations.length}</strong> lời mời nháp chưa gửi. 
                          Chọn lời mời và bấm "Gửi đã chọn" hoặc "Gửi tất cả" để gửi cho đội bóng.
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {/* Checkbox column for draft items */}
                        <th className="px-3 py-3 text-center w-12">
                          {draftInvitations.length > 0 && (
                            <input
                              type="checkbox"
                              checked={selectedDraftIds.length === draftInvitations.length && draftInvitations.length > 0}
                              onChange={handleToggleSelectAll}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              title="Chọn tất cả nháp"
                            />
                          )}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đội bóng</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nguồn</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hạn</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {invitations.map((inv) => (
                        <tr key={inv.invitationId} className={`hover:bg-gray-50 transition-colors ${inv.status === 'draft' ? 'bg-amber-50/50' : ''}`}>
                          {/* Checkbox for draft items */}
                          <td className="px-3 py-4 text-center">
                            {inv.status === 'draft' && (
                              <input
                                type="checkbox"
                                checked={selectedDraftIds.includes(inv.invitationId)}
                                onChange={() => handleToggleSelect(inv.invitationId)}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {inv.teamLogo ? (
                                <img src={inv.teamLogo} alt="" className="w-8 h-8 object-contain" />
                              ) : (
                                <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                                  <Shield size={16} className="text-gray-400" />
                                </div>
                              )}
                              <div>
                                <div className="font-semibold text-gray-900">{inv.teamName}</div>
                                {inv.shortName && <div className="text-sm text-gray-500">{inv.shortName}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full border ${getInviteTypeBadgeColor(inv.inviteType)}`}>
                              {getInviteTypeLabel(inv.inviteType)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeColor(inv.status)}`}>
                              {getStatusLabel(inv.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">{formatDeadline(inv.responseDeadline)}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {/* Draft status - show send button */}
                              {inv.status === 'draft' && (
                                <>
                                  <button
                                    onClick={() => handleSendSingleInvitation(inv.invitationId)}
                                    disabled={sendingInvitations}
                                    className="text-xs px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                                    title="Gửi lời mời này"
                                  >
                                    <Send size={12} />
                                    <span>Gửi</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteInvitation(inv.invitationId)}
                                    className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                                    title="Xóa lời mời"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                              {/* Pending status - waiting for team response */}
                              {inv.status === 'pending' && (
                                <>
                                  <span className="text-xs text-yellow-600 italic">Chờ đội phản hồi...</span>
                                  {/* Edit & Delete buttons */}
                                  <button
                                    onClick={() => handleOpenEditInvitationModal(inv)}
                                    className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                    title="Sửa hạn trả lời"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteInvitation(inv.invitationId)}
                                    className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                                    title="Thu hồi lời mời"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                              {inv.status === 'accepted' && (
                                <span className="text-xs text-green-600 font-medium">✓ Đội đã chấp nhận</span>
                              )}
                              {inv.status === 'declined' && (
                                <span className="text-xs text-red-600">✗ Đội đã từ chối</span>
                              )}
                              {inv.status === 'submitted' && (
                                <span className="text-xs text-blue-600 font-medium">📋 Đã nộp hồ sơ</span>
                              )}
                              {inv.status === 'approved' && (
                                <span className="text-xs text-emerald-600 font-medium">✓ Đã duyệt</span>
                              )}
                              {inv.status === 'expired' && (
                                <span className="text-xs text-gray-400">⏱ Đã hết hạn</span>
                              )}
                              {inv.status === 'rescinded' && (
                                <span className="text-xs text-purple-600">↩ Đã thu hồi</span>
                              )}
                              {inv.status === 'replaced' && (
                                <span className="text-xs text-purple-600">🔄 Đã thay thế</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* No Season Selected */}
          {!selectedSeasonId && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center text-gray-500">
              <Mail size={48} className="mx-auto mb-4 opacity-50" />
              <p>Vui lòng chọn mùa giải để xem và quản lý lời mời</p>
            </div>
          )}
        </>
      )}

      {/* Registration Workflow Tab Content */}
      {activeTab === 'registration' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Users size={28} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Quy trình đăng ký đội tham gia mùa giải
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  Quản lý toàn bộ quy trình từ mời đội → nộp hồ sơ → duyệt → xếp lịch
                </p>
              </div>
            </div>
          </div>

          {/* Season Selector */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chọn mùa giải
            </label>
            <select
              value={selectedSeasonId || ''}
              onChange={(e) => setSelectedSeasonId(parseInt(e.target.value, 10))}
              className="w-full md:w-96 px-4 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {seasons.length === 0 ? (
                <option value="">Không có mùa giải nào</option>
              ) : (
                seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name} ({season.start_date} - {season.end_date})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Workflow Diagram */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-cyan-600 mb-4">Quy trình Workflow</h3>
            <div className="flex items-center justify-between text-sm overflow-x-auto pb-2">
              <div className="flex flex-col items-center min-w-[100px]">
                <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mb-2">
                  <span className="text-2xl">📝</span>
                </div>
                <span className="font-medium text-gray-900">Bản nháp</span>
                <span className="text-xs text-gray-500">DRAFT_INVITE</span>
              </div>
              
              <div className="text-blue-400 text-2xl">→</div>
              
              <div className="flex flex-col items-center min-w-[100px]">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-2">
                  <span className="text-2xl">📧</span>
                </div>
                <span className="font-medium text-gray-900">Gửi lời mời</span>
                <span className="text-xs text-gray-500">INVITED</span>
              </div>
              
              <div className="text-blue-400 text-2xl">→</div>
              
              <div className="flex flex-col items-center min-w-[100px]">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-2">
                  <span className="text-2xl">👍</span>
                </div>
                <span className="font-medium text-gray-900">Chấp nhận</span>
                <span className="text-xs text-gray-500">ACCEPTED</span>
              </div>
              
              <div className="text-blue-400 text-2xl">→</div>
              
              <div className="flex flex-col items-center min-w-[100px]">
                <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mb-2">
                  <span className="text-2xl">📄</span>
                </div>
                <span className="font-medium text-gray-900">Nộp hồ sơ</span>
                <span className="text-xs text-gray-500">SUBMITTED</span>
              </div>
              
              <div className="text-blue-400 text-2xl">→</div>
              
              <div className="flex flex-col items-center min-w-[100px]">
                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mb-2">
                  <span className="text-2xl">✅</span>
                </div>
                <span className="font-medium text-gray-900">Duyệt</span>
                <span className="text-xs text-gray-500">APPROVED</span>
              </div>
              
              <div className="text-blue-400 text-2xl">→</div>
              
              <div className="flex flex-col items-center min-w-[100px]">
                <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center mb-2">
                  <span className="text-2xl">📅</span>
                </div>
                <span className="font-medium text-gray-900">Xếp lịch</span>
                <span className="text-xs text-gray-500">≥10 đội</span>
              </div>
            </div>
            
            {/* Alternative Flow */}
            <div className="mt-4 pt-4 border-t border-gray-300">
              <p className="text-xs text-yellow-600 mb-2 font-semibold">
                <strong>Luồng xử lý khác:</strong>
              </p>
              <div className="flex gap-4 text-xs text-gray-600">
                <span>• DECLINED: Đội từ chối → Tìm đội thay thế</span>
                <span>• REQUEST_CHANGE: BTC yêu cầu sửa → SUBMITTED (lại)</span>
                <span>• REJECTED: Không đạt → Loại → Tìm đội thay thế</span>
              </div>
            </div>
          </div>

          {/* Workflow Component */}
          {selectedSeasonId ? (
            <TeamRegistrationWorkflow 
              seasonId={selectedSeasonId} 
              refreshTrigger={registrationRefreshTrigger}
            />
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center text-gray-500">
              <CheckCircle2 size={48} className="mx-auto mb-4 opacity-50" />
              <p>Vui lòng chọn mùa giải để xem quy trình đăng ký</p>
            </div>
          )}

          {/* Help Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              📖 Hướng dẫn sử dụng
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Bước 1:</strong> BTC tạo danh sách lời mời (Top 8 + 2 đội thăng hạng) → Trạng thái DRAFT_INVITE</p>
              <p><strong>Bước 2:</strong> BTC bấm "Gửi tất cả lời mời" → Gửi thông báo cho các đội → Trạng thái INVITED</p>
              <p><strong>Bước 3:</strong> Đội bóng chấp nhận/từ chối trong vòng 2 tuần → ACCEPTED hoặc DECLINED</p>
              <p><strong>Bước 4:</strong> Đội nộp hồ sơ (sân, áo, cầu thủ) → SUBMITTED</p>
              <p><strong>Bước 5:</strong> BTC duyệt hồ sơ → APPROVED (hoặc REQUEST_CHANGE / REJECTED)</p>
              <p><strong>Bước 6:</strong> Khi đủ 10 đội APPROVED → Hệ thống sẵn sàng xếp lịch thi đấu</p>
            </div>
          </div>
        </div>
      )}

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
                      {teams
                        .filter(team => !invitations.some(inv => inv.teamId === team.id))
                        .map(team => (
                          <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                    </select>
                    {teams.filter(team => !invitations.some(inv => inv.teamId === team.id)).length === 0 && (
                      <p className="mt-1 text-xs text-amber-600">Tất cả đội đã có lời mời cho mùa giải này</p>
                    )}
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
