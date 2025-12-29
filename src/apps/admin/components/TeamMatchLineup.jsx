/**
 * Team Match Lineup Component
 * 
 * Team interface for:
 * - Viewing assigned matches
 * - Submitting lineup (16 players: 11 starting + 5 substitutes)
 * - Viewing lineup approval status
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../config/api";
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp
} from "lucide-react";

const TeamMatchLineup = ({ seasonId }) => {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedMatch, setExpandedMatch] = useState(null);

  // Lineup submission modal
  const [showLineupModal, setShowLineupModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [lineup, setLineup] = useState({
    startingPlayers: [],
    substitutes: []
  });
  const [lineupErrors, setLineupErrors] = useState([]);

  useEffect(() => {
    if (seasonId && user?.team_id) {
      loadMatches();
      loadPlayers();
    }
  }, [seasonId, user?.team_id]);

  const loadMatches = async () => {
    try {
      setLoading(true);
      // Get matches where this team is home or away in PREPARING status
      const response = await api.get(`/seasons/${seasonId}/matches/by-status?status=PREPARING`);
      const allMatches = response.data.data || [];
      
      // Filter to only matches involving this team
      const teamMatches = allMatches.filter(
        (m) => m.home_team_id === user.team_id || m.away_team_id === user.team_id
      );
      
      setMatches(teamMatches);
    } catch (error) {
      console.error("Error loading matches:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlayers = async () => {
    try {
      // Get registered players for this team in this season
      const response = await api.get(`/seasons/${seasonId}/players?teamId=${user.team_id}`);
      setPlayers(response.data.data || []);
    } catch (error) {
      console.error("Error loading players:", error);
    }
  };

  const handleSubmitLineup = (match) => {
    setSelectedMatch(match);
    setLineup({
      startingPlayers: [],
      substitutes: []
    });
    setLineupErrors([]);
    setShowLineupModal(true);
  };

  const validateLineup = () => {
    const errors = [];
    const { startingPlayers, substitutes } = lineup;

    // Must have exactly 11 starting players
    if (startingPlayers.length !== 11) {
      errors.push("Phải có đúng 11 cầu thủ chính thức");
    }

    // Must have 1-5 substitutes
    if (substitutes.length < 1 || substitutes.length > 5) {
      errors.push("Phải có từ 1-5 cầu thủ dự bị");
    }

    // Check for duplicates
    const allPlayerIds = [...startingPlayers, ...substitutes];
    const uniqueIds = new Set(allPlayerIds);
    if (uniqueIds.size !== allPlayerIds.length) {
      errors.push("Có cầu thủ bị trùng lặp");
    }

    // Check foreign player limit (max 5 foreign players in starting 11)
    const startingForeignCount = startingPlayers.filter((playerId) => {
      const player = players.find((p) => p.player_id === playerId);
      return player && player.is_foreign;
    }).length;

    if (startingForeignCount > 5) {
      errors.push("Tối đa 5 ngoại binh trong 11 cầu thủ chính thức");
    }

    // Check for suspended players (if we have suspension data)
    // This would require additional API call to check suspensions
    
    setLineupErrors(errors);
    return errors.length === 0;
  };

  const submitLineupToServer = async () => {
    if (!validateLineup()) {
      return;
    }

    try {
      const isHomeTeam = selectedMatch.home_team_id === user.team_id;
      const teamType = isHomeTeam ? "home" : "away";

      await api.post(`/match-detail/${selectedMatch.match_id}/lineups`, {
        teamType,
        startingLineup: lineup.startingPlayers,
        substitutes: lineup.substitutes
      });

      alert("Đã nộp danh sách thành công!");
      setShowLineupModal(false);
      loadMatches();
    } catch (error) {
      console.error("Error submitting lineup:", error);
      alert(error.response?.data?.message || "Có lỗi xảy ra khi nộp danh sách");
    }
  };

  const togglePlayerSelection = (playerId, type) => {
    if (type === "starting") {
      const currentStarting = [...lineup.startingPlayers];
      const index = currentStarting.indexOf(playerId);
      
      if (index > -1) {
        currentStarting.splice(index, 1);
      } else {
        if (currentStarting.length >= 11) {
          alert("Đã đủ 11 cầu thủ chính thức");
          return;
        }
        currentStarting.push(playerId);
      }
      
      setLineup({ ...lineup, startingPlayers: currentStarting });
    } else {
      const currentSubs = [...lineup.substitutes];
      const index = currentSubs.indexOf(playerId);
      
      if (index > -1) {
        currentSubs.splice(index, 1);
      } else {
        if (currentSubs.length >= 5) {
          alert("Đã đủ 5 cầu thủ dự bị");
          return;
        }
        currentSubs.push(playerId);
      }
      
      setLineup({ ...lineup, substitutes: currentSubs });
    }
  };

  const getLineupStatusBadge = (match) => {
    const isHomeTeam = match.home_team_id === user.team_id;
    const status = isHomeTeam ? match.home_lineup_status : match.away_lineup_status;

    const config = {
      PENDING: { label: "Chờ nộp", color: "bg-yellow-100 text-yellow-700", icon: AlertTriangle },
      SUBMITTED: { label: "Đã nộp", color: "bg-blue-100 text-blue-700", icon: Clock },
      APPROVED: { label: "Đã duyệt", color: "bg-green-100 text-green-700", icon: CheckCircle },
      REJECTED: { label: "Từ chối", color: "bg-red-100 text-red-700", icon: XCircle }
    };

    const cfg = config[status] || config.PENDING;
    const Icon = cfg.icon;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${cfg.color}`}>
        <Icon className="w-4 h-4 mr-1" />
        {cfg.label}
      </span>
    );
  };

  const getAvailablePlayers = () => {
    // Filter out already selected players
    const selectedIds = [...lineup.startingPlayers, ...lineup.substitutes];
    return players.filter((p) => !selectedIds.includes(p.player_id));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Quản lý danh sách thi đấu</h2>
        <p className="text-gray-600">
          Nộp danh sách cầu thủ cho các trận đấu sắp tới. Danh sách phải có 11 cầu thủ chính thức và 1-5 cầu thủ dự bị.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8">Đang tải...</div>
      ) : matches.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Không có trận đấu nào cần nộp danh sách
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => {
            const isHomeTeam = match.home_team_id === user.team_id;
            const lineupStatus = isHomeTeam ? match.home_lineup_status : match.away_lineup_status;
            const canSubmit = lineupStatus === "PENDING" || lineupStatus === "REJECTED";
            const isExpanded = expandedMatch === match.match_id;

            return (
              <div key={match.match_id} className="bg-white rounded-lg shadow">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <div className="text-sm text-gray-500 mb-1">
                        {new Date(match.match_date).toLocaleDateString("vi-VN")} - {match.match_time}
                      </div>
                      <div className="text-lg font-semibold">
                        {match.home_team_name} vs {match.away_team_name}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Sân: {match.stadium_name || "Chưa xác định"}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {getLineupStatusBadge(match)}
                      
                      {canSubmit && (
                        <button
                          onClick={() => handleSubmitLineup(match)}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                        >
                          <Users className="w-4 h-4 inline mr-2" />
                          {lineupStatus === "REJECTED" ? "Nộp lại" : "Nộp danh sách"}
                        </button>
                      )}

                      <button
                        onClick={() => setExpandedMatch(isExpanded ? null : match.match_id)}
                        className="p-2 hover:bg-gray-100 rounded"
                      >
                        {isExpanded ? <ChevronUp /> : <ChevronDown />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t pt-4 mt-4 bg-gray-50 rounded p-4">
                      <h4 className="font-semibold mb-2">Thông tin trọng tài</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Trọng tài chính: {match.main_referee_name}</div>
                        <div>Trọng tài biên 1: {match.assistant_referee_1_name || "Chưa có"}</div>
                        <div>Trọng tài biên 2: {match.assistant_referee_2_name || "Chưa có"}</div>
                        <div>Giám sát: {match.supervisor_name || "Chưa có"}</div>
                      </div>

                      {lineupStatus === "REJECTED" && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                          <div className="flex items-start gap-2">
                            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold text-red-800">Danh sách bị từ chối</p>
                              <p className="text-sm text-red-700 mt-1">
                                Vui lòng kiểm tra lại và nộp lại danh sách
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {lineupStatus === "APPROVED" && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                          <div className="flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold text-green-800">Danh sách đã được duyệt</p>
                              <p className="text-sm text-green-700 mt-1">
                                Đội bạn đã sẵn sàng thi đấu
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lineup Submission Modal */}
      {showLineupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 z-10">
              <h3 className="text-xl font-bold">
                Nộp danh sách - {selectedMatch?.home_team_name} vs {selectedMatch?.away_team_name}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Chọn 11 cầu thủ chính thức và 1-5 cầu thủ dự bị
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Validation Errors */}
              {lineupErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-800 mb-1">Danh sách chưa hợp lệ:</p>
                      <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                        {lineupErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Current Selection Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-800">Cầu thủ chính thức</p>
                  <p className="text-2xl font-bold text-blue-900">{lineup.startingPlayers.length}/11</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-800">Cầu thủ dự bị</p>
                  <p className="text-2xl font-bold text-green-900">{lineup.substitutes.length}/5</p>
                </div>
              </div>

              {/* Player Selection */}
              <div>
                <h4 className="font-semibold mb-3">Danh sách cầu thủ</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {players.map((player) => {
                    const isInStarting = lineup.startingPlayers.includes(player.player_id);
                    const isInSubs = lineup.substitutes.includes(player.player_id);
                    const isSelected = isInStarting || isInSubs;

                    return (
                      <div
                        key={player.player_id}
                        className={`p-3 border rounded-lg ${
                          isSelected ? "bg-blue-50 border-blue-300" : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium">
                              {player.player_name}
                              {player.is_foreign && (
                                <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                                  Ngoại binh
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              Số áo: {player.jersey_number} • Vị trí: {player.position}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => togglePlayerSelection(player.player_id, "starting")}
                              disabled={isInSubs}
                              className={`px-3 py-1 rounded text-sm transition ${
                                isInStarting
                                  ? "bg-blue-500 text-white"
                                  : "bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                              }`}
                            >
                              Chính thức
                            </button>
                            <button
                              onClick={() => togglePlayerSelection(player.player_id, "substitute")}
                              disabled={isInStarting}
                              className={`px-3 py-1 rounded text-sm transition ${
                                isInSubs
                                  ? "bg-green-500 text-white"
                                  : "bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
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
            </div>

            <div className="sticky bottom-0 bg-white border-t p-6 flex gap-3">
              <button
                onClick={submitLineupToServer}
                className="flex-1 bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 font-semibold transition"
              >
                Xác nhận nộp danh sách
              </button>
              <button
                onClick={() => setShowLineupModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 font-semibold transition"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamMatchLineup;
