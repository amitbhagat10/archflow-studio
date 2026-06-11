const { getPool } = require("./provider-utils");

async function main() {
  const pool = getPool();

  const workspaceResult = await pool.query(`
    SELECT
      id,
      name,
      plan_name,
      subscription_status,
      max_login_users,
      ai_enabled,
      trial_ends_at::text
    FROM workspaces
    ORDER BY created_at
    LIMIT 1
  `);

  const workspace = workspaceResult.rows[0];

  if (!workspace) {
    console.log("No workspace found.");
    await pool.end();
    return;
  }

  const usersResult = await pool.query(`
    SELECT
      full_name,
      email,
      role,
      is_active,
      last_login_at::text
    FROM app_users
    ORDER BY is_active DESC, created_at DESC
  `);

  const activeUsers = usersResult.rows.filter((user) => user.is_active);

  console.log("\nWorkspace");
  console.table([workspace]);

  console.log("\nSeat usage");
  console.table([
    {
      active_users: activeUsers.length,
      max_login_users: workspace.max_login_users,
      remaining_seats: Math.max(0, workspace.max_login_users - activeUsers.length),
    },
  ]);

  console.log("\nUsers");
  console.table(usersResult.rows);

  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
