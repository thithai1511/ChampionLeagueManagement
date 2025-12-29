import React, { useEffect, useState } from 'react'
import { Users, RefreshCw } from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import BreadcrumbNav from '../../../components/BreadcrumbNav'
import SeasonService from '../../../layers/application/services/SeasonService'
import TeamRegistrationWorkflow from '../components/TeamRegistrationWorkflow'

/**
 * Admin page for managing team registration workflow
 * Replaces old invitation flow with new state machine workflow
 */
const SeasonRegistrationWorkflowPage = () => {
  const [seasons, setSeasons] = useState([])
  const [selectedSeasonId, setSelectedSeasonId] = useState(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadSeasons()
  }, [])

  const loadSeasons = async () => {
    setLoading(true)
    try {
      const data = await SeasonService.listSeasons()
      setSeasons(data || [])
      if (data && data.length > 0 && !selectedSeasonId) {
        setSelectedSeasonId(data[0].id)
      }
    } catch (error) {
      console.error('Failed to load seasons:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  const breadcrumbs = [
    { label: 'Trang chủ', path: '/admin' },
    { label: 'Quản lý mùa giải', path: '/admin/seasons' },
    { label: 'Quy trình đăng ký đội', path: '/admin/season-registration-workflow' }
  ]

  return (
    <div className="min-h-screen bg-gray-900">
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <BreadcrumbNav items={breadcrumbs} />
          
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Users className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Quy trình đăng ký đội tham gia mùa giải
                </h1>
                <p className="text-gray-300 text-sm mt-1">
                  Quản lý toàn bộ quy trình từ mời đội → nộp hồ sơ → duyệt → xếp lịch
                </p>
              </div>
            </div>
            
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <RefreshCw size={18} />
              Làm mới
            </button>
          </div>
        </div>

        {/* Season Selector */}
        <div className="bg-gray-800 rounded-lg shadow p-6 mb-6 border border-gray-700">
          <label className="block text-sm font-medium text-white mb-2">
            Chọn mùa giải
          </label>
          <select
            value={selectedSeasonId || ''}
            onChange={(e) => setSelectedSeasonId(parseInt(e.target.value, 10))}
            className="w-full md:w-96 px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          >
            {seasons.length === 0 ? (
              <option value="">Không có mùa giải nào</option>
            ) : (
              seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name} ({season.start_date} - {season.end_date})
                </option>
              ))
            )}
          </select>
        </div>

        {/* Workflow Diagram */}
        <div className="bg-gray-800 rounded-lg shadow p-6 mb-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-cyan-400 mb-4">Quy trình Workflow</h3>
          <div className="flex items-center justify-between text-sm overflow-x-auto pb-2">
            <div className="flex flex-col items-center min-w-[100px]">
              <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mb-2">
                <span className="text-2xl">📝</span>
              </div>
              <span className="font-medium text-white">Bản nháp</span>
              <span className="text-xs text-gray-400">DRAFT_INVITE</span>
            </div>
            
            <div className="text-blue-400 text-2xl">→</div>
            
            <div className="flex flex-col items-center min-w-[100px]">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-2">
                <span className="text-2xl">📧</span>
              </div>
              <span className="font-medium text-white">Gửi lời mời</span>
              <span className="text-xs text-gray-400">INVITED</span>
            </div>
            
            <div className="text-blue-400 text-2xl">→</div>
            
            <div className="flex flex-col items-center min-w-[100px]">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-2">
                <span className="text-2xl">👍</span>
              </div>
              <span className="font-medium text-white">Chấp nhận</span>
              <span className="text-xs text-gray-400">ACCEPTED</span>
            </div>
            
            <div className="text-blue-400 text-2xl">→</div>
            
            <div className="flex flex-col items-center min-w-[100px]">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mb-2">
                <span className="text-2xl">📄</span>
              </div>
              <span className="font-medium text-white">Nộp hồ sơ</span>
              <span className="text-xs text-gray-400">SUBMITTED</span>
            </div>
            
            <div className="text-blue-400 text-2xl">→</div>
            
            <div className="flex flex-col items-center min-w-[100px]">
              <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mb-2">
                <span className="text-2xl">✅</span>
              </div>
              <span className="font-medium text-white">Duyệt</span>
              <span className="text-xs text-gray-400">APPROVED</span>
            </div>
            
            <div className="text-blue-400 text-2xl">→</div>
            
            <div className="flex flex-col items-center min-w-[100px]">
              <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center mb-2">
                <span className="text-2xl">📅</span>
              </div>
              <span className="font-medium text-white">Xếp lịch</span>
              <span className="text-xs text-gray-400">≥10 đội</span>
            </div>
          </div>
          
          {/* Alternative Flow */}
          <div className="mt-4 pt-4 border-t border-gray-600">
            <p className="text-xs text-yellow-400 mb-2 font-semibold">
              <strong>Luồng xử lý khác:</strong>
            </p>
            <div className="flex gap-4 text-xs text-gray-300">
              <span>• DECLINED: Đội từ chối → Tìm đội thay thế</span>
              <span>• REQUEST_CHANGE: BTC yêu cầu sửa → SUBMITTED (lại)</span>
              <span>• REJECTED: Không đạt → Loại → Tìm đội thay thế</span>
            </div>
          </div>
        </div>

        {/* Workflow Component */}
        {selectedSeasonId ? (
          <TeamRegistrationWorkflow 
            seasonId={selectedSeasonId} 
            refreshTrigger={refreshTrigger}
          />
        ) : (
          <div className="bg-gray-800 rounded-lg shadow p-12 text-center text-gray-300 border border-gray-700">
            Vui lòng chọn mùa giải để xem quy trình đăng ký
          </div>
        )}

        {/* Help Section */}
        <div className="bg-gray-800 rounded-lg shadow p-6 mt-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-3">
            📖 Hướng dẫn sử dụng
          </h3>
          <div className="space-y-2 text-sm text-gray-300">
            <p><strong>Bước 1:</strong> BTC tạo danh sách lời mời (Top 8 + 2 đội thăng hạng) → Trạng thái DRAFT_INVITE</p>
            <p><strong>Bước 2:</strong> BTC bấm "Gửi tất cả lời mời" → Gửi thông báo cho các đội → Trạng thái INVITED</p>
            <p><strong>Bước 3:</strong> Đội bóng chấp nhận/từ chối trong vòng 2 tuần → ACCEPTED hoặc DECLINED</p>
            <p><strong>Bước 4:</strong> Đội nộp hồ sơ (sân, áo, cầu thủ) → SUBMITTED</p>
            <p><strong>Bước 5:</strong> BTC duyệt hồ sơ → APPROVED (hoặc REQUEST_CHANGE / REJECTED)</p>
            <p><strong>Bước 6:</strong> Khi đủ 10 đội APPROVED → Hệ thống sẵn sàng xếp lịch thi đấu</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SeasonRegistrationWorkflowPage
