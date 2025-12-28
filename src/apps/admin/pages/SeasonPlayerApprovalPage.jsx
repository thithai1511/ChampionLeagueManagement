import React, { useEffect, useState } from "react";
import {
    Check,
    X,
    FileText,
    Loader2,
    AlertCircle,
    ShieldCheck,
    Calendar,
    User,
    Filter,
    RotateCcw
} from "lucide-react";
import RegistrationStatusBadge from "../components/RegistrationStatusBadge";
import RejectReasonView from "../components/RejectReasonView";
import ApiService from '../../../layers/application/services/ApiService';
import APP_CONFIG from '../../../config/app.config';
import toast, { Toaster } from 'react-hot-toast';
import { hasPermission } from '../utils/accessControl';


import TeamsService from '../../../layers/application/services/TeamsService';

const SeasonPlayerApprovalPage = ({ currentUser }) => {
    const [list, setList] = useState([]);

    // Filter Options State
    const [seasons, setSeasons] = useState([]);
    const [teams, setTeams] = useState([]);

    // Filter Selection State (IDs)
    const [filterSeason, setFilterSeason] = useState("");
    const [filterTeam, setFilterTeam] = useState("");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const [rejectId, setRejectId] = useState(null);
    const [approveId, setApproveId] = useState(null);
    const [rejectReason, setRejectReason] = useState("");
    const [showApproveAllConfirm, setShowApproveAllConfirm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const canApprove = hasPermission(currentUser, 'approve_player_registrations');

    // =========================
    // 1. Fetch Filter Options (Seasons & Teams)
    // =========================
    useEffect(() => {
        const fetchFilters = async () => {
            try {
                // Fetch Seasons
                const seasonsRes = await ApiService.get('/seasons');
                const seasonsData = Array.isArray(seasonsRes) ? seasonsRes : (seasonsRes?.data || []);
                setSeasons(seasonsData);

                // Fetch Teams
                const teamsRes = await TeamsService.getAllTeams({ limit: 1000 });
                // TeamsService usually handles mapping, but let's be safe
                const teamsData = teamsRes?.teams || teamsRes || [];
                setTeams(teamsData);
            } catch (err) {
                console.error("Failed to load filters", err);
                toast.error("Không thể tải danh sách mùa giải/đội bóng");
            }
        };
        fetchFilters();
    }, []);

    // =========================
    // 2. Load pending registrations (Server-Side Filter)
    // =========================
    const fetchPending = async () => {
        setLoading(true);
        setError(false);
        try {
            // Fix: Construct params dynamically to avoid sending "undefined" string
            const params = { status: 'pending' };
            if (filterSeason) params.seasonId = filterSeason;
            if (filterTeam) params.teamId = filterTeam;

            const response = await ApiService.get(
                APP_CONFIG.API.ENDPOINTS.PLAYER_REGISTRATIONS.LIST,
                params
            );

            // Fix: Handle ApiService response wrapper ({ data: [...] })
            const dataArray = Array.isArray(response) ? response : (response?.data || []);

            // Standardize data
            const safeData = dataArray.map(item => ({
                ...item,
                registration_status: 'pending',
                reject_reason: item.reject_reason ?? null
            }));

            setList(safeData);
        } catch (err) {
            console.error("Fetch pending error:", err);
            setError(true);
            toast.error("Không thể tải danh sách hồ sơ chờ duyệt");
        } finally {
            setLoading(false);
        }
    };

    // Refetch when filters change
    useEffect(() => {
        fetchPending();
    }, [filterSeason, filterTeam]);

    //Derived State for Filters - No longer needed as filtering is server-side
    // const uniqueSeasons = React.useMemo(() => {
    //     return [...new Set(list.map(item => item.season_name).filter(Boolean))].sort();
    // }, [list]);

    // const uniqueTeams = React.useMemo(() => {
    //     return [...new Set(list.map(item => item.team_name).filter(Boolean))].sort();
    // }, [list]);

    // const filteredList = React.useMemo(() => {
    //     return list.filter(item => {
    //         if (filterSeason && item.season_name !== filterSeason) return false;
    //         if (filterTeam && item.team_name !== filterTeam) return false;
    //         return true;
    //     });
    // }, [list, filterSeason, filterTeam]);

    const resetFilters = () => {
        setFilterSeason("");
        setFilterTeam("");
    };

    // =========================
    // Approve
    // =========================
    const handleApprove = (id) => {
        setApproveId(id);
    };

    const confirmApproveSingle = async () => {
        setSubmitting(true);
        try {
            const endpoint = APP_CONFIG.API.ENDPOINTS.PLAYER_REGISTRATIONS.APPROVE.replace(':id', approveId);
            await ApiService.post(endpoint);

            toast.success("Duyệt hồ sơ thành công");
            setApproveId(null);
            fetchPending();
        } catch (err) {
            toast.error(err?.message || "Duyệt hồ sơ thất bại");
        } finally {
            setSubmitting(false);
        }
    };

    // =========================
    // Reject
    // =========================
    const submitReject = async () => {
        if (!rejectReason.trim()) {
            toast.error("Vui lòng nhập lý do từ chối");
            return;
        }

        setSubmitting(true);
        try {
            const endpoint = APP_CONFIG.API.ENDPOINTS.PLAYER_REGISTRATIONS.REJECT.replace(':id', rejectId);
            await ApiService.post(endpoint, { reason: rejectReason });

            toast.success("Từ chối hồ sơ thành công");
            setRejectId(null);
            setRejectReason("");
            fetchPending();
        } catch (err) {
            toast.error(err?.message || "Từ chối hồ sơ thất bại");
        } finally {
            setSubmitting(false);
        }
    };

    // =========================
    // Approve All
    // =========================
    const handleApproveAllClick = () => {
        setShowApproveAllConfirm(true);
    };

    const confirmApproveAll = async () => {
        setSubmitting(true);
        try {
            await ApiService.post(APP_CONFIG.API.ENDPOINTS.SEASON_PLAYERS.APPROVE_ALL);

            toast.success("Đã duyệt tất cả hồ sơ");
            setShowApproveAllConfirm(false);
            fetchPending();
        } catch (err) {
            toast.error(err?.message || "Duyệt tất cả thất bại");
        } finally {
            setSubmitting(false);
        }
    };

    // =========================
    // Helpers
    // =========================
    const formatDate = (iso) => {
        if (!iso) return "—";
        return new Date(iso).toLocaleDateString("vi-VN");
    };

    const openPdf = (path) => {
        if (!path) return;
        const normalized = path.replace(/\\/g, "/");
        window.open(`/${normalized}`, "_blank");
    };

    // =========================
    // Render
    // =========================
    return (
        <div className="p-6">
            <Toaster position="top-right" />
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <ShieldCheck className="text-blue-500" size={28} />
                        Duyệt hồ sơ đăng ký cầu thủ
                    </h1>
                    <p className="text-gray-400 mt-1">
                        Xem và duyệt các hồ sơ đăng ký cầu thủ đang chờ xử lý.
                    </p>
                </div>
                {canApprove && list.length > 0 && (
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-900/30 text-blue-300 border border-blue-800 text-sm font-semibold px-4 py-1.5 rounded-full">
                            {list.length} hồ sơ đang chờ
                        </div>
                        <button
                            disabled={submitting}
                            onClick={handleApproveAllClick}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting && <Loader2 size={16} className="animate-spin" />}
                            Duyệt tất cả
                        </button>
                    </div>
                )}
            </div>

            {/* Filters (Server-side) */}
            <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-4 mb-6 flex flex-wrap gap-4 items-end">
                <div className="flex items-center gap-2 text-gray-400 mb-2 md:mb-0 mr-2">
                    <Filter size={20} />
                    <span className="font-medium text-sm">Bộ lọc:</span>
                </div>

                <div className="w-full md:w-48">
                    <label className="block text-xs uppercase text-gray-500 font-semibold mb-1">Mùa giải</label>
                    <select
                        value={filterSeason}
                        onChange={(e) => setFilterSeason(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                    >
                        <option value="">Tất cả</option>
                        {seasons.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="w-full md:w-56">
                    <label className="block text-xs uppercase text-gray-500 font-semibold mb-1">Đội bóng</label>
                    <select
                        value={filterTeam}
                        onChange={(e) => setFilterTeam(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                    >
                        <option value="">Tất cả</option>
                        {teams.map(t => (
                            <option key={t.id} value={t.id}>
                                {t.name}
                            </option>
                        ))}
                    </select>
                </div>

                {(filterSeason || filterTeam) && (
                    <button
                        onClick={resetFilters}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition-colors border border-gray-600"
                    >
                        <RotateCcw size={16} />
                        Reset
                    </button>
                )}
            </div>

            {/* List State */}
            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <Loader2 size={40} className="animate-spin mb-4 text-blue-500" />
                    <p>Đang tải danh sách chờ duyệt...</p>
                </div>
            ) : error ? (
                <div className="bg-red-900/20 rounded-xl border border-red-800 p-8 text-center">
                    <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-red-200">Không thể tải dữ liệu</h3>
                    <p className="text-red-400 mt-2 mb-4">Đã xảy ra lỗi khi tải danh sách hồ sơ.</p>
                    <button
                        onClick={fetchPending}
                        className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Thử lại
                    </button>
                </div>
            ) : list.length === 0 ? (
                <div className="bg-gray-800/50 rounded-xl border border-dashed border-gray-700 p-16 text-center">
                    <div className="bg-gray-700 p-4 rounded-full inline-block mb-4">
                        <Check size={40} className="text-green-500" />
                    </div>
                    <h3 className="text-lg font-medium text-white">
                        {(filterSeason || filterTeam) ? "Không có hồ sơ nào khớp bộ lọc" : "Đã duyệt hết!"}
                    </h3>
                    <p className="text-gray-400 mt-1">
                        {(filterSeason || filterTeam) ? "Thử bỏ bộ lọc để xem các hồ sơ khác." : "Tuyệt vời, không có hồ sơ nào đang chờ xử lý."}
                    </p>
                </div>
            ) : (
                <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-300">
                            <thead className="bg-gray-900/50 text-gray-400 uppercase text-xs font-semibold border-b border-gray-700">
                                <tr>
                                    <th className="px-6 py-4">Cầu thủ</th>
                                    <th className="px-6 py-4">Đội bóng</th>
                                    <th className="px-6 py-4">Mùa giải</th>
                                    {/* <th className="px-6 py-4">Trạng thái</th> - Redundant since all are Pending */}
                                    <th className="px-6 py-4 text-center">Hồ sơ</th>
                                    <th className="px-6 py-4 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {list.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-gray-700 p-2 rounded-full text-blue-400">
                                                    <User size={18} />
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-white block">{item.player_name}</span>
                                                    <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                        <Calendar size={10} /> {formatDate(item.registered_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-300">
                                            {item.team_name}
                                        </td>
                                        <td className="px-6 py-4 text-gray-400">
                                            {item.season_name}
                                        </td>
                                        {/* Status column removed as redundancy */}
                                        <td className="px-6 py-4 text-center">
                                            {item.file_path ? (
                                                <button
                                                    onClick={() => openPdf(item.file_path)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-900/20 text-blue-400 hover:bg-blue-900/40 border border-transparent hover:border-blue-800 transition-colors"
                                                    title="Xem PDF"
                                                >
                                                    <FileText size={14} />
                                                    Xem PDF
                                                </button>
                                            ) : (
                                                <span className="text-xs text-gray-600 italic">Không có hồ sơ</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {canApprove && (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        disabled={submitting}
                                                        onClick={() => handleApprove(item.id)}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-900/20 text-green-400 hover:bg-green-900/40 rounded-lg text-xs font-semibold transition-all border border-transparent hover:border-green-800 disabled:opacity-50"
                                                        title="Duyệt"
                                                    >
                                                        <Check size={14} />
                                                        Duyệt
                                                    </button>
                                                    <button
                                                        disabled={submitting}
                                                        onClick={() => setRejectId(item.id)}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-900/20 text-red-400 hover:bg-red-900/40 rounded-lg text-xs font-semibold transition-all border border-transparent hover:border-red-800 disabled:opacity-50"
                                                        title="Từ chối"
                                                    >
                                                        <X size={14} />
                                                        Từ chối
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {rejectId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-700">
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <AlertCircle size={20} className="text-red-500" />
                                Từ chối hồ sơ đăng ký
                            </h3>
                            <button
                                onClick={() => setRejectId(null)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Lý do từ chối <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                rows={4}
                                className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-600 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm text-white placeholder-gray-500 transition-all resize-none"
                                placeholder="Nhập lý do từ chối..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                autoFocus
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                Đội bóng sẽ được thông báo lý do từ chối này.
                            </p>
                        </div>

                        <div className="p-4 bg-gray-900/50 flex justify-end gap-3 border-t border-gray-700">
                            <button
                                onClick={() => setRejectId(null)}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                disabled={submitting || !rejectReason.trim()}
                                onClick={submitReject}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-colors flex items-center gap-2"
                            >
                                {submitting ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                                Xác nhận từ chối
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Approve All Confirmation Modal */}
            {showApproveAllConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-700 animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Check size={20} className="text-green-500" />
                                Xác nhận duyệt tất cả
                            </h3>
                            <button
                                onClick={() => setShowApproveAllConfirm(false)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-300 text-base leading-relaxed">
                                Bạn có chắc chắn muốn duyệt tất cả hồ sơ đang chờ không?
                            </p>
                        </div>
                        <div className="p-4 bg-gray-900/50 flex justify-end gap-3 border-t border-gray-700">
                            <button
                                onClick={() => setShowApproveAllConfirm(false)}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                disabled={submitting}
                                onClick={confirmApproveAll}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 shadow-lg transition-colors flex items-center gap-2"
                            >
                                {submitting && <Loader2 size={16} className="animate-spin" />}
                                Duyệt tất cả
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Approve Single Confirmation Modal */}
            {approveId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-700 animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Check size={20} className="text-green-500" />
                                Duyệt hồ sơ cầu thủ
                            </h3>
                            <button
                                onClick={() => setApproveId(null)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-300 text-base leading-relaxed">
                                Bạn có chắc chắn muốn duyệt hồ sơ đăng ký của cầu thủ này không?
                            </p>
                        </div>
                        <div className="p-4 bg-gray-900/50 flex justify-end gap-3 border-t border-gray-700">
                            <button
                                onClick={() => setApproveId(null)}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                disabled={submitting}
                                onClick={confirmApproveSingle}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 shadow-lg transition-colors flex items-center gap-2"
                            >
                                {submitting && <Loader2 size={16} className="animate-spin" />}
                                Duyệt hồ sơ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SeasonPlayerApprovalPage;
