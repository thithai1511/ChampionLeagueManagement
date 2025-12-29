import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import {
  Search,
  User,
  Calendar,
  MapPin,
  Shirt,
  Globe,
  RefreshCw,
  AlertTriangle,
  Layers
} from 'lucide-react'
import PlayersService from '../layers/application/services/PlayersService'
import MatchesService from '../layers/application/services/MatchesService'
import {
  toCompetitionNameLabel,
  toCompetitionStageLabel,
  toCountryLabel,
  toMatchStatusLabel,
  toPlayerPositionLabel
} from '../shared/utils/vi'
import logger from '../shared/utils/logger'
import PlayerAvatar from '../shared/components/PlayerAvatar'

const PlayerLookup = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  })

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState(null)
  const [recentMatches, setRecentMatches] = useState([])
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1, total: 0 })

  useEffect(() => {
    let cancelled = false
    const loadPlayers = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await PlayersService.listPlayers({
          limit: pagination.limit,
          page: currentPage,
          season: '',
          search: searchTerm
        })
        if (!cancelled) {
          setPlayers(response.players || [])
          setPagination(response.pagination || pagination)
        }
      } catch (err) {
        if (!cancelled) {
          logger.error('Không thể tải danh sách cầu thủ', err)
          setError('Không thể tải danh sách cầu thủ từ máy chủ.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    loadPlayers()
    return () => {
      cancelled = true
    }
  }, [currentPage])

  const handleSync = async () => {
    try {
      setSyncing(true)
      await PlayersService.syncPlayers()
      const response = await PlayersService.listPlayers({ limit: 400 })
      setPlayers(response.players || [])
    } catch (err) {
      logger.error('Không thể đồng bộ dữ liệu cầu thủ', err)
      setError('Đồng bộ thất bại. Vui lòng thử lại sau.')
    } finally {
      setSyncing(false)
    }
  }

  const filteredPlayers = useMemo(() => {
    if (!searchTerm) {
      return players
    }
    const term = searchTerm.toLowerCase()
    return players.filter((player) => {
      return (
        player.name.toLowerCase().includes(term) ||
        (player.teamName || '').toLowerCase().includes(term) ||
        (player.position || '').toLowerCase().includes(term) ||
        (player.nationality || '').toLowerCase().includes(term)
      )
    })
  }, [players, searchTerm])

  useEffect(() => {
    if (filteredPlayers.length > 0) {
      setSelectedPlayer((prev) => {
        if (!prev) {
          return filteredPlayers[0]
        }
        const stillExists = filteredPlayers.find((player) => player.id === prev.id)
        return stillExists || filteredPlayers[0]
      })
    } else {
      setSelectedPlayer(null)
    }
  }, [filteredPlayers])

  useEffect(() => {
    let cancelled = false
    const loadMatches = async () => {
      if (!selectedPlayer) {
        setRecentMatches([])
        return
      }
      try {
        const response = await MatchesService.getAllMatches({
          team: selectedPlayer.teamName,
          limit: 5
        })
        if (!cancelled) {
          setRecentMatches(response.matches || [])
        }
      } catch (err) {
        if (!cancelled) {
          setRecentMatches([])
        }
      }
    }
    loadMatches()
    return () => {
      cancelled = true
    }
  }, [selectedPlayer])

  const calculateAge = (birthdate) => {
    if (!birthdate) return 'Không rõ'
    const today = new Date()
    const birth = new Date(birthdate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const formatDate = (dateString, fallback = 'Không rõ') => {
    if (!dateString) return fallback
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return fallback
    return date.toLocaleDateString('vi-VN')
  }

  const renderPlayerList = () => {
    if (loading) {
      return (
        <div className="text-center py-8 text-gray-400">
          <RefreshCw size={32} className="mx-auto mb-2 animate-spin text-football-green" />
          <p className="text-sm">Đang tải dữ liệu cầu thủ...</p>
        </div>
      )
    }

    if (error) {
      return (
        <div className="text-center py-8 text-gray-400">
          <AlertTriangle size={32} className="mx-auto mb-2 text-red-500" />
          <p className="text-sm">{error}</p>
        </div>
      )
    }

    if (filteredPlayers.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400">
          <User size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Không tìm thấy cầu thủ phù hợp</p>
        </div>
      )
    }

    return (
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredPlayers.map((player) => (
          <motion.div
            key={player.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedPlayer(player)}
            className={`p-4 rounded-lg cursor-pointer transition-all ${
              selectedPlayer?.id === player.id
                ? 'bg-football-green text-white'
                : 'bg-white/5 hover:bg-white/10 text-white'
            }`}
          >
            <div className="font-bold">{player.name}</div>
            <div className="text-sm opacity-75">
              {player.teamName || 'Chưa rõ đội'}
            </div>
            <div className="text-xs opacity-60">
              {player.position || 'Không rõ vị trí'}
            </div>
          </motion.div>
        ))}
      </div>
    )
  }

  return (
    <div className="section-dark">
      <section className="min-h-screen py-20">
        <div className="container mx-auto px-6">
          <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 50 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16 section-title-container"
          >
            <h1 className="text-5xl font-bold text-white mb-6">TRA CỨU CẦU THỦ</h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Xem nhanh thông tin và đội hình thực tế của Giải Bóng Đá Việt Nam
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-1"
            >
              <div className="professional-card rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <Search className="mr-3 text-football-green" size={28} />
                  Tìm kiếm cầu thủ
                </h2>

                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/80 transition hover:bg-white/10 disabled:opacity-40"
                  >
                    <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                    <span>Đồng bộ cầu thủ</span>
                  </button>
                  <span className="text-xs text-white/60">
                    Tổng cộng: {players.length}
                  </span>
                </div>

                <div className="mb-6">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-football-green transition-colors"
                    placeholder="Tìm theo tên cầu thủ, đội, vị trí..."
                  />
                </div>

                {renderPlayerList()}
                
                {/* Pagination Controls */}
                {!loading && !error && pagination.totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 bg-white/10 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20 transition-colors"
                    >
                      Trang trước
                    </button>
                    <span className="text-white/60">
                      Trang {currentPage} / {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                      disabled={currentPage >= pagination.totalPages}
                      className="px-3 py-2 bg-white/10 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20 transition-colors"
                    >
                      Trang sau
                    </button>
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="lg:col-span-2"
            >
              {selectedPlayer ? (
                <div className="space-y-6">
                  <div className="professional-card rounded-xl p-8">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h2 className="text-3xl font-bold text-white mb-2">{selectedPlayer.name}</h2>
                        <p className="text-football-green text-lg font-semibold">
                          {selectedPlayer.teamName || 'Chưa rõ đội'}
                        </p>
                      </div>
                      <PlayerAvatar
                        playerId={selectedPlayer.id || selectedPlayer.player_id}
                        playerName={selectedPlayer.name}
                        size="xl"
                        className="border-2 border-football-green"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <InfoField
                        icon={<Calendar className="text-football-green" size={20} />}
                        label="Ngày sinh / Tuổi"
                        value={
                          selectedPlayer.dateOfBirth
                            ? `${formatDate(selectedPlayer.dateOfBirth)} · ${calculateAge(selectedPlayer.dateOfBirth)} tuổi`
                            : 'Chưa cập nhật'
                        }
                      />
                      <InfoField
                        icon={<User className="text-football-green" size={20} />}
                        label="Vị trí"
                        value={toPlayerPositionLabel(selectedPlayer.position)}
                      />
                      <InfoField
                        icon={<Shirt className="text-football-green" size={20} />}
                        label="Số áo"
                        value={
                          selectedPlayer.shirtNumber !== null && selectedPlayer.shirtNumber !== undefined
                            ? `#${selectedPlayer.shirtNumber}`
                            : 'Không rõ'
                        }
                      />
                      <InfoField
                        icon={<Globe className="text-football-green" size={20} />}
                        label="Quốc tịch"
                        value={selectedPlayer.nationality ? toCountryLabel(selectedPlayer.nationality) : 'Không rõ'}
                      />
                      <InfoField
                        icon={<Layers className="text-football-green" size={20} />}
                        label="Mùa giải"
                        value={selectedPlayer.season || 'Hiện tại'}
                      />
                      <InfoField
                        icon={<MapPin className="text-football-green" size={20} />}
                        label="Mã đội"
                        value={selectedPlayer.teamTla || 'Không rõ'}
                      />
                      <InfoField
                        icon={<RefreshCw className="text-football-green" size={20} />}
                        label="Cập nhật gần nhất"
                        value={selectedPlayer.updatedAt && !isNaN(new Date(selectedPlayer.updatedAt).getTime()) 
                          ? formatDate(selectedPlayer.updatedAt, 'Không rõ')
                          : 'Mới thêm'}
                      />
                    </div>
                  </div>

                  <div className="professional-card rounded-xl p-8">
                    <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                      <MapPin className="mr-3 text-football-green" size={28} />
                      Trận đấu gần đây của đội
                    </h3>

                    {recentMatches.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <Layers size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">
                          Chưa có dữ liệu trận đấu gần đây cho đội {selectedPlayer.teamName}.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recentMatches.map((match) => (
                          <div key={match.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <div className="flex items-center justify-between">
                              <div>
                                  <p className="text-white font-medium">
                                  {match.homeTeamName} gặp {match.awayTeamName}
                                  </p>
                                  <p className="text-gray-400 text-sm">
                                  {formatDate(match.utcDate)} · {match.competitionName ? toCompetitionNameLabel(match.competitionName) : toCompetitionStageLabel(match.stage || 'Vòng phân hạng')}
                                  </p>
                                </div>
                              <div className="text-right text-white font-semibold">
                                {toMatchStatusLabel(match.status)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="professional-card rounded-xl p-8">
                  <div className="text-center py-16 text-gray-400">
                    <User size={64} className="mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold mb-2">Chọn một cầu thủ</h3>
                    <p>Hãy chọn cầu thủ từ danh sách để xem thông tin chi tiết</p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}

const InfoField = ({ icon, label, value }) => (
  <div className="flex items-center space-x-3">
    {icon}
    <div>
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-white font-semibold">{value}</p>
    </div>
  </div>
)

export default PlayerLookup
