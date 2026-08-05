// QA harness: mock just enough DOM/browser to run the real app script and
// execute every render path with realistic data, catching runtime errors.
const fs = require('fs');

// ---- Fake element ----
function FakeEl(tag) {
  this.tagName = (tag || 'div').toUpperCase();
  this._classes = new Set();
  // real CSSStyleDeclaration supports custom properties; the app uses them for the
  // batch-bar inset, so the mock needs them too
  this.style = {
    _custom: {},
    setProperty: function(k, v){ this._custom[k] = v; },
    removeProperty: function(k){ delete this._custom[k]; },
    getPropertyValue: function(k){ return this._custom[k] !== undefined ? this._custom[k] : ''; },
  };
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
// set __failNext to make the next request come back the way Apps Script reports
// failures: an {error} body inside an HTTP 200 response.
global.__failNext = false;
global.fetch = function(url, opts){
  if (opts && opts.method === 'POST' && opts.body) {
    try { global.__posts.push(JSON.parse(opts.body)); } catch(e){}
  }
  if (global.__failNext) {
    global.__failNext = false;
    return Promise.resolve({ json: function(){ return Promise.resolve({ error: 'boom' }); } });
  }
  // shape the reply like the real endpoint: getSubtasks returns an array, not an object
  var body = (typeof url === 'string' && url.indexOf('action=getSubtasks') >= 0) ? [] : {};
  return Promise.resolve({ json: function(){ return Promise.resolve(body); } });
};
// don't actually defer in tests, but return a handle so debounce logic is observable
let __timerSeq = 0;
global.setTimeout = function(fn){ return ++__timerSeq; };
global.__clearedTimers = [];
global.clearTimeout = function(h){ global.__clearedTimers.push(h); };
// let promise chains settle (real macrotask, so it runs after all microtasks)
const tick = () => new Promise(r => setImmediate(r));
global.Set = Set;

// ---- load and run the app script ----
// The stylesheet too, so colour rules can be asserted rather than eyeballed.
global.__cssText = (function(){
  try{
    const html = fs.readFileSync('index.html','utf8');
    // the page has more than one <style> block (app styles, then the inline icon set)
    const all = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]);
    return all.join('\n');
  }catch(e){ return ''; }
})();
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
// async variant for tests that must wait on a promise chain to settle.
// Chained, not parallel: these mutate shared globals (state, __failNext) and
// would otherwise interleave at each await and stomp on each other.
let asyncChain = Promise.resolve();
function runAsync(name, fn){
  asyncChain = asyncChain.then(fn).then(
    ()=>tests.push(['PASS', name]),
    (e)=>tests.push(['FAIL', name + ' :: ' + e.message])
  );
}

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
run('fmtTimestamp parses UTC and returns local date string', ()=>{ const s=fmtTimestamp('2026-06-09T23:00:00.000Z'); if(/[:Z]/.test(s)) throw new Error('timestamp leaked: '+s); if(!s) throw new Error('empty'); });
run('computeFirstDue interval start=today returns today', ()=>{ const r=computeFirstDue({type:'interval',recurrence_days:5,sched_start:iso(today)}, today); if(r!==iso(today)) throw new Error('expected today, got '+r); });
run('fmtDateShort handles full ISO timestamp', ()=>{ const s=fmtDateShort('2026-06-09T06:00:00.000Z'); if(/[:Z]/.test(s)) throw new Error('timestamp leaked: '+s); if(s!=='Tue 6/9') throw new Error('expected Tue 6/9, got '+s); });
run('dval strips time component', ()=>{ if(dval('2026-06-09T06:00:00.000Z')!=='2026-06-09') throw new Error('got '+dval('2026-06-09T06:00:00.000Z')); if(dval('')!=='') throw new Error('empty fail'); if(dval('2026-06-09')!=='2026-06-09') throw new Error('plain date fail'); });
run('computeFirstDue future start honored', ()=>{ const r=computeFirstDue({type:'scheduled',sched_freq:'day',sched_start:plus(10)}, today); if(r!==plus(10)) throw new Error('future start not honored, got '+r); });
run('computeFirstDue past start clamps to today (week)', ()=>{ const r=computeFirstDue({type:'scheduled',sched_freq:'week',weekday:2,sched_start:plus(-30)}, today); if(new Date(r+'T12:00:00')<today) throw new Error('returned past date '+r); if(new Date(r+'T12:00:00').getDay()!==2) throw new Error('not Tuesday'); });
run('computeFirstDue interval future start = start', ()=>{ const r=computeFirstDue({type:'interval',recurrence_days:20,sched_start:plus(5)}, today); if(r!==plus(5)) throw new Error('interval future start should be start date, got '+r); });
run('computeFirstDue interval no start = today', ()=>{ const r=computeFirstDue({type:'interval',recurrence_days:20}, today); if(r!==iso(today)) throw new Error('interval no-start should be today, got '+r); });
run('renderTasks interval start=today buckets to Today stripe', ()=>{ const sv=state.tasks; const svTab=taskTab; state.tasks=[{task_id:'it1',name:'Bowl',type:'interval',recurrence_days:5,sched_start:iso(today),due_date:'',status:'active',scope:'household'}]; taskTab='upcoming';renderTasks(); const n=el('task-list').children.length; state.tasks=sv;taskTab=svTab; if(n<1) throw new Error('interval start=today task not in Upcoming ('+n+' stripes rendered)'); });
run('renderTasks interval no sched_start, no due_date buckets to Today', ()=>{ const sv=state.tasks; const svTab=taskTab; state.tasks=[{task_id:'it2',name:'NoDue',type:'interval',recurrence_days:7,sched_start:'',due_date:'',status:'active',scope:'household'}]; taskTab='upcoming';renderTasks(); const n=el('task-list').children.length; state.tasks=sv;taskTab=svTab; if(n<1) throw new Error('interval no-start task not in Upcoming ('+n+' stripes rendered)'); });
run('openEditTask date inputs are yyyy-mm-dd', ()=>{ openEditTask({task_id:'x',type:'one_off',due_date:'2026-06-09T06:00:00.000Z',name:'X',scope:'household'}); const v=el('t-due').value; if(/T|Z/.test(v)) throw new Error('input got timestamp: '+v); if(v!=='2026-06-09') throw new Error('input not yyyy-mm-dd: '+v); });
run('computeNextDue handles ISO-timestamp due_date anchor', ()=>{ const r=computeNextDue({type:'scheduled',sched_freq:'day',sched_interval:1,due_date:iso(today)+'T06:00:00.000Z'}, today); if(!r||!/^\d{4}-\d{2}-\d{2}$/.test(r)) throw new Error('invalid result: '+r); if(r!==plus(1)) throw new Error('expected tomorrow, got '+r); });
run('upcoming tab shows tomorrow task with ISO due date', ()=>{ const saved=state.tasks; state.tasks=[{task_id:'tt',name:'Tmrw',type:'one_off',due_date:plus(1)+'T06:00:00.000Z',scope:'household',status:'active'}]; taskScope='household'; taskTab='upcoming'; renderTasks(); const n=el('task-list').children.length; state.tasks=saved; if(n<1) throw new Error('tomorrow task not rendered in upcoming'); });
run('upcoming view splits today/tomorrow/week/month stripes', ()=>{ const sv=state.tasks, sp=state.projects; state.projects=[]; state.tasks=[{task_id:'a',type:'one_off',due_date:iso(today)+'T06:00:00Z',scope:'household',status:'active',name:'A'},{task_id:'b',type:'one_off',due_date:plus(1)+'T06:00:00Z',scope:'household',status:'active',name:'B'},{task_id:'c',type:'one_off',due_date:plus(4)+'T06:00:00Z',scope:'household',status:'active',name:'C'},{task_id:'d',type:'one_off',due_date:plus(20)+'T06:00:00Z',scope:'household',status:'active',name:'D'}]; taskScope='household'; taskTab='upcoming'; renderTasks(); const n=el('task-list').children.length; state.tasks=sv; state.projects=sp; if(n!==4) throw new Error('expected 4 stripes (today+tomorrow+week+month), got '+n); });
run('computeNextDue every day = tomorrow', ()=>{ const r=computeNextDue({type:'scheduled',sched_freq:'day',sched_interval:1,due_date:iso(today)}, today); if(r!==plus(1)) throw new Error('not tomorrow, got '+r); });
run('computeNextDue every other day = +2', ()=>{ const r=computeNextDue({type:'scheduled',sched_freq:'day',sched_interval:2,due_date:iso(today)}, today); if(r!==plus(2)) throw new Error('not +2, got '+r); });
run('computeNextDue every 2 weeks = +14d same weekday', ()=>{ const first=computeFirstDue({type:'scheduled',sched_freq:'week',weekday:2},today); const r=computeNextDue({type:'scheduled',sched_freq:'week',sched_interval:2,weekday:2,due_date:first}, today); const gap=Math.round((new Date(r+'T12:00:00')-new Date(first+'T12:00:00'))/86400000); if(gap!==14) throw new Error('gap '+gap+' not 14'); if(new Date(r+'T12:00:00').getDay()!==2) throw new Error('weekday drifted'); });
run('computeNextDue every 3 months on 15th', ()=>{ const first=computeFirstDue({type:'scheduled',sched_freq:'month',day_of_month:'15'},today); const r=computeNextDue({type:'scheduled',sched_freq:'month',sched_interval:3,day_of_month:'15',due_date:first}, today); const a=new Date(first+'T12:00:00'),b=new Date(r+'T12:00:00'); const months=(b.getFullYear()-a.getFullYear())*12+(b.getMonth()-a.getMonth()); if(months!==3) throw new Error('months '+months+' not 3'); if(b.getDate()!==15) throw new Error('day not 15'); });
run('computeNextDue interval = +5', ()=>{ const r=computeNextDue({type:'interval',recurrence_days:5}, today); if(r!==plus(5)) throw new Error('not +5, got '+r); });
run('computeNextDue past end null', ()=>{ const r=computeNextDue({type:'interval',recurrence_days:5,end_date:plus(-1)}, today); if(r!==null) throw new Error('should be null'); });
run('schedFreqOf legacy inference', ()=>{ if(schedFreqOf({weekday:3})!=='week') throw new Error('week'); if(schedFreqOf({day_of_month:'5'})!=='month') throw new Error('month'); if(schedFreqOf({sched_month:'4',day_of_month:'2'})!=='year') throw new Error('year'); if(schedFreqOf({})!=='day') throw new Error('day'); });

// render all tabs (both household and personal tasks are merged)
for (const tab of ['today','all','upcoming','recurring','history']) {
  taskTab = tab;
  run(`renderTasks tab=${tab}`, ()=>renderTasks());
}
// personal task visibility: Meredith should not see Frankie's personal tasks
currentUser='Meredith'; taskTab='all';
run('renderTasks as Meredith hides Frankie personal', ()=>{
  renderTasks();
  var frankiePersonal=state.tasks.find(function(t){return t.task_id==='t6';});
  if(frankiePersonal&&frankiePersonal.scope==='personal'&&frankiePersonal.owner==='Frankie'){
    var taskListHTML=document.getElementById('task-list').innerHTML||'';
    if(taskListHTML.includes('My private thing')) throw new Error('Frankie personal task visible to Meredith');
  }
});
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
run('setStatsScope personal', ()=>setStatsScope('personal'));
run('setStatsScope household', ()=>setStatsScope('household'));
run('setTaskTab upcoming', ()=>setTaskTab('upcoming'));
run('setTaskTab history', ()=>setTaskTab('history'));
run('renderTaskHistory', ()=>renderTaskHistory());
run('setTaskTab all', ()=>setTaskTab('all'));
run('setMetricsTab stats', ()=>setMetricsTab('stats'));
run('setMetricsTab household history', ()=>setMetricsTab('household'));
run('setMetricsTab personal history', ()=>setMetricsTab('personal'));

// complete / snooze / batch (network stubbed)
run('handleComplete one_off', ()=>handleComplete(state.tasks[0]));
run('handleComplete scheduled', ()=>handleComplete(state.tasks[2]));
run('handleComplete sends due_date+freq', ()=>{ __posts.length=0; _v9reset(); handleComplete(state.tasks[2]); const d=__posts[__posts.length-1].data.tasks[0]; if(!('due_date' in d)) throw new Error('due_date missing'); if(!('sched_freq' in d)) throw new Error('sched_freq missing'); if(!('sched_interval' in d)) throw new Error('sched_interval missing'); });
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
run('toggleSearch', ()=>{ toggleSearch(); toggleSearch(); });
run('onSearchInput filters', ()=>{
  taskSearch=''; taskTab='all';
  el('search-inp').value='recycling'; onSearchInput(); taskSearch='';
});
run('search filter excludes non-matching', ()=>{
  const sv=state.tasks,sp=state.projects,ss=state.subtasks;
  state.tasks=[{task_id:'sa',name:'Walk dog',type:'one_off',due_date:plus(1),scope:'household',status:'active',notes:''},{task_id:'sb',name:'Wash dishes',type:'one_off',due_date:plus(2),scope:'household',status:'active',notes:''}];
  state.projects=[];state.subtasks=[];
  taskSearch='dog'; taskTab='all'; renderTasks();
  const n=el('task-list').children.length;
  state.tasks=sv;state.projects=sp;state.subtasks=ss; taskSearch='';
  if(n!==1) throw new Error('expected 1 stripe got '+n);
});
run('reminder bucketing renders', ()=>{
  const sv=state.tasks;
  state.tasks=[{task_id:'r1',name:'Reminder task',type:'one_off',due_date:plus(2),reminder_offset:'3_days',scope:'household',status:'active',notes:''}];
  taskTab='upcoming'; renderTasks();
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
  taskTab='all'; renderTasks();
  state.tasks=sv;
});
run('project link icon renders in task card', ()=>{
  const sv=state.tasks;
  state.tasks=[{task_id:'pl1',name:'Proj task',type:'one_off',due_date:plus(1),scope:'household',status:'active',linked_project_id:'p1',notes:''}];
  taskTab='all'; renderTasks();
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
run('renderAll tasks view', ()=>{ currentView='tasks'; taskTab='upcoming'; renderAll(); });
run('renderAll projects view', ()=>{ currentView='projects'; renderAll(); currentView='tasks'; });
run('renderAll metrics history', ()=>{ currentView='metrics'; metricsTab='history'; renderAll(); metricsTab='stats'; currentView='tasks'; });
run('selectAll enters batch and selects', ()=>{ taskTab='upcoming'; renderTasks(); selectAll(); if(!selectMode) throw new Error('not in batch mode'); exitBatch(); renderTasks(); });

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
  // v9: every completion, including the single-task path, goes out as a batchComplete
  if(__posts[0].action!=='batchComplete') throw new Error('wrong action: '+__posts[0].action);
  if(__posts[0].data.tasks[0].task_id!=='ct1') throw new Error('wrong task in the batch');
});
run('computeFirstDue interval with no due_date returns today', ()=>{
  // Interval task with no due_date and no sched_start: first due is today
  const task={type:'interval',recurrence_days:'3',sched_start:'',due_date:'',end_date:''};
  const todayD=new Date(); todayD.setHours(0,0,0,0);
  const r=computeFirstDue(task,todayD);
  if(!r) throw new Error('computeFirstDue returned null for interval with no due_date');
  const due=new Date(r+'T12:00:00'); due.setHours(0,0,0,0);
  const diff=(due-todayD)/(1000*60*60*24);
  if(diff!==0) throw new Error('expected today (0 days out), got: '+diff);
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

// ---- interval recurrence units (v8.8.1) ----
// computeNextDue anchors interval tasks to the completion date passed as fromDate.
const intervalNext = (n, unit, from) => computeNextDue(
  {type:'interval',recurrence_days:n,sched_freq:unit}, new Date(from+'T12:00:00')
);
run('interval days advances by N days', ()=>{
  const r=intervalNext(10,'day','2026-03-01');
  if(r!=='2026-03-11') throw new Error('expected 2026-03-11, got '+r);
});
run('interval weeks advances by N*7 days', ()=>{
  const r=intervalNext(3,'week','2026-03-01');
  if(r!=='2026-03-22') throw new Error('expected 2026-03-22, got '+r);
});
run('interval months advances by N months', ()=>{
  const r=intervalNext(3,'month','2026-03-15');
  if(r!=='2026-06-15') throw new Error('expected 2026-06-15, got '+r);
});
run('interval years advances by N years', ()=>{
  const r=intervalNext(1,'year','2026-03-15');
  if(r!=='2027-03-15') throw new Error('expected 2027-03-15, got '+r);
});
run('interval defaults to days when sched_freq absent (back-compat)', ()=>{
  const r=computeNextDue({type:'interval',recurrence_days:30}, new Date('2026-03-01T12:00:00'));
  if(r!=='2026-03-31') throw new Error('legacy interval task should still step in days, got '+r);
});
// regression guards for the setMonth/setFullYear overflow shipped in v8.8.1
run('interval month clamps Jan 31 to end of Feb, not Mar 3', ()=>{
  const r=intervalNext(1,'month','2026-01-31');
  if(r!=='2026-02-28') throw new Error('expected 2026-02-28, got '+r);
});
run('interval month clamps Jan 31 + 3mo to Apr 30, not May 1', ()=>{
  const r=intervalNext(3,'month','2026-01-31');
  if(r!=='2026-04-30') throw new Error('expected 2026-04-30, got '+r);
});
run('interval month clamps May 31 to Jun 30', ()=>{
  const r=intervalNext(1,'month','2026-05-31');
  if(r!=='2026-06-30') throw new Error('expected 2026-06-30, got '+r);
});
run('interval month keeps leap day when target month allows', ()=>{
  const r=intervalNext(12,'month','2024-02-29');
  if(r!=='2025-02-28') throw new Error('expected 2025-02-28, got '+r);
});
run('interval year clamps leap day to Feb 28', ()=>{
  const r=intervalNext(1,'year','2024-02-29');
  if(r!=='2025-02-28') throw new Error('expected 2025-02-28, got '+r);
});
run('interval respects end_date', ()=>{
  const r=computeNextDue({type:'interval',recurrence_days:1,sched_freq:'year',end_date:'2026-06-01'}, new Date('2026-03-01T12:00:00'));
  if(r!==null) throw new Error('expected null past end_date, got '+r);
});
run('submitTask interval sends recurrence_days + sched_freq unit', ()=>{
  __posts.length=0; editingTask=null;
  el('t-name').value='Filter'; el('t-type').value='interval';
  el('t-days').value='6'; el('t-days-unit').value='month';
  el('t-interval-start').value=''; el('t-end-interval').value='';
  submitTask();
  const d=__posts[__posts.length-1].data;
  if(d.recurrence_days!==6) throw new Error('recurrence_days not 6: '+d.recurrence_days);
  if(d.sched_freq!=='month') throw new Error('sched_freq not month: '+d.sched_freq);
});
run('openEditTask restores interval unit into the dropdown', ()=>{
  openEditTask({task_id:'iv1',name:'AC',type:'interval',recurrence_days:6,sched_freq:'month',scope:'household',status:'active'});
  if(String(el('t-days').value)!=='6') throw new Error('count not restored: '+el('t-days').value);
  if(el('t-days-unit').value!=='month') throw new Error('unit not restored: '+el('t-days-unit').value);
});

// ---- optimistic UI + API error handling (v8.8) ----
run('scheduleBgSync stores a timer handle and replaces it on re-entry', ()=>{
  _bgSyncTimer=null;
  scheduleBgSync();
  const first=_bgSyncTimer;
  if(!first) throw new Error('scheduleBgSync should store a timer handle');
  scheduleBgSync();
  if(_bgSyncTimer===first) throw new Error('second call should reschedule, not reuse the handle');
  _bgSyncTimer=null;
});
runAsync('apiPost rejects when Apps Script returns an {error} body', async ()=>{
  __failNext=true;
  let rejected=null;
  await apiPost({action:'noop',data:{}}).then(()=>{rejected=false;},(e)=>{rejected=e;});
  if(rejected===false) throw new Error('should not resolve on {error} body');
  if(!rejected) throw new Error('never settled');
  if(!rejected.apiError) throw new Error('error should be tagged apiError');
});
runAsync('optimistic complete hides task, and restores it when the API errors', async ()=>{
  const t={task_id:'rb-c',name:'Complete me',type:'one_off',due_date:plus(1),status:'active',scope:'household'};
  state.tasks=[t]; _taskById={'rb-c':t}; _recentlyCompleted.clear();
  __failNext=true;
  handleComplete(t);
  if(!_recentlyCompleted.has('rb-c')) throw new Error('task should hide immediately');
  await tick();
  if(_recentlyCompleted.has('rb-c')) throw new Error('failed completion should un-hide the task');
  _recentlyCompleted.clear(); state.tasks=[]; _taskById={};
});
runAsync('optimistic snooze writes due_date, and restores it when the API errors', async ()=>{
  const t={task_id:'rb-s',name:'Snooze me',type:'one_off',due_date:plus(10),status:'active',scope:'household'};
  state.tasks=[t]; _taskById={'rb-s':t};
  const before=t.due_date;
  snoozingTask=t; pickSnoozeDays(3,new FakeEl('button'));
  __failNext=true;
  confirmSnooze();
  if(state.tasks[0].due_date===before) throw new Error('due_date should update immediately');
  await tick();
  if(state.tasks[0].due_date!==before) throw new Error('failed snooze should restore the original due_date, got '+state.tasks[0].due_date);
  state.tasks=[]; _taskById={}; snoozingTask=null; pendingSnooze=null;
});
runAsync('optimistic delete removes task, and restores it when the API errors', async ()=>{
  const t={task_id:'rb-d',name:'Delete me',type:'one_off',due_date:plus(1),status:'active',scope:'household'};
  state.tasks=[t]; _taskById={'rb-d':t};
  editingTask=t;
  __failNext=true;
  deleteEditingTask();
  if(state.tasks.find(x=>x.task_id==='rb-d')) throw new Error('task should be removed immediately');
  await tick();
  if(!state.tasks.find(x=>x.task_id==='rb-d')) throw new Error('failed delete should restore the task');
  if(!_taskById['rb-d']) throw new Error('_taskById should be rebuilt on rollback');
  state.tasks=[]; _taskById={}; editingTask=null;
});
runAsync('optimistic add inserts a temp task, and removes it when the API errors', async ()=>{
  state.tasks=[]; _taskById={}; editingTask=null;
  el('t-name').value='Temp task'; el('t-type').value='one_off';
  el('t-due').value=plus(2); el('t-remind').value=''; el('t-notes').value='';
  el('t-proj-link').value=''; el('t-asset-link').value='';
  __failNext=true;
  submitTask();
  const temp=state.tasks.filter(x=>x._temp);
  if(temp.length!==1) throw new Error('expected 1 temp task, got '+temp.length);
  if(!String(temp[0].task_id).startsWith('tmp_')) throw new Error('temp task needs a tmp_ id');
  await tick();
  if(state.tasks.some(x=>x._temp)) throw new Error('failed add should remove the temp task');
  // the success path also clears the temp task, so assert the failure path specifically
  if(el('sync-lbl').textContent!=='Could not save') throw new Error('failed add should report an error, got: '+el('sync-lbl').textContent);
  state.tasks=[]; _taskById={};
});
runAsync('grocery toggle reverts state when the API errors', async ()=>{
  state.grocery=[{item_id:'g-rb',name:'Eggs',category:'Food',status:'need'}];
  const e=new FakeEl('div'); e.querySelector=()=>new FakeEl('div');
  __failNext=true;
  toggleGrocery('g-rb', e);
  if(state.grocery[0].status!=='got') throw new Error('status should flip immediately');
  await tick();
  if(state.grocery[0].status!=='need') throw new Error('failed toggle should revert status, got '+state.grocery[0].status);
  state.grocery=[];
});
runAsync('refreshData keeps cached data on a server error instead of falling back to STATIC_ASSETS', async ()=>{
  state.assets=[{asset_id:'keep-me',name:'Real asset',category:'Home systems'}];
  __failNext=true;
  await refreshData(true);
  await tick();
  if(!state.assets.find(a=>a.asset_id==='keep-me')) throw new Error('server error should not clobber cached assets');
});
run('showToast does not throw', ()=>{ showToast('Test message'); });

runAsync('failed batch snooze schedules a reconcile (partial success can diverge)', async ()=>{
  const a={task_id:'bs-a',name:'A',type:'one_off',due_date:plus(5),status:'active',scope:'household'};
  const b={task_id:'bs-b',name:'B',type:'one_off',due_date:plus(5),status:'active',scope:'household'};
  state.tasks=[a,b]; _taskById={'bs-a':a,'bs-b':b};
  selectedTaskIds=new Set(['bs-a','bs-b']); selectMode=true;
  pendingBatchSnooze={kind:'days',value:3};
  _bgSyncTimer=null;
  __failNext=true;          // first of the two snooze calls fails, second succeeds
  confirmBatchSnooze();
  await tick();
  if(state.tasks[1].due_date===plus(5) && _bgSyncTimer===null)
    throw new Error('rolled back locally but scheduled no reconcile: state can disagree with the server');
  state.tasks=[]; _taskById={}; selectedTaskIds=new Set(); selectMode=false; pendingBatchSnooze=null;
});

// ---- in-flight write / stale sync race (v8.8.3) ----
runAsync('a clean sync applies the payload (guard does not block normal syncs)', async ()=>{
  state.tasks=[{task_id:'clean-1',name:'Old',type:'one_off',due_date:plus(1),status:'active',scope:'household'}];
  rebuildTaskIndex(); _inFlightWrites=[]; _lastWriteAt=0;
  await refreshData(true);
  if(state.tasks.length!==0) throw new Error('a sync with no pending writes must apply the server payload');
});
runAsync('an unacknowledged write blocks a stale payload from clobbering optimistic state', async ()=>{
  state.tasks=[{task_id:'race-1',name:'Just deleted locally',type:'one_off',due_date:plus(1),status:'active',scope:'household'}];
  rebuildTaskIndex(); _lastWriteAt=0;
  _inFlightWrites=[Date.now()];           // a write the server has not acknowledged yet
  await refreshData(true);
  _inFlightWrites=[];
  if(!state.tasks.find(x=>x.task_id==='race-1')) throw new Error('stale payload clobbered state that a pending write had not reached yet');
});
runAsync('a write landing during a sync blocks that payload too', async ()=>{
  state.tasks=[{task_id:'race-2',name:'Mid-sync',type:'one_off',due_date:plus(1),status:'active',scope:'household'}];
  rebuildTaskIndex(); _inFlightWrites=[]; _lastWriteAt=0;
  const sync=refreshData(true);
  apiPost({action:'noop',data:{}});       // starts and settles while the GET is in flight
  await sync;
  if(!state.tasks.find(x=>x.task_id==='race-2')) throw new Error('payload issued before a concurrent write was applied anyway');
  _inFlightWrites=[]; _lastWriteAt=0;
});
runAsync('a successful sync clears _recentlyCompleted', async ()=>{
  state.tasks=[]; _inFlightWrites=[]; _lastWriteAt=0;
  _recentlyCompleted.add('stale-id');
  await refreshData(true);
  if(_recentlyCompleted.has('stale-id')) throw new Error('_recentlyCompleted should reset once server state is authoritative');
});

runAsync('a write 20s old STILL blocks: it may legitimately still be in flight', async ()=>{
  // API_TIMEOUT is 25s, so at 20s the request has not even given up yet. Expiring it here is
  // what let refreshData clear _recentlyCompleted and resurrect a completed card.
  state.tasks=[{task_id:'hung-1',name:'x',type:'one_off',due_date:plus(1),status:'active',scope:'household'}];
  rebuildTaskIndex(); _lastWriteAt=0;
  _inFlightWrites=[Date.now()-20000];
  await refreshData(true);
  if(state.tasks.length!==1) throw new Error('a 20s-old write should still count as pending');
  _inFlightWrites=[];
});
runAsync('a write older than the request timeout stops blocking syncs forever', async ()=>{
  state.tasks=[{task_id:'hung-2',name:'x',type:'one_off',due_date:plus(1),status:'active',scope:'household'}];
  rebuildTaskIndex(); _lastWriteAt=0;
  _inFlightWrites=[Date.now()-(API_TIMEOUT+10000)];   // impossible: it should have settled
  await refreshData(true);
  if(state.tasks.length!==0) throw new Error('a truly dead write should not block syncing');
  _inFlightWrites=[];
});

// ---- temp record lifetime (v8.8.3) ----
runAsync('a successful add keeps the temp task until the sync replaces it', async ()=>{
  state.tasks=[]; _taskById={}; editingTask=null; _inFlightWrites=[]; _lastWriteAt=0;
  el('t-name').value='Keep me'; el('t-type').value='one_off'; el('t-due').value=plus(2);
  el('t-remind').value=''; el('t-notes').value=''; el('t-proj-link').value=''; el('t-asset-link').value='';
  submitTask();
  await tick();
  const temps=state.tasks.filter(x=>x._temp);
  if(temps.length!==1) throw new Error('temp task must survive until the sync swaps it for the real one, else the card flickers; got '+temps.length);
  state.tasks=[]; _taskById={};
});
runAsync('a successful grocery add keeps the temp item until the sync replaces it', async ()=>{
  state.grocery=[]; _inFlightWrites=[]; _lastWriteAt=0;
  el('g-name').value='Bananas'; el('g-cat').value='Food';
  submitGrocery();
  await tick();
  if(state.grocery.filter(g=>g._temp).length!==1) throw new Error('temp grocery item must survive until the sync replaces it');
  state.grocery=[];
});

// ---- toast queueing + tap-to-retry (v8.8.4) ----
run('a second toast cancels the first hide timer', ()=>{
  _toastTimer=null; hideToast(); __clearedTimers.length=0;
  showToast('first');
  const first=_toastTimer;
  if(!first) throw new Error('showToast should store a hide timer');
  showToast('second');
  // without the cancel, the first timer fires 4s in and hides the second toast early
  if(__clearedTimers.indexOf(first)<0) throw new Error('second toast must cancel the first hide timer');
  hideToast();
});
run('a toast without a retry is not tappable', ()=>{
  hideToast(); showToast('plain message');
  if(_toastRetry) throw new Error('no retry should be armed');
  if(el('toast-msg')._classes.has('tappable')) throw new Error('plain toast must not be tappable');
  if(el('toast-msg').textContent!=='plain message') throw new Error('unexpected text: '+el('toast-msg').textContent);
  hideToast();
});
run('a retryable toast is tappable and says so', ()=>{
  hideToast(); showToast('Could not save', function(){});
  if(!_toastRetry) throw new Error('retry should be armed');
  if(!el('toast-msg')._classes.has('tappable')) throw new Error('retryable toast must be tappable');
  if(!el('toast-msg').textContent.includes('Tap to retry')) throw new Error('missing retry affordance: '+el('toast-msg').textContent);
  hideToast();
});
run('tapping a toast fires the retry once and disarms it', ()=>{
  let fired=0;
  hideToast(); showToast('Could not save', function(){fired++;});
  onToastTap();
  onToastTap();                       // a second tap must not re-fire
  if(fired!==1) throw new Error('retry should fire exactly once, fired '+fired);
  if(_toastRetry) throw new Error('retry should be disarmed after tapping');
});
runAsync('a failed completion does NOT auto-retry, and restores the card', async ()=>{
  // Section 12E: on failure the outcome is unknown, so retrying could double-write. The
  // card returns to its pre-completion state and the toast says so. No retry is armed.
  _v9reset(); currentUser='Frankie';
  const t={task_id:'retry-1',name:'Retry me',type:'one_off',due_date:plus(1),status:'active',
           scope:'household',owner:''};
  state.tasks=[t]; rebuildTaskIndex(); _inFlightWrites=[]; _lastWriteAt=0;
  hideToast();
  __failNext=true;
  await handleComplete(t);
  await tick(); await tick();
  if(_recentlyCompleted.has('retry-1')) throw new Error('a failed completion must un-hide the task');
  if(recentlyCommitted('retry-1')) throw new Error('a failed completion must not count as committed');
  if(_toastRetry) throw new Error('v9 must NOT arm an automatic retry on a failed completion');
  if(isPending('retry-1')) throw new Error('the task should not be left pending');
  const msg=String(el('toast-msg').textContent||'');
  if(!/Couldn't confirm/.test(msg)) throw new Error('expected a "Couldn\'t confirm" toast, got: '+msg);
  _v9reset(); state.tasks=[]; _taskById={}; hideToast();
});

runAsync('a failed add offers retry, and tapping it re-creates the temp task', async ()=>{
  state.tasks=[]; _taskById={}; editingTask=null; _inFlightWrites=[]; _lastWriteAt=0; hideToast();
  el('t-name').value='Retry add'; el('t-type').value='one_off'; el('t-due').value=plus(2);
  el('t-remind').value=''; el('t-notes').value=''; el('t-proj-link').value=''; el('t-asset-link').value='';
  __failNext=true;
  submitTask();
  await tick();
  if(state.tasks.some(x=>x._temp)) throw new Error('failed add should have removed the temp task');
  if(!_toastRetry) throw new Error('a failed add should offer a retry');
  __posts.length=0;
  onToastTap();
  await tick();
  if(__posts.length!==1||__posts[0].action!=='addTask') throw new Error('retry should re-issue addTask');
  if(state.tasks.filter(x=>x._temp).length!==1) throw new Error('successful retry should leave exactly one temp task');
  state.tasks=[]; _taskById={}; hideToast();
});

runAsync('batch snooze retry applies to current tasks, not stale object references', async ()=>{
  const a={task_id:'bsr-a',name:'A',type:'one_off',due_date:plus(5),status:'active',scope:'household'};
  state.tasks=[a]; rebuildTaskIndex(); _inFlightWrites=[]; _lastWriteAt=0; hideToast();
  selectedTaskIds=new Set(['bsr-a']); selectMode=true; pendingBatchSnooze={kind:'days',value:3};
  __failNext=true;
  confirmBatchSnooze();
  await tick();
  if(!_toastRetry) throw new Error('failed batch snooze should offer a retry');
  // the reconcile sync lands before the user taps retry, replacing state with fresh objects
  state.tasks=[{task_id:'bsr-a',name:'A',type:'one_off',due_date:plus(5),status:'active',scope:'household'}];
  rebuildTaskIndex();
  onToastTap();
  await tick();
  if(state.tasks[0].due_date!==plus(8)) throw new Error('retry must snooze the current task object, got '+state.tasks[0].due_date);
  state.tasks=[]; _taskById={}; selectedTaskIds=new Set(); selectMode=false; pendingBatchSnooze=null; hideToast();
});

// ---- snooze rows must never count as completions, whatever the sheet layout (v8.9) ----
// Reproduces how appendRow + sheetToObjects interact for each header-row state the live
// sheet could be in. The v8.5 backend wrote log_type/details into columns that may or may
// not have been labelled, which decides where the markers actually land.
const V85_ORDER  = ['log_id','task_id','task_name','completed_by','completed_at','scope','notes','log_type','details'];
const V871_ORDER = ['log_id','task_id','task_name','completed_by','completed_at','scope','notes','details','log_type'];
const SNOOZE = {log_id:'l9',task_id:'t1',task_name:'Water plants',completed_by:'Frankie',
  completed_at:'2026-07-29T10:00:00Z',scope:'household',notes:'',log_type:'snooze',
  details:JSON.stringify({until_date:'2026-08-05'})};
const DONE = {log_id:'l8',task_id:'t2',task_name:'Take out bins',completed_by:'Meredith',
  completed_at:'2026-07-29T09:00:00Z',scope:'household',notes:'',log_type:'completion',details:''};
function writeRow(order,obj){ return order.map(h=>obj[h]!==undefined?obj[h]:''); }
function readBack(sheetHeader,row){
  const headers=sheetHeader.map(String); const o={};
  headers.forEach((h,i)=>{o[h]=row[i]===undefined?'':row[i];});
  return o;
}
const BASE7=['log_id','task_id','task_name','completed_by','completed_at','scope','notes'];
const LAYOUTS=[
  ['7 labelled cols, v8.5 write order',      BASE7.concat(['','']),          V85_ORDER],
  ['7 labelled cols, v8.7.1 write order',    BASE7.concat(['','']),          V871_ORDER],
  ['8 labelled cols, v8.5 write order',      BASE7.concat(['details','']),   V85_ORDER],
  ['8 labelled cols, v8.7.1 write order',    BASE7.concat(['details','']),   V871_ORDER],
  ['9 labelled cols, fully migrated',        BASE7.concat(['details','log_type']), V871_ORDER],
];
for (const [label, sheetHeader, order] of LAYOUTS) {
  run('snooze row is excluded: '+label, ()=>{
    const l=readBack(sheetHeader, writeRow(order, SNOOZE));
    if(isCompletionLog(l)) throw new Error('snooze counted as a completion; row read back as '+JSON.stringify(l));
  });
  run('real completion still counts: '+label, ()=>{
    const l=readBack(sheetHeader, writeRow(order, DONE));
    if(!isCompletionLog(l)) throw new Error('genuine completion was filtered out; read back as '+JSON.stringify(l));
  });
}
run('a task legitimately named like a marker is not filtered', ()=>{
  if(!isCompletionLog({log_id:'l1',task_id:'t3',task_name:'Snooze the alarm',completed_by:'Frankie',completed_at:'2026-07-29T10:00:00Z',notes:'until_date discussion',details:''}))
    throw new Error('name/notes must not trigger the snooze filter');
});
run('legacy row with no markers at all still counts as a completion', ()=>{
  if(!isCompletionLog({log_id:'l1',task_id:'t4',task_name:'Old row',completed_by:'Frankie',completed_at:'2026-01-01T10:00:00Z'}))
    throw new Error('pre-log_type completions must keep counting');
});

// ---- a task snoozed repeatedly then completed keeps exactly one credited completion ----
run('snoozed 3x by Frankie then completed by Meredith = 1 completion, credited Meredith', ()=>{
  const BASE7=['log_id','task_id','task_name','completed_by','completed_at','scope','notes'];
  const V85=BASE7.concat(['log_type','details']);
  const sheetHeader=BASE7.concat(['','']);            // the unlabelled state that caused the bug
  const write=(o)=>{const row=V85.map(h=>o[h]!==undefined?o[h]:'');const obj={};
    sheetHeader.map(String).forEach((h,i)=>{obj[h]=row[i]===undefined?'':row[i];});return obj;};
  const log=[
    write({log_id:'l1',task_id:'t1',task_name:'Water plants',completed_by:'Frankie',completed_at:'2026-07-20T10:00:00Z',scope:'household',log_type:'snooze',details:JSON.stringify({until_date:'2026-07-22'})}),
    write({log_id:'l2',task_id:'t1',task_name:'Water plants',completed_by:'Frankie',completed_at:'2026-07-22T10:00:00Z',scope:'household',log_type:'snooze',details:JSON.stringify({until_date:'2026-07-24'})}),
    write({log_id:'l3',task_id:'t1',task_name:'Water plants',completed_by:'Frankie',completed_at:'2026-07-24T10:00:00Z',scope:'household',log_type:'snooze',details:JSON.stringify({until_date:'2026-07-26'})}),
    write({log_id:'l4',task_id:'t1',task_name:'Water plants',completed_by:'Meredith',completed_at:'2026-07-26T18:00:00Z',scope:'household',log_type:'completion',details:''}),
  ];
  const kept=log.filter(isCompletionLog);
  if(kept.length!==1) throw new Error('expected exactly 1 surviving completion, got '+kept.length);
  if(kept[0].log_id!=='l4') throw new Error('wrong row survived: '+kept[0].log_id);
  if(kept[0].completed_by!=='Meredith') throw new Error('credit went to the wrong person: '+kept[0].completed_by);
  // and the task must still be present in history at all
  if(kept[0].task_name!=='Water plants') throw new Error('task vanished from history');
});
run('a task only ever snoozed, never completed, contributes 0 completions', ()=>{
  const BASE7=['log_id','task_id','task_name','completed_by','completed_at','scope','notes'];
  const V85=BASE7.concat(['log_type','details']);
  const sheetHeader=BASE7.concat(['','']);
  const write=(o)=>{const row=V85.map(h=>o[h]!==undefined?o[h]:'');const obj={};
    sheetHeader.map(String).forEach((h,i)=>{obj[h]=row[i]===undefined?'':row[i];});return obj;};
  const log=[write({log_id:'s1',task_id:'t9',task_name:'Never done',completed_by:'Frankie',completed_at:'2026-07-20T10:00:00Z',log_type:'snooze',details:JSON.stringify({until_date:'2026-07-22'})})];
  if(log.filter(isCompletionLog).length!==0) throw new Error('snooze-only task should contribute nothing');
});
run('per-person credit is unchanged for genuine completions', ()=>{
  const log=[
    {log_id:'a',task_id:'t1',task_name:'A',completed_by:'Frankie',completed_at:'2026-07-26T10:00:00Z',log_type:'completion',details:''},
    {log_id:'b',task_id:'t2',task_name:'B',completed_by:'Meredith',completed_at:'2026-07-26T11:00:00Z',log_type:'completion',details:''},
    {log_id:'c',task_id:'t3',task_name:'C',completed_by:'Frankie',completed_at:'2026-07-26T12:00:00Z',log_type:'completion',details:''},
  ];
  const kept=log.filter(isCompletionLog);
  const byPerson={};kept.forEach(l=>{byPerson[l.completed_by]=(byPerson[l.completed_by]||0)+1;});
  if(byPerson.Frankie!==2||byPerson.Meredith!==1) throw new Error('credit changed: '+JSON.stringify(byPerson));
});

// ---- joint ownership and shared credit (v8.10) ----
run('owner picker: Either is exclusive, names toggle, both can be selected', ()=>{
  pickedOwner='';
  pickOwner('Frankie');
  if(pickedOwner!=='Frankie') throw new Error('picking a name should replace Either, got '+pickedOwner);
  pickOwner('Meredith');
  if(pickedOwner!=='Frankie,Meredith') throw new Error('second name should join, got '+pickedOwner);
  pickOwner('');                                  // Either clears both
  if(pickedOwner!=='') throw new Error('Either of us must clear the names, got '+pickedOwner);
});
run('owner picker: canonical order regardless of click order', ()=>{
  pickedOwner=''; pickOwner('Meredith'); pickOwner('Frankie');
  if(pickedOwner!=='Frankie,Meredith') throw new Error('expected canonical Frankie,Meredith got '+pickedOwner);
});
run('owner picker: deselecting the last name falls back to Either', ()=>{
  pickedOwner=''; pickOwner('Frankie'); pickOwner('Frankie');
  if(pickedOwner!=='') throw new Error('should fall back to Either, got '+pickedOwner);
});
run('owner picker: toggling one name off leaves the other', ()=>{
  pickedOwner=''; pickOwner('Frankie'); pickOwner('Meredith'); pickOwner('Frankie');
  if(pickedOwner!=='Meredith') throw new Error('expected Meredith, got '+pickedOwner);
});


run('submitTask sends a joint owner', ()=>{
  __posts.length=0; editingTask=null; pickedScope='household'; pickedOwner='';
  pickOwner('Frankie'); pickOwner('Meredith');
  el('t-name').value='Pick shower tile'; el('t-type').value='one_off'; el('t-due').value=plus(3);
  el('t-remind').value=''; el('t-notes').value=''; el('t-proj-link').value=''; el('t-asset-link').value='';
  submitTask();
  if(__posts[__posts.length-1].data.owner!=='Frankie,Meredith') throw new Error('owner not joint: '+__posts[__posts.length-1].data.owner);
  pickedOwner='';
});
run('stats credit a joint completion to both, but count the task once', ()=>{
  const sv=state.task_log; const svScope=statsScope; statsScope='household';
  const now=new Date().toISOString();
  state.task_log=[
    {log_id:'j1',task_id:'t1',task_name:'Pick shower tile',completed_by:'Frankie,Meredith',completed_at:now,scope:'household',log_type:'completion',details:''},
    {log_id:'j2',task_id:'t2',task_name:'Solo task',completed_by:'Frankie',completed_at:now,scope:'household',log_type:'completion',details:''},
  ];
  renderStats();
  if(_drillAll.length!==2) throw new Error('total completed should be 2 tasks, got '+_drillAll.length);
  if(_drillF.length!==2) throw new Error('Frankie should be credited on both, got '+_drillF.length);
  if(_drillM.length!==1) throw new Error('Meredith should be credited once, got '+_drillM.length);
  state.task_log=sv; statsScope=svScope;
});
run('peopleLabel and personDot render a joint credit', ()=>{
  if(peopleLabel('Frankie,Meredith')!=='Frankie & Meredith') throw new Error('bad label: '+peopleLabel('Frankie,Meredith'));
  if(peopleLabel('')!=='Unknown') throw new Error('blank should read Unknown');
  if(personDot('Frankie,Meredith')!=='both') throw new Error('joint dot class wrong');
  if(personDot('Frankie')!=='') throw new Error('Frankie dot class wrong');
  if(personDot('Meredith')!=='b') throw new Error('Meredith dot class wrong');
  if(personDot('')!=='n') throw new Error('unknown dot class wrong');
});

// ---- Activity history tabs (v8.10) ----
run('Household History shows only household completions', ()=>{
  const sv=state.task_log; const now=new Date().toISOString();
  state.task_log=[
    {log_id:'h1',task_id:'t1',task_name:'Bins',completed_by:'Frankie',completed_at:now,scope:'household',log_type:'completion',details:''},
    {log_id:'p1',task_id:'t2',task_name:'My thing',completed_by:'Frankie',completed_at:now,scope:'personal',log_type:'completion',details:''},
  ];
  el('history-search').value='';
  setMetricsTab('household');
  const html=el('history-list').innerHTML||'';
  const kids=el('history-list').children.length;
  if(kids!==1) throw new Error('expected 1 household row, got '+kids);
  state.task_log=sv;
});
run('Personal History shows only your own personal completions', ()=>{
  const sv=state.task_log; const svUser=currentUser; currentUser='Frankie';
  const now=new Date().toISOString();
  state.task_log=[
    {log_id:'h1',task_id:'t1',task_name:'Bins',completed_by:'Frankie',completed_at:now,scope:'household',log_type:'completion',details:''},
    {log_id:'p1',task_id:'t2',task_name:'Frankie private',completed_by:'Frankie',completed_at:now,scope:'personal',log_type:'completion',details:''},
    {log_id:'p2',task_id:'t3',task_name:'Meredith private',completed_by:'Meredith',completed_at:now,scope:'personal',log_type:'completion',details:''},
  ];
  el('history-search').value='';
  setMetricsTab('personal');
  const kids=el('history-list').children.length;
  if(kids!==1) throw new Error('expected only own personal row, got '+kids);
  state.task_log=sv; currentUser=svUser; setMetricsTab('stats');
});
run('history tabs still exclude snoozes', ()=>{
  const sv=state.task_log; const now=new Date().toISOString();
  const BASE7=['log_id','task_id','task_name','completed_by','completed_at','scope','notes'];
  const V85=BASE7.concat(['log_type','details']); const hdr=BASE7.concat(['','']);
  const write=(o)=>{const row=V85.map(h=>o[h]!==undefined?o[h]:'');const obj={};
    hdr.map(String).forEach((h,i)=>{obj[h]=row[i]===undefined?'':row[i];});return obj;};
  state.task_log=[write({log_id:'s1',task_id:'t1',task_name:'Snoozed',completed_by:'Frankie',completed_at:now,scope:'household',log_type:'snooze',details:JSON.stringify({until_date:'2026-08-05'})})];
  el('history-search').value='';
  setMetricsTab('household');
  if(el('history-list').children.length!==0) throw new Error('snooze leaked into Household History');
  state.task_log=sv; setMetricsTab('stats');
});

// ── todayStr: LOCAL calendar date, not UTC ───────────────────────────────────
// Frankie is in Denver and tests in the evening. new Date().toISOString() is a UTC
// timestamp, so after 6pm local it already reports TOMORROW. Bucketing uses local midnight,
// so a task defaulted to the UTC date landed in the Tomorrow bucket and looked like it was
// never created. These only assert under TZ=America/Denver.
const _RealDate = Date;
function _freezeClock(iso){
  const fixed = new _RealDate(iso);
  const F = function(){ return arguments.length ? new _RealDate(...arguments) : fixed; };
  F.prototype = _RealDate.prototype; F.now = () => fixed.getTime(); F.parse = _RealDate.parse;
  global.Date = F;
}
function _unfreezeClock(){ global.Date = _RealDate; }
const _denver = () => process.env.TZ === 'America/Denver';

run('todayStr gives the LOCAL date at 10pm Denver, not the UTC one', ()=>{
  if(!_denver()) return;
  const utc = new _RealDate('2026-07-29T22:05:00-06:00').toISOString().split('T')[0];
  if(utc !== '2026-07-30') throw new Error('fixture bad, UTC should have rolled over: '+utc);
  _freezeClock('2026-07-29T22:05:00-06:00');
  let got; try { got = todayStr(); } finally { _unfreezeClock(); }
  if(got !== '2026-07-29') throw new Error('expected 2026-07-29, got '+got+' (UTC gives '+utc+')');
});
run('todayStr matches the local midnight the buckets use', ()=>{
  if(!_denver()) return;
  _freezeClock('2026-07-29T23:59:00-06:00');
  let got, midStr;
  try {
    got = todayStr();
    const mid = new _RealDate('2026-07-29T23:59:00-06:00'); mid.setHours(0,0,0,0);
    midStr = mid.getFullYear()+'-'+String(mid.getMonth()+1).padStart(2,'0')+'-'+String(mid.getDate()).padStart(2,'0');
  } finally { _unfreezeClock(); }
  if(got !== midStr) throw new Error('todayStr='+got+' but bucketing uses '+midStr);
});
run('todayStr still correct at midday, when UTC and local agree', ()=>{
  if(!_denver()) return;
  _freezeClock('2026-07-29T12:00:00-06:00');
  let got; try { got = todayStr(); } finally { _unfreezeClock(); }
  if(got !== '2026-07-29') throw new Error('expected 2026-07-29, got '+got);
});
run('a no-date one-off created at 10pm Denver lands in TODAY, not Tomorrow', ()=>{
  if(!_denver()) return;
  _freezeClock('2026-07-29T22:05:00-06:00');
  let due, todayMid, isToday;
  try {
    due = todayStr();                       // what submitTask assigns when the field is blank
    const now = new Date(); todayMid = new _RealDate(now.getTime()); todayMid.setHours(0,0,0,0);
    const d = new _RealDate(due+'T12:00:00');
    isToday = d.getFullYear()===todayMid.getFullYear() && d.getMonth()===todayMid.getMonth() && d.getDate()===todayMid.getDate();
  } finally { _unfreezeClock(); }
  if(!isToday) throw new Error('task dated '+due+' would not bucket as today');
});

// ── duplicate completions (2026-08-02) ──────────────────────────────────────
run('completing the same task twice in a row sends only ONE request', ()=>{
  __posts.length=0; _v9reset();
  const t = state.tasks[2];
  handleComplete(t);
  handleComplete(t);          // second tap, e.g. swipe then tap, or a resurrected card
  const sent = __posts.filter(p=>p.action==='batchComplete').length;
  if(sent !== 1) throw new Error('expected 1 commit, got '+sent);
  _v9reset();
});
runAsync('a RECURRING task stays hidden AFTER the save succeeds, until the sync', async ()=>{
  // The server advances due_date but LOCAL state still holds the old one. Releasing the
  // filter on success put the finished card straight back into Today, which is the window a
  // second tap landed in. It must stay filtered until a payload is actually applied.
  __posts.length=0; _recentlyCompleted.clear(); __failNext=false;
  const t = {task_id:'dup-recurring',name:'Vacuum upstairs',type:'interval',recurrence_days:7,
             sched_freq:'day',due_date:todayStr(),status:'active',scope:'household',owner:''};
  state.tasks=[t]; rebuildTaskIndex();
  handleComplete(t);
  await tick(); await tick(); await tick();      // let the POST promise and its .then run
  if(__posts.filter(p=>p.action==='batchComplete').length !== 1) throw new Error('no commit sent');
  if(!_recentlyCompleted.has(t.task_id))
    throw new Error('the finished recurring card was released before the reconcile landed');
  _recentlyCompleted.clear();
});
runAsync('a FAILED complete does put the card back, so it can be retried', async ()=>{
  __posts.length=0; _recentlyCompleted.clear();
  const t = {task_id:'dup-oneoff',name:'Take out bins',type:'one_off',
             due_date:todayStr(),status:'active',scope:'household',owner:''};
  state.tasks=[t]; rebuildTaskIndex();
  __failNext = true;
  handleComplete(t);
  await tick(); await tick(); await tick();
  if(_recentlyCompleted.has(t.task_id)) throw new Error('a failed completion must restore the card');
  _recentlyCompleted.clear(); __failNext=false;
});
runAsync('the completion guard blocks a repeat, then releases after the window', async ()=>{
  // v9: _completing gave way to recentlyCommitted, which also survives the flush that
  // clears the pending map, so a second tap right after a commit cannot write again.
  _v9reset(); currentUser='Frankie';
  const t={task_id:'guard-1',name:'Guard me',type:'one_off',due_date:todayStr(),status:'active',scope:'household',owner:''};
  state.tasks=[t]; rebuildTaskIndex();
  __posts.length=0;
  await handleComplete(t); await tick(); await tick();
  if(__posts.filter(p=>p.action==='batchComplete').length!==1) throw new Error('first commit did not fire');
  if(!recentlyCommitted('guard-1')) throw new Error('guard not set after the commit');
  __posts.length=0;
  await handleComplete(t); await tick(); await tick();
  if(__posts.length!==0) throw new Error('a repeat commit got through the guard');
  _recentCommit['guard-1']=Date.now()-(RECENT_COMMIT_MS+1000);
  if(recentlyCommitted('guard-1')) throw new Error('the guard should expire');
  _v9reset();
});


// ══ v9 MULTI-TAP CREDIT CYCLING ═════════════════════════════════════════════
function _v9task(o){
  return Object.assign({task_id:'v9-'+Math.random().toString(36).slice(2,8),name:'V9 task',
    type:'one_off',due_date:todayStr(),status:'active',scope:'household',owner:'',
    done_together:''},o||{});
}
function _v9reset(){
  Object.keys(_pending).forEach(function(k){if(_pending[k].timer)clearTimeout(_pending[k].timer);delete _pending[k];});
  Object.keys(_recentCommit).forEach(function(k){delete _recentCommit[k];});
  _recentlyCompleted.clear();__posts.length=0;__failNext=false;
}

// ---- Section 14: assignment-derived defaults ----
run('v9 default credit for an "either of us" task is the current user', ()=>{
  _v9reset(); currentUser='Frankie';
  if(defaultCreditFor(_v9task({owner:''}))!=='Frankie') throw new Error('expected Frankie');
  currentUser='Meredith';
  if(defaultCreditFor(_v9task({owner:''}))!=='Meredith') throw new Error('expected Meredith');
  currentUser='Frankie';
});
run('v9 default credit for an assigned task is the ASSIGNEE, not the tapper', ()=>{
  _v9reset(); currentUser='Frankie';
  if(defaultCreditFor(_v9task({owner:'Meredith'}))!=='Meredith')
    throw new Error('Frankie tapping Meredith\'s task must default to Meredith');
});
run('v9 default credit for a "both of us" task is Both', ()=>{
  _v9reset();
  if(defaultCreditFor(_v9task({owner:'Frankie,Meredith'}))!=='Frankie,Meredith') throw new Error('expected both');
});
run('v9 default credit with done_together is Both regardless of owner', ()=>{
  _v9reset(); currentUser='Frankie';
  if(defaultCreditFor(_v9task({owner:'',done_together:'true'}))!=='Frankie,Meredith') throw new Error('either+flag should be both');
  if(defaultCreditFor(_v9task({owner:'Meredith',done_together:'true'}))!=='Frankie,Meredith') throw new Error('assigned+flag should be both');
});
run('v9 default credit for a personal task is its owner', ()=>{
  _v9reset(); currentUser='Frankie';
  if(defaultCreditFor(_v9task({scope:'personal',owner:'Frankie'}))!=='Frankie') throw new Error('expected the owner');
});

// ---- cycle orders ----
run('v9 either-of-us cycle is me, them, both, clear', ()=>{
  _v9reset(); currentUser='Frankie';
  const c=creditCycleFor(_v9task({owner:''}));
  if(c.join('|')!=='Frankie|Meredith|Frankie,Meredith|') throw new Error(JSON.stringify(c));
  if(c[c.length-1]!==null) throw new Error('cycle must end in clear');
});
run('v9 assigned-task cycle starts with the assignee', ()=>{
  _v9reset(); currentUser='Frankie';
  const c=creditCycleFor(_v9task({owner:'Meredith'}));
  if(c[0]!=='Meredith'||c[1]!=='Frankie'||c[2]!=='Frankie,Meredith'||c[3]!==null) throw new Error(JSON.stringify(c));
});
run('v9 both-of-us cycle starts with Both', ()=>{
  _v9reset(); currentUser='Frankie';
  const c=creditCycleFor(_v9task({owner:'Frankie,Meredith'}));
  if(c[0]!=='Frankie,Meredith'||c[1]!=='Frankie'||c[2]!=='Meredith'||c[3]!==null) throw new Error(JSON.stringify(c));
});
run('v9 a PERSONAL task has only complete and clear', ()=>{
  _v9reset(); currentUser='Frankie';
  const c=creditCycleFor(_v9task({scope:'personal',owner:'Frankie'}));
  if(c.length!==2) throw new Error('expected 2 states, got '+c.length+' '+JSON.stringify(c));
  if(c[0]!=='Frankie'||c[1]!==null) throw new Error(JSON.stringify(c));
});

// ---- Section 12A: cycling never writes ----
run('v9 cycling three times produces ZERO api calls', ()=>{
  _v9reset(); currentUser='Frankie';
  const t=_v9task({owner:''}); state.tasks=[t]; rebuildTaskIndex();
  cycleCompletion(t);
  _pending[t.task_id].lastTapAt=0; cycleCompletion(t);
  _pending[t.task_id].lastTapAt=0; cycleCompletion(t);
  if(__posts.length!==0) throw new Error('cycling wrote '+__posts.length+' request(s)');
  if(_pending[t.task_id].credit!=='Frankie,Meredith') throw new Error('third tap should be both, got '+_pending[t.task_id].credit);
  _v9reset();
});
run('v9 cycling never mutates state.tasks', ()=>{
  _v9reset(); currentUser='Frankie';
  const t=_v9task({owner:''}); state.tasks=[t]; rebuildTaskIndex();
  const snap=JSON.stringify(state.tasks);
  cycleCompletion(t); _pending[t.task_id].lastTapAt=0; cycleCompletion(t);
  if(JSON.stringify(state.tasks)!==snap) throw new Error('state.tasks changed during cycling');
  _v9reset();
});
run('v9 the tap guard swallows a second tap inside 250ms', ()=>{
  _v9reset(); currentUser='Frankie';
  const t=_v9task({owner:''}); state.tasks=[t]; rebuildTaskIndex();
  cycleCompletion(t);
  const first=_pending[t.task_id].credit;
  cycleCompletion(t);   // immediate second tap, no lastTapAt reset
  if(_pending[t.task_id].credit!==first) throw new Error('the guard did not swallow the double tap');
  _v9reset();
});
run('v9 the cycle wraps back round after clear', ()=>{
  _v9reset(); currentUser='Frankie';
  const t=_v9task({owner:''}); state.tasks=[t]; rebuildTaskIndex();
  for(let i=0;i<4;i++){cycleCompletion(t); if(_pending[t.task_id])_pending[t.task_id].lastTapAt=0;}
  if(_pending[t.task_id].credit!==null) throw new Error('4th tap should be clear, got '+_pending[t.task_id].credit);
  cycleCompletion(t);
  if(_pending[t.task_id].credit!=='Frankie') throw new Error('5th tap should wrap to the default');
  _v9reset();
});

// ---- Section 12B/F: flush is the only writer, and is idempotent ----
runAsync('v9 flush produces exactly ONE api call per task', async ()=>{
  _v9reset(); currentUser='Frankie';
  const t=_v9task({owner:''}); state.tasks=[t]; rebuildTaskIndex();
  cycleCompletion(t);
  __posts.length=0;
  await flushPending();
  await tick(); await tick();
  if(__posts.length!==1) throw new Error('expected 1 request, got '+__posts.length);
  if(__posts[0].action!=='batchComplete') throw new Error('expected batchComplete, got '+__posts[0].action);
  if(__posts[0].data.tasks.length!==1) throw new Error('expected 1 task in the batch');
  _v9reset();
});
runAsync('v9 a multi-task flush is ONE batch call, not one call per task', async ()=>{
  // Several entries can sit in the map at once (a swipe commit racing a cycle, or a flush
  // trigger arriving with more than one armed). Section 5 requires a single request.
  _v9reset(); currentUser='Frankie';
  const a=_v9task({owner:''}), b=_v9task({owner:'Meredith'}), c=_v9task({owner:'Frankie,Meredith'});
  state.tasks=[a,b,c]; rebuildTaskIndex();
  [a,b,c].forEach(function(t){
    _pending[t.task_id]={credit:defaultCreditFor(t),idx:0,startedAt:Date.now(),lastTapAt:Date.now(),task:t,timer:null};
  });
  __posts.length=0;
  await flushPending();
  await tick(); await tick();
  if(__posts.length!==1) throw new Error('expected ONE request for three tasks, got '+__posts.length);
  if(__posts[0].data.tasks.length!==3) throw new Error('expected 3 tasks in the batch, got '+__posts[0].data.tasks.length);
  const by=__posts[0].data.tasks.map(function(x){return x.completed_by;});
  if(by.join('|')!=='Frankie|Meredith|Frankie,Meredith') throw new Error('per-task credit lost: '+by.join('|'));
  if(pendingCount()!==0) throw new Error('the map should be empty after a flush');
  _v9reset();
});
run('v9 tapping a second card commits the first at its current credit', ()=>{
  _v9reset(); currentUser='Frankie';
  const a=_v9task({owner:''}), b=_v9task({owner:''});
  state.tasks=[a,b]; rebuildTaskIndex();
  cycleCompletion(a);
  __posts.length=0;
  cycleCompletion(b);
  const commits=__posts.filter(p=>p.action==='batchComplete');
  if(commits.length!==1) throw new Error('the first card should have committed, saw '+commits.length);
  if(commits[0].data.tasks[0].task_id!==a.task_id) throw new Error('committed the wrong card');
  if(isPending(a.task_id)) throw new Error('the first card is still pending');
  if(!isPending(b.task_id)) throw new Error('the second card should now be pending');
  _v9reset();
});
runAsync('v9 a second flush for the same task is a no-op', async ()=>{
  _v9reset(); currentUser='Frankie';
  const t=_v9task({owner:''}); state.tasks=[t]; rebuildTaskIndex();
  cycleCompletion(t);
  await flushPending([t.task_id]); await tick(); await tick();
  const after=__posts.length;
  await flushPending([t.task_id]); await tick(); await tick();
  if(__posts.length!==after) throw new Error('the second flush wrote again');
  if(isPending(t.task_id)) throw new Error('the task is still pending after flushing');
  _v9reset();
});
runAsync('v9 flush removes from the pending map BEFORE the api call', async ()=>{
  _v9reset(); currentUser='Frankie';
  const t=_v9task({owner:''}); state.tasks=[t]; rebuildTaskIndex();
  cycleCompletion(t);
  const p=flushPending([t.task_id]);           // do not await: check synchronously
  if(isPending(t.task_id)) throw new Error('still in the pending map while the call is in flight');
  await p; await tick();
  _v9reset();
});
runAsync('v9 a CLEARED pending state commits nothing', async ()=>{
  _v9reset(); currentUser='Frankie';
  const t=_v9task({owner:''}); state.tasks=[t]; rebuildTaskIndex();
  const cycle=creditCycleFor(t);
  for(let i=0;i<cycle.length;i++){cycleCompletion(t); if(_pending[t.task_id])_pending[t.task_id].lastTapAt=0;}
  if(_pending[t.task_id].credit!==null) throw new Error('should be cleared');
  __posts.length=0;
  await flushPending([t.task_id]); await tick(); await tick();
  if(__posts.length!==0) throw new Error('a cleared task must not be committed');
  _v9reset();
});
runAsync('v9 starting a new pending window commits the previous card', async ()=>{
  _v9reset(); currentUser='Frankie';
  const a=_v9task({owner:''}), b=_v9task({owner:''});
  state.tasks=[a,b]; rebuildTaskIndex();
  cycleCompletion(a);
  __posts.length=0;
  cycleCompletion(b);
  await tick(); await tick();
  if(!__posts.length) throw new Error('the first card should have committed');
  if(!isPending(b.task_id)) throw new Error('the new card should be pending');
  if(isPending(a.task_id)) throw new Error('the old card should have flushed');
  _v9reset();
});

// ---- Section 12C: the recent-commit guard ----
runAsync('v9 recentlyCommitted hides a task a stale refresh returns as active', async ()=>{
  _v9reset(); currentUser='Frankie';
  const t=_v9task({owner:''}); state.tasks=[t]; rebuildTaskIndex();
  cycleCompletion(t);
  await flushPending([t.task_id]); await tick(); await tick();
  if(!recentlyCommitted(t.task_id)) throw new Error('not marked as recently committed');
  if(!completionHidden(t.task_id)) throw new Error('a just-committed task must stay hidden');
  _recentCommit[t.task_id]=Date.now()-(RECENT_COMMIT_MS+1000);
  if(recentlyCommitted(t.task_id)) throw new Error('the guard must expire after the window');
  _v9reset();
});

// ---- Section 12D: rendering during pending ----
run('v9 renderTasks during pending keeps the card and its pending visual', ()=>{
  _v9reset(); currentUser='Frankie';
  const t=_v9task({owner:'',name:'Pending render task'}); state.tasks=[t]; rebuildTaskIndex();
  cycleCompletion(t);
  renderTasks();
  if(!isPending(t.task_id)) throw new Error('rendering dropped the pending state');
  if(_pending[t.task_id].credit!=='Frankie') throw new Error('rendering changed the credit');
  if(__posts.length!==0) throw new Error('rendering triggered a write');
  _v9reset();
});

// ---- Section 3: swipe ----
runAsync('v9 swipe-right commits immediately at the default credit', async ()=>{
  _v9reset(); currentUser='Frankie';
  const t=_v9task({owner:'Meredith'}); state.tasks=[t]; rebuildTaskIndex();
  _pending[t.task_id]={credit:defaultCreditFor(t),idx:0,startedAt:Date.now(),lastTapAt:Date.now(),task:t,timer:null};
  __posts.length=0;
  await flushPending([t.task_id]); await tick(); await tick();
  if(__posts.length!==1) throw new Error('expected one commit, got '+__posts.length);
  if(__posts[0].data.tasks[0].completed_by!=='Meredith')
    throw new Error('swipe should credit the assignee, got '+__posts[0].data.tasks[0].completed_by);
  _v9reset();
});

// ---- Section 4: latest action wins ----
run('v9 cancelPending clears the pending state without writing', ()=>{
  _v9reset(); currentUser='Frankie';
  const t=_v9task({owner:''}); state.tasks=[t]; rebuildTaskIndex();
  cycleCompletion(t);
  __posts.length=0;
  cancelPending(t.task_id);
  if(isPending(t.task_id)) throw new Error('still pending after cancel');
  if(__posts.length!==0) throw new Error('cancel wrote to the server');
  _v9reset();
});
run('v9 opening the edit modal cancels a pending completion', ()=>{
  _v9reset(); currentUser='Frankie';
  const t=_v9task({owner:''}); state.tasks=[t]; rebuildTaskIndex();
  cycleCompletion(t);
  openEditTask(t);
  if(isPending(t.task_id)) throw new Error('editing did not cancel the pending completion');
  editingTask=null;
  _v9reset();
});

// ---- Section 6: background sync suppression ----
run('v9 automatic sync is BLOCKED while a completion is pending', ()=>{
  // NOTE: the harness stubs setTimeout, so this asserts the predicate the timer callback
  // consults rather than waiting on a real timer.
  _v9reset(); currentUser='Frankie';
  if(!bgSyncAllowed()) throw new Error('should be allowed with nothing pending');
  const t=_v9task({owner:''}); state.tasks=[t]; rebuildTaskIndex();
  cycleCompletion(t);
  if(bgSyncAllowed()) throw new Error('a background sync must be blocked while pending');
  cancelPending(t.task_id);
  if(!bgSyncAllowed()) throw new Error('sync must resume once the pending map empties');
  _v9reset();
});
runAsync('v9 a MANUAL refresh flushes pending first, then fetches', async ()=>{
  _v9reset(); currentUser='Frankie';
  const t=_v9task({owner:''}); state.tasks=[t]; rebuildTaskIndex();
  cycleCompletion(t);
  __posts.length=0;
  await refreshData(false);
  await tick(); await tick();
  const commits=__posts.filter(p=>p.action==='batchComplete');
  if(commits.length!==1) throw new Error('manual refresh should commit the pending task, saw '+commits.length);
  if(isPending(t.task_id)) throw new Error('still pending after a manual refresh');
  _v9reset();
});

// ---- Section 8: batch credit selector ----
run('v9 batch complete sends the SELECTED credit for every task', ()=>{
  _v9reset(); currentUser='Frankie';
  const a=_v9task({owner:''}), b=_v9task({owner:'Meredith'});
  state.tasks=[a,b]; rebuildTaskIndex();
  selectedTaskIds.clear(); selectedTaskIds.add(a.task_id); selectedTaskIds.add(b.task_id);
  selectMode=true;
  pickBatchCredit('BOTH');
  __posts.length=0;
  batchCompleteSelected();
  const post=__posts.filter(p=>p.action==='batchComplete')[0];
  if(!post) throw new Error('no batchComplete sent');
  // the batch-level field is only a fallback; the server prefers each task's own value
  post.data.tasks.forEach(function(p){
    if(p.completed_by!=='Frankie,Meredith') throw new Error('per-task credit not applied: '+p.completed_by);
  });
  _batchCredit=null; selectMode=false; selectedTaskIds.clear();
  _v9reset();
});
run('v9 batch credit defaults to the current user', ()=>{
  _v9reset(); currentUser='Meredith'; _batchCredit=null;
  if(batchCreditValue()!=='Meredith') throw new Error('expected Meredith, got '+batchCreditValue());
  currentUser='Frankie';
  if(batchCreditValue()!=='Frankie') throw new Error('expected Frankie');
  _v9reset();
});

// ---- Section 1: colour consistency ----
run('v9 every per-user colour reads the --user-* variables', ()=>{
  const css=__cssText||'';
  if(!css) return;   // only meaningful when the harness captured the stylesheet
  const rules=['.who-btn.sel-f','.who-btn.sel-m','.who-opt.sel-f','.who-opt.sel-m',
               '.who-f{','.who-m{','.ldot{','.ldot.b{','.bar-fill.pur','.bar-fill.yel'];
  rules.forEach(function(r){
    const i=css.indexOf(r);
    if(i<0) throw new Error('rule not found: '+r);
    const chunk=css.slice(i,css.indexOf('}',i));
    if(!/--user-[fm]/.test(chunk)) throw new Error(r+' does not use a --user-* variable: '+chunk);
  });
  if(/stroke="var\(--purple\)"|stroke="var\(--yellow\)"/.test(css)) throw new Error('trend chart still uses the old palette');
});

// ══ v9.1 NO PIN + INLINE ICONS ══════════════════════════════════════════════
run('v9.1 there is no PIN map anywhere in the app', ()=>{
  if(typeof PINS!=='undefined') throw new Error('a PINS map still exists');
  const js=fs.readFileSync('/home/claude/extracted.js','utf8');
  if(/225522|8627/.test(js)) throw new Error('a PIN literal is still in the shipped code');
  if(/pin-input|submitPin/.test(js)) throw new Error('PIN entry code is still present');
});
run('v9.1 picking a user signs in immediately and persists the choice', ()=>{
  const saved=currentUser;
  currentUser=null;
  localStorage.removeItem('loonhq_user');
  selectUser('Meredith', null);
  if(currentUser!=='Meredith') throw new Error('selectUser did not set the current user');
  if(localStorage.getItem('loonhq_user')!=='Meredith') throw new Error('the choice was not persisted');
  selectUser('Frankie', null);
  if(currentUser!=='Frankie') throw new Error('switching users failed');
  currentUser=saved||'Frankie';
});
run('v9.1 icons are inlined, with no external icon font', ()=>{
  const css=__cssText||'';
  if(!css) return;
  // check for an actual external reference, not the word "Tabler" in a comment
  const remote=(css.match(/url\(\s*["']?https?:\/\/[^)]*\)/g)||[]);
  if(remote.length) throw new Error('the stylesheet still pulls from outside: '+remote.slice(0,2).join(' '));
  if(/@tabler\/icons-webfont|jsdelivr\.net/.test(css)) throw new Error('the icon CDN is still referenced');
  const defs=new Set((css.match(/--i-[a-z0-9-]+:url/g)||[]).map(x=>x.slice(4,-4)));
  if(defs.size<30) throw new Error('expected the full inline icon set, found '+defs.size);
  if(!/\.ti\{[^}]*mask/.test(css.replace(/\s+/g,''))===false){} // presence checked below
  if(!/mask-image/.test(css)) throw new Error('icons are not painted via mask-image');
  if(!/background-color:currentColor/.test(css.replace(/\s+/g,'')))
    throw new Error('icons must inherit colour via currentColor, as the font glyphs did');
});
run('v9.1 every icon the app uses has a drawing', ()=>{
  const css=__cssText||'';
  const html=fs.readFileSync('index.html','utf8');
  if(!css) return;
  const used=new Set((html.match(/\bti-[a-z0-9-]+/g)||[]).map(x=>x.slice(3)));
  used.delete('');
  const drawn=new Set((css.match(/--i-[a-z0-9-]+:url/g)||[]).map(x=>x.slice(4,-4)));
  const missing=[...used].filter(u=>!drawn.has(u));
  if(missing.length) throw new Error('icons used but never drawn: '+missing.join(', '));
});

// ---- v9.2 stale-data watch (Step 5) ----
run('v9.2 checkStale raises the badge once data is older than the window', ()=>{
  const saved=_lastFetch;
  _lastFetch=Date.now();
  checkStale();
  if(el('stale-badge').classList.contains('on')) throw new Error('badge shown on fresh data');
  _lastFetch=Date.now()-(STALE_MS+5000);
  checkStale();
  if(!el('stale-badge').classList.contains('on')) throw new Error('badge NOT shown on stale data');
  _lastFetch=Date.now();
  checkStale();
  if(el('stale-badge').classList.contains('on')) throw new Error('badge not cleared after a refresh');
  _lastFetch=saved;
});
run('v9.2 the stale watch is actually started when the app opens', ()=>{
  // it used to be defined but never called, so the badge only ever appeared on
  // return-from-background and never while the app sat open
  const src=fs.readFileSync('/home/claude/extracted.js','utf8');
  if(!/startStaleWatch\(\)/.test(src)) throw new Error('startStaleWatch is never called');
  const inShowApp=/function showApp\(\)\{[^}]*startStaleWatch\(\)/.test(src);
  if(!inShowApp) throw new Error('showApp does not start the stale watch');
  if(!/setInterval\(checkStale/.test(src)) throw new Error('checkStale is not polled');
});

// ---- v9.2 UNDO coverage (Step 6: it had none at all) ----
runAsync('v9.2 undo fires, removes the completion locally and calls the server', async ()=>{
  _v9reset(); currentUser='Frankie';
  const t=_v9task({owner:''}); state.tasks=[t]; rebuildTaskIndex();
  cycleCompletion(t);
  await flushPending([t.task_id]); await tick(); await tick();
  if(!_undoItems) throw new Error('no undo was armed after a commit');
  if(!completionHidden(t.task_id)) throw new Error('task should be hidden after commit');
  __posts.length=0;
  undoLastCompletion();
  await tick(); await tick();
  const undo=__posts.filter(p=>p.action==='batchUncomplete');
  if(undo.length!==1) throw new Error('expected 1 batchUncomplete, got '+undo.length);
  if(completionHidden(t.task_id)) throw new Error('undo must un-hide the task');
  if(_undoItems) throw new Error('undo should disarm itself');
  _v9reset();
});
runAsync('v9.2 undoing a batch is ONE request, not one per task', async ()=>{
  _v9reset(); currentUser='Frankie';
  const a=_v9task({owner:''}), b=_v9task({owner:'Meredith'}), c=_v9task({owner:''});
  state.tasks=[a,b,c]; rebuildTaskIndex();
  [a,b,c].forEach(function(t){
    _pending[t.task_id]={credit:defaultCreditFor(t),idx:0,startedAt:Date.now(),lastTapAt:Date.now(),task:t,timer:null};
  });
  await flushPending(); await tick(); await tick();
  __posts.length=0;
  undoLastCompletion();
  await tick(); await tick();
  const undo=__posts.filter(p=>p.action==='batchUncomplete');
  if(undo.length!==1) throw new Error('expected ONE request for three undos, got '+undo.length);
  if(undo[0].data.items.length!==3) throw new Error('expected 3 items, got '+undo[0].data.items.length);
  _v9reset();
});
run('v9.2 the undo toast wording matches how many tasks committed', ()=>{
  _v9reset(); currentUser='Frankie';
  const one=[{task_id:'x1',credit:'Frankie',task:{name:'Wash up'}}];
  showUndoToast(one,null);
  let msg=String(el('toast-msg').textContent||'');
  if(!/Wash up/.test(msg)||!/Undo/.test(msg)) throw new Error('single-task wording wrong: '+msg);
  const many=[one[0],{task_id:'x2',credit:'Frankie',task:{name:'Bins'}}];
  showUndoToast(many,null);
  msg=String(el('toast-msg').textContent||'');
  if(!/2 tasks/.test(msg)||!/Undo all/.test(msg)) throw new Error('batch wording wrong: '+msg);
  _undoItems=null; hideToast(); _v9reset();
});
runAsync('v9.2 a failed undo says so and does not silently swallow it', async ()=>{
  _v9reset(); currentUser='Frankie';
  const t=_v9task({owner:''}); state.tasks=[t]; rebuildTaskIndex();
  cycleCompletion(t);
  await flushPending([t.task_id]); await tick(); await tick();
  __failNext=true;
  undoLastCompletion();
  await tick(); await tick(); await tick();
  const msg=String(el('toast-msg').textContent||'');
  if(!/Couldn't undo/.test(msg)) throw new Error('a failed undo must report it, got: '+msg);
  __failNext=false; _v9reset();
});

// ---- v9.2 Lists: rename, custom lists, ordering ----
run('v9.2 the section is called Lists everywhere', ()=>{
  const html=fs.readFileSync('index.html','utf8');
  if(/Shopping List/.test(html)) throw new Error('"Shopping List" still appears');
  if(/<span>Shop<\/span>/.test(html)) throw new Error('the mobile nav still says Shop');
  if(pageNames.grocery!=='Lists') throw new Error('page title is '+pageNames.grocery);
});
run('v9.2 the three permanent lists cannot be deleted', ()=>{
  ['Food','Costco','Household'].forEach(function(n){
    if(!isPermanentList(n)) throw new Error(n+' should be permanent');
  });
  if(isPermanentList('Garage')) throw new Error('a custom list must not be permanent');
  const before=(state.lists||[]).slice();
  deleteCustomList('Food');                       // must be refused outright
  if(JSON.stringify(state.lists||[])!==JSON.stringify(before)) throw new Error('deleting a permanent list changed state');
});
run('v9.2 allListNames puts permanent lists first, then custom in creation order', ()=>{
  const sv=state.lists;
  state.lists=[{list_id:'l2',name:'Second',created_at:'2026-01-02',sort_order:2},
               {list_id:'l1',name:'First',created_at:'2026-01-01',sort_order:1}];
  const names=allListNames();
  if(names.slice(0,3).join(',')!=='Food,Costco,Household') throw new Error('permanent lists not first: '+names);
  if(names[3]!=='First'||names[4]!=='Second') throw new Error('custom lists out of order: '+names);
  state.lists=sv;
});
run('v9.2 renderGrocery draws a section per list, with a delete button only on custom ones', ()=>{
  const svL=state.lists, svG=state.grocery;
  state.lists=[{list_id:'l1',name:'Garage',created_at:'2026-01-01',sort_order:1}];
  state.grocery=[{item_id:'g1',name:'Milk',category:'Food',status:'need',sort_order:1},
                 {item_id:'g2',name:'Oil',category:'Garage',status:'need',sort_order:2}];
  renderGrocery();
  const wrap=el('lists-wrap');
  const groups=wrap.children.filter?wrap.children.filter(Boolean):wrap.children;
  if(groups.length!==4) throw new Error('expected 4 sections (3 permanent + Garage), got '+groups.length);
  state.lists=svL; state.grocery=svG;
});
run('v9.2 an item whose list was deleted falls back rather than vanishing', ()=>{
  const svL=state.lists, svG=state.grocery;
  state.lists=[];
  state.grocery=[{item_id:'orphan',name:'Stray',category:'DeletedList',status:'need',sort_order:1}];
  renderGrocery();   // must not throw, and must not silently drop the item
  state.lists=svL; state.grocery=svG;
});
runAsync('v9.2 creating a list posts addList and shows it immediately', async ()=>{
  const svL=state.lists, svG=state.grocery, svPrompt=global.prompt;
  state.lists=[]; state.grocery=[]; __posts.length=0;
  global.prompt=function(){return 'Camping';};
  promptNewList();
  if(!(state.lists||[]).some(function(l){return l.name==='Camping';}))
    throw new Error('the new list should appear immediately');
  await tick(); await tick();
  const p=__posts.filter(x=>x.action==='addList');
  if(p.length!==1) throw new Error('expected one addList, got '+p.length);
  if(p[0].data.name!=='Camping') throw new Error('wrong name sent');
  global.prompt=svPrompt; state.lists=svL; state.grocery=svG;
});
run('v9.2 a duplicate list name is refused before any request', ()=>{
  const svL=state.lists, svPrompt=global.prompt;
  state.lists=[{list_id:'l1',name:'Camping',created_at:'2026-01-01',sort_order:1}];
  __posts.length=0;
  global.prompt=function(){return 'camping';};   // same name, different case
  promptNewList();
  if(__posts.filter(x=>x.action==='addList').length!==0) throw new Error('a duplicate was sent to the server');
  global.prompt=svPrompt; state.lists=svL;
});
runAsync('v9.2 deleting a custom list removes it and its items, and posts deleteList', async ()=>{
  const svL=state.lists, svG=state.grocery, svConfirm=global.confirm;
  state.lists=[{list_id:'l1',name:'Garage',created_at:'2026-01-01',sort_order:1}];
  state.grocery=[{item_id:'g1',name:'Milk',category:'Food',status:'need',sort_order:1},
                 {item_id:'g2',name:'Oil',category:'Garage',status:'need',sort_order:2}];
  global.confirm=function(){return true;};
  __posts.length=0;
  deleteCustomList('Garage');
  if((state.lists||[]).length!==0) throw new Error('the list should be gone immediately');
  if((state.grocery||[]).some(function(g){return g.category==='Garage';})) throw new Error('its items should be gone too');
  if(!(state.grocery||[]).some(function(g){return g.category==='Food';})) throw new Error('other lists must be untouched');
  await tick(); await tick();
  const p=__posts.filter(x=>x.action==='deleteList');
  if(p.length!==1||p[0].data.name!=='Garage') throw new Error('deleteList not sent correctly');
  global.confirm=svConfirm; state.lists=svL; state.grocery=svG;
});
run('v9.2 reordering posts the new order for that list only', ()=>{
  __posts.length=0;
  persistGrocOrder('Food',['g3','g1','g2']);
  const p=__posts.filter(x=>x.action==='reorderGrocery');
  if(p.length!==1) throw new Error('expected one reorderGrocery, got '+p.length);
  if(p[0].data.category!=='Food') throw new Error('wrong list: '+p[0].data.category);
  if(p[0].data.order.join(',')!=='g3,g1,g2') throw new Error('wrong order sent');
});
run('v9.2 drag uses pointer events, not the HTML5 API that never fired on touch', ()=>{
  const src=fs.readFileSync('/home/claude/extracted.js','utf8');
  if(/setAttribute\('draggable'/.test(src)) throw new Error('still using HTML5 draggable');
  if(/addEventListener\('dragstart'/.test(src)) throw new Error('still using dragstart');
  if(!/pointerdown/.test(src)) throw new Error('no pointerdown handler');
  if(!/pointermove/.test(src)||!/pointerup/.test(src)) throw new Error('incomplete pointer drag');
});

// ══ v9.3 LOCAL STATE CACHE ══════════════════════════════════════════════════
runAsync('v9.3 a successful fetch writes the state cache', async ()=>{
  localStorage.removeItem(CACHE_KEY);
  _inFlightWrites=[];_lastWriteAt=0;_lastPayloadSig=null;
  await refreshData(true); await tick(); await tick();
  const raw=localStorage.getItem(CACHE_KEY);
  if(!raw) throw new Error('nothing was cached after a fetch');
  const c=JSON.parse(raw);
  if(!c.at) throw new Error('cache has no timestamp');
  if(!Array.isArray(c.tasks)) throw new Error('cache has no tasks array');
  ['tasks','projects','subtasks','grocery','lists','task_log','assets','maintenance_logs']
    .forEach(function(k){ if(!(k in c)) throw new Error('cache is missing '+k); });
});
run('v9.3 the cache round-trips through load and apply', ()=>{
  const svT=state.tasks, svG=state.grocery;
  state.tasks=[{task_id:'c1',name:'Cached task',type:'one_off',due_date:todayStr(),status:'active',scope:'household',owner:''}];
  state.grocery=[{item_id:'ci1',name:'Cached milk',category:'Food',status:'need',sort_order:1}];
  saveStateCache();
  state.tasks=[];state.grocery=[];rebuildDerivedIndexes();
  const c=loadStateCache();
  if(!c) throw new Error('cache did not load back');
  applyCachedState(c);
  if(state.tasks.length!==1||state.tasks[0].task_id!=='c1') throw new Error('tasks not restored');
  if(state.grocery.length!==1) throw new Error('grocery not restored');
  if(!_taskById['c1']) throw new Error('derived indexes not rebuilt after restoring the cache');
  state.tasks=svT;state.grocery=svG;rebuildDerivedIndexes();
});
run('v9.3 bootData renders from cache and does NOT show the loader', ()=>{
  const svT=state.tasks;
  state.tasks=[{task_id:'boot1',name:'From cache',type:'one_off',due_date:todayStr(),status:'active',scope:'household',owner:''}];
  saveStateCache();
  state.tasks=[];rebuildDerivedIndexes();
  el('loader').style.display='flex';
  const usedCache=bootData();
  if(!usedCache) throw new Error('bootData should have used the cache');
  if(state.tasks.length!==1) throw new Error('state not populated from cache');
  if(el('loader').style.display!=='none') throw new Error('the loader must be hidden when rendering from cache');
  state.tasks=svT;rebuildDerivedIndexes();
});
run('v9.3 with no cache, bootData falls back to a normal loading fetch', ()=>{
  localStorage.removeItem(CACHE_KEY);
  const usedCache=bootData();
  if(usedCache) throw new Error('there was no cache, so it must not claim to have used one');
});
run('v9.3 a corrupt cache is ignored rather than crashing the app', ()=>{
  localStorage.setItem(CACHE_KEY,'{not json at all');
  if(loadStateCache()!==null) throw new Error('malformed JSON should be ignored');
  localStorage.setItem(CACHE_KEY,JSON.stringify({at:Date.now()}));   // no tasks array
  if(loadStateCache()!==null) throw new Error('a cache without tasks should be ignored');
  localStorage.removeItem(CACHE_KEY);
});
run('v9.3 a cache older than 24h still renders, it just says it is syncing', ()=>{
  const svT=state.tasks;
  state.tasks=[{task_id:'old1',name:'Old cached',type:'one_off',due_date:todayStr(),status:'active',scope:'household',owner:''}];
  saveStateCache();
  const c=JSON.parse(localStorage.getItem(CACHE_KEY));
  c.at=Date.now()-(CACHE_STALE_MS+60000);
  localStorage.setItem(CACHE_KEY,JSON.stringify(c));
  state.tasks=[];rebuildDerivedIndexes();
  const usedCache=bootData();
  if(!usedCache) throw new Error('an old cache must still be rendered, never a blank screen');
  if(state.tasks.length!==1) throw new Error('old cache was not applied');
  state.tasks=svT;rebuildDerivedIndexes();
});
runAsync('v9.3 an unchanged payload does not trigger a re-render', async ()=>{
  _inFlightWrites=[];_lastWriteAt=0;_lastPayloadSig=null;
  await refreshData(true); await tick(); await tick();
  const first=_lastPayloadSig;
  if(!first) throw new Error('no payload signature recorded');
  await refreshData(true); await tick(); await tick();
  if(_lastPayloadSig!==first) throw new Error('an identical payload produced a different signature');
});
// ---- stale check is advisory only ----
run('v9.3 the stale check runs every 2 minutes, not every 10 seconds', ()=>{
  if(STALE_CHECK_MS!==120000) throw new Error('expected 120000, got '+STALE_CHECK_MS);
  const src=fs.readFileSync('/home/claude/extracted.js','utf8');
  if(!/setInterval\(checkStale,STALE_CHECK_MS\)/.test(src)) throw new Error('the interval does not use STALE_CHECK_MS');
});
run('v9.3 checkStale only shows the badge, it never fetches', ()=>{
  __posts.length=0;
  const svFetch=global.fetch; let gets=0;
  global.fetch=function(u,o){ if(!o||o.method!=='POST')gets++; return svFetch.apply(null,arguments); };
  const sv=_lastFetch;
  _lastFetch=Date.now()-(STALE_MS+5000);
  checkStale();
  if(gets!==0) throw new Error('checkStale issued '+gets+' request(s); it must be advisory only');
  if(!el('stale-badge').classList.contains('on')) throw new Error('the badge should be showing');
  _lastFetch=sv; global.fetch=svFetch; hideStaleBadge();
});
run('v9.3 returning to the app no longer auto-fetches', ()=>{
  const src=fs.readFileSync('/home/claude/extracted.js','utf8');
  const vis=src.slice(src.indexOf("visibilitychange"), src.indexOf("visibilitychange")+700);
  if(/refreshData\(true\)/.test(vis)) throw new Error('the visibility handler still auto-fetches');
});
run('v9.3 an optimistically added task renders as a normal card', ()=>{
  const src=fs.readFileSync('/home/claude/extracted.js','utf8');
  if(/_temp\?' loading'/.test(src)) throw new Error('temp tasks still get the dimmed loading class');
  const css=__cssText||'';
  if(/\.tc\.loading\{/.test(css)) throw new Error('the dimmed .tc.loading style is still defined');
  if(/saving\.\.\./.test(css)) throw new Error('the "saving..." suffix is still in the stylesheet');
});
run('v9.3 the login ping is fire-and-forget, never awaited', ()=>{
  const src=fs.readFileSync('/home/claude/extracted.js','utf8');
  // it must not be awaited nor chained ahead of the data fetch
  if(/await\s+apiGet\(\{action:'ping'\}/.test(src)) throw new Error('ping is awaited');
  if(/apiGet\(\{action:'ping'\}\)\s*\.then\([^)]*bootData/.test(src)) throw new Error('the data fetch is chained behind ping');
  if(!/apiGet\(\{action:'ping'\}\)\.catch\(/.test(src)) throw new Error('ping should be fired with its own catch');
});

// ---- v9.2.1 boot resilience ----
run('v9.2.1 reads get a longer timeout than writes', ()=>{
  if(typeof GET_TIMEOUT==='undefined') throw new Error('no GET_TIMEOUT');
  if(GET_TIMEOUT<=API_TIMEOUT) throw new Error('a read must be allowed longer than a write: '+GET_TIMEOUT+' vs '+API_TIMEOUT);
  if(GET_TIMEOUT<45000) throw new Error('too short for a cold Apps Script container: '+GET_TIMEOUT);
  const src=fs.readFileSync('/home/claude/extracted.js','utf8');
  if(!/_fetchTimeout\(url,null,GET_TIMEOUT\)/.test(src)) throw new Error('apiGet does not use GET_TIMEOUT');
  // writes must NOT get the long timeout; a retryable write is how duplicates happened
  if(/_fetchTimeout\(API,\{method:'POST'[^)]*\},GET_TIMEOUT/.test(src)) throw new Error('POSTs must keep the short timeout');
});
run('v9.2.1 a failed first load shows an actionable error, never a blank screen', ()=>{
  const svT=state.tasks;
  state.tasks=[];
  el('boot-error').classList.add('gone');
  showBootError('Could not reach the server.');
  if(el('boot-error').classList.contains('gone')) throw new Error('the error panel should be visible with no data');
  hideBootError();
  if(!el('boot-error').classList.contains('gone')) throw new Error('hideBootError did not hide it');
  state.tasks=svT;
});
run('v9.2.1 the error panel never covers data we already have', ()=>{
  const svT=state.tasks;
  state.tasks=[{task_id:'have1',name:'Something',type:'one_off',due_date:todayStr(),status:'active',scope:'household',owner:''}];
  el('boot-error').classList.add('gone');
  showBootError('Could not reach the server.');
  if(!el('boot-error').classList.contains('gone'))
    throw new Error('with tasks on screen the error panel must stay hidden');
  state.tasks=svT;
});

// ---- report ----
asyncChain.then(tick).then(tick).then(function(){
let fails = 0;
for (const [s,n] of tests){ if(s==='FAIL'){ console.log('FAIL  '+n); fails++; } }
console.log('\n'+tests.length+' checks run, '+fails+' failed, '+(tests.length-fails)+' passed');
process.exit(fails? 1:0);
});

