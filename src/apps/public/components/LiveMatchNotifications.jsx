import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  Target, 
  UserPlus, 
  AlertCircle, 
  Clock,
  TrendingUp,
  ArrowRight,
  Zap
} from 'lucide-react';
import MatchService from '../../../layers/application/services/MatchService';

const LiveMatchNotifications = () => {
  const [liveMatches, setLiveMatches] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch live matches and their events
  const fetchLiveData = async () => {
    try {
      // Get live matches
      const matchesResponse = await MatchService.getLiveMatches();
      const matches = matchesResponse?.data || [];
      
      setLiveMatches(matches);

      // Get events for each live match
      const allEvents = [];
      for (const match of matches.slice(0, 3)) { // Limit to 3 matches
        try {
          const eventsResponse = await MatchService.getMatchEvents(match.id);
          const events = eventsResponse?.data || [];
          
          // Add match info to each event
          const eventsWithMatch = events.map(event => ({
            ...event,
            match: {
              id: match.id,
              homeTeam: match.homeTeam,
              awayTeam: match.awayTeam,
              homeScore: match.homeScore,
              awayScore: match.awayScore
            }
          }));
          
          allEvents.push(...eventsWithMatch);
        } catch (err) {
          console.warn(`Failed to fetch events for match ${match.id}:`, err);
        }
      }

      // Sort events by time (most recent first) and take last 10
      const sortedEvents = allEvents
        .sort((a, b) => (b.minute || 0) - (a.minute || 0))
        .slice(0, 10);
      
      setRecentEvents(sortedEvents);
      setError(null);
    } catch (err) {
      console.error('Error fetching live data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchLiveData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Get icon and color for event type
  const getEventStyle = (eventType) => {
    switch (eventType) {
      case 'GOAL':
        return {
          icon: Target,
          color: 'text-green-400',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30',
          label: 'Bàn thắng'
        };
      case 'ASSIST':
        return {
          icon: UserPlus,
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/30',
          label: 'Kiến tạo'
        };
      case 'YELLOW_CARD':
        return {
          icon: AlertCircle,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30',
          label: 'Thẻ vàng'
        };
      case 'RED_CARD':
        return {
          icon: AlertCircle,
          color: 'text-red-400',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          label: 'Thẻ đỏ'
        };
      case 'SUBSTITUTION':
        return {
          icon: UserPlus,
          color: 'text-purple-400',
          bgColor: 'bg-purple-500/10',
          borderColor: 'border-purple-500/30',
          label: 'Thay người'
        };
      default:
        return {
          icon: Activity,
          color: 'text-slate-400',
          bgColor: 'bg-slate-500/10',
          borderColor: 'border-slate-500/30',
          label: 'Sự kiện'
        };
    }
  };

  const formatPlayerName = (player) => {
    if (!player) return 'N/A';
    return player.name || player.fullName || 'Cầu thủ';
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <h3 className="text-xl font-bold text-white">Cập nhật trực tiếp</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-slate-700/30 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="text-red-400" size={20} />
          <h3 className="text-xl font-bold text-white">Lỗi tải dữ liệu</h3>
        </div>
        <p className="text-slate-400 text-sm">{error}</p>
      </div>
    );
  }

  if (liveMatches.length === 0 && recentEvents.length === 0) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="text-slate-400" size={20} />
          <h3 className="text-xl font-bold text-white">Cập nhật trận đấu</h3>
        </div>
        <p className="text-slate-400 text-sm">Hiện tại chưa có trận đấu nào đang diễn ra.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Zap className="text-cyan-400" size={24} />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Cập nhật trực tiếp</h3>
            <p className="text-slate-400 text-xs">Real-time từ sân cỏ</p>
          </div>
        </div>
        <Link 
          to="/matches"
          className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1 group"
        >
          Xem tất cả
          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Live Matches */}
      {liveMatches.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Activity className="text-green-400" size={16} />
            <span className="font-semibold">Đang diễn ra ({liveMatches.length})</span>
          </div>
          {liveMatches.slice(0, 2).map(match => (
            <Link
              key={match.id}
              to={`/match-center?matchId=${match.id}`}
              className="block group"
            >
              <div className="bg-gradient-to-r from-green-500/5 to-transparent border border-green-500/20 rounded-lg p-4 hover:border-green-500/40 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-white font-semibold group-hover:text-cyan-400 transition-colors">
                        {match.homeTeam?.name || 'TBA'}
                      </span>
                      <span className="text-2xl font-bold text-green-400">
                        {match.homeScore ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white font-semibold group-hover:text-cyan-400 transition-colors">
                        {match.awayTeam?.name || 'TBA'}
                      </span>
                      <span className="text-2xl font-bold text-green-400">
                        {match.awayScore ?? 0}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-400 text-sm font-semibold">LIVE</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Recent Events */}
      {recentEvents.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <TrendingUp className="text-cyan-400" size={16} />
            <span className="font-semibold">Sự kiện mới nhất</span>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
            {recentEvents.map((event, index) => {
              const style = getEventStyle(event.type);
              const Icon = style.icon;
              
              return (
                <Link
                  key={`${event.id}-${index}`}
                  to={`/match-center?matchId=${event.match?.id}`}
                  className="block group"
                >
                  <div className={`${style.bgColor} border ${style.borderColor} rounded-lg p-3 hover:scale-[1.02] transition-all`}>
                    <div className="flex items-start gap-3">
                      <div className={`${style.bgColor} border ${style.borderColor} p-2 rounded-lg`}>
                        <Icon className={style.color} size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`${style.color} text-xs font-bold uppercase`}>
                            {style.label}
                          </span>
                          <span className="text-slate-500 text-xs">•</span>
                          <span className="text-slate-400 text-xs">
                            {event.minute}'
                          </span>
                        </div>
                        <p className="text-white text-sm font-medium mb-1 truncate">
                          {formatPlayerName(event.player)}
                        </p>
                        {event.match && (
                          <p className="text-slate-400 text-xs truncate">
                            {event.match.homeTeam?.name} {event.match.homeScore ?? 0} - {event.match.awayScore ?? 0} {event.match.awayTeam?.name}
                          </p>
                        )}
                        {event.description && (
                          <p className="text-slate-500 text-xs mt-1 line-clamp-1">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Auto-refresh indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-700">
        <Activity size={12} />
        <span>Tự động cập nhật mỗi 30 giây</span>
      </div>
    </div>
  );
};

export default LiveMatchNotifications;
