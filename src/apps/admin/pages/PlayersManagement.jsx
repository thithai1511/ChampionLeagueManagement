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
  AlertCircle
} from 'lucide-react'
import PlayersService from '../../../layers/application/services/PlayersService'
import TeamsService from '../../../layers/application/services/TeamsService'
import { DB_POSITIONS } from '../../../shared/constants/footballPositions'

const PlayersManagement = ({ currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Creation Form State
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createMessage, setCreateMessage] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    date_of_birth: '',
    nationality: '',
    position: '',
    internal_team_id: '' // Will be set automatically if user is team admin
  })

  // User Teams (for internal_team_id selection if Super Admin or multiple teams)
  const [userTeams, setUserTeams] = useState([])

  const fetchPlayers = async () => {
    setLoading(true)
    try {
      const response = await PlayersService.listPlayers({
        search: searchTerm,
        limit: 100 // Load more to see updates
      })
      setPlayers(response.players || [])
    } catch (err) {
      console.error('Failed to load players', err)
      setError('Không thể tải danh sách cầu thủ.')
    } finally {
      setLoading(false)
    }
  }

  // Initial Load
  useEffect(() => {
    fetchPlayers()
    // Load teams for selection if needed
    const loadTeams = async () => {
      try {
        // Logic to get my teams. For now, assume Admin Team has one team or we pick the first one.
        // If Super Admin, fetch all.
        const response = await TeamsService.getAllTeams({ limit: 100 })
        setUserTeams(response.teams || [])

        // Auto-set team if only one
        if (response.teams?.length === 1) {
          setFormData(prev => ({ ...prev, internal_team_id: response.teams[0].id }))
        }
      } catch (e) { console.error(e) }
    }
    loadTeams()
  }, [searchTerm])


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
        // Try to find a default or error
        // For simplicity, if not selected, try first one or error
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
      // Reset form
      setFormData(prev => ({
        ...prev,
        name: '',
        date_of_birth: '',
        nationality: '',
        position: ''
      }))
      // Refresh list
      fetchPlayers()

    } catch (err) {
      console.error(err)
      setCreateMessage({ type: 'error', text: err.message || 'Lỗi khi tạo cầu thủ.' })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Cầu thủ (Player Pool)</h1>
          <p className="text-gray-500">Danh sách tất cả cầu thủ thuộc đội bóng của bạn.</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {showCreateForm ? <X size={20} /> : <Plus size={20} />}
          <span>{showCreateForm ? 'Đóng Form' : 'Thêm Cầu thủ Mới'}</span>
        </button>
      </div>

      {/* Creation Form Section */}
      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow-md border border-blue-100 animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Plus size={18} className="mr-2 text-blue-600" />
            Thêm mới cầu thủ vào Master Pool
          </h3>

          {createMessage && (
            <div className={`p-3 mb-4 rounded-md flex items-center ${createMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {createMessage.type === 'success' ? <CheckCircle size={18} className="mr-2" /> : <AlertCircle size={18} className="mr-2" />}
              {createMessage.text}
            </div>
          )}

          <form onSubmit={handleCreateSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Team Selection (if applicable) */}
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
                  {userTeams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleCreateChange}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Nguyễn Văn A"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày sinh <span className="text-red-500">*</span></label>
              <input
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleCreateChange}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quốc tịch</label>
              <input
                type="text"
                name="nationality"
                value={formData.nationality}
                onChange={handleCreateChange}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Vietnam"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vị trí thi đấu</label>
              <select
                name="position"
                value={formData.position}
                onChange={handleCreateChange}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">-- Chọn vị trí --</option>
                {DB_POSITIONS.map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex justify-end mt-2">
              <button
                type="submit"
                disabled={creating}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-70 flex items-center"
              >
                {creating && <Loader2 size={16} className="animate-spin mr-2" />}
                {creating ? 'Đang tạo...' : 'Tạo cầu thủ'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Tìm kiếm cầu thủ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          <Filter size={18} />
          <span>Bộ lọc</span>
        </button>
      </div>

      {/* Player List Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center flex flex-col items-center justify-center text-gray-500">
            <Loader2 size={32} className="animate-spin mb-2" />
            Đang tải danh sách...
          </div>
        ) : players.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Chưa có cầu thủ nào. Hãy tạo cầu thủ mới.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-medium">ID</th>
                  <th className="px-6 py-3 font-medium">Họ tên</th>
                  <th className="px-6 py-3 font-medium">Ngày sinh</th>
                  <th className="px-6 py-3 font-medium">Quốc tịch</th>
                  <th className="px-6 py-3 font-medium">Vị trí</th>
                  <th className="px-6 py-3 font-medium">Đội (Internal)</th>
                  <th className="px-6 py-3 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {players.map(player => (
                  <tr key={player.id} className="hover:bg-gray-50 transition-colors">
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
                    <td className="px-6 py-4 text-right">
                      <button className="text-gray-400 hover:text-blue-600 transition-colors">
                        <Edit size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default PlayersManagement




