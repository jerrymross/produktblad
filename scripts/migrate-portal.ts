import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { parse } from "dotenv";

async function main() {
  const mode = process.argv[2];
  if (mode !== "dev" && mode !== "prod") throw new Error("Ange dev eller prod uttryckligen.");
  const schema = mode === "dev" ? "studio_dev" : "studio", role = `${schema}_app`;
  const env = parse(readFileSync(process.argv[3] ?? ".env.owner"));
  const pool = new Pool({ connectionString: env.DATABASE_URL_UNPOOLED ?? env.POSTGRES_URL_NON_POOLING, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SET LOCAL search_path TO ${schema},public`);
    if ((await client.query("SELECT current_schema() AS schema")).rows[0].schema !== schema) throw new Error("Fel schema.");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`${schema}:migrations`]);
    if (!(await client.query("SELECT 1 FROM schema_migrations WHERE version='004'")).rowCount) {
      await client.query(readFileSync("migrations/004-portal-sso.sql", "utf8"));
      await client.query("INSERT INTO schema_migrations(version) VALUES('004')");
    }
    await client.query(`GRANT SELECT ON portal_identities TO ${role}`);
    await client.query(`REVOKE INSERT,UPDATE,DELETE ON portal_identities FROM ${role}`);
    await client.query(`GRANT SELECT,INSERT,DELETE ON portal_transactions,portal_sessions TO ${role}`);
    await client.query(`GRANT EXECUTE ON FUNCTION portal_new_identity(text,text) TO ${role}`);
    await client.query(`GRANT EXECUTE ON FUNCTION portal_accept_invitation(text,text,text) TO ${role}`);
    await client.query("COMMIT");
    console.log(`SSO-migration aktiverad i ${schema}; befintliga roller, skolor och blad bevarade.`);
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); await pool.end(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Migrationen misslyckades."); process.exitCode = 1; });
