import React, { useState, useEffect } from 'react';
import { 
  Target, 
  Activity, 
  Clock, 
  TrendingUp,
  Award,
  BarChart3,
  Calendar,
  Users
} from 'lucide-react';
import { useAuth } from '@/layers/application/context/AuthContext';
import apiClient from '@/layers/infrastructure/api/apiClient';

const MyStatistics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState(null);
  const [season, setSeason] = useState('2025');

  useEffect(() => {
    fetchStatistics();
  }, [season]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/player-portal/statistics?season=${season}`);
      setStatistics(response.data);
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
      // Mock data for demo
      setStatistics({
        overview: {
          matchesPlayed: 25,
          goals: 15,
          assists: 8,
          minutesPlayed: 2100,
          yellowCards: 3,
          redCards: 0,
          cleanSheets: 10,
          motmAwards: 5,
        },
        monthlyGoals: [
          { month: 'T1', goals: 2 },
          { month: 'T2', goals: 3 },
          { month: 'T3', goals: 1 },
          { month: 'T4', goals: 2 },
          { month: 'T5', goals: 3 },
          { month: 'T6', goals: 4 },
        ],
        comparison: {
          leagueAverage: {
            goals: 8,
            assists: 4,
            minutesPlayed: 1800,
          },
        },
        topPerformances: [
          {
            match: 'CLB Hà Nội vs CLB TP.HCM',
            date: '2025-12-28',
            goals: 3,
            assists: 1,
            rating: 9.5,
          },
          {
            match: 'CLB HAGL vs CLB Hà Nội',
            date: '2025-12-21',
            goals: 2,
            assists: 2,
            rating: 9.0,
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin h-12 w-12 border-4 border-green-500 border-t-transparent rounded-full mb-4"></div>
          <p className="text-gray-600">Đang tải thống kê...</p>
        </div>
      </div>
    );
  }

  const StatCard = ({ icon: Icon, label, value, change, color }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-12 h-12 ${color} bg-opacity-10 rounded-lg flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
        {change && (
          <div className={`flex items-center gap-1 text-sm font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className={`w-4 h-4 ${change < 0 ? 'rotate-180' : ''}`} />
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Thống kê của tôi</h1>
        <select
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="2025">Mùa giải 2025</option>
          <option value="2024">Mùa giải 2024</option>
          <option value="2023">Mùa giải 2023</option>
        </select>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Calendar}
          label="Trận đấu"
          value={statistics.overview.matchesPlayed}
          color="bg-blue-500"
        />
        <StatCard
          icon={Target}
          label="Bàn thắng"
          value={statistics.overview.goals}
          change={25}
          color="bg-green-500"
        />
        <StatCard
          icon={Activity}
          label="Kiến tạo"
          value={statistics.overview.assists}
          change={15}
          color="bg-purple-500"
        />
        <StatCard
          icon={Clock}
          label="Phút thi đấu"
          value={statistics.overview.minutesPlayed}
          color="bg-orange-500"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Goals Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">Bàn thắng theo tháng</h2>
          </div>
          
          <div className="space-y-3">
            {statistics.monthlyGoals.map((data, index) => {
              const maxGoals = Math.max(...statistics.monthlyGoals.map(m => m.goals));
              const percentage = (data.goals / maxGoals) * 100;
              
              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{data.month}</span>
                    <span className="text-sm font-bold text-gray-900">{data.goals} bàn</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Comparison with League Average */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">So với trung bình giải</h2>
          </div>
          
          <div className="space-y-6">
            {[
              { 
                label: 'Bàn thắng', 
                player: statistics.overview.goals, 
                league: statistics.comparison.leagueAverage.goals 
              },
              { 
                label: 'Kiến tạo', 
                player: statistics.overview.assists, 
                league: statistics.comparison.leagueAverage.assists 
              },
              { 
                label: 'Phút thi đấu', 
                player: statistics.overview.minutesPlayed, 
                league: statistics.comparison.leagueAverage.minutesPlayed 
              },
            ].map((item, index) => {
              const percentage = ((item.player - item.league) / item.league) * 100;
              const isAbove = percentage > 0;
              
              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">TB: {item.league}</span>
                      <span className="text-lg font-bold text-gray-900">{item.player}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${isAbove ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(Math.abs(percentage), 100)}%` }}
                      ></div>
                    </div>
                    <span className={`text-sm font-medium ${isAbove ? 'text-green-600' : 'text-red-600'}`}>
                      {isAbove ? '+' : ''}{percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <div className="w-6 h-6 bg-yellow-400 rounded"></div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Thẻ vàng</p>
          <p className="text-3xl font-bold text-gray-900">{statistics.overview.yellowCards}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <div className="w-6 h-6 bg-red-600 rounded"></div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Thẻ đỏ</p>
          <p className="text-3xl font-bold text-gray-900">{statistics.overview.redCards}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-sm text-gray-600 mb-1">Trận giữ sạch lưới</p>
          <p className="text-3xl font-bold text-gray-900">{statistics.overview.cleanSheets}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Award className="w-6 h-6 text-purple-600" />
          </div>
          <p className="text-sm text-gray-600 mb-1">MOTM</p>
          <p className="text-3xl font-bold text-gray-900">{statistics.overview.motmAwards}</p>
        </div>
      </div>

      {/* Top Performances */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Award className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-bold text-gray-900">Màn trình diễn xuất sắc nhất</h2>
        </div>
        
        <div className="space-y-4">
          {statistics.topPerformances.map((performance, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-4 hover:border-green-500 transition-colors duration-200"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-1">{performance.match}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(performance.date).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 rounded-full">
                    <Award className="w-4 h-4 text-green-600" />
                    <span className="text-lg font-bold text-green-600">{performance.rating}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-6 text-sm">
                <span className="flex items-center gap-1">
                  <Target className="w-4 h-4 text-green-600" />
                  <span className="font-medium">{performance.goals}</span>
                  <span className="text-gray-600">bàn thắng</span>
                </span>
                <span className="flex items-center gap-1">
                  <Activity className="w-4 h-4 text-purple-600" />
                  <span className="font-medium">{performance.assists}</span>
                  <span className="text-gray-600">kiến tạo</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MyStatistics;
