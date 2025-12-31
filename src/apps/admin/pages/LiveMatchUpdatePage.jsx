import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Clock, Goal, Play, Square, Replace, ShieldCheck,
    ChevronLeft, ChevronDown, Users, FileText, Activity, AlertCircle, CheckCircle, Trash2, Eye, Shield,
    Download, Printer, Send, Award, Star
} from 'lucide-react';
import MatchesService from '../../../layers/application/services/MatchesService';
import TeamsService from '../../../layers/application/services/TeamsService';
import ApiService from '../../../layers/application/services/ApiService';
import { useAuth } from '../../../layers/application/context/AuthContext';
import { hasPermission } from '../utils/accessControl';
import toast from 'react-hot-toast';
import TeamLineupEditor from '../components/TeamLineupEditor';
import InteractiveFormationPitch from '../components/InteractiveFormationPitch';
import LineupDisplay from '../components/LineupDisplay';

const LiveMatchUpdatePage = () => {
    const { matchId } = useParams();
    const navigate = useNavigate();
    const [match, setMatch] = useState(null);
    const [activeTab, setActiveTab] = useState('control');
    const [editorMode, setEditorMode] = useState('list'); // 'list' or 'interactive'
    const [loading, setLoading] = useState(true);
    const [showKitMenu, setShowKitMenu] = useState(null); // 'home' | 'away' | null

    const { user: currentUser } = useAuth();
    const canEdit = hasPermission(currentUser, 'manage_matches');

    // Lineup State
    const [homeSquad, setHomeSquad] = useState([]);
    const [awaySquad, setAwaySquad] = useState([]);
    const [homeLineup, setHomeLineup] = useState({ starters: [], substitutes: [], players: [] }); // players: full lineup data with player info
    const [awayLineup, setAwayLineup] = useState({ starters: [], substitutes: [], players: [] });

    // Live Control State
    const [matchEvents, setMatchEvents] = useState([]);
    const [matchTime, setMatchTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);

    // Auto-calculate match time
    useEffect(() => {
        let interval;
        if (match && ['in_progress', 'live', 'in_play'].includes(match.status?.toLowerCase())) {
            const updateTime = () => {
                const startTime = new Date(match.scheduledKickoff).getTime();
                const now = new Date().getTime();
                const diffMinutes = Math.floor((now - startTime) / 60000);
                // Clamp between 0 and 120+ for safety, but allow it to grow
                setMatchTime(Math.max(0, diffMinutes));
            };

            updateTime(); // Initial update
            interval = setInterval(updateTime, 10000); // Update every 10 seconds
        }
        return () => clearInterval(interval);
    }, [match]);

    useEffect(() => {
        fetchMatchData();
    }, [matchId]);

    const fetchMatchData = async () => {
        try {
            setLoading(true);
            const data = await MatchesService.getMatchById(matchId);
            setMatch(data);
            setMatchEvents(data.events || []);

            setMatchEvents(data.events || []);

            // Console log to check kit data
            console.log('Match Kit Data:', {
                homeKit: data.homeTeamKit,
                awayKit: data.awayTeamKit,
                homeColors: { home: data.homeTeamHomeKitColor, away: data.homeTeamAwayKitColor },
                awayColors: { home: data.awayTeamHomeKitColor, away: data.awayTeamAwayKitColor }
            });

            // Fetch squads if lineups are needed
            if (data.homeTeamId) {
                const homePlayers = await TeamsService.getTeamPlayers(data.homeTeamId);
                setHomeSquad(homePlayers);
            }
            if (data.awayTeamId) {
                const awayPlayers = await TeamsService.getTeamPlayers(data.awayTeamId);
                setAwaySquad(awayPlayers);
            }

            // Fetch Lineups
            const lineups = await MatchesService.getMatchLineups(matchId);


            // Transform lineups for editor - keep full player info
            const processLineup = (type, seasonTeamId) => {
                const teamLineups = lineups.filter(l => Number(l.seasonTeamId) === Number(seasonTeamId));

                // Map lineup data to player objects with full info
                const lineupPlayers = teamLineups.map(l => ({
                    id: l.playerId,
                    player_id: l.playerId,
                    full_name: l.playerName || 'Unknown',
                    name: l.playerName || 'Unknown',
                    shirt_number: l.jerseyNumber,
                    jerseyNumber: l.jerseyNumber,
                    position: l.position,
                    isStarting: l.isStarting
                }));

                const starters = teamLineups.filter(l => Boolean(l.isStarting)).map(l => l.playerId);
                const substitutes = teamLineups.filter(l => !Boolean(l.isStarting)).map(l => l.playerId);

                return {
                    formation: '4-4-2', // Default or stored if implemented
                    starters,
                    substitutes,
                    players: lineupPlayers // Full player info from lineup
                };
            };

            setHomeLineup(processLineup('home', data.homeSeasonTeamId));
            setAwayLineup(processLineup('away', data.awaySeasonTeamId));

        } catch (error) {
            console.error('Error fetching match:', error);
            toast.error('Could not load match data');
        } finally {
            setLoading(false);
        }
    };

    // Save Lineup
    const handleLineupSave = async (teamId, lineupData) => {
        if (!match) return;

        try {
            const isHome = teamId === match.homeTeamId;
            const seasonTeamId = isHome ? match.homeSeasonTeamId : match.awaySeasonTeamId;

            if (!seasonTeamId) {
                toast.error("Season Team ID not found. Cannot save.");
                return;
            }

            const payload = {
                seasonId: match.seasonId,
                seasonTeamId: seasonTeamId,
                startingPlayerIds: lineupData.starters,
                substitutePlayerIds: lineupData.substitutes
            };

            await MatchesService.updateMatchLineups(matchId, payload);
            toast.success(`${isHome ? 'Home' : 'Away'} lineup saved successfully!`);

            // Update local state instead of refetching
            if (isHome) {
                setHomeLineup(lineupData);
            } else {
                setAwayLineup(lineupData);
            }
        } catch (error) {
            console.error("Failed to save lineup", error);
            const msg = error.response?.data?.message || error.message;
            if (error.response?.data?.errors) {
                toast.error(error.response.data.errors[0]);
            } else {
                toast.error(`Failed to save: ${msg}`);
            }
        }
    };

    // Event Modal State
    const [showModal, setShowModal] = useState(false);
    const [selectedEventType, setSelectedEventType] = useState(null);
    const [selectedTeamId, setSelectedTeamId] = useState(null);
    const [selectedPlayerId, setSelectedPlayerId] = useState('');
    const [selectedSubstituteId, setSelectedSubstituteId] = useState(''); // For SUB event: player coming IN
    const [eventMinute, setEventMinute] = useState(null); // Separate minute for event modal

    // Open Modal logic
    const openEventModal = (type, teamId) => {
        setSelectedEventType(type);
        setSelectedTeamId(teamId);
        setSelectedPlayerId(''); // Reset selection
        setSelectedSubstituteId(''); // Reset substitute selection
        setEventMinute(matchTime || null); // Initialize with current match time
        setShowModal(true);
    };

    // Submit Event Logic (Renamed from handleAddEvent)
    const submitEvent = async () => {
        if (!selectedPlayerId) {
            toast.error('Please select a player');
            return;
        }

        // For SUBSTITUTION, require both players
        if (selectedEventType === 'SUBSTITUTION' && !selectedSubstituteId) {
            toast.error('Please select the player coming IN');
            return;
        }

        // Prevent substituting same player
        if (selectedEventType === 'SUBSTITUTION' && selectedPlayerId === selectedSubstituteId) {
            toast.error('Cannot substitute a player with themselves');
            return;
        }

        try {
            // Use eventMinute from modal, fallback to matchTime, or require input
            const time = eventMinute !== null && eventMinute !== undefined ? eventMinute : (matchTime || null);

            if (time === null || time === undefined) {
                toast.error('Vui lòng nhập phút xảy ra sự kiện');
                return;
            }

            const payload = {
                teamId: selectedTeamId,
                playerId: parseInt(selectedPlayerId),
                type: selectedEventType,
                minute: time,
            };

            // For SUBSTITUTION: add assistPlayerId (player coming IN)
            if (selectedEventType === 'SUBSTITUTION') {
                payload.assistPlayerId = parseInt(selectedSubstituteId);
            }

            await MatchesService.createMatchEvent(matchId, payload);
            toast.success(`${selectedEventType} recorded!`);

            // Reset selections after successful submission
            setSelectedPlayerId('');
            setSelectedSubstituteId('');
            setEventMinute(null);

            fetchMatchData();
            setShowModal(false); // Close modal
        } catch (error) {
            console.error('Error saving event:', error);
            const errorMsg = error.response?.data?.message || error.message || 'Failed to save event';
            toast.error(errorMsg);
        }
    };

    const handleFinalize = async () => {
        if (!window.confirm('Are you sure you want to end this match?')) return;
        try {
            await MatchesService.finalizeMatch(matchId);
            toast.success('Match finalized!');
            navigate('/admin/matches');
        } catch (error) {
            console.error('Error finalizing:', error);
            toast.error('Failed to finalize match');
        }
    };



    // Get only starters (11 players) who haven't been substituted out yet
    const getStarters = () => {
        let lineup = null;

        if (selectedTeamId === match?.homeTeamId) {
            lineup = homeLineup;
        } else if (selectedTeamId === match?.awayTeamId) {
            lineup = awayLineup;
        }

        if (lineup && lineup.starters?.length > 0 && lineup.players?.length > 0) {
            // Get players who were substituted OUT
            const substitutedOutIds = (matchEvents || [])
                .filter(e => e.type === 'SUBSTITUTION' && Number(e.teamId) === Number(selectedTeamId))
                .map(e => Number(e.playerId));

            // Return starters from lineup who haven't been subbed out
            return lineup.players.filter(player =>
                lineup.starters.includes(player.id) && !substitutedOutIds.includes(player.id)
            );
        }
        return [];
    };

    // Get only substitutes (5 players) who haven't entered the pitch yet
    const getSubstitutes = () => {
        let lineup = null;

        if (selectedTeamId === match?.homeTeamId) {
            lineup = homeLineup;
        } else if (selectedTeamId === match?.awayTeamId) {
            lineup = awayLineup;
        }

        if (lineup && lineup.substitutes?.length > 0 && lineup.players?.length > 0) {
            // Get players who already came IN (can't come in again)
            const substitutedInIds = (matchEvents || [])
                .filter(e => e.type === 'SUBSTITUTION' && Number(e.teamId) === Number(selectedTeamId))
                .map(e => Number(e.assistPlayerId))
                .filter(id => id);

            // Return subs from lineup who haven't entered the pitch yet
            return lineup.players.filter(player =>
                lineup.substitutes.includes(player.id) && !substitutedInIds.includes(player.id)
            );
        }
        return [];
    };

    // Get currently active players on the pitch (for GOAL, CARD events)
    // = 11 starters - subbed out + subbed in
    const getActivePlayers = () => {
        let lineup = null;

        if (selectedTeamId === match?.homeTeamId) {
            lineup = homeLineup;
        } else if (selectedTeamId === match?.awayTeamId) {
            lineup = awayLineup;
        }

        if (!lineup || !lineup.starters || lineup.starters.length === 0) {
            return [];
        }

        // Use players from lineup data (only 11 starters + substitutes)
        const lineupPlayers = lineup.players || [];

        // Start with 11 starters only from lineup
        const starterPlayers = lineupPlayers.filter(p => lineup.starters.includes(p.id));

        // Get players who were substituted OUT
        const substitutedOutIds = (matchEvents || [])
            .filter(e => e.type === 'SUBSTITUTION' && Number(e.teamId) === Number(selectedTeamId))
            .map(e => Number(e.playerId));

        // Get players who came IN
        const substitutedInIds = (matchEvents || [])
            .filter(e => e.type === 'SUBSTITUTION' && Number(e.teamId) === Number(selectedTeamId))
            .map(e => Number(e.assistPlayerId))
            .filter(id => id);

        // Get substitute players who came in
        const subbedInPlayers = lineupPlayers.filter(p => substitutedInIds.includes(p.id));

        // Active = starters who haven't been subbed out + players who came in
        const activePlayers = [
            ...starterPlayers.filter(p => !substitutedOutIds.includes(p.id)),
            ...subbedInPlayers
        ];

        return activePlayers;
    };


    const handleDeleteEvent = async (event) => {
        const isGoal = event.type === 'GOAL' || event.type === 'OWN_GOAL';

        let shouldDisallow = false;
        if (isGoal) {
            // Choice: Delete or Disallow?
            // Simple approach: Custom confirm/prompt flow
            // Ideally we'd use a nice modal, but for now we can rely on confirm/prompt behavior or 
            // maybe just checking if the user wants to provide a reason implies "Disallow".
            // Let's ask specifically.
            const choice = window.confirm("Is this a disallowed goal (Offside/Foul)?\n\nClick OK to DISALLOW (with reason).\nClick Cancel to just DELETE (mistake).");
            if (choice) {
                shouldDisallow = true;
            }
        } else {
            if (!window.confirm('Are you sure you want to delete this event?')) return;
        }

        try {
            if (shouldDisallow) {
                const reason = window.prompt("Enter reason for disallowance (e.g. Offside):");
                if (!reason) return; // Cancelled

                await MatchesService.disallowMatchEvent(event.id, reason);
                toast.success('Goal disallowed!');
            } else {
                await MatchesService.deleteMatchEvent(event.id);
                toast.success('Event deleted successfully');
            }
            fetchMatchData();
        } catch (error) {
            console.error('Failed to update event:', error);
            toast.error('Failed to update event');
        }
    };

    // Helper: Determine kit color
    const getEffectiveKitColor = (teamType) => {
        if (!match) return teamType === 'home' ? '#3b82f6' : '#ef4444'; // Default Blue/Red

        // Logic: 
        // 1. Get selected kit type (home/away/third)
        // 2. Get corresponding color from team data
        // 3. Fallback to default

        const kitType = teamType === 'home'
            ? (match.homeTeamKit || 'home')
            : (match.awayTeamKit || 'away');

        let color = null;

        if (teamType === 'home') {
            if (kitType === 'home') color = match.homeTeamHomeKitColor;
            else if (kitType === 'away') color = match.homeTeamAwayKitColor;
            // else if (kitType === 'third') color = match.homeTeamThirdKitColor;
        } else {
            if (kitType === 'home') color = match.awayTeamHomeKitColor;
            else if (kitType === 'away') color = match.awayTeamAwayKitColor;
        }

        // If no color defined in DB, revert to basic defaults
        if (!color) {
            return teamType === 'home' ? '#3b82f6' : '#ef4444';
        }

        return color;
    };

    // Helper: Determine opposite text color for kit (white or black)
    // Simple heuristic or hardcode white for now

    const homeKitColor = getEffectiveKitColor('home');
    const awayKitColor = getEffectiveKitColor('away');

    // Report state - MUST be before early returns
    const [report, setReport] = useState({
        weather: '',
        attendance: '',
        notes: '',
        incidents: '',
        mvpPlayerId: '',
        mvpTeamId: '',
        matchSummary: ''
    });
    const [reportSubmitting, setReportSubmitting] = useState(false);
    const [reportSubmitted, setReportSubmitted] = useState(false);
    const matchSheetRef = useRef(null);

    if (loading) return <div className="p-8 text-center">Loading Match Data...</div>;
    if (!match) return <div className="p-8 text-center text-red-500">Match not found</div>;

    const tabs = [
        { id: 'lineups', label: 'Edit Lineups', icon: <Users size={18} /> },
        { id: 'view', label: 'View Lineups', icon: <Eye size={18} /> },
        { id: 'control', label: 'Live Control', icon: <Activity size={18} /> },
        { id: 'summary', label: 'Match Sheet', icon: <FileText size={18} /> },
        { id: 'report', label: 'Báo cáo', icon: <Send size={18} /> },
    ];

    // Kit Selection Logic

    const handleKitSelect = async (teamSide, kitType) => {
        setShowKitMenu(null);
        if (!canEdit) return;

        try {
            const payload = teamSide === 'home'
                ? { homeTeamKit: kitType }
                : { awayTeamKit: kitType };

            // Optimistic update
            setMatch(prev => ({ ...prev, ...payload }));

            await MatchesService.updateMatch(matchId, payload);
            toast.success(`${teamSide === 'home' ? 'Home' : 'Away'} kit updated to ${kitType}`);
            fetchMatchData();
        } catch (error) {
            console.error('Failed to update kit:', error);
            toast.error('Failed to update kit selection');
            fetchMatchData(); // Revert
        }
    };

    // Helper to get color for preview in dropdown
    const getTeamKitColor = (teamSide, type) => {
        if (!match) return '#ccc';
        if (teamSide === 'home') {
            if (type === 'home') return match.homeTeamHomeKitColor || '#3b82f6';
            if (type === 'away') return match.homeTeamAwayKitColor || '#ef4444';
            // if (type === 'third') return match.homeTeamThirdKitColor || '#888';
        } else {
            if (type === 'home') return match.awayTeamHomeKitColor || '#ef4444';
            if (type === 'away') return match.awayTeamAwayKitColor || '#3b82f6';
        }
        return '#888'; // fallback
    };

    // Get goal scorers from events
    const goalScorers = matchEvents.filter(e => e.type === 'GOAL' || e.type === 'G');
    const cardRecipients = matchEvents.filter(e =>
        ['YELLOW_CARD', 'RED_CARD', 'SECOND_YELLOW'].includes(e.type)
    );

    // Get all players from both squads for MVP selection
    const getAllPlayers = () => {
        const homePlayers = (homeLineup.players || []).map(p => ({
            ...p,
            teamId: match?.homeTeamId,
            teamName: match?.homeTeamName
        }));
        const awayPlayers = (awayLineup.players || []).map(p => ({
            ...p,
            teamId: match?.awayTeamId,
            teamName: match?.awayTeamName
        }));
        return [...homePlayers, ...awayPlayers];
    };

    // Print/Export functionality
    const handlePrint = () => {
        window.print();
    };

    const handleExportPDF = () => {
        toast.loading('Đang tạo PDF...', { id: 'export-pdf' });
        // Use browser print to PDF
        setTimeout(() => {
            window.print();
            toast.success('Mở hộp thoại in để lưu PDF', { id: 'export-pdf' });
        }, 500);
    };

    // Submit report to admin
    const submitReportToAdmin = async () => {
        if (!report.mvpPlayerId) {
            toast.error('Vui lòng chọn cầu thủ xuất sắc nhất (MVP)');
            return;
        }
        if (!report.matchSummary) {
            toast.error('Vui lòng nhập tóm tắt trận đấu');
            return;
        }

        setReportSubmitting(true);
        try {
            // Find MVP player info
            const allPlayers = getAllPlayers();
            const mvpPlayer = allPlayers.find(p => p.id === parseInt(report.mvpPlayerId));

            const enhancedReport = {
                ...report,
                matchId: parseInt(matchId),
                mvpPlayerName: mvpPlayer?.full_name || mvpPlayer?.name || '',
                mvpTeamName: mvpPlayer?.teamName || '',
                homeScore: match?.homeScore ?? match?.scoreHome ?? 0,
                awayScore: match?.awayScore ?? match?.scoreAway ?? 0,
                goalDetails: JSON.stringify(goalScorers.map(g => ({
                    playerId: g.playerId,
                    playerName: g.player || g.playerName,
                    minute: g.minute,
                    type: g.type
                }))),
                cardDetails: JSON.stringify(cardRecipients.map(c => ({
                    playerId: c.playerId,
                    playerName: c.player || c.playerName,
                    minute: c.minute,
                    cardType: c.type
                }))),
                totalYellowCards: cardRecipients.filter(c => c.type === 'YELLOW_CARD').length,
                totalRedCards: cardRecipients.filter(c => ['RED_CARD', 'SECOND_YELLOW'].includes(c.type)).length
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
                console.log('Notification not sent (optional feature):', notifError);
            }

            toast.success('Đã gửi báo cáo cho Admin!');
            setReportSubmitted(true);
        } catch (error) {
            console.error('Error submitting report:', error);
            toast.error(error.response?.data?.error || 'Không thể gửi báo cáo');
        } finally {
            setReportSubmitting(false);
        }
    };
    return (
        <div className="max-w-7xl mx-auto p-4 space-y-6 relative">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/admin/matches', { state: { activeTab: 'today' } })} className="text-gray-600 hover:text-gray-900 flex items-center gap-2">
                        <ChevronLeft size={20} /> Back to Match Day
                    </button>
                    <button
                        onClick={() => navigate(`/admin/matches/${matchId}/lineup-review`)}
                        className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Shield size={16} />
                        Duyệt đội hình
                    </button>
                </div>
                <div className="flex bg-gray-100 rounded-lg p-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${activeTab === tab.id ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-bold ${match.status === 'in_progress' ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-blue-100 text-blue-600'}`}>
                    {match.status?.toUpperCase().replace('_', ' ')}
                </div>
            </div>

            {/* Scoreboard */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-8 text-white shadow-xl">
                <div className="flex justify-between items-center max-w-4xl mx-auto">
                    <div className="text-center flex-1">
                        {match.homeTeamLogo && <img src={match.homeTeamLogo} className="h-20 mx-auto mb-4 object-contain filter drop-shadow-md" alt="Home" />}
                        <h2 className="text-2xl font-bold">{match.homeTeamName}</h2>
                        <div className="relative">
                            <div
                                className={`flex justify-center mt-2 items-center gap-2 ${canEdit ? 'cursor-pointer hover:bg-white/10 rounded px-2 py-1 transition-colors' : ''}`}
                                onClick={() => canEdit && setShowKitMenu(showKitMenu === 'home' ? null : 'home')}
                                title={canEdit ? "Click to change kit" : "Home Kit"}
                            >
                                <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold flex items-center gap-1">
                                    {match.homeTeamKit || 'Home'} Kit
                                    {canEdit && <ChevronDown size={12} />}
                                </div>
                                <div
                                    className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                                    style={{ backgroundColor: homeKitColor }}
                                    title={`Kit Color: ${homeKitColor}`}
                                />
                            </div>
                            {/* Dropdown Menu */}
                            {showKitMenu === 'home' && (
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[120px] z-10">
                                    {['home', 'away', 'third'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => handleKitSelect('home', type)}
                                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                        >
                                            <div
                                                className="w-3 h-3 rounded-full border border-gray-300"
                                                style={{ backgroundColor: getTeamKitColor('home', type) }}
                                            />
                                            <span className="uppercase font-medium text-xs">{type}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="text-center px-8">
                    <div className="text-6xl font-black font-mono tracking-wider mb-2">
                        {match.homeScore ?? match.scoreHome} - {match.awayScore ?? match.scoreAway}
                    </div>
                    <div className="flex items-center justify-center gap-2 text-yellow-400 text-xl font-mono bg-black/30 px-4 py-1 rounded-full w-fit mx-auto">
                        <Clock size={20} />
                        <span>{matchTime}'</span>
                    </div>
                </div>
                <div className="text-center flex-1">
                    {match.awayTeamLogo && <img src={match.awayTeamLogo} className="h-20 mx-auto mb-4 object-contain filter drop-shadow-md" alt="Away" />}
                    <h2 className="text-2xl font-bold">{match.awayTeamName}</h2>
                    <div className="relative">
                        <div
                            className={`flex justify-center mt-2 items-center gap-2 ${canEdit ? 'cursor-pointer hover:bg-white/10 rounded px-2 py-1 transition-colors' : ''}`}
                            onClick={() => canEdit && setShowKitMenu(showKitMenu === 'away' ? null : 'away')}
                            title={canEdit ? "Click to change kit" : "Away Kit"}
                        >
                            <div
                                className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                                style={{ backgroundColor: awayKitColor }}
                                title={`Kit Color: ${awayKitColor}`}
                            />
                            <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold flex items-center gap-1">
                                {match.awayTeamKit || 'Away'} Kit
                                {canEdit && <ChevronDown size={12} />}
                            </div>
                        </div>
                        {/* Dropdown Menu */}
                        {showKitMenu === 'away' && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[120px] z-10">
                                {['home', 'away', 'third'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => handleKitSelect('away', type)}
                                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <div
                                            className="w-3 h-3 rounded-full border border-gray-300"
                                            style={{ backgroundColor: getTeamKitColor('away', type) }}
                                        />
                                        <span className="uppercase font-medium text-xs">{type}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>


            {/* Content Area */}
            <div className="min-h-[500px]">
                {activeTab === 'control' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Home Controls */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-700 border-b pb-2">{match.homeTeamName} Actions</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => canEdit && openEventModal('GOAL', match.homeTeamId)}
                                    className={`p-4 ${canEdit ? 'bg-green-50 hover:bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'} rounded-lg border border-green-200 flex flex-col items-center gap-2 transition-colors`}
                                    disabled={!canEdit}
                                    title={!canEdit ? 'Bạn chỉ có quyền xem kết quả' : 'Record Goal'}
                                >
                                    <Goal size={24} /> <span>Goal</span>
                                </button>
                                <button
                                    onClick={() => canEdit && openEventModal('YELLOW_CARD', match.homeTeamId)}
                                    className={`p-4 ${canEdit ? 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'} rounded-lg border border-yellow-200 flex flex-col items-center gap-2 transition-colors`}
                                    disabled={!canEdit}
                                    title={!canEdit ? 'Bạn chỉ có quyền xem kết quả' : 'Yellow Card'}
                                >
                                    <Square fill="currentColor" size={24} /> <span>Yellow Card</span>
                                </button>
                                <button
                                    onClick={() => canEdit && openEventModal('RED_CARD', match.homeTeamId)}
                                    className={`p-4 ${canEdit ? 'bg-red-50 hover:bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'} rounded-lg border border-red-200 flex flex-col items-center gap-2 transition-colors`}
                                    disabled={!canEdit}
                                    title={!canEdit ? 'Bạn chỉ có quyền xem kết quả' : 'Red Card'}
                                >
                                    <Square fill="currentColor" size={24} /> <span>Red Card</span>
                                </button>
                                <button
                                    onClick={() => canEdit && openEventModal('SUBSTITUTION', match.homeTeamId)}
                                    className={`p-4 ${canEdit ? 'bg-blue-50 hover:bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'} rounded-lg border border-blue-200 flex flex-col items-center gap-2 transition-colors`}
                                    disabled={!canEdit}
                                    title={!canEdit ? 'Bạn chỉ có quyền xem kết quả' : 'Substitution'}
                                >
                                    <Replace size={24} /> <span>Sub</span>
                                </button>
                            </div>
                        </div>

                        {/* Central Feed / Timer Control */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
                            <div className="p-4 border-b bg-gray-50 font-semibold text-gray-700">Match Events</div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px]">
                                {matchEvents.length === 0 ? (
                                    <div className="text-center text-gray-400 py-8">No events yet</div>
                                ) : (
                                    matchEvents.map(event => (
                                        <div key={event.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <div className="font-mono text-sm font-bold w-8 text-gray-500">{event.minute}'</div>
                                            <div className="flex-1">
                                                <div className="font-semibold text-sm">
                                                    {event.type === 'CARD'
                                                        ? `${event.cardType} Card`
                                                        : (event.type === 'OTHER' && event.description ? event.description : event.type.replace('_', ' '))}
                                                    {event.type === 'GOAL' && event.goalTypeName && (
                                                        <span className="ml-2 text-xs font-normal text-gray-500 italic">
                                                            ({event.goalTypeName})
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {event.player || 'Unknown Player'} ({event.teamId === match.homeTeamId ? match.homeTeamName : match.awayTeamName})
                                                </div>
                                            </div>
                                            {canEdit ? (
                                                <button
                                                    onClick={() => handleDeleteEvent(event)}
                                                    className="text-red-400 hover:text-red-600 p-1"
                                                    title="Delete or Disallow"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            ) : (
                                                <div className="text-gray-300 p-1" title="Bạn chỉ có quyền xem">
                                                    <Trash2 size={14} />
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="p-4 border-t bg-gray-50">
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={matchTime}
                                        onChange={(e) => setMatchTime(parseInt(e.target.value))}
                                        className="w-20 p-2 border rounded text-center font-mono"
                                        min="0" max="120"
                                        disabled={!canEdit}
                                    />
                                    <button
                                        className={`flex-1 ${canEdit ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'} rounded font-bold transition-colors py-2 flex items-center justify-center gap-2`}
                                        onClick={() => canEdit && handleFinalize()}
                                        disabled={!canEdit}
                                        title={!canEdit ? 'Bạn chỉ có quyền xem' : 'End Match'}
                                    >
                                        <ShieldCheck size={18} /> {canEdit ? 'End Match' : 'Chỉ xem'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Away Controls */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-700 border-b pb-2 text-right">{match.awayTeamName} Actions</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => openEventModal('GOAL', match.awayTeamId)}
                                    className="p-4 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg border border-green-200 flex flex-col items-center gap-2 transition-colors"
                                >
                                    <Goal size={24} /> <span>Goal</span>
                                </button>
                                <button
                                    onClick={() => openEventModal('YELLOW_CARD', match.awayTeamId)}
                                    className="p-4 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg border border-yellow-200 flex flex-col items-center gap-2 transition-colors"
                                >
                                    <Square fill="currentColor" size={24} /> <span>Yellow Card</span>
                                </button>
                                <button
                                    onClick={() => openEventModal('RED_CARD', match.awayTeamId)}
                                    className="p-4 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg border border-red-200 flex flex-col items-center gap-2 transition-colors"
                                >
                                    <Square fill="currentColor" size={24} /> <span>Red Card</span>
                                </button>
                                <button
                                    onClick={() => openEventModal('SUBSTITUTION', match.awayTeamId)}
                                    className="p-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 flex flex-col items-center gap-2 transition-colors"
                                >
                                    <Replace size={24} /> <span>Sub</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {
                    activeTab === 'lineups' && (
                        <div className="space-y-4">
                            {!canEdit && (
                                <div className="p-3 bg-yellow-50 text-yellow-800 rounded mb-2">Bạn chỉ có quyền xem đội hình (giám sát).</div>
                            )}
                            {/* Editor Mode Toggle */}
                            <div className="flex justify-center">
                                <div className="bg-gray-100 rounded-lg p-1 inline-flex">
                                    <button
                                        onClick={() => setEditorMode('list')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${editorMode === 'list'
                                            ? 'bg-white shadow text-blue-600'
                                            : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        📋 List Editor
                                    </button>
                                    <button
                                        onClick={() => setEditorMode('interactive')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${editorMode === 'interactive'
                                            ? 'bg-white shadow text-blue-600'
                                            : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        ⚽ Interactive Builder
                                    </button>
                                </div>
                            </div>

                            {/* Editors */}
                            <div className="grid grid-cols-2 gap-8">
                                {(() => {
                                    console.log('[Render] Current editorMode:', editorMode);
                                    return editorMode === 'list' ? (
                                        <>
                                            <TeamLineupEditor
                                                teamId={match.homeTeamId}
                                                teamName={match.homeTeamName}
                                                squad={homeSquad}
                                                initialLineup={homeLineup}
                                                onSave={canEdit ? handleLineupSave : undefined}
                                            />
                                            <TeamLineupEditor
                                                teamId={match.awayTeamId}
                                                teamName={match.awayTeamName}
                                                squad={awaySquad}
                                                initialLineup={awayLineup}
                                                onSave={canEdit ? handleLineupSave : undefined}
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <InteractiveFormationPitch
                                                teamId={match.homeTeamId}
                                                teamName={match.homeTeamName}
                                                squad={homeSquad}
                                                initialLineup={homeLineup}
                                                onSave={canEdit ? handleLineupSave : undefined}
                                                teamColor={homeKitColor}
                                            />
                                            <InteractiveFormationPitch
                                                teamId={match.awayTeamId}
                                                teamName={match.awayTeamName}
                                                squad={awaySquad}
                                                initialLineup={awayLineup}
                                                onSave={canEdit ? handleLineupSave : undefined}
                                                teamColor={awayKitColor}
                                            />
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    )
                }

                {
                    activeTab === 'view' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-white rounded-xl p-6 shadow-sm border">
                                <LineupDisplay
                                    lineup={homeLineup}
                                    squad={homeSquad}
                                    teamName={match.homeTeamName}
                                    teamColor={homeKitColor}
                                    formation={homeLineup?.formation || '4-4-2'}
                                />
                            </div>
                            <div className="bg-white rounded-xl p-6 shadow-sm border">
                                <LineupDisplay
                                    lineup={awayLineup}
                                    squad={awaySquad}
                                    teamName={match.awayTeamName}
                                    teamColor={awayKitColor}
                                    formation={awayLineup?.formation || '4-4-2'}
                                />
                            </div>
                        </div>
                    )
                }

                {
                    activeTab === 'summary' && (
                        <div className="space-y-6" ref={matchSheetRef}>
                            {/* Match Sheet Header */}
                            <div className="bg-white rounded-lg shadow-sm border p-6 print:shadow-none print:border-0">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        <FileText size={24} />
                                        Match Sheet - Diễn biến trận đấu
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                                            {matchEvents.length} sự kiện
                                        </span>
                                        <button
                                            onClick={handlePrint}
                                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors print:hidden"
                                            title="In Match Sheet"
                                        >
                                            <Printer size={16} />
                                            In
                                        </button>
                                        <button
                                            onClick={handleExportPDF}
                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors print:hidden"
                                            title="Xuất PDF"
                                        >
                                            <Download size={16} />
                                            Xuất PDF
                                        </button>
                                    </div>
                                </div>

                                {/* Match Info */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 pb-6 border-b">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Trận đấu</p>
                                        <p className="font-semibold text-gray-900">{match.homeTeamName} vs {match.awayTeamName}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Tỷ số</p>
                                        <p className="font-bold text-2xl text-gray-900">
                                            {match.homeScore ?? match.scoreHome ?? 0} - {match.awayScore ?? match.scoreAway ?? 0}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Phút</p>
                                        <p className="font-semibold text-gray-900">{matchTime}'</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Trạng thái</p>
                                        <p className="font-semibold text-gray-900">{match.status?.toUpperCase().replace('_', ' ')}</p>
                                    </div>
                                </div>

                                {/* Events Timeline */}
                                <div className="space-y-4">
                                    <h4 className="text-lg font-semibold text-gray-800 mb-4">Timeline sự kiện</h4>
                                    {matchEvents.length === 0 ? (
                                        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                                            <FileText size={48} className="mx-auto mb-3 text-gray-300" />
                                            <p className="text-gray-500 font-medium">Chưa có sự kiện nào trong trận đấu</p>
                                            <p className="text-sm text-gray-400 mt-2">Các sự kiện sẽ được hiển thị ở đây khi được ghi nhận</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 relative pl-8 before:absolute before:left-3 before:top-0 before:bottom-0 before:w-0.5 before:bg-gray-300">
                                            {matchEvents
                                                .sort((a, b) => (a.minute || 0) - (b.minute || 0))
                                                .map((event, index) => {
                                                    const isHome = Number(event.teamId) === Number(match.homeTeamId);
                                                    const eventColor = isHome ? 'blue' : 'red';
                                                    let eventIcon = '⚽';
                                                    let eventBgColor = 'bg-green-100';
                                                    let eventTextColor = 'text-green-700';
                                                    let eventLabel = event.type?.replace('_', ' ') || 'Event';

                                                    if (event.type === 'GOAL' || event.type === 'G') {
                                                        eventIcon = '⚽'; eventBgColor = 'bg-green-100'; eventTextColor = 'text-green-700'; eventLabel = 'Bàn thắng';
                                                    } else if (event.type === 'YELLOW_CARD' || event.type === 'YELLOW' || (event.type === 'CARD' && event.cardType === 'YELLOW')) {
                                                        eventIcon = '🟨'; eventBgColor = 'bg-yellow-100'; eventTextColor = 'text-yellow-700'; eventLabel = 'Thẻ vàng';
                                                    } else if (event.type === 'RED_CARD' || event.type === 'RED' || (event.type === 'CARD' && event.cardType === 'RED')) {
                                                        eventIcon = '🟥'; eventBgColor = 'bg-red-100'; eventTextColor = 'text-red-700'; eventLabel = 'Thẻ đỏ';
                                                    } else if (event.type === 'SUBSTITUTION' || event.type === 'SUB') {
                                                        eventIcon = '🔄'; eventBgColor = 'bg-blue-100'; eventTextColor = 'text-blue-700'; eventLabel = 'Thay người';
                                                    } else {
                                                        eventIcon = '📝'; eventBgColor = 'bg-gray-100'; eventTextColor = 'text-gray-700';
                                                    }

                                                    return (
                                                        <div key={event.id || event.matchEventId || index} className={`relative flex items-start gap-4 p-4 rounded-lg border-2 ${eventBgColor} ${eventTextColor} shadow-sm hover:shadow-md transition-shadow`}>
                                                            <div className={`absolute -left-11 top-6 w-6 h-6 rounded-full border-4 border-white shadow-md flex items-center justify-center ${isHome ? 'bg-blue-500' : 'bg-red-500'}`}>
                                                                <span className="text-xs font-bold text-white">{event.minute || '?'}</span>
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-2xl">{eventIcon}</span>
                                                                    <span className="font-bold text-sm uppercase">{eventLabel}</span>
                                                                    <span className="text-xs opacity-75">({event.minute || '?'}')</span>
                                                                </div>
                                                                {(event.player || event.playerName || event.player_name) && (
                                                                    <p className="font-semibold text-gray-900">{event.player || event.playerName || event.player_name}</p>
                                                                )}
                                                                {event.description && <p className="text-sm text-gray-600 mt-1">{event.description}</p>}
                                                                {event.type === 'SUBSTITUTION' && (event.assistPlayerId || event.assist_player_id) && (
                                                                    <p className="text-xs text-gray-500 mt-1">Thay vào: {event.assistPlayer || event.assist_player_name || 'N/A'}</p>
                                                                )}
                                                                {event.goalTypeName && <p className="text-xs text-gray-500 mt-1 italic">Loại: {event.goalTypeName}</p>}
                                                                <div className="mt-2 flex items-center gap-2">
                                                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${isHome ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'}`}>{isHome ? match.homeTeamName : match.awayTeamName}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                }

                {
                    activeTab === 'report' && (
                        <div className="bg-white rounded-2xl p-8 shadow-sm border max-w-4xl mx-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                    <Award size={28} className="text-yellow-500" />
                                    Báo Cáo Trận Đấu
                                </h3>
                                {reportSubmitted && (
                                    <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full font-semibold flex items-center gap-2">
                                        <CheckCircle size={18} />
                                        Đã gửi báo cáo
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-6 border-2 border-yellow-200">
                                        <label className="block text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                            <Star size={24} className="text-yellow-500 fill-yellow-500" />
                                            Cầu thủ xuất sắc nhất (MVP) *
                                        </label>
                                        <select
                                            value={report.mvpPlayerId}
                                            onChange={(e) => setReport({ ...report, mvpPlayerId: e.target.value })}
                                            className="w-full border-2 border-yellow-300 rounded-lg p-3 bg-white focus:ring-2 focus:ring-yellow-400"
                                            disabled={reportSubmitted}
                                        >
                                            <option value="">-- Chọn cầu thủ --</option>
                                            <optgroup label={match?.homeTeamName}>
                                                {(homeLineup.players || []).map(player => (
                                                    <option key={`home-${player.id}`} value={player.id}>
                                                        #{player.shirt_number || '?'} - {player.full_name || player.name}
                                                    </option>
                                                ))}
                                            </optgroup>
                                            <optgroup label={match?.awayTeamName}>
                                                {(awayLineup.players || []).map(player => (
                                                    <option key={`away-${player.id}`} value={player.id}>
                                                        #{player.shirt_number || '?'} - {player.full_name || player.name}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        </select>
                                    </div>

                                    <div className="bg-gray-900 text-white rounded-xl p-6">
                                        <h4 className="text-sm font-medium text-gray-400 mb-2">Tỷ số</h4>
                                        <div className="text-4xl font-black text-center">
                                            {match?.homeScore ?? match?.scoreHome ?? 0} - {match?.awayScore ?? match?.scoreAway ?? 0}
                                        </div>
                                        <div className="text-center text-sm text-gray-400 mt-2">
                                            {match?.homeTeamName} vs {match?.awayTeamName}
                                        </div>
                                    </div>

                                    <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                                        <h4 className="font-bold text-green-800 mb-3 flex items-center gap-2"><Goal size={18} /> Bàn thắng ({goalScorers.length})</h4>
                                        {goalScorers.length === 0 ? <p className="text-sm text-green-600 italic">Chưa có bàn thắng</p> : (
                                            <div className="space-y-2">
                                                {goalScorers.map((goal, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 text-sm"><span className="font-bold text-green-700">{goal.minute}'</span><span>{goal.player || goal.playerName}</span></div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                                        <h4 className="font-bold text-yellow-800 mb-3 flex items-center gap-2"><Square size={18} fill="currentColor" /> Thẻ phạt ({cardRecipients.length})</h4>
                                        {cardRecipients.length === 0 ? <p className="text-sm text-yellow-600 italic">Không có thẻ phạt</p> : (
                                            <div className="space-y-2">
                                                {cardRecipients.map((card, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 text-sm">
                                                        <span className={`w-4 h-5 rounded-sm ${card.type === 'RED_CARD' ? 'bg-red-500' : 'bg-yellow-400'}`}></span>
                                                        <span className="font-bold">{card.minute}'</span>
                                                        <span>{card.player || card.playerName}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Thời tiết</label>
                                            <input type="text" value={report.weather} onChange={(e) => setReport({ ...report, weather: e.target.value })} className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500" placeholder="VD: Nắng, 28°C" disabled={reportSubmitted} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Số khán giả</label>
                                            <input type="number" value={report.attendance} onChange={(e) => setReport({ ...report, attendance: e.target.value })} className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500" placeholder="VD: 5000" disabled={reportSubmitted} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Tóm tắt trận đấu *</label>
                                        <textarea value={report.matchSummary} onChange={(e) => setReport({ ...report, matchSummary: e.target.value })} className="w-full border rounded-lg p-3 h-24 focus:ring-2 focus:ring-blue-500" placeholder="Mô tả diễn biến chính của trận đấu..." disabled={reportSubmitted} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Ghi chú chuyên môn</label>
                                        <textarea value={report.notes} onChange={(e) => setReport({ ...report, notes: e.target.value })} className="w-full border rounded-lg p-3 h-20 focus:ring-2 focus:ring-blue-500" placeholder="Ghi chú kỹ thuật, chiến thuật..." disabled={reportSubmitted} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"><AlertCircle size={18} className="text-orange-500" /> Sự cố / Vấn đề cần báo cáo</label>
                                        <textarea value={report.incidents} onChange={(e) => setReport({ ...report, incidents: e.target.value })} className="w-full border rounded-lg p-3 h-20 focus:ring-2 focus:ring-blue-500" placeholder="Ghi nhận sự cố, tranh cãi, hành vi phi thể thao..." disabled={reportSubmitted} />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t">
                                {!reportSubmitted ? (
                                    <button onClick={submitReportToAdmin} disabled={reportSubmitting || !report.mvpPlayerId || !canEdit} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 text-white disabled:text-gray-600 font-bold py-4 rounded-xl transition-all shadow-lg">
                                        {reportSubmitting ? <><div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>Đang gửi...</> : <><Send size={20} />Gửi Báo Cáo Cho Admin</>}
                                    </button>
                                ) : (
                                    <div className="text-center py-4 bg-green-50 rounded-xl border border-green-200">
                                        <CheckCircle size={32} className="mx-auto text-green-500 mb-2" />
                                        <p className="font-bold text-green-700">Báo cáo đã được gửi thành công!</p>
                                        <p className="text-sm text-green-600 mt-1">Admin sẽ xem xét và phản hồi</p>
                                    </div>
                                )}
                                {!report.mvpPlayerId && !reportSubmitted && <p className="text-center text-sm text-orange-500 mt-2">* Vui lòng chọn Cầu thủ xuất sắc nhất (MVP) để gửi báo cáo</p>}
                            </div>
                        </div>
                    )
                }
            </div>


            {/* EVENT MODAL */}
            {
                showModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                                <h3 className="font-bold text-lg">Record {selectedEventType?.replace('_', ' ')}</h3>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">&times;</button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{selectedEventType === 'SUBSTITUTION' ? 'Player Going OUT' : 'Select Player'}</label>
                                    <select
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                                        value={selectedPlayerId}
                                        onChange={(e) => setSelectedPlayerId(e.target.value)}
                                    >
                                        <option value="">-- Choose Player --</option>
                                        {(selectedEventType === 'SUBSTITUTION' ? getStarters() : getActivePlayers()).map(player => (
                                            <option key={player.id} value={player.id}>
                                                #{player.shirt_number || '?'} - {player.full_name || player.name} ({player.position || 'N/A'})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* For SUBSTITUTION: Show second dropdown for player coming IN */}
                                {selectedEventType === 'SUBSTITUTION' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Player Coming IN</label>
                                        <select
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                                            value={selectedSubstituteId}
                                            onChange={(e) => setSelectedSubstituteId(e.target.value)}
                                        >
                                            <option value="">-- Choose Player --</option>
                                            {getSubstitutes().map(player => (
                                                <option key={player.id} value={player.id}>
                                                    #{player.shirt_number || '?'} - {player.full_name || player.name} ({player.position || 'N/A'})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Minute input field */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phút xảy ra sự kiện (Minute) *</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="130"
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                                        value={eventMinute !== null && eventMinute !== undefined ? eventMinute : ''}
                                        onChange={(e) => {
                                            const val = e.target.value === '' ? null : parseInt(e.target.value);
                                            setEventMinute(val !== null && !isNaN(val) && val >= 0 ? val : null);
                                        }}
                                        placeholder="Nhập phút (ví dụ: 45, 90)"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Nhập số phút xảy ra sự kiện (0-130). Hiện tại: {matchTime || 0}'</p>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => canEdit && submitEvent()}
                                        className={`px-4 py-2 ${canEdit ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'} rounded-md font-medium`}
                                        disabled={!canEdit}
                                        title={!canEdit ? 'Bạn chỉ có quyền xem' : 'Confirm'}
                                    >
                                        {canEdit ? 'Confirm' : 'Chỉ xem'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default LiveMatchUpdatePage;