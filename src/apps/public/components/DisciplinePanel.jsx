import React, { useEffect, useState } from 'react';
import { AlertTriangle, Ban, XOctagon, AlertCircle } from 'lucide-react';
import axios from 'axios';
import logger from '../../../shared/utils/logger';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const DisciplinePanel = ({ seasonId }) => {
  const [disciplineData, setDisciplineData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cards'); // 'cards' | 'suspensions'

  useEffect(() => {
    if (!seasonId) return;

    const loadDisciplineData = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/public/standings/season/${seasonId}/discipline`);
        const data = response.data?.data || null;
        setDisciplineData(data);
      } catch (error) {
        logger.error('Không thể tải dữ liệu kỷ luật', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDisciplineData();
  }, [seasonId]);

  const renderSkeletonRow = () => (
    <div className="flex items-center gap-3 p-3 animate-pulse">
      <div className="w-8 h-8 bg-white/10 rounded"></div>
      <div className="flex-1">
        <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-white/10 rounded w-1/2"></div>
      </div>
      <div className="flex gap-2">
        <div className="w-12 h-8 bg-white/10 rounded"></div>
        <div className="w-12 h-8 bg-white/10 rounded"></div>
      </div>
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-[#1a1a2e]/90 to-[#16213e]/90 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-rose-500/20 to-red-500/20 border border-rose-500/30">
              <AlertTriangle className="text-rose-400" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Kỷ luật</h3>
              <p className="text-sm text-white/60">Thẻ vàng/đỏ và treo giò</p>
            </div>
          </div>

          {disciplineData?.summary && (
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-4 bg-yellow-400 rounded-sm"></div>
                <span className="text-white/80">{disciplineData.summary.totalYellowCards}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-4 bg-red-500 rounded-sm"></div>
                <span className="text-white/80">{disciplineData.summary.totalRedCards}</span>
              </div>
              <div className="flex items-center gap-2">
                <Ban size={16} className="text-rose-400" />
                <span className="text-white/80">{disciplineData.summary.activeSuspensions} treo giò</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('cards')}
          className={`flex-1 px-6 py-3 font-semibold transition ${
            activeTab === 'cards'
              ? 'bg-white/10 text-white border-b-2 border-cyan-400'
              : 'text-white/60 hover:text-white/80 hover:bg-white/5'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <AlertTriangle size={18} />
            <span>Thẻ phạt</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('suspensions')}
          className={`flex-1 px-6 py-3 font-semibold transition ${
            activeTab === 'suspensions'
              ? 'bg-white/10 text-white border-b-2 border-rose-400'
              : 'text-white/60 hover:text-white/80 hover:bg-white/5'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Ban size={18} />
            <span>Treo giò ({disciplineData?.suspensions?.length || 0})</span>
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="divide-y divide-white/10 max-h-[500px] overflow-y-auto">
        {isLoading ? (
          <>
            {renderSkeletonRow()}
            {renderSkeletonRow()}
            {renderSkeletonRow()}
          </>
        ) : activeTab === 'cards' ? (
          // Cards tab
          disciplineData?.cards?.length === 0 ? (
            <div className="p-8 text-center text-white/40">
              <AlertCircle size={48} className="mx-auto mb-3 opacity-30" />
              <p>Chưa có thẻ phạt</p>
            </div>
          ) : (
            disciplineData?.cards?.slice(0, 20).map((player, index) => (
              <div
                key={player.playerId}
                className="flex items-center gap-4 p-4 hover:bg-white/5 transition"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-xl font-bold bg-white/10 text-white/60">
                  {index + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">
                    {player.playerName}
                  </p>
                  <p className="text-sm text-white/60 truncate">
                    {player.teamName}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {/* Yellow cards */}
                  {player.yellowCards > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                      <div className="w-3 h-4 bg-yellow-400 rounded-sm"></div>
                      <span className="font-bold text-yellow-400">{player.yellowCards}</span>
                    </div>
                  )}

                  {/* Red cards */}
                  {player.redCards > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30">
                      <div className="w-3 h-4 bg-red-500 rounded-sm"></div>
                      <span className="font-bold text-red-400">{player.redCards}</span>
                    </div>
                  )}

                  {/* Suspension warning */}
                  {player.isSuspended && (
                    <div className="px-2 py-1 rounded-md bg-rose-500/20 border border-rose-500/40">
                      <Ban size={14} className="text-rose-400" />
                    </div>
                  )}
                </div>
              </div>
            ))
          )
        ) : (
          // Suspensions tab
          disciplineData?.suspensions?.length === 0 ? (
            <div className="p-8 text-center text-white/40">
              <Ban size={48} className="mx-auto mb-3 opacity-30" />
              <p>Không có cầu thủ bị treo giò</p>
            </div>
          ) : (
            disciplineData?.suspensions?.map((suspension, index) => (
              <div
                key={suspension.suspensionId}
                className="flex items-center gap-4 p-4 hover:bg-white/5 transition bg-rose-500/5"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-xl font-bold bg-rose-500/20 text-rose-400">
                  <Ban size={20} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">
                    {suspension.playerName}
                    {suspension.shirtNumber && (
                      <span className="ml-2 text-sm text-white/60">#{suspension.shirtNumber}</span>
                    )}
                  </p>
                  <p className="text-sm text-white/60 truncate">
                    {suspension.teamName}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                      {suspension.reason === 'RED_CARD' ? 'Thẻ đỏ' :
                       suspension.reason === 'TWO_YELLOW_CARDS' ? '2 thẻ vàng' :
                       suspension.reason}
                    </span>
                    {suspension.triggerMatchInfo && (
                      <span className="text-xs text-white/40">
                        {suspension.triggerMatchInfo}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-semibold text-white">
                    {suspension.matchesBanned} trận
                  </div>
                  <div className="text-xs text-white/60">
                    Đã nghỉ: {suspension.servedMatches}/{suspension.matchesBanned}
                  </div>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
};

export default DisciplinePanel;
