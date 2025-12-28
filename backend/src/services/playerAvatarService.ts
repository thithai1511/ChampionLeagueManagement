import axios from 'axios';
import { query } from '../db/sqlServer';

const THESPORTSDB_API_KEY = '3';
const THESPORTSDB_BASE_URL = 'https://www.thesportsdb.com/api/v1/json';

interface TheSportsDBPlayer {
  strPlayer: string;
  strTeam: string;
  strCutout?: string;
  strThumb?: string;
  strRender?: string;
  strFanart1?: string;
}

interface TheSportsDBResponse {
  player: TheSportsDBPlayer[] | null;
}

/**
 * Normalize team name for comparison
 */
function normalizeTeamName(teamName: string | null): string {
  if (!teamName) return '';
  return teamName.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Check if teams match (fuzzy matching)
 */
function isTeamMatch(team1: string | null, team2: string | null): boolean {
  const normalized1 = normalizeTeamName(team1);
  const normalized2 = normalizeTeamName(team2);
  return normalized1.includes(normalized2) || normalized2.includes(normalized1);
}

/**
 * Get avatar URL from TheSportsDB player data
 * Priority according to official docs:
 * 1. strCutout - Ảnh cầu thủ đã được tách nền (trong suốt, PNG) - đẹp nhất
 * 2. strThumb - Ảnh thumbnail chính (JPG)
 * 3. strRender - Dạng ảnh tách nền khác (nếu có)
 */
function getAvatarUrl(player: TheSportsDBPlayer): string | null {
  // Priority: strCutout > strThumb > strRender (as per official docs)
  const avatarUrl = player.strCutout || player.strThumb || player.strRender || null;
  
  if (avatarUrl) {
    console.log(`Found avatar for "${player.strPlayer}": ${avatarUrl.substring(0, 80)}...`);
  }
  
  return avatarUrl;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Search player in TheSportsDB with retry logic for rate limiting
 */
async function searchPlayerInSportsDB(
  playerName: string,
  teamName: string | null,
  retryCount = 0
): Promise<string | null> {
  const MAX_RETRIES = 3;
  const BASE_DELAY = 3000; // 3 seconds base delay
  
  try {
    // Format player name: replace spaces with underscore (_) as per official docs
    // Example: "Lionel Messi" -> "Lionel_Messi"
    const formattedPlayerName = playerName.replace(/\s+/g, '_');
    
    const searchUrl = `${THESPORTSDB_BASE_URL}/${THESPORTSDB_API_KEY}/searchplayers.php`;
    
    const response = await axios.get<TheSportsDBResponse>(searchUrl, {
      params: { p: formattedPlayerName },
      timeout: 10000,
    });

    // Check if player array is null or empty (as per official docs)
    if (!response.data.player || response.data.player.length === 0) {
      console.log(`No player found for "${playerName}" (formatted: "${formattedPlayerName}")`);
      return null;
    }

    const players = response.data.player;

    // Try to match by team first
    let bestMatch = players[0];
    if (teamName && players.length > 1) {
      const teamMatch = players.find((p) => isTeamMatch(p.strTeam, teamName));
      if (teamMatch) {
        bestMatch = teamMatch;
      }
    }

    return getAvatarUrl(bestMatch);
  } catch (error: any) {
    // Handle rate limiting (429) with exponential backoff
    if (error.response?.status === 429 && retryCount < MAX_RETRIES) {
      const retryAfter = error.response.headers['retry-after'];
      const delay = retryAfter 
        ? parseInt(retryAfter, 10) * 1000 
        : BASE_DELAY * Math.pow(2, retryCount);
      
      console.warn(`Rate limited for "${playerName}". Retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
      await sleep(delay);
      return searchPlayerInSportsDB(playerName, teamName, retryCount + 1);
    }
    
    console.error(`Error searching TheSportsDB for "${playerName}":`, error.message);
    return null;
  }
}

/**
 * Get player avatar URL from database or fetch from TheSportsDB
 */
export async function getPlayerAvatar(
  playerId: number,
  playerName?: string,
  teamName?: string | null
): Promise<string | null> {
  try {
    // First, check if avatar_url exists in database (FootballPlayers table)
    const dbResult = await query<{ avatar_url: string | null }>(
      `SELECT avatar_url FROM dbo.FootballPlayers WHERE id = @playerId;`,
      { playerId }
    );

    const existingAvatarUrl = dbResult.recordset[0]?.avatar_url;

    if (existingAvatarUrl) {
      return existingAvatarUrl;
    }

    // If not in database and we have player info, fetch from TheSportsDB
    if (playerName) {
      const avatarUrl = await searchPlayerInSportsDB(playerName, teamName || null);

      // Save to database if found
      if (avatarUrl) {
        await query(
          `UPDATE dbo.FootballPlayers SET avatar_url = @avatarUrl WHERE id = @playerId;`,
          { avatarUrl, playerId }
        );
      }

      return avatarUrl;
    }

    return null;
  } catch (error) {
    console.error('Error getting player avatar:', error);
    return null;
  }
}

/**
 * Get player info for avatar lookup
 * Uses FootballPlayers table (single source of truth)
 */
async function getPlayerInfo(playerId: number): Promise<{
  full_name: string;
  team_name: string | null;
} | null> {
  try {
    const result = await query<{
      full_name: string;
      team_name: string | null;
    }>(
      `SELECT 
        fp.name as full_name,
        t.name as team_name
      FROM dbo.FootballPlayers fp
      LEFT JOIN dbo.teams t ON fp.internal_team_id = t.team_id
      WHERE fp.id = @playerId;`,
      { playerId }
    );

    return result.recordset[0] || null;
  } catch (error) {
    console.error('Error getting player info:', error);
    return null;
  }
}

/**
 * Get or fetch player avatar (main function)
 */
export async function getOrFetchPlayerAvatar(playerId: number): Promise<string | null> {
  const playerInfo = await getPlayerInfo(playerId);
  
  if (!playerInfo) {
    return null;
  }

  return getPlayerAvatar(playerId, playerInfo.full_name, playerInfo.team_name);
}

/**
 * Batch fetch avatars for multiple players
 */
export async function batchFetchPlayerAvatars(
  playerIds: number[]
): Promise<Record<number, string | null>> {
  console.log('[batchFetchPlayerAvatars] Starting for', playerIds.length, 'players:', playerIds);
  const result: Record<number, string | null> = {};

  // Get all player info first
  const validPlayerIds = playerIds.filter(id => Number.isInteger(id) && id > 0);
  
  if (validPlayerIds.length === 0) {
    console.log('[batchFetchPlayerAvatars] No valid player IDs');
    return result;
  }

  // Build parameterized query for IN clause
  const params: Record<string, number> = {};
  const placeholders = validPlayerIds.map((id, i) => {
    params[`playerId${i}`] = id;
    return `@playerId${i}`;
  }).join(',');

  console.log('[batchFetchPlayerAvatars] Querying database for', validPlayerIds.length, 'players');
  const playersResult = await query<{
    player_id: number;
    full_name: string;
    team_name: string | null;
    avatar_url: string | null;
  }>(
    `SELECT 
      fp.id as player_id,
      fp.name as full_name,
      t.name as team_name,
      fp.avatar_url
    FROM dbo.FootballPlayers fp
    LEFT JOIN dbo.teams t ON fp.internal_team_id = t.team_id
    WHERE fp.id IN (${placeholders});`,
    params
  );

  const players = playersResult.recordset;
  console.log('[batchFetchPlayerAvatars] Found', players.length, 'players in database');

  // First, add existing avatars to result immediately
  players.forEach(player => {
    if (player.avatar_url) {
      result[player.player_id] = player.avatar_url;
      console.log(`[batchFetchPlayerAvatars] Player ${player.player_id} (${player.full_name}) already has avatar`);
    }
  });

  // Process players that don't have avatar_url
  const playersToFetch = players.filter(p => !p.avatar_url);
  console.log('[batchFetchPlayerAvatars] Need to fetch', playersToFetch.length, 'avatars');

  // Fetch avatars with rate limiting (3 seconds between requests to avoid rate limit)
  // Reduced from 5s to 3s to speed up batch requests
  for (let i = 0; i < playersToFetch.length; i++) {
    const player = playersToFetch[i];
    console.log(`[batchFetchPlayerAvatars] [${i+1}/${playersToFetch.length}] Fetching avatar for player ${player.player_id} (${player.full_name})...`);
    try {
      const avatarUrl = await searchPlayerInSportsDB(player.full_name, player.team_name);
      
      if (avatarUrl) {
        console.log(`[batchFetchPlayerAvatars] Found avatar for ${player.player_id}: ${avatarUrl.substring(0, 50)}...`);
        await query(
          `UPDATE dbo.FootballPlayers SET avatar_url = @avatarUrl WHERE id = @playerId;`,
          { avatarUrl, playerId: player.player_id }
        );
        result[player.player_id] = avatarUrl;
      } else {
        console.log(`[batchFetchPlayerAvatars] No avatar found for ${player.player_id} (${player.full_name})`);
        result[player.player_id] = null;
      }
    } catch (error) {
      console.error(`[batchFetchPlayerAvatars] Error fetching avatar for player ${player.player_id}:`, error);
      result[player.player_id] = null;
    }

    // Rate limiting delay - reduced to 3 seconds to speed up
    if (i < playersToFetch.length - 1) {
      await sleep(3000);
    }
  }

  console.log('[batchFetchPlayerAvatars] Completed. Returning', Object.keys(result).length, 'results');
  return result;
}

