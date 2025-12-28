import ApiService from './ApiService';
import logger from '../../../shared/utils/logger';

/**
 * Service for managing officials (referees, supervisors, etc.)
 */
class OfficialService {
  /**
   * Get list of all officials
   * @param {Object} filters - Optional filters { status, roleSpecialty, search }
   */
  async listOfficials(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.roleSpecialty) params.append('roleSpecialty', filters.roleSpecialty);
      if (filters.search) params.append('search', filters.search);
      
      const queryString = params.toString();
      const url = queryString ? `/officials?${queryString}` : '/officials';
      
      return await ApiService.get(url);
    } catch (error) {
      logger.error('Failed to list officials:', error);
      throw new Error(error.message || 'Failed to list officials');
    }
  }

  /**
   * Get metadata (labels, statuses, specialties)
   */
  async getMetadata() {
    try {
      return await ApiService.get('/officials/metadata');
    } catch (error) {
      logger.error('Failed to get officials metadata:', error);
      throw new Error(error.message || 'Failed to get metadata');
    }
  }

  /**
   * Get official by ID
   * @param {number} officialId 
   */
  async getOfficialById(officialId) {
    try {
      return await ApiService.get(`/officials/${officialId}`);
    } catch (error) {
      logger.error('Failed to get official:', error);
      throw new Error(error.message || 'Failed to get official');
    }
  }

  /**
   * Create a new official
   * @param {Object} data - Official data
   */
  async createOfficial(data) {
    try {
      return await ApiService.post('/officials', data);
    } catch (error) {
      logger.error('Failed to create official:', error);
      throw new Error(error.message || 'Failed to create official');
    }
  }

  /**
   * Update an official
   * @param {number} officialId 
   * @param {Object} data 
   */
  async updateOfficial(officialId, data) {
    try {
      return await ApiService.put(`/officials/${officialId}`, data);
    } catch (error) {
      logger.error('Failed to update official:', error);
      throw new Error(error.message || 'Failed to update official');
    }
  }

  /**
   * Delete an official
   * @param {number} officialId 
   */
  async deleteOfficial(officialId) {
    try {
      return await ApiService.delete(`/officials/${officialId}`);
    } catch (error) {
      logger.error('Failed to delete official:', error);
      throw new Error(error.message || 'Failed to delete official');
    }
  }

  /**
   * Get officials assigned to a match
   * @param {number} matchId 
   */
  async getMatchOfficials(matchId) {
    try {
      return await ApiService.get(`/officials/match/${matchId}/assignments`);
    } catch (error) {
      logger.error('Failed to get match officials:', error);
      throw new Error(error.message || 'Failed to get match officials');
    }
  }

  /**
   * Get available officials for a role
   * @param {number} matchId 
   * @param {string} roleCode 
   */
  async getAvailableOfficials(matchId, roleCode) {
    try {
      return await ApiService.get(`/officials/match/${matchId}/available/${roleCode}`);
    } catch (error) {
      logger.error('Failed to get available officials:', error);
      throw new Error(error.message || 'Failed to get available officials');
    }
  }

  /**
   * Assign an official to a match
   * @param {number} matchId 
   * @param {Object} data - { officialId, roleCode, notes }
   */
  async assignOfficialToMatch(matchId, data) {
    try {
      return await ApiService.post(`/officials/match/${matchId}/assign`, data);
    } catch (error) {
      logger.error('Failed to assign official:', error);
      throw new Error(error.message || 'Failed to assign official');
    }
  }

  /**
   * Remove official assignment from match
   * @param {number} matchId 
   * @param {string} roleCode 
   */
  async removeOfficialFromMatch(matchId, roleCode) {
    try {
      return await ApiService.delete(`/officials/match/${matchId}/role/${roleCode}`);
    } catch (error) {
      logger.error('Failed to remove official:', error);
      throw new Error(error.message || 'Failed to remove official');
    }
  }
}

export default new OfficialService();

