import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Edit2,
  Edit3,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Trash2
} from 'lucide-react'
import toast from 'react-hot-toast'

import SeasonFormModal from '../components/SeasonFormModal'
import ConfirmationModal from '../components/ConfirmationModal'
import RulesetForm from '../components/RulesetForm'
import SeasonService from '../../../layers/application/services/SeasonService'
import RulesetService from '../../../layers/application/services/RulesetService'

// =====================================================================
// CONSTANTS
// =====================================================================
const MAIN_TABS = [
  { id: 'seasons', label: 'Mùa giải', icon: Calendar },
  { id: 'rulesets', label: 'Bộ quy tắc', icon: Settings }
]

const STATUS_STYLES = {
  draft: 'bg-gray-100 text-gray-700',
  inviting: 'bg-blue-100 text-blue-700',
  registering: 'bg-indigo-100 text-indigo-700',
  scheduled: 'bg-sky-100 text-sky-700',
  in_progress: 'bg-green-100 text-green-700',
  completed: 'bg-emerald-100 text-emerald-700',
  locked: 'bg-red-100 text-red-700',
  archived: 'bg-slate-200 text-slate-600'
}

const STATUS_LABELS = {
  draft: 'Nháp',
  inviting: 'Mời tham dự',
  registering: 'Đăng ký',
  scheduled: 'Lên lịch',
  in_progress: 'Đang diễn ra',
  completed: 'Đã kết thúc',
  locked: 'Đã khóa',
  archived: 'Lưu trữ'
}

const LOCKED_STATUSES = new Set(['locked', 'completed', 'archived'])

// =====================================================================
// HELPER FUNCTIONS
// =====================================================================
const formatDateRange = (start, end) => {
  if (!start && !end) return '--'
  if (start && !end) return `${start} →`
  if (!start && end) return `→ ${end}`
  return `${start} → ${end}`
}

const formatCurrency = (value) => {
  const amount = Number(value ?? 0)
  if (!Number.isFinite(amount) || amount === 0) return '—'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(amount)
}

const formatDateTime = (value) => {
  if (!value) return '--'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

const statusBadgeClass = (isActive) =>
  isActive
    ? 'inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700'
    : 'inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600'

// =====================================================================
// MAIN COMPONENT
// =====================================================================
const SeasonAndRulesPage = () => {
  const [mainTab, setMainTab] = useState('seasons')
  
  // ===== SEASON STATE =====
  const [seasons, setSeasons] = useState([])
  const [metadata, setMetadata] = useState({ statuses: [], tournaments: [], rulesets: [] })
  const [isLoadingSeasons, setIsLoadingSeasons] = useState(true)
  const [seasonError, setSeasonError] = useState(null)
  const [seasonSuccess, setSeasonSuccess] = useState(null)
  const [isSeasonModalOpen, setIsSeasonModalOpen] = useState(false)
  const [isSavingSeason, setIsSavingSeason] = useState(false)
  const [editingSeason, setEditingSeason] = useState(null)
  const [seasonToDelete, setSeasonToDelete] = useState(null)
  
  // ===== RULESET STATE =====
  const [rulesets, setRulesets] = useState([])
  const [selectedRulesetId, setSelectedRulesetId] = useState(null)
  const [selectedRuleset, setSelectedRuleset] = useState(null)
  const [listLoading, setListLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isRulesetFormOpen, setIsRulesetFormOpen] = useState(false)
  const [rulesetFormMode, setRulesetFormMode] = useState('create')
  const [isSavingRuleset, setIsSavingRuleset] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isDeletingRuleset, setIsDeletingRuleset] = useState(false)
  const [isAssigningSeason, setIsAssigningSeason] = useState(false)
  const [seasonAssignmentInput, setSeasonAssignmentInput] = useState('')
  const [detailReloadKey, setDetailReloadKey] = useState(0)

  // =====================================================================
  // SEASON FUNCTIONS
  // =====================================================================
  const loadMetadata = useCallback(async () => {
    try {
      const data = await SeasonService.getMetadata()
      setMetadata(data)
    } catch (err) {
      console.error(err)
      setSeasonError('Không thể tải dữ liệu cấu hình cho mùa giải.')
    }
  }, [])

  const loadSeasons = useCallback(async () => {
    setIsLoadingSeasons(true)
    setSeasonError(null)
    try {
      const data = await SeasonService.listSeasons()
      setSeasons(data)
    } catch (err) {
      console.error(err)
      setSeasonError('Không thể tải danh sách mùa giải.')
      setSeasons([])
    } finally {
      setIsLoadingSeasons(false)
    }
  }, [])

  const handleOpenSeasonModal = (season = null) => {
    if (season && LOCKED_STATUSES.has(String(season.status).toLowerCase())) {
      setSeasonError('Mùa giải đang bị khóa và không thể chỉnh sửa.')
      setSeasonSuccess(null)
      return
    }
    setEditingSeason(season)
    setIsSeasonModalOpen(true)
    setSeasonError(null)
    setSeasonSuccess(null)
  }

  const closeSeasonModal = () => {
    setIsSeasonModalOpen(false)
    setEditingSeason(null)
  }

  const handleSaveSeason = async (payload) => {
    setIsSavingSeason(true)
    setSeasonError(null)
    setSeasonSuccess(null)
    try {
      if (editingSeason) {
        await SeasonService.updateSeason(editingSeason.id, payload)
        setSeasonSuccess('Đã cập nhật mùa giải thành công.')
      } else {
        await SeasonService.createSeason(payload)
        setSeasonSuccess('Đã tạo mùa giải mới thành công.')
      }
      closeSeasonModal()
      await loadSeasons()
    } catch (err) {
      console.error(err)
      setSeasonError(err.message || 'Không thể lưu mùa giải. Vui lòng thử lại.')
    } finally {
      setIsSavingSeason(false)
    }
  }

  const handleDeleteSeason = async () => {
    if (!seasonToDelete) return
    setSeasonError(null)
    setSeasonSuccess(null)
    try {
      await SeasonService.deleteSeason(seasonToDelete.id)
      setSeasonSuccess(`Đã xóa mùa giải "${seasonToDelete.name}".`)
      setSeasonToDelete(null)
      await loadSeasons()
    } catch (err) {
      console.error(err)
      setSeasonError(err.message || 'Không thể xóa mùa giải. Vui lòng thử lại.')
    }
  }

  // =====================================================================
  // RULESET FUNCTIONS
  // =====================================================================
  const loadRulesets = useCallback(
    async ({ preferredId, silent = false } = {}) => {
      if (!silent) setListLoading(true)
      try {
        const data = await RulesetService.listRulesets()
        setRulesets(data)
        setSelectedRulesetId((currentId) => {
          const desiredId = preferredId ?? currentId
          if (desiredId && data.some((item) => item.id === desiredId)) {
            return desiredId
          }
          return data[0]?.id ?? null
        })
      } catch (error) {
        console.error(error)
        toast.error('Không thể tải danh sách bộ quy tắc.')
        setRulesets([])
        setSelectedRulesetId(null)
      } finally {
        if (!silent) setListLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    loadMetadata()
    loadSeasons()
    loadRulesets()
  }, [loadMetadata, loadSeasons, loadRulesets])

  useEffect(() => {
    setSeasonAssignmentInput('')
  }, [selectedRulesetId])

  useEffect(() => {
    if (!selectedRulesetId) {
      setSelectedRuleset(null)
      return
    }

    let cancelled = false
    setDetailLoading(true)

    const fetchDetail = async () => {
      try {
        const detail = await RulesetService.getRulesetById(selectedRulesetId)
        if (!cancelled) setSelectedRuleset(detail)
      } catch (error) {
        console.error(error)
        if (!cancelled) {
          toast.error('Không thể tải chi tiết bộ quy tắc.')
          setSelectedRuleset(null)
        }
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    }

    fetchDetail()
    return () => { cancelled = true }
  }, [selectedRulesetId, detailReloadKey])

  const filteredRulesets = useMemo(() => {
    if (!searchTerm.trim()) return rulesets
    const keyword = searchTerm.trim().toLowerCase()
    return rulesets.filter(
      (ruleset) =>
        ruleset.name.toLowerCase().includes(keyword) ||
        ruleset.versionTag.toLowerCase().includes(keyword)
    )
  }, [rulesets, searchTerm])

  const rulesetStats = useMemo(() => {
    const total = rulesets.length
    const active = rulesets.filter((item) => item.isActive).length
    const latestUpdated = rulesets.reduce((latest, item) => {
      if (!item.updatedAt) return latest
      const time = new Date(item.updatedAt).getTime()
      if (!Number.isFinite(time)) return latest
      return time > latest ? time : latest
    }, 0)
    return {
      total,
      active,
      inactive: total - active,
      latestUpdated: latestUpdated ? formatDateTime(latestUpdated) : 'N/A'
    }
  }, [rulesets])

  const seasonAssignments = selectedRuleset?.seasonAssignments ?? []

  const resolveSeasonLabel = useCallback(
    (assignment) => {
      if (!assignment) return ''
      if (assignment.seasonName) return assignment.seasonName
      const season = seasons.find((item) => item.id === assignment.seasonId)
      return season?.name ?? `Mùa giải #${assignment.seasonId}`
    },
    [seasons]
  )

  const closeRulesetForm = () => {
    setIsRulesetFormOpen(false)
    setRulesetFormMode('create')
  }

  const openCreateRulesetModal = () => {
    setRulesetFormMode('create')
    setIsRulesetFormOpen(true)
  }

  const openEditRulesetModal = () => {
    if (!selectedRuleset) {
      toast.error('Hãy chọn một bộ quy tắc trước.')
      return
    }
    setRulesetFormMode('edit')
    setIsRulesetFormOpen(true)
  }

  const refreshSelectedRuleset = () => {
    setDetailReloadKey((prev) => prev + 1)
  }

  const handleSaveRuleset = async (payload) => {
    setIsSavingRuleset(true)
    try {
      const saved = await RulesetService.saveRuleset(payload)
      toast.success(payload.id ? 'Đã cập nhật bộ quy tắc.' : 'Đã tạo bộ quy tắc mới.')
      closeRulesetForm()
      await loadRulesets({ preferredId: saved.id, silent: true })
      setSelectedRulesetId(saved.id)
      refreshSelectedRuleset()
    } catch (error) {
      console.error(error)
      toast.error(error?.message ?? 'Không thể lưu bộ quy tắc.')
    } finally {
      setIsSavingRuleset(false)
    }
  }

  const handlePublishRuleset = async () => {
    if (!selectedRulesetId) return
    setIsPublishing(true)
    try {
      await RulesetService.publishRuleset(selectedRulesetId)
      toast.success('Đã xuất bản bộ quy tắc.')
      await loadRulesets({ preferredId: selectedRulesetId, silent: true })
      refreshSelectedRuleset()
    } catch (error) {
      console.error(error)
      toast.error('Không thể xuất bản bộ quy tắc.')
    } finally {
      setIsPublishing(false)
    }
  }

  const handleDeleteRuleset = async () => {
    if (!selectedRulesetId) return
    const confirmed = window.confirm(
      'Xóa bộ quy tắc sẽ xóa tất cả ràng buộc. Hành động này không thể hoàn tác. Tiếp tục?'
    )
    if (!confirmed) return
    setIsDeletingRuleset(true)
    try {
      await RulesetService.deleteRuleset(selectedRulesetId)
      toast.success('Đã xóa bộ quy tắc.')
      setSelectedRuleset(null)
      await loadRulesets()
    } catch (error) {
      console.error(error)
      toast.error('Không thể xóa bộ quy tắc.')
    } finally {
      setIsDeletingRuleset(false)
    }
  }

  const handleAssignSeason = async (event) => {
    event.preventDefault()
    if (!selectedRulesetId) return
    const value = seasonAssignmentInput.trim()
    const seasonId = Number(value)
    if (!value || !Number.isFinite(seasonId) || seasonId <= 0 || !Number.isInteger(seasonId)) {
      toast.error('Hãy chọn mùa giải hợp lệ.')
      return
    }

    setIsAssigningSeason(true)
    try {
      await RulesetService.assignRulesetToSeason(seasonId, selectedRulesetId)
      toast.success(`Đã liên kết bộ quy tắc với mùa giải.`)
      setSeasonAssignmentInput('')
      refreshSelectedRuleset()
    } catch (error) {
      console.error(error)
      toast.error('Không thể gán bộ quy tắc cho mùa giải.')
    } finally {
      setIsAssigningSeason(false)
    }
  }

  const rulesetModalInitialData =
    rulesetFormMode === 'edit' && selectedRuleset
      ? {
          id: selectedRuleset.id,
          name: selectedRuleset.name,
          versionTag: selectedRuleset.versionTag,
          description: selectedRuleset.description ?? '',
          parameters: selectedRuleset.parameters
        }
      : {}

  // =====================================================================
  // RENDER SEASONS TAB
  // =====================================================================
  const renderSeasonsTab = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Danh sách mùa giải</h2>
          <p className="text-gray-600">Tạo mới, chỉnh sửa và lưu trữ các mùa giải nội bộ.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => loadSeasons()}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
            disabled={isLoadingSeasons}
          >
            <RefreshCw size={18} className={isLoadingSeasons ? 'animate-spin' : ''} />
            Làm mới
          </button>
          <button
            onClick={() => handleOpenSeasonModal()}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
          >
            <Plus size={18} />
            Tạo Mùa giải mới
          </button>
        </div>
      </div>

      {/* Alerts */}
      {seasonError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} />
          <span>{seasonError}</span>
        </div>
      )}

      {seasonSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 size={18} />
          <span>{seasonSuccess}</span>
        </div>
      )}

      {/* Seasons Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Mùa giải</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Giải đấu</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Bộ điều lệ</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Thời gian</th>
                <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Trạng thái</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Phí tham dự</th>
                <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {isLoadingSeasons ? (
                <tr>
                  <td colSpan={7} className="py-12">
                    <div className="flex flex-col items-center justify-center gap-3 text-gray-500">
                      <Loader2 className="animate-spin" size={32} />
                      <span>Đang tải dữ liệu mùa giải...</span>
                    </div>
                  </td>
                </tr>
              ) : seasons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-500">
                    <p className="text-lg font-medium">Chưa có mùa giải nào</p>
                    <p className="text-sm text-gray-400">Nhấn &quot;Tạo Mùa giải mới&quot; để bắt đầu.</p>
                  </td>
                </tr>
              ) : (
                seasons.map((season) => {
                  const statusStyle = STATUS_STYLES[season.status] ?? 'bg-gray-100 text-gray-700'
                  const statusLabel = STATUS_LABELS[season.status] ?? season.status
                  return (
                    <tr key={season.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{season.name}</span>
                          <span className="text-xs text-gray-500">Mã: {season.code}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{season.tournamentName || '—'}</td>
                      <td className="px-6 py-4 text-gray-700">{season.rulesetName || '—'}</td>
                      <td className="px-6 py-4 text-gray-600">{formatDateRange(season.startDate, season.endDate)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyle}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-700">{formatCurrency(season.participationFee)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => handleOpenSeasonModal(season)}
                            className="rounded-full p-2 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                            title="Chỉnh sửa mùa giải"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => setSeasonToDelete(season)}
                            className="rounded-full p-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                            title="Xóa mùa giải"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  // =====================================================================
  // RENDER RULESETS TAB
  // =====================================================================
  const renderRulesetsTab = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Quản lý Bộ quy tắc</h2>
          <p className="text-sm text-gray-600">
            Quản lý các bộ quy tắc giải đấu, xuất bản và liên kết với mùa giải.
          </p>
        </div>
        <button
          onClick={openCreateRulesetModal}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={16} />
          Tạo bộ quy tắc
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase text-gray-500">Tổng số</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{rulesetStats.total}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase text-gray-500">Đang hoạt động</p>
          <p className="mt-2 text-2xl font-semibold text-green-600">{rulesetStats.active}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase text-gray-500">Cập nhật gần nhất</p>
          <p className="mt-2 text-lg font-semibold text-gray-900">{rulesetStats.latestUpdated}</p>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Tìm theo tên hoặc phiên bản..."
            />
          </div>
          <button
            type="button"
            onClick={() => loadRulesets()}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <RefreshCw size={16} />
            Tải lại
          </button>
        </div>
      </div>

      {/* Rulesets Grid */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr,1.9fr]">
        {/* Ruleset List */}
        <div className="rounded-lg border border-gray-200 bg-white">
          {listLoading ? (
            <div className="flex h-64 items-center justify-center text-sm text-gray-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" />
              Đang tải bộ quy tắc...
            </div>
          ) : filteredRulesets.length === 0 ? (
            <div className="flex h-64 items-center justify-center px-6 text-center text-sm text-gray-500">
              Không có bộ quy tắc nào phù hợp.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-600">Bộ quy tắc</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-600">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRulesets.map((ruleset) => {
                    const isSelected = ruleset.id === selectedRulesetId
                    return (
                      <tr
                        key={ruleset.id}
                        className={`cursor-pointer ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                        onClick={() => setSelectedRulesetId(ruleset.id)}
                      >
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-900">{ruleset.name}</p>
                          <p className="text-xs text-gray-500">Phiên bản {ruleset.versionTag}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={statusBadgeClass(ruleset.isActive)}>
                            {ruleset.isActive ? (
                              <>
                                <ShieldCheck size={14} /> Hoạt động
                              </>
                            ) : (
                              <>
                                <ShieldAlert size={14} /> Nháp
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Ruleset Detail */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          {detailLoading ? (
            <div className="flex h-64 items-center justify-center text-sm text-gray-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" />
              Đang tải chi tiết...
            </div>
          ) : !selectedRuleset ? (
            <div className="flex h-64 flex-col items-center justify-center text-center text-sm text-gray-500">
              <ShieldAlert className="mb-3 h-8 w-8 text-gray-300" />
              Chọn một bộ quy tắc từ danh sách bên trái để xem chi tiết.
            </div>
          ) : (
            <>
              {/* Detail Header */}
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-semibold text-gray-900">{selectedRuleset.name}</h2>
                    <span className={statusBadgeClass(selectedRuleset.isActive)}>
                      {selectedRuleset.isActive ? (
                        <>
                          <CheckCircle2 size={14} /> Hoạt động
                        </>
                      ) : (
                        <>
                          <ShieldAlert size={14} /> Nháp
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">Phiên bản {selectedRuleset.versionTag}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={openEditRulesetModal}
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <Edit3 size={16} />
                    Sửa
                  </button>
                  {!selectedRuleset.isActive && (
                    <button
                      type="button"
                      onClick={handlePublishRuleset}
                      disabled={isPublishing}
                      className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck size={16} />}
                      Xuất bản
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={refreshSelectedRuleset}
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <RefreshCw size={16} />
                    Làm mới
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteRuleset}
                    disabled={isDeletingRuleset}
                    className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    {isDeletingRuleset ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 size={16} />}
                    Xóa
                  </button>
                </div>
              </div>

              {selectedRuleset.description && (
                <p className="mt-4 text-sm text-gray-700">{selectedRuleset.description}</p>
              )}

              {/* Parameters */}
              {selectedRuleset.parameters && (
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {selectedRuleset.parameters.squad && (
                    <div className="rounded-md border border-gray-100 bg-gray-50 p-4">
                      <h3 className="text-sm font-semibold text-gray-900">Điều kiện cầu thủ (QD1)</h3>
                      <ul className="mt-3 space-y-1 text-sm text-gray-600">
                        <li>Tuổi tối thiểu: {selectedRuleset.parameters.squad.minAge}</li>
                        <li>Tuổi tối đa: {selectedRuleset.parameters.squad.maxAge}</li>
                        <li>Số cầu thủ tối đa: {selectedRuleset.parameters.squad.maxPlayers}</li>
                        <li>Ngoại binh tối đa: {selectedRuleset.parameters.squad.maxForeignPlayers}</li>
                      </ul>
                    </div>
                  )}

                  {selectedRuleset.parameters.scoring && (
                    <div className="rounded-md border border-gray-100 bg-gray-50 p-4">
                      <h3 className="text-sm font-semibold text-gray-900">Quy định bàn thắng (QD3)</h3>
                      <ul className="mt-3 space-y-1 text-sm text-gray-600">
                        <li>Loại bàn thắng: {selectedRuleset.parameters.scoring.goalTypes?.join(', ')}</li>
                        <li>Thời gian VAR: {selectedRuleset.parameters.scoring.maxGoalTime} phút</li>
                      </ul>
                    </div>
                  )}

                  {selectedRuleset.parameters.ranking && (
                    <div className="md:col-span-2 rounded-md border border-gray-100 bg-gray-50 p-4">
                      <h3 className="text-sm font-semibold text-gray-900">Điểm xếp hạng (QD5)</h3>
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <div className="rounded border border-gray-200 bg-white p-3 text-center">
                          <p className="text-xs uppercase text-gray-500">Thắng</p>
                          <p className="mt-1 text-lg font-semibold text-gray-900">
                            {selectedRuleset.parameters.ranking.points?.win} điểm
                          </p>
                        </div>
                        <div className="rounded border border-gray-200 bg-white p-3 text-center">
                          <p className="text-xs uppercase text-gray-500">Hòa</p>
                          <p className="mt-1 text-lg font-semibold text-gray-900">
                            {selectedRuleset.parameters.ranking.points?.draw} điểm
                          </p>
                        </div>
                        <div className="rounded border border-gray-200 bg-white p-3 text-center">
                          <p className="text-xs uppercase text-gray-500">Thua</p>
                          <p className="mt-1 text-lg font-semibold text-gray-900">
                            {selectedRuleset.parameters.ranking.points?.loss} điểm
                          </p>
                        </div>
                      </div>
                      {selectedRuleset.parameters.ranking.tiebreakers && (
                        <p className="mt-4 text-sm text-gray-600">
                          Thứ tự phân định:{' '}
                          <span className="font-medium text-gray-800">
                            {selectedRuleset.parameters.ranking.tiebreakers.join(' > ')}
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Season Assignments */}
              <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">Liên kết mùa giải</h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Liên kết bộ quy tắc này với mùa giải để áp dụng các quy định.
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-gray-700">
                      {seasonAssignments.length === 0 ? (
                        <li className="text-gray-500">Chưa liên kết với mùa giải nào.</li>
                      ) : (
                        seasonAssignments.map((assignment) => (
                          <li
                            key={assignment.seasonId}
                            className="flex items-center justify-between rounded border border-gray-100 bg-gray-50 px-3 py-2"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-800">{resolveSeasonLabel(assignment)}</span>
                              <span className="text-xs text-gray-500">ID: #{assignment.seasonId}</span>
                            </div>
                            <span className="text-xs text-gray-500">
                              Liên kết {formatDateTime(assignment.assignedAt)}
                            </span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                  <form onSubmit={handleAssignSeason} className="w-full max-w-xs rounded-lg border border-gray-100 bg-gray-50 p-4">
                    <label className="text-xs font-semibold uppercase text-gray-500">Chọn mùa giải</label>
                    <select
                      value={seasonAssignmentInput}
                      onChange={(e) => setSeasonAssignmentInput(e.target.value)}
                      disabled={isLoadingSeasons || seasons.length === 0}
                      className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                    >
                      <option value="">Chọn mùa giải</option>
                      {seasons.map((season) => (
                        <option key={season.id} value={season.id ?? ''}>
                          {season.name}
                          {season.code ? ` (${season.code})` : ''}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      disabled={isAssigningSeason || isLoadingSeasons || !seasonAssignmentInput}
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isAssigningSeason ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 size={16} />}
                      Liên kết
                    </button>
                  </form>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-7 w-7 text-blue-600" />
            Mùa giải & Quy tắc
          </h1>
          <p className="text-gray-500 mt-1">
            Quản lý mùa giải và bộ quy tắc giải đấu
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto">
          {MAIN_TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = mainTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setMainTab(tab.id)}
                className={`
                  flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all
                  ${isActive 
                    ? 'border-blue-500 text-blue-600 bg-blue-50' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {mainTab === 'seasons' && renderSeasonsTab()}
        {mainTab === 'rulesets' && renderRulesetsTab()}
      </div>

      {/* Season Modals */}
      <SeasonFormModal
        isOpen={isSeasonModalOpen}
        onClose={closeSeasonModal}
        onSave={handleSaveSeason}
        season={editingSeason}
        metadata={metadata}
        isSubmitting={isSavingSeason}
      />

      {seasonToDelete && (
        <ConfirmationModal
          isOpen={!!seasonToDelete}
          title="Xóa mùa giải"
          message={`Bạn có chắc chắn muốn xóa mùa giải "${seasonToDelete.name}"? Hành động này không thể hoàn tác.`}
          confirmText="Xóa"
          confirmButtonClass="bg-red-600 hover:bg-red-700"
          onConfirm={handleDeleteSeason}
          onCancel={() => setSeasonToDelete(null)}
          isProcessing={false}
        />
      )}

      {/* Ruleset Form Modal */}
      {isRulesetFormOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="mt-10 w-full max-w-3xl rounded-xl bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {rulesetFormMode === 'create' ? 'Tạo bộ quy tắc' : 'Chỉnh sửa bộ quy tắc'}
                </h2>
                <p className="text-sm text-gray-500">
                  Định nghĩa tên và các thông số quy định.
                </p>
              </div>
              <button
                type="button"
                onClick={closeRulesetForm}
                className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50"
              >
                Đóng
              </button>
            </div>
            <div className="mt-6 max-h-[80vh] overflow-y-auto">
              <RulesetForm
                initialData={rulesetModalInitialData}
                onSave={handleSaveRuleset}
                onCancel={closeRulesetForm}
                isSubmitting={isSavingRuleset}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SeasonAndRulesPage


