import React, { useState } from 'react'
import { safeBtoaUnicode } from '../shared/utils/base64'
import { TrendingUp, TrendingDown, Minus, Info, Eye, BarChart3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const StandingsTable = ({ standings, selectedGroup }) => {
  const { t } = useTranslation()
  const [selectedTeam, setSelectedTeam] = useState(null)
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

  const getChangeIcon = (change) => {
    if (change > 0) return <TrendingUp size={14} className="text-[#059669]" />
    if (change < 0) return <TrendingDown size={14} className="text-[#DC2626]" />
    return <Minus size={14} className="text-[#64748B]" />
  }

  const filteredStandings = selectedGroup === 'all' 
    ? standings 
    : standings.filter(team => team.status === selectedGroup)

  return (
    <div className="space-y-6">
      {/* Table Controls */}
      <div className="flex items-center justify-between bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-xl shadow-xl">
        <div className="flex items-center space-x-4">
          <h2 className="font-bold text-white">Bảng xếp hạng chi tiết</h2>
          <div className="flex items-center space-x-2 text-sm text-white/70">
            <Info size={16} />
            <span>Click vào đội để xem chi tiết</span>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-medium">
            <BarChart3 size={16} />
            <span>Thống kê nâng cao</span>
          </button>
          <button className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-medium">
            <Eye size={16} />
            <span>Xem trực tiếp</span>
          </button>
        </div>
      </div>

      {/* Enhanced Table */}
      <div className="bg-transparent md:bg-[#0B1220]/80 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-[#003B73] to-[#00924A] text-white p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">League Phase Standings</h2>
          <div className="text-sm opacity-90">
            Last updated: {new Date().toLocaleString('en-GB', {
              day: '2-digit',
              month: '2-digit', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
        
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#003B73]/80 to-[#00924A]/80 backdrop-blur-sm">
            <tr>
              <th className="text-center w-12">#</th>
              <th className="text-center w-8"></th>
              <th className="text-left min-w-[200px]">{t('standings.team')}</th>
              <th className="text-center w-12">{t('standings.played')}</th>
              <th className="text-center w-12">{t('standings.won')}</th>
              <th className="text-center w-12">{t('standings.drawn')}</th>
              <th className="text-center w-12">{t('standings.lost')}</th>
              <th className="text-center w-16">{t('standings.gf')}</th>
              <th className="text-center w-16">{t('standings.ga')}</th>
              <th className="text-center w-16">{t('standings.gd')}</th>
              <th className="text-center w-16">{t('standings.points')}</th>
              <th className="text-center w-32 hidden lg:table-cell">{t('standings.form')}</th>
              <th className="text-center w-20 hidden xl:table-cell">Next</th>
              <th className="text-center w-12">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredStandings.map((team, index) => (
              <tr 
                key={team.position} 
                className={`cursor-pointer transition-all duration-300 ${
                  selectedTeam === team.position ? 'bg-cyan-500/20 border-l-4 border-cyan-400' :
                  team.position <= 8 ? 'bg-green-500/10 hover:bg-green-500/20 border-l-4 border-l-[#00C65A]' :
                  team.position <= 24 ? 'bg-yellow-500/10 hover:bg-yellow-500/20 border-l-4 border-l-[#F59E0B]' :
                  'bg-red-500/10 hover:bg-red-500/20 border-l-4 border-l-[#EF4444]'
                }`}
                onClick={() => setSelectedTeam(selectedTeam === team.position ? null : team.position)}
              >
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <span className="font-bold text-white text-lg">{team.position}</span>
                    {team.change > 0 && <TrendingUp size={12} className="text-green-400" />}
                    {team.change < 0 && <TrendingDown size={12} className="text-red-400" />}
                    {team.change === 0 && <div className="w-3"></div>}
                  </div>
                </td>
                <td className="p-4 text-center">
                  <span className="text-xs text-white font-bold bg-white/10 px-2 py-1 rounded border border-white/20">
                    {team.country}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={team.logo} 
                      alt={team.team}
                      className="w-8 h-8 object-contain hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = `data:image/svg+xml;base64,${safeBtoaUnicode(`<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="16" fill="#003399"/><text x="16" y="20" text-anchor="middle" fill="white" font-size="10" font-weight="bold">${team.team.substring(0, 3).toUpperCase()}</text></svg>`)}`
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
                    {team.nextMatch}
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

      {/* Team Detail Popup */}
      {selectedTeam && (
        <div className="mt-4 p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl">
          {(() => {
            const team = filteredStandings.find(t => t.position === selectedTeam)
            if (!team) return null
            
            return (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white flex items-center">
                    <img 
                      src={team.logo} 
                      alt={team.team}
                      className="w-8 h-8 object-contain mr-3"
                      onError={(e) => {
                        e.target.src = `data:image/svg+xml;base64,${safeBtoaUnicode(`<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="16" fill="#003399"/><text x="16" y="20" text-anchor="middle" fill="white" font-size="10" font-weight="bold">${(team.team || 'TM').substring(0, 3).toUpperCase()}</text></svg>`)}`
                      }}
                    />
                    {team.team} - Detailed Stats
                  </h3>
                  <button 
                    onClick={() => setSelectedTeam(null)}
                    className="text-white/70 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="grid md:grid-cols-4 gap-6">
                  <div className="text-center p-4 bg-white/10 backdrop-blur-lg border border-white/10 rounded-xl">
                    <div className="text-2xl font-bold text-cyan-400 mb-1">
                      {team.played > 0 ? ((team.won / team.played) * 100).toFixed(0) : '0'}%
                    </div>
                    <div className="text-white/70 text-sm">Win Rate</div>
                  </div>
                  <div className="text-center p-4 bg-white/10 backdrop-blur-lg border border-white/10 rounded-xl">
                    <div className="text-2xl font-bold text-green-400 mb-1">
                      {team.played > 0 ? (team.goalsFor / team.played).toFixed(1) : '0.0'}
                    </div>
                    <div className="text-white/70 text-sm">Goals/Match</div>
                  </div>
                  <div className="text-center p-4 bg-white/10 backdrop-blur-lg border border-white/10 rounded-xl">
                    <div className="text-2xl font-bold text-red-400 mb-1">
                      {team.played > 0 ? (team.goalsAgainst / team.played).toFixed(1) : '0.0'}
                    </div>
                    <div className="text-white/70 text-sm">Conceded/Match</div>
                  </div>
                  <div className="text-center p-4 bg-white/10 backdrop-blur-lg border border-white/10 rounded-xl">
                    <div className="text-2xl font-bold text-purple-400 mb-1">{team.coefficient?.toFixed(3) || 'N/A'}</div>
                    <div className="text-white/70 text-sm">UEFA Coefficient</div>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

export default StandingsTable
