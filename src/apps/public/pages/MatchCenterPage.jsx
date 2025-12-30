import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, Activity, Users, Shield, Calendar, Trophy, Play, ChevronRight, Filter, RefreshCw, Star, Zap } from 'lucide-react';
import MatchesService from '../../../layers/application/services/MatchesService';
import ApiService from '../../../layers/application/services/ApiService';
import { toMatchStatusLabel, toCompetitionStageLabel } from '../../../shared/utils/vi';
import bannerC1 from '@/assets/images/banner_c1.jpg';

const MatchCenterPage = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, live, upcoming, finished
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState('all'); // Default to 'all' seasons
  const [seasons, setSeasons] = useState([]); // To store available seasons

  // Fetch matches and seasons
  useEffect(() => {
    const fetchMatches = async (seasonId) => {
      try {
        setLoading(true);
        const response = await MatchesService.getAllMatches({
          limit: 1000,
          seasonId: seasonId === 'all' ? undefined : seasonId
        });
        setMatches(response?.matches || []);
      } catch (error) {
        console.error('Failed to fetch matches:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchSeasons = async () => {
      try {
        const response = await ApiService.get('/seasons'); // Assuming an endpoint for seasons
        setSeasons(response?.seasons || []);
      } catch (error) {
        console.error('Failed to fetch seasons:', error);
      }
    };

    fetchSeasons();
    fetchMatches(selectedSeason);
  }, [selectedSeason]);

  // Filter matches
  const filteredMatches = useMemo(() => {
    if (filter === 'all') return matches;
    if (filter === 'live') return matches.filter(m => ['IN_PLAY', 'PAUSED', 'HALFTIME'].includes(m.status));
    if (filter === 'upcoming') return matches.filter(m => ['SCHEDULED', 'TIMED'].includes(m.status));
    if (filter === 'finished') return matches.filter(m => m.status === 'FINISHED');
    return matches;
  }, [matches, filter]);

  // Group by status
  const liveMatches = useMemo(() =>
    matches.filter(m => ['IN_PLAY', 'PAUSED', 'HALFTIME'].includes(m.status)),
    [matches]
  );

  const formatMatchTime = (utcDate) => {
    if (!utcDate) return '--:--';
    const date = new Date(utcDate);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatMatchDate = (utcDate) => {
    if (!utcDate) return '';
    const date = new Date(utcDate);
    return date.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'IN_PLAY':
      case 'PAUSED':
      case 'HALFTIME':
        return 'bg-red-500 text-white';
      case 'FINISHED':
        return 'bg-white/20 text-white/80';
      default:
        return 'bg-cyan-500/80 text-white';
    }
  };

  return (
    <div className="min-h-screen">
      {/* Epic Hero Banner */}
      <section className="relative h-[500px] md:h-[600px] overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={bannerC1}
            alt="Champions League 2025/26"
            className="w-full h-full object-cover object-top"
          />
          {/* Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a1a] via-[#0a0a1a]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a1a]/80 via-transparent to-[#0a0a1a]/80" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#0a0a1a_100%)] opacity-60" />
        </div>

        {/* Animated Stars */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-cyan-400 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 60}%`,
                animationDelay: `${Math.random() * 3}s`,
                opacity: Math.random() * 0.7 + 0.3
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative h-full max-w-7xl mx-auto px-6 flex flex-col justify-end pb-12 md:pb-16">
          {/* Badge */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 backdrop-blur-sm">
              <Star size={14} className="text-cyan-400" />
              <span className="text-cyan-400 text-xs uppercase tracking-[0.2em] font-bold">Mùa giải 2026</span>
            </div>
            {liveMatches.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-500/30 backdrop-blur-sm">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-400 text-xs uppercase tracking-[0.2em] font-bold">{liveMatches.length} Live</span>
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-white">
              MATCH CENTER
            </span>
          </h1>

          <p className="text-white/70 text-lg md:text-xl max-w-2xl mb-6">
            Theo dõi tất cả trận đấu UEFA Champions League. Cập nhật tỷ số trực tiếp, thống kê và lịch thi đấu.
          </p>

          {/* Quick Stats */}
          <div className="flex flex-wrap gap-4 md:gap-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <Trophy size={18} className="text-amber-400" />
              <span className="text-white font-bold">{matches.length}</span>
              <span className="text-white/60 text-sm">Trận đấu</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <Zap size={18} className="text-cyan-400" />
              <span className="text-white font-bold">{matches.reduce((sum, m) => sum + (m.scoreHome || 0) + (m.scoreAway || 0), 0)}</span>
              <span className="text-white/60 text-sm">Bàn thắng</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <Users size={18} className="text-purple-400" />
              <span className="text-white font-bold">36</span>
              <span className="text-white/60 text-sm">CLB tham dự</span>
            </div>
          </div>
        </div>

        {/* Bottom Fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a1a] to-transparent" />
      </section>

      {/* Filter Section */}
      <section className="relative z-10 -mt-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap gap-3 p-4 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/[0.1] items-center">
            {/* Season Filter */}
            <div className="mr-3">
              <select
                value={selectedSeason}
                onChange={(e) => {
                  setSelectedSeason(e.target.value);
                  // Trigger fetch immediately or depend on useEffect
                }}
                className="bg-black/40 text-white border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              >
                <option value="all">Tất cả mùa giải</option>
                {seasons.map(s => (
                  <option key={s.id || s.seasonId} value={s.id || s.seasonId}>{s.name}</option>
                ))}
              </select>
            </div>

            {[
              { id: 'all', label: 'Tất cả', count: matches.length, icon: Trophy },
              { id: 'live', label: 'Đang diễn ra', count: liveMatches.length, icon: Play },
              { id: 'upcoming', label: 'Sắp diễn ra', count: matches.filter(m => ['SCHEDULED', 'TIMED'].includes(m.status)).length, icon: Calendar },
              { id: 'finished', label: 'Đã kết thúc', count: matches.filter(m => m.status === 'FINISHED').length, icon: Activity },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all ${filter === tab.id
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25'
                    : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  <Icon size={16} />
                  {tab.label}
                  <span className={`px-2 py-0.5 rounded-full text-xs ${filter === tab.id ? 'bg-white/20' : 'bg-black/30'
                    }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}

            <div className="ml-auto pl-3 border-l border-white/10">
              <button
                onClick={() => {
                  setLoading(true); // Visual feedback
                  fetchMatches(selectedSeason);
                }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white transition-all"
                title="Cập nhật dữ liệu"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                <span>Làm mới</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Matches Grid */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RefreshCw className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
              <p className="text-white/60">Đang tải dữ liệu trận đấu...</p>
            </div>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60 text-lg">Không có trận đấu nào</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMatches.map((match) => (
              <div
                key={match.id}
                className={`group relative rounded-2xl overflow-hidden backdrop-blur-md border transition-all hover:scale-[1.02] cursor-pointer ${['IN_PLAY', 'PAUSED', 'HALFTIME'].includes(match.status)
                  ? 'bg-red-500/10 border-red-500/30 hover:border-red-400/50'
                  : 'bg-white/[0.05] border-white/[0.1] hover:border-cyan-400/30'
                  }`}
                onClick={() => navigate(`/matches/${match.id}`)}
              >
                {/* Status badge */}
                <div className="absolute top-4 right-4 z-10">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(match.status)}`}>
                    {toMatchStatusLabel(match.status)}
                  </span>
                </div>

                {/* Live indicator */}
                {['IN_PLAY', 'PAUSED', 'HALFTIME'].includes(match.status) && (
                  <div className="absolute top-4 left-4 z-10">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50" />
                  </div>
                )}

                <div className="p-6">
                  {/* Date & Stage */}
                  <div className="flex items-center justify-between mb-4 text-xs text-white/50">
                    <span>{formatMatchDate(match.utcDate)}</span>
                    <span>{toCompetitionStageLabel(match.stage || match.groupName)}</span>
                  </div>

                  {/* Teams */}
                  <div className="space-y-4">
                    {/* Home Team */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden">
                          {match.homeTeamLogo ? (
                            <img src={match.homeTeamLogo} alt="" className="w-7 h-7 object-contain" />
                          ) : (
                            <Shield size={20} className="text-white/40" />
                          )}
                        </div>
                        <span className="text-white font-semibold">{match.homeTeamName || match.homeTeamTla}</span>
                      </div>
                      <span className="text-2xl font-black text-white">
                        {match.scoreHome ?? '-'}
                      </span>
                    </div>

                    {/* Away Team */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden">
                          {match.awayTeamLogo ? (
                            <img src={match.awayTeamLogo} alt="" className="w-7 h-7 object-contain" />
                          ) : (
                            <Shield size={20} className="text-white/40" />
                          )}
                        </div>
                        <span className="text-white font-semibold">{match.awayTeamName || match.awayTeamTla}</span>
                      </div>
                      <span className="text-2xl font-black text-white">
                        {match.scoreAway ?? '-'}
                      </span>
                    </div>
                  </div>

                  {/* Time */}
                  <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/50 text-sm">
                      <Clock size={14} />
                      <span>{formatMatchTime(match.utcDate)}</span>
                    </div>
                    {match.venue && (
                      <span className="text-white/40 text-xs truncate max-w-[150px]">{match.venue}</span>
                    )}
                  </div>
                </div>

                {/* Expanded details */}
                {selectedMatch?.id === match.id && (
                  <div className="px-6 pb-6 pt-2 border-t border-white/10 animate-fadeIn">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center p-3 rounded-xl bg-white/5">
                        <p className="text-white/50 text-xs mb-1">Vòng đấu</p>
                        <p className="text-white font-semibold">{match.matchday || '-'}</p>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-white/5">
                        <p className="text-white/50 text-xs mb-1">Trọng tài</p>
                        <p className="text-white font-semibold">{match.referee || '-'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Stats Summary */}
      <section className="max-w-7xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-4 gap-4">
          <div className="p-6 rounded-2xl backdrop-blur-md bg-white/[0.05] border border-white/[0.1] text-center group hover:border-amber-400/30 transition-all">
            <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-3xl font-black text-white mb-1">
              {matches.length}
            </p>
            <p className="text-xs uppercase tracking-wider text-white/50">Tổng trận đấu</p>
          </div>
          <div className="p-6 rounded-2xl backdrop-blur-md bg-white/[0.05] border border-white/[0.1] text-center group hover:border-red-400/30 transition-all">
            <Play className="w-8 h-8 text-red-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-3xl font-black text-white mb-1">
              {liveMatches.length}
            </p>
            <p className="text-xs uppercase tracking-wider text-white/50">Đang diễn ra</p>
          </div>
          <div className="p-6 rounded-2xl backdrop-blur-md bg-white/[0.05] border border-white/[0.1] text-center group hover:border-cyan-400/30 transition-all">
            <Activity className="w-8 h-8 text-cyan-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-3xl font-black text-white mb-1">
              {matches.reduce((sum, m) => sum + (m.scoreHome || 0) + (m.scoreAway || 0), 0)}
            </p>
            <p className="text-xs uppercase tracking-wider text-white/50">Tổng bàn thắng</p>
          </div>
          <div className="p-6 rounded-2xl backdrop-blur-md bg-white/[0.05] border border-white/[0.1] text-center group hover:border-purple-400/30 transition-all">
            <Calendar className="w-8 h-8 text-purple-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-3xl font-black text-white mb-1">
              {matches.filter(m => m.status === 'FINISHED').length}
            </p>
            <p className="text-xs uppercase tracking-wider text-white/50">Đã hoàn thành</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default MatchCenterPage;
