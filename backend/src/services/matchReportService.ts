import { query } from "../db/sqlServer";

/**
 * MatchReport interface - adapts to actual database schema
 * Database uses: match_report_id, match_id, reporting_official_id, weather, additional_notes
 * This service normalizes these to a consistent interface
 */
export interface MatchReport {
  report_id: number;           // maps from match_report_id
  match_id: number;
  reported_by_user_id: number; // maps from reporting_official_id or user_id
  reported_by_name: string;
  attendance: number | null;
  weather_condition: string | null; // maps from weather
  match_summary: string | null;     // maps from additional_notes
  incidents: string | null;
  injuries_reported: string | null;
  referee_notes: string | null;
  mvp_player_id: number | null;
  mvp_player_name: string | null;
  mvp_team_name: string | null;
  home_score: number | null;
  away_score: number | null;
  total_yellow_cards: number | null;
  total_red_cards: number | null;
  goal_details: string | null;
  card_details: string | null;
  submitted_at: string;
}

/**
 * Get available columns in match_reports table
 */
async function getAvailableColumns(): Promise<Set<string>> {
  const result = await query<{ COLUMN_NAME: string }>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'match_reports'`
  );
  return new Set(result.recordset.map(r => r.COLUMN_NAME.toLowerCase()));
}

/**
 * Build a dynamic SELECT query based on available columns
 */
async function buildSelectQuery(whereClause: string = ''): Promise<string> {
  const cols = await getAvailableColumns();
  
  // Determine ID column name
  const idCol = cols.has('match_report_id') ? 'match_report_id' : 'report_id';
  
  // Determine reported_by column name
  let reportedByCol = 'NULL';
  let joinClause = '';
  let usernameSelect = "'' AS reported_by_name";
  
  if (cols.has('reporting_official_id')) {
    reportedByCol = 'mr.reporting_official_id';
    // Join with officials then user_accounts
    joinClause = `
      LEFT JOIN officials o ON mr.reporting_official_id = o.official_id
      LEFT JOIN user_accounts ua ON o.user_id = ua.user_id
    `;
    usernameSelect = "COALESCE(o.full_name, ua.username, 'Unknown') AS reported_by_name";
  } else if (cols.has('reported_by_user_id')) {
    reportedByCol = 'mr.reported_by_user_id';
    joinClause = `LEFT JOIN user_accounts ua ON mr.reported_by_user_id = ua.user_id`;
    usernameSelect = "COALESCE(ua.username, 'Unknown') AS reported_by_name";
  }
  
  // Build column list with fallbacks
  const selectCols: string[] = [
    `mr.${idCol} AS report_id`,
    `mr.match_id`,
    `${reportedByCol} AS reported_by_user_id`,
    usernameSelect,
    cols.has('attendance') ? 'mr.attendance' : 'NULL AS attendance',
    cols.has('weather') ? 'mr.weather AS weather_condition' : 
      (cols.has('weather_condition') ? 'mr.weather_condition' : 'NULL AS weather_condition'),
    cols.has('additional_notes') ? 'mr.additional_notes AS match_summary' : 
      (cols.has('match_summary') ? 'mr.match_summary' : 'NULL AS match_summary'),
    cols.has('incidents') ? 'mr.incidents' : 'NULL AS incidents',
    cols.has('injuries_reported') ? 'mr.injuries_reported' : 'NULL AS injuries_reported',
    cols.has('referee_notes') ? 'mr.referee_notes' : 'NULL AS referee_notes',
    cols.has('player_of_match_id') ? 'mr.player_of_match_id AS mvp_player_id' :
      (cols.has('mvp_player_id') ? 'mr.mvp_player_id' : 'NULL AS mvp_player_id'),
    cols.has('mvp_player_name') ? 'mr.mvp_player_name' : 'NULL AS mvp_player_name',
    cols.has('mvp_team_name') ? 'mr.mvp_team_name' : 'NULL AS mvp_team_name',
    cols.has('home_score') ? 'mr.home_score' : 'NULL AS home_score',
    cols.has('away_score') ? 'mr.away_score' : 'NULL AS away_score',
    cols.has('total_yellow_cards') ? 'mr.total_yellow_cards' : 'NULL AS total_yellow_cards',
    cols.has('total_red_cards') ? 'mr.total_red_cards' : 'NULL AS total_red_cards',
    cols.has('goal_details') ? 'mr.goal_details' : 'NULL AS goal_details',
    cols.has('card_details') ? 'mr.card_details' : 'NULL AS card_details',
    `CONVERT(VARCHAR(23), mr.submitted_at, 126) AS submitted_at`
  ];
  
  return `
    SELECT ${selectCols.join(', ')}
    FROM match_reports mr
    ${joinClause}
    ${whereClause}
  `;
}

/**
 * Create a new match report
 */
export async function createMatchReport(
  matchId: number,
  reportedByUserId: number,
  reportData: {
    attendance?: number | null;
    weather_condition?: string | null;
    match_summary?: string | null;
    incidents?: string | null;
    injuries_reported?: string | null;
    referee_notes?: string | null;
    mvp_player_id?: number | null;
    mvp_player_name?: string | null;
    mvp_team_name?: string | null;
    home_score?: number | null;
    away_score?: number | null;
    total_yellow_cards?: number | null;
    total_red_cards?: number | null;
    goal_details?: string | null;
    card_details?: string | null;
  }
): Promise<MatchReport> {
  // Check if report already exists for this match
  const existing = await getMatchReport(matchId);
  if (existing) {
    return (await updateMatchReport(existing.report_id, reportData)) as MatchReport;
  }

  if (!matchId || !reportedByUserId) {
    throw new Error("matchId and reportedByUserId are required");
  }

  // Check if match exists and get season_id
  const matchCheck = await query<{ match_id: number; season_id: number }>(
    `SELECT match_id, season_id FROM matches WHERE match_id = @matchId`,
    { matchId }
  );
  
  if (matchCheck.recordset.length === 0) {
    throw new Error(`Match with ID ${matchId} not found`);
  }
  
  const seasonId = matchCheck.recordset[0].season_id;

  // Validate MVP player ID if provided
  let validatedMvpPlayerId: number | null = null;
  if (reportData.mvp_player_id !== undefined && reportData.mvp_player_id !== null) {
    const mvpId = parseInt(String(reportData.mvp_player_id), 10);
    if (!isNaN(mvpId) && mvpId > 0) {
      validatedMvpPlayerId = mvpId;
    }
  }

  try {
    const cols = await getAvailableColumns();
    
    const insertColumns: string[] = ['match_id'];
    const insertValues: string[] = ['@matchId'];
    const params: Record<string, unknown> = { matchId };
    
    // Season ID (required in full schema)
    if (cols.has('season_id')) {
      insertColumns.push('season_id');
      insertValues.push('@seasonId');
      params.seasonId = seasonId;
    }
    
    // Reported by - use reporting_official_id or reported_by_user_id
    if (cols.has('reporting_official_id')) {
      // Need to get official_id from user_id
      const officialResult = await query<{ official_id: number }>(
        `SELECT official_id FROM officials WHERE user_id = @userId`,
        { userId: reportedByUserId }
      );
      if (officialResult.recordset.length > 0) {
        insertColumns.push('reporting_official_id');
        insertValues.push('@reportingOfficialId');
        params.reportingOfficialId = officialResult.recordset[0].official_id;
      }
    } else if (cols.has('reported_by_user_id')) {
      insertColumns.push('reported_by_user_id');
      insertValues.push('@reportedByUserId');
      params.reportedByUserId = reportedByUserId;
    }
    
    // Submitted at
    insertColumns.push('submitted_at');
    insertValues.push('GETUTCDATE()');
    
    // Attendance
    if (cols.has('attendance') && reportData.attendance !== undefined) {
      insertColumns.push('attendance');
      insertValues.push('@attendance');
      params.attendance = reportData.attendance;
    }
    
    // Weather - maps to 'weather' or 'weather_condition'
    if (reportData.weather_condition !== undefined) {
      if (cols.has('weather')) {
        insertColumns.push('weather');
        insertValues.push('@weather');
        params.weather = reportData.weather_condition;
      } else if (cols.has('weather_condition')) {
        insertColumns.push('weather_condition');
        insertValues.push('@weatherCondition');
        params.weatherCondition = reportData.weather_condition;
      }
    }
    
    // Match summary - maps to 'additional_notes' or 'match_summary'
    if (reportData.match_summary !== undefined) {
      if (cols.has('additional_notes')) {
        insertColumns.push('additional_notes');
        insertValues.push('@additionalNotes');
        params.additionalNotes = reportData.match_summary;
      } else if (cols.has('match_summary')) {
        insertColumns.push('match_summary');
        insertValues.push('@matchSummary');
        params.matchSummary = reportData.match_summary;
      }
    }
    
    // Incidents
    if (cols.has('incidents') && reportData.incidents !== undefined) {
      insertColumns.push('incidents');
      insertValues.push('@incidents');
      params.incidents = reportData.incidents;
    }
    
    // Referee notes
    if (cols.has('referee_notes') && reportData.referee_notes !== undefined) {
      insertColumns.push('referee_notes');
      insertValues.push('@refereeNotes');
      params.refereeNotes = reportData.referee_notes;
    }
    
    // MVP - maps to player_of_match_id or mvp_player_id
    // player_of_match_id requires season_player_id, not player_id
    if (validatedMvpPlayerId !== null) {
      if (cols.has('player_of_match_id')) {
        // Need to convert player_id to season_player_id
        try {
          const seasonPlayerResult = await query<{ season_player_id: number }>(
            `SELECT season_player_id FROM season_player_registrations 
             WHERE player_id = @playerId AND season_id = @seasonId`,
            { playerId: validatedMvpPlayerId, seasonId }
          );
          
          if (seasonPlayerResult.recordset.length > 0) {
            insertColumns.push('player_of_match_id');
            insertValues.push('@playerOfMatchId');
            params.playerOfMatchId = seasonPlayerResult.recordset[0].season_player_id;
          } else {
            // Player not registered for this season - skip MVP field but log warning
            console.warn(`[createMatchReport] Player ${validatedMvpPlayerId} not registered for season ${seasonId}, skipping player_of_match_id`);
          }
        } catch (lookupError) {
          console.warn(`[createMatchReport] Could not lookup season_player_id for player ${validatedMvpPlayerId}:`, lookupError);
        }
      } else if (cols.has('mvp_player_id')) {
        // mvp_player_id can use player_id directly
        insertColumns.push('mvp_player_id');
        insertValues.push('@mvpPlayerId');
        params.mvpPlayerId = validatedMvpPlayerId;
      }
    }
    
    // MVP name/team
    if (cols.has('mvp_player_name') && reportData.mvp_player_name) {
      insertColumns.push('mvp_player_name');
      insertValues.push('@mvpPlayerName');
      params.mvpPlayerName = reportData.mvp_player_name;
    }
    if (cols.has('mvp_team_name') && reportData.mvp_team_name) {
      insertColumns.push('mvp_team_name');
      insertValues.push('@mvpTeamName');
      params.mvpTeamName = reportData.mvp_team_name;
    }
    
    // Scores
    if (cols.has('home_score')) {
      insertColumns.push('home_score');
      insertValues.push('@homeScore');
      params.homeScore = reportData.home_score !== undefined && reportData.home_score !== null 
        ? parseInt(String(reportData.home_score), 10) 
        : 0;
    }
    if (cols.has('away_score')) {
      insertColumns.push('away_score');
      insertValues.push('@awayScore');
      params.awayScore = reportData.away_score !== undefined && reportData.away_score !== null 
        ? parseInt(String(reportData.away_score), 10) 
        : 0;
    }
    
    // Card counts
    if (cols.has('total_yellow_cards') && reportData.total_yellow_cards !== undefined) {
      insertColumns.push('total_yellow_cards');
      insertValues.push('@totalYellowCards');
      params.totalYellowCards = reportData.total_yellow_cards;
    }
    if (cols.has('total_red_cards') && reportData.total_red_cards !== undefined) {
      insertColumns.push('total_red_cards');
      insertValues.push('@totalRedCards');
      params.totalRedCards = reportData.total_red_cards;
    }
    
    // Goal/card details JSON
    if (cols.has('goal_details') && reportData.goal_details) {
      insertColumns.push('goal_details');
      insertValues.push('@goalDetails');
      params.goalDetails = reportData.goal_details;
    }
    if (cols.has('card_details') && reportData.card_details) {
      insertColumns.push('card_details');
      insertValues.push('@cardDetails');
      params.cardDetails = reportData.card_details;
    }

    console.log('[createMatchReport] Inserting with columns:', insertColumns);
    console.log('[createMatchReport] Params:', params);

    const insertSql = `
      INSERT INTO match_reports (${insertColumns.join(', ')})
      OUTPUT INSERTED.*
      VALUES (${insertValues.join(', ')})
    `;
    
    const result = await query<Record<string, unknown>>(insertSql, params);

    if (!result.recordset || result.recordset.length === 0) {
      throw new Error("Failed to create match report - no record returned");
    }

    // Return normalized result
    return normalizeReport(result.recordset[0]);
  } catch (sqlError: unknown) {
    console.error("SQL Error in createMatchReport:", sqlError);
    const err = sqlError as { number?: number; message?: string };
    if (err.number === 515) {
      throw new Error(`Cannot insert NULL value: ${err.message}`);
    }
    if (err.number === 547) {
      throw new Error(`Foreign key constraint violation: ${err.message}`);
    }
    if (err.number === 2627) {
      throw new Error(`Duplicate report for match ${matchId}`);
    }
    throw sqlError;
  }
}

/**
 * Normalize a raw DB record to MatchReport interface
 */
function normalizeReport(record: Record<string, unknown>): MatchReport {
  return {
    report_id: (record.match_report_id ?? record.report_id ?? 0) as number,
    match_id: (record.match_id ?? 0) as number,
    reported_by_user_id: (record.reporting_official_id ?? record.reported_by_user_id ?? 0) as number,
    reported_by_name: (record.reported_by_name ?? '') as string,
    attendance: record.attendance as number | null,
    weather_condition: (record.weather ?? record.weather_condition ?? null) as string | null,
    match_summary: (record.additional_notes ?? record.match_summary ?? null) as string | null,
    incidents: (record.incidents ?? null) as string | null,
    injuries_reported: (record.injuries_reported ?? null) as string | null,
    referee_notes: (record.referee_notes ?? null) as string | null,
    mvp_player_id: (record.player_of_match_id ?? record.mvp_player_id ?? null) as number | null,
    mvp_player_name: (record.mvp_player_name ?? null) as string | null,
    mvp_team_name: (record.mvp_team_name ?? null) as string | null,
    home_score: (record.home_score ?? null) as number | null,
    away_score: (record.away_score ?? null) as number | null,
    total_yellow_cards: (record.total_yellow_cards ?? null) as number | null,
    total_red_cards: (record.total_red_cards ?? null) as number | null,
    goal_details: (record.goal_details ?? null) as string | null,
    card_details: (record.card_details ?? null) as string | null,
    submitted_at: (record.submitted_at ?? '') as string,
  };
}

/**
 * Get report for a match
 */
export async function getMatchReport(matchId: number): Promise<MatchReport | null> {
  try {
    const selectQuery = await buildSelectQuery('WHERE mr.match_id = @matchId');
    const result = await query<Record<string, unknown>>(selectQuery, { matchId });
    if (result.recordset.length === 0) return null;
    return normalizeReport(result.recordset[0]);
  } catch (err) {
    console.error('[getMatchReport] Error:', err);
    return null;
  }
}

/**
 * Get all reports by an official/referee
 */
export async function getReportsByOfficial(userId: number): Promise<MatchReport[]> {
  try {
    const cols = await getAvailableColumns();
    let whereClause = '';
    
    if (cols.has('reporting_official_id')) {
      // Get official_id for this user first
      const officialResult = await query<{ official_id: number }>(
        `SELECT official_id FROM officials WHERE user_id = @userId`,
        { userId }
      );
      if (officialResult.recordset.length === 0) {
        return [];
      }
      const officialId = officialResult.recordset[0].official_id;
      whereClause = `WHERE mr.reporting_official_id = ${officialId}`;
    } else if (cols.has('reported_by_user_id')) {
      whereClause = `WHERE mr.reported_by_user_id = @userId`;
    } else {
      return [];
    }
    
    const selectQuery = await buildSelectQuery(whereClause + ' ORDER BY mr.submitted_at DESC');
    const result = await query<Record<string, unknown>>(selectQuery, { userId });
    return result.recordset.map(normalizeReport);
  } catch (err) {
    console.error('[getReportsByOfficial] Error:', err);
    return [];
  }
}

/**
 * Update match report
 */
export async function updateMatchReport(
  reportId: number,
  updates: Partial<MatchReport>
): Promise<MatchReport | null> {
  try {
    const cols = await getAvailableColumns();
    const idCol = cols.has('match_report_id') ? 'match_report_id' : 'report_id';
    
    const fields: string[] = [];
    const params: Record<string, unknown> = { reportId };

    if (updates.attendance !== undefined && cols.has('attendance')) {
      fields.push("attendance = @attendance");
      params.attendance = updates.attendance;
    }
    if (updates.weather_condition !== undefined) {
      if (cols.has('weather')) {
        fields.push("weather = @weather");
        params.weather = updates.weather_condition;
      } else if (cols.has('weather_condition')) {
        fields.push("weather_condition = @weatherCondition");
        params.weatherCondition = updates.weather_condition;
      }
    }
    if (updates.match_summary !== undefined) {
      if (cols.has('additional_notes')) {
        fields.push("additional_notes = @additionalNotes");
        params.additionalNotes = updates.match_summary;
      } else if (cols.has('match_summary')) {
        fields.push("match_summary = @matchSummary");
        params.matchSummary = updates.match_summary;
      }
    }
    if (updates.incidents !== undefined && cols.has('incidents')) {
      fields.push("incidents = @incidents");
      params.incidents = updates.incidents;
    }
    if (updates.referee_notes !== undefined && cols.has('referee_notes')) {
      fields.push("referee_notes = @refereeNotes");
      params.refereeNotes = updates.referee_notes;
    }
    if (updates.home_score !== undefined && cols.has('home_score')) {
      fields.push("home_score = @homeScore");
      params.homeScore = updates.home_score;
    }
    if (updates.away_score !== undefined && cols.has('away_score')) {
      fields.push("away_score = @awayScore");
      params.awayScore = updates.away_score;
    }
    if (updates.mvp_player_id !== undefined) {
      if (cols.has('player_of_match_id')) {
        // Need to convert player_id to season_player_id
        // First get the season_id from the existing report
        try {
          const reportInfo = await query<{ match_id: number; season_id: number }>(
            `SELECT mr.match_id, m.season_id 
             FROM match_reports mr 
             INNER JOIN matches m ON mr.match_id = m.match_id
             WHERE mr.${idCol} = @reportId`,
            { reportId }
          );
          
          if (reportInfo.recordset.length > 0) {
            const seasonId = reportInfo.recordset[0].season_id;
            const seasonPlayerResult = await query<{ season_player_id: number }>(
              `SELECT season_player_id FROM season_player_registrations 
               WHERE player_id = @playerId AND season_id = @seasonId`,
              { playerId: updates.mvp_player_id, seasonId }
            );
            
            if (seasonPlayerResult.recordset.length > 0) {
              fields.push("player_of_match_id = @playerOfMatchId");
              params.playerOfMatchId = seasonPlayerResult.recordset[0].season_player_id;
            } else {
              console.warn(`[updateMatchReport] Player ${updates.mvp_player_id} not registered for season ${seasonId}`);
            }
          }
        } catch (lookupError) {
          console.warn(`[updateMatchReport] Could not lookup season_player_id:`, lookupError);
        }
      } else if (cols.has('mvp_player_id')) {
        fields.push("mvp_player_id = @mvpPlayerId");
        params.mvpPlayerId = updates.mvp_player_id;
      }
    }
    if (updates.mvp_player_name !== undefined && cols.has('mvp_player_name')) {
      fields.push("mvp_player_name = @mvpPlayerName");
      params.mvpPlayerName = updates.mvp_player_name;
    }
    if (updates.mvp_team_name !== undefined && cols.has('mvp_team_name')) {
      fields.push("mvp_team_name = @mvpTeamName");
      params.mvpTeamName = updates.mvp_team_name;
    }
    if (updates.total_yellow_cards !== undefined && cols.has('total_yellow_cards')) {
      fields.push("total_yellow_cards = @totalYellowCards");
      params.totalYellowCards = updates.total_yellow_cards;
    }
    if (updates.total_red_cards !== undefined && cols.has('total_red_cards')) {
      fields.push("total_red_cards = @totalRedCards");
      params.totalRedCards = updates.total_red_cards;
    }
    if (updates.goal_details !== undefined && cols.has('goal_details')) {
      fields.push("goal_details = @goalDetails");
      params.goalDetails = updates.goal_details;
    }
    if (updates.card_details !== undefined && cols.has('card_details')) {
      fields.push("card_details = @cardDetails");
      params.cardDetails = updates.card_details;
    }

    if (fields.length === 0) {
      return getReportById(reportId);
    }

    const result = await query<Record<string, unknown>>(
      `UPDATE match_reports SET ${fields.join(", ")} OUTPUT INSERTED.* WHERE ${idCol} = @reportId`,
      params
    );

    if (result.recordset.length === 0) return null;
    return normalizeReport(result.recordset[0]);
  } catch (err) {
    console.error('[updateMatchReport] Error:', err);
    throw err;
  }
}

/**
 * Get report by ID
 */
export async function getReportById(reportId: number): Promise<MatchReport | null> {
  try {
    const cols = await getAvailableColumns();
    const idCol = cols.has('match_report_id') ? 'match_report_id' : 'report_id';
    const selectQuery = await buildSelectQuery(`WHERE mr.${idCol} = @reportId`);
    const result = await query<Record<string, unknown>>(selectQuery, { reportId });
    if (result.recordset.length === 0) return null;
    return normalizeReport(result.recordset[0]);
  } catch (err) {
    console.error('[getReportById] Error:', err);
    return null;
  }
}

/**
 * Delete match report
 */
export async function deleteMatchReport(reportId: number): Promise<void> {
  const cols = await getAvailableColumns();
  const idCol = cols.has('match_report_id') ? 'match_report_id' : 'report_id';
  await query(`DELETE FROM match_reports WHERE ${idCol} = @reportId`, { reportId });
}

/**
 * Get incidents summary for a season
 */
export async function getSeasonIncidents(seasonId: number): Promise<
  Array<{
    match_id: number;
    incident_type: string;
    description: string;
    submitted_at: string;
  }>
> {
  try {
    const cols = await getAvailableColumns();
    
    // Check if incidents column exists
    if (!cols.has('incidents') && !cols.has('additional_notes')) {
      return [];
    }
    
    const incidentCol = cols.has('incidents') ? 'mr.incidents' : 'mr.additional_notes';
    
    const result = await query(
      `
      SELECT mr.match_id, 'incident' as incident_type, ${incidentCol} as description, 
             CONVERT(VARCHAR(23), mr.submitted_at, 126) as submitted_at
      FROM match_reports mr
      INNER JOIN matches m ON mr.match_id = m.match_id
      WHERE m.season_id = @seasonId AND ${incidentCol} IS NOT NULL
      ORDER BY mr.submitted_at DESC
      `,
      { seasonId }
    );

    return result.recordset;
  } catch (err) {
    console.error('[getSeasonIncidents] Error:', err);
    return [];
  }
}

/**
 * Get injury reports for a season
 */
export async function getSeasonInjuries(seasonId: number): Promise<
  Array<{
    match_id: number;
    injuries: string;
    submitted_at: string;
  }>
> {
  try {
    const cols = await getAvailableColumns();
    
    if (!cols.has('injuries_reported')) {
      return [];
    }
    
    const result = await query(
      `
      SELECT mr.match_id, mr.injuries_reported as injuries, 
             CONVERT(VARCHAR(23), mr.submitted_at, 126) as submitted_at
      FROM match_reports mr
      INNER JOIN matches m ON mr.match_id = m.match_id
      WHERE m.season_id = @seasonId AND mr.injuries_reported IS NOT NULL
      ORDER BY mr.submitted_at DESC
      `,
      { seasonId }
    );

    return result.recordset;
  } catch (err) {
    console.error('[getSeasonInjuries] Error:', err);
    return [];
  }
}
