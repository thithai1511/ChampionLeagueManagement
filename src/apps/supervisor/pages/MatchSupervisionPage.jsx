import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Eye, FileText, Send, Loader2, AlertTriangle,
  CheckCircle, XCircle, Users, Calendar, Clock, MapPin, Shield,
  AlertCircle, ClipboardCheck, UserX, Building2, Scale, Star
} from 'lucide-react';
import ApiService from '@/layers/application/services/ApiService';
import LineupDisplay from '../../admin/components/LineupDisplay';
import toast from 'react-hot-toast';

const MatchSupervisionPage = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('supervision'); // supervision, lineups, info
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Supervision Report Form State - Per BTC Requirements
  const [report, setReport] = useState({
    // Đánh giá tổ chức trận đấu
    organization_compliant: 'yes', // yes, partial, no
    organization_rating: 8, // 1-10
    organization_notes: '',
    
    // Đánh giá sân bãi/cơ sở vật chất
    venue_quality: 8, // 1-10
    venue_issues: '',
    
    // Sai sót từ TRỌNG TÀI
    referee_performance: 'good', // excellent, good, average, poor
    referee_mistakes: '', // Chi tiết sai sót
    referee_requires_discipline: false,
    
    // Sai sót từ CẦU THỦ  
    player_incidents: '', // Hành vi phi thể thao, bạo lực
    player_requires_discipline: false,
    
    // Sai sót từ BTC SÂN THI ĐẤU
    venue_staff_issues: '', // An ninh, tổ chức
    venue_requires_discipline: false,
    
    // Kiến nghị kỷ luật gửi BTC
    send_to_disciplinary: false,
    disciplinary_details: '', // Chi tiết vụ việc cần xử lý kỷ luật
    disciplinary_recommendations: '', // Đề xuất hình thức kỷ luật
    
    // Ghi chú tổng quan
    general_notes: '',
  });

  useEffect(() => {
    fetchMatchDetails();
  }, [matchId]);

  const fetchMatchDetails = async () => {
    try {
      setLoading(true);
      const response = await ApiService.get(`/matches/${matchId}`);
      setMatch(response.data);

      // Load existing report if available
      if (response.data.supervisor_report_submitted) {
        // TODO: Fetch existing report
      }
    } catch (error) {
      console.error('Error fetching match:', error);
      toast.error('Không thể tải thông tin trận đấu');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!report.general_notes.trim()) {
      toast.error('Vui lòng nhập ghi chú chung');
      return;
    }

    // Validate disciplinary details if flagged
    if (report.send_to_disciplinary && !report.disciplinary_details.trim()) {
      toast.error('Vui lòng nhập chi tiết vụ việc cần xử lý kỷ luật');
      return;
    }

    try {
      setSubmitting(true);
      
      // Map report to backend format
      const backendReport = {
        organizationRating: report.organization_rating,
        stadiumConditionRating: report.venue_quality,
        incidentReport: [
          report.referee_mistakes && `[Trọng tài] ${report.referee_mistakes}`,
          report.player_incidents && `[Cầu thủ] ${report.player_incidents}`,
          report.venue_staff_issues && `[BTC Sân] ${report.venue_staff_issues}`,
        ].filter(Boolean).join('\n\n'),
        hasSeriousViolation: report.referee_requires_discipline || report.player_requires_discipline || report.venue_requires_discipline,
        sendToDisciplinary: report.send_to_disciplinary,
        recommendations: [
          report.organization_notes,
          report.general_notes,
          report.send_to_disciplinary && `[KỶ LUẬT] ${report.disciplinary_details}\n[ĐỀ XUẤT] ${report.disciplinary_recommendations}`,
        ].filter(Boolean).join('\n\n'),
        // Additional fields for enhanced reporting
        organizationCompliant: report.organization_compliant,
        refereePerformance: report.referee_performance,
        refereeMistakes: report.referee_mistakes,
        refereeRequiresDiscipline: report.referee_requires_discipline,
        playerIncidents: report.player_incidents,
        playerRequiresDiscipline: report.player_requires_discipline,
        venueStaffIssues: report.venue_staff_issues,
        venueRequiresDiscipline: report.venue_requires_discipline,
        disciplinaryDetails: report.disciplinary_details,
        disciplinaryRecommendations: report.disciplinary_recommendations,
        generalNotes: report.general_notes,
      };

      await ApiService.post(`/matches/${matchId}/supervisor-report`, backendReport);
      await ApiService.post(`/matches/${matchId}/mark-supervisor-report`);
      toast.success('Đã nộp báo cáo giám sát thành công!');
      navigate('/supervisor/my-assignments');
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Không thể nộp báo cáo. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
        <p className="text-gray-600 text-lg">Không tìm thấy trận đấu</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/supervisor/my-assignments')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft size={20} />
          <span>Quay lại</span>
        </button>

        {match.supervisor_report_submitted && (
          <span className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-semibold">
            <CheckCircle size={18} />
            Đã nộp báo cáo
          </span>
        )}
      </div>

      {/* Match Info Card */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Shield size={32} />
          <div>
            <h2 className="text-2xl font-bold">Giám Sát Trận Đấu</h2>
            <p className="text-purple-100">Match ID: {match.match_id}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-purple-200" />
            <div>
              <p className="text-sm text-purple-200">Đội nhà</p>
              <p className="font-semibold">{match.home_team_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Users size={20} className="text-purple-200" />
            <div>
              <p className="text-sm text-purple-200">Đội khách</p>
              <p className="font-semibold">{match.away_team_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-purple-200" />
            <div>
              <p className="text-sm text-purple-200">Thời gian</p>
              <p className="font-semibold">
                {new Date(match.date).toLocaleDateString('vi-VN')} {new Date(match.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </div>

        {match.venue && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-purple-400/30">
            <MapPin size={18} className="text-purple-200" />
            <span className="text-purple-100">{match.venue}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { value: 'supervision', label: 'Báo Cáo Giám Sát', icon: FileText },
          { value: 'lineups', label: 'Đội Hình', icon: Users },
          { value: 'info', label: 'Thông Tin', icon: Eye },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-all duration-200 border-b-2 ${
              activeTab === tab.value
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'supervision' && (
        <div className="space-y-6">
          {/* Section 1: Đánh giá công tác tổ chức */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4 pb-3 border-b">
              <ClipboardCheck className="text-indigo-600" size={22} />
              Đánh Giá Công Tác Tổ Chức Trận Đấu
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tổ chức có đúng theo quy định? *
                </label>
                <select
                  value={report.organization_compliant}
                  onChange={(e) => setReport({ ...report, organization_compliant: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={match.supervisor_report_submitted}
                >
                  <option value="yes">✅ Đúng - Tuân thủ đầy đủ quy định</option>
                  <option value="partial">⚠️ Một phần - Có một vài lỗi nhỏ</option>
                  <option value="no">❌ Không - Có sai sót nghiêm trọng</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Điểm đánh giá tổ chức (1-10) *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={report.organization_rating}
                    onChange={(e) => setReport({ ...report, organization_rating: parseInt(e.target.value) })}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    disabled={match.supervisor_report_submitted}
                  />
                  <span className={`px-3 py-1 rounded-lg font-bold text-lg min-w-[50px] text-center ${
                    report.organization_rating >= 8 ? 'bg-green-100 text-green-700' :
                    report.organization_rating >= 5 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {report.organization_rating}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Ghi chú về công tác tổ chức
              </label>
              <textarea
                rows={3}
                value={report.organization_notes}
                onChange={(e) => setReport({ ...report, organization_notes: e.target.value })}
                placeholder="Nhận xét chi tiết về công tác tổ chức trận đấu..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                disabled={match.supervisor_report_submitted}
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Chất lượng sân bãi & cơ sở vật chất (1-10)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={report.venue_quality}
                  onChange={(e) => setReport({ ...report, venue_quality: parseInt(e.target.value) })}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  disabled={match.supervisor_report_submitted}
                />
                <span className={`px-3 py-1 rounded-lg font-bold text-lg min-w-[50px] text-center ${
                  report.venue_quality >= 8 ? 'bg-green-100 text-green-700' :
                  report.venue_quality >= 5 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {report.venue_quality}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Sai sót từ TRỌNG TÀI */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4 pb-3 border-b">
              <Shield className="text-blue-600" size={22} />
              Đánh Giá Công Tác Trọng Tài
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Đánh giá chung *
                </label>
                <select
                  value={report.referee_performance}
                  onChange={(e) => setReport({ ...report, referee_performance: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  disabled={match.supervisor_report_submitted}
                >
                  <option value="excellent">🌟 Xuất sắc - Không có sai sót</option>
                  <option value="good">✅ Tốt - Một vài lỗi không đáng kể</option>
                  <option value="average">⚠️ Trung bình - Cần cải thiện</option>
                  <option value="poor">❌ Kém - Nhiều sai sót nghiêm trọng</option>
                </select>
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-red-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={report.referee_requires_discipline}
                    onChange={(e) => setReport({ ...report, referee_requires_discipline: e.target.checked })}
                    className="w-5 h-5 rounded text-red-600 focus:ring-red-500"
                    disabled={match.supervisor_report_submitted}
                  />
                  <span className="text-sm font-medium text-red-700">
                    ⚠️ Cần xem xét kỷ luật trọng tài
                  </span>
                </label>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Chi tiết sai sót từ trọng tài (nếu có)
              </label>
              <textarea
                rows={3}
                value={report.referee_mistakes}
                onChange={(e) => setReport({ ...report, referee_mistakes: e.target.value })}
                placeholder="Mô tả chi tiết các quyết định sai, thiếu sót trong điều hành trận đấu..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                disabled={match.supervisor_report_submitted}
              />
            </div>
          </div>

          {/* Section 3: Sai sót từ CẦU THỦ */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4 pb-3 border-b">
              <UserX className="text-orange-600" size={22} />
              Sai Sót / Sự Cố Từ Cầu Thủ
            </h3>

            <div className="flex items-center mb-4">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-red-50 transition-colors">
                <input
                  type="checkbox"
                  checked={report.player_requires_discipline}
                  onChange={(e) => setReport({ ...report, player_requires_discipline: e.target.checked })}
                  className="w-5 h-5 rounded text-red-600 focus:ring-red-500"
                  disabled={match.supervisor_report_submitted}
                />
                <span className="text-sm font-medium text-red-700">
                  ⚠️ Cần xem xét kỷ luật cầu thủ
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Ghi nhận sự cố từ cầu thủ
              </label>
              <textarea
                rows={4}
                value={report.player_incidents}
                onChange={(e) => setReport({ ...report, player_incidents: e.target.value })}
                placeholder="Hành vi phi thể thao, bạo lực, khiêu khích, phản ứng với trọng tài, hành vi cá độ nghi vấn..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                disabled={match.supervisor_report_submitted}
              />
            </div>
          </div>

          {/* Section 4: Sai sót từ BTC SÂN */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4 pb-3 border-b">
              <Building2 className="text-purple-600" size={22} />
              Sai Sót Từ BTC Sân Thi Đấu
            </h3>

            <div className="flex items-center mb-4">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-red-50 transition-colors">
                <input
                  type="checkbox"
                  checked={report.venue_requires_discipline}
                  onChange={(e) => setReport({ ...report, venue_requires_discipline: e.target.checked })}
                  className="w-5 h-5 rounded text-red-600 focus:ring-red-500"
                  disabled={match.supervisor_report_submitted}
                />
                <span className="text-sm font-medium text-red-700">
                  ⚠️ Cần xem xét kỷ luật BTC sân
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Chi tiết sai sót từ BTC sân
              </label>
              <textarea
                rows={4}
                value={report.venue_staff_issues}
                onChange={(e) => setReport({ ...report, venue_staff_issues: e.target.value })}
                placeholder="Vấn đề an ninh, tổ chức kém, cơ sở vật chất không đảm bảo, sự cố kỹ thuật..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                disabled={match.supervisor_report_submitted}
              />
            </div>
          </div>

          {/* Section 5: Kiến nghị gửi BTC Kỷ luật */}
          <div className={`rounded-xl shadow-sm border p-6 ${
            report.send_to_disciplinary 
              ? 'bg-red-50 border-red-300' 
              : 'bg-white border-gray-200'
          }`}>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
              <Scale className="text-red-600" size={22} />
              Kiến Nghị Gửi BTC Kỷ Luật
            </h3>

            <div className="flex items-center mb-4">
              <label className="flex items-center gap-3 cursor-pointer p-4 rounded-lg border-2 border-red-300 bg-white hover:bg-red-100 transition-colors">
                <input
                  type="checkbox"
                  checked={report.send_to_disciplinary}
                  onChange={(e) => setReport({ ...report, send_to_disciplinary: e.target.checked })}
                  className="w-6 h-6 rounded text-red-600 focus:ring-red-500"
                  disabled={match.supervisor_report_submitted}
                />
                <div>
                  <span className="text-base font-bold text-red-700 block">
                    🚨 Chuyển vụ việc cho BTC Kỷ Luật xử lý
                  </span>
                  <span className="text-xs text-red-600">
                    Tick nếu có vi phạm nghiêm trọng cần xử lý kỷ luật
                  </span>
                </div>
              </label>
            </div>

            {report.send_to_disciplinary && (
              <div className="space-y-4 pt-4 border-t border-red-200">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Chi tiết vụ việc cần xử lý kỷ luật *
                  </label>
                  <textarea
                    rows={4}
                    value={report.disciplinary_details}
                    onChange={(e) => setReport({ ...report, disciplinary_details: e.target.value })}
                    placeholder="Mô tả chi tiết vụ việc vi phạm, đối tượng liên quan, thời điểm xảy ra..."
                    className="w-full px-4 py-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 bg-white"
                    disabled={match.supervisor_report_submitted}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Đề xuất hình thức kỷ luật
                  </label>
                  <textarea
                    rows={3}
                    value={report.disciplinary_recommendations}
                    onChange={(e) => setReport({ ...report, disciplinary_recommendations: e.target.value })}
                    placeholder="Đề xuất hình thức xử lý: cảnh cáo, phạt tiền, treo giò, cấm thi đấu..."
                    className="w-full px-4 py-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 bg-white"
                    disabled={match.supervisor_report_submitted}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 6: Ghi chú tổng quan */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4 pb-3 border-b">
              <FileText className="text-gray-600" size={22} />
              Nhận Xét Tổng Quan
            </h3>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Ghi chú chung *
              </label>
              <textarea
                rows={5}
                value={report.general_notes}
                onChange={(e) => setReport({ ...report, general_notes: e.target.value })}
                placeholder="Nhận xét tổng quan về trận đấu, điểm nổi bật, vấn đề cần lưu ý cho các trận sau..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                disabled={match.supervisor_report_submitted}
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          {!match.supervisor_report_submitted && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-600">
                  <p className="font-medium">Lưu ý trước khi nộp:</p>
                  <ul className="list-disc list-inside text-xs mt-1 space-y-1">
                    <li>Đảm bảo đã điền đầy đủ các mục đánh giá bắt buộc (*)</li>
                    <li>Kiểm tra kỹ thông tin trước khi gửi</li>
                    <li>Báo cáo không thể chỉnh sửa sau khi nộp</li>
                  </ul>
                </div>
                <button
                  onClick={handleSubmitReport}
                  disabled={submitting || !report.general_notes.trim()}
                  className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Send size={20} />
                  )}
                  {submitting ? 'Đang gửi...' : 'Nộp Báo Cáo Giám Sát'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'lineups' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-blue-900 mb-4">Đội nhà: {match.home_team_name}</h3>
            <LineupDisplay
              teamColor="home"
              lineup={match.home_lineup || []}
              squad={match.home_squad}
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-red-900 mb-4">Đội khách: {match.away_team_name}</h3>
            <LineupDisplay
              teamColor="away"
              lineup={match.away_lineup || []}
              squad={match.away_squad}
            />
          </div>
        </div>
      )}

      {activeTab === 'info' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h3 className="text-xl font-bold text-gray-900">Thông Tin Trận Đấu</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Trạng thái</p>
              <p className="font-semibold text-gray-900">{match.status}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tỷ số</p>
              <p className="font-semibold text-gray-900">
                {match.home_score !== null ? `${match.home_score} - ${match.away_score}` : 'Chưa có'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Trọng tài chính</p>
              <p className="font-semibold text-gray-900">{match.main_referee_name || 'Chưa phân công'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Báo cáo trọng tài</p>
              <p className={`font-semibold ${match.referee_report_submitted ? 'text-green-600' : 'text-orange-600'}`}>
                {match.referee_report_submitted ? 'Đã nộp' : 'Chưa nộp'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchSupervisionPage;
