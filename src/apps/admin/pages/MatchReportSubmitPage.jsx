import React, { useEffect, useState } from 'react'
import { FileText, Award, Goal, Square, Send, Calendar, Loader2, AlertCircle, CheckCircle, Activity } from 'lucide-react'
import ApiService from '../../services/ApiService'

const MatchReportSubmitPage = () => {
  const [matches, setMatches] = useState([])
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [players, setPlayers] = useState({ home: [], away: [] })
  const [form, setForm] = useState({
    mvpTeamId: '',
    mvpPlayerId: '',
    weather: '',
    attendance: '',
    matchSummary: '',
    notes: '',
    incidents: '',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [loadingPlayers, setLoadingPlayers] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await ApiService.get('/matches/assigned')
        setMatches(res.data?.matches || res.data || [])
      } catch (e) {
        try {
          const r2 = await ApiService.get('/matches')
          setMatches(r2.data?.matches || r2.data || [])
        } catch (err) {
          setMatches([])
        }
      }
    }
    load()
  }, [])

  const handleSelectMatch = async (matchId) => {
    const match = matches.find(m => (m.match_id || m.matchId) === parseInt(matchId))
    setSelectedMatch(match)
    setForm(prev => ({ ...prev, mvpTeamId: '', mvpPlayerId: '' }))
    
    if (match) {
      setLoadingPlayers(true)
      try {
        const homeTeamId = match.homeTeamId || match.home_team_id
        const awayTeamId = match.awayTeamId || match.away_team_id
        
        const [homeRes, awayRes] = await Promise.all([
          ApiService.get(`/teams/${homeTeamId}/players`).catch(() => ({ data: [] })),
          ApiService.get(`/teams/${awayTeamId}/players`).catch(() => ({ data: [] }))
        ])
        
        setPlayers({
          home: homeRes.data || [],
          away: awayRes.data || []
        })
      } catch (e) {
        console.error('Error loading players:', e)
      } finally {
        setLoadingPlayers(false)
      }
    }
  }

  const handleChange = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedMatch) {
      setMessage({ type: 'error', text: 'Vui lòng chọn trận đấu' })
      return
    }
    if (!form.mvpPlayerId) {
      setMessage({ type: 'error', text: 'Vui lòng chọn cầu thủ xuất sắc nhất (MVP)' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const matchId = selectedMatch.match_id || selectedMatch.matchId
      const mvpPlayer = [...players.home, ...players.away].find(p => p.id === parseInt(form.mvpPlayerId))
      const mvpTeamName = form.mvpTeamId === (selectedMatch.homeTeamId || selectedMatch.home_team_id)?.toString() 
        ? (selectedMatch.homeTeamName || selectedMatch.home_team_name)
        : (selectedMatch.awayTeamName || selectedMatch.away_team_name)

      const payload = {
        weather: form.weather,
        attendance: form.attendance,
        matchSummary: form.matchSummary,
        notes: form.notes,
        incidents: form.incidents,
        mvpPlayerId: form.mvpPlayerId,
        mvpPlayerName: mvpPlayer?.full_name || mvpPlayer?.name || '',
        mvpTeamName,
        homeScore: selectedMatch.homeScore ?? selectedMatch.home_score ?? 0,
        awayScore: selectedMatch.awayScore ?? selectedMatch.away_score ?? 0,
      }

      await ApiService.post(`/matches/${matchId}/referee-report`, payload)
      await ApiService.post(`/matches/${matchId}/mark-referee-report`)
      setMessage({ type: 'success', text: 'Báo cáo trọng tài đã gửi thành công!' })
      setForm({ mvpTeamId: '', mvpPlayerId: '', weather: '', attendance: '', matchSummary: '', notes: '', incidents: '' })
      setSelectedMatch(null)
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'Gửi báo cáo thất bại' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 mb-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
            <FileText size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Báo Cáo Trận Đấu - Trọng Tài</h2>
            <p className="text-blue-100">Gửi báo cáo kết quả và thông tin trận đấu cho BTC</p>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
          {message.text}
        </div>
      )}

      {/* Match Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <Calendar size={18} className="text-blue-500" />
          Chọn Trận Đấu *
        </label>
        <select 
          value={selectedMatch?.match_id || selectedMatch?.matchId || ''} 
          onChange={(e) => handleSelectMatch(e.target.value)} 
          className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">-- Chọn trận đấu --</option>
          {matches.map(m => (
            <option key={m.match_id || m.matchId} value={m.match_id || m.matchId}>
              {m.homeTeamName || m.home_team_name} vs {m.awayTeamName || m.away_team_name} — {new Date(m.scheduledKickoff || m.kickoff).toLocaleDateString('vi-VN')}
            </option>
          ))}
        </select>
      </div>

      {selectedMatch && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Match Info */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-6 text-white">
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-sm text-slate-300 mb-1">Đội nhà</p>
                <p className="text-lg font-bold">{selectedMatch.homeTeamName || selectedMatch.home_team_name}</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-black font-mono">
                  {selectedMatch.homeScore ?? selectedMatch.home_score ?? 0} - {selectedMatch.awayScore ?? selectedMatch.away_score ?? 0}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-300 mb-1">Đội khách</p>
                <p className="text-lg font-bold">{selectedMatch.awayTeamName || selectedMatch.away_team_name}</p>
              </div>
            </div>
          </div>

          {/* MVP Selection */}
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-6 border-2 border-yellow-200">
            <label className="block text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <Award className="text-yellow-500" size={22} />
              Cầu Thủ Xuất Sắc Nhất (MVP) *
            </label>
            
            {loadingPlayers ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="animate-spin" size={18} />
                Đang tải danh sách cầu thủ...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Chọn đội</label>
                  <select
                    value={form.mvpTeamId}
                    onChange={(e) => setForm(prev => ({ ...prev, mvpTeamId: e.target.value, mvpPlayerId: '' }))}
                    className="w-full border border-yellow-300 rounded-lg p-3 bg-white focus:ring-2 focus:ring-yellow-400"
                  >
                    <option value="">-- Chọn đội --</option>
                    <option value={selectedMatch.homeTeamId || selectedMatch.home_team_id}>
                      {selectedMatch.homeTeamName || selectedMatch.home_team_name}
                    </option>
                    <option value={selectedMatch.awayTeamId || selectedMatch.away_team_id}>
                      {selectedMatch.awayTeamName || selectedMatch.away_team_name}
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Chọn cầu thủ</label>
                  <select
                    value={form.mvpPlayerId}
                    onChange={handleChange('mvpPlayerId')}
                    className="w-full border border-yellow-300 rounded-lg p-3 bg-white focus:ring-2 focus:ring-yellow-400"
                    disabled={!form.mvpTeamId}
                  >
                    <option value="">-- Chọn cầu thủ --</option>
                    {(form.mvpTeamId === (selectedMatch.homeTeamId || selectedMatch.home_team_id)?.toString() 
                      ? players.home 
                      : players.away
                    ).map(player => (
                      <option key={player.id} value={player.id}>
                        #{player.shirt_number || '?'} - {player.full_name || player.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Match Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Activity size={20} className="text-blue-500" />
              Thông Tin Trận Đấu
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thời tiết</label>
                <input 
                  value={form.weather} 
                  onChange={handleChange('weather')} 
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: Nắng, 28°C" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số khán giả</label>
                <input 
                  type="number"
                  value={form.attendance} 
                  onChange={handleChange('attendance')} 
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: 5000" 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tóm tắt trận đấu *</label>
              <textarea 
                value={form.matchSummary} 
                onChange={handleChange('matchSummary')} 
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500" 
                rows={4}
                placeholder="Mô tả diễn biến chính của trận đấu..." 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú chuyên môn</label>
              <textarea 
                value={form.notes} 
                onChange={handleChange('notes')} 
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500" 
                rows={3}
                placeholder="Ghi chú kỹ thuật, chiến thuật..." 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <AlertCircle size={16} className="text-orange-500" />
                Sự cố / Vấn đề cần báo cáo
              </label>
              <textarea 
                value={form.incidents} 
                onChange={handleChange('incidents')} 
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500" 
                rows={3}
                placeholder="Ghi nhận sự cố, tranh cãi, hành vi phi thể thao..." 
              />
            </div>
          </div>

          {/* Submit */}
          <button 
            type="submit" 
            disabled={loading || !form.mvpPlayerId} 
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Đang gửi...
              </>
            ) : (
              <>
                <Send size={20} />
                Nộp Báo Cáo Trận Đấu
              </>
            )}
          </button>
        </form>
      )}
    </div>
  )
}

export default MatchReportSubmitPage
