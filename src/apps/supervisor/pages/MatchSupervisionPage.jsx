import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Eye, FileText, Send, Loader2, AlertTriangle,
  CheckCircle, XCircle, Users, Calendar, Clock, MapPin, Shield
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

  // Supervision Report Form State
  const [report, setReport] = useState({
    organization_rating: 5, // 1-10
    venue_quality: 5, // 1-10
    compliance_status: 'compliant', // compliant, minor_issues, major_issues
    referee_performance: 'satisfactory', // excellent, satisfactory, needs_improvement, poor
    referee_notes: '',
    player_incidents: '',
    venue_staff_issues: '',
    disciplinary_recommendations: '',
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

    try {
      setSubmitting(true);
      await ApiService.post(`/matches/${matchId}/supervisor-report`, report);
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="text-indigo-600" />
            Báo Cáo Giám Sát Trận Đấu
          </h3>

          {/* Organization Rating */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Đánh giá tổ chức trận đấu (1-10) *
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={report.organization_rating}
              onChange={(e) => setReport({ ...report, organization_rating: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={match.supervisor_report_submitted}
            />
          </div>

          {/* Venue Quality */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Chất lượng sân bãi và cơ sở vật chất (1-10) *
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={report.venue_quality}
              onChange={(e) => setReport({ ...report, venue_quality: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={match.supervisor_report_submitted}
            />
          </div>

          {/* Compliance Status */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Thực hiện đúng quy định *
            </label>
            <select
              value={report.compliance_status}
              onChange={(e) => setReport({ ...report, compliance_status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={match.supervisor_report_submitted}
            >
              <option value="compliant">✅ Tuân thủ đầy đủ</option>
              <option value="minor_issues">⚠️ Có sai sót nhỏ</option>
              <option value="major_issues">❌ Có sai sót nghiêm trọng</option>
            </select>
          </div>

          {/* Referee Performance */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Đánh giá công tác trọng tài *
            </label>
            <select
              value={report.referee_performance}
              onChange={(e) => setReport({ ...report, referee_performance: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={match.supervisor_report_submitted}
            >
              <option value="excellent">🌟 Xuất sắc</option>
              <option value="satisfactory">✅ Đạt yêu cầu</option>
              <option value="needs_improvement">⚠️ Cần cải thiện</option>
              <option value="poor">❌ Kém</option>
            </select>
          </div>

          {/* Referee Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Ghi chú về trọng tài (sai sót, vi phạm)
            </label>
            <textarea
              rows={4}
              value={report.referee_notes}
              onChange={(e) => setReport({ ...report, referee_notes: e.target.value })}
              placeholder="Mô tả chi tiết các sai sót từ trọng tài (nếu có)..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={match.supervisor_report_submitted}
            />
          </div>

          {/* Player Incidents */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Sự cố từ cầu thủ (hành vi phi thể thao, bạo lực)
            </label>
            <textarea
              rows={4}
              value={report.player_incidents}
              onChange={(e) => setReport({ ...report, player_incidents: e.target.value })}
              placeholder="Ghi nhận các sự cố, hành vi sai trái của cầu thủ..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={match.supervisor_report_submitted}
            />
          </div>

          {/* Venue Staff Issues */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Sai sót từ BTC sân thi đấu
            </label>
            <textarea
              rows={4}
              value={report.venue_staff_issues}
              onChange={(e) => setReport({ ...report, venue_staff_issues: e.target.value })}
              placeholder="Ghi nhận các sai sót trong tổ chức, cơ sở vật chất, an ninh..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={match.supervisor_report_submitted}
            />
          </div>

          {/* Disciplinary Recommendations */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Kiến nghị kỷ luật gửi BTC
            </label>
            <textarea
              rows={4}
              value={report.disciplinary_recommendations}
              onChange={(e) => setReport({ ...report, disciplinary_recommendations: e.target.value })}
              placeholder="Đề xuất các biện pháp kỷ luật đối với cá nhân/đội vi phạm..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={match.supervisor_report_submitted}
            />
          </div>

          {/* General Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Ghi chú chung *
            </label>
            <textarea
              rows={5}
              value={report.general_notes}
              onChange={(e) => setReport({ ...report, general_notes: e.target.value })}
              placeholder="Nhận xét tổng quan về trận đấu, điểm nổi bật, vấn đề cần lưu ý..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={match.supervisor_report_submitted}
              required
            />
          </div>

          {/* Submit Button */}
          {!match.supervisor_report_submitted && (
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                onClick={handleSubmitReport}
                disabled={submitting || !report.general_notes.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Send size={18} />
                )}
                {submitting ? 'Đang gửi...' : 'Nộp Báo Cáo'}
              </button>
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
