import { query } from '../src/db/sqlServer'

async function main() {
  console.log('Creating supervisor_reports table if not exists...')
  await query(`
    IF OBJECT_ID('dbo.supervisor_reports', 'U') IS NULL
    CREATE TABLE supervisor_reports (
      report_id INT IDENTITY(1,1) PRIMARY KEY,
      match_id INT NOT NULL,
      supervisor_id INT NOT NULL,
      organization_rating TINYINT NULL,
      home_team_rating TINYINT NULL,
      away_team_rating TINYINT NULL,
      stadium_condition_rating TINYINT NULL,
      security_rating TINYINT NULL,
      incident_report NVARCHAR(MAX) NULL,
      has_serious_violation BIT NULL,
      send_to_disciplinary BIT NULL,
      recommendations NVARCHAR(1024) NULL,
      submitted_at DATETIME2 NULL,
      reviewed_by INT NULL,
      reviewed_at DATETIME2 NULL
    )
  `)

  console.log('Ensuring supervisor role exists...')
  const existing = await query(`SELECT role_id FROM roles WHERE code = 'supervisor'`)
  if (existing.recordset.length === 0) {
    const res = await query(`
      INSERT INTO roles (code, name, description, is_system_role)
      OUTPUT INSERTED.role_id
      VALUES ('supervisor', 'Supervisor', 'Match supervisor role (read-only, can submit evaluations)', 0)
    `)
    const roleId = res.recordset[0]?.role_id
    console.log('Created supervisor role id=', roleId)

    // Attach submit_match_reports permission to supervisor role if permission exists
    const perm = await query(`SELECT permission_id FROM permissions WHERE code = 'submit_match_reports'`)
    if (perm.recordset.length > 0) {
      const permissionId = perm.recordset[0].permission_id
      await query(`
        IF NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id = @roleId AND permission_id = @permissionId)
        INSERT INTO role_permissions (role_id, permission_id) VALUES (@roleId, @permissionId)
      `, { roleId, permissionId })
      console.log('Attached submit_match_reports permission to supervisor role')
    } else {
      console.log('Permission submit_match_reports not found — create it in permissions table if desired')
    }
  } else {
    console.log('Supervisor role already present')
  }

  console.log('Done')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
