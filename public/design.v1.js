(() => {
'use strict';
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storageKey = 'benchy.designlab.v1.style';
const directions = {
 carbon:['Carbon / 01','Flat utility. Charcoal, sharp edges, and a small shot of acid.'],
 chalk:['Chalk / 02','Hard corners. Offset keylines. A warm, blunt editorial rhythm.'],
 signal:['Signal / 03','Instrument-like clarity. Cool surfaces and exact, monospaced details.'],
 edition:['Edition / 04','An open training journal. Oxblood ink, fine rules, and a little italic.'],
 afterhours:['Afterhours / 05','Athletic type. Bone on black. Softer controls with room to breathe.']
};
function setStyle(value) {
 const style = Object.hasOwn(directions,value) ? value : 'carbon';
 document.documentElement.dataset.style = style;
 $('#style-select').value = style;
 $('#direction-name').textContent = directions[style][0];
 $('#direction-description').textContent = directions[style][1];
 try { localStorage.setItem(storageKey,style); } catch { /* A blocked storage policy doesn't block the preview. */ }
}
let savedStyle = 'carbon';
try { savedStyle = localStorage.getItem(storageKey) || 'carbon'; } catch { /* Private browsing can deny storage. */ }
setStyle(savedStyle);
$('#style-select').addEventListener('change', e => setStyle(e.target.value));
const dialog = $('#demo-dialog');
let toastTimeout;
function toast(message) {
 const el = $('#demo-toast');el.textContent = message;el.hidden = false;
 clearTimeout(toastTimeout);toastTimeout = setTimeout(() => {el.hidden = true;},4000);
}
function openDialog(title, description, html) {
 $('#dialog-title').textContent = title;$('#dialog-description').textContent = description;$('#dialog-body').innerHTML = html;
 if (!dialog.open) dialog.showModal();
}
function error(message) {const el = $('#demo-error');el.textContent = message;el.hidden = false;toast(message);}
function seedSets() {
 $('#set-list').innerHTML = '';
 addSet('complete',8,20);addSet('pending','','');addSet('skipped','','');updateSummary();
}
function addSet(status = 'pending', reps = '', load = '') {
 const number = $$('[data-set]').length + 1;
 const row = document.createElement('article');row.className = 'set';row.dataset.set = `demo-set-${number}`;row.dataset.status = status;
 row.innerHTML = `<div class="set-head"><span>Set ${String(number).padStart(2,'0')}</span><span class="set-state"></span></div><div class="set-fields"><label>Actual reps<input data-field="reps" type="number" min="0" step="1" inputmode="numeric" placeholder="—" value="${reps}" aria-label="Actual reps, set ${number}"></label><label>Actual weight<span class="measure-control"><input data-field="load" type="number" min="0" step="any" inputmode="decimal" placeholder="—" value="${load}" aria-label="Actual weight, set ${number}"><select data-field="loadUnit" aria-label="Weight unit, set ${number}"><option>kg</option><option>lb</option></select></span></label></div><div class="last"><span>Last example: 8 reps × 20 kg</span><button data-action="copy">Copy last ↙</button></div><div class="set-actions"><button data-action="complete" class="primary">Complete set</button><button data-action="skip" class="quiet">Skip</button></div><details class="extra-metrics"><summary>More measurements & notes</summary><div class="set-fields"><label>Distance<span class="measure-control"><input data-field="distance" type="number" min="0" step="any" inputmode="decimal" placeholder="—" aria-label="Distance, set ${number}"><select data-field="distanceUnit" aria-label="Distance unit, set ${number}"><option>m</option><option>km</option><option>mi</option></select></span></label><label>Duration · seconds<input data-field="duration" type="number" min="0" step="any" inputmode="decimal" placeholder="—"></label></div><label>RPE · optional, 0–10<input data-field="rpe" type="number" min="0" max="10" step="0.5" placeholder="—"></label><label>Set notes<textarea data-field="notes" placeholder="How did that feel?"></textarea></label></details>`;
 $('#set-list').append(row);paintSet(row);
 $('.exercise-heading .chip').textContent = `${number} sets`;
}
function paintSet(row) {
 const status = row.dataset.status;
 $('.set-state',row).textContent = status === 'complete' ? '✓ Complete' : status === 'skipped' ? 'Skipped' : 'Not completed';
 $('[data-action=complete]',row).textContent = status === 'complete' ? 'Undo complete' : 'Complete set';
 $('[data-action=complete]',row).classList.toggle('primary',status !== 'complete');
 $('[data-action=skip]',row).textContent = status === 'skipped' ? 'Unskip' : 'Skip';
 updateSummary();
}
function updateSummary() {
 const rows = $$('[data-set]');
 $('#session-summary').textContent = `${rows.filter(r=>r.dataset.status==='complete').length} complete · ${rows.filter(r=>r.dataset.status==='pending').length} pending · ${rows.filter(r=>r.dataset.status==='skipped').length} skipped`;
}
let timer = {state:'ready',remaining:90,deadline:0};
function secondsLeft() { return timer.state === 'running' ? Math.max(0,(timer.deadline-Date.now())/1000) : timer.remaining; }
function paintTimer() {
 let left = secondsLeft();
 if (timer.state === 'running' && left <= 0) {timer.state='finished';timer.remaining=0;left=0;toast('Rest finished. Ready when you are.');}
 const seconds = Math.ceil(left);
 $('[data-timer-display]').textContent = `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
 $('#timer-state').textContent = ({ready:'Ready',running:'Running',paused:'Paused',finished:'Finished'})[timer.state];
 const control = $('[data-timer-action=start], [data-timer-action=pause], [data-timer-action=resume]');
 const action = timer.state === 'running' ? 'pause' : timer.state === 'paused' ? 'resume' : 'start';
 control.dataset.timerAction = action;control.textContent = ({pause:'Pause',resume:'Resume',start:timer.state==='finished'?'Restart':'Start'})[action];
}
function timerAction(button) {
 const action = button.dataset.timerAction;
 if (action === 'pause') {timer.remaining=secondsLeft();timer.state='paused';}
 if (action === 'resume' || action === 'start') {if (timer.remaining<=0) timer.remaining=90;timer.deadline=Date.now()+timer.remaining*1000;timer.state='running';}
 if (action === 'adjust') {const left=Math.max(0,secondsLeft()+Number(button.dataset.delta));timer.remaining=left;if(timer.state==='running')timer.deadline=Date.now()+left*1000;else if(timer.state==='finished'&&left>0)timer.state='ready';}
 if (action === 'skip') {timer.remaining=0;timer.state='finished';toast('Rest skipped in this demo.');}
 paintTimer();
}
setInterval(paintTimer,250);document.addEventListener('visibilitychange',paintTimer);
seedSets();paintTimer();
$('#workout-search').addEventListener('input',e => {let visible=0;$$('[data-workout]').forEach(card=>{card.hidden=!card.dataset.workout.toLowerCase().includes(e.target.value.trim().toLowerCase());if(!card.hidden)visible++;});$('#search-empty').hidden=visible>0;});
$('#inline-editor').addEventListener('submit',e=>{e.preventDefault();toast('Demo plan saved for this preview only.');});
const syntheticExport = {demo:true,notice:'Synthetic Benchy design playground examples only',workouts:[{name:'Full body A',blocks:[{type:'single',exercise:'Goblet squat',sets:3,reps:8,load:20,loadUnit:'kg',restExercise:0,restRound:90}]}],history:[]};
function exportDemo() {
 const url=URL.createObjectURL(new Blob([JSON.stringify(syntheticExport,null,2)],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download='benchy-design-demo.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Synthetic demo JSON downloaded.');
}
function settings() {
 openDialog('Your space. Your rhythm.','Appearance and sound controls are mock settings for this visit only.',`<label>Appearance preview<select id="mock-appearance"><option>Follow this design</option><option>Dark appearance preview</option><option>Light appearance preview</option></select></label><label class="check-label"><input type="checkbox" id="sound-toggle" role="switch"> Timer sound preview</label><label>Sound level preview<input type="range" min="0" max="100" value="50" aria-label="Demo sound level"></label><p class="muted">No sounds play. No settings touch the real app.</p><button class="primary" data-action="save-settings">Done</button>`);
 $('#mock-appearance').addEventListener('change',()=>toast('Appearance setting preview selected. The design direction stays unchanged.'));
 $('#sound-toggle').addEventListener('change',e=>toast(e.target.checked?'Demo sound switch on · no audio plays.':'Demo sound switch off.'));
}
function editor(isNew=false) {
 openDialog(isNew?'A new plan.':'Edit the example.','Targets guide a session. They never count as completed results.',`<form id="dialog-editor"><label>Workout name<input name="name" value="${isNew?'New demo workout':'Full body A'}" required maxlength="100"></label><label>Block type<select name="type"><option>single</option><option>superset</option><option>circuit</option></select></label><div class="two-columns"><label>Sets<input name="sets" type="number" min="1" max="20" value="3" required></label><label>Exercise<input name="exercise" value="Goblet squat" required></label></div><div class="two-columns"><label>Between exercises · sec<input name="restExercise" type="number" min="0" value="20"></label><label>After round · sec<input name="restRound" type="number" min="0" value="90"></label></div><label>Plan notes<textarea name="notes"></textarea></label><button class="primary" type="submit">Save demo plan</button></form>`);
 $('#dialog-editor').addEventListener('submit',e=>{e.preventDefault();const name=new FormData(e.target).get('name');if(isNew)appendCard(name);else $('[name=name]',$('#inline-editor')).value=name;dialog.close();toast('Demo plan updated. Nothing saved to your workouts.');});
}
function appendCard(name) {
 const card = document.createElement('article');card.className='workout-card';card.dataset.workout=name;
 card.innerHTML=`<span class="eyebrow">Example / this visit</span><h3>${escape(name)}</h3><p class="muted">Synthetic plan · preview only</p><div class="row"><button data-action="start-workout">Start workout →</button><button data-action="duplicate">Duplicate</button></div>`;
 $('#workout-cards').append(card);
 $('#workout-search').dispatchEvent(new Event('input'));
}
function importPreview() {
 openDialog('Review before importing.','This demo only accepts its own synthetic export format. Nothing is sent or imported into Benchy.',`<p class="muted">Download the example JSON first, then select it below. Arbitrary files are not previewed.</p><button data-action="export">Download synthetic example ↓</button><label>Demo JSON file<input id="demo-import-file" type="file" accept="application/json,.json"></label><p id="import-result" role="status">No file selected.</p><button class="primary" data-action="apply-import" disabled>Apply to demo library</button>`);
 $('#demo-import-file').addEventListener('change', async e=>{
 const file=e.target.files[0];if(!file)return;
 const result=$('#import-result');const apply=$('[data-action=apply-import]');apply.disabled=true;
 try {
 if(file.size>100000)throw Error('Choose the small synthetic example export.');
 const parsed=JSON.parse(await file.text());
 if(JSON.stringify(parsed)!==JSON.stringify(syntheticExport))throw Error('Only the unchanged synthetic demo export is accepted.');
 result.textContent='Preview: 1 synthetic workout · 0 history entries. Existing examples stay untouched.';apply.disabled=false;
 } catch {result.textContent='Not a supported demo export. Download and choose the synthetic example.';result.setAttribute('role','alert');}
 });
}
let sessionDetails={date:'2026-10-17T09:00',notes:''};
document.addEventListener('click',e=>{
 const button=e.target.closest('button');if(!button)return;
 if(button.dataset.timerAction){timerAction(button);return;}
 const action=button.dataset.action;const row=button.closest('[data-set]');
 if(action==='complete') {
 if(row.dataset.status!=='complete' && $$('input',row).some(input=>!input.checkValidity())){error('Use non-negative measurements and RPE between 0 and 10.');return;}
 $('#demo-error').hidden=true;const completing=row.dataset.status!=='complete';row.dataset.status=completing?'complete':'pending';paintSet(row);
 if(completing){timer={state:'running',remaining:90,deadline:Date.now()+90000};paintTimer();}
 toast(completing?'Set complete · demo only.':'Completion undone.');
 } else if(action==='skip'){row.dataset.status=row.dataset.status==='skipped'?'pending':'skipped';paintSet(row);}
 else if(action==='copy') {if(row.dataset.status!=='pending'){toast('Copy last is for pending sets. Undo or unskip this set first.');return;} $('[data-field=reps]',row).value='8';$('[data-field=load]',row).value='20';$('[data-field=loadUnit]',row).value='kg';toast('Previous example copied. Set is still pending.');}
 else if(action==='add-set'){addSet();updateSummary();toast('One pending demo set added.');}
 else if(action==='swap') {
 openDialog('Swap the remaining work.','Only pending demo sets change. Completed results keep their original exercise.',`<form id="swap-form"><label>Replacement exercise<select name="replacement"><option>Front squat</option><option>Box squat</option><option>Split squat</option></select></label><button class="primary">Swap pending sets</button></form>`);
 $('#swap-form').addEventListener('submit',event=>{event.preventDefault();const name=new FormData(event.target).get('replacement');$$('[data-set][data-status=pending]').forEach(set=>{set.dataset.exercise=name;$('.set-head>span',set).textContent=`${name} · pending`});dialog.close();toast('Pending sets swapped; completed sets unchanged.');});
 } else if(action==='settings')settings();
 else if(action==='save-settings'){dialog.close();toast('Demo settings kept for this visit.');}
 else if(action==='close')dialog.close();
 else if(action==='new')editor(true);
 else if(action==='editor')editor();
 else if(action==='duplicate'){appendCard(`${button.closest('[data-workout]').dataset.workout} · copy`);toast('Example duplicated in demo library.');}
 else if(action==='resume'){location.hash='session';toast('Example session resumed.');}
 else if(action==='start-workout'){
 openDialog('Start a different example?','An example session is already in progress. Starting resets only the synthetic session.',`<button class="primary" data-action="confirm-start">Start example session</button><button data-action="close">Keep current demo</button>`);
 } else if(action==='confirm-start'){seedSets();timer={state:'ready',remaining:90,deadline:0};paintTimer();dialog.close();location.hash='session';toast('Fresh synthetic session started.');}
 else if(action==='session-details'){
 openDialog('Session details.','Date and notes stay in memory for this demo only.',`<form id="session-form"><label>Started · local time<input name="date" type="datetime-local" value="${escape(sessionDetails.date)}" required></label><label>Session notes<textarea name="notes">${escape(sessionDetails.notes)}</textarea></label><button class="primary">Save demo details</button></form>`);
 $('#session-form').addEventListener('submit',event=>{event.preventDefault();sessionDetails=Object.fromEntries(new FormData(event.target));dialog.close();toast('Demo session details updated.');});
 } else if(action==='finish'){
 const pending=$$('[data-set][data-status=pending]').length;
 openDialog('Call it a session?','Finishing this example never creates a real history entry.',`<p>${pending} pending set${pending===1?'':'s'} will stay incomplete. Completed actuals are kept separately from planned targets.</p><button class="primary" data-action="confirm-finish">Finish demo session</button><button data-action="close">Keep training</button>`);
 } else if(action==='confirm-finish'){dialog.close();timer={state:'finished',remaining:0,deadline:0};paintTimer();$('.session-section .eyebrow').innerHTML='01 / Train <span class="live-dot">✓</span> Finished example';toast('Example session finished. No real history was created.');}
 else if(action==='history-detail')openDialog('Example session record.','Synthetic history, not personal training data.','<div class="history-row"><div><h3>Goblet squat</h3><p>8 reps × 20 kg · Complete</p><p>8 reps × 20 kg · Complete</p><p>6 reps · weight not recorded</p></div></div><p class="muted">Blank weight remains unknown. Targets are not substituted for actuals.</p><button data-action="close">Back to preview</button>');
 else if(action==='progress')openDialog('Exercise progress.','Synthetic completed actuals only. Units are never mixed.','<label>Exercise<select><option>Goblet squat · kg</option></select></label><div class="history-row"><span>12 Oct · example</span><strong>8 × 20 kg</strong></div><div class="history-row"><span>09 Oct · example</span><strong>8 × 18 kg</strong></div><p class="muted">Example measurements, not a forecast or a personal best.</p><button data-action="close">Done</button>');
 else if(action==='conflict')openDialog('Keep the edit safe.','Conflict preview. Nothing has been overwritten and no server is contacted.','<p>Example pending edit: <strong>8 reps × 20 kg</strong></p><p>Example newer edit: <strong>8 reps × 18 kg</strong></p><button class="primary" data-action="resolve-conflict">Keep my demo edit</button><button data-action="resolve-conflict">Use newer demo edit</button>');
 else if(action==='resolve-conflict'){dialog.close();toast('Example conflict resolved in the preview.');}
 else if(action==='login'||action==='setup')openDialog(action==='login'?'Sign in with a passkey.':'Set up your space.','Visual preview only. No authentication or credential request occurs.',`<p>${action==='login'?'Your device would ask you to confirm with a passkey here.':'A real setup would create your space and register a passkey here.'}</p><button class="primary" data-action="mock-auth">${action==='login'?'Simulate successful sign-in':'Simulate setup'}</button><button data-action="close">Cancel preview</button>`);
 else if(action==='mock-auth'){dialog.close();toast('Preview complete. No passkey created or used.');}
 else if(action==='export')exportDemo();
 else if(action==='import')importPreview();
 else if(action==='apply-import'){appendCard('Full body A · imported example');dialog.close();toast('Synthetic example added to demo library only.');}
 else if(action==='toast')toast('Demo changes saved for this visit. Nothing touches your workouts.');
 else if(action==='reset'){
 if(dialog.open)dialog.close();seedSets();timer={state:'ready',remaining:90,deadline:0};paintTimer();sessionDetails={date:'2026-10-17T09:00',notes:''};$('#inline-editor').reset();$('#workout-search').value='';$$('[data-workout]').slice(2).forEach(card=>card.remove());$$('[data-workout]').forEach(card=>card.hidden=false);$('#search-empty').hidden=true;$('#demo-error').hidden=true;$('.session-section .eyebrow').innerHTML='01 / Train <span class="live-dot">●</span> In progress';toast('Demo reset. Your chosen design is unchanged.');
 }
});
dialog.addEventListener('click',event=>{if(event.target===dialog){const bounds=dialog.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)dialog.close();}});
})();
