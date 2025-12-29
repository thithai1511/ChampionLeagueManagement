/**
 * Supervisor Report Component
 * 
 * Interface for supervisors to submit post-match reports with:
 * - Organization rating
 * - Team behavior ratings
 * - Stadium/security ratings
 * - Incident reporting
 * - Disciplinary flagging
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../config/api";
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle,
  Star,
  Flag
} from "lucide-react";

const SupervisorReportForm = ({ seasonId }) => {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [myReports, setMyReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("pending"); // pending | submitted

  // Report form state
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [reportForm, setReportForm] = useState({
    organizationRating: 5,
    homeTeamRating: 5,
    awayTeamRating: 5,
    stadiumConditionRating: 5,
    securityRating: 5,
    incidentReport: "",
    hasSeriousViolation: false,
    sendToDisciplinary: false,
    recommendations: ""
  });

  useEffect(() => {
    if (seasonId && user?.id) {
      loadPendingMatches();
      loadMyReports();
    }
  }, [seasonId, user?.id]);

  const loadPendingMatches = async () => {
    try {
      setLoading(true);
      // Get FINISHED matches where this user is the supervisor
      const response = await api.get(`/seasons/${seasonId}/matches/by-status?status=FINISHED`);
      const allMatches = response.data.data || [];
      
      // Filter to only matches where this user is supervisor and hasn't submitted report
      const supervisorMatches = allMatches.filter(
        (m) => m.supervisor_id === user.id && !m.supervisor_report_submitted
      );
      
      setMatches(supervisorMatches);
    } catch (error) {
      console.error("Error loading matches:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyReports = async () => {
    try {
      const response = await api.get(`/supervisor/my-reports?seasonId=${seasonId}`);
      setMyReports(response.data.data || []);
    } catch (error) {
      console.error("Error loading reports:", error);
    }
  };

  const handleSubmitReport = (match) => {
    setSelectedMatch(match);
    setReportForm({
      organizationRating: 5,
      homeTeamRating: 5,
      awayTeamRating: 5,
      stadiumConditionRating: 5,
      securityRating: 5,
      incidentReport: "",
      hasSeriousViolation: false,
      sendToDisciplinary: false,
      recommendations: ""
    });
    setShowReportModal(true);
  };

  const submitReportToServer = async () => {
    try {
      await api.post(`/matches/${selectedMatch.match_id}/supervisor-report`, reportForm);
      alert("Đã nộp báo cáo thành công!");
      setShowReportModal(false);
      loadPendingMatches();
      loadMyReports();
    } catch (error) {
      console.error("Error submitting report:", error);
      alert(error.response?.data?.message || "Có lỗi xảy ra khi nộp báo cáo");
    }
  };

  const RatingInput = ({ label, value, onChange }) => {
    return (
      <div>
        <label className="block text-sm font-medium mb-2">{label}</label>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => onChange(rating)}
              className={`w-10 h-10 rounded-full border-2 transition ${
                value >= rating
                  ? "bg-yellow-400 border-yellow-500 text-white"
                  : "bg-white border-gray-300 text-gray-500 hover:border-yellow-400"
              }`}
            >
              {rating}
            </button>
          ))}
          <span className="ml-2 text-lg font-semibold">{value}/10</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Báo cáo giám sát trận đấu</h2>
        <p className="text-gray-600">
          Nộp báo cáo đánh giá sau trận đấu. Đánh giá các yếu tố tổ chức, hành vi đội, sân bãi và an ninh.
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex-1 px-6 py-3 font-semibold transition ${
              activeTab === "pending"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Chờ báo cáo ({matches.length})
          </button>
          <button
            onClick={() => setActiveTab("submitted")}
            className={`flex-1 px-6 py-3 font-semibold transition ${
              activeTab === "submitted"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Đã nộp ({myReports.length})
          </button>
        </div>

        <div className="p-6">
          {activeTab === "pending" ? (
            loading ? (
              <div className="text-center py-8">Đang tải...</div>
            ) : matches.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Không có trận đấu nào cần báo cáo
              </div>
            ) : (
              <div className="space-y-4">
                {matches.map((match) => (
                  <div key={match.match_id} className="border rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm text-gray-500 mb-1">
                          {new Date(match.match_date).toLocaleDateString("vi-VN")}
                        </div>
                        <div className="text-lg font-semibold">
                          {match.home_team_name} vs {match.away_team_name}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          Sân: {match.stadium_name || "Chưa xác định"}
                        </div>
                      </div>

                      <button
                        onClick={() => handleSubmitReport(match)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                      >
                        <FileText className="w-4 h-4 inline mr-2" />
                        Nộp báo cáo
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-4">
              {myReports.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Chưa có báo cáo nào
                </div>
              ) : (
                myReports.map((report) => (
                  <div key={report.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-lg font-semibold">
                          {report.home_team_name} vs {report.away_team_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(report.match_date).toLocaleDateString("vi-VN")}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {report.has_serious_violation && (
                          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                            <Flag className="w-4 h-4 inline mr-1" />
                            Vi phạm nghiêm trọng
                          </span>
                        )}
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          report.reviewed_at
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {report.reviewed_at ? "Đã xem xét" : "Chờ xem xét"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Tổ chức:</span>
                        <span className="ml-2 font-semibold">{report.organization_rating}/10</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Đội nhà:</span>
                        <span className="ml-2 font-semibold">{report.home_team_rating}/10</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Đội khách:</span>
                        <span className="ml-2 font-semibold">{report.away_team_rating}/10</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Sân bãi:</span>
                        <span className="ml-2 font-semibold">{report.stadium_condition_rating}/10</span>
                      </div>
                      <div>
                        <span className="text-gray-600">An ninh:</span>
                        <span className="ml-2 font-semibold">{report.security_rating}/10</span>
                      </div>
                    </div>

                    {report.incident_report && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-sm font-semibold text-yellow-800 mb-1">Sự cố:</p>
                        <p className="text-sm text-yellow-700">{report.incident_report}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Report Submission Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 z-10">
              <h3 className="text-xl font-bold">
                Báo cáo giám sát - {selectedMatch?.home_team_name} vs {selectedMatch?.away_team_name}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {new Date(selectedMatch?.match_date).toLocaleDateString("vi-VN")}
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Ratings */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Đánh giá</h4>
                
                <RatingInput
                  label="Chất lượng tổ chức"
                  value={reportForm.organizationRating}
                  onChange={(value) => setReportForm({ ...reportForm, organizationRating: value })}
                />

                <RatingInput
                  label="Hành vi đội nhà"
                  value={reportForm.homeTeamRating}
                  onChange={(value) => setReportForm({ ...reportForm, homeTeamRating: value })}
                />

                <RatingInput
                  label="Hành vi đội khách"
                  value={reportForm.awayTeamRating}
                  onChange={(value) => setReportForm({ ...reportForm, awayTeamRating: value })}
                />

                <RatingInput
                  label="Điều kiện sân bãi"
                  value={reportForm.stadiumConditionRating}
                  onChange={(value) => setReportForm({ ...reportForm, stadiumConditionRating: value })}
                />

                <RatingInput
                  label="An ninh trật tự"
                  value={reportForm.securityRating}
                  onChange={(value) => setReportForm({ ...reportForm, securityRating: value })}
                />
              </div>

              {/* Incident Report */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Báo cáo sự cố (nếu có)
                </label>
                <textarea
                  value={reportForm.incidentReport}
                  onChange={(e) => setReportForm({ ...reportForm, incidentReport: e.target.value })}
                  rows={4}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Mô tả chi tiết các sự cố xảy ra trong trận đấu..."
                />
              </div>

              {/* Serious Violation Flags */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={reportForm.hasSeriousViolation}
                    onChange={(e) => setReportForm({ 
                      ...reportForm, 
                      hasSeriousViolation: e.target.checked,
                      sendToDisciplinary: e.target.checked ? reportForm.sendToDisciplinary : false
                    })}
                    className="w-5 h-5"
                  />
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                      Vi phạm nghiêm trọng
                    </div>
                    <div className="text-sm text-gray-600">
                      Có hành vi bạo lực, phản ứng trọng tài, hoặc vi phạm kỷ luật nghiêm trọng
                    </div>
                  </div>
                </label>

                {reportForm.hasSeriousViolation && (
                  <label className="flex items-center gap-3 p-3 border border-red-300 bg-red-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reportForm.sendToDisciplinary}
                      onChange={(e) => setReportForm({ ...reportForm, sendToDisciplinary: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-2 text-red-700">
                        <Flag className="w-5 h-5" />
                        Gửi lên Ban Kỷ luật
                      </div>
                      <div className="text-sm text-red-600">
                        Vụ việc sẽ được chuyển đến Ban Kỷ luật để xem xét kỷ luật
                      </div>
                    </div>
                  </label>
                )}
              </div>

              {/* Recommendations */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Khuyến nghị cho BTC (tùy chọn)
                </label>
                <textarea
                  value={reportForm.recommendations}
                  onChange={(e) => setReportForm({ ...reportForm, recommendations: e.target.value })}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Các đề xuất cải thiện cho các trận đấu tiếp theo..."
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t p-6 flex gap-3">
              <button
                onClick={submitReportToServer}
                className="flex-1 bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 font-semibold transition"
              >
                <CheckCircle className="w-5 h-5 inline mr-2" />
                Xác nhận nộp báo cáo
              </button>
              <button
                onClick={() => setShowReportModal(false)}
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

export default SupervisorReportForm;
