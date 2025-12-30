import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Tv, Download, Trophy } from 'lucide-react';
import MatchCard from '../components/MatchCard';
import WeatherWidget from '../components/WeatherWidget';
import MatchPreview from '../components/MatchPreview';
import matchService from '../../../layers/application/services/MatchesService';
import { downloadICS } from '../../../utils/icsGenerator';
import logger from '../../../shared/utils/logger';

const FAKE_SCHEDULE_FROM_DB = [
  {
    id: 1,
    date: '2025-09-17',
    time: '21:00',
    status: 'upcoming',
    homeTeam: { name: 'Liverpool', logo: 'https://img.uefa.com/imgml/TP/teams/logos/50x50/7889.png', shortName: 'LIV' },
    awayTeam: { name: 'Barcelona', logo: 'https://img.uefa.com/imgml/TP/teams/logos/50x50/50080.png', shortName: 'BAR' },
    matchday: 1,
    venue: 'Anfield',
    city: 'Liverpool',
    tvChannels: ['BT Sport 1']
  },
  {
    id: 2,
    date: '2025-09-17',
    time: '21:00',
    status: 'upcoming',
    homeTeam: { name: 'Arsenal', logo: 'https://img.uefa.com/imgml/TP/teams/logos/50x50/52280.png', shortName: 'ARS' },
    awayTeam: { name: 'Newcastle', logo: 'https://img.uefa.com/imgml/TP/teams/logos/50x50/52281.png', shortName: 'NEW' },
    matchday: 1,
    venue: 'Emirates Stadium',
    city: 'London',
    tvChannels: ['CBS Sports']
  },
  {
    id: 3,
    date: '2025-09-18',
    time: '18:45',
    status: 'finished',
    homeTeam: { name: 'Juventus', logo: 'https://img.uefa.com/imgml/TP/teams/logos/50x50/50139.png', shortName: 'JUV' },
    awayTeam: { name: 'Real Madrid', logo: 'https://img.uefa.com/imgml/TP/teams/logos/50x50/50051.png', shortName: 'RMA' },
    matchday: 1,
    venue: 'Allianz Stadium',
    city: 'Turin',
    tvChannels: []
  }
];


const filters = [
  { id: 'all', name: 'Tất cả' },
  { id: 'today', name: 'Hôm nay' },
  { id: 'live', name: 'Trực tiếp' },
  { id: 'upcoming', name: 'Sắp diễn ra' },
  { id: 'finished', name: 'Đã kết thúc' }
];

import TeamsService from '../../../layers/application/services/TeamsService';

const MatchesPage = () => {
  const [matches, setMatches] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(''); // Empty for 'current' or 'all' depending on API default. Or we can default to latest.
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Load Seasons from public API
  useEffect(() => {
    const loadSeasons = async () => {
      try {
        const data = await TeamsService.getCompetitionSeasons();
        // Normalize seasons
        const normalized = (data || []).map(s => ({
          id: s.season_id ?? s.id,
          seasonId: s.season_id ?? s.id,
          name: s.name ?? s.label ?? `${s.year}-${s.year + 1}`,
          is_active: s.is_active ?? s.status === 'in_progress',
          isCurrent: s.is_active ?? s.status === 'in_progress'
        }));
        setSeasons(normalized);
        // Optional: auto-select current season
        const current = normalized.find(s => s.is_active || s.isCurrent) || normalized[0];
        if (current) setSelectedSeason(current.seasonId || current.id);
      } catch (err) {
        console.error('Failed to load seasons', err);
      }
    };
    loadSeasons();
  }, []);

  useEffect(() => {
    const fetchMatches = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch matches from system only
        const [systemData, liveMatches] = await Promise.all([
          matchService.getAllMatches({
            limit: 100,
            seasonId: selectedSeason,
            date: selectedDate // Optimization: filter by date at API level if possible, but frontend filtering exists too. matchService supports dateFrom/dateTo but not single date? Check Service.
            // backend route supports dateFrom/dateTo. Frontend has selectedDate.
            // Let's pass seasonId mainly.
          }),
          matchService.getLiveMatches()
        ]);

        const formatMatch = (m, isExternal) => ({
          id: isExternal ? `ext-${m.id}` : m.id,
          date: m.utcDate ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date(m.utcDate)) : '',
          time: m.utcDate ? new Date(m.utcDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }) : '00:00',
          status: (() => {
            if (m.status === 'in_progress' || m.status === 'IN_PLAY') return 'live';
            if (m.status === 'completed' || m.status === 'FINISHED') return 'finished';
            return m.status === 'scheduled' || m.status === 'TIMED' ? 'upcoming' : (m.status || '').toLowerCase();
          })(),
          scoreHome: m.scoreHome ?? m.homeScore,
          scoreAway: m.scoreAway ?? m.awayScore,
          homeTeam: {
            id: m.homeTeamId,
            name: m.homeTeamName || 'Unknown Team',
            logo: isExternal
              ? `https://crests.football-data.org/${m.homeTeamId}.svg`
              : (m.homeTeamLogo || 'https://img.uefa.com/imgml/TP/teams/logos/50x50/generic.png'),
            shortName: m.homeTeamShortName || (m.homeTeamName ? m.homeTeamName.substring(0, 3).toUpperCase() : 'UNK')
          },
          awayTeam: {
            id: m.awayTeamId,
            name: m.awayTeamName || 'Unknown Team',
            logo: isExternal
              ? `https://crests.football-data.org/${m.awayTeamId}.svg`
              : (m.awayTeamLogo || 'https://img.uefa.com/imgml/TP/teams/logos/50x50/generic.png'),
            shortName: m.awayTeamShortName || (m.awayTeamName ? m.awayTeamName.substring(0, 3).toUpperCase() : 'UNK')
          },
          matchday: m.matchday || m.round || 0,
          venue: m.venue || 'TBC',
          city: 'Europe',
          tvChannels: isExternal ? ['UEFA.tv'] : [],
          events: m.events || [],
          stats: m.stats || {},
          mvp: m.mvp || null
        });

        const systemMatches = (systemData.matches || []).map(m => formatMatch(m, false));
        const formattedLiveMatches = (liveMatches || []).map(m => formatMatch(m, false));

        // Create a map to ensure uniqueness by ID
        const matchMap = new Map();

        // Add system matches
        systemMatches.forEach(m => matchMap.set(m.id, m));
        // Add live matches (override if duplicates)
        formattedLiveMatches.forEach(m => matchMap.set(m.id, m));

        const uniqueMatches = Array.from(matchMap.values());

        // Merge and sort
        const allMatches = uniqueMatches.sort((a, b) => new Date(a.date) - new Date(b.date));

        setMatches(allMatches);
        setError(null);
      } catch (err) {
        logger.error('Error fetching matches:', err);
        setError(err.message || 'Failed to load matches');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatches();
  }, [selectedSeason]); // Re-fetch when season changes

  const filteredMatches = matches.filter(match => {
    // If user picks a specific filter (Today, Live, etc), use that
    if (selectedFilter === 'today') return match.date === new Date().toISOString().split('T')[0];
    if (selectedFilter === 'live') return match.status === 'live';
    if (selectedFilter === 'upcoming') return match.status === 'upcoming';
    if (selectedFilter === 'finished') return match.status === 'finished';

    // If date is selected, filter by date
    if (selectedDate && selectedFilter !== 'all') return match.date === selectedDate;

    // If "All" is selected and date is picked
    if (selectedFilter === 'all' && selectedDate) return match.date === selectedDate;

    return true;
  });

  const groupedMatches = filteredMatches.reduce((groups, match) => {
    const date = match.date;
    if (!groups[date]) groups[date] = [];
    groups[date].push(match);
    return groups;
  }, {});

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('vi-VN', {
      timeZone: 'Asia/Bangkok',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

  return (
    <div className="space-y-10 py-6">
      <section className="rounded-2xl bg-[#020617]/85 border border-white/10 backdrop-blur shadow-[0px_0px_40px_rgba(0,0,0,0.6)] p-8 relative overflow-hidden">
        <div className="absolute -right-12 -top-24 h-56 w-56 rounded-full bg-gradient-to-br from-[#2563EB]/10 to-[#06B6D4]/10 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-400/80">Lịch thi đấu</p>
            <h1 className="text-4xl font-display text-white">Lịch trận đấu</h1>
            <p className="text-slate-300 max-w-xl">
              Lên kế hoạch theo dõi các trận đấu với bộ lọc nhanh, hiệu ứng trực quan và thẻ trận sẵn sàng cho dữ liệu trực tiếp.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => downloadICS(matches)}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-white transition-colors text-sm font-semibold"
              title="Xuất ra lịch (.ics)"
            >
              <Download size={18} />
              <span className="hidden sm:inline">Xuất lịch</span>
            </button>

            {/* Season Selector */}
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-200 bg-[#020617]/80 px-3 py-2 border border-white/20 rounded-full hover:bg-white/10 transition-colors cursor-pointer">
              <Trophy size={16} className="text-amber-400" />
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="bg-transparent border-none p-0 focus:ring-0 text-white max-w-[150px] cursor-pointer outline-none appearance-none"
              >
                {seasons.map(s => (
                  <option key={s.seasonId || s.id} value={s.seasonId || s.id} className="text-black">
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm font-semibold text-slate-200 bg-[#020617]/80 px-3 py-2 border border-white/20 rounded-full hover:bg-white/10 transition-colors cursor-pointer">
              <Calendar size={18} />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none p-0 focus:ring-0 text-white max-w-[130px] cursor-pointer"
              />
            </label>
          </div>
        </div>
      </section >

      <div className="flex flex-wrap gap-3">
        {filters.map(filter => (
          <button
            key={filter.id}
            onClick={() => setSelectedFilter(filter.id)}
            className={`date-chip ${selectedFilter === filter.id ? 'active' : ''}`}
          >
            {filter.name}
          </button>
        ))}
      </div>

      {
        error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg relative flex items-center justify-between" role="alert">
            <div>
              <strong className="font-bold">Lỗi! </strong>
              <span className="block sm:inline">{error}</span>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="ml-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-semibold"
            >
              Thử lại
            </button>
          </div>
        )
      }

      {
        isLoading ? (
          <div className="grid gap-4">
            {[...Array(4)].map((_, idx) => (
              <div key={idx} className="glass-card p-6 space-y-4">
                <div className="skeleton-bar w-1/3" />
                <div className="skeleton-bar w-2/3" />
                <div className="skeleton-bar w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 space-y-8">
              {Object.entries(groupedMatches).length ? (
                Object.entries(groupedMatches).map(([date, dayMatches], idx) => (
                  <div key={date} className="space-y-4" style={{ animation: `fadeUp 500ms ease ${idx * 80}ms both` }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Vòng {dayMatches[0]?.matchday}</p>
                        <h3 className="text-xl font-semibold text-slate-900">{formatDate(date)}</h3>
                      </div>
                      <span className="text-slate-400 text-sm">{dayMatches.length} trận</span>
                    </div>
                    <div className="space-y-4">
                      {dayMatches.map((match, matchIdx) => (
                        <div style={{ animation: `fadeUp 480ms ease ${matchIdx * 60}ms both` }} key={match.id}>
                          <MatchCard match={match} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="glass-card p-10 text-center">
                  <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-700 text-lg">Không tìm thấy trận đấu</p>
                  <p className="text-slate-400">Hãy điều chỉnh bộ lọc hoặc chọn ngày khác.</p>
                </div>
              )}
            </div>

            <aside className="space-y-6">
              <WeatherWidget city="Liverpool" temperature={'8\u00B0C'} condition="Partly Cloudy" />
              <div className="glass-card p-6">
                <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Tv size={20} className="text-[#0055FF]" /> Phát sóng
                </h3>
                <div className="space-y-3">
                  {matches
                    .filter(m => m.status === 'upcoming' && m.tvChannels)
                    .slice(0, 3)
                    .map(match => (
                      <div key={match.id} className="p-3 rounded-2xl border border-slate-100 bg-slate-50/70">
                        <p className="text-sm font-semibold text-slate-900">
                          {match.homeTeam.shortName} gặp {match.awayTeam.shortName}
                        </p>
                        <p className="text-xs text-slate-500">{match.time} - {match.tvChannels.join(', ')}</p>
                      </div>
                    ))}
                </div>
              </div>
              <MatchPreview />
            </aside>
          </div>
        )
      }

      <div className="flex items-center justify-between border-t border-slate-200 pt-6 text-sm text-slate-500">
        <button className="flex items-center gap-2 text-[#0055FF] font-semibold">
          <ChevronLeft size={16} />
          Vòng trước
        </button>
        <span>Vòng 1</span>
        <button className="flex items-center gap-2 text-[#0055FF] font-semibold">
          Vòng sau
          <ChevronRight size={16} />
        </button>
      </div>
    </div >
  );
};

export default MatchesPage;
