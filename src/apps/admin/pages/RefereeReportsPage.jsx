import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Eye, Calendar, Users, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import ApiService from '../../../layers/application/services/ApiService';
import toast from 'react-hot-toast';

const RefereeReportsPage = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await ApiService.get('/match-reports');
      // ApiService returns response.data directly, which contains { data: [...] }
      const reportsData = response.data || response;
      setReports(reportsData.data || reportsData || []);
      console.log('[RefereeReportsPage] Loaded reports:', reportsData);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Không thể tải danh sách báo cáo');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <FileText className="text-blue-600" size={28} />
          Báo Cáo Trọng Tài
        </h1>
        <p className="text-gray-600 mt-1">Xem tất cả báo cáo trận đấu từ trọng tài</p>
      </div>

      {reports.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 text-lg">Chưa có báo cáo trọng tài nào</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trận đấu
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tỷ số
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày thi đấu
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trọng tài
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày gửi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((report) => (
                <tr key={report.report_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {report.home_team_name} vs {report.away_team_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
                      {report.home_score ?? '-'} - {report.away_score ?? '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      {formatDate(report.match_date)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {report.official_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      {formatDate(report.submitted_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => setSelectedReport(report)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Eye size={14} />
                      Xem
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">
                Chi tiết báo cáo trận đấu
              </h2>
              <p className="text-gray-600 mt-1">
                {selectedReport.home_team_name} vs {selectedReport.away_team_name}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Tỷ số</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {selectedReport.home_score ?? '-'} - {selectedReport.away_score ?? '-'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Số khán giả</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {selectedReport.attendance?.toLocaleString() || '-'}
                  </p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Thời tiết</p>
                <p className="text-gray-800">{selectedReport.weather || 'Không có thông tin'}</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Ghi chú / Tóm tắt</p>
                <p className="text-gray-800 whitespace-pre-wrap">
                  {selectedReport.notes || 'Không có ghi chú'}
                </p>
              </div>
              
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Trọng tài: {selectedReport.official_name || 'N/A'}</span>
                <span>Gửi lúc: {formatDate(selectedReport.submitted_at)}</span>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => navigate(`/admin/matches/${selectedReport.match_id}/live`)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Xem trận đấu
              </button>
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefereeReportsPage;

