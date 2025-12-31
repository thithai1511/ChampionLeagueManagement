import { query } from "../db/sqlServer";

export interface MatchEvent {
  matchEventId: number;
  matchId: number;
  seasonId: number;
  seasonTeamId: number;
  type: 'GOAL' | 'ASSIST' | 'YELLOW_CARD' | 'RED_CARD' | 'SUBSTITUTION' | 'OWN_GOAL' | 'PENALTY_MISS' | 'OTHER' | 'CARD';
  minute: number;
  description?: string;
  playerId?: number;
  assistPlayerId?: number;
  inPlayerId?: number; // For substitutions
  outPlayerId?: number; // For substitutions
  cardType?: 'Yellow' | 'Red'; // Added
  createdAt: string;
}

export const getMatchEvents = async (matchId: number): Promise<MatchEvent[]> => {
  const result = await query(
    `
      SELECT 
        match_event_id as matchEventId,
        match_id as matchId,
        season_id as seasonId,
        season_team_id as seasonTeamId,
        type,
        minute,
        description,
        player_id as playerId,
        assist_player_id as assistPlayerId,
        in_player_id as inPlayerId,
        out_player_id as outPlayerId,
        created_at as createdAt
      FROM match_events
      WHERE match_id = @matchId
      ORDER BY minute ASC, created_at ASC
    `,
    { matchId }
  );
  return result.recordset;
};

export const createMatchEvent = async (input: Partial<MatchEvent & { teamId: number; playerId: number }>): Promise<MatchEvent> => {
  // 1. Fetch RulesetID and SeasonID from Match
  const matchData = await query<{ ruleset_id: number; season_id: number }>(
    "SELECT ruleset_id, season_id FROM matches WHERE match_id = @matchId",
    { matchId: input.matchId }
  );
  const rulesetId = matchData.recordset[0]?.ruleset_id;
  const seasonId = matchData.recordset[0]?.season_id;

  if (!rulesetId || !seasonId) throw new Error("Match or Ruleset not found");

  // 2. Resolve SeasonTeamID from TeamID + SeasonID
  const teamData = await query<{ season_team_id: number }>(
    "SELECT season_team_id FROM season_team_participants WHERE team_id = @teamId AND season_id = @seasonId",
    { teamId: input.teamId, seasonId }
  );
  const seasonTeamId = teamData.recordset[0]?.season_team_id;
  if (!seasonTeamId) throw new Error("Team not found in season");

  // 3. Resolve SeasonPlayerID (Optional)
  let seasonPlayerId = null;
  let playerName = null;
  if (input.playerId) {
    // Try getting name from players table
    const playerInfo = await query<{ full_name: string }>(
      "SELECT full_name FROM players WHERE player_id = @playerId",
      { playerId: input.playerId }
    );
    playerName = playerInfo.recordset[0]?.full_name || 'Unknown';

    // Try resolving season_player_id
    const playerData = await query<{ season_player_id: number }>(
      "SELECT season_player_id FROM season_player_registrations WHERE player_id = @playerId AND season_id = @seasonId",
      { playerId: input.playerId, seasonId }
    );
    seasonPlayerId = playerData.recordset[0]?.season_player_id;
  }

  // 4. Normalize event type and decide card_type only for disciplinary events
  const rawType = String(input.type || '').toUpperCase()
  let dbEventType = rawType
  let cardType: string | null = null
  let goalTypeCode: string | null = null

  switch (rawType) {
    case 'GOAL':
    case 'G':
      dbEventType = 'GOAL'
      goalTypeCode = 'N'
      break
    case 'OWN_GOAL':
    case 'OWN':
      dbEventType = 'OWN_GOAL'
      break
    case 'YELLOW_CARD':
    case 'YELLOW':
    case 'Y':
      dbEventType = 'CARD'
      cardType = 'Yellow'
      break
    case 'RED_CARD':
    case 'RED':
    case 'R':
      dbEventType = 'CARD'
      cardType = 'Red'
      break
    case 'SUBSTITUTION':
    case 'SUB':
      dbEventType = 'SUBSTITUTION'
      break
    case 'FOUL':
      dbEventType = 'FOUL'
      break
    default:
      // Keep whatever was provided but ensure it's uppercase
      dbEventType = rawType || 'OTHER'
  }

  const querySql = `
    INSERT INTO match_events (
      match_id, season_id, season_team_id, ruleset_id,
      event_type, event_minute, description, 
      season_player_id, player_name, 
      goal_type_code, card_type, -- Added
      created_at
    )
    OUTPUT INSERTED.match_event_id
    VALUES (
      @matchId, @seasonId, @seasonTeamId, @rulesetId,
      @type, @minute, @description,
      @seasonPlayerId, @playerName, 
      @goalTypeCode, @cardType, -- Added
      SYSUTCDATETIME()
    );
  `;

  const result = await query(querySql, {
    matchId: input.matchId,
    seasonId: seasonId,
    seasonTeamId: seasonTeamId,
    rulesetId: rulesetId,
    type: dbEventType, // Use mapped type
    minute: input.minute,
    description: input.description ?? null,
    seasonPlayerId: seasonPlayerId ?? null,
    playerName: playerName ?? null,
    goalTypeCode: goalTypeCode,
    cardType: cardType
  });

  // 5. Update Match Score (if Goal or Own Goal)
  if (input.type === 'GOAL' || input.type === 'OWN_GOAL') {
    const matchTeams = await query<{ home_season_team_id: number; away_season_team_id: number }>(
      "SELECT home_season_team_id, away_season_team_id FROM matches WHERE match_id = @matchId",
      { matchId: input.matchId }
    );
    const homeSTID = matchTeams.recordset[0]?.home_season_team_id;
    // const awaySTID = matchTeams.recordset[0]?.away_season_team_id; 

    let homeInc = 0;
    let awayInc = 0;
    const isHomeTeam = seasonTeamId === homeSTID;

    if (input.type === 'GOAL') {
      if (isHomeTeam) homeInc = 1; else awayInc = 1;
    } else if (input.type === 'OWN_GOAL') {
      if (isHomeTeam) awayInc = 1; else homeInc = 1;
    }

    if (homeInc > 0 || awayInc > 0) {
      await query(
        `UPDATE matches 
             SET home_score = ISNULL(home_score, 0) + @homeInc, 
                 away_score = ISNULL(away_score, 0) + @awayInc,
                 updated_at = SYSUTCDATETIME()
             WHERE match_id = @matchId`,
        { matchId: input.matchId, homeInc, awayInc }
      );
    }
  }

  const id = result.recordset[0].match_event_id;
  return { ...input, matchEventId: id } as MatchEvent;
};

export const deleteMatchEvent = async (eventId: number): Promise<MatchEvent | null> => {
  // 1. Get event details before deleting
  const eventResult = await query<MatchEvent>(
    `SELECT 
            match_event_id as matchEventId,
            match_id as matchId,
            season_id as seasonId,
            season_team_id as seasonTeamId,
            event_type as type,
            card_type as cardType
         FROM match_events 
         WHERE match_event_id = @eventId`,
    { eventId }
  );
  const event = eventResult.recordset[0];

  if (!event) return null;

  // 2. Revert Score if Goal
  if (event.type === 'GOAL' || event.type === 'OWN_GOAL') {
    const matchTeams = await query<{ home_season_team_id: number }>(
      "SELECT home_season_team_id FROM matches WHERE match_id = @matchId",
      { matchId: event.matchId }
    );
    const homeSTID = matchTeams.recordset[0]?.home_season_team_id;
    const isHomeTeam = event.seasonTeamId === homeSTID;

    let homeDec = 0;
    let awayDec = 0;

    if (event.type === 'GOAL') {
      if (isHomeTeam) homeDec = 1; else awayDec = 1;
    } else if (event.type === 'OWN_GOAL') {
      if (isHomeTeam) awayDec = 1; else homeDec = 1;
    }

    if (homeDec > 0 || awayDec > 0) {
      await query(
        `UPDATE matches 
             SET home_score = CASE WHEN home_score >= @homeDec THEN home_score - @homeDec ELSE 0 END, 
                 away_score = CASE WHEN away_score >= @awayDec THEN away_score - @awayDec ELSE 0 END,
                 updated_at = SYSUTCDATETIME()
             WHERE match_id = @matchId`,
        { matchId: event.matchId, homeDec, awayDec }
      );
    }
  }

  // 3. Delete
  await query("DELETE FROM match_events WHERE match_event_id = @eventId", { eventId });

  return event;
};

export const disallowMatchEvent = async (eventId: number, reason: string): Promise<MatchEvent | null> => {
  // 1. Get event
  const eventResult = await query<MatchEvent>(
    `SELECT 
            match_event_id as matchEventId,
            match_id as matchId,
            season_team_id as seasonTeamId,
            event_type as type
         FROM match_events 
         WHERE match_event_id = @eventId`,
    { eventId }
  );
  const event = eventResult.recordset[0];
  if (!event) return null;

  // 2. Revert Score if Goal (Before changing type to OTHER)
  if (event.type === 'GOAL' || event.type === 'OWN_GOAL') {
    const matchTeams = await query<{ home_season_team_id: number }>(
      "SELECT home_season_team_id FROM matches WHERE match_id = @matchId",
      { matchId: event.matchId }
    );
    const homeSTID = matchTeams.recordset[0]?.home_season_team_id;
    const isHomeTeam = event.seasonTeamId === homeSTID;

    let homeDec = 0;
    let awayDec = 0;

    if (event.type === 'GOAL') {
      if (isHomeTeam) homeDec = 1; else awayDec = 1;
    } else if (event.type === 'OWN_GOAL') {
      if (isHomeTeam) awayDec = 1; else homeDec = 1;
    }

    if (homeDec > 0 || awayDec > 0) {
      await query(
        `UPDATE matches 
             SET home_score = CASE WHEN home_score >= @homeDec THEN home_score - @homeDec ELSE 0 END, 
                 away_score = CASE WHEN away_score >= @awayDec THEN away_score - @awayDec ELSE 0 END,
                 updated_at = SYSUTCDATETIME()
             WHERE match_id = @matchId`,
        { matchId: event.matchId, homeDec, awayDec }
      );
    }
  }

  // 3. Update event to OTHER and add description
  await query(
    `UPDATE match_events
         SET event_type = 'OTHER',
             card_type = NULL,
             goal_type_code = NULL,
             description = @description
         WHERE match_event_id = @eventId`,
    {
      eventId,
      description: `Disallowed Goal: ${reason}`
    }
  );

  return event;
};
