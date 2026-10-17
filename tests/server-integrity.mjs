import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHmac,randomUUID} from 'node:crypto';
import {validateTemplate,newSession} from '../model.mjs';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'benchy-parent-http-'));
const origin='http://localhost:19477',secret='isolated-http-fixture-secret-'.repeat(3);
const template=validateTemplate({id:'fixture',version:1,name:'Fixture',blocks:[{id:'b',type:'single',restRound:20,exercises:[{id:'e',name:'Lift',sets:1,targets:{}}]}]});
const baseline={schemaVersion:1,revision:0,templates:[template],sessions:[],credentials:[{id:'fixture-only'}],ops:{},setupClosed:true};
await fs.writeFile(path.join(dir,'state.json'),JSON.stringify(baseline));
const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:'19477',ORIGIN:origin,RP_ID:'localhost',SESSION_SECRET:secret,BOOTSTRAP_SECRET:'isolated-bootstrap-fixture-'.repeat(3),DATA_DIR:dir,NODE_ENV:'test'},stdio:['ignore','pipe','pipe']});
let logs='';child.stdout.on('data',v=>logs+=v);child.stderr.on('data',v=>logs+=v);
const signed=Buffer.from(JSON.stringify({method:'passkey',credentialId:'fixture-only',exp:Date.now()+60000})).toString('base64url');
const cookie='benchy_session='+signed+'.'+createHmac('sha256',secret).update(signed).digest('base64url');
async function call(route,body){const r=await fetch(origin+route,{method:body===undefined?'GET':'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
const op=(type,payload)=>call('/api/op',{id:randomUUID(),type,payload});
try{
 for(let i=0;i<100&&!logs.includes('Benchy ready');i++){if(child.exitCode!==null)throw Error(logs);await new Promise(r=>setTimeout(r,30));}assert.match(logs,/Benchy ready/);
 let s=(await op('session.start',{templateId:template.id,timezone:'UTC'})).data;
 let result=await op('timer',{sessionId:s.id,version:s.version,action:'start',seconds:30});assert.equal(result.status,200);s=result.data;const deadline=s.timer.deadline;
 await new Promise(r=>setTimeout(r,50));result=await op('timer',{sessionId:s.id,version:s.version,action:'resume'});assert.equal(result.status,200);assert.equal(result.data.timer.deadline,deadline,'resume of running timer must not extend its deadline');s=result.data;
 result=await op('session.finish',{sessionId:s.id,version:s.version,confirmIncomplete:true});assert.equal(result.status,200);s=result.data;
 const before=await fs.readFile(path.join(dir,'state.json'),'utf8');
 result=await op('session.edit',{sessionId:s.id,version:s.version,notes:'must not persist',startedAt:'2099-01-01T00:00:00Z'});assert.equal(result.status,400);assert.equal(await fs.readFile(path.join(dir,'state.json'),'utf8'),before,'invalid date edit must not persist any fields');
 const input={format:'benchy-v1',templates:[],sessions:[newSession(template,'UTC')]};input.sessions[0].finishedAt=new Date().toISOString();input.sessions[0].sets.push(structuredClone(input.sessions[0].sets[0]));
 assert.equal((await call('/api/import/preview',input)).status,400);assert.equal((await op('import.apply',{data:input})).status,400);assert.equal(await fs.readFile(path.join(dir,'state.json'),'utf8'),before,'invalid import must not persist anything');
 const future=(await op('session.start',{templateId:template.id,timezone:'UTC'})).data;
 const edit=await op('session.edit',{sessionId:future.id,version:future.version,notes:'',startedAt:'2099-01-01T00:00:00Z'});assert.equal(edit.status,200);
 result=await op('session.finish',{sessionId:future.id,version:edit.data.version,confirmIncomplete:true});assert.equal(result.status,400,'cannot finish earlier than a user-edited future start');
 console.log('PASS HTTP: running timer resume is idempotent; bad date edits and imports reject with 400 and preserve exact original bytes; impossible finish rejected. All fixtures isolated.');
}finally{child.kill('SIGTERM');await new Promise(r=>child.once('exit',r));await fs.rm(dir,{recursive:true,force:true});}
