import React, { useEffect, useState } from 'react'
import ApiService from '../../services/ApiService'

const MatchReportSubmitPage = () => {
  const [matches, setMatches] = useState([])
  const [selectedMatchId, setSelectedMatchId] = useState(null)
  const [form, setForm] = useState({
    scoreHome: '',
    scoreAway: '',
    manOfMatchPlayerId: '',
    goalscorers: '',
    yellowCards: '',
    redCards: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        // Try to load matches assigned to this official (backend should expose assigned matches)
        const res = await ApiService.get('/matches/assigned')
        setMatches(res.data || [])
      } catch (e) {
        // fallback: load upcoming matches
        try {
          const r2 = await ApiService.get('/matches')
          setMatches(r2.data || [])
        } catch (err) {
          setMatches([])
        }
      }
    }
    load()
  }, [])

  const handleChange = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedMatchId) {
      setMessage({ type: 'error', text: 'Vui lòng chọn trận đấu' })
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      const payload = {
        matchId: selectedMatchId,
        scoreHome: form.scoreHome,
        scoreAway: form.scoreAway,
        manOfMatchPlayerId: form.manOfMatchPlayerId || null,
        goalscorers: form.goalscorers, // simple CSV of player IDs or names
        yellowCards: form.yellowCards,
        redCards: form.redCards,
        notes: form.notes,
      }
      await ApiService.post('/match-reports', payload)
      setMessage({ type: 'success', text: 'Báo cáo đã gửi thành công' })
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'Gửi báo cáo thất bại' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Gửi Báo cáo Trận đấu</h2>
      {message && (
        <div className={`mb-4 p-3 ${message.type === 'error' ? 'bg-red-100' : 'bg-green-100'}`}>
          {message.text}
        </div>
      )}

      <div className="mb-4">
        <label className="block mb-1">Chọn trận</label>
        <select value={selectedMatchId || ''} onChange={(e) => setSelectedMatchId(parseInt(e.target.value) || null)} className="border p-2 w-full">
          <option value="">-- Chọn --</option>
          {matches.map(m => (
            <option key={m.match_id} value={m.match_id}>{`${m.home_team_name} vs ${m.away_team_name} — ${m.kickoff}`}</option>
          ))}
        </select>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block">Số bàn đội chủ</label>
            <input value={form.scoreHome} onChange={handleChange('scoreHome')} className="border p-2 w-full" />
          </div>
          <div>
            <label className="block">Số bàn đội khách</label>
            <input value={form.scoreAway} onChange={handleChange('scoreAway')} className="border p-2 w-full" />
          </div>
          <div className="col-span-2">
            <label className="block">Cầu thủ xuất sắc nhất (player id)</label>
            <input value={form.manOfMatchPlayerId} onChange={handleChange('manOfMatchPlayerId')} className="border p-2 w-full" />
          </div>
          <div className="col-span-2">
            <label className="block">Danh sách cầu thủ ghi bàn (CSV ids hoặc tên)</label>
            <input value={form.goalscorers} onChange={handleChange('goalscorers')} className="border p-2 w-full" />
          </div>
          <div>
            <label className="block">Số thẻ vàng (tổng)</label>
            <input value={form.yellowCards} onChange={handleChange('yellowCards')} className="border p-2 w-full" />
          </div>
          <div>
            <label className="block">Số thẻ đỏ (tổng)</label>
            <input value={form.redCards} onChange={handleChange('redCards')} className="border p-2 w-full" />
          </div>
          <div className="col-span-2">
            <label className="block">Ghi chú / Đánh giá công tác tổ chức & sai sót</label>
            <textarea value={form.notes} onChange={handleChange('notes')} className="border p-2 w-full" rows={6} />
          </div>
        </div>

        <div className="mt-4">
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">
            {loading ? 'Đang gửi...' : 'Gửi báo cáo'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default MatchReportSubmitPage
