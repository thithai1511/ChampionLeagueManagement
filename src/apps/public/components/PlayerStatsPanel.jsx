import React, { useEffect, useState } from 'react';
import { Trophy, Target, Award, Shield } from 'lucide-react';
import axios from 'axios';
import logger from '../../../shared/utils/logger';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const PlayerStatsPanel = ({ seasonId }) => {
  const [topScorers, setTopScorers] = useState([]);
  const [topMVP, setTopMVP] = useState([]);
  const [isLoadingScorers, setIsLoadingScorers] = useState(true);
  const [isLoadingMVP, setIsLoadingMVP] = useState(true);

  useEffect(() => {
    if (!seasonId) return;

    const loadTopScorers = async () => {
      setIsLoadingScorers(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/public/standings/season/${seasonId}/top-scorers?limit=10`);
        const data = response.data?.data || [];
        setTopScorers(data);
      } catch (error) {
        logger.error('Không thể tải vua phá lưới', error);
      } finally {
        setIsLoadingScorers(false);
      }
    };

    const loadTopMVP = async () => {
      setIsLoadingMVP(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/public/standings/season/${seasonId}/top-mvp`);
        const data = response.data?.data || [];
        setTopMVP(data);
      } catch (error) {
        logger.error('Không thể tải MVP', error);
      } finally {
        setIsLoadingMVP(false);
      }
    };

    loadTopScorers();
    loadTopMVP();
  }, [seasonId]);

  const renderSkeletonRow = () => (
    <div className="flex items-center gap-3 p-3 animate-pulse">
      <div className="w-8 h-8 bg-white/10 rounded"></div>
      <div className="flex-1">
        <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-white/10 rounded w-1/2"></div>
      </div>
      <div className="w-12 h-8 bg-white/10 rounded"></div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Vua phá lưới */}
      <div className="bg-gradient-to-br from-[#1a1a2e]/90 to-[#16213e]/90 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
              <Target className="text-amber-400" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Vua phá lưới</h3>
              <p className="text-sm text-white/60">Top ghi bàn nhiều nhất</p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-white/10">
          {isLoadingScorers ? (
            <>
              {renderSkeletonRow()}
              {renderSkeletonRow()}
              {renderSkeletonRow()}
            </>
          ) : topScorers.length === 0 ? (
            <div className="p-8 text-center text-white/40">
              <Trophy size={48} className="mx-auto mb-3 opacity-30" />
              <p>Chưa có dữ liệu</p>
            </div>
          ) : (
            topScorers.map((player, index) => (
              <div
                key={player.playerId}
                className={`flex items-center gap-4 p-4 hover:bg-white/5 transition ${
                  index === 0 ? 'bg-amber-500/5' : ''
                }`}
              >
                <div className="relative">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-xl font-bold ${
                      index === 0
                        ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white'
                        : index === 1
                        ? 'bg-gradient-to-br from-slate-400 to-slate-500 text-white'
                        : index === 2
                        ? 'bg-gradient-to-br from-orange-700 to-amber-800 text-white'
                        : 'bg-white/10 text-white/60'
                    }`}
                  >
                    {index + 1}
                  </div>
                  {index === 0 && (
                    <Trophy
                      size={16}
                      className="absolute -top-1 -right-1 text-amber-400"
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">
                    {player.playerName}
                  </p>
                  <p className="text-sm text-white/60 truncate">
                    {player.teamName}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold text-amber-400">
                    {player.goals}
                  </div>
                  <div className="text-xs text-white/60">
                    {player.matchesPlayed} trận
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MVP - Player of the Match */}
      <div className="bg-gradient-to-br from-[#1a1a2e]/90 to-[#16213e]/90 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
              <Award className="text-cyan-400" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Cầu thủ xuất sắc</h3>
              <p className="text-sm text-white/60">MVP (Player of the Match)</p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-white/10">
          {isLoadingMVP ? (
            <>
              {renderSkeletonRow()}
              {renderSkeletonRow()}
              {renderSkeletonRow()}
            </>
          ) : topMVP.length === 0 ? (
            <div className="p-8 text-center text-white/40">
              <Award size={48} className="mx-auto mb-3 opacity-30" />
              <p>Chưa có dữ liệu</p>
            </div>
          ) : (
            topMVP.slice(0, 10).map((player, index) => (
              <div
                key={player.playerId}
                className={`flex items-center gap-4 p-4 hover:bg-white/5 transition ${
                  index === 0 ? 'bg-cyan-500/5' : ''
                }`}
              >
                <div className="relative">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-xl font-bold ${
                      index === 0
                        ? 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white'
                        : index === 1
                        ? 'bg-gradient-to-br from-slate-400 to-slate-500 text-white'
                        : index === 2
                        ? 'bg-gradient-to-br from-orange-700 to-amber-800 text-white'
                        : 'bg-white/10 text-white/60'
                    }`}
                  >
                    {index + 1}
                  </div>
                  {index === 0 && (
                    <Award
                      size={16}
                      className="absolute -top-1 -right-1 text-cyan-400"
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">
                    {player.playerName}
                  </p>
                  <p className="text-sm text-white/60 truncate">
                    {player.teamName}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold text-cyan-400">
                    {player.motmCount}
                  </div>
                  <div className="text-xs text-white/60">
                    {player.matchesPlayed} trận
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerStatsPanel;
