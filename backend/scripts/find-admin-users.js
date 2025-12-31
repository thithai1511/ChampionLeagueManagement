// Quick script: list admin users and lockout status
const sql = require('mssql')
const path = require('path')
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') })

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 1433),
  database: process.env.DB_NAME,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
  },
}

async function run() {
  let pool
  try {
    pool = await sql.connect(config)
    console.log('Connected to DB, querying admin users...')

    const q = `
      SELECT DISTINCT
        ua.user_id,
        ua.username,
        ua.email,
        ua.status,
        ua.last_login_at,
        r.code AS role_code,
        usl.failed_attempts,
        usl.locked_until
      FROM user_accounts ua
      LEFT JOIN user_role_assignments ura ON ua.user_id = ura.user_id
      LEFT JOIN roles r ON ura.role_id = r.role_id
      LEFT JOIN user_session_lockouts usl ON ua.user_id = usl.user_id
      WHERE r.code IN ('super_admin', 'admin', 'btc_admin', 'team_admin')
         OR LOWER(ua.username) = 'admin'
      ORDER BY ua.user_id
    `

    const result = await pool.request().query(q)
    if (!result.recordset.length) {
      console.log('No admin users found')
    } else {
      console.table(result.recordset)
    }
  } catch (err) {
    console.error('Error querying DB:', err.message || err)
  } finally {
    if (pool) await pool.close()
  }
}

run()
