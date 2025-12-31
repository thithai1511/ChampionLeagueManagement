import React, { useState, useEffect, useRef } from 'react';
import { FileText, Calendar, CheckCircle, Clock, Eye, Loader2, AlertCircle, Shield, Filter, Search, RefreshCw } from 'lucide-react';
import ApiService from '../../../layers/application/services/ApiService';
import { useAuth } from '../../../layers/application/context/AuthContext';
import toast from 'react-hot-toast';

const SupervisorReportsPage = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, reviewed, disciplinary
  const [searchTerm, setSearchTerm] = useState('');
  const refreshIntervalRef = useRef(null);

  useEffect(() => {
    fetchReports();
    
    // Auto-refresh every 30 seconds
    refreshIntervalRef.current = setInterval(() => {
      fetchReports(true); // Silent refresh
    }, 30000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  const fetchReports = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      
      const response = await ApiService.get('/admin/supervisor-reports');
      console.log('Supervisor reports response:', response);
      
      const reportsData = response.data?.data || response.data || [];
      console.log('Parsed reports:', reportsData);
      
      setReports(reportsData);
      
      if (!silent && reportsData.length > 0) {
        toast.success(`Đã tải ${reportsData.length} báo cáo`);
      }
    } catch (error) {
      console.error('Error fetching supervisor reports:', error);
      console.error('Error details:', error.response?.data || error.message);
      if (!silent) {
        toast.error(`Không thể tải danh sách báo cáo giám sát: ${error.response?.data?.error || error.message}`);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredReports = reports.filter(report => {
    // Filter by status
    if (filter === 'pending' && report.reviewed_at) return false;
    if (filter === 'reviewed' && !report.reviewed_at) return false;
    if (filter === 'disciplinary' && !report.send_to_disciplinary) return false;

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchText = `${report.home_team_name || ''} ${report.away_team_name || ''} ${report.supervisor_name || ''}`.toLowerCase();
      if (!matchText.includes(searchLower)) return false;
    }

    return true;
  });

  const getStatusBadge = (report) => {
    if (report.send_to_disciplinary) {
      return (
        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium flex items-center gap-1">
          <AlertCircle size={14} />
          Cần xử lý kỷ luật
        </span>
      );
    }
    if (report.reviewed_at) {
      return (
        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1">
          <CheckCircle size={14} />
          Đã xem xét
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium flex items-center gap-1">
        <Clock size={14} />
        Chờ xem xét
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Show loading only on initial load
  if (loading && reports.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Báo cáo Giám sát</h1>
          <p className="text-gray-600 mt-2">Xem và quản lý tất cả báo cáo giám sát từ các trận đấu</p>
        </div>
        <button
          onClick={() => fetchReports()}
          disabled={loading || refreshing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Đang tải...' : 'Làm mới'}
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên đội, giám sát..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tất cả ({reports.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Chờ xem xét ({reports.filter(r => !r.reviewed_at).length})
            </button>
            <button
              onClick={() => setFilter('reviewed')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'reviewed' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Đã xem xét ({reports.filter(r => r.reviewed_at).length})
            </button>
            <button
              onClick={() => setFilter('disciplinary')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'disciplinary' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <AlertCircle size={16} className="inline mr-1" />
              Kỷ luật ({reports.filter(r => r.send_to_disciplinary).length})
            </button>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-lg shadow-sm border">
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="mx-auto text-blue-600 mb-4 animate-spin" size={48} />
            <p className="text-gray-500 text-lg">Đang tải báo cáo...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500 text-lg">Không có báo cáo nào</p>
            <p className="text-gray-400 text-sm mt-2">
              {searchTerm || filter !== 'all' ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm' : 'Chưa có báo cáo giám sát nào được gửi'}
            </p>
            {reports.length === 0 && (
              <button
                onClick={() => fetchReports()}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Tải lại
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {filteredReports.map((report) => (
              <div key={report.id || report.report_id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {report.home_team_name || 'Home'} vs {report.away_team_name || 'Away'}
                      </h3>
                      {getStatusBadge(report)}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                      <div>
                        <span className="text-gray-500">Giám sát:</span>
                        <p className="font-medium text-gray-900">{report.supervisor_name || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Ngày gửi:</span>
                        <p className="font-medium text-gray-900">{formatDate(report.submitted_at)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Đánh giá tổ chức:</span>
                        <p className="font-medium text-gray-900">
                          {report.organization_rating ? `${report.organization_rating}/5` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Trận đấu:</span>
                        <p className="font-medium text-gray-900">{formatDate(report.match_date || report.scheduled_kickoff)}</p>
                      </div>
                    </div>

                    {report.incident_report && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm font-medium text-yellow-800 mb-1">Báo cáo sự cố:</p>
                        <p className="text-sm text-yellow-700">{report.incident_report}</p>
                      </div>
                    )}

                    {report.has_serious_violation && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm font-medium text-red-800 flex items-center gap-1">
                          <AlertCircle size={16} />
                          Vi phạm nghiêm trọng
                        </p>
                      </div>
                    )}

                    {report.recommendations && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm font-medium text-blue-800 mb-1">Đề xuất:</p>
                        <p className="text-sm text-blue-700">{report.recommendations}</p>
                      </div>
                    )}
                  </div>

                  <div className="ml-4 flex flex-col gap-2">
                    <button
                      onClick={() => {
                        // Navigate to match detail or open modal
                        window.location.href = `/admin/matches/${report.match_id}/live`;
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Eye size={16} />
                      Xem chi tiết
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupervisorReportsPage;

