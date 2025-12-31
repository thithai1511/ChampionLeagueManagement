import React, { useState, useEffect } from 'react'
import { safeBtoaUnicode } from '../shared/utils/base64'
import { ChevronDown, Trophy, Target, Users, TrendingUp, TrendingDown, Minus, Download, Share2, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import StandingsTable from '../components/StandingsTable'
import TopScorers from '../components/TopScorers'
import UpcomingMatches from '../components/UpcomingMatches'
import LiveTicker from '../components/LiveTicker'
import LoadingState from '../shared/components/LoadingState'
import ErrorState from '../shared/components/ErrorState'
import EmptyState from '../shared/components/EmptyState'
import useApiWithTimeout from '../shared/utils/useApiWithTimeout'
import { APP_CONFIG } from '../config/app.config'
import logger from '../shared/utils/logger'

const Standings = () => {
  const { t } = useTranslation()
  const [selectedPhase, setSelectedPhase] = useState('league')
  const [selectedGroup, setSelectedGroup] = useState('all')
  const [showLiveTicker, setShowLiveTicker] = useState(true)
  
  // API State Management with timeout
  const { loading, error, data: apiData, fetchData } = useApiWithTimeout(15000)
  const [standings, setStandings] = useState([])
  const [seasonInfo, setSeasonInfo] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const phases = [
    { id: 'league', name: t('standings.leaguePhase'), active: true },
    { id: 'knockout', name: t('standings.knockoutPhase'), active: false },
  ]

  const groups = [
    { id: 'all', name: t('standings.allGroups') },
    { id: 'qualified', name: 'Đã lọt vào' },
    { id: 'playoff', name: 'Phải đá play-off' },
    { id: 'eliminated', name: 'Bị loại' },
  ]

  // Fetch standings data from backend with timeout
  const fetchStandings = async () => {
    try {
      const apiUrl = `${APP_CONFIG.API.BASE_URL}/teams/standings`
      logger.info('[Standings] Fetching from:', apiUrl)
      
      const result = await fetchData(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      logger.info('[Standings] Response data:', result)

      if (!result || !result.data) {
        logger.warn('[Standings] Invalid response format')
        setStandings([])
        return
      }

      const { data } = result
      const { season, table, updated } = data

      if (!table || !Array.isArray(table)) {
        logger.warn('[Standings] No table data in response')
        setStandings([])
        setSeasonInfo(season || null)
        setLastUpdated(updated || new Date().toISOString())
        return
      }

      // Map backend data to frontend format with safe mapping
      const mappedStandings = (table || []).filter(Boolean).map((team) => ({
        position: team?.position ?? 0,
        team: team?.teamName || team?.shortName || 'Unknown Team',
        teamId: team?.teamId ?? null,
        logo: team?.crest || null,
        country: team?.tla || '???',
        countryFlag: '', // Can be mapped based on country
        played: team?.played ?? 0,
        won: team?.won ?? 0,
        drawn: team?.draw ?? 0,
        lost: team?.lost ?? 0,
        goalsFor: team?.goalsFor ?? 0,
        goalsAgainst: team?.goalsAgainst ?? 0,
        goalDifference: team?.goalDifference ?? 0,
        points: team?.points ?? 0,
        form: Array.isArray(team?.form) ? team.form : [],
        status: team?.status || 'eliminated',
        change: 0,
        nextMatch: '',
        coefficient: 0
      }))

      logger.info('[Standings] Successfully mapped', mappedStandings.length, 'teams')

      setStandings(mappedStandings)
      setSeasonInfo(season)
      setLastUpdated(updated || new Date().toISOString())

    } catch (err) {
      logger.error('[Standings] Error fetching standings:', err)
      setStandings([])
    }
  }

  // Load data on mount
  useEffect(() => {
    fetchStandings()
  }, [])

  // Retry handler
  const handleRetry = () => {
    fetchStandings()
  }

  // Season filter state
  const [selectedSeason, setSelectedSeason] = useState('current')
  const [seasons, setSeasons] = useState([])
  
  // Load seasons for filter
  useEffect(() => {
    let isMounted = true
    const loadSeasons = async () => {
      try {
        const { default: SeasonService } = await import('../layers/application/services/SeasonService')
        const data = await SeasonService.listSeasons()
        if (isMounted) {
          setSeasons(data || [])
        }
      } catch (err) {
        logger.error('[Standings] Failed to load seasons:', err)
      }
    }
    loadSeasons()
    return () => { isMounted = false }
  }, [])

  const getStatusBadge = (status) => {
    switch (status) {
      case 'qualified':
        return <div className="uefa-badge uefa-badge-qualified">Q</div>
      case 'playoff':
        return <div className="uefa-badge uefa-badge-playoff">P</div>
      case 'eliminated':
        return <div className="uefa-badge uefa-badge-eliminated">E</div>
      default:
        return null
    }
  }

  const getFormBadge = (result) => {
    const baseClasses = "w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center"
    switch (result) {
      case 'W':
        return <div className={`${baseClasses} bg-[#059669] text-white`}>W</div>
      case 'D':
        return <div className={`${baseClasses} bg-[#D97706] text-white`}>D</div>
      case 'L':
        return <div className={`${baseClasses} bg-[#DC2626] text-white`}>L</div>
      default:
        return null
    }
  }

  const filteredStandings = selectedGroup === 'all' 
    ? standings 
    : standings.filter(team => team.status === selectedGroup)

  const stats = standings.length > 0 ? {
    totalTeams: standings.length,
    totalMatches: Math.floor(standings.reduce((sum, team) => sum + (team?.played ?? 0), 0) / 2),
    totalGoals: standings.reduce((sum, team) => sum + (team?.goalsFor ?? 0), 0),
    averageGoals: standings.length > 0 
      ? (standings.reduce((sum, team) => sum + (team?.goalsFor ?? 0), 0) / Math.max(1, standings.reduce((sum, team) => sum + (team?.played ?? 0), 0) / 2)).toFixed(2)
      : '0.00'
  } : {
    totalTeams: 0,
    totalMatches: 0,
    totalGoals: 0,
    averageGoals: '0.00'
  }

  // Loading State with Skeleton Table
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1929] via-[#1e293b] to-[#0f172a] py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="h-10 w-80 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 animate-pulse rounded-lg mb-3"></div>
            <div className="h-5 w-64 bg-white/10 animate-pulse rounded"></div>
          </div>
          
          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 bg-gradient-to-br from-cyan-500/30 to-blue-500/30 animate-pulse rounded-xl"></div>
                  <div className="h-8 w-16 bg-white/10 animate-pulse rounded"></div>
                </div>
                <div className="h-4 w-20 bg-white/10 animate-pulse rounded"></div>
              </div>
            ))}
          </div>

          {/* Table Skeleton with Glass Morphism */}
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            {/* Table Header */}
            <div className="bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 p-6 border-b border-white/10">
              <div className="flex items-center justify-center">
                <div className="relative">
                  <div className="h-8 w-8 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 h-8 w-8 border-4 border-purple-500/20 border-t-purple-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
                </div>
                <span className="ml-4 text-white/90 font-semibold text-lg">Đang tải bảng xếp hạng...</span>
              </div>
            </div>
            
            {/* Table Body */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-[#003B73]/50 to-[#00924A]/50 border-b border-white/10">
                  <tr className="text-white/80 text-sm uppercase tracking-wider">
                    <th className="p-4 text-center font-semibold">#</th>
                    <th className="p-4 text-left font-semibold">Đội bóng</th>
                    <th className="p-4 text-center font-semibold">P</th>
                    <th className="p-4 text-center font-semibold">W</th>
                    <th className="p-4 text-center font-semibold">D</th>
                    <th className="p-4 text-center font-semibold">L</th>
                    <th className="p-4 text-center font-semibold">GD</th>
                    <th className="p-4 text-center font-semibold">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[...Array(10)].map((_, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 text-center">
                        <div className="h-6 w-6 bg-gradient-to-br from-white/10 to-white/5 animate-pulse rounded mx-auto"></div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 animate-pulse rounded-lg"></div>
                          <div className="h-5 w-40 bg-white/10 animate-pulse rounded"></div>
                        </div>
                      </td>
                      <td className="p-4"><div className="h-5 w-8 bg-white/10 animate-pulse rounded mx-auto"></div></td>
                      <td className="p-4"><div className="h-5 w-8 bg-white/10 animate-pulse rounded mx-auto"></div></td>
                      <td className="p-4"><div className="h-5 w-8 bg-white/10 animate-pulse rounded mx-auto"></div></td>
                      <td className="p-4"><div className="h-5 w-8 bg-white/10 animate-pulse rounded mx-auto"></div></td>
                      <td className="p-4"><div className="h-5 w-10 bg-white/10 animate-pulse rounded mx-auto"></div></td>
                      <td className="p-4"><div className="h-6 w-10 bg-gradient-to-r from-cyan-500/20 to-green-500/20 animate-pulse rounded-lg mx-auto"></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error State
  if (error) {
    return (
      <div className="uefa-container py-8">
        <ErrorState
          title="Không thể tải bảng xếp hạng"
          message={error}
          onRetry={handleRetry}
          retrying={loading}
        />
      </div>
    )
  }

  // Empty State
  if (!standings || standings.length === 0) {
    return (
      <div className="uefa-container py-8">
        <EmptyState
          icon={Trophy}
          title="Chưa có bảng xếp hạng"
          message="Hiện chưa có dữ liệu bảng xếp hạng cho vòng đấu này. Vui lòng kiểm tra lại sau."
          actionLabel="Tải lại"
          onAction={handleRetry}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1929] via-[#1e293b] to-[#0f172a] py-8 px-4">
      <div className="max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm mb-6">
        <a href="#" className="text-white/60 hover:text-cyan-400 transition-colors">Trang chủ</a>
        <span className="text-white/40">/</span>
        <a href="#" className="text-white/60 hover:text-cyan-400 transition-colors">Cúp C1 Việt Nam</a>
        <span className="text-white/40">/</span>
        <span className="text-white font-semibold">Bảng xếp hạng</span>
      </nav>

      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white flex items-center">
              <Trophy className="mr-4 text-[#00d4ff]" size={36} />
              Bảng xếp hạng Cúp C1 Việt Nam
            </h1>
            <p className="text-white/70 mt-2">
              Bảng xếp hạng vòng bảng mùa giải {seasonInfo?.label || '2024/25'} • Cập nhật lần cuối: {lastUpdated ? new Date(lastUpdated).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN')}
            </p>
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={handleRetry}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-cyan-500/20 text-white border border-white/20 hover:border-cyan-500/40 transition-all"
            >
              <RefreshCw size={16} />
              <span>Làm mới</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-cyan-500/20 text-white border border-white/20 hover:border-cyan-500/40 transition-all">
              <Download size={16} />
              <span>Xuất dữ liệu</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-cyan-500/20 text-white border border-white/20 hover:border-cyan-500/40 transition-all">
              <Share2 size={16} />
              <span>Chia sẻ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl hover:bg-white/10 transition-all hover:scale-105">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center">
              <Users size={24} className="text-cyan-400" />
            </div>
            <div className="text-3xl font-bold text-white">{stats.totalTeams}</div>
          </div>
          <div className="text-white/70 text-sm font-medium">Đội bóng</div>
        </div>
        
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl hover:bg-white/10 transition-all hover:scale-105">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/30 to-emerald-500/30 flex items-center justify-center">
              <Trophy size={24} className="text-green-400" />
            </div>
            <div className="text-3xl font-bold text-white">{stats.totalMatches}</div>
          </div>
          <div className="text-white/70 text-sm font-medium">Trận đã đá</div>
        </div>
        
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl hover:bg-white/10 transition-all hover:scale-105">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center">
              <Target size={24} className="text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-white">{stats.totalGoals}</div>
          </div>
          <div className="text-white/70 text-sm font-medium">Tổng số bàn thắng</div>
        </div>
        
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl hover:bg-white/10 transition-all hover:scale-105">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/30 to-red-500/30 flex items-center justify-center">
              <TrendingUp size={24} className="text-orange-400" />
            </div>
            <div className="text-3xl font-bold text-white">{stats.averageGoals}</div>
          </div>
          <div className="text-white/70 text-sm font-medium">Bàn thắng/trận</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Season Filter - NEW */}
        <div className="relative">
          <label className="block text-sm font-semibold text-white/90 mb-2">
            Mùa giải
          </label>
          <select
            value={selectedSeason}
            onChange={(e) => {
              setSelectedSeason(e.target.value)
              // Reload standings for selected season
              fetchStandings()
            }}
            className="uefa-select pr-8 appearance-none w-48"
          >
            <option value="current">Mùa hiện tại</option>
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-2 bottom-3 text-uefa-gray pointer-events-none" />
        </div>

        {/* Phase Filter */}
        <div className="relative">
          <label className="block text-sm font-semibold text-white/90 mb-2">
            Giai đoạn
          </label>
          <select
            value={selectedPhase}
            onChange={(e) => setSelectedPhase(e.target.value)}
            className="uefa-select pr-8 appearance-none"
          >
            {phases.map((phase) => (
              <option key={phase.id} value={phase.id}>
                {phase.name}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-2 bottom-3 text-uefa-gray pointer-events-none" />
        </div>

        {/* Group Filter */}
        <div>
          <label className="block text-sm font-semibold text-white/90 mb-2">
            Trạng thái
          </label>
          <div className="flex gap-2 flex-wrap">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => setSelectedGroup(group.id)}
                className={`px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 ${
                  selectedGroup === group.id 
                    ? 'bg-gradient-to-r from-[#003B73] to-[#00924A] text-white shadow-lg scale-105' 
                    : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white border border-white/10'
                }`}
              >
                {group.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Standings Table */}
      <div className="bg-transparent md:bg-[#0B1220]/80 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-[#003B73] to-[#00924A] text-white p-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">Bảng xếp hạng vòng phân hạng</h2>
          <div className="text-sm font-medium opacity-90">
            Cập nhật lúc: {lastUpdated ? new Date(lastUpdated).toLocaleString('vi-VN', {
              day: '2-digit',
              month: '2-digit', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }) : 'Vừa xong'}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-[#003B73]/80 to-[#00924A]/80 backdrop-blur-sm">
              <tr className="text-white/90 text-xs uppercase tracking-wider">
                <th className="p-4 text-center font-semibold">#</th>
                <th className="p-4 text-center font-semibold"></th>
                <th className="p-4 text-left min-w-[200px] font-semibold">Đội bóng</th>
                <th className="p-4 text-center font-semibold">Đá</th>
                <th className="p-4 text-center font-semibold">Thắng</th>
                <th className="p-4 text-center font-semibold">Hòa</th>
                <th className="p-4 text-center font-semibold">Thua</th>
                <th className="p-4 text-center font-semibold">GF</th>
                <th className="p-4 text-center font-semibold">GA</th>
                <th className="p-4 text-center font-semibold">HS</th>
                <th className="p-4 text-center font-semibold">Điểm</th>
                <th className="p-4 text-center font-semibold hidden lg:table-cell">Phong độ</th>
                <th className="p-4 text-center font-semibold hidden xl:table-cell">Tiếp theo</th>
                <th className="p-4 text-center font-semibold">Trạng thái</th>
              </tr>
            </thead>
          <tbody className="divide-y divide-white/5">
            {filteredStandings.map((team, index) => (
              <tr key={team.position} className={`cursor-pointer transition-colors ${
                team.position <= 8 ? 'bg-green-500/10 hover:bg-green-500/20 border-l-4 border-l-[#00C65A]' :
                team.position <= 24 ? 'bg-yellow-500/10 hover:bg-yellow-500/20 border-l-4 border-l-[#F59E0B]' :
                'bg-red-500/10 hover:bg-red-500/20 border-l-4 border-l-[#EF4444]'
              }`}>
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <span className="font-bold text-white text-lg">{team.position}</span>
                    {team.change > 0 && <TrendingUp size={12} className="text-[#059669]" />}
                    {team.change < 0 && <TrendingDown size={12} className="text-[#DC2626]" />}
                    {team.change === 0 && <div className="w-3"></div>}
                  </div>
                </td>
                <td className="p-4 text-center">
                  <span className="text-xs text-white font-bold bg-white/10 px-2 py-1 rounded border border-white/20">
                    {team.country}
                  </span>
                </td>
                <td className="uefa-table-cell">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={team.logo || `data:image/svg+xml;base64,${safeBtoaUnicode(`<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="16" fill="#003399"/><text x="16" y="20" text-anchor="middle" fill="white" font-size="10" font-weight="bold">${(team.team || 'TM').substring(0, 3).toUpperCase()}</text></svg>`)}`} 
                      alt={team.team}
                      className="w-8 h-8 object-contain"
                      onError={(e) => {
                        e.target.src = `data:image/svg+xml;base64,${safeBtoaUnicode(`<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="16" fill="#003399"/><text x="16" y="20" text-anchor="middle" fill="white" font-size="10" font-weight="bold">${(team.team || 'TM').substring(0, 3).toUpperCase()}</text></svg>`)}`
                      }}
                    />
                    <div>
                      <div className="font-semibold text-white hover:text-cyan-400 transition-colors">
                        {team.team}
                      </div>
                      <div className="text-xs text-white/50">{team.countryFlag}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-center text-white/90 font-medium">{team.played}</td>
                <td className="p-4 text-center text-green-400 font-bold">{team.won}</td>
                <td className="p-4 text-center text-yellow-400 font-bold">{team.drawn}</td>
                <td className="p-4 text-center text-red-400 font-bold">{team.lost}</td>
                <td className="p-4 text-center text-white/90 font-medium">{team.goalsFor}</td>
                <td className="p-4 text-center text-white/90 font-medium">{team.goalsAgainst}</td>
                <td className="p-4 text-center font-bold">
                  <span className={team.goalDifference > 0 ? 'text-green-400' : team.goalDifference < 0 ? 'text-red-400' : 'text-white/60'}>
                    {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                  </span>
                </td>
                <td className="p-4 text-center font-bold text-xl text-cyan-400">
                  {team.points}
                </td>
                <td className="p-4 text-center hidden lg:table-cell">
                  <div className="flex items-center justify-center space-x-1">
                    {team.form && team.form.length > 0 ? (
                      team.form.map((result, formIndex) => (
                        <div key={formIndex} title={`Match ${formIndex + 1}: ${result === 'W' ? 'Win' : result === 'D' ? 'Draw' : 'Loss'}`}>
                          {getFormBadge(result)}
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-white/50">N/A</span>
                    )}
                  </div>
                </td>
                <td className="p-4 text-center hidden xl:table-cell">
                  <div className="text-xs text-white/70 font-medium">
                    {team.nextMatch || '-'}
                  </div>
                </td>
                <td className="p-4 text-center">
                  {getStatusBadge(team.status)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Standings */}
        <div className="lg:col-span-2">
          <StandingsTable standings={filteredStandings} selectedGroup={selectedGroup} />
          
          {/* Legend */}
          <div className="mt-6 p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl">
            <h3 className="font-bold text-white mb-4 flex items-center">
              <Trophy size={20} className="mr-2 text-[#00d4ff]" />
              Trạng thái vào vòng tiếp theo
            </h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-3 p-3 bg-white/10 backdrop-blur-lg border border-white/10 rounded-xl">
                <div className="uefa-badge uefa-badge-qualified">Q</div>
                <div>
                  <div className="font-semibold text-white">Đã vào vòng</div>
                  <div className="text-white/70">Vòng 1/16 (1-8)</div>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-white/10 backdrop-blur-lg border border-white/10 rounded-xl">
                <div className="uefa-badge uefa-badge-playoff">P</div>
                <div>
                  <div className="font-semibold text-white">Phải đá play-off</div>
                  <div className="text-white/70">Play-off loại trực tiếp (9-24)</div>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-white/10 backdrop-blur-lg border border-white/10 rounded-xl">
                <div className="uefa-badge uefa-badge-eliminated">E</div>
                <div>
                  <div className="font-semibold text-white">Bị loại</div>
                  <div className="text-white/70">Không vào tiếp (25-36)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Format Explanation */}
          <div className="mt-6 p-6 bg-gradient-to-br from-[#003B73] to-[#00924A] text-white rounded-2xl shadow-xl border border-white/10">
            <h3 className="font-bold mb-3">Cơ chế mới của Cúp C1 Việt Nam</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Vòng bảng</h4>
                <ul className="space-y-1 text-white/80">
                  <li>• 36 đội thi đấu trên một bảng xếp hạng chung</li>
                  <li>• Mỗi đội đá 8 trận</li>
                  <li>• Top 8 vào thẳng vòng 1/16</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Vòng loại trực tiếp</h4>
                <ul className="space-y-1 text-white/80">
                  <li>• Đội xếp thứ 9-24 phải đá play-off</li>
                  <li>• Đội xếp thứ 25-36 bị loại</li>
                  <li>• Chiến thắng ở play-off gặp top 8 ở vòng 1/16</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <TopScorers />
          <UpcomingMatches />
          
          {/* Quick Stats */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl p-6">
            <h3 className="font-bold text-white mb-4">Thống kê nhanh</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-white/70">Trận đã đá:</span>
                <span className="font-bold text-white">108/144</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Bàn thắng ghi được:</span>
                <span className="font-bold text-white">312</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Trung bình bàn thắng:</span>
                <span className="font-bold text-white">2.89</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Giữ sạch lưới:</span>
                <span className="font-bold text-white">67</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Hat-trick:</span>
                <span className="font-bold text-white">8</span>
              </div>
            </div>
          </div>

          {/* Next Matchday Countdown */}
          <div className="p-6 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-xl text-white">
            <h3 className="font-bold mb-4">Vòng đấu tiếp theo</h3>
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">Vòng 7</div>
              <div className="text-sm opacity-90 mb-4">22 tháng 1, 2025</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-2xl font-bold">16</div>
                  <div className="opacity-75">Trận đấu</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">32</div>
                  <div className="opacity-75">Đội bóng</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Ticker */}
      {showLiveTicker && <LiveTicker />}

      {/* Additional Info */}
      <div className="mt-12 pt-8 border-t border-white/10">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-bold text-white mb-4">Thông tin giải đấu</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-white/70">Mùa giải:</span>
                <span className="text-white font-medium">{seasonInfo?.label || '2024/25'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Cơ chế:</span>
                <span className="text-white font-medium">Vòng bảng + Loại trực tiếp</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Số đội:</span>
                <span className="text-white font-medium">{standings.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Trận/đội:</span>
                <span className="text-white font-medium">8 (Vòng bảng)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Tổng số trận:</span>
                <span className="text-white font-medium">189</span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-bold text-white mb-4">Các ngày quan trọng</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/70">Kết thúc vòng bảng:</span>
                <span className="text-white font-medium">29/01/2025</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Bốc thăm loại trực tiếp:</span>
                <span className="text-white font-medium">31/01/2025</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Vòng play-off:</span>
                <span className="text-white font-medium">11/12 & 18/19/02/2025</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Vòng 1/16:</span>
                <span className="text-white font-medium">4/5 & 11/12/03/2025</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Chung kết:</span>
                <span className="text-white font-medium">31/05/2025, Munich</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

export default Standings
