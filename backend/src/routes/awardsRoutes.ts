/**
 * awardsRoutes.ts
 * API routes for season awards (top scorers, MVP, etc.)
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { getTopScorers, getTopMVPs, getSeasonAwardsSummary } from '../services/awardService';

const router = Router();

/**
 * GET /api/seasons/:seasonId/awards/top-scorers
 * Get top scorers for a season
 */
router.get('/:seasonId/awards/top-scorers', requireAuth, async (req: Request, res: Response) => {
  try {
    const seasonId = parseInt(req.params.seasonId);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    if (isNaN(seasonId)) {
      return res.status(400).json({ error: 'Invalid season ID' });
    }

    if (limit < 1 || limit > 100) {
      return res.status(400).json({ error: 'Limit must be between 1 and 100' });
    }

    const topScorers = await getTopScorers(seasonId, limit);
    
    res.json({
      success: true,
      data: topScorers,
      count: topScorers.length
    });
  } catch (error: any) {
    console.error('Error fetching top scorers:', error);
    res.status(500).json({ 
      error: 'Failed to fetch top scorers',
      details: error.message 
    });
  }
});

/**
 * GET /api/seasons/:seasonId/awards/top-mvps
 * Get top MVPs (Player of the Match) for a season
 */
router.get('/:seasonId/awards/top-mvps', requireAuth, async (req: Request, res: Response) => {
  try {
    const seasonId = parseInt(req.params.seasonId);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    if (isNaN(seasonId)) {
      return res.status(400).json({ error: 'Invalid season ID' });
    }

    if (limit < 1 || limit > 100) {
      return res.status(400).json({ error: 'Limit must be between 1 and 100' });
    }

    const topMVPs = await getTopMVPs(seasonId, limit);
    
    res.json({
      success: true,
      data: topMVPs,
      count: topMVPs.length
    });
  } catch (error: any) {
    console.error('Error fetching top MVPs:', error);
    res.status(500).json({ 
      error: 'Failed to fetch top MVPs',
      details: error.message 
    });
  }
});

/**
 * GET /api/seasons/:seasonId/awards/summary
 * Get awards summary for a season (champion scorer, MVP)
 */
router.get('/:seasonId/awards/summary', requireAuth, async (req: Request, res: Response) => {
  try {
    const seasonId = parseInt(req.params.seasonId);

    if (isNaN(seasonId)) {
      return res.status(400).json({ error: 'Invalid season ID' });
    }

    const summary = await getSeasonAwardsSummary(seasonId);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error: any) {
    console.error('Error fetching awards summary:', error);
    res.status(500).json({ 
      error: 'Failed to fetch awards summary',
      details: error.message 
    });
  }
});

export default router;
