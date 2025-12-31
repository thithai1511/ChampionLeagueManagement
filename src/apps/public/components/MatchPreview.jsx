import React from 'react'
import { safeBtoaUnicode } from '../../../shared/utils/base64'
import { TrendingUp, TrendingDown, Users, Target, Shield, Clock } from 'lucide-react'

const MatchPreview = ({ homeTeam = {}, awayTeam = {}, venue, date, time }) => {
  // Ensure we have valid objects to prevent crashes
  const safeHomeTeam = { name: 'Unknown Team', logo: '', country: '', ...homeTeam };
  const safeAwayTeam = { name: 'Unknown Team', logo: '', country: '', ...awayTeam };

  const headToHead = {
    totalMatches: 12,
    homeWins: 5,
    draws: 3,
    awayWins: 4,
    lastMeeting: {
      date: '2023-04-19',
      result: '2-1',
      venue: 'Anfield'
    }
  }

  const teamForm = {
    home: {
      last5: ['W', 'W', 'W', 'D', 'W'],
      goalsScored: 13,
      goalsConceded: 3,
      cleanSheets: 4
    },
    away: {
      last5: ['L', 'W', 'D', 'L', 'W'],
      goalsScored: 8,
      goalsConceded: 9,
      cleanSheets: 2
    }
  }

  const keyPlayers = {
    home: [
      { name: 'Mohamed Salah', position: 'Tiền đạo', goals: 5, assists: 3 },
      { name: 'Virgil van Dijk', position: 'Hậu vệ', goals: 1, assists: 0 }
    ],
    away: [
      { name: 'Jonathan David', position: 'Tiền đạo', goals: 3, assists: 1 },
      { name: 'Angel Gomes', position: 'Tiền vệ', goals: 1, assists: 4 }
    ]
  }

  const getFormBadge = (result) => {
    const baseClasses = "w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center text-white"
    switch (result) {
      case 'W':
        return <div className={`${baseClasses} bg-uefa-green`}>T</div>
      case 'D':
        return <div className={`${baseClasses} bg-uefa-yellow text-uefa-black`}>H</div>
      case 'L':
        return <div className={`${baseClasses} bg-uefa-red`}>B</div>
      default:
        return null
    }
  }

  return (
    <div className="uefa-card p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-uefa-dark mb-2">Nhận định trận đấu</h2>
        <div className="text-uefa-gray">
          {new Date(date).toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })} • {time}
        </div>
        <div className="text-uefa-gray text-sm mt-1">{venue}</div>
      </div>

      {/* Teams Comparison */}
      <div className="grid grid-cols-3 gap-8 mb-8">
        {/* Home Team */}
        <div className="text-center">
          <img
            src={safeHomeTeam.logo || 'https://via.placeholder.com/80'}
            alt={safeHomeTeam.name}
            className="w-20 h-20 object-contain mx-auto mb-4"
            onError={(e) => {
              e.target.src = `data:image/svg+xml;base64,${safeBtoaUnicode(`<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="40" cy="40" r="40" fill="#003399"/><text x="40" y="48" text-anchor="middle" fill="white" font-size="16" font-weight="bold">${safeHomeTeam.name.substring(0, 3).toUpperCase()}</text></svg>`)}`
            }}
          />
          <h3 className="text-xl font-bold text-uefa-dark mb-2">{safeHomeTeam.name}</h3>
          <div className="text-uefa-gray text-sm">{safeHomeTeam.country}</div>
        </div>

        {/* VS */}
        <div className="flex items-center justify-center">
          <div className="text-4xl font-bold text-uefa-blue">VS</div>
        </div>

        {/* Away Team */}
        <div className="text-center">
          <img
            src={safeAwayTeam.logo || 'https://via.placeholder.com/80'}
            alt={safeAwayTeam.name}
            className="w-20 h-20 object-contain mx-auto mb-4"
            onError={(e) => {
              e.target.src = `data:image/svg+xml;base64,${safeBtoaUnicode(`<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="40" cy="40" r="40" fill="#003399"/><text x="40" y="48" text-anchor="middle" fill="white" font-size="16" font-weight="bold">${safeAwayTeam.name.substring(0, 3).toUpperCase()}</text></svg>`)}`
            }}
          />
          <h3 className="text-xl font-bold text-uefa-dark mb-2">{safeAwayTeam.name}</h3>
          <div className="text-uefa-gray text-sm">{safeAwayTeam.country}</div>
        </div>
      </div>

      {/* Head to Head */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-uefa-dark mb-4">Đối đầu</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-uefa-green/10 p-4 rounded-lg">
            <div className="text-2xl font-bold text-uefa-green">{headToHead.homeWins}</div>
            <div className="text-uefa-gray text-sm">{safeHomeTeam.name} Wins</div>
          </div>
          <div className="bg-uefa-yellow/10 p-4 rounded-lg">
            <div className="text-2xl font-bold text-uefa-yellow">{headToHead.draws}</div>
            <div className="text-uefa-gray text-sm">Hòa</div>
          </div>
          <div className="bg-uefa-red/10 p-4 rounded-lg">
            <div className="text-2xl font-bold text-uefa-red">{headToHead.awayWins}</div>
            <div className="text-uefa-gray text-sm">{safeAwayTeam.name} Wins</div>
          </div>
        </div>
        <div className="text-center mt-4 text-uefa-gray text-sm">
          Lần gặp gần nhất: {headToHead.lastMeeting.result} tại {headToHead.lastMeeting.venue} ({headToHead.lastMeeting.date})
        </div>
      </div>

      {/* Team Form */}
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div>
          <h4 className="font-bold text-uefa-dark mb-4">{safeHomeTeam.name} Form</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-uefa-gray">5 trận gần nhất:</span>
              <div className="flex space-x-1">
                {teamForm.home.last5.map((result, index) => (
                  <div key={index}>{getFormBadge(result)}</div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-uefa-gray">Bàn thắng ghi được:</span>
              <span className="font-bold text-uefa-green">{teamForm.home.goalsScored}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-uefa-gray">Bàn thua:</span>
              <span className="font-bold text-uefa-red">{teamForm.home.goalsConceded}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-uefa-gray">Giữ sạch lưới:</span>
              <span className="font-bold text-uefa-blue">{teamForm.home.cleanSheets}</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-bold text-uefa-dark mb-4">Phong độ {awayTeam.name}</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-uefa-gray">5 trận gần nhất:</span>
              <div className="flex space-x-1">
                {teamForm.away.last5.map((result, index) => (
                  <div key={index}>{getFormBadge(result)}</div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-uefa-gray">Bàn thắng ghi được:</span>
              <span className="font-bold text-uefa-green">{teamForm.away.goalsScored}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-uefa-gray">Bàn thua:</span>
              <span className="font-bold text-uefa-red">{teamForm.away.goalsConceded}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-uefa-gray">Giữ sạch lưới:</span>
              <span className="font-bold text-uefa-blue">{teamForm.away.cleanSheets}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Players */}
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h4 className="font-bold text-uefa-dark mb-4">Cầu thủ nổi bật {homeTeam.name}</h4>
          <div className="space-y-3">
            {keyPlayers.home.map((player, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-uefa-light-gray rounded">
                <div>
                  <div className="font-semibold text-uefa-dark">{player.name}</div>
                  <div className="text-uefa-gray text-sm">{player.position}</div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-uefa-green font-bold">{player.goals} bàn</div>
                  <div className="text-uefa-blue font-bold">{player.assists} kiến tạo</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-bold text-uefa-dark mb-4">Cầu thủ nổi bật {awayTeam.name}</h4>
          <div className="space-y-3">
            {keyPlayers.away.map((player, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-uefa-light-gray rounded">
                <div>
                  <div className="font-semibold text-uefa-dark">{player.name}</div>
                  <div className="text-uefa-gray text-sm">{player.position}</div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-uefa-green font-bold">{player.goals} bàn</div>
                  <div className="text-uefa-blue font-bold">{player.assists} kiến tạo</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MatchPreview
