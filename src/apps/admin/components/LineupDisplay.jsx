import React from 'react';
import { Users, ShieldCheck, UserX, AlertCircle, Target } from 'lucide-react';

/**
 * LineupDisplay Component - Professional Football Match Lineup Display
 * Hiển thị đội hình ra sân chuyên nghiệp với sân bóng đẹp, vị trí chính xác
 * (Copy from public app for admin use)
 */

// Formation configurations with accurate positioning
const FORMATION_CONFIGS = {
  '4-4-2': {
    lines: [
      { name: 'GK', positions: [{ x: 50, y: 8 }] },
      { name: 'DEF', positions: [{ x: 15, y: 25 }, { x: 38, y: 25 }, { x: 62, y: 25 }, { x: 85, y: 25 }] },
      { name: 'MID', positions: [{ x: 15, y: 50 }, { x: 38, y: 50 }, { x: 62, y: 50 }, { x: 85, y: 50 }] },
      { name: 'FWD', positions: [{ x: 35, y: 75 }, { x: 65, y: 75 }] }
    ]
  },
  '4-3-3': {
    lines: [
      { name: 'GK', positions: [{ x: 50, y: 8 }] },
      { name: 'DEF', positions: [{ x: 15, y: 25 }, { x: 38, y: 25 }, { x: 62, y: 25 }, { x: 85, y: 25 }] },
      { name: 'MID', positions: [{ x: 25, y: 50 }, { x: 50, y: 50 }, { x: 75, y: 50 }] },
      { name: 'FWD', positions: [{ x: 20, y: 75 }, { x: 50, y: 80 }, { x: 80, y: 75 }] }
    ]
  },
  '4-2-3-1': {
    lines: [
      { name: 'GK', positions: [{ x: 50, y: 8 }] },
      { name: 'DEF', positions: [{ x: 15, y: 25 }, { x: 38, y: 25 }, { x: 62, y: 25 }, { x: 85, y: 25 }] },
      { name: 'CDM', positions: [{ x: 35, y: 42 }, { x: 65, y: 42 }] },
      { name: 'CAM', positions: [{ x: 20, y: 60 }, { x: 50, y: 60 }, { x: 80, y: 60 }] },
      { name: 'ST', positions: [{ x: 50, y: 80 }] }
    ]
  },
  '3-5-2': {
    lines: [
      { name: 'GK', positions: [{ x: 50, y: 8 }] },
      { name: 'DEF', positions: [{ x: 25, y: 25 }, { x: 50, y: 25 }, { x: 75, y: 25 }] },
      { name: 'MID', positions: [{ x: 10, y: 50 }, { x: 30, y: 50 }, { x: 50, y: 50 }, { x: 70, y: 50 }, { x: 90, y: 50 }] },
      { name: 'FWD', positions: [{ x: 35, y: 75 }, { x: 65, y: 75 }] }
    ]
  },
  '3-4-3': {
    lines: [
      { name: 'GK', positions: [{ x: 50, y: 8 }] },
      { name: 'DEF', positions: [{ x: 25, y: 25 }, { x: 50, y: 25 }, { x: 75, y: 25 }] },
      { name: 'MID', positions: [{ x: 20, y: 50 }, { x: 40, y: 50 }, { x: 60, y: 50 }, { x: 80, y: 50 }] },
      { name: 'FWD', positions: [{ x: 20, y: 75 }, { x: 50, y: 80 }, { x: 80, y: 75 }] }
    ]
  },
  '5-3-2': {
    lines: [
      { name: 'GK', positions: [{ x: 50, y: 8 }] },
      { name: 'DEF', positions: [{ x: 10, y: 25 }, { x: 30, y: 25 }, { x: 50, y: 25 }, { x: 70, y: 25 }, { x: 90, y: 25 }] },
      { name: 'MID', positions: [{ x: 25, y: 50 }, { x: 50, y: 50 }, { x: 75, y: 50 }] },
      { name: 'FWD', positions: [{ x: 35, y: 75 }, { x: 65, y: 75 }] }
    ]
  },
  '4-5-1': {
    lines: [
      { name: 'GK', positions: [{ x: 50, y: 8 }] },
      { name: 'DEF', positions: [{ x: 15, y: 25 }, { x: 38, y: 25 }, { x: 62, y: 25 }, { x: 85, y: 25 }] },
      { name: 'MID', positions: [{ x: 10, y: 50 }, { x: 30, y: 50 }, { x: 50, y: 50 }, { x: 70, y: 50 }, { x: 90, y: 50 }] },
      { name: 'FWD', positions: [{ x: 50, y: 78 }] }
    ]
  },
  '4-1-4-1': {
    lines: [
      { name: 'GK', positions: [{ x: 50, y: 8 }] },
      { name: 'DEF', positions: [{ x: 15, y: 25 }, { x: 38, y: 25 }, { x: 62, y: 25 }, { x: 85, y: 25 }] },
      { name: 'CDM', positions: [{ x: 50, y: 42 }] },
      { name: 'MID', positions: [{ x: 15, y: 60 }, { x: 38, y: 60 }, { x: 62, y: 60 }, { x: 85, y: 60 }] },
      { name: 'FWD', positions: [{ x: 50, y: 78 }] }
    ]
  }
};

const LineupDisplay = ({
  lineup,
  squad = [],
  teamName,
  teamColor = '#3b82f6',
  formation = '4-4-2'
}) => {
  // Handle both lineup format (public) and starters/substitutes format (admin)
  let starters = [];
  let substitutes = [];

  if (Array.isArray(lineup)) {
    // Public format: array with isStarting flag
    starters = lineup.filter(p => p.isStarting);
    substitutes = lineup.filter(p => !p.isStarting);
  } else if (lineup && lineup.starters) {
    // Admin format: object with starters array (IDs)
    const starterIds = lineup.starters || [];
    const subIds = lineup.substitutes || [];

    starters = squad.filter(p => starterIds.includes(p.id));
    substitutes = squad.filter(p => subIds.includes(p.id));
  }

  if (starters.length === 0 && substitutes.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <Users className="mx-auto mb-2" size={32} />
        <p className="text-sm">Chưa có đội hình</p>
      </div>
    );
  }

  // Get formation config or fallback to 4-4-2
  const formationConfig = FORMATION_CONFIGS[formation] || FORMATION_CONFIGS['4-4-2'];

  // Flatten positions for easier mapping
  const allPositions = formationConfig.lines.flatMap(line => line.positions);

  // Player Badge Component
  const PlayerBadge = ({ player, position, index }) => {
    const hasYellowCard = player.yellowCards > 0 || player.yellow_cards > 0;
    const hasRedCard = player.redCards > 0 || player.red_cards > 0;
    const hasGoal = player.goals > 0 || player.goalsScored > 0;
    const isCaptain = player.isCaptain || player.is_captain;
    const isInjured = player.status === 'injured';

    return (
      <div
        className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
        style={{
          left: `${position.x}%`,
          top: `${position.y}%`,
        }}
      >
        <div className="flex flex-col items-center animate-fadeIn">
          {/* Jersey Circle with Number */}
          <div className="relative mb-2">
            <div
              className="w-12 h-12 md:w-14 md:h-14 rounded-full shadow-xl flex items-center justify-center border-4 border-white/30 group-hover:scale-110 transition-all duration-300 group-hover:shadow-2xl"
              style={{
                backgroundColor: teamColor,
                boxShadow: `0 4px 20px ${teamColor}50, 0 0 0 3px white`
              }}
            >
              <span className="text-xl md:text-2xl font-black text-white drop-shadow-lg">
                {player.jerseyNumber || player.jersey_number || player.shirtNumber || player.shirt_number || '?'}
              </span>
            </div>

            {/* Captain Badge */}
            {isCaptain && (
              <div
                className="absolute -top-1 -right-1 w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center border-2 border-white shadow-lg"
                style={{ backgroundColor: '#fbbf24' }}
              >
                <span className="text-[10px] md:text-xs font-black text-white">C</span>
              </div>
            )}

            {/* Goal Icon */}
            {hasGoal && (
              <div className="absolute -top-2 -left-2 w-5 h-5 md:w-6 md:h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-bounce">
                <Target size={12} className="text-white md:w-3.5 md:h-3.5" />
              </div>
            )}
          </div>

          {/* Player Info Card */}
          <div
            className="bg-white/95 backdrop-blur-sm px-2 py-1 md:px-3 md:py-1.5 rounded-full shadow-lg border-2 min-w-[80px] md:min-w-[100px] max-w-[100px] md:max-w-[140px] group-hover:scale-105 transition-all duration-300"
            style={{ borderColor: teamColor }}
          >
            <p className="text-[10px] md:text-xs font-extrabold truncate text-center leading-tight" style={{ color: '#000000', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
              {player.playerName || player.full_name || player.name || 'Unknown'}
            </p>
            <p className="text-[8px] md:text-[10px] uppercase text-center font-bold" style={{ color: '#334155' }}>
              {player.position || 'N/A'}
            </p>
          </div>

          {/* Status Icons Row */}
          <div className="flex gap-1 mt-1">
            {hasYellowCard && (
              <div className="w-2.5 h-3 md:w-3 md:h-4 bg-yellow-400 rounded-sm border border-yellow-600 shadow-sm" title="Yellow Card" />
            )}
            {hasRedCard && (
              <div className="w-2.5 h-3 md:w-3 md:h-4 bg-red-600 rounded-sm border border-red-800 shadow-sm" title="Red Card" />
            )}
            {isInjured && (
              <div className="w-3.5 h-3.5 md:w-4 md:h-4 bg-red-500 rounded-full flex items-center justify-center shadow-sm" title="Injured">
                <AlertCircle size={8} className="text-white md:w-2.5 md:h-2.5" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Team Header */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-3 md:p-4 border border-slate-200">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 md:gap-3">
            <div
              className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-lg"
              style={{ backgroundColor: teamColor }}
            >
              <Users size={20} className="text-white md:w-6 md:h-6" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-black text-slate-900">{teamName}</h3>
              <p className="text-xs md:text-sm text-slate-500">Starting XI</p>
            </div>
          </div>
          <div
            className="px-3 py-1.5 md:px-4 md:py-2 rounded-full font-mono font-bold text-base md:text-lg shadow-md"
            style={{
              backgroundColor: `${teamColor}20`,
              color: teamColor,
              border: `2px solid ${teamColor}`
            }}
          >
            {formation}
          </div>
        </div>
      </div>

      {/* Football Pitch - Starting XI */}
      <div className="relative rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl" style={{ aspectRatio: '5/7' }}>
        {/* Beautiful Grass Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500 via-green-600 to-emerald-700">
          {/* Grass Texture Pattern */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)`
          }} />
        </div>

        {/* Field Markings */}
        <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.3 }}>
          {/* Center Circle */}
          <circle cx="50%" cy="50%" r="12%" fill="none" stroke="white" strokeWidth="2" />
          <circle cx="50%" cy="50%" r="1%" fill="white" />

          {/* Center Line */}
          <line x1="0" y1="50%" x2="100%" y2="50%" stroke="white" strokeWidth="2" />

          {/* Penalty Areas */}
          <rect x="20%" y="2%" width="60%" height="16%" fill="none" stroke="white" strokeWidth="2" />
          <rect x="30%" y="2%" width="40%" height="8%" fill="none" stroke="white" strokeWidth="2" />

          <rect x="20%" y="82%" width="60%" height="16%" fill="none" stroke="white" strokeWidth="2" />
          <rect x="30%" y="90%" width="40%" height="8%" fill="none" stroke="white" strokeWidth="2" />

          {/* Outer Border */}
          <rect x="1%" y="1%" width="98%" height="98%" fill="none" stroke="white" strokeWidth="3" strokeOpacity="0.5" rx="20" />
        </svg>

        {/* Players Positioned */}
        <div className="relative w-full h-full">
          {starters.slice(0, 11).map((player, index) => {
            const position = allPositions[index] || allPositions[0];
            return (
              <PlayerBadge
                key={player.playerId || player.player_id || player.id || index}
                player={player}
                position={position}
                index={index}
              />
            );
          })}
        </div>
      </div>

      {/* Substitutes Bench */}
      {substitutes.length > 0 && (
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-5 border-2 border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-md"
              style={{ backgroundColor: `${teamColor}20` }}
            >
              <Users size={20} style={{ color: teamColor }} />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-800">Cầu thủ dự bị</h4>
              <p className="text-xs text-slate-500">{substitutes.length} players</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {substitutes.map((player) => {
              const hasYellowCard = player.yellowCards > 0 || player.yellow_cards > 0;
              const hasRedCard = player.redCards > 0 || player.red_cards > 0;
              const hasGoal = player.goals > 0 || player.goalsScored > 0;

              return (
                <div
                  key={player.playerId || player.player_id || player.id}
                  className="flex items-center gap-2.5 bg-white p-3 rounded-xl border-2 border-slate-100 hover:border-slate-300 hover:shadow-lg transition-all duration-200 group"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform"
                    style={{
                      backgroundColor: `${teamColor}30`,
                      border: `2px solid ${teamColor}`,
                      color: teamColor
                    }}
                  >
                    <span className="text-sm font-black">
                      {player.jerseyNumber || player.jersey_number || player.shirtNumber || player.shirt_number || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                      {player.playerName || player.full_name || player.name || 'Unknown'}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">
                      {player.position || 'SUB'}
                    </p>
                    {/* Status Icons */}
                    <div className="flex gap-1 mt-1">
                      {hasYellowCard && <div className="w-2 h-3 bg-yellow-400 rounded-sm" title="Yellow" />}
                      {hasRedCard && <div className="w-2 h-3 bg-red-600 rounded-sm" title="Red" />}
                      {hasGoal && <Target size={10} className="text-orange-500" title="Goal" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LineupDisplay;
