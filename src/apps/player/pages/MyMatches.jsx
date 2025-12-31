import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Trophy,
  Users,
  Target,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye
} from 'lucide-react';
import { useAuth } from '@/layers/application/context/AuthContext';
import apiClient from '@/layers/infrastructure/api/apiClient';

const MyMatches = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState([]);
  const [filter, setFilter] = useState('all'); // all, upcoming, completed
  const [selectedMatch, setSelectedMatch] = useState(null);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/player-portal/matches');
      setMatches(response.data || []);
    } catch (error) {
      console.error('Failed to fetch matches:', error);
      // Mock data for demo
      setMatches([
        {
          matchId: 1,
          homeTeam: 'CLB Hà Nội',
          awayTeam: 'CLB TP.HCM',
          homeScore: 2,
          awayScore: 1,
          matchDate: '2025-12-28',
          matchTime: '19:00',
          venue: 'Sân vận động Hàng Đẫy',
          status: 'completed',
          playerStats: {
            played: true,
            minutesPlayed: 90,
            goals: 1,
            assists: 1,
            yellowCards: 0,
            redCards: 0,
          },
        },
        {
          matchId: 2,
          homeTeam: 'CLB Hà Nội',
          awayTeam: 'CLB Viettel',
          homeScore: null,
          awayScore: null,
          matchDate: '2026-01-05',
          matchTime: '19:30',
          venue: 'Sân vận động Hàng Đẫy',
          status: 'scheduled',
          playerStats: null,
        },
        {
          matchId: 3,
          homeTeam: 'CLB HAGL',
          awayTeam: 'CLB Hà Nội',
          homeScore: 0,
          awayScore: 3,
          matchDate: '2025-12-21',
          matchTime: '17:00',
          venue: 'Sân vận động Pleiku',
          status: 'completed',
          playerStats: {
            played: true,
            minutesPlayed: 75,
            goals: 2,
            assists: 0,
            yellowCards: 1,
            redCards: 0,
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredMatches = matches.filter((match) => {
    if (filter === 'upcoming') return match.status === 'scheduled';
    if (filter === 'completed') return match.status === 'completed';
    return true;
  });

  const getResultBadge = (match) => {
    if (match.status !== 'completed') {
      return (
        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
          Sắp diễn ra
        </span>
      );
    }

    const isHome = match.homeTeam.includes('Hà Nội'); // Simple check, should use team ID
    const teamScore = isHome ? match.homeScore : match.awayScore;
    const opponentScore = isHome ? match.awayScore : match.homeScore;

    if (teamScore > opponentScore) {
      return (
        <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
          <CheckCircle className="w-4 h-4" />
          Thắng
        </span>
      );
    } else if (teamScore < opponentScore) {
      return (
        <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
          <XCircle className="w-4 h-4" />
          Thua
        </span>
      );
    } else {
      return (
        <span className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
          <AlertCircle className="w-4 h-4" />
          Hòa
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin h-12 w-12 border-4 border-green-500 border-t-transparent rounded-full mb-4"></div>
          <p className="text-gray-600">Đang tải lịch thi đấu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Lịch thi đấu của tôi</h1>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1.5">
        <div className="flex gap-1">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'upcoming', label: 'Sắp diễn ra' },
            { id: 'completed', label: 'Đã kết thúc' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`
                flex-1 px-6 py-2.5 rounded-lg font-medium transition-all duration-200
                ${
                  filter === tab.id
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Matches List */}
      {filteredMatches.length > 0 ? (
        <div className="space-y-4">
          {filteredMatches.map((match) => (
            <div
              key={match.matchId}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200"
            >
              {/* Match Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <span className="text-sm text-gray-600">
                    {new Date(match.matchDate).toLocaleDateString('vi-VN', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                  <span className="text-sm text-gray-600">• {match.matchTime}</span>
                </div>
                {getResultBadge(match)}
              </div>

              {/* Match Info */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1 text-right">
                  <p className="text-lg font-bold text-gray-900">{match.homeTeam}</p>
                </div>
                <div className="px-8 text-center">
                  {match.status === 'completed' ? (
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-bold text-gray-900">{match.homeScore}</span>
                      <span className="text-2xl text-gray-400">-</span>
                      <span className="text-3xl font-bold text-gray-900">{match.awayScore}</span>
                    </div>
                  ) : (
                    <div className="text-2xl font-bold text-gray-400">vs</div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-lg font-bold text-gray-900">{match.awayTeam}</p>
                </div>
              </div>

              {/* Venue */}
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                <MapPin className="w-4 h-4" />
                <span>{match.venue}</span>
              </div>

              {/* Player Stats */}
              {match.playerStats && match.playerStats.played && (
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Thống kê cá nhân</p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-xs text-gray-500">Phút thi đấu</p>
                        <p className="text-lg font-bold text-gray-900">{match.playerStats.minutesPlayed}'</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-xs text-gray-500">Bàn thắng</p>
                        <p className="text-lg font-bold text-gray-900">{match.playerStats.goals}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="text-xs text-gray-500">Kiến tạo</p>
                        <p className="text-lg font-bold text-gray-900">{match.playerStats.assists}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-yellow-400 rounded"></div>
                      <div>
                        <p className="text-xs text-gray-500">Thẻ vàng</p>
                        <p className="text-lg font-bold text-gray-900">{match.playerStats.yellowCards}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-red-600 rounded"></div>
                      <div>
                        <p className="text-xs text-gray-500">Thẻ đỏ</p>
                        <p className="text-lg font-bold text-gray-900">{match.playerStats.redCards}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {match.playerStats && !match.playerStats.played && match.status === 'completed' && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center gap-2 text-gray-500">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm">Không thi đấu trong trận này</span>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <button className="flex items-center gap-2 text-green-600 hover:text-green-700 font-medium text-sm">
                  <Eye className="w-4 h-4" />
                  <span>Xem chi tiết trận đấu</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Không có trận đấu nào</h3>
          <p className="text-gray-600">Chưa có lịch thi đấu trong thời gian này</p>
        </div>
      )}
    </div>
  );
};

export default MyMatches;
