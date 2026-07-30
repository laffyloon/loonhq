// Apps Script harness: mocks just enough of the SpreadsheetApp API to run the real
// LoonHQ_AppScript_*.js against in-memory sheets. Two jobs:
//   1. correctness  - the snooze filter, recurrence math and cleanup tools behave
//   2. cost         - counts API round trips, so a perf regression fails the build
// The server side had no coverage at all until now, which is exactly why the snooze bug
// survived three separate "fixes": every one of them was only ever reasoned about.
const fs = require('fs');

// ---- op counters -----------------------------------------------------------
let ops;
function resetOps() { ops = { openById: 0, getValues: 0, setValues: 0, setValue: 0, cellsRead: 0, cellsWritten: 0, deleteRow: 0, deleteRows: 0, appendRow: 0 }; }
resetOps();

// ---- fake Range ------------------------------------------------------------
function Range(sheet, row, col, nRows, nCols) {
  this.s = sheet; this.r = row; this.c = col; this.nr = nRows; this.nc = nCols;
}
Range.prototype.getValues = function () {
  ops.getValues++; ops.cellsRead += this.nr * this.nc;
  const out = [];
  for (let i = 0; i < this.nr; i++) {
    const row = [];
    for (let j = 0; j < this.nc; j++) {
      const src = this.s.data[this.r - 1 + i];
      row.push(src && src[this.c - 1 + j] !== undefined ? src[this.c - 1 + j] : '');
    }
    out.push(row);
  }
  return out;
};
Range.prototype.setValues = function (vals) {
  ops.setValues++; ops.cellsWritten += this.nr * this.nc;
  for (let i = 0; i < this.nr; i++) {
    if (!this.s.data[this.r - 1 + i]) this.s.data[this.r - 1 + i] = [];
    for (let j = 0; j < this.nc; j++) this.s.data[this.r - 1 + i][this.c - 1 + j] = vals[i][j];
  }
};
Range.prototype.setValue = function (v) {
  ops.setValue++; ops.cellsWritten += 1;
  if (!this.s.data[this.r - 1]) this.s.data[this.r - 1] = [];
  this.s.data[this.r - 1][this.c - 1] = v;
};

// ---- fake Sheet ------------------------------------------------------------
function Sheet(name, data) { this.name = name; this.data = data || []; }
Sheet.prototype.getName = function () { return this.name; };
Sheet.prototype.getLastRow = function () { return this.data.length; };
Sheet.prototype.getLastColumn = function () {
  return this.data.reduce((m, r) => Math.max(m, r.length), 0);
};
Sheet.prototype.getRange = function (r, c, nr, nc) { return new Range(this, r, c, nr || 1, nc || 1); };
Sheet.prototype.getDataRange = function () { return new Range(this, 1, 1, this.getLastRow(), this.getLastColumn()); };
Sheet.prototype.appendRow = function (row) { ops.appendRow++; ops.cellsWritten += row.length; this.data.push(row.slice()); };
Sheet.prototype.deleteRow = function (n) { ops.deleteRow++; this.data.splice(n - 1, 1); };
Sheet.prototype.deleteRows = function (n, howMany) { ops.deleteRows++; this.data.splice(n - 1, howMany); };

// ---- container-reuse simulation --------------------------------------------
// Apps Script reuses its V8 container between requests. A Spreadsheet or Sheet handle held
// in a global from a PREVIOUS execution throws as soon as you touch it. GEN models that:
// newExecution() bumps it, and any handle stamped with an older GEN starts throwing.
let GEN = 1;
function newExecution() { GEN++; }
const STALE = m => new Error('Unexpected error while getting the method or property ' + m + ' on object SpreadsheetApp.Sheet');
function SheetHandle(sheet, gen) { this._s = sheet; this._gen = gen; }
['getName','getLastRow','getLastColumn','getRange','getDataRange','appendRow','deleteRow','deleteRows'].forEach(function (m) {
  SheetHandle.prototype[m] = function () {
    if (this._gen !== GEN) throw STALE(m);
    return this._s[m].apply(this._s, arguments);
  };
});
Object.defineProperty(SheetHandle.prototype, 'data', { get: function () { return this._s.data; } });

// ---- fake Spreadsheet ------------------------------------------------------
function Spreadsheet(sheets, gen) { this.sheets = sheets; this._gen = gen; }
Spreadsheet.prototype.getSheetByName = function (n) {
  if (this._gen !== GEN) throw new Error('Unexpected error while getting the method or property getSheetByName on object SpreadsheetApp.Spreadsheet');
  return this.sheets[n] ? new SheetHandle(this.sheets[n], GEN) : null;
};
Spreadsheet.prototype.insertSheet = function (n) {
  if (this._gen !== GEN) throw new Error('stale Spreadsheet handle');
  this.sheets[n] = new Sheet(n, []); return new SheetHandle(this.sheets[n], GEN);
};

let SHEETS = {};
global.SpreadsheetApp = { openById: function () { ops.openById++; return new Spreadsheet(SHEETS, GEN); } };
global.ContentService = { MimeType: { JSON: 'json' }, createTextOutput: function (t) { return { setMimeType: function () { return t; } }; } };
global.Logger = { _out: [], log: function (m) { this._out.push(String(m)); } };

// ---- load the real script --------------------------------------------------
const srcFile = fs.readdirSync('.').filter(f => /^LoonHQ_AppScript_.*\.js$/.test(f))[0];
if (!srcFile) { console.error('no LoonHQ_AppScript_*.js found'); process.exit(1); }
eval(fs.readFileSync(srcFile, 'utf8'));
console.log('Loaded ' + srcFile + ' OK');

// ---- fixtures --------------------------------------------------------------
const TASK_HDR = HEADERS.tasks.slice();
function taskRow(o) { return TASK_HDR.map(h => (o[h] !== undefined ? o[h] : '')); }
const BASE7 = ['log_id', 'task_id', 'task_name', 'completed_by', 'completed_at', 'scope', 'notes'];

// The layout that caused the live bug: snooze markers written into columns 8 and 9
// while the header row only ever labelled 7.
function unlabelledLogSheet() {
  return new Sheet('task_log', [
    BASE7.concat(['', '']),
    ['l1', 't1', 'Water plants', 'Frankie', '2026-07-20T10:00:00Z', 'household', '', 'snooze', '{"until_date":"2026-07-22"}'],
    ['l2', 't1', 'Water plants', 'Frankie', '2026-07-22T10:00:00Z', 'household', '', 'snooze', '{"until_date":"2026-07-24"}'],
    ['l3', 't1', 'Water plants', 'Meredith', '2026-07-26T18:00:00Z', 'household', '', 'completion', ''],
    ['l4', 't2', 'Take out bins', 'Frankie,Meredith', '2026-07-27T09:00:00Z', 'household', '', 'completion', ''],
  ]);
}
function freshBook(extra) {
  const sheets = {
    tasks: new Sheet('tasks', [TASK_HDR.slice(),
      taskRow({ task_id: 't1', name: 'Water plants', type: 'interval', recurrence_days: 1, sched_freq: 'month', due_date: '2026-01-31', status: 'active', scope: 'household' }),
      taskRow({ task_id: 't2', name: 'Take out bins', type: 'one_off', due_date: '2026-07-27', status: 'active', scope: 'household', owner: 'Frankie,Meredith' }),
    ]),
    projects: new Sheet('projects', [HEADERS.projects.slice()]),
    subtasks: new Sheet('subtasks', [HEADERS.subtasks.slice()]),
    grocery: new Sheet('grocery', [HEADERS.grocery.slice()]),
    task_log: unlabelledLogSheet(),
    assets: new Sheet('assets', [HEADERS.assets.slice()]),
    maintenance_log: new Sheet('maintenance_log', [HEADERS.maintenance_log.slice()]),
  };
  Object.assign(sheets, extra || {});
  SHEETS = sheets;
  // the script caches the spreadsheet and header lookups per execution; reset between tests
  resetExecutionCaches_(); resetOps();
  return sheets;
}
// `book` stays available for the few tests that reach for the spreadsheet directly
Object.defineProperty(global, 'book', { get: function () { return new Spreadsheet(SHEETS, GEN); }, configurable: true });

// ---- runner ----------------------------------------------------------------
const tests = [];
function run(name, fn) { try { fn(); tests.push(['PASS', name]); } catch (e) { tests.push(['FAIL', name + ' :: ' + e.message]); } }

// ---- correctness: the snooze filter ---------------------------------------
run('completionLogs_ drops snooze rows whose markers sit in unlabelled columns', () => {
  freshBook();
  const out = completionLogs_();
  if (out.length !== 2) throw new Error('expected 2 completions, got ' + out.length + ' -> ' + JSON.stringify(out.map(o => o.log_id)));
  if (out[0].log_id !== 'l3' || out[1].log_id !== 'l4') throw new Error('wrong rows survived');
});
run('a task snoozed twice then completed keeps one completion, credited correctly', () => {
  freshBook();
  const forTask = completionLogs_().filter(l => l.task_id === 't1');
  if (forTask.length !== 1) throw new Error('expected 1 completion for t1, got ' + forTask.length);
  if (forTask[0].completed_by !== 'Meredith') throw new Error('credit wrong: ' + forTask[0].completed_by);
});
run('a jointly credited completion survives untouched', () => {
  freshBook();
  const joint = completionLogs_().find(l => l.log_id === 'l4');
  if (!joint) throw new Error('joint completion was filtered out');
  if (joint.completed_by !== 'Frankie,Meredith') throw new Error('joint credit mangled: ' + joint.completed_by);
});
run('getAllData returns only completions in task_log', () => {
  freshBook();
  const d = getAllData();
  if (d.task_log.length !== 2) throw new Error('getAllData leaked snoozes: ' + d.task_log.length + ' rows');
});
run('logRowIsCompletion_ never inspects task_name or notes', () => {
  freshBook();
  const hdr = BASE7.slice();
  if (!logRowIsCompletion_(hdr, ['l9', 't9', 'Snooze the alarm', 'Frankie', 'x', 'household', 'until_date chat']))
    throw new Error('a task named like a marker was swept up');
});

// ---- correctness: snooze writes nothing to the log ------------------------
run('snoozeTask moves the due date and writes NOTHING to task_log', () => {
  const sheets = freshBook();
  const before = sheets.task_log.data.length;
  const r = snoozeTask({ task_id: 't1', until_date: '2026-08-05', snoozed_by: 'Frankie' });
  if (!r.ok) throw new Error('snooze failed: ' + JSON.stringify(r));
  if (sheets.task_log.data.length !== before) throw new Error('snooze appended ' + (sheets.task_log.data.length - before) + ' log row(s)');
  const dueIdx = TASK_HDR.indexOf('due_date');
  if (sheets.tasks.data[1][dueIdx] !== '2026-08-05') throw new Error('due_date not updated: ' + sheets.tasks.data[1][dueIdx]);
});

// ---- correctness: interval recurrence with clamping ----------------------
run('completeTask on a monthly interval clamps Jan 31 to Feb 28', () => {
  const sheets = freshBook();
  completeTask({ task_id: 't1', task_name: 'Water plants', type: 'interval', recurrence_days: 1, sched_freq: 'month', completed_by: 'Frankie', scope: 'household' });
  // completeTask anchors to today, so assert the helper directly for a deterministic date
  const next = computeNextDue({ type: 'interval', recurrence_days: 1, sched_freq: 'month' }, new Date('2026-01-31T12:00:00'));
  if (next !== '2026-02-28') throw new Error('expected 2026-02-28, got ' + next);
  const st = TASK_HDR.indexOf('status');
  if (sheets.tasks.data[1][st] !== 'active') throw new Error('interval task should stay active, got ' + sheets.tasks.data[1][st]);
});
run('interval year unit clamps a leap day', () => {
  freshBook();
  const next = computeNextDue({ type: 'interval', recurrence_days: 1, sched_freq: 'year' }, new Date('2024-02-29T12:00:00'));
  if (next !== '2025-02-28') throw new Error('expected 2025-02-28, got ' + next);
});
run('interval week unit still steps in weeks, and a legacy row still steps in days', () => {
  freshBook();
  if (computeNextDue({ type: 'interval', recurrence_days: 2, sched_freq: 'week' }, new Date('2026-03-01T12:00:00')) !== '2026-03-15') throw new Error('week unit wrong');
  if (computeNextDue({ type: 'interval', recurrence_days: 30 }, new Date('2026-03-01T12:00:00')) !== '2026-03-31') throw new Error('legacy day fallback wrong');
});
run('completeTask writes a completion row credited to whoever the client says', () => {
  const sheets = freshBook();
  completeTask({ task_id: 't2', task_name: 'Take out bins', type: 'one_off', completed_by: 'Frankie,Meredith', scope: 'household' });
  const last = sheets.task_log.data[sheets.task_log.data.length - 1];
  if (last[3] !== 'Frankie,Meredith') throw new Error('joint credit not written: ' + last[3]);
  if (last[HEADERS.task_log.indexOf('log_type')] !== 'completion') throw new Error('log_type not completion');
});
run('batchComplete lets a per-task credit override the batch default', () => {
  const sheets = freshBook();
  batchComplete({ completed_by: 'Frankie', tasks: [{ task_id: 't2', task_name: 'Bins', type: 'one_off', completed_by: 'Frankie,Meredith', scope: 'household' }] });
  const last = sheets.task_log.data[sheets.task_log.data.length - 1];
  if (last[3] !== 'Frankie,Meredith') throw new Error('per-task credit lost: ' + last[3]);
});

// ---- correctness: findRow / updateRow ------------------------------------
run('findRow returns the right sheet row number', () => {
  const sheets = freshBook();
  if (findRow(sheets.tasks, 'task_id', 't1') !== 2) throw new Error('t1 should be row 2');
  if (findRow(sheets.tasks, 'task_id', 't2') !== 3) throw new Error('t2 should be row 3');
  if (findRow(sheets.tasks, 'task_id', 'nope') !== -1) throw new Error('missing id should be -1');
});
run('updateRow changes only the named fields and leaves the rest intact', () => {
  const sheets = freshBook();
  const before = sheets.tasks.data[1].slice();
  updateRow(sheets.tasks, 2, { due_date: '2026-09-09', status: 'done' });
  const after = sheets.tasks.data[1];
  TASK_HDR.forEach((h, i) => {
    if (h === 'due_date' || h === 'status') return;
    if (String(after[i]) !== String(before[i])) throw new Error('collateral change in column ' + h);
  });
  if (after[TASK_HDR.indexOf('due_date')] !== '2026-09-09') throw new Error('due_date not set');
  if (after[TASK_HDR.indexOf('status')] !== 'done') throw new Error('status not set');
});
run('updateRow with no matching field writes nothing', () => {
  const sheets = freshBook();
  resetOps();
  updateRow(sheets.tasks, 2, { not_a_column: 'x' });
  if (ops.setValues !== 0 || ops.setValue !== 0) throw new Error('should not have written');
});

// ---- cost: the item 7 optimisations -------------------------------------
run('COST updateRow issues exactly one write regardless of field count', () => {
  const sheets = freshBook();
  resetOps();
  updateRow(sheets.tasks, 2, { due_date: 'x', status: 'y', notes: 'z', owner: 'Frankie', urgency_window: 'this_week', sched_freq: 'month' });
  const writes = ops.setValues + ops.setValue;
  if (writes !== 1) throw new Error('6 fields cost ' + writes + ' write calls, expected 1');
});
run('COST findRow reads one column, not the whole sheet', () => {
  const sheets = freshBook();
  resetOps();
  findRow(sheets.tasks, 'task_id', 't2');
  const rows = sheets.tasks.data.length - 1, cols = TASK_HDR.length;
  if (ops.cellsRead > rows + cols) throw new Error('read ' + ops.cellsRead + ' cells; a full scan is ' + rows * cols + ', want about ' + rows);
});
run('COST getAllData opens the spreadsheet once', () => {
  freshBook();
  resetOps();
  getAllData();
  if (ops.openById !== 1) throw new Error('opened the spreadsheet ' + ops.openById + ' times');
});
run('COST a snooze costs at most 4 API calls end to end', () => {
  freshBook();
  resetOps();
  snoozeTask({ task_id: 't1', until_date: '2026-08-05' });
  const total = ops.getValues + ops.setValues + ops.setValue + ops.appendRow + ops.deleteRow;
  if (total > 4) throw new Error('snooze cost ' + total + ' API calls: ' + JSON.stringify(ops));
});

// ---- cleanup tools -------------------------------------------------------
run('findSnoozeLogRows_ identifies exactly the bogus rows', () => {
  freshBook();
  const res = findSnoozeLogRows_();
  if (res.total !== 4) throw new Error('total should be 4 data rows, got ' + res.total);
  if (res.rows.length !== 2) throw new Error('expected 2 bogus rows, got ' + res.rows.length);
  if (res.rows.map(r => r.rowNumber).join(',') !== '2,3') throw new Error('wrong rows flagged: ' + res.rows.map(r => r.rowNumber));
});
run('previewSnoozeLogCleanup reports without changing anything', () => {
  const sheets = freshBook();
  const snapshot = JSON.stringify(sheets.task_log.data);
  const r = previewSnoozeLogCleanup();
  if (JSON.stringify(sheets.task_log.data) !== snapshot) throw new Error('preview mutated the sheet');
  if (r.toRemove !== 2 || r.remaining !== 2) throw new Error('bad counts: ' + JSON.stringify(r));
  if (ops.deleteRow !== 0 || ops.appendRow !== 0) throw new Error('preview performed writes');
});
run('previewSnoozeLogCleanup dumps the real header row for diagnosis', () => {
  freshBook();
  Logger._out = [];
  previewSnoozeLogCleanup();
  const dump = Logger._out.join('\n');
  if (!dump.includes('header cells')) throw new Error('header row not reported');
  if (!dump.includes('"snooze"') && !dump.includes('until_date')) throw new Error('sample rows not reported');
});
run('purge archives every bogus row before removing it, and keeps completions', () => {
  const sheets = freshBook();
  const r = purgeSnoozeLogs_CONFIRMED();
  if (r.moved !== 2) throw new Error('expected 2 moved, got ' + r.moved);
  const left = sheets.task_log.data.slice(1).map(x => x[0]);
  if (left.join(',') !== 'l3,l4') throw new Error('wrong rows left behind: ' + left);
  const arch = book.getSheetByName('task_log_archive');
  if (!arch) throw new Error('no archive tab created');
  const archived = arch.data.slice(1).map(x => x[0]);
  if (archived.join(',') !== 'l1,l2') throw new Error('archive contents wrong: ' + archived);
});
run('purge is a no-op when there is nothing bogus', () => {
  const clean = new Sheet('task_log', [
    HEADERS.task_log.slice(),
    ['l3', 't1', 'Water plants', 'Meredith', 'x', 'household', '', '', 'completion'],
  ]);
  freshBook({ task_log: clean });
  const r = purgeSnoozeLogs_CONFIRMED();
  if (r.moved !== 0) throw new Error('should have moved nothing, moved ' + r.moved);
  if (clean.data.length !== 2) throw new Error('clean sheet was modified');
});
run('purge then getAllData leaves only genuine completions', () => {
  freshBook();
  purgeSnoozeLogs_CONFIRMED();
  const d = getAllData();
  if (d.task_log.length !== 2) throw new Error('expected 2 completions after purge, got ' + d.task_log.length);
});

// ---- the REAL sheet layout from Frankie's live task_log -------------------
// header row verbatim from previewSnoozeLogCleanup on 2026-07-30, and rows in the exact
// shapes it printed. Columns 6 and 7 are labelled notes,scope but hold scope,notes.
const REAL_HDR = ['log_id','task_id','task_name','completed_by','completed_at','notes','scope','','','details','log_type'];
function realLogSheet() {
  return new Sheet('task_log', [
    REAL_HDR.slice(),
    ['l-1783970272199-454','t-1783206076526-991','Floor choices','Frankie','2026-07-13T19:17:52.199Z','household','','snooze','{"until_date":"2026-07-16"}','',''],
    ['l-1784069737808-592','t-1783447527334-33','Call USAA','Meredith','2026-07-14T22:55:37.808Z','personal','','edit','','',''],
    ['l-comp-1','t-9','Take out bins','Frankie','2026-07-27T09:00:00Z','household','','','completion'],
    ['l-comp-2','t-4','My private thing','Meredith','2026-07-26T09:00:00Z','personal','','','completion'],
  ]);
}
run('REAL LAYOUT the server filter catches both snooze AND edit rows', () => {
  freshBook({ task_log: realLogSheet() });
  const out = completionLogs_();
  if (out.length !== 2) throw new Error('expected 2 completions, got ' + out.length + ' -> ' + JSON.stringify(out.map(o => o.log_id)));
});
run('REAL LAYOUT an edit row is the one the frontend probe cannot see', () => {
  // both markers land in unlabelled columns, so an object keyed by header collapses them and
  // the LAST one wins. For an edit row that is the empty details cell, so only the server,
  // which reads raw cells, can reject it. This is why deploying is required.
  freshBook({ task_log: realLogSheet() });
  const rows = book.getSheetByName('task_log').data;
  const obj = {}; REAL_HDR.forEach((h, i) => { obj[h] = rows[2][i] === undefined ? '' : rows[2][i]; });
  if (obj[''] !== '') throw new Error("expected the '' overflow to collapse to empty, got " + JSON.stringify(obj['']));
  if (logRowIsCompletion_(REAL_HDR, rows[2])) throw new Error('server filter failed to reject the edit row');
});
run('REAL LAYOUT scope is unreadable before the label fix', () => {
  freshBook({ task_log: realLogSheet() });
  const o = completionLogs_().find(x => x.log_id === 'l-comp-2');
  if (o.scope !== '') throw new Error('expected scope to be blank pre-fix, got ' + JSON.stringify(o.scope));
  if (o.notes !== 'personal') throw new Error('expected the scope value to be stuck in notes, got ' + JSON.stringify(o.notes));
});
run('fixTaskLogHeaderLabels swaps the labels and leaves every data cell alone', () => {
  const sheets = freshBook({ task_log: realLogSheet() });
  const dataBefore = JSON.stringify(sheets.task_log.data.slice(1));
  const r = fixTaskLogHeaderLabels();
  if (!r.ok || !r.changed) throw new Error('did not report a change: ' + JSON.stringify(r));
  const hdr = sheets.task_log.data[0];
  if (hdr[5] !== 'scope' || hdr[6] !== 'notes') throw new Error('labels not swapped: ' + JSON.stringify(hdr));
  if (JSON.stringify(sheets.task_log.data.slice(1)) !== dataBefore) throw new Error('a DATA cell changed');
});
run('after the label fix scope reads correctly for household and personal', () => {
  freshBook({ task_log: realLogSheet() });
  fixTaskLogHeaderLabels();
  const out = completionLogs_();
  const hh = out.find(x => x.log_id === 'l-comp-1'), pers = out.find(x => x.log_id === 'l-comp-2');
  if (hh.scope !== 'household') throw new Error('household scope wrong: ' + JSON.stringify(hh.scope));
  if (pers.scope !== 'personal') throw new Error('personal scope wrong: ' + JSON.stringify(pers.scope));
  if (out.length !== 2) throw new Error('the fix changed which rows survive: ' + out.length);
});
run('fixTaskLogHeaderLabels is idempotent', () => {
  freshBook({ task_log: realLogSheet() });
  fixTaskLogHeaderLabels();
  const second = fixTaskLogHeaderLabels();
  if (second.changed !== false) throw new Error('second run reported a change');
});
run('fixTaskLogHeaderLabels REFUSES an unexpected layout', () => {
  const odd = new Sheet('task_log', [['log_id','task_id','task_name','completed_by','completed_at','scope_x','notes_y'], ['a','b','c','d','e','f','g']]);
  freshBook({ task_log: odd });
  const r = fixTaskLogHeaderLabels();
  if (!r.error) throw new Error('should have refused, returned ' + JSON.stringify(r));
  if (odd.data[0][5] !== 'scope_x') throw new Error('it modified the sheet anyway');
});
run('the label fix does not disturb the completion filter', () => {
  freshBook({ task_log: realLogSheet() });
  const before = completionLogs_().map(o => o.log_id).join(',');
  fixTaskLogHeaderLabels();
  const after = completionLogs_().map(o => o.log_id).join(',');
  if (before !== after) throw new Error('filter changed: ' + before + ' -> ' + after);
});
run('purge still works on the real layout, and keeps both completions', () => {
  const sheets = freshBook({ task_log: realLogSheet() });
  const r = purgeSnoozeLogs_CONFIRMED();
  if (r.moved !== 2) throw new Error('expected 2 bogus rows moved, got ' + r.moved);
  const left = sheets.task_log.data.slice(1).map(x => x[0]).join(',');
  if (left !== 'l-comp-1,l-comp-2') throw new Error('wrong survivors: ' + left);
});

// ---- endpoint plumbing ---------------------------------------------------
run('doGet ping responds ok', () => {
  freshBook();
  const out = JSON.parse(doGet({ parameter: { action: 'ping' } }));
  if (!out.ok) throw new Error('ping did not return ok: ' + JSON.stringify(out));
});
run('doGet reports an unknown action as an error body', () => {
  freshBook();
  const out = JSON.parse(doGet({ parameter: { action: 'nonsense' } }));
  if (!out.error) throw new Error('expected an error body');
});
run('setupHeaders only appends and never removes a header', () => {
  const sheets = freshBook();
  const before = sheets.task_log.data[0].slice();
  setupHeaders();
  const after = sheets.task_log.data[0];
  before.forEach((h, i) => { if (h && String(after[i]) !== String(h)) throw new Error('header ' + h + ' was altered'); });
  if (sheets.task_log.data.length !== 5) throw new Error('setupHeaders touched data rows');
});

// ---- batched deletes: the 20-30 second delete Frankie hit ------------------
function logSheetWith(n, taskId) {
  const rows = [HEADERS.task_log.slice()];
  for (let i = 0; i < n; i++) {
    rows.push(['l' + i, (i % 3 === 0) ? taskId : 'other', 'T' + i, 'Frankie', '2026-07-0' + ((i % 9) + 1) + 'T10:00:00Z', 'household', '', '', 'completion']);
  }
  return new Sheet('task_log', rows);
}
run('deleteTask still removes the task and ALL of its log rows', () => {
  const log = logSheetWith(30, 't2');
  const sheets = freshBook({ task_log: log });
  const before = log.data.length - 1;
  const expected = log.data.slice(1).filter(r => r[1] === 't2').length;
  const r = deleteTask({ task_id: 't2' });
  if (!r.ok) throw new Error('delete failed: ' + JSON.stringify(r));
  const left = log.data.slice(1);
  if (left.some(x => x[1] === 't2')) throw new Error('log rows for the task survived');
  if (left.length !== before - expected) throw new Error('removed ' + (before - left.length) + ', expected ' + expected);
  if (sheets.tasks.data.slice(1).some(x => x[0] === 't2')) throw new Error('the task row itself survived');
});
run('COST deleting a task with 10 log rows costs a handful of calls, not one per row', () => {
  const log = logSheetWith(30, 't2');   // 10 of the 30 belong to t2, deliberately non-contiguous
  freshBook({ task_log: log });
  resetOps();
  deleteTask({ task_id: 't2' });
  const deleteCalls = ops.deleteRow + ops.deleteRows;
  if (deleteCalls > 12) throw new Error('cost ' + deleteCalls + ' delete calls for 10 scattered rows + 1 task row');
  if (ops.deleteRow > 1) throw new Error('should use deleteRows for the cascade, saw ' + ops.deleteRow + ' single deletes');
});
run('COST a contiguous block collapses into ONE deleteRows call', () => {
  const rows = [HEADERS.task_log.slice()];
  for (let i = 0; i < 12; i++) rows.push(['l' + i, i >= 3 && i <= 8 ? 'tX' : 'other', 'T', 'F', 'x', 'household', '', '', 'completion']);
  const log = new Sheet('task_log', rows);
  freshBook({ task_log: log });
  resetOps();
  deleteRowsBatched_(log, matchingRowNumbers_(log, 'task_id', 'tX'));
  if (ops.deleteRows !== 1) throw new Error('6 contiguous rows took ' + ops.deleteRows + ' calls, expected 1');
  if (log.data.slice(1).some(r => r[1] === 'tX')) throw new Error('rows survived');
});
run('COST deleteTask reads one column, not the whole log', () => {
  const log = logSheetWith(200, 't2');
  freshBook({ task_log: log });
  resetOps();
  deleteTask({ task_id: 't2' });
  if (ops.cellsRead > 200 * 3) throw new Error('read ' + ops.cellsRead + ' cells; a full scan of 200x9 is 1800');
});
run('deleteRowsBatched_ handles scattered, unsorted and empty input', () => {
  const mk = () => new Sheet('s', [['id'], ['a'], ['b'], ['c'], ['d'], ['e']]);
  let sh = mk(); deleteRowsBatched_(sh, []);
  if (sh.data.length !== 6) throw new Error('empty input changed the sheet');
  sh = mk(); deleteRowsBatched_(sh, [6, 2, 4]);      // unsorted, scattered
  if (sh.data.slice(1).map(r => r[0]).join(',') !== 'b,d') throw new Error('wrong survivors: ' + sh.data.slice(1).map(r => r[0]));
  sh = mk(); deleteRowsBatched_(sh, [2, 3, 4, 5, 6]);
  if (sh.data.length !== 1) throw new Error('should have left only the header');
});
run('clearChecked removes every got item in blocks', () => {
  const g = new Sheet('grocery', [HEADERS.grocery.slice(),
    ['g1', 'Milk', 'dairy', 'got', 'F', 'x', 1], ['g2', 'Eggs', 'dairy', 'need', 'F', 'x', 2],
    ['g3', 'Bread', 'bakery', 'got', 'F', 'x', 3], ['g4', 'Jam', 'bakery', 'got', 'F', 'x', 4]]);
  freshBook({ grocery: g });
  resetOps();
  const r = clearChecked();
  if (r.removed !== 3) throw new Error('reported ' + r.removed + ' removed, expected 3');
  const left = g.data.slice(1).map(x => x[0]).join(',');
  if (left !== 'g2') throw new Error('wrong survivors: ' + left);
  if (ops.deleteRow > 0) throw new Error('used single-row deletes');
});
run('COST the purge of 101 rows does not cost 101 calls', () => {
  const rows = [HEADERS.task_log.slice()];
  for (let i = 0; i < 150; i++) {
    const bogus = i % 3 === 0;
    rows.push(['l' + i, 't1', 'T', 'Frankie', 'x', 'household', '', bogus ? '{"until_date":"2026-08-01"}' : '', bogus ? 'snooze' : 'completion']);
  }
  const log = new Sheet('task_log', rows);
  freshBook({ task_log: log });
  const expected = rows.slice(1).filter(r => r[8] === 'snooze').length;
  resetOps();
  const r = purgeSnoozeLogs_CONFIRMED();
  if (r.moved !== expected) throw new Error('moved ' + r.moved + ', expected ' + expected);
  // the bogus rows are deliberately scattered, so block-deleting cannot help. The purge
  // rewrites the survivors instead, which is a fixed handful of calls at any row count.
  const calls = ops.deleteRow + ops.deleteRows + ops.setValues + ops.appendRow;
  if (calls > 6) throw new Error(calls + ' API calls to purge ' + expected + ' scattered rows');
  if (log.data.slice(1).some(x => x[8] === 'snooze')) throw new Error('bogus rows survived');
  if (log.data.length - 1 !== 150 - expected) throw new Error('wrong number of completions left');
});

// ---- container reuse: THE v8.11 REGRESSION ---------------------------------
// This is the bug that made task creation fail for Frankie on 2026-07-30. The item-7
// caching stored Spreadsheet/Sheet handles in globals, and nothing cleared them when a new
// request arrived. The first request into a fresh container worked; every request after it
// reused dead handles and returned {error} instantly.
run('REGRESSION addTask works on a REUSED container, not just a fresh one', () => {
  const sheets = freshBook();
  const before = sheets.tasks.data.length;
  let r = doPost({ postData: { contents: JSON.stringify({ action: 'addTask', data: { name: 'first', type: 'one_off', due_date: '2026-08-01' } }) } });
  if (JSON.parse(r).error) throw new Error('first request failed: ' + r);
  newExecution();                       // same container, next request, handles now stale
  r = JSON.parse(doPost({ postData: { contents: JSON.stringify({ action: 'addTask', data: { name: 'second', type: 'one_off', due_date: '2026-08-02' } }) } }));
  if (r.error) throw new Error('SECOND request failed on a reused container: ' + r.error);
  if (sheets.tasks.data.length !== before + 2) throw new Error('expected 2 new rows, got ' + (sheets.tasks.data.length - before));
});
run('REGRESSION five consecutive requests all succeed', () => {
  freshBook();
  for (var i = 0; i < 5; i++) {
    newExecution();
    var out = JSON.parse(doPost({ postData: { contents: JSON.stringify({ action: 'addTask', data: { name: 'task' + i, type: 'one_off', due_date: '2026-08-01' } }) } }));
    if (out.error) throw new Error('request ' + (i + 1) + ' failed: ' + out.error);
  }
});
run('REGRESSION getAllData works on a reused container', () => {
  freshBook();
  doGet({ parameter: { action: 'getAllData' } });
  newExecution();
  const out = JSON.parse(doGet({ parameter: { action: 'getAllData' } }));
  if (out.error) throw new Error('second getAllData failed: ' + out.error);
  if (!out.tasks) throw new Error('no tasks returned');
});
run('REGRESSION a snooze then a complete across two executions both land', () => {
  const sheets = freshBook();
  let out = JSON.parse(doPost({ postData: { contents: JSON.stringify({ action: 'snoozeTask', data: { task_id: 't1', until_date: '2026-08-09' } }) } }));
  if (out.error) throw new Error('snooze failed: ' + out.error);
  newExecution();
  out = JSON.parse(doPost({ postData: { contents: JSON.stringify({ action: 'completeTask', data: { task_id: 't2', task_name: 'Bins', type: 'one_off', completed_by: 'Frankie', scope: 'household' } }) } }));
  if (out.error) throw new Error('complete failed on reused container: ' + out.error);
});
run('REGRESSION the per-execution caching still pays for itself', () => {
  freshBook();
  resetOps();
  doGet({ parameter: { action: 'getAllData' } });
  if (ops.openById !== 1) throw new Error('getAllData opened the spreadsheet ' + ops.openById + ' times in one execution');
});

// ---- report --------------------------------------------------------------
let fails = 0;
for (const [s, n] of tests) { if (s === 'FAIL') { console.log('FAIL  ' + n); fails++; } }
console.log('\n' + tests.length + ' checks run, ' + fails + ' failed, ' + (tests.length - fails) + ' passed');
process.exit(fails ? 1 : 0);
