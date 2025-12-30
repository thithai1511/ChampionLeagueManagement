import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TeamsService from '../../../layers/application/services/TeamsService';
import { APP_CONFIG } from '../../../config/app.config';
import {
    CheckCircle,
    XCircle,
    AlertTriangle,
    Shield,
    Shirt,
    User,
    Users,
    Activity,
    ChevronLeft
} from 'lucide-react';

const SHOW_REJECTION_BANNER = false;

// ==========================================
// 1. HELPERS (Fetch & Token)
// ==========================================
function getToken() {
    return localStorage.getItem("auth_token") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") || "";
}

// Keep existing apiFetch for match/lineup endpoints
async function apiFetch(path, options = {}) {
    const token = getToken();
    const baseUrl = APP_CONFIG.API.BASE_URL;

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    // Ensure path has leading slash
    const safePath = path.startsWith('/') ? path : `/${path}`;
    const url = `${baseUrl}${safePath}`;

    const res = await fetch(url, {
        ...options,
        headers,
    });

    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();
    let data = null;

    if (text) {
        if (!contentType.includes("application/json")) {
            throw {
                message: `Non-JSON response (${res.status}) from ${safePath}`,
                raw: text.slice(0, 100)
            };
        }
        try {
            data = JSON.parse(text);
        } catch (e) {
            throw {
                message: `Invalid JSON (${res.status}) from ${safePath}`,
                raw: text.slice(0, 100)
            };
        }
    }

    if (!res.ok) {
        throw data || { message: res.statusText || "Request failed" };
    }
    return data;
}

const toNum = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

// ==========================================
// 2. COMPONENT MATCH LINEUP REVIEW
// ==========================================
const MatchLineupReviewPage = () => {
    const { matchId } = useParams();
    const navigate = useNavigate();

    // Data State
    const [match, setMatch] = useState(null);
    const [lineups, setLineups] = useState([]);
    const [teamInfos, setTeamInfos] = useState({ home: null, away: null });
    const [reviewStatus, setReviewStatus] = useState({ home: null, away: null });

    // Mapped Data - Keys are strictly Numbers
    const [rosterMap, setRosterMap] = useState({}); // { [id]: { name, position, shirtNumber } }
    const [seasonMetaMap, setSeasonMetaMap] = useState({}); // { [id]: { shirtNumber, position } }

    // UI State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionProcessing, setActionProcessing] = useState(null);

    // Reject Modal State
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectTarget, setRejectTarget] = useState(null); // 'home' | 'away'
    const [rejectionReason, setRejectionReason] = useState("");

    // Load Data
    useEffect(() => {
        loadAllData();
    }, [matchId]);

    const loadAllData = async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Get Match Detail first
            const matchRes = await apiFetch(`/matches/${matchId}`);
            const matchData = matchRes.data;
            setMatch(matchData);

            // 2. Parallel Fetch: Lineups, TeamInfos, Review
            const [lineupsRes, infosRes, reviewRes] = await Promise.all([
                apiFetch(`/matches/${matchId}/lineups`),
                apiFetch(`/matches/${matchId}/team-infos`),
                apiFetch(`/matches/${matchId}/lineups/review`),
            ]);

            setLineups(lineupsRes.data || []);
            setTeamInfos(infosRes.data || { home: null, away: null });
            setReviewStatus(reviewRes.data || { home: { status: 'PENDING' }, away: { status: 'PENDING' } });

            // 3. Fetch Players (Roster + Season Players)
            const htId = matchData.homeTeamId ?? matchData.home_team_id;
            const atId = matchData.awayTeamId ?? matchData.away_team_id;
            const sId = matchData.seasonId ?? matchData.season_id;

            // Helper to safe fetch
            const safeFetch = (promise) => promise.catch(e => { console.warn("Fetch failed (safe):", e); return []; });

            const [homeRoster, awayRoster, homeSeason, awaySeason] = await Promise.all([
                htId ? safeFetch(TeamsService.getTeamPlayers(htId)) : [],
                atId ? safeFetch(TeamsService.getTeamPlayers(atId)) : [],
                (sId && htId) ? safeFetch(TeamsService.getApprovedSeasonPlayers(sId, { team_id: htId })) : [],
                (sId && atId) ? safeFetch(TeamsService.getApprovedSeasonPlayers(sId, { team_id: atId })) : [],
            ]);

            // A. Build Roster Map (PRIMARY source for Name)
            // Normalized key: Number(id)
            const rMap = {};
            const addToRoster = (list) => {
                if (!Array.isArray(list)) return;
                list.forEach(p => {
                    const pid = toNum(p.id ?? p.player_id ?? p.playerId);
                    if (!pid) return;
                    rMap[pid] = {
                        name: p.name ?? p.full_name ?? p.display_name ?? p.fullName,
                        position: p.position ?? p.preferred_position,
                        shirtNumber: p.shirtNumber ?? p.shirt_number
                    };
                });
            };
            addToRoster(homeRoster);
            addToRoster(awayRoster);
            setRosterMap(rMap);

            // B. Build Season Meta Map (PRIMARY source for Shirt/Pos)
            const sMap = {};
            const addToSeason = (list) => {
                if (!Array.isArray(list)) return;
                list.forEach(p => {
                    const pid = toNum(p.player_id ?? p.id ?? p.playerId);
                    if (!pid) return;

                    sMap[pid] = {
                        shirtNumber: p.jersey_number ?? p.shirt_number ?? p.shirtNumber ?? p.jerseyNumber ?? null,
                        position: p.position ?? p.position_code ?? p.positionCode ?? p.preferred_position ?? null
                    };
                });
            };
            addToSeason(homeSeason);
            addToSeason(awaySeason);
            setSeasonMetaMap(sMap);

        } catch (err) {
            console.error("Load failed", err);
            setError(err.message || "Không thể tải dữ liệu trận đấu");
        } finally {
            setLoading(false);
        }
    };

    const refreshReviewStatus = async () => {
        try {
            const res = await apiFetch(`/matches/${matchId}/lineups/review`);
            setReviewStatus(res.data);
        } catch (err) {
            console.error("Refresh review failed", err);
        }
    };

    // Actions
    const handleApprove = async (teamType) => {
        if (!confirm(`Xác nhận DUYỆT đội hình ${teamType === 'home' ? 'Chủ nhà' : 'Khách'}?`)) return;

        setActionProcessing(`${teamType}-approve`);
        try {
            await apiFetch(`/matches/${matchId}/lineups/${teamType}/approve`, { method: 'POST' });
            await refreshReviewStatus();
            alert("Đã duyệt thành công!");
        } catch (err) {
            alert(err.message || "Lỗi khi duyệt");
        } finally {
            setActionProcessing(null);
        }
    };

    const openRejectModal = (teamType) => {
        setRejectTarget(teamType);
        setRejectionReason("");
        setShowRejectModal(true);
    };

    const handleRejectSubmit = async () => {
        if (!rejectionReason.trim()) {
            alert("Vui lòng nhập lý do từ chối");
            return;
        }

        setActionProcessing(`${rejectTarget}-reject`);
        try {
            await apiFetch(`/matches/${matchId}/lineups/${rejectTarget}/reject`, {
                method: 'POST',
                body: JSON.stringify({ reason: rejectionReason })
            });
            await refreshReviewStatus();
            alert("Đã từ chối thành công!");
            setShowRejectModal(false);
        } catch (err) {
            alert(err.message || "Lỗi khi từ chối");
        } finally {
            setActionProcessing(null);
        }
    };

    // Render Logic
    const getTeamLineup = (type) => {
        if (!match) return { starters: [], subs: [] };

        // Match Season ID filtering
        const targetSeasonTeamId = type === 'home'
            ? toNum(match.homeSeasonTeamId)
            : toNum(match.awaySeasonTeamId);

        if (!targetSeasonTeamId) return { starters: [], subs: [] };

        const items = lineups.filter(x => toNum(x.seasonTeamId) === targetSeasonTeamId);
        const starters = items.filter(p => toNum(p.isStarting) === 1);
        const subs = items.filter(p => !toNum(p.isStarting));

        return { starters, subs };
    };

    const renderTeamCard = (type) => {
        if (!match) return null;

        const isHome = type === 'home';
        const teamName = isHome ? match.homeTeamName : match.awayTeamName;
        const info = isHome ? teamInfos.home : teamInfos.away;
        const review = isHome ? reviewStatus.home : reviewStatus.away;
        const status = review?.status || 'PENDING';

        const { starters, subs } = getTeamLineup(type);

        const isPending = status === 'PENDING';
        const isApproved = status === 'APPROVED';
        const isRejected = status === 'REJECTED';

        const canApprove = !isPending && !isApproved;
        const canReject = !isPending;

        // Custom Wording for Color Conflict
        const getPrettyReason = () => {
            const r = (review?.rejectionReason || '').trim();
            if (!r) return null;

            const kit = info?.kitType; // 'HOME' | 'AWAY' | null
            const isColorIssue = r.toLowerCase().includes('trùng màu') || r.toLowerCase().includes('color');

            if (isColorIssue) {
                return (
                    <div>
                        <div className="font-bold">BTC yêu cầu đổi áo sân khách (AWAY).</div>
                        <div className="text-xs mt-1 opacity-75 font-normal">
                            (Lý do gốc: {r})
                        </div>
                    </div>
                );
            }
            return r;
        };

        const prettyReason = isRejected ? getPrettyReason() : null;

        return (
            <div className={`flex flex-col h-full bg-white rounded-lg shadow-sm border ${isApproved ? 'border-green-200' : isRejected ? 'border-amber-200' : 'border-gray-200'}`}>
                {/* Header */}
                <div className="p-4 border-b bg-gray-50 rounded-t-lg">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg text-gray-800">{type === 'home' ? 'CHỦ NHÀ (Home)' : 'KHÁCH (Away)'}</h3>
                        {getStatusBadge(status)}
                    </div>
                    <p className="text-blue-700 font-medium text-lg truncate" title={teamName}>{teamName}</p>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-1.5 text-gray-600">
                            <Shield size={16} />
                            <span>{info?.formation || "(Chưa chọn)"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-600">
                            <Shirt size={16} />
                            <span>{info?.kitType === 'HOME' ? 'Áo sân nhà' : info?.kitType === 'AWAY' ? 'Áo sân khách' : "(Chưa chọn)"}</span>
                        </div>
                    </div>

                    {/* Banner Logic: Only if REJECTED */}
                    {SHOW_REJECTION_BANNER && isRejected && prettyReason && (
                        <div className="mt-3 p-2 bg-red-50 text-red-800 text-sm rounded border border-red-100">
                            <strong>Lý do BTC từ chối đội hình đội này:</strong>
                            <div className="mt-1">{prettyReason}</div>
                        </div>
                    )}
                </div>

                {/* List Content */}
                <div className="flex-1 p-0 overflow-y-auto max-h-[600px]">
                    <div className="p-4 border-b">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-sm text-gray-700 uppercase flex items-center gap-2">
                                <User size={16} /> Chính thức
                            </h4>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${starters.length === 11 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {starters.length}/11
                            </span>
                        </div>
                        <PlayerList items={starters} rosterMap={rosterMap} seasonMetaMap={seasonMetaMap} />
                    </div>

                    <div className="p-4">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-sm text-gray-700 uppercase flex items-center gap-2">
                                <Users size={16} /> Dự bị
                            </h4>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${subs.length >= 1 && subs.length <= 5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {subs.length}/5
                            </span>
                        </div>
                        <PlayerList items={subs} rosterMap={rosterMap} seasonMetaMap={seasonMetaMap} />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t bg-gray-50 rounded-b-lg grid grid-cols-2 gap-3">
                    <button
                        onClick={() => handleApprove(type)}
                        disabled={!canApprove}
                        className="px-4 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        <CheckCircle size={18} /> Duyệt
                    </button>
                    <button
                        onClick={() => openRejectModal(type)}
                        disabled={!canReject}
                        className="px-4 py-2 bg-red-600 text-white rounded font-medium hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        <XCircle size={18} /> Từ chối
                    </button>
                </div>
            </div>
        );
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'APPROVED': return <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full uppercase">Đã duyệt</span>;
            case 'REJECTED': return <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-full uppercase">Cần chỉnh sửa</span>;
            case 'SUBMITTED': return <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full uppercase">Chờ duyệt</span>;
            default: return <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-full uppercase">Chưa nộp</span>;
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Đang tải dữ liệu trận đấu...</div>;
    if (error) return <div className="p-8 text-center text-red-500 font-medium">Lỗi: {error}</div>;

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/admin/matches')}
                        className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
                    >
                        <ChevronLeft size={20} /> Quay lại
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Shield className="text-blue-600" />
                        Duyệt Đội Hình - Trận đấu #{matchId}
                    </h1>
                </div>
                <button
                    onClick={() => navigate(`/admin/matches/${matchId}/live`)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
                >
                    <Activity size={18} />
                    Quản lý trận đấu
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[750px]">
                {renderTeamCard('home')}
                {renderTeamCard('away')}
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <AlertTriangle className="text-red-500" />
                            Từ chối đội hình {rejectTarget === 'home' ? 'Chủ nhà' : 'Đội khách'}
                        </h3>

                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Nhập lý do từ chối (bắt buộc)..."
                            className="w-full border border-gray-300 rounded-md p-3 min-h-[100px] mb-4 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                        />

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded font-medium"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleRejectSubmit}
                                disabled={!rejectionReason.trim()}
                                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded font-medium disabled:opacity-50"
                            >
                                Xác nhận từ chối
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// UI List Helper - Prioritize Maps
const PlayerList = ({ items, rosterMap, seasonMetaMap }) => {
    if (!items || items.length === 0) {
        return <p className="text-sm text-gray-400 italic">Chưa có danh sách</p>;
    }

    return (
        <ul className="space-y-1">
            {items.map(p => {
                // Ensure PID is strictly number for lookup
                const pid = toNum(p.playerId);

                const rData = rosterMap[pid];
                const sData = seasonMetaMap[pid];

                // Name priority: RosterMap (best) > Fallback
                const name = rData?.name || `Player #${pid}`;

                // Shirt/Pos priority: Lineup (best) > SeasonMap (next) > RosterMap > "(chưa đăng ký)"
                // Lineup might have null values, so we check carefully
                const shirtRaw = p.jerseyNumber ?? sData?.shirtNumber ?? rData?.shirtNumber ?? null;
                const posRaw = p.position ?? sData?.position ?? rData?.position ?? null;

                const shirtDisplay = shirtRaw !== null ? `#${shirtRaw}` : "(chưa đăng ký)";
                const posDisplay = posRaw !== null ? posRaw : "(chưa đăng ký)";

                return (
                    <li key={pid || Math.random()} className="text-sm py-2 border-b border-gray-50 last:border-0 flex justify-between items-center">
                        <div>
                            <div className="font-medium text-gray-800">
                                {name}
                            </div>
                            <div className="text-xs text-gray-500">
                                Vị trí: {posDisplay}
                            </div>
                        </div>

                        <span className={`text-sm font-bold px-2 py-1 rounded ${shirtRaw !== null ? 'bg-gray-100 text-gray-700' : 'bg-yellow-50 text-yellow-700 text-xs italic'}`}>
                            {shirtDisplay}
                        </span>
                    </li>
                );
            })}
        </ul>
    );
};

export default MatchLineupReviewPage;
