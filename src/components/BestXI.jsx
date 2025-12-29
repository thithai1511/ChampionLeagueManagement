import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Trophy, Star, Zap, Award, TrendingUp, ChevronDown } from 'lucide-react';
import StatsService from '../layers/application/services/StatsService';
import TeamsService from '../layers/application/services/TeamsService';
import { getAvatarWithFallback } from '../shared/utils/playerAvatar';

// Player Card Component - FIFA Style
const PlayerCard = ({ player, position, delay = 0 }) => {
  return (
    <div 
      className="player-card-container group cursor-pointer"
      style={{ 
        animation: `fadeInUp 0.6s ease-out ${delay}s both`,
        position: 'relative'
      }}
    >
      {/* Card Background with Gradient */}
      <div className="relative w-24 md:w-28 lg:w-32 mx-auto">
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/40 to-blue-600/40 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Main Card */}
        <div className="relative backdrop-blur-xl bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 rounded-2xl border-2 border-cyan-400/30 overflow-hidden group-hover:border-cyan-300 group-hover:scale-110 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          {/* Top Accent */}
          <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-cyan-500/30 via-blue-500/20 to-transparent" />
          
          {/* Rating Badge */}
          <div className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg z-10">
            <span className="text-xs font-black text-slate-900">{player.rating}</span>
          </div>
          
          {/* Position Badge */}
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm border border-cyan-400/50 z-10">
            <span className="text-[9px] font-bold text-cyan-300 uppercase tracking-wider">{position}</span>
          </div>

          {/* Player Avatar */}
          <div className="relative pt-6 px-3">
            <div className="w-16 h-16 md:w-20 md:h-20 mx-auto rounded-full overflow-hidden border-2 border-cyan-400/50 shadow-lg bg-gradient-to-br from-slate-700 to-slate-800">
              {player.avatar ? (
                <img 
                  src={player.avatar} 
                  alt={player.name || player.fullName || 'Player'}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  onError={(e) => {
                    console.warn('BestXI: Image failed to load for player:', player.name, 'URL:', player.avatar);
                    // Show fallback on error
                    e.target.style.display = 'none';
                    const fallback = e.target.nextElementSibling;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                  onLoad={() => {
                    console.log('BestXI: Image loaded successfully for player:', player.name, 'URL:', player.avatar?.substring(0, 50));
                  }}
                />
              ) : null}
              {/* Fallback - shown if no avatar or image fails to load */}
              <div 
                className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800 ${player.avatar ? 'hidden' : ''}`}
                style={{ display: player.avatar ? 'none' : 'flex' }}
              >
                <Star size={32} className="text-cyan-400/50" />
              </div>
            </div>
          </div>

          {/* Player Info */}
          <div className="relative px-2 py-3 text-center">
            {/* Name */}
            <h3 className="text-xs md:text-sm font-black text-white mb-1 truncate">
              {player.name}
            </h3>
            
            {/* Team & Number */}
            <div className="flex items-center justify-center gap-1.5 mb-2">
              {player.teamLogo && (
                <img src={player.teamLogo} alt={player.team} className="w-4 h-4 object-contain" />
              )}
              <p className="text-[10px] text-cyan-300 font-semibold">{player.team}</p>
              <span className="text-[10px] text-white/40">#{player.number}</span>
            </div>

            {/* Stats Row */}
            <div className="flex items-center justify-center gap-2 text-[9px] text-white/60">
              {player.goals > 0 && (
                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/10">
                  <Zap size={10} className="text-yellow-400" />
                  <span className="font-bold text-yellow-400">{player.goals}</span>
                </div>
              )}
              {player.assists > 0 && (
                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/10">
                  <TrendingUp size={10} className="text-green-400" />
                  <span className="font-bold text-green-400">{player.assists}</span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Accent Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 opacity-80 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Country Flag */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-4 rounded overflow-hidden border border-white/30 shadow-lg z-20">
          {player.flag ? (
            <img src={player.flag} alt={player.country} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-700" />
          )}
        </div>
      </div>
    </div>
  );
};

// Formation Layouts
const FORMATIONS = {
  '4-3-3': {
    name: '4-3-3',
    positions: {
      GK: [{ top: '85%', left: '50%' }],
      DEF: [
        { top: '65%', left: '15%' }, // LB
        { top: '70%', left: '37%' }, // CB
        { top: '70%', left: '63%' }, // CB
        { top: '65%', left: '85%' }  // RB
      ],
      MID: [
        { top: '45%', left: '25%' }, // LM
        { top: '50%', left: '50%' }, // CM
        { top: '45%', left: '75%' }  // RM
      ],
      FWD: [
        { top: '20%', left: '20%' }, // LW
        { top: '15%', left: '50%' }, // ST
        { top: '20%', left: '80%' }  // RW
      ]
    }
  },
  '4-2-3-1': {
    name: '4-2-3-1',
    positions: {
      GK: [{ top: '85%', left: '50%' }],
      DEF: [
        { top: '65%', left: '15%' },
        { top: '70%', left: '37%' },
        { top: '70%', left: '63%' },
        { top: '65%', left: '85%' }
      ],
      MID: [
        { top: '50%', left: '37%' }, // CDM
        { top: '50%', left: '63%' }, // CDM
        { top: '30%', left: '20%' }, // LM
        { top: '30%', left: '50%' }, // CAM
        { top: '30%', left: '80%' }  // RM
      ],
      FWD: [
        { top: '12%', left: '50%' }  // ST
      ]
    }
  },
  '3-5-2': {
    name: '3-5-2',
    positions: {
      GK: [{ top: '85%', left: '50%' }],
      DEF: [
        { top: '70%', left: '25%' }, // LCB
        { top: '75%', left: '50%' }, // CB
        { top: '70%', left: '75%' }  // RCB
      ],
      MID: [
        { top: '60%', left: '12%' }, // LWB
        { top: '45%', left: '32%' }, // LM
        { top: '50%', left: '50%' }, // CM
        { top: '45%', left: '68%' }, // RM
        { top: '60%', left: '88%' }  // RWB
      ],
      FWD: [
        { top: '18%', left: '37%' }, // ST
        { top: '18%', left: '63%' }  // ST
      ]
    }
  }
};

// Main Component
const BestXI = () => {
  const [selectedFormation, setSelectedFormation] = useState('4-3-3');
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [showFormationDropdown, setShowFormationDropdown] = useState(false);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allPlayers, setAllPlayers] = useState([]);
  const [playerAvatars, setPlayerAvatars] = useState({});

  // Fetch players from public API (StatsService)
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        
        // First get latest season from public endpoint
        const seasons = await TeamsService.getCompetitionSeasons();
        const latestSeason = seasons?.[0];
        
        if (!latestSeason?.season_id && !latestSeason?.id) {
          console.warn('No seasons found for BestXI');
          setAllPlayers([]);
          setLoading(false);
          return;
        }
        
        const seasonId = latestSeason.season_id ?? latestSeason.id;
        
        // Fetch top scorers from public stats endpoint
        const topScorers = await StatsService.getTopScorers(seasonId, 100);
        
        // Map to player format expected by BestXI
        const players = (topScorers || []).map(scorer => ({
          id: scorer.playerId || scorer.seasonPlayerId,
          name: scorer.playerName || scorer.name,
          fullName: scorer.playerName || scorer.name,
          position: scorer.position || 'Midfielder',
          nationality: scorer.nationality || '',
          teamName: scorer.teamName || scorer.team_name,
          goals: scorer.goals || 0,
          assists: scorer.assists || 0,
          avatar: scorer.avatar || null
        }));
        
        setAllPlayers(players);
      } catch (error) {
        console.error('Failed to fetch players:', error);
        setAllPlayers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  // Position mapping function
  const getPlayerRole = (position) => {
    if (!position) return 'MID';
    const pos = position.toUpperCase();
    if (pos === 'GOALKEEPER' || pos === 'GK') return 'GK';
    if (['DEFENDER', 'DEFENCE', 'DEF', 'LEFT_BACK', 'RIGHT_BACK', 'CENTRE_BACK', 'CB', 'LB', 'RB'].includes(pos)) return 'DEF';
    if (['MIDFIELDER', 'MIDFIELD', 'MID', 'ATTACKING_MIDFIELD', 'DEFENSIVE_MIDFIELD', 'CDM', 'CAM', 'CM', 'LM', 'RM'].includes(pos)) return 'MID';
    if (['ATTACKER', 'FORWARD', 'OFFENCE', 'FWD', 'STRIKER', 'WINGER', 'ST', 'LW', 'RW'].includes(pos)) return 'FWD';
    return 'MID';
  };

  // Calculate player rating (simplified)
  const calculateRating = (player) => {
    const goals = player.goals || 0;
    const assists = player.assists || 0;
    const baseRating = 75;
    const goalsBonus = goals * 2;
    const assistsBonus = assists * 1.5;
    return Math.min(99, Math.floor(baseRating + goalsBonus + assistsBonus));
  };

  // Select Best XI based on formation
  const selectBestXI = useMemo(() => {
    if (allPlayers.length === 0) return [];

    // Group players by role
    const playersByRole = {
      GK: [],
      DEF: [],
      MID: [],
      FWD: []
    };

    allPlayers.forEach(player => {
      const role = getPlayerRole(player.position);
      const rating = calculateRating(player);
      const playerId = player.id || player.player_id;
      const playerName = player.name || player.fullName || player.full_name || '';
      playersByRole[role].push({
        ...player,
        role,
        rating,
        teamLogo: player.teamLogoUrl || null,
        flag: player.nationalityFlag || null,
        team: player.teamName || 'N/A',
        number: player.shirtNumber || '—'
      });
    });

    // Sort each group by rating
    Object.keys(playersByRole).forEach(role => {
      playersByRole[role].sort((a, b) => {
        const ratingDiff = b.rating - a.rating;
        if (ratingDiff !== 0) return ratingDiff;
        return (b.goals || 0) - (a.goals || 0);
      });
    });

    // Formation requirements
    const formationNeeds = {
      '4-3-3': { GK: 1, DEF: 4, MID: 3, FWD: 3 },
      '4-2-3-1': { GK: 1, DEF: 4, MID: 5, FWD: 1 },
      '3-5-2': { GK: 1, DEF: 3, MID: 5, FWD: 2 }
    };

    const needs = formationNeeds[selectedFormation];
    const bestXI = [];

    // Select players for each position
    ['GK', 'DEF', 'MID', 'FWD'].forEach(role => {
      const needed = needs[role];
      const available = playersByRole[role];
      bestXI.push(...available.slice(0, needed));
    });

    return bestXI;
  }, [allPlayers, selectedFormation]);

  // Map positions for each formation
  const bestPlayers = useMemo(() => {
    if (selectBestXI.length === 0) return {};

    const result = {
      '4-3-3': [],
      '4-2-3-1': [],
      '3-5-2': []
    };

    // 4-3-3 formation
    result['4-3-3'] = [
      selectBestXI.find(p => p.role === 'GK') || null,
      ...selectBestXI.filter(p => p.role === 'DEF').slice(0, 4).map((p, i) => ({
        ...p,
        position: ['LB', 'CB', 'CB', 'RB'][i]
      })),
      ...selectBestXI.filter(p => p.role === 'MID').slice(0, 3).map((p, i) => ({
        ...p,
        position: ['LM', 'CM', 'RM'][i]
      })),
      ...selectBestXI.filter(p => p.role === 'FWD').slice(0, 3).map((p, i) => ({
        ...p,
        position: ['LW', 'ST', 'RW'][i]
      }))
    ].filter(Boolean);

    // 4-2-3-1 formation
    const defenders4231 = selectBestXI.filter(p => p.role === 'DEF').slice(0, 4);
    const midfielders4231 = selectBestXI.filter(p => p.role === 'MID').slice(0, 5);
    const forwards4231 = selectBestXI.filter(p => p.role === 'FWD').slice(0, 1);

    result['4-2-3-1'] = [
      selectBestXI.find(p => p.role === 'GK') || null,
      ...defenders4231.map((p, i) => ({ ...p, position: ['LB', 'CB', 'CB', 'RB'][i] })),
      ...midfielders4231.map((p, i) => ({ ...p, position: ['CDM', 'CDM', 'LM', 'CAM', 'RM'][i] })),
      ...forwards4231.map(p => ({ ...p, position: 'ST' }))
    ].filter(Boolean);

    // 3-5-2 formation
    const defenders352 = selectBestXI.filter(p => p.role === 'DEF').slice(0, 3);
    const midfielders352 = selectBestXI.filter(p => p.role === 'MID').slice(0, 5);
    const forwards352 = selectBestXI.filter(p => p.role === 'FWD').slice(0, 2);

    result['3-5-2'] = [
      selectBestXI.find(p => p.role === 'GK') || null,
      ...defenders352.map((p, i) => ({ ...p, position: ['LCB', 'CB', 'RCB'][i] })),
      ...midfielders352.map((p, i) => ({ ...p, position: ['LWB', 'LM', 'CM', 'RM', 'RWB'][i] })),
      ...forwards352.map(p => ({ ...p, position: 'ST' }))
    ].filter(Boolean);

    return result;
  }, [selectBestXI, selectedFormation]);

  const currentFormation = FORMATIONS[selectedFormation];
  const currentPlayers = bestPlayers[selectedFormation] || [];

  // Fetch avatars when currentPlayers change - FORCE TRIGGER
  const playerIdsString = currentPlayers.map(p => p.id || p.player_id).filter(Boolean).sort().join(',');
  
  useEffect(() => {
    if (!playerIdsString || currentPlayers.length === 0) return;
    
    const playerIds = playerIdsString.split(',').map(Number).filter(Boolean);
    const missingIds = playerIds.filter(id => !playerAvatars[id] && !playerAvatars[String(id)]);
    
    if (missingIds.length === 0) return;
    
    console.log('BestXI: Fetching', missingIds.length, 'avatars:', missingIds);
    
    (async () => {
      try {
        const { batchGetPlayerAvatars } = await import('../shared/utils/playerAvatar');
        const avatars = await batchGetPlayerAvatars(missingIds);
        console.log('BestXI: Received', Object.keys(avatars).length, 'avatars');
        if (Object.keys(avatars).length > 0) {
          setPlayerAvatars(prev => ({ ...prev, ...avatars }));
        }
      } catch (error) {
        console.error('BestXI: Error:', error.message);
      }
    })();
  }, [playerIdsString]);

  // Add avatars to current players
  const currentPlayersWithAvatars = useMemo(() => {
    return currentPlayers.map(player => {
      const playerId = player.id || player.player_id;
      const avatarUrl = playerAvatars[playerId] || playerAvatars[String(playerId)] || player.photoUrl || null;
      const playerName = player.name || player.fullName || player.full_name || '';
      return {
        ...player,
        avatar: getAvatarWithFallback(avatarUrl, playerName)
      };
    });
  }, [currentPlayers, playerAvatars]);
  
  // Debug: Log when playerAvatars changes
  useEffect(() => {
    console.log('BestXI: playerAvatars state changed:', Object.keys(playerAvatars).length, 'avatars');
  }, [playerAvatars]);

  // Calculate total stats
  const totalStats = useMemo(() => {
    if (!currentPlayersWithAvatars || currentPlayersWithAvatars.length === 0) {
      return { goals: 0, assists: 0, avgRating: 0 };
    }
    return currentPlayersWithAvatars.reduce((acc, player) => ({
      goals: acc.goals + (player.goals || 0),
      assists: acc.assists + (player.assists || 0),
      avgRating: acc.avgRating + (player.rating || 0)
    }), { goals: 0, assists: 0, avgRating: 0 });
  }, [currentPlayersWithAvatars]);

  // Get MVP (highest rated player)
  const mvp = useMemo(() => {
    if (!currentPlayersWithAvatars || currentPlayersWithAvatars.length === 0) return null;
    return currentPlayersWithAvatars.reduce((max, player) => 
      (player.rating || 0) > (max.rating || 0) ? player : max
    , currentPlayersWithAvatars[0]);
  }, [currentPlayersWithAvatars]);

  // Position players on field
  const positionedPlayers = useMemo(() => {
    if (!currentPlayersWithAvatars || currentPlayersWithAvatars.length === 0) return [];
    
    const result = [];
    let playerIndex = 0;

    ['GK', 'DEF', 'MID', 'FWD'].forEach(line => {
      currentFormation.positions[line]?.forEach((pos, idx) => {
        if (currentPlayersWithAvatars[playerIndex]) {
          result.push({
            ...currentPlayersWithAvatars[playerIndex],
            style: pos,
            delay: playerIndex * 0.08
          });
          playerIndex++;
        }
      });
    });

    return result;
  }, [currentFormation, currentPlayersWithAvatars]);

  return (
    <section className="relative rounded-[32px] overflow-hidden backdrop-blur-xl bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 border border-cyan-400/20 shadow-[0_0_80px_rgba(0,217,255,0.15)]">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-gradient-to-r from-cyan-500/10 to-blue-600/10 rounded-full -top-48 -right-48 animate-pulse-slow blur-3xl" />
        <div className="absolute w-80 h-80 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full -bottom-40 -left-40 animate-pulse-medium blur-3xl" />
        
        {/* Field Lines Pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `
            linear-gradient(rgba(0,217,255,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,217,255,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="relative z-10 p-6 md:p-10 lg:p-12">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-10">
          {/* Title */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Award size={22} className="text-slate-900" />
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-black text-white">
                  <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                    ĐỘI HÌNH TIÊU BIỂU
                  </span>
                </h2>
                <p className="text-sm text-cyan-300/80 font-semibold uppercase tracking-[0.15em]">
                  Team of The {selectedPeriod === 'week' ? 'Week' : selectedPeriod === 'month' ? 'Month' : 'Season'} · Powered by AI & Match Data
                </p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Period Selector */}
            <div className="relative">
              <button
                onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.08] backdrop-blur-md border border-cyan-400/30 text-white hover:bg-white/[0.12] hover:border-cyan-300 transition-all"
              >
                <Trophy size={16} className="text-cyan-400" />
                <span className="font-semibold text-sm">
                  {selectedPeriod === 'week' ? 'Tuần này' : selectedPeriod === 'month' ? 'Tháng này' : 'Mùa giải'}
                </span>
                <ChevronDown size={16} className={`transition-transform ${showPeriodDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showPeriodDropdown && (
                <div className="absolute top-full mt-2 right-0 w-48 rounded-xl bg-slate-800/95 backdrop-blur-xl border border-cyan-400/30 shadow-xl overflow-hidden z-50">
                  {['week', 'month', 'season'].map(period => (
                    <button
                      key={period}
                      onClick={() => { setSelectedPeriod(period); setShowPeriodDropdown(false); }}
                      className={`w-full px-4 py-3 text-left text-sm font-medium hover:bg-cyan-500/20 transition-colors ${
                        selectedPeriod === period ? 'bg-cyan-500/30 text-cyan-300' : 'text-white'
                      }`}
                    >
                      {period === 'week' ? '🏆 Tuần này' : period === 'month' ? '🎖️ Tháng này' : '👑 Mùa giải'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Formation Selector */}
            <div className="relative">
              <button
                onClick={() => setShowFormationDropdown(!showFormationDropdown)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.08] backdrop-blur-md border border-purple-400/30 text-white hover:bg-white/[0.12] hover:border-purple-300 transition-all"
              >
                <span className="font-black text-sm">
                  {currentFormation.name}
                </span>
                <ChevronDown size={16} className={`transition-transform ${showFormationDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showFormationDropdown && (
                <div className="absolute top-full mt-2 right-0 w-40 rounded-xl bg-slate-800/95 backdrop-blur-xl border border-purple-400/30 shadow-xl overflow-hidden z-50">
                  {Object.keys(FORMATIONS).map(formation => (
                    <button
                      key={formation}
                      onClick={() => { setSelectedFormation(formation); setShowFormationDropdown(false); }}
                      className={`w-full px-4 py-3 text-center font-black hover:bg-purple-500/20 transition-colors ${
                        selectedFormation === formation ? 'bg-purple-500/30 text-purple-300' : 'text-white'
                      }`}
                    >
                      {formation}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-[1fr_300px] gap-8">
          {/* Football Field */}
          <div className="relative rounded-3xl overflow-hidden" style={{
            background: `
              radial-gradient(ellipse at center, rgba(34, 197, 94, 0.15) 0%, rgba(16, 185, 129, 0.08) 50%, rgba(5, 150, 105, 0.05) 100%),
              linear-gradient(180deg, rgba(6, 95, 70, 0.3) 0%, rgba(4, 120, 87, 0.2) 100%)
            `,
            minHeight: '600px'
          }}>
            {/* Field Lines */}
            <div className="absolute inset-0" style={{
              backgroundImage: `
                linear-gradient(to bottom, transparent 0%, transparent 49.5%, rgba(255,255,255,0.15) 49.5%, rgba(255,255,255,0.15) 50.5%, transparent 50.5%, transparent 100%),
                linear-gradient(to right, transparent 0%, transparent 49.5%, rgba(255,255,255,0.08) 49.5%, rgba(255,255,255,0.08) 50.5%, transparent 50.5%, transparent 100%)
              `
            }}>
              {/* Center Circle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-2 border-white/15" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/20" />
              
              {/* Penalty Boxes */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-48 h-20 border-2 border-white/15 border-t-0 rounded-b-lg" />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-48 h-20 border-2 border-white/15 border-b-0 rounded-t-lg" />
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-white/60 text-sm">Đang tải đội hình xuất sắc nhất...</p>
                </div>
              </div>
            ) : currentPlayersWithAvatars.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Trophy size={48} className="text-white/20 mx-auto mb-4" />
                  <p className="text-white/60 text-sm">Chưa có dữ liệu cầu thủ</p>
                </div>
              </div>
            ) : (
              <>
                {/* Players Positioned */}
                <div className="absolute inset-0 p-8">
                  {positionedPlayers.map((player, index) => (
                    <div
                      key={player.id}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={{
                        top: player.style.top,
                        left: player.style.left
                      }}
                    >
                      <PlayerCard 
                        player={player} 
                        position={player.position}
                        delay={player.delay}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Spotlight Effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 pointer-events-none" />
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-4">
            {/* MVP Card */}
            {loading ? (
              <div className="rounded-2xl p-6 backdrop-blur-md bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent border border-amber-400/30">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-white/10 rounded w-24" />
                  <div className="h-16 bg-white/10 rounded" />
                </div>
              </div>
            ) : mvp ? (
              <div className="rounded-2xl p-6 backdrop-blur-md bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent border border-amber-400/30 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400/20 to-transparent rounded-full blur-2xl" />
                
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <Star size={18} className="text-amber-400" />
                    <span className="text-xs uppercase tracking-[0.2em] text-amber-300 font-bold">MVP của tuần</span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-amber-400/50 bg-slate-800">
                      {mvp.avatar ? (
                        <img src={mvp.avatar} alt={mvp.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Trophy size={28} className="text-amber-400/50" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-xl font-black text-white mb-1">
                        {mvp.name}
                      </h3>
                      <p className="text-sm text-amber-300/80 mb-2">{mvp.team}</p>
                      <div className="flex items-center gap-2">
                        <div className="px-3 py-1 rounded-lg bg-amber-400/20 border border-amber-400/30">
                          <span className="text-2xl font-black text-amber-400 font-numbers">{mvp.rating}</span>
                        </div>
                        <div className="text-xs text-white/60">
                          {mvp.goals || 0}G · {mvp.assists || 0}A
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl p-6 backdrop-blur-md bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent border border-amber-400/30">
                <p className="text-white/40 text-sm text-center">Chưa có MVP</p>
              </div>
            )}

            {/* Total Stats */}
            <div className="rounded-2xl p-6 backdrop-blur-md bg-white/[0.04] border border-white/[0.1]">
              <h3 className="text-sm uppercase tracking-[0.2em] text-cyan-300 font-bold mb-4">Thống kê tổng</h3>
              
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-white/[0.04] rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04]">
                    <div className="flex items-center gap-2">
                      <Zap size={16} className="text-yellow-400" />
                      <span className="text-sm text-white/80">Tổng bàn thắng</span>
                    </div>
                    <span className="text-2xl font-black text-yellow-400">{totalStats.goals}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04]">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={16} className="text-green-400" />
                      <span className="text-sm text-white/80">Tổng kiến tạo</span>
                    </div>
                    <span className="text-2xl font-black text-green-400">{totalStats.assists}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04]">
                    <div className="flex items-center gap-2">
                      <Award size={16} className="text-cyan-400" />
                      <span className="text-sm text-white/80">Điểm TB</span>
                    </div>
                    <span className="text-2xl font-black text-cyan-400">
                      {currentPlayersWithAvatars.length > 0 ? (totalStats.avgRating / currentPlayersWithAvatars.length).toFixed(1) : '0.0'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="rounded-2xl p-6 backdrop-blur-md bg-white/[0.04] border border-white/[0.1]">
              <h3 className="text-sm uppercase tracking-[0.2em] text-purple-300 font-bold mb-4">Chú thích</h3>
              
              <div className="space-y-2 text-xs text-white/60">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-amber-400" />
                  <span>Điểm đánh giá</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap size={12} className="text-yellow-400" />
                  <span>Bàn thắng</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp size={12} className="text-green-400" />
                  <span>Kiến tạo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        @keyframes pulse-medium {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }

        .animate-pulse-slow {
          animation: pulse-slow 6s ease-in-out infinite;
        }

        .animate-pulse-medium {
          animation: pulse-medium 4s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
};

export default BestXI;
