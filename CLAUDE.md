# LoonHQ — Household Management PWA

## What this is
Shared household task management PWA for Frankie and Meredith (Denver).
Tracks recurring household tasks, projects, shopping list, and home asset maintenance.

## Tech stack
- Frontend: Single-file HTML/CSS/JS (index.html, ~176KB, no build tools, vanilla JS)
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
- qa_harness.js — Node.js DOM mock + 194 runtime checks
- LoonHQ_AppScript_v8.6.js — current Apps Script source (deploy separately to script.google.com)
- CLAUDE.md — this file

## Build workflow
Run: python3 build_v4.py
Then copy output and extract (QA harness reads from /home/claude/extracted.js):
  cp /mnt/user-data/outputs/LoonHQ.html index.html
  python3 -c "import re; html=open('index.html').read(); scripts=re.findall(r'<script>(.*?)</script>',html,re.DOTALL); open('/home/claude/extracted.js','w').write(max(scripts,key=len))"
  node --check /home/claude/extracted.js
  node qa_harness.js

## Deploy
- HTML: commit and push index.html → GitHub Pages auto-deploys in ~60 sec
- Apps Script: paste LoonHQ_AppScript_*.js into script.google.com → Save → Deploy → New version
- After schema changes: run setupHeaders() once in Apps Script editor (safe, appends columns only)

## IMPORTANT — data safety rule
DO NOT recommend clearing, resetting, or deleting sheet data under any circumstances
without explicit approval AND a second confirmation from Frankie. This is a hard rule.
Real user data is live in the sheet.

## Current version: v8.8.2
index.html in the repo is the live deployed build. build_v4.py is the source of truth.

## PENDING: AppScript v8.6 not yet deployed by user
LoonHQ_AppScript_v8.6.js has accumulated three separate changes that are all still undeployed:
snooze/log_type fix, the ping action, and interval recurrence units with month/year clamping.
Deploy once, after the current round of frontend work is finished.
1. Copy LoonHQ_AppScript_v8.6.js → paste into script.google.com → Save
2. Deploy → Manage deployments → pencil on EXISTING deployment → New version → Deploy
3. Run setupHeaders() once from the editor (Apps Script editor → Run → Run function → setupHeaders)
   This adds the log_type column to task_log so snooze entries are permanently excluded from history.
Until this is deployed: snoozed tasks may still appear in task history, the login ping is a
no-op (harmless, it is caught), and interval tasks with a week/month/year unit advance
server-side as if the unit were days.

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

## Task scope rules
- scope='household': visible to both users always
- scope='personal': visible only to the owner (filtered by owner === currentUser in renderTasks)
- When creating a personal task: owner auto-set to currentUser, owner field hidden
- Personal tasks shown with a lock badge on the card
- Analytics has a Household / Personal / All scope filter (statsScope global)
- Personal tasks visible to both in analytics (intentional — metrics should be complete)

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
- isCompletionLog(l): shared helper used by ALL log rendering and analytics. Three-layer snooze defense:
  1. log_type !== 'completion' (catches correct schema)
  2. details === 'snooze'|'edit'|'manual_note' (catches old AppScript schema mismatch)
  3. details.includes('until_date') (catches snooze JSON in wrong column)
- AppScript getAllData filters task_log to log_type='' or 'completion' before returning (server-side defense)
- AppScript snoozeTask no longer writes to task_log (no new snooze entries will ever appear)
- completed_by shows 'Unknown' when empty; uses neutral grey dot instead of Meredith-blue

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
- Error feedback: showToast() shows brief bottom-of-screen message on API failures
- apiGet/apiPost REJECT when the body contains {error}. Apps Script reports failures inside an
  HTTP 200 body, so a plain .json() would resolve on failure and make every .catch() dead code.
  Errors are tagged err.apiError so refreshData can distinguish "server said no" (keep cached
  data) from "offline" (fall back to STATIC_ASSETS). A window unhandledrejection backstop
  reports any apiPost call site that lacks its own .catch().
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

## HTML deploy instructions
GitHub Pages deploys automatically when index.html is pushed to main.
Claude Code handles this directly — no manual steps needed from the user.

## What to tell the user after each session
Always end a session with a clear summary of:
1. What was changed and what version it is
2. Whether Apps Script needs updating (and the exact manual steps if so)
3. Whether setupHeaders() needs to be run
4. Anything else the user needs to do manually
5. What to test first after deploying
