import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
await build({stdin:{contents:`export {POST as finalize} from './app/api/sheets/[id]/finalization/route';export {POST as upload} from './app/api/media/route';export {PUT as save} from './app/api/sheets/[id]/route';export {POST as lock} from './app/api/sheets/[id]/lock/route';export {GET as history} from './app/api/sheets/[id]/history/route';export {GET as list} from './app/api/sheets/route';export {readSheet} from './lib/sheets-server';export {catalog,initialSheet} from './lib/catalog';export {exampleSheet} from './lib/sheet';`,resolveDir:process.cwd(),loader:'ts'},outfile:'work/finalization-api.mjs',banner:{js:'/* eslint-disable */'},bundle:true,platform:'node',format:'esm',packages:'external',tsconfig:'tsconfig.json',plugins:[{name:'boundaries',setup(b){b.onResolve({filter:/^@\/lib\/(access|db)$/},a=>({path:a.path,namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},a=>({loader:'js',contents:a.path.endsWith('db')?`export async function transaction(user,op){await globalThis.client.query('BEGIN');try{await globalThis.client.query("SELECT set_config('app.user_id',$1,true)",[user]);const r=await op(globalThis.client);await globalThis.client.query('COMMIT');return r;}catch(e){await globalThis.client.query('ROLLBACK');throw e;}}`:`export class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}export async function identity(){if(globalThis.actor==='anonymous')throw new HttpError(401,'Logga in');return{id:globalThis.actor};}export function sameOrigin(r){if(r.headers.get('origin')!==new URL(r.url).origin)throw new HttpError(403,'Fel origin');}export async function api(op){try{return await op()}catch(e){return Response.json({error:e.message},{status:e.status??500});}}`}));}}]});
const {PGlite}=await import(pathToFileURL(path.join(process.env.TEMP,'produktblad-admin-qa/node_modules/@electric-sql/pglite/dist/index.js')).href);
const db=new PGlite();const m=await import('../work/finalization-api.mjs');globalThis.actor='owner';globalThis.client={query:async(sql,params)=>{const r=await db.query(sql,params);return {...r,rowCount:r.rows.length||r.affectedRows||0};}};
const token='00000000-0000-0000-0000-000000000001';const e=m.catalog.find(e=>e.program==='Komvux');const id=e.id;const context={params:Promise.resolve({id})};
const request=(body,method='POST',origin='http://localhost')=>new Request('http://localhost/api/sheets/'+encodeURIComponent(id),{method,headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
const transition=(finalized,revision=1,stateVersion=0,confirmed=false)=>m.finalize(request({finalized,revision,stateVersion,confirmed,token}),context);
try{
await db.exec('CREATE TABLE "user"(id text PRIMARY KEY,name text,email text);');await db.exec(await readFile('migrations/001-studio.sql','utf8'));
await db.exec(`INSERT INTO "user" VALUES('owner','Admin','admin@example.org'),('editor','Redaktör','editor@example.org'),('other','Annan skola','other@example.org');INSERT INTO central_roles VALUES('owner');`);
await db.query('INSERT INTO schools(id) VALUES($1),($2)',[e.school,'Andra skolan']);await db.query('INSERT INTO school_memberships VALUES($1,$2),($3,$4)',['editor',e.school,'other','Andra skolan']);
await db.query('INSERT INTO sheets(id,school_id,title,content,template_version,revision) VALUES($1,$2,$3,$4,$5,1)',[id,e.school,e.title,JSON.stringify(m.exampleSheet),'test']);await db.query('INSERT INTO sheet_versions(sheet_id,revision,template_version,content,changed_by) VALUES($1,1,$2,$3,$4)',[id,'test',JSON.stringify(m.exampleSheet),'owner']);
await db.exec(`CREATE ROLE qa_runtime NOBYPASSRLS;GRANT USAGE ON SCHEMA public TO qa_runtime;GRANT SELECT ON ALL TABLES IN SCHEMA public TO qa_runtime;GRANT INSERT,UPDATE ON sheets TO qa_runtime;GRANT INSERT ON sheet_versions,media TO qa_runtime;GRANT INSERT,UPDATE,DELETE ON editing_locks TO qa_runtime;SET ROLE qa_runtime;`);
assert.equal((await m.readSheet('owner',id)).finalization.available,false);assert.equal((await transition(true)).status,503);
await db.exec('RESET ROLE');await db.exec(await readFile('migrations/002-sheet-finalization.sql','utf8'));await db.exec(`GRANT SELECT ON sheet_finalizations,sheet_finalization_events TO qa_runtime;GRANT EXECUTE ON FUNCTION set_sheet_finalization(text,boolean,int,int,uuid,boolean) TO qa_runtime;SET ROLE qa_runtime;`);
await globalThis.client.query("SELECT set_config('app.user_id','owner',false)");await db.query("INSERT INTO editing_locks VALUES($1,'owner',$2,now()+interval '5 minutes')",[id,token]);
const snapshot=(await m.readSheet('owner',id,1)).content;
for(const actor of ['anonymous','editor','other']){globalThis.actor=actor;assert.equal((await transition(true)).status,actor==='anonymous'?401:403);}globalThis.actor='owner';
assert.equal((await m.finalize(request({finalized:true,revision:1,stateVersion:0,token},'POST','http://evil.example'),context)).status,403);
assert.equal((await transition(true,2)).status,409);assert.equal((await m.finalize(request({finalized:true,revision:1,stateVersion:0,token:'bad'}),context)).status,400);
assert.equal((await transition(true)).status,200);assert.deepEqual((await m.readSheet('editor',id)).content,snapshot);let state=(await m.readSheet('editor',id)).finalization;assert.equal(state.finalized,true);assert.equal(state.stateVersion,1);assert.equal(state.changedBy,'Admin');assert.equal((await transition(true)).status,409);
assert.equal((await m.save(request({content:m.exampleSheet,revision:1,token},'PUT'),context)).status,423);
const media=new FormData();media.set('sheetId',id);media.set('file',new File([new Uint8Array([255,216,255,1])],'qa.jpg',{type:'image/jpeg'}));assert.equal((await m.upload(new Request('http://localhost/api/media',{method:'POST',headers:{origin:'http://localhost'},body:media}))).status,423);assert.equal((await m.lock(request({token,renew:false}),context)).status,423);assert.equal((await m.lock(request({token,renew:true}),context)).status,423);
await globalThis.client.query("SELECT set_config('app.user_id','editor',false)");
for(const [sql,params] of [['UPDATE sheets SET title=$2 WHERE id=$1',[id,'Ändrat']],['INSERT INTO sheet_versions(sheet_id,revision,template_version,content) VALUES($1,2,$2,$3)',[id,'test','{}']],['INSERT INTO editing_locks VALUES($1,$2,$3,now())',[id,'editor',token]]])await assert.rejects(()=>db.query(sql,params),/låst av admin/);
await assert.rejects(()=>db.query('UPDATE sheet_finalizations SET finalized=false WHERE sheet_id=$1',[id]),/permission denied/);
await assert.rejects(()=>db.query('SELECT set_sheet_finalization($1,false,1,1,NULL,true)',[id]),/Endast admin/);
await globalThis.client.query("SELECT set_config('app.user_id','other',false)");assert.equal((await db.query('SELECT * FROM sheet_finalizations')).rows.length,0);assert.equal((await db.query('SELECT * FROM sheet_finalization_events')).rows.length,0);
globalThis.actor='owner';assert.equal((await transition(false,1,1,false)).status,400);assert.equal((await transition(false,1,0,true)).status,409);assert.equal((await transition(false,1,1,true)).status,200);assert.equal((await transition(false,1,1,true)).status,409);
assert.equal((await m.lock(request({token}),context)).status,200);const saved=await m.save(request({content:{...m.exampleSheet,why:'Efter upplåsning'},revision:1,token},'PUT'),context);assert.equal(saved.status,200);assert.equal((await saved.json()).revision,2);
const historical=await m.readSheet('owner',id,1);assert.deepEqual(historical.content,m.exampleSheet);assert.deepEqual(snapshot,(await m.readSheet('owner',id,1)).content);
const history=await (await m.history(new Request('http://localhost'),context)).json();assert.equal(history.events.length,2);assert.equal(history.events[0].finalized,false);assert.equal(history.events[1].finalized,true);assert.equal(history.versions.length,2);
await db.exec('RESET ROLE');await db.query("DELETE FROM central_roles WHERE user_id='owner'");await db.exec('SET ROLE qa_runtime');assert.equal((await transition(true,2,2)).status,403);
console.log('PASS: real SQL/RLS and actual API routes; pre-migration fallback; admin only; origin; revision/state conflicts; locked saves, lock acquisition/renewal and direct writes blocked; school isolation; explicit unlock confirmation; immutable audit events; old revision unchanged; save after unlock; revoked admin blocked. Isolated database only.');
}finally{await db.close();}




