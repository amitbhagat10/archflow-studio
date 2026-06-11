const { getPool } = require("./provider-utils");

async function main() {
  const [
    planName = "Starter",
    maxLoginUsers = "3",
    subscriptionStatus = "trial",
    aiEnabled = "false",
    trialEndsAt = null,
  ] = process.argv.slice(2);

  const pool = getPool();

  await pool.query(
    `
    UPDATE workspaces
    SET
      plan_name = $1,
      max_login_users = $2,
      subscription_status = $3,
      ai_enabled = $4,
      trial_ends_at = COALESCE($5::date, trial_ends_at)
    WHERE id = (
      SELECT id
      FROM workspaces
      ORDER BY created_at
      LIMIT 1
    )
    `,
    [
      planName,
      Number(maxLoginUsers),
      subscriptionStatus,
      aiEnabled === "true",
      trialEndsAt,
    ]
  );

  console.log("Plan updated:");
  console.table([
    {
      planName,
      maxLoginUsers: Number(maxLoginUsers),
      subscriptionStatus,
      aiEnabled: aiEnabled === "true",
      trialEndsAt: trialEndsAt || "unchanged",
    },
  ]);

  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
