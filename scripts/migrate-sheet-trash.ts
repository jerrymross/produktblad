import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { parse } from "dotenv";

async function main() {
  const mode = process.argv[2];
  if (mode !== "dev" && mode !== "prod") throw new Error("Ange dev eller prod uttryckligen.");
  const schema = mode === "dev" ? "studio_dev" : "studio";
  const role = `${schema}_app`;
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
    if (!(await client.query("SELECT 1 FROM schema_migrations WHERE version='007'")).rowCount) throw new Error("Aktivera migration 007 först.");
    if (!(await client.query("SELECT 1 FROM schema_migrations WHERE version='008'")).rowCount) {
      await client.query(readFileSync("migrations/008-sheet-trash.sql", "utf8"));
      await client.query("INSERT INTO schema_migrations(version) VALUES('008')");
    }
    await client.query(`GRANT SELECT ON sheet_trash TO ${role}`);
    await client.query(`REVOKE INSERT,UPDATE,DELETE ON sheet_trash FROM ${role}`);
    await client.query(`REVOKE DELETE ON sheets FROM ${role}`);
    await client.query(`GRANT EXECUTE ON FUNCTION trash_sheet(text,int,boolean),restore_sheet(text,uuid),list_sheet_trash() TO ${role}`);
    await client.query("COMMIT");
    console.log(`Skräpkorg aktiverad i ${schema}. Befintliga blad och versioner är bevarade.`);
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); await pool.end(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Migrationen misslyckades."); process.exitCode = 1; });
