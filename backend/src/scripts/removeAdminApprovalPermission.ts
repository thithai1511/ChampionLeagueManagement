import { query } from "../db/sqlServer";

/**
 * Remove approve_player_registrations permission from admin role
 * Only super_admin should have this permission
 */
async function removeAdminApprovalPermission() {
  try {
    console.log("🔧 Removing approve_player_registrations permission from admin role...");

    const result = await query(`
      DELETE FROM role_permissions 
      WHERE role_id = (SELECT role_id FROM roles WHERE code = 'admin') 
        AND permission_id = (SELECT permission_id FROM permissions WHERE code = 'approve_player_registrations')
    `);

    console.log(`✅ Successfully removed permission. Rows affected: ${result.rowsAffected[0]}`);
  } catch (error) {
    console.error("❌ Error removing permission:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  removeAdminApprovalPermission()
    .then(() => {
      console.log("✨ Done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Fatal error:", error);
      process.exit(1);
    });
}

export default removeAdminApprovalPermission;




