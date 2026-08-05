// LoonHQ Apps Script v9.2
//
// DEPLOY: paste over everything in script.google.com -> Save -> Deploy ->
//         Manage deployments -> pencil on the EXISTING deployment -> New version.
//         Never create a new deployment: the URL is hardcoded in the frontend.
//
// RUNNING a function from the editor (previewSnoozeLogCleanup, migrateSubtasks) only needs
// Save. A new deployment version is only required to change what doGet/doPost serve.
//
// setupHeaders() CAVEAT: it appends at getLastColumn()+1, and getLastColumn() reflects DATA
// extent, not the header row. If data rows already run past the labelled headers it will
// label columns BEYOND where that data sits, leaving the real values unlabelled. Run
// previewSnoozeLogCleanup() first to see the actual header row. Never deletes data.

var SHEET_ID = '1nOj60hRcDAyYsnrkNBA3XzMeEHl5y_IxWhQ5v28uOhA';

var HEADERS = {
  tasks:   ['task_id','name','type','weekday','day_of_month','recurrence_days','due_date','end_date',
            'urgency_window','reminder_offset','linked_asset_id','owner','scope','status','notes',
            'created_at','sched_month','sched_freq','sched_interval','sched_start',
            'linked_project_id','sched_pattern','done_together'],
  projects:['project_id','name','description','status','target_date','created_at'],
  subtasks:['subtask_id','project_id','name','status','due_date','sort_order'],
  grocery: ['item_id','name','category','status','added_by','checked_at','sort_order'],
  task_log:['log_id','task_id','task_name','completed_by','completed_at','scope','notes','details','log_type'],
  assets:  ['asset_id','name','category','status','notes','install_date','last_service_date',
            'next_service_date','warranty_expiry','icon','icon_bg','icon_color',
            'purchase_price','manual_url','contractors'],
  maintenance_log:['log_id','asset_id','date','note','task_id','log_type'],
  lists:      ['list_id','name','is_permanent','created_at','sort_order'],
};

// Seed data: 12 existing hardcoded assets
var SEED_ASSETS = [
  {asset_id:'a-furnace',name:'Furnace (forced air, gas)',category:'Home systems',status:'amber',
   notes:'Carrier 24ACC636. AHS Gold covered replacement. $100/visit, contract #601933098. Nick @ Tradewinds 720-363-7600.',
   install_date:'2024-01-09',last_service_date:'',next_service_date:'',warranty_expiry:'',
   icon:'ti-flame',icon_bg:'#FEF3C7',icon_color:'#D97706'},
  {asset_id:'a-ac',name:'Air conditioner',category:'Home systems',status:'amber',
   notes:'Goodman GSX13 1.5-ton. Annual service required. Jose @ Fix-It Now 303-657-2421.',
   install_date:'2022-07-19',last_service_date:'2025-05-05',next_service_date:'',warranty_expiry:'',
   icon:'ti-wind',icon_bg:'#DBEAFE',icon_color:'#2563EB'},
  {asset_id:'a-radon',name:'Radon mitigation system',category:'Home systems',status:'green',
   notes:'RadonAway fan. 7-yr transferable warranty exp ~Apr 2029. Chris Fisher @ 5280 Radon 720-695-6677. Re-test every 3-4 years.',
   install_date:'2022-04-05',last_service_date:'',next_service_date:'',warranty_expiry:'2029-04-05',
   icon:'ti-ripple',icon_bg:'#F0FDF4',icon_color:'#16A34A'},
  {asset_id:'a-wh',name:'Water heater',category:'Home systems',status:'red',
   notes:'Gas, 40-gallon. ~10 years old. Approaching end of lifespan. Budget for replacement.',
   install_date:'2015-03-01',last_service_date:'',next_service_date:'',warranty_expiry:'',
   icon:'ti-droplet',icon_bg:'#FEF2F2',icon_color:'#DC2626'},
  {asset_id:'a-solar',name:'Solar + Powerwall 3',category:'Home systems',status:'green',
   notes:'Namaste Solar + Tesla Powerwall 3. Backup reserve at 15%. EVSE included. See Tesla & Namaste docs.',
   install_date:'2024-04-01',last_service_date:'',next_service_date:'',warranty_expiry:'',
   icon:'ti-solar-panel',icon_bg:'#EFF6FF',icon_color:'#3B82F6'},
  {asset_id:'a-dishwasher',name:'Dishwasher',category:'Appliances',status:'green',
   notes:'Bosch SHE3AR76UC/28. FD030501376. Ben Myers.',
   install_date:'2023-07-01',last_service_date:'',next_service_date:'',warranty_expiry:'',
   icon:'ti-wash-machine',icon_bg:'#F5F3FF',icon_color:'#7C3AED'},
  {asset_id:'a-washer',name:'Washer',category:'Appliances',status:'amber',
   notes:'LG top-loader impeller ~2018. No door gasket - clean drum regularly. Soft buildup in main line - scope pending.',
   install_date:'2018-01-01',last_service_date:'',next_service_date:'',warranty_expiry:'',
   icon:'ti-wash',icon_bg:'#F0FDF4',icon_color:'#16A34A'},
  {asset_id:'a-dryer',name:'Dryer',category:'Appliances',status:'red',
   notes:'Whirlpool ~2017. Vent last cleaned Mar 2022. Schedule after basement remodel.',
   install_date:'2017-01-01',last_service_date:'2022-03-01',next_service_date:'',warranty_expiry:'',
   icon:'ti-wind',icon_bg:'#FFF7ED',icon_color:'#EA580C'},
  {asset_id:'a-roof',name:'Roof',category:'Structure & exterior',status:'amber',
   notes:'Comp shingle. ~8 years old. Warranty status unverified.',
   install_date:'2017-05-23',last_service_date:'',next_service_date:'',warranty_expiry:'',
   icon:'ti-home',icon_bg:'#F8FAFC',icon_color:'#475569'},
  {asset_id:'a-fence',name:'Fence, gate + operator',category:'Structure & exterior',status:'green',
   notes:'Denco / Liftmaster LA400. MyQ enabled. 4-yr workmanship through May 2028. Preston Garcia @ Denco 303-223-6902.',
   install_date:'2024-05-16',last_service_date:'',next_service_date:'',warranty_expiry:'2028-05-16',
   icon:'ti-fence',icon_bg:'#FEF9C3',icon_color:'#CA8A04'},
  {asset_id:'a-insulation',name:'Attic insulation',category:'Structure & exterior',status:'green',
   notes:'R-60 blown fiberglass. 25-year warranty. REenergizeCO 303-227-1000.',
   install_date:'2025-04-01',last_service_date:'',next_service_date:'',warranty_expiry:'2050-04-01',
   icon:'ti-layers',icon_bg:'#F0FDF4',icon_color:'#16A34A'},
  {asset_id:'a-garage',name:'Garage door openers',category:'Structure & exterior',status:'green',
   notes:'2x Skylink belt-drive. MyQ compatible. Colorado Overhead Door 303-308-8100.',
   install_date:'2024-01-08',last_service_date:'',next_service_date:'',warranty_expiry:'',
   icon:'ti-building-warehouse',icon_bg:'#F1F5F9',icon_color:'#64748B'},
];

// ── SETUP ──────────────────────────────────────────────────────────────────────
function setupHeaders() {
  var ss = spreadsheet_();
  Object.entries(HEADERS).forEach(function([tabName, cols]) {
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) { sheet = ss.insertSheet(tabName); }
    var existing = sheet.getLastColumn() > 0 ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
    cols.forEach(function(col, i) {
      if (!existing.includes(col)) {
        var nextCol = sheet.getLastColumn() + 1;
        sheet.getRange(1, nextCol).setValue(col);
      }
    });
  });
  resetSheetCache_();   // the header row just changed
}

// ── HELPERS ────────────────────────────────────────────────────────────────────
// An execution is short lived, so opening the spreadsheet once and caching the sheet and
// header lookups is safe and removes a pile of redundant API round trips. getAllData alone
// used to re-open the spreadsheet six times.
var _ss = null, _sheetCache = {}, _headerCache = {};
function spreadsheet_() {
  if (!_ss) _ss = SpreadsheetApp.openById(SHEET_ID);
  return _ss;
}
function getSheet(name) {
  if (!_sheetCache[name]) _sheetCache[name] = spreadsheet_().getSheetByName(name);
  return _sheetCache[name];
}
// Invalidate after anything that changes the header row (setupHeaders) or adds a tab.
function resetSheetCache_() { _sheetCache = {}; _headerCache = {}; }
// MUST run first in every doGet/doPost. Apps Script REUSES its V8 container between
// requests, so these globals survive into the next execution, and a Spreadsheet or Sheet
// handle from a previous execution throws the moment you touch it. That surfaced as an
// instant "Couldn't save task" on every request after the first. The caching is only ever
// valid WITHIN one execution, which is where all the savings were anyway.
function resetExecutionCaches_() { _ss = null; _sheetCache = {}; _headerCache = {}; }
function headersOf_(sheet) {
  var key = sheet.getName();
  if (!_headerCache[key]) {
    var lastCol = sheet.getLastColumn();
    _headerCache[key] = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
  }
  return _headerCache[key];
}

function sheetToObjects(sheet) {
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0].map(String);
  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i] === undefined ? '' : row[i]; });
    return obj;
  });
}

function findRow(sheet, idCol, idVal) {
  var colIdx = headersOf_(sheet).indexOf(idCol);
  if (colIdx < 0) return -1;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  // only the id column, not every column of every row
  var col = sheet.getRange(2, colIdx + 1, lastRow - 1, 1).getValues();
  var target = String(idVal);
  for (var i = 0; i < col.length; i++) {
    if (String(col[i][0]) === target) return i + 2;
  }
  return -1;
}

function updateRow(sheet, rowNum, updates) {
  var headers = headersOf_(sheet);
  if (!headers.length) return;
  // one read plus one write, regardless of how many fields changed. The old version did a
  // separate setValue per field, so a full task edit cost a dozen API round trips.
  var range = sheet.getRange(rowNum, 1, 1, headers.length);
  var row = range.getValues()[0];
  var dirty = false;
  Object.keys(updates).forEach(function(key) {
    var colIdx = headers.indexOf(key);
    if (colIdx >= 0) { row[colIdx] = updates[key]; dirty = true; }
  });
  if (dirty) range.setValues([row]);
}

// Deleting N rows used to cost N API round trips, which is why deleting one task with a
// long history took 20-30 seconds and blew past the client timeout. Collapse the row numbers
// into descending contiguous runs and issue one deleteRows call per run.
function deleteRowsBatched_(sheet, rowNumbers) {
  if (!rowNumbers || !rowNumbers.length) return 0;
  var rows = rowNumbers.slice().sort(function(a, b) { return a - b; });
  var calls = 0, end = rows.length - 1;
  while (end >= 0) {
    var start = end;
    while (start > 0 && rows[start - 1] === rows[start] - 1) start--;
    sheet.deleteRows(rows[start], end - start + 1);   // bottom-up, so earlier rows stay valid
    calls++;
    end = start - 1;
  }
  return calls;
}
// Row numbers (1-based, header excluded) whose column `colName` equals `value`.
// Reads ONLY that column, not the whole sheet.
function matchingRowNumbers_(sheet, colName, value) {
  var idx = headersOf_(sheet).indexOf(colName);
  if (idx < 0) return [];
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var col = sheet.getRange(2, idx + 1, last - 1, 1).getValues();
  var target = String(value), out = [];
  for (var i = 0; i < col.length; i++) if (String(col[i][0]) === target) out.push(i + 2);
  return out;
}
function appendRow(sheet, headers, obj) {
  var row = headers.map(function(h) { return obj[h] !== undefined ? obj[h] : ''; });
  sheet.appendRow(row);
}

function newId(prefix) {
  return prefix + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
}

// ── TASK LOG READING / CLEANUP ─────────────────────────────────────────────────
// Why this reads raw cells instead of using sheetToObjects: v8.5-era snoozeTask appended
// log_type and details into task_log columns that the sheet's header row never labelled
// (setupHeaders was never run for them). sheetToObjects keys cells by header text, so those
// markers collapse under the '' key and l.log_type / l.details come back undefined. Filtering
// on the named fields therefore lets every snooze through as a completion.
// Only the marker columns and unlabelled overflow are inspected, never task_name or notes,
// so a task genuinely called "snooze" is not swept up.
function logRowIsCompletion_(headers, row) {
  for (var i = 0; i < row.length; i++) {
    var h = String(headers[i] === undefined ? '' : headers[i]);
    if (h !== '' && h !== 'log_type' && h !== 'details') continue;
    var v = row[i];
    if (v === null || v === undefined) continue;
    v = String(v);
    if (v === 'snooze' || v === 'edit' || v === 'manual_note') return false;
    if (v.indexOf('until_date') >= 0) return false;
  }
  return true;
}

function completionLogs_() {
  var data = getSheet('task_log').getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0].map(String);
  var out = [];
  for (var r = 1; r < data.length; r++) {
    if (!logRowIsCompletion_(headers, data[r])) continue;
    var o = {};
    for (var c = 0; c < headers.length; c++) o[headers[c]] = data[r][c] === undefined ? '' : data[r][c];
    out.push(o);
  }
  return out;
}

function findSnoozeLogRows_() {
  var data = getSheet('task_log').getDataRange().getValues();
  if (data.length < 2) return { headers: [], rows: [], total: 0 };
  var headers = data[0].map(String);
  var rows = [];
  for (var r = 1; r < data.length; r++) {
    if (!logRowIsCompletion_(headers, data[r])) rows.push({ rowNumber: r + 1, values: data[r] });
  }
  return { headers: headers, rows: rows, total: data.length - 1 };
}

// SAFE: reports only, changes nothing. Run this first and read the log output.
function previewSnoozeLogCleanup() {
  var res = findSnoozeLogRows_();
  var sheet = getSheet('task_log');
  Logger.log('--- task_log header row as it actually is ---');
  Logger.log('  columns with data: ' + sheet.getLastColumn());
  Logger.log('  header cells: ' + JSON.stringify(res.headers));
  Logger.log('  (an empty string means that column has data but no header, which is the bug)');
  Logger.log('');
  Logger.log('task_log rows (excluding header): ' + res.total);
  Logger.log('Non-completion rows found (snooze/edit): ' + res.rows.length);
  Logger.log('Genuine completions that will remain: ' + (res.total - res.rows.length));
  var byPerson = {};
  res.rows.forEach(function(r) {
    var who = String(r.values[3] || '(blank)');
    byPerson[who] = (byPerson[who] || 0) + 1;
  });
  Logger.log('Bogus rows by completed_by: ' + JSON.stringify(byPerson));
  res.rows.slice(0, 10).forEach(function(r) {
    Logger.log('  row ' + r.rowNumber + ': ' + JSON.stringify(r.values));
  });
  if (res.rows.length > 10) Logger.log('  ... and ' + (res.rows.length - 10) + ' more');
  return { total: res.total, toRemove: res.rows.length, remaining: res.total - res.rows.length, byPerson: byPerson };
}

// DESTRUCTIVE. Only run after reviewing previewSnoozeLogCleanup().
// Rows are COPIED to a task_log_archive tab before being removed, so this is reversible.
function purgeSnoozeLogs_CONFIRMED() {
  var res = findSnoozeLogRows_();
  if (!res.rows.length) { Logger.log('Nothing to clean up.'); return { ok: true, moved: 0 }; }
  var src = getSheet('task_log');
  var data = src.getDataRange().getValues();
  var width = data[0].length;
  var header = data[0];
  var keep = [], drop = [];
  for (var r = 1; r < data.length; r++) {
    (logRowIsCompletion_(header, data[r]) ? keep : drop).push(data[r]);
  }
  if (!drop.length) { Logger.log('Nothing to clean up.'); return { ok: true, moved: 0 }; }

  // Archive first, in ONE write. The rows are scattered through the sheet, so deleting them
  // individually would cost one API call each; rewriting the survivors costs a handful total.
  var ss = spreadsheet_();
  var archive = ss.getSheetByName('task_log_archive');
  if (!archive) { archive = ss.insertSheet('task_log_archive'); archive.appendRow(header); }
  var padded = drop.map(function(row) {
    var out = row.slice(0, width);
    while (out.length < width) out.push('');
    return out;
  });
  archive.getRange(archive.getLastRow() + 1, 1, padded.length, width).setValues(padded);

  // Then rewrite task_log as header + survivors, and drop the now-stale tail.
  if (keep.length) src.getRange(2, 1, keep.length, width).setValues(keep);
  var firstStale = 2 + keep.length;
  var staleCount = (data.length - 1) - keep.length;
  if (staleCount > 0) src.deleteRows(firstStale, staleCount);
  resetSheetCache_();

  Logger.log('Archived and removed ' + drop.length + ' non-completion rows.');
  Logger.log(keep.length + ' completions remain.');
  Logger.log('The removed rows are recoverable from the task_log_archive tab.');
  return { ok: true, moved: drop.length, remaining: keep.length, archivedTo: 'task_log_archive' };
}

// ── doGet / doPost ─────────────────────────────────────────────────────────────
function doGet(e) {
  resetExecutionCaches_();   // never reuse handles from a previous execution
  var action = e.parameter.action;
  var result;
  try {
    if (action === 'getAllData') result = getAllData();
    else if (action === 'getSubtasks') result = sheetToObjects(getSheet('subtasks'));
    else if (action === 'ping') result = { ok: true };
    else result = { error: 'Unknown action: ' + action };
  } catch(err) {
    result = { error: err.message };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  resetExecutionCaches_();   // never reuse handles from a previous execution
  var body = JSON.parse(e.postData.contents);
  var action = body.action;
  var data = body.data || {};
  var result;
  try {
    if (action === 'addTask') result = addTask(data);
    else if (action === 'updateTask') result = updateTask(data);
    else if (action === 'deleteTask') result = deleteTask(data);
    else if (action === 'completeTask') result = completeTask(data);
    else if (action === 'batchComplete') result = batchComplete(data);
    else if (action === 'batchDelete') result = batchDelete(data);
    else if (action === 'batchUncomplete') result = batchUncomplete(data);
    else if (action === 'snoozeTask') result = snoozeTask(data);
    else if (action === 'addProject') result = addProject(data);
    else if (action === 'updateProject') result = updateProject(data);
    else if (action === 'deleteProject') result = deleteProject(data);
    else if (action === 'addSubtask') result = addSubtask(data);
    else if (action === 'updateSubtask') result = updateSubtask(data);
    else if (action === 'deleteSubtask') result = deleteSubtask(data);
    else if (action === 'addGroceryItem') result = addGroceryItem(data);
    else if (action === 'updateGrocery') result = updateGrocery(data);
    else if (action === 'deleteGrocery') result = deleteGrocery(data);
    else if (action === 'clearChecked') result = clearChecked();
    else if (action === 'addList') result = addList(data);
    else if (action === 'deleteList') result = deleteList(data);
    else if (action === 'reorderGrocery') result = reorderGrocery(data);
    else if (action === 'addAsset') result = addAsset(data);
    else if (action === 'updateAsset') result = updateAsset(data);
    else if (action === 'deleteAsset') result = deleteAsset(data);
    else if (action === 'addMaintenanceNote') result = addMaintenanceNote(data);
    else if (action === 'uncompleteTask') result = uncompleteTask(data);
    else if (action === 'reassignCompletion') result = reassignCompletion(data);
    else if (action === 'deleteTaskLog') result = deleteTaskLog(data);
    else result = { error: 'Unknown action: ' + action };
  } catch(err) {
    result = { error: err.message };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

// ── getAllData ─────────────────────────────────────────────────────────────────
function getAllData() {
  var tasks    = sheetToObjects(getSheet('tasks')).filter(function(t) { return t.status !== 'deleted'; });
  var projects = sheetToObjects(getSheet('projects')).filter(function(p) { return p.status !== 'deleted'; });
  var subtasks = sheetToObjects(getSheet('subtasks'));
  var grocery  = sheetToObjects(getSheet('grocery')).filter(function(g) { return g.status !== 'deleted'; });
  var lists    = sheetToObjects(getSheet('lists'));
  var task_log = completionLogs_();

  // Seed assets on first load
  var assetSheet = getSheet('assets');
  var assets = sheetToObjects(assetSheet);
  if (!assets.length) {
    var assetHeaders = HEADERS.assets;
    SEED_ASSETS.forEach(function(a) { appendRow(assetSheet, assetHeaders, a); });
    assets = SEED_ASSETS;
  }

  var maintenance_logs = sheetToObjects(getSheet('maintenance_log'));

  return { tasks: tasks, projects: projects, subtasks: subtasks, grocery: grocery,
           lists: lists, task_log: task_log, assets: assets, maintenance_logs: maintenance_logs };
}

// ── RECURRENCE HELPERS ────────────────────────────────────────────────────────
function schedFreqOf(task) {
  if (task.sched_freq) return String(task.sched_freq);
  if (task.weekday !== '' && task.weekday !== null && String(task.weekday).trim() !== '') return 'week';
  var sm = task.sched_month;
  if (sm !== '' && sm !== null && String(sm).trim() !== '' && String(sm) !== '0') return 'year';
  if (task.day_of_month !== '' && task.day_of_month !== null && String(task.day_of_month).trim() !== '') return 'month';
  return 'day';
}

function stripDate(d) { return d ? String(d).split('T')[0] : ''; }

function monthStep(baseY, baseM, add, dom) {
  var m = baseM + add;
  var ty = baseY + Math.floor(m / 12);
  var tm = ((m % 12) + 12) % 12;
  var last = new Date(ty, tm + 1, 0).getDate();
  var day = String(dom) === 'last' ? last : Math.min(parseInt(dom) || 1, last);
  return new Date(ty, tm, day);
}

function computeNextDue(task, fromDate) {
  var from = new Date(fromDate); from.setHours(0, 0, 0, 0);
  if (task.end_date) { var e = new Date(stripDate(task.end_date) + 'T12:00:00'); e.setHours(0,0,0,0); if (from > e) return null; }
  var next = null;
  if (task.type === 'interval') {
    var n = parseInt(task.recurrence_days) || 0; if (!n) return null;
    var unit = task.sched_freq || 'day';
    // month/year must clamp to the last valid day, not overflow: Jan 31 + 1mo is Feb 28, not Mar 3.
    if (unit === 'month') { next = monthStep(from.getFullYear(), from.getMonth(), n, from.getDate()); }
    else if (unit === 'year') { next = monthStep(from.getFullYear(), from.getMonth(), n * 12, from.getDate()); }
    else { next = new Date(from); next.setDate(next.getDate() + (unit === 'week' ? n * 7 : n)); }
  } else if (task.type === 'scheduled') {
    var freq = schedFreqOf(task);
    var X = Math.max(1, parseInt(task.sched_interval) || 1);
    var base = task.due_date ? new Date(stripDate(task.due_date) + 'T12:00:00') : null;
    if (!base) return null;
    base.setHours(0, 0, 0, 0); next = new Date(base);
    if (freq === 'day') { next.setDate(next.getDate() + X); while (next <= from) next.setDate(next.getDate() + X); }
    else if (freq === 'week') { next.setDate(next.getDate() + 7*X); while (next <= from) next.setDate(next.getDate() + 7*X); }
    else if (freq === 'month') { var k=X; next=monthStep(base.getFullYear(),base.getMonth(),k,task.day_of_month); while(next<=from){k+=X;next=monthStep(base.getFullYear(),base.getMonth(),k,task.day_of_month);} }
    else if (freq === 'year') { var ky=X; var bd=base.getDate(); var ystep=function(kk){var ty=base.getFullYear()+kk;var ld=new Date(ty,base.getMonth()+1,0).getDate();return new Date(ty,base.getMonth(),Math.min(bd,ld));}; next=ystep(ky); while(next<=from){ky+=X;next=ystep(ky);} }
  }
  if (!next) return null;
  if (task.end_date) { var e2=new Date(stripDate(task.end_date)+'T12:00:00');e2.setHours(0,0,0,0);if(next>e2)return null; }
  return next.toISOString().split('T')[0];
}

function computeFirstDue(task) {
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var start = task.sched_start ? new Date(stripDate(task.sched_start) + 'T12:00:00') : null;
  if (start) start.setHours(0, 0, 0, 0);
  var t = (start && start >= today) ? new Date(start) : new Date(today);
  if (task.type === 'interval') {
    var days = parseInt(task.recurrence_days) || 0; if (!days) return null;
    return t.toISOString().split('T')[0];
  }
  if (task.type !== 'scheduled') return task.due_date || null;
  var freq = schedFreqOf(task);
  var next;
  if (freq === 'week') {
    var wd = parseInt(task.weekday) || 0;
    next = new Date(t); next.setDate(next.getDate() + ((wd - t.getDay() + 7) % 7 || 7));
  } else if (freq === 'month') {
    next = monthStep(t.getFullYear(), t.getMonth(), 0, task.day_of_month);
    if (next < t) next = monthStep(t.getFullYear(), t.getMonth(), 1, task.day_of_month);
  } else if (freq === 'year') {
    var ym = (parseInt(task.sched_month) || 1) - 1;
    var ld = new Date(t.getFullYear(), ym + 1, 0).getDate();
    next = new Date(t.getFullYear(), ym, Math.min(parseInt(task.day_of_month) || 1, ld));
    if (next < t) next = new Date(t.getFullYear() + 1, ym, parseInt(task.day_of_month) || 1);
  } else {
    next = new Date(t);
  }
  if (!next) return null;
  if (task.end_date) { var e = new Date(stripDate(task.end_date) + 'T12:00:00'); if (next > e) return null; }
  return next.toISOString().split('T')[0];
}

// ── TASKS ─────────────────────────────────────────────────────────────────────
function addTask(data) {
  var sheet = getSheet('tasks');
  var id = newId('t');
  var row = Object.assign({ task_id: id, status: 'active', created_at: new Date().toISOString() }, data);
  if (!row.due_date && (row.type === 'interval' || row.type === 'scheduled')) {
    var fd = computeFirstDue(row);
    if (fd) row.due_date = fd;
  }
  appendRow(sheet, HEADERS.tasks, row);
  return { ok: true, task_id: id };
}

function updateTask(data) {
  var sheet = getSheet('tasks');
  var rowNum = findRow(sheet, 'task_id', data.task_id);
  if (rowNum < 0) return { error: 'Task not found' };
  updateRow(sheet, rowNum, data.updates);
  // Log the edit event
  appendRow(getSheet('task_log'), HEADERS.task_log, {
    log_id: newId('l'), task_id: data.task_id,
    task_name: data.updates.name || data.task_id,
    completed_by: data.updated_by || '',
    completed_at: new Date().toISOString(),
    scope: data.updates.scope || 'household',
    notes: '', log_type: 'edit', details: ''
  });
  return { ok: true };
}

function deleteTask(data) {
  var sheet = getSheet('tasks');
  var rowNum = findRow(sheet, 'task_id', data.task_id);
  if (rowNum < 0) return { error: 'Task not found' };
  sheet.deleteRow(rowNum);
  // Cascade: drop this task's log rows. Reads one column and deletes in blocks.
  var logSheet = getSheet('task_log');
  deleteRowsBatched_(logSheet, matchingRowNumbers_(logSheet, 'task_id', data.task_id));
  return { ok: true };
}

// True when this task already has a completion logged within the last `withinMs`.
// Section 11A: catches a timeout-retry writing the same completion twice. It reads the
// contiguous span from task_id to completed_at in ONE call, which is 4 of the 9+ columns,
// rather than getDataRange over the whole log.
function recentCompletionExists_(logSheet, taskId, withinMs) {
  var headers = headersOf_(logSheet);
  var iTask = headers.indexOf('task_id'), iAt = headers.indexOf('completed_at');
  if (iTask < 0 || iAt < 0) return false;
  var last = logSheet.getLastRow();
  if (last < 2) return false;
  var lo = Math.min(iTask, iAt), hi = Math.max(iTask, iAt);
  var vals = logSheet.getRange(2, lo + 1, last - 1, hi - lo + 1).getValues();
  var tOff = iTask - lo, aOff = iAt - lo, target = String(taskId), now = Date.now();
  for (var i = vals.length - 1; i >= 0; i--) {
    if (String(vals[i][tOff]) !== target) continue;
    var raw = vals[i][aOff];
    var d = raw instanceof Date ? raw : new Date(String(raw));
    if (isNaN(d.getTime())) continue;
    if ((now - d.getTime()) <= withinMs) return true;
  }
  return false;
}
function completeTask(data) {
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var logSheet = getSheet('task_log');
  var taskSheet0 = getSheet('tasks');
  var rowNum0 = findRow(taskSheet0, 'task_id', data.task_id);

  // Section 11B: if the task is already finished, a second completion is a duplicate.
  // Recurring tasks stay 'active' after completing, so this only trips on real repeats.
  if (rowNum0 >= 0) {
    var th = headersOf_(taskSheet0);
    var sIdx = th.indexOf('status');
    if (sIdx >= 0) {
      var st = String(taskSheet0.getRange(rowNum0, sIdx + 1).getValues()[0][0] || '');
      if (st === 'done' || st === 'ended') return { ok: true, skipped: 'already_' + st };
    }
  }
  // Section 11A: same completion inside 60 seconds means a retry, not a second event.
  if (recentCompletionExists_(logSheet, data.task_id, 60000)) {
    return { ok: true, skipped: 'duplicate_within_60s' };
  }
  var newLogId = newId('l');
  var logEntry = {
    log_id: newLogId, task_id: data.task_id, task_name: data.task_name,
    completed_by: data.completed_by, completed_at: new Date().toISOString(),
    scope: data.scope || 'household', notes: data.notes || '',
    log_type: 'completion', details: ''
  };
  appendRow(logSheet, HEADERS.task_log, logEntry);

  var taskSheet = taskSheet0;
  var rowNum = rowNum0;
  if (rowNum < 0) return { ok: true, log_id: newLogId };

  if (data.type === 'scheduled' || data.type === 'interval') {
    var nextDue = computeNextDue(data, today);
    if (nextDue) {
      updateRow(taskSheet, rowNum, { due_date: nextDue, status: 'active' });
    } else {
      updateRow(taskSheet, rowNum, { status: 'ended' });
    }
  } else {
    updateRow(taskSheet, rowNum, { status: 'done' });
  }
  return { ok: true, log_id: newLogId };
}

// One request instead of one per task. Both the task rows and every matching log row are
// removed in blocks, so deleting 20 tasks costs a handful of API calls, not hundreds.
function batchDelete(data) {
  var ids = (data.task_ids || []).map(String);
  if (!ids.length) return { ok: true, deleted: 0 };
  var wanted = {};
  ids.forEach(function(id) { wanted[id] = true; });

  var taskSheet = getSheet('tasks');
  var tIdx = headersOf_(taskSheet).indexOf('task_id');
  var deleted = 0;
  if (tIdx >= 0) {
    var lastT = taskSheet.getLastRow();
    if (lastT >= 2) {
      var tCol = taskSheet.getRange(2, tIdx + 1, lastT - 1, 1).getValues();
      var tRows = [];
      for (var i = 0; i < tCol.length; i++) if (wanted[String(tCol[i][0])]) tRows.push(i + 2);
      deleted = tRows.length;
      deleteRowsBatched_(taskSheet, tRows);
    }
  }

  var logSheet = getSheet('task_log');
  var lIdx = headersOf_(logSheet).indexOf('task_id');
  if (lIdx >= 0) {
    var lastL = logSheet.getLastRow();
    if (lastL >= 2) {
      var lCol = logSheet.getRange(2, lIdx + 1, lastL - 1, 1).getValues();
      var lRows = [];
      for (var j = 0; j < lCol.length; j++) if (wanted[String(lCol[j][0])]) lRows.push(j + 2);
      deleteRowsBatched_(logSheet, lRows);
    }
  }
  return { ok: true, deleted: deleted };
}
function batchComplete(data) {
  var ids = [];
  (data.tasks || []).forEach(function(t) {
    var r = completeTask(Object.assign({ completed_by: data.completed_by }, t));
    ids.push((r && r.log_id) || '');
  });
  return { ok: true, log_ids: ids };
}

function snoozeTask(data) {
  var sheet = getSheet('tasks');
  var rowNum = findRow(sheet, 'task_id', data.task_id);
  if (rowNum < 0) return { error: 'Task not found' };
  var newDue = data.until_date;
  updateRow(sheet, rowNum, { due_date: newDue, status: 'active' });
  return { ok: true };
}

// ── PROJECTS / SUBTASKS ───────────────────────────────────────────────────────
function addProject(data) {
  var sheet = getSheet('projects');
  var id = newId('p');
  appendRow(sheet, HEADERS.projects, Object.assign({ project_id: id, created_at: new Date().toISOString() }, data));
  return { ok: true, project_id: id };
}

function updateProject(data) {
  var sheet = getSheet('projects');
  var rowNum = findRow(sheet, 'project_id', data.project_id);
  if (rowNum < 0) return { error: 'Project not found' };
  updateRow(sheet, rowNum, data.updates);
  return { ok: true };
}

function deleteProject(data) {
  var sheet = getSheet('projects');
  var rowNum = findRow(sheet, 'project_id', data.project_id);
  if (rowNum >= 0) sheet.deleteRow(rowNum);
  return { ok: true };
}

function addSubtask(data) {
  var sheet = getSheet('subtasks');
  var id = newId('s');
  appendRow(sheet, HEADERS.subtasks, Object.assign({ subtask_id: id, status: 'todo', sort_order: Date.now() }, data));
  return { ok: true, subtask_id: id };
}

function updateSubtask(data) {
  var sheet = getSheet('subtasks');
  var rowNum = findRow(sheet, 'subtask_id', data.subtask_id);
  if (rowNum < 0) return { error: 'Subtask not found' };
  updateRow(sheet, rowNum, data.updates);
  return { ok: true };
}

function deleteSubtask(data) {
  var sheet = getSheet('subtasks');
  var rowNum = findRow(sheet, 'subtask_id', data.subtask_id);
  if (rowNum >= 0) sheet.deleteRow(rowNum);
  return { ok: true };
}

// ── GROCERY ───────────────────────────────────────────────────────────────────
// Custom lists (v9.2). The three permanent lists (Food, Costco, Household) are hardcoded
// in the frontend and are NOT stored here; this tab holds only user-created lists. Grocery
// items point at a list by NAME via their existing `category` column, which is why adding
// this needed no migration of existing items.
function addList(data) {
  var name = String(data.name || '').trim();
  if (!name) return { error: 'List name required' };
  var sheet = getSheet('lists');
  if (!sheet) return { error: 'lists tab missing; run setupHeaders()' };
  var existing = sheetToObjects(sheet);
  for (var i = 0; i < existing.length; i++) {
    if (String(existing[i].name).toLowerCase() === name.toLowerCase()) {
      return { ok: true, duplicate: true };     // idempotent, so a retry cannot double-add
    }
  }
  var id = newId('list');
  appendRow(sheet, HEADERS.lists, {
    list_id: id, name: name, is_permanent: '',
    created_at: new Date().toISOString(),
    sort_order: data.sort_order || (existing.length + 1)
  });
  return { ok: true, list_id: id };
}
// Removes the list and every grocery item that belonged to it, in blocks.
function deleteList(data) {
  var name = String(data.name || '');
  if (!name) return { error: 'List name required' };
  var sheet = getSheet('lists');
  if (sheet) deleteRowsBatched_(sheet, matchingRowNumbers_(sheet, 'name', name));
  var groc = getSheet('grocery');
  if (groc) deleteRowsBatched_(groc, matchingRowNumbers_(groc, 'category', name));
  return { ok: true };
}
function addGroceryItem(data) {
  var sheet = getSheet('grocery');
  var id = newId('g');
  appendRow(sheet, HEADERS.grocery, { item_id: id, name: data.name, category: data.category || 'Food', status: 'need', added_by: data.added_by || '', checked_at: '' });
  return { ok: true, item_id: id };
}

function updateGrocery(data) {
  var sheet = getSheet('grocery');
  var rowNum = findRow(sheet, 'item_id', data.item_id);
  if (rowNum < 0) return { error: 'Item not found' };
  var updates = Object.assign({}, data.updates);
  if (updates.status === 'got') updates.checked_at = new Date().toISOString();
  updateRow(sheet, rowNum, updates);
  return { ok: true };
}

function deleteGrocery(data) {
  var sheet = getSheet('grocery');
  var rowNum = findRow(sheet, 'item_id', data.item_id);
  if (rowNum >= 0) sheet.deleteRow(rowNum);
  return { ok: true };
}

function clearChecked() {
  var sheet = getSheet('grocery');
  var rows = matchingRowNumbers_(sheet, 'status', 'got');
  deleteRowsBatched_(sheet, rows);
  return { ok: true, removed: rows.length };
}

function reorderGrocery(data) {
  var sheet = getSheet('grocery');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  var sortIdx = headers.indexOf('sort_order');
  if (sortIdx < 0) return { error: 'sort_order column not found' };
  var order = data.order || [];
  order.forEach(function(itemId, i) {
    var rowNum = findRow(sheet, 'item_id', itemId);
    if (rowNum >= 0) sheet.getRange(rowNum, sortIdx + 1).setValue(i + 1);
  });
  return { ok: true };
}

// ── ASSETS ────────────────────────────────────────────────────────────────────
function addAsset(data) {
  var sheet = getSheet('assets');
  var id = newId('asset');
  var defaults = { purchase_price: '', manual_url: '', contractors: '[]' };
  appendRow(sheet, HEADERS.assets, Object.assign({ asset_id: id }, defaults, data));
  return { ok: true, asset_id: id };
}

function updateAsset(data) {
  var sheet = getSheet('assets');
  var rowNum = findRow(sheet, 'asset_id', data.asset_id);
  if (rowNum < 0) return { error: 'Asset not found' };
  updateRow(sheet, rowNum, data.updates);
  return { ok: true };
}

function deleteAsset(data) {
  var sheet = getSheet('assets');
  var rowNum = findRow(sheet, 'asset_id', data.asset_id);
  if (rowNum >= 0) sheet.deleteRow(rowNum);
  return { ok: true };
}

function addMaintenanceNote(data) {
  var sheet = getSheet('maintenance_log');
  var id = newId('ml');
  appendRow(sheet, HEADERS.maintenance_log, {
    log_id: id, asset_id: data.asset_id,
    date: data.date || new Date().toISOString().split('T')[0],
    note: data.note, task_id: data.task_id || '',
    log_type: data.log_type || 'manual_note'
  });
  return { ok: true, log_id: id };
}

function getMaintenanceLogs(asset_id) {
  return sheetToObjects(getSheet('maintenance_log')).filter(function(l) { return l.asset_id === asset_id; });
}

// ── ACTIVITY EDIT ACTIONS ─────────────────────────────────────────────────────
// Undo a whole flush in ONE request. Undoing ten tasks used to be ten round trips to a
// backend that serialises them, which is the same shape as the 20-30s delete problem.
function batchUncomplete(data) {
  var items = data.items || [];
  if (!items.length) return { ok: true, restored: 0 };
  var logSheet = getSheet('task_log');
  // remove every log row in blocks rather than one call per row
  var ids = {};
  items.forEach(function(it) { if (it.log_id) ids[String(it.log_id)] = true; });
  var lIdx = headersOf_(logSheet).indexOf('log_id');
  if (lIdx >= 0) {
    var lastL = logSheet.getLastRow();
    if (lastL >= 2) {
      var col = logSheet.getRange(2, lIdx + 1, lastL - 1, 1).getValues();
      var rows = [];
      for (var i = 0; i < col.length; i++) if (ids[String(col[i][0])]) rows.push(i + 2);
      deleteRowsBatched_(logSheet, rows);
    }
  }
  // then restore each task; this part is per-task because each needs its own recurrence math
  var restored = 0;
  items.forEach(function(it) { if (it.task_id) { restoreTask_(it.task_id); restored++; } });
  return { ok: true, restored: restored };
}
// Shared by uncompleteTask and batchUncomplete: put a task back to active with a sane due date.
function restoreTask_(taskId) {
  var taskSheet = getSheet('tasks');
  var taskRow = findRow(taskSheet, 'task_id', taskId);
  if (taskRow < 0) return false;
  var today = todayIso_();
  var headers = headersOf_(taskSheet);
  var rowVals = taskSheet.getRange(taskRow, 1, 1, headers.length).getValues()[0];
  var taskObj = {};
  headers.forEach(function(h, i) { taskObj[h] = rowVals[i]; });
  var newDue = (taskObj.type === 'scheduled' || taskObj.type === 'interval')
    ? (computeNextDue(taskObj, new Date()) || today)
    : (stripDate(taskObj.due_date) || today);
  updateRow(taskSheet, taskRow, { status: 'active', due_date: newDue });
  return true;
}
function todayIso_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function uncompleteTask(data) {
  var logSheet = getSheet('task_log');
  var logRow = findRow(logSheet, 'log_id', data.log_id);
  if (logRow >= 0) logSheet.deleteRow(logRow);

  var taskSheet = getSheet('tasks');
  var taskRow = findRow(taskSheet, 'task_id', data.task_id);
  if (taskRow >= 0) {
    var today = new Date().toISOString().split('T')[0];
    // For recurring tasks recompute due; for one-off restore active status
    var headers = taskSheet.getRange(1, 1, 1, taskSheet.getLastColumn()).getValues()[0].map(String);
    var taskObj = {};
    var rowVals = taskSheet.getRange(taskRow, 1, 1, taskSheet.getLastColumn()).getValues()[0];
    headers.forEach(function(h, i) { taskObj[h] = rowVals[i]; });
    var newDue = (taskObj.type === 'scheduled' || taskObj.type === 'interval') ? (computeNextDue(taskObj, new Date()) || today) : (stripDate(taskObj.due_date) || today);
    updateRow(taskSheet, taskRow, { status: 'active', due_date: newDue });
  }
  return { ok: true };
}

function deleteTaskLog(data) {
  var sheet = getSheet('task_log');
  var rowNum = findRow(sheet, 'log_id', data.log_id);
  if (rowNum < 0) return { error: 'Log entry not found' };
  sheet.deleteRow(rowNum);
  return { ok: true };
}

function reassignCompletion(data) {
  var logSheet = getSheet('task_log');
  var logRow = findRow(logSheet, 'log_id', data.log_id);
  if (logRow < 0) return { error: 'Log entry not found' };

  var logUpdates = {};
  if (data.completed_by) logUpdates.completed_by = data.completed_by;
  if (data.scope) logUpdates.scope = data.scope;
  if (Object.keys(logUpdates).length) updateRow(logSheet, logRow, logUpdates);

  // Reclassify the task itself if scope changed
  if (data.scope && data.task_id) {
    var taskSheet = getSheet('tasks');
    var taskRow = findRow(taskSheet, 'task_id', data.task_id);
    if (taskRow >= 0) {
      var taskUpdates = { scope: data.scope };
      // When moving to personal, assign to whoever completed it
      if (data.scope === 'personal' && data.completed_by) taskUpdates.owner = data.completed_by;
      updateRow(taskSheet, taskRow, taskUpdates);
    }
  }

  return { ok: true };
}

// The task_log header row labels column 6 'notes' and column 7 'scope', but appendRow has
// ALWAYS written scope into 6 and notes into 7 (HEADERS.task_log has had scope first since
// v8.1). So the two labels are simply swapped relative to every row ever written, which makes
// sheetToObjects hand back scope:'' for every log row. Effect in the app: Personal History is
// empty and personal completions are counted as household.
//
// This swaps the two LABELS only. It does not touch a single data cell. It is guarded, so it
// refuses to run unless the sheet is in the exact known-bad state, and it is a no-op once
// fixed. Run it from the editor, then reload the app.
function fixTaskLogHeaderLabels() {
  var sheet = getSheet('task_log');
  if (!sheet) { Logger.log('no task_log tab'); return { error: 'no task_log tab' }; }
  var lastCol = sheet.getLastColumn();
  var row = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  Logger.log('before: ' + JSON.stringify(row));
  if (row[5] === 'scope' && row[6] === 'notes') {
    Logger.log('already correct, nothing to do');
    return { ok: true, changed: false };
  }
  if (row[5] !== 'notes' || row[6] !== 'scope') {
    Logger.log('UNEXPECTED layout at columns 6 and 7, refusing to touch it.');
    Logger.log('  column 6 = ' + JSON.stringify(row[5]) + ', column 7 = ' + JSON.stringify(row[6]));
    return { error: 'unexpected header layout', col6: row[5], col7: row[6] };
  }
  sheet.getRange(1, 6).setValue('scope');
  sheet.getRange(1, 7).setValue('notes');
  resetSheetCache_();
  var after = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  Logger.log('after:  ' + JSON.stringify(after));
  Logger.log('swapped the two labels. No data cells were touched.');
  return { ok: true, changed: true };
}

// The household timezone. completed_at is stored as a UTC timestamp, so anything that asks
// "was this the same DAY" must convert first. Grouping by the UTC date is wrong in both
// directions here: a nightly task done at 10pm Denver and again the next afternoon shares one
// UTC date and looks duplicated, while two completions on the same Denver evening can straddle
// UTC midnight and NOT look duplicated. Same class of bug as the due-date one fixed in v8.12.
var TZ = 'America/Denver';
function localDay_(d) { return Utilities.formatDate(d, TZ, 'yyyy-MM-dd'); }
function localStamp_(d) { return Utilities.formatDate(d, TZ, 'yyyy-MM-dd HH:mm:ss'); }

// Read-only. Finds completion rows that duplicate another completion of the SAME task on the
// same LOCAL day, and prints the gap between them. The gap identifies the mechanism:
//   seconds apart      -> one gesture fired twice, or a retry on a write that had landed
//   ~20-25 seconds     -> the client timed out and the user tapped "retry" on a write that
//                         had ACTUALLY SUCCEEDED (API_TIMEOUT is 25s)
//   many minutes/hours -> two deliberate completions; for a daily task that is legitimate
function debugDuplicateCompletions() {
  var sheet = getSheet('task_log');
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) { Logger.log('task_log is empty'); return { pairs: 0 }; }
  var header = data[0].map(String);
  var iId = header.indexOf('log_id'), iTask = header.indexOf('task_id');
  var iName = header.indexOf('task_name'), iBy = header.indexOf('completed_by');
  var iAt = header.indexOf('completed_at');

  var groups = {};
  for (var r = 1; r < data.length; r++) {
    if (!logRowIsCompletion_(header, data[r])) continue;
    var at = data[r][iAt];
    var d = at instanceof Date ? at : new Date(String(at));
    if (isNaN(d.getTime())) continue;
    var key = String(data[r][iTask]) + '|' + localDay_(d);
    if (!groups[key]) groups[key] = [];
    groups[key].push({ row: r + 1, id: data[r][iId], name: data[r][iName], by: data[r][iBy], at: d });
  }

  var pairs = 0, gaps = [], suspects = [];
  Logger.log('--- completions duplicated for the same task on the same LOCAL day (' + TZ + ') ---');
  Object.keys(groups).forEach(function(k) {
    var g = groups[k];
    if (g.length < 2) return;
    pairs++;
    g.sort(function(a, b) { return a.at - b.at; });
    Logger.log('  "' + g[0].name + '"  (' + g.length + ' rows on ' + k.split('|')[1] + ' local)');
    for (var i = 0; i < g.length; i++) {
      var gap = 0, note = '';
      if (i > 0) {
        gap = Math.round((g[i].at - g[i - 1].at) / 1000);
        gaps.push(gap);
        note = '   +' + gap + 's after previous';
        if (gap <= 60) { note += '   <-- SUSPECT'; suspects.push({ name: g[i].name, gap: gap, row: g[i].row, id: g[i].id }); }
      }
      Logger.log('     row ' + g[i].row + '  ' + localStamp_(g[i].at) + ' local  by=' + JSON.stringify(String(g[i].by)) + '  id=' + g[i].id + note);
    }
  });
  if (!pairs) Logger.log('  none found');
  Logger.log('');
  Logger.log('duplicate groups: ' + pairs);
  if (gaps.length) { gaps.sort(function(a, b) { return a - b; }); Logger.log('gaps in seconds (sorted): ' + JSON.stringify(gaps)); }
  Logger.log('groups where a pair is under 60s apart (almost certainly a real bug): ' + suspects.length);
  suspects.forEach(function(x) { Logger.log('   "' + x.name + '"  +' + x.gap + 's  row ' + x.row + '  id=' + x.id); });
  return { pairs: pairs, gaps: gaps, suspects: suspects };
}

// ── MIGRATION UTILITIES ───────────────────────────────────────────────────────
// Run manually from the Apps Script editor ONCE after deploying v8.2.
// Safe to run: only creates rows in tasks, never deletes data.
function migrateSubtasks() {
  var ss = spreadsheet_();
  var subSheet = ss.getSheetByName('subtasks');
  if (!subSheet) { Logger.log('No subtasks tab found'); return; }
  var subs = sheetToObjects(subSheet);
  var taskSheet = getSheet('tasks');
  var migrated = 0;
  subs.forEach(function(s) {
    if (!s.subtask_id || !s.project_id || !s.name) return;
    var id = newId('task');
    appendRow(taskSheet, HEADERS.tasks, {
      task_id: id,
      name: s.name,
      type: 'one_off',
      due_date: s.due_date || '',
      status: s.status === 'done' ? 'done' : 'active',
      scope: 'household',
      owner: '',
      linked_project_id: s.project_id,
      created_at: new Date().toISOString().split('T')[0]
    });
    migrated++;
  });
  // Rename subtasks tab to subtasks_archived to preserve data
  subSheet.setName('subtasks_archived');
  Logger.log('Migrated ' + migrated + ' subtasks to tasks. Subtasks tab renamed to subtasks_archived.');
}
