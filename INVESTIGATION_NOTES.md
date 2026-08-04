# INVESTIGATION NOTES — completion flow as it stood before v9

Recorded 2026-08-04, immediately before the v9 multi-tap credit rewrite.
Source of truth at the time: build_v4.py, LoonHQ_AppScript_v8.12.js, main at 8710602.
No COMPLETION_REPORT.md existed in the repo; this file replaces it.

## 1. Storage of "both"

ONE task_log row, never two. `completed_by` is a single comma-joined string.
Four possible values: `''` (unknown), `'Frankie'`, `'Meredith'`, `'Frankie,Meredith'`.
Order is canonical because it is rebuilt from `_PEOPLE = ['Frankie','Meredith']`.

Parsed by three helpers:
- `peopleOf(v)` — splits on comma
- `hasPerson(v,name)` — substring test via indexOf (NOT an exact token match)
- `peopleLabel(v)` — joins with ' & ', returns 'Unknown' when empty

Reassign-to-both: `submitReassign()` posts `reassignCompletion` with
`completed_by:'Frankie,Meredith'`. Server `reassignCompletion` finds the row by
log_id and calls `updateRow` — an in-place edit, never an append. It also updates
scope on the log row and reclassifies the parent task when scope changes.

Consequence worth remembering: if a completion was already duplicated, reassigning
fixes only the row you acted on. That produces "one row says Both, one says her",
which looks like reassign created a row but did not.

## 2. Metrics

All three surfaces filter through `isCompletionLog` + `statsScope` + a day cutoff.

`renderStats()` does ONE pass and pushes into both buckets independently:
```
if(hasPerson(l.completed_by,'Frankie'))_drillF.push(l);
if(hasPerson(l.completed_by,'Meredith'))_drillM.push(l);
```
So a "both" completion counts toward EACH person and once toward the total.
"Total completed" counts TASKS; the per-person cards count CREDIT. The two
per-person numbers can legitimately sum to more than the total. By design.

Drill-down (`openMetricDrillDown`) reuses `_drillF`/`_drillM`/`_drillAll` verbatim,
so it inherits the behaviour. A "both" row appears in both lists.

Trend chart (`renderTrendChart`) does the same and DOES increment both lines:
```
if(hasPerson(l.completed_by,'Frankie'))weeks[wi].f++;
if(hasPerson(l.completed_by,'Meredith'))weeks[wi].m++;
```
Buckets are rolling 7-day windows from the cutoff, not calendar weeks.

## 3. Assignment vs credit

`owner` on the tasks sheet, same four values as completed_by. `''` means
"either of us" and is the default, distinct from unassigned.

Set in `submitTask`: `owner: pickedScope==='personal' ? currentUser : pickedOwner`.
`pickOwner()` toggles names independently, `''` is exclusive, order is canonical,
deselecting the last name falls back to `''`. `syncOwnerBtns()` is the single
source of button state.

Credit derives from owner through exactly one function:
```
function creditFor(t){var o=String(t.owner||'');return o.indexOf(',')>=0?o:currentUser;}
```
Jointly owned => both, whoever taps. Everything else => whoever tapped, REGARDLESS
of assignee. A task owned by Meredith completed by Frankie credits Frankie.
No way to choose credit at completion time. Server never derives credit; it writes
`data.completed_by` straight through.

## 4. Completion flow (pre-v9)

Fires IMMEDIATELY. No delay, no pending window, no confirmation.

Three entry points, all into `handleComplete(t)`:
- circle tap: click listener on `.circ`, stopPropagation, batch-mode branch first
- swipe right: `attachSwipe` touchend past 72px THRESH, `setTimeout(...,160)` purely
  to let the slide-out animation play, not a cancellation window
- the per-card action menu item `a==='complete'`

Inside `handleComplete`:
1. `if(_completing.has(tid))return;` duplicate guard
2. inner `attempt()` (re-runnable, doubles as the retry handler)
3. `_completing.add(tid)` and `_recentlyCompleted.add(tid)`
4. card collapses via inline styles after a 10ms tick; element stays in the DOM
5. `setSyncState('loading','Logging...')`
6. `apiPost` fires in the SAME synchronous block as the tap
7. success: release `_completing`, `scheduleBgSync(SYNC_FAST)`. Deliberately does
   NOT release `_recentlyCompleted`.
8. failure: release both, restore card, `actionFailed` with a retry toast

Recurring due dates advance ONLY on the server, ONLY after the response.
`handleComplete` performs zero local mutation of due_date or status. The client
learns the new date when the reconcile payload replaces state.tasks wholesale.

## 5. Batch complete

Same `creditFor` rule per task, no way to choose credit.
`batchCompleteSelected` builds picks with per-task `completed_by:creditFor(t)` and
posts `{tasks:picks, completed_by:currentUser}`. Server resolves per-task first:
```
completeTask(Object.assign({ completed_by: data.completed_by }, t))
```
`Object.assign` puts `t` last so the per-task value wins.

## 6. Personal scope

Two mechanisms agree. `submitTask` forces `owner: currentUser` for personal and
hides the owner picker. `creditFor` sees a single-name owner and returns
`currentUser`. Personal tasks are filtered to their owner in the list, so owner
and completer are the same person in practice.

The one leak: the history reassign picker does NOT restrict by scope, so a personal
completion can be set to 'Frankie,Meredith' after the fact.

## 7. User colors — TWO CONTRADICTORY SCHEMES (16 rules)

Base vars: `--purple:#5B4BB0` / `--purple-light:#EFECFB`, `--yellow:#B58A0E` /
`--yellow-light:#FBF1CF`, `--green:#1A8C68`, `--blue:#2B6CB0`, `--terra:#C25E3A`.

Scheme A, purple = Frankie / yellow = Meredith, used in FIVE places:
- login buttons `.who-btn.sel-f` / `.sel-m`
- login avatars `.who-avatar` (solid purple / solid yellow, white text)
- owner picker chips `.who-opt.sel-f` / `.sel-m`
- card owner circles `.who-f` / `.who-m` (light fill, dark text)
- stats bars `.bar-fill.pur` / `.yel`
- trend chart polylines `stroke="var(--purple)"` / `var(--yellow)`

Scheme B, green = Frankie / blue = Meredith, used in ONE place:
- history dots `.ldot` (green default = Frankie), `.ldot.b` (blue = Meredith),
  `.ldot.n` (neutral), `.ldot.both` (green/blue gradient)
Driven by `personDot(v)` which returns 'both' | '' | 'b' | 'n'. Frankie is encoded
as the EMPTY STRING, i.e. the absence of a modifier class. Easy to miss.

Joint treatment also differs: cards use a purple/yellow gradient plus an `F&M`
::before glyph; history uses a green/blue gradient with no glyph.

"Either of us" has a third colour, `--terra:#C25E3A` (`.who-either`,
`.who-opt.sel-either`). The `.circ` tap target itself carries NO per-user colour.

## 8. Uncomplete path

Activity history is the ONLY route. Re-tapping the circle cannot uncomplete,
because the card is filtered out of the list entirely once completed.

Activity > either history tab > row's three-dot menu > "Mark as incomplete" >
`markIncomplete()` > blocking `confirm()` > `apiPost('uncompleteTask')`.
Server deletes the log row, then restores the task: recurring recomputes via
`computeNextDue`, one-off restores original due_date, both fall back to today.

`markIncomplete` has NO optimistic update and NO rollback, unlike every other
action. Same menu also offers "Delete this history entry" and "Reassign".

## 9. Background sync and state caching

Optimistic local mutation + debounced full-state reconcile. No incremental merge;
every successful sync replaces the top-level arrays wholesale.

`scheduleBgSync(delay)` is a DEBOUNCE (clears the prior timer). `SYNC_FAST=700`,
`SYNC_SLOW=3000` (the default). 16 success call sites pass SYNC_FAST. After a
completion, refreshData fires 700ms after the server ACK, not after the tap.

NO periodic/interval sync. Nothing polls. Other triggers:
- once at login, alongside a silent `ping` to warm the container
- manual refresh buttons (topbar, mobile sub-header, mobile action sheet)
- `visibilitychange` when visible AND `Date.now()-_lastFetch > 60000`

Optimistic mutations: add pushes a `tmp_` record with `_temp:true`; edit assigns
over the object after snapshotting; delete filters the array; COMPLETE does not
mutate the task at all, only adds to `_recentlyCompleted` which the render filters
on. That asymmetry matters — after a completion, local state still holds the old
due_date and status.

Stale-sync guard at the top of refreshData's success handler:
```
if(writesPending()||_lastWriteAt>syncStart){ ...renderAll();scheduleBgSync();return; }
```
`apiPost` records each POST start in `_inFlightWrites` and on settle removes it and
stamps `_lastWriteAt`. `writesPending()` expires entries older than
`API_TIMEOUT+5000` (30s). That cutoff MUST exceed API_TIMEOUT (25s).

`_recentlyCompleted.clear()` happens at exactly ONE place: after the guard passes,
before the arrays are replaced. Only moment where server state is authoritative.

Grocery 12h cleanup deletes are deferred through `setTimeout(...,0)`; firing them
inline stamped `_lastWriteAt` mid-sync and made the NEXT sync discard its payload.

## 10. Duplicate completion guards

THREE client-side guards, ZERO server-side dedup.
1. `_completing` Set — `handleComplete` returns early if the id is present. Covers
   all three entry points, so double-tap and swipe-then-tap are both covered.
2. `_recentlyCompleted` retained across the success callback; only the payload
   apply clears it.
3. `writesPending()` cutoff of API_TIMEOUT+5000.

Server: `completeTask` appends unconditionally. `newId` is timestamp + random, so
every write yields a distinct row. No uniqueness constraint, no idempotency key.

`debugDuplicateCompletions()` groups completions by task_id + LOCAL day
(`localDay_` via `Utilities.formatDate` against `TZ='America/Denver'`), prints the
gap, flags gaps <= 60s as SUSPECT. Read-only. Its first version grouped by UTC day
and was wrong in BOTH directions: false positives (nightly task at 10:30pm + 3pm
next day share a UTC date) and false negatives (same local evening straddling UTC
midnight never compared). 4 of the first 7 reported duplicates were legitimate.

Historical causes of real duplicates:
- CONFIRMED and fixed: early release of `_recentlyCompleted` on the success path
  for scheduled/interval. Server advances due_date while local state holds the old
  one, so the finished card returned to Today until the reconcile landed. 10-20s
  window on a slow sync. Both live duplicates (10s and 22s apart) fit exactly.
- Fixed: `writesPending` cutoff was 15s while API_TIMEOUT is 25s, so a live write
  stopped counting and a stale payload cleared `_recentlyCompleted`.
- Ruled out by data: timeout-then-retry. Observed gaps were shorter than the 25s
  timeout. Still a live path in principle; on a genuine timeout the client rolls
  back and offers retry even though the outcome is unknown. Open design issue.
- Not a duplicate mechanism but presented as inflated counts: snooze/edit marker
  rows counted as completions pre-v8.9 (101 of 308 rows), fixed by the raw-cell
  filter and the archive-and-purge cleanup.

## 11. Three-dot overflow menu contents (for Section 10 removal)

`#mob-more-btn` opens `#modal-mobile-menu`, which contains exactly:
- Refresh (`refreshData()`)
- Select multiple tasks (`enterBatch()`)
- Cancel

BOTH already exist as standalone icons in the same `.mob-hdr-actions` bar
(`select-btn` and the refresh button). Nothing else is hidden in that menu, so
removing it loses no functionality.
