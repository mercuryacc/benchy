import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const allowed=new Set(['public/design.html','public/design.v1.css','public/design.v1.js','tests/design-browser.mjs','server.mjs','model.mjs','package.json','package-lock.json','README.md','SECURITY.md','LICENSE','.env.example','.gitignore','.dockerignore','Dockerfile','compose.yaml','.github/workflows/test.yml','scripts/setup.mjs','seed/templates.json','seed/sources.json','tests/core.test.mjs','tests/integrity.test.mjs','tests/server-integrity.mjs','tests/browser.mjs','tests/fixtures.mjs','tests/setup.test.mjs','tests/boundary.test.mjs','public/app.html','public/login.html','public/app.js','public/auth.js','public/style.v1.css','public/compact.v1.css','public/voltage.v1.css','public/icon.svg','public/icon-192.png','public/icon-512.png','public/apple-touch-icon.png']);
export function checkPublicFile(name,bytes){
 assert.ok(allowed.has(name),`Unapproved public path: ${name}`);
 if(/\.png$/.test(name))return; // Only the three reviewed application icons are allowed binaries.
 const text=bytes.toString('utf8');
 const forbidden=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/gh[pousr]_[A-Za-z0-9]{30,}/,/github_pat_[A-Za-z0-9_]{30,}/,/AKIA[A-Z0-9]{16}/,/(?:SESSION_SECRET|BOOTSTRAP_SECRET)\s*[:=]\s*["']?[A-Za-z0-9_-]{40,}/];
 for(const pattern of forbidden)assert.ok(!pattern.test(text),`Potential secret in ${name}`);
 if(name==='seed/templates.json'||name==='seed/sources.json')assert.deepEqual(JSON.parse(text),[],`Public installation must start empty: ${name}`);
 const privateTerms=['/roo'+'t/','/dock'+'er/'];
 for(const term of privateTerms)assert.ok(!text.includes(term),`Private provenance in ${name}`);
}
test('boundary rejects private paths and embedded credentials',()=>{
 assert.throws(()=>checkPublicFile('data/state.json',Buffer.from('{}')));
 assert.throws(()=>checkPublicFile('seed/templates.json',Buffer.from('[{"name":"Synthetic nonempty seed"}]')));
 assert.throws(()=>checkPublicFile('server.mjs',Buffer.from('SESSION_SECRET='+'x'.repeat(48))));
});
test('public boundary checks exact Git index blobs, or explicit source tree before Git exists',async()=>{
 let staged=false,files;
 try{
  const top=execFileSync('git',['rev-parse','--show-toplevel'],{cwd:root,stdio:['ignore','pipe','ignore']}).toString().trim();
  if(path.resolve(top)===path.resolve(root)){
   files=execFileSync('git',['ls-files','--cached','-z'],{cwd:root}).toString().split('\0').filter(Boolean);staged=true;
   assert.ok(files.length,'Git index is empty: stage the reviewed public tree first');
  }
 }catch(error){if(error.code==='ERR_ASSERTION')throw error;}
 if(!files){
  files=[];
  const walk=async(prefix='')=>{for(const entry of await fs.readdir(path.join(root,prefix),{withFileTypes:true})){
   if(['node_modules','.git','data','.env','private-setup-link.txt'].includes(entry.name))continue;
   const name=prefix+entry.name;assert.ok(!entry.isSymbolicLink(),`Symlink forbidden: ${name}`);
   if(entry.isDirectory())await walk(name+'/');else files.push(name);
  }};await walk();
 }
 for(const name of files){const bytes=staged?execFileSync('git',['show',`:${name}`],{cwd:root,maxBuffer:16*1024*1024}):await fs.readFile(path.join(root,name));checkPublicFile(name,bytes);}
 console.log(`Checked ${files.length} public files (${staged?'exact index blobs':'pre-Git filesystem'}); not a history audit.`);
});
