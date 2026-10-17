import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Store, schedule, newSession, validateTemplate} from '../model.mjs';
const fixture={id:'x',version:1,name:'Uneven',notes:'raw',blocks:[{id:'b',label:'D',type:'superset',restExercise:null,restRound:90,exercises:[{id:'e1',label:'D1',name:'Calf',sets:3,targets:{}},{id:'e2',label:'D2',name:'Curl',sets:2,targets:{}}]}]};
test('uneven rounds never fabricate child sets; snapshot remains independent',()=>{const s=newSession(fixture,'UTC');assert.deepEqual(schedule(s).map(x=>x.label),['D1','D2','D1','D2','D1']);fixture.name='Edited';assert.equal(s.name,'Uneven');assert.equal(s.sets.length,5);assert.ok(s.sets.every(x=>x.actual.reps===null&&x.status==='pending'));});
test('finite targets, zero load valid, malformed template rejected',()=>{assert.throws(()=>validateTemplate({...fixture,blocks:[{...fixture.blocks[0],exercises:[{...fixture.blocks[0].exercises[0],sets:-2}]}]}));assert.equal(validateTemplate({...fixture,blocks:[{...fixture.blocks[0],exercises:[{...fixture.blocks[0].exercises[0],targets:{load:0}}]}]}).blocks[0].exercises[0].targets.load,0);});
const memoryTemplate=()=>validateTemplate({id:'memory-template',version:1,name:'Synthetic memory fixture',blocks:[{id:'memory-block',label:'A',type:'single',exercises:[{id:'memory-exercise',label:'A',name:'Synthetic press',sets:4,targets:{reps:9,loadUnit:'kg'}}]}]});
function priorSession(values,startedAt='2020-01-01T10:00:00.000Z'){
 const s=newSession(memoryTemplate(),'UTC');s.startedAt=startedAt;s.finishedAt=startedAt.replace('10:00','11:00');
 s.sets.forEach((set,i)=>{set.status='complete';set.actual={...set.actual,reps:values[i]?.[0]??null,load:values[i]?.[1]??null,rpe:8,notes:'Synthetic old note'};});return s;
}
test('history prefill preserves the per-set progression without checking off sets or changing targets',()=>{
 const old=priorSession([[11,13],[7,31],[5,47],[5,47]]),before=structuredClone(old),t=memoryTemplate();
 const fresh=newSession(t,'UTC',[old]);assert.deepEqual(fresh.sets.map(x=>[x.actual.reps,x.actual.load]),[[11,13],[7,31],[5,47],[5,47]]);
 assert.ok(fresh.sets.every(x=>x.status==='pending'&&x.actual.rpe===null&&x.actual.notes===''));
 assert.ok(fresh.sets.every(x=>x.targets.reps===9));assert.deepEqual(old,before);assert.deepEqual(fresh.snapshot,t);
});
test('history prefill uses one latest performed session, not older rows for missing or skipped sets',()=>{
 const older=priorSession([[11,13],[7,31],[5,47],[5,47]]),recent=priorSession([[3,0],[null,null],[null,null],[null,null]],'2020-02-01T10:00:00.000Z');recent.sets[1].status='skipped';recent.sets[2].status='pending';recent.sets.pop();
 const fresh=newSession(memoryTemplate(),'UTC',[older,recent]);assert.deepEqual(fresh.sets.map(x=>[x.actual.reps,x.actual.load]),[[3,0],[null,null],[null,null],[null,null]]);
});
test('history prefill ignores unfinished, future and different-exercise records and normalizes names',()=>{
 const old=priorSession([[2,17],[3,19],[4,23],[5,29]]);old.sets.forEach(x=>{x.name='  SYNTHETIC   PRESS ';x.actual.loadUnit='lb';});
 const active=priorSession([[99,99],[99,99],[99,99],[99,99]],'2020-03-01T10:00:00.000Z');active.finishedAt=null;
 const future=priorSession([[99,99],[99,99],[99,99],[99,99]],'2099-01-01T10:00:00.000Z');
 const other=priorSession([[99,99],[99,99],[99,99],[99,99]],'2020-04-01T10:00:00.000Z');other.sets.forEach(x=>x.name='Synthetic incline press');
 const fresh=newSession(memoryTemplate(),'UTC',[future,active,other,old]);assert.equal(fresh.sets[0].actual.reps,2);assert.equal(fresh.sets[0].actual.load,17);assert.equal(fresh.sets[0].actual.loadUnit,'lb');
});
test('history does not silently change prescribed set counts or fill unperformed history',()=>{
 const old=priorSession([[11,13],[7,31],[5,47],[5,47]]),t=memoryTemplate();t.blocks[0].exercises[0].sets=2;
 assert.equal(newSession(t,'UTC',[old]).sets.length,2);old.sets.forEach(x=>x.status='skipped');assert.ok(newSession(t,'UTC',[old]).sets.every(x=>x.actual.reps===null));
});
test('serialized full transactions retain every acknowledged mutation; malformed state preserved',async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'benchy-store-'));const file=path.join(dir,'state.json');const s=new Store(file,()=>({schemaVersion:1,templates:[],sessions:[],credentials:[],ops:{},revision:0}));await s.init();await Promise.all(Array.from({length:40},(_,i)=>s.mutate(d=>{d.sessions.push({id:String(i)});})));assert.equal((await s.read()).sessions.length,40);await fs.writeFile(file,'{bad');await assert.rejects(s.mutate(d=>{d.sessions=[];}));assert.equal(await fs.readFile(file,'utf8'),'{bad');await fs.rm(dir,{recursive:true});});
