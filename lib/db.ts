import { Pool, type PoolClient } from "pg";
import { attachDatabasePool } from "@vercel/functions";

let pool: Pool | undefined;
export function getPool() {
  if (!pool) {
    if (!process.env.APP_DATABASE_URL && !process.env.DATABASE_URL) throw new Error("Databasanslutning saknas.");
    // Each restricted database role has its own server-side search_path.
    pool = new Pool({ connectionString: process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL, max: 5, idleTimeoutMillis: 5000 });
    attachDatabasePool(pool);
  }
  return pool;
}

export async function transaction<T>(userId: string, operation: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.user_id', $1, true)", [userId]);
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}
