import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Clock, MapPin, Eye, Filter, 
  Loader2, AlertCircle, CheckCircle, Activity,
  Users, Whistle
} from 'lucide-react';
import ApiService from '../../../shared/services/ApiService';
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';

const MyMatchesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming'); // upcoming, today, past, all

  useEffect(() => {
    fetchMyMatches();
  }, []);

  const fetchMyMatches = async () => {
    try {
      setLoading(true);
      // Get all matches where user is assigned as referee
      const response = await ApiService.get(`/match-officials/my-assignments`);
      setMatches(response.data || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast.error('Không thể tải danh sách trận đấu');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredMatches = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return matches.filter(match => {
      const matchDate = new Date(match.scheduled_kickoff || match.match_date);
      
      switch (filter) {
        case 'today':
          return matchDate >= today && matchDate < tomorrow;
        case 'upcoming':
          return matchDate >= now && !['COMPLETED', 'FINISHED'].includes(match.status?.toUpperCase());
        case 'past':
          return matchDate < now || ['COMPLETED', 'FINISHED'].includes(match.status?.toUpperCase());
        case 'all':
        default:
          return true;
      }
    });
  };

  const getStatusBadge = (status) => {
    const normalized = status?.toUpperCase() || '';
    switch (normalized) {
      case 'SCHEDULED':
      case 'TIMED':
        return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">Đã lịch</span>;
      case 'LIVE':
      case 'IN_PLAY':
      case 'IN_PROGRESS':
        return <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold animate-pulse">Đang diễn ra</span>;
      case 'FINISHED':
      case 'COMPLETED':
        return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">Kết thúc</span>;
      default:
        return <span className="bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const filteredMatches = getFilteredMatches();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-2xl p-8 shadow-xl">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
            <Whistle size={32} className="text-slate-900" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900">Lịch Điều Hành Trận Đấu</h1>
            <p className="text-slate-700 font-medium">Danh sách trận đấu được phân công</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border-2 border-white">
            <p className="text-sm text-slate-700 font-medium mb-1">Sắp tới</p>
            <p className="text-3xl font-black text-slate-900">
              {matches.filter(m => new Date(m.scheduled_kickoff) >= new Date() && !['COMPLETED', 'FINISHED'].includes(m.status?.toUpperCase())).length}
            </p>
          </div>
          <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border-2 border-white">
            <p className="text-sm text-slate-700 font-medium mb-1">Hôm nay</p>
            <p className="text-3xl font-black text-slate-900">
              {matches.filter(m => {
                const today = new Date();
                const matchDate = new Date(m.scheduled_kickoff);
                return matchDate.toDateString() === today.toDateString();
              }).length}
            </p>
          </div>
          <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border-2 border-white">
            <p className="text-sm text-slate-700 font-medium mb-1">Đã hoàn thành</p>
            <p className="text-3xl font-black text-slate-900">
              {matches.filter(m => ['COMPLETED', 'FINISHED'].includes(m.status?.toUpperCase())).length}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        {[
          { id: 'upcoming', label: 'Sắp tới', icon: Calendar },
          { id: 'today', label: 'Hôm nay', icon: Activity },
          { id: 'past', label: 'Đã qua', icon: CheckCircle },
          { id: 'all', label: 'Tất cả', icon: Filter }
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              filter === f.id
                ? 'bg-yellow-400 text-slate-900 shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <f.icon size={18} />
            {f.label}
          </button>
        ))}
      </div>

      {/* Matches List */}
      {filteredMatches.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <AlertCircle size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium">Không có trận đấu nào</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredMatches.map(match => (
            <div
              key={match.match_id}
              className="bg-white rounded-2xl p-6 shadow-md border-2 border-slate-200 hover:border-yellow-400 hover:shadow-xl transition-all cursor-pointer"
              onClick={() => navigate(`/referee/match/${match.match_id}`)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Calendar size={20} className="text-slate-400" />
                  <span className="text-sm font-bold text-slate-600">
                    {formatDate(match.scheduled_kickoff || match.match_date)}
                  </span>
                  <Clock size={20} className="text-slate-400" />
                  <span className="text-sm font-bold text-slate-600">
                    {formatTime(match.scheduled_kickoff || match.match_date)}
                  </span>
                </div>
                {getStatusBadge(match.status)}
              </div>

              {/* Teams */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="text-right flex-1">
                    <p className="font-bold text-lg text-slate-900">{match.home_team_name}</p>
                  </div>
                  <div className="px-6 py-2 bg-slate-100 rounded-lg">
                    <p className="text-2xl font-black text-slate-900">
                      {match.home_score ?? '-'} : {match.away_score ?? '-'}
                    </p>
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-bold text-lg text-slate-900">{match.away_team_name}</p>
                  </div>
                </div>
              </div>

              {/* Venue & Role */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin size={16} />
                  <span>{match.venue || 'TBA'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-600">
                    Vai trò: <span className="text-yellow-600">{match.role === 'referee' ? 'Trọng tài chính' : 'Trợ lý'}</span>
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/referee/match/${match.match_id}`);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-slate-900 rounded-lg font-bold transition-colors"
                  >
                    <Eye size={18} />
                    Quản lý
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyMatchesPage;
