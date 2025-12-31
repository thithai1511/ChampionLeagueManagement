import React, { useState, useEffect, useMemo } from 'react';
import {
    Users, Calendar, Shield, AlertTriangle, CheckCircle,
    XCircle, Clock, Loader2, Shirt, Info, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import SeasonService from '../../../layers/application/services/SeasonService';
import TeamsService from '../../../layers/application/services/TeamsService';
import ApiService from '../../../layers/application/services/ApiService';

const TeamMatchLineupRegistration = ({ currentUser }) => {
    const [loading, setLoading] = useState(false);

    // Data State
    const [seasons, setSeasons] = useState([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState(null);

    // Eligibility State
    const [registration, setRegistration] = useState(null);
    const [isEligible, setIsEligible] = useState(false);
    const [eligibilityLoading, setEligibilityLoading] = useState(false);

    // Match & Team State
    const [matches, setMatches] = useState([]);
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [mySeasonTeamId, setMySeasonTeamId] = useState(null);
    const [matchReviewStatus, setMatchReviewStatus] = useState(null); // { status, rejectionReason, ... }

    // Players State
    const [players, setPlayers] = useState([]); // Approved players only
    const [playersLoading, setPlayersLoading] = useState(false);

    // Form State
    const [lineup, setLineup] = useState({
        startingPlayerIds: [], // IDs
        substitutePlayerIds: [], // IDs
        formation: '4-4-2', // Default
        kitType: 'HOME'
    });
    const [submitting, setSubmitting] = useState(false);

    // Derived
    const teamId = useMemo(() => currentUser?.teamIds?.[0], [currentUser]);

    // 1. Initial Load: Seasons
    useEffect(() => {
        const fetchSeasons = async () => {
            setLoading(true);
            try {
                const data = await SeasonService.listSeasons();
                setSeasons(data || []);
                if (data && data.length > 0) {
                    // Default to latest
                    const sorted = [...data].sort((a, b) => b.id - a.id);
                    setSelectedSeasonId(sorted[0].id);
                }
            } catch (error) {
                console.error("Failed to load seasons", error);
                toast.error("Không thể tải danh sách mùa giải");
            } finally {
                setLoading(false);
            }
        };
        fetchSeasons();
    }, []);

    // 2. Season Change: Check Name-Based Match Filtering & Load Matches
    useEffect(() => {
        if (!selectedSeasonId || !teamId) return;

        // Helpers
        const normalizeName = (name) => {
            if (!name) return '';
            return name
                .toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove diacritics
                .trim()
                .replace(/\s+/g, ' '); // remove extra spaces
        };

        const fetchData = async () => {
            setEligibilityLoading(true);
            setRegistration(null);
            setIsEligible(false);
            setMatches([]);
            setSelectedMatch(null);
            setPlayers([]);

            let myTeamNames = [];

            try {
                // A. Parallel: Get Eligibility & My Team Info (for Name Filtering)
                const [regRes, teamRes] = await Promise.all([
                    ApiService.get(`/seasons/${selectedSeasonId}/registrations/my`).catch(e => null),
                    TeamsService.getTeamById(teamId).catch(e => null)
                ]);

                // Local vars to handle race condition in same effect flow
                let regDataLocal = null;
                let eligibleLocal = false;

                // 1. Process Registration (Eligibility)
                if (regRes) {
                    regDataLocal = regRes?.data?.data || regRes?.data;
                    if (regDataLocal) {
                        setRegistration(regDataLocal);

                        const status = String(regDataLocal.status || regDataLocal.registration_status || '').toUpperCase();
                        const feeStatus = String(regDataLocal.feeStatus || regDataLocal.fee_status || '').toLowerCase();

                        eligibleLocal = status === 'APPROVED' && (feeStatus === 'paid' || feeStatus === 'waived');
                        setIsEligible(eligibleLocal);
                    }
                }

                // 2. Process Team Names
                if (teamRes) {
                    const t = teamRes;
                    const rawNames = [t.name, t.short_name, t.code, t.official_name].filter(Boolean);
                    myTeamNames = rawNames.map(normalizeName);
                    // Also enable logging
                    console.log(`[LineupRegistration] My Team Normalized Names:`, myTeamNames);
                } else {
                    toast.error("Không thể lấy thông tin đội bóng");
                    return;
                }

                // B. Load Matches
                const extractList = (res, label) => {
                    const list = Array.isArray(res) ? res : (res?.data || []);
                    return list;
                };

                let allMatches = [];
                try {
                    const [scheduledRes, preparingRes] = await Promise.all([
                        ApiService.get(`/seasons/${selectedSeasonId}/matches/by-status?status=SCHEDULED`),
                        ApiService.get(`/seasons/${selectedSeasonId}/matches/by-status?status=PREPARING`)
                    ]);

                    const list1 = extractList(scheduledRes, 'SCHEDULED');
                    const list2 = extractList(preparingRes, 'PREPARING');

                    allMatches = [...list1, ...list2];
                    console.log(`[LineupRegistration] Raw Matches Found: ${allMatches.length}`);

                } catch (e) {
                    console.warn("[LineupRegistration] Failed to load matches", e);
                }

                // C. Name-Based Filter
                const myMatches = allMatches.filter(m => {
                    const home = normalizeName(m.home_team_name || m.homeTeamName);
                    const away = normalizeName(m.away_team_name || m.awayTeamName);
                    // Match if any of my names match home or away
                    const isHome = myTeamNames.includes(home);
                    const isAway = myTeamNames.includes(away);
                    return isHome || isAway;
                });

                // D. Deduplicate & Sort
                const uniqueMatches = Array.from(new Map(myMatches.map(m => [m.match_id ?? m.id, m])).values());
                uniqueMatches.sort((a, b) => {
                    const tA = new Date(a.scheduled_kickoff || a.start_time || a.utcDate);
                    const tB = new Date(b.scheduled_kickoff || b.start_time || b.utcDate);
                    return tA - tB;
                });

                console.log(`[LineupRegistration] Filtered Matches: ${uniqueMatches.length}`, uniqueMatches[0] || 'None');
                setMatches(uniqueMatches);

                // E. Load Players (ALWAYS independent of eligibility check failure)
                setPlayersLoading(true);
                try {
                    const approvedRes = await TeamsService.getMyTeamApprovedSeasonPlayers(selectedSeasonId, teamId);

                    const approvedList =
                        Array.isArray(approvedRes) ? approvedRes :
                            approvedRes?.players ? approvedRes.players :
                                approvedRes?.data?.players ? approvedRes.data.players :
                                    approvedRes?.data?.data?.players ? approvedRes.data.data.players :
                                        approvedRes?.data?.data ? approvedRes.data.data :
                                            approvedRes?.data ? approvedRes.data :
                                                [];

                    setPlayers(Array.isArray(approvedList) ? approvedList : []);
                } catch (e) {
                    console.error("Failed to load approved players", e);
                    setPlayers([]);
                } finally {
                    setPlayersLoading(false);
                }

            } catch (error) {
                console.error("Error in data fetch flow", error);
                toast.error("Lỗi khi tải dữ liệu");
            } finally {
                setEligibilityLoading(false);
            }
        };

        fetchData();
    }, [selectedSeasonId, teamId]);

    // 3. Match Select: Determine ID & Load Context
    useEffect(() => {
        if (!selectedMatch) {
            setMySeasonTeamId(null);
            setMatchReviewStatus(null);
            setLineup({
                startingPlayerIds: [],
                substitutePlayerIds: [],
                formation: '4-4-2',
                kitType: 'HOME'
            });
            return;
        }

        const fetchMatchContext = async () => {
            try {
                // Helpers within effect
                const normalizeName = (name) => {
                    if (!name) return '';
                    return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                };

                const myTeamRes = await TeamsService.getTeamById(teamId).catch(() => null);
                if (!myTeamRes) return;

                const myName = normalizeName(myTeamRes.name);
                const homeName = normalizeName(selectedMatch.home_team_name || selectedMatch.homeTeamName);

                // Determine Identity
                const isHome = myName === homeName; // or check short_name if needed

                // Grab ID directly from match object
                // The API returns home_season_team_id / away_season_team_id
                const directId = isHome ? selectedMatch.home_season_team_id : selectedMatch.away_season_team_id;

                if (directId) {
                    setMySeasonTeamId(directId);
                } else {
                    // Fallback to registration if match object incomplete
                    if (registration?.season_team_id) setMySeasonTeamId(registration.season_team_id);
                    else toast.error("Không xác định được ID tham dự giải của đội");
                }

                // Load Review Status
                const mId = selectedMatch.match_id || selectedMatch.id;
                const reviewRes = await ApiService.get(`/matches/${mId}/lineups/review`);
                const mySideKey = isHome ? 'home' : 'away';
                const myData = reviewRes?.data?.[mySideKey];

                if (myData) {
                    setMatchReviewStatus({
                        status: myData.status,
                        rejectionReason: myData.rejectionReason,
                        submittedAt: myData.submittedAt
                    });

                    // Pre-fill
                    try {
                        const infoRes = await ApiService.get(`/matches/${mId}/team-infos`);
                        const infoData = infoRes?.data?.[mySideKey];
                        if (infoData) {
                            setLineup(prev => ({
                                ...prev,
                                formation: infoData.formation || '4-4-2',
                                kitType: infoData.kitType || (isHome ? 'HOME' : 'AWAY'),
                                startingPlayerIds: infoData.startingPlayers?.map(p => p.player_id || p.id) || [],
                                substitutePlayerIds: infoData.substitutes?.map(p => p.player_id || p.id) || []
                            }));
                        } else if (!myData.status) {
                            setLineup(prev => ({ ...prev, kitType: isHome ? 'HOME' : 'AWAY' }));
                        }
                    } catch (e) {
                        setLineup(prev => ({ ...prev, kitType: isHome ? 'HOME' : 'AWAY' }));
                    }
                }

            } catch (error) {
                console.error("Match context error", error);
            }
        };

        fetchMatchContext();
    }, [selectedMatch, teamId, registration]);


    // Helper: Toggle Player
    const togglePlayer = (playerId, targetList) => {
        // targetList: 'starting' | 'sub'

        // Check if player exists in Approved List (Strict Validation)
        const isApproved = players.some(p => p.player_id === playerId);
        if (!isApproved) {
            toast.error("Cầu thủ này không thuộc danh sách được duyệt!");
            return;
        }

        setLineup(prev => {
            const newStart = [...prev.startingPlayerIds];
            const newSub = [...prev.substitutePlayerIds];

            if (targetList === 'starting') {
                // Remove from sub if there
                const subIdx = newSub.indexOf(playerId);
                if (subIdx > -1) newSub.splice(subIdx, 1);

                // Toggle in start
                const startIdx = newStart.indexOf(playerId);
                if (startIdx > -1) {
                    newStart.splice(startIdx, 1);
                } else {
                    if (newStart.length < 11) newStart.push(playerId);
                    else toast.error("Đã đủ 11 cầu thủ chính thức");
                }
            } else {
                // Remove from start if there
                const startIdx = newStart.indexOf(playerId);
                if (startIdx > -1) newStart.splice(startIdx, 1);

                // Toggle in sub
                const subIdx = newSub.indexOf(playerId);
                if (subIdx > -1) {
                    newSub.splice(subIdx, 1);
                } else {
                    if (newSub.length < 5) newSub.push(playerId);
                    else toast.error("Đã đủ 5 cầu thủ dự bị");
                }
            }

            return { ...prev, startingPlayerIds: newStart, substitutePlayerIds: newSub };
        });
    };

    // Submit Handler
    const handleSubmit = async () => {
        // 1. Validate
        if (lineup.startingPlayerIds.length !== 11) {
            toast.error(`Cần đúng 11 cầu thủ đá chính (Hiện có: ${lineup.startingPlayerIds.length})`);
            return;
        }

        // 2. Strict Approved Check (Double check before submit)
        const allIds = [...lineup.startingPlayerIds, ...lineup.substitutePlayerIds];
        const invalidIds = allIds.filter(id => !players.find(p => p.player_id === id));
        if (invalidIds.length > 0) {
            toast.error("Fatarl: Phát hiện cầu thủ không hợp lệ (không được duyệt). Vui lòng reload.");
            return;
        }

        if (!mySeasonTeamId) {
            toast.error("Missing SeasonTeamID. Vui lòng thử lại.");
            return;
        }

        setSubmitting(true);
        try {
            const mId = selectedMatch.match_id || selectedMatch.id;
            const payload = {
                seasonTeamId: mySeasonTeamId,
                seasonId: selectedSeasonId,
                startingPlayerIds: lineup.startingPlayerIds,
                substitutePlayerIds: lineup.substitutePlayerIds,
                formation: lineup.formation,
                kitType: lineup.kitType
            };

            await ApiService.post(`/matches/${mId}/lineups`, payload);
            toast.success("Gửi đăng ký thi đấu thành công!");

            // Reload status
            const reviewRes = await ApiService.get(`/matches/${mId}/lineups/review`);
            // The review endpoint returns { home: { seasonTeamId: ... }, away: ... }
            // We know mySeasonTeamId. We can find which side has that ID.

            const data = reviewRes?.data;
            let myData = null;
            if (data?.home?.seasonTeamId === mySeasonTeamId) myData = data.home;
            else if (data?.away?.seasonTeamId === mySeasonTeamId) myData = data.away;

            if (myData) {
                setMatchReviewStatus({
                    status: myData.status,
                    rejectionReason: myData.rejectionReason,
                    submittedAt: myData.submittedAt
                });
            }

        } catch (error) {
            console.error("Submit error", error);
            toast.error(error?.response?.data?.error || "Gửi đăng ký thất bại");
        } finally {
            setSubmitting(false);
        }
    };

    // Renders
    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-500" size={32} /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Đăng ký thi đấu</h1>
                <select
                    className="border rounded px-3 py-2"
                    value={selectedSeasonId || ''}
                    onChange={(e) => setSelectedSeasonId(Number(e.target.value))}
                >
                    <option value="">Chọn mùa giải</option>
                    {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>

            {/* 1. Eligibility Banner */}
            {selectedSeasonId && !eligibilityLoading && (
                <>
                    {!registration ? (
                        <div className="bg-red-50 p-4 rounded border border-red-200 text-red-700 flex items-center gap-3">
                            <AlertTriangle />
                            <div>
                                <p className="font-bold">Đội bóng chưa đăng ký tham gia mùa giải này.</p>
                            </div>
                        </div>
                    ) : !isEligible ? (
                        <div className="bg-amber-50 p-4 rounded border border-amber-200 text-amber-800 flex items-center gap-3">
                            <AlertTriangle />
                            <div>
                                <p className="font-bold">Chưa đủ điều kiện đăng ký thi đấu</p>
                                <p className="text-sm">Yêu cầu: Đăng ký được DUYỆT (Approved) và Đã hoàn thành lệ phí (Paid).</p>
                                <p className="text-sm mt-1">
                                    Trạng thái hiện tại: {String(registration.status || registration.registration_status || '').toUpperCase()}
                                    &nbsp;|&nbsp;
                                    Lệ phí: {String(registration.feeStatus || registration.fee_status || '').toUpperCase()}
                                </p>
                            </div>
                        </div>
                    ) : (
                        // ELIGIBLE CONTENT
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left: Match List */}
                            <div className="lg:col-span-1 space-y-4">
                                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                                    <Calendar size={18} /> Danh sách trận đấu
                                </h3>

                                {matches.length === 0 ? (
                                    <p className="text-gray-500 text-sm italic">Chưa có lịch thi đấu.</p>
                                ) : (
                                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                        {matches.map(m => {
                                            const mId = m.match_id || m.id;
                                            const isSelected = selectedMatch && (selectedMatch.match_id === mId || selectedMatch.id === mId);

                                            // Determine IsHome based on name match (approximate for List View)
                                            // Since we filtered by name, we assume we are one of them.
                                            // But for list view, marking HOME/AWAY bold is nice but not critical if we lack `myTeamNames` here.
                                            // Let's just render the names plainly.

                                            const homeName = m.home_team_name || m.homeTeamName;
                                            const awayName = m.away_team_name || m.awayTeamName;
                                            const timeStr = m.scheduled_kickoff || m.start_time || m.utcDate;

                                            return (
                                                <div
                                                    key={mId}
                                                    onClick={() => setSelectedMatch(m)}
                                                    className={`p-3 rounded border cursor-pointer transition-all ${isSelected ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-200 hover:border-blue-300'
                                                        }`}
                                                >
                                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                        <span>{timeStr ? new Date(timeStr).toLocaleDateString('vi-VN') : 'TBD'}</span>
                                                        <span>{m.matchday ? `Vòng ${m.matchday}` : (m.round_name || 'Vòng bảng')}</span>
                                                    </div>
                                                    <div className="font-medium flex items-center gap-2">
                                                        <span className="text-blue-900 font-semibold">{homeName}</span>
                                                        <span className="text-gray-400">vs</span>
                                                        <span className="text-blue-900 font-semibold">{awayName}</span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Right: Lineup Form */}
                            <div className="lg:col-span-2">
                                {!selectedMatch ? (
                                    <div className="h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed rounded-lg">
                                        <Info size={32} className="mb-2" />
                                        <p>Chọn trận đấu để đăng ký đội hình</p>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-lg border shadow-sm p-5 space-y-6">
                                        {/* Header Info */}
                                        <div className="flex justify-between items-start border-b pb-4">
                                            <div>
                                                <h2 className="text-xl font-bold flex items-center gap-2">
                                                    {selectedMatch.home_team_name || selectedMatch.homeTeamName}
                                                    vs
                                                    {selectedMatch.away_team_name || selectedMatch.awayTeamName}
                                                </h2>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    Thời gian: {new Date(selectedMatch.scheduled_kickoff || selectedMatch.scheduledKickoff || selectedMatch.start_time || selectedMatch.utcDate).toLocaleString('vi-VN')}
                                                    &nbsp;•&nbsp; Sân: {selectedMatch.stadium_name || selectedMatch.venue || 'Chưa cập nhật'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                {matchReviewStatus?.status === 'APPROVED' && (
                                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                                        <CheckCircle size={14} /> Đã duyệt
                                                    </span>
                                                )}
                                                {matchReviewStatus?.status === 'REJECTED' && (
                                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                                                        <XCircle size={14} /> Bị từ chối
                                                    </span>
                                                )}
                                                {matchReviewStatus?.status === 'PENDING' && (
                                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                                                        <Clock size={14} /> Chờ duyệt
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {matchReviewStatus?.status === 'REJECTED' && (
                                            <div className="bg-red-50 text-red-800 p-3 rounded text-sm">
                                                <strong>Lý do từ chối:</strong> {matchReviewStatus.rejectionReason}
                                                <p className="mt-1 italic">Vui lòng điều chỉnh và gửi lại.</p>
                                            </div>
                                        )}

                                        {/* Players Check */}
                                        {players.length === 0 ? (
                                            <div className="text-center py-8 text-red-500">
                                                <p className="font-bold">Không tìm thấy cầu thủ đủ điều kiện!</p>
                                                <p className="text-sm">Vui lòng kiểm tra lại danh sách đăng ký cầu thủ mùa giải.</p>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Configuration */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Sơ đồ chiến thuật</label>
                                                        <select
                                                            className="w-full border rounded px-3 py-2"
                                                            value={lineup.formation}
                                                            onChange={e => setLineup(prev => ({ ...prev, formation: e.target.value }))}
                                                            disabled={matchReviewStatus?.status === 'APPROVED'}
                                                        >
                                                            <option value="4-4-2">4-4-2</option>
                                                            <option value="4-3-3">4-3-3</option>
                                                            <option value="4-2-3-1">4-2-3-1</option>
                                                            <option value="3-5-2">3-5-2</option>
                                                            <option value="5-3-2">5-3-2</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Trang phục thi đấu</label>
                                                        <div className="flex gap-4 mt-2">
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input type="radio" name="kit" value="HOME"
                                                                    checked={lineup.kitType === 'HOME'}
                                                                    onChange={e => setLineup(prev => ({ ...prev, kitType: 'HOME' }))}
                                                                    disabled={matchReviewStatus?.status === 'APPROVED'}
                                                                />
                                                                <span>Sân nhà</span>
                                                            </label>
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input type="radio" name="kit" value="AWAY"
                                                                    checked={lineup.kitType === 'AWAY'}
                                                                    onChange={e => setLineup(prev => ({ ...prev, kitType: 'AWAY' }))}
                                                                    disabled={matchReviewStatus?.status === 'APPROVED'}
                                                                />
                                                                <span>Sân khách</span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Selection Stats */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-blue-50 p-3 rounded border border-blue-100">
                                                        <span className="text-xs text-blue-600 font-bold uppercase">Đá chính</span>
                                                        <div className="text-2xl font-bold text-blue-900">
                                                            {lineup.startingPlayerIds.length} <span className="text-sm text-gray-400 font-normal">/ 11</span>
                                                        </div>
                                                    </div>
                                                    <div className="bg-green-50 p-3 rounded border border-green-100">
                                                        <span className="text-xs text-green-600 font-bold uppercase">Dự bị</span>
                                                        <div className="text-2xl font-bold text-green-900">
                                                            {lineup.substitutePlayerIds.length} <span className="text-sm text-gray-400 font-normal">/ 5</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Player List */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Chọn cầu thủ ({players.length} khả dụng)
                                                    </label>
                                                    <div className="border rounded-lg max-h-96 overflow-y-auto divide-y">
                                                        {players.map(p => {
                                                            const isStart = lineup.startingPlayerIds.includes(p.player_id);
                                                            const isSub = lineup.substitutePlayerIds.includes(p.player_id);
                                                            return (
                                                                <div key={p.player_id} className={`p-3 flex items-center justify-between hover:bg-gray-50
                                                            ${isStart ? 'bg-blue-50' : isSub ? 'bg-green-50' : ''}
                                                        `}>
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                                                            {p.shirt_number || '#'}
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-medium text-sm text-gray-900">{p.player_name || p.full_name}</p>
                                                                            <p className="text-xs text-gray-500">{p.position_code || p.position}</p>
                                                                        </div>
                                                                        {p.player_type === 'foreign' && (
                                                                            <span className="text-[10px] px-1.5 bg-purple-100 text-purple-700 rounded border border-purple-200">EXT</span>
                                                                        )}
                                                                    </div>

                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            onClick={() => togglePlayer(p.player_id, 'starting')}
                                                                            disabled={matchReviewStatus?.status === 'APPROVED' || (isSub)}
                                                                            className={`px-3 py-1 rounded text-xs font-medium transition-colors
                                                                    ${isStart
                                                                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                                                    : 'bg-white border text-gray-600 hover:bg-gray-50'
                                                                                }
                                                                  `}
                                                                        >
                                                                            {isStart ? 'Đá chính' : 'Chọn đá chính'}
                                                                        </button>
                                                                        <button
                                                                            onClick={() => togglePlayer(p.player_id, 'sub')}
                                                                            disabled={matchReviewStatus?.status === 'APPROVED' || (isStart)}
                                                                            className={`px-3 py-1 rounded text-xs font-medium transition-colors
                                                                    ${isSub
                                                                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                                                                    : 'bg-white border text-gray-600 hover:bg-gray-50'
                                                                                }
                                                                  `}
                                                                        >
                                                                            {isSub ? 'Dự bị' : 'Chọn dự bị'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Action */}
                                                <div className="pt-4 border-t">
                                                    {matchReviewStatus?.status === 'APPROVED' ? (
                                                        <p className="text-center text-green-600 font-medium">
                                                            Danh sách thi đấu đã được duyệt. Không thể thay đổi.
                                                        </p>
                                                    ) : (
                                                        <button
                                                            onClick={handleSubmit}
                                                            disabled={submitting || !mySeasonTeamId}
                                                            className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center gap-2"
                                                        >
                                                            {submitting && <Loader2 className="animate-spin" />}
                                                            Gửi danh sách thi đấu
                                                        </button>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default TeamMatchLineupRegistration;
