import { Pool, QueryResult, QueryResultRow } from "pg";

let poolInstance: Pool | null = null;

function getPool() {
  if (poolInstance) {
    return poolInstance;
  }

  const rawConnectionString = process.env.DATABASE_URL;

  if (!rawConnectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const databaseUrl = new URL(rawConnectionString);
  databaseUrl.searchParams.delete("sslmode");

  poolInstance = new Pool({
    connectionString: databaseUrl.toString(),
    ssl: {
      rejectUnauthorized: false,
    },
  });

  return poolInstance;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params);
}
