import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newSession,validateTemplate,importPreview} from '../model.mjs';
const template=()=>validateTemplate({id:'integrity-template',version:1,name:'Integrity fixture',blocks:[{id:'b',label:'A',type:'single',exercises:[{id:'e',label:'A',name:'Lift',sets:2,targets:{}}]}]});
function fixture(){const t=template(),s=newSession(t,'UTC');s.finishedAt=new Date().toISOString();return {format:'benchy-v1',templates:[t],sessions:[s]};}
const empty={templates:[],sessions:[]};
test('import rejects duplicate set IDs',()=>{const d=fixture();d.sessions[0].sets[1].id=d.sessions[0].sets[0].id;assert.throws(()=>importPreview(d,empty));});
test('import rejects invalid snapshot IDs and dangling or contradictory block positions',()=>{
 for(const alter of [s=>s.snapshot.blocks.push(structuredClone(s.snapshot.blocks[0])),s=>s.sets[0].blockId='missing',s=>s.sets[0].blockIndex=10,s=>s.sets[0].exerciseIndex=10,s=>s.sets[0].exerciseId='missing']){const d=fixture();alter(d.sessions[0]);assert.throws(()=>importPreview(d,empty));}
});
test('import rejects a finish before its start',()=>{const d=fixture();d.sessions[0].finishedAt='2000-01-01T00:00:00.000Z';assert.throws(()=>importPreview(d,empty));});
test('import stores parsed safe fields, dropping unvalidated extras',()=>{const d=fixture();d.sessions[0].unexpected='untrusted';d.sessions[0].sets[0].unexpected='untrusted';const p=importPreview(d,empty);assert.equal(p.sessions[0].unexpected,undefined);assert.equal(p.sessions[0].sets[0].unexpected,undefined);assert.equal(p.sessions[0].sets[0].actual.loadUnit,'kg');});
test('legitimate added sets and swapped exercises survive a data export import',()=>{const d=fixture(),s=d.sessions[0];s.sets[1].exerciseId='swapped-exercise';s.sets[1].originalName='Lift';s.sets[1].name='Alternative';const extra=structuredClone(s.sets[0]);extra.id='added-set';extra.round=2;s.sets.push(extra);const p=importPreview(d,empty);assert.equal(p.sessions[0].sets.length,3);assert.equal(p.sessions[0].sets[1].originalName,'Lift');});
