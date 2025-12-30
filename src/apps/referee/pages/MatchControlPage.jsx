import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Clock, Goal, Square, Replace, Users, Eye, FileText,
  Activity, Trash2, AlertCircle, Target, Save, Send
} from 'lucide-react';
import ApiService from '../../../shared/services/ApiService';
import LineupDisplay from '../../admin/components/LineupDisplay';
import toast from 'react-hot-toast';

const MatchControlPage = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('control'); // control, lineups, report
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [matchEvents, setMatchEvents] = useState([]);
  const [matchTime, setMatchTime] = useState(0);

  // Lineup data
  const [homeSquad, setHomeSquad] = useState([]);
  const [awaySquad, setAwaySquad] = useState([]);
  const [homeLineup, setHomeLineup] = useState([]);
  const [awayLineup, setAwayLineup] = useState([]);

  // Event Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [selectedSubstituteId, setSelectedSubstituteId] = useState('');

  // Report
  const [report, setReport] = useState({
    weather: '',
    attendance: '',
    notes: '',
    incidents: ''
  });

  useEffect(() => {
    fetchMatchData();
  }, [matchId]);

  useEffect(() => {
    let interval;
    if (match && ['in_progress', 'live', 'in_play'].includes(match.status?.toLowerCase())) {
      const updateTime = () => {
        const startTime = new Date(match.scheduledKickoff).getTime();
        const now = new Date().getTime();
        const diffMinutes = Math.floor((now - startTime) / 60000);
        setMatchTime(Math.max(0, diffMinutes));
      };
      updateTime();
      interval = setInterval(updateTime, 10000);
    }
    return () => clearInterval(interval);
  }, [match]);

  const fetchMatchData = async () => {
    try {
      setLoading(true);
      const [matchRes, eventsRes] = await Promise.all([
        ApiService.get(`/matches/${matchId}`),
        ApiService.get(`/matches/${matchId}/events`).catch(() => ({ data: [] }))
      ]);

      const matchData = matchRes.data;
      setMatch(matchData);
      setMatchEvents(eventsRes.data || []);

      // Fetch lineups and squads
      try {
        const [homeSquadRes, awaySquadRes, lineupsRes] = await Promise.all([
          ApiService.get(`/teams/${matchData.homeTeamId}/players`).catch(() => ({ data: [] })),
          ApiService.get(`/teams/${matchData.awayTeamId}/players`).catch(() => ({ data: [] })),
          ApiService.get(`/matches/${matchId}/lineups`).catch(() => ({ data: {} }))
        ]);

        setHomeSquad(homeSquadRes.data || []);
        setAwaySquad(awaySquadRes.data || []);

        const lineupsData = lineupsRes.data;
        if (lineupsData.home) setHomeLineup(lineupsData.home);
        if (lineupsData.away) setAwayLineup(lineupsData.away);
      } catch (err) {
        console.error('Error loading lineups:', err);
      }
    } catch (error) {
      console.error('Error fetching match:', error);
      toast.error('Không thể tải thông tin trận đấu');
    } finally {
      setLoading(false);
    }
  };

  const openEventModal = (type, teamId) => {
    setSelectedEventType(type);
    setSelectedTeamId(teamId);
    setSelectedPlayerId('');
    setSelectedSubstituteId('');
    setShowModal(true);
  };

  const submitEvent = async () => {
    if (!selectedPlayerId) {
      toast.error('Vui lòng chọn cầu thủ');
      return;
    }

    if (selectedEventType === 'SUBSTITUTION' && !selectedSubstituteId) {
      toast.error('Vui lòng chọn cầu thủ vào sân');
      return;
    }

    try {
      const payload = {
        matchId: parseInt(matchId),
        teamId: selectedTeamId,
        playerId: parseInt(selectedPlayerId),
        type: selectedEventType,
        minute: matchTime || 0,
      };

      if (selectedEventType === 'SUBSTITUTION') {
        payload.assistPlayerId = parseInt(selectedSubstituteId);
      }

      await ApiService.post(`/matches/${matchId}/events`, payload);
      toast.success('Sự kiện đã được ghi nhận!');
      fetchMatchData();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Không thể lưu sự kiện');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Bạn có chắc muốn xóa sự kiện này?')) return;

    try {
      await ApiService.delete(`/match-events/${eventId}`);
      toast.success('Đã xóa sự kiện');
      fetchMatchData();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Không thể xóa sự kiện');
    }
  };

  const submitReport = async () => {
    try {
      await ApiService.post(`/matches/${matchId}/referee-report`, report);
      await ApiService.post(`/matches/${matchId}/mark-referee-report`);
      toast.success('Báo cáo đã được nộp thành công!');
      navigate('/referee/reports');
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Không thể nộp báo cáo');
    }
  };

  const getActivePlayers = () => {
    let squad = [];
    let lineup = null;

    if (selectedTeamId === match?.homeTeamId) {
      squad = homeSquad;
      lineup = homeLineup;
    } else if (selectedTeamId === match?.awayTeamId) {
      squad = awaySquad;
      lineup = awayLineup;
    }

    if (!lineup || !lineup.starters || lineup.starters.length === 0) {
      return [];
    }

    const starterIds = lineup.starters || [];
    const substitutedOutIds = (matchEvents || [])
      .filter(e => e.type === 'SUBSTITUTION' && Number(e.teamId) === Number(selectedTeamId))
      .map(e => Number(e.playerId));

    const substitutedInIds = (matchEvents || [])
      .filter(e => e.type === 'SUBSTITUTION' && Number(e.teamId) === Number(selectedTeamId))
      .map(e => Number(e.assistPlayerId))
      .filter(id => id);

    const activePlayerIds = [
      ...starterIds.filter(id => !substitutedOutIds.includes(id)),
      ...substitutedInIds
    ];

    return squad.filter(player => activePlayerIds.includes(player.id));
  };

  const getStarters = () => {
    let squad = [];
    let lineup = null;

    if (selectedTeamId === match?.homeTeamId) {
      squad = homeSquad;
      lineup = homeLineup;
    } else {
      squad = awaySquad;
      lineup = awayLineup;
    }

    if (lineup && lineup.starters?.length > 0) {
      const substitutedOutIds = (matchEvents || [])
        .filter(e => e.type === 'SUBSTITUTION' && Number(e.teamId) === Number(selectedTeamId))
        .map(e => Number(e.playerId));

      return squad.filter(player =>
        lineup.starters.includes(player.id) && !substitutedOutIds.includes(player.id)
      );
    }
    return [];
  };

  const getSubstitutes = () => {
    let squad = [];
    let lineup = null;

    if (selectedTeamId === match?.homeTeamId) {
      squad = homeSquad;
      lineup = homeLineup;
    } else {
      squad = awaySquad;
      lineup = awayLineup;
    }

    if (lineup && lineup.substitutes?.length > 0) {
      const substitutedInIds = (matchEvents || [])
        .filter(e => e.type === 'SUBSTITUTION' && Number(e.teamId) === Number(selectedTeamId))
        .map(e => Number(e.assistPlayerId))
        .filter(id => id);

      return squad.filter(player =>
        lineup.substitutes.includes(player.id) && !substitutedInIds.includes(player.id)
      );
    }
    return [];
  };

  if (loading) {
    return <div className="p-8 text-center">Đang tải...</div>;
  }

  if (!match) {
    return <div className="p-8 text-center text-red-500">Không tìm thấy trận đấu</div>;
  }

  const tabs = [
    { id: 'control', label: 'Điều khiển', icon: <Activity size={18} /> },
    { id: 'lineups', label: 'Đội hình', icon: <Users size={18} /> },
    { id: 'report', label: 'Báo cáo', icon: <FileText size={18} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/referee/my-matches')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium"
        >
          <ChevronLeft size={20} />
          Quay lại
        </button>
        <div className="flex gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-yellow-400 text-slate-900 font-bold shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scoreboard */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <div className="text-center flex-1">
            <h2 className="text-2xl font-bold">{match.homeTeamName}</h2>
          </div>
          <div className="text-center px-8">
            <div className="text-6xl font-black font-mono tracking-wider mb-2">
              {match.homeScore ?? 0} - {match.awayScore ?? 0}
            </div>
            <div className="flex items-center justify-center gap-2 text-yellow-400 text-xl font-mono bg-black/30 px-4 py-1 rounded-full">
              <Clock size={20} />
              <span>{matchTime}'</span>
            </div>
          </div>
          <div className="text-center flex-1">
            <h2 className="text-2xl font-bold">{match.awayTeamName}</h2>
          </div>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'control' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Home Controls */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-700 border-b pb-2">{match.homeTeamName}</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => openEventModal('GOAL', match.homeTeamId)}
                className="p-4 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg border border-green-200 flex flex-col items-center gap-2"
              >
                <Goal size={24} /> <span className="font-bold">Bàn thắng</span>
              </button>
              <button
                onClick={() => openEventModal('YELLOW_CARD', match.homeTeamId)}
                className="p-4 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg border border-yellow-200 flex flex-col items-center gap-2"
              >
                <Square fill="currentColor" size={24} /> <span className="font-bold">Thẻ vàng</span>
              </button>
              <button
                onClick={() => openEventModal('RED_CARD', match.homeTeamId)}
                className="p-4 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg border border-red-200 flex flex-col items-center gap-2"
              >
                <Square fill="currentColor" size={24} /> <span className="font-bold">Thẻ đỏ</span>
              </button>
              <button
                onClick={() => openEventModal('SUBSTITUTION', match.homeTeamId)}
                className="p-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 flex flex-col items-center gap-2"
              >
                <Replace size={24} /> <span className="font-bold">Thay người</span>
              </button>
            </div>
          </div>

          {/* Events Feed */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b bg-slate-50 font-semibold">Diễn biến trận đấu</div>
            <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
              {matchEvents.length === 0 ? (
                <div className="text-center text-slate-400 py-8">Chưa có sự kiện</div>
              ) : (
                matchEvents.map(event => (
                  <div key={event.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="font-mono text-sm font-bold w-8">{event.minute}'</div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{event.type.replace('_', ' ')}</div>
                      <div className="text-xs text-slate-500">{event.player || 'Unknown'}</div>
                    </div>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Away Controls */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-700 border-b pb-2 text-right">{match.awayTeamName}</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => openEventModal('GOAL', match.awayTeamId)}
                className="p-4 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg border border-green-200 flex flex-col items-center gap-2"
              >
                <Goal size={24} /> <span className="font-bold">Bàn thắng</span>
              </button>
              <button
                onClick={() => openEventModal('YELLOW_CARD', match.awayTeamId)}
                className="p-4 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg border border-yellow-200 flex flex-col items-center gap-2"
              >
                <Square fill="currentColor" size={24} /> <span className="font-bold">Thẻ vàng</span>
              </button>
              <button
                onClick={() => openEventModal('RED_CARD', match.awayTeamId)}
                className="p-4 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg border border-red-200 flex flex-col items-center gap-2"
              >
                <Square fill="currentColor" size={24} /> <span className="font-bold">Thẻ đỏ</span>
              </button>
              <button
                onClick={() => openEventModal('SUBSTITUTION', match.awayTeamId)}
                className="p-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 flex flex-col items-center gap-2"
              >
                <Replace size={24} /> <span className="font-bold">Thay người</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'lineups' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <LineupDisplay
              lineup={homeLineup}
              squad={homeSquad}
              teamName={match.homeTeamName}
              teamColor="#3b82f6"
              formation={homeLineup?.formation || '4-4-2'}
            />
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <LineupDisplay
              lineup={awayLineup}
              squad={awaySquad}
              teamName={match.awayTeamName}
              teamColor="#ef4444"
              formation={awayLineup?.formation || '4-4-2'}
            />
          </div>
        </div>
      )}

      {activeTab === 'report' && (
        <div className="bg-white rounded-2xl p-8 shadow-sm border max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <FileText size={28} className="text-yellow-500" />
            Báo Cáo Trận Đấu
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Thời tiết</label>
              <input
                type="text"
                value={report.weather}
                onChange={(e) => setReport({ ...report, weather: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-3"
                placeholder="VD: Nắng, 28°C"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Số khán giả</label>
              <input
                type="number"
                value={report.attendance}
                onChange={(e) => setReport({ ...report, attendance: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-3"
                placeholder="VD: 5000"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Ghi chú chung</label>
              <textarea
                value={report.notes}
                onChange={(e) => setReport({ ...report, notes: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-3 h-32"
                placeholder="Ghi chú về trận đấu..."
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Sự cố (nếu có)</label>
              <textarea
                value={report.incidents}
                onChange={(e) => setReport({ ...report, incidents: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-3 h-32"
                placeholder="Ghi nhận sự cố, tranh cãi..."
              />
            </div>
            <button
              onClick={submitReport}
              className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold py-4 rounded-lg transition-colors shadow-md"
            >
              <Send size={20} />
              Nộp Báo Cáo
            </button>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center rounded-t-xl">
              <h3 className="font-bold text-lg">Ghi nhận {selectedEventType?.replace('_', ' ')}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {selectedEventType === 'SUBSTITUTION' ? 'Cầu thủ rời sân' : 'Chọn cầu thủ'}
                </label>
                <select
                  className="w-full border border-slate-300 rounded-lg p-3"
                  value={selectedPlayerId}
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                >
                  <option value="">-- Chọn cầu thủ --</option>
                  {(selectedEventType === 'SUBSTITUTION' ? getStarters() : getActivePlayers()).map(player => (
                    <option key={player.id} value={player.id}>
                      #{player.shirt_number || '?'} - {player.full_name || player.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedEventType === 'SUBSTITUTION' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Cầu thủ vào sân</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg p-3"
                    value={selectedSubstituteId}
                    onChange={(e) => setSelectedSubstituteId(e.target.value)}
                  >
                    <option value="">-- Chọn cầu thủ --</option>
                    {getSubstitutes().map(player => (
                      <option key={player.id} value={player.id}>
                        #{player.shirt_number || '?'} - {player.full_name || player.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  onClick={submitEvent}
                  className="px-6 py-2 bg-yellow-400 hover:bg-yellow-500 text-slate-900 rounded-lg font-bold"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchControlPage;
