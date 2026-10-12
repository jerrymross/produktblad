import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from "jose";
import { issuer } from "../lib/portal-protocol";
import { managementAudience, managementType, verifyManagementToken, requestDigest } from "../lib/portal-management";

async function main(){
  const pair=await generateKeyPair('RS256');const key=createLocalJWKSet({keys:[await exportJWK(pair.publicKey)]});const now=Math.floor(Date.now()/1000);
  const path='/api/portal/management/user',body=JSON.stringify({role:'user',schools:['Umeå'],revision:0});
  const base={iss:issuer,aud:managementAudience,sub:'actor',sid:'session',jti:'nonce',iat:now,exp:now+60,scope:'produktblad:manage',app_id:'produktblad',request_hash:requestDigest('PUT',path,body),target_sub:'target'};
  const sign=(changes={},typ=managementType)=>new SignJWT({...base,...changes}).setProtectedHeader({alg:'RS256',typ}).sign(pair.privateKey);
  await verifyManagementToken(await sign(),'PUT',path,body,key);
  for(const changes of [{iss:'wrong'},{aud:'produktblad'},{scope:'wrong'},{sid:''},{exp:now-1},{iat:now+2},{exp:now+61},{target_sub:42}])await assert.rejects(verifyManagementToken(await sign(changes),'PUT',path,body,key));
  await assert.rejects(verifyManagementToken(await sign({},'at+jwt'),'PUT',path,body,key));
  await assert.rejects(verifyManagementToken(await sign(),'POST',path,body,key));
  await assert.rejects(verifyManagementToken(await sign(),'PUT',path,body+' ',key));
  await assert.rejects(verifyManagementToken(await sign(),'PUT','/different',body,key));
  console.log('PASS: separata administrations-JWT, issuer/audience/typ/scope/expiry och bindning till metod, väg och exakt body.');
  const envDir=process.argv[2];if(!envDir)return;
  const modes=process.argv.slice(3);if(!modes.length)modes.push('dev');
  for(const mode of modes){
    if(!['dev','prod'].includes(mode))throw Error('Ange endast dev/prod.');
    const env=parse(readFileSync(`${envDir}/.env.${mode}`));const pool=new Pool({connectionString:env.APP_DATABASE_URL,max:1});const db=await pool.connect();
    try{
      await db.query('BEGIN');
      const admin=(await db.query('SELECT user_id FROM central_roles LIMIT 1')).rows[0];
      // RLS requires the actual known test/admin ID; owner reads it without modifying data.
      let actor=admin?.user_id;
      if(!actor){const ownerEnv=parse(readFileSync(`${envDir}/.env.owner`));const owner=new Pool({connectionString:ownerEnv.DATABASE_URL_UNPOOLED});actor=(await owner.query(`SELECT user_id FROM ${mode==='prod'?'studio':'studio_dev'}.central_roles LIMIT 1`)).rows[0].user_id;await owner.end();}
      await db.query("SELECT set_config('app.user_id',$1,true)",[actor]);
      const school=(await db.query("SELECT id FROM schools WHERE id<>'__templates__' LIMIT 1")).rows[0].id;
      const subject='management-rollback-test';
      const set=async(role:string,schools:string[],revision:number,confirm=false)=>(await db.query('SELECT portal_set_permissions($1,$2,$3,$4,$5,$6) profile',[subject,'Test',role,schools,revision,confirm])).rows[0].profile;
      const first=await set('user',[school],0);assert.deepEqual(first.schools,[school]);assert.equal(first.role,'user');assert.equal(first.revision,1);
      const elevated=await set('admin',[],1,true);assert.equal(elevated.role,'admin');
      const removed=await set('user',[],2);assert.equal(removed.role,'user');assert.deepEqual(removed.schools,[]);
      await db.query('SAVEPOINT invalid');await assert.rejects(set('user',['NOT-A-SCHOOL'],3),(e:{code:string})=>e.code==='22023');await db.query('ROLLBACK TO invalid');
      await db.query('SAVEPOINT stale');await assert.rejects(set('user',[],0),(e:{code:string})=>e.code==='40001');await db.query('ROLLBACK TO stale');
      await db.query('SAVEPOINT confirm');await assert.rejects(set('admin',[],3,false),(e:{code:string})=>e.code==='22023');await db.query('ROLLBACK TO confirm');
      assert.equal((await db.query('SELECT portal_management_nonce($1,$2) ok',['rollback-nonce',now+60])).rows[0].ok,true);
      assert.equal((await db.query('SELECT portal_management_nonce($1,$2) ok',['rollback-nonce',now+60])).rows[0].ok,false);
      const legacyId=randomUUID(),legacyEmail=`legacy-${legacyId}@example.org`;
      await db.query('INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt") VALUES($1,$2,$3,false,now(),now())',[legacyId,'Befintligt rollback-konto',legacyEmail]);
      const inviteHash=randomUUID();await db.query('INSERT INTO invitations(id,token_hash,email,central,school_ids) VALUES($1,$2,$3,true,$4)',[randomUUID(),inviteHash,legacyEmail,[school]]);
      await db.query('SELECT accept_invitation($1,$2,$3)',[inviteHash,legacyId,legacyEmail]);
      await db.query('SAVEPOINT unconfirmed');await assert.rejects(db.query('SELECT portal_link_identity($1,$2,$3,false)',[subject,legacyId,3]),(e:{code:string})=>e.code==='42501');await db.query('ROLLBACK TO unconfirmed');
      const linked=(await db.query('SELECT portal_link_identity($1,$2,$3,true) profile',[subject,legacyId,3])).rows[0].profile;
      assert.equal(linked.localId,legacyId);assert.equal(linked.role,'admin');assert.deepEqual(linked.schools,[school]);
      await db.query('SAVEPOINT relink');await assert.rejects(db.query('SELECT portal_link_identity($1,$2,$3,true)',[subject,first.localId,4]),(e:{code:string})=>e.code==='42501');await db.query('ROLLBACK TO relink');
      await db.query("SELECT set_config('app.user_id',$1,true)",[first.localId]);
      await db.query('SAVEPOINT denied');await assert.rejects(set('admin',[],3,true),(e:{code:string})=>e.code==='42501');await db.query('ROLLBACK TO denied');
      assert.equal((await db.query("SELECT has_table_privilege(current_user,'central_roles','INSERT') ok")).rows[0].ok,false);
      assert.equal((await db.query("SELECT has_table_privilege(current_user,'portal_permission_versions','UPDATE') ok")).rows[0].ok,false);
      await db.query('ROLLBACK');console.log(`PASS ${mode}: tilldelning/indragning, skolval, adminbekräftelse, versionskonflikt, replay, nekad själveskalering och runtime-privilegier; alla prov återställda.`);
    }finally{db.release();await pool.end();}
  }
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Test misslyckades.');process.exitCode=1;});
