const { getPool } = require("./provider-utils");

async function main() {
  const [email] = process.argv.slice(2);

  if (!email) {
    console.error(`
Usage:
node scripts/provider-deactivate-user.js email@example.com
`);
    process.exit(1);
  }

  const pool = getPool();

  const result = await pool.query(
    `
    UPDATE app_users
    SET is_active = false
    WHERE lower(email) = lower($1)
    RETURNING full_name, email, role, is_active
    `,
    [email]
  );

  if (result.rows.length === 0) {
    console.log("No user found with that email.");
  } else {
    console.log("User deactivated:");
    console.table(result.rows);
  }

  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
