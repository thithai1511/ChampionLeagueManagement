/**
 * Import data from external sources to internal database
 * 
 * NOTE: The Football* tables have been removed.
 * This service is now deprecated.
 * All data is managed directly in the internal tables (players, teams, matches).
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
 * @deprecated Football* tables have been removed. Use direct data entry instead.
 */
export const importCLDataToInternal = async (_options: {
  seasonName?: string;
  tournamentCode?: string;
  createTournament?: boolean;
}): Promise<ImportResult> => {
  console.warn('[importToInternalService] This function is deprecated. Football* tables have been removed.');
  
  return {
    success: false,
    message: "DEPRECATED: Football* tables have been removed. Please use direct data entry or the admin interface to create teams and players.",
    imported: {
      seasons: 0,
      teams: 0,
      players: 0,
      matches: 0,
    },
    errors: ["Football* tables are no longer available. External API sync has been disabled."],
  };
};

/**
 * @deprecated Football* tables have been removed. This function is now a no-op.
 */
export const clearImportedData = async (): Promise<{ success: boolean; message: string }> => {
  console.warn('[importToInternalService] clearImportedData is deprecated. Football* tables have been removed.');
  return {
    success: false,
    message: "DEPRECATED: Football* tables have been removed. No data to clear.",
  };
};
