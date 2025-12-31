import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Clock, MapPin, Users, Calendar, Trophy, Activity,
  ChevronRight, AlertCircle, TrendingUp, Shield, Zap, Target
} from 'lucide-react';
import MatchesService from '../../../layers/application/services/MatchesService';
import ApiService from '../../../layers/application/services/ApiService';
import LineupDisplay from '../components/LineupDisplay';
import { formatDateGMT7, formatTimeGMT7 } from '../../../utils/timezone';
import { toMatchStatusLabel } from '../../../shared/utils/vi';

/**
 * MatchDetailPage - Trang chi tiết trận đấu
 * Hiển thị đầy đủ thông tin: Kết quả, Đội hình, Diễn biến, Thống kê
 */
const MatchDetailPage = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [homeLineup, setHomeLineup] = useState([]);
  const [awayLineup, setAwayLineup] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, lineups, events, stats

  useEffect(() => {
    if (matchId) {
      loadMatchData();
    }
  }, [matchId]);

  const loadMatchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load match details, events, and lineups in parallel
      const [matchData, eventsData, lineupsData] = await Promise.all([
        MatchesService.getMatchById(matchId),
        MatchesService.getMatchEvents(matchId).catch((err) => {
          console.error('Error loading events:', err);
          return [];
        }),
        ApiService.get(`/matches/${matchId}/lineups`).catch(() => ({ data: [] }))
      ]);

      setMatch(matchData);
      // Use events from matchData if available, otherwise use eventsData from API
      // matchData.events comes from getMatchById which includes eventsJson
      const allEvents = matchData?.events?.length > 0 ? matchData.events : (eventsData || []);
      console.log('Loaded events:', allEvents.length, allEvents);
      setEvents(allEvents);

      // Split lineups by team
      const allLineups = lineupsData?.data || [];
      if (matchData) {
        const home = allLineups.filter(p =>
          p.seasonTeamId === matchData.home_season_team_id ||
          p.seasonTeamId === matchData.homeSeasonTeamId
        );
        const away = allLineups.filter(p =>
          p.seasonTeamId === matchData.away_season_team_id ||
          p.seasonTeamId === matchData.awaySeasonTeamId
        );

        setHomeLineup(home);
        setAwayLineup(away);
      }
    } catch (err) {
      console.error('Failed to load match data:', err);
      setError('Không thể tải dữ liệu trận đấu');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'IN_PLAY':
      case 'PAUSED':
      case 'HALFTIME':
        return 'bg-red-500 text-white';
      case 'FINISHED':
        return 'bg-slate-500 text-white';
      case 'SCHEDULED':
        return 'bg-cyan-500 text-white';
      default:
        return 'bg-slate-400 text-white';
    }
  };

  const formatMatchTime = (date) => {
    if (!date) return '--:--';
    return formatTimeGMT7(date);
  };

  const formatMatchDate = (date) => {
    if (!date) return '';
    return formatDateGMT7(date);
  };

  const getEventIcon = (event) => {
    switch (event.type) {
      case 'GOAL':
        return '⚽';
      case 'OWN_GOAL':
        return '⚽ (OG)';
      case 'YELLOW_CARD':
      case 'CARD':
        return event.cardType === 'Red' ? '🟥' : '🟨';
      case 'RED_CARD':
        return '🟥';
      case 'SUBSTITUTION':
        return '🔄';
      default:
        return '•';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400 mx-auto mb-4" />
          <p className="text-white/70">Đang tải dữ liệu trận đấu...</p>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="mx-auto mb-4 text-red-400" size={48} />
          <h2 className="text-2xl font-bold text-white mb-2">Không tìm thấy trận đấu</h2>
          <p className="text-white/70 mb-6">{error || 'Trận đấu không tồn tại hoặc đã bị xóa'}</p>
          <button
            onClick={() => navigate('/matches')}
            className="px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
          >
            Quay lại danh sách trận đấu
          </button>
        </div>
      </div>
    );
  }

  const isLive = ['IN_PLAY', 'PAUSED', 'HALFTIME'].includes(match.status);
  const isFinished = match.status === 'FINISHED';
  const hasScore = match.home_score !== null || match.away_score !== null;

  // Helper: Determine kit color
  const getEffectiveKitColor = (teamType) => {
    // Default Blue/Red
    if (!match) return teamType === 'home' ? '#3b82f6' : '#ef4444';

    const kitType = teamType === 'home'
      ? (match.homeTeamKit || 'home')
      : (match.awayTeamKit || 'away');

    let color = null;

    if (teamType === 'home') {
      if (kitType === 'home') color = match.homeTeamHomeKitColor;
      else if (kitType === 'away') color = match.homeTeamAwayKitColor;
    } else {
      if (kitType === 'home') color = match.awayTeamHomeKitColor;
      else if (kitType === 'away') color = match.awayTeamAwayKitColor;
    }

    if (!color) {
      return teamType === 'home' ? '#3b82f6' : '#ef4444';
    }
    return color;
  };

  const homeKitColor = getEffectiveKitColor('home');
  const awayKitColor = getEffectiveKitColor('away');


  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header Section */}
      <section className="relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-900/20 to-transparent" />
        <div className="absolute inset-0">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-cyan-400 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                opacity: Math.random() * 0.5 + 0.2
              }}
            />
          ))}
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-8">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-6 group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span>Quay lại</span>
          </button>

          {/* Match Info */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8">
            {/* Status Badge */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusColor(match.status)}`}>
                  {toMatchStatusLabel(match.status)}
                </span>
                {isLive && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-red-400 text-sm font-bold">TRỰC TIẾP</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-white/50 text-sm">
                <Calendar size={16} />
                <span>{formatMatchDate(match.utcDate || match.scheduled_kickoff)}</span>
                <Clock size={16} className="ml-2" />
                <span>{formatMatchTime(match.utcDate || match.scheduled_kickoff)}</span>
              </div>
            </div>

            {/* Teams & Score */}
            <div className="grid md:grid-cols-3 gap-8 items-center">
              {/* Home Team */}
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-white/10 flex items-center justify-center mb-4 overflow-hidden">
                  {match.homeTeamLogo || match.home_team_logo ? (
                    <img
                      src={match.homeTeamLogo || match.home_team_logo}
                      alt={match.homeTeamName || match.home_team_name}
                      className="w-16 h-16 md:w-20 md:h-20 object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : null}
                  {(!match.homeTeamLogo && !match.home_team_logo) && (
                    <Shield size={48} className="text-white/40" />
                  )}
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  {match.homeTeamName || match.home_team_name}
                </h2>
                <div className="flex items-center gap-2 mb-1">
                  {match.homeTeamKit && (
                    <div className="px-2 py-0.5 rounded text-[10px] bg-white/10 text-white/70 uppercase font-bold tracking-wider">
                      {match.homeTeamKit} Kit
                    </div>
                  )}
                  <div
                    className="w-4 h-4 rounded-full border border-white/50 shadow-sm"
                    style={{ backgroundColor: homeKitColor }}
                  />
                </div>
                <p className="text-white/50 text-sm uppercase tracking-wider">
                  {match.homeTeamTla || 'HOME'}
                </p>
              </div>

              {/* Score */}
              <div className="flex flex-col items-center justify-center">
                {hasScore || isLive || isFinished ? (
                  <>
                    <div className="text-6xl md:text-7xl font-black text-white mb-3">
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                        {match.home_score ?? match.scoreHome ?? 0}
                      </span>
                      <span className="text-white/30 mx-4">:</span>
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                        {match.away_score ?? match.scoreAway ?? 0}
                      </span>
                    </div>
                    <p className="text-white/50 text-sm uppercase tracking-widest">
                      {isFinished ? 'Hết giờ' : isLive ? 'Đang thi đấu' : 'Kết quả'}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-4xl md:text-5xl font-bold text-white mb-3">
                      {formatMatchTime(match.utcDate || match.scheduled_kickoff)}
                    </div>
                    <p className="text-white/50 text-sm uppercase tracking-widest">
                      Giờ bóng lăn
                    </p>
                  </>
                )}
              </div>

              {/* Away Team */}
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-white/10 flex items-center justify-center mb-4 overflow-hidden">
                  {match.awayTeamLogo || match.away_team_logo ? (
                    <img
                      src={match.awayTeamLogo || match.away_team_logo}
                      alt={match.awayTeamName || match.away_team_name}
                      className="w-16 h-16 md:w-20 md:h-20 object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : null}
                  {(!match.awayTeamLogo && !match.away_team_logo) && (
                    <Shield size={48} className="text-white/40" />
                  )}
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  {match.awayTeamName || match.away_team_name}
                </h2>
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-4 h-4 rounded-full border border-white/50 shadow-sm"
                    style={{ backgroundColor: awayKitColor }}
                  />
                  {match.awayTeamKit && (
                    <div className="px-2 py-0.5 rounded text-[10px] bg-white/10 text-white/70 uppercase font-bold tracking-wider">
                      {match.awayTeamKit} Kit
                    </div>
                  )}
                </div>
                <p className="text-white/50 text-sm uppercase tracking-wider">
                  {match.awayTeamTla || 'AWAY'}
                </p>
              </div>
            </div>

            {/* Venue Info */}
            {match.venue && (
              <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-center gap-4 text-white/60 text-sm">
                <span className="flex items-center gap-2">
                  <MapPin size={16} />
                  {match.venue}
                </span>
                {match.stadium_name && match.stadium_name !== match.venue && (
                  <span className="flex items-center gap-2">
                    <Trophy size={16} />
                    {match.stadium_name}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Tabs Navigation */}
      <section className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-2 overflow-x-auto">
            {[
              { id: 'overview', label: 'Tổng quan', icon: Activity },
              { id: 'lineups', label: 'Đội hình', icon: Users },
              { id: 'events', label: 'Diễn biến', icon: Zap },
              { id: 'stats', label: 'Thống kê', icon: TrendingUp }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === tab.id
                      ? 'border-cyan-400 text-cyan-400'
                      : 'border-transparent text-white/50 hover:text-white/80 hover:border-white/20'
                    }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </section>

      {/* Tab Content */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 text-center">
                <Target className="mx-auto mb-2 text-amber-400" size={24} />
                <p className="text-2xl font-black text-white mb-1">
                  {(match.home_score ?? 0) + (match.away_score ?? 0)}
                </p>
                <p className="text-xs text-white/50 uppercase tracking-wider">Bàn thắng</p>
              </div>
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 text-center">
                <Zap className="mx-auto mb-2 text-cyan-400" size={24} />
                <p className="text-2xl font-black text-white mb-1">{events.length}</p>
                <p className="text-xs text-white/50 uppercase tracking-wider">Sự kiện</p>
              </div>
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 text-center">
                <Users className="mx-auto mb-2 text-purple-400" size={24} />
                <p className="text-2xl font-black text-white mb-1">
                  {homeLineup.filter(p => p.isStarting).length + awayLineup.filter(p => p.isStarting).length}
                </p>
                <p className="text-xs text-white/50 uppercase tracking-wider">Cầu thủ ra sân</p>
              </div>
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 text-center">
                <Trophy className="mx-auto mb-2 text-green-400" size={24} />
                <p className="text-2xl font-black text-white mb-1">
                  {match.matchday_number || match.matchday || '-'}
                </p>
                <p className="text-xs text-white/50 uppercase tracking-wider">Vòng đấu</p>
              </div>
            </div>

            {/* Recent Events */}
            {events.length > 0 && (
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Activity size={20} className="text-cyan-400" />
                  Diễn biến gần đây
                </h3>
                <div className="space-y-2">
                  {events.slice(0, 5).map((event, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getEventIcon(event)}</span>
                        <div>
                          <p className="text-white font-medium">{event.player || event.playerName || 'Unknown'}</p>
                          <p className="text-xs text-white/50">{event.description || event.type || 'Event'}</p>
                        </div>
                      </div>
                      <span className="text-white/70 font-mono font-bold">
                        {event.minute || event.event_minute || 0}'{event.stoppageTime || event.stoppage_time ? `+${event.stoppageTime || event.stoppage_time}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lineups Tab */}
        {activeTab === 'lineups' && (
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
              <LineupDisplay
                lineup={homeLineup}
                teamName={match.homeTeamName || match.home_team_name}
                teamColor={homeKitColor}
                formation={match.homeFormation || '4-4-2'}
              />
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
              <LineupDisplay
                lineup={awayLineup}
                teamName={match.awayTeamName || match.away_team_name}
                teamColor={awayKitColor}
                formation={match.awayFormation || '4-4-2'}
              />
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Zap size={20} className="text-cyan-400" />
              Diễn biến trận đấu ({events.length} sự kiện)
            </h3>
            {events.length > 0 ? (
              <div className="space-y-3 relative before:absolute before:left-1/2 before:-translate-x-1/2 before:h-full before:w-px before:bg-white/10">
                {events.map((event, idx) => {
                  const isHome = event.teamId === match.homeTeamId ||
                    event.teamId === match.home_team_id ||
                    event.seasonTeamId === match.homeSeasonTeamId ||
                    event.seasonTeamId === match.home_season_team_id;
                  return (
                    <div key={idx} className={`flex items-center gap-4 ${isHome ? 'flex-row' : 'flex-row-reverse'}`}>
                      <div className={`flex-1 ${isHome ? 'text-right' : 'text-left'}`}>
                        <p className="text-white font-semibold">{event.player || event.playerName || 'Unknown'}</p>
                        {event.description && (
                          <p className="text-xs text-white/50">{event.description}</p>
                        )}
                        {event.type && event.type !== 'GOAL' && (
                          <p className="text-xs text-white/40 uppercase">{event.type}</p>
                        )}
                      </div>
                      <div className="z-10 bg-slate-800 border-2 border-white/20 rounded-full w-12 h-12 flex flex-col items-center justify-center shadow-lg">
                        <span className="text-lg">{getEventIcon(event)}</span>
                        <span className="text-[10px] text-white/70 font-mono font-bold">
                          {event.minute || event.event_minute || 0}'{event.stoppageTime || event.stoppage_time ? `+${event.stoppageTime || event.stoppage_time}` : ''}
                        </span>
                      </div>
                      <div className="flex-1" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-white/40">
                <Activity className="mx-auto mb-3" size={48} />
                <p>Chưa có sự kiện nào được ghi nhận</p>
              </div>
            )}
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp size={20} className="text-cyan-400" />
              Thống kê trận đấu
            </h3>
            {match?.stats?.home || match?.stats?.away ? (
              <div className="space-y-6">
                {/* Possession */}
                {match.stats.home?.possession !== undefined || match.stats.away?.possession !== undefined ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-semibold">{match.homeTeamName || 'Home'}</span>
                      <span className="text-white font-semibold">{match.awayTeamName || 'Away'}</span>
                    </div>
                    <div className="relative h-8 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="absolute left-0 top-0 h-full bg-cyan-500/30 flex items-center justify-end pr-2"
                        style={{ width: `${match.stats.home?.possession || 50}%` }}
                      >
                        <span className="text-xs font-bold text-white">{match.stats.home?.possession || 0}%</span>
                      </div>
                      <div
                        className="absolute right-0 top-0 h-full bg-purple-500/30 flex items-center justify-start pl-2"
                        style={{ width: `${match.stats.away?.possession || 50}%` }}
                      >
                        <span className="text-xs font-bold text-white">{match.stats.away?.possession || 0}%</span>
                      </div>
                    </div>
                    <p className="text-xs text-white/50 mt-1 text-center">Kiểm soát bóng</p>
                  </div>
                ) : null}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Shots */}
                  <div className="bg-white/5 rounded-lg p-4">
                    <p className="text-xs text-white/50 mb-2 uppercase tracking-wider">Cú sút</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-white">{match.stats.home?.shots || 0}</span>
                      <span className="text-white/30">-</span>
                      <span className="text-2xl font-bold text-white">{match.stats.away?.shots || 0}</span>
                    </div>
                  </div>

                  {/* Shots on Target */}
                  <div className="bg-white/5 rounded-lg p-4">
                    <p className="text-xs text-white/50 mb-2 uppercase tracking-wider">Sút trúng đích</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-white">{match.stats.home?.onTarget || 0}</span>
                      <span className="text-white/30">-</span>
                      <span className="text-2xl font-bold text-white">{match.stats.away?.onTarget || 0}</span>
                    </div>
                  </div>

                  {/* Corners */}
                  <div className="bg-white/5 rounded-lg p-4">
                    <p className="text-xs text-white/50 mb-2 uppercase tracking-wider">Phạt góc</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-white">{match.stats.home?.corners || 0}</span>
                      <span className="text-white/30">-</span>
                      <span className="text-2xl font-bold text-white">{match.stats.away?.corners || 0}</span>
                    </div>
                  </div>

                  {/* Fouls */}
                  <div className="bg-white/5 rounded-lg p-4">
                    <p className="text-xs text-white/50 mb-2 uppercase tracking-wider">Lỗi</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-white">{match.stats.home?.fouls || 0}</span>
                      <span className="text-white/30">-</span>
                      <span className="text-2xl font-bold text-white">{match.stats.away?.fouls || 0}</span>
                    </div>
                  </div>

                  {/* Offsides */}
                  {(match.stats.home?.offsides !== undefined || match.stats.away?.offsides !== undefined) && (
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-xs text-white/50 mb-2 uppercase tracking-wider">Việt vị</p>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-white">{match.stats.home?.offsides || 0}</span>
                        <span className="text-white/30">-</span>
                        <span className="text-2xl font-bold text-white">{match.stats.away?.offsides || 0}</span>
                      </div>
                    </div>
                  )}

                  {/* Passes Completed */}
                  {(match.stats.home?.passesCompleted !== undefined || match.stats.away?.passesCompleted !== undefined) && (
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-xs text-white/50 mb-2 uppercase tracking-wider">Đường chuyền</p>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-white">{match.stats.home?.passesCompleted || 0}</span>
                        <span className="text-white/30">-</span>
                        <span className="text-2xl font-bold text-white">{match.stats.away?.passesCompleted || 0}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-white/40">
                <TrendingUp className="mx-auto mb-3" size={48} />
                <p>Thống kê chi tiết sẽ được cập nhật sau trận đấu</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default MatchDetailPage;
