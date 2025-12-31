import { query } from '../db/sqlServer'

export interface SupervisorReport {
  report_id: number
  match_id: number
  supervisor_user_id: number
  organization_ok: string | null
  incidents: string | null
  discipline_flag: number | null
  suggested_actions: string | null
  created_at: string
}

export async function createSupervisorReport(
  matchId: number,
  supervisorUserId: number,
  payload: {
    organization_ok?: string
    incidents?: string
    discipline_flag?: boolean
    suggested_actions?: string
  }
): Promise<SupervisorReport> {
  const result = await query(
    `
    INSERT INTO supervisor_reports (
      match_id, supervisor_user_id, organization_ok, incidents, discipline_flag, suggested_actions, created_at
    )
    OUTPUT INSERTED.*
    VALUES (
      @matchId, @supervisorUserId, @organizationOk, @incidents, @disciplineFlag, @suggestedActions, GETUTCDATE()
    )
  `,
    {
      matchId,
      supervisorUserId,
      organizationOk: payload.organization_ok ?? null,
      incidents: payload.incidents ?? null,
      disciplineFlag: payload.discipline_flag ? 1 : 0,
      suggestedActions: payload.suggested_actions ?? null
    }
  )

  return result.recordset[0]
}
