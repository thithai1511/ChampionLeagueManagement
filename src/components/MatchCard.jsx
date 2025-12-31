import React from 'react'
import { safeBtoaUnicode } from '../shared/utils/base64'
import { Clock, MapPin, Calendar, Users } from 'lucide-react'
import { formatDateGMT7, formatTimeGMT7 } from '../utils/timezone'

const MatchCard = ({ match }) => {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'live':
        return <span className="uefa-live-badge animate-pulse">TRỰC TIẾP</span>
      case 'finished':
        return <span className="bg-uefa-gray text-white px-2 py-1 rounded text-xs font-bold">HẾT GIỞ</span>
      case 'upcoming':
        return <span className="bg-uefa-blue text-white px-2 py-1 rounded text-xs font-bold">SẮP DIỄN RA</span>
      default:
        return null
    }
  }

  const formatTime = (time) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="uefa-match-card group">
      {/* Match Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-uefa-gray text-sm">
            <Calendar size={14} />
            <span>{formatDateGMT7(match.date)}</span>
            <Clock size={14} />
            <span>{formatTime(match.time)}</span>
          </div>
          {getStatusBadge(match.status)}
        </div>
        <div className="text-uefa-gray text-sm font-medium">
          {match.competition} • MD{match.matchday}
        </div>
      </div>

      {/* Teams and Score */}
      <div className="flex items-center justify-between mb-4">
        {/* Home Team */}
        <div className="flex items-center space-x-3 flex-1">
          <img
            src={match.homeTeam.logo}
            alt={match.homeTeam.name}
            className="w-10 h-10 object-contain"
            onError={(e) => {
              e.target.src = `data:image/svg+xml;base64,${safeBtoaUnicode(`<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="20" fill="#003399"/><text x="20" y="25" text-anchor="middle" fill="white" font-size="10" font-weight="bold">${match.homeTeam.shortName}</text></svg>`)}`
            }}
          />
          <div>
            <div className="uefa-team-name text-lg font-semibold">{match.homeTeam.name}</div>
            <div className="text-uefa-gray text-sm">{match.homeTeam.shortName}</div>
          </div>
        </div>

        {/* Score or Time */}
        <div className="flex items-center justify-center min-w-[100px] px-4">
          {match.status === 'finished' && match.score ? (
            <div className="text-center">
              <div className="uefa-score text-3xl font-bold">
                {match.score.home} - {match.score.away}
              </div>
              <div className="text-xs text-uefa-gray">Hết giờ</div>
            </div>
          ) : match.status === 'live' ? (
            <div className="text-center">
              <div className="uefa-score text-3xl font-bold text-uefa-red">
                {match.score?.home || 0} - {match.score?.away || 0}
              </div>
              <div className="text-xs text-uefa-red font-bold animate-pulse">
                {match.minute || '90'}'
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-uefa-blue font-bold text-lg">{formatTime(match.time)}</div>
              <div className="text-xs text-uefa-gray">Giờ khai cuộc</div>
            </div>
          )}
        </div>

        {/* Away Team */}
        <div className="flex items-center space-x-3 flex-1 justify-end">
          <div className="text-right">
            <div className="uefa-team-name text-lg font-semibold">{match.awayTeam.name}</div>
            <div className="text-uefa-gray text-sm">{match.awayTeam.shortName}</div>
          </div>
          <img
            src={match.awayTeam.logo}
            alt={match.awayTeam.name}
            className="w-10 h-10 object-contain"
            onError={(e) => {
              e.target.src = `data:image/svg+xml;base64,${safeBtoaUnicode(`<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="20" fill="#003399"/><text x="20" y="25" text-anchor="middle" fill="white" font-size="10" font-weight="bold">${match.awayTeam.shortName}</text></svg>`)}`
            }}
          />
        </div>
      </div>

      {/* Match Details */}
      <div className="flex items-center justify-between pt-4 border-t border-uefa-medium-gray">
        <div className="flex items-center space-x-4 text-uefa-gray text-sm">
          <div className="flex items-center space-x-1">
            <MapPin size={14} />
            <span>{match.venue}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Users size={14} />
            <span>{match.city}</span>
          </div>
        </div>

        {match.status === 'upcoming' && (
          <button className="text-uefa-blue hover:text-uefa-dark text-sm font-medium transition-colors">
            Xem trước →
          </button>
        )}

        {match.status === 'finished' && (
          <button className="text-uefa-blue hover:text-uefa-dark text-sm font-medium transition-colors">
            Báo cáo trận đấu →
          </button>
        )}

        {match.status === 'live' && (
          <button className="text-uefa-red hover:text-uefa-dark text-sm font-medium transition-colors animate-pulse">
            Xem trực tiếp →
          </button>
        )}
      </div>
    </div>
  )
}

export default MatchCard
