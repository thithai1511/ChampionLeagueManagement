import React, { useState, useEffect } from 'react'
import { X, Shield, Loader2 } from 'lucide-react'
import UserService from '../../../layers/application/services/UserService'
import OfficialService from '../../../layers/application/services/OfficialService'
import toast from 'react-hot-toast'

const OfficialAssignmentModal = ({ isOpen, onClose, userId, userName, onSuccess }) => {
  const [userOfficial, setUserOfficial] = useState(null)
  const [allOfficials, setAllOfficials] = useState([])
  const [loading, setLoading] = useState(false)
  const [officialsLoading, setOfficialsLoading] = useState(false)
  const [selectedOfficialId, setSelectedOfficialId] = useState('')
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    if (isOpen && userId) {
      loadUserOfficial()
      loadAllOfficials()
    }
  }, [isOpen, userId])

  const loadUserOfficial = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const official = await UserService.getUserOfficial(userId)
      setUserOfficial(official)
    } catch (error) {
      console.error('Failed to load user official:', error)
      // If no official found, that's okay - set to null
      setUserOfficial(null)
    } finally {
      setLoading(false)
    }
  }

  const loadAllOfficials = async () => {
    setOfficialsLoading(true)
    try {
      const response = await OfficialService.listOfficials({ 
        status: 'active',
        limit: 1000 
      })
      setAllOfficials(response.data || [])
    } catch (error) {
      console.error('Failed to load officials:', error)
      toast.error('Không thể tải danh sách trọng tài')
    } finally {
      setOfficialsLoading(false)
    }
  }

  const handleAssignOfficial = async () => {
    if (!selectedOfficialId) {
      toast.error('Vui lòng chọn trọng tài')
      return
    }

    const officialId = Number(selectedOfficialId)
    if (userOfficial && userOfficial.officialId === officialId) {
      toast.error('Trọng tài này đã được gán cho người dùng')
      return
    }

    setAssigning(true)
    try {
      await UserService.assignOfficialToUser(userId, officialId)
      toast.success('Đã gán trọng tài thành công')
      setSelectedOfficialId('')
      await loadUserOfficial()
      onSuccess?.()
    } catch (error) {
      console.error('Failed to assign official:', error)
      toast.error(error?.message || 'Không thể gán trọng tài')
    } finally {
      setAssigning(false)
    }
  }

  const handleRemoveOfficial = async () => {
    if (!confirm(`Bạn có chắc chắn muốn gỡ trọng tài này khỏi người dùng "${userName}"?`)) {
      return
    }

    try {
      await UserService.removeOfficialFromUser(userId)
      toast.success('Đã gỡ trọng tài thành công')
      await loadUserOfficial()
      onSuccess?.()
    } catch (error) {
      console.error('Failed to remove official:', error)
      toast.error(error?.message || 'Không thể gỡ trọng tài')
    }
  }

  const getSpecialtyLabel = (specialty) => {
    const labels = {
      referee: 'Trọng tài chính',
      assistant: 'Trọng tài biên',
      fourth_official: 'Trọng tài bàn',
      match_commissioner: 'Ủy viên trận đấu',
      supervisor: 'Giám sát viên',
      var: 'VAR',
      other: 'Khác'
    }
    return labels[specialty] || specialty
  }

  const availableOfficials = allOfficials.filter(
    (official) => !userOfficial || userOfficial.officialId !== official.officialId
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Quản lý trọng tài</h2>
            <p className="text-sm text-gray-600 mt-1">
              Gán trọng tài cho: <span className="font-semibold">{userName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Đóng"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Form gán trọng tài mới */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield size={20} />
              Gán trọng tài mới
            </h3>
            <div className="flex gap-3">
              <select
                value={selectedOfficialId}
                onChange={(e) => setSelectedOfficialId(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={officialsLoading || assigning}
              >
                <option value="">Chọn trọng tài...</option>
                {availableOfficials.map((official) => (
                  <option key={official.officialId} value={official.officialId}>
                    {official.fullName} - {getSpecialtyLabel(official.roleSpecialty)}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAssignOfficial}
                disabled={!selectedOfficialId || assigning || officialsLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {assigning ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Đang gán...
                  </>
                ) : (
                  'Gán trọng tài'
                )}
              </button>
            </div>
            {availableOfficials.length === 0 && !officialsLoading && (
              <p className="text-sm text-gray-500 mt-2">
                Tất cả trọng tài đã được gán hoặc không có trọng tài nào
              </p>
            )}
          </div>

          {/* Trọng tài đã gán */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Trọng tài đã gán
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-gray-400" />
              </div>
            ) : !userOfficial ? (
              <div className="text-center py-8 text-gray-500">
                <Shield size={48} className="mx-auto mb-2 text-gray-300" />
                <p>Chưa có trọng tài nào được gán</p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{userOfficial.fullName}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {getSpecialtyLabel(userOfficial.roleSpecialty)}
                    </p>
                    {userOfficial.licenseNumber && (
                      <p className="text-xs text-gray-500 mt-1">
                        Số giấy phép: {userOfficial.licenseNumber}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleRemoveOfficial}
                    className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    title="Gỡ trọng tài"
                  >
                    Gỡ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

export default OfficialAssignmentModal

