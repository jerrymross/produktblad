import {readFileSync,writeFileSync,existsSync} from "node:fs";
import {randomBytes,randomUUID,createHash} from "node:crypto";
import {Pool} from "pg";
import {betterAuth} from "better-auth";
import {getMigrations} from "better-auth/db/migration";
import {parse} from "dotenv";
import rows from "../fixtures/produktblad.json";

async function main() {
const mode=process.argv[2];if(mode!=="dev"&&mode!=="prod")throw new Error("Choose dev or prod");
const schema=mode==="dev"?"studio_dev":"studio";const role=`${schema}_app`;
const owner=parse(readFileSync(".env.owner"));
const connection=owner.DATABASE_URL_UNPOOLED??owner.POSTGRES_URL_NON_POOLING;
if(!connection)throw new Error("Owner database URL missing");
const runtimeFile=`.env.${mode}`;const runtime=existsSync(runtimeFile)?parse(readFileSync(runtimeFile)):{};
const password=runtime.APP_DATABASE_URL?decodeURIComponent(new URL(runtime.APP_DATABASE_URL).password):randomBytes(32).toString("hex");
const admin=new Pool({connectionString:connection,max:1});
await admin.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
await admin.query(`SET search_path TO ${schema},public`);
const auth=betterAuth({database:admin,secret:"migration-only-secret-with-thirty-two-characters",emailAndPassword:{enabled:true},rateLimit:{enabled:true,storage:"database"}});
const migration=await getMigrations(auth.options);await migration.runMigrations();
const exists=await admin.query("SELECT to_regclass($1) AS name",[`${schema}.schema_migrations`]);
if(!exists.rows[0].name){await admin.query("BEGIN");try{await admin.query(readFileSync("migrations/001-studio.sql","utf8"));await admin.query("INSERT INTO schema_migrations(version) VALUES('001')");await admin.query("COMMIT");}catch(error){await admin.query("ROLLBACK");throw error;}}
for(const school of [...new Set(rows.map(row=>row.school)),"__templates__"]){await admin.query("INSERT INTO schools(id) VALUES($1) ON CONFLICT DO NOTHING",[school]);}
const roleExists=await admin.query("SELECT 1 FROM pg_roles WHERE rolname=$1",[role]);
if(!roleExists.rowCount)await admin.query(`CREATE ROLE ${role} LOGIN PASSWORD '${password}' NOBYPASSRLS`);
await admin.query(`GRANT USAGE ON SCHEMA ${schema} TO ${role}`);
await admin.query(`ALTER ROLE ${role} SET search_path TO ${schema},public`);
await admin.query(`GRANT SELECT,INSERT,UPDATE,DELETE ON "user",session,account,verification,"rateLimit" TO ${role}`);
await admin.query(`GRANT SELECT ON ALL TABLES IN SCHEMA ${schema} TO ${role}`);
await admin.query(`GRANT INSERT,UPDATE ON sheets TO ${role}`);
await admin.query(`GRANT INSERT ON sheet_versions,media,invitations TO ${role}`);
await admin.query(`GRANT INSERT,UPDATE,DELETE ON editing_locks,library_images TO ${role}`);
await admin.query(`GRANT EXECUTE ON FUNCTION accept_invitation(text,text,text) TO ${role}`);
const appURL=new URL(owner.DATABASE_URL);appURL.username=role;appURL.password=password;
const secret=runtime.BETTER_AUTH_SECRET??randomBytes(48).toString("hex");
writeFileSync(runtimeFile,`APP_DATABASE_URL=${appURL.toString()}\nDATABASE_SCHEMA=${schema}\nBETTER_AUTH_SECRET=${secret}\nBETTER_AUTH_URL=${mode==="prod"?"https://produktblad.vercel.app":"http://localhost:3000"}\n`);
if(mode==="dev")writeFileSync(".env.local",readFileSync(runtimeFile));
const email=process.env.INITIAL_ADMIN_EMAIL??(mode==="dev"?"studio-test@example.org":undefined);
const invitations=await admin.query("SELECT 1 FROM central_roles");
if(!invitations.rowCount){if(!email)throw new Error("Set INITIAL_ADMIN_EMAIL before creating the first production invitation");const token=randomBytes(32).toString("hex");await admin.query("INSERT INTO invitations(id,token_hash,email,central) VALUES($1,$2,$3,true)",[randomUUID(),createHash("sha256").update(token).digest("hex"),email]);writeFileSync(`.invite-${mode}`,token);}
await admin.end();
console.log(`Schema ${schema} migrated; isolated runtime role configured. Secrets saved only in ignored environment files.`);

}
main().catch(error=>{console.error(error.message);process.exit(1);});
