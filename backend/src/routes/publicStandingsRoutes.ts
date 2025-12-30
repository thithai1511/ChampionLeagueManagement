/**
 * publicStandingsRoutes.ts
 * Public API routes for standings (no auth required)
 */

import { Router, Request, Response } from 'express';
import { getSeasonStandings, StandingsMode } from '../services/standingsService_v2';
import { getTopScorersBySeason, getMotmStatsBySeason, getCardStatsBySeason } from '../services/playerStatsAggregateService';
import { getActiveSuspensions } from '../services/disciplinaryService';

const router = Router();

/**
 * GET /api/public/standings/season/:seasonId
 * Get standings for a season
 * Query params:
 *   - mode: "live" (default) | "final" (with head-to-head tie-break)
 */
router.get('/season/:seasonId', async (req: Request, res: Response) => {
  try {
    const seasonId = parseInt(req.params.seasonId, 10);
    
    if (isNaN(seasonId)) {
      return res.status(400).json({ error: 'Invalid season ID' });
    }

    // Get mode from query params (default to "live")
    const mode = (req.query.mode as StandingsMode) || "live";
    
    // Validate mode
    if (mode !== "live" && mode !== "final") {
      return res.status(400).json({ 
        error: 'Invalid mode. Must be "live" or "final"' 
      });
    }

    const standings = await getSeasonStandings(seasonId, mode);
    
    res.json({
      success: true,
      data: standings,
      count: standings.length,
      mode: mode,
      note: mode === "live" 
        ? "Xếp hạng trong mùa (chỉ xét điểm và hiệu số)" 
        : "Xếp hạng cuối mùa (bao gồm đối đầu)"
    });
  } catch (error: any) {
    console.error('Error fetching standings:', error);
    res.status(500).json({ 
      error: 'Failed to fetch standings',
      details: error.message 
    });
  }
});

/**
 * GET /api/public/standings/season/:seasonId/top-scorers
 * Get top scorers for a season
 */
router.get('/season/:seasonId/top-scorers', async (req: Request, res: Response) => {
  try {
    const seasonId = parseInt(req.params.seasonId, 10);
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    
    if (isNaN(seasonId)) {
      return res.status(400).json({ error: 'Invalid season ID' });
    }

    if (limit < 1 || limit > 100) {
      return res.status(400).json({ 
        error: 'Limit must be between 1 and 100' 
      });
    }

    const topScorers = await getTopScorersBySeason(seasonId, limit);
    
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
 * GET /api/public/standings/season/:seasonId/top-mvp
 * Get MVP (Player of the Match) leaders for a season
 */
router.get('/season/:seasonId/top-mvp', async (req: Request, res: Response) => {
  try {
    const seasonId = parseInt(req.params.seasonId, 10);
    
    if (isNaN(seasonId)) {
      return res.status(400).json({ error: 'Invalid season ID' });
    }

    const mvpStats = await getMotmStatsBySeason(seasonId);
    
    res.json({
      success: true,
      data: mvpStats,
      count: mvpStats.length
    });
  } catch (error: any) {
    console.error('Error fetching MVP stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch MVP stats',
      details: error.message 
    });
  }
});

/**
 * GET /api/public/standings/season/:seasonId/discipline
 * Get disciplinary overview (cards and suspensions) for a season
 */
router.get('/season/:seasonId/discipline', async (req: Request, res: Response) => {
  try {
    const seasonId = parseInt(req.params.seasonId, 10);
    
    if (isNaN(seasonId)) {
      return res.status(400).json({ error: 'Invalid season ID' });
    }

    const [cardStats, suspensions] = await Promise.all([
      getCardStatsBySeason(seasonId),
      getActiveSuspensions(seasonId)
    ]);

    // Calculate summary
    const totalYellowCards = cardStats.reduce((sum, p) => sum + p.yellowCards, 0);
    const totalRedCards = cardStats.reduce((sum, p) => sum + p.redCards, 0);

    res.json({
      success: true,
      data: {
        summary: {
          totalYellowCards,
          totalRedCards,
          totalCards: totalYellowCards + totalRedCards,
          playersWithCards: cardStats.length,
          activeSuspensions: suspensions.length
        },
        cards: cardStats,
        suspensions: suspensions
      }
    });
  } catch (error: any) {
    console.error('Error fetching discipline data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch discipline data',
      details: error.message 
    });
  }
});

/**
 * GET /api/public/standings/season/:seasonId/stats-overview
 * Get comprehensive stats overview for a season
 * Includes: standings, top scorers, MVP, cards
 */
router.get('/season/:seasonId/stats-overview', async (req: Request, res: Response) => {
  try {
    const seasonId = parseInt(req.params.seasonId, 10);
    
    if (isNaN(seasonId)) {
      return res.status(400).json({ error: 'Invalid season ID' });
    }

    // Get all data in parallel
    const [standings, topScorers, mvpStats, cardStats, suspensions] = await Promise.all([
      getSeasonStandings(seasonId, "live"),
      getTopScorersBySeason(seasonId, 10),
      getMotmStatsBySeason(seasonId),
      getCardStatsBySeason(seasonId),
      getActiveSuspensions(seasonId)
    ]);

    // Calculate summary statistics
    const totalGoals = topScorers.reduce((sum, p) => sum + p.goals, 0);
    const totalMatches = standings.reduce((sum, t) => sum + t.played, 0) / 2; // Divide by 2 (each match counted twice)
    const totalYellowCards = cardStats.reduce((sum, p) => sum + p.yellowCards, 0);
    const totalRedCards = cardStats.reduce((sum, p) => sum + p.redCards, 0);

    res.json({
      success: true,
      data: {
        summary: {
          totalMatches: Math.round(totalMatches),
          totalGoals,
          totalYellowCards,
          totalRedCards,
          activeSuspensions: suspensions.length,
          teamsCount: standings.length
        },
        standings: standings.slice(0, 10), // Top 10
        topScorers: topScorers.slice(0, 10),
        topMVP: mvpStats.slice(0, 5),
        discipline: {
          topOffenders: cardStats.slice(0, 10),
          suspensions: suspensions.slice(0, 10)
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching stats overview:', error);
    res.status(500).json({ 
      error: 'Failed to fetch stats overview',
      details: error.message 
    });
  }
});

/**
 * GET /api/public/standings/season/:seasonId/team/:teamId
 * Get detailed standings info for a specific team
 */
router.get('/season/:seasonId/team/:teamId', async (req: Request, res: Response) => {
  try {
    const seasonId = parseInt(req.params.seasonId, 10);
    const teamId = parseInt(req.params.teamId, 10);
    
    if (isNaN(seasonId) || isNaN(teamId)) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    const standings = await getSeasonStandings(seasonId, "live");
    const teamStanding = standings.find(s => s.teamId === teamId);

    if (!teamStanding) {
      return res.status(404).json({ 
        error: 'Team not found in standings' 
      });
    }

    res.json({
      success: true,
      data: teamStanding
    });
  } catch (error: any) {
    console.error('Error fetching team standing:', error);
    res.status(500).json({ 
      error: 'Failed to fetch team standing',
      details: error.message 
    });
  }
});

export default router;
