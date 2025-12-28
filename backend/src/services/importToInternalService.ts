import { query } from "../db/sqlServer";

/**
 * Import data from Football* tables to internal database
 * This allows you to use Champions League data in your internal tournament system
 */

interface ImportResult {
  success: boolean;
  message: string;
  imported: {
    seasons: number;
    teams: number;
    players: number;
    matches: number;
  };
  errors: string[];
}

/**
 * Import Football* data to internal database
 */
export const importCLDataToInternal = async (options: {
  seasonName?: string;
  tournamentCode?: string;
  createTournament?: boolean;
}): Promise<ImportResult> => {
  const result: ImportResult = {
    success: true,
    message: "",
    imported: {
      seasons: 0,
      teams: 0,
      players: 0,
      matches: 0,
    },
    errors: [],
  };

  try {
    const seasonName = options.seasonName || "Champions League 2024/2025";
    const tournamentCode = options.tournamentCode || "UCL_2024";

    // Step 1: Create/Get Tournament
    let tournamentId: number;
    if (options.createTournament) {
      const existingTournament = await query<{ tournament_id: number }>(
        "SELECT tournament_id FROM tournaments WHERE code = @code",
        { code: tournamentCode },
      );

      if (existingTournament.recordset.length > 0) {
        tournamentId = existingTournament.recordset[0].tournament_id;
      } else {
        const newTournament = await query<{ tournament_id: number }>(
          `
            INSERT INTO tournaments (code, name, description, organizer, founded_year, region, is_active)
            OUTPUT INSERTED.tournament_id
            VALUES (@code, @name, @description, @organizer, @foundedYear, @region, 1);
          `,
          {
            code: tournamentCode,
            name: "UEFA Champions League",
            description: "Imported from Football-Data.org",
            organizer: "UEFA",
            foundedYear: 1955,
            region: "Europe",
          },
        );
        tournamentId = newTournament.recordset[0].tournament_id;
      }
    } else {
      const existingTournament = await query<{ tournament_id: number }>(
        "SELECT TOP 1 tournament_id FROM tournaments ORDER BY tournament_id DESC",
      );
      if (existingTournament.recordset.length === 0) {
        throw new Error("No tournament found. Set createTournament = true");
      }
      tournamentId = existingTournament.recordset[0].tournament_id;
    }

    // Step 2: Import Teams from FootballTeams
    const footballTeams = await query<{
      external_id: number;
      name: string;
      short_name: string | null;
      country: string | null;
      founded: number | null;
    }>(
      `
        SELECT DISTINCT 
          external_id, 
          name, 
          short_name, 
          country, 
          founded
        FROM dbo.FootballTeams
        WHERE season IS NULL OR season = '2024-2025'
      `,
    );

    const teamMapping = new Map<number, number>(); // external_id -> internal team_id

    for (const fbTeam of footballTeams.recordset) {
      try {
        // Check if team exists
        const existingTeam = await query<{ team_id: number }>(
          "SELECT team_id FROM teams WHERE name = @name",
          { name: fbTeam.name },
        );

        let teamId: number;
        if (existingTeam.recordset.length > 0) {
          teamId = existingTeam.recordset[0].team_id;
        } else {
          // Insert new team
          // Validate founded_year: must be between 1900 and 2100, or set to 2000 as default
          let foundedYear = fbTeam.founded;
          if (!foundedYear || foundedYear < 1900 || foundedYear > 2100) {
            foundedYear = 2000; // Default value if invalid
          }

          const newTeam = await query<{ team_id: number }>(
            `
              INSERT INTO teams (name, short_name, code, country, founded_year, status)
              OUTPUT INSERTED.team_id
              VALUES (@name, @shortName, @code, @country, @founded, 'active');
            `,
            {
              name: fbTeam.name,
              shortName: fbTeam.short_name,
              code: fbTeam.short_name || fbTeam.name.substring(0, 3).toUpperCase(),
              country: fbTeam.country,
              founded: foundedYear,
            },
          );
          teamId = newTeam.recordset[0].team_id;
          result.imported.teams++;
        }
        teamMapping.set(fbTeam.external_id, teamId);
      } catch (error) {
        result.errors.push(`Failed to import team ${fbTeam.name}: ${error}`);
      }
    }

    console.log(`Imported ${result.imported.teams} teams, mapping size: ${teamMapping.size}`);

    // Step 3: [REMOVED] Sync to 'players' is no longer needed.
    // FootballPlayers IS the Single Source of Truth.
    console.log("Step 3 (Sync to 'players') removed.");

    // Step 4: Import Matches from FootballMatches
    // Ensure we have a season_id
    let seasonId: number;
    const existingSeason = await query<{ season_id: number }>(
      "SELECT TOP 1 season_id FROM seasons WHERE name LIKE @name ORDER BY season_id DESC",
      { name: `%${seasonName.split('/')[0]}%` } // Match '2024'
    );

    if (existingSeason.recordset.length > 0) {
      seasonId = existingSeason.recordset[0].season_id;
    } else {
      // Create season if not exists
      const newSeason = await query<{ season_id: number }>(
        `INSERT INTO seasons (tournament_id, name, start_date, end_date, status)
          OUTPUT INSERTED.season_id
          VALUES (@tournamentId, @name, @start, @end, 'active')`,
        {
          tournamentId,
          name: seasonName,
          start: '2024-08-01',
          end: '2025-06-01'
        }
      );
      seasonId = newSeason.recordset[0].season_id;
    }

    // Ensure rounds exist (1-38)
    // Simplified: Just ensure round 1 exists for now or use matchday
    // We'll trust matchday maps to round_number

    const footballMatches = await query<{
      external_id: number;
      utc_date: string;
      status: string;
      matchday: number | null;
      home_team_id: number; // external
      away_team_id: number; // external
      venue: string | null;
      score_home: number | null;
      score_away: number | null;
    }>(
      `SELECT * FROM dbo.FootballMatches WHERE season = '2024'`
    );

    for (const fbMatch of footballMatches.recordset) {
      try {
        const internalHomeTeamId = teamMapping.get(fbMatch.home_team_id);
        const internalAwayTeamId = teamMapping.get(fbMatch.away_team_id);

        if (!internalHomeTeamId || !internalAwayTeamId) continue;

        // Ensure Season Team Participation
        // Helper to get or create season_team_id
        const getSeasonTeamId = async (tid: number, sid: number) => {
          let stid = await query<{ season_team_id: number }>(
            "SELECT season_team_id FROM season_team_participants WHERE season_id = @sid AND team_id = @tid",
            { sid, tid }
          );
          if (stid.recordset.length === 0) {
            stid = await query<{ season_team_id: number }>(
              "INSERT INTO season_team_participants (season_id, team_id) OUTPUT INSERTED.season_team_id VALUES (@sid, @tid)",
              { sid, tid }
            );
          }
          return stid.recordset[0].season_team_id;
        };

        const homeSeasonTeamId = await getSeasonTeamId(internalHomeTeamId, seasonId);
        const awaySeasonTeamId = await getSeasonTeamId(internalAwayTeamId, seasonId);

        // Get Round ID
        const roundNum = fbMatch.matchday || 1;
        let roundId: number;
        const existingRound = await query<{ round_id: number }>(
          "SELECT round_id FROM season_rounds WHERE season_id = @sid AND round_number = @rnum",
          { sid: seasonId, rnum: roundNum }
        );
        if (existingRound.recordset.length > 0) {
          roundId = existingRound.recordset[0].round_id;
        } else {
          // Create round
          const newRound = await query<{ round_id: number }>(
            "INSERT INTO season_rounds (season_id, round_number, name, status) OUTPUT INSERTED.round_id VALUES (@sid, @rnum, @name, 'planned')",
            { sid: seasonId, rnum: roundNum, name: `Matchday ${roundNum}` }
          );
          roundId = newRound.recordset[0].round_id;
        }

        // Check if match exists
        const existingMatch = await query<{ match_id: number }>(
          "SELECT match_id FROM matches WHERE match_code = @code",
          { code: String(fbMatch.external_id) }
        );

        if (existingMatch.recordset.length === 0) {
          await query(
            `INSERT INTO matches (
               season_id, round_id, home_season_team_id, away_season_team_id,
               stadium_id, scheduled_kickoff, status, matchday_number, match_code,
               home_score, away_score
             ) VALUES (
               @seasonId, @roundId, @homeSTID, @awaySTID,
               NULL, @kickoff, @status, @matchday, @code,
               @scoreHome, @scoreAway
             )`,
            {
              seasonId,
              roundId,
              homeSTID: homeSeasonTeamId,
              awaySTID: awaySeasonTeamId,
              kickoff: fbMatch.utc_date,
              status: fbMatch.status === 'FINISHED' ? 'completed' : (fbMatch.status === 'IN_PLAY' ? 'in_progress' : 'scheduled'),
              matchday: roundNum,
              code: String(fbMatch.external_id),
              scoreHome: fbMatch.score_home,
              scoreAway: fbMatch.score_away
            }
          );
          result.imported.matches++;
        }
      } catch (err) {
        result.errors.push(`Failed to import match ${fbMatch.external_id}: ${err}`);
      }
    }
    console.log(`Imported ${result.imported.matches} matches`);



    return result;
  } catch (error) {
    result.success = false;
    result.message = `Import failed: ${error}`;
    result.errors.push(String(error));
    return result;
  }
};

/**
 * Clear all imported data (for testing)
 */
export const clearImportedData = async (): Promise<{ success: boolean; message: string }> => {
  try {
    // Note: Disabled for Phase 1 Refactor Security
    // await query("DELETE FROM players WHERE full_name LIKE '%imported%' OR nationality = 'Unknown'");
    // await query("DELETE FROM teams WHERE code LIKE 'UCL%'");

    return {
      success: true,
      message: "Clear imported data is disabled during Refactor Phase 1",
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to clear: ${error}`,
    };
  }
};

