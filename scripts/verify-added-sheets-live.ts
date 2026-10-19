import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { parse } from "dotenv";
import { initialSheet } from "../lib/catalog";
import { templateVersion } from "../lib/sheet";

// Explicit environment only; all test rows are rolled back, including on failure.
async function main() {
  const mode = process.argv[2];
  if (mode !== "dev" && mode !== "prod") throw new Error("Ange dev eller prod.");
  const schema = mode === "dev" ? "studio_dev" : "studio", role = `${schema}_app`;
  const env = parse(readFileSync(process.argv[3] ?? ".env.owner"));
  const runtimeEnv = process.argv[4] ? parse(readFileSync(process.argv[4])) : null;
  if (runtimeEnv) {
    const ownerUrl = new URL(env.DATABASE_URL_UNPOOLED ?? env.POSTGRES_URL_NON_POOLING);
    const runtimeUrl = new URL(runtimeEnv.APP_DATABASE_URL);
    assert.equal(ownerUrl.hostname.replace("-pooler", ""), runtimeUrl.hostname.replace("-pooler", ""), "Runtime och ägaranslutning måste avse samma databasgren.");
    assert.equal(ownerUrl.pathname, runtimeUrl.pathname);
  }
  const pool = new Pool({ connectionString: env.DATABASE_URL_UNPOOLED ?? env.POSTGRES_URL_NON_POOLING, max: 1 });
  const admin = (await pool.query(`SELECT user_id FROM ${schema}.central_roles LIMIT 1`)).rows[0]?.user_id;
  assert.ok(admin, "En befintlig admin krävs för transaktionsprovet.");
  const school = (await pool.query(`SELECT id FROM ${schema}.schools WHERE id NOT LIKE '\\_\\_%' ORDER BY id LIMIT 1`)).rows[0]?.id;
  assert.ok(school);
  const runtime = runtimeEnv ? new Pool({ connectionString: runtimeEnv.APP_DATABASE_URL, max: 1 }) : null;
  const client = await (runtime ?? pool).connect();
  let released = false;
  const requestId = randomUUID(), id = `new:${requestId}`;
  try {
    await client.query("BEGIN");
    await client.query(`SET LOCAL search_path TO ${schema},public`);
    assert.equal((await client.query("SELECT current_schema() AS name")).rows[0].name, schema);
    assert.equal((await client.query("SELECT 1 FROM schema_migrations WHERE version='007'")).rowCount, 1);
    const content = initialSheet({ id, school, program: "AF", title: "Tillfälligt migrationsprov" });
    if (runtime) assert.equal((await client.query("SELECT current_user AS name")).rows[0].name, role);
    assert.equal((await client.query("SELECT rolbypassrls FROM pg_roles WHERE rolname=$1", [role])).rows[0].rolbypassrls, false);
    const permissions = (await client.query("SELECT has_table_privilege($1,'added_sheets','SELECT') AS read,has_table_privilege($1,'added_sheets','UPDATE') AS update,has_table_privilege($1,'added_sheets','INSERT') AS insert,has_table_privilege($1,'added_sheets','DELETE') AS delete,has_function_privilege($1,'create_added_sheet(uuid,text,text,text,jsonb,text)','EXECUTE') AS execute", [role])).rows[0];
    assert.deepEqual(permissions, { read: true, update: false, insert: false, delete: false, execute: true });
    assert.equal((await client.query("SELECT relrowsecurity FROM pg_class WHERE oid='added_sheets'::regclass")).rows[0].relrowsecurity, true);
    await client.query("SELECT set_config('app.user_id',$1,true)", [admin]);
    const args = [requestId, school, "AF", "Tillfälligt migrationsprov", content, templateVersion(content)];
    for (let repeat = 0; repeat < 2; repeat++) {
      assert.equal((await client.query("SELECT create_added_sheet($1,$2,$3,$4,$5,$6) AS id", args)).rows[0].id, id);
    }
    const row = (await client.query("SELECT created_by,program,school_id FROM added_sheets WHERE sheet_id=$1", [id])).rows[0];
    assert.equal(row.created_by, admin); assert.equal(row.program, "AF"); assert.equal(row.school_id, school);
    async function denied(sql: string, values: unknown[]) {
      await client.query("SAVEPOINT denial");
      let code: string | undefined;
      try { await client.query(sql, values); } catch (error) { code = (error as { code?: string }).code; }
      await client.query("ROLLBACK TO SAVEPOINT denial");
      assert.equal(code, "42501", "Åtgärden ska nekas av databasbehörighet/RLS.");
    }
    if (runtime) {
      await denied("UPDATE added_sheets SET title=$2 WHERE sheet_id=$1", [id, "Otillåten metadataändring"]);
      await denied("DELETE FROM added_sheets WHERE sheet_id=$1", [id]);
    }
    await client.query("SELECT set_config('app.user_id',$1,true)", [`verification-no-access-${randomUUID()}`]);
    if (runtime) assert.equal((await client.query("SELECT 1 FROM added_sheets WHERE sheet_id=$1", [id])).rowCount, 0);
    await denied("SELECT create_added_sheet($1,$2,$3,$4,$5,$6)", [randomUUID(), ...args.slice(1)]);
    await client.query("ROLLBACK");
    client.release();
    released = true;
    assert.equal((await pool.query(`SELECT 1 FROM ${schema}.sheets WHERE id=$1`, [id])).rowCount, 0);
    console.log(`PASS ${schema}: migration 007, ${runtime ? "riktig runtime-roll/RLS" : "RLS- och runtime-privilegier kontrollerade via katalogen"}, skapande, identiskt återförsök, skaparmetadata och nekad skolåtkomst. Alla testrader återställda.`);
  } catch (error) { if (!released) { await client.query("ROLLBACK"); client.release(); } throw error; }
  finally { if (runtime) await runtime.end(); await pool.end(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Verifieringen misslyckades."); process.exitCode = 1; });
