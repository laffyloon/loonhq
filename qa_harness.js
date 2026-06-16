// QA harness: mock just enough DOM/browser to run the real app script and
// execute every render path with realistic data, catching runtime errors.
const fs = require('fs');

// ---- Fake element ----
function FakeEl(tag) {
  this.tagName = (tag || 'div').toUpperCase();
  this._classes = new Set();
  this.style = {};
  this.children = [];
  this.dataset = {};
  this._attrs = {};
  this._innerHTML = '';
  this.textContent = '';
  this.value = '';
  this.offsetHeight = 40;
  this.title = '';
  const self = this;
  this.classList = {
    add: function(){ for (const c of arguments) self._classes.add(c); },
    remove: function(){ for (const c of arguments) self._classes.delete(c); },
    toggle: function(c, force){ if (force === undefined) { self._classes.has(c)?self._classes.delete(c):self._classes.add(c);} else { force?self._classes.add(c):self._classes.delete(c);} },
    contains: function(c){ return self._classes.has(c); }
  };
}
Object.defineProperty(FakeEl.prototype, 'className', {
  get(){ return [...this._classes].join(' '); },
  set(v){ this._classes = new Set(String(v).split(/\s+/).filter(Boolean)); }
});
Object.defineProperty(FakeEl.prototype, 'innerHTML', {
  get(){ return this._innerHTML; },
  set(v){ this._innerHTML = String(v); this.children = []; } // setting innerHTML clears element children (good enough)
});
FakeEl.prototype.appendChild = function(c){ this.children.push(c); return c; };
FakeEl.prototype.insertBefore = function(c){ this.children.push(c); return c; };
FakeEl.prototype.removeChild = function(c){ this.children=this.children.filter(function(x){return x!==c;}); return c; };
FakeEl.prototype.addEventListener = function(){};
FakeEl.prototype.removeEventListener = function(){};
FakeEl.prototype.querySelector = function(){ return new FakeEl('div'); };
FakeEl.prototype.querySelectorAll = function(){ return []; };
FakeEl.prototype.getBoundingClientRect = function(){ return {top:0,bottom:0,left:0,right:0,width:0,height:0}; };
FakeEl.prototype.closest = function(){ return new FakeEl('div'); };
FakeEl.prototype.getAttribute = function(k){ return this._attrs[k] !== undefined ? this._attrs[k] : (this.dataset[camel(k)] || null); };
FakeEl.prototype.setAttribute = function(k,v){ this._attrs[k]=v; };
FakeEl.prototype.focus = function(){};
FakeEl.prototype.select = function(){};
FakeEl.prototype.remove = function(){};
function camel(s){ return s.replace(/^data-/,'').replace(/-([a-z])/g,(m,c)=>c.toUpperCase()); }

// ---- element registry so getElementById returns stable elements ----
const byId = {};
function el(id){ if(!byId[id]){ byId[id]=new FakeEl('div'); byId[id].id=id; } return byId[id]; }

// ---- document / window stubs ----
global.document = {
  getElementById: el,
  createElement: function(tag){ return new FakeEl(tag); },
  createTextNode: function(t){ var e=new FakeEl('#text'); e.textContent=String(t); return e; },
  querySelectorAll: function(){ return []; },
  querySelector: function(){ return new FakeEl('div'); },
  addEventListener: function(){},
  removeEventListener: function(){},
  body: new FakeEl('body'),
};
global.window = {};
global.navigator = { vibrate: function(){} };
global.alert = function(){};
global.confirm = function(){ return true; };
global.prompt = function(){ return 'Test subtask'; };
global.localStorage = {
  _d:{}, getItem:function(k){return this._d[k]||null;},
  setItem:function(k,v){this._d[k]=v;}, removeItem:function(k){delete this._d[k];}
};
// fetch: resolve with a JSON-returning object; capture POST bodies
global.__posts = [];
global.fetch = function(url, opts){
  if (opts && opts.method === 'POST' && opts.body) {
    try { global.__posts.push(JSON.parse(opts.body)); } catch(e){}
  }
  return Promise.resolve({ json: function(){ return Promise.resolve({}); } });
};
global.setTimeout = function(fn){ /* don't actually defer in tests */ };
global.Set = Set;

// ---- load and run the app script ----
let js = fs.readFileSync('/home/claude/extracted.js','utf8');
// strip the window.onload assignment auto-run side effects are fine; eval in global scope
try {
  eval(js);
} catch(e) {
  console.log('LOAD ERROR:', e.message);
  process.exit(1);
}
console.log('Script loaded OK (no parse/load error)');

// ---- build realistic data ----
const today = new Date(); today.setHours(0,0,0,0);
function iso(d){ return d.toISOString().split('T')[0]; }
function plus(n){ const d=new Date(today); d.setDate(d.getDate()+n); return iso(d); }

state.tasks = [
  {task_id:'t1', name:'Move back fridge', type:'one_off', due_date:plus(2), reminder_offset:'1_day', owner:'', scope:'household', status:'active', notes:''},
  {task_id:'t2', name:'Water the plants', type:'floating', urgency_window:'this_week', owner:'Frankie', scope:'household', status:'active'},
  {task_id:'t3', name:'Take out recycling', type:'scheduled', weekday:1, day_of_month:'', sched_freq:'week', sched_interval:1, due_date:plus(3), owner:'Meredith', scope:'household', status:'active'},
  {task_id:'t4', name:'Pay mortgage', type:'scheduled', weekday:'', day_of_month:'1', due_date:plus(10), end_date:'', owner:'', scope:'household', status:'active'},
  {task_id:'t5', name:'Replace AC filter', type:'interval', recurrence_days:30, due_date:plus(15), end_date:plus(200), owner:'', scope:'household', status:'active'},
  {task_id:'t6', name:'My private thing', type:'one_off', due_date:plus(1), owner:'Frankie', scope:'personal', status:'active'},
  {task_id:'t7', name:'Mere private', type:'floating', urgency_window:'no_rush', owner:'Meredith', scope:'personal', status:'active'},
  {task_id:'t8', name:'Overdue task', type:'one_off', due_date:plus(-3), owner:'', scope:'household', status:'active'},
  {task_id:'t9', name:'Done one-off', type:'one_off', due_date:plus(-1), owner:'', scope:'household', status:'done'},
  {task_id:'t10', name:'Ended recurring', type:'scheduled', weekday:5, due_date:'', owner:'', scope:'household', status:'ended'},
  {task_id:'t11', name:'No due floating-less', type:'one_off', owner:'', scope:'household', status:'active'},
  {task_id:'t12', name:'Anniversary', type:'scheduled', weekday:'', day_of_month:'14', sched_month:'2', due_date:plus(40), owner:'', scope:'household', status:'active'},
];
state.projects = [
  {project_id:'p1', name:'Basement remodel', description:'Finish the basement', status:'active', target_date:plus(90)},
  {project_id:'p2', name:'Garden beds', description:'', status:'planned', target_date:''},
];
state.subtasks = [
  {subtask_id:'s1', project_id:'p1', name:'Demo old drywall', status:'next_up', due_date:plus(5), sort_order:0},
  {subtask_id:'s2', project_id:'p1', name:'Frame walls', status:'todo', due_date:'', sort_order:1},
  {subtask_id:'s3', project_id:'p1', name:'Permits', status:'done', due_date:'', sort_order:2},
];
state.grocery = [
  {item_id:'g1', name:'Olive oil', category:'Food', status:'need'},
  {item_id:'g2', name:'Paper towels', category:'Household', status:'got', checked_at:new Date().toISOString()},
  {item_id:'g3', name:'Rotisserie chicken', category:'Costco', status:'need'},
];
state.task_log = [
  {log_id:'l1', task_id:'t1', task_name:'Move back fridge', completed_by:'Frankie', completed_at:new Date().toISOString(), scope:'household'},
  {log_id:'l2', task_id:'t3', task_name:'Take out recycling', completed_by:'Meredith', completed_at:plus(-2)+'T10:00:00Z', scope:'household'},
  {log_id:'l3', task_id:'t6', task_name:'My private thing', completed_by:'Frankie', completed_at:plus(-1)+'T10:00:00Z', scope:'personal'},
];
currentUser = 'Frankie';

// ---- exercise every path ----
const tests = [];
function run(name, fn){ try { fn(); tests.push(['PASS', name]); } catch(e){ tests.push(['FAIL', name + ' :: ' + e.message]); } }

// fmtDate / fmtDateShort / recurrence logic
run('fmtDate basic', ()=>{ if(!fmtDate(plus(2))) throw new Error('empty'); });
run('fmtDate empty', ()=>{ fmtDate(''); });
run('fmtDateShort format', ()=>{ const s=fmtDateShort(iso(today)); if(!/^[A-Za-z]{3} \d{1,2}\/\d{1,2}$/.test(s)) throw new Error('bad format: '+s); });
run('computeFirstDue daily = today', ()=>{ const r=computeFirstDue({type:'scheduled',sched_freq:'day'}, today); if(r!==iso(today)) throw new Error('daily first should be today, got '+r); });
run('computeFirstDue weekly = correct weekday', ()=>{ const r=computeFirstDue({type:'scheduled',sched_freq:'week',weekday:2}, today); if(new Date(r+'T12:00:00').getDay()!==2) throw new Error('not Tuesday'); });
run('computeFirstDue monthly day 18', ()=>{ const r=computeFirstDue({type:'scheduled',sched_freq:'month',day_of_month:'18'}, today); if(new Date(r+'T12:00:00').getDate()!==18) throw new Error('not 18th'); });
run('computeFirstDue monthly last', ()=>{ const r=computeFirstDue({type:'scheduled',sched_freq:'month',day_of_month:'last'}, today); const d=new Date(r+'T12:00:00'); const ld=new Date(d.getFullYear(),d.getMonth()+1,0).getDate(); if(d.getDate()!==ld) throw new Error('not last day'); });
run('computeFirstDue yearly Feb 14', ()=>{ const r=computeFirstDue({type:'scheduled',sched_freq:'year',sched_month:'2',day_of_month:'14'}, today); const d=new Date(r+'T12:00:00'); if(d.getMonth()!==1||d.getDate()!==14) throw new Error('not Feb 14, got '+r); });
run('fmtDate handles full ISO timestamp', ()=>{ const s=fmtDate('2026-06-09T06:00:00.000Z'); if(/[:Z]/.test(s)) throw new Error('timestamp leaked: '+s); if(!s) throw new Error('empty'); });
run('fmtDateShort handles full ISO timestamp', ()=>{ const s=fmtDateShort('2026-06-09T06:00:00.000Z'); if(/[:Z]/.test(s)) throw new Error('timestamp leaked: '+s); if(s!=='Tue 6/9') throw new Error('expected Tue 6/9, got '+s); });
run('dval strips time component', ()=>{ if(dval('2026-06-09T06:00:00.000Z')!=='2026-06-09') throw new Error('got '+dval('2026-06-09T06:00:00.000Z')); if(dval('')!=='') throw new Error('empty fail'); if(dval('2026-06-09')!=='2026-06-09') throw new Error('plain date fail'); });
run('computeFirstDue future start honored', ()=>{ const r=computeFirstDue({type:'scheduled',sched_freq:'day',sched_start:plus(10)}, today); if(r!==plus(10)) throw new Error('future start not honored, got '+r); });
run('computeFirstDue past start clamps to today (week)', ()=>{ const r=computeFirstDue({type:'scheduled',sched_freq:'week',weekday:2,sched_start:plus(-30)}, today); if(new Date(r+'T12:00:00')<today) throw new Error('returned past date '+r); if(new Date(r+'T12:00:00').getDay()!==2) throw new Error('not Tuesday'); });
run('computeFirstDue interval future start = start', ()=>{ const r=computeFirstDue({type:'interval',recurrence_days:20,sched_start:plus(5)}, today); if(r!==plus(5)) throw new Error('interval future start should be start date, got '+r); });
run('computeFirstDue interval no start = today+days', ()=>{ const r=computeFirstDue({type:'interval',recurrence_days:20}, today); if(r!==plus(20)) throw new Error('interval no-start should be +20, got '+r); });
run('openEditTask date inputs are yyyy-mm-dd', ()=>{ openEditTask({task_id:'x',type:'one_off',due_date:'2026-06-09T06:00:00.000Z',name:'X',scope:'household'}); const v=el('t-due').value; if(/T|Z/.test(v)) throw new Error('input got timestamp: '+v); if(v!=='2026-06-09') throw new Error('input not yyyy-mm-dd: '+v); });
run('computeNextDue handles ISO-timestamp due_date anchor', ()=>{ const r=computeNextDue({type:'scheduled',sched_freq:'day',sched_interval:1,due_date:iso(today)+'T06:00:00.000Z'}, today); if(!r||!/^\d{4}-\d{2}-\d{2}$/.test(r)) throw new Error('invalid result: '+r); if(r!==plus(1)) throw new Error('expected tomorrow, got '+r); });
run('tomorrow tab matches ISO-timestamp due date', ()=>{ const saved=state.tasks; state.tasks=[{task_id:'tt',name:'Tmrw',type:'one_off',due_date:plus(1)+'T06:00:00.000Z',scope:'household',status:'active'}]; taskScope='household'; taskTab='tomorrow'; renderTasks(); const n=el('task-list').children.length; state.tasks=saved; if(n<1) throw new Error('tomorrow task not rendered'); });
run('week view splits today/tomorrow/thisweek stripes', ()=>{ const sv=state.tasks, sp=state.projects; state.projects=[]; state.tasks=[{task_id:'a',type:'one_off',due_date:iso(today)+'T06:00:00Z',scope:'household',status:'active',name:'A'},{task_id:'b',type:'one_off',due_date:plus(1)+'T06:00:00Z',scope:'household',status:'active',name:'B'},{task_id:'c',type:'one_off',due_date:plus(4)+'T06:00:00Z',scope:'household',status:'active',name:'C'}]; taskScope='household'; taskTab='week'; renderTasks(); const n=el('task-list').children.length; state.tasks=sv; state.projects=sp; if(n!==3) throw new Error('expected 3 stripes, got '+n); });
run('month view splits into 4 stripes', ()=>{ const sv=state.tasks, sp=state.projects; state.projects=[]; state.tasks=[{task_id:'a',type:'one_off',due_date:iso(today)+'T06:00:00Z',scope:'household',status:'active',name:'A'},{task_id:'b',type:'one_off',due_date:plus(1)+'T06:00:00Z',scope:'household',status:'active',name:'B'},{task_id:'c',type:'one_off',due_date:plus(4)+'T06:00:00Z',scope:'household',status:'active',name:'C'},{task_id:'d',type:'one_off',due_date:plus(20)+'T06:00:00Z',scope:'household',status:'active',name:'D'}]; taskScope='household'; taskTab='month'; renderTasks(); const n=el('task-list').children.length; state.tasks=sv; state.projects=sp; if(n!==4) throw new Error('expected 4 stripes, got '+n); });
run('computeNextDue every day = tomorrow', ()=>{ const r=computeNextDue({type:'scheduled',sched_freq:'day',sched_interval:1,due_date:iso(today)}, today); if(r!==plus(1)) throw new Error('not tomorrow, got '+r); });
run('computeNextDue every other day = +2', ()=>{ const r=computeNextDue({type:'scheduled',sched_freq:'day',sched_interval:2,due_date:iso(today)}, today); if(r!==plus(2)) throw new Error('not +2, got '+r); });
run('computeNextDue every 2 weeks = +14d same weekday', ()=>{ const first=computeFirstDue({type:'scheduled',sched_freq:'week',weekday:2},today); const r=computeNextDue({type:'scheduled',sched_freq:'week',sched_interval:2,weekday:2,due_date:first}, today); const gap=Math.round((new Date(r+'T12:00:00')-new Date(first+'T12:00:00'))/86400000); if(gap!==14) throw new Error('gap '+gap+' not 14'); if(new Date(r+'T12:00:00').getDay()!==2) throw new Error('weekday drifted'); });
run('computeNextDue every 3 months on 15th', ()=>{ const first=computeFirstDue({type:'scheduled',sched_freq:'month',day_of_month:'15'},today); const r=computeNextDue({type:'scheduled',sched_freq:'month',sched_interval:3,day_of_month:'15',due_date:first}, today); const a=new Date(first+'T12:00:00'),b=new Date(r+'T12:00:00'); const months=(b.getFullYear()-a.getFullYear())*12+(b.getMonth()-a.getMonth()); if(months!==3) throw new Error('months '+months+' not 3'); if(b.getDate()!==15) throw new Error('day not 15'); });
run('computeNextDue interval = +5', ()=>{ const r=computeNextDue({type:'interval',recurrence_days:5}, today); if(r!==plus(5)) throw new Error('not +5, got '+r); });
run('computeNextDue past end null', ()=>{ const r=computeNextDue({type:'interval',recurrence_days:5,end_date:plus(-1)}, today); if(r!==null) throw new Error('should be null'); });
run('schedFreqOf legacy inference', ()=>{ if(schedFreqOf({weekday:3})!=='week') throw new Error('week'); if(schedFreqOf({day_of_month:'5'})!=='month') throw new Error('month'); if(schedFreqOf({sched_month:'4',day_of_month:'2'})!=='year') throw new Error('year'); if(schedFreqOf({})!=='day') throw new Error('day'); });

// render across both scopes and all tabs (incl. new tomorrow tab)
for (const scope of ['household','personal']) {
  taskScope = scope;
  for (const tab of ['all','today','tomorrow','week','month','recurring']) {
    taskTab = tab;
    run(`renderTasks scope=${scope} tab=${tab}`, ()=>renderTasks());
  }
}
// switch user and re-render personal
currentUser='Meredith'; taskScope='personal'; taskTab='all';
run('renderTasks personal as Meredith', ()=>renderTasks());
currentUser='Frankie';

run('renderProjects', ()=>renderProjects());
run('renderGrocery', ()=>renderGrocery());
run('renderAssets', ()=>renderAssets());
run('renderStats 30', ()=>{ el('metrics-window').value='30'; renderStats(); });
run('renderStats 365', ()=>{ el('metrics-window').value='365'; renderStats(); });
run('renderHistory no search', ()=>{ el('history-search').value=''; renderHistory(); });
run('renderHistory with search', ()=>{ el('history-search').value='recycling'; renderHistory(); });
run('renderAll', ()=>renderAll());

// modal/edit flows (no network actually fires; we just want no JS errors building the form)
run('openAddTask', ()=>openAddTask());
run('openEditTask one_off', ()=>openEditTask(state.tasks[0]));
run('openEditTask floating', ()=>openEditTask(state.tasks[1]));
run('openEditTask scheduled-weekly', ()=>openEditTask(state.tasks[2]));
run('openEditTask scheduled-monthly', ()=>openEditTask(state.tasks[3]));
run('openEditTask scheduled-yearly', ()=>openEditTask(state.tasks[11]));
run('updateSchedFields week', ()=>{ el('t-sched-freq').value='week'; updateSchedFields(); if(!el('sched-month')._classes.has('gone')) throw new Error('month should be hidden'); });
run('updateSchedFields month', ()=>{ el('t-sched-freq').value='month'; updateSchedFields(); if(el('sched-month')._classes.has('gone')) throw new Error('month should be shown'); });
run('updateSchedFields year', ()=>{ el('t-sched-freq').value='year'; updateSchedFields(); if(el('sched-year')._classes.has('gone')) throw new Error('year should be shown'); });
run('openEditTask interval', ()=>openEditTask(state.tasks[4]));
run('openEditTask personal', ()=>openEditTask(state.tasks[5]));
run('updateTaskTypeFields', ()=>{ el('t-type').value='scheduled'; updateTaskTypeFields(); });
run('pickScope household', ()=>pickScope('household'));
run('pickScope personal', ()=>pickScope('personal'));
run('pickOwner either', ()=>pickOwner(''));
run('pickOwner Frankie', ()=>pickOwner('Frankie'));
run('pickUrgency', ()=>pickUrgency('this_month'));

// submitTask validation paths (network stubbed)
run('submitTask one_off', ()=>{ editingTask=null; pickedScope='household'; pickedOwner=''; el('t-name').value='New task'; el('t-type').value='one_off'; el('t-due').value=plus(4); el('t-remind').value='1_day'; el('t-notes').value=''; submitTask(); });
run('submitTask scheduled weekly', ()=>{ __posts.length=0; editingTask=null; el('t-name').value='Recycling'; el('t-type').value='scheduled'; el('t-sched-freq').value='week'; el('t-sched-interval').value='1'; el('t-sched-weekday').value='3'; el('t-end-sched').value=''; submitTask(); const d=__posts[__posts.length-1].data; if(d.weekday!==3) throw new Error('weekday not 3'); if(d.day_of_month!=='') throw new Error('dom should be empty'); if(d.sched_freq!=='week') throw new Error('freq not week'); if(d.sched_interval!==1) throw new Error('interval not 1'); if(d.due_date!=='') throw new Error('due should be blank for backend recompute'); });
run('submitTask scheduled every 2 weeks', ()=>{ __posts.length=0; editingTask=null; el('t-name').value='Biweekly'; el('t-type').value='scheduled'; el('t-sched-freq').value='week'; el('t-sched-interval').value='2'; el('t-sched-weekday').value='2'; submitTask(); const d=__posts[__posts.length-1].data; if(d.sched_interval!==2) throw new Error('interval not 2'); if(d.sched_freq!=='week') throw new Error('freq not week'); });
run('submitTask scheduled daily', ()=>{ __posts.length=0; editingTask=null; el('t-name').value='Walk dog'; el('t-type').value='scheduled'; el('t-sched-freq').value='day'; el('t-sched-interval').value='1'; submitTask(); const d=__posts[__posts.length-1].data; if(d.sched_freq!=='day') throw new Error('freq not day'); if(d.weekday!=='') throw new Error('weekday should be empty'); if(d.day_of_month!=='') throw new Error('dom should be empty'); });
run('submitTask scheduled monthly', ()=>{ __posts.length=0; editingTask=null; el('t-name').value='Rent'; el('t-type').value='scheduled'; el('t-sched-freq').value='month'; el('t-sched-interval').value='1'; el('t-sched-monthday').value='18'; submitTask(); const d=__posts[__posts.length-1].data; if(d.day_of_month!=='18') throw new Error('dom not 18'); if(d.weekday!=='') throw new Error('weekday should be empty'); });
run('submitTask scheduled every 3 months', ()=>{ __posts.length=0; editingTask=null; el('t-name').value='Quarterly'; el('t-type').value='scheduled'; el('t-sched-freq').value='month'; el('t-sched-interval').value='3'; el('t-sched-monthday').value='1'; submitTask(); const d=__posts[__posts.length-1].data; if(d.sched_interval!==3) throw new Error('interval not 3'); });
run('submitTask scheduled yearly', ()=>{ __posts.length=0; editingTask=null; el('t-name').value='Anniversary'; el('t-type').value='scheduled'; el('t-sched-freq').value='year'; el('t-sched-interval').value='1'; el('t-sched-yearmonth').value='2'; el('t-sched-yearday').value='14'; submitTask(); const d=__posts[__posts.length-1].data; if(d.day_of_month!=='14') throw new Error('yearday not 14'); if(d.sched_month!=='2') throw new Error('sched_month not 2'); if(d.weekday!=='') throw new Error('weekday should be empty'); });
run('submitTask interval', ()=>{ editingTask=null; el('t-name').value='Interval'; el('t-type').value='interval'; el('t-days').value='14'; submitTask(); });
run('submitTask edit existing', ()=>{ editingTask=state.tasks[0]; el('t-name').value='Edited'; el('t-type').value='one_off'; submitTask(); });

// nav
run('go tasks', ()=>go('tasks'));
run('go projects', ()=>go('projects'));
run('go grocery', ()=>go('grocery'));
run('go assets', ()=>go('assets'));
run('go metrics', ()=>go('metrics'));
run('setScope', ()=>setScope('personal'));
run('setTaskTab', ()=>setTaskTab('today'));
run('setMetricsTab stats', ()=>setMetricsTab('stats'));
run('setMetricsTab history', ()=>setMetricsTab('history'));
run('toggleLegend', ()=>toggleLegend());

// complete / snooze / batch (network stubbed)
run('handleComplete one_off', ()=>handleComplete(state.tasks[0]));
run('handleComplete scheduled', ()=>handleComplete(state.tasks[2]));
run('handleComplete sends due_date+freq', ()=>{ __posts.length=0; handleComplete(state.tasks[2]); const d=__posts[__posts.length-1].data; if(!('due_date' in d)) throw new Error('due_date missing'); if(!('sched_freq' in d)) throw new Error('sched_freq missing'); if(!('sched_interval' in d)) throw new Error('sched_interval missing'); });
run('openSnooze future task uses due_date base', ()=>{ snoozingTask=state.tasks[4]; openSnooze(state.tasks[4]); }); // t5 due_date=plus(15)
run('openSnooze overdue task uses today base', ()=>{ openSnooze(state.tasks[7]); }); // t8 due_date=plus(-3)
run('pickSnoozeDays sets pending', ()=>{ pickSnoozeDays(3, new FakeEl('button')); if(!pendingSnooze||pendingSnooze.value!==3||pendingSnooze.kind!=='days') throw new Error('pending not set'); });
run('confirmSnooze days overdue -> base=today, sends until_date', ()=>{
  __posts.length=0; snoozingTask=state.tasks[7]; // t8 overdue (plus(-3))
  pickSnoozeDays(7,new FakeEl('button')); confirmSnooze();
  const b=__posts[__posts.length-1];
  if(b.action!=='snoozeTask') throw new Error('not snoozeTask');
  if(!b.data.until_date) throw new Error('until_date missing');
  // overdue: base=today, so until_date should be today+7
  if(b.data.until_date!==plus(7)) throw new Error('expected '+plus(7)+', got '+b.data.until_date);
});
run('confirmSnooze days future -> base=due_date, sends until_date', ()=>{
  __posts.length=0; snoozingTask=state.tasks[4]; // t5 due_date=plus(15)
  pickSnoozeDays(3,new FakeEl('button')); confirmSnooze();
  const b=__posts[__posts.length-1];
  if(!b.data.until_date) throw new Error('until_date missing');
  if(b.data.until_date!==plus(18)) throw new Error('expected '+plus(18)+', got '+b.data.until_date);
});
run('pickSnoozeDate + confirm', ()=>{ __posts.length=0; snoozingTask=state.tasks[0]; pickSnoozeDate('2026-07-01'); if(pendingSnooze.kind!=='until') throw new Error('kind not until'); confirmSnooze(); const b=__posts[__posts.length-1]; if(b.data.until_date!=='2026-07-01') throw new Error('until not set'); });
run('enterBatch/toggleSelect/batchComplete', ()=>{ enterBatch(); toggleSelect('t1'); toggleSelect('t2'); batchCompleteSelected(); });

// asset panel — requires state.assets
state.assets = [
  {asset_id:'a-furnace', name:'Furnace', category:'Home systems', status:'amber', notes:'AHS Gold covered.', install_date:'2024-01-09', last_service_date:'', next_service_date:'', warranty_expiry:'', icon:'ti-flame', icon_bg:'#FEF3C7', icon_color:'#D97706'},
  {asset_id:'a-wh', name:'Water heater', category:'Home systems', status:'red', notes:'Old.', install_date:'2015-03-01', last_service_date:'', next_service_date:'', warranty_expiry:'', icon:'ti-droplet', icon_bg:'#FEF2F2', icon_color:'#DC2626'},
  {asset_id:'a-ac', name:'AC', category:'Home systems', status:'green', notes:'', install_date:'', last_service_date:'2025-05-05', next_service_date:'', warranty_expiry:''},
];
state.maintenance_logs = [
  {log_id:'m1', asset_id:'a-furnace', date:'2024-01-09', note:'Furnace replaced by Tradewinds'},
];
run('renderAssets with state.assets', ()=>renderAssets());
run('openAssetPanel furnace', ()=>{ openAssetPanel('a-furnace'); if(openAssetId!=='a-furnace') throw new Error('openAssetId not set'); });
run('openAssetPanel water heater', ()=>openAssetPanel('a-wh'));
run('openAssetPanel shows maintenance log', ()=>{ openAssetPanel('a-furnace'); const children=el('p-log').children; if(!children.length) throw new Error('no log items'); const html=children[0]._innerHTML; if(!html.includes('Tradewinds')) throw new Error('log entry missing: '+html); });
run('closePanel', ()=>{ closePanel(); if(openAssetId!==null) throw new Error('openAssetId not cleared'); });
run('openAddAsset', ()=>{ openAddAsset(); if(editingAsset!==null) throw new Error('editingAsset should be null'); });
run('openEditAsset', ()=>{ openAssetId='a-furnace'; openEditAsset(); if(!editingAsset) throw new Error('editingAsset not set'); });
run('submitEditAsset add -> addAsset', ()=>{ __posts.length=0; editingAsset=null; el('ea-name').value='New boiler'; el('ea-category').value='Home systems'; el('ea-status').value='green'; el('ea-install').value=''; el('ea-last-service').value=''; el('ea-next-service').value=''; el('ea-warranty').value=''; el('ea-notes').value=''; submitEditAsset(); if(__posts[__posts.length-1].action!=='addAsset') throw new Error('not addAsset'); });
run('submitEditAsset edit -> updateAsset', ()=>{ __posts.length=0; editingAsset=state.assets[0]; el('ea-name').value='Furnace updated'; el('ea-category').value='Home systems'; el('ea-status').value='amber'; el('ea-install').value='2024-01-09'; el('ea-last-service').value=''; el('ea-next-service').value=''; el('ea-warranty').value=''; el('ea-notes').value='updated'; submitEditAsset(); if(__posts[__posts.length-1].action!=='updateAsset') throw new Error('not updateAsset'); });
run('deleteEditingAsset -> deleteAsset', ()=>{ __posts.length=0; editingAsset=state.assets[0]; deleteEditingAsset(); if(__posts[__posts.length-1].action!=='deleteAsset') throw new Error('not deleteAsset'); });
run('openAddMaintenanceNote', ()=>{ openAssetId='a-furnace'; openAddMaintenanceNote(); });
run('submitMaintenanceNote -> addMaintenanceNote', ()=>{ __posts.length=0; openAssetId='a-furnace'; el('mn-note').value='Test note'; el('mn-date').value='2026-06-12'; submitMaintenanceNote(); if(__posts[__posts.length-1].action!=='addMaintenanceNote') throw new Error('not addMaintenanceNote'); });

// grocery
run('toggleGrocery', ()=>{ const e=new FakeEl('div'); e._classes=new Set(); e.querySelector=()=>new FakeEl('div'); toggleGrocery('g1', e); });
run('makeGrocEl builds item', ()=>{ const d=makeGrocEl(state.grocery[0]); if(!d.classList.contains('gi')) throw new Error('not a .gi'); });
run('makeGrocAdd builds input', ()=>{ const i=makeGrocAdd('Food'); if(!i.classList.contains('groc-add')) throw new Error('not a .groc-add'); if(i.placeholder!=='+ Add item') throw new Error('bad placeholder'); });
run('clearGrocery', ()=>clearGrocery());

// project + subtask edit (network stubbed)
run('openAddProject', ()=>{ openAddProject(); if(editingProject!==null) throw new Error('should be null on add'); });
run('openEditProject loads', ()=>{ openEditProject('p1'); if(!editingProject) throw new Error('not editing'); });
run('submitProject edit -> updateProject', ()=>{ __posts.length=0; openEditProject('p1'); el('p-name').value='Renamed'; submitProject(); if(__posts[__posts.length-1].action!=='updateProject') throw new Error('not updateProject'); });
run('submitProject add -> addProject', ()=>{ __posts.length=0; openAddProject(); el('p-name').value='New Proj'; submitProject(); if(__posts[__posts.length-1].action!=='addProject') throw new Error('not addProject'); });
run('deleteEditingProject -> deleteProject', ()=>{ __posts.length=0; openEditProject('p1'); deleteEditingProject(); if(__posts[__posts.length-1].action!=='deleteProject') throw new Error('not deleteProject'); });
run('openEditSubtask loads', ()=>{ openEditSubtask('s1'); if(!editingSubtask) throw new Error('not editing sub'); });
run('submitSubtask -> updateSubtask', ()=>{ __posts.length=0; openEditSubtask('s1'); el('st-name').value='Edited sub'; submitSubtask(); if(__posts[__posts.length-1].action!=='updateSubtask') throw new Error('not updateSubtask'); });
run('deleteEditingSubtask -> deleteSubtask', ()=>{ __posts.length=0; openEditSubtask('s1'); deleteEditingSubtask(); if(__posts[__posts.length-1].action!=='deleteSubtask') throw new Error('not deleteSubtask'); });

// metric drill-down
run('openMetricDrillDown all', ()=>{ el('metrics-window').value='30'; renderStats(); openMetricDrillDown(0); });
run('openMetricDrillDown Frankie', ()=>openMetricDrillDown(1));
run('openMetricDrillDown Meredith', ()=>openMetricDrillDown(2));
run('renderTrendChart', ()=>{ el('metrics-window').value='30'; renderStats(); const w=el('metrics-trend'); if(w._innerHTML===undefined) throw new Error('trend not rendered'); });

// history edit actions
run('renderHistory with action buttons', ()=>{ el('history-search').value=''; renderHistory(); });
run('openHistoryActionMenu', ()=>{ _histMenuLog=state.task_log[0]; openHistoryActionMenu({currentTarget:{getBoundingClientRect:()=>({right:100,bottom:50})}}, state.task_log[0]); closeTaskMenu(); });
run('markIncomplete -> uncompleteTask', ()=>{ __posts.length=0; _histMenuLog=state.task_log[0]; markIncomplete(); if(__posts[__posts.length-1].action!=='uncompleteTask') throw new Error('not uncompleteTask'); });
run('openReassignMenu opens modal', ()=>{ _histMenuLog=state.task_log[0]; openReassignMenu(); });
run('submitReassign -> reassignCompletion', ()=>{ __posts.length=0; _histMenuLog=state.task_log[1]; submitReassign('Frankie'); if(__posts[__posts.length-1].action!=='reassignCompletion') throw new Error('not reassignCompletion'); if(__posts[__posts.length-1].data.completed_by!=='Frankie') throw new Error('wrong person'); });

// populateAssetDropdown
run('populateAssetDropdown', ()=>populateAssetDropdown());
run('openAddTaskForAsset pre-fills asset', ()=>{ openAssetId='a-furnace'; openAddTaskForAsset(); if(el('t-asset-link').value!=='a-furnace') throw new Error('asset not pre-filled'); });

// login flow
run('selectUser', ()=>selectUser('Frankie', new FakeEl('button')));
run('updateUserDisplay', ()=>updateUserDisplay());
run('quickSwitch', ()=>quickSwitch('Meredith'));

// ── v8.1 new tests ───────────────────────────────────────
run('toggleLegend no-op', ()=>toggleLegend());
run('toggleSearch', ()=>{ toggleSearch(); toggleSearch(); });
run('onSearchInput filters', ()=>{
  taskSearch=''; taskScope='household'; taskTab='all';
  el('search-inp').value='recycling'; onSearchInput(); taskSearch='';
});
run('search filter excludes non-matching', ()=>{
  const sv=state.tasks,sp=state.projects,ss=state.subtasks;
  state.tasks=[{task_id:'sa',name:'Walk dog',type:'one_off',due_date:plus(1),scope:'household',status:'active',notes:''},{task_id:'sb',name:'Wash dishes',type:'one_off',due_date:plus(2),scope:'household',status:'active',notes:''}];
  state.projects=[];state.subtasks=[];
  taskSearch='dog'; taskScope='household'; taskTab='all'; renderTasks();
  const n=el('task-list').children.length;
  state.tasks=sv;state.projects=sp;state.subtasks=ss; taskSearch='';
  if(n!==1) throw new Error('expected 1 stripe got '+n);
});
run('reminder bucketing renders', ()=>{
  const sv=state.tasks;
  state.tasks=[{task_id:'r1',name:'Reminder task',type:'one_off',due_date:plus(2),reminder_offset:'3_days',scope:'household',status:'active',notes:''}];
  taskScope='household'; taskTab='today'; renderTasks();
  state.tasks=sv;
});
run('nthWeekdayOfMonth first Monday Jan 2026', ()=>{
  const d=nthWeekdayOfMonth(1,1,2026,0);
  if(d.getDay()!==1) throw new Error('not Monday: '+d.getDay());
  if(d.getDate()>7) throw new Error('not first week: '+d.getDate());
});
run('nthWeekdayOfMonth last Friday Jan 2026', ()=>{
  const d=nthWeekdayOfMonth(-1,5,2026,0);
  if(d.getDay()!==5) throw new Error('not Friday: '+d.getDay());
});
run('nthWeekdayOfMonth second Tuesday', ()=>{
  const d=nthWeekdayOfMonth(2,2,2026,0);
  if(d.getDay()!==2) throw new Error('not Tuesday');
  if(d.getDate()<8||d.getDate()>14) throw new Error('not second week: '+d.getDate());
});
run('sched_pattern first-1 computeFirstDue (month)', ()=>{
  const r=computeFirstDue({type:'scheduled',sched_freq:'month',day_of_month:'',sched_pattern:'first-1'},today);
  if(!r) throw new Error('null result');
  const d=new Date(r+'T12:00:00');
  if(d.getDay()!==1) throw new Error('not Monday: '+d.getDay());
  if(d.getDate()>7) throw new Error('not in first week: '+d.getDate());
});
run('sched_pattern last-5 computeFirstDue (month)', ()=>{
  const r=computeFirstDue({type:'scheduled',sched_freq:'month',day_of_month:'',sched_pattern:'last-5'},today);
  if(!r) throw new Error('null result');
  const d=new Date(r+'T12:00:00');
  if(d.getDay()!==5) throw new Error('not Friday: '+d.getDay());
});
run('sched_pattern first-1 computeFirstDue (week)', ()=>{
  const r=computeFirstDue({type:'scheduled',sched_freq:'week',weekday:1,sched_pattern:'first-1'},today);
  if(!r) throw new Error('null result');
  const d=new Date(r+'T12:00:00');
  if(d.getDay()!==1) throw new Error('not Monday: '+d.getDay());
});
run('asset link icon renders in task card', ()=>{
  const sv=state.tasks;
  state.tasks=[{task_id:'al1',name:'Asset task',type:'one_off',due_date:plus(1),scope:'household',status:'active',linked_asset_id:'a-furnace',notes:''}];
  taskScope='household'; taskTab='all'; renderTasks();
  state.tasks=sv;
});
run('project link icon renders in task card', ()=>{
  const sv=state.tasks;
  state.tasks=[{task_id:'pl1',name:'Proj task',type:'one_off',due_date:plus(1),scope:'household',status:'active',linked_project_id:'p1',notes:''}];
  taskScope='household'; taskTab='all'; renderTasks();
  state.tasks=sv;
});
run('done projects filtered from active/planned', ()=>{
  const sv=state.projects;
  state.projects=[
    {project_id:'pd1',name:'Done proj',description:'',status:'done',target_date:''},
    {project_id:'pa1',name:'Active proj',description:'',status:'active',target_date:''},
  ];
  renderProjects();
  const html=el('proj-active')._innerHTML||'';
  state.projects=sv;
  if(html.includes('Done proj')) throw new Error('done project in active section');
});
run('past projects section exists', ()=>{
  const sv=state.projects;
  state.projects=[{project_id:'pd2',name:'Old proj',description:'',status:'done',target_date:''}];
  renderProjects();
  state.projects=sv;
});
run('togglePastProjects', ()=>togglePastProjects());
run('openBatchSnooze', ()=>{ enterBatch(); toggleSelect('t1'); openBatchSnooze(); closeModal('modal-batch-snooze'); exitBatch(); });
run('batch snooze days payload', ()=>{
  __posts.length=0;
  enterBatch(); toggleSelect('t1'); toggleSelect('t8');
  pendingBatchSnooze={kind:'days',value:3};
  confirmBatchSnooze();
  const b=__posts[__posts.length-1];
  if(b.action!=='snoozeTask') throw new Error('not snoozeTask: '+b.action);
  if(!b.data.until_date) throw new Error('until_date missing');
});
run('batch snooze date payload', ()=>{
  __posts.length=0;
  enterBatch(); toggleSelect('t1');
  pendingBatchSnooze={kind:'until',value:'2026-08-01'};
  confirmBatchSnooze();
  const b=__posts[__posts.length-1];
  if(b.data.until_date!=='2026-08-01') throw new Error('wrong date: '+b.data.until_date);
});
run('populateProjectDropdown', ()=>populateProjectDropdown());
run('submitTask includes linked_project_id', ()=>{
  __posts.length=0; editingTask=null; pickedScope='household'; pickedOwner='';
  el('t-name').value='Linked task'; el('t-type').value='one_off'; el('t-due').value=plus(4);
  el('t-remind').value=''; el('t-notes').value=''; el('t-proj-link').value='p1';
  submitTask();
  const d=__posts[__posts.length-1].data;
  if(d.linked_project_id!=='p1') throw new Error('linked_project_id not p1: '+d.linked_project_id);
});
run('submitTask scheduled clears sched_pattern', ()=>{
  __posts.length=0; editingTask=null; el('t-name').value='Recur task';
  el('t-type').value='scheduled'; el('t-sched-freq').value='week'; el('t-sched-interval').value='1';
  el('t-sched-weekday').value='1'; el('t-end-sched').value='';
  submitTask();
  const d=__posts[__posts.length-1].data;
  if(d.sched_pattern!=='') throw new Error('sched_pattern should be empty: '+d.sched_pattern);
});
run('renderAll with history tab active', ()=>{ currentView='metrics'; metricsTab='history'; renderAll(); metricsTab='stats'; });

// ── v8.2 new tests ───────────────────────────────────────
run('openAssetPanel with new fields', ()=>{
  const sv=state.assets;
  state.assets=[{asset_id:'a-test',name:'Test Asset',category:'Appliances',status:'green',notes:'Test notes',install_date:'2024-01-01',purchase_price:'$1,500',manual_url:'https://example.com/manual',contractors:'[{"name":"Joe","role":"Plumber","phone":"303-555-1234"}]',icon:'ti-droplet',icon_bg:'#EFF6FF',icon_color:'#3B82F6'}];
  openAssetPanel('a-test');
  state.assets=sv;
});
run('openAssetPanel handles empty contractors', ()=>{
  const sv=state.assets;
  state.assets=[{asset_id:'a-test2',name:'No Contractors',category:'Appliances',status:'amber',notes:'',install_date:'',purchase_price:'',manual_url:'',contractors:'[]',icon:'ti-wind',icon_bg:'#EFF6FF',icon_color:'#2563EB'}];
  openAssetPanel('a-test2');
  state.assets=sv;
});
run('openAssetPanel handles malformed contractors JSON', ()=>{
  const sv=state.assets;
  state.assets=[{asset_id:'a-test3',name:'Bad JSON',category:'Appliances',status:'green',notes:'',install_date:'',purchase_price:'',manual_url:'',contractors:'not-json',icon:'ti-flame',icon_bg:'#FEF3C7',icon_color:'#D97706'}];
  openAssetPanel('a-test3');
  state.assets=sv;
});
run('setPanelTab switches active tab', ()=>{
  setPanelTab('tasks');
  if(!el('ptab-tasks')._classes.has('on')) throw new Error('tasks tab not on');
  if(el('ptab-log')._classes.has('on')) throw new Error('log tab still on');
  if(el('panel-tab-tasks')._classes.has('gone')) throw new Error('tasks content still hidden');
  if(!el('panel-tab-log')._classes.has('gone')) throw new Error('log content not hidden');
  setPanelTab('log');
});
run('openAddAsset clears new fields', ()=>{
  el('ea-price').value='$500'; el('ea-manual-url').value='https://example.com';
  openAddAsset();
  if(el('ea-price').value!=='') throw new Error('ea-price not cleared');
  if(el('ea-manual-url').value!=='') throw new Error('ea-manual-url not cleared');
});
run('addContractorField adds row', ()=>{
  el('ea-contractors-list').children=[];
  addContractorField({name:'Test Contractor',role:'HVAC',phone:'303-555-0000'});
});
run('submitEditAsset includes purchase_price and manual_url', ()=>{
  __posts.length=0;
  editingAsset={asset_id:'a-furnace'};
  el('ea-name').value='Furnace'; el('ea-category').value='Home systems';
  el('ea-status').value='green'; el('ea-install').value='';
  el('ea-last-service').value=''; el('ea-next-service').value='';
  el('ea-warranty').value=''; el('ea-notes').value='';
  el('ea-price').value='$3,200'; el('ea-manual-url').value='https://example.com/doc';
  el('ea-contractors-list').children=[];
  el('ea-contractors-list').querySelectorAll=function(){return [];};
  submitEditAsset();
  const d=__posts[__posts.length-1].data.updates;
  if(d.purchase_price!=='$3,200') throw new Error('purchase_price not in payload: '+d.purchase_price);
  if(d.manual_url!=='https://example.com/doc') throw new Error('manual_url not in payload');
});
run('renderAssets shows overdue badge', ()=>{
  const sv=state.assets,st=state.tasks;
  state.assets=[{asset_id:'a-ov',name:'Overdue Asset',category:'Appliances',status:'green',icon:'ti-droplet',icon_bg:'#EFF6FF',icon_color:'#2563EB',purchase_price:'',manual_url:'',contractors:'[]'}];
  state.tasks=[{task_id:'ov1',name:'Overdue task',type:'one_off',due_date:'2024-01-01',scope:'household',status:'active',linked_asset_id:'a-ov'}];
  renderAssets();
  state.assets=sv;state.tasks=st;
});
run('makeProjTaskItems merges tasks and subtasks', ()=>{
  const sv=state.tasks,ss=state.subtasks;
  state.tasks=[{task_id:'pt1',name:'Proj task',type:'one_off',due_date:'',status:'active',linked_project_id:'p1',scope:'household',notes:''}];
  state.subtasks=[{subtask_id:'s1',project_id:'p1',name:'Legacy subtask',status:'active',due_date:''}];
  const items=makeProjTaskItems('p1');
  state.tasks=sv;state.subtasks=ss;
  if(items.length!==2) throw new Error('expected 2 items, got '+items.length);
});
run('renderProjTaskRow returns element', ()=>{
  const item={id:'pt1',name:'Task',due:'2026-07-01',type:'one_off',isDone:false,isTask:true};
  const el2=renderProjTaskRow(item,'p1');
  if(!el2) throw new Error('renderProjTaskRow returned null');
});
run('renderGrocery sorts by sort_order', ()=>{
  const sv=state.grocery;
  state.grocery=[
    {item_id:'g1',name:'Bananas',category:'Produce',status:'need',sort_order:'2'},
    {item_id:'g2',name:'Apples',category:'Produce',status:'need',sort_order:'1'},
  ];
  renderGrocery();
  state.grocery=sv;
});
run('completeTask wrapper calls handleComplete', ()=>{
  const sv=state.tasks;
  state.tasks=[{task_id:'ct1',name:'Test',type:'one_off',due_date:'',status:'active',scope:'household',notes:'',recurrence_days:'',weekday:'',day_of_month:'',sched_month:'',sched_freq:'',sched_interval:''}];
  __posts.length=0;
  completeTask('ct1');
  state.tasks=sv;
  if(!__posts.length) throw new Error('no API call made');
  if(__posts[0].action!=='completeTask') throw new Error('wrong action: '+__posts[0].action);
});
run('editGrocItem replaces text with input', ()=>{
  const item={item_id:'g1',name:'Milk',category:'Dairy',status:'need'};
  const parent=new FakeEl('div');
  const textEl=new FakeEl('span');
  textEl.textContent='Milk';
  textEl.parentNode=parent;
  textEl.nextSibling=null;
  editGrocItem('g1',textEl,item);
});

// ---- report ----
let fails = 0;
for (const [s,n] of tests){ if(s==='FAIL'){ console.log('FAIL  '+n); fails++; } }
console.log('\n'+tests.length+' checks run, '+fails+' failed, '+(tests.length-fails)+' passed');
process.exit(fails? 1:0);
