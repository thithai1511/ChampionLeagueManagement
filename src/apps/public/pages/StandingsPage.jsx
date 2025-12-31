import React, { useEffect, useMemo, useState } from 'react';
import { Trophy, Download, Share2, TrendingUp, TrendingDown, Minus, Users, Target, Award, AlertCircle, RefreshCw, Shield } from 'lucide-react';
import StandingsService from '../../../layers/application/services/StandingsService';
import ApiService from '../../../layers/application/services/ApiService';
import PlayerStatsPanel from '../components/PlayerStatsPanel';
import DisciplinePanel from '../components/DisciplinePanel';
import UpcomingMatches from '../components/UpcomingMatches';
import logger from '../../../shared/utils/logger';
import fanAtmosphere from '@/assets/images/championleague_newcastle.webp';

const phases = [
  { id: 'league', name: 'Vòng phân hạng', icon: Users },
  { id: 'knockout', name: 'Vòng loại trực tiếp', icon: Target }
];

const groups = [
  { id: 'all', name: 'Tất cả' },
  { id: 'qualified', name: 'Vào thẳng' },
  { id: 'playoff', name: 'Tranh vé' },
  { id: 'eliminated', name: 'Bị loại' }
];

const StandingsPage = () => {
  const [selectedPhase, setSelectedPhase] = useState('league');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [standings, setStandings] = useState(null);
  const [isLoadingSeasons, setIsLoadingSeasons] = useState(true);
  const [isLoadingStandings, setIsLoadingStandings] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSeasons = async () => {
      setIsLoadingSeasons(true);
      try {
        // Fetch seasons from API
        const response = await ApiService.get('/teams/seasons');
        const seasonsData = response?.data || [];
        
        // Map seasons to format: { id, year, label: year only }
        const formattedSeasons = seasonsData.map(season => {
          // Extract year from startDate or use year field
          const startYear = season.year || (season.startDate || season.start_date ? new Date(season.startDate || season.start_date).getFullYear() : null);
          
          // If label exists and is in format "2024/2025" or "2024-2025", extract first year
          let displayYear = startYear;
          if (season.label && !startYear) {
            const yearMatch = season.label.match(/^(\d{4})/);
            if (yearMatch) {
              displayYear = parseInt(yearMatch[1], 10);
            }
          }
          
          return {
            id: season.id || season.season_id,
            year: displayYear || new Date().getFullYear(),
            label: String(displayYear || new Date().getFullYear())
          };
        }).sort((a, b) => b.year - a.year); // Sort descending (newest first)
        
        setSeasons(formattedSeasons);
        if (formattedSeasons.length) {
          setSelectedSeason(String(formattedSeasons[0].id));
        }
      } catch (err) {
        logger.error('Không thể tải danh sách mùa giải', err);
        setError('Không thể tải danh sách mùa giải.');
        // Fallback to default seasons if API fails
        const fallbackSeasons = [
          { id: 1, year: 2026, label: '2026' },
          { id: 2, year: 2025, label: '2025' },
          { id: 3, year: 2024, label: '2024' }
        ];
        setSeasons(fallbackSeasons);
        setSelectedSeason(String(fallbackSeasons[0].id));
      } finally {
        setIsLoadingSeasons(false);
      }
    };

    loadSeasons();
  }, []);

  useEffect(() => {
    if (!selectedSeason) return;

    const loadStandings = async () => {
      setIsLoadingStandings(true);
      try {
        const response = await StandingsService.getSeasonStandings(
          parseInt(selectedSeason), 
          'live' // Use 'live' mode for in-season standings
        );
        
        // Format response to match expected structure
        const formattedData = {
          season: {
            year: parseInt(selectedSeason),
            label: `Season ${selectedSeason}`,
          },
          updated: new Date().toISOString(),
          table: response.data || []
        };
        
        setStandings(formattedData);
        setError(null);
      } catch (err) {
        console.error('Không thể tải bảng xếp hạng', err);
        setError('Không thể tải bảng xếp hạng từ hệ thống.');
      } finally {
        setIsLoadingStandings(false);
      }
    };

    loadStandings();
  }, [selectedSeason]);

  // Format standings for display
  const formattedStandings = useMemo(() => {
    if (!standings?.table) return [];
    return standings.table.map((row, index) => ({
      position: row.rank || index + 1,
      change: 0,
      country: row.shortName || '',
      logo: row.crest || null,
      team: row.teamName,
      played: row.played,
      won: row.wins,
      drawn: row.draws,
      lost: row.losses,
      goalsFor: row.goalsFor,
      goalsAgainst: row.goalsAgainst,
      goalDifference: row.goalDifference,
      points: row.points,
      form: row.form || [],
      status: row.rank <= 8 ? 'qualified' : row.rank <= 24 ? 'playoff' : 'eliminated',
      tieBreakInfo: row.tieBreakInfo
    }));
  }, [standings]);

  // Filter standings by group
  const filteredStandings = useMemo(() => {
    if (selectedGroup === 'all') return formattedStandings;
    return formattedStandings.filter(team => {
      if (selectedGroup === 'qualified') return team.position <= 8;
      if (selectedGroup === 'playoff') return team.position > 8 && team.position <= 24;
      if (selectedGroup === 'eliminated') return team.position > 24;
      return true;
    });
  }, [formattedStandings, selectedGroup]);

  // Group counts
  const groupCounts = useMemo(() => ({
    all: formattedStandings.length,
    qualified: formattedStandings.filter(t => t.position <= 8).length,
    playoff: formattedStandings.filter(t => t.position > 8 && t.position <= 24).length,
    eliminated: formattedStandings.filter(t => t.position > 24).length
  }), [formattedStandings]);

  const getChangeIcon = (change) => {
    if (change > 0) return <TrendingUp size={14} className="text-emerald-400" />;
    if (change < 0) return <TrendingDown size={14} className="text-rose-400" />;
    return <Minus size={14} className="text-white/30" />;
  };

  const getStatusColor = (position) => {
    if (position <= 8) return 'border-l-emerald-500 bg-emerald-500/5';
    if (position <= 24) return 'border-l-amber-500 bg-amber-500/5';
    return 'border-l-rose-500 bg-rose-500/5';
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section with Flag Background */}
        <section className="relative overflow-hidden rounded-2xl border border-white/10">
          {/* Background Image */}
          <div className="absolute inset-0">
            <img 
              src={fanAtmosphere} 
              alt="Champions League" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a1a]/95 via-[#0a0a1a]/70 to-[#0a0a1a]/50" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a1a]/80 to-transparent" />
          </div>
          
          <div className="relative p-6 md:p-8 flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between">
            <div className="flex-1 space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-sm">
                <Trophy size={14} className="text-cyan-400" />
                <span className="uppercase tracking-wider font-bold">Champions League</span>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-black text-white leading-tight">
                Bảng xếp hạng
              </h1>
              
              <p className="mt-2 text-sm md:text-base text-white/70 max-w-2xl leading-relaxed">
                Theo dõi suất đi tiếp, nhóm tranh vé và phong độ gần đây dựa trên dữ liệu giải đấu.
              </p>
              
              {selectedSeason && standings && (
                <div className="flex flex-wrap gap-4 text-sm text-white/60">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-lg shadow-cyan-400/60"></div>
                    <span>
                      {(() => {
                        const season = seasons.find(s => String(s.id) === String(selectedSeason));
                        return season?.label || `Mùa ${selectedSeason}`;
                      })()}
                    </span>
                  </div>
                  {standings.updated && (
                    <div className="flex items-center gap-2">
                      <TrendingUp size={16} className="text-cyan-400" />
                      <span>Cập nhật {new Date(standings.updated).toLocaleString('vi-VN')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <select
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-medium cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                value={selectedSeason}
                onChange={(event) => setSelectedSeason(event.target.value)}
                disabled={isLoadingSeasons || seasons.length === 0}
              >
                {isLoadingSeasons && <option className="text-slate-900">Đang tải...</option>}
                {!isLoadingSeasons && seasons.length === 0 && (
                  <option className="text-slate-900">Không có mùa giải</option>
                )}
                {!isLoadingSeasons &&
                  seasons.map((season) => (
                    <option key={season.id || season.year} value={String(season.id || season.year)} className="text-slate-900">
                      {season.label || String(season.year)}
                    </option>
                  ))}
              </select>
              
              <button className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-medium transition flex items-center gap-2">
                <Download size={18} />
                <span>Xuất</span>
              </button>
              
              <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition flex items-center gap-2">
                <Share2 size={18} />
                <span>Chia sẻ</span>
              </button>
            </div>
          </div>
        </section>

        {/* Phase Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
          {phases.map((phase) => {
            const Icon = phase.icon;
            return (
              <button
                key={phase.id}
                onClick={() => setSelectedPhase(phase.id)}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  selectedPhase === phase.id
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                  <Icon size={18} />
                <span>{phase.name}</span>
              </button>
            );
          })}
        </div>

        {/* Group Filter */}
          <div className="flex flex-wrap gap-2">
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => setSelectedGroup(group.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm border transition-all duration-200 ${
                selectedGroup === group.id
                    ? 'bg-white/15 text-white border-white/25'
                    : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span>{group.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-black/30 text-white/80">
                  {groupCounts[group.id] || 0}
              </span>
            </button>
          ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-2xl bg-rose-500/10 backdrop-blur-md border border-rose-500/30 p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle size={24} className="text-rose-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white">Lỗi tải dữ liệu</h3>
              <p className="text-white/70">{error}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-300 font-semibold flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Thử lại
            </button>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-[2fr,1fr] gap-8">
          {/* Standings Table */}
          <div className="space-y-6">
            {isLoadingStandings ? (
              <div className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-16 flex flex-col items-center justify-center gap-4">
                <RefreshCw className="w-12 h-12 text-cyan-400 animate-spin" />
                <p className="text-white/70 font-medium">Đang tải bảng xếp hạng...</p>
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden backdrop-blur-md bg-white/[0.03] border border-white/[0.1]">
                {/* Header */}
                <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 px-6 py-5 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/60 font-semibold">Vòng phân hạng</p>
                      <p className="text-xl font-bold text-white mt-1">Tổng quan bảng xếp hạng</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-white/60">Cập nhật lúc</p>
                      <p className="text-sm font-semibold text-white">{new Date().toLocaleTimeString('vi-VN')}</p>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="px-6 py-3 border-b border-white/10 flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-white/60">Vào thẳng (1-8)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span className="text-white/60">Vòng tranh vé (9-24)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                    <span className="text-white/60">Bị loại (25-36)</span>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        {[
                          { key: '#', label: '#', width: 'w-16' },
                          { key: 'team', label: 'Đội', width: 'min-w-[200px]' },
                          { key: 'p', label: 'ST', width: 'w-12' },
                          { key: 'w', label: 'T', width: 'w-12' },
                          { key: 'd', label: 'H', width: 'w-12' },
                          { key: 'l', label: 'B', width: 'w-12' },
                          { key: 'gf', label: 'BT', width: 'w-12' },
                          { key: 'ga', label: 'BTh', width: 'w-12' },
                          { key: 'gd', label: 'HS', width: 'w-14' },
                          { key: 'pts', label: 'Đ', width: 'w-14' },
                          { key: 'form', label: 'Phong độ', width: 'w-36' }
                        ].map(col => (
                          <th 
                            key={col.key} 
                            className={`${col.width} py-4 px-3 text-left text-xs font-bold uppercase tracking-wider text-white/50`}
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredStandings.length ? filteredStandings.map((team) => (
                        <tr
                          key={team.position}
                          className={`transition-all duration-200 hover:bg-white/5 border-l-4 ${getStatusColor(team.position)}`}
                        >
                          {/* Position */}
                          <td className="py-4 px-3">
                            <div className="flex items-center gap-2">
                              <div className={`
                                flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm
                                ${team.position <= 8 
                                  ? 'bg-emerald-500/20 text-emerald-400' 
                                  : team.position <= 24 
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-rose-500/20 text-rose-400'
                                }
                              `}>
                                {team.position}
                              </div>
                              {getChangeIcon(team.change)}
                            </div>
                          </td>

                          {/* Team */}
                          <td className="py-4 px-3">
                            <div className="flex items-center gap-3 min-w-[200px]">
                              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {team.logo ? (
                                  <img 
                                    src={team.logo} 
                                    alt={team.team} 
                                    className="w-7 h-7 object-contain"
                                  />
                                ) : (
                                  <Shield size={20} className="text-white/40" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-white truncate">
                                  {team.team}
                                </p>
                                <p className="text-xs text-white/50">{team.country}</p>
                              </div>
                            </div>
                          </td>

                          {/* Stats */}
                          {[
                            team.played,
                            team.won,
                            team.drawn,
                            team.lost,
                            team.goalsFor,
                            team.goalsAgainst
                          ].map((stat, idx) => (
                            <td key={idx} className="py-4 px-3 text-center text-white/80 font-medium text-sm">
                              {stat}
                            </td>
                          ))}

                          {/* Goal Difference */}
                          <td className="py-4 px-3 text-center">
                            <span className={`
                              inline-flex items-center justify-center px-2 py-1 rounded-lg font-bold text-sm
                              ${team.goalDifference > 0 
                                ? 'bg-emerald-500/20 text-emerald-400' 
                                : team.goalDifference < 0 
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'bg-white/10 text-white/60'
                              }
                            `}>
                              {team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}
                            </span>
                          </td>

                          {/* Points */}
                          <td className="py-4 px-3 text-center">
                            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-500/30 text-cyan-300 font-bold text-sm border border-cyan-400/20">
                              {team.points}
                            </span>
                          </td>

                          {/* Form */}
                          <td className="py-4 px-3">
                            <div className="flex gap-1">
                              {(team.form || []).slice(-5).map((result, idx) => (
                                <div
                                  key={idx}
                                  className={`
                                    w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold
                                    ${result === 'W' 
                                      ? 'bg-emerald-500/20 text-emerald-400' 
                                      : result === 'D' 
                                      ? 'bg-white/10 text-white/60'
                                      : 'bg-rose-500/20 text-rose-400'
                                    }
                                  `}
                                  title={result === 'W' ? 'Thắng' : result === 'D' ? 'Hòa' : 'Thua'}
                                >
                                  {result === 'W' ? 'T' : result === 'D' ? 'H' : 'B'}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={11} className="text-center py-16">
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center">
                                <Trophy size={32} className="text-white/30" />
                              </div>
                              <p className="text-white/50 font-medium">Chưa có bảng xếp hạng</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              )}

            {/* Qualification Info Card */}
            <div className="rounded-2xl backdrop-blur-md bg-white/[0.03] p-6 border border-white/[0.1]">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center flex-shrink-0 border border-cyan-400/20">
                  <Trophy size={28} className="text-cyan-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-3">Thể lệ đi tiếp</h3>
                  <div className="space-y-2 text-sm text-white/70">
                    <p className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span><strong className="text-white">Top 8 đội</strong> vào thẳng vòng 1/8</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span><strong className="text-white">Các đội hạng 9-24</strong> vào vòng tranh vé</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      <span><strong className="text-white">12 đội cuối</strong> bị loại</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <UpcomingMatches />
          </div>
        </div>

        {/* Player Statistics - Full Width Below */}
        <div className="space-y-6">
          <PlayerStatsPanel seasonId={selectedSeason} />
          
          {/* Discipline Panel */}
          <DisciplinePanel seasonId={selectedSeason} />
        </div>
      </div>
    </div>
  );
};

export default StandingsPage;
