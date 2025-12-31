import React, { useEffect, useState } from 'react'
import { Shield, Calendar, AlertCircle, CheckCircle, Send, Loader2, ClipboardCheck, UserX, Building2, Scale, FileText } from 'lucide-react'
import ApiService from '../../services/ApiService'

const SupervisorEvaluationPage = () => {
  const [matches, setMatches] = useState([])
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [form, setForm] = useState({
    organization_compliant: 'yes',
    organization_rating: 8,
    organization_notes: '',
    venue_quality: 8,
    referee_performance: 'good',
    referee_mistakes: '',
    referee_requires_discipline: false,
    player_incidents: '',
    player_requires_discipline: false,
    venue_staff_issues: '',
    venue_requires_discipline: false,
    send_to_disciplinary: false,
    disciplinary_details: '',
    disciplinary_recommendations: '',
    general_notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

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

  const handleChange = (k) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(prev => ({ ...prev, [k]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedMatch) {
      setMessage({ type: 'error', text: 'Vui lòng chọn trận đấu' })
      return
    }
    if (!form.general_notes.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập ghi chú chung' })
      return
    }
    if (form.send_to_disciplinary && !form.disciplinary_details.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập chi tiết vụ việc cần xử lý kỷ luật' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const matchId = selectedMatch.match_id || selectedMatch.matchId

      // Map report to backend format
      const backendReport = {
        organizationRating: form.organization_rating,
        stadiumConditionRating: form.venue_quality,
        incidentReport: [
          form.referee_mistakes && `[Trọng tài] ${form.referee_mistakes}`,
          form.player_incidents && `[Cầu thủ] ${form.player_incidents}`,
          form.venue_staff_issues && `[BTC Sân] ${form.venue_staff_issues}`,
        ].filter(Boolean).join('\n\n'),
        hasSeriousViolation: form.referee_requires_discipline || form.player_requires_discipline || form.venue_requires_discipline,
        sendToDisciplinary: form.send_to_disciplinary,
        recommendations: [
          form.organization_notes,
          form.general_notes,
          form.send_to_disciplinary && `[KỶ LUẬT] ${form.disciplinary_details}\n[ĐỀ XUẤT] ${form.disciplinary_recommendations}`,
        ].filter(Boolean).join('\n\n'),
      }

      await ApiService.post(`/matches/${matchId}/supervisor-report`, backendReport)
      await ApiService.post(`/matches/${matchId}/mark-supervisor-report`)
      setMessage({ type: 'success', text: 'Báo cáo giám sát đã gửi thành công!' })
      setForm({
        organization_compliant: 'yes',
        organization_rating: 8,
        organization_notes: '',
        venue_quality: 8,
        referee_performance: 'good',
        referee_mistakes: '',
        referee_requires_discipline: false,
        player_incidents: '',
        player_requires_discipline: false,
        venue_staff_issues: '',
        venue_requires_discipline: false,
        send_to_disciplinary: false,
        disciplinary_details: '',
        disciplinary_recommendations: '',
        general_notes: ''
      })
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
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 mb-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
            <Shield size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Báo Cáo Giám Sát Trận Đấu</h2>
            <p className="text-purple-100">Đánh giá công tác tổ chức và ghi nhận sai sót</p>
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
          <Calendar size={18} className="text-purple-500" />
          Chọn Trận Đấu *
        </label>
        <select 
          value={selectedMatch?.match_id || selectedMatch?.matchId || ''} 
          onChange={(e) => {
            const match = matches.find(m => (m.match_id || m.matchId) === parseInt(e.target.value))
            setSelectedMatch(match)
          }} 
          className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
          {/* Section 1: Đánh giá tổ chức */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4 pb-3 border-b">
              <ClipboardCheck className="text-indigo-600" size={22} />
              Đánh Giá Công Tác Tổ Chức
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tổ chức đúng quy định? *</label>
                <select value={form.organization_compliant} onChange={handleChange('organization_compliant')} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500">
                  <option value="yes">✅ Đúng - Tuân thủ đầy đủ</option>
                  <option value="partial">⚠️ Một phần - Có lỗi nhỏ</option>
                  <option value="no">❌ Không - Sai sót nghiêm trọng</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Điểm đánh giá (1-10)</label>
                <div className="flex items-center gap-3">
                  <input type="range" min="1" max="10" value={form.organization_rating} onChange={(e) => setForm(prev => ({ ...prev, organization_rating: parseInt(e.target.value) }))} className="flex-1 h-2 bg-gray-200 rounded-lg accent-purple-600" />
                  <span className={`px-3 py-1 rounded-lg font-bold min-w-[50px] text-center ${form.organization_rating >= 8 ? 'bg-green-100 text-green-700' : form.organization_rating >= 5 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{form.organization_rating}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú tổ chức</label>
              <textarea value={form.organization_notes} onChange={handleChange('organization_notes')} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500" rows={2} placeholder="Nhận xét về công tác tổ chức..." />
            </div>
          </div>

          {/* Section 2: Đánh giá trọng tài */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4 pb-3 border-b">
              <Shield className="text-blue-600" size={22} />
              Đánh Giá Trọng Tài
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Đánh giá chung *</label>
                <select value={form.referee_performance} onChange={handleChange('referee_performance')} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500">
                  <option value="excellent">🌟 Xuất sắc</option>
                  <option value="good">✅ Tốt</option>
                  <option value="average">⚠️ Trung bình</option>
                  <option value="poor">❌ Kém</option>
                </select>
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-red-50">
                  <input type="checkbox" checked={form.referee_requires_discipline} onChange={handleChange('referee_requires_discipline')} className="w-5 h-5 rounded text-red-600" />
                  <span className="text-sm font-medium text-red-700">⚠️ Cần xem xét kỷ luật</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sai sót trọng tài</label>
              <textarea value={form.referee_mistakes} onChange={handleChange('referee_mistakes')} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500" rows={2} placeholder="Mô tả các quyết định sai, thiếu sót..." />
            </div>
          </div>

          {/* Section 3: Sự cố cầu thủ */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4 pb-3 border-b">
              <UserX className="text-orange-600" size={22} />
              Sự Cố Từ Cầu Thủ
            </h3>

            <div className="flex items-center mb-4">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-red-50">
                <input type="checkbox" checked={form.player_requires_discipline} onChange={handleChange('player_requires_discipline')} className="w-5 h-5 rounded text-red-600" />
                <span className="text-sm font-medium text-red-700">⚠️ Cần xem xét kỷ luật cầu thủ</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ghi nhận sự cố</label>
              <textarea value={form.player_incidents} onChange={handleChange('player_incidents')} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500" rows={3} placeholder="Hành vi phi thể thao, bạo lực, khiêu khích..." />
            </div>
          </div>

          {/* Section 4: Sai sót BTC sân */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4 pb-3 border-b">
              <Building2 className="text-purple-600" size={22} />
              Sai Sót BTC Sân Thi Đấu
            </h3>

            <div className="flex items-center mb-4">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-red-50">
                <input type="checkbox" checked={form.venue_requires_discipline} onChange={handleChange('venue_requires_discipline')} className="w-5 h-5 rounded text-red-600" />
                <span className="text-sm font-medium text-red-700">⚠️ Cần xem xét kỷ luật BTC sân</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chi tiết sai sót</label>
              <textarea value={form.venue_staff_issues} onChange={handleChange('venue_staff_issues')} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500" rows={3} placeholder="Vấn đề an ninh, tổ chức, cơ sở vật chất..." />
            </div>
          </div>

          {/* Section 5: Kiến nghị kỷ luật */}
          <div className={`rounded-xl shadow-sm border p-6 ${form.send_to_disciplinary ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'}`}>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4 pb-3 border-b">
              <Scale className="text-red-600" size={22} />
              Kiến Nghị Gửi BTC Kỷ Luật
            </h3>

            <div className="flex items-center mb-4">
              <label className="flex items-center gap-3 cursor-pointer p-4 rounded-lg border-2 border-red-300 bg-white hover:bg-red-100">
                <input type="checkbox" checked={form.send_to_disciplinary} onChange={handleChange('send_to_disciplinary')} className="w-6 h-6 rounded text-red-600" />
                <div>
                  <span className="text-base font-bold text-red-700 block">🚨 Chuyển vụ việc cho BTC Kỷ Luật</span>
                  <span className="text-xs text-red-600">Tick nếu có vi phạm nghiêm trọng cần xử lý kỷ luật</span>
                </div>
              </label>
            </div>

            {form.send_to_disciplinary && (
              <div className="space-y-4 pt-4 border-t border-red-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chi tiết vụ việc *</label>
                  <textarea value={form.disciplinary_details} onChange={handleChange('disciplinary_details')} className="w-full border border-red-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 bg-white" rows={3} placeholder="Mô tả chi tiết vụ việc vi phạm..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đề xuất hình thức kỷ luật</label>
                  <textarea value={form.disciplinary_recommendations} onChange={handleChange('disciplinary_recommendations')} className="w-full border border-red-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 bg-white" rows={2} placeholder="Đề xuất: cảnh cáo, phạt tiền, treo giò..." />
                </div>
              </div>
            )}
          </div>

          {/* Section 6: Ghi chú chung */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4 pb-3 border-b">
              <FileText className="text-gray-600" size={22} />
              Nhận Xét Tổng Quan
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú chung *</label>
              <textarea value={form.general_notes} onChange={handleChange('general_notes')} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500" rows={4} placeholder="Nhận xét tổng quan về trận đấu..." required />
            </div>
          </div>

          {/* Submit */}
          <button 
            type="submit" 
            disabled={loading || !form.general_notes.trim()} 
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Đang gửi...
              </>
            ) : (
              <>
                <Send size={20} />
                Nộp Báo Cáo Giám Sát
              </>
            )}
          </button>
        </form>
      )}
    </div>
  )
}

export default SupervisorEvaluationPage
