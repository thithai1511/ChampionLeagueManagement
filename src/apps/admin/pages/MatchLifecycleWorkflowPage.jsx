/**
 * Match Lifecycle Workflow Page
 * 
 * Admin page for managing the entire match lifecycle workflow
 */

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import MatchLifecycleManager from "../components/MatchLifecycleManager";
import api from "../../../config/api";
import { Info, Calendar } from "lucide-react";

const MatchLifecycleWorkflowPage = () => {
  const { t } = useTranslation();
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSeasons();
  }, []);

  const loadSeasons = async () => {
    try {
      setLoading(true);
      const response = await api.get("/seasons");
      const seasonsList = response.data || [];
      setSeasons(seasonsList);
      
      // Auto-select the first active season
      const activeSeason = seasonsList.find((s) => s.status === "ACTIVE");
      if (activeSeason) {
        setSelectedSeason(activeSeason);
      } else if (seasonsList.length > 0) {
        setSelectedSeason(seasonsList[0]);
      }
    } catch (error) {
      console.error("Error loading seasons:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Quy trình Quản lý Trận đấu
          </h1>
          <p className="text-gray-600">
            Quản lý vòng đời của các trận đấu từ lên lịch đến hoàn thành
          </p>
        </div>

        {/* Season Selector */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4">
            <Calendar className="w-6 h-6 text-gray-500" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chọn mùa giải
              </label>
              <select
                value={selectedSeason?.id || ""}
                onChange={(e) => {
                  const season = seasons.find((s) => s.id === parseInt(e.target.value));
                  setSelectedSeason(season);
                }}
                className="w-full max-w-md border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              >
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name} ({season.year}) - {season.status}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Workflow Diagram */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start gap-3 mb-4">
            <Info className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Quy trình vòng đời trận đấu</h3>
              <p className="text-sm text-gray-600 mb-4">
                Các trạng thái của một trận đấu từ khi được tạo đến khi hoàn thành
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between overflow-x-auto pb-4">
            {[
              { status: "SCHEDULED", label: "Đã lên lịch", color: "gray" },
              { status: "PREPARING", label: "Chuẩn bị", color: "blue" },
              { status: "READY", label: "Sẵn sàng", color: "green" },
              { status: "IN_PROGRESS", label: "Đang diễn ra", color: "yellow" },
              { status: "FINISHED", label: "Kết thúc", color: "purple" },
              { status: "REPORTED", label: "Đã báo cáo", color: "indigo" },
              { status: "COMPLETED", label: "Hoàn thành", color: "emerald" }
            ].map((step, index, arr) => (
              <React.Fragment key={step.status}>
                <div className="flex flex-col items-center min-w-[120px]">
                  <div
                    className={`w-16 h-16 rounded-full bg-${step.color}-100 border-4 border-${step.color}-500 flex items-center justify-center text-${step.color}-700 font-bold text-lg`}
                  >
                    {index + 1}
                  </div>
                  <div className="mt-2 text-center">
                    <div className="font-semibold text-sm">{step.label}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {step.status}
                    </div>
                  </div>
                </div>
                {index < arr.length - 1 && (
                  <div className="flex items-center justify-center flex-1 min-w-[40px]">
                    <div className="w-full h-1 bg-gray-300"></div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Workflow Steps Guide */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Hướng dẫn chi tiết</h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-700">
                1
              </div>
              <div>
                <h4 className="font-semibold mb-1">SCHEDULED - Đã lên lịch</h4>
                <p className="text-sm text-gray-600">
                  Trận đấu được tạo và lên lịch thi đấu. BTC cần phân công trọng tài và giám sát viên.
                </p>
                <div className="mt-2 text-sm text-blue-600 font-medium">
                  → Hành động: Phân công trọng tài → Chuyển sang PREPARING
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700">
                2
              </div>
              <div>
                <h4 className="font-semibold mb-1">PREPARING - Chuẩn bị</h4>
                <p className="text-sm text-gray-600">
                  Đã có trọng tài, đội bóng được thông báo để nộp danh sách cầu thủ (11 chính thức + 1-5 dự bị).
                  BTC duyệt danh sách của cả hai đội.
                </p>
                <div className="mt-2 text-sm text-blue-600 font-medium">
                  → Hành động: Duyệt danh sách hai đội → Chuyển sang READY
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-700">
                3
              </div>
              <div>
                <h4 className="font-semibold mb-1">READY - Sẵn sàng</h4>
                <p className="text-sm text-gray-600">
                  Cả hai đội đã có danh sách được duyệt. Trận đấu sẵn sàng diễn ra.
                </p>
                <div className="mt-2 text-sm text-blue-600 font-medium">
                  → Hành động: BTC đánh dấu trận bắt đầu → Chuyển sang IN_PROGRESS
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center font-bold text-yellow-700">
                4
              </div>
              <div>
                <h4 className="font-semibold mb-1">IN_PROGRESS - Đang diễn ra</h4>
                <p className="text-sm text-gray-600">
                  Trận đấu đang được thi đấu.
                </p>
                <div className="mt-2 text-sm text-blue-600 font-medium">
                  → Hành động: BTC kết thúc trận → Chuyển sang FINISHED
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-700">
                5
              </div>
              <div>
                <h4 className="font-semibold mb-1">FINISHED - Kết thúc</h4>
                <p className="text-sm text-gray-600">
                  Trận đấu đã kết thúc, đợi trọng tài chính và giám sát viên nộp báo cáo.
                  Giám sát viên có thể gắn cờ vi phạm nghiêm trọng để gửi lên Ban Kỷ luật.
                </p>
                <div className="mt-2 text-sm text-blue-600 font-medium">
                  → Hành động: Cả hai báo cáo đã nộp → Chuyển sang REPORTED
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700">
                6
              </div>
              <div>
                <h4 className="font-semibold mb-1">REPORTED - Đã báo cáo</h4>
                <p className="text-sm text-gray-600">
                  Cả trọng tài và giám sát đã nộp báo cáo. BTC xem xét và xác nhận hoàn thành.
                </p>
                <div className="mt-2 text-sm text-blue-600 font-medium">
                  → Hành động: BTC xác nhận → Chuyển sang COMPLETED
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-700">
                7
              </div>
              <div>
                <h4 className="font-semibold mb-1">COMPLETED - Hoàn thành</h4>
                <p className="text-sm text-gray-600">
                  Trận đấu đã hoàn thành mọi quy trình. Kết quả được ghi nhận vào bảng xếp hạng.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Manager Component */}
        {selectedSeason && (
          <MatchLifecycleManager seasonId={selectedSeason.id} />
        )}

        {loading && (
          <div className="text-center py-8 text-gray-500">
            Đang tải dữ liệu...
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchLifecycleWorkflowPage;
