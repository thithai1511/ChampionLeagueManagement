/**
 * disciplineRoutes.ts
 * API routes for disciplinary actions (cards, suspensions)
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requirePermission } from '../middleware/authMiddleware';
import { 
  getCardSummary, 
  getSuspensionsForSeason, 
  getActiveSuspensions,
  isPlayerSuspendedForMatch,
  recalculateDisciplinaryForSeason 
} from '../services/disciplinaryService';

const router = Router();

/**
 * GET /api/seasons/:seasonId/discipline/cards
 * Get card summary for all players in a season
 */
router.get('/:seasonId/discipline/cards', requireAuth, async (req: Request, res: Response) => {
  try {
    const seasonId = parseInt(req.params.seasonId);

    if (isNaN(seasonId)) {
      return res.status(400).json({ error: 'Invalid season ID' });
    }

    const cardSummary = await getCardSummary(seasonId);
    
    res.json({
      success: true,
      data: cardSummary,
      count: cardSummary.length
    });
  } catch (error: any) {
    console.error('Error fetching card summary:', error);
    const errorMessage = error.message || 'Unknown error';
    const statusCode = error.message?.includes('Invalid object name') || error.message?.includes('does not exist') 
      ? 404 
      : 500;
    res.status(statusCode).json({ 
      error: 'Failed to fetch card summary',
      details: errorMessage,
      suggestion: statusCode === 404 ? 'Database tables may not be initialized. Please run migrations.' : undefined
    });
  }
});

/**
 * GET /api/seasons/:seasonId/discipline/suspensions
 * Get suspensions for a season
 * Query params: status (optional) - filter by status (active, served, cancelled, archived)
 */
router.get('/:seasonId/discipline/suspensions', requireAuth, async (req: Request, res: Response) => {
  try {
    const seasonId = parseInt(req.params.seasonId);
    const statusFilter = req.query.status as string | undefined;

    if (isNaN(seasonId)) {
      return res.status(400).json({ error: 'Invalid season ID' });
    }

    if (statusFilter && !['active', 'served', 'cancelled', 'archived'].includes(statusFilter)) {
      return res.status(400).json({ error: 'Invalid status filter' });
    }

    const suspensions = await getSuspensionsForSeason(seasonId, statusFilter);
    
    res.json({
      success: true,
      data: suspensions,
      count: suspensions.length
    });
  } catch (error: any) {
    console.error('Error fetching suspensions:', error);
    const errorMessage = error.message || 'Unknown error';
    const statusCode = error.message?.includes('Invalid object name') || error.message?.includes('does not exist') 
      ? 404 
      : 500;
    res.status(statusCode).json({ 
      error: 'Failed to fetch suspensions',
      details: errorMessage,
      suggestion: statusCode === 404 ? 'Database tables may not be initialized. Please run migrations.' : undefined
    });
  }
});

/**
 * GET /api/seasons/:seasonId/discipline/suspensions/active
 * Get active suspensions for a season
 */
router.get('/:seasonId/discipline/suspensions/active', requireAuth, async (req: Request, res: Response) => {
  try {
    const seasonId = parseInt(req.params.seasonId);

    if (isNaN(seasonId)) {
      return res.status(400).json({ error: 'Invalid season ID' });
    }

    const suspensions = await getActiveSuspensions(seasonId);
    
    res.json({
      success: true,
      data: suspensions,
      count: suspensions.length
    });
  } catch (error: any) {
    console.error('Error fetching active suspensions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch active suspensions',
      details: error.message 
    });
  }
});

/**
 * GET /api/seasons/:seasonId/discipline/check-suspension
 * Check if a player is suspended for a specific match
 * Query params: matchId, seasonPlayerId
 */
router.get('/:seasonId/discipline/check-suspension', requireAuth, async (req: Request, res: Response) => {
  try {
    const seasonId = parseInt(req.params.seasonId);
    const matchId = parseInt(req.query.matchId as string);
    const seasonPlayerId = parseInt(req.query.seasonPlayerId as string);

    if (isNaN(seasonId) || isNaN(matchId) || isNaN(seasonPlayerId)) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    const result = await isPlayerSuspendedForMatch(seasonId, matchId, seasonPlayerId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error checking suspension:', error);
    res.status(500).json({ 
      error: 'Failed to check suspension',
      details: error.message 
    });
  }
});

/**
 * POST /api/seasons/:seasonId/discipline/recalculate
 * Recalculate disciplinary records for a season (admin only)
 */
router.post('/:seasonId/discipline/recalculate', requireAuth, requirePermission('manage_matches'), async (req: Request, res: Response) => {
  try {
    const seasonId = parseInt(req.params.seasonId);

    if (isNaN(seasonId)) {
      return res.status(400).json({ error: 'Invalid season ID' });
    }

    const result = await recalculateDisciplinaryForSeason(seasonId);
    
    res.json({
      success: true,
      message: 'Disciplinary records recalculated successfully',
      data: result
    });
  } catch (error: any) {
    console.error('Error recalculating disciplinary records:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      number: error.number,
      originalError: error.originalError,
      info: error.info
    });
    
    const errorMessage = error.message || 'Unknown error';
    const errorDetails = error.originalError?.message || error.info?.message || errorMessage;
    
    res.status(500).json({ 
      error: 'Failed to recalculate disciplinary records',
      details: errorDetails,
      message: errorMessage
    });
  }
});

export default router;
