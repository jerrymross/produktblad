import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { parse } from "dotenv";

async function main() {
  const mode = process.argv[2];
  if (mode !== "dev" && mode !== "prod") throw new Error("Ange dev eller prod uttryckligen.");
  const schema = mode === "dev" ? "studio_dev" : "studio";
  const role = `${schema}_app`;
  const env = parse(readFileSync(process.argv[3] ?? ".env.owner"));
  const connection = env.DATABASE_URL_UNPOOLED ?? env.POSTGRES_URL_NON_POOLING;
  if (!connection) throw new Error("Ägaranslutning saknas i .env.owner.");
  const pool = new Pool({ connectionString: connection, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SET LOCAL search_path TO ${schema},public`);
    if ((await client.query("SELECT current_schema() AS schema")).rows[0].schema !== schema) throw new Error("Målmiljön finns inte. Ingen migration kördes.");
    if (!(await client.query("SELECT to_regclass($1) AS history",[`${schema}.schema_migrations`])).rows[0].history) throw new Error("Målmiljön saknar migrationshistorik. Ingen migration kördes.");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`${schema}:migrations`]);
    if (!(await client.query("SELECT 1 FROM schema_migrations WHERE version='002'")).rowCount) throw new Error("Aktivera adminlås (migration 002) först.");
    const previous = await client.query("SELECT 1 FROM schema_migrations WHERE version='003'");
    if (!previous.rowCount) {
      await client.query(readFileSync("migrations/003-sheet-copies.sql", "utf8"));
      await client.query("INSERT INTO schema_migrations(version) VALUES('003')");
    }
    await client.query(`GRANT SELECT ON sheet_copies TO ${role}`);
    await client.query(`REVOKE INSERT,UPDATE,DELETE ON sheet_copies FROM ${role}`);
    await client.query(`GRANT EXECUTE ON FUNCTION create_sheet_copy(text,int) TO ${role}`);
    await client.query("COMMIT");
    console.log(`Kopior aktiverade i ${schema}. Befintliga blad och versioner är bevarade.`);
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); await pool.end(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Migrationen misslyckades."); process.exitCode = 1; });

