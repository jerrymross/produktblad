import {readFileSync} from "node:fs";
import {parse} from "dotenv";
import {Pool} from "pg";
async function main(){
  const [mode,file]=process.argv.slice(2);if(!['dev','prod'].includes(mode)||!file)throw Error('Ange dev/prod och ägarfil.');
  const schema=mode==='prod'?'studio':'studio_dev',role=`${schema}_app`,env=parse(readFileSync(file));const pool=new Pool({connectionString:env.DATABASE_URL_UNPOOLED??env.POSTGRES_URL_NON_POOLING,max:1});const db=await pool.connect();
  try{await db.query('BEGIN');await db.query(`SET LOCAL search_path TO ${schema},public`);if((await db.query('SELECT current_schema() s')).rows[0].s!==schema)throw Error('Fel schema.');await db.query("SELECT pg_advisory_xact_lock(hashtext($1))",[`${schema}:migrations`]);
    if(!(await db.query("SELECT 1 FROM schema_migrations WHERE version='006'")).rowCount){await db.query(readFileSync('migrations/006-portal-embed.sql','utf8'));await db.query("INSERT INTO schema_migrations(version) VALUES('006')");}
    await db.query(`GRANT SELECT,INSERT,DELETE ON portal_embed_tickets TO ${role}`);await db.query('COMMIT');console.log(`Inbäddningsmigration aktiverad i ${schema}.`);
  }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}
}main().catch(error=>{console.error(error instanceof Error?error.message:'Migration misslyckades.');process.exitCode=1;});
