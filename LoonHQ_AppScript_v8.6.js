// LoonHQ Apps Script v8.6
// Deploy: paste into script.google.com -> Save -> Deploy -> New version
// After schema changes: run setupHeaders() once in the editor (safe, appends columns only)

var SHEET_ID = '1nOj60hRcDAyYsnrkNBA3XzMeEHl5y_IxWhQ5v28uOhA';

var HEADERS = {
  tasks:   ['task_id','name','type','weekday','day_of_month','recurrence_days','due_date','end_date',
            'urgency_window','reminder_offset','linked_asset_id','owner','scope','status','notes',
            'created_at','sched_month','sched_freq','sched_interval','sched_start',
            'linked_project_id','sched_pattern'],
  projects:['project_id','name','description','status','target_date','created_at'],
  subtasks:['subtask_id','project_id','name','status','due_date','sort_order'],
  grocery: ['item_id','name','category','status','added_by','checked_at','sort_order'],
  task_log:['log_id','task_id','task_name','completed_by','completed_at','scope','notes','details','log_type'],
  assets:  ['asset_id','name','category','status','notes','install_date','last_service_date',
            'next_service_date','warranty_expiry','icon','icon_bg','icon_color',
            'purchase_price','manual_url','contractors'],
  maintenance_log:['log_id','asset_id','date','note','task_id','log_type'],
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
  var ss = SpreadsheetApp.openById(SHEET_ID);
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
}

// ── HELPERS ────────────────────────────────────────────────────────────────────
function getSheet(name) {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(name);
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
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(String);
  var colIdx = headers.indexOf(idCol);
  if (colIdx < 0) return -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][colIdx]) === String(idVal)) return i + 1;
  }
  return -1;
}

function updateRow(sheet, rowNum, updates) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  Object.entries(updates).forEach(function([key, val]) {
    var colIdx = headers.indexOf(key);
    if (colIdx >= 0) sheet.getRange(rowNum, colIdx + 1).setValue(val);
  });
}

function appendRow(sheet, headers, obj) {
  var row = headers.map(function(h) { return obj[h] !== undefined ? obj[h] : ''; });
  sheet.appendRow(row);
}

function newId(prefix) {
  return prefix + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
}

// ── doGet / doPost ─────────────────────────────────────────────────────────────
function doGet(e) {
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
  var task_log = sheetToObjects(getSheet('task_log')).filter(function(l) {
    var lt = (l.log_type || '').toString();
    return lt === '' || lt === 'completion';
  });

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
           task_log: task_log, assets: assets, maintenance_logs: maintenance_logs };
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
    next = new Date(from);
    if (unit === 'week') { next.setDate(next.getDate() + n * 7); }
    else if (unit === 'month') { next.setMonth(next.getMonth() + n); }
    else if (unit === 'year') { next.setFullYear(next.getFullYear() + n); }
    else { next.setDate(next.getDate() + n); }
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
  // Cascade: delete all task_log entries for this task
  var logSheet = getSheet('task_log');
  var logData = logSheet.getDataRange().getValues();
  var taskIdIdx = logData[0].map(String).indexOf('task_id');
  if (taskIdIdx >= 0) {
    for (var i = logData.length - 1; i >= 1; i--) {
      if (String(logData[i][taskIdIdx]) === String(data.task_id)) logSheet.deleteRow(i + 1);
    }
  }
  return { ok: true };
}

function completeTask(data) {
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var logSheet = getSheet('task_log');
  var logEntry = {
    log_id: newId('l'), task_id: data.task_id, task_name: data.task_name,
    completed_by: data.completed_by, completed_at: new Date().toISOString(),
    scope: data.scope || 'household', notes: data.notes || '',
    log_type: 'completion', details: ''
  };
  appendRow(logSheet, HEADERS.task_log, logEntry);

  var taskSheet = getSheet('tasks');
  var rowNum = findRow(taskSheet, 'task_id', data.task_id);
  if (rowNum < 0) return { ok: true };

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
  return { ok: true };
}

function batchComplete(data) {
  (data.tasks || []).forEach(function(t) { completeTask(Object.assign({ completed_by: data.completed_by }, t)); });
  return { ok: true };
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
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(String);
  var statusIdx = headers.indexOf('status');
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][statusIdx]) === 'got') sheet.deleteRow(i + 1);
  }
  return { ok: true };
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

// ── MIGRATION UTILITIES ───────────────────────────────────────────────────────
// Run manually from the Apps Script editor ONCE after deploying v8.2.
// Safe to run: only creates rows in tasks, never deletes data.
function migrateSubtasks() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
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
