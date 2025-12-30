/**
 * StandingsService.js
 * Service for fetching standings and statistics from public API
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

class StandingsService {
  /**
   * Get standings for a season
   * @param {number} seasonId 
   * @param {'live'|'final'} mode 
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
  async getTopScorers(seasonId, limit = 10) {
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
   * Get MVP (Player of the Match) statistics
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
   * Get discipline overview (cards and suspensions)
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
   * Get team standing details
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
   * Format standings data for display
   * @param {Array} standings 
   */
  formatStandingsForDisplay(standings) {
    return standings.map((team, index) => ({
      position: team.rank || index + 1,
      change: 0,
      country: team.shortName || '',
      logo: null,
      team: team.teamName,
      played: team.played,
      won: team.wins,
      drawn: team.draws,
      lost: team.losses,
      goalsFor: team.goalsFor,
      goalsAgainst: team.goalsAgainst,
      goalDifference: team.goalDifference,
      points: team.points,
      form: [],
      status: this.getStatusForPosition(team.rank || index + 1),
      tieBreakInfo: team.tieBreakInfo
    }));
  }

  /**
   * Get status color based on position
   * @param {number} position 
   */
  getStatusForPosition(position) {
    if (position <= 8) return 'qualified';
    if (position <= 24) return 'playoff';
    return 'eliminated';
  }
}

export default new StandingsService();
