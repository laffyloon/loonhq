# Optimization Plan

**Baseline:** build pass | tests 413 passing, 0 failing (276 frontend, 75 server, 62 browser) | reviewed: full repo | 2026-08-04

**Project intent:** LoonHQ is a private household task app for two people (Frankie and Meredith) in Denver. It is a single HTML file served by GitHub Pages, talking to a Google Apps Script endpoint backed by a Google Sheet. There is no server of its own, no build pipeline beyond one Python script, and no npm dependencies. It is used daily on phones, often on a flaky connection. **[inferred]** Priorities, based on the last three weeks of commits, are: never lose or double-count a completion, stay fast enough to tick a task off in a second, and never require Frankie to touch code.

**Summary:** 1 Critical, 1 High, 6 Medium, 3 Low. Recommended order: Steps 1, 2, 3 first.

A note on what this review found overall: **the app's own code is fast.** Rendering 150 task cards takes 17ms and a credit-cycle tap takes about 1ms. The things that actually cost time and risk are all at the edges: what the page waits for before it can start, how much it has to download, and who is allowed to talk to the database. CLAUDE.md currently lists "event delegation on task cards" as the biggest remaining performance win; the measurements below do not support that, and Step 12 corrects the record.

---

## Critical

### [ ] Step 1: Both login PINs and the database endpoint are readable by anyone who finds the site
- **Finding:** `index.html` (built from `build_v4.py`) — the file served publicly contains `PINS={Frankie:'225522',Meredith:'8627'}` in plain text, along with the Apps Script `/exec` URL. | Evidence: `Verified` — `grep -o "PINS={[^}]*}" index.html` returns both PINs; the endpoint appears once in the same file.
- **Impact:** Anyone who loads the site can read both PINs by viewing the page source, so the login screen stops anyone casual and nobody else. Worse, the Apps Script endpoint accepts requests from anyone who has the URL, with no check of who is asking. That means a stranger with the address could read the entire household database (every task, note, and completion) or write to it, including deleting tasks, without ever seeing the login screen. The PIN is decoration; the real front door has no lock.
- **Task:** Decide how much this matters to you, then pick one of three routes. (a) Accept it and rely on the URL staying unknown, but stop pretending the PIN is security. (b) Make the site itself private, which on GitHub Pages means moving off the free public tier or putting it behind something like Cloudflare Access. (c) Add a shared secret that the app sends with every request and the Apps Script checks before doing anything, which stops strangers hitting the endpoint directly even if they find the URL. Route (c) is the smallest real improvement, though the secret still ships inside the page, so it raises the bar rather than closing the hole.
- **Size:** Small for (a) or (c), Large for (b)
- **Tradeoff:** Route (c) adds a check to every server call and means a rotation chore if the secret ever leaks; it does not defend against someone who reads the page source, only against someone who found the endpoint some other way. Route (b) is the only one that genuinely closes it, and it costs money or setup complexity. Route (a) costs nothing but leaves the data one guessed URL away. Given that this is a household chore list rather than financial or medical data, I would take route (c) and stop treating the PIN as protection, but the call is yours because only you know how much the contents matter.
- **Assumes:** That the GitHub Pages site is publicly reachable. If the repository and Pages site are private, this drops from Critical to Low. **Confirm this before doing anything else.**
- **Files:**
  - `build_v4.py` — where the PIN map and endpoint are emitted
  - `LoonHQ_AppScript_v9.js` — where a shared-secret check would go, in `doGet` and `doPost`
- **Verify:** Open the deployed site, view source, search for `PINS`. Expected after route (c): the PIN map may still be visible, but a request to the `/exec` URL without the secret returns an error instead of data. Test with a browser tab pointed at the endpoint directly.
- **Rollback:** `git revert` the commit; redeploy the previous Apps Script version from Manage deployments.
- **Depends on:** None
- **Manual steps:** Apps Script redeploy if you take route (c).

---

## High

### [ ] Step 2: The app cannot start until two external services respond
- **Finding:** `build_v4.py` head section — three render-blocking external resources: two Google Fonts stylesheets and the Tabler icon font from jsdelivr. | Evidence: `Verified` — Playwright, local server, 40-task fixture: when those requests fail immediately, `DOMContentLoaded` is **106ms**. When they hang for six seconds, `DOMContentLoaded` is **6,029ms**. The app's own 267KB parses and runs in roughly 60ms either way.
- **Impact:** On a good connection this costs nothing. On a bad one, the app is frozen on a blank or unstyled screen for as long as the slowest of two third-party servers takes to answer, even though every byte of the app itself has already arrived. You have been debugging slow saves for weeks; this is a separate stall that happens before the app even runs, and it is invisible in the Apps Script logs. If the icon CDN fails outright, every icon in the app disappears, because they are font glyphs rather than images.
- **Task:** Stop letting those two services gate startup. Load the fonts without blocking (so text appears immediately in a fallback font and swaps when the real one arrives), and either self-host the handful of icons actually used or inline them, so a CDN outage cannot strip the interface.
- **Size:** Medium
- **Tradeoff:** Non-blocking fonts mean a brief flash where text is in a system font before the real one loads. Self-hosting icons adds weight to the file you already want smaller, though only for the icons actually used rather than the whole set. You gain an app that starts in a tenth of a second regardless of network conditions and never loses its icons. I would do it; the flash is a fraction of a second and the current behaviour is a hard stall.
- **Assumes:** Nothing.
- **Files:**
  - `build_v4.py` — the `<head>` block
- **Verify:** Re-run the Playwright measurement with the CDN requests set to hang. `DOMContentLoaded` should drop from **6,029ms to under 300ms**, and the app should still show its icons.
- **Rollback:** `git revert`.
- **Depends on:** None
- **Manual steps:** None.

---

## Medium

### [x] Step 3: The logo is embedded three times, and is a quarter of the download  — **DONE, 269.5KB to 225.4KB (44KB saved, 16%)**
- **Finding:** `build_v4.py:571,588,612` — the same 22KB image data URI is written into the page three times (login screen, sidebar, mobile header). | Evidence: `Verified` — `index.html` is 267.2KB total; the three copies account for 66.8KB, exactly 25%.
- **Impact:** Every visit downloads the same picture three times over. On a phone on cellular that is a needless quarter of the page weight, on a file that is already large.
- **Task:** Embed the image once and have all three places refer to that single copy, for example by defining it once as a CSS variable and using it as a background image.
- **Size:** Small
- **Tradeoff:** Background images are slightly less convenient than `<img>` tags for accessibility, so the three spots need explicit labels for screen readers. Saves roughly 45KB, about 17% of the page.
- **Assumes:** Nothing.
- **Files:**
  - `build_v4.py` — the three logo insertion points and the stylesheet
- **Verify:** `ls -l index.html` should show the file dropping from **267KB to about 222KB**, and the browser harness logo checks must still pass: `NODE_PATH=$(npm root -g) node e2e_harness.js`.
- **Result:** 269.5KB to 225.4KB. Image data appears exactly once and decodes to a valid 17,090-byte WebP. All suites green: 276 frontend, 75 server, 64 browser (2 new logo checks added). Note: completing this exposed a latent build bug, see Deferred.
- **Rollback:** `git revert`.
- **Depends on:** None
- **Manual steps:** None.

### [ ] Step 4: A leftover function still encodes the old, now-wrong rule for who gets credit
- **Finding:** `build_v4.py` — `creditFor(t)` is defined but called zero times. | Evidence: `Verified` — a script over the built output found 171 defined functions and 7 never called; `creditFor` is one of them.
- **Impact:** No user-visible effect today. The danger is for the next change: `creditFor` says "whoever tapped gets credit unless the task is owned by both", which is the pre-v9 rule and directly contradicts the v9 rule now in `defaultCreditFor` ("credit follows the assignment"). Anyone reading the code, including a future me, could reasonably call it and silently reintroduce the old behaviour. CLAUDE.md currently says it is kept "for legacy paths", which is no longer true.
- **Task:** Delete `creditFor` and correct the line in CLAUDE.md that says it is still in use.
- **Size:** Small
- **Tradeoff:** No meaningful tradeoff. It is unreachable code.
- **Assumes:** Nothing. Verified by call-count across both the built JavaScript and the HTML attributes.
- **Files:**
  - `build_v4.py` — remove the function
  - `CLAUDE.md` — correct the note
- **Verify:** `node qa_harness.js` still reports 276 passing.
- **Rollback:** `git revert`.
- **Depends on:** None
- **Manual steps:** None.

### [ ] Step 5: The stale-data warning never appears while you are actually using the app
- **Finding:** `build_v4.py` — `checkStale()` is defined but never called. The only thing that shows the badge is the return-from-background handler. | Evidence: `Verified` — same call-count scan; `showStaleBadge` is reached only from the `visibilitychange` listener.
- **Impact:** The badge does its job when you switch back to the app from elsewhere, but not otherwise. If you leave LoonHQ open on the counter for ten minutes while Meredith ticks things off on her phone, you get no warning that what you are looking at is out of date, which is the exact situation the feature was meant to catch. It half works.
- **Task:** Have the app check staleness periodically while it is open, not only on return from background, and call the existing `checkStale` from that check.
- **Size:** Small
- **Tradeoff:** A recurring timer while the app is open, which is negligible in cost. The badge will appear more often, which is the point, but it does mean seeing it during long idle sessions.
- **Assumes:** Nothing.
- **Files:**
  - `build_v4.py` — add the periodic check, wire `checkStale`
- **Verify:** In the browser harness, load the app, force `_lastFetch` back by 40 seconds, wait for one check interval, and confirm `#stale-badge` gains the `on` class. Add this as a browser check.
- **Rollback:** `git revert`.
- **Depends on:** None
- **Manual steps:** None.

### [ ] Step 6: The undo button has no automated test, and undoes one task per request
- **Finding:** `build_v4.py` `undoLastCompletion` — zero references in `qa_harness.js`; one glancing reference in `e2e_harness.js`. It issues one `uncompleteTask` request per task via `Promise.all`. | Evidence: `Verified` — `grep -c "undoLastCompletion\|showUndoToast" qa_harness.js` returns 0.
- **Impact:** Undo is the safety net for the entire new completion system, and it is the least tested thing in it. If it breaks, nothing catches it until you tap Undo and it silently fails. Separately, undoing a batch of ten tasks fires ten separate requests to a backend that processes them one at a time, so a bulk undo will be visibly slow, which is exactly the pattern that made deletes take 20-30 seconds before.
- **Task:** Add tests covering undo: that it fires, that it removes the completion, that the card comes back, and that a failed undo says so. Then add a server action that undoes several completions in one request, mirroring the existing `batchDelete`.
- **Size:** Medium
- **Tradeoff:** The batch undo means another Apps Script deploy. Split it: add the tests first as their own step (no deploy needed), and only batch the requests once the tests are protecting the path.
- **Assumes:** Nothing.
- **Files:**
  - `qa_harness.js` — undo coverage
  - `build_v4.py` — batched undo call
  - `LoonHQ_AppScript_v9.js` — a `batchUncomplete` action
- **Verify:** `node qa_harness.js` with the new tests passing, and each new test confirmed to fail when the undo path is deliberately broken.
- **Rollback:** `git revert`; redeploy the prior Apps Script version.
- **Depends on:** None
- **Manual steps:** Apps Script redeploy for the batched part.

### [ ] Step 7: A failed batch of completions does not behave the way the spec asked
- **Finding:** `build_v4.py` `flushPending` catch block — on failure it clears the tasks and shows "Couldn't confirm". | Evidence: `Traced` — read the catch path; confirmed by the browser check "a failed completion leaves nothing pending or marked committed".
- **Impact:** This is a deliberate choice I made, and you should confirm it. The v9 spec said two different things: Section 12E said a failed commit must not retry and the card returns to normal, and Section 12F said a failed batch should restore all tasks to pending so the user can retry from the undo toast. I implemented 12E, because automatically retrying a write whose outcome is unknown is exactly how this app produced duplicate completions before. The consequence is that if a batch fails, you have to tick those tasks again yourself rather than tapping once to retry.
- **Task:** Confirm which behaviour you want. If you want 12F, the safe version is to restore the cards to pending but require an explicit tap to re-commit, never an automatic retry.
- **Size:** Small
- **Tradeoff:** Restoring to pending is more convenient after a failure but reintroduces a state where a commit can fire without a fresh deliberate action, which is the shape of the old duplicate bug. I would keep the current behaviour and accept the extra taps after a rare failure.
- **Assumes:** Nothing.
- **Files:**
  - `build_v4.py` — `flushPending` catch block, only if you want it changed
- **Verify:** No change needed unless you choose 12F, in which case a browser check that a failed batch leaves the cards pending and does not write.
- **Rollback:** `git revert`.
- **Depends on:** None
- **Manual steps:** None. **This step is a decision, not code.**

### [ ] Step 8: Dead code left behind by the v9 changes
- **Finding:** `build_v4.py` — `openMobileMenu` (its button was removed in v9, and the modal it opens no longer exists), `cancelAllPending` (never wired), `_completing` (superseded by the pending map), `toggleLegend` (pre-existing), plus `modal-mobile-menu` still listed in `_MODAL_BG_IDS`. | Evidence: `Verified` — call-count scan; `grep -n "modal-mobile-menu" build_v4.py` shows the id listed but the element gone.
- **Impact:** No user-visible effect. `openMobileMenu` would throw if anything called it, since the modal it opens was deleted. The cost is confusion and risk during the next change: five functions that look live but are not.
- **Task:** Remove them and the stale id from the modal list.
- **Size:** Small
- **Tradeoff:** No meaningful tradeoff, provided the call-count check is repeated after removal to confirm nothing referenced them via an HTML attribute.
- **Assumes:** Nothing. The scan covered both JavaScript calls and inline `onclick` attributes.
- **Files:**
  - `build_v4.py`
- **Verify:** `node qa_harness.js` 276 passing, `node e2e_harness.js` 62 passing.
- **Rollback:** `git revert`.
- **Depends on:** Step 4 (same file area, do them together or in sequence)
- **Manual steps:** None.

---

## Low

### [ ] Step 9: One "both" indicator still shows letters after the v9 rule removed them
- **Finding:** `build_v4.py:1089` — the reassign dialog's "Both" button still renders the text `F&M`. | Evidence: `Verified` — `grep -o 'id="reassign-btn-both".\{0,120\}' build_v4.py`.
- **Impact:** Cosmetic inconsistency. Everywhere else in v9, "both" is a diagonal colour split with no letters. This one dialog still shows the old style, so the app looks like two different designers touched it.
- **Task:** Make that button use the same split-colour indicator as everywhere else.
- **Size:** Small
- **Tradeoff:** No meaningful tradeoff.
- **Assumes:** Nothing.
- **Files:** `build_v4.py`
- **Verify:** Browser check asserting the reassign "Both" button has no text content and uses a gradient background.
- **Rollback:** `git revert`.
- **Depends on:** None
- **Manual steps:** None.

### [ ] Step 10: Nothing runs the tests before a change goes live
- **Finding:** No `.github/` directory; GitHub Pages serves `main` directly. | Evidence: `Verified` — `ls -a .github` returns nothing.
- **Impact:** The 413 tests only run if someone remembers to run them. Anything pushed to `main` is live to both of you within a minute, tested or not. Given that most of this project's history is bug fixes, that is the one guard rail most worth having.
- **Task:** Add a GitHub Action that runs the build, the frontend tests, and the server tests on every push, and fails visibly.
- **Size:** Small
- **Tradeoff:** A minute of CI time per push, and the browser tests need a headless browser installed in CI, so start with the two fast suites and add the browser one only if it proves reliable there.
- **Assumes:** Nothing.
- **Files:** `.github/workflows/test.yml` (new)
- **Verify:** Push a deliberately broken change to a branch and confirm the Action fails.
- **Rollback:** Delete the workflow file.
- **Depends on:** None
- **Manual steps:** None.

### [ ] Step 11: The build output is committed alongside its source with nothing enforcing they match
- **Finding:** `index.html` is generated from `build_v4.py` and both are committed. | Evidence: `Verified` — they match right now (`diff` against a fresh build is clean).
- **Impact:** They match today only because the process was followed. If anyone edits `index.html` directly, or commits a `build_v4.py` change without rebuilding, the live app and the source silently diverge. CLAUDE.md warns against this in prose; nothing enforces it.
- **Task:** Have the CI check from Step 10 rebuild and fail if the result differs from the committed `index.html`.
- **Size:** Small
- **Tradeoff:** No meaningful tradeoff; it is three lines inside a job you are already running.
- **Assumes:** Nothing.
- **Files:** `.github/workflows/test.yml`
- **Verify:** Modify `build_v4.py` without rebuilding, push, confirm CI fails.
- **Rollback:** Remove the check.
- **Depends on:** Step 10
- **Manual steps:** None.

---

## Deferred

- **Latent build bug found and fixed during Step 3.** `CSS` in `build_v4.py` is a plain string, not an f-string, so a `{logo}` placeholder written into it was never substituted and shipped to the browser as literal text. The first attempt at Step 3 silently produced a page with no logo at all, caught only because the size check and the image-decode assertion both failed. Any future placeholder added to the CSS block has the same trap; the fix used an explicit replace at the point of insertion.
- **"Either of us" task circles still show `F·M`.** Pre-existing, not introduced by v9. The old design distinguished `F·M` (either) from `F&M` (both); v9 removed the letters from "both" only, as the spec asked. The result is that the only circle still showing letters is the "either of us" one, which could now read as "both" to a user. Worth a decision: drop the letters there too, or leave it.

- **Correct the performance note in CLAUDE.md.** It lists event delegation on task cards as "the biggest remaining perf win". Measurement says otherwise: 150 cards render in 17.2ms and a cycle tap costs about 1ms, with 6 listeners per card. The real costs are the blocked CDN (Step 2) and Apps Script round trips. Worth a one-line correction so the next session does not spend effort there.
- **`_recentCommit` entries are only cleaned when read.** Entries for tasks never looked at again persist for the session. Negligible for a two-person task list; would matter at thousands of tasks.
- **`hasPerson` uses substring matching, not exact name matching.** Safe for "Frankie" and "Meredith", would break if a third person's name contained another's.
- **The reassign dialog lets a personal completion be credited to both people**, which the rest of the app treats as impossible. Pre-existing, noted in the investigation file.
- **Undo depends on the server returning log ids.** If an older Apps Script version is ever redeployed, undo would restore the task but leave the completion in history. Only reachable by deploying backwards.
- **No README.** CLAUDE.md is 582 lines and serves as the only documentation; it is genuinely good, but it is written for an AI assistant rather than a person picking the project up.

## Won't fix

- **The single 267KB HTML file.** It reads unfashionably but it works, has no build dependencies, and deploys by pushing one file. Splitting it would add a bundler and a toolchain to a project whose main virtue is not having one. Step 3 addresses the only part of its size that is genuinely wasted.
- **Storing "both" as the string `"Frankie,Meredith"`.** A purist would want a list or a separate credit table. The current form is understood by every consumer, is documented, and changing it would touch the sheet, the server, and every metric.
- **`build_v4.py` being a 205KB Python file that prints HTML.** It is an unusual choice, but it is the source of truth, it is consistent, and the tests cover its output.
- **The Apps Script harness being a mock rather than the real runtime.** It cannot prove Google's behaviour, and the container-reuse bug proved that. But it now models that failure explicitly, and the alternative is having no server tests at all.

## Open questions

1. **Is the GitHub Pages site public?** This decides whether Step 1 is Critical or Low, and it is the single most important thing to confirm before acting on this plan.
2. **On Step 7, which failure behaviour do you want?** Current: a failed completion clears and you re-tick. Alternative: cards stay pending for a one-tap retry, at the cost of reintroducing a state where a write can fire without a fresh deliberate action.
3. **Is the `task_log_archive` tab still needed?** It holds the 101 rows purged on 2026-07-30. If you are satisfied the cleanup was correct, it can go; if you want the snooze history for a future "task health" feature, it should stay and be documented as intentional.
