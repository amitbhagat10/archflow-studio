const bcrypt = require("bcryptjs");
const { getPool } = require("./provider-utils");

async function main() {
  const [fullName, email, role = "staff", password = "ArchFlow@123!"] =
    process.argv.slice(2);

  if (!fullName || !email) {
    console.error(`
Usage:
node scripts/provider-create-user.js "Full Name" email@example.com role "Password"

Example:
node scripts/provider-create-user.js "Sarah Wilson" sarah@example.com project_manager "ArchFlow@123!"
`);
    process.exit(1);
  }

  const pool = getPool();

  const workspaceResult = await pool.query(`
    SELECT id, name, max_login_users
    FROM workspaces
    ORDER BY created_at
    LIMIT 1
  `);

  const workspace = workspaceResult.rows[0];

  if (!workspace) {
    console.error("No workspace found.");
    process.exit(1);
  }

  const activeCountResult = await pool.query(`
    SELECT COUNT(*)::int AS active_count
    FROM app_users
    WHERE is_active = true
  `);

  const existingUserResult = await pool.query(
    `
    SELECT id, is_active
    FROM app_users
    WHERE lower(email) = lower($1)
    LIMIT 1
    `,
    [email]
  );

  const activeCount = Number(activeCountResult.rows[0].active_count);
  const existingUser = existingUserResult.rows[0];

  if (!existingUser && activeCount >= Number(workspace.max_login_users)) {
    console.error(
      `Seat limit reached. Active users: ${activeCount}, allowed seats: ${workspace.max_login_users}`
    );
    console.error("Upgrade the plan or increase max_login_users first.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await pool.query(
    `
    INSERT INTO app_users (
      workspace_id,
      full_name,
      email,
      role,
      password_hash,
      is_active
    )
    VALUES ($1, $2, lower($3), $4, $5, true)
    ON CONFLICT (email)
    DO UPDATE SET
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      password_hash = EXCLUDED.password_hash,
      is_active = true
    `,
    [workspace.id, fullName, email, role, passwordHash]
  );

  console.log("Login user created/updated:");
  console.table([
    {
      fullName,
      email: email.toLowerCase(),
      role,
      password,
      workspace: workspace.name,
    },
  ]);

  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
