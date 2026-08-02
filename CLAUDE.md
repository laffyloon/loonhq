# LoonHQ — Household Management PWA

## What this is
Shared household task management PWA for Frankie and Meredith (Denver).
Tracks recurring household tasks, projects, shopping list, and home asset maintenance.

## Tech stack
- Frontend: Single-file HTML/CSS/JS (index.html, ~178KB, no build tools, vanilla JS)
- Backend: Google Apps Script Web App + Google Sheets
- Icons: Tabler Icons webfont (CDN). DM Sans/DM Mono (Google Fonts CDN)
- Hosting: GitHub Pages → index.html
- Auth: PIN login. Frankie = 225522, Meredith = 8627 (localStorage)

## Key URLs
- Apps Script endpoint: https://script.google.com/macros/s/AKfycbzL362NjJliCBSbR9uIo1lacPEk5uYw1C-SO8OvlLQ2QMCVC3lFh7y8Gs8z0Gn0lVSK/exec
- Sheet ID: 1nOj60hRcDAyYsnrkNBA3XzMeEHl5y_IxWhQ5v28uOhA

## Repo structure
- index.html — the entire app (built output, source of truth for deployment)
- build_v4.py — Python build script that generates index.html
- qa_harness.js — Node.js DOM mock + 237 frontend runtime checks
- appscript_harness.js — SpreadsheetApp mock + 64 server-side checks (correctness, API cost, container reuse)
- e2e_harness.js — Playwright/Chromium checks + 61 real-browser checks (CSS, events, layout)
- LoonHQ_AppScript_v8.12.js — current Apps Script source (deploy separately to script.google.com)
- CLAUDE.md — this file

## Build workflow
Run: python3 build_v4.py
Then copy output and extract (QA harness reads from /home/claude/extracted.js):
  cp /mnt/user-data/outputs/LoonHQ.html index.html
  python3 -c "import re; html=open('index.html').read(); scripts=re.findall(r'<script>(.*?)</script>',html,re.DOTALL); open('/home/claude/extracted.js','w').write(max(scripts,key=len))"
  node --check /home/claude/extracted.js
  node qa_harness.js
Apps Script changes: node appscript_harness.js (reads LoonHQ_AppScript_*.js from the repo root)
Real-browser pass (optional, needs global playwright + /opt/pw-browsers/chromium):
  npx --yes http-server . -p 8099 -s &
  NODE_PATH=$(npm root -g) node e2e_harness.js
It intercepts the Apps Script endpoint, so it never touches the live sheet.

## Testing layers (what each one can and cannot see)
- qa_harness.js: pure logic + render paths against a DOM mock. FAST, but querySelector returns
  a throwaway element, so it cannot see real CSS, real layout, or real event dispatch.
- appscript_harness.js: the server file against an in-memory SpreadsheetApp. Also counts API
  calls and fails on a cost regression. Not Google's runtime, so it proves logic, not behaviour.
- e2e_harness.js: the built index.html in Chromium at phone width. The only layer that catches
  CSS and layout problems.
- ALWAYS wait ~250ms before asserting on computed styles or taking a screenshot: .who-opt and
  similar transition for .15s, and a mid-animation reading looks like a bug that is not there.
- A test that passes is worth nothing until you have seen it FAIL against the unfixed code.
  Revert the fix, confirm the specific test breaks, restore. Several tests written this way
  turned out to be vacuous and were only caught by doing this.

## Deploy
- HTML: commit and push index.html → GitHub Pages auto-deploys in ~60 sec
- Apps Script: paste LoonHQ_AppScript_*.js into script.google.com → Save → Deploy → New version
- After schema changes: run setupHeaders() once in Apps Script editor (safe, appends columns only)

## IMPORTANT — data safety rule
DO NOT recommend clearing, resetting, or deleting sheet data under any circumstances
without explicit approval AND a second confirmation from Frankie. This is a hard rule.
Real user data is live in the sheet.

## Current version: v8.12
index.html in the repo is the live deployed build. build_v4.py is the source of truth.

## AppScript deploy state
The repo file is LoonHQ_AppScript_v8.12.js (name tracks the app's major.minor, not the
AppScript's own history). Deployed by the user up to the v8.8 content on 2026-07-29.
Still NOT in the user's editor (added in v8.9):
- logRowIsCompletion_ / completionLogs_ : getAllData now filters on RAW cells, so it works
  regardless of which task_log columns the sheet has labelled.
- previewSnoozeLogCleanup() : read-only diagnostic, dumps the real header row + bogus row count.
- purgeSnoozeLogs_CONFIRMED() : archives bogus rows to a task_log_archive tab, then removes them.

Note on running vs deploying: functions run from the Apps Script EDITOR only need Save.
A new deployment version is only required to change what the web app endpoint (doGet/doPost)
serves, i.e. the getAllData filter.

## CONTAINER REUSE — the v8.11 regression, do not reintroduce (2026-07-30)
Apps Script REUSES its V8 container between requests, so module-level globals survive into
the next execution. A Spreadsheet or Sheet handle cached in a global from a PREVIOUS execution
THROWS the moment it is touched. The item-7 caching (_ss / _sheetCache / _headerCache) had no
per-request reset, so the first request into a fresh container worked and every request after
it returned {error} instantly. Frankie could not create a task at all.
- FIX: resetExecutionCaches_() is the FIRST line of both doGet and doPost. The caching is only
  ever valid WITHIN one execution, which is where all the savings were anyway.
- Any new global that holds a SpreadsheetApp object must be cleared there too.
- appscript_harness.js models this with a GEN counter: newExecution() bumps it and every handle
  stamped with an older GEN starts throwing. The 4 REGRESSION tests fail without the reset.
  The original 36 tests could NOT catch this because they reset the globals between tests.

## AppScript performance (v8.10, closes the last item of the v8.8 request)
- The spreadsheet is opened ONCE per execution and sheet + header lookups are cached
  (spreadsheet_ / getSheet / headersOf_). getAllData used to call openById six times.
  resetSheetCache_() must be called after anything that changes the header row.
- updateRow does one getValues + one setValues for the whole row, not a setValue per field.
  A full task edit went from about a dozen API round trips to two.
- findRow reads only the id column via getRange, not getDataRange over every column.
- appscript_harness.js counts API calls and FAILS if any of these regress, so the cost
  guarantees are enforced rather than assumed.

## task_log column labels are SWAPPED on the live sheet (found 2026-07-30)
previewSnoozeLogCleanup on Frankie's real sheet returned:
  ["log_id","task_id","task_name","completed_by","completed_at","notes","scope","","","details","log_type"]
Columns 6 and 7 are labelled notes,scope but every row ever written holds scope,notes:
HEADERS.task_log has had scope BEFORE notes since v8.1, and appendRow writes by the code's
HEADERS order, not by the sheet's actual header row. Consequences before the fix:
- sheetToObjects returns scope:'' for every log row, so (l.scope||'household') sent EVERYTHING
  to household. Personal History was empty and personal completions were counted as household.
- fixTaskLogHeaderLabels() swaps the two LABELS only, touches no data cell, is guarded against
  any other layout, and is idempotent. Run once from the editor.
Second, separate consequence of the same sheet: snooze markers sit in UNLABELLED columns 8/9
while 'details'/'log_type' were appended at 10/11 (the setupHeaders caveat below). Because both
markers collapse under the '' key and the LAST one wins, an EDIT row collapses to '' and the
frontend probe cannot see it. Only the server, which reads raw cells, can reject it. So edit
rows counted as completions until the v8.9+ getAllData filter is actually DEPLOYED. 101 of 308
rows were non-completions: 16 Frankie, 82 Meredith, 3 blank.

## setupHeaders CAVEAT (important)
setupHeaders appends at getLastColumn()+1, and getLastColumn() reflects DATA extent, not the
header row. task_log data rows already reach column 9 while the header row may only label 7,
so setupHeaders can place 'details'/'log_type' at columns 10/11 and leave the real marker data
in unlabelled columns 8/9. This does not break anything (isCompletionLog probes the ''
overflow key) but it means the sheet can have labelled-but-empty columns. Run
previewSnoozeLogCleanup() to see the actual header row before assuming a layout.

## Apps Script schema (tasks tab columns in order)
task_id, name, type, weekday, day_of_month, recurrence_days, due_date, end_date,
urgency_window, reminder_offset, linked_asset_id, owner, scope, status, notes,
created_at, sched_month, sched_freq, sched_interval, sched_start

task_log tab columns: log_id, task_id, task_name, completed_by, completed_at, scope, notes, details, log_type
(log_type is at the END so setupHeaders can append it cleanly to existing sheets)

Other tabs: projects, subtasks, grocery, task_log
assets tab exists in schema but assets are currently HARDCODED in JS — not yet migrated to sheet

## Task types
- one_off: single due date
- floating: urgency_window (this_week | this_month | no_rush), no hard date
- scheduled: calendar-anchored recurrence via sched_freq (day|week|month|year) + sched_interval (X)
  uses weekday (0-6) for weekly, day_of_month (1-31 or "last") for monthly/yearly, sched_month (1-12) for yearly
- interval: completion-anchored, advances by recurrence_days from completion date

## Recurrence model (critical — keep frontend and Apps Script in sync)
- schedFreqOf(task): infers freq from sched_freq field, falls back to legacy weekday/day_of_month inference for old rows
- computeFirstDue(task, today): picks first occurrence, respects sched_start if it is a future date
- computeNextDue(task, fromDate): advances by X intervals from due_date anchor
- sched_freq is OVERLOADED and its meaning depends on type:
    scheduled -> calendar frequency (day|week|month|year), paired with sched_interval
    interval  -> the unit for recurrence_days (day|week|month|year), e.g. every 6 months
  schedFreqOf() must only ever be called on scheduled tasks. All four call sites are
  type-guarded today; keep it that way or interval units will be read as calendar frequency.
- Interval month/year math MUST clamp to the last valid day via monthStepDate (frontend) /
  monthStep (AppScript). Never setMonth/setFullYear directly: they overflow, so Jan 31 + 1
  month becomes Mar 3 instead of Feb 28. Regression tests cover this in qa_harness.js.
- ALWAYS strip ISO timestamps before date parsing: String(d).split('T')[0]
  Reason: Google Sheets returns dates as full ISO timestamps (2026-06-09T06:00:00.000Z)
  Failing to strip this breaks all recurrence math and was the root cause of the completion glitch

## Date handling rules
- All date inputs must be populated via dval(d) helper: return d ? String(d).split('T')[0] : ''
- All date parsing must use: new Date(String(d).split('T')[0] + 'T12:00:00')
- Never concatenate a raw date field + 'T12:00:00' without stripping first

## Ownership and credit (joint tasks)
- owner and completed_by hold '' (either of us), one name, or BOTH comma joined: 'Frankie,Meredith'.
  Canonical order is _PEOPLE order, so the joint value is always 'Frankie,Meredith'.
- Model: ONE task, ONE log row. A joint completion is a single row credited to both.
  Rejected alternatives: duplicating the task (two things to tick off) and duplicating the
  log row (the completion would appear twice in History, the exact duplication bug we just fixed).
- Helpers: peopleOf / hasPerson / peopleLabel ('Frankie & Meredith') / personDot / creditFor.
- creditFor(t): a task owned by both credits both no matter who ticks it off; otherwise the
  completer gets the credit (so 'either of us' and single-owner behaviour are unchanged).
- Stats: "Total completed" counts TASKS, per-person bars count CREDIT, so the two per-person
  numbers can legitimately sum to more than the total. renderStats does one pass, not two.
- AppScript needs NO change for this: batchComplete does Object.assign({completed_by:...}, t)
  so a per-task completed_by wins, and completeTask/addTask pass the string straight through.
- Owner picker: "Either of us" is exclusive; the two names toggle independently; deselecting
  the last name falls back to "Either of us". syncOwnerBtns() is the single source of button state.

## Task scope rules
- scope='household': visible to both users always
- scope='personal': visible only to the owner (filtered by owner === currentUser in renderTasks)
- When creating a personal task: owner auto-set to currentUser, owner field hidden
- Personal tasks shown with a lock badge on the card
- Analytics has a Household / Personal / All scope filter (statsScope global)
- Personal tasks visible to both in analytics (intentional — metrics should be complete)

## Views — Activity section
Tabs: Stats | Household History | Personal History (metricsTab = stats|household|personal)
- Both history tabs show COMPLETED tasks only (isCompletionLog) and split on l.scope.
- Personal History shows only YOUR OWN personal completions (hasPerson(l.completed_by,currentUser)).
- Both history tabs share one panel and one renderer; renderHistory() reads metricsTab for scope.

## Views — Tasks section
Tab order: Today (default) | Upcoming | Recurring | All | History
- Today: Overdue (red stripe) + Today (amber stripe) only
- Upcoming: Overdue + Today + Reminders + Tomorrow + This next week + This next month
- Recurring: all scheduled and interval tasks
- All: every bucket including Later
- History: completed task log (completions only — snooze/edit events excluded)

Stripe colors: r=red, o=amber, g=green, b=blue, p=purple, n=neutral
- Overdue → r, Today → o, Tomorrow → g, Week → b, Month → p, Later/Reminders → n

## Due date tag classes
.due-overdue = red solid, .due-today = red outline, .due-soon = amber (tomorrow/2-3 days)
.due-week = green outline, .due-month = blue outline, .due-future = neutral outline
Tags are outlined style (white bg, colored border) not filled

## Task log / history rules
- ROOT CAUSE of the long-running "snoozes counted as completions" bug (fixed v8.9):
  v8.5 snoozeTask appended log_type/details to task_log, but setupHeaders was never run, so
  those columns had NO header text. sheetToObjects keys cells by header, so both values
  collapsed under the '' key and l.log_type / l.details came back UNDEFINED. Every filter that
  read the named fields saw a clean row and counted the snooze as a completion, credited to
  whoever snoozed. Three earlier "fixes" all read named fields, which is why none of them worked.
- isCompletionLog(l): shared helper used by ALL log rendering and analytics. It checks
  log_type, details, AND l[''] (the unlabelled-column overflow). Never drop the l[''] probe.
  It deliberately does NOT scan task_name/notes, so a task called "snooze" is not swept up.
- AppScript mirrors this in logRowIsCompletion_(headers,row), which inspects raw cells so it
  works no matter which columns the sheet has labelled. getAllData uses completionLogs_().
- qa_harness covers all 5 sheet-layout permutations (7/8/9 labelled columns x both write orders).
- AppScript getAllData filters task_log to log_type='' or 'completion' before returning (server-side defense)
- AppScript snoozeTask no longer writes to task_log (no new snooze entries will ever appear)
- completed_by shows 'Unknown' when empty; uses neutral grey dot instead of Meredith-blue

## v8.11 fixes (the three glitches reported after the v8.10 deploy)
- THE GHOST: .tc.loading ran `pulse 1s infinite`, oscillating opacity 1 -> .3 for as long as
  the sync took. A pending card looked like it was malfunctioning. Now a static opacity .6
  plus a ' saving...' ::after on .tn. Never reintroduce an infinite animation here.
- NO REQUEST TIMEOUT: apiGet/apiPost used bare fetch, so a hung Apps Script call never
  settled. The pending card stayed forever, no .catch() ran, so no toast and no retry: the
  user saw a permanent ghost and a dead app. _fetchTimeout wraps both with an AbortController
  (API_TIMEOUT, 25s) and throws err.timedOut. This is why "tap to retry did nothing".
- SYNC LATENCY: scheduleBgSync was a flat 3000ms on every path. After a write has already
  SUCCEEDED the only thing left is to fetch the real row, so success paths now pass SYNC_FAST
  (700ms); rollback paths keep SYNC_SLOW (3000ms). 14 success call sites were switched.
- The refreshData discard path returned WITHOUT rendering, so a stale pending card could sit
  there another full cycle looking stuck. It now calls renderAll() before rescheduling.
- refreshData fired grocery cleanup deletes INLINE, which stamped _lastWriteAt mid-sync and
  made the very next sync discard its payload. They are now deferred past the current sync.
- setSyncState('loading','Saving...') moved INSIDE both attempt closures, so a retry shows it.

## Dead code worth knowing about
renderTaskHistoryModal (build_v4.py ~2473) has branches for log_type 'snooze' and 'edit',
with clock/pencil icons and an 'until <date>' detail line. They are UNREACHABLE: the filter
on the same line is isCompletionLog(l), and getAllData no longer sends non-completions at all.
If a per-task activity timeline is ever wanted, that rendering is already written, but it needs
its own unfiltered feed. Do not "fix" it by loosening isCompletionLog.

## Performance notes
- Pre-built Maps updated after every refreshData: _taskById, _subtasksByProj, _tasksByAsset
- _REMINDER_DAYS, _DAYS, _URG_LABELS are module-level constants (not allocated per card render)
- Search input debounced 120ms via _searchTimer
- Swipe gesture: innerHTML pre-built once per card; touchmove toggles className (swipe-complete/swipe-snooze) and sets style.transform/display inline
- Document click handler: short-circuits when e.target.id is empty before checking modal list
- renderAll only re-renders current view; go() renders destination on navigation
- toggleSelect updates card CSS directly without full list re-render (exception: deselecting the last item calls renderTasks to exit batch cleanly)
- Optimistic UI: all task actions (complete, snooze, add, edit, delete, grocery toggle) update UI instantly
  - complete: adds to _recentlyCompleted (filtered from render) + animate card out
  - snooze: updates task.due_date in state + re-renders immediately
  - add task: inserts temp task (task_id=tmp_XXX, _temp=true, pulsing) into state + renders; replaced by real task after bg sync
  - edit task: updates task in state immediately; bg sync reconciles
  - delete: removes from state immediately; bg sync confirms
  - grocery toggle: already was optimistic (DOM toggle); now also updates state + rolls back on failure
- scheduleBgSync(): debounced 3-second background reconcile; replaces refreshData(true) after all actions
- State cache: _lastFetch updated on each successful fetch; visibilitychange listener refetches if >60s stale
- Apps Script warm-up: silent apiGet({action:'ping'}) fired immediately after login to trigger GAS cold-start
- Error feedback: showToast(msg, retry) shows a bottom-of-screen message on API failures.
  It stores its hide timer and cancels the previous one, so back-to-back toasts each get their
  full dwell instead of the older timer cutting the newer one short.
- Tap to retry: every optimistic task/grocery handler wraps its work in a local attempt()
  function that is safe to re-run after a rollback, and passes it to actionFailed as the retry.
  A retryable toast is tappable (7s dwell), plain toasts are not (4s, pointer-events:none).
  onToastTap() disarms the retry first, so a double tap cannot fire the action twice.
  Retry closures must capture IDs, never task objects: the reconcile sync replaces state.tasks
  wholesale within 3s while the retry toast lives 7s, so a captured object can be orphaned.
- apiGet/apiPost REJECT when the body contains {error}. Apps Script reports failures inside an
  HTTP 200 body, so a plain .json() would resolve on failure and make every .catch() dead code.
  Errors are tagged err.apiError so refreshData can distinguish "server said no" (keep cached
  data) from "offline" (fall back to STATIC_ASSETS). A window unhandledrejection backstop
  reports any apiPost call site that lacks its own .catch().
- Stale-sync guard: apiPost records each in-flight write. refreshData DISCARDS a getAllData
  payload when a write is still unacknowledged, or when one landed after the fetch was issued
  (_lastWriteAt > syncStart), and reschedules instead. Without this, a sync already in flight
  returns pre-mutation server state and resurrects a task the user just deleted. Writes older
  than 15s stop counting (writesPending) so a hung request cannot block syncing forever.
- _recentlyCompleted is cleared when a payload is APPLIED, not before the fetch: at that point
  every write has settled, so server state is authoritative.
- Temp records (task_id/item_id = tmp_XXX) are NOT removed on success. The refreshData payload
  replaces state wholesale, so the temp dies exactly when the real record arrives. Removing it
  early left state and DOM disagreeing for the whole 3s debounce and made the card flicker.
- rebuildTaskIndex() / actionFailed(msg,render,label) are the shared helpers for optimistic
  handlers; actionFailed does undo-render + reconcile + toast + sync state.
- Every rollback path calls scheduleBgSync(). A local rollback can disagree with the server
  when a batch partially succeeded (Promise.all rejects after some writes landed) or when an
  edit added fields the snapshot did not have, so the reconcile is what makes state truthful.
- KNOWN REMAINING PERF ITEMS (not yet tackled - flag for dedicated session):
  - Event delegation on task cards (8+ listeners per card per render - biggest remaining win)
  - computeNextDue memoization (runs date math per task per render, correctness-sensitive)

## Multi-select behavior
- Select button (ti-list-check icon) enters batch mode with zero tasks pre-selected
- "Select all" button appears inside the batch bar only when batch mode is active
- Long-press or right-click on any task card also enters batch mode

## Project task defaults
- Tasks created from a project (openAddTaskForProject) default to type=floating, urgency=no_rush
- One-off tasks with a linked project skip the "default to today" due date behavior
- Keeps project planning out of the main task list unless explicitly given a date

## Snooze cadences
1 day, 3 days, 5 days, 1 week (no 2-week option)

## Coding conventions
- Vanilla JS, no frameworks, no build tools, no imports
- CSS variables: --green, --red, --amber, --blue, --purple, --slate, --terra
- No em dashes anywhere
- Delegated click handlers for: data-sub, data-addsub, data-editproj, data-editsub, .snooze-opt[data-snooze]
- build_v4.py is the source of truth — edit it, then run python3 build_v4.py to regenerate index.html
- Never edit index.html directly

## v8.12 fixes (2026-07-30, second session)
- NO-DUE-DATE TASKS LANDED ON TOMORROW. submitTask defaulted a blank due date with
  new Date().toISOString().split('T')[0], which is the UTC date. Bucketing uses LOCAL midnight
  (setHours(0,0,0,0)). Frankie is in Denver (UTC-6) and tests in the evening, so after 6pm
  local the default was already tomorrow: the task saved fine but appeared under Tomorrow, not
  Today, and looked like it had never been created. todayStr() now returns the local calendar
  date and is used everywhere. qa_harness covers it under TZ=America/Denver.
- DELETING A TASK TOOK 20-30 SECONDS. deleteTask read the whole task_log and then called
  deleteRow once per matching row, each its own API round trip. deleteRowsBatched_ collapses
  row numbers into descending contiguous runs and issues one deleteRows per run;
  matchingRowNumbers_ reads only the id column. Same fix applied to clearChecked.
- THE PURGE rewrites instead of deleting. 101 scattered rows would still be ~101 calls even
  when batched, so purgeSnoozeLogs_CONFIRMED now archives in one setValues, writes the
  survivors back in one setValues, and drops the tail with one deleteRows.
- BATCH BAR OVERFLOWED at 360px and below, clipping "Complete all". It was one non-wrapping
  row of five controls. Now two rows: count + Select all/Cancel on top, Snooze/Delete/Complete
  below as equal-width buttons. Verified 320-430px. e2e runs the batch section at 360, NOT 430:
  at 430 the old bar fitted and the test proved nothing.
- MASS DELETE added, with a server-side batchDelete action so the whole selection is one
  request and rows come out in blocks.
- THE BATCH BAR COVERED THE LAST TASK. It is position:absolute over #task-scroll, so the
  final card sat underneath it: visible if you dragged, but it sprang back and could never be
  tapped. enterBatch now measures the bar and sets --batch-h on the scroller, and
  .scroll.batch-open reserves that height as padding-bottom (plus scroll-padding-bottom).
  exitBatch clears it, and a resize listener re-measures. Do NOT hardcode the height: it
  depends on the safe-area inset and on how the two rows wrap.
- LOGO restored. It had been building as src="" since 2026-07-13 because build_v4.py read the
  data URI from /home/claude/logo_uri.txt, outside the repo. Recovered the real 256x256 WebP
  from commit 240e11e, committed it as logo_uri.txt, and the build now ABORTS rather than
  shipping a blank logo. Never point this at a path outside the repo again.

## DUPLICATE COMPLETIONS — investigation in progress (2026-08-02)
- Reported: some tasks appear twice in History on the same day.
- debugDuplicateCompletions() is the read-only diagnostic. It groups completions by task and
  by LOCAL day and prints the gap between them. The gap identifies the mechanism.
- FIRST VERSION OF THE DIAGNOSTIC WAS WRONG: it grouped by the UTC date. completed_at is a UTC
  timestamp and the household is in Denver (UTC-6), so that produced BOTH false positives (a
  nightly task done 10pm Jun 17 and 3pm Jun 18 shares one UTC date and looked duplicated) and
  false negatives (two completions on the same Denver evening straddle UTC midnight and were
  never compared). 4 of the first 7 "duplicates" were legitimate. Same class of bug as the
  due-date one. ALWAYS convert to TZ before asking "same day".
- Real signal so far: "Vacuum upstairs" 2026-08-02, two rows 22 SECONDS apart, same person.
  22s is just under API_TIMEOUT (25s), consistent with the client giving up on a write that
  actually landed and the user tapping "retry". That is the known false-failure design flaw.
- A gap under 60s is flagged as a SUSPECT. Anything hours apart is almost certainly genuine.

## STILL OPEN after v8.12
- On a TIMEOUT the client still rolls back and says "Couldn't save", but a timeout means the
  outcome is UNKNOWN and the write often landed. Preferred design: keep the optimistic state,
  say "still saving", force a reconcile. err.timedOut is already set by _fetchTimeout, so the
  handlers can distinguish; the work is threading it through ~14 catch sites.
- Apps Script SERIALISES executions per user. SYNC_FAST (700ms) may make a getAllData collide
  with the next write. Measure real timings before tuning further.

## PREVIOUS SESSION notes (2026-07-30 first session) — mostly resolved above
All reported against v8.11 with the container-reuse fix deployed. No code changes were made
after this list was written. Ordered by how much they hurt.

1. WRITES TAKE 20-30 SECONDS AND THEN LIE ABOUT IT. Highest priority, and it explains
   several of the other reports.
   - Deleting a task showed "Couldn't delete task" after 20-30s, and then the task deleted
     anyway. So the write SUCCEEDED server-side and the client had already given up.
   - API_TIMEOUT (25s) fires, apiPost rejects, the handler rolls back and toasts. The server
     then finishes, and the next sync brings the change back. A false failure, and the UI
     briefly disagrees with the sheet.
   - CONFIRMED CAUSE for delete: deleteTask reads the ENTIRE task_log with getDataRange
     (308 rows x 11 cols today) and then calls deleteRow ONCE PER MATCHING ROW, each its own
     API round trip. Fix: collect the row numbers, delete in descending contiguous blocks, or
     rewrite the sheet once. This was NOT covered by the item-7 cost work.
   - LEAD for the general slowness: Apps Script SERIALISES executions per user. v8.11 lowered
     the post-write sync to SYNC_FAST (700ms), so a getAllData that reads 7 tabs can now be
     in flight when the next write arrives, and the write queues behind it. Faster syncing may
     have made write latency WORSE. Measure before changing: log timestamps in doPost, or check
     the Executions panel for queue times.
   - DESIGN QUESTION worth settling: on timeout, rolling back is wrong when the write may have
     landed. Prefer leaving the optimistic state and forcing a reconcile, or make the toast say
     "still saving" rather than reporting failure.

2. CREATING A TASK WITH NO DUE DATE HANGS, then errors at ~20s (the timeout).
   - Frankie isolated it precisely: creation works for household AND personal IF a due date is
     picked. With the date left empty it never registers.
   - A one-off with no date is SUPPOSED to default to today. Grep found NO code doing that, so
     the default may simply not exist. Check submitTask and openAddTask before blaming the server.
   - computeFirstDue was ruled out: it contains no loops, and it only runs for interval and
     scheduled types anyway.
   - Check the Executions panel for what those hung requests actually did. Given item 1, the
     task may in fact be landing eventually.

3. BATCH MODE
   - The select-all bar text does not fit its container. Layout overflow at phone width.
     e2e_harness.js is the right layer for this; the DOM mock cannot see it.
   - Mass DELETE is missing. Batch mode can complete but not delete. Frankie wants it.

4. LOGO RENDERS AS src="" (cosmetic)
   - build_v4.py line 7 reads the data URI from /home/claude/logo_uri.txt, which is OUTSIDE the
     repo and is 1 byte (just a newline) in the Claude Code container, so every build emits an
     empty src.
   - VERIFIED byte-identical to the 554814b build from two weeks ago, so this is NOT a
     regression from this session's rebuilds. It has been building empty for a while.
   - Proper fix: commit the logo into the repo and stop reading an uncommitted path. Any build
     run anywhere else will keep silently dropping it otherwise.

5. DONE 2026-07-30: the 101 bogus task_log rows were archived and removed.
   - purgeSnoozeLogs_CONFIRMED ran in 4 seconds. 307 rows in, 101 archived, 206 completions
     left. Breakdown of the removed rows: 16 Frankie, 82 Meredith, 3 blank author.
   - They are all preserved on the task_log_archive tab, so this is reversible.
   - Only run it again if new non-completion rows somehow appear. snoozeTask no longer writes
     to task_log, so the count should stay at zero. previewSnoozeLogCleanup is the read-only
     way to check.
   - NOTE the row count was 307 not 308: deleting a test task also removes its completion
     rows, which is the cascade in deleteTask working as intended.

## Pending backlog
ARCHITECTURE (big, suggest tackling in Claude Code):
- Assets: migrate from hardcoded JS array to sheet, make editable, allow task-linking from asset page
- Priority/urgency system: low priority rolls forward silently, high priority = red/bold/floats to top
- Consolidate subtasks into tasks with project_id (projects as views not separate objects)
- Event delegation on task cards: biggest remaining perf win, needs dedicated refactor session
- computeNextDue memoization: runs date math per task per render, needs careful cache-invalidation design

UI POLISH (smaller, faster):
- Color scheme refresh (overall palette, esp. tags)
- Reminder vs due-today visual distinction (clock icon vs calendar icon, or section split)

FEATURES:
- Task health flags: track snooze-without-completion patterns, flag cadence mismatches
- Packing list templates / trip checklists
- Vacation planning (future)

## Response format — Frankie is NOT a developer (added 2026-07-30 at his request)
This is the most important style rule. He asked for it directly after several responses
buried the takeaway in technical prose.
- START with what changed, in plain language, 1-3 sentences.
- END with a clearly headed list of HIS action items, or "Nothing to do" when there are none.
- Version bumps: always say WHY the number changed. Do not let a new version number appear
  for the first time inside a paragraph about something else.
- Technical detail is opt-in. Keep root-cause explanations to one short line, or leave them
  out and offer them. Do not explain the diagnosis unless he asked or it changes his actions.
- Never make him hunt for whether he needs to do something. If a fix is already live and
  needs nothing from him, say exactly that up front.
- Test counts, file names, commit hashes, CSS class names and function names are noise to him
  unless he needs to type them. Cut them.

## Style rules — always follow
- No em dashes. Use hyphens or reword.
- No filler openers (Great!, Sure!, Let me..., Here's what I found...)
- Direct, concise, neutral tone
- Correct errors without softening
- Avoid bullet-point overload in conversational responses — use prose
- Sustainability = efficiency + resilience + durability, not perfection
- For any plumbing/drain/appliance advice: Frankie had a basement water main backup, washing machine suspected contributor, no scope done yet

## Versioning rules
- Major versions (v8, v9...) = significant new features or architectural changes
- Minor versions (v8.1, v8.2...) = bug fixes, UI tweaks, small additions
- The file in the repo is always index.html — never named with a version number
- Apps Script file in the repo is named LoonHQ_AppScript_vX.js matching the current major.minor version
- Commit message format: "Deploy LoonHQ vX" or "Deploy LoonHQ vX.Y"
- Commit description: short blurb 8-15 words summarizing what changed

## Apps Script deploy instructions (ALWAYS follow this exactly)
NEVER create a new deployment. Always update the existing one.
1. User pastes the new Apps Script into script.google.com → Save
2. Deploy → Manage deployments → pencil ✏️ on the EXISTING deployment → New version → Deploy
3. The URL must never change — it is hardcoded in build_v4.py and the frontend
4. If setupHeaders() is needed (schema changes), tell the user to run it manually from the editor
5. Always tell the user which of these steps they need to do — don't assume they remember
6. ALWAYS supply a 10-20 word Version description to paste into the Description field.
   Apps Script assigns the version NUMBER itself; the description is the only free text, and
   it is the deployment history the user reads later. Rules for it:
   - Lead with the version: "v8.10 - ..."
   - Describe what changed SERVER-SIDE only. Frontend work does not belong in it.
   - Scope it to what the user has not yet deployed, not just the newest commit. Check with
     git what their last deployed content actually was; they may be several versions behind.
   - Keep the file's own line-1 header comment (// LoonHQ Apps Script vX.Y) in sync too.

## HTML deploy instructions
GitHub Pages deploys automatically when index.html is pushed to main.
IMPORTANT: pushing to a feature branch does NOT deploy. Pages serves main only. Work pushed
to claude/* is invisible to the live app until it reaches main, so never tell the user a
frontend fix is live without confirming it is on origin/main.

## What to tell the user after each session
Always end a session with a clear summary of:
1. What was changed and what version it is
2. Whether Apps Script needs updating (and the exact manual steps if so)
3. Whether setupHeaders() needs to be run
4. Anything else the user needs to do manually
5. What to test first after deploying
