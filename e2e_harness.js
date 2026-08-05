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
  projects: [], subtasks: [], grocery: [
    { item_id: 'g1', name: 'Milk', category: 'Food', status: 'need', sort_order: 1 },
    { item_id: 'g2', name: 'Eggs', category: 'Food', status: 'need', sort_order: 2 },
    { item_id: 'g3', name: 'Bread', category: 'Food', status: 'need', sort_order: 3 },
  ],
  lists: [{ list_id: 'l1', name: 'Garage', is_permanent: '', created_at: '2026-01-01', sort_order: 1 }],
  assets: [], maintenance_logs: [],
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
  // v9.1: picking a name signs you straight in, no PIN step
  await page.click('.who-btn:has-text("Frankie")');
  await page.waitForSelector('#main-app:not(.gone)', { timeout: 8000 });
  await page.waitForFunction(() => document.querySelectorAll('.tc').length > 0, { timeout: 8000 });
  ok('login renders the task list', (await page.locator('.tc').count()) > 0, 'no task cards');

  // ---- joint owner badge on the card ----
  const jointBadge = await page.locator('.tc-wrap:has-text("Pick shower tile") .who-both').count();
  ok('joint task shows the F&M owner badge', jointBadge === 1, 'found ' + jointBadge + ' .who-both');
  const bothStyle = await page.evaluate(() => {
    const el = document.querySelector('.who-both');
    if (!el) return null;
    const s = getComputedStyle(el);
    return { bg: s.backgroundImage, glyph: getComputedStyle(el, '::before').content, text: el.textContent.trim() };
  });
  ok('joint badge is a diagonal split of the two user colours',
     bothStyle && /gradient/.test(bothStyle.bg), JSON.stringify(bothStyle));
  ok('joint badge carries NO letter (v9)',
     bothStyle && !bothStyle.text && (bothStyle.glyph === 'none' || !bothStyle.glyph), JSON.stringify(bothStyle));

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
  ok('a failed completion says it could not be confirmed', /Couldn't confirm/.test(toast), 'toast=' + toast);
  ok('v9 does NOT offer an automatic retry', !/Tap to retry/.test(toast), 'toast=' + toast);
  await page.waitForTimeout(500);
  const after = await page.locator('.tc').count();
  ok('the task is restored after the failure', after === before, 'before=' + before + ' after=' + after);
  const cleanState = await page.evaluate(() => ({ pending: pendingCount(), recent: Object.keys(_recentCommit).length }));
  ok('a failed completion leaves nothing pending or marked committed',
     cleanState.pending === 0 && cleanState.recent === 0, JSON.stringify(cleanState));
  await page.screenshot({ path: OUT + '/07-failed-completion.png' });

  // and a SUCCESSFUL completion offers undo instead
  failPosts = false;
  await page.evaluate(() => { const t = state.tasks.find(x => x.task_id === 't5'); if (t) handleComplete(t); });
  await page.waitForSelector('#toast-msg.on', { timeout: 8000 });
  await page.waitForTimeout(400);
  const undoToast = await page.locator('#toast-msg').innerText();
  ok('a successful completion offers Undo', /Undo/.test(undoToast), 'toast=' + undoToast);
  const undoTappable = await page.evaluate(() => {
    const t = document.getElementById('toast-msg');
    return { cls: t.className, pe: getComputedStyle(t).pointerEvents };
  });
  ok('the undo toast is clickable', undoTappable.cls.includes('tappable') && undoTappable.pe === 'auto', JSON.stringify(undoTappable));
  ok('the completion reached the server', serverCompleted.has('t5'), 'server never recorded t5');
  // clear the undo toast so it cannot bleed into the next section's assertions
  await page.evaluate(() => { _undoItems = null; _undoLogIds = null; hideToast(); });
  await page.waitForTimeout(200);

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

  // ---- v9.1: no PIN, and no external dependency for startup or icons -------
  const noPin = await page.evaluate(() => ({
    pinInput: !!document.getElementById('pin-input'),
    pinWrap: !!document.getElementById('pin-wrap'),
    pinsGlobal: typeof PINS !== 'undefined',
  }));
  ok('the PIN screen is gone entirely', !noPin.pinInput && !noPin.pinWrap && !noPin.pinsGlobal, JSON.stringify(noPin));

  const blocking = await page.evaluate(() => {
    const out = { renderBlocking: [], iconFont: 0 };
    [...document.querySelectorAll('link[rel="stylesheet"]')].forEach(l => {
      if (l.closest('noscript')) return;                 // only applies without JS
      if (/^https?:/.test(l.getAttribute('href') || '') && l.media !== 'print') out.renderBlocking.push(l.href);
    });
    [...document.styleSheets].forEach(() => {});
    out.iconFont = document.documentElement.innerHTML.includes('icons-webfont') ? 1 : 0;
    return out;
  });
  ok('nothing external blocks the first paint', blocking.renderBlocking.length === 0, JSON.stringify(blocking.renderBlocking));
  ok('the icon CDN is gone', blocking.iconFont === 0, 'icons-webfont still referenced');

  // Checking that a mask is SET is not enough: a malformed data URI still reports a mask
  // but draws nothing, which shipped once and left every icon as an empty box. Decode the
  // URI and confirm the browser can actually rasterise it.
  const iconPaint = await page.evaluate(async () => {
    const els = [...document.querySelectorAll('.ti')].filter(e => e.offsetParent !== null);
    const noMask = [], tooSmall = [], uris = new Set();
    els.forEach(e => {
      const s = getComputedStyle(e), r = e.getBoundingClientRect();
      const mi = s.maskImage || s.webkitMaskImage || '';
      if (!mi || mi === 'none') { noMask.push(e.className); return; }
      const m = mi.match(/url\(["']?(data:image\/svg\+xml,[^"')]+)["']?\)/);
      if (m) uris.add(m[1]);
      if (r.width < 8 || r.height < 8) tooSmall.push(e.className + '@' + Math.round(r.width));
    });
    // every distinct icon must decode into a real, rasterisable SVG
    const broken = [];
    for (const u of uris) {
      const okImg = await new Promise(res => { const i = new Image(); i.onload = () => res(i.width > 0); i.onerror = () => res(false); i.src = u; });
      if (!okImg) broken.push(decodeURIComponent(u.slice(0, 90)));
    }
    return { visible: els.length, distinct: uris.size, noMask: noMask.slice(0, 3), tooSmall: tooSmall.slice(0, 3), broken: broken.slice(0, 2) };
  });
  ok('every visible icon has a mask set', iconPaint.visible > 10 && iconPaint.noMask.length === 0, JSON.stringify(iconPaint));
  ok('every icon is big enough to see', iconPaint.tooSmall.length === 0, JSON.stringify(iconPaint.tooSmall));
  ok('every icon data URI actually decodes and rasterises', iconPaint.broken.length === 0, JSON.stringify(iconPaint.broken));

  // ---- the logo must actually render -----------------------------------------
  // It built as src="" for two weeks because build_v4.py read it from a path outside the
  // repo. It is committed now, so assert it is present AND that the browser decoded it.
  const logo = await page.evaluate(async () => {
    const el = document.querySelector('.sb-logo-icon');
    if (!el) return { found: false };
    // the image is now painted from a single --logo custom property rather than three
    // separate <img src> copies, so read the resolved background instead
    const bg = getComputedStyle(el).backgroundImage || '';
    const m = bg.match(/url\(["']?(data:[^"')]+)["']?\)/);
    const uri = m ? m[1] : '';
    const loaded = uri ? await new Promise(res => { const i = new Image(); i.onload = () => res(i.naturalWidth); i.onerror = () => res(0); i.src = uri; }) : 0;
    return { found: true, empty: !uri, isData: uri.startsWith('data:image/'), len: uri.length,
             loaded: loaded > 0, w: loaded, label: el.getAttribute('aria-label') || '' };
  });
  ok('the logo element exists', logo.found, 'no .sb-logo-icon');
  ok('the logo image resolves to a real URI', logo.found && !logo.empty, JSON.stringify(logo));
  ok('the logo is a self-contained data URI, not a remote URL', logo.isData, JSON.stringify(logo));
  ok('the browser actually decoded the logo image', logo.loaded && logo.w > 0, JSON.stringify(logo));
  ok('the logo keeps an accessible label', /loon/i.test(logo.label), 'aria-label=' + logo.label);
  // the whole point of the change: one copy of the image, not three
  const logoCopies = await page.evaluate(() => {
    const all = [...document.querySelectorAll('.logo-img')];
    const uris = new Set(all.map(e => getComputedStyle(e).backgroundImage));
    return { spots: all.length, distinct: uris.size };
  });
  ok('all logo spots share ONE image definition', logoCopies.spots >= 2 && logoCopies.distinct === 1, JSON.stringify(logoCopies));

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

  // ---- the LAST card must be reachable, not hidden under the bar --------------
  // Frankie could see the last task by dragging, but it sprang back on release and could
  // never be tapped. The bar floats over the scroller, so the scroller has to reserve room.
  await page.evaluate(() => exitBatch());
  await page.waitForTimeout(SETTLE);
  // give the list enough cards to actually scroll
  await page.evaluate(() => {
    const t = new Date().toISOString().split('T')[0];
    for (let i = 0; i < 14; i++) state.tasks.push({ task_id: 'pad' + i, name: 'Padding task ' + i, type: 'one_off', due_date: t, owner: '', scope: 'household', status: 'active' });
    rebuildTaskIndex(); renderTasks();
  });
  await page.evaluate(() => enterBatch());
  await page.waitForTimeout(SETTLE + 150);
  await page.evaluate(() => { const sc = document.getElementById('task-scroll'); sc.scrollTop = sc.scrollHeight; });
  await page.waitForTimeout(SETTLE);

  const reach = await page.evaluate(() => {
    const sc = document.getElementById('task-scroll');
    const cards = [...document.querySelectorAll('#task-list .tc')];
    const last = cards[cards.length - 1];
    const lr = last.getBoundingClientRect();
    const br = document.getElementById('batch-bar').getBoundingClientRect();
    const mid = { x: Math.round(lr.left + lr.width / 2), y: Math.round(lr.top + lr.height / 2) };
    const hit = document.elementFromPoint(mid.x, mid.y);
    return {
      cards: cards.length,
      lastBottom: Math.round(lr.bottom), barTop: Math.round(br.top),
      atBottom: sc.scrollTop >= sc.scrollHeight - sc.clientHeight - 2,
      hitIsInsideLastCard: !!(hit && last.contains(hit)),
      hitIsBar: !!(hit && hit.closest('#batch-bar')),
      hitTag: hit ? (hit.className || hit.tagName) : null,
    };
  });
  ok('the list scrolled all the way down', reach.atBottom, JSON.stringify(reach));
  ok('the last card clears the batch bar', reach.lastBottom <= reach.barTop + 1,
     'last card bottom ' + reach.lastBottom + ' vs bar top ' + reach.barTop);
  ok('tapping the middle of the last card hits the CARD, not the bar', reach.hitIsInsideLastCard && !reach.hitIsBar, JSON.stringify(reach));

  // and it must actually select when tapped
  const selectedLast = await page.evaluate(async () => {
    const cards = [...document.querySelectorAll('#task-list .tc')];
    const last = cards[cards.length - 1];
    const r = last.getBoundingClientRect();
    const hit = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
    if (!hit) return { ok: false, why: 'nothing at that point' };
    hit.click();
    await new Promise(res => setTimeout(res, 120));
    return { ok: selectedTaskIds.size === 1, size: selectedTaskIds.size };
  });
  ok('the last card can actually be selected', selectedLast.ok, JSON.stringify(selectedLast));
  await page.screenshot({ path: OUT + '/09-batch-last-card.png' });
  await page.evaluate(() => { selectedTaskIds.clear(); updateBatchCount(); selectAll(); });
  await page.waitForTimeout(SETTLE);

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

  // ---- v9.2 Lists: rename, custom lists, and drag that works on touch ---------
  let reorderSent = null;
  await page.unroute('**script.google.com**');
  await page.route('**script.google.com**', async route => {
    const req = route.request();
    if (req.method() === 'POST') {
      try { const b = JSON.parse(req.postData() || '{}'); if (b.action === 'reorderGrocery') reorderSent = b.data; } catch (e) {}
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FIXTURE) });
  });
  await page.evaluate(() => go('grocery'));
  await page.waitForTimeout(SETTLE + 200);

  const nav = await page.evaluate(() => ({
    title: (document.getElementById('pgtitle') || {}).textContent || '',
    mobile: [...document.querySelectorAll('.mob-nav-item span')].map(s => s.textContent),
    side: [...document.querySelectorAll('.nav-item')].map(n => n.textContent.trim()),
  }));
  ok('the section is called Lists, not Shop', !/Shop\b/.test(nav.mobile.join(',')) && nav.mobile.includes('Lists'), JSON.stringify(nav.mobile));
  ok('the sidebar says Lists', nav.side.some(t => /Lists/.test(t)) && !nav.side.some(t => /Shopping List/.test(t)), JSON.stringify(nav.side));

  const sections = await page.evaluate(() => ({
    count: document.querySelectorAll('#lists-wrap .grp').length,
    names: [...document.querySelectorAll('#lists-wrap .grp')].map(g => g.getAttribute('data-list')),
    deletable: [...document.querySelectorAll('#lists-wrap .grp')].filter(g => g.querySelector('.list-del')).map(g => g.getAttribute('data-list')),
    newBtn: !!document.querySelector('.newlist-btn'),
  }));
  ok('the three permanent lists render, plus the custom one', sections.count === 4, JSON.stringify(sections.names));
  ok('permanent lists come first, custom after', sections.names.slice(0, 3).join(',') === 'Food,Costco,Household', JSON.stringify(sections.names));
  ok('ONLY the custom list offers delete', sections.deletable.join(',') === 'Garage', JSON.stringify(sections.deletable));
  ok('there is a New list button', sections.newBtn, 'missing');

  // the whole point: this failed silently on touch before, because HTML5 drag never fires
  const orderBefore = await page.evaluate(() => [...document.querySelectorAll('[data-list-body="Food"] .gi')].map(e => e.getAttribute('data-item-id')));
  const handle = page.locator('[data-list-body="Food"] .gi').first().locator('.groc-drag');
  const hb = await handle.boundingBox();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) { await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2 + i * 9); await page.waitForTimeout(20); }
  await page.mouse.up();
  await page.waitForTimeout(400);
  const orderAfter = await page.evaluate(() => [...document.querySelectorAll('[data-list-body="Food"] .gi')].map(e => e.getAttribute('data-item-id')));
  ok('dragging actually reorders the list', orderBefore.join(',') !== orderAfter.join(','), 'before=' + orderBefore + ' after=' + orderAfter);
  ok('the new order is sent to the server', reorderSent && reorderSent.order.join(',') === orderAfter.join(','),
     'sent=' + JSON.stringify(reorderSent) + ' dom=' + orderAfter.join(','));
  ok('reordering names the right list', reorderSent && reorderSent.category === 'Food', JSON.stringify(reorderSent));
  // the add-item row must stay pinned to the bottom; a dragged item once landed below it
  const lastRow = await page.evaluate(() => {
    const body = document.querySelector('[data-list-body="Food"]');
    const kids = [...body.children];
    return { last: kids[kids.length - 1].className, addIsLast: kids[kids.length - 1].classList.contains('groc-add') };
  });
  ok('the "+ Add item" row stays last after a drag', lastRow.addIsLast, JSON.stringify(lastRow));
  await page.screenshot({ path: OUT + '/10-lists.png' });

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
