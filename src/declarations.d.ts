declare module '*/MatchesService' {
    export interface Match {
        id: number;
        homeTeamName: string;
        awayTeamName: string;
        [key: string]: any;
    }

    export interface LineupData {
        formation: string;
        starters: number[];
        substitutes: number[];
    }

    class MatchesService {
        getAllMatches(filters?: any): Promise<any>;
        getMatchById(matchId: number | string): Promise<any>;
        createMatch(matchData: any): Promise<any>;
        updateMatch(matchId: number | string, matchData: any): Promise<any>;
        updateMatchResult(matchId: number | string, resultData: any): Promise<any>;
        deleteMatch(matchId: number | string): Promise<boolean>;
        deleteAllMatches(seasonId?: number | string): Promise<number>;

        syncMatches(options?: any): Promise<any>;
        getExternalMatches(filters?: any): Promise<any>;
        generateRandomMatches(options?: any): Promise<any>;
        createBulkMatches(matches: any[]): Promise<number>;
        generateRoundRobinSchedule(teamIds: number[], seasonId?: number | null, startDate?: string | null): Promise<any>;

        getMatchEvents(matchId: number | string): Promise<any[]>;
        createMatchEvent(matchId: number | string, eventData: any): Promise<any>;
        disallowMatchEvent(eventId: number | string, reason: string): Promise<any>;
        deleteMatchEvent(eventId: number | string): Promise<boolean>;

        getMatchLineups(matchId: number | string): Promise<any[]>;
        updateMatchLineups(matchId: number | string, lineups: any): Promise<any>;

        getLineup(matchId: number | string, teamId: number | string): Promise<{
            formation: string;
            starters: number[];
            substitutes: number[];
        }>;
        saveLineup(matchId: number | string, teamId: number | string, lineupData: LineupData): Promise<any>;

        finalizeMatch(matchId: number | string): Promise<any>;
    }

    const matchesServiceInstance: MatchesService;
    export default matchesServiceInstance;
}
