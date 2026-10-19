import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { parse } from "dotenv";
import { initialSheet } from "../lib/catalog";
import { templateVersion } from "../lib/sheet";

// Owner connection: inspect runtime grants and exercise definer functions in rollback.
// Real runtime RLS and complete browser flow are covered by test-sheet-trash.mjs.
async function main() {
  const mode = process.argv[2];
  if (mode !== "dev" && mode !== "prod") throw new Error("Ange dev eller prod.");
  const schema = mode === "dev" ? "studio_dev" : "studio", role = `${schema}_app`;
  const env = parse(readFileSync(process.argv[3] ?? ".env.owner"));
  const pool = new Pool({ connectionString: env.DATABASE_URL_UNPOOLED ?? env.POSTGRES_URL_NON_POOLING, max: 1 });
  const client = await pool.connect();
  const requestId = randomUUID(), id = `new:${requestId}`;
  try {
    await client.query("BEGIN");
    await client.query(`SET LOCAL search_path TO ${schema},public`);
    assert.equal((await client.query("SELECT current_schema() AS name")).rows[0].name, schema);
    assert.equal((await client.query("SELECT 1 FROM schema_migrations WHERE version='008'")).rowCount, 1);
    assert.equal((await client.query("SELECT rolbypassrls FROM pg_roles WHERE rolname=$1", [role])).rows[0].rolbypassrls, false);
    const privileges = (await client.query(`SELECT has_table_privilege($1,'sheet_trash','SELECT') AS read,
      has_table_privilege($1,'sheet_trash','INSERT') AS insert,has_table_privilege($1,'sheet_trash','UPDATE') AS update,
      has_table_privilege($1,'sheet_trash','DELETE') AS delete,has_table_privilege($1,'sheets','DELETE') AS hard_delete,
      has_function_privilege($1,'trash_sheet(text,int,boolean)','EXECUTE') AS trash,
      has_function_privilege($1,'restore_sheet(text,uuid)','EXECUTE') AS restore`, [role])).rows[0];
    assert.deepEqual(privileges, { read: true, insert: false, update: false, delete: false, hard_delete: false, trash: true, restore: true });
    assert.equal((await client.query("SELECT relrowsecurity FROM pg_class WHERE oid='sheet_trash'::regclass")).rows[0].relrowsecurity, true);
    const admin = (await client.query("SELECT user_id FROM central_roles LIMIT 1")).rows[0]?.user_id;
    const school = (await client.query("SELECT id FROM schools WHERE id NOT LIKE '\\_\\_%' ORDER BY id LIMIT 1")).rows[0]?.id;
    assert.ok(admin && school);
    await client.query("SELECT set_config('app.user_id',$1,true)", [admin]);
    const content = initialSheet({ id, school, program: "AF", title: "Tillfälligt skräpkorgsprov" });
    await client.query("SELECT create_added_sheet($1,$2,'AF',$3,$4,$5)", [requestId, school, "Tillfälligt skräpkorgsprov", content, templateVersion(content)]);
    const before = (await client.query("SELECT content,revision FROM sheets WHERE id=$1", [id])).rows[0];
    await client.query("SELECT trash_sheet($1,0,true)", [id]);
    assert.equal((await client.query("SELECT sheet_in_trash($1) AS deleted", [id])).rows[0].deleted, true);
    const row = (await client.query("SELECT * FROM list_sheet_trash() WHERE id=$1", [id])).rows[0];
    assert.ok(row.deletionId);
    await client.query("SELECT set_config('app.user_id',$1,true)", [`verification-no-access-${randomUUID()}`]);
    await client.query("SAVEPOINT denial");
    let code;
    try { await client.query("SELECT restore_sheet($1,$2)", [id, row.deletionId]); } catch (error) { code = (error as { code?: string }).code; }
    await client.query("ROLLBACK TO SAVEPOINT denial");
    assert.equal(code, "42501");
    await client.query("SELECT set_config('app.user_id',$1,true)", [admin]);
    await client.query("SELECT restore_sheet($1,$2)", [id, row.deletionId]);
    assert.equal((await client.query("SELECT sheet_in_trash($1) AS deleted", [id])).rows[0].deleted, false);
    assert.deepEqual((await client.query("SELECT content,revision FROM sheets WHERE id=$1", [id])).rows[0], before);
    await client.query("ROLLBACK");
    assert.equal((await client.query(`SELECT 1 FROM ${schema}.sheets WHERE id=$1`, [id])).rowCount, 0);
    console.log(`PASS ${schema}: migration 008, runtime-privilegier/RLS-konfiguration, borttagning, nekad återställning och adminåterställning. Alla provdata återställda.`);
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); await pool.end(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Verifieringen misslyckades."); process.exitCode = 1; });
