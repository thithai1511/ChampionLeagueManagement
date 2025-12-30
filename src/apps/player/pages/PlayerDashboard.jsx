import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Target, 
  Calendar, 
  Award, 
  TrendingUp, 
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  Activity
} from 'lucide-react';
import { useAuth } from '@/layers/application/context/AuthContext';
import apiClient from '@/layers/infrastructure/api/apiClient';

const PlayerDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [playerData, setPlayerData] = useState(null);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);
  const [statistics, setStatistics] = useState(null);

  useEffect(() => {
    fetchPlayerData();
  }, []);

  const fetchPlayerData = async () => {
    try {
      setLoading(true);
      // Fetch player profile and statistics
      const [profileRes, statsRes, matchesRes] = await Promise.all([
        apiClient.get('/api/player-portal/profile'),
        apiClient.get('/api/player-portal/statistics'),
        apiClient.get('/api/player-portal/matches'),
      ]);

      setPlayerData(profileRes.data);
      setStatistics(statsRes.data);
      
      const matches = matchesRes.data || [];
      setUpcomingMatches(matches.filter(m => m.status === 'scheduled').slice(0, 3));
      setRecentMatches(matches.filter(m => m.status === 'completed').slice(0, 3));
    } catch (error) {
      console.error('Failed to fetch player data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin h-12 w-12 border-4 border-green-500 border-t-transparent rounded-full mb-4"></div>
          <p className="text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      icon: Target,
      label: 'Bàn thắng',
      value: statistics?.goals || 0,
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      icon: Activity,
      label: 'Kiến tạo',
      value: statistics?.assists || 0,
      color: 'bg-green-500',
      lightColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      icon: Calendar,
      label: 'Trận đấu',
      value: statistics?.matchesPlayed || 0,
      color: 'bg-purple-500',
      lightColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      icon: Clock,
      label: 'Phút thi đấu',
      value: statistics?.minutesPlayed || 0,
      color: 'bg-orange-500',
      lightColor: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Users className="w-10 h-10 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">
              Xin chào, {playerData?.fullName || user?.fullName || 'Cầu thủ'}!
            </h1>
            <p className="text-green-100 text-lg">
              {playerData?.teamName ? `${playerData.teamName} • ` : ''}
              {playerData?.position || 'Cầu thủ'} • 
              Số áo: {playerData?.jerseyNumber || 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stat.lightColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.textColor}`} />
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Matches */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">Trận đấu sắp tới</h2>
          </div>
          
          {upcomingMatches.length > 0 ? (
            <div className="space-y-4">
              {upcomingMatches.map((match, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:border-green-500 transition-colors duration-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {match.homeTeam} vs {match.awayTeam}
                    </p>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                      Sắp diễn ra
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(match.matchDate).toLocaleDateString('vi-VN')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {match.matchTime || '19:00'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{match.venue}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Chưa có trận đấu sắp tới</p>
            </div>
          )}
        </div>

        {/* Recent Matches */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">Trận đấu gần đây</h2>
          </div>
          
          {recentMatches.length > 0 ? (
            <div className="space-y-4">
              {recentMatches.map((match, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:border-green-500 transition-colors duration-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {match.homeTeam} vs {match.awayTeam}
                    </p>
                    <span className="text-lg font-bold text-gray-900">
                      {match.homeScore} - {match.awayScore}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {match.playerStats?.minutesPlayed > 0 ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-gray-700">
                          Đá {match.playerStats.minutesPlayed} phút
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">Không thi đấu</span>
                      </>
                    )}
                  </div>
                  {match.playerStats?.goals > 0 && (
                    <p className="text-xs text-green-600 font-medium mt-2">
                      ⚽ {match.playerStats.goals} bàn thắng
                    </p>
                  )}
                  {match.playerStats?.assists > 0 && (
                    <p className="text-xs text-blue-600 font-medium mt-1">
                      🎯 {match.playerStats.assists} kiến tạo
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Chưa có trận đấu nào</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Thao tác nhanh</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all duration-200">
            <Users className="w-6 h-6 text-green-600" />
            <span className="font-medium text-gray-900">Xem hồ sơ</span>
          </button>
          <button className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all duration-200">
            <Calendar className="w-6 h-6 text-green-600" />
            <span className="font-medium text-gray-900">Lịch thi đấu</span>
          </button>
          <button className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all duration-200">
            <TrendingUp className="w-6 h-6 text-green-600" />
            <span className="font-medium text-gray-900">Thống kê</span>
          </button>
          <button className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all duration-200">
            <Award className="w-6 h-6 text-green-600" />
            <span className="font-medium text-gray-900">Danh hiệu</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerDashboard;
