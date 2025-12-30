import { Router } from 'express';
import { 
  getPlayerProfile, 
  getPlayerStatistics, 
  getPlayerMatches,
  updatePlayerProfile 
} from '../controllers/playerPortalController';
import { requireAuth, requireAnyPermission } from '../middleware/authMiddleware';

const router = Router();

/**
 * @route   GET /api/player-portal/profile
 * @desc    Get current player's profile
 * @access  Private (Player only)
 */
router.get(
  '/profile',
  requireAuth,
  requireAnyPermission('player_role'),
  getPlayerProfile
);

/**
 * @route   PUT /api/player-portal/profile
 * @desc    Update current player's profile
 * @access  Private (Player only)
 */
router.put(
  '/profile',
  requireAuth,
  requireAnyPermission('player_role'),
  updatePlayerProfile
);

/**
 * @route   GET /api/player-portal/statistics
 * @desc    Get current player's statistics
 * @access  Private (Player only)
 */
router.get(
  '/statistics',
  requireAuth,
  requireAnyPermission('player_role'),
  getPlayerStatistics
);

/**
 * @route   GET /api/player-portal/matches
 * @desc    Get current player's matches (past and upcoming)
 * @access  Private (Player only)
 */
router.get(
  '/matches',
  requireAuth,
  requireAnyPermission('player_role'),
  getPlayerMatches
);

export default router;
