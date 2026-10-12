import {readFileSync,writeFileSync} from 'node:fs';
import {Pool} from 'pg';
import {parse} from 'dotenv';
import {randomUUID} from 'node:crypto';
import {catalog,initialSheet} from '../lib/catalog';
import {templateVersion,type SheetData} from '../lib/sheet';
import {ensureSheet,privateImage,validateContent} from '../lib/sheets-server';
import rows from '../fixtures/umea-content.json';

async function main(){
 const mode=process.argv[2];if(mode!=='dev'&&mode!=='prod')throw Error('Ange dev eller prod.');
 const apply=process.argv.includes('--apply');const dir=process.argv[3];if(!dir||dir.startsWith('--'))throw Error('Ange katalogen med befintliga .env.owner/.env.dev/.env.prod.');
 const schema=mode==='dev'?'studio_dev':'studio';const ownerEnv=parse(readFileSync(`${dir}/.env.owner`));const runtimeEnv=parse(readFileSync(`${dir}/.env.${mode}`));
 const owner=new Pool({connectionString:ownerEnv.DATABASE_URL_UNPOOLED??ownerEnv.POSTGRES_URL_NON_POOLING,max:1});const runtime=new Pool({connectionString:runtimeEnv.APP_DATABASE_URL,max:1});
 try{
 const actor=(await owner.query(`SELECT r.user_id FROM ${schema}.central_roles r JOIN ${schema}."user" u ON u.id=r.user_id WHERE $1='dev' OR lower(u.email) IN('jerrymross@gmail.com','jerry.ross@astar.se') ORDER BY u.email LIMIT 1`,[mode])).rows[0]?.user_id;
 if(!actor)throw Error('Användarens verifierade adminkonto kunde inte hittas.');
 const client=await runtime.connect();const report=[];const before=[];
 try{
 await client.query('BEGIN');await client.query("SELECT set_config('app.user_id',$1,true)",[actor]);
 const identity=(await client.query('SELECT current_schema() AS schema,is_central() AS admin')).rows[0];if(identity.schema!==schema||!identity.admin)throw Error('Fel schema eller adminbehörighet.');
 const matches=rows.map(row=>({row,entry:catalog.find(e=>e.school==='Umeå'&&e.program==='Komvux'&&e.title===row.title)!})).sort((a,b)=>a.entry.id.localeCompare(b.entry.id));
 if(matches.length!==14||matches.some(m=>!m.entry)||new Set(matches.map(m=>m.entry.id)).size!==14)throw Error('Importens matchning är inte komplett och unik.');
 for(const {row,entry}of matches){
  await ensureSheet(client,entry.id);
  const current=(await client.query('SELECT * FROM sheets WHERE id=$1 FOR UPDATE',[entry.id])).rows[0];before.push(current);
  if((await client.query('SELECT 1 FROM sheet_finalizations WHERE sheet_id=$1 AND finalized',[entry.id])).rowCount)throw Error(`${entry.title} är låst av admin. Ingen import genomfördes.`);
  if((await client.query('SELECT 1 FROM editing_locks WHERE sheet_id=$1 AND expires_at>clock_timestamp() FOR UPDATE',[entry.id])).rowCount)throw Error(`${entry.title} har en aktiv redigeringssession. Ingen import genomfördes.`);
  const base:SheetData=current.revision>0?current.content:initialSheet(entry);
  const content:SheetData={...base,...row.fields as Partial<SheetData>,layout:'umea',qrUrl:'http://astar.se/umea'};validateContent(content);
  if(JSON.stringify(content)===JSON.stringify(current.content)&&current.revision>0&&current.template_version===templateVersion(content)){report.push({title:entry.title,status:'oförändrat',revision:current.revision});continue;}
  const token=randomUUID();await client.query("INSERT INTO editing_locks(sheet_id,user_id,token,expires_at) VALUES($1,$2,$3,clock_timestamp()+interval '120 seconds') ON CONFLICT(sheet_id) DO UPDATE SET user_id=$2,token=$3,expires_at=EXCLUDED.expires_at",[entry.id,actor,token]);
  content.image=await privateImage(client,content.image,entry.school);
  const lock=await client.query('SELECT 1 FROM editing_locks WHERE sheet_id=$1 AND token=$2 AND user_id=$3 AND expires_at>clock_timestamp() FOR UPDATE',[entry.id,token,actor]);if(!lock.rowCount)throw Error('Redigeringslåset gick ut.');
  const version=templateVersion(content);const result=await client.query('UPDATE sheets SET content=$2,template_version=$3,revision=revision+1,updated_at=now(),updated_by=$4 WHERE id=$1 AND revision=$5 RETURNING revision',[entry.id,content,version,actor,current.revision]);if(!result.rowCount)throw Error('Bladversionen har ändrats.');
  const revision=result.rows[0].revision;await client.query('INSERT INTO sheet_versions(sheet_id,revision,template_version,content,changed_by) VALUES($1,$2,$3,$4,$5)',[entry.id,revision,version,content,actor]);
  await client.query('DELETE FROM editing_locks WHERE sheet_id=$1 AND token=$2',[entry.id,token]);report.push({title:entry.title,status:'inlagt',revision});
 }
 writeFileSync(`work/umea-import/${mode}-before.json`,JSON.stringify(before,null,2),'utf8');
 await client.query(apply?'COMMIT':'ROLLBACK');writeFileSync(`work/umea-import/${mode}-${apply?'applied':'dry-run'}.json`,JSON.stringify(report,null,2),'utf8');
 console.log(`${mode}: ${apply?'Sparat':'Provkört och återställt'} ${report.length} Umeå-blad. Tidigare historia och bilder bevaras.`,report);
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }finally{await owner.end();await runtime.end();}
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Importen misslyckades.');process.exitCode=1;});
