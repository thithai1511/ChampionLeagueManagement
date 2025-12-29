/**
 * Match Lifecycle Manager Component
 * 
 * Admin interface for managing match lifecycle:
 * - Assign officials to matches (SCHEDULED → PREPARING)
 * - Review lineups (PREPARING → READY)
 * - Monitor match progress
 * - Review supervisor reports
 */

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import api from "../../../config/api";
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  FileText,
  ChevronDown,
  ChevronUp
} from "lucide-react";

const STATUS_CONFIG = {
  SCHEDULED: {
    label: "Đã lên lịch",
    color: "bg-gray-100 text-gray-800",
    icon: Clock
  },
  PREPARING: {
    label: "Chuẩn bị",
    color: "bg-blue-100 text-blue-800",
    icon: Users
  },
  READY: {
    label: "Sẵn sàng",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle
  },
  IN_PROGRESS: {
    label: "Đang diễn ra",
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock
  },
  FINISHED: {
    label: "Kết thúc",
    color: "bg-purple-100 text-purple-800",
    icon: CheckCircle
  },
  REPORTED: {
    label: "Đã báo cáo",
    color: "bg-indigo-100 text-indigo-800",
    icon: FileText
  },
  COMPLETED: {
    label: "Hoàn thành",
    color: "bg-emerald-100 text-emerald-800",
    icon: CheckCircle
  }
};

const MatchLifecycleManager = ({ seasonId }) => {
  const { t } = useTranslation();
  const [matches, setMatches] = useState([]);
  const [officials, setOfficials] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("SCHEDULED");
  const [loading, setLoading] = useState(false);
  const [expandedMatch, setExpandedMatch] = useState(null);
  const [statistics, setStatistics] = useState(null);

  // Modal states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [assignForm, setAssignForm] = useState({
    mainRefereeId: "",
    assistantReferee1Id: "",
    assistantReferee2Id: "",
    fourthOfficialId: "",
    supervisorId: ""
  });

  useEffect(() => {
    if (seasonId) {
      loadMatches();
      loadOfficials();
      loadStatistics();
    }
  }, [seasonId, selectedStatus]);

  const loadMatches = async () => {
    try {
      setLoading(true);
      const response = await api.get(
        `/seasons/${seasonId}/matches/by-status?status=${selectedStatus}`
      );
      setMatches(response.data.data || []);
    } catch (error) {
      console.error("Error loading matches:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadOfficials = async () => {
    try {
      const response = await api.get("/officials");
      setOfficials(response.data.data || []);
    } catch (error) {
      console.error("Error loading officials:", error);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await api.get(`/seasons/${seasonId}/matches/lifecycle-statistics`);
      setStatistics(response.data.data);
    } catch (error) {
      console.error("Error loading statistics:", error);
    }
  };

  const handleAssignOfficials = (match) => {
    setSelectedMatch(match);
    setAssignForm({
      mainRefereeId: match.main_referee_id || "",
      assistantReferee1Id: match.assistant_referee_1_id || "",
      assistantReferee2Id: match.assistant_referee_2_id || "",
      fourthOfficialId: match.fourth_official_id || "",
      supervisorId: match.supervisor_id || ""
    });
    setShowAssignModal(true);
  };

  const submitAssignOfficials = async () => {
    try {
      await api.post(`/matches/${selectedMatch.match_id}/assign-officials`, assignForm);
      alert("Đã phân công trọng tài thành công!");
      setShowAssignModal(false);
      loadMatches();
      loadStatistics();
    } catch (error) {
      console.error("Error assigning officials:", error);
      alert(error.response?.data?.message || "Có lỗi xảy ra khi phân công trọng tài");
    }
  };

  const handleApproveLineup = async (matchId, teamType) => {
    if (!confirm(`Xác nhận duyệt danh sách đội ${teamType === "home" ? "nhà" : "khách"}?`)) {
      return;
    }

    try {
      await api.post(`/matches/${matchId}/lineup-status`, {
        teamType,
        status: "APPROVED"
      });
      alert("Đã duyệt danh sách thành công!");
      loadMatches();
    } catch (error) {
      console.error("Error approving lineup:", error);
      alert(error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  const handleRejectLineup = async (matchId, teamType) => {
    const reason = prompt(`Lý do từ chối danh sách đội ${teamType === "home" ? "nhà" : "khách"}:`);
    if (!reason) return;

    try {
      await api.post(`/matches/${matchId}/lineup-status`, {
        teamType,
        status: "REJECTED"
      });
      alert("Đã từ chối danh sách!");
      loadMatches();
    } catch (error) {
      console.error("Error rejecting lineup:", error);
      alert(error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  const toggleExpanded = (matchId) => {
    setExpandedMatch(expandedMatch === matchId ? null : matchId);
  };

  const getLineupStatusBadge = (status) => {
    const config = {
      PENDING: { label: "Chờ nộp", color: "bg-gray-100 text-gray-700" },
      SUBMITTED: { label: "Đã nộp", color: "bg-blue-100 text-blue-700" },
      APPROVED: { label: "Đã duyệt", color: "bg-green-100 text-green-700" },
      REJECTED: { label: "Từ chối", color: "bg-red-100 text-red-700" }
    };
    const cfg = config[status] || config.PENDING;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
        {cfg.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => {
            const count = statistics[status] || 0;
            const Icon = config.icon;
            return (
              <div
                key={status}
                className={`p-4 rounded-lg cursor-pointer transition-all ${
                  selectedStatus === status
                    ? "ring-2 ring-blue-500 shadow-lg"
                    : "hover:shadow-md"
                } ${config.color}`}
                onClick={() => setSelectedStatus(status)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{config.label}</p>
                    <p className="text-2xl font-bold mt-1">{count}</p>
                  </div>
                  <Icon className="w-8 h-8 opacity-60" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Status Filter Info */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-2">
          {STATUS_CONFIG[selectedStatus]?.label} ({matches.length} trận)
        </h3>
        <p className="text-sm text-gray-600">
          {selectedStatus === "SCHEDULED" && "Các trận đấu cần phân công trọng tài"}
          {selectedStatus === "PREPARING" && "Đợi đội nộp danh sách cầu thủ"}
          {selectedStatus === "READY" && "Sẵn sàng thi đấu"}
          {selectedStatus === "FINISHED" && "Đợi trọng tài và giám sát báo cáo"}
          {selectedStatus === "REPORTED" && "Đợi BTC xác nhận hoàn thành"}
        </p>
      </div>

      {/* Matches List */}
      {loading ? (
        <div className="text-center py-8">Đang tải...</div>
      ) : matches.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Không có trận đấu nào
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => {
            const isExpanded = expandedMatch === match.match_id;
            const StatusIcon = STATUS_CONFIG[match.status]?.icon || Clock;

            return (
              <div key={match.match_id} className="bg-white rounded-lg shadow">
                {/* Match Header */}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <StatusIcon className="w-5 h-5 text-gray-500" />
                        <span className="text-sm text-gray-500">
                          {new Date(match.match_date).toLocaleDateString("vi-VN")} - {match.match_time}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[match.status]?.color}`}>
                          {STATUS_CONFIG[match.status]?.label}
                        </span>
                      </div>
                      <div className="text-lg font-semibold">
                        {match.home_team_name} vs {match.away_team_name}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Sân: {match.stadium_name || "Chưa xác định"}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {match.status === "SCHEDULED" && (
                        <button
                          onClick={() => handleAssignOfficials(match)}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                        >
                          <Users className="w-4 h-4 inline mr-2" />
                          Phân công trọng tài
                        </button>
                      )}

                      <button
                        onClick={() => toggleExpanded(match.match_id)}
                        className="p-2 hover:bg-gray-100 rounded"
                      >
                        {isExpanded ? <ChevronUp /> : <ChevronDown />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t p-4 space-y-4 bg-gray-50">
                    {/* Officials Info */}
                    {match.status !== "SCHEDULED" && (
                      <div>
                        <h4 className="font-semibold mb-2">Ban trọng tài</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Trọng tài chính: {match.main_referee_name || "Chưa phân công"}</div>
                          <div>Trọng tài biên 1: {match.assistant_referee_1_name || "Chưa có"}</div>
                          <div>Trọng tài biên 2: {match.assistant_referee_2_name || "Chưa có"}</div>
                          <div>Trọng tài thứ 4: {match.fourth_official_name || "Chưa có"}</div>
                          <div>Giám sát: {match.supervisor_name || "Chưa có"}</div>
                        </div>
                      </div>
                    )}

                    {/* Lineup Status */}
                    {match.status === "PREPARING" && (
                      <div>
                        <h4 className="font-semibold mb-2">Danh sách đội hình</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{match.home_team_name}</span>
                              {getLineupStatusBadge(match.home_lineup_status)}
                            </div>
                            {match.home_lineup_status === "SUBMITTED" && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleApproveLineup(match.match_id, "home")}
                                  className="flex-1 px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                >
                                  <CheckCircle className="w-4 h-4 inline mr-1" />
                                  Duyệt
                                </button>
                                <button
                                  onClick={() => handleRejectLineup(match.match_id, "home")}
                                  className="flex-1 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                                >
                                  <XCircle className="w-4 h-4 inline mr-1" />
                                  Từ chối
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{match.away_team_name}</span>
                              {getLineupStatusBadge(match.away_lineup_status)}
                            </div>
                            {match.away_lineup_status === "SUBMITTED" && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleApproveLineup(match.match_id, "away")}
                                  className="flex-1 px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                >
                                  <CheckCircle className="w-4 h-4 inline mr-1" />
                                  Duyệt
                                </button>
                                <button
                                  onClick={() => handleRejectLineup(match.match_id, "away")}
                                  className="flex-1 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                                >
                                  <XCircle className="w-4 h-4 inline mr-1" />
                                  Từ chối
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Report Status */}
                    {(match.status === "FINISHED" || match.status === "REPORTED") && (
                      <div>
                        <h4 className="font-semibold mb-2">Tình trạng báo cáo</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            Trọng tài: {match.referee_report_submitted ? (
                              <CheckCircle className="w-4 h-4 inline text-green-500" />
                            ) : (
                              <Clock className="w-4 h-4 inline text-gray-400" />
                            )}
                          </div>
                          <div>
                            Giám sát: {match.supervisor_report_submitted ? (
                              <CheckCircle className="w-4 h-4 inline text-green-500" />
                            ) : (
                              <Clock className="w-4 h-4 inline text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Officials Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              Phân công trọng tài - {selectedMatch?.home_team_name} vs {selectedMatch?.away_team_name}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Trọng tài chính <span className="text-red-500">*</span>
                </label>
                <select
                  value={assignForm.mainRefereeId}
                  onChange={(e) => setAssignForm({ ...assignForm, mainRefereeId: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                >
                  <option value="">-- Chọn trọng tài --</option>
                  {officials
                    .filter((o) => o.role === "REFEREE")
                    .map((official) => (
                      <option key={official.id} value={official.id}>
                        {official.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Trọng tài biên 1</label>
                <select
                  value={assignForm.assistantReferee1Id}
                  onChange={(e) => setAssignForm({ ...assignForm, assistantReferee1Id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">-- Chọn trọng tài --</option>
                  {officials
                    .filter((o) => o.role === "ASSISTANT_REFEREE")
                    .map((official) => (
                      <option key={official.id} value={official.id}>
                        {official.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Trọng tài biên 2</label>
                <select
                  value={assignForm.assistantReferee2Id}
                  onChange={(e) => setAssignForm({ ...assignForm, assistantReferee2Id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">-- Chọn trọng tài --</option>
                  {officials
                    .filter((o) => o.role === "ASSISTANT_REFEREE")
                    .map((official) => (
                      <option key={official.id} value={official.id}>
                        {official.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Trọng tài thứ 4</label>
                <select
                  value={assignForm.fourthOfficialId}
                  onChange={(e) => setAssignForm({ ...assignForm, fourthOfficialId: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">-- Chọn trọng tài --</option>
                  {officials
                    .filter((o) => o.role === "FOURTH_OFFICIAL")
                    .map((official) => (
                      <option key={official.id} value={official.id}>
                        {official.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Giám sát viên</label>
                <select
                  value={assignForm.supervisorId}
                  onChange={(e) => setAssignForm({ ...assignForm, supervisorId: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">-- Chọn giám sát --</option>
                  {officials
                    .filter((o) => o.role === "SUPERVISOR")
                    .map((official) => (
                      <option key={official.id} value={official.id}>
                        {official.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={submitAssignOfficials}
                disabled={!assignForm.mainRefereeId}
                className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Xác nhận phân công
              </button>
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
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

export default MatchLifecycleManager;
