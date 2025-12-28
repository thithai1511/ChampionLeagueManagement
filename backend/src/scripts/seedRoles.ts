import { query } from "../db/sqlServer";

/**
 * Seed default roles and permissions
 * Run this script if the database doesn't have any roles
 */
async function seedRoles() {
  try {
    console.log("🌱 Seeding roles and permissions...");

    // Check if roles already exist
    const existingRoles = await query(`SELECT COUNT(*) as count FROM roles`);
    const roleCount = existingRoles.recordset[0]?.count || 0;

    if (roleCount > 0) {
      console.log(`✅ Roles already exist (${roleCount} roles found). Skipping seed.`);
      return;
    }

    // Seed permissions
    console.log("📝 Seeding permissions...");
    await query(`
      MERGE permissions AS target
      USING (VALUES
          ('manage_users',      N'Manage users',      N'Create, update, assign roles, and delete user accounts.'),
          ('manage_rulesets',   N'Manage rulesets',   N'Create, edit, publish, and assign tournament rulesets.'),
          ('view_audit_logs',   N'View audit logs',   N'Read-only access to audit_events.'),
          ('manage_content',    N'Manage content',    N'Create and curate news, media, and CMS content.'),
          ('manage_matches',    N'Manage matches',    N'Schedule matches, update live data, and finalize results.'),
          ('manage_teams',      N'Manage teams',      N'Approve rosters, register teams, maintain squads.'),
          ('manage_own_player_registrations', N'Manage own player registrations', N'Create, edit, and view player registrations for the teams assigned to the user.'),
          ('view_own_team',     N'View own team',     N'Read-only access to the teams/squad assigned to the user.'),
          ('approve_player_registrations', N'Approve player registrations', N'Review and approve/reject player registrations across all teams.'),
          ('manage_own_team_squad', N'Manage own team squad', N'Edit approved players within the user''s assigned teams.')
      ) AS source (code, name, description)
      ON target.code = source.code
      WHEN NOT MATCHED THEN
          INSERT (code, name, description)
          VALUES (source.code, source.name, source.description);
    `);

    // Seed roles
    console.log("👥 Seeding roles...");
    await query(`
      MERGE roles AS target
      USING (VALUES
          ('super_admin',    N'Super Administrator', N'Full system control', 1),
          ('admin',          N'Administrator',       N'Operational admin without system lock features', 0),
          ('content_manager',N'Content Manager',     N'Editorial / CMS responsibilities', 0),
          ('match_official', N'Match Official',      N'Live match operations team', 0),
          ('team_admin',     N'Team Administrator',  N'Manage player registrations for assigned teams', 0),
          ('viewer',         N'Read-only Viewer',    N'Analyst/reporting account', 0)
      ) AS source (code, name, description, is_system_role)
      ON target.code = source.code
      WHEN NOT MATCHED THEN
          INSERT (code, name, description, is_system_role)
          VALUES (source.code, source.name, source.description, source.is_system_role);
    `);

    // Map permissions to roles
    console.log("🔗 Mapping permissions to roles...");
    await query(`
      DECLARE @RolePermission TABLE (role_code VARCHAR(100), permission_code VARCHAR(150));
      INSERT INTO @RolePermission (role_code, permission_code)
      VALUES
          ('super_admin', 'manage_users'),
          ('super_admin', 'manage_rulesets'),
          ('super_admin', 'view_audit_logs'),
          ('super_admin', 'manage_content'),
          ('super_admin', 'manage_matches'),
          ('super_admin', 'manage_teams'),
          ('super_admin', 'approve_player_registrations'),
          ('super_admin', 'manage_own_player_registrations'),
          ('super_admin', 'view_own_team'),
          ('super_admin', 'manage_own_team_squad'),
          ('admin', 'manage_rulesets'),
          ('admin', 'manage_matches'),
          ('admin', 'manage_teams'),
          ('content_manager', 'manage_content'),
          ('match_official', 'manage_matches'),
          ('team_admin', 'manage_own_player_registrations'),
          ('team_admin', 'view_own_team'),
          ('team_admin', 'manage_own_team_squad');

      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.role_id, p.permission_id
      FROM @RolePermission rp
      JOIN roles r ON r.code = rp.role_code
      JOIN permissions p ON p.code = rp.permission_code
      WHERE NOT EXISTS (
          SELECT 1
          FROM role_permissions existing
          WHERE existing.role_id = r.role_id
            AND existing.permission_id = p.permission_id
      );
    `);

    // Verify
    const finalCount = await query(`SELECT COUNT(*) as count FROM roles`);
    console.log(`✅ Seeding complete! ${finalCount.recordset[0]?.count || 0} roles created.`);
  } catch (error) {
    console.error("❌ Error seeding roles:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedRoles()
    .then(() => {
      console.log("✨ Done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Fatal error:", error);
      process.exit(1);
    });
}

export default seedRoles;


