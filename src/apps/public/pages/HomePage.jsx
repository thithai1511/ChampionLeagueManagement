import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Play, ArrowRight, Trophy, Users, Activity, CalendarDays, Shield, Star, Clock, Award, History, Zap } from 'lucide-react';
import uefaWordmark from '@/assets/images/UEFA_CHAMPIONS_LEAGUE.png';
import trophyImage from '@/assets/images/cup.avif';
import footballImage from '@/assets/images/trai_bong.jpg';
import PlayersService from '../../../layers/application/services/PlayersService';
import MatchesService from '../../../layers/application/services/MatchesService';
import TeamsService from '../../../layers/application/services/TeamsService';
import { toCompetitionStageLabel, toCountryLabel, toMatchStatusLabel, toPlayerPositionLabel } from '../../../shared/utils/vi';
import BestXI from '../../../components/BestXI';

const HomePage = () => {
  // Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState(''); // Actual query being searched
  const [searching, setSearching] = useState(false);
  const [playerResults, setPlayerResults] = useState([]);
  const [matchResults, setMatchResults] = useState([]);
  const [teamResults, setTeamResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false); // Track if user has searched

  // Data states - Real data from API
  const [allMatches, setAllMatches] = useState([]);
  const [topScorer, setTopScorer] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Computed values from real data
  const liveMatches = useMemo(() => 
    allMatches.filter(m => m.status === 'IN_PLAY' || m.status === 'PAUSED' || m.status === 'HALFTIME'),
    [allMatches]
  );

  const featuredMatch = useMemo(() => {
    // Priority: Live match > Most recent upcoming match > Most recent finished match
    if (liveMatches.length > 0) return liveMatches[0];
    const upcoming = allMatches.filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED')
      .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
    if (upcoming.length > 0) return upcoming[0];
    const finished = allMatches.filter(m => m.status === 'FINISHED')
      .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate));
    return finished[0] || null;
  }, [allMatches, liveMatches]);

  const stats = useMemo(() => {
    const totalGoals = allMatches.reduce((sum, m) => 
      sum + (m.scoreHome || 0) + (m.scoreAway || 0), 0);
    const uniqueCountries = new Set(teams.map(t => t.country).filter(Boolean));
    return {
      totalTeams: teams.length,
      totalMatches: allMatches.length,
      totalGoals: totalGoals,
      totalCountries: uniqueCountries.size
    };
  }, [allMatches, teams]);

  // Next upcoming match
  const nextMatch = useMemo(() => {
    const upcoming = allMatches
      .filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED')
      .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
    return upcoming[0] || null;
  }, [allMatches]);

  // Format next match time
  const formatNextMatchTime = (match) => {
    if (!match?.utcDate) return 'Chưa có lịch';
    const date = new Date(match.utcDate);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    
    if (date.toDateString() === now.toDateString()) {
      return `Hôm nay ${timeStr}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Ngày mai ${timeStr}`;
    } else {
      return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) + ` ${timeStr}`;
    }
  };

  const heroStats = [
    { label: 'CLB', value: loading ? '—' : stats.totalTeams, icon: Users },
    { label: 'Trận', value: loading ? '—' : stats.totalMatches, icon: CalendarDays },
    { label: 'Bàn thắng', value: loading ? '—' : stats.totalGoals, icon: Activity },
    { label: 'Quốc gia', value: loading ? '—' : stats.totalCountries, icon: Trophy }
  ];

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch external matches (from Football-Data.org synced data)
        const matchesResponse = await MatchesService.getExternalMatches({ limit: 200 });
        setAllMatches(matchesResponse?.matches || []);

        // Fetch teams
        const teamsResponse = await TeamsService.getAllTeams({ limit: 100 });
        setTeams(teamsResponse?.teams || []);

        // Fetch top scorer
        const playersResponse = await PlayersService.listPlayers({ 
          sortBy: 'goals', 
          sortOrder: 'desc', 
          limit: 1 
        });
        if (playersResponse?.players?.length > 0) {
          setTopScorer(playersResponse.players[0]);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Search function - only called when user clicks search or presses Enter
  const handleSearch = async () => {
    const query = searchTerm.trim();
    
    if (query.length < 2) {
      setPlayerResults([]);
      setMatchResults([]);
      setTeamResults([]);
      setSearchQuery('');
      setHasSearched(false);
      return;
    }

    setSearching(true);
    setSearchQuery(query);
    setHasSearched(true);
    
    try {
      // Search players, matches, and teams in parallel
      const [playersResponse, matchesResponse, teamsResponse] = await Promise.allSettled([
        PlayersService.listPlayers({ search: query, limit: 5 }),
        MatchesService.getAllMatches({ search: query, limit: 5 }),
        TeamsService.getAllTeams({ search: query, limit: 5 })
      ]);

      // Handle players response
      if (playersResponse.status === 'fulfilled') {
        setPlayerResults(playersResponse.value?.players || []);
      } else {
        setPlayerResults([]);
      }

      // Handle matches response
      if (matchesResponse.status === 'fulfilled') {
        setMatchResults((matchesResponse.value?.matches || []).slice(0, 5));
      } else {
        setMatchResults([]);
      }

      // Handle teams response
      if (teamsResponse.status === 'fulfilled') {
        setTeamResults((teamsResponse.value?.teams || []).slice(0, 5));
      } else {
        setTeamResults([]);
      }
    } catch (error) {
      setPlayerResults([]);
      setMatchResults([]);
      setTeamResults([]);
      } finally {
        setSearching(false);
      }
  };

  // Handle Enter key press
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
    setSearchQuery('');
    setPlayerResults([]);
    setMatchResults([]);
    setTeamResults([]);
    setHasSearched(false);
  };

  // Helper functions
  const getMatchMinute = (match) => {
    if (!match || match.status !== 'IN_PLAY') return null;
    // Calculate approximate minute based on start time if available
    const startTime = match.startTime ? new Date(match.startTime) : null;
    if (startTime) {
      const now = new Date();
      const diffMs = now - startTime;
      const diffMins = Math.floor(diffMs / 60000);
      return Math.min(diffMins, 90);
    }
    return match.minute || '—';
  };

  const isMatchLive = (match) => {
    return match?.status === 'IN_PLAY' || match?.status === 'PAUSED' || match?.status === 'HALFTIME';
  };

  return (
    <div className="space-y-16 pb-6">
      {/* Hero */}
      <section className="mt-6 space-y-8">
        {/* Main Hero Block */}
        <article className="soccer-patterned p-8 md:p-12 lg:p-20 text-white relative rounded-[32px] min-h-[calc(100vh-200px)] flex items-center overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Floating particles */}
            <div className="absolute w-2 h-2 bg-cyan-400/30 rounded-full top-1/4 left-1/4 animate-float-slow"></div>
            <div className="absolute w-1 h-1 bg-blue-400/40 rounded-full top-1/3 right-1/3 animate-float-medium"></div>
            <div className="absolute w-3 h-3 bg-yellow-400/20 rounded-full bottom-1/4 left-1/3 animate-float-fast"></div>
            <div className="absolute w-1.5 h-1.5 bg-green-400/30 rounded-full top-2/3 right-1/4 animate-float-slow"></div>
            
            {/* Animated gradient orbs */}
            <div className="absolute w-96 h-96 bg-gradient-to-r from-cyan-500/10 to-blue-600/10 rounded-full -top-48 -left-48 animate-pulse-slow blur-xl"></div>
            <div className="absolute w-80 h-80 bg-gradient-to-r from-green-500/10 to-yellow-500/10 rounded-full -bottom-40 -right-40 animate-pulse-medium blur-xl"></div>
            
            {/* Grid pattern overlay */}
            <div className="absolute inset-0 opacity-10" 
                 style={{
                   backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                                   linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                   backgroundSize: '50px 50px'
                 }}>
            </div>
          </div>

          {/* Shooting stars */}
          <div className="shooting-star"></div>
          <div className="shooting-star"></div>
          <div className="shooting-star"></div>
          
          <div className="relative w-full space-y-10 z-10">
            {/* Top Section */}
            <div className="space-y-8 max-w-5xl">
              <div className="flex items-center gap-4">
                <img
                  src={uefaWordmark}
                  alt="Logo chữ Cúp C1 châu Âu"
                  className="h-12 md:h-14 w-auto drop-shadow-2xl opacity-90"
                  loading="lazy"
                />
                <span className="text-[10px] uppercase tracking-[0.4em] text-cyan-300/60 font-semibold bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
                  Official digital experience
                </span>
              </div>
              
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.5em] text-cyan-300 font-bold flex items-center gap-2 animate-pulse">
                  <span className="w-8 h-[2px] bg-gradient-to-r from-cyan-300 via-blue-400 to-transparent animate-shimmer"></span>
                  European Nights
                  <span className="w-2 h-2 rounded-full bg-cyan-300 animate-ping"></span>
                </p>
                
                <h1 className="text-4xl md:text-5xl lg:text-7xl font-black leading-[1.1] tracking-tight relative">
                  {/* Revised Title with Brighter Colors and Two Lines */}
                  <span className="block mb-4">
                    <span
                      className="block text-xl md:text-2xl lg:text-3xl font-medium text-white/90 uppercase tracking-[0.15em]"
                      style={{
                        textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                        letterSpacing: '0.2em'
                      }}
                    >
                      Liên đoàn bóng đá châu Âu
                    </span>
                  </span>

                  <span className="block mt-2">
                    <span
                      className="inline-block font-black pb-1 relative leading-tight"
                      style={{
                        background: 'linear-gradient(135deg, #ffffff 0%, #f0fbff 25%, #c2e7ff 50%, #7bc8ff 75%, #3b82f6 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                        lineHeight: '1.2'
                      }}
                    >
                      Giải vô địch bóng đá KỶ NGUYÊN MỚI
                    </span>
                  </span>
                  
                </h1>

              </div>

              <div className="relative mt-6">
                <p className="text-base md:text-lg text-slate-200 max-w-2xl leading-relaxed font-light backdrop-blur-sm bg-black/10 p-4 rounded-2xl border border-white/10">
                  Mang bầu không khí <span className="text-cyan-300 font-semibold">bóng đá Việt Nam </span> sống động đến từng thiết bị – nơi mỗi trận đấu không chỉ là kết quả, mà là câu chuyện, ký ức và đam mê.
                </p>
              </div>

              <div className="flex flex-wrap gap-4 pt-4">
                <Link 
                  to="/match-center" 
                  className="group relative px-8 py-4 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 rounded-full font-bold text-white text-sm uppercase tracking-wider overflow-hidden transition-all hover:scale-110 hover:shadow-[0_0_60px_rgba(0,217,255,0.8),0_0_100px_rgba(99,102,241,0.5)]"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Play size={20} className="group-hover:scale-125 transition-transform drop-shadow-[0_0_10px_rgba(255,255,255,1)]" />
                    <span className="relative drop-shadow-[0_2px_4px rgba(0,0,0,0.5)]">
                      Xem trực tiếp
                    </span>
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  {/* Animated border */}
                  <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 animate-spin-slow" style={{ padding: '2px', mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'xor', WebkitMaskComposite: 'xor' }}></div>
                  </div>
                  
                  {/* Glowing corners */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/70 group-hover:border-white transition-colors"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/70 group-hover:border-white transition-colors"></div>
                  
                  {/* Glow effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute inset-0 bg-white/20 blur-xl"></div>
                  </div>
                </Link>
                
                <Link
                  to="/standings"
                  className="group relative px-8 py-4 bg-white/10 backdrop-blur-md border-2 border-cyan-400/40 rounded-full font-bold text-white text-sm uppercase tracking-wider hover:bg-white/20 hover:border-cyan-300 transition-all hover:scale-110 overflow-hidden hover:shadow-[0_0_40px rgba(0,217,255,0.6)]"
                >
                  <span className="relative z-10 drop-shadow-[0_2px_4px rgba(0,0,0,0.5)]">Xem bảng xếp hạng</span>
                  
                  {/* Animated gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  {/* Pulsing border effect */}
                  <div className="absolute inset-0 rounded-full border-2 border-transparent group-hover:border-cyan-300/50 group-hover:animate-pulse"></div>
                  
                  {/* Glowing corners */}
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400/0 group-hover:border-cyan-300 transition-colors"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400/0 group-hover:border-cyan-300 transition-colors"></div>
                </Link>
              </div>
            </div>

            {/* Enhanced Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
              {heroStats.map((stat, index) => {
                const IconComponent = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="relative group p-6 text-white hover:scale-110 transition-all duration-300 backdrop-blur-sm bg-black/10 rounded-2xl border border-white/10 hover:border-cyan-400/30 hover:bg-black/20"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {/* Hover glow effect */}
                    <div className="absolute inset-0 rounded-2xl bg-cyan-500/10 opacity-0 group-hover:opacity-100 blur-md transition-opacity"></div>
                    
                    <IconComponent size={28} className="mb-3 text-cyan-300 group-hover:scale-125 group-hover:text-cyan-200 transition-transform drop-shadow-[0_0_10px rgba(0,217,255,0.8)] relative z-10" />
                    <p className="text-4xl md:text-5xl font-black text-3d mb-1 relative z-10" style={{
                      background: 'linear-gradient(135deg, #ffffff 0%, #00d9ff 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}>{stat.value}</p>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-200/80 font-bold relative z-10">{stat.label}</p>
                    
                    {/* Animated corner accents */}
                    <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-400/50 rounded-tl-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-cyan-400/50 rounded-br-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                );
              })}
            </div>

            {/* Enhanced Info Cards */}
            <div className="grid md:grid-cols-3 gap-4 pt-6">
              <div className="p-5 transition-all group hover:scale-105 backdrop-blur-sm bg-black/10 rounded-2xl border border-white/10 hover:border-green-400/30 relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform bg-green-500/20">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px rgba(74,222,128,0.6)]"></div>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-green-300 font-bold drop-shadow-[0_2px_4px rgba(0,0,0,0.8)]">Đang diễn ra</span>
                </div>
                <p className="text-xl font-bold text-white mb-0.5 text-3d">
                  {loading ? '—' : liveMatches.length > 0 ? `${liveMatches.length} trận` : 'Không có'}
                </p>
                <p className="text-xs text-slate-300">
                  {liveMatches.length > 0 ? 'Đang thi đấu' : 'Hiện tại không có trận nào'}
                </p>
                
                {/* Live pulse effect */}
                {liveMatches.length > 0 && (
                <div className="absolute top-4 right-4 w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                )}
              </div>

              <div className="p-5 transition-all group hover:scale-105 backdrop-blur-sm bg-black/10 rounded-2xl border border-white/10 hover:border-blue-400/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform bg-blue-500/20">
                    <CalendarDays size={18} className="text-blue-400 drop-shadow-[0_0_10px rgba(59,130,246,0.8)]" />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-blue-300 font-bold drop-shadow-[0_2px_4px rgba(0,0,0,0.8)]">Trận kế tiếp</span>
                </div>
                <p className="text-xl font-bold text-white mb-0.5 text-3d">
                  {loading ? '—' : nextMatch ? formatNextMatchTime(nextMatch) : 'Chưa có lịch'}
                </p>
                <p className="text-xs text-slate-300">
                  {nextMatch ? `${nextMatch.homeTeamName || nextMatch.homeTeamTla} vs ${nextMatch.awayTeamName || nextMatch.awayTeamTla}` : 'Không có trận sắp tới'}
                </p>
              </div>

              <div className="p-5 transition-all group hover:scale-105 backdrop-blur-sm bg-black/10 rounded-2xl border border-white/10 hover:border-yellow-400/30 relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform bg-yellow-500/20">
                    <Trophy size={18} className="text-yellow-400 drop-shadow-[0_0_10px rgba(251,191,36,0.8)]" />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-yellow-300 font-bold drop-shadow-[0_2px_4px rgba(0,0,0,0.8)]">Vua phá lưới</span>
                </div>
                <p className="text-xl font-bold text-white mb-0.5 text-3d-gold">
                  {loading ? '—' : topScorer?.name || 'Chưa có dữ liệu'}
                </p>
                <p className="text-xs text-slate-300">
                  {topScorer ? `${topScorer.goals || 0} bàn mùa này` : 'Chưa có thống kê'}
                </p>
                
                {/* Crown icon for top scorer */}
                {topScorer && <Star size={12} className="absolute top-4 right-4 text-yellow-400 animate-pulse" />}
              </div>
            </div>

            {/* Enhanced Scroll Indicator */}
            <div className="flex justify-center pt-8">
              <div className="flex flex-col items-center gap-2 animate-bounce opacity-60 hover:opacity-100 transition-opacity group cursor-pointer">
                <span className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70 font-semibold group-hover:text-cyan-300 transition-colors">Cuộn để khám phá</span>
                <div className="w-5 h-8 border-2 border-cyan-400/40 rounded-full flex items-start justify-center p-1.5 group-hover:border-cyan-300 transition-colors">
                  <div className="w-1 h-2 bg-cyan-400/60 rounded-full animate-pulse group-hover:bg-cyan-300"></div>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* ========== TROPHY SHOWCASE SECTION ========== */}
        <section className="relative mt-16 mb-8">
          <div className="rounded-[32px] overflow-hidden relative group">
            {/* Trophy Image as Background */}
            <div className="absolute inset-0">
              <img 
                src={trophyImage} 
                alt="UEFA Champions League Trophy" 
                className="w-full h-full object-cover object-center scale-105 group-hover:scale-110 transition-transform duration-700"
              />
              {/* Overlay gradient for text readability */}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/80 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-slate-900/30" />
            </div>

            {/* Content */}
            <div className="relative z-10 p-8 md:p-12 lg:p-16 min-h-[400px] md:min-h-[500px] flex items-center">
              <div className="max-w-xl space-y-6">
                <div>
                  <span className="inline-flex items-center gap-2 text-amber-400 text-xs uppercase tracking-[0.3em] font-bold mb-4">
                    <Award size={14} />
                    Chiếc cúp danh giá
                  </span>
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight mb-4">
                    <span className="bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent drop-shadow-lg">
                      "Big Ears"
                    </span>
                    <br />
                    <span className="text-white text-2xl md:text-3xl lg:text-4xl font-bold drop-shadow-lg">
                      Biểu tượng của vinh quang
                    </span>
                  </h2>
                  <p className="text-white/80 text-sm md:text-base leading-relaxed backdrop-blur-sm bg-black/20 p-4 rounded-xl border border-white/10">
                    Chiếc cúp KỶ NGUYÊN MỚI, được gọi thân thương là "Big Ears" với hai quai cầm đặc trưng, 
                    là giấc mơ của mọi câu lạc bộ bóng đá. Cao 73.5cm và nặng 7.5kg bạc nguyên chất, 
                    đây là biểu tượng tối cao của bóng đá câu lạc bộ .
                  </p>
                </div>

                {/* Trophy Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl backdrop-blur-md bg-black/30 border border-white/10 text-center hover:bg-black/40 hover:border-amber-500/30 transition-all">
                    <p className="text-2xl md:text-3xl font-black text-amber-400 mb-1">
                      1955
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Khởi đầu</p>
                  </div>
                  <div className="p-4 rounded-2xl backdrop-blur-md bg-black/30 border border-white/10 text-center hover:bg-black/40 hover:border-amber-500/30 transition-all">
                    <p className="text-2xl md:text-3xl font-black text-amber-400 mb-1">
                      15
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Real Madrid</p>
                  </div>
                  <div className="p-4 rounded-2xl backdrop-blur-md bg-black/30 border border-white/10 text-center hover:bg-black/40 hover:border-amber-500/30 transition-all">
                    <p className="text-2xl md:text-3xl font-black text-amber-400 mb-1">
                      7.5kg
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Trọng lượng</p>
                  </div>
                </div>

                {/* CTA Button */}
                <Link 
                  to="/history" 
                  className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-900 font-bold text-sm hover:from-amber-400 hover:to-yellow-400 transition-all shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-105 group/btn"
                >
                  <History size={18} />
                  <span>Khám phá lịch sử</span>
                  <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Decorative border glow */}
            <div className="absolute inset-0 rounded-[32px] border border-amber-500/20 pointer-events-none" />
          </div>
        </section>

        {/* ========== BENTO GRID - GLASSMORPHISM STYLE ========== */}
        <div className="grid grid-cols-12 gap-4 mt-12">
          
          {/* Featured Match - Large Card */}
          <div className="col-span-12 lg:col-span-5 row-span-2 rounded-[28px] p-8 relative overflow-hidden backdrop-blur-xl bg-white/[0.08] border border-white/[0.15] shadow-[0_8px_32px_rgba(0,0,0,0.3)] group hover:bg-white/[0.12] transition-all duration-500">
            {/* Inner glow */}
            <div className={`absolute inset-0 bg-gradient-to-br ${isMatchLive(featuredMatch) ? 'from-red-500/10' : 'from-blue-500/10'} via-transparent to-orange-500/5 opacity-60`} />
            
            <div className="relative z-10">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="w-8 h-8 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin" />
                </div>
              ) : featuredMatch ? (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      {isMatchLive(featuredMatch) ? (
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
                      ) : (
                        <Clock size={14} className="text-cyan-300" />
                      )}
                      <span className="text-[11px] uppercase tracking-[0.25em] text-white/90 font-bold">Trận Tâm Điểm</span>
                    </div>
                    {isMatchLive(featuredMatch) ? (
                      <span className="px-3 py-1.5 bg-red-500/90 text-white text-xs font-bold rounded-full shadow-lg backdrop-blur-sm animate-pulse">
                        LIVE {getMatchMinute(featuredMatch)}'
                      </span>
                    ) : featuredMatch.status === 'FINISHED' ? (
                      <span className="px-3 py-1.5 bg-white/20 text-white text-xs font-bold rounded-full">
                        KẾT THÚC
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 bg-cyan-500/80 text-white text-xs font-bold rounded-full">
                        {new Date(featuredMatch.utcDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                      </span>
                    )}
                  </div>

                  {/* Match Content */}
                  <div className="space-y-6">
                    {/* Home Team */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 overflow-hidden">
                          {featuredMatch.homeTeamLogo ? (
                            <img src={featuredMatch.homeTeamLogo} alt="" className="w-10 h-10 object-contain" />
                          ) : (
                            <Shield size={28} className="text-white/80" />
                          )}
                        </div>
                        <div>
                          <p className="text-xl font-bold text-white">{featuredMatch.homeTeamName || 'Đội nhà'}</p>
                          <p className="text-xs text-white/50 uppercase tracking-wider">Nhà</p>
                        </div>
                      </div>
                      <p className="text-5xl font-black text-white">
                        {featuredMatch.scoreHome ?? '-'}
                      </p>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                      <span className="text-white/30 text-sm font-medium">VS</span>
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    </div>

                    {/* Away Team */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 overflow-hidden">
                          {featuredMatch.awayTeamLogo ? (
                            <img src={featuredMatch.awayTeamLogo} alt="" className="w-10 h-10 object-contain" />
                          ) : (
                            <Shield size={28} className="text-yellow-400/80" />
                          )}
                        </div>
                        <div>
                          <p className="text-xl font-bold text-white">{featuredMatch.awayTeamName || 'Đội khách'}</p>
                          <p className="text-xs text-white/50 uppercase tracking-wider">Khách</p>
                        </div>
                      </div>
                      <p className="text-5xl font-black text-white">
                        {featuredMatch.scoreAway ?? '-'}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/50 text-sm">
                      <CalendarDays size={14} />
                      <span>{featuredMatch.venue || toCompetitionStageLabel(featuredMatch.stage || featuredMatch.groupName)}</span>
                    </div>
                    <Link to="/matches" className="text-cyan-300 hover:text-cyan-200 text-sm font-semibold flex items-center gap-1 transition-colors">
                      Chi tiết <ArrowRight size={14} />
                    </Link>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-64 text-white/40">
                  Chưa có trận đấu
                </div>
              )}
                </div>
              </div>

          {/* Quick Stats - Small Cards Grid */}
          <div className="col-span-6 lg:col-span-3 rounded-[28px] p-6 relative overflow-hidden backdrop-blur-xl bg-white/[0.06] border border-white/[0.12] group hover:bg-white/[0.1] transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-50" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 backdrop-blur-md flex items-center justify-center mb-4 border border-emerald-400/30">
                <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
              </div>
              <p className="text-4xl font-black text-white mb-1">
                {loading ? '—' : liveMatches.length}
              </p>
              <p className="text-xs uppercase tracking-[0.2em] text-white/60 font-semibold">Đang Diễn Ra</p>
            </div>
          </div>

          <div className="col-span-6 lg:col-span-4 rounded-[28px] p-6 relative overflow-hidden backdrop-blur-xl bg-white/[0.06] border border-white/[0.12] group hover:bg-white/[0.1] transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-50" />
            <div className="relative z-10 flex items-center justify-between h-full">
              {loading ? (
                <div className="flex items-center justify-center w-full">
                  <div className="w-6 h-6 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                </div>
              ) : topScorer ? (
                <>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-amber-300/80 font-semibold mb-2">Vua Phá Lưới</p>
                    <p className="text-xl font-bold text-white mb-1">{topScorer.name}</p>
                    <p className="text-sm text-white/50">{topScorer.teamName || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-black text-amber-300">
                      {topScorer.goals || 0}
                    </p>
                    <p className="text-xs text-white/50 uppercase tracking-wider">Bàn</p>
                  </div>
                </>
              ) : (
                <div className="text-center w-full">
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-300/80 font-semibold mb-2">Vua Phá Lưới</p>
                  <p className="text-white/40">Đang cập nhật...</p>
                </div>
              )}
            </div>
          </div>

          {/* Fixtures Card */}
          <Link to="/matches" className="col-span-12 lg:col-span-3 row-span-1 rounded-[28px] p-6 relative overflow-hidden backdrop-blur-xl bg-white/[0.06] border border-white/[0.12] group hover:bg-white/[0.1] hover:border-cyan-400/30 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 opacity-50" />
            <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <CalendarDays size={64} className="text-cyan-300" />
            </div>
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/80 font-semibold mb-2">Khám Phá</p>
                <p className="text-2xl font-bold text-white mb-2">Lịch Thi Đấu</p>
                <p className="text-sm text-white/60">Xem toàn bộ lịch theo vòng đấu, ngày hoặc CLB</p>
              </div>
              <div className="flex items-center gap-2 text-cyan-300 font-semibold text-sm mt-4 group-hover:gap-3 transition-all">
                Xem ngay <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Standings Card */}
          <Link to="/standings" className="col-span-12 lg:col-span-4 rounded-[28px] p-6 relative overflow-hidden backdrop-blur-xl bg-white/[0.06] border border-white/[0.12] group hover:bg-white/[0.1] hover:border-purple-400/30 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-indigo-500/5 opacity-50" />
            <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Trophy size={64} className="text-purple-300" />
            </div>
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-purple-300/80 font-semibold mb-2">Khám Phá</p>
                <p className="text-2xl font-bold text-white mb-2">Bảng Xếp Hạng</p>
                <p className="text-sm text-white/60">Bảng điểm trực tiếp với khu vực giành vé, play-off</p>
              </div>
              <div className="flex items-center gap-2 text-purple-300 font-semibold text-sm mt-4 group-hover:gap-3 transition-all">
                Xem ngay <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
              </Link>

        </div>
      </section>

      {/* ========== SEARCH SECTION - GLASSMORPHISM ========== */}
      <section className="rounded-[32px] p-8 relative overflow-hidden backdrop-blur-xl bg-white/[0.05] border border-white/[0.1] shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
        {/* Background Accent */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 opacity-60" />
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
          <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Tìm Kiếm Nhanh
              </h2>
              <p className="text-white/50 text-sm">
                Tìm kiếm CLB, cầu thủ & lịch thi đấu với dữ liệu trực tiếp
            </p>
          </div>
            <div className="relative w-full md:w-[420px] flex gap-2">
              <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Nhập từ khóa và bấm tìm kiếm..."
                  className="w-full rounded-2xl bg-white/[0.08] backdrop-blur-md border border-white/[0.15] text-white px-6 py-4 pr-12 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400/40 placeholder:text-white/40 transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                    title="Xóa"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                )}
              </div>
              <button
                onClick={handleSearch}
                disabled={searching || searchTerm.trim().length < 2}
                className="px-5 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/25"
                title="Tìm kiếm"
              >
                {searching ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                )}
                <span className="hidden md:inline">Tìm</span>
              </button>
            </div>
        </div>

          {/* Search Results - Show after user clicks search */}
          {hasSearched && (
            <div className="grid md:grid-cols-3 gap-6">
              {/* Players Results */}
              <div className="rounded-2xl p-6 backdrop-blur-md bg-white/[0.04] border border-white/[0.1]">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                    <Users size={16} className="text-cyan-300" />
                  </div>
                  <h3 className="text-white/90 text-sm uppercase tracking-[0.2em] font-bold">Cầu Thủ</h3>
                  {searching && (
                    <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin ml-auto" />
                  )}
                </div>
                {searching ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-white/40 text-sm">Đang tìm kiếm...</div>
                  </div>
                ) : playerResults.length > 0 ? (
              <ul className="space-y-3">
                {playerResults.map((player) => (
                      <li key={player.id}>
                        <Link 
                          to={`/players/${player.id}`}
                          className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] hover:border-cyan-400/30 transition-all cursor-pointer group"
                        >
                    <div>
                            <div className="font-semibold text-white group-hover:text-cyan-300 transition-colors">{player.name}</div>
                            <div className="text-xs text-white/50 mt-0.5">
                        {player.teamName} · {toPlayerPositionLabel(player.position)}
                      </div>
                    </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right text-xs text-white/40">
                              #{player.shirtNumber ?? '—'}
                              <div className="text-white/30">{toCountryLabel(player.nationality)}</div>
                            </div>
                            <ArrowRight size={14} className="text-white/20 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                    </div>
                        </Link>
                  </li>
                ))}
              </ul>
                ) : (
                  <div className="text-white/40 text-sm text-center py-4">
                    Không tìm thấy cầu thủ với từ khóa "{searchQuery}"
                  </div>
              )}
            </div>

              {/* Matches Results */}
              <div className="rounded-2xl p-6 backdrop-blur-md bg-white/[0.04] border border-white/[0.1]">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <CalendarDays size={16} className="text-purple-300" />
                  </div>
                  <h3 className="text-white/90 text-sm uppercase tracking-[0.2em] font-bold">Trận Đấu</h3>
                  {searching && (
                    <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin ml-auto" />
                  )}
                </div>
                {searching ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-white/40 text-sm">Đang tìm kiếm...</div>
                  </div>
                ) : matchResults.length > 0 ? (
              <ul className="space-y-3">
                {matchResults.map((match) => (
                      <li key={match.id}>
                        <Link 
                          to={`/matches?search=${encodeURIComponent(match.homeTeamName || match.homeTeamTla || '')}`}
                          className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] hover:border-purple-400/30 transition-all cursor-pointer group"
                        >
                    <div>
                            <div className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                              {match.homeTeamName} <span className="text-white/40 mx-1">vs</span> {match.awayTeamName}
                            </div>
                            <div className="text-xs text-white/50 mt-0.5">
                              {new Date(match.utcDate).toLocaleDateString('vi-VN')} · {toCompetitionStageLabel(match.stage || match.groupName || 'Vòng bảng')}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              match.status === 'FINISHED' ? 'bg-white/10 text-white/60' :
                              match.status === 'IN_PLAY' ? 'bg-red-500/20 text-red-300' :
                              'bg-cyan-500/20 text-cyan-300'
                            }`}>
                              {toMatchStatusLabel(match.status)}
                            </span>
                            <ArrowRight size={14} className="text-white/20 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-white/40 text-sm text-center py-4">
                    Không tìm thấy trận đấu với từ khóa "{searchQuery}"
                  </div>
                )}
              </div>

              {/* Teams Results */}
              <div className="rounded-2xl p-6 backdrop-blur-md bg-white/[0.04] border border-white/[0.1]">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <Shield size={16} className="text-green-300" />
                  </div>
                  <h3 className="text-white/90 text-sm uppercase tracking-[0.2em] font-bold">Câu Lạc Bộ</h3>
                  {searching && (
                    <div className="w-4 h-4 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin ml-auto" />
                  )}
                </div>
                {searching ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-white/40 text-sm">Đang tìm kiếm...</div>
                  </div>
                ) : teamResults.length > 0 ? (
                  <ul className="space-y-3">
                    {teamResults.map((team) => (
                      <li key={team.id}>
                        <Link 
                          to={`/teams/${team.id}`}
                          className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] hover:border-green-400/30 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            {(team.logo || team.crest || team.logoUrl) ? (
                              <img 
                                src={team.logo || team.crest || team.logoUrl} 
                                alt={team.name} 
                                className="w-8 h-8 object-contain"
                                onError={(e) => { e.target.style.display = 'none' }}
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                <Shield size={14} className="text-white/40" />
                      </div>
                            )}
                            <div>
                              <div className="font-semibold text-white group-hover:text-green-300 transition-colors">{team.name}</div>
                              <div className="text-xs text-white/50 mt-0.5">
                                {team.short_name || team.shortName || team.tla || team.code} · {toCountryLabel(team.country)}
                      </div>
                    </div>
                    </div>
                          <ArrowRight size={14} className="text-white/20 group-hover:text-green-400 group-hover:translate-x-1 transition-all" />
                        </Link>
                  </li>
                ))}
              </ul>
                ) : (
                  <div className="text-white/40 text-sm text-center py-4">
                    Không tìm thấy CLB với từ khóa "{searchQuery}"
                  </div>
              )}
            </div>
          </div>
        )}
        </div>
      </section>

      {/* ========== OFFICIAL MATCH BALL SECTION ========== */}
      <section className="relative rounded-[32px] overflow-hidden backdrop-blur-xl bg-white/[0.03] border border-white/[0.1]">
        <div className="relative grid lg:grid-cols-2 gap-8 p-8 md:p-12">
          {/* Left - Ball Image */}
          <div className="relative flex items-center justify-center min-h-[350px]">
            {/* Glow Effect */}
            <div className="absolute w-[200px] h-[200px] rounded-full bg-rose-500/25 blur-[60px] animate-pulse" />
            <div className="absolute w-[150px] h-[150px] rounded-full bg-amber-500/15 blur-[40px] animate-pulse" style={{ animationDelay: '0.5s' }} />
            
            {/* Ball Container with animations */}
            <div 
              className="relative z-10"
              style={{ animation: 'float 4s ease-in-out infinite' }}
            >
              {/* Ball Image */}
              <img 
                src={footballImage} 
                alt="Official Match Ball" 
                className="w-[250px] md:w-[300px] h-auto object-contain drop-shadow-[0_20px_40px_rgba(239,68,68,0.4)] hover:scale-110 transition-transform duration-500"
                style={{ 
                  filter: 'brightness(1.1) contrast(1.05)',
                  animation: 'bounce-rotate 6s ease-in-out infinite',
                }}
              />
              
              {/* Shadow beneath ball */}
              <div 
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[50%] h-3 bg-black/20 rounded-full blur-sm"
                style={{ animation: 'pulse 4s ease-in-out infinite' }}
              />
              
              {/* Rotating ring effects */}
              <div 
                className="absolute rounded-full border-2 border-dashed border-rose-400/30 pointer-events-none"
                style={{ 
                  animation: 'spin 20s linear infinite',
                  width: '120%',
                  height: '120%',
                  top: '-10%',
                  left: '-10%'
                }}
              />
              <div 
                className="absolute rounded-full border border-cyan-400/20 pointer-events-none"
                style={{ 
                  animation: 'spin 30s linear infinite reverse',
                  width: '140%',
                  height: '140%',
                  top: '-20%',
                  left: '-20%'
                }}
              />
            </div>
          </div>

          {/* Right - Content */}
          <div className="flex flex-col justify-center space-y-6">
            {/* Badge */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/10 border border-rose-400/20 backdrop-blur-sm">
                <Zap size={14} className="text-rose-400" />
                <span className="text-rose-300 text-xs uppercase tracking-[0.2em] font-bold">Official Match Ball</span>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-300 via-white to-rose-300">
                ADIDAS UCL
              </span>
              <br />
              <span className="text-white/90">PRO 2024/25</span>
            </h2>

            {/* Description */}
            <p className="text-white/70 text-lg leading-relaxed max-w-lg">
              Quả bóng chính thức của UEFA Champions League mùa giải 2024/25. 
              Thiết kế độc đáo với họa tiết <span className="text-rose-400 font-semibold">ngôi sao</span> biểu tượng 
              và công nghệ <span className="text-cyan-400 font-semibold">Connected Ball</span>.
            </p>

            {/* Specs */}
            <div className="flex flex-wrap gap-4">
              <div className="px-5 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <p className="text-rose-400 font-bold text-lg">68-70 cm</p>
                <p className="text-white/50 text-xs">Chu vi</p>
              </div>
              <div className="px-5 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <p className="text-cyan-400 font-bold text-lg">420-445g</p>
                <p className="text-white/50 text-xs">Trọng lượng</p>
              </div>
              <div className="px-5 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <p className="text-amber-400 font-bold text-lg">FIFA Pro</p>
                <p className="text-white/50 text-xs">Chứng nhận</p>
              </div>
            </div>

            {/* CTA */}
            <Link 
              to="/match-center" 
              className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-bold hover:from-rose-400 hover:to-rose-500 transition-all shadow-lg shadow-rose-500/30 w-fit group"
            >
              <Play size={20} />
              Xem trận đấu trực tiếp
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ========== QUICK LINKS - GLASSMORPHISM ========== */}
      <section className="grid md:grid-cols-3 gap-6">
        {[
          {
            title: 'Đội Bóng',
            description: 'Khám phá 36 CLB hàng đầu châu Âu với thông tin chi tiết',
            to: '/teams',
            icon: Users,
            gradient: 'from-blue-500/20 to-cyan-500/10',
            iconColor: 'text-cyan-300',
            accentColor: 'cyan'
          },
          {
            title: 'Thống Kê',
            description: 'Số liệu chi tiết về bàn thắng, kiến tạo, thẻ phạt',
            to: '/stats',
            icon: Activity,
            gradient: 'from-emerald-500/20 to-teal-500/10',
            iconColor: 'text-emerald-300',
            accentColor: 'emerald'
          },
          {
            title: 'Tin Tức',
            description: 'Cập nhật mới nhất từ giải đấu danh giá nhất châu Âu',
            to: '/news',
            icon: Star,
            gradient: 'from-amber-500/20 to-orange-500/10',
            iconColor: 'text-amber-300',
            accentColor: 'amber'
          }
        ].map((item) => (
          <Link
            key={item.title}
            to={item.to}
            className="rounded-[28px] p-6 relative overflow-hidden backdrop-blur-xl bg-white/[0.05] border border-white/[0.1] group hover:bg-white/[0.08] hover:border-white/[0.2] transition-all duration-500"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-40`} />
            <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <item.icon size={56} className={item.iconColor} />
            </div>
            <div className="relative z-10">
              <div className={`w-12 h-12 rounded-2xl bg-${item.accentColor}-500/20 backdrop-blur-md flex items-center justify-center mb-4 border border-${item.accentColor}-400/30`}>
                <item.icon size={22} className={item.iconColor} />
              </div>
              <p className="text-xl font-bold text-white mb-2">{item.title}</p>
              <p className="text-sm text-white/50 mb-4">{item.description}</p>
              <div className={`flex items-center gap-2 text-${item.accentColor}-300 font-semibold text-sm group-hover:gap-3 transition-all`}>
                Khám phá <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        ))}
      </section>

      {/* ========== ĐỘI HÌNH TIÊU BIỂU - BEST XI ========== */}
      <BestXI />
    </div>
  );
};

export default HomePage;
