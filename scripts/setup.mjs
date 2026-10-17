import fs from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {parseArgs} from 'node:util';
try {
 const {values}=parseArgs({options:{origin:{type:'string'},'rp-id':{type:'string'},development:{type:'boolean',default:false},docker:{type:'boolean',default:false}}});
 if(!values.origin)throw Error('Usage: npm run setup -- --origin https://benchy.example.com [--rp-id benchy.example.com] [--docker]');
 const url=new URL(values.origin);
 const local=values.development&&url.protocol==='http:'&&url.hostname==='localhost'&&url.port;
 if((url.protocol!=='https:'&&!local)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('Provide a plain HTTPS origin; HTTP localhost with a port requires --development');
 const origin=url.origin,rp=values['rp-id']||url.hostname;
 if(rp!==url.hostname)throw Error('RP ID must match the origin hostname');
 // Fail closed before generating anything if either private file already exists.
 for(const file of ['.env','private-setup-link.txt']){
  try{await fs.lstat(file);throw Error(`Refusing to overwrite ${file}`);}catch(e){if(e.code!=='ENOENT')throw e;}
 }
 const session=randomBytes(48).toString('base64url'),bootstrap=randomBytes(32).toString('base64url');
 await fs.mkdir('data',{recursive:true,mode:0o700});
 if(values.docker){
  if(process.getuid?.()===0)await fs.chown('data',1000,1000);
  else if(process.getuid?.()!==1000)throw Error('Docker bind data must be writable by UID 1000. Prepare its ownership with your administrator before using --docker.');
 }
 await fs.writeFile('.env',`NODE_ENV=${local?'test':'production'}\nORIGIN=${origin}\nRP_ID=${rp}\nSESSION_SECRET=${session}\nBOOTSTRAP_SECRET=${bootstrap}\n`,{flag:'wx',mode:0o600});
 await fs.writeFile('private-setup-link.txt',`${origin}/setup#token=${bootstrap}\n`,{flag:'wx',mode:0o600});
 console.log('Created .env and private-setup-link.txt with owner-only permissions. Open the private link file locally; do not share it or send it to logs.');
}catch(e){console.error(e.message);process.exitCode=1;}
