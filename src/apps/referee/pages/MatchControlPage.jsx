import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Clock, Goal, Square, Replace, Users, Eye, FileText,
  Activity, Trash2, AlertCircle, Target, Save, Send, Award, Star, 
  Shield, Plus, X, Download, Printer, CheckCircle
} from 'lucide-react';
import ApiService from '@/layers/application/services/ApiService';
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

  // Report - Enhanced with MVP, goals, cards details
  const [report, setReport] = useState({
    weather: '',
    attendance: '',
    notes: '',
    incidents: '',
    mvpPlayerId: '',
    mvpTeamId: '',
    matchSummary: ''
  });

  // Goals and Cards lists (from match events)
  const [goalScorers, setGoalScorers] = useState([]);
  const [cardRecipients, setCardRecipients] = useState([]);

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
      const events = eventsRes.data || [];
      setMatchEvents(events);

      // Extract goals and cards from events
      const goals = events.filter(e => e.type === 'GOAL' || e.event_type === 'GOAL');
      const cards = events.filter(e => 
        ['YELLOW_CARD', 'RED_CARD', 'SECOND_YELLOW'].includes(e.type) ||
        ['YELLOW_CARD', 'RED_CARD', 'SECOND_YELLOW'].includes(e.event_type)
      );
      setGoalScorers(goals);
      setCardRecipients(cards);

      // Fetch lineups and squads
      try {
        const [homeSquadRes, awaySquadRes, lineupsRes] = await Promise.all([
          ApiService.get(`/teams/${matchData.homeTeamId}/players`).catch(() => ({ data: [] })),
          ApiService.get(`/teams/${matchData.awayTeamId}/players`).catch(() => ({ data: [] })),
          ApiService.get(`/matches/${matchId}/lineups`).catch(() => ({ data: {} }))
        ]);

        setHomeSquad(homeSquadRes.data || []);
        setAwaySquad(awaySquadRes.data || []);

        // Process lineups - API returns array of lineup items
        const lineupsArray = Array.isArray(lineupsRes.data) ? lineupsRes.data : [];
        
        // Get match season team IDs
        const homeSeasonTeamId = matchData.homeSeasonTeamId;
        const awaySeasonTeamId = matchData.awaySeasonTeamId;

        // Process home lineup
        if (homeSeasonTeamId) {
          const homeLineupItems = lineupsArray.filter(l => 
            Number(l.seasonTeamId) === Number(homeSeasonTeamId)
          );
          
          const homeStarters = homeLineupItems.filter(l => l.isStarting).map(l => l.playerId);
          const homeSubstitutes = homeLineupItems.filter(l => !l.isStarting).map(l => l.playerId);
          
          // Build players array from lineup items
          const homePlayers = homeLineupItems.map(l => ({
            id: l.playerId,
            player_id: l.playerId,
            full_name: l.playerName || 'Unknown',
            name: l.playerName || 'Unknown',
            shirt_number: l.jerseyNumber,
            jerseyNumber: l.jerseyNumber,
            position: l.position,
            isStarting: l.isStarting
          }));

          setHomeLineup({
            starters: homeStarters,
            substitutes: homeSubstitutes,
            players: homePlayers,
            formation: '4-4-2' // Default, can be enhanced later
          });
          console.log('[fetchMatchData] Home lineup set:', homePlayers.length, 'players');
        }

        // Process away lineup
        if (awaySeasonTeamId) {
          const awayLineupItems = lineupsArray.filter(l => 
            Number(l.seasonTeamId) === Number(awaySeasonTeamId)
          );
          
          const awayStarters = awayLineupItems.filter(l => l.isStarting).map(l => l.playerId);
          const awaySubstitutes = awayLineupItems.filter(l => !l.isStarting).map(l => l.playerId);
          
          // Build players array from lineup items
          const awayPlayers = awayLineupItems.map(l => ({
            id: l.playerId,
            player_id: l.playerId,
            full_name: l.playerName || 'Unknown',
            name: l.playerName || 'Unknown',
            shirt_number: l.jerseyNumber,
            jerseyNumber: l.jerseyNumber,
            position: l.position,
            isStarting: l.isStarting
          }));

          setAwayLineup({
            starters: awayStarters,
            substitutes: awaySubstitutes,
            players: awayPlayers,
            formation: '4-4-2' // Default, can be enhanced later
          });
          console.log('[fetchMatchData] Away lineup set:', awayPlayers.length, 'players');
        }
        
        // Debug log final lineups
        console.log('[fetchMatchData] Match IDs:', {
          homeTeamId: matchData.homeTeamId,
          awayTeamId: matchData.awayTeamId,
          homeSeasonTeamId,
          awaySeasonTeamId
        });
        console.log('[fetchMatchData] Lineups from API:', lineupsArray.length, 'items');
      } catch (err) {
        console.error('Error loading lineups:', err);
        // Don't show toast error for squad permission issues
        if (!err?.response?.status === 403) {
          toast.error('Không thể tải đội hình');
        }
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

  // Report submission state
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const matchSheetRef = useRef(null);

  // Print/Export functionality
  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    toast.loading('Đang tạo PDF...', { id: 'export-pdf' });
    setTimeout(() => {
      window.print();
      toast.success('Mở hộp thoại in để lưu PDF', { id: 'export-pdf' });
    }, 500);
  };

  const submitReport = async () => {
    console.log('[submitReport] Called with report:', report);
    console.log('[submitReport] mvpPlayerId:', report.mvpPlayerId, 'matchSummary:', report.matchSummary);
    
    if (!report.mvpPlayerId) {
      console.log('[submitReport] FAILED: No MVP selected');
      toast.error('Vui lòng chọn cầu thủ xuất sắc nhất (MVP)');
      return;
    }
    if (!report.matchSummary) {
      console.log('[submitReport] FAILED: No matchSummary');
      toast.error('Vui lòng nhập tóm tắt trận đấu');
      return;
    }
    
    console.log('[submitReport] Validation passed, submitting...');

    setReportSubmitting(true);
    try {
      // Find MVP player name
      let mvpPlayerName = '';
      let mvpTeamName = '';
      if (report.mvpPlayerId && report.mvpTeamId) {
        const mvpPlayers = getAllPlayersFromLineup(report.mvpTeamId);
        const mvpPlayer = mvpPlayers.find(p => p.id === parseInt(report.mvpPlayerId));
        mvpPlayerName = mvpPlayer?.full_name || mvpPlayer?.name || '';
        mvpTeamName = Number(report.mvpTeamId) === Number(match?.homeTeamId)
          ? match?.homeTeamName 
          : match?.awayTeamName;
      }

      const enhancedReport = {
        ...report,
        mvpPlayerName,
        mvpTeamName,
        homeScore: match?.homeScore ?? 0,
        awayScore: match?.awayScore ?? 0,
        goalDetails: JSON.stringify(goalScorers.map(g => ({
          playerId: g.playerId || g.player_id,
          playerName: g.player || g.player_name,
          minute: g.minute || g.event_minute,
          teamId: g.teamId || g.team_id
        }))),
        cardDetails: JSON.stringify(cardRecipients.map(c => ({
          playerId: c.playerId || c.player_id,
          playerName: c.player || c.player_name,
          cardType: c.type || c.event_type || c.card_type,
          minute: c.minute || c.event_minute,
          teamId: c.teamId || c.team_id
        }))),
        totalYellowCards: cardRecipients.filter(c => 
          (c.type || c.event_type) === 'YELLOW_CARD'
        ).length,
        totalRedCards: cardRecipients.filter(c => 
          ['RED_CARD', 'SECOND_YELLOW'].includes(c.type || c.event_type)
        ).length
      };

      await ApiService.post(`/matches/${matchId}/referee-report`, enhancedReport);
      await ApiService.post(`/matches/${matchId}/mark-referee-report`);
      
      // Send notification to admin
      try {
        await ApiService.post('/notifications/send', {
          type: 'REFEREE_REPORT_SUBMITTED',
          matchId: parseInt(matchId),
          message: `Trọng tài đã gửi báo cáo trận ${match?.homeTeamName} vs ${match?.awayTeamName}`,
          targetRole: 'super_admin'
        });
      } catch (notifError) {
        console.log('Notification not sent:', notifError);
      }

      toast.success('Báo cáo đã được gửi cho Admin!');
      setReportSubmitted(true);
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error(error.response?.data?.error || 'Không thể nộp báo cáo');
    } finally {
      setReportSubmitting(false);
    }
  };

  // Get all players from lineup (for MVP selection)
  // teamId can be either team_id or 'home'/'away' string
  const getAllPlayersFromLineup = (teamIdOrType) => {
    let lineup = null;
    let squad = [];
    
    // Support both team ID and 'home'/'away' type
    const isHome = 
      teamIdOrType === 'home' || 
      Number(teamIdOrType) === Number(match?.homeTeamId) ||
      Number(teamIdOrType) === Number(match?.homeSeasonTeamId);
    const isAway = 
      teamIdOrType === 'away' || 
      Number(teamIdOrType) === Number(match?.awayTeamId) ||
      Number(teamIdOrType) === Number(match?.awaySeasonTeamId);

    if (isHome) {
      lineup = homeLineup;
      squad = homeSquad;
    } else if (isAway) {
      lineup = awayLineup;
      squad = awaySquad;
    }

    // Debug log
    console.log('[getAllPlayersFromLineup] teamIdOrType:', teamIdOrType, 'isHome:', isHome, 'isAway:', isAway, 'lineup:', lineup);

    // If lineup has players array, use it (preferred)
    if (lineup?.players && Array.isArray(lineup.players) && lineup.players.length > 0) {
      return lineup.players.map(p => ({
        id: p.id || p.player_id,
        full_name: p.full_name || p.name || p.playerName || 'Unknown',
        name: p.name || p.full_name || p.playerName || 'Unknown',
        shirt_number: p.shirt_number || p.jerseyNumber || p.shirtNumber,
        position: p.position
      }));
    }

    // Otherwise, build from starters and substitutes
    if (lineup && (lineup.starters || lineup.substitutes)) {
      const allPlayerIds = [
        ...(Array.isArray(lineup.starters) ? lineup.starters : []),
        ...(Array.isArray(lineup.substitutes) ? lineup.substitutes : [])
      ];
      
      if (allPlayerIds.length > 0 && squad.length > 0) {
        return squad.filter(p => allPlayerIds.includes(Number(p.id))).map(p => ({
          id: p.id,
          full_name: p.full_name || p.name || 'Unknown',
          name: p.name || p.full_name || 'Unknown',
          shirt_number: p.shirt_number || p.jerseyNumber,
          position: p.position
        }));
      }
    }

    // Fallback to squad (if no lineup data)
    if (squad && squad.length > 0) {
      return squad.map(p => ({
        id: p.id,
        full_name: p.full_name || p.name || 'Unknown',
        name: p.name || p.full_name || 'Unknown',
        shirt_number: p.shirt_number || p.jerseyNumber,
        position: p.position
      }));
    }

    // Return empty array if no data
    return [];
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
      // Fallback to all squad players
      return squad.map(p => ({
        id: p.id,
        full_name: p.full_name || p.name,
        name: p.name || p.full_name,
        shirt_number: p.shirt_number || p.jerseyNumber,
        position: p.position
      }));
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

    return squad.filter(player => activePlayerIds.includes(player.id)).map(p => ({
      id: p.id,
      full_name: p.full_name || p.name,
      name: p.name || p.full_name,
      shirt_number: p.shirt_number || p.jerseyNumber,
      position: p.position
    }));
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
      ).map(p => ({
        id: p.id,
        full_name: p.full_name || p.name,
        name: p.name || p.full_name,
        shirt_number: p.shirt_number || p.jerseyNumber,
        position: p.position
      }));
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
      ).map(p => ({
        id: p.id,
        full_name: p.full_name || p.name,
        name: p.name || p.full_name,
        shirt_number: p.shirt_number || p.jerseyNumber,
        position: p.position
      }));
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
        <div className="bg-white rounded-2xl p-8 shadow-sm border max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <FileText size={28} className="text-yellow-500" />
            Báo Cáo Trận Đấu - Trọng Tài
          </h2>

          {/* Match Score Summary */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-6 mb-6 text-white">
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-sm text-slate-300 mb-1">Đội nhà</p>
                <p className="text-xl font-bold">{match?.homeTeamName}</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-black font-mono">
                  {match?.homeScore ?? 0} - {match?.awayScore ?? 0}
                </p>
                <p className="text-xs text-slate-400 mt-1">Tỷ số cuối cùng</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-300 mb-1">Đội khách</p>
                <p className="text-xl font-bold">{match?.awayTeamName}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* MVP Selection */}
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-5 border-2 border-yellow-200">
                <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <Award className="text-yellow-500" size={20} />
                  Cầu Thủ Xuất Sắc Nhất (MVP) *
                </label>
                <div className="space-y-3">
                  <select
                    value={report.mvpTeamId || ''}
                    onChange={(e) => {
                      const teamId = e.target.value;
                      setReport({ ...report, mvpTeamId: teamId, mvpPlayerId: '' });
                    }}
                    className="w-full border border-yellow-300 rounded-lg p-3 bg-white focus:ring-2 focus:ring-yellow-400"
                    disabled={reportSubmitted}
                  >
                    <option value="">-- Chọn đội --</option>
                    {match?.homeTeamId && (
                      <option value={String(match.homeTeamId)}>{match.homeTeamName}</option>
                    )}
                    {match?.awayTeamId && (
                      <option value={String(match.awayTeamId)}>{match.awayTeamName}</option>
                    )}
                  </select>
                  {report.mvpTeamId && (
                    <select
                      value={report.mvpPlayerId || ''}
                      onChange={(e) => setReport({ ...report, mvpPlayerId: e.target.value })}
                      className="w-full border border-yellow-300 rounded-lg p-3 bg-white focus:ring-2 focus:ring-yellow-400"
                      disabled={reportSubmitted}
                    >
                      <option value="">-- Chọn cầu thủ --</option>
                      {getAllPlayersFromLineup(report.mvpTeamId).map(player => (
                        <option key={player.id} value={String(player.id)}>
                          #{player.shirt_number || '?'} - {player.full_name || player.name}
                          {player.position ? ` (${player.position})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  {report.mvpTeamId && getAllPlayersFromLineup(report.mvpTeamId).length === 0 && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-xs text-orange-600 font-medium">
                        ⚠️ Chưa có dữ liệu cầu thủ cho đội này.
                      </p>
                      <p className="text-xs text-orange-500 mt-1">
                        Vui lòng đảm bảo đội hình đã được đăng ký trong tab "Đội hình".
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Goals Summary */}
              <div className="bg-green-50 rounded-xl p-5 border-2 border-green-200">
                <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <Goal className="text-green-600" size={20} />
                  Danh Sách Ghi Bàn ({goalScorers.length} bàn)
                </label>
                {goalScorers.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">Chưa có bàn thắng nào</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {goalScorers.map((goal, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-green-200">
                        <span className="font-medium text-sm">{goal.player || goal.player_name || 'Unknown'}</span>
                        <span className="text-xs text-green-600 font-bold">{goal.minute || goal.event_minute}'</span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-2">* Ghi bàn được nhập từ tab Điều khiển</p>
              </div>

              {/* Cards Summary */}
              <div className="bg-red-50 rounded-xl p-5 border-2 border-red-200">
                <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <Square fill="currentColor" className="text-red-600" size={18} />
                  Thẻ Phạt ({cardRecipients.length} thẻ)
                </label>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-yellow-100 rounded-lg p-3 text-center border border-yellow-300">
                    <p className="text-2xl font-bold text-yellow-700">
                      {cardRecipients.filter(c => (c.type || c.event_type) === 'YELLOW_CARD').length}
                    </p>
                    <p className="text-xs text-yellow-600">Thẻ Vàng</p>
                  </div>
                  <div className="bg-red-100 rounded-lg p-3 text-center border border-red-300">
                    <p className="text-2xl font-bold text-red-700">
                      {cardRecipients.filter(c => ['RED_CARD', 'SECOND_YELLOW'].includes(c.type || c.event_type)).length}
                    </p>
                    <p className="text-xs text-red-600">Thẻ Đỏ</p>
                  </div>
                </div>
                {cardRecipients.length > 0 && (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {cardRecipients.map((card, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-red-200">
                        <span className="font-medium text-sm">{card.player || card.player_name || 'Unknown'}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-1 rounded ${
                            (card.type || card.event_type) === 'YELLOW_CARD' 
                              ? 'bg-yellow-200 text-yellow-700' 
                              : 'bg-red-200 text-red-700'
                          }`}>
                            {(card.type || card.event_type) === 'YELLOW_CARD' ? 'Vàng' : 'Đỏ'}
                          </span>
                          <span className="text-xs text-slate-600">{card.minute || card.event_minute}'</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-2">* Thẻ phạt được nhập từ tab Điều khiển</p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Match Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Thời tiết</label>
                  <input
                    type="text"
                    value={report.weather}
                    onChange={(e) => setReport({ ...report, weather: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-yellow-400"
                    placeholder="VD: Nắng, 28°C"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Số khán giả</label>
                  <input
                    type="number"
                    value={report.attendance}
                    onChange={(e) => setReport({ ...report, attendance: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-yellow-400"
                    placeholder="VD: 5000"
                  />
                </div>
              </div>

              {/* Match Summary */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Activity size={18} className="text-blue-500" />
                  Tóm tắt trận đấu *
                </label>
                <textarea
                  value={report.matchSummary}
                  onChange={(e) => setReport({ ...report, matchSummary: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-3 h-24 focus:ring-2 focus:ring-yellow-400"
                  placeholder="Mô tả diễn biến chính của trận đấu..."
                />
              </div>

              {/* General Notes */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Ghi chú chuyên môn</label>
                <textarea
                  value={report.notes}
                  onChange={(e) => setReport({ ...report, notes: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-3 h-24 focus:ring-2 focus:ring-yellow-400"
                  placeholder="Ghi chú kỹ thuật, chiến thuật..."
                />
              </div>

              {/* Incidents */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <AlertCircle size={18} className="text-orange-500" />
                  Sự cố / Vấn đề cần báo cáo
                </label>
                <textarea
                  value={report.incidents}
                  onChange={(e) => setReport({ ...report, incidents: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-3 h-24 focus:ring-2 focus:ring-yellow-400"
                  placeholder="Ghi nhận sự cố, tranh cãi, hành vi phi thể thao..."
                />
              </div>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="mt-6 flex gap-3 print:hidden">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl transition-all"
            >
              <Printer size={18} />
              In báo cáo
            </button>
            <button
              onClick={handleExportPDF}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-3 rounded-xl transition-all"
            >
              <Download size={18} />
              Xuất PDF
            </button>
          </div>

          {/* Submit Button */}
          <div className="mt-4 pt-6 border-t border-slate-200">
            {!reportSubmitted ? (
              <button
                onClick={submitReport}
                disabled={reportSubmitting || !report.mvpPlayerId}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 disabled:from-slate-300 disabled:to-slate-400 text-slate-900 disabled:text-slate-600 font-bold py-4 rounded-xl transition-all shadow-lg"
              >
                {reportSubmitting ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-slate-900 border-t-transparent rounded-full"></div>
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    Gửi Báo Cáo Cho Admin
                  </>
                )}
              </button>
            ) : (
              <div className="text-center py-4 bg-green-50 rounded-xl border-2 border-green-200">
                <CheckCircle size={32} className="mx-auto text-green-500 mb-2" />
                <p className="font-bold text-green-700">Báo cáo đã được gửi thành công!</p>
                <p className="text-sm text-green-600 mt-1">Admin sẽ xem xét và phản hồi</p>
                <button
                  onClick={() => navigate('/referee/reports')}
                  className="mt-4 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  Xem danh sách báo cáo
                </button>
              </div>
            )}
            {!report.mvpPlayerId && !reportSubmitted && (
              <p className="text-center text-sm text-orange-500 mt-2">* Vui lòng chọn Cầu thủ xuất sắc nhất (MVP) để gửi báo cáo</p>
            )}
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
                    <option key={player.id} value={String(player.id)}>
                      #{player.shirt_number || '?'} - {player.full_name || player.name}
                      {player.position ? ` (${player.position})` : ''}
                    </option>
                  ))}
                </select>
                {(selectedEventType === 'SUBSTITUTION' ? getStarters() : getActivePlayers()).length === 0 && (
                  <p className="text-xs text-orange-500 mt-1">
                    ⚠️ Chưa có cầu thủ. Vui lòng đảm bảo đội hình đã được đăng ký.
                  </p>
                )}
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
                      <option key={player.id} value={String(player.id)}>
                        #{player.shirt_number || '?'} - {player.full_name || player.name}
                        {player.position ? ` (${player.position})` : ''}
                      </option>
                    ))}
                  </select>
                  {getSubstitutes().length === 0 && (
                    <p className="text-xs text-orange-500 mt-1">
                      ⚠️ Không còn cầu thủ dự bị. Tất cả đã vào sân hoặc chưa có đội hình.
                    </p>
                  )}
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
