import React, { useState, useEffect } from "react";
import { APP_CONFIG } from "../../../config/app.config";
import {
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  Shirt,
  Info
} from "lucide-react";

// Helper to get token with fallback keys
function getToken() {
  return localStorage.getItem("auth_token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") || "";
}

// Helper for API calls using native fetch
async function apiFetch(path, options = {}) {
  const token = getToken();
  const baseUrl = APP_CONFIG.API.BASE_URL;

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw data || { message: res.statusText || "Request failed" };
  }
  return data;
}

const TeamMatchLineup = ({ seasonId, matchId, teamId }) => {
  // Data State
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Lineup State
  const [lineup, setLineup] = useState({
    startingPlayers: [],
    substitutes: [],
    formation: '4-4-2',
    kitType: 'HOME'
  });

  // Status State
  const [reviewInfo, setReviewInfo] = useState(null); // { status, rejectionReason, ... }
  const [submitting, setSubmitting] = useState(false);
  const [lineupErrors, setLineupErrors] = useState([]);

  // Load Initial Data
  useEffect(() => {
    if (seasonId && teamId && matchId) {
      loadAllData();
    }
  }, [seasonId, teamId, matchId]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadPlayers(),
        loadStatusAndInfo()
      ]);
    } catch (error) {
      console.error("Error loading lineup data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlayers = async () => {
    try {
      const data = await apiFetch(`/seasons/${seasonId}/players?teamId=${teamId}`);
      setPlayers(data.data || []);
    } catch (error) {
      console.error("Error loading players:", error);
    }
  };

  const loadStatusAndInfo = async () => {
    try {
      // 1. Get Match Info to identify side
      const matchRes = await apiFetch(`/matches/${matchId}`);
      const isHome = Number(matchRes.data.home_team_id) === Number(teamId);
      const mySide = isHome ? 'home' : 'away';

      // 2. Get Review Status
      const reviewRes = await apiFetch(`/matches/${matchId}/lineups/review`);
      const reviewData = reviewRes.data;
      const myReview = reviewData[mySide];

      // 3. Get Team Infos
      const infoRes = await apiFetch(`/matches/${matchId}/team-infos`);
      const infoData = infoRes.data;
      const myInfo = infoData[mySide];

      setReviewInfo({ ...myReview, seasonTeamId: myInfo.seasonTeamId });

      // 4. Pre-fill formation/kitType if exists
      if (myInfo?.formation) {
        setLineup(prev => ({
          ...prev,
          formation: myInfo.formation,
          kitType: myInfo.kitType || 'HOME'
        }));
      }

    } catch (error) {
      console.error("Error loading status:", error);
    }
  };

  const validateLineup = () => {
    const errors = [];
    const { startingPlayers, substitutes } = lineup;

    if (startingPlayers.length !== 11) {
      errors.push(`Phải có đúng 11 cầu thủ chính thức (Hiện tại: ${startingPlayers.length})`);
    }

    if (substitutes.length < 1 || substitutes.length > 5) {
      errors.push(`Phải có từ 1-5 cầu thủ dự bị (Hiện tại: ${substitutes.length})`);
    }

    const allPlayerIds = [...startingPlayers, ...substitutes];
    const uniqueIds = new Set(allPlayerIds);
    if (uniqueIds.size !== allPlayerIds.length) {
      errors.push("Có cầu thủ bị trùng lặp giữa chính thức và dự bị");
    }

    const startingForeignCount = startingPlayers.filter((playerId) => {
      const player = players.find((p) => p.player_id === playerId);
      return player && player.is_foreign;
    }).length;

    if (startingForeignCount > 5) {
      errors.push("Tối đa 5 ngoại binh trong 11 cầu thủ chính thức");
    }

    setLineupErrors(errors);
    return errors.length === 0;
  };

  const submitLineupToServer = async () => {
    if (!validateLineup()) return;

    setSubmitting(true);
    setLineupErrors([]);

    try {
      if (!reviewInfo?.seasonTeamId) {
        throw new Error("Không tìm thấy thông tin đội bóng trong mùa giải này");
      }

      const payload = {
        seasonTeamId: reviewInfo.seasonTeamId,
        seasonId,
        startingPlayerIds: lineup.startingPlayers,
        substitutePlayerIds: lineup.substitutes,
        formation: lineup.formation,
        kitType: lineup.kitType
      };

      await apiFetch(`/matches/${matchId}/lineups`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      alert("Đã nộp danh sách thành công!");
      await loadStatusAndInfo();
    } catch (error) {
      console.error("Error submitting lineup:", error);
      const message = error.message || "Có lỗi xảy ra khi nộp danh sách";
      const apiErrors = error.errors || [];
      setLineupErrors([message, ...apiErrors]);
    } finally {
      setSubmitting(false);
    }
  };

  const togglePlayerSelection = (playerId, type) => {
    if (type === "starting") {
      const currentStarting = [...lineup.startingPlayers];
      const index = currentStarting.indexOf(playerId);
      if (index > -1) {
        currentStarting.splice(index, 1);
      } else {
        if (currentStarting.length >= 11) return;
        currentStarting.push(playerId);
      }
      setLineup(l => ({ ...l, startingPlayers: currentStarting }));
    } else {
      const currentSubs = [...lineup.substitutes];
      const index = currentSubs.indexOf(playerId);
      if (index > -1) {
        currentSubs.splice(index, 1);
      } else {
        if (currentSubs.length >= 5) return;
        currentSubs.push(playerId);
      }
      setLineup(l => ({ ...l, substitutes: currentSubs }));
    }
  };

  const renderStatusBanner = () => {
    if (!reviewInfo) return null;
    const { status, rejectionReason } = reviewInfo;

    switch (status) {
      case 'APPROVED':
        return (
          <div className="bg-green-100 border border-green-300 text-green-800 p-4 rounded-lg flex items-center gap-3 mb-6">
            <CheckCircle className="w-6 h-6" />
            <div>
              <p className="font-bold">Đã được duyệt</p>
              <p className="text-sm">Đội hình thi đấu đã được BTC phê duyệt.</p>
            </div>
          </div>
        );
      case 'REJECTED':
        return (
          <div className="bg-red-100 border border-red-300 text-red-800 p-4 rounded-lg flex items-start gap-3 mb-6">
            <XCircle className="w-6 h-6 mt-1" />
            <div>
              <p className="font-bold">Bị từ chối</p>
              <p className="text-sm mt-1">Lý do: {rejectionReason || "Không có lý do cụ thể"}</p>
              <p className="text-sm mt-2 font-medium">Vui lòng chỉnh sửa và nộp lại.</p>
            </div>
          </div>
        );
      case 'SUBMITTED':
        return (
          <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 p-4 rounded-lg flex items-center gap-3 mb-6">
            <Clock className="w-6 h-6" />
            <div>
              <p className="font-bold">Đã gửi, chờ BTC duyệt</p>
              <p className="text-sm">Bạn vẫn có thể cập nhật đội hình trước khi BTC duyệt.</p>
            </div>
          </div>
        );
      default:
        return (
          <div className="bg-gray-100 border border-gray-300 text-gray-800 p-4 rounded-lg flex items-center gap-3 mb-6">
            <Info className="w-6 h-6" />
            <div>
              <p className="font-bold">Chưa gửi danh sách</p>
              <p className="text-sm">Vui lòng nộp danh sách trước thời gian quy định.</p>
            </div>
          </div>
        );
    }
  };

  const isLocked = reviewInfo?.status === 'APPROVED';

  if (loading && !players.length) {
    return <div className="text-center py-8">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="space-y-6">
      {renderStatusBanner()}

      {lineupErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 mb-1">Lỗi:</p>
              <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                {lineupErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {!matchId ? (
        <div className="text-center text-gray-500 py-8">
          Vui lòng chọn trận đấu để xếp đội hình
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Shield size={18} /> Chiến thuật (Formation)
              </label>
              <select
                value={lineup.formation}
                onChange={(e) => setLineup({ ...lineup, formation: e.target.value })}
                disabled={isLocked}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-200"
              >
                <option value="4-4-2">4-4-2</option>
                <option value="4-3-3">4-3-3</option>
                <option value="4-2-3-1">4-2-3-1</option>
                <option value="3-5-2">3-5-2</option>
                <option value="3-4-3">3-4-3</option>
                <option value="5-3-2">5-3-2</option>
                <option value="4-1-4-1">4-1-4-1</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Shirt size={18} /> Trang phục (Kit Type)
              </label>
              <div className="flex gap-4 mt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="kitType"
                    value="HOME"
                    checked={lineup.kitType === "HOME"}
                    onChange={(e) => setLineup({ ...lineup, kitType: e.target.value })}
                    disabled={isLocked}
                    className="w-4 h-4 text-blue-600 disabled:text-gray-400"
                  />
                  <span className={isLocked ? "text-gray-500" : ""}>Sân nhà (Home)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="kitType"
                    value="AWAY"
                    checked={lineup.kitType === "AWAY"}
                    onChange={(e) => setLineup({ ...lineup, kitType: e.target.value })}
                    disabled={isLocked}
                    className="w-4 h-4 text-blue-600 disabled:text-gray-400"
                  />
                  <span className={isLocked ? "text-gray-500" : ""}>Sân khách (Away)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm font-medium text-blue-800">Cầu thủ chính thức</p>
              <div className="flex items-end gap-2 mt-1">
                <p className="text-3xl font-bold text-blue-900">{lineup.startingPlayers.length}</p>
                <p className="text-lg text-blue-700/70 mb-1">/ 11</p>
              </div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
              <p className="text-sm font-medium text-green-800">Cầu thủ dự bị</p>
              <div className="flex items-end gap-2 mt-1">
                <p className="text-3xl font-bold text-green-900">{lineup.substitutes.length}</p>
                <p className="text-lg text-green-700/70 mb-1">/ 5</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Danh sách cầu thủ</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
              {players.map((player) => {
                const isInStarting = lineup.startingPlayers.includes(player.player_id);
                const isInSubs = lineup.substitutes.includes(player.player_id);
                return (
                  <div
                    key={player.player_id}
                    className={`p-3 border rounded-lg transition-colors ${isInStarting || isInSubs ? "bg-blue-50 border-blue-300" : "hover:bg-gray-50 border-gray-200"
                      } ${isLocked ? "opacity-75" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium flex items-center gap-2">
                          {player.player_name || player.full_name}
                          {player.is_foreign && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded">EXT</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">#{player.jersey_number} • {player.position}</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => togglePlayerSelection(player.player_id, "starting")}
                          disabled={isLocked || isInSubs}
                          className={`px-3 py-1 rounded text-sm font-medium transition ${isInStarting
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                            }`}
                        >
                          Chính thức
                        </button>
                        <button
                          onClick={() => togglePlayerSelection(player.player_id, "substitute")}
                          disabled={isLocked || isInStarting}
                          className={`px-3 py-1 rounded text-sm font-medium transition ${isInSubs
                              ? "bg-green-600 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                            }`}
                        >
                          Dự bị
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t sticky bottom-0 bg-white">
            <button
              onClick={submitLineupToServer}
              disabled={submitting || isLocked}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {submitting ? "Đang gửi..." : (isLocked ? "Đã khóa (Đã duyệt)" : "Xác nhận nộp danh sách")}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default TeamMatchLineup;
