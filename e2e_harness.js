// Real-browser check of the built index.html. The API is intercepted, so this drives the
// actual UI against a fixture that contains the exact broken snooze rows from the live sheet.
// Real-browser checks against the built index.html, with the Apps Script endpoint
// intercepted so the UI runs on a fixture containing the exact broken snooze rows.
// Covers what the DOM mock in qa_harness.js cannot: real CSS, real event dispatch, real
// layout at phone width.
//
//   npx --yes http-server . -p 8099 -s &
//   NODE_PATH=$(npm root -g) node e2e_harness.js
//
// Requires the globally installed playwright and /opt/pw-browsers/chromium.
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = process.env.BASE || 'http://127.0.0.1:8099';
const OUT = process.env.OUT || '/tmp/loonhq-e2e';   // screenshots land here

const today = new Date();
const iso = d => d.toISOString().split('T')[0];
const plus = n => { const d = new Date(today); d.setDate(d.getDate() + n); return iso(d); };
const stamp = n => { const d = new Date(today); d.setDate(d.getDate() - n); return d.toISOString(); };

// A snooze row as it actually comes back from the live sheet: log_type and details were
// written into columns with no header, so they collapse under the '' key.
const brokenSnooze = (id, task, who, days) => ({
  log_id: id, task_id: task, task_name: 'Water plants', completed_by: who,
  completed_at: stamp(days), scope: 'household', notes: '',
  '': '{"until_date":"' + plus(2) + '"}',
});

const FIXTURE = {
  tasks: [
    { task_id: 't1', name: 'Water plants', type: 'one_off', due_date: iso(today), owner: '', scope: 'household', status: 'active', notes: '' },
    { task_id: 't2', name: 'Pick shower tile', type: 'one_off', due_date: iso(today), owner: 'Frankie,Meredith', scope: 'household', status: 'active', notes: '' },
    { task_id: 't3', name: 'Replace AC filter', type: 'interval', recurrence_days: 6, sched_freq: 'month', due_date: plus(4), owner: 'Meredith', scope: 'household', status: 'active' },
    { task_id: 't4', name: 'My private thing', type: 'one_off', due_date: plus(1), owner: 'Frankie', scope: 'personal', status: 'active' },
    { task_id: 't5', name: 'Overdue thing', type: 'one_off', due_date: plus(-3), owner: 'Frankie', scope: 'household', status: 'active' },
  ],
  projects: [], subtasks: [], grocery: [], assets: [], maintenance_logs: [],
  task_log: [
    brokenSnooze('s1', 't1', 'Frankie', 6),
    brokenSnooze('s2', 't1', 'Frankie', 4),
    brokenSnooze('s3', 't1', 'Frankie', 2),
    { log_id: 'c1', task_id: 't1', task_name: 'Water plants', completed_by: 'Meredith', completed_at: stamp(1), scope: 'household', notes: '', details: '', log_type: 'completion' },
    { log_id: 'c2', task_id: 't2', task_name: 'Pick shower tile', completed_by: 'Frankie,Meredith', completed_at: stamp(2), scope: 'household', notes: '', details: '', log_type: 'completion' },
    { log_id: 'c3', task_id: 't5', task_name: 'Bins', completed_by: 'Frankie', completed_at: stamp(3), scope: 'household', notes: '', details: '', log_type: 'completion' },
    { log_id: 'p1', task_id: 't4', task_name: 'Frankie private done', completed_by: 'Frankie', completed_at: stamp(2), scope: 'personal', notes: '', details: '', log_type: 'completion' },
    { log_id: 'p2', task_id: 't9', task_name: 'Meredith private done', completed_by: 'Meredith', completed_at: stamp(2), scope: 'personal', notes: '', details: '', log_type: 'completion' },
  ],
};

const SETTLE = 250;   // .who-opt and friends transition for .15s; never shoot mid-animation
const results = [];
const ok = (n, cond, detail) => results.push([cond ? 'PASS' : 'FAIL', n + (cond ? '' : ' :: ' + detail)]);

(async () => {
  try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });

  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  // the icon font and Google Fonts come from CDNs this sandbox cannot reach, so ignore
  // resource-loading noise and keep only genuine script errors
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/Failed to load resource|ERR_TUNNEL|ERR_CONNECTION|ERR_NAME_NOT_RESOLVED/.test(t)) return;
    errors.push('console: ' + t);
  });

  let failPosts = false;
  const serverCompleted = new Set();   // the mock backend remembers what it accepted
  await page.route('**script.google.com**', async route => {
    const req = route.request();
    if (req.method() === 'POST') {
      if (!failPosts) {
        try {
          const body = JSON.parse(req.postData() || '{}');
          if (body.action === 'completeTask') serverCompleted.add(body.data.task_id);
          if (body.action === 'batchComplete') (body.data.tasks || []).forEach(t => serverCompleted.add(t.task_id));
        } catch (e) { /* ignore */ }
      }
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify(failPosts ? { error: 'boom' } : { ok: true }) });
    }
    const url = req.url();
    if (url.includes('action=ping')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    const payload = Object.assign({}, FIXTURE, { tasks: FIXTURE.tasks.filter(t => !serverCompleted.has(t.task_id)) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
  });

  await page.goto(BASE + '/index.html');

  // ---- login ----
  await page.click('.who-btn:has-text("Frankie")');
  await page.fill('#pin-input', '225522');
  await page.waitForSelector('#main-app:not(.gone)', { timeout: 8000 });
  await page.waitForFunction(() => document.querySelectorAll('.tc').length > 0, { timeout: 8000 });
  ok('login renders the task list', (await page.locator('.tc').count()) > 0, 'no task cards');

  // ---- joint owner badge on the card ----
  const jointBadge = await page.locator('.tc-wrap:has-text("Pick shower tile") .who-both').count();
  ok('joint task shows the F&M owner badge', jointBadge === 1, 'found ' + jointBadge + ' .who-both');
  const badgeText = await page.evaluate(() => {
    const el = document.querySelector('.who-both');
    return el ? getComputedStyle(el, '::before').content : null;
  });
  ok('joint badge renders its F&M glyph via CSS', badgeText && badgeText.includes('F') && badgeText.includes('M'), 'content=' + badgeText);

  await page.waitForTimeout(SETTLE);
  await page.screenshot({ path: OUT + '/01-today.png' });

  // ---- owner multi-select in the add-task modal ----
  await page.click('#fab');
  await page.waitForSelector('#modal-task:not(.gone)');
  const ownerState = async () => page.evaluate(() => ({
    either: document.getElementById('owner-either').className,
    f: document.getElementById('owner-f').className,
    m: document.getElementById('owner-m').className,
    picked: window.pickedOwner,
  }));
  let st = await ownerState();
  ok('modal opens with Either of us selected', st.either.includes('sel-either') && st.picked === '', JSON.stringify(st));

  await page.click('#owner-f');
  st = await ownerState();
  ok('picking Frankie clears Either', st.f.includes('sel-f') && !st.either.includes('sel-either') && st.picked === 'Frankie', JSON.stringify(st));

  await page.click('#owner-m');
  st = await ownerState();
  ok('both names can be selected together', st.f.includes('sel-f') && st.m.includes('sel-m') && st.picked === 'Frankie,Meredith', JSON.stringify(st));
  await page.waitForTimeout(SETTLE);
  const painted = await page.evaluate(() => {
    const bg = id => getComputedStyle(document.getElementById(id)).backgroundColor;
    return { either: bg('owner-either'), f: bg('owner-f'), m: bg('owner-m') };
  });
  ok('both names actually PAINT as selected and Either does not',
     painted.f !== painted.either && painted.m !== painted.either && painted.f !== painted.m,
     JSON.stringify(painted));
  await page.waitForTimeout(SETTLE);
  await page.screenshot({ path: OUT + '/02-owner-both.png' });

  await page.click('#owner-either');
  st = await ownerState();
  ok('Either of us is exclusive and clears both names', st.either.includes('sel-either') && !st.f.includes('sel-f') && !st.m.includes('sel-m') && st.picked === '', JSON.stringify(st));

  await page.click('#owner-f'); await page.click('#owner-m'); await page.click('#owner-f');
  st = await ownerState();
  ok('toggling one name off leaves the other', st.picked === 'Meredith', JSON.stringify(st));
  await page.click('#modal-task .modal-x');

  // ---- interval unit selector ----
  await page.click('#fab');
  await page.waitForSelector('#modal-task:not(.gone)');
  await page.selectOption('#t-type', 'interval');
  const unitVisible = await page.locator('#t-days-unit').isVisible();
  ok('interval type shows the day/week/month/year unit picker', unitVisible, 'unit select hidden');
  const unitOpts = await page.locator('#t-days-unit option').allTextContents();
  ok('unit picker offers all four units', unitOpts.join(',') === 'days,weeks,months,years', unitOpts.join(','));
  await page.screenshot({ path: OUT + '/03-interval-units.png' });
  await page.click('#modal-task .modal-x');

  // ---- Activity: stats must exclude snoozes and credit joint completions to both ----
  await page.click('[data-view="metrics"]:visible');
  await page.waitForSelector('#v-metrics:not(.gone)');
  await page.waitForTimeout(200);
  const nums = await page.locator('#metrics-nums').innerText();
  const counts = await page.evaluate(() => ({ all: window._drillAll.length, f: window._drillF.length, m: window._drillM.length }));
  // household completions in fixture: c1 (Meredith), c2 (joint), c3 (Frankie) = 3 tasks
  ok('stats exclude the 3 snooze rows', counts.all === 3, 'total=' + counts.all + ' expected 3; ' + nums.replace(/\n/g, ' '));
  ok('joint completion credits Frankie', counts.f === 2, 'Frankie=' + counts.f + ' expected 2 (c2 joint + c3)');
  ok('joint completion credits Meredith', counts.m === 2, 'Meredith=' + counts.m + ' expected 2 (c1 + c2 joint)');
  await page.screenshot({ path: OUT + '/04-stats.png' });

  // ---- Activity: the two history tabs ----
  await page.click('[data-mtab="household"]:visible');
  await page.waitForTimeout(150);
  const hhRows = await page.locator('#history-list > *').count();
  const hhText = await page.locator('#history-list').innerText();
  ok('Household History lists only household completions', hhRows === 3, hhRows + ' rows: ' + hhText.replace(/\n/g, ' | '));
  ok('Household History excludes snoozes', !/Water plants[\s\S]*Water plants/.test(hhText), 'snooze rows leaked: ' + hhText.replace(/\n/g, ' | '));
  ok('joint completion reads as "Frankie & Meredith"', hhText.includes('Frankie & Meredith'), hhText.replace(/\n/g, ' | '));
  const bothDot = await page.locator('#history-list .ldot.both').count();
  ok('joint completion shows the split dot', bothDot === 1, 'found ' + bothDot);
  await page.screenshot({ path: OUT + '/05-household-history.png' });

  await page.click('[data-mtab="personal"]:visible');
  await page.waitForTimeout(150);
  const pText = await page.locator('#history-list').innerText();
  const pRows = await page.locator('#history-list > *').count();
  ok('Personal History shows only your own personal completions', pRows === 1 && pText.includes('Frankie private done'), pRows + ' rows: ' + pText.replace(/\n/g, ' | '));
  ok("Personal History hides the other person's personal task", !pText.includes('Meredith private done'), pText.replace(/\n/g, ' | '));
  await page.screenshot({ path: OUT + '/06-personal-history.png' });

  // ---- failure path: rollback + tappable retry toast ----
  await page.click('[data-view="tasks"]:visible');
  await page.waitForSelector('#v-tasks:not(.gone)');
  await page.waitForTimeout(150);
  failPosts = true;
  const before = await page.locator('.tc').count();
  await page.locator('.tc-wrap:has-text("Overdue thing") .circ').first().click();
  await page.waitForSelector('#toast-msg.on', { timeout: 5000 });
  const toast = await page.locator('#toast-msg').innerText();
  ok('a failed completion shows a toast', /Couldn't complete/.test(toast), 'toast=' + toast);
  ok('the toast offers tap to retry', /Tap to retry/.test(toast), 'toast=' + toast);
  const tappable = await page.evaluate(() => {
    const t = document.getElementById('toast-msg');
    return { cls: t.className, pe: getComputedStyle(t).pointerEvents };
  });
  ok('retry toast is actually clickable', tappable.cls.includes('tappable') && tappable.pe === 'auto', JSON.stringify(tappable));
  await page.waitForTimeout(400);
  const after = await page.locator('.tc').count();
  ok('the task is restored after the failure', after === before, 'before=' + before + ' after=' + after);
  await page.screenshot({ path: OUT + '/07-retry-toast.png' });

  // retry succeeds this time
  failPosts = false;
  await page.click('#toast-msg');
  await page.waitForTimeout(600);
  const collapsed = await page.evaluate(() => {
    const w = document.querySelector('.tc-wrap[data-task-id="t5"]');
    return w ? { h: w.offsetHeight, op: w.style.opacity } : { h: -1, op: 'gone' };
  });
  ok('tapping retry hides the card immediately', collapsed.h === 0 || collapsed.op === 'gone', JSON.stringify(collapsed));
  ok('the retried completion reached the server', await page.evaluate(() => true) && serverCompleted.has('t5'), 'server never recorded t5');
  // the 3s background reconcile should then drop it from the DOM for good
  await page.waitForFunction(() => !document.querySelector('.tc-wrap[data-task-id="t5"]'), { timeout: 8000 })
    .then(() => ok('the background reconcile removes the completed card', true))
    .catch(() => ok('the background reconcile removes the completed card', false, 'card still in the DOM after the sync'));

  // ---- the three glitches Frankie reported on 2026-07-30 -------------------
  // a) the pending card must not flash. It used to run pulse 1s infinite, oscillating
  //    opacity between 1 and .3 for the whole sync, which read as a ghost.
  await page.click('[data-view="tasks"]:visible');
  await page.waitForSelector('#v-tasks:not(.gone)');
  await page.waitForTimeout(200);
  let held = null;
  await page.unroute('**script.google.com**');
  await page.route('**script.google.com**', async route => {
    const req = route.request();
    if (req.method() === 'POST') { held = route; return; }          // hang, never fulfil
    const payload = Object.assign({}, FIXTURE, { tasks: FIXTURE.tasks.filter(t => !serverCompleted.has(t.task_id)) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
  });
  await page.evaluate(() => { window.API_TIMEOUT = 1500; });        // shorten for the test
  await page.click('#fab');
  await page.waitForSelector('#modal-task:not(.gone)');
  await page.fill('#t-name', 'Ghost check');
  await page.click('#modal-task .btn.primary');
  await page.waitForSelector('.tc.loading', { timeout: 5000 });
  ok('a pending card appears immediately', await page.locator('.tc.loading').count() === 1, 'no pending card');
  const anim = await page.evaluate(() => {
    const el = document.querySelector('.tc.loading');
    const s = getComputedStyle(el);
    return { name: s.animationName, iter: s.animationIterationCount, op: s.opacity };
  });
  ok('the pending card does NOT run an infinite animation',
     anim.name === 'none' && anim.iter !== 'infinite', JSON.stringify(anim));
  ok('the pending card is dimmed but readable', parseFloat(anim.op) >= 0.4 && parseFloat(anim.op) < 1, 'opacity=' + anim.op);
  const savingLabel = await page.evaluate(() => {
    const el = document.querySelector('.tc.loading .tn');
    return el ? getComputedStyle(el, '::after').content : null;
  });
  ok('the pending card says what it is doing', savingLabel && /saving/i.test(savingLabel), 'after-content=' + savingLabel);

  // b) a hung request must time out, surface a toast, and roll the card back
  await page.waitForSelector('#toast-msg.on', { timeout: 8000 });
  const hungToast = await page.locator('#toast-msg').innerText();
  ok('a hung request eventually reports failure', /Couldn't save task/.test(hungToast), 'toast=' + hungToast);
  ok('the hung-request toast offers a retry', /Tap to retry/.test(hungToast), 'toast=' + hungToast);
  await page.waitForTimeout(300);
  ok('the pending card is rolled back after a timeout', await page.locator('.tc.loading').count() === 0, 'pending card survived');
  ok('no orphaned "Ghost check" card is left behind', await page.locator('.tc-wrap:has-text("Ghost check")').count() === 0, 'orphan card');

  // c) tapping retry after a timeout must actually re-run the add
  let postsSeen = 0;
  await page.unroute('**script.google.com**');
  await page.route('**script.google.com**', async route => {
    const req = route.request();
    if (req.method() === 'POST') { postsSeen++; return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); }
    const payload = Object.assign({}, FIXTURE, { tasks: FIXTURE.tasks.filter(t => !serverCompleted.has(t.task_id)) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
  });
  await page.click('#toast-msg');
  await page.waitForTimeout(600);
  ok('tapping retry re-sends the add', postsSeen >= 1, 'no POST after retry, saw ' + postsSeen);
  ok('the retried card reappears', await page.locator('.tc-wrap:has-text("Ghost check")').count() === 1, 'card did not come back');

  // d) after success the real row should arrive fast, not on a flat 3s wait
  const fast = await page.evaluate(() => ({ f: window.SYNC_FAST, s: window.SYNC_SLOW }));
  ok('a successful write schedules a fast reconcile', fast.f > 0 && fast.f <= 1000, JSON.stringify(fast));
  ok('rollbacks still back off', fast.s >= 3000, JSON.stringify(fast));

  // ---- the logo must actually render -----------------------------------------
  // It built as src="" for two weeks because build_v4.py read it from a path outside the
  // repo. It is committed now, so assert it is present AND that the browser decoded it.
  const logo = await page.evaluate(async () => {
    const el = document.querySelector('.sb-logo-icon');
    if (!el) return { found: false };
    const src = el.getAttribute('src') || '';
    let loaded = el.complete && el.naturalWidth > 0;
    if (!loaded && src) {
      loaded = await new Promise(res => { const i = new Image(); i.onload = () => res(true); i.onerror = () => res(false); i.src = src; });
    }
    return { found: true, empty: src === '', isData: src.startsWith('data:image/'), len: src.length, loaded,
             w: el.naturalWidth, h: el.naturalHeight };
  });
  ok('the logo element exists', logo.found, 'no .sb-logo-icon');
  ok('the logo src is not empty', logo.found && !logo.empty, JSON.stringify(logo));
  ok('the logo is a self-contained data URI, not a remote URL', logo.isData, JSON.stringify(logo));
  ok('the browser actually decoded the logo image', logo.loaded && logo.w > 0, JSON.stringify(logo));

  // ---- batch mode: the bar must FIT, and mass delete must exist -------------
  // 360px, not the 430 used above. The old one-row bar fitted at 430 and only clipped
  // "Complete all" at 360 and below, so testing at 430 proved nothing.
  await page.setViewportSize({ width: 360, height: 850 });
  await page.unroute('**script.google.com**');
  let batchDeletePayload = null;
  await page.route('**script.google.com**', async route => {
    const req = route.request();
    if (req.method() === 'POST') {
      try { const b = JSON.parse(req.postData() || '{}'); if (b.action === 'batchDelete') batchDeletePayload = b.data; } catch (e) {}
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FIXTURE) });
  });
  await page.evaluate(() => { window.confirm = () => true; });
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('.tc').length > 0, { timeout: 8000 });
  await page.evaluate(() => { window.confirm = () => true; });
  await page.click('[data-view="tasks"]:visible');
  await page.waitForTimeout(200);

  await page.evaluate(() => enterBatch());
  await page.waitForTimeout(SETTLE + 150);
  ok('batch bar opens', await page.locator('#batch-bar.on').count() === 1, 'bar not shown');

  await page.evaluate(() => selectAll());
  await page.waitForTimeout(SETTLE);
  const fit = await page.evaluate(() => {
    const bar = document.getElementById('batch-bar');
    const kids = [...bar.querySelectorAll('.batch-top, .batch-actions')];
    return {
      barW: Math.round(bar.getBoundingClientRect().width),
      scrollW: bar.scrollWidth,
      clientW: bar.clientWidth,
      rows: kids.map(k => ({ sw: k.scrollWidth, cw: k.clientWidth })),
      docScroll: document.documentElement.scrollWidth,
      docClient: document.documentElement.clientWidth,
    };
  });
  ok('the batch bar does not overflow its own width', fit.scrollW <= fit.clientW + 1, JSON.stringify(fit));
  ok('neither row inside the bar overflows', fit.rows.every(r => r.sw <= r.cw + 1), JSON.stringify(fit.rows));
  ok('the batch bar does not push the page sideways', fit.docScroll <= fit.docClient + 1, 'doc ' + fit.docScroll + ' vs ' + fit.docClient);

  const labels = await page.locator('#batch-bar .batch-btn').allInnerTexts();
  ok('batch mode offers Delete', labels.some(t => /delete/i.test(t)), labels.join(' | '));
  ok('batch mode still offers Snooze, Complete and Select all', 
     labels.some(t => /snooze/i.test(t)) && labels.some(t => /complete/i.test(t)) && labels.some(t => /select all/i.test(t)),
     labels.join(' | '));

  // every button must be fully inside the bar, not clipped at either edge
  const clipped = await page.evaluate(() => {
    const bar = document.getElementById('batch-bar').getBoundingClientRect();
    return [...document.querySelectorAll('#batch-bar .batch-btn, #batch-bar .batch-count')]
      .filter(el => { const r = el.getBoundingClientRect(); return r.left < bar.left - 1 || r.right > bar.right + 1; })
      .map(el => el.textContent.trim() + ' @' + Math.round(el.getBoundingClientRect().right));
  });
  ok('no batch control is clipped by the bar edges', clipped.length === 0, clipped.join(', '));

  // and the text must not be visually truncated inside its own button
  const truncated = await page.evaluate(() => [...document.querySelectorAll('#batch-bar .batch-btn')]
    .filter(b => b.scrollWidth > b.clientWidth + 1).map(b => b.textContent.trim()));
  ok('no batch button text is cut off', truncated.length === 0, truncated.join(', '));

  const selCount = await page.locator('#batch-count').innerText();
  ok('select all reports a count', /\d+ selected/.test(selCount), 'count=' + selCount);
  // Today shows Overdue + Today only, so select-all covers exactly the visible cards
  const visibleBefore = await page.locator('.tc').count();
  ok('select all selects every visible card', parseInt(selCount) === visibleBefore,
     'count says ' + selCount + ' but ' + visibleBefore + ' cards are shown');

  await page.click('#batch-del-btn');
  await page.waitForTimeout(500);
  ok('mass delete sends ONE request for the whole selection', batchDeletePayload !== null, 'no batchDelete call');
  ok('mass delete sends every selected id, and no others',
     batchDeletePayload && batchDeletePayload.task_ids.length === visibleBefore,
     'sent ' + JSON.stringify(batchDeletePayload) + ' for ' + visibleBefore + ' selected');
  ok('the deleted cards disappear immediately', await page.locator('.tc').count() === 0, 'cards remained');

  ok('no uncaught page errors', errors.length === 0, errors.slice(0, 5).join(' ~ '));

  await browser.close();

  let fails = 0;
  for (const [s, n] of results) { console.log((s === 'FAIL' ? 'FAIL  ' : 'pass  ') + n); if (s === 'FAIL') fails++; }
  console.log('\n' + results.length + ' browser checks, ' + fails + ' failed, ' + (results.length - fails) + ' passed');
  process.exit(fails ? 1 : 0);
})().catch(e => {
  // Print whatever ran before the abort. Losing every result because one late step threw
  // made it impossible to tell whether the earlier assertions had actually caught anything.
  let fails = 0;
  for (const [st, n] of results) { console.log((st === 'FAIL' ? 'FAIL  ' : 'pass  ') + n); if (st === 'FAIL') fails++; }
  console.log('\n' + results.length + ' browser checks ran before the abort, ' + fails + ' failed');
  console.error('HARNESS ERROR: ' + e.message);
  process.exit(2);
});
