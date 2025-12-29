import React, { useEffect, useState } from 'react'
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  FileCheck,
  Send,
  Loader2,
  Upload,
  Edit3
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import ApiService from '../../../layers/application/services/ApiService'

const STATUS_CONFIG = {
  INVITED: {
    label: 'Đã nhận lời mời',
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    icon: Send,
    canAccept: true,
    canDecline: true
  },
  ACCEPTED: {
    label: 'Đã chấp nhận - Cần nộp hồ sơ',
    color: 'bg-green-100 text-green-700 border-green-300',
    icon: CheckCircle2,
    canSubmit: true
  },
  DECLINED: {
    label: 'Đã từ chối',
    color: 'bg-red-100 text-red-700 border-red-300',
    icon: XCircle
  },
  SUBMITTED: {
    label: 'Đã nộp hồ sơ - Chờ duyệt',
    color: 'bg-purple-100 text-purple-700 border-purple-300',
    icon: FileCheck
  },
  REQUEST_CHANGE: {
    label: 'Cần bổ sung thông tin',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    icon: AlertCircle,
    canSubmit: true
  },
  APPROVED: {
    label: 'Đã được duyệt',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    icon: CheckCircle2
  },
  REJECTED: {
    label: 'Không được duyệt',
    color: 'bg-rose-100 text-rose-700 border-rose-300',
    icon: XCircle
  }
}

/**
 * Team view for season registration
 * Allows team admin to accept/decline invitation and submit documents
 */
const TeamSeasonRegistration = ({ teamId }) => {
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedReg, setSelectedReg] = useState(null)
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  
  // Form data for submission
  const [formData, setFormData] = useState({
    stadium: {
      name: '',
      capacity: 10000,
      rating: 2,
      city: ''
    },
    kits: {
      home: { shirt_color: '', shorts_color: '', socks_color: '' },
      away: { shirt_color: '', shorts_color: '', socks_color: '' }
    },
    players: {
      total_count: 18,
      foreign_count: 0
    }
  })

  useEffect(() => {
    if (teamId) {
      loadRegistrations()
    }
  }, [teamId])

  const loadRegistrations = async () => {
    setLoading(true)
    try {
      const response = await ApiService.get(`/teams/${teamId}/registrations`)
      setRegistrations(response?.data || [])
    } catch (error) {
      console.error('Failed to load registrations:', error)
      toast.error('Không thể tải danh sách đăng ký')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (registrationId) => {
    if (!window.confirm('Xác nhận chấp nhận lời mời tham gia mùa giải này?')) return
    
    setSubmitting(true)
    try {
      await ApiService.post(`/registrations/${registrationId}/accept`, {
        note: 'Đội đồng ý tham gia'
      })
      toast.success('Đã chấp nhận lời mời! Vui lòng hoàn tất hồ sơ đăng ký.')
      await loadRegistrations()
    } catch (error) {
      console.error('Accept error:', error)
      toast.error(error?.response?.data?.error || 'Không thể chấp nhận lời mời')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDecline = async (registrationId) => {
    const reason = window.prompt('Lý do từ chối (tùy chọn):')
    if (reason === null) return // User cancelled
    
    if (!window.confirm('Xác nhận từ chối lời mời tham gia?')) return
    
    setSubmitting(true)
    try {
      await ApiService.post(`/registrations/${registrationId}/decline`, {
        note: reason || 'Đội từ chối tham gia'
      })
      toast.success('Đã từ chối lời mời')
      await loadRegistrations()
    } catch (error) {
      console.error('Decline error:', error)
      toast.error(error?.response?.data?.error || 'Không thể từ chối lời mời')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenSubmitForm = (registration) => {
    setSelectedReg(registration)
    
    // Pre-fill form if resubmitting
    if (registration.submission_data) {
      try {
        const parsed = typeof registration.submission_data === 'string' 
          ? JSON.parse(registration.submission_data) 
          : registration.submission_data
        setFormData(parsed)
      } catch (error) {
        console.error('Failed to parse submission data:', error)
      }
    }
    
    setShowSubmitForm(true)
  }

  const handleSubmitDocuments = async () => {
    if (!selectedReg) return
    
    // Validate form
    if (!formData.stadium.name || !formData.stadium.city) {
      toast.error('Vui lòng điền đầy đủ thông tin sân')
      return
    }
    
    if (!formData.kits.home.shirt_color || !formData.kits.away.shirt_color) {
      toast.error('Vui lòng điền đầy đủ thông tin áo đấu')
      return
    }
    
    setSubmitting(true)
    try {
      await ApiService.post(`/registrations/${selectedReg.registration_id}/submit`, {
        submissionData: formData
      })
      toast.success('Đã nộp hồ sơ thành công! Chờ BTC duyệt.')
      setShowSubmitForm(false)
      setSelectedReg(null)
      await loadRegistrations()
    } catch (error) {
      console.error('Submit error:', error)
      toast.error(error?.response?.data?.error || 'Không thể nộp hồ sơ')
    } finally {
      setSubmitting(false)
    }
  }

  const renderStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.INVITED
    const Icon = config.icon
    
    return (
      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${config.color}`}>
        <Icon size={16} />
        {config.label}
      </span>
    )
  }

  const renderActions = (registration) => {
    const status = registration.registration_status
    const config = STATUS_CONFIG[status]
    
    return (
      <div className="flex gap-2">
        {config?.canAccept && (
          <button
            onClick={() => handleAccept(registration.registration_id)}
            disabled={submitting}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-2"
          >
            <CheckCircle2 size={18} />
            Chấp nhận
          </button>
        )}
        
        {config?.canDecline && (
          <button
            onClick={() => handleDecline(registration.registration_id)}
            disabled={submitting}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
          >
            <XCircle size={18} />
            Từ chối
          </button>
        )}
        
        {config?.canSubmit && (
          <button
            onClick={() => handleOpenSubmitForm(registration)}
            disabled={submitting}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
          >
            <Upload size={18} />
            {status === 'REQUEST_CHANGE' ? 'Sửa và nộp lại' : 'Nộp hồ sơ'}
          </button>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin" size={32} />
      </div>
    )
  }

  // Filter active registrations (not DECLINED or REJECTED)
  const activeRegistrations = registrations.filter(
    r => !['DECLINED', 'REJECTED'].includes(r.registration_status)
  )

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      
      {activeRegistrations.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">Chưa có lời mời tham gia mùa giải nào</p>
        </div>
      ) : (
        activeRegistrations.map((reg) => (
          <div key={reg.registration_id} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Mùa giải: Season {reg.season_id}
                  </h3>
                  {renderStatusBadge(reg.registration_status)}
                </div>
              </div>
              
              {/* Reviewer Note (if any) */}
              {reg.reviewer_note && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="font-semibold text-yellow-800 mb-1">Ghi chú từ BTC:</p>
                      <p className="text-yellow-700 text-sm">{reg.reviewer_note}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Submission Data (if submitted) */}
              {reg.submission_data && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Hồ sơ đã nộp:</h4>
                  <div className="text-sm text-gray-600 space-y-2">
                    {(() => {
                      try {
                        const data = typeof reg.submission_data === 'string' 
                          ? JSON.parse(reg.submission_data) 
                          : reg.submission_data
                        
                        return (
                          <>
                            {data.stadium && (
                              <p>• Sân: {data.stadium.name} ({data.stadium.capacity} chỗ, {data.stadium.rating}⭐)</p>
                            )}
                            {data.players && (
                              <p>• Cầu thủ: {data.players.total_count} người (trong đó {data.players.foreign_count} ngoại binh)</p>
                            )}
                          </>
                        )
                      } catch (error) {
                        return <p className="text-red-500">Dữ liệu không hợp lệ</p>
                      }
                    })()}
                  </div>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex justify-end">
                {renderActions(reg)}
              </div>
            </div>
          </div>
        ))
      )}

      {/* Submit Form Modal */}
      {showSubmitForm && selectedReg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Nộp hồ sơ đăng ký</h2>
                <button
                  onClick={() => setShowSubmitForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle size={24} />
                </button>
              </div>
              
              <form className="space-y-6">
                {/* Stadium Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Thông tin sân</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tên sân <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.stadium.name}
                        onChange={(e) => setFormData({
                          ...formData,
                          stadium: { ...formData.stadium, name: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Sức chứa <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={formData.stadium.capacity}
                          onChange={(e) => setFormData({
                            ...formData,
                            stadium: { ...formData.stadium, capacity: parseInt(e.target.value, 10) }
                          })}
                          min="10000"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Rating (⭐) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={formData.stadium.rating}
                          onChange={(e) => setFormData({
                            ...formData,
                            stadium: { ...formData.stadium, rating: parseInt(e.target.value, 10) }
                          })}
                          min="2"
                          max="5"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Thành phố <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.stadium.city}
                          onChange={(e) => setFormData({
                            ...formData,
                            stadium: { ...formData.stadium, city: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Kit Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Thông tin áo đấu</h3>
                  
                  {/* Home Kit */}
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Áo nhà <span className="text-red-500">*</span></p>
                    <div className="grid grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="Màu áo"
                        value={formData.kits.home.shirt_color}
                        onChange={(e) => setFormData({
                          ...formData,
                          kits: {
                            ...formData.kits,
                            home: { ...formData.kits.home, shirt_color: e.target.value }
                          }
                        })}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Màu quần"
                        value={formData.kits.home.shorts_color}
                        onChange={(e) => setFormData({
                          ...formData,
                          kits: {
                            ...formData.kits,
                            home: { ...formData.kits.home, shorts_color: e.target.value }
                          }
                        })}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Màu tất"
                        value={formData.kits.home.socks_color}
                        onChange={(e) => setFormData({
                          ...formData,
                          kits: {
                            ...formData.kits,
                            home: { ...formData.kits.home, socks_color: e.target.value }
                          }
                        })}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                        required
                      />
                    </div>
                  </div>
                  
                  {/* Away Kit */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Áo sân khách <span className="text-red-500">*</span></p>
                    <div className="grid grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="Màu áo"
                        value={formData.kits.away.shirt_color}
                        onChange={(e) => setFormData({
                          ...formData,
                          kits: {
                            ...formData.kits,
                            away: { ...formData.kits.away, shirt_color: e.target.value }
                          }
                        })}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Màu quần"
                        value={formData.kits.away.shorts_color}
                        onChange={(e) => setFormData({
                          ...formData,
                          kits: {
                            ...formData.kits,
                            away: { ...formData.kits.away, shorts_color: e.target.value }
                          }
                        })}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Màu tất"
                        value={formData.kits.away.socks_color}
                        onChange={(e) => setFormData({
                          ...formData,
                          kits: {
                            ...formData.kits,
                            away: { ...formData.kits.away, socks_color: e.target.value }
                          }
                        })}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Player Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Thông tin cầu thủ</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tổng số cầu thủ <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.players.total_count}
                        onChange={(e) => setFormData({
                          ...formData,
                          players: { ...formData.players, total_count: parseInt(e.target.value, 10) }
                        })}
                        min="16"
                        max="22"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Số ngoại binh <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.players.foreign_count}
                        onChange={(e) => setFormData({
                          ...formData,
                          players: { ...formData.players, foreign_count: parseInt(e.target.value, 10) }
                        })}
                        min="0"
                        max="5"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowSubmitForm(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    disabled={submitting}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitDocuments}
                    disabled={submitting}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
                  >
                    {submitting && <Loader2 className="animate-spin" size={18} />}
                    Nộp hồ sơ
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeamSeasonRegistration
