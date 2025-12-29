import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Globe, MapPin, Search, Shield, Users, Trophy, Star, ArrowRight } from 'lucide-react';
import TeamsService from '../../../layers/application/services/TeamsService';
import logger from '../../../shared/utils/logger';
import footballBanner from '@/assets/images/trai_bong2.jpeg';

const TeamsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [seasonOptions, setSeasonOptions] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [isSeasonsLoading, setIsSeasonsLoading] = useState(true);

  useEffect(() => {
    const loadSeasons = async () => {
      setIsSeasonsLoading(true);
      try {
        const seasons = await TeamsService.getCompetitionSeasons(2020);
        setSeasonOptions(seasons);
        if (seasons.length) {
          setSelectedSeason(String(seasons[0].year));
        }
      } catch (err) {
        logger.error('Failed to load seasons', err);
        setSeasonOptions([]);
      } finally {
        setIsSeasonsLoading(false);
      }
    };

    loadSeasons();
  }, []);

  useEffect(() => {
    if (!selectedSeason) return;
    
    // Debounce search to avoid excessive API calls
    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await TeamsService.getAllTeams({ 
          season: selectedSeason,
          search: searchTerm
        });
        setTeams(response.teams ?? []);
        setError(null);
      } catch (err) {
        logger.error('Failed to load teams', err);
        setError('Không thể tải danh sách đội bóng ngay bây giờ. Vui lòng thử lại sau.');
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [selectedSeason, searchTerm]);

  const countryFilters = useMemo(() => {
    const uniqueCountries = new Map();

    teams.forEach((team) => {
      if (!team.country) {
        return;
      }
      const key = (team.countryCode ?? team.country).toLowerCase();
      if (!uniqueCountries.has(key)) {
        uniqueCountries.set(key, {
          id: key,
          name: team.country,
        });
      }
    });

    return [
      { id: 'all', name: 'All countries' },
      ...Array.from(uniqueCountries.values()).sort((a, b) => a.name.localeCompare(b.name)),
    ];
  }, [teams]);

  const filteredTeams = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return teams.filter((team) => {
      const matchesSearch =
        !search ||
        team.name.toLowerCase().includes(search) ||
        (team.shortName ?? '').toLowerCase().includes(search) ||
        (team.tla ?? '').toLowerCase().includes(search);

      const countryId = (team.countryCode ?? team.country ?? '').toLowerCase();
      const matchesCountry = selectedCountry === 'all' || selectedCountry === '' || countryId === selectedCountry;

      return matchesSearch && matchesCountry;
    });
  }, [teams, searchTerm, selectedCountry]);

  const summaryStats = useMemo(() => {
    const countryCount = new Set(teams.map((team) => team.country).filter(Boolean)).size;
    const coachCount = teams.filter((team) => Boolean(team.coach)).length;
    const averageFounded =
      teams.length > 0
        ? Math.round(
            teams.reduce((sum, team) => {
              if (!team.founded) {
                return sum;
              }
              return sum + team.founded;
            }, 0) / Math.max(teams.filter((team) => team.founded).length, 1),
          )
        : null;

    return {
      totalTeams: teams.length,
      countryCount,
      coachCount,
      averageFounded,
    };
  }, [teams]);

  const renderTeamLogo = (team) => {
    if (team.logo || team.crest) {
      return team.logo || team.crest;
    }
    const initials = team.name.slice(0, 3).toUpperCase();
    const svg = `
      <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="64" rx="16" fill="#001845"/>
        <text x="50%" y="55%" text-anchor="middle" fill="#FFFFFF" font-size="20" font-family="Arial, sans-serif" font-weight="bold">${initials}</text>
      </svg>
    `;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  };

  return (
    <div className="min-h-screen">
      {/* Hero Banner with Football */}
      <section className="relative h-[400px] md:h-[450px] overflow-hidden -mx-6 lg:-mx-8 mb-8">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img 
            src={footballBanner} 
            alt="Champions League Football" 
            className="w-full h-full object-cover"
          />
          {/* Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a1a] via-[#0a0a1a]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a1a] via-transparent to-[#0a0a1a]/50" />
        </div>

        {/* Content */}
        <div className="relative h-full max-w-7xl mx-auto px-6 lg:px-8 flex flex-col justify-center">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm mb-6">
            <Link to="/" className="text-cyan-400 hover:text-cyan-300 transition-colors">
              Trang chủ
            </Link>
            <span className="text-white/40">/</span>
            <span className="text-white/60">Cúp C1</span>
            <span className="text-white/40">/</span>
            <span className="text-white font-semibold">Đội bóng</span>
          </nav>

          {/* Badge */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 border border-blue-400/30 backdrop-blur-sm">
              <Star size={14} className="text-blue-400" />
              <span className="text-blue-300 text-xs uppercase tracking-[0.2em] font-bold">36 CLB hàng đầu Việt Nam</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-white to-cyan-300">
              CÂU LẠC BỘ
            </span>
            <br />
            <span className="text-white/90">CHAMPIONS LEAGUE</span>
          </h1>

          <p className="text-white/70 text-lg max-w-xl mb-6">
            Khám phá các đội bóng tham dự UEFA Champions League với thông tin đội hình, 
            huấn luyện viên và lịch sử thi đấu.
          </p>

          {/* Quick Stats */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm">
              <Shield size={18} className="text-cyan-400" />
              <span className="text-white font-bold">{summaryStats.totalTeams}</span>
              <span className="text-white/60 text-sm">CLB</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm">
              <Globe size={18} className="text-blue-400" />
              <span className="text-white font-bold">{summaryStats.countryCount}</span>
              <span className="text-white/60 text-sm">Quốc gia</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm">
              <Trophy size={18} className="text-amber-400" />
              <span className="text-white font-bold">69</span>
              <span className="text-white/60 text-sm">Năm lịch sử</span>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0a0a1a] to-transparent" />
      </section>

      {/* Main Content */}
      <div className="uefa-container">
        {/* Season info */}
        {selectedSeason && (
          <div className="flex items-center gap-2 mb-6">
            <Calendar size={16} className="text-cyan-400" />
            <span className="text-white/70">Mùa giải:</span>
            <span className="text-white font-semibold">{selectedSeason}/{Number(selectedSeason) + 1}</span>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Tìm theo tên đội hoặc mã (VD: FCB, MCI)"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/[0.12] text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition"
            />
          </div>
          <div className="flex gap-3 flex-col sm:flex-row">
            <select
              className="h-12 px-5 rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/[0.12] text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50 transition sm:w-56 appearance-none cursor-pointer"
              value={selectedCountry}
              onChange={(event) => setSelectedCountry(event.target.value)}
              style={{backgroundImage: "url('data:image/svg+xml;utf8,<svg fill=\'%23ffffff\' height=\'24\' viewBox=\'0 0 24 24\' width=\'24\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M7 10l5 5 5-5z\'/></svg>')", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '18px'}}
            >
              {countryFilters.map((country) => (
                <option key={country.id} value={country.id} className="bg-[#0a1929] text-white">
                  {country.name}
                </option>
              ))}
            </select>
            <div className="relative sm:w-48">
              <select
                className={`h-12 px-5 w-full rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/[0.12] focus:outline-none focus:ring-2 focus:ring-cyan-400/50 transition appearance-none ${
                  isSeasonsLoading ? 'cursor-wait opacity-75 text-white/50' : 'cursor-pointer text-white'
                }`}
                value={selectedSeason}
                onChange={(event) => setSelectedSeason(event.target.value)}
                disabled={isSeasonsLoading || seasonOptions.length === 0}
                style={{backgroundImage: "url('data:image/svg+xml;utf8,<svg fill=\'%23ffffff\' height=\'24\' viewBox=\'0 0 24 24\' width=\'24\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M7 10l5 5 5-5z\'/></svg>')", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '18px'}}
              >
                {isSeasonsLoading && <option className="bg-[#0a1929] text-white/50">Đang tải mùa giải...</option>}
                {!isSeasonsLoading &&
                  seasonOptions.map((season) => (
                    <option key={season.id} value={season.year} className="bg-[#0a1929] text-white">
                      {season.year}/{season.year + 1}
                    </option>
                  ))}
              </select>
              {isSeasonsLoading && (
                <div className="absolute right-12 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mb-4"></div>
            <p className="text-white/60">Đang tải dữ liệu từ UEFA...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-2xl bg-rose-500/10 backdrop-blur-md border border-rose-500/30 p-6 flex items-center justify-between">
            <div className="text-rose-300 flex-1">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="ml-4 px-5 py-2.5 bg-rose-500 hover:bg-rose-400 text-white rounded-xl transition-colors font-semibold"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredTeams.length === 0 && (
          <div className="text-center py-20 rounded-3xl backdrop-blur-md bg-white/[0.03] border border-white/[0.1]">
            <Shield size={48} className="mx-auto mb-4 text-white/20" />
            <p className="text-white/60">Không tìm thấy đội bóng phù hợp với từ khóa / bộ lọc hiện tại.</p>
          </div>
        )}

        {/* Teams Grid */}
        {!isLoading && !error && filteredTeams.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTeams.map((team) => (
              <div
                key={team.id}
                className="group rounded-2xl p-6 backdrop-blur-md bg-white/[0.04] border border-white/[0.1] hover:bg-white/[0.08] hover:border-cyan-400/30 transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center overflow-hidden border border-white/10 group-hover:border-cyan-400/30 transition-colors">
                    <img
                      src={renderTeamLogo(team)}
                      alt={team.name}
                      className="w-12 h-12 object-contain"
                      loading="lazy"
                    />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-400/80 font-semibold">{team.tla || 'UEFA'}</p>
                    <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">{team.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <Globe size={14} />
                      <span>{team.country || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-white/70">
                    <Users size={14} className="text-amber-400" />
                    <span className="truncate">{team.coach || 'Đang cập nhật'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/70">
                    <MapPin size={14} className="text-cyan-400" />
                    <span className="truncate">{team.venue || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/70">
                    <Calendar size={14} className="text-emerald-400" />
                    <span>{team.founded ?? '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/70">
                    <Shield size={14} className="text-purple-400" />
                    <span className="truncate">{team.clubColors || 'N/A'}</span>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to={selectedSeason ? `/teams/${team.id}?season=${selectedSeason}` : `/teams/${team.id}`}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold hover:shadow-lg hover:shadow-cyan-500/25 transition-all group/btn"
                  >
                    Hồ sơ đội
                    <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                  {team.website && (
                    <a
                      href={team.website}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-semibold hover:bg-white/20 transition-all"
                    >
                      Website
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        <section className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { value: summaryStats.totalTeams, label: 'Đội bóng', color: 'cyan' },
            { value: summaryStats.countryCount, label: 'Quốc gia', color: 'blue' },
            { value: summaryStats.coachCount, label: 'Có HLV', color: 'emerald' },
            { value: summaryStats.averageFounded || '—', label: 'Năm thành lập TB', color: 'amber' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl p-6 backdrop-blur-md bg-white/[0.04] border border-white/[0.1] text-center">
              <p className={`text-3xl font-black text-${stat.color}-400`}>
                {stat.value}
              </p>
              <p className="text-xs uppercase tracking-[0.2em] text-white/50 mt-2">{stat.label}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};

export default TeamsPage;
