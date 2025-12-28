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
    const [seasonTeams, setSeasonTeams] = useState([]);
    const [teamPlayers, setTeamPlayers] = useState([]);
    const [loadingData, setLoadingData] = useState(false);

    // Selection & Details (Map: playerId -> { shirt_number, player_type })
    const [selectedPlayerIds, setSelectedPlayerIds] = useState(new Set());
    const [playerDetails, setPlayerDetails] = useState({});

    // Filter
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch teams when season_id changes
    useEffect(() => {
        const fetchTeams = async () => {
            if (!formData.season_id) {
                setSeasonTeams([])
                setFormData(prev => ({ ...prev, season_team_id: '' }))
                return
            }

            try {
                const response = await ApiService.get(`/seasons/${formData.season_id}/teams`)
                const teams = Array.isArray(response?.data) ? response.data : []
                setSeasonTeams(teams)

                // Auto select if 1 team
                if (teams.length > 0 && !formData.season_team_id) {
                    setFormData(prev => ({ ...prev, season_team_id: String(teams[0].id) }))
                }
            } catch (err) {
                console.error('Failed to fetch teams', err)
                setSeasonTeams([])
            }
        }
        fetchTeams();
    }, [formData.season_id]);

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
                const selectedSeasonTeam = seasonTeams.find(t => String(t.id) === String(formData.season_team_id));
                // Fallback: if backend returns teamId or team_id in season_team object
                const teamId = selectedSeasonTeam?.team_id || selectedSeasonTeam?.teamId;

                if (teamId) {
                    // Get Players from FootballPlayers pool belonging to this team
                    const players = await TeamsService.getTeamPlayers(teamId);
                    setTeamPlayers(players || []);
                }
            } catch (e) {
                console.error(e)
            } finally {
                setLoadingData(false)
            }
        }
        fetchPlayers()
    }, [formData.season_team_id, seasonTeams])


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

    const filteredPlayers = teamPlayers.filter(p =>
        (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        String(p.id).includes(searchTerm)
    );

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Đăng ký Mùa giải (Batch Registration)
            </h2>

            {message && (
                <div className={`p-4 mb-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mùa giải <span className="text-red-500">*</span></label>
                    <input
                        type="number"
                        className="w-full border border-gray-300 rounded px-3 py-2"
                        placeholder="Season ID"
                        value={formData.season_id}
                        onChange={e => setFormData(p => ({ ...p, season_id: e.target.value }))}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Đội bóng <span className="text-red-500">*</span></label>
                    <select
                        className="w-full border border-gray-300 rounded px-3 py-2"
                        value={formData.season_team_id}
                        onChange={e => setFormData(p => ({ ...p, season_team_id: e.target.value }))}
                        disabled={!formData.season_id}
                    >
                        <option value="">-- Chọn đội --</option>
                        {seasonTeams.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Player Selection Table */}
            {formData.season_team_id && (
                <div className="border rounded-lg overflow-hidden mb-6">
                    <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                        <h3 className="font-medium text-gray-700">Chọn cầu thủ từ Team Pool</h3>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm tên..."
                                className="pl-9 pr-3 py-1 text-sm border rounded-full"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 text-gray-600 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-2 text-left w-10">
                                        <input type="checkbox" disabled />
                                    </th>
                                    <th className="px-4 py-2 text-left">Cầu thủ</th>
                                    <th className="px-4 py-2 text-left">Vị trí</th>
                                    <th className="px-4 py-2 text-left w-32">Số áo *</th>
                                    <th className="px-4 py-2 text-left w-40">Loại *</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {loadingData ? (
                                    <tr><td colSpan={5} className="p-4 text-center">Loading players...</td></tr>
                                ) : filteredPlayers.length === 0 ? (
                                    <tr><td colSpan={5} className="p-4 text-center text-gray-500">Không tìm thấy cầu thủ trong đội.</td></tr>
                                ) : (
                                    filteredPlayers.map(p => {
                                        const isSelected = selectedPlayerIds.has(p.id);
                                        const details = playerDetails[p.id] || { shirt_number: '', player_type: 'domestic' };

                                        return (
                                            <tr key={p.id} className={isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleCheckboxChange(p.id)}
                                                        className="w-4 h-4 text-blue-600 rounded"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-900">{p.name}</div>
                                                    <div className="text-xs text-gray-500">{p.nationality}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs">{p.position}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        disabled={!isSelected}
                                                        value={details.shirt_number}
                                                        placeholder="#"
                                                        onChange={e => handleDetailChange(p.id, 'shirt_number', e.target.value)}
                                                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <select
                                                        disabled={!isSelected}
                                                        value={details.player_type}
                                                        onChange={e => handleDetailChange(p.id, 'player_type', e.target.value)}
                                                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm disabled:bg-gray-100"
                                                    >
                                                        <option value="domestic">Domestic</option>
                                                        <option value="foreign">Foreign</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="bg-gray-50 px-4 py-2 border-t text-xs text-gray-500 flex justify-between">
                        <span>Đã chọn: {selectedPlayerIds.size} cầu thủ</span>
                        <span>* Bắt buộc nhập khi chọn</span>
                    </div>
                </div>
            )}

            {/* File Upload & Submit */}
            <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
                <div className="flex-1 mr-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hồ sơ (PDF) cho đợt đăng ký này</label>
                    <input type="file" accept=".pdf" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={loading || selectedPlayerIds.size === 0}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm whitespace-nowrap"
                >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                    <span>Đăng ký {selectedPlayerIds.size} cầu thủ</span>
                </button>
            </div>
        </div>
    );
};

export default SeasonPlayerRegistrationForm;
