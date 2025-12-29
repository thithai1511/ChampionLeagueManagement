import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Target, TrendingUp, RefreshCw, AlertCircle } from 'lucide-react';
import StatsService from '../../../layers/application/services/StatsService';
import TeamsService from '../../../layers/application/services/TeamsService';
import logger from '../../../shared/utils/logger';

const TopScorers = () => {
  const [topScorers, setTopScorers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState(null);

  // Load seasons and get latest season
  useEffect(() => {
    const loadSeasons = async () => {
      try {
        const response = await TeamsService.getCompetitionSeasons();
        const seasons = Array.isArray(response) ? response : (response?.data || []);
        if (seasons.length > 0) {
          // Get season ID from the first season (latest)
          const latestSeason = seasons[0];
          setSelectedSeasonId(latestSeason.id || latestSeason.season_id);
        }
      } catch (err) {
        logger.error('Failed to load seasons for top scorers:', err);
      }
    };
    loadSeasons();
  }, []);

  const fetchTopScorers = async () => {
    if (!selectedSeasonId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await StatsService.getTopScorers(selectedSeasonId, 5);
      
      // Map backend data to frontend format
      const mappedScorers = (data || []).map((scorer) => ({
        id: scorer.playerId || scorer.seasonPlayerId,
        name: scorer.playerName || scorer.name,
        displayName: scorer.playerName || scorer.name,
        teamName: scorer.teamName || scorer.team_name,
        nationality: scorer.nationality || '',
        goals: scorer.goals || 0,
        matchesPlayed: scorer.matchesPlayed || scorer.matches_played || 0
      }));
      
      setTopScorers(mappedScorers);
    } catch (err) {
      console.error('Failed to fetch top scorers:', err);
      setError('Không thể tải dữ liệu vua phá lưới');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopScorers();
  }, [selectedSeasonId]);

  const getTrendIcon = (trend) => {
    if (trend === 'up') {
      return <TrendingUp size={14} className="text-emerald-400" />;
    }
    if (trend === 'down') {
      return <TrendingUp size={14} className="text-rose-400 rotate-180" />;
    }
    return <div className="w-3.5 h-3.5 bg-white/20 rounded-full" />;
  };

  // Calculate total goals from data
  const totalGoals = topScorers.reduce((sum, p) => sum + (p.goals || 0), 0);

  return (
    <div className="rounded-2xl backdrop-blur-md bg-white/[0.05] border border-white/[0.1] p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Target className="text-cyan-400" size={24} />
        <h2 className="text-xl font-bold text-white">Vua phá lưới</h2>
        <div className="flex-1" />
        <Link 
          to="/players" 
          className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
        >
          Xem tất cả →
        </Link>
      </div>

      {/* Error State */}
      {error && !loading && (
        <div className="text-center py-6 bg-rose-500/10 rounded-xl border border-rose-500/30 mb-4">
          <AlertCircle className="mx-auto mb-2 text-rose-400" size={28} />
          <p className="text-sm text-white/80 mb-2">{error}</p>
          <button
            onClick={fetchTopScorers}
            className="text-xs text-cyan-400 hover:text-cyan-300 underline"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && topScorers.length === 0 && (
        <div className="text-center py-8">
          <p className="text-white/60">Chưa có dữ liệu</p>
        </div>
      )}

      {/* Scorers List */}
      {!loading && topScorers.length > 0 && (
        <div className="space-y-3">
          {topScorers.map((scorer, index) => (
            <Link
              key={scorer.id}
              to={`/players/${scorer.id}`}
              className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.08] hover:border-cyan-400/30 transition-all group"
            >
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className={`text-xl font-bold w-8 text-center ${
                    index === 0 ? 'text-amber-400' : 
                    index === 1 ? 'text-slate-300' : 
                    index === 2 ? 'text-amber-600' : 'text-white/60'
                  }`}>
                    {index + 1}
                  </span>
                  {getTrendIcon('up')}
                </div>

                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {(scorer.name || scorer.displayName)?.charAt(0) || '?'}
                  </span>
                </div>

                <div>
                  <div className="font-semibold text-white group-hover:text-cyan-400 transition-colors">
                    {scorer.name || scorer.displayName || 'Unknown'}
                  </div>
                  <div className="text-white/50 text-sm flex items-center space-x-2">
                    <span>{scorer.nationality || '—'}</span>
                    <span>•</span>
                    <span>{scorer.teamName || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-black text-cyan-400">
                  {scorer.goals || 0}
                </div>
                <div className="text-white/50 text-xs">
                  bàn thắng
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Stats Summary */}
      {!loading && topScorers.length > 0 && (
        <div className="mt-6 pt-4 border-t border-white/10">
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="text-xl font-bold text-white">{totalGoals}</div>
              <div className="text-white/50 text-xs">Tổng bàn Top 5</div>
            </div>
            <div>
              <div className="text-xl font-bold text-white">
                {topScorers[0]?.goals || 0}
              </div>
              <div className="text-white/50 text-xs">Cao nhất</div>
            </div>
            <div>
              <div className="text-xl font-bold text-white">
                {(totalGoals / 5).toFixed(1)}
              </div>
              <div className="text-white/50 text-xs">TB/người</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopScorers;
