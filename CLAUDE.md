# LoonHQ — Household Management PWA

## What this is
Shared household task management PWA for Frankie and Meredith (Denver).
Tracks recurring household tasks, projects, shopping list, and home asset maintenance.

## Tech stack
- Frontend: Single-file HTML/CSS/JS (index.html, ~240KB, no build tools, vanilla JS)
- Backend: Google Apps Script Web App + Google Sheets
- Icons: Tabler Icons webfont (CDN). DM Sans/DM Mono (Google Fonts CDN)
- Hosting: GitHub Pages → index.html
- Auth: PIN login. Frankie = 225522, Meredith = 8627 (localStorage)

## Key URLs
- Apps Script endpoint: https://script.google.com/macros/s/AKfycbzL362NjJliCBSbR9uIo1lacPEk5uYw1C-SO8OvlLQ2QMCVC3lFh7y8Gs8z0Gn0lVSK/exec
- Sheet ID: 1nOj60hRcDAyYsnrkNBA3XzMeEHl5y_IxWhQ5v28uOhA

## Repo structure
- index.html — the entire app (built output, source of truth for deployment)
- build_v4.py — Python build script that generates index.html (~1600 lines)
- qa_harness.js — Node.js DOM mock + 110 runtime checks
- LoonHQ_AppScript_v8.5.js — current Apps Script source (deploy separately to script.google.com)
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

## Current version: v8.5
index.html in the repo is the live deployed build. build_v4.py is the source of truth.

## Apps Script schema (tasks tab columns in order)
task_id, name, type, weekday, day_of_month, recurrence_days, due_date, end_date,
urgency_window, reminder_offset, linked_asset_id, owner, scope, status, notes,
created_at, sched_month, sched_freq, sched_interval, sched_start

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
- ALWAYS strip ISO timestamps before date parsing: String(d).split('T')[0]
  Reason: Google Sheets returns dates as full ISO timestamps (2026-06-09T06:00:00.000Z)
  Failing to strip this breaks all recurrence math and was the root cause of the completion glitch

## Date handling rules
- All date inputs must be populated via dval(d) helper: return d ? String(d).split('T')[0] : ''
- All date parsing must use: new Date(String(d).split('T')[0] + 'T12:00:00')
- Never concatenate a raw date field + 'T12:00:00' without stripping first

## Views and stripe colors
Tabs: Today (default) | Tomorrow | This week | This month | Recurring | All
Stripe colors by urgency: Today=red (r), Tomorrow=orange (o), This week=green (g), This month=blue (b), Later=neutral (n)
Week tab shows: Today + Tomorrow + This week (three separate stripes)
Month tab shows: Today + Tomorrow + This week + This month (four stripes)

## Due date tag classes
.due-overdue = red solid, .due-today = red outline, .due-soon = amber (tomorrow/2-3 days)
.due-week = green outline, .due-month = blue outline, .due-future = neutral outline
Tags are outlined style (white bg, colored border) not filled

## Coding conventions
- Vanilla JS, no frameworks, no build tools, no imports
- CSS variables: --green, --red, --amber, --blue, --purple, --slate, --terra
- No em dashes anywhere
- Delegated click handlers for: data-sub, data-addsub, data-editproj, data-editsub, .snooze-opt[data-snooze]
- build_v4.py is the source of truth — edit it, then run python3 build_v4.py to regenerate index.html
- Never edit index.html directly

## Known issues in deployed v7 (fixed in v7.1, not yet deployed)
- Recurring task completion glitches (disappears then reappears) — root cause: ISO timestamp date parse in computeNextDue
- Tomorrow tab shows empty — root cause: same ISO timestamp bug in the bucket filter
- Date fields show raw ISO timestamps on task/project cards
- Date input fields show blank when editing tasks with saved dates

## Pending backlog
ARCHITECTURE (big, suggest tackling in Claude Code):
- Assets: migrate from hardcoded JS array to sheet, make editable, allow task-linking from asset page
- Priority/urgency system: low priority rolls forward silently, high priority = red/bold/floats to top
- Consolidate subtasks into tasks with project_id (projects as views not separate objects)
- UI performance: swipe-to-complete latency, optimistic updates

UI POLISH (smaller, faster):
- Color scheme refresh (overall palette, esp. tags)
- Reminder vs due-today visual distinction (clock icon vs calendar icon, or section split)
- Batch snooze (add snooze to multi-select alongside complete)

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
- Minor versions (v7.1, v7.2...) = bug fixes, UI tweaks, small additions
- The file in the repo is always index.html — never named with a version number
- Apps Script file in the repo is named LoonHQ_AppScript_vX.js matching the current version
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
