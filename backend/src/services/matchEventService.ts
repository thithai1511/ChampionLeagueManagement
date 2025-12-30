import { query } from "../db/sqlServer";
import { BadRequestError } from "../utils/httpError";

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
        me.match_event_id as matchEventId,
        me.match_id as matchId,
        me.season_id as seasonId,
        me.season_team_id as seasonTeamId,
        stp.team_id as teamId,
        me.event_type as type,
        me.event_minute as minute,
        me.stoppage_time as stoppageTime,
        me.description,
        me.player_name as playerName,
        me.player_id as playerId,
        me.assist_player_id as assistPlayerId,
        me.card_type as cardType,
        me.goal_type_code as goalTypeCode,
        rgt.name as goalTypeName,
        rgt.description as goalTypeDescription,
        me.created_at as createdAt
      FROM match_events me
      INNER JOIN season_team_participants stp ON me.season_team_id = stp.season_team_id
      LEFT JOIN ruleset_goal_types rgt ON me.ruleset_id = rgt.ruleset_id AND me.goal_type_code = rgt.code AND rgt.is_active = 1
      WHERE me.match_id = @matchId
      ORDER BY me.event_minute ASC, me.stoppage_time ASC, me.created_at ASC
    `,
    { matchId }
  );
  return result.recordset;
};

export const createMatchEvent = async (input: Partial<MatchEvent & { teamId: number; playerId: number }>): Promise<MatchEvent> => {
  // 1. Fetch RulesetID and SeasonID from Match
  const matchData = await query<{ ruleset_id: number; season_id: number; status: string }>(
    "SELECT ruleset_id, season_id, status FROM matches WHERE match_id = @matchId",
    { matchId: input.matchId }
  );
  const rulesetId = matchData.recordset[0]?.ruleset_id;
  const seasonId = matchData.recordset[0]?.season_id;
  const status = matchData.recordset[0]?.status;

  if (!rulesetId || !seasonId) throw new Error("Match or Ruleset not found");
  if (status === 'completed') throw new Error("Cannot add events to a completed match");

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

  // 4. Validate and set goal type code
  let dbEventType = input.type;
  let cardType = null;
  let goalTypeCode: string | null = null;

  if (input.type === 'GOAL') {
    // Get goal type code from input or use default
    const requestedCode = (input as any).goalTypeCode || 'open_play';
    
    // Validate goal type code against ruleset_goal_types
    const goalTypeInfo = await query<{ minute_min: number; minute_max: number }>(
      `SELECT minute_min, minute_max 
       FROM ruleset_goal_types 
       WHERE ruleset_id = @rulesetId AND code = @code AND is_active = 1`,
      { rulesetId, code: requestedCode }
    );
    
    if (!goalTypeInfo.recordset[0]) {
      // Get list of valid codes for error message
      const validCodesResult = await query<{ code: string }>(
        `SELECT code
         FROM ruleset_goal_types
         WHERE ruleset_id = @rulesetId AND is_active = 1
         ORDER BY code ASC`,
        { rulesetId }
      );
      const validCodes = validCodesResult.recordset.map(row => row.code);
      throw BadRequestError(
        `Invalid goal type code "${requestedCode}". Valid codes for this ruleset: ${validCodes.length > 0 ? validCodes.join(', ') : 'none configured'}`
      );
    }

    // Validate minute against goal type constraints
    if (input.minute !== undefined) {
      const { minute_min, minute_max } = goalTypeInfo.recordset[0];
      if (input.minute < minute_min || input.minute > minute_max) {
        throw BadRequestError(
          `Goal minute ${input.minute} is outside allowed range [${minute_min}, ${minute_max}] for goal type "${requestedCode}"`
        );
      }
    }

    goalTypeCode = requestedCode;
  }

  if (input.type === 'YELLOW_CARD') {
    dbEventType = 'CARD';
    cardType = 'Yellow';
  } else if (input.type === 'RED_CARD') {
    dbEventType = 'CARD';
    cardType = 'Red';
  }

  const querySql = `
    INSERT INTO match_events (
      match_id, season_id, season_team_id, ruleset_id,
      event_type, event_minute, description, 
      season_player_id, player_name, 
      goal_type_code, card_type,
      player_id, assist_player_id,
      created_at
    )
    OUTPUT INSERTED.match_event_id
    VALUES (
      @matchId, @seasonId, @seasonTeamId, @rulesetId,
      @type, @minute, @description,
      @seasonPlayerId, @playerName, 
      @goalTypeCode, @cardType,
      @playerId, @assistPlayerId,
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
    cardType: cardType,
    playerId: input.playerId ?? null,
    assistPlayerId: input.assistPlayerId ?? null
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
            me.match_event_id as matchEventId,
            me.match_id as matchId,
            me.season_id as seasonId,
            me.season_team_id as seasonTeamId,
            me.event_type as type,
            me.card_type as cardType,
            m.status as matchStatus
         FROM match_events me
         JOIN matches m ON me.match_id = m.match_id
         WHERE me.match_event_id = @eventId`,
    { eventId }
  );
  const event = eventResult.recordset[0];

  if (!event) return null;
  if ((event as any).matchStatus === 'completed') throw new Error("Cannot delete events from a completed match");

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
            me.match_event_id as matchEventId,
            me.match_id as matchId,
            me.season_team_id as seasonTeamId,
            me.event_type as type,
            m.status as matchStatus
         FROM match_events me
         JOIN matches m ON me.match_id = m.match_id
         WHERE me.match_event_id = @eventId`,
    { eventId }
  );
  const event = eventResult.recordset[0];
  if (!event) return null;
  if ((event as any).matchStatus === 'completed') throw new Error("Cannot modify events in a completed match");

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
