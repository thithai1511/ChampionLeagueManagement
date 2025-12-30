import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Clock, Goal, Play, Square, Replace, ShieldCheck,
    ChevronLeft, Users, FileText, Activity, AlertCircle, CheckCircle, Trash2, Eye
} from 'lucide-react';
import MatchesService from '../../../layers/application/services/MatchesService';
import TeamsService from '../../../layers/application/services/TeamsService';
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

    // Lineup State
    const [homeSquad, setHomeSquad] = useState([]);
    const [awaySquad, setAwaySquad] = useState([]);
    const [homeLineup, setHomeLineup] = useState([]);
    const [awayLineup, setAwayLineup] = useState([]);

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


            // Transform lineups for editor
            const processLineup = (type, seasonTeamId) => {
                const teamLineups = lineups.filter(l => Number(l.seasonTeamId) === Number(seasonTeamId));

                const starters = teamLineups.filter(l => Boolean(l.isStarting)).map(l => l.playerId);
                const substitutes = teamLineups.filter(l => !Boolean(l.isStarting)).map(l => l.playerId);

                return {
                    formation: '4-4-2', // Default or stored if implemented
                    starters,
                    substitutes
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

    // Open Modal logic
    const openEventModal = (type, teamId) => {
        setSelectedEventType(type);
        setSelectedTeamId(teamId);
        setSelectedPlayerId(''); // Reset selection
        setSelectedSubstituteId(''); // Reset substitute selection
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
            const time = matchTime || 0;
            const payload = {
                matchId,
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
            fetchMatchData();
            setShowModal(false); // Close modal
        } catch (error) {
            console.error('Error saving event:', error);
            toast.error('Failed to save event');
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
        let squad = [];
        let lineup = null;

        if (selectedTeamId === match?.homeTeamId) {
            squad = homeSquad;
            lineup = homeLineup;
        } else if (selectedTeamId === match?.awayTeamId) {
            squad = awaySquad;
            lineup = awayLineup;
        }

        if (lineup && lineup.starters?.length > 0) {
            // Get players who were substituted OUT
            const substitutedOutIds = (matchEvents || [])
                .filter(e => e.type === 'SUBSTITUTION' && Number(e.teamId) === Number(selectedTeamId))
                .map(e => Number(e.playerId));

            // Return starters who haven't been subbed out
            return squad.filter(player =>
                lineup.starters.includes(player.id) && !substitutedOutIds.includes(player.id)
            );
        }
        return [];
    };

    // Get only substitutes (5 players) who haven't entered the pitch yet
    const getSubstitutes = () => {
        let squad = [];
        let lineup = null;

        if (selectedTeamId === match?.homeTeamId) {
            squad = homeSquad;
            lineup = homeLineup;
        } else if (selectedTeamId === match?.awayTeamId) {
            squad = awaySquad;
            lineup = awayLineup;
        }

        if (lineup && lineup.substitutes?.length > 0) {
            // Get players who already came IN (can't come in again)
            const substitutedInIds = (matchEvents || [])
                .filter(e => e.type === 'SUBSTITUTION' && Number(e.teamId) === Number(selectedTeamId))
                .map(e => Number(e.assistPlayerId))
                .filter(id => id);

            // Return subs who haven't entered the pitch yet
            return squad.filter(player =>
                lineup.substitutes.includes(player.id) && !substitutedInIds.includes(player.id)
            );
        }
        return [];
    };

    // Get currently active players on the pitch (for GOAL, CARD events)
    // = 11 starters - subbed out + subbed in
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

        // Start with 11 starters only
        const starterIds = lineup.starters || [];

        // Get players who were substituted OUT
        const substitutedOutIds = (matchEvents || [])
            .filter(e => e.type === 'SUBSTITUTION' && Number(e.teamId) === Number(selectedTeamId))
            .map(e => Number(e.playerId));

        // Get players who came IN
        const substitutedInIds = (matchEvents || [])
            .filter(e => e.type === 'SUBSTITUTION' && Number(e.teamId) === Number(selectedTeamId))
            .map(e => Number(e.assistPlayerId))
            .filter(id => id);

        // Active = starters - subbed out + subbed in
        const activePlayerIds = [
            ...starterIds.filter(id => !substitutedOutIds.includes(id)),
            ...substitutedInIds
        ];

        return squad.filter(player => activePlayerIds.includes(player.id));
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

    if (loading) return <div className="p-8 text-center">Loading Match Data...</div>;
    if (!match) return <div className="p-8 text-center text-red-500">Match not found</div>;

    const tabs = [
        { id: 'lineups', label: 'Edit Lineups', icon: <Users size={18} /> },
        { id: 'view', label: 'View Lineups', icon: <Eye size={18} /> },
        { id: 'control', label: 'Live Control', icon: <Activity size={18} /> },
        { id: 'summary', label: 'Match Sheet', icon: <FileText size={18} /> },
    ];

    return (
        <div className="max-w-7xl mx-auto p-4 space-y-6 relative">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button onClick={() => navigate('/admin/matches-today')} className="text-gray-600 hover:text-gray-900 flex items-center gap-2">
                    <ChevronLeft size={20} /> Back to Match Day
                </button>
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
                                    onClick={() => openEventModal('GOAL', match.homeTeamId)}
                                    className="p-4 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg border border-green-200 flex flex-col items-center gap-2 transition-colors"
                                >
                                    <Goal size={24} /> <span>Goal</span>
                                </button>
                                <button
                                    onClick={() => openEventModal('YELLOW_CARD', match.homeTeamId)}
                                    className="p-4 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg border border-yellow-200 flex flex-col items-center gap-2 transition-colors"
                                >
                                    <Square fill="currentColor" size={24} /> <span>Yellow Card</span>
                                </button>
                                <button
                                    onClick={() => openEventModal('RED_CARD', match.homeTeamId)}
                                    className="p-4 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg border border-red-200 flex flex-col items-center gap-2 transition-colors"
                                >
                                    <Square fill="currentColor" size={24} /> <span>Red Card</span>
                                </button>
                                <button
                                    onClick={() => openEventModal('SUBSTITUTION', match.homeTeamId)}
                                    className="p-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 flex flex-col items-center gap-2 transition-colors"
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
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {event.player || 'Unknown Player'} ({event.teamId === match.homeTeamId ? match.homeTeamName : match.awayTeamName})
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteEvent(event)}
                                                className="text-red-400 hover:text-red-600 p-1"
                                                title="Delete or Disallow"
                                            >
                                                <Trash2 size={14} />
                                            </button>
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
                                    />
                                    <button
                                        className="flex-1 bg-red-600 text-white rounded font-bold hover:bg-red-700 transition-colors py-2 flex items-center justify-center gap-2"
                                        onClick={handleFinalize}
                                    >
                                        <ShieldCheck size={18} /> End Match
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

                {activeTab === 'lineups' && (
                    <div className="space-y-4">
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
                                            onSave={handleLineupSave}
                                        />
                                        <TeamLineupEditor
                                            teamId={match.awayTeamId}
                                            teamName={match.awayTeamName}
                                            squad={awaySquad}
                                            initialLineup={awayLineup}
                                            onSave={handleLineupSave}
                                        />
                                    </>
                                ) : (
                                    <>
                                        <InteractiveFormationPitch
                                            teamId={match.homeTeamId}
                                            teamName={match.homeTeamName}
                                            squad={homeSquad}
                                            initialLineup={homeLineup}
                                            onSave={handleLineupSave}
                                            teamColor="#3b82f6"
                                        />
                                        <InteractiveFormationPitch
                                            teamId={match.awayTeamId}
                                            teamName={match.awayTeamName}
                                            squad={awaySquad}
                                            initialLineup={awayLineup}
                                            onSave={handleLineupSave}
                                            teamColor="#ef4444"
                                        />
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {activeTab === 'view' && (
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

                {activeTab === 'summary' && (
                    <div className="bg-white p-8 rounded-lg shadow-sm border text-center text-gray-500">
                        <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-medium text-gray-900">Match Sheet Generation</h3>
                        <p>Detailed match report and statistics will be available here after the match.</p>
                    </div>
                )}
            </div>

            {/* EVENT MODAL */}
            {showModal && (
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

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={submitEvent}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LiveMatchUpdatePage;