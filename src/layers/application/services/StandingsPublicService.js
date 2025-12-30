import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

/**
 * StandingsPublicService - Service để gọi Public Standings APIs
 * Kết nối với backend endpoints mới tạo
 */
class StandingsPublicService {
  /**
   * Get standings for a season
   * @param {number} seasonId 
   * @param {string} mode - 'live' or 'final'
   */
  async getSeasonStandings(seasonId, mode = 'live') {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/public/standings/season/${seasonId}`,
        { params: { mode } }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching standings:', error);
      throw error;
    }
  }

  /**
   * Get top scorers for a season
   * @param {number} seasonId 
   * @param {number} limit 
   */
  async getTopScorers(seasonId, limit = 20) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/public/standings/season/${seasonId}/top-scorers`,
        { params: { limit } }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching top scorers:', error);
      throw error;
    }
  }

  /**
   * Get MVP (Player of the Match) stats
   * @param {number} seasonId 
   */
  async getTopMVP(seasonId) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/public/standings/season/${seasonId}/top-mvp`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching MVP stats:', error);
      throw error;
    }
  }

  /**
   * Get discipline overview (cards, suspensions)
   * @param {number} seasonId 
   */
  async getDisciplineOverview(seasonId) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/public/standings/season/${seasonId}/discipline`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching discipline data:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive stats overview
   * @param {number} seasonId 
   */
  async getStatsOverview(seasonId) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/public/standings/season/${seasonId}/stats-overview`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching stats overview:', error);
      throw error;
    }
  }

  /**
   * Get team-specific standing
   * @param {number} seasonId 
   * @param {number} teamId 
   */
  async getTeamStanding(seasonId, teamId) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/public/standings/season/${seasonId}/team/${teamId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching team standing:', error);
      throw error;
    }
  }

  /**
   * Get cards for season
   * @param {number} seasonId 
   */
  async getCards(seasonId) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/disciplinary/season/${seasonId}/cards`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching cards:', error);
      throw error;
    }
  }

  /**
   * Get suspensions for season
   * @param {number} seasonId 
   * @param {string} status - 'active', 'served', 'archived'
   */
  async getSuspensions(seasonId, status = null) {
    try {
      const params = status ? { status } : {};
      const response = await axios.get(
        `${API_BASE_URL}/disciplinary/season/${seasonId}/suspensions`,
        { params }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching suspensions:', error);
      throw error;
    }
  }

  /**
   * Check if player is suspended for a match
   * @param {number} matchId 
   * @param {number} seasonPlayerId 
   * @param {number} seasonId 
   */
  async checkPlayerSuspension(matchId, seasonPlayerId, seasonId) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/disciplinary/match/${matchId}/player/${seasonPlayerId}/check`,
        { params: { seasonId } }
      );
      return response.data;
    } catch (error) {
      console.error('Error checking suspension:', error);
      throw error;
    }
  }
}

export default new StandingsPublicService();
