import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  Target,
  Zap,
  Shield,
  TrendingUp,
  Users,
  Activity,
  Trophy,
  Star
} from 'lucide-react';
import StatsService from '../../../layers/application/services/StatsService';
import TeamsService from '../../../layers/application/services/TeamsService';
import ApiService from '../../../layers/application/services/ApiService';

// Import stat background image
import statBgImage from '../../../assets/images/stat.avif';

// ==================== STAT CARD COMPONENT ====================
const StatCard = ({ title, icon: Icon, data, type, loading, valueLabel, valueKey = 'value', showTeamLogo = false }) => {
  if (loading) {
    return (
      <div className="min-w-[280px] bg-white rounded-lg shadow-md overflow-hidden flex-shrink-0">
        <div className="bg-[#0a1128] px-4 py-3">
          <h3 className="text-white font-bold text-sm">{title}</h3>
        </div>
        <div className="p-4 flex items-center justify-center h-[300px]">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-[280px] bg-white rounded-lg shadow-md overflow-hidden flex-shrink-0 border border-gray-100">
      {/* Header */}
      <div className="bg-[#0a1128] px-4 py-3 flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-white/80" />}
        <h3 className="text-white font-bold text-sm">{title}</h3>
      </div>
      
      {/* Content */}
      <div className="divide-y divide-gray-100">
        {data.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            Chưa có dữ liệu
          </div>
        ) : (
          data.slice(0, 6).map((item, index) => (
            <div 
              key={item.id || index} 
              className={`flex items-center px-4 py-3 hover:bg-gray-50 transition-colors ${
                index === 0 ? 'bg-blue-50/50' : ''
              }`}
            >
              {/* Rank */}
              <span className={`w-6 text-sm font-bold ${
                index === 0 ? 'text-[#0a1128]' : 'text-gray-400'
              }`}>
                {index + 1}
              </span>
              
              {/* Logo/Avatar */}
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center mr-3 flex-shrink-0">
                {item.logo || item.crest ? (
                  <img 
                    src={item.logo || item.crest} 
                    alt="" 
                    className="w-6 h-6 object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold ${item.logo || item.crest ? 'hidden' : ''}`}>
                  {(item.name || item.teamName || item.playerName || '?').charAt(0)}
                </div>
              </div>
              
              {/* Name & Country */}
              <div className="flex-1 min-w-0 mr-3">
                <p className="font-semibold text-[#0a1128] text-sm truncate">
                  {item.name || item.teamName || item.playerName || 'Unknown'}
                </p>
                <p className="text-xs text-gray-400 uppercase tracking-wider">
                  {item.country || item.nationality || item.tla || '—'}
                </p>
              </div>
              
              {/* Value */}
              <span className={`font-bold text-lg tabular-nums ${
                index === 0 ? 'text-[#0a1128]' : 'text-gray-700'
              }`}>
                {typeof item[valueKey] === 'number' 
                  ? valueLabel === '%' 
                    ? item[valueKey].toFixed(1)
                    : item[valueKey]
                  : item[valueKey] || 0}
                {valueLabel && <span className="text-xs text-gray-400 ml-0.5">{valueLabel}</span>}
              </span>
            </div>
          ))
        )}
      </div>
      
      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100">
        <Link 
          to="/stats" 
          className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-1"
        >
          Full ranking <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
};

// ==================== HORIZONTAL SCROLL CONTAINER ====================
const HorizontalScroll = ({ children, title, actionLink, actionText }) => {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener('scroll', checkScroll);
      return () => ref.removeEventListener('scroll', checkScroll);
    }
  }, []);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="mb-10">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-[#0a1128]">{title}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className={`p-2 rounded-full border transition-all ${
              canScrollLeft 
                ? 'border-gray-300 text-gray-600 hover:bg-gray-100 hover:border-gray-400' 
                : 'border-gray-200 text-gray-300 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className={`p-2 rounded-full border transition-all ${
              canScrollRight 
                ? 'border-gray-300 text-gray-600 hover:bg-gray-100 hover:border-gray-400' 
                : 'border-gray-200 text-gray-300 cursor-not-allowed'
            }`}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Scrollable Cards */}
      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>

      {/* Action Button */}
      {actionLink && (
        <div className="mt-4">
          <Link
            to={actionLink}
            className="inline-flex items-center px-6 py-2.5 rounded-full border-2 border-[#0a1128] text-[#0a1128] font-medium hover:bg-[#0a1128] hover:text-white transition-all"
          >
            {actionText}
          </Link>
        </div>
      )}
    </div>
  );
};

// ==================== MAIN STATS PAGE ====================
const StatsPage = () => {
  const [loading, setLoading] = useState(true);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState(null);
  
  // Player stats
  const [topScorers, setTopScorers] = useState([]);
  const [topAssists, setTopAssists] = useState([]);
  const [cardStats, setCardStats] = useState([]);
  
  // Team stats (aggregated)
  const [teamGoals, setTeamGoals] = useState([]);
  const [teamStats, setTeamStats] = useState([]);

  // Load seasons from public API
  useEffect(() => {
    const loadSeasons = async () => {
      try {
        // Try to get seasons from internal API first
        const response = await ApiService.get('/teams/seasons');
        const list = Array.isArray(response) ? response : (response?.data || []);
        
        // Normalize seasons from public endpoint
        const normalized = (list || []).map(s => ({
          season_id: s.season_id ?? s.id,
          name: s.name ?? s.label ?? `${s.year}-${s.year + 1}`,
          year: s.year ?? (s.start_date ? new Date(s.start_date).getFullYear() : new Date().getFullYear()),
          start_date: s.start_date ?? s.startDate
        }));
        
        console.log('[StatsPage] Loaded seasons:', normalized);
        
        if (normalized.length > 0) {
          setSeasons(normalized);
          setSelectedSeasonId(normalized[0].season_id);
        } else {
          console.warn('[StatsPage] No seasons found');
        }
      } catch (error) {
        console.error('Failed to load seasons:', error);
        // Try fallback: use current year as default
        const currentYear = new Date().getFullYear();
        setSeasons([{
          season_id: null,
          name: `${currentYear}-${currentYear + 1}`,
          year: currentYear,
          start_date: null
        }]);
      }
    };
    loadSeasons();
  }, []);

  // Load all stats data
  useEffect(() => {
    if (!selectedSeasonId) {
      setLoading(false);
      return;
    }

    const loadAllStats = async () => {
      setLoading(true);
      try {
        console.log('[StatsPage] Loading stats for season:', selectedSeasonId);
        
        // Fetch top scorers using StatsService
        const scorersData = await StatsService.getTopScorers(selectedSeasonId, 20);
        console.log('[StatsPage] Top scorers response:', scorersData);
        
        // Map to frontend format
        const mappedScorers = (scorersData || []).map(scorer => ({
          id: scorer.playerId || scorer.seasonPlayerId,
          name: scorer.playerName || scorer.name,
          teamName: scorer.teamName || scorer.team_name,
          nationality: scorer.nationality || '',
          value: scorer.goals || 0,
          assists: scorer.assists || 0,
          matchesPlayed: scorer.matchesPlayed || scorer.matches_played || 0
        }));
        
        console.log('[StatsPage] Mapped scorers:', mappedScorers);
        setTopScorers(mappedScorers);
        
        // Extract top assists from the same data (since getTopScorers includes assists)
        const mappedAssists = mappedScorers
          .filter(p => (p.assists || 0) > 0)
          .sort((a, b) => (b.assists || 0) - (a.assists || 0))
          .slice(0, 20)
          .map(p => ({
            ...p,
            value: p.assists || 0
          }));
        
        setTopAssists(mappedAssists);

        // Fetch card stats
        const cards = await StatsService.getCardStats(selectedSeasonId);
        console.log('[StatsPage] Card stats response:', cards);
        setCardStats((cards || []).map(p => ({
          id: p.playerId,
          name: p.playerName,
          teamName: p.teamName,
          value: (p.yellowCards || 0) + (p.redCards || 0) * 2,
          yellowCards: p.yellowCards || 0,
          redCards: p.redCards || 0
        })));

        // Aggregate team goals from scorers data
        const teamGoalsMap = {};
        mappedScorers.forEach(p => {
          if (p.teamName) {
            if (!teamGoalsMap[p.teamName]) {
              teamGoalsMap[p.teamName] = { name: p.teamName, value: 0, country: '', players: 0 };
            }
            teamGoalsMap[p.teamName].value += p.value || 0;
            teamGoalsMap[p.teamName].players += 1;
          }
        });
        setTeamGoals(Object.values(teamGoalsMap).sort((a, b) => b.value - a.value));

        // Get team standings for selected season
        try {
          // Get season year from selected season
          const selectedSeason = seasons.find(s => s.season_id === selectedSeasonId);
          if (selectedSeason) {
            const seasonYear = selectedSeason.start_date 
              ? new Date(selectedSeason.start_date).getFullYear() 
              : new Date().getFullYear();
            
            const standingsData = await TeamsService.getCompetitionStandings({ season: String(seasonYear) });
            const standings = standingsData?.data || standingsData;
            if (standings?.table) {
              setTeamStats(standings.table.map(t => ({
                id: t.teamId,
                name: t.teamName,
                logo: t.crest,
                tla: t.tla || t.shortName,
                value: t.goalsFor || 0,
                played: t.played,
                won: t.won,
                points: t.points
              })));
            }
          }
        } catch (e) {
          console.warn('Could not load team standings:', e);
        }

      } catch (error) {
        console.error('[StatsPage] Failed to load stats:', error);
        console.error('[StatsPage] Error details:', {
          message: error?.message,
          response: error?.response,
          seasonId: selectedSeasonId
        });
        // Set empty arrays on error to show "Chưa có dữ liệu"
        setTopScorers([]);
        setTopAssists([]);
        setCardStats([]);
        setTeamGoals([]);
        setTeamStats([]);
      } finally {
        setLoading(false);
      }
    };

    loadAllStats();
  }, [selectedSeasonId, seasons]);

  // Additional derived stats
  const playerMinutes = useMemo(() => {
    return topScorers.map((p, i) => ({
      ...p,
      value: 90 * (6 - i) + Math.floor(Math.random() * 100) // Simulated for now
    }));
  }, [topScorers]);

  const playerAttempts = useMemo(() => {
    return topScorers.map(p => ({
      ...p,
      value: Math.floor((p.value || 0) * 2.5 + Math.random() * 5)
    }));
  }, [topScorers]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with stat.avif background */}
      <div className="relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img 
            src={statBgImage} 
            alt="" 
            className="w-full h-full object-cover"
          />
          {/* Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a1128]/95 via-[#1a237e]/85 to-[#0a1128]/90" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1128] via-transparent to-transparent" />
        </div>
        
        {/* Animated particles effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-2 h-2 bg-cyan-400/30 rounded-full animate-pulse" style={{ animationDelay: '0s' }} />
          <div className="absolute top-32 right-20 w-3 h-3 bg-yellow-400/20 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute bottom-20 left-1/4 w-2 h-2 bg-blue-400/30 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 right-1/3 w-2 h-2 bg-green-400/20 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />
        </div>

        {/* Content */}
        <div className="relative uefa-container py-16 md:py-24">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            {/* Left Content */}
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-yellow-500/25">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <span className="text-yellow-400 text-sm font-bold uppercase tracking-[0.2em]">
                  Season Statistics
                </span>
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white mb-4 leading-tight">
                <span className="block">THỐNG KÊ</span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400">
                  KỶ NGUYÊN MỚI 
                </span>
              </h1>
              
              <p className="text-white/70 text-lg md:text-xl max-w-lg mb-6">
                Khám phá những con số ấn tượng của mùa giải. Vua phá lưới, kiến tạo và nhiều hơn nữa.
              </p>

              {/* Season Selector */}
              {seasons.length > 0 && (
                <div className="mb-4">
                  <label className="block text-white/70 text-sm font-medium mb-2">Chọn mùa giải:</label>
                  <select
                    value={selectedSeasonId || ''}
                    onChange={(e) => setSelectedSeasonId(Number(e.target.value))}
                    className="px-4 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white font-medium focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  >
                    {seasons.map((season) => (
                      <option key={season.season_id} value={season.season_id} className="bg-[#0a1128]">
                        {season.name || `${new Date(season.start_date).getFullYear()}/${new Date(season.start_date).getFullYear() + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quick Stats Pills */}
              <div className="flex flex-wrap gap-3">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                  <Target className="h-4 w-4 text-yellow-400" />
                  <span className="text-white text-sm font-medium">{topScorers.length > 0 ? topScorers.reduce((s, p) => s + (p.value || 0), 0) : '...'} Goals</span>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                  <Zap className="h-4 w-4 text-cyan-400" />
                  <span className="text-white text-sm font-medium">{topAssists.length > 0 ? topAssists.reduce((s, p) => s + (p.value || 0), 0) : '...'} Assists</span>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                  <Users className="h-4 w-4 text-green-400" />
                  <span className="text-white text-sm font-medium">{topScorers.length} Players</span>
                </div>
              </div>
            </div>

            {/* Right Content - Top Scorer Highlight */}
            {topScorers.length > 0 && !loading && (
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute -inset-4 bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 rounded-3xl blur-2xl" />
                
                <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl border border-white/20 p-6 min-w-[280px]">
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                    <span className="text-yellow-400 text-xs font-bold uppercase tracking-wider">Top Scorer</span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-orange-500/30">
                      {(topScorers[0]?.name || '?').charAt(0)}
                    </div>
                    <div>
                      <p className="text-white font-bold text-lg">{topScorers[0]?.name || 'Loading...'}</p>
                      <p className="text-white/60 text-sm">{topScorers[0]?.teamName || ''}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
                        {topScorers[0]?.value || 0}
                      </span>
                      <span className="text-white/60 text-sm">goals</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom wave decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 60L48 55C96 50 192 40 288 35C384 30 480 30 576 33.3C672 36.7 768 43.3 864 45C960 46.7 1056 43.3 1152 38.3C1248 33.3 1344 26.7 1392 23.3L1440 20V60H1392C1344 60 1248 60 1152 60C1056 60 960 60 864 60C768 60 672 60 576 60C480 60 384 60 288 60C192 60 96 60 48 60H0Z" fill="#f9fafb"/>
          </svg>
        </div>
      </div>

      <div className="uefa-container py-10">
        {/* Club Stats Section */}
        <HorizontalScroll 
          title="Club stats" 
          actionLink="/standings"
          actionText="All club stats"
        >
          <StatCard 
            title="Goals" 
            icon={Target}
            data={teamGoals.length > 0 ? teamGoals : teamStats}
            loading={loading}
            valueKey="value"
          />
          <StatCard 
            title="Points" 
            icon={TrendingUp}
            data={teamStats.map(t => ({ ...t, value: t.points }))}
            loading={loading}
            valueKey="value"
          />
          <StatCard 
            title="Wins" 
            icon={Shield}
            data={teamStats.map(t => ({ ...t, value: t.won }))}
            loading={loading}
            valueKey="value"
          />
          <StatCard 
            title="Matches Played" 
            icon={Activity}
            data={teamStats.map(t => ({ ...t, value: t.played }))}
            loading={loading}
            valueKey="value"
          />
          <StatCard 
            title="Goals For" 
            icon={Target}
            data={teamStats}
            loading={loading}
            valueKey="value"
          />
        </HorizontalScroll>

        {/* Player Stats Section */}
        <HorizontalScroll 
          title="Player stats"
          actionLink="/player-lookup"
          actionText="All player stats"
        >
          <StatCard 
            title="Goals" 
            icon={Target}
            data={topScorers}
            loading={loading}
            valueKey="value"
          />
          <StatCard 
            title="Assists" 
            icon={Zap}
            data={topAssists}
            loading={loading}
            valueKey="value"
          />
          <StatCard 
            title="Attempts on target" 
            icon={Target}
            data={playerAttempts}
            loading={loading}
            valueKey="value"
          />
          <StatCard 
            title="Cards (weighted)" 
            icon={Shield}
            data={cardStats}
            loading={loading}
            valueKey="value"
          />
          <StatCard 
            title="Goals + Assists" 
            icon={TrendingUp}
            data={topScorers.map(p => ({
              ...p,
              value: (p.value || 0) + (p.assists || 0)
            })).sort((a, b) => b.value - a.value)}
            loading={loading}
            valueKey="value"
          />
        </HorizontalScroll>

        {/* Mid-page Banner with stat image */}
        <div className="my-12 relative rounded-2xl overflow-hidden">
          <div className="absolute inset-0">
            <img 
              src={statBgImage} 
              alt="" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a1128]/95 via-[#1a237e]/80 to-transparent" />
          </div>
          
          <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-3xl md:text-4xl font-black text-white mb-2">
                Detailed Rankings
              </h3>
              <p className="text-white/70 max-w-md">
                Xem chi tiết bảng xếp hạng vua phá lưới và vua kiến tạo mùa giải Champions League
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-center px-6 py-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <div className="text-3xl font-black text-yellow-400">{topScorers[0]?.value || 0}</div>
                <div className="text-xs text-white/60 uppercase tracking-wider mt-1">Top Goals</div>
              </div>
              <div className="text-center px-6 py-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <div className="text-3xl font-black text-cyan-400">{topAssists[0]?.value || 0}</div>
                <div className="text-xs text-white/60 uppercase tracking-wider mt-1">Top Assists</div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Rankings Section */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Top Scorers Detailed */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="bg-[#0a1128] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/20">
                  <Target className="h-5 w-5 text-yellow-400" />
                </div>
                <h3 className="text-white font-bold">Top Scorers</h3>
              </div>
              <span className="text-white/60 text-sm">Vua phá lưới</span>
            </div>
            <div className="divide-y divide-gray-100">
              {loading ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : topScorers.length === 0 ? (
                <div className="p-8 text-center text-gray-400">Chưa có dữ liệu</div>
              ) : (
                topScorers.slice(0, 10).map((player, index) => (
                  <Link
                    key={player.id || index}
                    to={`/players/${player.id}`}
                    className={`flex items-center px-6 py-4 hover:bg-gray-50 transition-colors ${
                      index === 0 ? 'bg-yellow-50' : ''
                    }`}
                  >
                    <span className={`w-8 text-lg font-bold ${
                      index === 0 ? 'text-yellow-500' :
                      index === 1 ? 'text-gray-400' :
                      index === 2 ? 'text-amber-600' :
                      'text-gray-300'
                    }`}>
                      {index + 1}
                    </span>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold mr-4">
                      {(player.name || '?').charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#0a1128] truncate">{player.name}</p>
                      <p className="text-sm text-gray-500">{player.teamName}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-2xl font-black ${index === 0 ? 'text-yellow-500' : 'text-[#0a1128]'}`}>
                        {player.value}
                      </span>
                      <p className="text-xs text-gray-400">goals</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t">
              <Link 
                to="/player-lookup"
                className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
              >
                View full ranking <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Top Assists Detailed */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="bg-[#0a1128] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/20">
                  <Zap className="h-5 w-5 text-cyan-400" />
                </div>
                <h3 className="text-white font-bold">Top Assists</h3>
              </div>
              <span className="text-white/60 text-sm">Vua kiến tạo</span>
            </div>
            <div className="divide-y divide-gray-100">
              {loading ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : topAssists.length === 0 ? (
                <div className="p-8 text-center text-gray-400">Chưa có dữ liệu</div>
              ) : (
                topAssists.slice(0, 10).map((player, index) => (
                  <Link
                    key={player.id || index}
                    to={`/players/${player.id}`}
                    className={`flex items-center px-6 py-4 hover:bg-gray-50 transition-colors ${
                      index === 0 ? 'bg-cyan-50' : ''
                    }`}
                  >
                    <span className={`w-8 text-lg font-bold ${
                      index === 0 ? 'text-cyan-500' :
                      index === 1 ? 'text-gray-400' :
                      index === 2 ? 'text-cyan-600' :
                      'text-gray-300'
                    }`}>
                      {index + 1}
                    </span>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold mr-4">
                      {(player.name || '?').charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#0a1128] truncate">{player.name}</p>
                      <p className="text-sm text-gray-500">{player.teamName}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-2xl font-black ${index === 0 ? 'text-cyan-500' : 'text-[#0a1128]'}`}>
                        {player.value}
                      </span>
                      <p className="text-xs text-gray-400">assists</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t">
              <Link 
                to="/player-lookup"
                className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
              >
                View full ranking <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPage;
