import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { parse } from "dotenv";
async function main() {
  const [mode, file] = process.argv.slice(2);
  if (!['dev','prod'].includes(mode) || !file) throw Error("Ange dev/prod och privat ägarfil.");
  const schema=mode==='prod'?'studio':'studio_dev',role=`${schema}_app`;
  const env=parse(readFileSync(file));
  const pool=new Pool({connectionString:env.DATABASE_URL_UNPOOLED??env.POSTGRES_URL_NON_POOLING,max:1});const db=await pool.connect();
  try {
    await db.query('BEGIN');await db.query(`SET LOCAL search_path TO ${schema},public`);
    if((await db.query('SELECT current_schema() s')).rows[0].s!==schema)throw Error('Fel schema.');
    await db.query("SELECT pg_advisory_xact_lock(hashtext($1))",[`${schema}:migrations`]);
    if(!(await db.query("SELECT 1 FROM schema_migrations WHERE version='004'")).rowCount)throw Error('Aktivera SSO först.');
    if(!(await db.query("SELECT 1 FROM schema_migrations WHERE version='005'")).rowCount){
      await db.query(readFileSync('migrations/005-portal-management.sql','utf8').replaceAll('__SCHEMA__',schema));
      await db.query("INSERT INTO schema_migrations(version) VALUES('005')");
    }
    await db.query(`GRANT SELECT ON portal_permission_audit TO ${role}`);
    await db.query(`GRANT EXECUTE ON FUNCTION portal_permission_profile(text),portal_management_nonce(text,bigint),portal_set_permissions(text,text,text,text[],int,boolean),portal_link_identity(text,text,int,boolean) TO ${role}`);
    await db.query(`REVOKE INSERT,UPDATE,DELETE ON portal_permission_versions,portal_management_nonces,portal_permission_audit,portal_identities,central_roles,school_memberships FROM ${role}`);
    await db.query('COMMIT');console.log(`Migration 005 aktiverad i ${schema}; befintliga rättigheter och blad bevarade.`);
  }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Migrationen misslyckades.');process.exitCode=1;});
