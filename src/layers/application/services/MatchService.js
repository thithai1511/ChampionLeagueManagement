import ApiService from './ApiService';

class MatchService {
  /**
   * Get list of matches with filters
   */
  async getMatches(params = {}) {
    const response = await ApiService.get('/matches', params);
    return response.data;
  }

  /**
   * Get live/ongoing matches
   */
  async getLiveMatches() {
    const response = await ApiService.get('/matches/live');
    return response.data;
  }

  /**
   * Get match by ID
   */
  async getMatchById(matchId) {
    const response = await ApiService.get(`/matches/${matchId}`);
    return response.data;
  }

  /**
   * Get match details with lifecycle info
   */
  async getMatchDetails(matchId) {
    const response = await ApiService.get(`/matches/${matchId}/details`);
    return response.data;
  }

  /**
   * Get match events (goals, cards, assists, etc.)
   */
  async getMatchEvents(matchId) {
    const response = await ApiService.get(`/match-detail/${matchId}/events`);
    return response.data;
  }

  /**
   * Get match lineups
   */
  async getMatchLineups(matchId) {
    const response = await ApiService.get(`/match-detail/${matchId}/lineups`);
    return response.data;
  }

  /**
   * Get matches by status
   */
  async getMatchesByStatus(seasonId, status) {
    const response = await ApiService.get(`/seasons/${seasonId}/matches/by-status`, { status });
    return response.data;
  }

  /**
   * Get recent matches (for news feed)
   */
  async getRecentMatches(limit = 10) {
    const response = await ApiService.get('/matches', {
      limit,
      sort: 'scheduledKickoff',
      order: 'desc'
    });
    return response.data;
  }
}

export default new MatchService();
