import React, { useState, useEffect } from 'react'
import { X, Users, Loader2 } from 'lucide-react'
import UserService from '../../../layers/application/services/UserService'
import TeamsService from '../../../layers/application/services/TeamsService'
import toast from 'react-hot-toast'

const TeamAssignmentModal = ({ isOpen, onClose, userId, userName, onSuccess }) => {
  const [userTeams, setUserTeams] = useState([])
  const [allTeams, setAllTeams] = useState([])
  const [loading, setLoading] = useState(false)
  const [teamsLoading, setTeamsLoading] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    if (isOpen && userId) {
      loadUserTeams()
      loadAllTeams()
    }
  }, [isOpen, userId])

  const loadUserTeams = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const teams = await UserService.getUserTeams(userId)
      setUserTeams(teams)
    } catch (error) {
      console.error('Failed to load user teams:', error)
      toast.error('Không thể tải danh sách đội bóng của người dùng')
    } finally {
      setLoading(false)
    }
  }

  const loadAllTeams = async () => {
    setTeamsLoading(true)
    try {
      const response = await TeamsService.getAllTeams({ limit: 1000 })
      setAllTeams(response.teams || [])
    } catch (error) {
      console.error('Failed to load teams:', error)
      toast.error('Không thể tải danh sách đội bóng')
    } finally {
      setTeamsLoading(false)
    }
  }

  const handleAssignTeam = async () => {
    if (!selectedTeamId) {
      toast.error('Vui lòng chọn đội bóng')
      return
    }

    const teamId = Number(selectedTeamId)
    if (userTeams.some((t) => t.teamId === teamId)) {
      toast.error('Đội bóng này đã được gán cho người dùng')
      return
    }

    setAssigning(true)
    try {
      await UserService.assignTeamToUser(userId, teamId)
      toast.success('Đã gán đội bóng thành công')
      setSelectedTeamId('')
      await loadUserTeams()
      onSuccess?.()
    } catch (error) {
      console.error('Failed to assign team:', error)
      toast.error(error?.message || 'Không thể gán đội bóng')
    } finally {
      setAssigning(false)
    }
  }

  const handleRemoveTeam = async (teamId) => {
    if (!confirm(`Bạn có chắc chắn muốn gỡ đội bóng này khỏi người dùng "${userName}"?`)) {
      return
    }

    try {
      await UserService.removeTeamFromUser(userId, teamId)
      toast.success('Đã gỡ đội bóng thành công')
      await loadUserTeams()
      onSuccess?.()
    } catch (error) {
      console.error('Failed to remove team:', error)
      toast.error(error?.message || 'Không thể gỡ đội bóng')
    }
  }

  const availableTeams = allTeams.filter(
    (team) => !userTeams.some((ut) => ut.teamId === team.id)
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Quản lý đội bóng</h2>
            <p className="text-sm text-gray-600 mt-1">
              Gán đội bóng cho: <span className="font-semibold">{userName}</span>
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
          {/* Form gán đội bóng mới */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users size={20} />
              Gán đội bóng mới
            </h3>
            <div className="flex gap-3">
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={teamsLoading || assigning}
              >
                <option value="">Chọn đội bóng...</option>
                {availableTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} {team.short_name ? `(${team.short_name})` : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAssignTeam}
                disabled={!selectedTeamId || assigning || teamsLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {assigning ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Đang gán...
                  </>
                ) : (
                  'Gán đội bóng'
                )}
              </button>
            </div>
            {availableTeams.length === 0 && !teamsLoading && (
              <p className="text-sm text-gray-500 mt-2">
                Tất cả đội bóng đã được gán cho người dùng này
              </p>
            )}
          </div>

          {/* Danh sách đội bóng đã gán */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Đội bóng đã gán ({userTeams.length})
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-gray-400" />
              </div>
            ) : userTeams.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users size={48} className="mx-auto mb-2 text-gray-300" />
                <p>Chưa có đội bóng nào được gán</p>
              </div>
            ) : (
              <div className="space-y-2">
                {userTeams.map((team) => (
                  <div
                    key={team.teamId}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{team.teamName}</p>
                      {team.assignedAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Gán vào: {new Date(team.assignedAt).toLocaleDateString('vi-VN')}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveTeam(team.teamId)}
                      className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="Gỡ đội bóng"
                    >
                      Gỡ
                    </button>
                  </div>
                ))}
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

export default TeamAssignmentModal








