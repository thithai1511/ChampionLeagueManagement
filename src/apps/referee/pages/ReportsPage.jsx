import React, { useState, useEffect } from 'react';
import { FileText, Calendar, CheckCircle, Clock, Eye } from 'lucide-react';
import ApiService from '../../../shared/services/ApiService';
import toast from 'react-hot-toast';

const ReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await ApiService.get('/match-officials/my-reports');
      setReports(response.data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Không thể tải danh sách báo cáo');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return <div className="p-8 text-center">Đang tải...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-2xl p-8 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
            <FileText size={32} className="text-slate-900" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900">Báo Cáo Trận Đấu</h1>
            <p className="text-slate-700 font-medium">Lịch sử báo cáo đã nộp</p>
          </div>
        </div>
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <FileText size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium">Chưa có báo cáo nào</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {reports.map(report => (
            <div
              key={report.id}
              className="bg-white rounded-2xl p-6 shadow-md border-2 border-slate-200 hover:border-yellow-400 hover:shadow-xl transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Calendar size={20} className="text-slate-400" />
                    <span className="font-bold text-slate-900">
                      {report.home_team_name} vs {report.away_team_name}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 space-y-1">
                    <p><strong>Ngày:</strong> {formatDate(report.match_date)}</p>
                    <p><strong>Thời tiết:</strong> {report.weather || 'N/A'}</p>
                    <p><strong>Khán giả:</strong> {report.attendance || 'N/A'}</p>
                    {report.notes && <p><strong>Ghi chú:</strong> {report.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={20} className="text-green-500" />
                  <span className="text-sm font-bold text-green-700">Đã nộp</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
