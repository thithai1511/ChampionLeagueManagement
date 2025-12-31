import React, { useState, useEffect, useRef } from 'react';
import { FileText, Calendar, CheckCircle, Clock, Eye, Loader2, AlertCircle, Shield, Filter, Search, RefreshCw, MessageSquare, ThumbsUp, ThumbsDown, Send, X, Bell } from 'lucide-react';
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
  
  // Modal states for review/feedback
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [reviewAction, setReviewAction] = useState('approve'); // approve, reject, request_changes
  const [submittingReview, setSubmittingReview] = useState(false);

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
    if (report.review_status === 'rejected') {
      return (
        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium flex items-center gap-1">
          <ThumbsDown size={14} />
          Đã từ chối
        </span>
      );
    }
    if (report.review_status === 'approved' || report.reviewed_at) {
      return (
        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1">
          <CheckCircle size={14} />
          Đã duyệt
        </span>
      );
    }
    if (report.review_status === 'changes_requested') {
      return (
        <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium flex items-center gap-1">
          <MessageSquare size={14} />
          Yêu cầu sửa đổi
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium flex items-center gap-1 animate-pulse">
        <Clock size={14} />
        Chờ xem xét
      </span>
    );
  };

  const openReviewModal = (report) => {
    setSelectedReport(report);
    setReviewFeedback('');
    setReviewAction('approve');
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedReport) return;
    
    if (reviewAction !== 'approve' && !reviewFeedback.trim()) {
      toast.error('Vui lòng nhập lý do/phản hồi');
      return;
    }

    setSubmittingReview(true);
    try {
      await ApiService.post(`/admin/supervisor-reports/${selectedReport.id || selectedReport.report_id}/review`, {
        action: reviewAction,
        feedback: reviewFeedback,
        reviewedBy: user?.id || user?.sub
      });

      // Send notification to referee
      try {
        await ApiService.post('/notifications/send', {
          type: 'REPORT_REVIEWED',
          matchId: selectedReport.match_id,
          message: reviewAction === 'approve' 
            ? `Báo cáo trận đấu đã được duyệt` 
            : reviewAction === 'rejected'
            ? `Báo cáo bị từ chối: ${reviewFeedback}`
            : `Yêu cầu sửa đổi báo cáo: ${reviewFeedback}`,
          targetUserId: selectedReport.supervisor_id || selectedReport.reported_by_user_id
        });
      } catch (notifError) {
        console.log('Notification not sent (optional):', notifError);
      }

      toast.success(
        reviewAction === 'approve' ? 'Đã duyệt báo cáo!' :
        reviewAction === 'rejected' ? 'Đã từ chối báo cáo!' :
        'Đã gửi yêu cầu sửa đổi!'
      );
      
      setShowReviewModal(false);
      fetchReports();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Không thể gửi đánh giá');
    } finally {
      setSubmittingReview(false);
    }
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
                        window.location.href = `/admin/matches/${report.match_id}/live`;
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Eye size={16} />
                      Xem chi tiết
                    </button>
                    {!report.reviewed_at && report.review_status !== 'approved' && (
                      <button
                        onClick={() => openReviewModal(report)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <CheckCircle size={16} />
                        Xem xét
                      </button>
                    )}
                    {(report.reviewed_at || report.review_status === 'approved') && (
                      <span className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-center text-sm">
                        Đã xem xét
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Xem xét báo cáo</h3>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="text-white/80 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>
              <p className="text-white/80 mt-2">
                {selectedReport.home_team_name} vs {selectedReport.away_team_name}
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Report Summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-bold text-gray-800">Thông tin báo cáo</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Người gửi:</span>
                    <p className="font-medium">{selectedReport.supervisor_name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Ngày gửi:</span>
                    <p className="font-medium">{formatDate(selectedReport.submitted_at)}</p>
                  </div>
                  {selectedReport.organization_rating && (
                    <div>
                      <span className="text-gray-500">Đánh giá tổ chức:</span>
                      <p className="font-medium">{selectedReport.organization_rating}/5</p>
                    </div>
                  )}
                </div>
                {selectedReport.incident_report && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm font-medium text-yellow-800">Báo cáo sự cố:</p>
                    <p className="text-sm text-yellow-700">{selectedReport.incident_report}</p>
                  </div>
                )}
                {selectedReport.recommendations && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm font-medium text-blue-800">Đề xuất:</p>
                    <p className="text-sm text-blue-700">{selectedReport.recommendations}</p>
                  </div>
                )}
              </div>

              {/* Review Actions */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Hành động</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setReviewAction('approve')}
                    className={`flex-1 p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                      reviewAction === 'approve' 
                        ? 'border-green-500 bg-green-50 text-green-700' 
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <ThumbsUp size={24} />
                    <span className="font-medium">Duyệt</span>
                  </button>
                  <button
                    onClick={() => setReviewAction('request_changes')}
                    className={`flex-1 p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                      reviewAction === 'request_changes' 
                        ? 'border-orange-500 bg-orange-50 text-orange-700' 
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <MessageSquare size={24} />
                    <span className="font-medium">Yêu cầu sửa</span>
                  </button>
                  <button
                    onClick={() => setReviewAction('rejected')}
                    className={`flex-1 p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                      reviewAction === 'rejected' 
                        ? 'border-red-500 bg-red-50 text-red-700' 
                        : 'border-gray-200 hover:border-red-300'
                    }`}
                  >
                    <ThumbsDown size={24} />
                    <span className="font-medium">Từ chối</span>
                  </button>
                </div>
              </div>

              {/* Feedback */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Phản hồi / Lý do {reviewAction !== 'approve' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  className="w-full border rounded-lg p-3 h-32 focus:ring-2 focus:ring-indigo-500"
                  placeholder={
                    reviewAction === 'approve' 
                      ? 'Nhận xét thêm (không bắt buộc)...'
                      : 'Nhập lý do hoặc yêu cầu cụ thể...'
                  }
                />
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                  className={`flex-1 px-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${
                    reviewAction === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : reviewAction === 'rejected'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-orange-600 hover:bg-orange-700 text-white'
                  } disabled:opacity-50`}
                >
                  {submittingReview ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Send size={20} />
                  )}
                  {reviewAction === 'approve' ? 'Duyệt báo cáo' :
                   reviewAction === 'rejected' ? 'Từ chối' : 'Gửi yêu cầu'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupervisorReportsPage;

