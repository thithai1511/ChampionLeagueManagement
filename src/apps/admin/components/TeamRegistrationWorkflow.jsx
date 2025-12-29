import React, { useEffect, useState } from 'react'
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  FileCheck,
  Send,
  Edit3,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import ApiService from '../../../layers/application/services/ApiService'

/**
 * Status definitions with Vietnamese labels and colors
 */
const STATUS_CONFIG = {
  DRAFT_INVITE: {
    label: 'Bản nháp',
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    icon: Edit3
  },
  INVITED: {
    label: 'Đã gửi lời mời',
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    icon: Send
  },
  ACCEPTED: {
    label: 'Đã chấp nhận',
    color: 'bg-green-100 text-green-700 border-green-300',
    icon: ThumbsUp
  },
  DECLINED: {
    label: 'Đã từ chối',
    color: 'bg-red-100 text-red-700 border-red-300',
    icon: ThumbsDown
  },
  SUBMITTED: {
    label: 'Đã nộp hồ sơ',
    color: 'bg-purple-100 text-purple-700 border-purple-300',
    icon: FileCheck
  },
  REQUEST_CHANGE: {
    label: 'Yêu cầu bổ sung',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    icon: AlertCircle
  },
  APPROVED: {
    label: 'Đã duyệt',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    icon: CheckCircle2
  },
  REJECTED: {
    label: 'Không duyệt',
    color: 'bg-rose-100 text-rose-700 border-rose-300',
    icon: XCircle
  }
}

/**
 * Team Registration Workflow Component
 * Displays and manages team registration status through the complete workflow
 */
const TeamRegistrationWorkflow = ({ seasonId, refreshTrigger }) => {
  const [registrations, setRegistrations] = useState([])
  const [statistics, setStatistics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (seasonId) {
      loadRegistrations()
      loadStatistics()
    }
  }, [seasonId, refreshTrigger])

  const loadRegistrations = async () => {
    setLoading(true)
    try {
      const response = await ApiService.get(`/seasons/${seasonId}/registrations`)
      setRegistrations(response?.data || [])
    } catch (error) {
      console.error('Failed to load registrations:', error)
      toast.error('Không thể tải danh sách đăng ký')
      setRegistrations([])
    } finally {
      setLoading(false)
    }
  }

  const loadStatistics = async () => {
    try {
      const response = await ApiService.get(`/seasons/${seasonId}/registrations/statistics`)
      setStatistics(response?.data || null)
    } catch (error) {
      console.error('Failed to load statistics:', error)
    }
  }

  const handleChangeStatus = async (registrationId, newStatus, note = '') => {
    setActionLoading(true)
    try {
      await ApiService.post(`/registrations/${registrationId}/change-status`, {
        status: newStatus,
        note: note || undefined
      })
      toast.success(`Đã chuyển trạng thái thành: ${STATUS_CONFIG[newStatus]?.label}`)
      await loadRegistrations()
      await loadStatistics()
    } catch (error) {
      console.error('Status change error:', error)
      toast.error(error?.response?.data?.error || 'Không thể thay đổi trạng thái')
    } finally {
      setActionLoading(false)
    }
  }

  const handleApprove = async (registrationId) => {
    if (!window.confirm('Xác nhận duyệt hồ sơ này?')) return
    
    setActionLoading(true)
    try {
      const response = await ApiService.post(`/registrations/${registrationId}/approve`, {
        note: 'Hồ sơ đã được duyệt'
      })
      
      toast.success('Đã duyệt hồ sơ')
      
      // Show scheduling readiness info
      if (response?.schedulingReady) {
        toast.success(`✅ Đủ ${response.approvedCount}/${response.requiredCount} đội - Sẵn sàng xếp lịch!`, {
          duration: 5000
        })
      } else {
        toast(`Đã duyệt ${response?.approvedCount || 0}/${response?.requiredCount || 10} đội`, {
          icon: '📊',
          duration: 3000
        })
      }
      
      await loadRegistrations()
      await loadStatistics()
    } catch (error) {
      console.error('Approve error:', error)
      toast.error(error?.response?.data?.error || 'Không thể duyệt hồ sơ')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async (registrationId) => {
    const reason = window.prompt('Nhập lý do từ chối:')
    if (!reason) return
    
    setActionLoading(true)
    try {
      await ApiService.post(`/registrations/${registrationId}/reject`, {
        note: reason
      })
      toast.success('Đã từ chối hồ sơ')
      await loadRegistrations()
      await loadStatistics()
    } catch (error) {
      console.error('Reject error:', error)
      toast.error(error?.response?.data?.error || 'Không thể từ chối hồ sơ')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRequestChange = async (registrationId) => {
    const reason = window.prompt('Nhập yêu cầu sửa đổi:')
    if (!reason) return
    
    setActionLoading(true)
    try {
      await ApiService.post(`/registrations/${registrationId}/request-change`, {
        note: reason
      })
      toast.success('Đã gửi yêu cầu bổ sung')
      await loadRegistrations()
      await loadStatistics()
    } catch (error) {
      console.error('Request change error:', error)
      toast.error(error?.response?.data?.error || 'Không thể gửi yêu cầu')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSendAllInvitations = async () => {
    if (!window.confirm('Gửi tất cả lời mời đang ở trạng thái DRAFT_INVITE?')) return
    
    setActionLoading(true)
    try {
      const response = await ApiService.post(`/seasons/${seasonId}/registrations/send-invitations`)
      toast.success(response?.data?.message || 'Đã gửi lời mời')
      await loadRegistrations()
      await loadStatistics()
    } catch (error) {
      console.error('Send invitations error:', error)
      toast.error(error?.response?.data?.error || 'Không thể gửi lời mời')
    } finally {
      setActionLoading(false)
    }
  }

  const renderStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT_INVITE
    const Icon = config.icon
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${config.color}`}>
        <Icon size={14} />
        {config.label}
      </span>
    )
  }

  const renderActions = (registration) => {
    const status = registration.registration_status
    
    // Admin actions based on status
    switch (status) {
      case 'DRAFT_INVITE':
        return (
          <button
            onClick={() => handleChangeStatus(registration.registration_id, 'INVITED')}
            disabled={actionLoading}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
          >
            Gửi lời mời
          </button>
        )
      
      case 'SUBMITTED':
        return (
          <div className="flex gap-2">
            <button
              onClick={() => handleApprove(registration.registration_id)}
              disabled={actionLoading}
              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 text-sm"
            >
              Duyệt
            </button>
            <button
              onClick={() => handleRequestChange(registration.registration_id)}
              disabled={actionLoading}
              className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50 text-sm"
            >
              Yêu cầu sửa
            </button>
            <button
              onClick={() => handleReject(registration.registration_id)}
              disabled={actionLoading}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 text-sm"
            >
              Từ chối
            </button>
          </div>
        )
      
      case 'REQUEST_CHANGE':
        return (
          <span className="text-sm text-gray-500 italic">Chờ đội sửa lại</span>
        )
      
      default:
        return null
    }
  }

  const renderSubmissionData = (data) => {
    if (!data) return <p className="text-gray-500 text-sm">Chưa có dữ liệu</p>
    
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data
      
      return (
        <div className="space-y-3 text-sm">
          {parsed.stadium && (
            <div>
              <strong className="text-gray-700">Sân:</strong>
              <p className="ml-4 text-gray-600">
                {parsed.stadium.name} - {parsed.stadium.capacity} chỗ - 
                Rating: {parsed.stadium.rating}⭐
              </p>
            </div>
          )}
          
          {parsed.kits && (
            <div>
              <strong className="text-gray-700">Áo đấu:</strong>
              <div className="ml-4 space-y-1">
                {parsed.kits.home && (
                  <p className="text-gray-600">
                    Áo nhà: {parsed.kits.home.shirt_color} / {parsed.kits.home.shorts_color} / {parsed.kits.home.socks_color}
                  </p>
                )}
                {parsed.kits.away && (
                  <p className="text-gray-600">
                    Áo sân khách: {parsed.kits.away.shirt_color} / {parsed.kits.away.shorts_color} / {parsed.kits.away.socks_color}
                  </p>
                )}
              </div>
            </div>
          )}
          
          {parsed.players && (
            <div>
              <strong className="text-gray-700">Cầu thủ:</strong>
              <p className="ml-4 text-gray-600">
                Tổng: {parsed.players.total_count} - Ngoại binh: {parsed.players.foreign_count}
              </p>
            </div>
          )}
        </div>
      )
    } catch (error) {
      return <p className="text-red-500 text-sm">Dữ liệu không hợp lệ</p>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin" size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Section */}
      {statistics && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Thống kê đăng ký</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {Object.entries(statistics.statusCounts || {}).map(([status, count]) => {
              const config = STATUS_CONFIG[status]
              if (!config) return null
              
              return (
                <div key={status} className={`p-3 rounded-lg border ${config.color}`}>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm">{config.label}</div>
                </div>
              )
            })}
          </div>
          
          {/* Scheduling Readiness */}
          <div className={`p-4 rounded-lg border-2 ${
            statistics.schedulingReady 
              ? 'bg-green-50 border-green-300' 
              : 'bg-yellow-50 border-yellow-300'
          }`}>
            <div className="flex items-center gap-2">
              {statistics.schedulingReady ? (
                <CheckCircle2 className="text-green-600" size={20} />
              ) : (
                <Clock className="text-yellow-600" size={20} />
              )}
              <span className="font-semibold">
                {statistics.schedulingReady 
                  ? '✅ Sẵn sàng xếp lịch thi đấu' 
                  : `Cần ${statistics.requiredCount - statistics.approvedCount} đội nữa`}
              </span>
              <span className="text-sm text-gray-600 ml-auto">
                {statistics.approvedCount}/{statistics.requiredCount} đội đã duyệt
              </span>
            </div>
          </div>
          
          {/* Batch Send Invitations Button */}
          {(statistics.statusCounts?.DRAFT_INVITE || 0) > 0 && (
            <div className="mt-4">
              <button
                onClick={handleSendAllInvitations}
                disabled={actionLoading}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send size={18} />
                Gửi tất cả lời mời ({statistics.statusCounts.DRAFT_INVITE})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Registrations List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Đội bóng</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Trạng thái</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Ghi chú</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Ngày nộp</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {registrations.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                    Chưa có đăng ký nào
                  </td>
                </tr>
              ) : (
                registrations.map((reg) => (
                  <React.Fragment key={reg.registration_id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{reg.team_name}</div>
                      </td>
                      <td className="px-4 py-3">
                        {renderStatusBadge(reg.registration_status)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                        {reg.reviewer_note || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {reg.submitted_at 
                          ? new Date(reg.submitted_at).toLocaleDateString('vi-VN')
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {renderActions(reg)}
                          <button
                            onClick={() => setExpandedId(expandedId === reg.registration_id ? null : reg.registration_id)}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <ChevronRight 
                              size={18} 
                              className={`transition-transform ${expandedId === reg.registration_id ? 'rotate-90' : ''}`}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded Details */}
                    {expandedId === reg.registration_id && (
                      <tr>
                        <td colSpan="5" className="px-4 py-4 bg-gray-50">
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold text-gray-700 mb-2">Thông tin hồ sơ:</h4>
                              {renderSubmissionData(reg.submission_data)}
                            </div>
                            
                            {reg.reviewer_note && (
                              <div>
                                <h4 className="font-semibold text-gray-700 mb-2">Ghi chú BTC:</h4>
                                <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded border border-yellow-200">
                                  {reg.reviewer_note}
                                </p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default TeamRegistrationWorkflow
