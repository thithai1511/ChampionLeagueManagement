import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Users,
  AlertTriangle,
  Award,
  ChevronDown,
  RefreshCw,
  Plus,
  Edit2,
  RotateCcw,
  Trash2,
  AlertCircle,
  CheckCircle,
  Calculator,
  Loader2,
  UserPlus,
  Info,
  Search,
  Crown,
  Ban,
  Target,
  Medal,
  X,
  FileText
} from 'lucide-react';

import StatsService from '../../../layers/application/services/StatsService';
import StandingsAdminService from '../../../layers/application/services/StandingsAdminService';
import SeasonService from '../../../layers/application/services/SeasonService';
import ApiService from '../../../layers/application/services/ApiService';
import SeasonFormModal from '../components/SeasonFormModal';
import TeamStandingsEditor from '../components/TeamStandingsEditor';
import ConfirmationModal from '../components/ConfirmationModal';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api';

// =====================================================================
// TAB CONFIGURATIONS
// =====================================================================
const MAIN_TABS = [
  { id: 'player-stats', label: 'Thống kê cầu thủ', icon: Users },
  { id: 'standings', label: 'Bảng xếp hạng', icon: Trophy },
  { id: 'discipline', label: 'Kỷ luật', icon: AlertTriangle },
  { id: 'awards', label: 'Giải thưởng', icon: Award }
];

const PLAYER_STATS_TABS = [
  { id: 'top-scorers', label: 'Vua phá lưới', icon: Crown, color: 'from-yellow-500 to-orange-500' },
  { id: 'cards', label: 'Thẻ phạt', icon: AlertTriangle, color: 'from-red-500 to-pink-500' },
  { id: 'suspended', label: 'Treo giò', icon: Ban, color: 'from-gray-600 to-gray-800' },
  { id: 'man-of-match', label: 'Cầu thủ xuất sắc', icon: Award, color: 'from-purple-500 to-indigo-500' }
];

const CATEGORY_OPTIONS = [
  { value: 'goals', label: 'Bàn thắng' },
  { value: 'assists', label: 'Kiến tạo' },
  { value: 'clean-sheets', label: 'Sạch lưới' },
  { value: 'minutes', label: 'Thời gian thi đấu' }
];

// =====================================================================
// PLAYER STATS TAB COMPONENTS
// =====================================================================
const TopScorersTab = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <Crown className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">Chưa có dữ liệu vua phá lưới cho mùa giải này</p>
        <p className="text-sm text-gray-400 mt-2">Dữ liệu sẽ được cập nhật sau khi có kết quả trận đấu</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gradient-to-r from-yellow-50 to-orange-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-yellow-700">#</th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-yellow-700">Cầu thủ</th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-yellow-700">Đội</th>
            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-yellow-700">
              <div className="flex items-center justify-center gap-1">
                <Target className="h-4 w-4" />
                Bàn thắng
              </div>
            </th>
            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-yellow-700">Kiến tạo</th>
            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-yellow-700">Trận</th>
            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-yellow-700">TB/Trận</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {data.map((player, index) => (
            <tr key={player.playerId} className={index < 3 ? 'bg-yellow-50/50' : ''}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {index === 0 && <Trophy className="h-5 w-5 text-yellow-500" />}
                  {index === 1 && <Medal className="h-5 w-5 text-gray-400" />}
                  {index === 2 && <Medal className="h-5 w-5 text-amber-600" />}
                  <span className={`font-bold ${index < 3 ? 'text-yellow-700' : 'text-gray-600'}`}>{index + 1}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="font-semibold text-gray-900">{player.playerName}</span>
              </td>
              <td className="px-4 py-3">
                <span className="text-gray-700">{player.teamName}</span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="inline-flex items-center justify-center rounded-full bg-yellow-100 px-3 py-1 font-bold text-yellow-800 text-lg min-w-[40px]">
                  {player.goals}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="text-gray-700 font-medium">{player.assists}</span>
              </td>
              <td className="px-4 py-3 text-center text-gray-600">{player.matchesPlayed}</td>
              <td className="px-4 py-3 text-center">
                <span className="text-sm text-gray-500">{player.goalsPerMatch}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const CardsTab = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">Chưa có dữ liệu thẻ phạt cho mùa giải này</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gradient-to-r from-red-50 to-pink-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-red-700">#</th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-red-700">Cầu thủ</th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-red-700">Đội</th>
            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-yellow-600">
              <div className="flex items-center justify-center gap-1">
                <div className="w-3 h-4 bg-yellow-400 rounded-sm"></div>
                Vàng
              </div>
            </th>
            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-red-600">
              <div className="flex items-center justify-center gap-1">
                <div className="w-3 h-4 bg-red-500 rounded-sm"></div>
                Đỏ
              </div>
            </th>
            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-red-700">Tổng</th>
            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-red-700">Trận</th>
            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-red-700">Trạng thái</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {data.map((player, index) => (
            <tr key={player.playerId} className={player.isSuspended ? 'bg-red-50' : ''}>
              <td className="px-4 py-3 font-semibold text-gray-600">{index + 1}</td>
              <td className="px-4 py-3">
                <span className="font-semibold text-gray-900">{player.playerName}</span>
              </td>
              <td className="px-4 py-3 text-gray-700">{player.teamName}</td>
              <td className="px-4 py-3 text-center">
                <span className="inline-flex items-center justify-center rounded-full bg-yellow-100 px-3 py-1 font-bold text-yellow-800 min-w-[32px]">
                  {player.yellowCards}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="inline-flex items-center justify-center rounded-full bg-red-100 px-3 py-1 font-bold text-red-800 min-w-[32px]">
                  {player.redCards}
                </span>
              </td>
              <td className="px-4 py-3 text-center font-semibold text-gray-800">{player.totalCards}</td>
              <td className="px-4 py-3 text-center text-gray-600">{player.matchesPlayed}</td>
              <td className="px-4 py-3 text-center">
                {player.isSuspended ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                    <Ban className="h-3 w-3" />
                    Treo giò
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const SuspendedTab = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <Ban className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">Không có cầu thủ nào đang bị treo giò</p>
        <p className="text-sm text-gray-400 mt-2">Cầu thủ bị treo giò khi nhận 2 thẻ vàng tích lũy hoặc 1 thẻ đỏ</p>
      </div>
    );
  }

  const getReasonBadge = (reason) => {
    switch (reason) {
      case 'direct_red':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
            <div className="w-2 h-3 bg-red-500 rounded-sm"></div>
            Thẻ đỏ trực tiếp
          </span>
        );
      case 'two_yellows':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
            <div className="w-2 h-3 bg-yellow-400 rounded-sm"></div>
            <div className="w-2 h-3 bg-yellow-400 rounded-sm"></div>
            2 thẻ vàng
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700">
            <div className="w-2 h-3 bg-yellow-400 rounded-sm"></div>
            <div className="w-2 h-3 bg-red-500 rounded-sm"></div>
            Vàng + Đỏ
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Ban className="h-5 w-5 text-red-500 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-800">Quy định treo giò</h4>
            <ul className="mt-2 text-sm text-red-700 space-y-1">
              <li>• Cầu thủ nhận <strong>2 thẻ vàng tích lũy</strong> sẽ bị treo giò 1 trận tiếp theo</li>
              <li>• Cầu thủ nhận <strong>1 thẻ đỏ trực tiếp</strong> sẽ bị treo giò ít nhất 1 trận</li>
              <li>• Sau khi thi đấu trận treo giò, số thẻ vàng tích lũy sẽ được reset</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-700">Cầu thủ</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-700">Đội</th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-gray-700">Lý do</th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-yellow-600">Vàng</th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-red-600">Đỏ</th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-gray-700">Ngày thẻ cuối</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {data.map((player) => (
              <tr key={player.playerId} className="bg-red-50/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Ban className="h-4 w-4 text-red-500" />
                    <span className="font-semibold text-gray-900">{player.playerName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-700">{player.teamName}</td>
                <td className="px-4 py-3 text-center">{getReasonBadge(player.reason)}</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center justify-center rounded bg-yellow-100 px-2 py-0.5 font-bold text-yellow-800">
                    {player.yellowCards}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center justify-center rounded bg-red-100 px-2 py-0.5 font-bold text-red-800">
                    {player.redCards}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-sm text-gray-500">
                  {player.lastCardDate ? new Date(player.lastCardDate).toLocaleDateString('vi-VN') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ManOfMatchTab = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <Award className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">Chưa có dữ liệu cầu thủ xuất sắc</p>
        <p className="text-sm text-gray-400 mt-2">Cầu thủ xuất sắc được bầu chọn sau mỗi trận đấu</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gradient-to-r from-purple-50 to-indigo-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-purple-700">#</th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-purple-700">Cầu thủ</th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-purple-700">Đội</th>
            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-purple-700">
              <div className="flex items-center justify-center gap-1">
                <Award className="h-4 w-4" />
                Số lần
              </div>
            </th>
            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-purple-700">Trận</th>
            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-purple-700">Tỷ lệ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {data.map((player, index) => (
            <tr key={player.playerId} className={index < 3 ? 'bg-purple-50/50' : ''}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {index === 0 && <Award className="h-5 w-5 text-purple-500" />}
                  {index === 1 && <Award className="h-5 w-5 text-gray-400" />}
                  {index === 2 && <Award className="h-5 w-5 text-amber-600" />}
                  <span className={`font-bold ${index < 3 ? 'text-purple-700' : 'text-gray-600'}`}>{index + 1}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="font-semibold text-gray-900">{player.playerName}</span>
              </td>
              <td className="px-4 py-3 text-gray-700">{player.teamName}</td>
              <td className="px-4 py-3 text-center">
                <span className="inline-flex items-center justify-center rounded-full bg-purple-100 px-3 py-1 font-bold text-purple-800 text-lg min-w-[40px]">
                  {player.motmCount}
                </span>
              </td>
              <td className="px-4 py-3 text-center text-gray-600">{player.matchesPlayed}</td>
              <td className="px-4 py-3 text-center">
                <span className="text-sm text-gray-500">
                  {player.matchesPlayed > 0 ? Math.round((player.motmCount / player.matchesPlayed) * 100) : 0}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// =====================================================================
// MAIN STATISTICS PAGE COMPONENT
// =====================================================================
const StatisticsPage = () => {
  // Main tab state
  const [mainTab, setMainTab] = useState('player-stats');
  
  // Season management
  const [seasons, setSeasons] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState(null);
  const [loadingSeasons, setLoadingSeasons] = useState(true);
  
  // Player stats tab states
  const [playerStatsSubTab, setPlayerStatsSubTab] = useState('top-scorers');
  const [topScorers, setTopScorers] = useState([]);
  const [cardStats, setCardStats] = useState([]);
  const [suspendedPlayers, setSuspendedPlayers] = useState([]);
  const [motmStats, setMotmStats] = useState([]);
  const [loadingPlayerStats, setLoadingPlayerStats] = useState(false);
  
  // Standings tab states
  const [standings, setStandings] = useState([]);
  const [standingsMode, setStandingsMode] = useState('live');
  const [loadingStandings, setLoadingStandings] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [showInitModal, setShowInitModal] = useState(false);
  const [showCalculateModal, setShowCalculateModal] = useState(false);
  const [resetTeamId, setResetTeamId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAddTeamsModal, setShowAddTeamsModal] = useState(false);
  const [availableTeams, setAvailableTeams] = useState([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [isAddingTeams, setIsAddingTeams] = useState(false);
  const [participatingTeams, setParticipatingTeams] = useState([]);
  
  // Discipline tab states
  const [cardSummary, setCardSummary] = useState([]);
  const [suspensions, setSuspensions] = useState([]);
  const [loadingDiscipline, setLoadingDiscipline] = useState(false);
  const [disciplineSubTab, setDisciplineSubTab] = useState('cards');
  const [teamFilter, setTeamFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [recalculating, setRecalculating] = useState(false);
  
  // Awards tab states
  const [awardTopScorers, setAwardTopScorers] = useState([]);
  const [topMVPs, setTopMVPs] = useState([]);
  const [loadingAwards, setLoadingAwards] = useState(false);
  const [awardsSubTab, setAwardsSubTab] = useState('scorers');
  
  // General states
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Load seasons on mount
  useEffect(() => {
    loadSeasons();
  }, []);

  // Load data based on main tab and selected season
  useEffect(() => {
    if (!selectedSeasonId) return;
    
    switch (mainTab) {
      case 'player-stats':
        loadPlayerStatsData();
        break;
      case 'standings':
        loadStandingsData();
        break;
      case 'discipline':
        loadDisciplineData();
        break;
      case 'awards':
        loadAwardsData();
        break;
    }
  }, [mainTab, selectedSeasonId, playerStatsSubTab, standingsMode, statusFilter]);

  const loadSeasons = async () => {
    setLoadingSeasons(true);
    setError(null);
    try {
      const data = await SeasonService.listSeasons();
      setSeasons(data || []);
      
      if (data?.length > 0) {
        setSelectedSeasonId(data[0].season_id || data[0].id);
      }
    } catch (err) {
      console.error('Error loading seasons:', err);
      setError('Không thể tải danh sách mùa giải');
    } finally {
      setLoadingSeasons(false);
    }
  };

  const handleSeasonChange = (e) => {
    setSelectedSeasonId(Number(e.target.value));
  };

  // =====================================================================
  // PLAYER STATS FUNCTIONS
  // =====================================================================
  const loadPlayerStatsData = async () => {
    if (!selectedSeasonId) return;
    
    setLoadingPlayerStats(true);
    try {
      switch (playerStatsSubTab) {
        case 'top-scorers':
          const scorers = await StatsService.getTopScorers(selectedSeasonId);
          setTopScorers(scorers);
          break;
        case 'cards':
          const cards = await StatsService.getCardStats(selectedSeasonId);
          setCardStats(cards);
          break;
        case 'suspended':
          const suspended = await StatsService.getSuspendedPlayers(selectedSeasonId);
          setSuspendedPlayers(suspended);
          break;
        case 'man-of-match':
          const motm = await StatsService.getManOfMatchStats(selectedSeasonId);
          setMotmStats(motm);
          break;
      }
    } catch (err) {
      console.error('Error loading player stats:', err);
    } finally {
      setLoadingPlayerStats(false);
    }
  };

  // =====================================================================
  // STANDINGS FUNCTIONS
  // =====================================================================
  const loadStandingsData = async () => {
    if (!selectedSeasonId) return;
    
    setLoadingStandings(true);
    setError(null);
    
    try {
      const response = await StandingsAdminService.getStandingsBySeason(selectedSeasonId, standingsMode);
      setStandings(response.data || []);
    } catch (err) {
      setError('Không thể tải bảng xếp hạng: ' + err.message);
      setStandings([]);
    } finally {
      setLoadingStandings(false);
    }
  };

  const handleInitialize = async () => {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await StandingsAdminService.initializeStandings(selectedSeasonId);
      setSuccess(response.message || 'Khởi tạo thành công!');
      setShowInitModal(false);
      await loadStandingsData();
    } catch (err) {
      setError('Khởi tạo thất bại: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCalculate = async () => {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await StandingsAdminService.calculateStandings(selectedSeasonId);
      setSuccess(response.message || 'Tính toán thành công!');
      setShowCalculateModal(false);
      await loadStandingsData();
    } catch (err) {
      setError('Tính toán thất bại: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateTeam = async (seasonTeamId, updates) => {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await StandingsAdminService.updateTeamStandings(seasonTeamId, updates);
      setSuccess(response.message || 'Cập nhật thành công!');
      setEditingTeam(null);
      await loadStandingsData();
    } catch (err) {
      setError('Cập nhật thất bại: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetTeam = async () => {
    if (!resetTeamId) return;
    
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await StandingsAdminService.resetTeamStandings(resetTeamId);
      setSuccess(response.message || 'Reset thành công!');
      setResetTeamId(null);
      await loadStandingsData();
    } catch (err) {
      setError('Reset thất bại: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const loadParticipatingTeams = async () => {
    if (!selectedSeasonId) return;
    try {
      const response = await ApiService.get(`/seasons/${selectedSeasonId}/participants`);
      setParticipatingTeams(response.data || []);
    } catch (err) {
      console.error('Failed to load participating teams:', err);
    }
  };

  const loadAvailableTeams = async () => {
    setIsLoadingTeams(true);
    try {
      const response = await ApiService.get('/teams?limit=1000');
      const allTeams = response.data || [];
      const participatingIds = new Set(participatingTeams.map(t => t.team_id));
      const available = allTeams.filter(t => !participatingIds.has(t.team_id));
      setAvailableTeams(available);
    } catch (err) {
      setError('Không thể tải danh sách đội: ' + err.message);
    } finally {
      setIsLoadingTeams(false);
    }
  };

  const handleOpenAddTeamsModal = async () => {
    await loadParticipatingTeams();
    setShowAddTeamsModal(true);
    setSelectedTeamIds([]);
    await loadAvailableTeams();
  };

  const handleAddTeamsToSeason = async () => {
    if (selectedTeamIds.length === 0) return;
    
    setIsAddingTeams(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await ApiService.post(`/seasons/${selectedSeasonId}/participants/bulk`, {
        teamIds: selectedTeamIds,
        status: 'active'
      });
      setSuccess(`Đã thêm ${response.data?.addedCount || selectedTeamIds.length} đội vào mùa giải!`);
      setShowAddTeamsModal(false);
      setSelectedTeamIds([]);
      await loadStandingsData();
    } catch (err) {
      setError('Thêm đội thất bại: ' + err.message);
    } finally {
      setIsAddingTeams(false);
    }
  };

  const toggleTeamSelection = (teamId) => {
    setSelectedTeamIds(prev => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const selectAllTeams = () => {
    if (selectedTeamIds.length === availableTeams.length) {
      setSelectedTeamIds([]);
    } else {
      setSelectedTeamIds(availableTeams.map(t => t.team_id));
    }
  };

  const getStatusBadge = (position) => {
    if (position <= 8) {
      return <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded">Qualified</span>;
    } else if (position <= 24) {
      return <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded">Playoff</span>;
    } else {
      return <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded">Eliminated</span>;
    }
  };

  // =====================================================================
  // DISCIPLINE FUNCTIONS
  // =====================================================================
  const loadDisciplineData = async () => {
    if (!selectedSeasonId) return;
    
    setLoadingDiscipline(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        return;
      }
      
      const headers = { Authorization: `Bearer ${token}` };
      
      const suspensionsUrl = statusFilter === 'all' 
        ? `${API_BASE_URL}/seasons/${selectedSeasonId}/discipline/suspensions`
        : `${API_BASE_URL}/seasons/${selectedSeasonId}/discipline/suspensions?status=${statusFilter}`;
      
      const [cardsRes, suspensionsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/seasons/${selectedSeasonId}/discipline/cards`, { headers }),
        axios.get(suspensionsUrl, { headers })
      ]);
      
      setCardSummary(cardsRes.data.data || []);
      setSuspensions(suspensionsRes.data.data || []);
    } catch (err) {
      console.error('Error loading discipline data:', err);
      if (err.response?.status === 401) {
        setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
      } else if (err.response?.status === 403) {
        setError('Bạn không có quyền xem dữ liệu kỷ luật.');
      } else {
        const errorMsg = err.response?.data?.error || err.message || 'Không thể tải dữ liệu kỷ luật';
        setError(errorMsg);
      }
    } finally {
      setLoadingDiscipline(false);
    }
  };

  const handleRecalculate = async () => {
    if (!selectedSeasonId) return;
    
    if (!confirm('Bạn có chắc muốn tính toán lại dữ liệu kỷ luật?')) {
      return;
    }
    
    setRecalculating(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        return;
      }
      
      const response = await axios.post(
        `${API_BASE_URL}/seasons/${selectedSeasonId}/discipline/recalculate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const result = response.data.data || response.data;
      const message = result.errors && result.errors.length > 0
        ? `Hoàn tất với cảnh báo: ${result.created} treo giò mới.`
        : `Hoàn tất! ${result.created} treo giò mới.`;
      
      setSuccess(message);
      await loadDisciplineData();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Không thể tính toán lại';
      setError(errorMsg);
    } finally {
      setRecalculating(false);
    }
  };

  // =====================================================================
  // AWARDS FUNCTIONS
  // =====================================================================
  const loadAwardsData = async () => {
    if (!selectedSeasonId) return;
    
    setLoadingAwards(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [scorersRes, mvpsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/seasons/${selectedSeasonId}/awards/top-scorers?limit=20`, { headers }),
        axios.get(`${API_BASE_URL}/seasons/${selectedSeasonId}/awards/top-mvps?limit=20`, { headers })
      ]);
      
      setAwardTopScorers(scorersRes.data.data || []);
      setTopMVPs(mvpsRes.data.data || []);
    } catch (err) {
      console.error('Error loading awards:', err);
      setError(err.response?.data?.error || 'Không thể tải dữ liệu giải thưởng');
    } finally {
      setLoadingAwards(false);
    }
  };

  // Get unique teams for discipline filter
  const teams = [...new Set(cardSummary.map(c => c.teamName))].sort();
  const filteredCards = teamFilter === 'all' ? cardSummary : cardSummary.filter(c => c.teamName === teamFilter);

  const getReasonText = (reason) => {
    const reasons = {
      'RED_CARD': 'Thẻ đỏ',
      'TWO_YELLOW_CARDS': '2 thẻ vàng',
      'VIOLENT_CONDUCT': 'Hành vi bạo lực',
      'ACCUMULATION': 'Tích lũy',
      'OTHER': 'Khác'
    };
    return reasons[reason] || reason;
  };

  const getDisciplineStatusBadge = (status) => {
    const badges = {
      'active': 'bg-red-100 text-red-700',
      'served': 'bg-gray-100 text-gray-700',
      'cancelled': 'bg-yellow-100 text-yellow-700',
      'archived': 'bg-slate-200 text-slate-600'
    };
    const labels = {
      'active': 'Đang hiệu lực',
      'served': 'Đã thi hành',
      'cancelled': 'Đã hủy',
      'archived': 'Lưu trữ'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status]}`}>
        {labels[status] || status}
      </span>
    );
  };

  const selectedSeason = seasons.find(s => (s.season_id || s.id) === selectedSeasonId);

  // =====================================================================
  // RENDER FUNCTIONS
  // =====================================================================
  const renderPlayerStatsTab = () => (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto pb-px">
          {PLAYER_STATS_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = playerStatsSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setPlayerStatsSubTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all
                  ${isActive 
                    ? `border-transparent bg-gradient-to-r ${tab.color} text-white rounded-t-lg` 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        {playerStatsSubTab === 'top-scorers' && <TopScorersTab data={topScorers} loading={loadingPlayerStats} />}
        {playerStatsSubTab === 'cards' && <CardsTab data={cardStats} loading={loadingPlayerStats} />}
        {playerStatsSubTab === 'suspended' && <SuspendedTab data={suspendedPlayers} loading={loadingPlayerStats} />}
        {playerStatsSubTab === 'man-of-match' && <ManOfMatchTab data={motmStats} loading={loadingPlayerStats} />}
      </div>
    </div>
  );

  const renderStandingsTab = () => (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={standingsMode}
          onChange={(e) => setStandingsMode(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          disabled={!selectedSeasonId}
        >
          <option value="live">Trong Mùa (LIVE)</option>
          <option value="final">Cuối Mùa (FINAL)</option>
        </select>

        <button
          onClick={handleOpenAddTeamsModal}
          disabled={!selectedSeasonId || isProcessing}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          <UserPlus size={18} />
          Thêm Đội
        </button>

        <button
          onClick={() => setShowInitModal(true)}
          disabled={!selectedSeasonId || isProcessing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus size={18} />
          Khởi Tạo
        </button>
        
        <button
          onClick={() => setShowCalculateModal(true)}
          disabled={!selectedSeasonId || isProcessing}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          <Calculator size={18} />
          Tính Toán
        </button>

        <button
          onClick={loadStandingsData}
          disabled={!selectedSeasonId || loadingStandings}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
        >
          <RefreshCw size={18} className={loadingStandings ? 'animate-spin' : ''} />
          Làm Mới
        </button>
      </div>

      {/* Mode Info */}
      {selectedSeasonId && standingsMode === 'final' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Info size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">Chế độ xếp hạng cuối mùa (FINAL)</p>
              <p className="text-amber-700">
                Áp dụng đầy đủ quy tắc phân hạng: Điểm → Hiệu số → Đối đầu trực tiếp (H2H) → Bốc thăm.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Standings Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loadingStandings ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-blue-600" size={32} />
            <span className="ml-3 text-gray-600">Đang tải...</span>
          </div>
        ) : standings.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Trophy size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">Chưa có dữ liệu bảng xếp hạng</p>
            <p className="text-sm text-gray-400 mt-2">Thêm đội vào mùa giải và khởi tạo bảng xếp hạng</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đội</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Trận</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Thắng</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Hòa</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Thua</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Bàn thắng</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Hiệu số</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Điểm</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {standings.map((team, index) => (
                  <tr key={team.seasonTeamId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{team.rank || index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{team.teamName}</div>
                      {team.shortName && <div className="text-sm text-gray-500">{team.shortName}</div>}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">{team.played || team.matchesPlayed}</td>
                    <td className="px-4 py-3 text-center text-sm">{team.wins}</td>
                    <td className="px-4 py-3 text-center text-sm">{team.draws}</td>
                    <td className="px-4 py-3 text-center text-sm">{team.losses}</td>
                    <td className="px-4 py-3 text-center text-sm">{team.goalsFor}:{team.goalsAgainst}</td>
                    <td className="px-4 py-3 text-center text-sm font-medium">
                      {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold">{team.points}</td>
                    <td className="px-4 py-3 text-center">{getStatusBadge(team.rank || index + 1)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setEditingTeam(team)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Chỉnh sửa"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setResetTeamId(team.seasonTeamId)}
                          className="text-red-600 hover:text-red-900"
                          title="Reset"
                        >
                          <RotateCcw size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderDisciplineTab = () => (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleRecalculate}
          disabled={recalculating || !selectedSeasonId}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {recalculating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang tính...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Tính lại kỷ luật
            </>
          )}
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setDisciplineSubTab('cards')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                disciplineSubTab === 'cards'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Thống kê thẻ phạt
              </div>
            </button>
            <button
              onClick={() => setDisciplineSubTab('suspensions')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                disciplineSubTab === 'suspensions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Ban className="w-4 h-4" />
                Danh sách treo giò
                {suspensions.filter(s => s.status === 'active').length > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                    {suspensions.filter(s => s.status === 'active').length}
                  </span>
                )}
              </div>
            </button>
          </nav>
        </div>

        {loadingDiscipline ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
            <p className="text-gray-600">Đang tải dữ liệu...</p>
          </div>
        ) : (
          <>
            {/* Cards Tab */}
            {disciplineSubTab === 'cards' && (
              <div className="p-6">
                <div className="mb-4">
                  <select
                    value={teamFilter}
                    onChange={(e) => setTeamFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="all">Tất cả đội</option>
                    {teams.map(team => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
                </div>

                {filteredCards.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Chưa có dữ liệu thẻ phạt</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Cầu thủ</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Đội bóng</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Số áo</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-yellow-600">
                            <div className="flex items-center justify-center gap-1">
                              <div className="w-4 h-6 bg-yellow-400 rounded-sm border border-gray-300"></div>
                              Vàng
                            </div>
                          </th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-red-600">
                            <div className="flex items-center justify-center gap-1">
                              <div className="w-4 h-6 bg-red-500 rounded-sm border border-gray-300"></div>
                              Đỏ
                            </div>
                          </th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Trận đấu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCards.map((card) => (
                          <tr key={card.seasonPlayerId} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium text-gray-800">{card.playerName}</td>
                            <td className="py-3 px-4 text-gray-700">{card.teamName}</td>
                            <td className="py-3 px-4 text-center text-gray-700">{card.shirtNumber || '-'}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-semibold ${
                                card.yellowCards >= 2 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {card.yellowCards}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-semibold ${
                                card.redCards > 0 ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {card.redCards}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center text-gray-700">{card.matchesPlayed}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Suspensions Tab */}
            {disciplineSubTab === 'suspensions' && (
              <div className="p-6">
                <div className="mb-4">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="all">Tất cả</option>
                    <option value="active">Đang hiệu lực</option>
                    <option value="served">Đã thi hành</option>
                    <option value="cancelled">Đã hủy</option>
                    <option value="archived">Lưu trữ</option>
                  </select>
                </div>

                {suspensions.length === 0 ? (
                  <div className="text-center py-12">
                    <Ban className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Chưa có dữ liệu treo giò</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Cầu thủ</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Đội bóng</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Lý do</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Trận bị cấm</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Số trận</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {suspensions.map((suspension) => (
                          <tr key={suspension.suspensionId} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="font-medium text-gray-800">{suspension.playerName}</div>
                              {suspension.shirtNumber && <div className="text-xs text-gray-500">#{suspension.shirtNumber}</div>}
                            </td>
                            <td className="py-3 px-4 text-gray-700">{suspension.teamName}</td>
                            <td className="py-3 px-4 text-sm text-gray-700">{getReasonText(suspension.reason)}</td>
                            <td className="py-3 px-4 text-sm text-gray-700">
                              {suspension.startMatchInfo || <span className="text-gray-400">Chưa xác định</span>}
                            </td>
                            <td className="py-3 px-4 text-center text-sm font-medium">
                              {suspension.servedMatches}/{suspension.matchesBanned}
                            </td>
                            <td className="py-3 px-4 text-center">{getDisciplineStatusBadge(suspension.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  const renderAwardsTab = () => (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setAwardsSubTab('scorers')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                awardsSubTab === 'scorers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4" />
                Vua phá lưới
              </div>
            </button>
            <button
              onClick={() => setAwardsSubTab('mvps')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                awardsSubTab === 'mvps'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Cầu thủ xuất sắc
              </div>
            </button>
          </nav>
        </div>

        {loadingAwards ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
            <p className="text-gray-600">Đang tải dữ liệu...</p>
          </div>
        ) : (
          <>
            {/* Top Scorers Tab */}
            {awardsSubTab === 'scorers' && (
              <div className="p-6">
                {awardTopScorers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Chưa có dữ liệu bàn thắng</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Hạng</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Cầu thủ</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Đội bóng</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Số áo</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Bàn thắng</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Trận đấu</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">TB/trận</th>
                        </tr>
                      </thead>
                      <tbody>
                        {awardTopScorers.map((scorer) => (
                          <tr key={scorer.seasonPlayerId} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                {scorer.rank === 1 && <Trophy className="w-5 h-5 text-yellow-500" />}
                                {scorer.rank === 2 && <Trophy className="w-5 h-5 text-gray-400" />}
                                {scorer.rank === 3 && <Trophy className="w-5 h-5 text-orange-600" />}
                                <span className="font-semibold text-gray-800">#{scorer.rank}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-gray-800">{scorer.playerName}</div>
                              {scorer.nationality && <div className="text-xs text-gray-500">{scorer.nationality}</div>}
                            </td>
                            <td className="py-3 px-4 text-gray-700">{scorer.teamName}</td>
                            <td className="py-3 px-4 text-center text-gray-700">{scorer.shirtNumber || '-'}</td>
                            <td className="py-3 px-4 text-center">
                              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold">
                                {scorer.goals}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center text-gray-700">{scorer.matchesPlayed}</td>
                            <td className="py-3 px-4 text-center text-gray-700">
                              {scorer.matchesPlayed > 0 ? (scorer.goals / scorer.matchesPlayed).toFixed(2) : '0.00'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Top MVPs Tab */}
            {awardsSubTab === 'mvps' && (
              <div className="p-6">
                {topMVPs.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Chưa có dữ liệu MVP</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Hạng</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Cầu thủ</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Đội bóng</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Số áo</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Số lần MVP</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Trận đấu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topMVPs.map((mvp) => (
                          <tr key={mvp.seasonPlayerId} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                {mvp.rank === 1 && <Trophy className="w-5 h-5 text-yellow-500" />}
                                {mvp.rank === 2 && <Trophy className="w-5 h-5 text-gray-400" />}
                                {mvp.rank === 3 && <Trophy className="w-5 h-5 text-orange-600" />}
                                <span className="font-semibold text-gray-800">#{mvp.rank}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-gray-800">{mvp.playerName}</div>
                              {mvp.nationality && <div className="text-xs text-gray-500">{mvp.nationality}</div>}
                            </td>
                            <td className="py-3 px-4 text-gray-700">{mvp.teamName}</td>
                            <td className="py-3 px-4 text-center text-gray-700">{mvp.shirtNumber || '-'}</td>
                            <td className="py-3 px-4 text-center">
                              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold">
                                {mvp.mvpCount}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center text-gray-700">{mvp.matchesPlayed}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="h-7 w-7 text-yellow-500" />
            Thống kê tổng hợp
          </h1>
          <p className="text-gray-500 mt-1">
            Thống kê cầu thủ, bảng xếp hạng, kỷ luật và giải thưởng
          </p>
        </div>
        
        {/* Season Selector */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              className="appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2 pr-10 text-sm font-medium shadow-sm hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={selectedSeasonId || ''}
              onChange={handleSeasonChange}
              disabled={loadingSeasons}
            >
              {loadingSeasons ? (
                <option value="">Đang tải...</option>
              ) : (
                <>
                  <option value="">-- Chọn mùa giải --</option>
                  {seasons.map((season) => (
                    <option key={season.season_id || season.id} value={season.season_id || season.id}>
                      {season.name} {season.startDate ? `(${new Date(season.startDate).getFullYear()})` : ''}
                    </option>
                  ))}
                </>
              )}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle size={20} />
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto">
          {MAIN_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = mainTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setMainTab(tab.id)}
                className={`
                  flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all
                  ${isActive 
                    ? 'border-blue-500 text-blue-600 bg-blue-50' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {mainTab === 'player-stats' && renderPlayerStatsTab()}
        {mainTab === 'standings' && renderStandingsTab()}
        {mainTab === 'discipline' && renderDisciplineTab()}
        {mainTab === 'awards' && renderAwardsTab()}
      </div>

      {/* Modals */}
      {editingTeam && (
        <TeamStandingsEditor
          team={editingTeam}
          onSave={handleUpdateTeam}
          onCancel={() => setEditingTeam(null)}
          isProcessing={isProcessing}
        />
      )}

      <ConfirmationModal
        isOpen={showInitModal}
        title="Khởi Tạo Bảng Xếp Hạng"
        message="Bạn có chắc chắn muốn khởi tạo bảng xếp hạng cho mùa giải này?"
        onConfirm={handleInitialize}
        onCancel={() => setShowInitModal(false)}
        confirmText="Khởi Tạo"
        confirmButtonClass="bg-blue-600 hover:bg-blue-700"
        isProcessing={isProcessing}
      />

      <ConfirmationModal
        isOpen={showCalculateModal}
        title="Tính Toán Bảng Xếp Hạng"
        message="Bạn có chắc chắn muốn tính toán lại bảng xếp hạng từ kết quả trận đấu?"
        onConfirm={handleCalculate}
        onCancel={() => setShowCalculateModal(false)}
        confirmText="Tính Toán"
        confirmButtonClass="bg-green-600 hover:bg-green-700"
        isProcessing={isProcessing}
      />

      <ConfirmationModal
        isOpen={Boolean(resetTeamId)}
        title="Reset Bảng Xếp Hạng"
        message="Bạn có chắc chắn muốn reset bảng xếp hạng của đội này về 0?"
        onConfirm={handleResetTeam}
        onCancel={() => setResetTeamId(null)}
        confirmText="Reset"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
        isProcessing={isProcessing}
      />

      {/* Add Teams Modal */}
      {showAddTeamsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowAddTeamsModal(false)} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Users size={20} className="text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Thêm Đội Vào Mùa Giải</h3>
                    <p className="text-sm text-gray-500">Chọn các đội để thêm vào mùa giải</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddTeamsModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[50vh]">
                {isLoadingTeams ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-indigo-600" size={32} />
                    <span className="ml-3 text-gray-600">Đang tải danh sách đội...</span>
                  </div>
                ) : availableTeams.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users size={48} className="mx-auto mb-4 text-gray-400" />
                    <p className="font-medium">Không có đội nào có thể thêm</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTeamIds.length === availableTeams.length}
                          onChange={selectAllTeams}
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <span className="font-medium text-gray-700">
                          Chọn tất cả ({availableTeams.length} đội)
                        </span>
                      </label>
                      <span className="text-sm text-indigo-600 font-medium">
                        Đã chọn: {selectedTeamIds.length}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {availableTeams.map(team => (
                        <label
                          key={team.team_id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedTeamIds.includes(team.team_id)
                              ? 'bg-indigo-50 border-indigo-300'
                              : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedTeamIds.includes(team.team_id)}
                            onChange={() => toggleTeamSelection(team.team_id)}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{team.name}</p>
                            {team.short_name && <p className="text-sm text-gray-500">{team.short_name}</p>}
                          </div>
                          {team.country && (
                            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                              {team.country}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setShowAddTeamsModal(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleAddTeamsToSeason}
                  disabled={selectedTeamIds.length === 0 || isAddingTeams}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isAddingTeams ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Đang thêm...
                    </>
                  ) : (
                    <>
                      <UserPlus size={18} />
                      Thêm {selectedTeamIds.length} Đội
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatisticsPage;





