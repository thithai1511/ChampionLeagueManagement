import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Shirt, Footprints, Hash, Calendar, Flag, BarChart2 } from 'lucide-react';
import { toCountryLabel, toPlayerPositionLabel } from '../../../shared/utils/vi';
import { usePlayerAvatar } from '../../../shared/hooks/usePlayerAvatar';
import PlayersService from '../../../layers/application/services/PlayersService';
import ApiService from '../../../layers/application/services/ApiService';
import APP_CONFIG from '../../../config/app.config';

const PlayerProfilePage = () => {
    const { playerId } = useParams();
    const [player, setPlayer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const numericPlayerId = playerId ? parseInt(playerId, 10) : null;
    const { avatarUrl, loading: avatarLoading } = usePlayerAvatar(numericPlayerId, player?.fullName);

    useEffect(() => {
        const fetchPlayerData = async () => {
            if (!numericPlayerId) {
                setError('Invalid player ID');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                // Fetch player basic info
                const playerData = await PlayersService.getPlayerById(numericPlayerId);
                
                if (!playerData) {
                    setError('Cầu thủ không tồn tại');
                    setLoading(false);
                    return;
                }

                // Fetch player stats if available
                let stats = {
                    matchesPlayed: 0,
                    minutesPlayed: 0,
                    goals: 0,
                    assists: 0,
                    yellowCards: 0,
                    redCards: 0
                };

                try {
                    const statsEndpoint = APP_CONFIG.API.ENDPOINTS.STATS.PLAYER_DETAIL.replace(':id', numericPlayerId);
                    const statsResponse = await ApiService.get(statsEndpoint);
                    if (statsResponse?.data) {
                        stats = {
                            matchesPlayed: statsResponse.data.matches_played || 0,
                            minutesPlayed: statsResponse.data.minutes_played || 0,
                            goals: statsResponse.data.goals || statsResponse.data.goals_scored || 0,
                            assists: statsResponse.data.assists || 0,
                            yellowCards: statsResponse.data.yellow_cards || 0,
                            redCards: statsResponse.data.red_cards || 0
                        };
                    }
                } catch (statsError) {
                    console.warn('Could not fetch player stats:', statsError);
                    // Continue without stats
                }

                // Map backend data to frontend format
                const mappedPlayer = {
                    id: playerData.id || playerData.player_id,
                    fullName: playerData.fullName || playerData.full_name || playerData.displayName || playerData.display_name || 'Unknown',
                    dob: playerData.dateOfBirth || playerData.date_of_birth || null,
                    nationality: playerData.nationality || null,
                    height: playerData.heightCm || playerData.height_cm || null,
                    weight: playerData.weightKg || playerData.weight_kg || null,
                    position: playerData.preferredPosition || playerData.preferred_position || null,
                    shirtNumber: playerData.shirtNumber || playerData.shirt_number || null,
                    portraitUrl: playerData.avatarUrl || playerData.avatar_url || null,
                    currentTeam: {
                        id: playerData.currentTeamId || playerData.current_team_id || null,
                        name: playerData.currentTeamName || playerData.current_team_name || null,
                        logoUrl: null
                    },
                    stats: stats,
                    careerHistory: [] // TODO: Fetch career history if needed
                };

                setPlayer(mappedPlayer);
            } catch (err) {
                console.error('Error fetching player:', err);
                setError('Không thể tải thông tin cầu thủ');
            } finally {
                setLoading(false);
            }
        };

        fetchPlayerData();
    }, [playerId, numericPlayerId]);

    if (loading) {
        return <div className="text-center py-12">Đang tải hồ sơ cầu thủ...</div>;
    }

    if (error) {
        return (
            <div className="uefa-container py-8">
                <div className="text-center py-12">
                    <p className="text-red-600 text-lg mb-4">{error}</p>
                    <Link to="/players" className="text-blue-600 hover:underline">
                        Quay lại danh sách cầu thủ
                    </Link>
                </div>
            </div>
        );
    }

    if (!player) {
        return <div className="text-center py-12">Không tìm thấy thông tin cầu thủ</div>;
    }

    return (
        <div className="uefa-container py-8">
            {/* Player Header */}
            <div className="flex items-end gap-6 mb-8">
                {avatarLoading ? (
                    <div className="w-40 h-40 rounded-full border-4 border-white shadow-lg bg-gray-200 animate-pulse flex items-center justify-center">
                        <span className="text-gray-400">Loading...</span>
                    </div>
                ) : (
                    <img 
                        src={avatarUrl} 
                        alt={player.fullName} 
                        className="w-40 h-40 rounded-full border-4 border-white shadow-lg object-cover" 
                        loading="lazy"
                        onError={(e) => {
                            // Fallback to initials if image fails to load
                            e.target.style.display = 'none';
                            const fallback = e.target.nextElementSibling;
                            if (fallback) fallback.style.display = 'flex';
                        }}
                    />
                )}
                {!avatarLoading && (
                    <div className="w-40 h-40 rounded-full border-4 border-white shadow-lg bg-uefa-blue hidden items-center justify-center">
                        <span className="text-white text-2xl font-bold">
                            {player.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </span>
                    </div>
                )}
                <div>
                    <p className="text-gray-500">{toPlayerPositionLabel(player.position)}</p>
                    <h1 className="text-5xl font-bold text-uefa-dark">{player.fullName}</h1>
                    <div className="flex items-center text-3xl font-bold text-uefa-blue mt-2">
                        <Shirt size={30} className="mr-2"/>{player.shirtNumber}
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid md:grid-cols-3 gap-8">
                {/* Cột chính: Thống kê */}
                <div className="md:col-span-2">
                    <div className="uefa-card p-6">
                        <h2 className="text-xl font-bold mb-4 flex items-center"><BarChart2 className="mr-2" /> Thống kê mùa giải</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-center">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-3xl font-bold">{player.stats.matchesPlayed}</p>
                                <p className="text-sm text-gray-500">Số trận</p>
                            </div>
                             <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-3xl font-bold">{player.stats.goals}</p>
                                <p className="text-sm text-gray-500">Bàn thắng</p>
                            </div>
                             <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-3xl font-bold">{player.stats.assists}</p>
                                <p className="text-sm text-gray-500">Kiến tạo</p>
                            </div>
                            {/* ... Các thống kê khác ... */}
                        </div>
                    </div>
                </div>

                {/* Cột phụ: Thông tin cá nhân & Lịch sử */}
                <div className="space-y-6">
                    <div className="uefa-card p-6">
                        <h2 className="text-xl font-bold mb-4">Tiểu sử</h2>
                        <p><Flag size={16} className="inline mr-2" />{toCountryLabel(player.nationality)}</p>
                        <p><Calendar size={16} className="inline mr-2" />{player.dob}</p>
                        {/* ... Các thông tin khác ... */}
                    </div>
                    <div className="uefa-card p-6">
                        <h2 className="text-xl font-bold mb-4">Lịch sử thi đấu</h2>
                        <ul className="space-y-2">
                            {player.careerHistory.map(item => (
                                <li key={item.season} className="text-sm"><strong>{item.season}:</strong> {item.team}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerProfilePage;
