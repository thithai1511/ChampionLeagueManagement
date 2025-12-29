import React, { useEffect, useMemo, useState } from 'react'
import { toSeasonStatusLabel } from '../../../shared/utils/vi'

const DEFAULT_FORM = {
  name: '',
  code: '',
  tournamentId: '',
  rulesetId: '',
  status: 'draft',
  startDate: '',
  endDate: '',
  participationFee: 0,
  description: '',
  invitationOpenedAt: '',
  registrationDeadline: '',
  maxTeams: 10,
  expectedRounds: 18
}

const NUMERIC_FIELDS = new Set(['tournamentId', 'rulesetId', 'participationFee', 'maxTeams', 'expectedRounds'])
const LOCKED_STATUSES = new Set(['completed', 'archived'])

const toDateValue = (value) => (value ? String(value).slice(0, 10) : '')
const toDateTimeValue = (value) => (value ? String(value).slice(0, 16) : '')

const SeasonFormModal = ({
  isOpen,
  onClose,
  onSave,
  season,
  metadata = { statuses: [], tournaments: [], rulesets: [] },
  isSubmitting = false
}) => {
  const [formData, setFormData] = useState(DEFAULT_FORM)
  const [formErrors, setFormErrors] = useState([])

  const statusOptions = useMemo(() => {
    // Chỉ dùng các status hợp lệ theo backend schema
    const validStatuses = ['draft', 'inviting', 'registering', 'scheduled', 'in_progress', 'completed', 'archived']
    const fromMetadata = Array.isArray(metadata.statuses) && metadata.statuses.length > 0 ? metadata.statuses : []
    // Lọc chỉ lấy các status hợp lệ
    const filteredMetadata = fromMetadata.filter(s => validStatuses.includes(s))
    return Array.from(new Set([...filteredMetadata, ...validStatuses]))
  }, [metadata.statuses])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    if (season) {
      setFormData({
        name: season.name ?? '',
        code: season.code ?? '',
        tournamentId: season.tournamentId ?? '',
        rulesetId: season.rulesetId ?? '',
        status: season.status ?? statusOptions[0],
        startDate: toDateValue(season.startDate),
        endDate: toDateValue(season.endDate),
        participationFee: season.participationFee ?? 0,
        description: season.description ?? '',
        invitationOpenedAt: toDateTimeValue(season.invitationOpenedAt),
        registrationDeadline: toDateTimeValue(season.registrationDeadline),
        maxTeams: season.maxTeams ?? 10,
        expectedRounds: season.expectedRounds ?? 18
      })
    } else {
      setFormData({
        ...DEFAULT_FORM,
        status: statusOptions[0] ?? 'draft'
      })
    }
    setFormErrors([])
  }, [season, isOpen, statusOptions])

  const isLocked = season ? LOCKED_STATUSES.has(String(season.status).toLowerCase()) : false

  const handleChange = (event) => {
    const { name, value } = event.target

    if (NUMERIC_FIELDS.has(name)) {
      setFormData((prev) => ({
        ...prev,
        [name]: value === '' ? '' : Number(value)
      }))
      return
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const payload = {
      name: formData.name.trim(),
      code: formData.code.trim(),
      tournamentId: Number(formData.tournamentId),
      rulesetId: Number(formData.rulesetId),
      status: formData.status,
      startDate: formData.startDate,
      endDate: formData.endDate || null,
      description: formData.description?.trim() || null,
      participationFee: Number(formData.participationFee || 0),
      invitationOpenedAt: formData.invitationOpenedAt || null,
      registrationDeadline: formData.registrationDeadline || null,
      maxTeams: Number(formData.maxTeams || 10),
      expectedRounds: Number(formData.expectedRounds || 18)
    }

    const validationMessages = []

    // Required fields
    if (!payload.name || payload.name.trim().length < 3) {
      validationMessages.push('Tên mùa giải phải có ít nhất 3 ký tự.')
    }
    if (!payload.code || payload.code.trim().length < 2) {
      validationMessages.push('Mã mùa giải phải có ít nhất 2 ký tự.')
    }
    if (!payload.startDate) {
      validationMessages.push('Cần chọn ngày bắt đầu.')
    }

    // Validate tournamentId và rulesetId
    if (!payload.tournamentId || payload.tournamentId <= 0 || isNaN(payload.tournamentId)) {
      validationMessages.push('Cần chọn giải đấu.')
    }
    if (!payload.rulesetId || payload.rulesetId <= 0 || isNaN(payload.rulesetId)) {
      validationMessages.push('Cần chọn bộ điều lệ.')
    }

    // Validate status hợp lệ
    const validStatuses = ['draft', 'inviting', 'registering', 'scheduled', 'in_progress', 'completed', 'archived']
    if (!validStatuses.includes(payload.status)) {
      validationMessages.push('Trạng thái không hợp lệ.')
    }

    // Date validations
    if (payload.endDate && payload.startDate && payload.endDate < payload.startDate) {
      validationMessages.push('Ngày kết thúc không được trước ngày bắt đầu.')
    }
    if (
      payload.registrationDeadline &&
      payload.startDate &&
      payload.registrationDeadline > `${payload.startDate}T23:59`
    ) {
      validationMessages.push('Hạn đăng ký phải trước ngày bắt đầu mùa giải.')
    }
    if (
      payload.invitationOpenedAt &&
      payload.registrationDeadline &&
      payload.invitationOpenedAt > payload.registrationDeadline
    ) {
      validationMessages.push('Ngày mở thư mời phải trước hạn đăng ký.')
    }
    if (isLocked) {
      validationMessages.push('Mùa giải đã khóa không thể chỉnh sửa.')
    }

    if (validationMessages.length > 0) {
      setFormErrors(validationMessages)
      return
    }

    setFormErrors([])
    onSave(payload)
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            {season ? 'Chỉnh sửa Mùa giải' : 'Tạo Mùa giải mới'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm font-medium text-gray-500 hover:bg-gray-100"
            disabled={isSubmitting}
          >
            Đóng
          </button>
        </div>

        {isLocked && (
          <div className="mx-6 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Mùa giải đã khóa và không thể chỉnh sửa. Hãy mở khóa bằng quyền quản trị đặc biệt để thay đổi.
          </div>
        )}

        {formErrors.length > 0 && (
          <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <ul className="list-disc space-y-1 pl-4">
              {formErrors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col">
              <label className="mb-2 text-sm font-medium text-gray-700">Tên Mùa giải</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Cúp C1 Việt Nam 2025/26"
                required
                disabled={isLocked || isSubmitting}
              />
            </div>
            <div className="flex flex-col">
              <label className="mb-2 text-sm font-medium text-gray-700">Mã Mùa giải</label>
              <input
                name="code"
                value={formData.code}
                onChange={handleChange}
                className="rounded-lg border border-gray-300 px-4 py-2 uppercase focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="UCL_2025"
                required
                disabled={isLocked || isSubmitting}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col">
              <label className="mb-2 text-sm font-medium text-gray-700">Giải đấu</label>
              <select
                name="tournamentId"
                value={formData.tournamentId}
                onChange={handleChange}
                className="rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                required
                disabled={isLocked || isSubmitting}
              >
                <option value="" disabled>
                  Chọn giải đấu
                </option>
                {Array.from(new Map(metadata.tournaments?.map(t => [t.id, t]) || []).values()).map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="mb-2 text-sm font-medium text-gray-700">Bộ Điều lệ</label>
              <select
                name="rulesetId"
                value={formData.rulesetId}
                onChange={handleChange}
                className="rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                required
                disabled={isLocked || isSubmitting}
              >
                <option value="" disabled>
                  Chọn điều lệ
                </option>
                {Array.from(new Map(metadata.rulesets?.map(r => [r.id, r]) || []).values()).map((ruleset) => (
                  <option key={ruleset.id} value={ruleset.id}>
                    {ruleset.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col">
              <label className="mb-2 text-sm font-medium text-gray-700">Ngày bắt đầu</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                required
                disabled={isLocked || isSubmitting}
              />
            </div>
            <div className="flex flex-col">
              <label className="mb-2 text-sm font-medium text-gray-700">Ngày kết thúc</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className="rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                disabled={isLocked || isSubmitting}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col">
              <label className="mb-2 text-sm font-medium text-gray-700">Trạng thái</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="rounded-lg border border-gray-300 px-4 py-2 capitalize focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                disabled={isLocked || isSubmitting}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {toSeasonStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="mb-2 text-sm font-medium text-gray-700">Phí tham dự (VND)</label>
              <input
                type="number"
                min="0"
                step="100000"
                name="participationFee"
                value={formData.participationFee}
                onChange={handleChange}
                className="rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                disabled={isLocked || isSubmitting}
              />
            </div>
            <div className="flex flex-col">
              <label className="mb-2 text-sm font-medium text-gray-700">Số đội tối đa</label>
              <input
                type="number"
                min="2"
                name="maxTeams"
                value={formData.maxTeams}
                onChange={handleChange}
                className="rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                disabled
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col">
              <label className="mb-2 text-sm font-medium text-gray-700">Ngày mở thư mời</label>
              <input
                type="datetime-local"
                name="invitationOpenedAt"
                value={formData.invitationOpenedAt}
                onChange={handleChange}
                className="rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                disabled={isLocked || isSubmitting}
              />
            </div>
            <div className="flex flex-col">
              <label className="mb-2 text-sm font-medium text-gray-700">Hạn đăng ký</label>
              <input
                type="datetime-local"
                name="registrationDeadline"
                value={formData.registrationDeadline}
                onChange={handleChange}
                className="rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                disabled={isLocked || isSubmitting}
              />
            </div>
          </div>

          <div className="flex flex-col">
            <label className="mb-2 text-sm font-medium text-gray-700">Mô tả</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Thông tin tổng quan, thể thức thi đấu, yêu cầu đặc biệt..."
              disabled={isLocked || isSubmitting}
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              disabled={isSubmitting || isLocked}
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu Mùa giải'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SeasonFormModal
