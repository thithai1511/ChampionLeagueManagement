import React, { useEffect, useState } from 'react';
import { 
  Trophy, TrendingUp, Users, Target, Award, AlertTriangle, 
  Calendar, Clock, Shield, ArrowUp, ArrowDown, Minus, Ban,
  CheckCircle, XCircle, Activity
} from 'lucide-react';
import axios from 'axios';
import StandingsPublicService from '../../../layers/application/services/StandingsPublicService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const TeamDashboard = () => {
  const [seasonId, setSeasonId] = useState(null);
  const [teamId, setTeamId] = useState(null);
  const [teamData, setTeamData] = useState(null);
  const [standings, setStandings] = useState(null);
  const [teamPlayers, setTeamPlayers] = useState({
    scorers: [],
    mvp: [],
    cards: [],
    suspensions: []
  });
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Get current user's team info
      const userResponse = await axios.get(`${API_BASE_URL}/auth/me`);
      const user = userResponse.data;
      
      // Assume user has teamId in their profile or team assignment
      // You'll need to adjust based on your auth structure
      const userTeamId = user.teamId || user.team?.team_id;
      const currentSeasonId = user.currentSeasonId || 1; // Get from context or settings
      
      if (!userTeamId) {
        console.error('User not assigned to any team');
        return;
      }

      setTeamId(userTeamId);
      setSeasonId(currentSeasonId);

      // 2. Load all data in parallel
      await Promise.all([
        loadTeamStanding(currentSeasonId, userTeamId),
        loadTeamPlayers(currentSeasonId, userTeamId),
        loadTeamMatches(currentSeasonId, userTeamId)
      ]);

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeamStanding = async (seasonId, teamId) => {
    try {
      // Get team's standing
      const standingResponse = await StandingsPublicService.getTeamStanding(seasonId, teamId);
      setStandings(standingResponse.data);

      // Get team details
      const teamResponse = await axios.get(`${API_BASE_URL}/teams/${teamId}`);
      setTeamData(teamResponse.data);
    } catch (error) {
      console.error('Error loading team standing:', error);
    }
  };

  const loadTeamPlayers = async (seasonId, teamId) => {
    try {
      // Get all stats
      const [scorersRes, mvpRes, disciplineRes] = await Promise.all([
        StandingsPublicService.getTopScorers(seasonId, 100),
        StandingsPublicService.getTopMVP(seasonId),
        StandingsPublicService.getDisciplineOverview(seasonId)
      ]);

      // Filter for this team only
      const teamScorers = scorersRes.data.filter(p => p.teamId === teamId);
      const teamMVP = mvpRes.data.filter(p => p.teamId === teamId);
      const teamCards = disciplineRes.data.cards.filter(p => p.teamId === teamId);
      const teamSuspensions = disciplineRes.data.suspensions.filter(p => p.teamId === teamId);

      setTeamPlayers({
        scorers: teamScorers,
        mvp: teamMVP,
        cards: teamCards,
        suspensions: teamSuspensions
      });
    } catch (error) {
      console.error('Error loading team players:', error);
    }
  };

  const loadTeamMatches = async (seasonId, teamId) => {
    try {
      // Get team's matches
      const matchesResponse = await axios.get(
        `${API_BASE_URL}/matches/team/${teamId}/season/${seasonId}`
      );
      
      const matches = matchesResponse.data || [];
      const now = new Date();

      // Separate upcoming and recent matches
      const upcoming = matches
        .filter(m => new Date(m.scheduled_kickoff) > now && m.status !== 'completed')
        .sort((a, b) => new Date(a.scheduled_kickoff) - new Date(b.scheduled_kickoff))
        .slice(0, 5);

      const recent = matches
        .filter(m => m.status === 'completed')
        .sort((a, b) => new Date(b.scheduled_kickoff) - new Date(a.scheduled_kickoff))
        .slice(0, 5);

      setUpcomingMatches(upcoming);
      setRecentMatches(recent);
    } catch (error) {
      console.error('Error loading matches:', error);
    }
  };

  const getRankChange = () => {
    // You can store previous rank in state and compare
    // For now, return placeholder
    return 0;
  };

  const getRankIcon = (change) => {
    if (change > 0) return <ArrowUp className="text-green-500" size={20} />;
    if (change < 0) return <ArrowDown className="text-red-500" size={20} />;
    return <Minus className="text-gray-400" size={20} />;
  };

  const getFormBadge = (result) => {
    if (result === 'W' || result === 'win') {
      return <div className="w-8 h-8 bg-green-500/20 text-green-500 rounded flex items-center justify-center font-bold">T</div>;
    }
    if (result === 'D' || result === 'draw') {
      return <div className="w-8 h-8 bg-yellow-500/20 text-yellow-500 rounded flex items-center justify-center font-bold">H</div>;
    }
    return <div className="w-8 h-8 bg-red-500/20 text-red-500 rounded flex items-center justify-center font-bold">B</div>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Shield className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {teamData?.name || 'Đội bóng của bạn'}
                </h1>
                <p className="text-gray-500 mt-1">Dashboard quản lý đội</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Mùa giải</div>
              <div className="text-lg font-semibold text-gray-900">2025/2026</div>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Current Rank */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Hạng hiện tại</p>
                <div className="flex items-center gap-2">
                  <p className="text-3xl font-bold text-gray-900">
                    #{standings?.rank || '-'}
                  </p>
                  {getRankIcon(getRankChange())}
                </div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                <Trophy className="text-white" size={24} />
              </div>
            </div>
          </div>

          {/* Points */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Điểm số</p>
                <p className="text-3xl font-bold text-gray-900">
                  {standings?.points || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {standings?.played || 0} trận
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="text-white" size={24} />
              </div>
            </div>
          </div>

          {/* Goal Difference */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Hiệu số</p>
                <p className={`text-3xl font-bold ${
                  (standings?.goalDifference || 0) > 0 ? 'text-green-600' :
                  (standings?.goalDifference || 0) < 0 ? 'text-red-600' :
                  'text-gray-900'
                }`}>
                  {(standings?.goalDifference || 0) > 0 ? '+' : ''}
                  {standings?.goalDifference || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {standings?.goalsFor || 0} - {standings?.goalsAgainst || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                <Target className="text-white" size={24} />
              </div>
            </div>
          </div>

          {/* Suspensions Alert */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Treo giò</p>
                <p className="text-3xl font-bold text-red-600">
                  {teamPlayers.suspensions.length}
                </p>
                <p className="text-xs text-gray-500 mt-1">Cầu thủ</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-xl flex items-center justify-center">
                <Ban className="text-white" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Team Stats & Players */}
          <div className="lg:col-span-2 space-y-6">
            {/* Record */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Thành tích</h2>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{standings?.played || 0}</div>
                  <div className="text-sm text-gray-500">Trận</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{standings?.wins || 0}</div>
                  <div className="text-sm text-gray-500">Thắng</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{standings?.draws || 0}</div>
                  <div className="text-sm text-gray-500">Hòa</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{standings?.losses || 0}</div>
                  <div className="text-sm text-gray-500">Thua</div>
                </div>
              </div>
            </div>

            {/* Top Scorers */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="text-orange-500" size={20} />
                Danh sách ghi bàn
              </h2>
              {teamPlayers.scorers.length > 0 ? (
                <div className="space-y-3">
                  {teamPlayers.scorers.slice(0, 5).map((player, idx) => (
                    <div key={player.playerId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{player.playerName}</p>
                          <p className="text-sm text-gray-500">{player.matchesPlayed} trận</p>
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-orange-500">
                        {player.goals}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-400 py-8">Chưa có bàn thắng</p>
              )}
            </div>

            {/* Discipline */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="text-red-500" size={20} />
                Kỷ luật
              </h2>
              
              {/* Suspensions */}
              {teamPlayers.suspensions.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Đang treo giò</h3>
                  <div className="space-y-2">
                    {teamPlayers.suspensions.map(suspension => (
                      <div key={suspension.suspensionId} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Ban className="text-red-500" size={16} />
                          <span className="font-medium text-gray-900">{suspension.playerName}</span>
                        </div>
                        <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                          {suspension.reason === 'RED_CARD' ? 'Thẻ đỏ' : '2 vàng'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cards */}
              {teamPlayers.cards.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Thẻ phạt</h3>
                  <div className="space-y-2">
                    {teamPlayers.cards.slice(0, 5).map(player => (
                      <div key={player.playerId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-900">{player.playerName}</span>
                        <div className="flex items-center gap-2">
                          {player.yellowCards > 0 && (
                            <span className="flex items-center gap-1 text-xs">
                              <div className="w-3 h-4 bg-yellow-400 rounded-sm"></div>
                              {player.yellowCards}
                            </span>
                          )}
                          {player.redCards > 0 && (
                            <span className="flex items-center gap-1 text-xs">
                              <div className="w-3 h-4 bg-red-500 rounded-sm"></div>
                              {player.redCards}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {teamPlayers.suspensions.length === 0 && teamPlayers.cards.length === 0 && (
                <p className="text-center text-gray-400 py-4">Không có vi phạm</p>
              )}
            </div>
          </div>

          {/* Right Column - Matches */}
          <div className="space-y-6">
            {/* Upcoming Matches */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="text-blue-500" size={20} />
                Lịch thi đấu
              </h2>
              {upcomingMatches.length > 0 ? (
                <div className="space-y-3">
                  {upcomingMatches.map(match => (
                    <div key={match.match_id} className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500">
                          {new Date(match.scheduled_kickoff).toLocaleDateString('vi-VN')}
                        </span>
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          {match.status}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {match.home_team_name} vs {match.away_team_name}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                        <Clock size={12} />
                        {new Date(match.scheduled_kickoff).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-400 py-8">Không có trận sắp tới</p>
              )}
            </div>

            {/* Recent Matches */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Activity className="text-green-500" size={20} />
                Kết quả gần đây
              </h2>
              {recentMatches.length > 0 ? (
                <div className="space-y-3">
                  {recentMatches.map(match => {
                    const isHome = match.home_season_team_id === standings?.seasonTeamId;
                    const teamScore = isHome ? match.home_score : match.away_score;
                    const opponentScore = isHome ? match.away_score : match.home_score;
                    const result = teamScore > opponentScore ? 'W' : teamScore < opponentScore ? 'L' : 'D';
                    
                    return (
                      <div key={match.match_id} className="p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-500">
                            {new Date(match.scheduled_kickoff).toLocaleDateString('vi-VN')}
                          </span>
                          {getFormBadge(result)}
                        </div>
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center justify-between">
                            <span className={isHome ? 'font-semibold' : ''}>{match.home_team_name}</span>
                            <span className="font-bold">{match.home_score}</span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className={!isHome ? 'font-semibold' : ''}>{match.away_team_name}</span>
                            <span className="font-bold">{match.away_score}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-gray-400 py-8">Chưa có kết quả</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamDashboard;
