import { Pool, QueryResult, QueryResultRow } from "pg";

const rawConnectionString = process.env.DATABASE_URL;

if (!rawConnectionString) {
  throw new Error("DATABASE_URL is not set");
}

const databaseUrl = new URL(rawConnectionString);

// Important:
// If sslmode=require is in the URL, node-postgres can override the custom SSL config.
// We remove it here and force SSL with rejectUnauthorized false.
databaseUrl.searchParams.delete("sslmode");

export const pool = new Pool({
  connectionString: databaseUrl.toString(),
  ssl: {
    rejectUnauthorized: false,
  },
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}
