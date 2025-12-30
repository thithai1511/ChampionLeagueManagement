import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Calendar, CheckCircle, Clock, Eye, Loader2, AlertCircle, Shield } from 'lucide-react';
import ApiService from '@/layers/application/services/ApiService';
import { useAuth } from '@/layers/application/context/AuthContext';
import toast from 'react-hot-toast';

const ReportsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      // Get all matches supervised by current user that have reports
      const response = await ApiService.get('/matches');
      const supervisedReports = response.data.filter(
        m => m.supervisor_id === user?.userId && m.supervisor_report_submitted
      );
      setReports(supervisedReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Không thể tải danh sách báo cáo');
    } finally {
      setLoading(false);
    }
  };

  const getComplianceColor = (status) => {
    switch (status) {
      case 'compliant': return 'text-green-600';
      case 'minor_issues': return 'text-yellow-600';
      case 'major_issues': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getComplianceLabel = (status) => {
    switch (status) {
      case 'compliant': return '✅ Tuân thủ';
      case 'minor_issues': return '⚠️ Sai sót nhỏ';
      case 'major_issues': return '❌ Sai sót nghiêm trọng';
      default: return 'Không rõ';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <FileText className="text-indigo-600" size={32} />
          Lịch Sử Báo Cáo Giám Sát
        </h2>
        <p className="text-gray-600 mt-2">Xem lại các báo cáo đã nộp</p>
      </div>

      {/* Stats */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-indigo-100 text-sm font-medium">Tổng số báo cáo</p>
            <p className="text-4xl font-bold mt-1">{reports.length}</p>
          </div>
          <Shield size={48} className="text-indigo-200" />
        </div>
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600 text-lg">Chưa có báo cáo nào</p>
          <p className="text-gray-500 text-sm mt-2">Các báo cáo giám sát đã nộp sẽ hiển thị ở đây</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <div
              key={report.match_id}
              className="bg-white rounded-xl shadow-sm hover:shadow-lg border border-gray-200 p-6 transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  {/* Match Info */}
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1">
                        <CheckCircle size={14} />
                        Đã nộp
                      </span>
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(report.date).toLocaleDateString('vi-VN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Clock size={14} />
                        {new Date(report.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-lg font-semibold text-gray-900">
                      <span>{report.home_team_name}</span>
                      <span className="text-gray-400">vs</span>
                      <span>{report.away_team_name}</span>
                    </div>

                    {report.venue && (
                      <p className="text-sm text-gray-600 mt-1">📍 {report.venue}</p>
                    )}
                  </div>

                  {/* Report Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-500">Tổ chức</p>
                      <p className="font-semibold text-gray-900">
                        {report.organization_rating || '-'}/10
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Cơ sở vật chất</p>
                      <p className="font-semibold text-gray-900">
                        {report.venue_quality || '-'}/10
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Tuân thủ quy định</p>
                      <p className={`font-semibold text-sm ${getComplianceColor(report.compliance_status)}`}>
                        {getComplianceLabel(report.compliance_status)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Trọng tài</p>
                      <p className="font-semibold text-gray-900 text-sm">
                        {report.referee_performance === 'excellent' && '🌟 Xuất sắc'}
                        {report.referee_performance === 'satisfactory' && '✅ Đạt'}
                        {report.referee_performance === 'needs_improvement' && '⚠️ Cần cải thiện'}
                        {report.referee_performance === 'poor' && '❌ Kém'}
                        {!report.referee_performance && '-'}
                      </p>
                    </div>
                  </div>

                  {/* Notes Preview */}
                  {report.general_notes && (
                    <div className="pt-3 border-t border-gray-100">
                      <p className="text-sm text-gray-600 line-clamp-2">
                        <span className="font-semibold">Ghi chú: </span>
                        {report.general_notes}
                      </p>
                    </div>
                  )}

                  {/* Disciplinary Flag */}
                  {report.disciplinary_recommendations && (
                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-sm">
                        <AlertCircle size={16} className="text-red-500" />
                        <span className="font-semibold text-red-600">Có kiến nghị kỷ luật</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* View Button */}
                <button
                  onClick={() => navigate(`/supervisor/match/${report.match_id}`)}
                  className="flex items-center gap-2 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg font-medium transition-colors duration-200 border border-indigo-200"
                >
                  <Eye size={18} />
                  <span>Xem</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
