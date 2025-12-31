import { Router, Request, Response } from 'express'
import { requireAuth, requirePermission } from '../middleware/authMiddleware'
import * as supervisorReportService from '../services/supervisorReportService'
import * as matchLifecycleService from '../services/matchLifecycleService'

const router = Router()

/**
 * POST /api/supervisor-reports
 * Create a supervisor evaluation report
 */
// Allow any authenticated supervisor to submit a report. Permission checks
// are enforced at the service level where appropriate.
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { matchId, organization_ok, incidents, discipline_flag, suggested_actions } = req.body
    if (!matchId) return res.status(400).json({ error: 'matchId is required' })

    const userId = req.user?.sub
    if (!userId) return res.status(401).json({ error: 'User not authenticated' })

    // Map simple organization_ok to rating (scale 1-5)
    const orgRating = organization_ok === 'yes' ? 5 : organization_ok === 'partial' ? 3 : 1

    // Check match exists
    const match = await matchLifecycleService.getMatchDetails(Number(matchId))
    if (!match) return res.status(404).json({ error: 'Match not found' })

    const input = {
      matchId: Number(matchId),
      supervisorId: Number(userId),
      organizationRating: orgRating,
      incidentReport: incidents,
      hasSeriousViolation: Boolean(discipline_flag),
      sendToDisciplinary: Boolean(discipline_flag),
      recommendations: suggested_actions
    }

    // Allow public supervisor submissions even when not assigned to the match
    const report = await supervisorReportService.createSupervisorReport(input, { skipAssignedCheck: true })
    res.status(201).json(report)
  } catch (err) {
    console.error('Failed to create supervisor report', err)
    // Provide more detailed error messages
    const errorMessage = err instanceof Error ? err.message : 'Failed to create supervisor report'
    const statusCode = errorMessage.includes('not found') ? 404 
                     : errorMessage.includes('status') ? 400 
                     : errorMessage.includes('not authenticated') ? 401
                     : 500
    res.status(statusCode).json({ error: errorMessage })
  }
})

export default router
