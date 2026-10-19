import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { parse } from "dotenv";

async function main() {
  const mode = process.argv[2];
  if (mode !== "dev" && mode !== "prod") throw new Error("Ange dev eller prod uttryckligen.");
  const schema = mode === "dev" ? "studio_dev" : "studio";
  const env = parse(readFileSync(process.argv[3] ?? ".env.owner"));
  const connectionString = env.DATABASE_URL_UNPOOLED ?? env.POSTGRES_URL_NON_POOLING;
  if (!connectionString) throw new Error("Ägaranslutning saknas.");
  const pool = new Pool({ connectionString, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SET LOCAL search_path TO ${schema},public`);
    if ((await client.query("SELECT current_schema() AS schema")).rows[0].schema !== schema) throw new Error("Målmiljön finns inte.");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`${schema}:migrations`]);
    if (!(await client.query("SELECT 1 FROM schema_migrations WHERE version='008'")).rowCount) throw new Error("Aktivera migration 008 först.");
    if (!(await client.query("SELECT 1 FROM schema_migrations WHERE version='009'")).rowCount) {
      await client.query(readFileSync("migrations/009-editor-finalization.sql", "utf8"));
      await client.query("INSERT INTO schema_migrations(version) VALUES('009')");
    }
    await client.query("COMMIT");
    console.log(`Låsning för skolredaktörer aktiverad i ${schema}. Befintliga blad och versioner är bevarade.`);
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); await pool.end(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Migrationen misslyckades."); process.exitCode = 1; });
