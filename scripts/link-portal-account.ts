import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import { Pool } from "pg";

// Owner-only administrative action. Supply independently verified stable IDs.
async function main() {
  const [mode, file, localId, portalSub, expectedLocalEmail] = process.argv.slice(2);
  if (!['dev','prod'].includes(mode) || !file || !localId || !portalSub || !expectedLocalEmail) throw Error("Ange miljö, ägarfil, lokalt ID, verifierat portal-sub och förväntad lokal e-post.");
  const schema = mode === 'prod' ? 'studio' : 'studio_dev';
  const env = parse(readFileSync(file));
  const pool = new Pool({connectionString:env.DATABASE_URL_UNPOOLED ?? env.POSTGRES_URL_NON_POOLING,max:1});
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    await db.query(`SET LOCAL search_path TO ${schema},public`);
    const user = (await db.query('SELECT id,email FROM "user" WHERE id=$1 FOR UPDATE',[localId])).rows[0];
    if (!user || user.email !== expectedLocalEmail) throw Error('Kontot matchar inte den uttryckligt valda identiteten.');
    await db.query('INSERT INTO portal_identities(portal_sub,user_id) VALUES($1,$2)',[portalSub,localId]);
    await db.query('COMMIT');
    console.log('Uttrycklig portalidentitetskoppling skapad. Roller, skolmedlemskap och blad oförändrade.');
  } catch(error) {await db.query('ROLLBACK');throw error;}
  finally {db.release();await pool.end();}
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Kopplingen misslyckades.');process.exitCode=1;});
