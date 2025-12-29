import React, { useState, useEffect } from 'react';
import { Upload, Save, AlertCircle, CheckCircle, Info, Loader2, Search } from 'lucide-react';
import ApiService from '../../../layers/application/services/ApiService';
import TeamsService from '../../../layers/application/services/TeamsService';
import { mapPositionToGroup } from '../../../shared/constants/footballPositions';

const ERROR_MAPPINGS = {
    'PLAYER_ALREADY_REGISTERED': '⚠️ Cầu thủ này đã được đăng ký trong mùa giải đã chọn.',
    'SHIRT_NUMBER_ALREADY_USED': '⚠️ Số áo này đã được đăng ký trong đội bóng ở mùa giải này.',
    'SHIRT_NUMBER_TAKEN': '⚠️ Số áo này đã được đăng ký trong đội bóng ở mùa giải này.',
    'SEASON_TEAM_NOT_FOUND': '⚠️ Đội bóng chưa tham gia mùa giải này.',
    'FILE_REQUIRED': '⚠️ Vui lòng tải lên hồ sơ đăng ký (PDF).',
    'DEFAULT': '❌ Lỗi hệ thống. Vui lòng thử lại sau.'
};

const mapBackendErrorToUserMessage = (errorCode) => {
    if (!errorCode) return ERROR_MAPPINGS['DEFAULT'];
    return ERROR_MAPPINGS[errorCode] || errorCode;
};

const SeasonPlayerRegistrationForm = ({ currentUser, onSuccess }) => {
    const [formData, setFormData] = useState({
        season_id: '',
        season_team_id: ''
    });

    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    // Data
    const [seasons, setSeasons] = useState([]);
    const [seasonTeams, setSeasonTeams] = useState([]);
    const [teamPlayers, setTeamPlayers] = useState([]);
    const [loadingData, setLoadingData] = useState(false);
    const [loadingSeasons, setLoadingSeasons] = useState(false);

    // Selection & Details (Map: playerId -> { shirt_number, player_type })
    const [selectedPlayerIds, setSelectedPlayerIds] = useState(new Set());
    const [playerDetails, setPlayerDetails] = useState({});

    // Already registered players and shirt numbers in this season/team
    const [registeredPlayerIds, setRegisteredPlayerIds] = useState(new Set());
    const [usedShirtNumbers, setUsedShirtNumbers] = useState(new Set());

    // Filter
    const [searchTerm, setSearchTerm] = useState('');

    // Load selected players from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('selectedPlayersForRegistration');
            if (saved) {
                const selectedPlayersData = JSON.parse(saved);
                if (selectedPlayersData.length > 0) {
                    console.log('[SeasonPlayerRegistrationForm] Loading selected players from localStorage:', selectedPlayersData);
                    // Set season_id from saved data - ensure it's a valid numeric ID
                    const firstPlayer = selectedPlayersData[0];
                    if (firstPlayer.season_id) {
                        const numericSeasonId = parseInt(firstPlayer.season_id, 10);
                        if (!isNaN(numericSeasonId)) {
                            setFormData(prev => ({ ...prev, season_id: String(numericSeasonId) }));
                        } else {
                            console.warn('[SeasonPlayerRegistrationForm] Invalid season_id in localStorage, skipping:', firstPlayer.season_id);
                            // Clear invalid localStorage data
                            localStorage.removeItem('selectedPlayersForRegistration');
                        }
                    }
                    // Pre-select players
                    const playerIds = new Set(selectedPlayersData.map(p => p.player_id));
                    setSelectedPlayerIds(playerIds);
                    // Pre-fill player details
                    const details = {};
                    selectedPlayersData.forEach(p => {
                        details[p.player_id] = {
                            shirt_number: '',
                            player_type: p.player_type || 'domestic'
                        };
                    });
                    setPlayerDetails(details);
                    
                    // Load player info from API
                    loadSelectedPlayersInfo(selectedPlayersData.map(p => p.player_id));
                }
            }
        } catch (err) {
            console.error('Failed to load selected players', err);
        }
    }, []);

    // Load player info from API
    const loadSelectedPlayersInfo = async (playerIds) => {
        if (!playerIds || playerIds.length === 0) return;
        
        try {
            // Load players from API
            const playersPromises = playerIds.map(async (playerId) => {
                try {
                    const response = await ApiService.get(`/players/${playerId}`);
                    return response?.data || response;
                } catch (err) {
                    console.error(`Failed to load player ${playerId}`, err);
                    return null;
                }
            });
            
            const players = (await Promise.all(playersPromises)).filter(p => p !== null);
            
            // Add to teamPlayers if not already there
            setTeamPlayers(prev => {
                const existingIds = new Set(prev.map(p => p.id));
                const newPlayers = players.filter(p => {
                    const playerId = p.id || p.player_id;
                    return playerId && !existingIds.has(playerId);
                });
                const mappedPlayers = newPlayers.map(p => ({
                    id: p.id || p.player_id,
                    name: p.name || p.full_name,
                    nationality: p.nationality,
                    position: p.position || p.preferred_position,
                    date_of_birth: p.date_of_birth
                }));
                return [...prev, ...mappedPlayers];
            });
        } catch (err) {
            console.error('Failed to load selected players info', err);
        }
    };

    // Fetch seasons on mount
    useEffect(() => {
        const fetchSeasons = async () => {
            setLoadingSeasons(true);
            try {
                const response = await ApiService.get('/seasons');
                console.log('[SeasonPlayerRegistrationForm] Seasons API response:', response);
                const seasonsData = Array.isArray(response) ? response : (response?.data || []);
                console.log('[SeasonPlayerRegistrationForm] Parsed seasons:', seasonsData);
                // Normalize season data - ensure season_id is available
                const normalizedSeasons = seasonsData.map(s => ({
                    ...s,
                    season_id: s.season_id || s.id,  // Fallback to id if season_id is missing
                }));
                console.log('[SeasonPlayerRegistrationForm] Normalized seasons:', normalizedSeasons);
                setSeasons(normalizedSeasons);
            } catch (err) {
                console.error('Failed to fetch seasons', err);
                setSeasons([]);
            } finally {
                setLoadingSeasons(false);
            }
        };
        fetchSeasons();
    }, []);

    // Fetch teams when season_id changes
    useEffect(() => {
        const fetchTeams = async () => {
            if (!formData.season_id) {
                setSeasonTeams([])
                setFormData(prev => ({ ...prev, season_team_id: '' }))
                return
            }

            try {
                // Check if season_id is a valid number
                const seasonIdNum = parseInt(formData.season_id, 10)
                if (isNaN(seasonIdNum)) {
                    console.error('[SeasonPlayerRegistrationForm] Invalid season_id (not a number):', formData.season_id)
                    setSeasonTeams([])
                    return
                }
                console.log('[SeasonPlayerRegistrationForm] Fetching teams for season:', seasonIdNum)
                const response = await ApiService.get(`/seasons/${seasonIdNum}/teams`)
                console.log('[SeasonPlayerRegistrationForm] Teams response:', response)
                const teams = Array.isArray(response) ? response : (response?.data || [])
                console.log('[SeasonPlayerRegistrationForm] Parsed teams:', teams)
                setSeasonTeams(teams)

                // Auto select first team (team admin usually has only 1 team)
                if (teams.length > 0) {
                    const firstTeamId = String(teams[0].id || teams[0].team_id)
                    console.log('[SeasonPlayerRegistrationForm] Auto-selecting team:', firstTeamId, teams[0])
                    setFormData(prev => ({ ...prev, season_team_id: firstTeamId }))
                } else {
                    console.log('[SeasonPlayerRegistrationForm] No teams found for this season')
                }
            } catch (err) {
                console.error('Failed to fetch teams', err)
                setSeasonTeams([])
            }
        }
        fetchTeams();
    }, [formData.season_id]);

    // Fetch already registered players for this season/team
    useEffect(() => {
        const fetchRegisteredPlayers = async () => {
            if (!formData.season_id || !formData.season_team_id) {
                setRegisteredPlayerIds(new Set());
                setUsedShirtNumbers(new Set());
                return;
            }
            
            try {
                // Fetch players already registered in this season for this team
                const response = await ApiService.get('/season-players/my-team/approved', {
                    season_id: formData.season_id,
                    team_id: formData.season_team_id
                });
                
                const registeredPlayers = response?.data?.players || response?.players || [];
                const playerIds = new Set(registeredPlayers.map(p => p.player_id));
                const shirtNums = new Set(registeredPlayers.map(p => p.shirt_number).filter(Boolean));
                
                console.log('[SeasonPlayerRegistrationForm] Registered players:', playerIds.size, 'Used shirt numbers:', shirtNums);
                setRegisteredPlayerIds(playerIds);
                setUsedShirtNumbers(shirtNums);
            } catch (err) {
                console.error('Failed to fetch registered players', err);
                setRegisteredPlayerIds(new Set());
                setUsedShirtNumbers(new Set());
            }
        };
        
        fetchRegisteredPlayers();
    }, [formData.season_id, formData.season_team_id]);

    // Fetch Players when Team & Season selected
    useEffect(() => {
        const fetchPlayers = async () => {
            if (!formData.season_team_id) {
                setTeamPlayers([])
                return
            }
            setLoadingData(true)
            try {
                // We need to support fetching players by internal_team_id (football_players)
                // The season_team object usually has 'team_id'
                console.log('[SeasonPlayerRegistrationForm] Looking for team with season_team_id:', formData.season_team_id)
                console.log('[SeasonPlayerRegistrationForm] Available seasonTeams:', seasonTeams)
                const selectedSeasonTeam = seasonTeams.find(t => String(t.id) === String(formData.season_team_id));
                console.log('[SeasonPlayerRegistrationForm] Selected season team:', selectedSeasonTeam)
                // Fallback: if backend returns teamId or team_id in season_team object
                const teamId = selectedSeasonTeam?.team_id || selectedSeasonTeam?.teamId;
                console.log('[SeasonPlayerRegistrationForm] Team ID for player fetch:', teamId)

                if (teamId) {
                    // Get Players from FootballPlayers pool belonging to this team
                    console.log('[SeasonPlayerRegistrationForm] Fetching players for team:', teamId)
                    const players = await TeamsService.getTeamPlayers(teamId);
                    console.log('[SeasonPlayerRegistrationForm] Players response:', players, 'length:', players?.length)
                    if (players && players.length > 0) {
                        console.log('[SeasonPlayerRegistrationForm] First player:', players[0])
                    }
                    setTeamPlayers(players || []);
                    
                    // If we have selected players from localStorage, ensure they're in the list
                    if (selectedPlayerIds.size > 0) {
                        const selectedIds = Array.from(selectedPlayerIds);
                        const existingIds = new Set((players || []).map(p => p.id));
                        const missingIds = selectedIds.filter(id => !existingIds.has(id));
                        
                        if (missingIds.length > 0) {
                            // Load missing players from API
                            const missingPlayers = await Promise.all(
                                missingIds.map(async (playerId) => {
                                    try {
                                        const response = await ApiService.get(`/players/${playerId}`);
                                        const player = response?.data || response;
                                        return {
                                            id: player.id || player.player_id,
                                            name: player.displayName || player.fullName || player.name || player.full_name,
                                            nationality: player.nationality,
                                            position: player.preferredPosition || player.position || player.preferred_position,
                                            date_of_birth: player.dateOfBirth || player.date_of_birth
                                        };
                                    } catch (err) {
                                        console.error(`Failed to load player ${playerId}`, err);
                                        return null;
                                    }
                                })
                            );
                            
                            const validPlayers = missingPlayers.filter(p => p !== null);
                            if (validPlayers.length > 0) {
                                setTeamPlayers(prev => [...prev, ...validPlayers]);
                            }
                        }
                    }
                } else {
                    console.warn('[SeasonPlayerRegistrationForm] No teamId found! Cannot fetch players.')
                    console.log('[SeasonPlayerRegistrationForm] seasonTeams state:', seasonTeams)
                    console.log('[SeasonPlayerRegistrationForm] formData.season_team_id:', formData.season_team_id)
                }
            } catch (e) {
                console.error(e)
            } finally {
                setLoadingData(false)
            }
        }
        fetchPlayers()
    }, [formData.season_team_id, seasonTeams, selectedPlayerIds])


    const handleCheckboxChange = (playerId) => {
        const newSet = new Set(selectedPlayerIds);
        if (newSet.has(playerId)) {
            newSet.delete(playerId);
        } else {
            newSet.add(playerId);
            // Init details if not present
            if (!playerDetails[playerId]) {
                setPlayerDetails(prev => ({
                    ...prev,
                    [playerId]: {
                        shirt_number: '',
                        player_type: 'domestic'
                    }
                }))
            }
        }
        setSelectedPlayerIds(newSet);
    };

    const handleDetailChange = (playerId, field, value) => {
        setPlayerDetails(prev => ({
            ...prev,
            [playerId]: {
                ...prev[playerId],
                [field]: value
            }
        }));
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        if (!file) {
            setMessage({ type: 'error', text: '⚠️ Vui lòng tải lên hồ sơ đăng ký (PDF) cho đợt này.' });
            setLoading(false);
            return;
        }

        if (selectedPlayerIds.size === 0) {
            setMessage({ type: 'error', text: '⚠️ Vui lòng chọn ít nhất 1 cầu thủ.' });
            setLoading(false);
            return;
        }

        // Pre-validate: Check for duplicate shirt numbers within selection
        const shirtNumbersInSelection = new Map();
        const validationErrors = [];
        
        for (const playerId of selectedPlayerIds) {
            const details = playerDetails[playerId];
            if (!details?.shirt_number) {
                const player = teamPlayers.find(p => p.id === playerId);
                validationErrors.push(`${player?.name || `ID ${playerId}`}: Chưa nhập số áo`);
                continue;
            }
            
            const shirtNum = parseInt(details.shirt_number, 10);
            
            // Check if this shirt number is already used in the team (from DB)
            if (usedShirtNumbers.has(shirtNum)) {
                const player = teamPlayers.find(p => p.id === playerId);
                validationErrors.push(`${player?.name || `ID ${playerId}`}: Số áo ${shirtNum} đã được đăng ký trong đội`);
            }
            
            // Check if this shirt number is duplicated within the current selection
            if (shirtNumbersInSelection.has(shirtNum)) {
                const existingPlayerId = shirtNumbersInSelection.get(shirtNum);
                const existingPlayer = teamPlayers.find(p => p.id === existingPlayerId);
                const currentPlayer = teamPlayers.find(p => p.id === playerId);
                validationErrors.push(`Số áo ${shirtNum} bị trùng: ${existingPlayer?.name || existingPlayerId} và ${currentPlayer?.name || playerId}`);
            } else {
                shirtNumbersInSelection.set(shirtNum, playerId);
            }
        }
        
        if (validationErrors.length > 0) {
            setMessage({
                type: 'error',
                text: '⚠️ Lỗi validation trước khi đăng ký:',
                details: validationErrors
            });
            setLoading(false);
            return;
        }

        let successCount = 0;
        let failCount = 0;
        const errors = [];

        const playersToRegister = Array.from(selectedPlayerIds);

        // Ideally we should use a batch API, but iterating is safer for now if backend doesn't support batch
        for (const playerId of playersToRegister) {
            try {
                const details = playerDetails[playerId];
                if (!details?.shirt_number) {
                    throw new Error(`Cầu thủ ID ${playerId} chưa nhập số áo.`);
                }

                // Construct FormData for upload
                // The ApiService.upload handles FormData creation if we pass object + file?
                // Let's check ApiService usage. Usually: upload(url, file, additionalFields)

                // Detailed Position (from FootballPlayers)
                const detailedPos = teamPlayers.find(p => p.id === playerId)?.position || 'Midfielder';

                // Map to Group Code (Goalkeeper, Defence, Midfield, Forward)
                const groupCode = mapPositionToGroup(detailedPos);

                await ApiService.upload('/season-players/register', file, {
                    season_id: formData.season_id,
                    season_team_id: formData.season_team_id,
                    player_id: playerId,
                    position_code: groupCode, // Store Functional Group
                    shirt_number: details.shirt_number,
                    player_type: details.player_type
                });

                successCount++;
            } catch (err) {
                console.error(`Failed to register player ${playerId}`, err);
                failCount++;
                let msg = err.response?.data?.message || err.message;
                errors.push(`ID ${playerId}: ${mapBackendErrorToUserMessage(msg)}`);
            }
        }

        if (failCount === 0) {
            setMessage({ type: 'success', text: `✅ Đăng ký thành công ${successCount} cầu thủ.` });
            setSelectedPlayerIds(new Set());
            setPlayerDetails({});
            setFile(null);
            // Clear localStorage after successful registration
            localStorage.removeItem('selectedPlayersForRegistration');
            if (onSuccess) onSuccess();
        } else {
            setMessage({
                type: 'error',
                text: `⚠️ Đăng ký: ${successCount} thành công, ${failCount} thất bại.`,
                details: errors
            });
        }

        setLoading(false);
    };

    // Filter players: exclude already registered and apply search
    const filteredPlayers = teamPlayers.filter(p => {
        // Exclude already registered players
        if (registeredPlayerIds.has(p.id)) return false;
        
        // Apply search filter
        const matchesSearch = !searchTerm || 
            (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            String(p.id).includes(searchTerm);
        
        return matchesSearch;
    });

    return (
        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h2 className="text-xl font-semibold text-white mb-1">
                        📋 Đăng ký Cầu thủ Mùa giải
                    </h2>
                    <p className="text-sm text-gray-400">
                        Chọn cầu thủ từ danh sách, nhập số áo và gửi đơn đăng ký
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {registeredPlayerIds.size > 0 && (
                        <div className="bg-green-600/50 border border-green-500 text-green-300 px-3 py-1.5 rounded-lg text-sm">
                            ✓ Đã đăng ký: {registeredPlayerIds.size} cầu thủ
                        </div>
                    )}
                    {selectedPlayerIds.size > 0 && (
                        <div className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                            ✓ Đã chọn {selectedPlayerIds.size} cầu thủ
                        </div>
                    )}
                </div>
            </div>

            {message && (
                <div className={`p-4 mb-4 rounded-lg ${message.type === 'success' ? 'bg-green-900/50 border border-green-700 text-green-300' : 'bg-red-900/50 border border-red-700 text-red-300'}`}>
                    <div className="flex items-center">
                        {message.type === 'success' ? <CheckCircle size={20} className="mr-2" /> : <AlertCircle size={20} className="mr-2" />}
                        <span className="font-medium">{message.text}</span>
                    </div>
                    {message.details && (
                        <ul className="mt-2 text-sm list-disc list-inside ml-6 space-y-1">
                            {message.details.map((err, i) => <li key={i}>{err}</li>)}
                        </ul>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 mb-6">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                        Mùa giải <span className="text-red-400">*</span>
                    </label>
                    <select
                        className="w-full bg-gray-900 border border-gray-600 text-gray-200 rounded-lg px-3 py-2.5 focus:ring-blue-500 focus:border-blue-500"
                        value={formData.season_id}
                        onChange={e => {
                            console.log('[SeasonPlayerRegistrationForm] Season dropdown changed:', e.target.value)
                            setFormData(p => ({ ...p, season_id: e.target.value, season_team_id: '' }))
                        }}
                        disabled={loadingSeasons}
                    >
                        <option value="">-- Chọn mùa giải --</option>
                        {seasons.filter(s => s.season_id || s.id).map((s, idx) => {
                            const seasonIdValue = String(s.season_id || s.id)
                            return (
                                <option key={seasonIdValue || `season-${idx}`} value={seasonIdValue}>
                                    {s.name} {s.code ? `(${s.code})` : ''}
                                </option>
                            )
                        })}
                    </select>
                    {loadingSeasons && (
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <Loader2 size={12} className="animate-spin" /> Đang tải danh sách mùa giải...
                        </p>
                    )}
                </div>
                
                {/* Team info or warning if not registered */}
                {formData.season_id && (
                    <>
                        {seasonTeams.length === 0 ? (
                            <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle size={24} className="text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold text-amber-800 mb-1">Đội chưa tham gia mùa giải này</h4>
                                        <p className="text-sm text-amber-700 mb-3">
                                            Để đăng ký cầu thủ, đội bóng cần:
                                        </p>
                                        <ol className="text-sm text-amber-700 list-decimal list-inside space-y-1 mb-3">
                                            <li>Nhận lời mời từ BTC (Ban tổ chức)</li>
                                            <li>Chấp nhận lời mời tham gia giải</li>
                                            <li>Sau đó mới đăng ký cầu thủ</li>
                                        </ol>
                                        <a 
                                            href="/admin/team-dashboard" 
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
                                        >
                                            <Info size={16} />
                                            Xem lời mời & Chấp nhận tham gia
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ) : formData.season_team_id && (
                            <div className="bg-green-50 border border-green-200 rounded px-4 py-3">
                                <p className="text-sm text-green-800 flex items-center gap-2">
                                    <CheckCircle size={16} />
                                    <span><strong>Đội bóng:</strong> {seasonTeams.find(t => String(t.id || t.team_id) === String(formData.season_team_id))?.name || 'N/A'}</span>
                                    <span className="text-green-600">- Đã đăng ký tham gia mùa giải</span>
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Show selected players from localStorage if any */}
            {selectedPlayerIds.size > 0 && !formData.season_team_id && (
                <div className="bg-amber-900/30 border border-amber-600 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-medium text-amber-300 mb-1 flex items-center gap-2">
                                <Info size={18} />
                                Cầu thủ đã được chọn sẵn
                            </h3>
                            <p className="text-sm text-amber-200">
                                Đã chọn {selectedPlayerIds.size} cầu thủ. Vui lòng chọn mùa giải để xem và hoàn tất đăng ký.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Player Selection Table */}
            {formData.season_team_id && (
                <div className="border border-gray-600 rounded-lg overflow-hidden mb-6">
                    <div className="bg-gray-900 px-4 py-3 border-b border-gray-600 flex justify-between items-center">
                        <h3 className="font-medium text-gray-200">
                            👥 Chọn cầu thủ từ danh sách đội
                            {selectedPlayerIds.size > 0 && (
                                <span className="ml-2 text-sm text-blue-400 font-normal">
                                    ({selectedPlayerIds.size} đã chọn)
                                </span>
                            )}
                        </h3>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm tên cầu thủ..."
                                className="pl-9 pr-3 py-1.5 text-sm bg-gray-800 border border-gray-600 text-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-900/80 text-gray-300 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 text-left w-10">
                                        <input type="checkbox" disabled className="rounded" />
                                    </th>
                                    <th className="px-4 py-3 text-left font-semibold">Cầu thủ</th>
                                    <th className="px-4 py-3 text-left font-semibold">Vị trí</th>
                                    <th className="px-4 py-3 text-left w-32 font-semibold">Số áo *</th>
                                    <th className="px-4 py-3 text-left w-40 font-semibold">Loại cầu thủ *</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {loadingData ? (
                                    <tr><td colSpan={5} className="p-6 text-center text-gray-400">
                                        <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                                        Đang tải danh sách cầu thủ...
                                    </td></tr>
                                ) : filteredPlayers.length === 0 ? (
                                    <tr><td colSpan={5} className="p-6 text-center text-gray-400">
                                        <Info size={24} className="mx-auto mb-2 text-gray-500" />
                                        <p className="font-medium mb-2">Không tìm thấy cầu thủ trong đội</p>
                                        <p className="text-sm text-gray-500">
                                            Đội bóng chưa có cầu thủ nào trong hệ thống.<br/>
                                            Vui lòng thêm cầu thủ vào đội trước khi đăng ký.
                                        </p>
                                        <a 
                                            href="/admin/players" 
                                            className="inline-block mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500"
                                        >
                                            Quản lý cầu thủ
                                        </a>
                                    </td></tr>
                                ) : (
                                    filteredPlayers.map(p => {
                                        const isSelected = selectedPlayerIds.has(p.id);
                                        const details = playerDetails[p.id] || { shirt_number: '', player_type: 'domestic' };

                                        return (
                                            <tr key={p.id} className={isSelected ? 'bg-blue-900/30' : 'hover:bg-gray-700/50'}>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleCheckboxChange(p.id)}
                                                        className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-500 rounded focus:ring-blue-500"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-white">{p.name}</div>
                                                    <div className="text-xs text-gray-400">{p.nationality}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="bg-gray-700 text-gray-200 px-2 py-0.5 rounded text-xs">{p.position}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {(() => {
                                                        const shirtNum = details.shirt_number ? parseInt(details.shirt_number, 10) : null;
                                                        const isDuplicate = shirtNum && usedShirtNumbers.has(shirtNum);
                                                        return (
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    disabled={!isSelected}
                                                                    value={details.shirt_number}
                                                                    placeholder="#"
                                                                    onChange={e => handleDetailChange(p.id, 'shirt_number', e.target.value)}
                                                                    className={`w-full bg-gray-900 border text-gray-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 disabled:bg-gray-800 disabled:text-gray-500 ${isDuplicate ? 'border-red-500' : 'border-gray-600'}`}
                                                                />
                                                                {isDuplicate && (
                                                                    <span className="text-red-400 text-xs mt-1 block">Đã được dùng</span>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <select
                                                        disabled={!isSelected}
                                                        value={details.player_type}
                                                        onChange={e => handleDetailChange(p.id, 'player_type', e.target.value)}
                                                        className="w-full bg-gray-900 border border-gray-600 text-gray-200 rounded px-2 py-1.5 text-sm disabled:bg-gray-800 disabled:text-gray-500"
                                                    >
                                                        <option value="domestic">Nội (Domestic)</option>
                                                        <option value="foreign">Ngoại (Foreign)</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="bg-gray-900 px-4 py-2 border-t border-gray-600 text-xs text-gray-400 flex justify-between">
                        <span className="text-blue-400 font-medium">✓ Đã chọn: {selectedPlayerIds.size} cầu thủ</span>
                        <span>* Bắt buộc nhập khi chọn cầu thủ</span>
                    </div>
                </div>
            )}

            {/* File Upload & Submit */}
            <div className="bg-gray-900 p-5 rounded-lg border border-gray-600">
                <div className="flex flex-col md:flex-row md:items-end gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            📄 Hồ sơ đăng ký (PDF) <span className="text-red-400">*</span>
                        </label>
                        <input 
                            type="file" 
                            accept=".pdf" 
                            onChange={handleFileChange} 
                            className="block w-full text-sm text-gray-300 file:mr-4 file:py-2.5 file:px-5 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer" 
                        />
                        {file && (
                            <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                                <CheckCircle size={14} /> Đã chọn: {file.name}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || selectedPlayerIds.size === 0 || !file}
                        className="flex items-center justify-center gap-2 bg-green-600 text-white px-8 py-3.5 rounded-lg hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg whitespace-nowrap font-semibold text-base transition-all hover:shadow-green-500/30"
                    >
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                        <span>Gửi đơn đăng ký {selectedPlayerIds.size > 0 ? `(${selectedPlayerIds.size} cầu thủ)` : ''}</span>
                    </button>
                </div>
                {selectedPlayerIds.size > 0 && !file && (
                    <p className="text-xs text-amber-400 mt-3 flex items-center gap-1">
                        <AlertCircle size={14} /> Vui lòng tải lên file hồ sơ PDF trước khi gửi đơn
                    </p>
                )}
            </div>
        </div>
    );
};

export default SeasonPlayerRegistrationForm;
