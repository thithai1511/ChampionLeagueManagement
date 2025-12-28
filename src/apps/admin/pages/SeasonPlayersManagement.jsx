import React, { useState, useEffect } from 'react';
import { Search, Loader2, FileText, AlertCircle, Users, Calendar, Filter, Trash2, Edit, AlertTriangle, CheckCircle, X, Save } from 'lucide-react';
import ApiService from '../../../layers/application/services/ApiService';
import TeamsService from '../../../layers/application/services/TeamsService';
import SeasonService from '../../../layers/application/services/SeasonService';
import { useAuth } from '../../../layers/application/context/AuthContext';
import { POSITION_GROUPS_LIST, DB_POSITIONS } from '../../../shared/constants/footballPositions';

// Localized player type labels
const PLAYER_TYPE_MAP = {
    domestic: 'Trong nước',
    foreign: 'Nước ngoài',
    u21: 'U21',
    u23: 'U23'
};

// Business Error Localization Map
const ERROR_MESSAGE_MAP = {
    'PLAYER_ALREADY_REGISTERED': 'Cầu thủ đã được đăng ký trong mùa giải này.',
    'SHIRT_NUMBER_ALREADY_USED': 'Số áo này đã được sử dụng trong đội bóng.',
    'SEASON_TEAM_NOT_FOUND': 'Đội bóng này chưa được đăng ký tham gia mùa giải.'
};

const SeasonPlayersManagement = () => {
    const { user } = useAuth();
    const isSuperAdmin = user?.roles?.includes('super_admin');

    // Filter State
    const [filters, setFilters] = useState({
        season_id: '',
        team_id: '',
        position_code: '',
        player_type: ''
    });

    // Data state
    const [seasonTeams, setSeasonTeams] = useState([]);
    const [loadingTeams, setLoadingTeams] = useState(false);

    // Results state
    const [result, setResult] = useState(null); // { total, players: [] }
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);

    // Modal & Action State
    const [removeModal, setRemoveModal] = useState({ isOpen: false, player: null });
    const [editModal, setEditModal] = useState({ isOpen: false, player: null });
    const [editForm, setEditForm] = useState({ shirt_number: '', position_code: '' });

    const [actionStatus, setActionStatus] = useState('idle'); // idle, loading, success, error
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' }); // type: success | error

    // Fetch teams when season_id changes
    useEffect(() => {
        const fetchTeams = async () => {
            if (!filters.season_id) {
                setSeasonTeams([]);
                return;
            }

            setLoadingTeams(true);
            try {
                const response = await ApiService.get(`/seasons/${filters.season_id}/teams`);
                const teamsList = Array.isArray(response) ? response : (response?.data || []);
                setSeasonTeams(teamsList);
            } catch (err) {
                console.error("Failed to fetch teams", err);
                setSeasonTeams([]);
            } finally {
                setLoadingTeams(false);
            }
        };

        const timerId = setTimeout(() => {
            if (filters.season_id) {
                fetchTeams();
            }
        }, 500);

        return () => clearTimeout(timerId);
    }, [filters.season_id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => {
            const newFilters = { ...prev, [name]: value };
            if (name === 'season_id') newFilters.team_id = '';
            return newFilters;
        });
    };

    const handleSearch = async (e) => {
        if (e) e.preventDefault();

        if (!filters.season_id) {
            setError('Vui lòng nhập Season ID.');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);
        setHasSearched(true);

        try {
            const params = {};
            if (filters.team_id) params.team_id = filters.team_id;
            if (filters.position_code) params.position_code = filters.position_code;
            if (filters.player_type) params.player_type = filters.player_type;

            const players = await TeamsService.getApprovedSeasonPlayers(filters.season_id, params);

            setResult({
                season_id: filters.season_id,
                total: players.length,
                players: players
            });
        } catch (err) {
            console.error("Search failed", err);
            let msg = 'Không thể tải danh sách cầu thủ.';
            const errorCode = err?.payload?.error;
            if (errorCode && ERROR_MESSAGE_MAP[errorCode]) {
                msg = ERROR_MESSAGE_MAP[errorCode];
            } else if (err?.payload?.message) {
                msg = err.payload.message;
            } else if (err?.message) {
                msg = err.message;
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    // --- Action Handlers ---

    // Remove
    const openRemoveModal = (player) => {
        if (!isSuperAdmin) return;
        setRemoveModal({ isOpen: true, player });
    };

    const closeRemoveModal = () => {
        if (actionStatus === 'loading') return;
        setRemoveModal({ isOpen: false, player: null });
    };

    const confirmRemove = async () => {
        const { player } = removeModal;
        if (!player || !player.season_player_id) return;

        setActionStatus('loading');

        try {
            await SeasonService.removeSeasonPlayerRegistration(player.season_player_id);

            setActionStatus('success');
            setToast({ show: true, message: 'Đã loại cầu thủ khỏi mùa giải thành công', type: 'success' });

            await handleSearch(null);
            closeRemoveModal();
        } catch (err) {
            console.error("Remove failed", err);
            setActionStatus('error');
            setToast({ show: true, message: 'Không thể loại cầu thủ. Vui lòng thử lại.', type: 'error' });
        } finally {
            setActionStatus('idle');
        }
    };

    // Edit
    const openEditModal = (player) => {
        if (!isSuperAdmin) return;
        setEditForm({
            shirt_number: player.shirt_number,
            position_code: player.position_code
        });
        setEditModal({ isOpen: true, player });
    };

    const closeEditModal = () => {
        setEditModal({ isOpen: false, player: null });
    };

    const handleEditFormChange = (e) => {
        const { name, value } = e.target;
        setEditForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!editModal.player || !editModal.player.season_player_id) return;

        // Frontend Validation
        if (!editForm.shirt_number || editForm.shirt_number < 1 || editForm.shirt_number > 99) {
            setToast({ show: true, message: 'Số áo không hợp lệ (1-99).', type: 'error' });
            return;
        }
        if (!editForm.position_code) {
            setToast({ show: true, message: 'Vui lòng chọn vị trí.', type: 'error' });
            return;
        }

        // Check for duplicates in current list (Frontend Validation)
        if (result && result.players) {
            const duplicate = result.players.find(p =>
                p.season_team_id === editModal.player.season_team_id &&
                String(p.shirt_number) === String(editForm.shirt_number) &&
                p.season_player_id !== editModal.player.season_player_id
            );

            if (duplicate) {
                setToast({ show: true, message: `Số áo ${editForm.shirt_number} đã được sử dụng bởi ${duplicate.player_name}.`, type: 'error' });
                return;
            }
        }

        setActionStatus('loading');
        try {
            await SeasonService.updateSeasonPlayerRegistration(editModal.player.season_player_id, {
                shirt_number: parseInt(editForm.shirt_number),
                position_code: editForm.position_code
            });

            setActionStatus('success');
            setToast({ show: true, message: 'Đã cập nhật thông tin cầu thủ thành công', type: 'success' });

            await handleSearch(null);
            closeEditModal();
        } catch (err) {
            console.error("Update failed", err);
            let msg = 'Không thể cập nhật. Vui lòng thử lại.';
            if (err?.payload?.error === 'Invalid shirt number') msg = 'Số áo không hợp lệ.';
            if (err?.status === 404) msg = 'Không tìm thấy đăng ký hoặc trạng thái không hợp lệ.';
            setActionStatus('error');
            setToast({ show: true, message: msg, type: 'error' });
        } finally {
            setActionStatus('idle');
        }
    };

    // Auto-hide toast
    useEffect(() => {
        if (toast.show && toast.type === 'success') {
            const timer = setTimeout(() => {
                setToast(prev => ({ ...prev, show: false }));
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [toast.show, toast.type]);


    // Helpers
    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('vi-VN');
    };

    const getFileUrl = (path) => {
        if (!path) return null;
        const normalizedPath = path.replace(/\\/g, '/');
        return normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
    };

    return (
        <div className="relative min-h-screen pb-20">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Tra cứu cầu thủ theo mùa giải</h1>
                <p className="text-gray-600 mt-1">
                    Xem danh sách cầu thủ đã đăng ký chính thức trong mùa giải.
                </p>
            </div>

            {/* Filter Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
                    {/* Season ID */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Season ID <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            name="season_id"
                            value={filters.season_id}
                            onChange={handleChange}
                            placeholder="Nhập ID"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    {/* Team */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Đội bóng</label>
                        <div className="relative">
                            <select
                                name="team_id"
                                value={filters.team_id}
                                onChange={handleChange}
                                disabled={!filters.season_id || loadingTeams}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 appearance-none"
                            >
                                <option value="">Tất cả</option>
                                {seasonTeams.map(t => <option key={t.team_id} value={t.team_id}>{t.name}</option>)}
                            </select>
                            {loadingTeams && <div className="absolute right-8 top-1/2 -translate-y-1/2"><Loader2 size={14} className="animate-spin text-gray-400" /></div>}
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"><Filter size={14} /></div>
                        </div>
                    </div>
                    {/* Position */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vị trí</label>
                        <select name="position_code" value={filters.position_code} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Tất cả vị trí</option>
                            {POSITION_GROUPS_LIST.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                    {/* Type */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Loại cầu thủ</label>
                        <select name="player_type" value={filters.player_type} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Tất cả</option>
                            <option value="domestic">Trong nước</option>
                            <option value="foreign">Nước ngoài</option>
                        </select>
                    </div>
                    {/* Submit */}
                    <div className="col-span-1 pt-1">
                        <button type="submit" disabled={loading} className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-60">
                            {loading ? <Loader2 size={20} className="animate-spin" /> : <><Search size={20} /><span>Tìm kiếm</span></>}
                        </button>
                    </div>
                </form>
            </div>

            {/* Feedback */}
            {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center mb-6"><AlertCircle size={20} className="mr-2" />{error}</div>}

            {loading && <div className="flex justify-center p-12"><Loader2 size={40} className="animate-spin text-blue-500" /></div>}

            {!loading && !result && !error && !hasSearched && (
                <div className="bg-blue-50 rounded-lg border border-blue-100 p-8 text-center text-blue-700">
                    <Users size={48} className="mx-auto mb-3 opacity-50" />
                    <p>Nhập Season ID và nhấn Tìm kiếm để xem danh sách cầu thủ.</p>
                </div>
            )}

            {!loading && hasSearched && result && result.players.length === 0 && (
                <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-12 text-center text-gray-500">Không tìm thấy dữ liệu phù hợp.</div>
            )}

            {/* Table */}
            {!loading && result && result.players.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                        <h2 className="font-semibold text-gray-900 flex items-center"><Users size={18} className="mr-2 text-gray-500" />Kết quả tìm kiếm</h2>
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Tổng: {result.total}</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-3">Cầu thủ</th>
                                    <th className="px-6 py-3">Đội bóng</th>
                                    <th className="px-6 py-3 text-center">Số áo</th>
                                    <th className="px-6 py-3 text-center">Vị trí</th>
                                    <th className="px-6 py-3">Loại</th>
                                    <th className="px-6 py-3">Ngày đăng ký</th>
                                    <th className="px-6 py-3 text-right">Hồ sơ</th>
                                    {isSuperAdmin && <th className="px-6 py-3 text-center w-24">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {result.players.map((player) => (
                                    <tr key={`${player.season_id}-${player.player_id}`} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                            {player.player_name}
                                            <div className="text-xs text-gray-500 font-normal">ID: {player.player_id}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                {player.logo_url && <img src={player.logo_url} alt="" className="w-6 h-6 mr-2 object-contain" />}
                                                {player.team_name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center font-semibold text-gray-700">{player.shirt_number}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">{player.position_code}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-xs font-medium px-2.5 py-0.5 rounded capitalize ${player.player_type === 'foreign' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                                {PLAYER_TYPE_MAP[player.player_type] || player.player_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4"><div className="flex items-center"><Calendar size={14} className="mr-1 text-gray-400" />{formatDate(player.registered_at)}</div></td>
                                        <td className="px-6 py-4 text-right">
                                            {player.file_path ? (
                                                <a href={getFileUrl(player.file_path)} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline flex items-center justify-end">
                                                    <FileText size={16} className="mr-1" />View PDF
                                                </a>
                                            ) : <span className="text-gray-400 italic">No file</span>}
                                        </td>
                                        {isSuperAdmin && (
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center space-x-2">
                                                    <button
                                                        onClick={() => openEditModal(player)}
                                                        className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
                                                        title="Chỉnh sửa thông tin đăng ký mùa giải"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => openRemoveModal(player)}
                                                        className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50"
                                                        title="Loại cầu thủ khỏi danh sách đăng ký mùa giải"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Remove Modal */}
            {removeModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 sm:h-10 sm:w-10">
                                    <AlertTriangle className="h-6 w-6 text-red-600" />
                                </div>
                                <div className="ml-3 w-full">
                                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                                        Xác nhận loại cầu thủ
                                    </h3>
                                    <div className="mt-2 text-sm text-gray-500">
                                        <p className="mb-2">Bạn có chắc chắn muốn loại <strong>{removeModal.player?.player_name}</strong> khỏi danh sách thi đấu mùa giải?</p>
                                        <ul className="list-disc pl-5 space-y-1 text-gray-600">
                                            <li>Cầu thủ sẽ không còn trong danh sách chính thức</li>
                                            <li>Dữ liệu hồ sơ cầu thủ vẫn được giữ nguyên</li>
                                            <li>Có thể đăng ký lại ở mùa giải khác</li>
                                        </ul>
                                        <p className="mt-2 text-xs text-red-500 italic font-medium">Hành động này chỉ dành cho Quản trị Tối cao.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-6 py-3 flex flex-row-reverse gap-2">
                            <button
                                type="button"
                                onClick={confirmRemove}
                                disabled={actionStatus === 'loading'}
                                className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-70 disabled:cursor-not-allowed items-center"
                            >
                                {actionStatus === 'loading' && <Loader2 size={16} className="animate-spin mr-2" />}
                                Xác nhận loại
                            </button>
                            <button
                                type="button"
                                onClick={closeRemoveModal}
                                disabled={actionStatus === 'loading'}
                                className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-70"
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editModal.isOpen && editModal.player && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                                <Edit size={18} className="mr-2 text-gray-500" />
                                Chỉnh sửa cầu thủ trong mùa giải
                            </h3>
                            <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-500">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Read-only Info */}
                            <div className="bg-blue-50 rounded-md p-4 text-sm text-blue-900 space-y-1 border border-blue-100">
                                <div className="flex justify-between">
                                    <span className="text-blue-500 font-medium">Tên cầu thủ:</span>
                                    <span className="font-semibold">{editModal.player.player_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-blue-500 font-medium">Đội bóng:</span>
                                    <span>{editModal.player.team_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-blue-500 font-medium">Mùa giải ID:</span>
                                    <span>{editModal.player.season_id}</span>
                                </div>
                            </div>

                            {/* Editable Fields */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Số áo <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        name="shirt_number"
                                        min="1"
                                        max="99"
                                        value={editForm.shirt_number}
                                        onChange={handleEditFormChange}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Vị trí <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        name="position_code"
                                        value={editForm.position_code}
                                        onChange={handleEditFormChange}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Chọn vị trí</option>
                                        {POSITION_GROUPS_LIST.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 px-6 py-3 flex justify-end items-center gap-3">
                            <button
                                type="button"
                                onClick={closeEditModal}
                                disabled={actionStatus === 'loading'}
                                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-70"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={actionStatus === 'loading'}
                                className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed items-center"
                            >
                                {actionStatus === 'loading' && <Loader2 size={16} className="animate-spin mr-2" />}
                                <Save size={16} className="mr-1" />
                                Lưu thay đổi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast.show && (
                <div className={`fixed top-4 right-4 z-50 flex items-center w-full max-w-xs p-4 rounded-lg shadow-lg border-l-4 transform transition-all duration-300 ease-out ${toast.type === 'success' ? 'bg-white border-green-500 text-gray-800' : 'bg-white border-red-500 text-gray-800'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-500 mr-3" /> : <AlertTriangle className="w-5 h-5 text-red-500 mr-3" />}
                    <div className="text-sm font-medium">{toast.message}</div>
                    <button onClick={() => setToast(prev => ({ ...prev, show: false }))} className="ml-auto text-gray-400 hover:text-gray-600">
                        <X size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default SeasonPlayersManagement;
