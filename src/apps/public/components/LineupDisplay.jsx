import React from 'react';
import { Users, ShieldCheck, UserX } from 'lucide-react';

/**
 * LineupDisplay Component
 * Hiển thị đội hình ra sân của một đội (11 cầu thủ chính + dự bị)
 */
const LineupDisplay = ({ lineup, teamName, formation = '4-4-2' }) => {
  if (!lineup || lineup.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <Users className="mx-auto mb-2" size={32} />
        <p className="text-sm">Chưa có đội hình</p>
      </div>
    );
  }

  // Phân loại cầu thủ
  const starters = lineup.filter(p => p.isStarting);
  const substitutes = lineup.filter(p => !p.isStarting);

  // Map formation positions (simplified)
  const getPositionStyle = (index, formation) => {
    const total = starters.length;
    const formationArray = formation.split('-').map(Number);
    
    // Tạo layout đơn giản: GK, Defenders, Midfielders, Forwards
    const positions = {
      gk: { bottom: '5%', left: '50%' },
      def: formationArray[0] || 4,
      mid: formationArray[1] || 4,
      fwd: formationArray[2] || 2
    };

    // Goalkeeper (index 0)
    if (index === 0) {
      return { bottom: '5%', left: '50%', transform: 'translateX(-50%)' };
    }

    // Defenders
    if (index <= positions.def) {
      const spacing = 80 / (positions.def + 1);
      return { 
        bottom: '25%', 
        left: `${10 + (index * spacing)}%`, 
        transform: 'translateX(-50%)'
      };
    }

    // Midfielders
    if (index <= positions.def + positions.mid) {
      const midIndex = index - positions.def;
      const spacing = 80 / (positions.mid + 1);
      return { 
        bottom: '50%', 
        left: `${10 + (midIndex * spacing)}%`, 
        transform: 'translateX(-50%)'
      };
    }

    // Forwards
    const fwdIndex = index - positions.def - positions.mid;
    const spacing = 80 / (positions.fwd + 1);
    return { 
      bottom: '75%', 
      left: `${10 + (fwdIndex * spacing)}%`, 
      transform: 'translateX(-50%)'
    };
  };

  return (
    <div className="space-y-6">
      {/* Team Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Users size={20} className="text-cyan-500" />
          {teamName}
        </h3>
        <span className="text-sm text-slate-500 font-mono">{formation}</span>
      </div>

      {/* Starting XI - Football Field View */}
      <div className="relative bg-gradient-to-b from-green-600 to-green-700 rounded-2xl p-6 min-h-[400px] overflow-hidden">
        {/* Field Lines */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/2 left-0 right-0 h-px bg-white transform -translate-y-1/2" />
          <div className="absolute top-1/2 left-1/2 w-24 h-24 border-2 border-white rounded-full transform -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2" />
        </div>

        {/* Players */}
        <div className="relative h-full">
          {starters.slice(0, 11).map((player, index) => {
            const style = getPositionStyle(index, formation);
            return (
              <div
                key={player.playerId || index}
                className="absolute"
                style={style}
              >
                <div className="flex flex-col items-center group">
                  {/* Jersey */}
                  <div className="relative mb-1">
                    <div className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center border-4 border-white/20 group-hover:scale-110 transition-transform">
                      <span className="text-xl font-black text-slate-800">
                        {player.jerseyNumber || player.jersey_number || '?'}
                      </span>
                    </div>
                    {player.isCaptain && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-white shadow">
                        <ShieldCheck size={12} className="text-yellow-900" />
                      </div>
                    )}
                  </div>
                  {/* Name */}
                  <div className="bg-white/95 px-2 py-1 rounded-full shadow-md text-center min-w-[80px]">
                    <p className="text-xs font-bold text-slate-800 truncate max-w-[120px]">
                      {player.playerName || player.full_name || 'Unknown'}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase">
                      {player.position || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Substitutes Bench */}
      {substitutes.length > 0 && (
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
          <h4 className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
            <Users size={16} />
            Cầu thủ dự bị ({substitutes.length})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {substitutes.map((player) => (
              <div
                key={player.playerId || player.player_id}
                className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-100 hover:border-cyan-300 hover:shadow transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-slate-700">
                    {player.jerseyNumber || player.jersey_number || '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">
                    {player.playerName || player.full_name || 'Unknown'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {player.position || 'SUB'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Substitutions Made (nếu có) */}
      {lineup.some(p => p.status === 'subbed_out' || p.status === 'subbed_in') && (
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
          <h4 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
            <UserX size={16} />
            Thay người
          </h4>
          <div className="space-y-2">
            {lineup
              .filter(p => p.status === 'subbed_out')
              .map((player) => (
                <div key={player.playerId} className="flex items-center gap-2 text-sm">
                  <span className="text-red-600">↓</span>
                  <span className="text-slate-700">
                    #{player.jerseyNumber} {player.playerName}
                  </span>
                  <span className="text-slate-400 text-xs">
                    ({player.minutesPlayed || '?'} phút)
                  </span>
                </div>
              ))}
            {lineup
              .filter(p => p.status === 'subbed_in')
              .map((player) => (
                <div key={player.playerId} className="flex items-center gap-2 text-sm">
                  <span className="text-green-600">↑</span>
                  <span className="text-slate-700">
                    #{player.jerseyNumber} {player.playerName}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LineupDisplay;
