const fs = require("fs");
const { Pool } = require("pg");

function getPool() {
  const env = fs.readFileSync(".env.local", "utf8");
  const match = env.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);

  if (!match) {
    console.error("DATABASE_URL not found in .env.local");
    process.exit(1);
  }

  const databaseUrl = new URL(match[1]);
  databaseUrl.searchParams.delete("sslmode");

  return new Pool({
    connectionString: databaseUrl.toString(),
    ssl: {
      rejectUnauthorized: false,
    },
  });
}

module.exports = { getPool };
