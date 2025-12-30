/**
 * disciplinaryRoutes.ts
 * API routes for disciplinary actions (cards, suspensions)
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requireAnyPermission } from '../middleware/authMiddleware';
import * as disciplinaryService from '../services/disciplinaryService';
import * as playerStatsAggregateService from '../services/playerStatsAggregateService';

const router = Router();

/**
 * GET /api/disciplinary/season/:seasonId/cards
 * Get card summary for all players in a season
 */
router.get('/season/:seasonId/cards', async (req: Request, res: Response) => {
  try {
    const seasonId = parseInt(req.params.seasonId, 10);
    
    if (isNaN(seasonId)) {
      return res.status(400).json({ error: 'Invalid season ID' });
    }

    const cardSummary = await disciplinaryService.getCardSummary(seasonId);
    
    res.json({
      success: true,
      data: cardSummary,
      count: cardSummary.length
    });
  } catch (error: any) {
    console.error('Error fetching card summary:', error);
    res.status(500).json({ 
      error: 'Failed to fetch card summary',
      details: error.message 
    });
  }
});

/**
 * GET /api/disciplinary/season/:seasonId/suspensions
 * Get suspensions for a season
 * Query params: status (active/served/archived)
 */
router.get('/season/:seasonId/suspensions', async (req: Request, res: Response) => {
  try {
    const seasonId = parseInt(req.params.seasonId, 10);
    const status = req.query.status as string | undefined;
    
    if (isNaN(seasonId)) {
      return res.status(400).json({ error: 'Invalid season ID' });
    }

    if (status && !['active', 'served', 'archived'].includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be active, served, or archived' 
      });
    }

    const suspensions = await disciplinaryService.getSuspensionsForSeason(seasonId, status);
    
    res.json({
      success: true,
      data: suspensions,
      count: suspensions.length
    });
  } catch (error: any) {
    console.error('Error fetching suspensions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch suspensions',
      details: error.message 
    });
  }
});

/**
 * GET /api/disciplinary/season/:seasonId/active-suspensions
 * Get only active suspensions for a season
 */
router.get('/season/:seasonId/active-suspensions', async (req: Request, res: Response) => {
  try {
    const seasonId = parseInt(req.params.seasonId, 10);
    
    if (isNaN(seasonId)) {
      return res.status(400).json({ error: 'Invalid season ID' });
    }

    const activeSuspensions = await disciplinaryService.getActiveSuspensions(seasonId);
    
    res.json({
      success: true,
      data: activeSuspensions,
      count: activeSuspensions.length
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
 * GET /api/disciplinary/match/:matchId/player/:seasonPlayerId/check
 * Check if a player is suspended for a specific match
 */
router.get('/match/:matchId/player/:seasonPlayerId/check', async (req: Request, res: Response) => {
  try {
    const matchId = parseInt(req.params.matchId, 10);
    const seasonPlayerId = parseInt(req.params.seasonPlayerId, 10);
    const seasonId = parseInt(req.query.seasonId as string, 10);
    
    if (isNaN(matchId) || isNaN(seasonPlayerId) || isNaN(seasonId)) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    const suspensionStatus = await disciplinaryService.isPlayerSuspendedForMatch(
      seasonId,
      matchId,
      seasonPlayerId
    );
    
    res.json({
      success: true,
      data: suspensionStatus
    });
  } catch (error: any) {
    console.error('Error checking suspension status:', error);
    res.status(500).json({ 
      error: 'Failed to check suspension status',
      details: error.message 
    });
  }
});

/**
 * POST /api/disciplinary/season/:seasonId/recalculate
 * Recalculate all disciplinary records for a season
 * Requires manage_matches or manage_discipline permission
 */
router.post(
  '/season/:seasonId/recalculate',
  requireAuth,
  requireAnyPermission('manage_matches', 'manage_discipline'),
  async (req: Request, res: Response) => {
    try {
      const seasonId = parseInt(req.params.seasonId, 10);
      
      if (isNaN(seasonId)) {
        return res.status(400).json({ error: 'Invalid season ID' });
      }

      const result = await disciplinaryService.recalculateDisciplinaryForSeason(seasonId);
      
      res.json({
        success: true,
        message: 'Disciplinary records recalculated',
        data: {
          archived: result.archived,
          created: result.created,
          errors: result.errors
        }
      });
    } catch (error: any) {
      console.error('Error recalculating disciplinary:', error);
      res.status(500).json({ 
        error: 'Failed to recalculate disciplinary records',
        details: error.message 
      });
    }
  }
);

/**
 * GET /api/disciplinary/season/:seasonId/overview
 * Get comprehensive disciplinary overview for a season
 */
router.get('/season/:seasonId/overview', async (req: Request, res: Response) => {
  try {
    const seasonId = parseInt(req.params.seasonId, 10);
    
    if (isNaN(seasonId)) {
      return res.status(400).json({ error: 'Invalid season ID' });
    }

    // Get all disciplinary data in parallel
    const [cards, suspensions, cardStats] = await Promise.all([
      disciplinaryService.getCardSummary(seasonId),
      disciplinaryService.getSuspensionsForSeason(seasonId),
      playerStatsAggregateService.getCardStatsBySeason(seasonId)
    ]);

    // Calculate summary statistics
    const totalYellow = cards.reduce((sum, p) => sum + p.yellowCards, 0);
    const totalRed = cards.reduce((sum, p) => sum + p.redCards, 0);
    const activeSuspensions = suspensions.filter(s => s.status === 'active').length;

    // Top offenders (most cards)
    const topOffenders = [...cards]
      .sort((a, b) => 
        (b.redCards * 2 + b.yellowCards) - (a.redCards * 2 + a.yellowCards)
      )
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        summary: {
          totalYellowCards: totalYellow,
          totalRedCards: totalRed,
          totalCards: totalYellow + totalRed,
          activeSuspensions: activeSuspensions,
          playersWithCards: cards.length
        },
        topOffenders,
        suspensions: suspensions.filter(s => s.status === 'active'),
        allCards: cardStats
      }
    });
  } catch (error: any) {
    console.error('Error fetching disciplinary overview:', error);
    res.status(500).json({ 
      error: 'Failed to fetch disciplinary overview',
      details: error.message 
    });
  }
});

export default router;
