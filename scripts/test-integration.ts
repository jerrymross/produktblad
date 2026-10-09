import { sheetApiPath } from "../lib/sheet-id";
import {readFileSync,writeFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import assert from "node:assert/strict";
import {catalog} from "../lib/catalog";
import {Pool} from "pg";
import {parse} from "dotenv";
const origin=process.env.TEST_ORIGIN??"http://localhost:3000";
const password=readFileSync(".test-password","utf8").trim();
const emailAdmin=process.env.TEST_EMAIL??"studio-test@example.org";
const inviteFile=process.env.TEST_INVITE_FILE??".invite-dev";
function session(){let cookie="";return async(path:string,method="GET",body?:unknown)=>{const result=await fetch(origin+path,{method,headers:{origin,cookie,"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body),redirect:"manual"});const set=result.headers.getSetCookie();if(set.length)cookie=set.map(value=>value.split(";")[0]).join("; ");return result;};}
async function main(){
  if(origin==="http://localhost:3000"){const env=parse(readFileSync(".env.owner"));const cleanup=new Pool({connectionString:env.DATABASE_URL_UNPOOLED});await cleanup.query("DELETE FROM studio_dev.editing_locks");await cleanup.end();}
  const admin=session();
  const login=await admin("/api/auth/sign-in/email","POST",{email:emailAdmin,password});
  if(login.status!==200){const accept=await admin("/api/invitations/accept","POST",{token:readFileSync(inviteFile,"utf8").trim(),name:"Testadministratör",password});assert.equal(accept.status,200,await accept.text());assert.equal((await admin("/api/auth/sign-in/email","POST",{email:emailAdmin,password})).status,200);}
  assert.equal((await fetch(origin+"/api/sheets")).status,401);
  assert.equal((await admin("/api/auth/sign-up/email","POST",{email:"bad@example.org",password,name:"Bad"})).status,403);
  const me=await (await admin("/api/me")).json();assert.equal(me.admin,true);
  const id="example";const url=sheetApiPath(id);
  const current=await(await admin(url)).json();let token=randomUUID();const rival=randomUUID();
  const locks=await Promise.all([admin(url+"/lock","POST",{token}),admin(url+"/lock","POST",{token:rival})]);
  assert.deepEqual(locks.map(result=>result.status).sort(),[200,409]);
  if(locks[0].status!==200)token=rival;
  const savedResponse=await admin(url,"PUT",{token,revision:current.revision,content:{...current.content,intro:"Integrationstest ÅÄÖ – sparas gemensamt"}});
  assert.equal(savedResponse.status,200,await savedResponse.clone().text());const saved=await savedResponse.json();
  assert.equal(saved.revision,current.revision+1);
  const loaded=await(await admin(url)).json();assert.equal(loaded.content.intro,saved.content.intro);
  assert.equal((await admin(url,"PUT",{token,revision:current.revision,content:current.content})).status,409);
  assert.equal((await admin(url,"PUT",{token:randomUUID(),revision:saved.revision,content:saved.content})).status,409);
  const versions=await(await admin(url+"/history")).json();assert.equal(versions.versions[0].revision,saved.revision);
  const school=catalog[0].school;const other=catalog.find(item=>item.school!==school)!;
  const email=`school-${randomUUID()}@example.org`;
  const invitation=await(await admin("/api/invitations","POST",{email,central:false,schools:[school]})).json();
  const editor=session();assert.equal((await editor("/api/invitations/accept","POST",{token:new URL(invitation.url).searchParams.get("invite"),name:"Skoltest",password})).status,200);
  assert.equal((await editor("/api/auth/sign-in/email","POST",{email,password})).status,200);
  assert.equal((await editor(sheetApiPath(catalog[0].id))).status,200);
  assert.equal((await editor(sheetApiPath(other.id))).status,403);
  assert.equal((await editor(url)).status,403);
  assert.equal((await editor("/api/invitations","POST",{email:"bad@example.org",central:true,schools:[]})).status,403);
  const png="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
  const image=await admin("/api/images","POST",{education:"kock",slot:1,name:"test.png",dataUrl:png});assert.equal(image.status,200,await image.text());
  const images=await(await editor("/api/images")).json();const testImage=images.images.find((image:{education:string})=>image.education==="kock");assert.ok(testImage);
  assert.equal((await editor(testImage.dataUrl)).status,200);assert.equal((await fetch(origin+testImage.dataUrl)).status,401);
  assert.equal((await editor("/api/images","DELETE",{id:testImage.id})).status,403);
  const pdf=await admin("/api/pdf","POST",{id,revision:saved.revision});assert.equal(pdf.status,200,await pdf.clone().text());
  writeFileSync("../../work/integration.pdf",Buffer.from(await pdf.arrayBuffer()));
  await admin(url+"/lock","DELETE",{token});
  assert.equal((await admin("/api/auth/sign-out","POST",{})).status,200);
  assert.equal((await admin("/api/sheets")).status,401);
  console.log("PASS: login, closed signup, anonymous denial, shared save/reload, stale revisions, competing locks, history, school authorization, invitations, private images, PDF and logout.");
}
main().catch(error=>{console.error(error.stack);process.exit(1);});
