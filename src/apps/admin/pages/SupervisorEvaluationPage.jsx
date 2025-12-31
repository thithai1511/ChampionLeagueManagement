import React, { useEffect, useState } from 'react'
import ApiService from '../../services/ApiService'

const SupervisorEvaluationPage = () => {
  const [matches, setMatches] = useState([])
  const [selectedMatchId, setSelectedMatchId] = useState(null)
  const [form, setForm] = useState({
    organization_ok: 'yes',
    incidents: '',
    discipline_required: false,
    suggested_actions: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await ApiService.get('/matches/assigned')
        setMatches(res.data || [])
      } catch (e) {
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

  const handleChange = (k) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(prev => ({ ...prev, [k]: value }))
  }

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
        organization_ok: form.organization_ok,
        incidents: form.incidents,
        discipline_flag: form.discipline_required,
        suggested_actions: form.suggested_actions
      }

      await ApiService.post('/supervisor-reports', payload)
      setMessage({ type: 'success', text: 'Báo cáo giám sát đã gửi cho BTC' })
      setForm({ organization_ok: 'yes', incidents: '', discipline_required: false, suggested_actions: '' })
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'Gửi báo cáo thất bại' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Báo cáo Giám sát trận đấu</h2>

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
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block mb-1">Đánh giá chung (tổ chức có đúng quy định?)</label>
            <select value={form.organization_ok} onChange={handleChange('organization_ok')} className="border p-2 w-full">
              <option value="yes">Đúng</option>
              <option value="partial">Một vài lỗi</option>
              <option value="no">Không đúng</option>
            </select>
          </div>

          <div>
            <label className="block mb-1">Ghi chú chi tiết / Sai sót (ví dụ: 2 thẻ vàng liên tiếp trong 1 phút, phản lưới nhà, hành vi cá độ...)</label>
            <textarea value={form.incidents} onChange={handleChange('incidents')} className="border p-2 w-full" rows={6} />
          </div>

          <div className="flex items-center gap-3">
            <input id="discipline" type="checkbox" checked={form.discipline_required} onChange={handleChange('discipline_required')} />
            <label htmlFor="discipline">Chuyển vụ việc cho BTC kỷ luật / trọng tài</label>
          </div>

          <div>
            <label className="block mb-1">Hành động đề xuất</label>
            <textarea value={form.suggested_actions} onChange={handleChange('suggested_actions')} className="border p-2 w-full" rows={3} />
          </div>

          <div>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">
              {loading ? 'Đang gửi...' : 'Gửi báo cáo giám sát'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default SupervisorEvaluationPage
