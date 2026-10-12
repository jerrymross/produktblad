import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parse} from 'dotenv';
import {Pool} from 'pg';
import puppeteer from 'puppeteer-core';
const [portalDir,envDir]=process.argv.slice(2);if(!portalDir||!envDir)throw Error('Ange portalens kodkatalog och Produktblads privata miljökatalog. Provet skriver bara separata syntetiska testidentiteter.');
Object.assign(process.env,parse(readFileSync(resolve(portalDir,'.env.production.local'))),{NODE_ENV:'production',APP_URL:'https://astar-studio-portal.vercel.app'});
const {getRuntime}=await import(pathToFileURL(resolve(portalDir,'lib/runtime.mjs')).href);
const {issueManagementToken}=await import(pathToFileURL(resolve(portalDir,'lib/sso.mjs')).href);
const {requestDigest}=await import(pathToFileURL(resolve(portalDir,'lib/productblad-management.mjs')).href);
const runtime=await getRuntime(),ownerEnv=parse(readFileSync(resolve(envDir,'.env.owner')));
const pb=new Pool({connectionString:ownerEnv.DATABASE_URL_UNPOOLED??ownerEnv.POSTGRES_URL_NON_POOLING,max:1});
const portal='https://astar-studio-portal.vercel.app',product='https://produktblad.vercel.app',run=randomUUID();
const password=randomBytes(32).toString('hex'),actors=[],targets=[],localIds=[],subjects=[];let browser;
const passes=[];const pass=s=>{passes.push(s);console.log('PASS:',s);};
const digestRows=async()=>createHash('sha256').update(JSON.stringify((await pb.query(`SELECT * FROM (SELECT 'sheets' kind,to_jsonb(s) data FROM studio.sheets s UNION ALL SELECT 'versions',to_jsonb(v) FROM studio.sheet_versions v UNION ALL SELECT 'schools',to_jsonb(s) FROM studio.school_memberships s UNION ALL SELECT 'roles',to_jsonb(r) FROM studio.central_roles r) snapshot ORDER BY kind,data::text`)).rows)).digest('hex');
const before=await digestRows();
const portalPost=async(cookie,path,body,method='POST')=>fetch(portal+path,{method,headers:{Cookie:cookie,Origin:portal,'Content-Type':'application/json'},body:JSON.stringify(body)});
const login=async(user)=>{const response=await portalPost('', '/api/auth/sign-in/email',{email:user.email,password,rememberMe:false});assert.equal(response.status,200);const json=await response.json();return {cookie:response.headers.getSetCookie().map(c=>c.split(';')[0]).join('; '),token:json.token};};
const portalGet=(cookie,path)=>fetch(portal+path,{headers:{Cookie:cookie}});
const browserCookie=async(page,origin)=>(await page.browserContext().cookies(origin)).map(c=>`${c.name}=${c.value}`).join('; ');
async function profile(cookie,target){const r=await portalGet(cookie,'/api/admin/produktblad/users/'+target.id);assert.equal(r.status,200);return r.json();}
async function set(cookie,target,role,schools,rev,confirmed=false){return portalPost(cookie,'/api/admin/produktblad/users/'+target.id,{role,schools,revision:rev,confirmAdmin:confirmed},'PUT');}
async function createActor(linked){const email=`pb-manager-${run}-${actors.length}@example.org`;const user=(await runtime.auth.api.createUser({body:{name:'Tillfällig portaladministratör',email,password,role:'admin'}})).user;actors.push(user);await runtime.db.run('INSERT INTO portal_members VALUES (?,1,NULL)',user.id);if(linked){const id=randomUUID();localIds.push(id);subjects.push(user.id);await pb.query('INSERT INTO studio."user"(id,name,email,"emailVerified","createdAt","updatedAt") VALUES($1,$2,$3,false,now(),now())',[id,'Tillfällig behörighetsadmin',email]);await pb.query('INSERT INTO studio.central_roles VALUES($1)',[id]);await pb.query('INSERT INTO studio.portal_identities(portal_sub,user_id) VALUES($1,$2)',[user.id,id]);}return user;}
try{
 const admin=await createActor(true),unlinkedAdmin=await createActor(false);const adminLogin=await login(admin),unlinked=await login(unlinkedAdmin);
 assert.equal((await portalGet(unlinked.cookie,'/api/admin/produktblad')).status,403);pass('Portal-admin utan lokal adminlänk kan inte läsa eller ändra Produktblads rättigheter.');
 const directoryResponse=await portalGet(adminLogin.cookie,'/api/admin/produktblad');assert.equal(directoryResponse.status,200);const directory=await directoryResponse.json();assert.ok(directory.schools.length>0);const school=directory.schools.find(s=>s==='Umeå')??directory.schools[0];
 browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox','--disable-gpu'],protocolTimeout:60000});const context=await browser.createBrowserContext(),page=await context.newPage();await page.setViewport({width:1440,height:1000});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(portal+'/?admin=1',{waitUntil:'domcontentloaded',timeout:60000});await page.waitForSelector('#login-form');await page.type('[name=email]',admin.email);await page.type('[name=password]',password);await page.click('#login-form [type=submit]');await page.waitForSelector('#add',{timeout:60000});await page.click('#add');await page.waitForSelector('[name=productbladRole]');
 const targetEmail=`pb-member-${run}@example.org`;
 await page.type('#modal [name=name]','Tillfällig Produktblad-medlem');await page.type('#modal [name=email]',targetEmail);await page.click('#modal [name=appIds][value=produktblad]');
 await page.evaluate(value=>{const input=[...document.querySelectorAll('[name=productbladSchools]')].find(e=>e.value===value);input.click();},school);
 await page.screenshot({path:'work/portal-invite-permissions.png',fullPage:true});await page.click('#modal [type=submit]');await page.waitForSelector('#invite-link',{timeout:60000});
 const target=await runtime.db.get('SELECT id,email,name FROM "user" WHERE email=?',targetEmail);assert.ok(target);targets.push(target);subjects.push(target.id);
 const invite=await page.$eval('#invite-link',e=>e.value);const reset=await portalPost('', '/api/auth/reset-password',{token:new URL(invite).searchParams.get('token'),newPassword:password});assert.equal(reset.status,200);
 let access=await profile(adminLogin.cookie,target);localIds.push(access.localId);assert.equal(access.role,'user');assert.deepEqual(access.schools,[school]);
 pass('Verklig portalbrowser: en inbjudan tilldelar vald Produktblad-skola utan separat Produktblad-inbjudan.');
 const targetLogin=await login(target);assert.equal((await portalGet(targetLogin.cookie,'/api/admin/produktblad')).status,403);
 const memberContext=await browser.createBrowserContext(),member=await memberContext.newPage();for(const c of targetLogin.cookie.split('; ')){const [name,...value]=c.split('=');await memberContext.setCookie({name,value:value.join('='),url:portal,httpOnly:true,secure:true,sameSite:'Lax'});}
 await member.goto(product+'/api/portal/login',{waitUntil:'networkidle0',timeout:60000});const memberCookie=await browserCookie(member,product);
 const me=async()=>fetch(product+'/api/me',{headers:{Cookie:memberCookie}}).then(r=>r.json());assert.deepEqual((await me()).schools,[school]);assert.equal((await me()).admin,false);
 pass('Produktblad använder tilldelningen direkt vid första SSO-inloggning; vanlig medlem kan inte administrera.');
 // Actual portal dialog edits; no mocked permissions requests.
 await page.click('#modal .close');await page.evaluate(id=>[...document.querySelectorAll('[data-user]')].find(e=>e.dataset.user===id).click(),target.id);await page.click('#manage-productblad');await page.waitForSelector('#productblad-form');
 await page.select('[name=productbladRole]','admin');await page.click('[name=confirmProductbladAdmin]');await page.screenshot({path:'work/portal-manage-permissions.png',fullPage:true});
 await page.click('#productblad-form [type=submit]');await page.waitForFunction(()=>document.querySelector('#toast')?.textContent.includes('rättigheter är sparade'),{timeout:30000});await page.waitForSelector('#productblad-form');
 access=await profile(adminLogin.cookie,target);assert.equal(access.role,'admin');assert.equal((await me()).admin,true);
 let result=await set(adminLogin.cookie,target,'user',[],access.revision);assert.equal(result.status,200);access=await result.json();assert.equal((await me()).admin,false);assert.deepEqual((await me()).schools,[]);
 const existing=(await pb.query('SELECT id,revision FROM studio.sheets WHERE school_id=$1 AND revision>0 LIMIT 1',[school])).rows[0];assert.ok(existing);
 assert.equal((await fetch(product+'/api/sheets/b_'+Buffer.from(existing.id).toString('base64url'),{headers:{Cookie:memberCookie}})).status,403);
 assert.equal((await fetch(product+'/api/pdf',{method:'POST',headers:{Origin:product,Cookie:memberCookie,'Content-Type':'application/json'},body:JSON.stringify({id:existing.id,revision:existing.revision})})).status,403);
 pass('Admin tilldelas uttryckligen i portalens dialog; nedgradering och indragna skolor stoppar samma aktiva Produktblad-session och PDF.');
 assert.equal((await set(adminLogin.cookie,target,'admin',[],access.revision,false)).status,400);
 assert.equal((await set(adminLogin.cookie,target,'user',['NOT-A-SCHOOL'],access.revision)).status,400);
 assert.equal((await set(adminLogin.cookie,target,'user',[school],0)).status,409);
 // Controlled linking to a separate legacy test account, with its original role/schools preserved.
 const legacy=randomUUID();localIds.push(legacy);await pb.query('INSERT INTO studio."user"(id,name,email,"emailVerified","createdAt","updatedAt") VALUES($1,$2,$3,false,now(),now())',[legacy,'Befintligt tillfälligt konto',`legacy-${run}@example.org`]);await pb.query('INSERT INTO studio.school_memberships VALUES($1,$2)',[legacy,school]);
 result=await portalPost(adminLogin.cookie,'/api/admin/produktblad/users/'+target.id+'/link',{localId:legacy,revision:access.revision,confirmed:true});assert.equal(result.status,200);access=await result.json();assert.equal(access.localId,legacy);assert.deepEqual(access.schools,[school]);assert.deepEqual((await me()).schools,[school]);
 assert.equal((await portalPost(adminLogin.cookie,'/api/admin/produktblad/users/'+target.id+'/link',{localId:localIds[0],revision:access.revision,confirmed:true})).status,403);
 pass('Uttrycklig kontolänk bevarar befintliga skolrättigheter; okända skolor, obekräftad admin, stale revision och farlig omlänkning nekas.');
 const actorSession=await runtime.db.get('SELECT id FROM session WHERE token=?',adminLogin.token);assert.ok(actorSession);
 const path='/api/portal/management/user',payload=JSON.stringify({role:'user',schools:[school],revision:access.revision,confirmAdmin:false});
 const mgToken=await issueManagementToken(runtime.db,admin.id,actorSession.id,requestDigest('PUT',path,payload),target.id);
 const direct=(body=payload)=>fetch(product+path,{method:'PUT',headers:{Authorization:`Bearer ${mgToken}`,'Content-Type':'application/json'},body});
 assert.equal((await direct(payload+' ')).status,401);assert.equal((await direct()).status,200);assert.equal((await direct()).status,409);
 const revokedToken=await issueManagementToken(runtime.db,admin.id,actorSession.id,requestDigest('GET','/api/portal/management/directory'));
 await runtime.db.run('UPDATE "user" SET role=? WHERE id=?','user',admin.id);
 assert.equal((await fetch(product+'/api/portal/management/directory',{headers:{Authorization:`Bearer ${revokedToken}`}})).status,401);
 await runtime.db.run('UPDATE "user" SET role=? WHERE id=?','admin',admin.id);
 pass('Signerad request-body kan inte ändras, engångsanrop kan inte återanvändas och indragen portal-adminroll stoppar redan utfärdat management-token.');
 const self=await profile(adminLogin.cookie,admin);assert.equal((await set(adminLogin.cookie,admin,'user',[],self.revision)).status,403);
 assert.deepEqual(errors,[]);writeFileSync('work/portal-management-results.json',JSON.stringify({time:new Date().toISOString(),passes},null,2));
 pass('Självdemotion nekas; inga JavaScriptfel i den verifierade portalbrowsern.');
}catch(error){console.error('Testgräns:',error.message);throw error;}finally{
 if(browser)await browser.close();
 for(const subject of subjects){await pb.query('DELETE FROM studio.portal_permission_audit WHERE portal_sub=$1',[subject]);await pb.query('DELETE FROM studio.portal_permission_versions WHERE portal_sub=$1',[subject]);await pb.query('DELETE FROM studio.portal_sessions WHERE portal_sub=$1',[subject]);await pb.query('DELETE FROM studio.portal_identities WHERE portal_sub=$1',[subject]);}
 for(const id of localIds){await pb.query('DELETE FROM studio.editing_locks WHERE user_id=$1',[id]);await pb.query('DELETE FROM studio."user" WHERE id=$1',[id]);}
 for(const user of [...targets,...actors]){await runtime.db.run("DELETE FROM verification WHERE identifier LIKE 'reset-password:%' AND value=?",user.id);await runtime.db.run('DELETE FROM portal_audit WHERE actor=? OR target=?',user.id,user.id);await runtime.db.run('DELETE FROM "user" WHERE id=? AND email=?',user.id,user.email);}
 assert.equal(await digestRows(),before,'Befintliga blad/versioner/roller/skolmedlemskap måste vara exakt bevarade.');console.log('PASS: befintlig produktion bevarad byte för byte i databassnapshot, endast egna syntetiska prov återställda.');await pb.end();await runtime.close();
}
