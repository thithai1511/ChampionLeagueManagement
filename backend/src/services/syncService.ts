import { syncTeamsFromUpstream } from "./teamService";
import { syncPlayersFromUpstream } from "./playerService";
import { syncMatchesFromUpstream } from "./matchService";
import { syncStandingsFromUpstream } from "./standingsService";

export interface SyncOptions {
  season?: string;
  syncTeams?: boolean;
  syncPlayers?: boolean;
  syncMatches?: boolean;
  syncStandings?: boolean;
  // Match-specific options
  matchStatus?: string;
  matchDateFrom?: string;
  matchDateTo?: string;
}

export interface SyncResult {
  success: boolean;
  timestamp: string;
  season?: string;
  results: {
    teams?: {
      success: boolean;
      totalTeams: number;
      error?: string;
    };
    players?: {
      success: boolean;
      totalPlayers: number;
      totalTeams: number;
      error?: string;
    };
    matches?: {
      success: boolean;
      totalMatches: number;
      error?: string;
    };
    standings?: {
      success: boolean;
      totalRows: number;
      error?: string;
    };
  };
  errors: string[];
}

export const syncAllData = async (options: SyncOptions = {}): Promise<SyncResult> => {
  const {
    season,
    syncTeams = true,
    syncPlayers = true,
    syncMatches = true,
    syncStandings = true,
    matchStatus,
    matchDateFrom,
    matchDateTo,
  } = options;

  const result: SyncResult = {
    success: true,
    timestamp: new Date().toISOString(),
    season,
    results: {},
    errors: [],
  };

  // Sync Teams (deprecated - external API sync disabled)
  if (syncTeams) {
    try {
      const teamsResult = await syncTeamsFromUpstream();
      result.results.teams = {
        success: true,
        totalTeams: teamsResult.totalTeams,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.success = false;
      result.errors.push(`Teams sync failed: ${errorMessage}`);
      result.results.teams = {
        success: false,
        totalTeams: 0,
        error: errorMessage,
      };
    }
  }

  // Sync Players (deprecated - external API sync disabled)
  if (syncPlayers) {
    try {
      const playersResult = await syncPlayersFromUpstream();
      result.results.players = {
        success: true,
        totalPlayers: playersResult.totalPlayers,
        totalTeams: playersResult.totalTeams,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.success = false;
      result.errors.push(`Players sync failed: ${errorMessage}`);
      result.results.players = {
        success: false,
        totalPlayers: 0,
        totalTeams: 0,
        error: errorMessage,
      };
    }
  }

  // Sync Matches
  if (syncMatches) {
    try {
      const matchesResult = await syncMatchesFromUpstream({
        season,
        status: matchStatus,
        dateFrom: matchDateFrom,
        dateTo: matchDateTo,
      });
      result.results.matches = {
        success: true,
        totalMatches: matchesResult.totalMatches,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.success = false;
      result.errors.push(`Matches sync failed: ${errorMessage}`);
      result.results.matches = {
        success: false,
        totalMatches: 0,
        error: errorMessage,
      };
    }
  }

  // Sync Standings
  if (syncStandings) {
    try {
      const standingsResult = await syncStandingsFromUpstream(season);
      result.results.standings = {
        success: true,
        totalRows: standingsResult.totalRows,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.success = false;
      result.errors.push(`Standings sync failed: ${errorMessage}`);
      result.results.standings = {
        success: false,
        totalRows: 0,
        error: errorMessage,
      };
    }
  }

  return result;
};

export const syncTeamsOnly = async (season?: string): Promise<SyncResult> => {
  return syncAllData({
    season,
    syncTeams: true,
    syncPlayers: false,
    syncMatches: false,
    syncStandings: false,
  });
};

export const syncPlayersOnly = async (season?: string): Promise<SyncResult> => {
  return syncAllData({
    season,
    syncTeams: false,
    syncPlayers: true,
    syncMatches: false,
    syncStandings: false,
  });
};

export const syncMatchesOnly = async (
  season?: string,
  status?: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<SyncResult> => {
  return syncAllData({
    season,
    syncTeams: false,
    syncPlayers: false,
    syncMatches: true,
    syncStandings: false,
    matchStatus: status,
    matchDateFrom: dateFrom,
    matchDateTo: dateTo,
  });
};

export const syncStandingsOnly = async (season?: string): Promise<SyncResult> => {
  return syncAllData({
    season,
    syncTeams: false,
    syncPlayers: false,
    syncMatches: false,
    syncStandings: true,
  });
};

