import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Clock, MapPin, Eye, Filter, 
  Loader2, AlertCircle, CheckCircle, Activity,
  Users, Shield
} from 'lucide-react';
import ApiService from '@/layers/application/services/ApiService';
import { useAuth } from '@/layers/application/context/AuthContext';
import toast from 'react-hot-toast';

const MyAssignmentsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, upcoming, today, past

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      // Get matches where current user is assigned as supervisor
      const response = await ApiService.get('/matches');
      const supervisedMatches = response.data.filter(m => m.supervisor_id === user?.userId);
      setMatches(supervisedMatches);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Không thể tải danh sách trận đấu');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredMatches = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filter) {
      case 'upcoming':
        return matches.filter(m => new Date(m.date) > now);
      case 'today':
        return matches.filter(m => {
          const matchDate = new Date(m.date);
          return matchDate >= today && matchDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
        });
      case 'past':
        return matches.filter(m => new Date(m.date) < now);
      default:
        return matches;
    }
  };

  const getStatusBadge = (match) => {
    const matchDate = new Date(match.date);
    const now = new Date();

    if (match.supervisor_report_submitted) {
      return <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Đã báo cáo</span>;
    }

    if (match.status === 'COMPLETED') {
      return <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">Chưa báo cáo</span>;
    }

    if (match.status === 'IN_PROGRESS') {
      return <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full animate-pulse">Đang diễn ra</span>;
    }

    if (matchDate > now) {
      return <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">Sắp tới</span>;
    }

    return <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">{match.status}</span>;
  };

  const filteredMatches = getFilteredMatches();
  const stats = {
    total: matches.length,
    upcoming: matches.filter(m => new Date(m.date) > new Date()).length,
    pending: matches.filter(m => m.status === 'COMPLETED' && !m.supervisor_report_submitted).length,
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Shield className="text-indigo-600" size={32} />
          Lịch Giám Sát Trận Đấu
        </h2>
        <p className="text-gray-600 mt-2">Danh sách các trận đấu được phân công giám sát</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Tổng số trận</p>
              <p className="text-3xl font-bold mt-1">{stats.total}</p>
            </div>
            <Calendar size={40} className="text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm font-medium">Sắp tới</p>
              <p className="text-3xl font-bold mt-1">{stats.upcoming}</p>
            </div>
            <Clock size={40} className="text-indigo-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Chờ báo cáo</p>
              <p className="text-3xl font-bold mt-1">{stats.pending}</p>
            </div>
            <AlertCircle size={40} className="text-orange-200" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: 'all', label: 'Tất cả', icon: Activity },
          { value: 'upcoming', label: 'Sắp tới', icon: Clock },
          { value: 'today', label: 'Hôm nay', icon: Calendar },
          { value: 'past', label: 'Đã qua', icon: CheckCircle },
        ].map((filterOption) => (
          <button
            key={filterOption.value}
            onClick={() => setFilter(filterOption.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              filter === filterOption.value
                ? 'bg-indigo-600 text-white shadow-lg scale-105'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <filterOption.icon size={18} />
            {filterOption.label}
          </button>
        ))}
      </div>

      {/* Matches List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600 text-lg">Không có trận đấu nào</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredMatches.map((match) => (
            <div
              key={match.match_id}
              className="bg-white rounded-xl shadow-sm hover:shadow-lg border border-gray-200 p-6 transition-all duration-200 hover:scale-[1.01]"
            >
              <div className="flex items-center justify-between">
                {/* Match Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    {getStatusBadge(match)}
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <Calendar size={14} />
                      {new Date(match.date).toLocaleDateString('vi-VN', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <Clock size={14} />
                      {new Date(match.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Teams */}
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <Users size={20} className="text-blue-600" />
                      <span className="font-semibold text-lg text-gray-900">{match.home_team_name}</span>
                    </div>
                    <span className="text-gray-400 font-bold">VS</span>
                    <div className="flex items-center gap-3">
                      <Users size={20} className="text-red-600" />
                      <span className="font-semibold text-lg text-gray-900">{match.away_team_name}</span>
                    </div>
                  </div>

                  {/* Venue */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin size={16} className="text-indigo-500" />
                    <span>{match.venue || 'Chưa xác định địa điểm'}</span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => navigate(`/supervisor/match/${match.match_id}`)}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors duration-200 shadow-lg"
                >
                  <Eye size={18} />
                  Giám sát
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyAssignmentsPage;
