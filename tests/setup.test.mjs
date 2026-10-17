import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const script=new URL('../scripts/setup.mjs',import.meta.url);
test('setup validates HTTPS, generates independent private files, never overwrites or logs secrets',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'benchy-setup-'));
 const run=args=>spawnSync(process.execPath,[script.pathname,...args],{cwd:dir,encoding:'utf8'});
 try{
  for(const origin of ['http://benchy.example.com','https://user:pass@benchy.example.com','https://benchy.example.com/path','https://benchy.example.com/#fragment']) assert.notEqual(run(['--origin',origin]).status,0);
  const result=run(['--origin','https://benchy.example.com']);assert.equal(result.status,0,result.stderr);
  const env=await fs.readFile(path.join(dir,'.env'),'utf8'),link=await fs.readFile(path.join(dir,'private-setup-link.txt'),'utf8');
  const values=Object.fromEntries(env.trim().split('\n').map(l=>l.split('=')));
  assert.equal(values.RP_ID,'benchy.example.com');assert.notEqual(values.SESSION_SECRET,values.BOOTSTRAP_SECRET);assert.ok(values.SESSION_SECRET.length>=40);assert.ok(values.BOOTSTRAP_SECRET.length>=32);
  assert.equal(link.trim(),`https://benchy.example.com/setup#token=${values.BOOTSTRAP_SECRET}`);
  for(const name of ['.env','private-setup-link.txt'])assert.equal((await fs.stat(path.join(dir,name))).mode&0o777,0o600);
  assert.ok(!result.stdout.includes(values.BOOTSTRAP_SECRET));assert.ok(!result.stdout.includes(values.SESSION_SECRET));
  assert.notEqual(run(['--origin','https://benchy.example.com']).status,0);assert.equal(await fs.readFile(path.join(dir,'.env'),'utf8'),env);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
