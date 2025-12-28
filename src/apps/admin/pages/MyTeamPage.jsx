import React, { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Loader2, User } from 'lucide-react'
import TeamsService from '../../../layers/application/services/TeamsService'
import PlayersService from '../../../layers/application/services/PlayersService'
import SeasonService from '../../../layers/application/services/SeasonService'

const PLAYER_TYPE_MAP = {
  domestic: 'Trong nước',
  foreign: 'Nước ngoài',
  u21: 'U21',
  u23: 'U23'
};

const MyTeamPage = ({ currentUser }) => {
  const teamIds = useMemo(() => {
    return Array.isArray(currentUser?.teamIds) ? currentUser.teamIds : []
  }, [currentUser])

  const [seasons, setSeasons] = useState([])
  const [selectedSeasonId, setSelectedSeasonId] = useState('')
  const [teams, setTeams] = useState([])
  const [playersByTeam, setPlayersByTeam] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch seasons first
  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const data = await SeasonService.listSeasons()
        setSeasons(data || [])
        // Default to latest active or just latest
        if (data && data.length > 0) {
          // Sort by year desc or id desc (assuming id implies order)
          const sorted = [...data].sort((a, b) => b.id - a.id);
          setSelectedSeasonId(sorted[0].id)
        }
      } catch (err) {
        console.error("Failed to fetch seasons", err)
      }
    }
    fetchSeasons()
  }, [])

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      if (!teamIds.length || !selectedSeasonId) {
        if (!selectedSeasonId && seasons.length > 0) {
          // Wait for selection
        } else if (teamIds.length > 0) {
          // No season selected yet
        }
        return
      }

      setLoading(true)
      setError(null)
      try {
        // 1. Fetch specific team details (more robust than getAllTeams + filter)
        // Ensure IDs are numbers if needed, but getTeamById handles string path param usually.
        // We iterate teamIds and fetch each.
        const teamsData = await Promise.all(
          teamIds.map(async (id) => {
            try {
              return await TeamsService.getTeamById(id)
            } catch (e) {
              console.warn(`Failed to fetch team ${id}`, e)
              return null
            }
          })
        )

        // Filter out failed fetches
        const validTeams = teamsData.filter(t => t !== null)

        if (validTeams.length === 0) {
          if (isMounted) {
            setTeams([])
            setPlayersByTeam({})
            // If we have IDs but failed to fetch, maybe display specific error?
            // For now, empty filtered list is result.
          }
          return
        }

        // 2. Fetch approved players for each valid team
        const playersEntries = await Promise.all(
          validTeams.map(async (team) => {
            try {
              // USE NEW API: Get approved players for this team in this season
              const players = await TeamsService.getMyTeamApprovedSeasonPlayers(selectedSeasonId, team.id)
              return [team.id, players || []]
            } catch (e) {
              console.error(`Failed to fetch players for team ${team.id}`, e)
              return [team.id, []]
            }
          })
        )

        if (!isMounted) return
        setTeams(validTeams)
        setPlayersByTeam(Object.fromEntries(playersEntries))
      } catch (err) {
        console.error('Failed to load my team', err)
        if (isMounted) {
          setError(err?.message || 'Unable to load your team data.')
          setTeams([])
          setPlayersByTeam({})
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    if (selectedSeasonId) {
      load()
    }
    return () => {
      isMounted = false
    }
  }, [teamIds.join(','), selectedSeasonId, seasons.length])

  if (!teamIds.length) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <h2 className="text-lg font-semibold mb-2">Bạn chưa được gán đội bóng</h2>
        <p className="text-sm">
          Tài khoản này chưa được gán vào đội bóng nào. Vui lòng liên hệ quản trị viên giải đấu.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Đội bóng của tôi</h1>
          <p className="text-gray-400 mt-1">Danh sách cầu thủ đã được duyệt theo mùa giải.</p>
        </div>

        {/* Season Selector */}
        <div className="w-full md:w-64">

          <select
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            value={selectedSeasonId}
            onChange={(e) => setSelectedSeasonId(Number(e.target.value))}
            disabled={loading}
          >
            <option value="">Chọn mùa giải</option>
            {seasons.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-300">
          <Loader2 className="animate-spin mr-2" size={18} />
          Đang tải...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800 flex items-start gap-3">
          <AlertCircle size={18} className="mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {!loading && !error && teams.length === 0 && (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6 text-gray-200">
          Không tìm thấy đội trong danh mục.
        </div>
      )}

      {!loading && !error && teams.map((team) => {
        const players = playersByTeam[team.id] || []
        return (
          <section key={team.id} className="rounded-xl border border-gray-700 bg-gray-800 mb-6">
            <div className="flex items-center justify-between gap-4 border-b border-gray-700 px-6 py-4">
              <div>
                <div className="text-lg font-semibold text-white">{team.name}</div>
                <div className="text-sm text-gray-400">
                  {team.code ? `${team.code} · ` : ''}
                  {team.country || '—'}
                </div>
              </div>
              <div className="text-sm text-gray-300">{players.length} cầu thủ đã duyệt</div>
            </div>

            {players.length === 0 ? (
              <div className="px-6 py-5 text-gray-300">Không tìm thấy cầu thủ đã duyệt cho mùa giải này.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-900/50 text-gray-300">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold">Cầu thủ</th>
                      <th className="px-6 py-3 text-left font-semibold">Vị trí</th>
                      <th className="px-6 py-3 text-left font-semibold">Số áo</th>
                      <th className="px-6 py-3 text-left font-semibold">Loại</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {players.map((player) => (
                      <tr key={player.player_id ?? player.id} className="hover:bg-gray-900/40">
                        <td className="px-6 py-3 text-gray-100">
                          <div className="flex items-center gap-2">
                            <User size={16} className="text-gray-400" />
                            {player.player_name ?? player.name ?? '—'}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-gray-200">{player.position_code ?? player.position ?? '—'}</td>
                        <td className="px-6 py-3 text-gray-200">{player.shirt_number ?? '—'}</td>
                        <td className="px-6 py-3 text-gray-200 capitalize">
                          {PLAYER_TYPE_MAP[player.player_type] || player.player_type || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )
      })
      }
    </div>
  )
}

export default MyTeamPage

