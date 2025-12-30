import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users, ChevronDown, ChevronUp, Trophy, Activity, Flag } from 'lucide-react';
import { getLogoByTeamName } from '../data/teamLogos';
import { formatDateGMT7, formatTimeGMT7 } from '../../../utils/timezone';

// Smarter Image Component with Fallback
const TeamLogo = ({ src, alt, className }) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  // Initialize with Mapping if available, otherwise use provided src
  useEffect(() => {
    const mappedLogo = getLogoByTeamName(alt);
    setImgSrc(mappedLogo || src);
    setHasError(false);
  }, [src, alt]);

  const handleError = () => {
    // Only try to replace .svg with .png if it DOES NOT already end in .png
    // The previous logic was breaking wikimedia urls like .../Logo.svg.png -> .../Logo.png.png
    if (!hasError && imgSrc && imgSrc.includes('.svg') && !imgSrc.endsWith('.png')) {
      setImgSrc(imgSrc.replace('.svg', '.png'));
      setHasError(true);
    } else {
      // Fallback to generic if both fail
      setImgSrc('https://img.uefa.com/imgml/TP/teams/logos/50x50/generic.png');
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={handleError}
    />
  );
};

const MatchCard = ({ match }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleViewDetails = (e) => {
    e.stopPropagation();
    if (match.id || match.match_id) {
      navigate(`/matches/${match.id || match.match_id}`);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'live':
        return <span className="status-pill text-[#F05252]">Trực tiếp</span>;
      case 'finished':
        return <span className="status-pill text-slate-500">Hết giờ</span>;
      default:
        return <span className="status-pill text-[#0055FF]">Sắp diễn ra</span>;
    }
  };

  const formatTime = (time) =>
    new Date(`2000-01-01T${time}`).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });

  return (
    <article className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <span className="absolute left-0 top-4 bottom-4 w-1 rounded-full bg-gradient-to-b from-[#0055FF] via-[#00E5FF] to-[#8454FF]" />
      <div className="flex items-center justify-between mb-4 text-sm text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Calendar size={14} />
            {formatDateGMT7(match.date)}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={14} />
            {formatTime(match.time)}
          </span>
        </div>
        {getStatusBadge(match.status)}
      </div>

      {/* SCORE SECTION */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 flex-1">
          <TeamLogo
            src={match.homeTeam.logo}
            alt={match.homeTeam.name}
            className="h-10 w-10 object-contain"
          />
          <div>
            <p className="text-slate-900 font-semibold">{match.homeTeam.name}</p>
            <p className="text-xs text-slate-400 uppercase tracking-[0.3em]">{match.homeTeam.shortName}</p>
          </div>
        </div>
        <div className="text-center min-w-[140px] flex flex-col items-center justify-center score-flip">
          {(match.status === 'finished' || match.status === 'live' || match.status === 'in_progress') && (match.scoreHome !== undefined || match.score?.home !== undefined) ? (
            <>
              <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-slate-800 to-slate-600 mb-1">
                {match.scoreHome ?? match.score?.home} : {match.scoreAway ?? match.score?.away}
              </div>
              <div className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${match.status === 'finished' ? 'text-slate-400 bg-slate-100' : 'text-red-600 bg-red-100 animate-pulse'}`}>
                {match.status === 'finished' ? 'Full Time' : 'Live Match'}
              </div>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-slate-800 tracking-tight font-display mb-1">
                {formatTime(match.time)}
              </p>
              <div className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${match.status === 'live' ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                {match.status === 'live' ? 'Live Match' : 'Kick-off'}
              </div>
            </>
          )}
          <p className="text-xs text-slate-400 uppercase tracking-[0.3em]">{match.status === 'live' ? 'Trực tiếp' : 'Giờ bóng lăn'}</p>
        </div>
        <div className="flex items-center gap-3 flex-1 justify-end">
          <div className="text-right">
            <p className="text-slate-900 font-semibold">{match.awayTeam.name}</p>
            <p className="text-xs text-slate-400 uppercase tracking-[0.3em]">{match.awayTeam.shortName}</p>
          </div>
          <TeamLogo src={match.awayTeam.logo} alt={match.awayTeam.name} className="h-10 w-10 object-contain" />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <MapPin size={13} />
            {match.venue}
          </span>
          <span className="flex items-center gap-1">
            <Users size={13} />
            {match.city}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleViewDetails}
            className="text-[#0055FF] text-xs uppercase tracking-[0.4em] font-semibold hover:text-[#0040BF] transition-colors px-3 py-1.5 rounded-lg hover:bg-blue-50"
          >
            Xem chi tiết
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-[#0055FF] text-xs uppercase tracking-[0.4em] flex items-center gap-1 hover:text-[#0040BF] transition-colors"
          >
            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* DETAILS EXPANDABLE SECTION */}
      {isOpen && (
        <div className="mt-6 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">

          {/* MVP */}
          {(match.mvp) && (
            <div className="mb-4 flex items-center gap-2 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
              <Trophy className="text-yellow-500" size={16} />
              <div>
                <span className="text-xs text-yellow-600 font-bold uppercase tracking-wider block">Man of the Match</span>
                <span className="text-sm font-semibold text-slate-800">{match.mvp.playerName} ({match.mvp.teamName})</span>
              </div>
            </div>
          )}

          {/* EVENTS TIMELINE */}
          {(match.events && match.events.length > 0) ? (
            <div className="mb-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-center gap-1">
                <Activity size={12} /> Match Timeline
              </h4>
              <div className="space-y-1 relative before:absolute before:left-1/2 before:-translate-x-1/2 before:h-full before:w-px before:bg-slate-100 before:content-['']">
                {(() => {
                  let currentHomeScore = 0;
                  let currentAwayScore = 0;

                  return match.events.map((event, idx) => {
                    const isHome = event.teamId === match.homeTeam.id;
                    const isGoal = event.type === 'GOAL';
                    const isOwnGoal = event.type === 'OWN_GOAL';
                    const isRedCard = event.type === 'RED_CARD' || (event.type === 'CARD' && event.cardType === 'Red');
                    const isYellowCard = event.type === 'YELLOW_CARD' || (event.type === 'CARD' && event.cardType === 'Yellow');
                    const isSub = event.type === 'SUBSTITUTION';
                    const isDisallowed = event.type === 'OTHER' && event.description?.includes('Disallowed');

                    // Score Calculation
                    if (isGoal) {
                      if (isHome) currentHomeScore++; else currentAwayScore++;
                    } else if (isOwnGoal) {
                      if (isHome) currentAwayScore++; else currentHomeScore++;
                    }
                    const displayScore = `${currentHomeScore} - ${currentAwayScore}`;

                    let icon = '•';
                    if (isGoal) icon = '⚽';
                    if (isOwnGoal) icon = '⚽ (OG)';
                    if (isRedCard) icon = '🟥';
                    if (isYellowCard) icon = '🟨';
                    if (isSub) icon = '🔄';
                    if (isDisallowed) icon = '🚫';

                    return (
                      <div key={idx} className={`flex items-center gap-4 text-xs ${isHome ? 'flex-row' : 'flex-row-reverse'}`}>
                        <div className={`flex-1 ${isHome ? 'text-right' : 'text-left'}`}>
                          <div className={`font-semibold ${isGoal ? 'text-slate-900' : 'text-slate-600'}`}>
                            {event.player || 'Unknown'}
                            {isDisallowed && <span className="block text-[10px] text-red-500 font-normal italic">{event.description}</span>}
                          </div>
                          {isSub && <div className="text-slate-400 text-[10px]">In for {event.assistPlayerId || '?'}</div>}
                        </div>

                        <div className="z-10 bg-white border border-slate-100 rounded-full w-8 h-8 flex items-center justify-center text-xs shadow-sm font-mono font-bold text-slate-500">
                          {event.minute}'
                        </div>

                        <div className="flex-1 flex gap-2 items-center">
                          <span className="text-lg leading-none" title={event.type}>{icon}</span>
                          {(isGoal || isOwnGoal) && !isDisallowed && (
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">
                              {displayScore}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          ) : (
            <div className="mb-4 text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <p className="text-xs text-slate-400 italic">No events recorded yet</p>
            </div>
          )}

          {/* STATS */}
          {match.stats && (match.stats.home || match.stats.away) && (
            <div className="grid grid-cols-3 gap-2 text-center text-sm mt-4">
              <div className="text-slate-600 font-semibold">{match.stats.home?.shots || 0}</div>
              <div className="text-xs text-slate-400 uppercase">Shots</div>
              <div className="text-slate-600 font-semibold">{match.stats.away?.shots || 0}</div>

              <div className="text-slate-600 font-semibold">{match.stats.home?.possession || 0}%</div>
              <div className="text-xs text-slate-400 uppercase">Possession</div>
              <div className="text-slate-600 font-semibold">{match.stats.away?.possession || 0}%</div>

              <div className="text-slate-600 font-semibold">{match.stats.home?.fouls || 0}</div>
              <div className="text-xs text-slate-400 uppercase">Fouls</div>
              <div className="text-slate-600 font-semibold">{match.stats.away?.fouls || 0}</div>
            </div>
          )}
        </div>
      )}
    </article>
  );
};

export default MatchCard;
