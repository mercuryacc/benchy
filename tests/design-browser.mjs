import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from 'playwright-core';
const root=fileURLToPath(new URL('..',import.meta.url));
const data=await fs.mkdtemp(path.join(os.tmpdir(),'benchy-design-test-'));
const port=await new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
const origin=`http://localhost:${port}`;
const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,NODE_ENV:'test',PORT:String(port),ORIGIN:origin,RP_ID:'localhost',SESSION_SECRET:randomBytes(48).toString('base64url'),BOOTSTRAP_SECRET:randomBytes(32).toString('base64url'),DATA_DIR:data},stdio:['ignore','pipe','pipe']});
let browser;let logs='';child.stdout.on('data',b=>logs+=b);child.stderr.on('data',b=>logs+=b);
try{
 let ready=false;const end=Date.now()+10000;
 while(Date.now()<end){if(child.exitCode!==null)throw Error('Isolated server exited: '+logs);try{if((await fetch(origin+'/health',{signal:AbortSignal.timeout(500)})).ok){ready=true;break;}}catch{}await delay(50);}
 assert.ok(ready,'isolated server ready');
 const baseline=await fs.readFile(path.join(data,'state.json'));
 browser=await chromium.launch({headless:true,executablePath:process.env.BENCHY_CHROMIUM_PATH||process.env.CHROMIUM_PATH||undefined});
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const errors=[],failures=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('requestfailed',r=>failures.push(new URL(r.url()).pathname));page.on('request',r=>requests.push({method:r.method(),path:new URL(r.url()).pathname}));
 await page.addInitScript(()=>{if(!localStorage.getItem('benchy.outbox'))localStorage.setItem('benchy.outbox','[{"fixture":"preserve"}]');if(!localStorage.getItem('benchy.theme'))localStorage.setItem('benchy.theme','light');});
 const response=await page.goto(origin+'/design',{waitUntil:'domcontentloaded'});assert.equal(response.status(),200,'separate design route must exist');
 assert.match(response.headers()['x-robots-tag'],/noindex/);assert.match(response.headers()['content-security-policy'],/script-src 'self'/);
 const styles=['carbon','chalk','signal','edition','afterhours','voltage','foundry','trackside','hardline','ember'];
 assert.deepEqual(await page.locator('#style-select option').evaluateAll(es=>es.map(e=>e.value)),styles);
 for(const section of ['session','library','history','editor','states','account'])assert.equal(await page.locator('#'+section).count(),1,'component section '+section);
 const signatures=new Set();
 for(const width of [360,390,1365]){
  await page.setViewportSize({width,height:900});
  for(const style of styles){
   await page.locator('#style-select').selectOption(style);
   assert.equal(await page.locator('html').getAttribute('data-style'),style);
   assert.equal(await page.evaluate(()=>localStorage.getItem('benchy.designlab.v1.style')),style);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow: '+width+' '+style);
   assert.equal(await page.evaluate(()=>localStorage.getItem('benchy.outbox')),'[{"fixture":"preserve"}]');
   assert.equal(await page.evaluate(()=>localStorage.getItem('benchy.theme')),'light');
   if(width===390){
    signatures.add(await page.evaluate(()=>{const h=getComputedStyle(document.querySelector('h1'));const b=getComputedStyle(document.querySelector('main button'));return JSON.stringify([h.fontFamily,h.fontStyle,h.fontWeight,h.textTransform,b.borderRadius,b.boxShadow,h.letterSpacing]);}));
   }
   if(process.env.BENCHY_DESIGN_SCREENSHOTS&&width!==360){const dir=process.env.BENCHY_DESIGN_SCREENSHOTS;await fs.mkdir(dir,{recursive:true});await page.screenshot({path:path.join(dir,`${style}-${width}.png`),fullPage:true});}
  }
 }
 assert.equal(signatures.size,styles.length,'styles must differ in geometry/typography, not just colours');
 await page.locator('[data-action=reset]').click();
 const row=page.locator('[data-set][data-status=pending]').first();const setId=await row.getAttribute('data-set');const set=page.locator(`[data-set="${setId}"]`);
 await set.locator('[data-action=copy]').click();assert.equal(await set.getAttribute('data-status'),'pending','copying never completes a set');assert.equal(await set.locator('[data-field=load]').inputValue(),'20');
 await set.locator('[data-field=load]').fill('0');await set.locator('[data-field=reps]').fill('8');
 await set.locator('[data-action=complete]').click();assert.equal(await set.getAttribute('data-status'),'complete');assert.equal(await set.locator('[data-field=load]').inputValue(),'0');assert.equal(await page.locator('#timer-state').innerText(),'Running');
 await set.locator('[data-action=complete]').click();assert.equal(await set.getAttribute('data-status'),'pending');
 await page.locator('[data-timer-action=pause]').click();assert.equal(await page.locator('#timer-state').innerText(),'Paused');
 const seconds=text=>text.split(':').reduce((n,v)=>n*60+Number(v),0);const before=seconds(await page.locator('[data-timer-display]').innerText());
 await page.locator('[data-timer-action=adjust][data-delta="15"]').click();assert.equal(seconds(await page.locator('[data-timer-display]').innerText()),before+15);
 await page.locator('[data-timer-action=resume]').click();assert.equal(await page.locator('#timer-state').innerText(),'Running');await page.locator('[data-timer-action=skip]').click();assert.equal(await page.locator('#timer-state').innerText(),'Finished');
 await set.locator('[data-action=skip]').click();assert.equal(await set.getAttribute('data-status'),'skipped');await set.locator('[data-action=skip]').click();assert.equal(await set.getAttribute('data-status'),'pending');
 await set.locator('.extra-metrics summary').click();await set.locator('[data-field=rpe]').fill('11');await set.locator('[data-action=complete]').click();assert.equal(await set.getAttribute('data-status'),'pending');assert.ok(await page.locator('#demo-error').isVisible());await set.locator('[data-field=rpe]').fill('8');
 await set.locator('[data-field=notes]').fill('Synthetic notes preserved across directions.');
 for(const style of styles){await page.locator('#style-select').selectOption(style);assert.equal(await set.locator('[data-field=notes]').inputValue(),'Synthetic notes preserved across directions.');assert.equal(await set.locator('[data-field=load]').inputValue(),'0');}
 const total=await page.locator('[data-set]').count();await page.locator('[data-action=add-set]').click();assert.equal(await page.locator('[data-set]').count(),total+1);
 await page.locator('#workout-search').fill('No such synthetic workout');assert.ok(await page.locator('#search-empty').isVisible());assert.equal(await page.locator('[data-workout]:not([hidden])').count(),0);await page.locator('#workout-search').fill('Easy');assert.equal(await page.locator('[data-workout]:not([hidden])').count(),1);await page.locator('#workout-search').fill('');
 const cardCount=await page.locator('[data-workout]').count();await page.locator('[data-workout]').first().locator('[data-action=duplicate]').click();assert.equal(await page.locator('[data-workout]').count(),cardCount+1);
 await page.locator('[data-action=new]').click();await page.locator('#dialog-editor [name=name]').fill('A deliberately long synthetic workout name for narrow screens');await page.locator('#dialog-editor button[type=submit]').click();assert.equal(await page.locator('[data-workout]').count(),cardCount+2);
 await page.locator('[data-action=session-details]').click();await page.locator('#session-form [name=notes]').fill('Synthetic session notes only.');await page.locator('#session-form button').click();await page.locator('[data-action=session-details]').click();assert.equal(await page.locator('#session-form [name=notes]').inputValue(),'Synthetic session notes only.');await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});
 for(const style of styles){
  await page.locator('#style-select').selectOption(style);await page.locator('[data-action=settings]').first().click();
  assert.ok(await page.locator('#demo-dialog').isVisible());const box=await page.locator('#demo-dialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=390&&box.height<=844,'modal geometry '+style);
  await page.locator('#sound-toggle').check();await page.locator('#mock-appearance').selectOption({index:2});await page.locator('[data-action=save-settings]').click();assert.ok(!await page.locator('#demo-dialog').isVisible());
 }
 const downloadPromise=page.waitForEvent('download');await page.locator('#account [data-action=export]').click();const download=await downloadPromise;const exported=await fs.readFile(await download.path());assert.equal(JSON.parse(exported).demo,true);
 await page.locator('#account [data-action=import]').click();await page.locator('#demo-import-file').setInputFiles({name:'bad-example.json',mimeType:'application/json',buffer:Buffer.from('{}')});await page.waitForFunction(()=>document.querySelector('#import-result').textContent.includes('Not a supported'));assert.ok(await page.locator('[data-action=apply-import]').isDisabled());
 await page.locator('#demo-import-file').setInputFiles({name:'synthetic-example.json',mimeType:'application/json',buffer:exported});await page.locator('[data-action=apply-import]').waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('[data-action=apply-import]').disabled);await page.locator('[data-action=apply-import]').click();assert.equal(await page.locator('[data-workout]').count(),cardCount+3);
 for(const action of ['login','setup']){await page.locator(`[data-action=${action}]`).click();assert.ok(await page.locator('#demo-dialog').isVisible());await page.locator('[data-action=mock-auth]').click();}
 await page.locator('[data-action=conflict]').click();await page.locator('[data-action=resolve-conflict]').first().click();
 await page.locator('[data-action=finish]').click();assert.ok(await page.locator('#demo-dialog').isVisible());await page.locator('[data-action=confirm-finish]').click();assert.match(await page.locator('.session-section .eyebrow').first().innerText(),/Finished example/i);
 await page.locator('[data-action=reset]').click();assert.equal(await page.locator('[data-set]').count(),3);assert.equal(await page.locator('[data-workout]').count(),2);assert.equal(await page.locator('#timer-state').innerText(),'Ready');assert.equal(await page.locator('html').getAttribute('data-style'),styles.at(-1));
 console.log('PASS demo interactions: copy without completion, zero load, complete/undo/skip/add, timer lifecycle, invalid RPE, inputs preserved across styles, search/duplicate/create, date-notes modal, all ten settings sheets, synthetic export/import, mock passkeys, conflict/finish/reset; no real app writes.');
 await page.reload({waitUntil:'domcontentloaded'});assert.equal(await page.locator('html').getAttribute('data-style'),styles.at(-1));
 assert.equal((await fetch(origin+'/api/state')).status,401,'main workout data stays private');
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 assert.ok(requests.every(r=>r.method==='GET'&&!/^\/(api|auth)(\/|$)/.test(r.path)),'demo must never access workout or auth APIs');
 assert.deepEqual(await fs.readFile(path.join(data,'state.json')),baseline,'demo interactions may not mutate server state');
 console.log('PASS design lab: ten distinct styles, six component sections, 30 responsive combinations, choice persists, real-app local storage untouched, strict CSP, no errors or API writes; private server state unchanged.');
}finally{
 await browser?.close();child.kill('SIGTERM');await Promise.race([new Promise(resolve=>child.once('exit',resolve)),delay(1500)]);await fs.rm(data,{recursive:true,force:true});
}
