import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import type {PoolClient} from 'pg';
import {queryAdminOverview} from '../lib/admin-overview';
const modulePath=path.join(process.env.TEMP!,'produktblad-admin-qa/node_modules/@electric-sql/pglite/dist/index.js');
const {PGlite}=await import(pathToFileURL(modulePath).href);
const db=new PGlite();
try{
await db.exec(`CREATE TABLE "user" (id text PRIMARY KEY,name text,email text,"createdAt" timestamptz DEFAULT now());`);
await db.exec(await readFile('migrations/001-studio.sql','utf8'));
await db.exec(`INSERT INTO "user"(id,name,email) VALUES('owner','Jerry Ross','jerrymross@gmail.com'),('editor','Anna Åberg','anna@example.org'),('new-admin','Ny admin','new-admin@example.org'),('new-user','Ny användare','new-user@example.org');
INSERT INTO central_roles VALUES('owner');INSERT INTO schools(id) VALUES('Umeå'),('Luleå');INSERT INTO school_memberships VALUES('editor','Umeå'),('editor','Luleå');
INSERT INTO sheets(id,school_id,title,template_version,content) VALUES('sheet-a','Umeå','Kock','test','{}'),('sheet-b','Luleå','VVS-montör','test','{}');
INSERT INTO sheet_versions(sheet_id,revision,template_version,content,changed_by,created_at) SELECT 'sheet-a',i,'test','{}','editor',now()-interval '1 minute'*i FROM generate_series(1,105) i;
INSERT INTO sheet_versions VALUES('sheet-b',1,'test','{}',NULL,now());
INSERT INTO invitations(id,token_hash,email,central,school_ids,expires_at,used_at) VALUES
('00000000-0000-0000-0000-000000000001','admin-token','new-admin@example.org',true,'{}',now()+interval '1 day',NULL),
('00000000-0000-0000-0000-000000000002','user-token','new-user@example.org',false,ARRAY['Umeå'],now()+interval '1 day',NULL),
('00000000-0000-0000-0000-000000000003','expired-token','expired@example.org',false,ARRAY['Luleå'],now()-interval '1 day',NULL);
CREATE ROLE qa_runtime NOBYPASSRLS;GRANT USAGE ON SCHEMA public TO qa_runtime;GRANT SELECT ON ALL TABLES IN SCHEMA public TO qa_runtime;GRANT EXECUTE ON FUNCTION accept_invitation(text,text,text) TO qa_runtime;SET ROLE qa_runtime;`);
const client={query:(text:string,params?:unknown[])=>db.query(text,params)} as unknown as Pick<PoolClient,'query'>;
for(const user of ['', 'editor']){await db.query("SELECT set_config('app.user_id',$1,false)",[user]);await assert.rejects(()=>queryAdminOverview(client),e=>(e as {status:number}).status===403);}
await db.query("SELECT set_config('app.user_id',$1,false)",['owner']);
const result=await queryAdminOverview(client);assert.equal(result.members.length,4);assert.equal(result.members.find(m=>m.id==='owner')?.role,'admin');assert.deepEqual(result.members.find(m=>m.id==='editor')?.schools,['Luleå','Umeå']);assert.equal(result.activity.length,100);assert.equal(result.activity[0].title,'VVS-montör');assert.equal(result.activity[0].changedBy,null);assert.equal(result.activity[1].name,'Anna Åberg');assert.equal(result.invitations.find(i=>i.email==='expired@example.org')?.status,'expired');assert.ok(result.invitations.every(i=>!('token_hash' in i)));
await assert.rejects(()=>db.query("INSERT INTO central_roles VALUES('editor')"),e=>(e as {code:string}).code==='42501');
await db.query("SELECT set_config('app.user_id',$1,false)",['new-user']);await db.query('SELECT accept_invitation($1,$2,$3)',['user-token','new-user','new-user@example.org']);await assert.rejects(()=>queryAdminOverview(client),e=>(e as {status:number}).status===403);
await db.query("SELECT set_config('app.user_id',$1,false)",['new-admin']);await db.query('SELECT accept_invitation($1,$2,$3)',['admin-token','new-admin','new-admin@example.org']);const accepted=await queryAdminOverview(client);assert.equal(accepted.members.find(m=>m.id==='new-admin')?.role,'admin');assert.deepEqual(accepted.members.find(m=>m.id==='new-user')?.schools,['Umeå']);assert.equal(accepted.invitations.filter(i=>i.status==='accepted').length,2);
await mkdir('work',{recursive:true});await writeFile('work/admin-overview-fixture.json',JSON.stringify(accepted,null,2));console.log('PASS: actual isolated Postgres SQL and original migration/RLS, anonymous/editor denied, admin role and school aggregation, latest 100 versions and attribution, missing author, invitation statuses, no tokens, protected roles, admin/user invitations accepted correctly. No Neon connection.');
}finally{await db.close();}
