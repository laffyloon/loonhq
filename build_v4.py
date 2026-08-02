#!/usr/bin/env python3
"""LoonHQ v8.12 build. Source of truth for index.html: edit this file, then run
   python3 build_v4.py. Never edit index.html directly."""

API = "https://script.google.com/macros/s/AKfycbzL362NjJliCBSbR9uIo1lacPEk5uYw1C-SO8OvlLQ2QMCVC3lFh7y8Gs8z0Gn0lVSK/exec"

# The logo lives IN the repo. It used to be read from /home/claude/logo_uri.txt, a path
# outside the repo; on any other machine that file is missing or empty, so every build there
# silently emitted src="" and the logo vanished. It was lost that way on 2026-07-13 and
# recovered from commit 240e11e on 2026-07-30. Fail loudly rather than ship a blank logo.
import os as _os
_LOGO_PATH = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "logo_uri.txt")
with open(_LOGO_PATH) as f: LOGO = f.read().strip()
if not LOGO.startswith("data:image/"):
    raise SystemExit("build aborted: %s is missing or not a data URI (logo would render blank)" % _LOGO_PATH)
with open("/home/claude/icon_uri.txt") as f: ICON = f.read().strip()

# ─── CSS ──────────────────────────────────────────────────────────────────────
CSS = """
:root{
  --bg:#F7F5F0;--bg2:#EEEAE3;--bg3:#E4E0D8;--card:#FFFFFF;
  --text:#1C1A17;--text2:#6B6760;--text3:#A09C97;
  --border:#DDD9D2;--border2:#CBC7BF;
  --green:#1A8C68;--green-light:#E5F5EF;--green-dark:#0F5A43;
  --red:#C84040;--red-light:#FAEAEA;
  --amber:#C97A10;--amber-light:#FDF2E0;
  --blue:#2B6CB0;--blue-light:#EBF4FF;
  --purple:#5B4BB0;--purple-light:#EFECFB;
  --yellow:#B58A0E;--yellow-light:#FBF1CF;
  --terra:#C25E3A;--terra-light:#FAECE5;
  --slate:#2D6A9F;--slate-light:#E2EEF8;
  --magenta:#BE185D;--magenta-light:#FCE7F3;
  --radius:10px;--radius-sm:6px;
  font-family:'DM Sans',sans-serif;
  --safe-bottom:env(safe-area-inset-bottom,0px);
  --safe-top:env(safe-area-inset-top,0px);
}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
html,body{overscroll-behavior:none}
body{background:var(--bg);color:var(--text);font-size:14px;line-height:1.45;min-height:100vh;min-height:100dvh}
button{font-family:inherit}input,select,textarea{font-family:inherit;-webkit-appearance:none;appearance:none}
.gone{display:none!important}

/* LOGIN */
.login{min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;background:linear-gradient(180deg,#F7F5F0 0%,#E5F5EF 100%)}
.login-logo{margin-bottom:20px}
.login-title{font-size:24px;font-weight:600;letter-spacing:-.5px;margin-bottom:6px}
.login-sub{font-size:14px;color:var(--text2);margin-bottom:28px;text-align:center}
.who-buttons{display:flex;gap:10px;margin-bottom:24px}
.who-btn{padding:14px 24px;border-radius:14px;border:2px solid var(--border);background:var(--card);font-size:15px;font-weight:500;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:8px;min-width:120px;transition:all .15s}
.who-btn.sel-f{border-color:var(--purple);background:var(--purple-light);color:var(--purple)}
.who-btn.sel-m{border-color:var(--yellow);background:var(--yellow-light);color:var(--yellow)}
.who-avatar{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:600;background:var(--bg2);color:var(--text2)}
.who-btn.sel-f .who-avatar{background:var(--purple);color:#fff}
.who-btn.sel-m .who-avatar{background:var(--yellow);color:#fff}
.pin-wrap{display:flex;flex-direction:column;align-items:center;gap:14px;width:100%;max-width:320px}
.pin-label{font-size:13px;color:var(--text2)}
.pin-input{width:100%;padding:14px 16px;font-size:22px;text-align:center;letter-spacing:.4em;border:1.5px solid var(--border);border-radius:12px;background:var(--card);color:var(--text);outline:none;font-family:'DM Mono',monospace}
.pin-input:focus{border-color:var(--green)}
.pin-err{font-size:12.5px;color:var(--red);min-height:18px}

/* APP SHELL */
.app{display:flex;height:100vh;height:100dvh}
@media(min-width:769px){
  .app{height:720px;max-height:90vh;width:980px;max-width:96vw;margin:auto;border-radius:14px;overflow:hidden;box-shadow:0 6px 50px rgba(0,0,0,.14);border:1px solid var(--border)}
  body{display:flex;align-items:center;justify-content:center;padding:20px;background:#E8E4DC}
}
.sidebar{width:204px;flex-shrink:0;background:var(--bg2);border-right:1px solid var(--border);display:flex;flex-direction:column}
.sb-top{padding:14px 14px 12px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px}
.sb-logo-icon{width:36px;height:36px;flex-shrink:0;border-radius:9px}
.sb-logo-text{font-size:15px;font-weight:600;letter-spacing:-.3px}
.sb-logo-text span{color:var(--green)}
.sb-addr{font-size:10.5px;color:var(--text3);font-family:'DM Mono',monospace;margin-top:1px}
.user-row{padding:10px 14px;display:flex;align-items:center;gap:8px;cursor:pointer;border-bottom:1px solid var(--border);transition:background .12s}
.user-row:hover{background:var(--bg3)}
.user-av{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex-shrink:0}
.user-av.f{background:var(--purple-light);color:var(--purple)}
.user-av.m{background:var(--yellow-light);color:var(--yellow)}
.user-info{flex:1;min-width:0}
.user-name{font-size:13px;font-weight:500}
.user-action{font-size:10.5px;color:var(--text3);margin-top:1px}
.user-row i{color:var(--text3);font-size:14px}
.nav-grp{padding:8px 0}
.nav-grp-lbl{font-size:9.5px;color:var(--text3);padding:0 14px 4px;letter-spacing:.06em;text-transform:uppercase;font-weight:500}
.nav-item{display:flex;align-items:center;gap:8px;padding:8px 14px;font-size:13.5px;color:var(--text2);cursor:pointer;border-left:2px solid transparent;transition:all .12s}
.nav-item:hover{background:var(--bg3);color:var(--text)}
.nav-item.on{background:var(--card);color:var(--text);font-weight:500;border-left-color:var(--green)}
.nav-item i{font-size:17px}
.sync-status{margin-top:auto;padding:10px 14px;font-size:10.5px;color:var(--text3);display:flex;align-items:center;gap:6px;border-top:1px solid var(--border)}
.sync-dot{width:7px;height:7px;border-radius:50%;background:var(--green);flex-shrink:0}
.sync-dot.err{background:var(--red)}.sync-dot.loading{background:var(--amber);animation:pulse 1s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
/* A pending card must read as 'not saved yet', not as a malfunction. It used to run
   pulse 1s infinite, flashing opacity between 1 and .3 for as long as the sync took,
   which looked exactly like a ghost fading in and out. Static dim, no animation. */
.tc.loading{opacity:.6}
.tc.loading .tn::after{content:' saving...';font-size:11px;color:var(--text3);letter-spacing:.02em}
.toast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(12px);background:rgba(30,30,30,.95);color:#fff;padding:9px 16px;border-radius:8px;font-size:13px;opacity:0;transition:opacity .22s,transform .22s;z-index:9999;pointer-events:none;white-space:nowrap;max-width:90vw;text-align:center}
.toast.on{opacity:1;transform:translateX(-50%) translateY(0)}
.toast.tappable{pointer-events:auto;cursor:pointer;text-decoration:none}
.toast.tappable:active{opacity:.8}

.main{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative;background:var(--bg);min-width:0}
.topbar{padding:12px 16px;background:var(--card);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;padding-top:calc(12px + var(--safe-top))}
.pg-title{font-size:16px;font-weight:600;letter-spacing:-.2px}
.top-actions{display:flex;gap:6px;align-items:center}
.btn{font-size:12.5px;padding:6px 11px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--card);color:var(--text2);cursor:pointer;display:inline-flex;align-items:center;gap:4px;transition:all .12s}
.btn:hover{background:var(--bg2);color:var(--text)}
.btn.primary{background:var(--green);color:#fff;border-color:var(--green)}
.btn.primary:hover{background:var(--green-dark)}
.btn.danger{background:var(--red-light);color:var(--red);border-color:var(--red)}
.btn-icon{padding:6px 8px}
.tab-bar{display:flex;background:var(--card);border-bottom:1px solid var(--border);flex-shrink:0;padding:0 4px;overflow-x:auto;scrollbar-width:none}
.tab-bar::-webkit-scrollbar{display:none}
.tab-btn{font-size:12.5px;padding:9px 12px;color:var(--text2);cursor:pointer;border:none;background:none;border-bottom:2px solid transparent;white-space:nowrap;transition:all .12s}
.tab-btn.on{color:var(--text);border-bottom-color:var(--green);font-weight:500}

/* PERSONAL BADGE on task cards */
.personal-badge{display:inline-flex;align-items:center;font-size:11px;color:var(--text3);padding:2px 5px;border-radius:8px;background:var(--bg2);border:1px solid var(--border)}
/* PROJECT TAG on task cards */
.proj-tag{display:inline-flex;align-items:center;gap:3px;font-size:11px;color:var(--text3);padding:2px 7px;border-radius:8px;background:var(--bg2);border:1px solid var(--border);cursor:pointer;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:0}
.proj-tag:hover{color:var(--text);border-color:var(--green)}
/* HISTORY BAR inside tasks view */
.hist-bar{padding:6px 12px;border-bottom:1px solid var(--border);background:var(--bg);display:flex;align-items:center;gap:6px;flex-shrink:0}
/* STATS SCOPE FILTER */
.stats-scope-bar{display:flex;gap:5px;align-items:center;margin-bottom:8px;flex-wrap:wrap}
.scope-pill{font-size:12px;padding:4px 11px;border-radius:16px;border:1px solid var(--border);background:var(--bg);color:var(--text2);cursor:pointer;font-family:inherit;transition:all .12s;display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
.scope-pill.on{background:var(--green);border-color:var(--green);color:#fff;font-weight:500}
/* REASSIGN PERSON DIMMED */
.qs-btn.dimmed{opacity:.35;filter:saturate(.2)}

.scroll{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:12px;-webkit-overflow-scrolling:touch;position:relative}
.view{display:flex;flex-direction:column;flex:1;overflow:hidden}
.loading-overlay{position:absolute;inset:0;background:rgba(247,245,240,.85);display:flex;align-items:center;justify-content:center;z-index:50;flex-direction:column;gap:10px}
.spinner{width:30px;height:30px;border:2.5px solid var(--border2);border-top-color:var(--green);border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* PTR */
.ptr-indicator{position:absolute;top:-50px;left:50%;transform:translateX(-50%);font-size:11px;color:var(--text2);display:flex;align-items:center;gap:6px;background:var(--card);padding:6px 12px;border-radius:20px;box-shadow:0 2px 8px rgba(0,0,0,.08);opacity:0;transition:all .2s;z-index:40}
.ptr-indicator.on{top:8px;opacity:1}
.ptr-indicator .spinner{width:14px;height:14px;border-width:2px}

/* LEGEND — compact single line */
.legend-wrap{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
.legend-trigger{display:flex;align-items:center;gap:7px;padding:9px 13px;cursor:pointer;user-select:none}
.legend-trigger:hover{background:var(--bg)}
.legend-trigger-text{font-size:12.5px;color:var(--text2);flex:1;min-width:0;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.legend-trigger-text strong{color:var(--text);font-weight:500}
.leg-chev{font-size:14px;color:var(--text3);transition:transform .2s;flex-shrink:0}
.leg-chev.open{transform:rotate(180deg)}
.legend-body{display:none;padding:10px 13px 13px;border-top:1px solid var(--border)}
.legend-body.open{display:block}
.legend-grid{display:grid;grid-template-columns:1fr;gap:9px}
@media(min-width:600px){.legend-grid{grid-template-columns:1fr 1fr}}
.legend-item{display:flex;align-items:flex-start;gap:7px}
.legend-tag{font-size:10px;padding:2px 7px;border-radius:20px;font-weight:500;white-space:nowrap;flex-shrink:0;margin-top:1px}
.legend-desc{font-size:12px;color:var(--text2);line-height:1.45}
.legend-desc strong{color:var(--text);font-weight:500}

/* STRIPES */
.stripe{padding-left:11px;display:flex;flex-direction:column;gap:6px;width:100%}
.stripe.r{border-left:3px solid var(--red)}.stripe.a{border-left:3px solid var(--amber)}
.stripe.b{border-left:3px solid var(--blue)}.stripe.t{border-left:3px solid var(--green)}
.stripe.o{border-left:3px solid var(--amber)}.stripe.g{border-left:3px solid var(--green)}.stripe.n{border-left:3px solid var(--border2)}
.stripe.p{border-left:3px solid var(--purple)}
.s-lbl{font-size:10.5px;font-weight:600;margin-bottom:3px;letter-spacing:.04em;text-transform:uppercase}
.stripe.r .s-lbl{color:var(--red)}.stripe.a .s-lbl{color:var(--amber)}
.stripe.b .s-lbl{color:var(--blue)}.stripe.t .s-lbl{color:var(--green-dark)}
.stripe.o .s-lbl{color:var(--amber)}.stripe.g .s-lbl{color:var(--green-dark)}.stripe.n .s-lbl{color:var(--text3)}
.stripe.p .s-lbl{color:var(--purple)}

/* ═══════════════════════════════════════════════
   TASK CARDS — THE CRITICAL FIX
   .ti must NOT have overflow:hidden — that was
   clipping everything to ~1char width.
   Use min-width:0 only, let text flow naturally.
   ═══════════════════════════════════════════════ */
.tc-wrap{position:relative;overflow:hidden;border-radius:var(--radius);width:100%;display:block}
.swipe-bg{position:absolute;inset:0;display:none;align-items:center;border-radius:var(--radius);z-index:1;pointer-events:none}
.swipe-complete{background:var(--green);justify-content:flex-start;padding-left:18px}
.swipe-snooze{background:var(--amber);justify-content:flex-end;padding-right:18px}
.swipe-complete-content,.swipe-snooze-content{display:none;align-items:center;gap:7px;color:#fff;font-weight:600;font-size:13px}
.swipe-complete-content i,.swipe-snooze-content i{font-size:22px;flex-shrink:0}
.swipe-complete .swipe-complete-content,.swipe-snooze .swipe-snooze-content{display:flex}
.tc{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:11px 12px;display:flex;align-items:flex-start;gap:10px;cursor:pointer;transition:transform .12s,border-color .12s;position:relative;z-index:2;touch-action:pan-y;width:100%}
.tc:hover{border-color:var(--border2)}
.tc.selected{border-color:var(--green);background:var(--green-light)}
.circ{width:22px;height:22px;border-radius:50%;border:2px solid var(--border2);flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .15s;cursor:pointer;margin-top:1px}
.circ:hover{border-color:var(--green)}
.circ.sel{background:var(--green);border-color:var(--green)}
.circ.sel::after{content:'\\2713';font-size:11px;color:#fff;font-weight:700}
/* KEY FIX: flex:1 + min-width:0 is correct. NO overflow:hidden here. */
.tcontent{flex:1;min-width:0}
.tn{font-size:14px;color:var(--text);line-height:1.35;word-break:break-word;overflow-wrap:anywhere}
.tm{display:flex;align-items:center;gap:5px;margin-top:5px;flex-wrap:wrap}
.tag{font-size:10.5px;padding:2px 8px;border-radius:20px;font-weight:500;white-space:nowrap;flex-shrink:0}
.tag-oneoff{background:var(--bg2);color:var(--text2)}
.tag-floating{background:var(--green-light);color:var(--green-dark)}
.tag-sched-w,.tag-sched-m{background:var(--purple-light);color:var(--purple)}
.th-row{display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)}
.th-row:last-child{border-bottom:none}
.th-icon{font-size:15px;flex-shrink:0;margin-top:1px}
.tag-interval{background:var(--slate-light);color:var(--slate)}
.tag-proj{background:var(--green-light);color:var(--green-dark)}
.due-tag{font-size:10.5px;padding:2px 8px;border-radius:20px;font-weight:600;white-space:nowrap;flex-shrink:0;display:inline-flex;align-items:center;gap:3px;background:#fff;border:1.5px solid}
.due-tag i{font-size:12px}
.due-overdue{border-color:var(--red);color:var(--red);background:var(--red-light);font-weight:600}
.due-today{border-color:var(--amber);color:var(--amber)}
.due-soon{border-color:var(--green);color:var(--green-dark)}
.due-week{border-color:var(--blue);color:var(--blue)}
.due-month{border-color:var(--purple);color:var(--purple)}
.due-future{border-color:var(--border2);color:var(--text3)}
/* mp: NO overflow:hidden, NO white-space:nowrap — wraps inside .tm naturally */
.mp{font-size:11px;color:var(--text3);display:inline-flex;align-items:center;gap:3px}
.mp i{font-size:13px;flex-shrink:0}
.owners{display:flex;gap:3px;flex-shrink:0;margin-top:1px}
.who{width:22px;height:22px;border-radius:50%;font-size:10px;font-weight:600;display:flex;align-items:center;justify-content:center}
.who-f{background:var(--purple-light);color:var(--purple)}
.who-m{background:var(--yellow-light);color:var(--yellow)}
.who-either{background:var(--terra-light);color:var(--terra)}
.who-either::before{content:'F\\00B7M';font-size:8px;font-weight:700;letter-spacing:-0.5px}
.who-both{background:linear-gradient(135deg,var(--purple-light) 50%,var(--yellow-light) 50%);color:var(--text2)}
.who-both::before{content:'F\\0026M';font-size:8px;font-weight:700;letter-spacing:-0.5px}
.task-menu-btn{background:none;border:none;color:var(--text3);font-size:18px;padding:0 2px;cursor:pointer;line-height:1;align-self:center;flex-shrink:0}
.task-menu-btn:hover{color:var(--text)}

/* SEARCH BAR */
.search-bar{padding:6px 12px;border-bottom:1px solid var(--border);background:var(--bg);display:none;align-items:center;gap:6px}
.search-bar.on{display:flex}
.search-input-wrap{flex:1;position:relative;display:flex;align-items:center}
.search-inp{width:100%;padding:7px 30px 7px 10px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:13.5px;background:var(--card);color:var(--text);outline:none}
.search-inp:focus{border-color:var(--green)}
.search-clear{position:absolute;right:6px;background:none;border:none;color:var(--text3);cursor:pointer;font-size:16px;padding:0;line-height:1;display:none}
.search-clear.on{display:block}
/* LINK ICONS */
.link-icon{font-size:13px;cursor:pointer;margin-left:2px;flex-shrink:0;opacity:.75}
.link-icon:hover{opacity:1}
.link-icon-asset{color:var(--magenta)}
.link-icon-proj{color:var(--blue)}
/* PAST PROJECTS */
.past-proj-toggle{background:none;border:none;font-size:12.5px;color:var(--text3);cursor:pointer;padding:8px 0;display:flex;align-items:center;gap:4px;font-family:inherit}
.past-proj-toggle:hover{color:var(--text2)}
/* BATCH BAR */
/* Two rows. It used to be one non-wrapping row holding count + Select all + Cancel +
   Snooze + Complete all, which overflowed at phone width, and Delete makes six. */
.batch-bar{position:absolute;bottom:0;left:0;right:0;background:var(--text);color:#fff;padding:10px 14px;display:flex;flex-direction:column;align-items:stretch;gap:9px;z-index:35;padding-bottom:calc(10px + var(--safe-bottom));transform:translateY(100%);transition:transform .25s}
.batch-top{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0}
.batch-top-actions{display:flex;gap:8px;flex-shrink:0}
/* The bar floats over the list, so without this the LAST card sits underneath it and
   cannot be tapped: you can drag it into view but it springs back on release. The scroller
   reserves exactly the bar's height while batch mode is on, so every card can be reached.
   --batch-h is measured from the real bar in enterBatch, because its height depends on the
   safe-area inset and on how the two rows wrap. */
.batch-bar.on{transform:translateY(0)}
.scroll.batch-open{padding-bottom:calc(var(--batch-h, 132px) + 14px);scroll-padding-bottom:calc(var(--batch-h, 132px) + 14px)}
.batch-count{font-size:13.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.batch-actions{display:flex;gap:8px}
.batch-actions .batch-btn{flex:1 1 0;justify-content:center;min-width:0}
.batch-btn{background:rgba(255,255,255,.15);border:none;color:#fff;padding:7px 10px;border-radius:6px;font-size:12.5px;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;justify-content:center;gap:4px;white-space:nowrap}
.batch-btn:hover{background:rgba(255,255,255,.25)}
.batch-btn.g{background:var(--green)}
.batch-btn.r{background:var(--red)}
.batch-btn.ghost{background:transparent;border:1px solid rgba(255,255,255,.3)}

/* MODALS */
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:100;display:flex;align-items:flex-end;justify-content:center}
@media(min-width:600px){.modal-bg{align-items:center}}
.modal{background:var(--card);border-radius:18px 18px 0 0;padding:22px;width:100%;max-width:500px;display:flex;flex-direction:column;gap:14px;box-shadow:0 -4px 30px rgba(0,0,0,.18);padding-bottom:calc(22px + var(--safe-bottom));max-height:92vh;overflow-y:auto}
@media(min-width:600px){.modal{border-radius:18px;max-width:480px}}
.modal-hdr{display:flex;align-items:center;justify-content:space-between;gap:8px}
.modal-title{font-size:16px;font-weight:600;flex:1;min-width:0}
.modal-x{background:none;border:none;color:var(--text3);cursor:pointer;padding:2px 4px;font-size:18px;display:flex;align-items:center;line-height:1;border-radius:6px;flex-shrink:0}
.modal-x:hover{color:var(--text);background:var(--bg2)}
.form-row{display:flex;flex-direction:column;gap:5px}
.form-label{font-size:11.5px;font-weight:500;color:var(--text2);text-transform:uppercase;letter-spacing:.04em}
.form-input{padding:11px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:14px;background:var(--bg);color:var(--text);outline:none;transition:border-color .12s;width:100%}
.form-input:focus{border-color:var(--green)}
select.form-input{background:var(--bg) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B6760' d='M6 8.5L1.5 4h9z'/%3E%3C/svg%3E") no-repeat right 12px center}
textarea.form-input{resize:vertical;min-height:70px}
input[type=date].form-input{-webkit-appearance:none;appearance:none;min-height:44px;line-height:1.2;font-family:inherit;color:var(--text)}
input[type=date].form-input::-webkit-date-and-time-value{text-align:left}
input[type=date].form-input::-webkit-calendar-picker-indicator{opacity:.5}
.form-row-h{display:flex;gap:8px}
.form-row-h .form-row{flex:1}
.form-help{font-size:11px;color:var(--text3)}
.modal-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:4px}
.modal-actions .btn{padding:10px 16px;font-size:13px}

/* OWNER PICK — terracotta for "either of us" */
.who-pick{display:flex;gap:7px;flex-wrap:wrap}
.who-opt{padding:8px 14px;border-radius:20px;border:1px solid var(--border);font-size:13px;cursor:pointer;background:var(--bg);color:var(--text2);transition:all .15s;font-family:inherit}
.who-opt.sel-either{background:var(--terra-light);color:var(--terra);border-color:var(--terra)}
.who-opt.sel-f{background:var(--purple-light);color:var(--purple);border-color:var(--purple)}
.who-opt.sel-m{background:var(--yellow-light);color:var(--yellow);border-color:var(--yellow)}

/* SCOPE PICK in modal — household=green, personal=slate */
.scope-pick{display:flex;gap:8px}
.scope-opt{flex:1;padding:11px;border-radius:var(--radius-sm);border:1.5px solid var(--border);background:var(--bg);text-align:center;cursor:pointer;transition:all .15s}
.scope-opt.sel-house{border-color:var(--green);background:var(--green-light)}
.scope-opt.sel-pers{border-color:var(--slate);background:var(--slate-light)}
.scope-opt-title{font-size:13px;font-weight:500}
.scope-opt-desc{font-size:11px;color:var(--text3);margin-top:2px}

/* URGENCY */
.urg-pick{display:flex;gap:6px;flex-wrap:wrap}
.urg-opt{flex:1;min-width:90px;padding:8px;border-radius:var(--radius-sm);border:1.5px solid var(--border);background:var(--bg);text-align:center;cursor:pointer;font-size:12.5px;color:var(--text2);transition:all .15s;font-family:inherit}
.urg-opt.sel{border-color:var(--green);background:var(--green-light);color:var(--green-dark);font-weight:500}

/* PROJECTS */
.pc{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
.pc-hdr{padding:12px 13px 10px;border-bottom:1px solid var(--border)}
.pc-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:5px}
.pc-name{font-size:14px;font-weight:600;line-height:1.3}
.pc-edit{background:none;border:none;color:var(--text3);cursor:pointer;padding:2px 4px;font-size:15px;display:inline-flex;align-items:center;line-height:1}
.pc-edit:hover{color:var(--text)}
.bdg{font-size:10px;padding:2px 8px;border-radius:20px;font-weight:500;flex-shrink:0}
.bdg-a{background:var(--green-light);color:var(--green-dark)}
.bdg-p{background:var(--bg2);color:var(--text2)}
.pc-desc{font-size:12.5px;color:var(--text2);line-height:1.55;margin-bottom:8px}
.pc-meta{display:flex;gap:14px;flex-wrap:wrap}
.pc-mi{font-size:11px;color:var(--text3);display:flex;align-items:center;gap:3px}
.prog{height:4px;background:var(--bg2);border-radius:99px;overflow:hidden;margin-top:9px}
.pf{height:100%;border-radius:99px;background:var(--green);transition:width .3s}
.pc-tasks{padding:8px 14px 11px}
.sub{display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;color:var(--text2)}
.sub.done-sub{color:var(--text3);text-decoration:line-through}
.box{width:22px;height:22px;border-radius:50%;border:1.5px solid var(--border2);flex-shrink:0;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;touch-action:manipulation}
.box:hover{border-color:var(--green)}.box.done{background:var(--green);border-color:var(--green)}
.box.done::after{content:'\\2713';font-size:11px;color:#fff;font-weight:700}
.circ-check{width:22px;height:22px;border-radius:50%;border:2px solid var(--border2);flex-shrink:0;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;touch-action:manipulation}
.circ-check:hover{border-color:var(--green)}.circ-check.done{background:var(--green);border-color:var(--green)}
.circ-check.done::after{content:'\\2713';font-size:11px;color:#fff;font-weight:700}
.sub-text{flex:1;min-width:0;word-break:break-word}

/* GROCERY */
.groc-grid{display:grid;grid-template-columns:1fr;gap:10px}
@media(min-width:769px){.groc-grid{grid-template-columns:1fr 1fr 1fr}}
.grp{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:10px 12px}
.grp-lbl{font-size:10.5px;font-weight:600;color:var(--text3);letter-spacing:.05em;text-transform:uppercase;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between}
.gi{display:flex;align-items:center;gap:9px;padding:7px 0;font-size:14px;cursor:pointer;min-height:32px}
.groc-add{width:100%;border:none;background:transparent;font-size:14px;padding:8px 0;outline:none;color:var(--text);font-family:inherit;-webkit-appearance:none;min-height:32px}
.groc-add::placeholder{color:var(--text3)}
.groc-empty{font-size:12.5px;color:var(--text3);padding:3px 0}
.gi.got{color:var(--text3);text-decoration:line-through}
.gi.dragging{opacity:.4}
.gi.drag-over{border-top:2px solid var(--green)}
.groc-text{flex:1;min-width:0}
.groc-drag{color:var(--text3);font-size:16px;cursor:grab;flex-shrink:0;padding:0 2px;touch-action:none}
.groc-drag:active{cursor:grabbing}
.groc-edit-inp{flex:1;border:1px solid var(--green);border-radius:4px;padding:3px 6px;font-size:14px;font-family:inherit;background:var(--bg);color:var(--text);outline:none}
.gbox{width:20px;height:20px;border-radius:5px;border:1.5px solid var(--border2);flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .15s}
.gbox.done{background:var(--green);border-color:var(--green)}
.gbox.done::after{content:'\\2713';font-size:11px;color:#fff;font-weight:700}

/* ASSETS */
.asset-rows{display:flex;flex-direction:column;gap:7px}
.arow{display:flex;align-items:center;gap:11px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:11px 13px;cursor:pointer;transition:border-color .12s}
.arow:hover{border-color:var(--border2)}
.arow-icon{width:34px;height:34px;border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:18px}
.arow-info{flex:1;min-width:0}
.arow-name{font-size:13.5px;font-weight:500}
.arow-sub{font-size:11.5px;color:var(--text3);margin-top:1px}
.arow-flag{font-size:10px;background:var(--amber-light);color:var(--amber);padding:2px 7px;border-radius:20px;font-weight:500;white-space:nowrap;flex-shrink:0}
.arow-flag.red{background:var(--red-light);color:var(--red)}
.panel{position:absolute;top:0;right:0;bottom:0;left:0;background:var(--card);overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:12px;z-index:20;padding-top:calc(14px + var(--safe-top));padding-bottom:calc(14px + var(--safe-bottom))}
@media(min-width:769px){.panel{left:auto;width:300px;border-left:1px solid var(--border);box-shadow:-4px 0 20px rgba(0,0,0,.06)}}
.ph{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.ptitle{font-size:15px;font-weight:600;line-height:1.25}
.psub{font-size:11.5px;color:var(--text2);margin-top:3px}
.xbtn{background:var(--bg2);border:none;cursor:pointer;color:var(--text2);font-size:18px;line-height:1;padding:6px 10px;border-radius:8px;flex-shrink:0}
.xbtn:hover{color:var(--text);background:var(--bg3)}
.ig{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.ic{background:var(--bg);border-radius:var(--radius-sm);padding:9px 11px}
.ic.full{grid-column:1/-1}
.icl{font-size:10px;color:var(--text3);font-weight:500;text-transform:uppercase;letter-spacing:.04em}
.icv{font-size:12.5px;font-weight:500;margin-top:3px;line-height:1.35}
.dlbl{font-size:11px;font-weight:600;color:var(--text2);margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em}
.log-item{display:flex;gap:9px;padding:8px 0;border-bottom:1px solid var(--border)}
.log-item:last-child{border-bottom:none}
.ldot{width:8px;height:8px;border-radius:50%;background:var(--green);margin-top:5px;flex-shrink:0}
.ldot.b{background:var(--blue)}.ldot.n{background:var(--border2)}
.ldot.both{background:linear-gradient(135deg,var(--green) 50%,var(--blue) 50%)}
.lt{font-size:12.5px;word-break:break-word}
.lm{font-size:11px;color:var(--text3);margin-top:2px}
.flag-box{background:var(--amber-light);border:1px solid #F0C86A;border-radius:var(--radius-sm);padding:9px 11px;font-size:12px;color:var(--amber);display:flex;gap:7px}
.flag-box.red{background:var(--red-light);border-color:#F0A0A0;color:var(--red)}
.flag-box i{font-size:15px;flex-shrink:0;margin-top:1px}
.panel-tabs{display:flex;gap:0;border-bottom:1px solid var(--border);margin-bottom:4px;flex-shrink:0}
.panel-tab{flex:1;background:none;border:none;border-bottom:2.5px solid transparent;padding:8px 4px;font-size:12px;font-weight:500;color:var(--text3);cursor:pointer;font-family:inherit;transition:all .12s}
.panel-tab.on{color:var(--green);border-bottom-color:var(--green)}
.panel-tab-content{display:flex;flex-direction:column;gap:10px;overflow-y:auto;flex:1}
.contr-list{display:flex;flex-direction:column;gap:7px}
.contr-item{background:var(--bg);border-radius:var(--radius-sm);padding:9px 11px;font-size:12.5px}
.contr-name{font-weight:500;margin-bottom:2px}
.contr-meta{font-size:11px;color:var(--text3)}
.contr-phone{color:var(--blue);text-decoration:none;font-size:11.5px}
.ptask-row{display:flex;align-items:center;gap:8px;padding:10px 0;font-size:13px;color:var(--text2);min-height:44px}
.ptask-tappable{cursor:pointer;flex:1;min-width:0}
.ptask-tappable:hover{color:var(--text)}
.ptask-name{flex:1;min-width:0;word-break:break-word;font-size:13px}
.ptask-due{font-size:11px;color:var(--text3);white-space:nowrap;flex-shrink:0}
.manual-link{display:flex;align-items:center;gap:5px;font-size:12px;color:var(--blue);text-decoration:none}
.manual-link:hover{text-decoration:underline}

/* ACTIVITY */
.stats-range-bar{display:flex;gap:5px;align-items:center;flex-wrap:nowrap;margin-bottom:4px}
.range-label{font-size:12.5px;color:var(--text2);white-space:nowrap}
.range-btn{font-size:12px;padding:4px 10px;border-radius:20px;border:1px solid var(--border);background:var(--bg);color:var(--text2);cursor:pointer;font-family:inherit;transition:all .12s;white-space:nowrap;min-width:36px}
.range-btn.on{background:var(--green);border-color:var(--green);color:#fff;font-weight:500}
.metrics-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:14px;text-align:center}
.metrics-num{font-size:28px;font-weight:600}
.metrics-lbl{font-size:11.5px;color:var(--text2);margin-top:3px}
.metrics-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
.bar-wrap{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:14px}
.bar-title{font-size:12.5px;font-weight:500;margin-bottom:12px}
.bar-row{display:flex;align-items:center;gap:8px;margin-bottom:9px}
.bar-lbl{font-size:11.5px;color:var(--text2);width:70px;flex-shrink:0}
.bar-track{flex:1;height:10px;background:var(--bg2);border-radius:99px;overflow:hidden}
.bar-fill{height:100%;border-radius:99px;background:var(--green)}
.bar-fill.pur{background:var(--purple)}.bar-fill.yel{background:var(--yellow)}
.bar-val{font-size:11px;color:var(--text3);width:24px;text-align:right;flex-shrink:0}
.sh{display:flex;align-items:center;justify-content:space-between;margin-bottom:5px}
.sl{font-size:10.5px;font-weight:600;color:var(--text3);letter-spacing:.05em;text-transform:uppercase}
.history-search{padding:9px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:13.5px;background:var(--bg);color:var(--text);outline:none;width:100%}
.history-search:focus{border-color:var(--green)}

/* TASK CONTEXT MENU */
.task-menu{position:fixed;background:var(--card);border:1px solid var(--border);border-radius:var(--radius-sm);box-shadow:0 4px 18px rgba(0,0,0,.14);padding:4px 0;z-index:200;min-width:150px}
.task-menu-item{display:flex;align-items:center;gap:8px;padding:9px 14px;font-size:13px;color:var(--text2);cursor:pointer;background:none;border:none;width:100%;text-align:left;font-family:inherit}
.task-menu-item:hover{background:var(--bg2);color:var(--text)}
.task-menu-item.danger{color:var(--red)}
.task-menu-item i{font-size:15px}

/* SNOOZE */
.snooze-opts{display:flex;flex-direction:column;gap:6px}
.snooze-opt{padding:12px 14px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;font-size:13.5px;display:flex;justify-content:space-between;align-items:center;font-family:inherit;color:var(--text);width:100%;text-align:left}
.snooze-opt:hover{background:var(--bg2)}
.snooze-opt.sel{background:var(--green-light);border-color:var(--green);color:var(--green-dark);font-weight:600}
.snooze-opt-sub{font-size:11px;color:var(--text3)}

/* MOBILE */
@media(max-width:768px){
  body{padding:0;background:var(--bg);display:block}
  .app{flex-direction:column;border-radius:0;box-shadow:none;border:none;width:100%;height:100vh;height:100dvh}
  .sidebar{display:none}
  .main{height:100%}
  .mobile-nav{display:flex;background:var(--card);border-top:1px solid var(--border);padding:6px 0;padding-bottom:calc(6px + var(--safe-bottom));flex-shrink:0;position:relative;z-index:15}
  .mob-nav-item{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 4px;color:var(--text3);cursor:pointer;border-radius:8px;background:none;border:none;font-family:inherit}
  .mob-nav-item i{font-size:22px}
  .mob-nav-item span{font-size:10px;font-weight:500}
  .mob-nav-item.on{color:var(--green)}
  .scroll{padding:12px 14px;padding-bottom:24px}
  .mobile-hdr{display:flex;align-items:center;gap:10px;padding:12px 14px;padding-top:calc(12px + var(--safe-top));background:var(--card);border-bottom:1px solid var(--border)}
  .mobile-hdr-logo{width:32px;height:32px;flex-shrink:0;border-radius:8px}
  .mobile-hdr-title{flex:1;font-size:16px;font-weight:600}
  .mobile-hdr-title span{color:var(--green)}
  .mobile-hdr-user{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:600;cursor:pointer;flex-shrink:0}
  .mobile-hdr-user.f{background:var(--purple-light);color:var(--purple)}
  .mobile-hdr-user.m{background:var(--yellow-light);color:var(--yellow)}
  .topbar{display:none}
  .mobile-sub-hdr{display:flex;align-items:center;justify-content:space-between;padding:9px 14px;background:var(--card);border-bottom:1px solid var(--border)}
  .mobile-sub-title{font-size:15px;font-weight:600}
  .mob-hdr-actions{display:flex;gap:5px;align-items:center}
  .fab{position:fixed;bottom:calc(80px + var(--safe-bottom));right:18px;width:54px;height:54px;border-radius:50%;background:var(--green);color:#fff;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 16px rgba(26,140,104,.4);z-index:30;font-size:24px}
  .fab:active{transform:scale(.95);background:var(--green-dark)}
}
@media(min-width:769px){.mobile-nav,.mobile-hdr,.mobile-sub-hdr,.fab{display:none!important}}

/* QUICK SWITCH */
.qs-btns{display:flex;gap:10px}
.qs-btn{flex:1;padding:16px 12px;border:2px solid var(--border);border-radius:14px;background:var(--card);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:8px;transition:all .15s}
.qs-btn.f{border-color:var(--purple);background:var(--purple-light)}
.qs-btn.m{border-color:var(--yellow);background:var(--yellow-light)}
.qs-btn .qa{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:600}
.qs-btn.f .qa{background:var(--purple);color:#fff}
.qs-btn.m .qa{background:var(--yellow);color:#fff}
.qs-btn .qn{font-size:13px;font-weight:500}
.qs-logout{text-align:center;font-size:12px;color:var(--text3);cursor:pointer;padding:8px;text-decoration:underline}

/* MOBILE ACTION SHEET */
.action-sheet-item{display:flex;align-items:center;gap:10px;padding:13px 14px;font-size:14px;cursor:pointer;border-bottom:1px solid var(--border);color:var(--text)}
.action-sheet-item:last-child{border-bottom:none}
.action-sheet-item:hover,.action-sheet-item:active{background:var(--bg)}
.action-sheet-item i{font-size:18px;color:var(--text3)}
.action-sheet-cancel{justify-content:center;color:var(--text2);font-size:13px}

/* ASSET STATUS DOT */
.status-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;display:inline-block}
.status-dot.green{background:#22C55E}.status-dot.amber{background:var(--amber)}.status-dot.red{background:var(--red)}
.asset-status-bar{display:flex;align-items:center;gap:6px;padding:9px 13px;border-bottom:1px solid var(--border);background:var(--bg);font-size:12px}
.asset-status-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:20px;font-size:11.5px;font-weight:500;border:1px solid}
.asset-status-pill.green{background:#F0FDF4;color:#16A34A;border-color:#86EFAC}
.asset-status-pill.amber{background:var(--amber-light);color:var(--amber);border-color:#FCD34D}
.asset-status-pill.red{background:var(--red-light);color:var(--red);border-color:#FCA5A5}

/* STATUS PICK in asset modal */
.status-pick{display:flex;gap:7px}
.status-opt{padding:7px 14px;border-radius:20px;border:1.5px solid var(--border);font-size:12.5px;cursor:pointer;background:var(--bg);color:var(--text2);transition:all .15s;font-family:inherit;display:flex;align-items:center;gap:5px}
.status-opt.sel-green{background:#F0FDF4;color:#16A34A;border-color:#86EFAC}
.status-opt.sel-amber{background:var(--amber-light);color:var(--amber);border-color:#FCD34D}
.status-opt.sel-red{background:var(--red-light);color:var(--red);border-color:#FCA5A5}

/* TREND CHART */
.trend-wrap{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:14px}
.trend-title{font-size:12.5px;font-weight:500;margin-bottom:10px;display:flex;align-items:center;flex-wrap:wrap;gap:6px}
.trend-legend{display:flex;gap:14px;margin-top:8px;font-size:11px;color:var(--text2)}
.trend-legend-dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:4px;flex-shrink:0}

/* METRIC DRILL-DOWN */
.drill-list{display:flex;flex-direction:column;gap:5px;max-height:55vh;overflow-y:auto}
.drill-item{padding:9px 12px;background:var(--bg);border-radius:var(--radius-sm)}
.drill-item-name{font-size:13px;font-weight:500}
.drill-item-sub{font-size:11px;color:var(--text3);margin-top:2px}

/* HISTORY ITEM with action button */
.history-item{display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)}
.history-item:last-child{border-bottom:none}
.history-menu-btn{background:none;border:none;color:var(--text3);font-size:16px;padding:2px 4px;cursor:pointer;flex-shrink:0;line-height:1;align-self:center;border-radius:4px}
.history-menu-btn:hover{background:var(--bg2);color:var(--text)}
"""

# ─── HTML BODY ────────────────────────────────────────────────────────────────
def HTML_BODY(logo, icon):
    return f"""
<div id="login-screen" class="login">
  <div class="login-logo"><img src="{logo}" alt="Loon HQ" style="width:120px;height:120px;border-radius:24px;box-shadow:0 4px 20px rgba(0,0,0,.18)"></div>
  <div class="login-title">Loon HQ</div>
  <div class="login-sub">The Laffy Loon command center</div>
  <div class="who-buttons">
    <button class="who-btn" id="login-f" onclick="selectUser('Frankie',this)"><div class="who-avatar">F</div><div>Frankie</div></button>
    <button class="who-btn" id="login-m" onclick="selectUser('Meredith',this)"><div class="who-avatar">M</div><div>Meredith</div></button>
  </div>
  <div class="pin-wrap" id="pin-wrap" style="visibility:hidden">
    <div class="pin-label" id="pin-label">Enter PIN</div>
    <input class="pin-input" id="pin-input" type="tel" inputmode="numeric" autocomplete="off" placeholder="&bull;&bull;&bull;&bull;" maxlength="6">
    <div class="pin-err" id="pin-err"></div>
  </div>
</div>

<div class="app gone" id="main-app">
  <div class="sidebar">
    <div class="sb-top">
      <img class="sb-logo-icon" src="{logo}" alt="Loon HQ">
      <div><div class="sb-logo-text">Loon <span>HQ</span></div><div class="sb-addr">4455 W Alaska Pl</div></div>
    </div>
    <div class="user-row" onclick="openQuickSwitch()">
      <div class="user-av" id="user-avatar">?</div>
      <div class="user-info"><div class="user-name" id="user-name">--</div><div class="user-action">Tap to switch</div></div>
      <i class="ti ti-chevron-right"></i>
    </div>
    <div class="nav-grp">
      <div class="nav-grp-lbl">manage</div>
      <div class="nav-item on" data-view="tasks" onclick="go('tasks')"><i class="ti ti-check"></i> Tasks</div>
      <div class="nav-item" data-view="projects" onclick="go('projects')"><i class="ti ti-layout-list"></i> Projects</div>
      <div class="nav-item" data-view="grocery" onclick="go('grocery')"><i class="ti ti-shopping-cart"></i> Shopping List</div>
    </div>
    <div class="nav-grp">
      <div class="nav-grp-lbl">reference</div>
      <div class="nav-item" data-view="assets" onclick="go('assets')"><i class="ti ti-tool"></i> Assets</div>
      <div class="nav-item" data-view="metrics" onclick="go('metrics')"><i class="ti ti-chart-bar"></i> Activity</div>
    </div>
    <div class="sync-status"><div class="sync-dot" id="sync-dot"></div><span id="sync-lbl">Loading...</span></div>
  </div>

  <div class="main">
    <div class="mobile-hdr">
      <img class="mobile-hdr-logo" src="{logo}" alt="LHQ">
      <div class="mobile-hdr-title">Loon <span>HQ</span></div>
      <div class="mobile-hdr-user" id="mob-user" onclick="openQuickSwitch()">?</div>
    </div>
    <div class="mobile-sub-hdr">
      <div class="mobile-sub-title" id="mob-sub-title">Tasks</div>
      <div class="mob-hdr-actions">
        <button class="btn btn-icon" onclick="toggleSearch()"><i class="ti ti-search"></i></button>
        <button class="btn btn-icon" id="select-btn" onclick="enterBatch()" title="Select multiple tasks"><i class="ti ti-list-check"></i></button>
        <button class="btn btn-icon" onclick="refreshData()" title="Refresh"><i class="ti ti-refresh"></i></button>
        <button class="btn btn-icon" id="mob-more-btn" style="display:none" onclick="openMobileMenu()"><i class="ti ti-dots"></i></button>
      </div>
    </div>
    <div class="topbar">
      <div class="pg-title" id="pgtitle">Tasks</div>
      <div class="top-actions">
        <button class="btn btn-icon" id="desk-search-btn" onclick="toggleSearch()"><i class="ti ti-search"></i></button>
        <button class="btn btn-icon" onclick="refreshData()"><i class="ti ti-refresh"></i></button>
        <button class="btn primary" id="topbtn" onclick="handleAdd()"><i class="ti ti-plus"></i> <span id="topbtnlbl">Add task</span></button>
      </div>
    </div>
    <div class="loading-overlay" id="loader"><div class="spinner"></div><div style="font-size:13px;color:var(--text2)">Syncing Loon HQ...</div></div>

    <!-- TASKS -->
    <div id="v-tasks" class="view gone">
      <div class="tab-bar">
        <button class="tab-btn on" data-tab="today" onclick="setTaskTab('today')">Today</button>
        <button class="tab-btn" data-tab="upcoming" onclick="setTaskTab('upcoming')">Upcoming</button>
        <button class="tab-btn" data-tab="recurring" onclick="setTaskTab('recurring')">Recurring</button>
        <button class="tab-btn" data-tab="all" onclick="setTaskTab('all')">All</button>
        <button class="tab-btn" data-tab="history" onclick="setTaskTab('history')">History</button>
      </div>
      <div id="task-hist-bar" class="hist-bar gone">
        <div class="search-input-wrap" style="flex:1">
          <input class="search-inp" id="task-hist-search" type="search" placeholder="Search history..." oninput="renderTaskHistory()">
          <button class="search-clear" onclick="document.getElementById('task-hist-search').value='';renderTaskHistory()">&#x2715;</button>
        </div>
      </div>
      <div class="search-bar" id="search-bar">
        <div class="search-input-wrap">
          <input class="search-inp" id="search-inp" type="search" placeholder="Search tasks..." oninput="onSearchInput()">
          <button class="search-clear" id="search-clear" onclick="clearSearch()">&#x2715;</button>
        </div>
      </div>
      <div class="scroll" id="task-scroll">
        <div class="ptr-indicator" id="ptr"><div class="spinner"></div><span>Refreshing...</span></div>
        <div id="task-list"></div>
      </div>
      <div class="batch-bar" id="batch-bar">
        <div class="batch-top">
          <div class="batch-count" id="batch-count">0 selected</div>
          <div class="batch-top-actions">
            <button class="batch-btn ghost" onclick="selectAll()"><i class="ti ti-select-all"></i> Select all</button>
            <button class="batch-btn ghost" onclick="exitBatch()">Cancel</button>
          </div>
        </div>
        <div class="batch-actions">
          <button class="batch-btn" onclick="openBatchSnooze()"><i class="ti ti-clock"></i> Snooze</button>
          <button class="batch-btn r" id="batch-del-btn" onclick="batchDeleteSelected()"><i class="ti ti-trash"></i> Delete</button>
          <button class="batch-btn g" onclick="batchCompleteSelected()"><i class="ti ti-check"></i> Complete</button>
        </div>
      </div>
    </div>

    <!-- PROJECTS -->
    <div id="v-projects" class="view gone">
      <div class="scroll">
        <div class="sh"><div class="sl">Active</div></div>
        <div id="proj-active"></div>
        <div class="sh" style="margin-top:6px"><div class="sl">Planned</div></div>
        <div id="proj-planned"></div>
        <div id="past-proj-wrap" style="margin-top:6px">
          <button class="past-proj-toggle" onclick="togglePastProjects()" id="past-proj-btn"><i class="ti ti-chevron-right" id="past-proj-chev"></i> Past projects</button>
          <div id="proj-done" class="gone"></div>
        </div>
      </div>
    </div>

    <!-- SHOPPING LIST -->
    <div id="v-grocery" class="view gone">
      <div class="scroll">
        <div class="sh">
          <div class="sl">Shopping List</div>
          <button class="btn danger" onclick="clearGrocery()"><i class="ti ti-trash"></i> Clear checked</button>
        </div>
        <div class="groc-grid">
          <div class="grp"><div class="grp-lbl">Food <span id="count-food" style="font-weight:400;text-transform:none;letter-spacing:0"></span></div><div id="groc-food"></div></div>
          <div class="grp"><div class="grp-lbl">Costco <span id="count-costco" style="font-weight:400;text-transform:none;letter-spacing:0"></span></div><div id="groc-costco"></div></div>
          <div class="grp"><div class="grp-lbl">Household <span id="count-household" style="font-weight:400;text-transform:none;letter-spacing:0"></span></div><div id="groc-household"></div></div>
        </div>
      </div>
    </div>

    <!-- ASSETS -->
    <div id="v-assets" class="view gone">
      <div class="scroll">
        <div class="sh"><div class="sl">Home systems</div><button class="btn" onclick="openAddAsset()"><i class="ti ti-plus"></i> Add asset</button></div>
        <div class="asset-rows" id="asset-systems"></div>
        <div class="sh" style="margin-top:8px"><div class="sl">Appliances</div></div>
        <div class="asset-rows" id="asset-appliances"></div>
        <div class="sh" style="margin-top:8px"><div class="sl">Structure &amp; exterior</div></div>
        <div class="asset-rows" id="asset-structure"></div>
      </div>
    </div>

    <!-- ACTIVITY (two tabs) -->
    <div id="v-metrics" class="view gone">
      <div class="tab-bar" id="metrics-tab-bar">
        <button class="tab-btn on" data-mtab="stats" onclick="setMetricsTab('stats')">Stats</button>
        <button class="tab-btn" data-mtab="household" onclick="setMetricsTab('household')">Household History</button>
        <button class="tab-btn" data-mtab="personal" onclick="setMetricsTab('personal')">Personal History</button>
      </div>
      <div id="metrics-stats-panel" class="scroll">
        <div class="stats-scope-bar">
          <button class="scope-pill on" data-scope="household" onclick="setStatsScope('household')"><i class="ti ti-home"></i> Household</button>
          <button class="scope-pill" data-scope="personal" onclick="setStatsScope('personal')"><i class="ti ti-lock"></i> Personal</button>
          <button class="scope-pill" data-scope="all" onclick="setStatsScope('all')">All tasks</button>
        </div>
        <div class="stats-range-bar">
          <span class="range-label">Last</span>
          <button class="range-btn" data-days="15" onclick="setStatsRange(15)">15</button>
          <button class="range-btn on" data-days="30" onclick="setStatsRange(30)">30</button>
          <button class="range-btn" data-days="60" onclick="setStatsRange(60)">60</button>
          <button class="range-btn" data-days="90" onclick="setStatsRange(90)">90</button>
          <span class="range-label">days</span>
        </div>
        <div class="metrics-grid" id="metrics-nums"></div>
        <div class="bar-wrap" id="metrics-bars"></div>
        <div class="trend-wrap" id="metrics-trend"></div>
      </div>
      <div id="metrics-history-panel" class="scroll gone">
        <input class="history-search" id="history-search" placeholder="Search completions..." oninput="renderHistory()">
        <div id="history-list"></div>
      </div>
    </div>

    <!-- ASSET PANEL -->
    <div id="panel" class="panel" style="display:none">
      <div class="ph">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:7px"><div class="status-dot" id="p-status-dot"></div><div class="ptitle" id="p-title"></div></div>
          <div class="psub" id="p-sub"></div>
        </div>
        <div style="display:flex;gap:5px;align-items:center">
          <button class="btn btn-icon" onclick="openEditAsset()" title="Edit"><i class="ti ti-pencil"></i></button>
          <button class="xbtn" onclick="closePanel()"><i class="ti ti-x"></i></button>
        </div>
      </div>
      <div id="p-flags"></div>
      <div class="ig" id="p-grid"></div>
      <div id="p-manual-wrap" style="display:none">
        <div class="dlbl" style="margin-bottom:4px">Documentation</div>
        <a id="p-manual-link" class="manual-link" href="#" target="_blank" rel="noopener"><i class="ti ti-file-text"></i><span id="p-manual-text"></span></a>
      </div>
      <div id="p-contractors-wrap" style="display:none">
        <div class="dlbl" style="margin-bottom:6px">Contractors</div>
        <div class="contr-list" id="p-contractors"></div>
      </div>
      <div class="panel-tabs" style="margin-top:4px">
        <button class="panel-tab on" id="ptab-log" onclick="setPanelTab('log')">Log</button>
        <button class="panel-tab" id="ptab-tasks" onclick="setPanelTab('tasks')">Tasks</button>
      </div>
      <div class="panel-tab-content" id="panel-tab-log">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px">
          <div class="dlbl">Maintenance log</div>
          <button class="btn" style="font-size:11.5px" onclick="openAddMaintenanceNote()"><i class="ti ti-plus"></i> Add note</button>
        </div>
        <div id="p-log"></div>
      </div>
      <div class="panel-tab-content gone" id="panel-tab-tasks">
        <div class="dlbl" style="margin-bottom:4px">Linked tasks (<span id="p-tasks-count">0</span> active)</div>
        <div id="p-tasks"></div>
        <button class="btn" style="margin-top:8px;font-size:12px" onclick="openAddTaskForAsset()"><i class="ti ti-plus"></i> Add task</button>
      </div>
    </div>
  </div>

  <!-- MOBILE NAV -->
  <div class="mobile-nav">
    <button class="mob-nav-item on" data-view="tasks" onclick="go('tasks')"><i class="ti ti-check"></i><span>Tasks</span></button>
    <button class="mob-nav-item" data-view="projects" onclick="go('projects')"><i class="ti ti-layout-list"></i><span>Projects</span></button>
    <button class="mob-nav-item" data-view="grocery" onclick="go('grocery')"><i class="ti ti-shopping-cart"></i><span>Shop</span></button>
    <button class="mob-nav-item" data-view="assets" onclick="go('assets')"><i class="ti ti-tool"></i><span>Assets</span></button>
    <button class="mob-nav-item" data-view="metrics" onclick="go('metrics')"><i class="ti ti-chart-bar"></i><span>Activity</span></button>
  </div>
  <button class="fab" id="fab" onclick="handleAdd()"><i class="ti ti-plus"></i></button>
</div>

<!-- ADD/EDIT TASK MODAL -->
<div class="modal-bg gone" id="modal-task">
  <div class="modal">
    <div class="modal-hdr"><div class="modal-title" id="task-modal-title">Add task</div><button class="modal-x" onclick="closeModal('modal-task')" aria-label="Close"><i class="ti ti-x"></i></button></div>
    <div class="form-row">
      <div class="form-label">Scope</div>
      <div class="scope-pick">
        <div class="scope-opt sel-house" id="scope-opt-house" onclick="pickScope('household')"><div class="scope-opt-title">&#127968; Household</div><div class="scope-opt-desc">Shared</div></div>
        <div class="scope-opt" id="scope-opt-pers" onclick="pickScope('personal')"><div class="scope-opt-title">&#128100; Personal</div><div class="scope-opt-desc">Just for me</div></div>
      </div>
    </div>
    <div id="t-personal-note" class="gone" style="font-size:12px;color:var(--text3);margin-top:-4px"><i class="ti ti-lock"></i> Only visible to you.</div>
    <div class="form-row"><div class="form-label">Task name</div><input class="form-input" id="t-name" placeholder="e.g. Take out trash"></div>
    <div class="form-row">
      <div class="form-label" style="display:flex;align-items:center;gap:5px">Type <button type="button" class="btn" style="padding:1px 5px;font-size:11px;border-radius:4px;line-height:1.4" onclick="openModal('modal-type-info')"><i class="ti ti-info-circle"></i></button></div>
      <select class="form-input" id="t-type" onchange="updateTaskTypeFields()">
        <option value="one_off">One-off &mdash; single task</option>
        <option value="floating">Floating &mdash; no deadline</option>
        <option value="scheduled">Recurring &mdash; fixed schedule</option>
        <option value="interval">Recurring &mdash; from completion</option>
      </select>
    </div>
    <div class="type-fields" data-type="one_off">
      <div class="form-row-h">
        <div class="form-row"><div class="form-label">Due date (optional)</div><input class="form-input" id="t-due" type="date"></div>
        <div class="form-row"><div class="form-label">Reminder</div>
          <select class="form-input" id="t-remind">
            <option value="">None</option>
            <option value="1_day">1 day before</option><option value="2_days">2 days before</option>
            <option value="3_days">3 days before</option><option value="1_week">1 week before</option>
          </select>
        </div>
      </div>
    </div>
    <div class="type-fields gone" data-type="floating">
      <div class="form-row"><div class="form-label">Urgency</div>
        <div class="urg-pick">
          <button class="urg-opt sel" id="urg-week" onclick="pickUrgency('this_week')">This week</button>
          <button class="urg-opt" id="urg-month" onclick="pickUrgency('this_month')">This month</button>
          <button class="urg-opt" id="urg-norush" onclick="pickUrgency('no_rush')">No rush</button>
        </div>
      </div>
    </div>
    <div class="type-fields gone" data-type="scheduled">
      <div class="form-row">
        <div class="form-label">Repeats every</div>
        <div class="form-row-h">
          <input class="form-input" id="t-sched-interval" type="number" min="1" value="1" style="max-width:90px">
          <select class="form-input" id="t-sched-freq" onchange="updateSchedFields()">
            <option value="week" selected>week(s)</option>
            <option value="month">month(s)</option>
            <option value="year">year(s)</option>
          </select>
        </div>
      </div>
      <div class="form-row" id="sched-week">
        <div class="form-label">On</div>
        <select class="form-input" id="t-sched-weekday">
          <option value="1">Monday</option><option value="2">Tuesday</option><option value="3">Wednesday</option>
          <option value="4">Thursday</option><option value="5">Friday</option><option value="6">Saturday</option><option value="0">Sunday</option>
        </select>
      </div>
      <div class="form-row gone" id="sched-month">
        <div class="form-label">On day</div>
        <select class="form-input" id="t-sched-monthday"><option value="1">1st</option><option value="2">2nd</option><option value="3">3rd</option><option value="4">4th</option><option value="5">5th</option><option value="6">6th</option><option value="7">7th</option><option value="8">8th</option><option value="9">9th</option><option value="10">10th</option><option value="11">11th</option><option value="12">12th</option><option value="13">13th</option><option value="14">14th</option><option value="15">15th</option><option value="16">16th</option><option value="17">17th</option><option value="18">18th</option><option value="19">19th</option><option value="20">20th</option><option value="21">21st</option><option value="22">22nd</option><option value="23">23rd</option><option value="24">24th</option><option value="25">25th</option><option value="26">26th</option><option value="27">27th</option><option value="28">28th</option><option value="29">29th</option><option value="30">30th</option><option value="31">31st</option><option value="last">Last day</option></select>
      </div>
      <div class="form-row-h gone" id="sched-year">
        <div class="form-row"><div class="form-label">Month</div><select class="form-input" id="t-sched-yearmonth"><option value="1">January</option><option value="2">February</option><option value="3">March</option><option value="4">April</option><option value="5">May</option><option value="6">June</option><option value="7">July</option><option value="8">August</option><option value="9">September</option><option value="10">October</option><option value="11">November</option><option value="12">December</option></select></div>
        <div class="form-row"><div class="form-label">Day</div><select class="form-input" id="t-sched-yearday"><option value="1">1st</option><option value="2">2nd</option><option value="3">3rd</option><option value="4">4th</option><option value="5">5th</option><option value="6">6th</option><option value="7">7th</option><option value="8">8th</option><option value="9">9th</option><option value="10">10th</option><option value="11">11th</option><option value="12">12th</option><option value="13">13th</option><option value="14">14th</option><option value="15">15th</option><option value="16">16th</option><option value="17">17th</option><option value="18">18th</option><option value="19">19th</option><option value="20">20th</option><option value="21">21st</option><option value="22">22nd</option><option value="23">23rd</option><option value="24">24th</option><option value="25">25th</option><option value="26">26th</option><option value="27">27th</option><option value="28">28th</option><option value="29">29th</option><option value="30">30th</option><option value="31">31st</option></select></div>
      </div>
      <div class="form-row"><div class="form-label">Starts on (optional)</div><input class="form-input" id="t-sched-start" type="date"><div class="form-help" style="margin-top:4px">Leave blank to start today.</div></div>
      <div class="form-row"><div class="form-label">End date (optional)</div><input class="form-input" id="t-end-sched" type="date"></div>
      <div class="form-help">Leave end date blank to repeat forever.</div>
    </div>
    <div class="type-fields gone" data-type="interval">
      <div class="form-row-h">
        <div class="form-row">
          <div class="form-label">Every</div>
          <div style="display:flex;gap:8px;align-items:center">
            <input class="form-input" id="t-days" type="number" min="1" placeholder="1" style="max-width:80px">
            <select class="form-input" id="t-days-unit" style="max-width:120px">
              <option value="day">days</option>
              <option value="week">weeks</option>
              <option value="month">months</option>
              <option value="year">years</option>
            </select>
          </div>
        </div>
        <div class="form-row"><div class="form-label">Starts on (optional)</div><input class="form-input" id="t-interval-start" type="date"></div>
        <div class="form-row"><div class="form-label">End date (optional)</div><input class="form-input" id="t-end-interval" type="date"></div>
      </div>
      <div class="form-help">Resets from completion date. Leave blank to start today and repeat forever.</div>
    </div>
    <div class="form-row" id="t-owner-row">
      <div class="form-label">Owner</div>
      <div class="who-pick">
        <button class="who-opt sel-either" id="owner-either" onclick="pickOwner('')">Either of us</button>
        <button class="who-opt" id="owner-f" onclick="pickOwner('Frankie')">Frankie</button>
        <button class="who-opt" id="owner-m" onclick="pickOwner('Meredith')">Meredith</button>
      </div>
    </div>
    <div class="form-row"><div class="form-label">Notes (optional)</div><input class="form-input" id="t-notes" placeholder="Any extra context"></div>
    <div class="form-row" id="t-asset-row"><div class="form-label">Link to asset (optional)</div><select class="form-input" id="t-asset-link"><option value="">No asset link</option></select></div>
    <div class="form-row" id="t-proj-row"><div class="form-label">Link to project (optional)</div><select class="form-input" id="t-proj-link"><option value="">No project link</option></select></div>
    <div class="modal-actions">
      <button class="btn danger gone" id="task-delete-btn" onclick="deleteEditingTask()"><i class="ti ti-trash"></i></button>
      <button class="btn gone" id="task-history-btn" onclick="openTaskHistory()" title="View history" style="padding:0 10px;color:var(--text3)"><i class="ti ti-history"></i></button>
      <button class="btn" onclick="closeModal('modal-task')">Cancel</button>
      <button class="btn primary" id="task-submit-btn" onclick="submitTask()">Add task</button>
    </div>
  </div>
</div>

<!-- TASK HISTORY MODAL -->
<div class="modal-bg gone" id="modal-task-history">
  <div class="modal">
    <div class="modal-title">Task history</div>
    <div id="th-task-name" style="font-size:13px;color:var(--text3);margin:-4px 0 12px"></div>
    <div id="th-list" style="max-height:55vh;overflow-y:auto"></div>
    <div class="modal-actions"><button class="btn" onclick="closeModal('modal-task-history')">Close</button></div>
  </div>
</div>

<!-- ADD PROJECT -->
<div class="modal-bg gone" id="modal-project">
  <div class="modal">
    <div class="modal-title" id="project-modal-title">New project</div>
    <div class="form-row"><div class="form-label">Project name</div><input class="form-input" id="p-name" placeholder="e.g. Back garden bed"></div>
    <div class="form-row"><div class="form-label">Description</div><input class="form-input" id="p-desc" placeholder="What&rsquo;s this about?"></div>
    <div class="form-row-h">
      <div class="form-row"><div class="form-label">Status</div><select class="form-input" id="p-status"><option value="active">Active</option><option value="planned">Planned</option><option value="done">Done</option></select></div>
      <div class="form-row"><div class="form-label">Target completion date</div><input class="form-input" id="p-target" type="date"></div>
    </div>
    <div class="modal-actions">
      <button class="btn danger gone" id="project-delete-btn" onclick="deleteEditingProject()"><i class="ti ti-trash"></i></button>
      <button class="btn" onclick="closeModal('modal-project')">Cancel</button>
      <button class="btn primary" id="project-submit-btn" onclick="submitProject()">Create project</button>
    </div>
  </div>
</div>

<!-- EDIT SUBTASK -->
<div class="modal-bg gone" id="modal-subtask">
  <div class="modal">
    <div class="modal-hdr"><div class="modal-title">Edit subtask</div><button class="modal-x" onclick="closeModal('modal-subtask')" aria-label="Close"><i class="ti ti-x"></i></button></div>
    <div class="form-row"><div class="form-label">Task name</div><input class="form-input" id="st-name"></div>
    <div class="form-row-h">
      <div class="form-row"><div class="form-label">Status</div><select class="form-input" id="st-status"><option value="todo">To do</option><option value="next_up">Next up</option><option value="in_progress">In progress</option><option value="done">Done</option></select></div>
      <div class="form-row"><div class="form-label">Due date</div><input class="form-input" id="st-due" type="date"></div>
    </div>
    <div class="modal-actions">
      <button class="btn danger" id="subtask-delete-btn" onclick="deleteEditingSubtask()"><i class="ti ti-trash"></i></button>
      <button class="btn" onclick="closeModal('modal-subtask')">Cancel</button>
      <button class="btn primary" onclick="submitSubtask()">Save</button>
    </div>
  </div>
</div>

<!-- ADD GROCERY -->
<div class="modal-bg gone" id="modal-grocery">
  <div class="modal">
    <div class="modal-title">Add item</div>
    <div class="form-row"><div class="form-label">Item</div><input class="form-input" id="g-name" placeholder="e.g. Olive oil"></div>
    <div class="form-row"><div class="form-label">Category</div><select class="form-input" id="g-cat"><option>Food</option><option>Costco</option><option>Household</option></select></div>
    <div class="modal-actions"><button class="btn" onclick="closeModal('modal-grocery')">Cancel</button><button class="btn primary" onclick="submitGrocery()">Add item</button></div>
  </div>
</div>

<!-- QUICK SWITCH -->
<div class="modal-bg gone" id="modal-qs">
  <div class="modal" style="gap:16px">
    <div style="font-size:15px;font-weight:600;text-align:center">Switch user</div>
    <div class="qs-btns">
      <button class="qs-btn f" onclick="quickSwitch('Frankie')"><div class="qa">F</div><div class="qn">Frankie</div></button>
      <button class="qs-btn m" onclick="quickSwitch('Meredith')"><div class="qa">M</div><div class="qn">Meredith</div></button>
    </div>
    <div class="qs-logout" onclick="logout()">Log out (requires PIN to return)</div>
  </div>
</div>

<!-- SNOOZE -->
<div class="modal-bg gone" id="modal-snooze">
  <div class="modal">
    <div class="modal-title">Snooze</div>
    <div style="font-size:13px;color:var(--text2)" id="snooze-task-name"></div>
    <div style="font-size:11.5px;color:var(--text3)" id="snooze-from"></div>
    <div class="snooze-opts">
      <button class="snooze-opt" data-snooze="1">1 day<span class="snooze-opt-sub" id="snooze-1">--</span></button>
      <button class="snooze-opt" data-snooze="3">3 days<span class="snooze-opt-sub" id="snooze-3">--</span></button>
      <button class="snooze-opt" data-snooze="5">5 days<span class="snooze-opt-sub" id="snooze-5">--</span></button>
      <button class="snooze-opt" data-snooze="7">1 week<span class="snooze-opt-sub" id="snooze-7">--</span></button>
    </div>
    <div class="form-row"><div class="form-label">Or pick a date</div><input class="form-input" id="snooze-date" type="date" onchange="pickSnoozeDate(this.value)"></div>
    <div class="form-help">Overdue tasks snooze from today; future tasks from their due date.</div>
    <div class="modal-actions"><button class="btn" onclick="closeModal('modal-snooze')">Cancel</button><button class="btn primary" id="snooze-confirm-btn" onclick="confirmSnooze()" disabled>Snooze</button></div>
  </div>
</div>

<!-- MOBILE MORE MENU -->
<div class="modal-bg gone" id="modal-mobile-menu">
  <div class="modal" style="gap:0;padding:0;padding-bottom:calc(0px + var(--safe-bottom))">
    <div class="action-sheet-item" onclick="refreshData();closeModal('modal-mobile-menu')"><i class="ti ti-refresh"></i> Refresh</div>
    <div class="action-sheet-item" onclick="enterBatch();closeModal('modal-mobile-menu')"><i class="ti ti-checkbox"></i> Select multiple tasks</div>
    <div class="action-sheet-item action-sheet-cancel" onclick="closeModal('modal-mobile-menu')">Cancel</div>
  </div>
</div>

<!-- EDIT / ADD ASSET -->
<div class="modal-bg gone" id="modal-edit-asset">
  <div class="modal">
    <div class="modal-title" id="ea-modal-title">Add asset</div>
    <div class="form-row"><div class="form-label">Name</div><input class="form-input" id="ea-name" placeholder="e.g. Water heater"></div>
    <div class="form-row-h">
      <div class="form-row"><div class="form-label">Category</div>
        <select class="form-input" id="ea-category">
          <option>Home systems</option><option>Appliances</option><option>Structure &amp; exterior</option>
        </select>
      </div>
      <div class="form-row"><div class="form-label">Status</div>
        <div class="status-pick">
          <button class="status-opt sel-green" id="ea-s-green" onclick="pickAssetStatus('green')"><span class="status-dot green"></span>Good</button>
          <button class="status-opt" id="ea-s-amber" onclick="pickAssetStatus('amber')"><span class="status-dot amber"></span>Note</button>
          <button class="status-opt" id="ea-s-red" onclick="pickAssetStatus('red')"><span class="status-dot red"></span>Attn</button>
        </div>
        <input type="hidden" id="ea-status" value="green">
      </div>
    </div>
    <div class="form-row-h">
      <div class="form-row"><div class="form-label">Install date</div><input class="form-input" id="ea-install" type="date"></div>
      <div class="form-row"><div class="form-label">Last service</div><input class="form-input" id="ea-last-service" type="date"></div>
    </div>
    <div class="form-row-h">
      <div class="form-row"><div class="form-label">Next service</div><input class="form-input" id="ea-next-service" type="date"></div>
      <div class="form-row"><div class="form-label">Warranty expires</div><input class="form-input" id="ea-warranty" type="date"></div>
    </div>
    <div class="form-row-h">
      <div class="form-row"><div class="form-label">Purchase price</div><input class="form-input" id="ea-price" placeholder="e.g. $2,400"></div>
      <div class="form-row"><div class="form-label">Manual / docs URL</div><input class="form-input" id="ea-manual-url" type="url" placeholder="https://..."></div>
    </div>
    <div class="form-row"><div class="form-label">Notes</div><textarea class="form-input" id="ea-notes" placeholder="Model, contractor, warranty details..."></textarea></div>
    <div class="form-row">
      <div class="form-label" style="display:flex;align-items:center;justify-content:space-between">Contractors <button type="button" class="btn" style="padding:2px 7px;font-size:11px" onclick="addContractorField()"><i class="ti ti-plus"></i> Add</button></div>
      <div id="ea-contractors-list" style="display:flex;flex-direction:column;gap:6px;margin-top:4px"></div>
    </div>
    <div class="modal-actions">
      <button class="btn danger gone" id="ea-delete-btn" onclick="deleteEditingAsset()"><i class="ti ti-trash"></i></button>
      <button class="btn" onclick="closeModal('modal-edit-asset')">Cancel</button>
      <button class="btn primary" onclick="submitEditAsset()">Save</button>
    </div>
  </div>
</div>

<!-- ADD MAINTENANCE NOTE -->
<div class="modal-bg gone" id="modal-maint-note">
  <div class="modal">
    <div class="modal-title">Add maintenance note</div>
    <div class="form-row"><div class="form-label">Date</div><input class="form-input" id="mn-date" type="date"></div>
    <div class="form-row"><div class="form-label">Note</div><textarea class="form-input" id="mn-note" placeholder="What was done?"></textarea></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal('modal-maint-note')">Cancel</button>
      <button class="btn primary" onclick="submitMaintenanceNote()">Add note</button>
    </div>
  </div>
</div>

<!-- METRIC DRILL-DOWN -->
<div class="modal-bg gone" id="modal-metric-drill">
  <div class="modal">
    <div class="modal-title" id="drill-title">Completions</div>
    <div class="drill-list" id="drill-list"></div>
    <div class="modal-actions"><button class="btn" onclick="closeModal('modal-metric-drill')">Close</button></div>
  </div>
</div>

<!-- EDIT COMPLETION -->
<div class="modal-bg gone" id="modal-reassign">
  <div class="modal" style="gap:14px">
    <div class="modal-hdr"><div class="modal-title">Edit completion</div><button class="modal-x" onclick="closeModal('modal-reassign')" aria-label="Close"><i class="ti ti-x"></i></button></div>
    <div style="font-size:13px;color:var(--text2);font-weight:500" id="reassign-name"></div>
    <div>
      <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Who completed this?</div>
      <div class="qs-btns">
        <button class="qs-btn f" id="reassign-btn-f" onclick="pickReassignPerson('Frankie')"><div class="qa">F</div><div class="qn">Frankie</div></button>
        <button class="qs-btn m" id="reassign-btn-m" onclick="pickReassignPerson('Meredith')"><div class="qa">M</div><div class="qn">Meredith</div></button>
        <button class="qs-btn" id="reassign-btn-both" onclick="pickReassignPerson('Frankie,Meredith')"><div class="qa">F&amp;M</div><div class="qn">Both</div></button>
      </div>
    </div>
    <div>
      <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Task scope</div>
      <div class="scope-pick">
        <div class="scope-opt" id="reassign-scope-house" onclick="pickReassignScope('household')"><div class="scope-opt-title">&#127968; Household</div><div class="scope-opt-desc">Shared task</div></div>
        <div class="scope-opt" id="reassign-scope-pers" onclick="pickReassignScope('personal')"><div class="scope-opt-title">&#128100; Personal</div><div class="scope-opt-desc">Owner only</div></div>
      </div>
    </div>
    <div class="modal-actions"><button class="btn" onclick="closeModal('modal-reassign')">Cancel</button><button class="btn primary" onclick="submitReassign()">Save</button></div>
  </div>
</div>

<!-- TYPE INFO MODAL -->
<div class="modal-bg gone" id="modal-type-info">
  <div class="modal">
    <div class="modal-title">Task types</div>
    <div style="display:flex;flex-direction:column;gap:12px;font-size:13.5px">
      <div><strong>One-off</strong> - A single task with one due date. Done once, then complete.</div>
      <div><strong>Floating</strong> - No fixed date. Set an urgency level (this week, this month, no rush).</div>
      <div><strong>Recurring - fixed schedule</strong> - Repeats on the same day or date regardless of when you complete it. Good for things like trash day (every Tuesday) or rent (1st of every month).</div>
      <div><strong>Recurring - from completion</strong> - Resets X days from whenever you actually finish it. Good for things like changing the AC filter (every 30 days from last service).</div>
    </div>
    <div style="font-size:11.5px;color:var(--text3);margin-top:4px">Tip: swipe right to complete, swipe left to snooze. Long-press to multi-select.</div>
    <div class="modal-actions"><button class="btn" onclick="closeModal('modal-type-info')">Got it</button></div>
  </div>
</div>

<!-- BATCH SNOOZE MODAL -->
<div class="modal-bg gone" id="modal-batch-snooze">
  <div class="modal">
    <div class="modal-title">Snooze selected tasks</div>
    <div style="font-size:13px;color:var(--text2)" id="batch-snooze-count"></div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="snooze-opt" data-bsnooze="1"><i class="ti ti-clock"></i> 1 day</button>
      <button class="snooze-opt" data-bsnooze="3"><i class="ti ti-clock"></i> 3 days</button>
      <button class="snooze-opt" data-bsnooze="5"><i class="ti ti-clock"></i> 5 days</button>
      <button class="snooze-opt" data-bsnooze="7"><i class="ti ti-clock"></i> 1 week</button>
    </div>
    <div class="form-row"><div class="form-label">Or pick a date</div><input class="form-input" id="batch-snooze-date" type="date" oninput="onBatchSnoozeDateInput()"></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal('modal-batch-snooze')">Cancel</button>
      <button class="btn primary" id="batch-snooze-confirm" onclick="confirmBatchSnooze()" disabled>Snooze all</button>
    </div>
  </div>
</div>
"""

# ─── JAVASCRIPT ───────────────────────────────────────────────────────────────
JS = """
<script>
var API='__API__';
var PINS={Frankie:'225522',Meredith:'8627'};
var state={tasks:[],projects:[],subtasks:[],grocery:[],assets:[],task_log:[],maintenance_logs:[]};
var currentUser=null,currentView='tasks',taskTab='today';
var loginUserPick=null,pickedOwner='',pickedScope='household',pickedUrgency='this_week';
var selectMode=false,selectedTaskIds=new Set(),longPressTimer=null;
var _recentlyCompleted=new Set();
// task ids with a completion request in flight, so the same task cannot be logged twice
var _completing=new Set();
var statsDays=30,statsScope='household';
var _REMINDER_DAYS={same_day:0,'1_day':1,'2_days':2,'3_days':3,'1_week':7};
var _DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
var _URG_LABELS={this_week:'This week',this_month:'This month',no_rush:'No rush'};
var _PEOPLE=['Frankie','Meredith'];
var _reassignPerson='',_reassignScope='household';
var _searchTimer=null;
var _bgSyncTimer=null,_lastFetch=0,_inFlightWrites=[],_lastWriteAt=0;
var _toastTimer=null,_toastRetry=null;
var _taskById={},_subtasksByProj={},_tasksByAsset={};
var snoozingTask=null,editingTask=null,openMenu=null,metricsTab='stats',pendingSnooze=null,editingProject=null,editingSubtask=null;
var editingAsset=null,openAssetId=null,pickedAssetStatus='green',panelTab='info';
var _drillAll=[],_drillF=[],_drillM=[],_histMenuLog=null;
var taskSearch='',searchVisible=false,pendingBatchSnooze=null;

var STATIC_ASSETS=[
  {asset_id:'a-furnace',name:'Furnace (forced air, gas)',category:'Home systems',status:'green',notes:'AHS Gold covered this replacement. $100/visit, contract #601933098, starts Jul 2 2026.',icon:'ti-flame',icon_bg:'#FEF3C7',icon_color:'#D97706',install_date:'2024-01-09',warranty_expiry:'',purchase_price:'',manual_url:'',contractors:'[{"name":"Nick","role":"Tradewinds","phone":"720-363-7600"}]'},
  {asset_id:'a-ac',name:'Air conditioner',category:'Home systems',status:'amber',notes:'Last service May 5, 2025. Annual visit required to maintain warranty.',icon:'ti-wind',icon_bg:'#DBEAFE',icon_color:'#2563EB',install_date:'2022-07-19',warranty_expiry:'',purchase_price:'',manual_url:'',contractors:'[{"name":"Jose","role":"Fix-It Now","phone":"303-657-2421"}]'},
  {asset_id:'a-radon',name:'Radon mitigation system',category:'Home systems',status:'green',notes:'Re-test every 3-4 years.',icon:'ti-ripple',icon_bg:'#F0FDF4',icon_color:'#16A34A',install_date:'2022-04-05',warranty_expiry:'2029-04-05',purchase_price:'',manual_url:'',contractors:'[{"name":"Chris Fisher","role":"5280 Radon","phone":"720-695-6677"}]'},
  {asset_id:'a-wh',name:'Water heater',category:'Home systems',status:'red',notes:'~10 years old. Approaching end of lifespan.',icon:'ti-droplet',icon_bg:'#FEF2F2',icon_color:'#DC2626',install_date:'2015-03-01',warranty_expiry:'',purchase_price:'',manual_url:'',contractors:'[]'},
  {asset_id:'a-solar',name:'Solar + Powerwall 3',category:'Home systems',status:'green',notes:'Backup reserve at 15%. EVSE included.',icon:'ti-solar-panel',icon_bg:'#EFF6FF',icon_color:'#3B82F6',install_date:'2024-04-01',warranty_expiry:'',purchase_price:'',manual_url:'',contractors:'[{"name":"Namaste Solar"}]'},
  {asset_id:'a-dishwasher',name:'Dishwasher',category:'Appliances',status:'green',notes:'FD030501376.',icon:'ti-wash-machine',icon_bg:'#F5F3FF',icon_color:'#7C3AED',install_date:'2023-07-01',warranty_expiry:'',purchase_price:'',manual_url:'',contractors:'[{"name":"Ben Myers"}]'},
  {asset_id:'a-washer',name:'Washer',category:'Appliances',status:'amber',notes:'No door gasket. Affresh monthly. Linked to main line buildup/sewer backup.',icon:'ti-wash',icon_bg:'#F0FDF4',icon_color:'#16A34A',install_date:'2018-01-01',warranty_expiry:'',purchase_price:'',manual_url:'',contractors:'[]'},
  {asset_id:'a-dryer',name:'Dryer',category:'Appliances',status:'red',notes:'Vent last cleaned Mar 2022. Schedule after basement remodel.',icon:'ti-wind',icon_bg:'#FFF7ED',icon_color:'#EA580C',install_date:'2017-01-01',warranty_expiry:'',purchase_price:'',manual_url:'',contractors:'[]'},
  {asset_id:'a-roof',name:'Roof',category:'Structure & exterior',status:'amber',notes:'~8 years old. Warranty status unverified.',icon:'ti-home',icon_bg:'#F8FAFC',icon_color:'#475569',install_date:'2017-05-23',warranty_expiry:'',purchase_price:'',manual_url:'',contractors:'[]'},
  {asset_id:'a-fence',name:'Fence, gate + operator',category:'Structure & exterior',status:'green',notes:'MyQ enabled.',icon:'ti-fence',icon_bg:'#FEF9C3',icon_color:'#CA8A04',install_date:'2024-05-16',warranty_expiry:'2028-05-16',purchase_price:'',manual_url:'',contractors:'[{"name":"Preston Garcia","role":"Denco","phone":"303-223-6902"}]'},
  {asset_id:'a-insulation',name:'Attic insulation',category:'Structure & exterior',status:'green',notes:'Sealed + insulated to R-60.',icon:'ti-layers',icon_bg:'#F0FDF4',icon_color:'#16A34A',install_date:'2025-04-01',warranty_expiry:'',purchase_price:'',manual_url:'',contractors:'[{"name":"REenergizeCO","phone":"303-227-1000"}]'},
  {asset_id:'a-garage',name:'Garage door openers',category:'Structure & exterior',status:'green',notes:'MyQ compatible.',icon:'ti-building-warehouse',icon_bg:'#F1F5F9',icon_color:'#64748B',install_date:'2024-01-08',warranty_expiry:'',purchase_price:'',manual_url:'',contractors:'[{"name":"Colorado Overhead Door","phone":"303-308-8100"}]'}
];

// ── BOOT ──────────────────────────────────────────────────
window.onload=function(){
  var s=localStorage.getItem('loonhq_user');
  if(s==='Frankie'||s==='Meredith'){currentUser=s;showApp();refreshData();apiGet({action:'ping'}).catch(function(){});}
  else showLogin();
};
function showLogin(){document.getElementById('login-screen').classList.remove('gone');document.getElementById('main-app').classList.add('gone');}
function showApp(){document.getElementById('login-screen').classList.add('gone');document.getElementById('main-app').classList.remove('gone');updateUserDisplay();}

function selectUser(name,btn){
  loginUserPick=name;
  document.querySelectorAll('.who-btn').forEach(function(b){b.className='who-btn';});
  btn.className='who-btn sel-'+name.charAt(0).toLowerCase();
  document.getElementById('pin-wrap').style.visibility='visible';
  document.getElementById('pin-label').textContent='Enter '+name+"'s PIN";
  var p=document.getElementById('pin-input');p.value='';p.focus();
}
document.getElementById('pin-input').addEventListener('input',function(e){
  var val=e.target.value;document.getElementById('pin-err').textContent='';
  if(!loginUserPick)return;
  if(val.length>=PINS[loginUserPick].length){
    if(val===PINS[loginUserPick]){currentUser=loginUserPick;localStorage.setItem('loonhq_user',currentUser);showApp();refreshData();apiGet({action:'ping'}).catch(function(){});}
    else{document.getElementById('pin-err').textContent='Incorrect PIN';e.target.value='';}
  }
});
function logout(){localStorage.removeItem('loonhq_user');currentUser=null;loginUserPick=null;closeModal('modal-qs');document.querySelectorAll('.who-btn').forEach(function(b){b.className='who-btn';});document.getElementById('pin-wrap').style.visibility='hidden';document.getElementById('pin-input').value='';showLogin();}
function updateUserDisplay(){
  var ch=currentUser.charAt(0),cls=currentUser==='Frankie'?'f':'m';
  var av=document.getElementById('user-avatar');av.textContent=ch;av.className='user-av '+cls;
  document.getElementById('user-name').textContent=currentUser;
  var mob=document.getElementById('mob-user');mob.textContent=ch;mob.className='mobile-hdr-user '+cls;
}
function openQuickSwitch(){openModal('modal-qs');}
function quickSwitch(name){currentUser=name;localStorage.setItem('loonhq_user',name);updateUserDisplay();closeModal('modal-qs');renderAll();}

// ── API ───────────────────────────────────────────────────
// Apps Script returns {error:...} inside an HTTP 200 body, so a plain .json()
// would resolve on failure and make every .catch() below unreachable. Reject
// instead, tagging the error so refreshData can tell it apart from being offline.
function _apiParse(r){return r.json().then(function(d){if(d&&d.error){var e=new Error(d.error);e.apiError=true;throw e;}return d;});}
// Apps Script can hang: a cold start, a quota hiccup, a dead connection. Without a timeout
// the promise never settles, so the optimistic card stays pending forever and no .catch()
// ever runs, which means no toast and no retry. Bound every request.
var API_TIMEOUT=25000;
function _fetchTimeout(url,opts){
  if(typeof AbortController==='undefined')return fetch(url,opts);
  var ctl=new AbortController(),timer=null;
  var done=function(){if(timer){clearTimeout(timer);timer=null;}};
  timer=setTimeout(function(){timer=null;ctl.abort();},API_TIMEOUT);
  return fetch(url,Object.assign({},opts||{},{signal:ctl.signal})).then(
    function(r){done();return r;},
    function(e){done();
      if(e&&(e.name==='AbortError'||e.code===20)){var te=new Error('Request timed out');te.timedOut=true;throw te;}
      throw e;});
}
function apiGet(params){var url=API+'?'+Object.entries(params).map(function(p){return p[0]+'='+encodeURIComponent(p[1]);}).join('&');return _fetchTimeout(url).then(_apiParse);}
// Every POST mutates. Track them so refreshData can tell when a getAllData payload
// may predate a write that has not been acknowledged yet.
function apiPost(body){
  var startedAt=Date.now();_inFlightWrites.push(startedAt);
  var p=_fetchTimeout(API,{method:'POST',body:JSON.stringify(body)}).then(_apiParse);
  var settle=function(){var i=_inFlightWrites.indexOf(startedAt);if(i>=0)_inFlightWrites.splice(i,1);_lastWriteAt=Date.now();};
  p.then(settle,settle);
  return p;
}
// A request that never settles (hung connection) must not block syncing forever, so
// writes older than 15s stop counting as pending.
// A backstop against a hung request blocking sync forever. The cutoff MUST be longer than
// API_TIMEOUT: at 15s it expired writes that were still genuinely in flight, so refreshData
// treated server state as authoritative, cleared _recentlyCompleted, and a task the user had
// just ticked off REAPPEARED on the list. Tapping it again wrote a second completion row.
// _fetchTimeout now guarantees every request settles within API_TIMEOUT, so this only has to
// cover the impossible case.
function writesPending(){var cut=Date.now()-(API_TIMEOUT+5000);_inFlightWrites=_inFlightWrites.filter(function(t){return t>cut;});return _inFlightWrites.length>0;}

function refreshData(silent){
  if(!silent)setSyncState('loading','Syncing...');
  var syncStart=Date.now();
  return apiGet({action:'getAllData'}).then(function(data){
    // A write that is still in flight, or that landed after this fetch was issued, may not be
    // reflected in this payload. Applying it would resurrect a task the user just deleted or
    // undo a snooze. Keep the optimistic state and try again once the writes have settled.
    if(writesPending()||_lastWriteAt>syncStart){
      document.getElementById('loader').style.display='none';
      document.getElementById('v-'+currentView).classList.remove('gone');
      renderAll();scheduleBgSync();return;   // keep the UI honest while we wait
    }
    _lastFetch=Date.now();
    // Server state is now authoritative for everything that was pending.
    _recentlyCompleted.clear();
    state.tasks=data.tasks||[];state.projects=data.projects||[];state.subtasks=data.subtasks||[];
    state.grocery=data.grocery||[];state.task_log=data.task_log||[];
    rebuildTaskIndex();
    _subtasksByProj={};(state.subtasks||[]).forEach(function(s){var k=String(s.project_id);if(!_subtasksByProj[k])_subtasksByProj[k]=[];_subtasksByProj[k].push(s);});
    _tasksByAsset={};(state.tasks||[]).forEach(function(t){if(t.linked_asset_id){var k=String(t.linked_asset_id);if(!_tasksByAsset[k])_tasksByAsset[k]=[];_tasksByAsset[k].push(t);}});
    state.assets=(data.assets&&data.assets.length)?data.assets:STATIC_ASSETS;
    state.maintenance_logs=data.maintenance_logs||[];
    var now=Date.now();
    // Deferred: firing these inline stamped _lastWriteAt mid-sync, which made the NEXT
    // sync discard its payload and wait another cycle.
    var _staleGrocery=state.grocery.filter(function(g){return g.status==='got'&&g.checked_at&&(now-new Date(g.checked_at).getTime())>43200000;});
    if(_staleGrocery.length)setTimeout(function(){_staleGrocery.forEach(function(g){apiPost({action:'deleteGrocery',data:{item_id:g.item_id}}).catch(function(){});});},0);
    document.getElementById('loader').style.display='none';
    document.getElementById('v-'+currentView).classList.remove('gone');
    renderAll();setSyncState('ok','Synced '+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}));
  }).catch(function(err){
    document.getElementById('loader').style.display='none';
    document.getElementById('v-'+currentView).classList.remove('gone');
    // Server reachable but rejected the request: keep cached data, don't fall back to STATIC_ASSETS.
    if(err&&err.apiError){setSyncState('err','Sync failed');return;}
    state.assets=STATIC_ASSETS;state.maintenance_logs=[];renderAll();setSyncState('err','Offline');
  });
}
// Debounced, so a burst of actions still collapses into one sync. The delay is a parameter
// because the two cases want different things: after a write has SUCCEEDED the pending card
// is waiting on the real row, so sync fast (SYNC_FAST). After a rollback, or when a payload
// was discarded, back off (SYNC_SLOW) to let writes settle.
var SYNC_FAST=700,SYNC_SLOW=3000;
function scheduleBgSync(delay){if(_bgSyncTimer)clearTimeout(_bgSyncTimer);_bgSyncTimer=setTimeout(function(){_bgSyncTimer=null;refreshData(true);},delay||SYNC_SLOW);}
function rebuildTaskIndex(){_taskById={};(state.tasks||[]).forEach(function(t){_taskById[t.task_id]=t;});}
// Shared tail for every failed optimistic action: undo locally, tell the user, then let the
// server settle it. The reconcile matters because a local undo can disagree with the server
// (a batch that partly landed, an edit that added fields the snapshot never had).
function actionFailed(msg,render,label,retry){
  if(render)render();
  scheduleBgSync();showToast(msg,retry);setSyncState('err',label||'Could not save');
}
// retry is optional; when given, the toast becomes tappable and re-runs the failed action.
function showToast(msg,retry){
  var t=document.getElementById('toast-msg');if(!t)return;
  if(_toastTimer){clearTimeout(_toastTimer);_toastTimer=null;}   // don't let an older toast cut this one short
  t.textContent=retry?(msg+'  \u00b7  Tap to retry'):msg;
  t.classList.toggle('tappable',!!retry);
  _toastRetry=retry||null;
  t.classList.add('on');
  _toastTimer=setTimeout(function(){_toastTimer=null;hideToast();},retry?7000:4000);
}
function hideToast(){var t=document.getElementById('toast-msg');if(t){t.classList.remove('on');t.classList.remove('tappable');}_toastRetry=null;}
function onToastTap(){var r=_toastRetry;hideToast();if(_toastTimer){clearTimeout(_toastTimer);_toastTimer=null;}if(r)r();}
// Backstop: now that apiPost rejects on server errors, any call site without its
// own .catch() would surface an unhandled rejection. Report it rather than fail silently.
if(typeof window!=='undefined'&&window.addEventListener)window.addEventListener('unhandledrejection',function(e){if(e.reason&&e.reason.apiError){e.preventDefault();scheduleBgSync();showToast("Couldn't save, try again");setSyncState('err','Save failed');}});
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'&&_lastFetch&&(Date.now()-_lastFetch)>60000)refreshData(true);});
function setSyncState(s,msg){var d=document.getElementById('sync-dot'),l=document.getElementById('sync-lbl');if(d)d.className='sync-dot'+(s==='err'?' err':s==='loading'?' loading':'');if(l)l.textContent=msg;}
function renderAll(){
  if(currentView==='tasks')renderTasks();
  else if(currentView==='projects')renderProjects();
  else if(currentView==='grocery')renderGrocery();
  else if(currentView==='assets')renderAssets();
  else if(currentView==='metrics'){if(metricsTab==='stats')renderStats();else renderHistory();}
}

// ── NAV ───────────────────────────────────────────────────
var pageNames={tasks:'Tasks',projects:'Projects',grocery:'Shopping List',assets:'Assets',metrics:'Activity'};
var addLabels={tasks:'Add task',projects:'Add project',grocery:'Add item',assets:'',metrics:''};
function go(name){
  exitBatch();
  if(currentView)document.getElementById('v-'+currentView).classList.add('gone');
  currentView=name;
  document.getElementById('v-'+name).classList.remove('gone');
  document.querySelectorAll('[data-view]').forEach(function(n){n.classList.toggle('on',n.dataset.view===name);});
  document.getElementById('pgtitle').textContent=pageNames[name];
  document.getElementById('mob-sub-title').textContent=pageNames[name];
  document.getElementById('topbtnlbl').textContent=addLabels[name];
  document.getElementById('topbtn').style.display=(name==='metrics'||name==='assets')?'none':'flex';
  document.getElementById('fab').style.display=(name==='metrics'||name==='assets')?'none':'flex';
  var mb=document.getElementById('mob-more-btn');if(mb)mb.style.display=name==='tasks'?'flex':'none';
  var sb=document.getElementById('select-btn');if(sb)sb.style.display=(name==='tasks'&&taskTab!=='history')?'':'none';
  closePanel();
  if(name==='metrics'){if(metricsTab==='stats')renderStats();else renderHistory();}
  else if(name==='projects')renderProjects();
  else if(name==='grocery')renderGrocery();
  else if(name==='assets')renderAssets();
  else renderTasks();
}
function handleAdd(){if(currentView==='tasks')openAddTask();else if(currentView==='projects')openAddProject();else if(currentView==='grocery')openAddGrocery();}
function openMobileMenu(){openModal('modal-mobile-menu');}

// ── SCOPE / TAB ───────────────────────────────────────────
function setTaskTab(t){
  taskTab=t;
  document.querySelectorAll('[data-tab]').forEach(function(b){b.classList.toggle('on',b.dataset.tab===t);});
  var isHist=t==='history';
  // Toggle history search bar vs task search bar
  var hb=document.getElementById('task-hist-bar');if(hb)hb.classList.toggle('gone',!isHist);
  if(isHist&&searchVisible){searchVisible=false;var sb2=document.getElementById('search-bar');if(sb2)sb2.classList.remove('on');}
  var sb=document.getElementById('select-btn');if(sb)sb.style.display=isHist?'none':'';
  exitBatch();renderTasks();
}
function toggleLegend(){}
// ── SEARCH ────────────────────────────────────────────────
function toggleSearch(){
  searchVisible=!searchVisible;
  var bar=document.getElementById('search-bar');
  if(bar)bar.classList.toggle('on',searchVisible);
  if(searchVisible){var inp=document.getElementById('search-inp');if(inp)setTimeout(function(){inp.focus();},50);}
  else{clearSearch();}
}
function onSearchInput(){
  var v=((document.getElementById('search-inp')||{}).value||'');
  taskSearch=v;
  var clr=document.getElementById('search-clear');
  if(clr)clr.classList.toggle('on',!!v);
  clearTimeout(_searchTimer);_searchTimer=setTimeout(renderTasks,120);
}
function clearSearch(){
  taskSearch='';
  var inp=document.getElementById('search-inp');if(inp)inp.value='';
  var clr=document.getElementById('search-clear');if(clr)clr.classList.remove('on');
  renderTasks();
}

// ── RECURRENCE ────────────────────────────────────────────
function schedFreqOf(task){
  if(task.sched_freq)return String(task.sched_freq);
  if(task.weekday!==''&&task.weekday!==null&&task.weekday!==undefined&&String(task.weekday).trim()!=='')return 'week';
  var sm=task.sched_month;
  if(sm!==''&&sm!==null&&sm!==undefined&&String(sm).trim()!==''&&String(sm)!=='0')return 'year';
  if(task.day_of_month!==''&&task.day_of_month!==null&&task.day_of_month!==undefined&&String(task.day_of_month).trim()!=='')return 'month';
  return 'day';
}
function nthWeekdayOfMonth(n,weekday,year,month){
  if(n===-1){var last=new Date(year,month+1,0);var diff=(last.getDay()-weekday+7)%7;return new Date(year,month,last.getDate()-diff);}
  var first=new Date(year,month,1);var diff=(weekday-first.getDay()+7)%7;return new Date(year,month,1+diff+(n-1)*7);
}
function parsePat(pat){var parts=pat.split('-');var nthMap={first:1,second:2,third:3,fourth:4,last:-1};var n=nthMap[parts[0]];if(n===undefined)return null;var w=parseInt(parts[1]);if(isNaN(w))return null;return{n:n,w:w};}
function monthStepDate(baseY,baseM,monthsToAdd,dom){
  var m=baseM+monthsToAdd;var ty=baseY+Math.floor(m/12);var tm=((m%12)+12)%12;
  var lastDay=new Date(ty,tm+1,0).getDate();
  var day=(String(dom)==='last')?lastDay:Math.min(parseInt(dom)||1,lastDay);
  return new Date(ty,tm,day);
}
function computeFirstDue(task,today){
  var todayMid=new Date(today);todayMid.setHours(0,0,0,0);
  var start=task.sched_start?new Date(String(task.sched_start).split('T')[0]+'T12:00:00'):null;
  if(start)start.setHours(0,0,0,0);
  var useStart=!!(start&&start>todayMid);
  var t=useStart?new Date(start):new Date(todayMid);
  if(task.type==='interval'){var days=parseInt(task.recurrence_days)||0;if(!days)return null;return t.toISOString().split('T')[0];}
  if(task.type!=='scheduled')return task.due_date||'';
  var freq=schedFreqOf(task);var next;
  if(freq==='day'){next=new Date(t);}
  else if(freq==='week'){
    var pat=task.sched_pattern||'';var pp=pat?parsePat(pat):null;
    if(pp){next=nthWeekdayOfMonth(pp.n,pp.w,t.getFullYear(),t.getMonth());if(next<t)next=nthWeekdayOfMonth(pp.n,pp.w,t.getFullYear(),t.getMonth()+1);}
    else{var target=parseInt(task.weekday)||0;next=new Date(t);while(next.getDay()!==target)next.setDate(next.getDate()+1);}
  }
  else if(freq==='month'){
    var pat=task.sched_pattern||'';var pp=pat?parsePat(pat):null;
    if(pp){next=nthWeekdayOfMonth(pp.n,pp.w,t.getFullYear(),t.getMonth());if(next<t)next=nthWeekdayOfMonth(pp.n,pp.w,t.getFullYear(),t.getMonth()+1);}
    else{next=monthStepDate(t.getFullYear(),t.getMonth(),0,task.day_of_month);if(next<t)next=monthStepDate(t.getFullYear(),t.getMonth(),1,task.day_of_month);}
  }
  else{var ym=(parseInt(task.sched_month)||1)-1;var ld=new Date(t.getFullYear(),ym+1,0).getDate();next=new Date(t.getFullYear(),ym,Math.min(parseInt(task.day_of_month)||1,ld));if(next<t)next=new Date(t.getFullYear()+1,ym,parseInt(task.day_of_month)||1);}
  if(task.end_date){var e=new Date(String(task.end_date).split('T')[0]+'T12:00:00');if(next>e)return null;}
  return next.toISOString().split('T')[0];
}
function computeNextDue(task,fromDate){
  var from=new Date(fromDate);from.setHours(0,0,0,0);
  if(task.end_date){var e=new Date(String(task.end_date).split('T')[0]+'T12:00:00');if(from>e)return null;}
  var next=null;
  if(task.type==='interval'){
    var n=parseInt(task.recurrence_days)||0;if(!n)return null;
    var unit=task.sched_freq||'day';
    // month/year must clamp to the last valid day, not overflow: Jan 31 + 1mo is Feb 28, not Mar 3.
    if(unit==='month')next=monthStepDate(from.getFullYear(),from.getMonth(),n,from.getDate());
    else if(unit==='year')next=monthStepDate(from.getFullYear(),from.getMonth(),n*12,from.getDate());
    else{next=new Date(from);next.setDate(next.getDate()+(unit==='week'?n*7:n));}
  }
  else if(task.type==='scheduled'){
    var freq=schedFreqOf(task);var X=Math.max(1,parseInt(task.sched_interval)||1);
    var base=task.due_date?new Date(String(task.due_date).split('T')[0]+'T12:00:00'):null;
    if(!base){var f=computeFirstDue(task,from);if(!f)return null;base=new Date(f+'T12:00:00');}
    base.setHours(0,0,0,0);next=new Date(base);
    if(freq==='day'){next.setDate(next.getDate()+X);while(next<=from)next.setDate(next.getDate()+X);}
    else if(freq==='week'){
      var pat2=task.sched_pattern||'';var pp2=pat2?parsePat(pat2):null;
      if(pp2){var nm=new Date(base);nm.setMonth(nm.getMonth()+X);next=nthWeekdayOfMonth(pp2.n,pp2.w,nm.getFullYear(),nm.getMonth());while(next<=from){nm.setMonth(nm.getMonth()+X);next=nthWeekdayOfMonth(pp2.n,pp2.w,nm.getFullYear(),nm.getMonth());}}
      else{next.setDate(next.getDate()+7*X);while(next<=from)next.setDate(next.getDate()+7*X);}
    }
    else if(freq==='month'){
      var pat2=task.sched_pattern||'';var pp2=pat2?parsePat(pat2):null;
      if(pp2){var k=X;next=nthWeekdayOfMonth(pp2.n,pp2.w,base.getFullYear(),base.getMonth()+k);while(next<=from){k+=X;next=nthWeekdayOfMonth(pp2.n,pp2.w,base.getFullYear(),base.getMonth()+k);}}
      else{var k=X;next=monthStepDate(base.getFullYear(),base.getMonth(),k,task.day_of_month);while(next<=from){k+=X;next=monthStepDate(base.getFullYear(),base.getMonth(),k,task.day_of_month);}}
    }
    else if(freq==='year'){var ky=X;var bd=base.getDate();var ystep=function(kk){var ty=base.getFullYear()+kk;var ld=new Date(ty,base.getMonth()+1,0).getDate();return new Date(ty,base.getMonth(),Math.min(bd,ld));};next=ystep(ky);while(next<=from){ky+=X;next=ystep(ky);}}
  }
  if(!next)return null;
  if(task.end_date){var e2=new Date(String(task.end_date).split('T')[0]+'T12:00:00');if(next>e2)return null;}
  return next.toISOString().split('T')[0];
}

// ── RENDER TASKS ──────────────────────────────────────────
function renderTasks(){
  var el=document.getElementById('task-list');el.innerHTML='';
  var all=state.tasks.filter(function(t){
    if(_recentlyCompleted.has(t.task_id))return false;
    if((t.status==='done'||t.status==='ended')&&t.type!=='scheduled'&&t.type!=='interval')return false;
    if(t.status==='ended')return false;
    var sc=t.scope||'household';
    if(sc==='personal'&&t.owner&&!hasPerson(t.owner,currentUser))return false;
    if(taskSearch){var q=taskSearch.toLowerCase();if(!(t.name||'').toLowerCase().includes(q)&&!(t.notes||'').toLowerCase().includes(q))return false;}
    return true;
  });
  var now=new Date();now.setHours(0,0,0,0);
  var tm0=new Date(now);tm0.setDate(now.getDate()+1);
  var we=new Date(now);we.setDate(now.getDate()+7);
  var me=new Date(now);me.setDate(now.getDate()+30);
  var overdue=[],today=[],reminders=[],tomorrow=[],week=[],month=[],later=[];
  all.forEach(function(t){
    if(t.type==='floating'){
      if(t.urgency_window==='this_week')week.push(t);
      else if(t.urgency_window==='no_rush')later.push(t);
      else month.push(t);
      return;
    }
    var dueStr=t.due_date;
    if(t.type==='interval'||t.type==='scheduled'){
      if(t.status==='done'){var nd=computeNextDue(t,now);dueStr=nd||null;}
      else{
        var ss=t.sched_start?new Date(String(t.sched_start).split('T')[0]+'T12:00:00'):null;
        if(ss)ss.setHours(0,0,0,0);
        // Recompute if sched_start is strictly future (wrong stored due_date from old AppScript)
        // or if no due_date at all. Past/today sched_start: trust due_date (may be post-completion).
        if((ss&&ss>now)||!dueStr){var fd=computeFirstDue(t,now);if(fd)dueStr=fd;}
      }
    }
    t._effDue=dueStr||null;
    if(!dueStr){later.push(t);return;}
    var due=new Date(String(dueStr).split('T')[0]+'T12:00:00');due.setHours(0,0,0,0);
    var surf=due;
    if(t.reminder_offset){var bk=_REMINDER_DAYS[t.reminder_offset]||0;surf=new Date(due);surf.setDate(surf.getDate()-bk);}
    if(due<now){if(t.type==='interval'||t.type==='scheduled')today.push(t);else overdue.push(t);}
    else
    if(due.getTime()===now.getTime())today.push(t);
    else if(surf<=now)reminders.push(t);
    else if(due.getTime()===tm0.getTime())tomorrow.push(t);
    else if(due<=we)week.push(t);
    else if(due<=me)month.push(t);
    else later.push(t);
  });
  var projRows=[];
  state.projects.filter(function(p){return p.status==='active';}).forEach(function(p){
    var active=(_subtasksByProj[String(p.project_id)]||[]).filter(function(s){return s.status==='next_up'||s.status==='in_progress';});
    if(active.length)projRows.push({project:p,subtasks:active});
  });
  function stripe(label,tasks,projs,cls){
    if(!tasks.length&&!(projs||[]).length)return;
    var w=document.createElement('div');w.className='stripe '+cls;
    var lb=document.createElement('div');lb.className='s-lbl';lb.textContent=label;w.appendChild(lb);
    tasks.forEach(function(t){w.appendChild(makeTaskCard(t));});
    (projs||[]).forEach(function(pr){w.appendChild(makeProjRow(pr));});
    el.appendChild(w);
  }
  if(taskTab==='history'){renderTaskHistory();return;}
  if(taskTab==='today'){
    stripe('Overdue',overdue,[],'r');
    stripe('Today',today,[],'o');
    if(!overdue.length&&!today.length)el.innerHTML='<div style="font-size:13.5px;color:var(--text3);padding:30px 0;text-align:center">Nothing due today.</div>';
    return;
  }
  if(taskTab==='all'){
    stripe('Overdue',overdue,[],'r');
    stripe('Today',today,[],'o');
    stripe('Reminders',reminders,[],'n');
    stripe('Tomorrow',tomorrow,[],'g');
    stripe('This next week',week,projRows,'b');
    stripe('This next month',month,[],'p');
    stripe('Later',later,[],'n');
  }
  else if(taskTab==='upcoming'){
    stripe('Overdue',overdue,[],'r');
    stripe('Today',today,[],'o');
    stripe('Reminders',reminders,[],'n');
    stripe('Tomorrow',tomorrow,[],'g');
    stripe('This next week',week,projRows,'b');
    stripe('This next month',month,[],'p');
  }
  else if(taskTab==='recurring'){var rec=all.filter(function(t){return t.type==='scheduled'||t.type==='interval';});stripe('All recurring',rec,[],'g');}
  if(!el.children.length)el.innerHTML='<div style="font-size:13.5px;color:var(--text3);padding:30px 0;text-align:center">No tasks here. Nice work!</div>';
}
// A log row counts as a completion only if nothing on it marks it as something else.
// The subtle part: v8.5-era snoozeTask wrote log_type/details into task_log columns that
// the sheet's header row never labelled (setupHeaders was never run for them). sheetToObjects
// keys cells by header text, so those values collapse under the '' key and the NAMED fields
// come back undefined. Reading only l.log_type / l.details therefore sees a clean row and
// counts every snooze as a completion. Probe the overflow key as well.
// owner and completed_by hold '' (either of us), one name, or both names comma joined.
// One task, one log row: a joint task credits both without duplicating either.
function peopleOf(v){var s=String(v||'');return s?s.split(','):[];}
function hasPerson(v,name){return String(v||'').indexOf(name)>=0;}
function peopleLabel(v){var p=peopleOf(v);return p.length?p.join(' & '):'Unknown';}
function personDot(v){var f=hasPerson(v,'Frankie'),m=hasPerson(v,'Meredith');return f&&m?'both':f?'':m?'b':'n';}
// A task owned by both credits both, whoever actually ticks it off.
function creditFor(t){var o=String(t.owner||'');return o.indexOf(',')>=0?o:currentUser;}

function isNonCompletionMark(v){
  if(v===null||v===undefined)return false;
  v=String(v);
  if(v==='snooze'||v==='edit'||v==='manual_note')return true;
  return v.indexOf('until_date')>=0;
}
function isCompletionLog(l){
  if(!l)return false;
  if(String(l.log_type||'completion')!=='completion')return false;
  if(isNonCompletionMark(l.details))return false;
  if(isNonCompletionMark(l['']))return false;   // unlabelled-column overflow
  return true;
}
function renderTaskHistory(){
  var el=document.getElementById('task-list');el.innerHTML='';
  var search=((document.getElementById('task-hist-search')||{}).value||'').toLowerCase();
  var log=(state.task_log||[]).filter(function(l){
    if(!isCompletionLog(l))return false;
    if(l.scope==='personal'&&!hasPerson(l.completed_by,currentUser))return false;
    if(search&&!((l.task_name||'').toLowerCase().includes(search)||(l.completed_by||'').toLowerCase().includes(search)))return false;
    return true;
  }).slice().sort(function(a,b){return new Date(b.completed_at)-new Date(a.completed_at);});
  if(!log.length){el.innerHTML='<div style="font-size:12.5px;color:var(--text3);padding:20px 0;text-align:center">No completions found.</div>';return;}
  log.forEach(function(l){
    var d=document.createElement('div');d.className='history-item';
    var mb=document.createElement('button');mb.className='history-menu-btn';mb.innerHTML='<i class="ti ti-dots-vertical"></i>';
    mb.addEventListener('click',function(e){e.stopPropagation();openHistoryActionMenu(e,l);});
    var who=peopleLabel(l.completed_by);
    var dotCls=personDot(l.completed_by);
    d.innerHTML='<div class="ldot '+dotCls+'"></div><div style="flex:1;min-width:0"><div class="lt">'+esc(l.task_name)+'</div><div class="lm">'+esc(who)+' · '+fmtTimestamp(l.completed_at)+'</div></div>';
    d.appendChild(mb);el.appendChild(d);
  });
}

function makeTaskCard(t){
  var wrap=document.createElement('div');
  wrap.className='tc-wrap';wrap.dataset.taskId=t.task_id;

  // Single dynamic swipe background (FIXED: one element, updated dynamically)
  var swipeBg=document.createElement('div');swipeBg.className='swipe-bg';
  swipeBg.innerHTML='<span class="swipe-complete-content"><i class="ti ti-check"></i><span>Complete</span></span><span class="swipe-snooze-content"><i class="ti ti-clock"></i><span>Snooze</span></span>';
  wrap.appendChild(swipeBg);

  var div=document.createElement('div');div.className='tc'+(t._temp?' loading':'');
  if(selectMode&&selectedTaskIds.has(t.task_id))div.classList.add('selected');

  // Circle: tap = complete (or select in batch mode)
  var circ=document.createElement('div');circ.className='circ';
  if(selectMode&&selectedTaskIds.has(t.task_id))circ.classList.add('sel');
  circ.addEventListener('click',function(e){
    e.stopPropagation();
    if(selectMode){toggleSelect(t.task_id);return;}
    handleComplete(t);
  });
  div.appendChild(circ);

  // Body: tap = open edit modal
  var ti=document.createElement('div');ti.className='tcontent';
  ti.addEventListener('click',function(e){
    if(selectMode){toggleSelect(t.task_id);return;}
    openEditTask(t);
  });

  var tn=document.createElement('div');tn.className='tn';
  tn.textContent=t.name||'(untitled)';
  ti.appendChild(tn);

  var tm=document.createElement('div');tm.className='tm';

  // Tag
  var freq=t.type==='scheduled'?schedFreqOf(t):'';
  var X=Math.max(1,parseInt(t.sched_interval)||1);
  function schedLbl(){
    if(freq==='day')return X===1?'Daily':'Every '+X+'d';
    if(freq==='week')return X===1?('Every '+_DAYS[parseInt(t.weekday)||0]):('Every '+X+' wks');
    if(freq==='month')return X===1?'Monthly':'Every '+X+' mo';
    if(freq==='year')return X===1?'Yearly':'Every '+X+' yrs';
    return 'Scheduled';
  }
  var tagCls=t.type==='one_off'?'tag-oneoff':t.type==='floating'?'tag-floating':t.type==='scheduled'?((freq==='week')?'tag-sched-w':'tag-sched-m'):'tag-interval';
  var tagLabel={one_off:'One-off',floating:'Floating',scheduled:schedLbl(),interval:(function(){var n=t.recurrence_days||'?';var u={'day':'d','week':'wk','month':'mo','year':'yr'}[t.sched_freq||'day']||'d';return 'Every '+n+u;})()}[t.type]||t.type;
  var tag=document.createElement('span');tag.className='tag '+tagCls;tag.textContent=tagLabel;tm.appendChild(tag);
  if((t.scope||'household')==='personal'){var pb=document.createElement('span');pb.className='personal-badge';pb.innerHTML='<i class="ti ti-lock"></i>';tm.appendChild(pb);}

  // Link icons
  if(t.linked_asset_id){
    var ai=document.createElement('i');
    ai.className='ti ti-tool link-icon link-icon-asset';ai.title='Linked asset';
    ai.addEventListener('click',function(e){e.stopPropagation();openAssetPanel(t.linked_asset_id);});
    tm.appendChild(ai);
  }
  if(t.linked_project_id){
    var proj=(state.projects||[]).find(function(p){return String(p.project_id)===String(t.linked_project_id);});
    var pName=proj?proj.name:'Project';
    var pShort=pName.length>10?pName.substring(0,9)+'…':pName;
    var pli=document.createElement('span');pli.className='proj-tag';pli.title=pName;
    pli.innerHTML='<i class="ti ti-clipboard-list"></i>';pli.appendChild(document.createTextNode(' '+pShort));
    pli.addEventListener('click',function(e){e.stopPropagation();go('projects');});
    tm.appendChild(pli);
  }

  // Context pills
  if(t.type==='floating'&&t.urgency_window){
    var mp=document.createElement('span');mp.className='mp';mp.textContent=_URG_LABELS[t.urgency_window]||'';tm.appendChild(mp);
  }
  var _effD=(t.type==='interval'||t.type==='scheduled')?t._effDue||t.due_date:t.due_date;
  if(_effD&&t.type!=='floating'){
    var dds=String(_effD).split('T')[0];
    var dd=new Date(dds+'T12:00:00');dd.setHours(0,0,0,0);
    var today0=new Date();today0.setHours(0,0,0,0);
    var diff=Math.round((dd-today0)/86400000);
    var dcls,dtext;
    var isRecurring=(t.type==='interval'||t.type==='scheduled');
    if(diff<0){dcls=isRecurring?'due-today':'due-overdue';dtext=fmtDateShort(_effD);}
    else if(diff===0){dcls='due-today';dtext='Today';}
    else if(diff===1){dcls='due-soon';dtext='Tomorrow';}
    else if(diff<=7){dcls='due-week';dtext=fmtDateShort(_effD);}
    else if(diff<=30){dcls='due-month';dtext=fmtDateShort(_effD);}
    else{dcls='due-future';dtext=fmtDateShort(_effD);}
    var dp=document.createElement('span');dp.className='due-tag '+dcls;
    var dic=document.createElement('i');dic.className='ti '+(diff<0&&!isRecurring?'ti-alert-triangle':'ti-calendar-event');dp.appendChild(dic);
    dp.appendChild(document.createTextNode(dtext));
    tm.appendChild(dp);
  }
  if(t.end_date){var ep=document.createElement('span');ep.className='mp';ep.textContent='Until '+fmtDate(t.end_date);tm.appendChild(ep);}

  ti.appendChild(tm);div.appendChild(ti);

  // Owner dot
  var ow=document.createElement('div');ow.className='owners';
  var who=document.createElement('div');
  var own=peopleOf(t.owner);
  if(own.length>1){who.className='who who-both';who.title='Both of us';}
  else if(own[0]==='Frankie'){who.className='who who-f';who.textContent='F';}
  else if(own[0]==='Meredith'){who.className='who who-m';who.textContent='M';}
  else{who.className='who who-either';who.title='Either of us';}
  ow.appendChild(who);div.appendChild(ow);

  // Three-dot menu
  var mb=document.createElement('button');mb.className='task-menu-btn';mb.innerHTML='&#8943;';
  mb.addEventListener('click',function(e){e.stopPropagation();openTaskMenu(e,t);});
  div.appendChild(mb);

  wrap.appendChild(div);
  attachSwipe(div,wrap,swipeBg,t);
  attachLongPress(div,t);
  return wrap;
}

function makeProjRow(pr){
  var wrap=document.createElement('div');wrap.className='tc-wrap';
  var div=document.createElement('div');div.className='tc';
  div.style.background='var(--amber-light)';div.style.borderStyle='dashed';div.style.borderColor='var(--amber)';
  div.addEventListener('click',function(){go('projects');});
  var c=document.createElement('div');c.className='circ';c.style.borderColor='var(--amber)';div.appendChild(c);
  var ti=document.createElement('div');ti.className='tcontent';
  var tn=document.createElement('div');tn.className='tn';
  tn.innerHTML=esc(pr.project.name)+' <span style="color:var(--text3);font-weight:400;font-size:12px">- '+pr.subtasks.length+' ready</span>';
  var tm=document.createElement('div');tm.className='tm';
  var tag=document.createElement('span');tag.className='tag tag-proj';tag.textContent='Project';tm.appendChild(tag);
  if(pr.subtasks[0]){var nx=document.createElement('span');nx.className='mp';nx.textContent=pr.subtasks[0].name;tm.appendChild(nx);}
  ti.appendChild(tn);ti.appendChild(tm);div.appendChild(ti);
  var ow=document.createElement('div');ow.className='owners';
  var w=document.createElement('div');w.className='who who-either';ow.appendChild(w);div.appendChild(ow);
  wrap.appendChild(div);return wrap;
}

// ── SWIPE — single dynamic background ────────────────────
function attachSwipe(cardEl,wrapEl,swipeBg,task){
  var startX=0,startY=0,curX=0,axis=null,THRESH=72;
  cardEl.addEventListener('touchstart',function(e){if(selectMode)return;startX=e.touches[0].clientX;startY=e.touches[0].clientY;curX=0;axis=null;},{passive:true});
  cardEl.addEventListener('touchmove',function(e){
    if(selectMode)return;
    var dx=e.touches[0].clientX-startX,dy=e.touches[0].clientY-startY;
    if(!axis&&(Math.abs(dx)>8||Math.abs(dy)>8))axis=Math.abs(dx)>Math.abs(dy)?'x':'y';
    if(axis!=='x')return;
    curX=dx;
    cardEl.style.transform='translateX('+dx+'px)';
    if(dx>20){
      swipeBg.className='swipe-bg swipe-complete';swipeBg.style.display='flex';
    }else if(dx<-20){
      swipeBg.className='swipe-bg swipe-snooze';swipeBg.style.display='flex';
    }else{swipeBg.style.display='none';}
    e.preventDefault&&e.preventDefault();
  },{passive:false});
  cardEl.addEventListener('touchend',function(){
    if(axis!=='x'){cardEl.style.transform='';swipeBg.style.display='none';return;}
    if(curX>THRESH){cardEl.style.transform='translateX(110%)';setTimeout(function(){handleComplete(task);},160);}
    else if(curX<-THRESH){cardEl.style.transform='';swipeBg.style.display='none';openSnooze(task);}
    else{cardEl.style.transform='';swipeBg.style.display='none';}
    curX=0;axis=null;
  });
}

// ── LONG PRESS ────────────────────────────────────────────
function attachLongPress(cardEl,task){
  cardEl.addEventListener('touchstart',function(){longPressTimer=setTimeout(function(){if(!selectMode)enterBatch();toggleSelect(task.task_id);if(navigator.vibrate)navigator.vibrate(30);},500);},{passive:true});
  cardEl.addEventListener('touchmove',function(){clearTimeout(longPressTimer);});
  cardEl.addEventListener('touchend',function(){clearTimeout(longPressTimer);});
  cardEl.addEventListener('contextmenu',function(e){e.preventDefault();if(!selectMode)enterBatch();toggleSelect(task.task_id);});
}
function enterBatch(){
  selectMode=true;selectedTaskIds.clear();
  var bar=document.getElementById('batch-bar');
  bar.classList.add('on');
  applyBatchInset();
  updateBatchCount();
}
// Measure the bar and hand its height to the scroller. Called on enter and on resize, since
// rotating the phone changes how the two rows lay out.
function applyBatchInset(){
  var bar=document.getElementById('batch-bar'),sc=document.getElementById('task-scroll');
  if(!bar||!sc)return;
  var h=bar.offsetHeight||132;
  sc.style.setProperty('--batch-h',h+'px');
  sc.classList.add('batch-open');
}
function clearBatchInset(){
  var sc=document.getElementById('task-scroll');
  if(!sc)return;
  sc.classList.remove('batch-open');
  sc.style.removeProperty('--batch-h');
}
function exitBatch(){
  selectMode=false;selectedTaskIds.clear();
  document.getElementById('batch-bar').classList.remove('on');
  clearBatchInset();
}
if(typeof window!=='undefined'&&window.addEventListener)window.addEventListener('resize',function(){if(selectMode)applyBatchInset();});
function selectAll(){
  if(!selectMode)enterBatch();
  document.querySelectorAll('.tc-wrap[data-task-id]').forEach(function(wrap){
    var id=wrap.dataset.taskId;if(!id)return;
    selectedTaskIds.add(id);
    var tc=wrap.querySelector('.tc');if(tc)tc.classList.add('selected');
    var circ=wrap.querySelector('.circ');if(circ)circ.classList.add('sel');
  });
  updateBatchCount();
}
function toggleSelect(id){
  if(selectedTaskIds.has(id))selectedTaskIds.delete(id);else selectedTaskIds.add(id);
  if(!selectedTaskIds.size){exitBatch();renderTasks();return;}
  updateBatchCount();
  var wrap=document.querySelector('.tc-wrap[data-task-id="'+id+'"]');
  if(wrap){
    var isSel=selectedTaskIds.has(id);
    var tc=wrap.querySelector('.tc');if(tc)tc.classList.toggle('selected',isSel);
    var circ=wrap.querySelector('.circ');if(circ)circ.classList.toggle('sel',isSel);
  }
}
function updateBatchCount(){document.getElementById('batch-count').textContent=selectedTaskIds.size+' selected';}
function batchCompleteSelected(){
  var picks=[];
  selectedTaskIds.forEach(function(id){var t=state.tasks.find(function(x){return x.task_id===id;});if(t)picks.push({task_id:t.task_id,task_name:t.name,type:t.type,recurrence_days:t.recurrence_days,weekday:t.weekday,day_of_month:t.day_of_month,sched_freq:t.sched_freq,sched_interval:t.sched_interval,sched_month:t.sched_month,due_date:t.due_date,end_date:t.end_date,scope:t.scope,completed_by:creditFor(t)});});
  if(!picks.length)return;
  exitBatch();
  function attempt(){
    picks.forEach(function(p){_recentlyCompleted.add(p.task_id);});
    renderTasks();setSyncState('loading','Completing...');
    apiPost({action:'batchComplete',data:{tasks:picks,completed_by:currentUser}}).then(function(){scheduleBgSync(SYNC_FAST);}).catch(function(){picks.forEach(function(p){_recentlyCompleted.delete(p.task_id);});actionFailed("Couldn't complete tasks",renderTasks,'Could not complete',attempt);});
  }
  attempt();
}
// Mass delete. One request for the whole selection, and the server removes the task rows
// and their log rows in blocks. Optimistic like every other action, with a working retry.
function batchDeleteSelected(){
  var ids=[];selectedTaskIds.forEach(function(id){ids.push(id);});
  if(!ids.length)return;
  var n=ids.length;
  if(!confirm('Delete '+n+' task'+(n>1?'s':'')+'? This cannot be undone.'))return;
  exitBatch();
  function attempt(){
    var prevTasks=state.tasks.slice();
    state.tasks=state.tasks.filter(function(t){return ids.indexOf(t.task_id)<0;});
    rebuildTaskIndex();
    if(currentView==='tasks')renderTasks();
    setSyncState('loading','Deleting...');
    apiPost({action:'batchDelete',data:{task_ids:ids}}).then(function(){scheduleBgSync(SYNC_FAST);})
      .catch(function(){state.tasks=prevTasks;rebuildTaskIndex();
        actionFailed("Couldn't delete "+n+' task'+(n>1?'s':''),renderTasks,'Could not delete',attempt);});
  }
  attempt();
}
function openBatchSnooze(){
  var n=selectedTaskIds.size;if(!n)return;
  var cnt=document.getElementById('batch-snooze-count');if(cnt)cnt.textContent=n+' task'+(n>1?'s':'')+' selected';
  var di=document.getElementById('batch-snooze-date');if(di)di.value='';
  var cb=document.getElementById('batch-snooze-confirm');if(cb)cb.disabled=true;
  document.querySelectorAll('#modal-batch-snooze .snooze-opt').forEach(function(b){b.classList.remove('sel');});
  pendingBatchSnooze=null;
  openModal('modal-batch-snooze');
}
function onBatchSnoozeOptClick(n){
  pendingBatchSnooze={kind:'days',value:n};
  document.querySelectorAll('#modal-batch-snooze .snooze-opt').forEach(function(b){b.classList.remove('sel');});
  var di=document.getElementById('batch-snooze-date');if(di)di.value='';
  var cb=document.getElementById('batch-snooze-confirm');if(cb)cb.disabled=false;
}
function onBatchSnoozeDateInput(){
  var v=((document.getElementById('batch-snooze-date')||{}).value||'');
  if(v){
    pendingBatchSnooze={kind:'until',value:v};
    document.querySelectorAll('#modal-batch-snooze .snooze-opt').forEach(function(b){b.classList.remove('sel');});
    var cb=document.getElementById('batch-snooze-confirm');if(cb)cb.disabled=false;
  }else{pendingBatchSnooze=null;var cb=document.getElementById('batch-snooze-confirm');if(cb)cb.disabled=true;}
}
function confirmBatchSnooze(){
  if(!pendingBatchSnooze||!selectedTaskIds.size)return;
  var tasks=[];
  selectedTaskIds.forEach(function(id){var t=state.tasks.find(function(x){return x.task_id===id;});if(t)tasks.push(t);});
  var p=pendingBatchSnooze;
  // keep ids, not object references: a reconcile sync can replace state.tasks wholesale
  // before the user taps retry, which would leave us mutating orphaned objects.
  var updates=tasks.map(function(t){var base=snoozeBase(t);var targetDate;if(p.kind==='until'){targetDate=p.value;}else{var d=new Date(base);d.setDate(d.getDate()+p.value);targetDate=d.toISOString().split('T')[0];}return {task_id:t.task_id,targetDate:targetDate};});
  closeModal('modal-batch-snooze');exitBatch();
  function attempt(){
    var prevDates={};
    updates.forEach(function(u){var t=_taskById[u.task_id];if(t){prevDates[u.task_id]=t.due_date;t.due_date=u.targetDate;}});
    renderTasks();setSyncState('loading','Snoozing...');
    var calls=updates.map(function(u){return apiPost({action:'snoozeTask',data:{task_id:u.task_id,until_date:u.targetDate}});});
    Promise.all(calls).then(function(){scheduleBgSync(SYNC_FAST);}).catch(function(){updates.forEach(function(u){var t=_taskById[u.task_id];if(t&&prevDates.hasOwnProperty(u.task_id))t.due_date=prevDates[u.task_id];});actionFailed("Couldn't snooze tasks",renderTasks,'Could not snooze',attempt);});
  }
  attempt();
}

// ── COMPLETE / SNOOZE ─────────────────────────────────────
function completeTask(id){var t=(state.tasks||[]).find(function(x){return x.task_id===id;});if(t&&t.status!=='done'&&t.status!=='ended')handleComplete(t);}
function handleComplete(t){
  var tid=t.task_id,ttype=t.type;
  // Guard against completing the same task twice. Three separate paths call this (the circle,
  // the swipe, the action menu) and a slow save could resurrect the card mid-flight, so
  // without this a second tap silently wrote a second completion row.
  if(_completing.has(tid))return;
  // attempt() re-runs cleanly after a rollback, so it doubles as the retry handler
  function attempt(){
    _completing.add(tid);
    _recentlyCompleted.add(tid);
    var wrap=document.querySelector('.tc-wrap[data-task-id="'+tid+'"]');
    if(wrap){wrap.style.height=wrap.offsetHeight+'px';wrap.style.transition='all .2s';setTimeout(function(){wrap.style.height='0';wrap.style.opacity='0';wrap.style.overflow='hidden';},10);}
    setSyncState('loading','Logging...');
    apiPost({action:'completeTask',data:{task_id:t.task_id,task_name:t.name,type:t.type,recurrence_days:t.recurrence_days,weekday:t.weekday,day_of_month:t.day_of_month,sched_month:t.sched_month,sched_freq:t.sched_freq,sched_interval:t.sched_interval,due_date:t.due_date,end_date:t.end_date,completed_by:creditFor(t),scope:t.scope||'household',notes:''}}).then(function(){
      // Do NOT release _recentlyCompleted here. For a recurring task the server advances
      // due_date, but LOCAL state still holds the old one, so dropping the filter before the
      // reconcile lands puts the finished card straight back into Today. That is the window
      // in which a second tap wrote a duplicate completion (seen 10s and 22s apart on
      // 2026-08-02). The payload apply clears it, which is the point where server state is
      // actually authoritative.
      _completing.delete(tid);
      scheduleBgSync(SYNC_FAST);
    }).catch(function(){
      _completing.delete(tid);_recentlyCompleted.delete(tid);
      actionFailed("Couldn't complete",renderTasks,'Could not complete',attempt);
    });
  }
  attempt();
}
function snoozeBase(t){
  var today0=new Date();today0.setHours(0,0,0,0);
  var dueD=t.due_date?new Date(String(t.due_date).split('T')[0]+'T12:00:00'):null;
  if(dueD)dueD.setHours(0,0,0,0);
  return(!dueD||dueD<=today0)?new Date(today0):new Date(dueD);
}
function openSnooze(t){
  snoozingTask=t;pendingSnooze=null;document.getElementById('snooze-task-name').textContent=t.name;
  var base=snoozeBase(t);
  var today0=new Date();today0.setHours(0,0,0,0);
  var isOverdue=t.due_date&&new Date(String(t.due_date).split('T')[0]+'T12:00:00')<today0;
  var fromEl=document.getElementById('snooze-from');
  if(fromEl)fromEl.textContent='Snoozed from: '+(isOverdue?'today (task is overdue)':fmtDateShort(t.due_date));
  [1,3,5,7].forEach(function(n){var d=new Date(base);d.setDate(d.getDate()+n);var el=document.getElementById('snooze-'+n);if(el)el.textContent='\u2192 '+fmtDateShort(d.toISOString().split('T')[0]);});
  document.getElementById('snooze-date').value='';
  document.querySelectorAll('#modal-snooze .snooze-opt').forEach(function(b){b.classList.remove('sel');});
  document.getElementById('snooze-confirm-btn').disabled=true;
  openModal('modal-snooze');
}
function pickSnoozeDays(n,btn){
  pendingSnooze={kind:'days',value:n};
  document.querySelectorAll('#modal-snooze .snooze-opt').forEach(function(b){b.classList.remove('sel');});
  btn.classList.add('sel');
  document.getElementById('snooze-date').value='';
  document.getElementById('snooze-confirm-btn').disabled=false;
}
function pickSnoozeDate(date){
  if(!date){pendingSnooze=null;document.getElementById('snooze-confirm-btn').disabled=true;return;}
  pendingSnooze={kind:'until',value:date};
  document.querySelectorAll('#modal-snooze .snooze-opt').forEach(function(b){b.classList.remove('sel');});
  document.getElementById('snooze-confirm-btn').disabled=false;
}
function confirmSnooze(){
  if(!snoozingTask||!pendingSnooze)return;
  var p=pendingSnooze;
  var targetDate;
  if(p.kind==='until'){targetDate=p.value;}
  else{var base=snoozeBase(snoozingTask);var d=new Date(base);d.setDate(d.getDate()+p.value);targetDate=d.toISOString().split('T')[0];}
  var tid=snoozingTask.task_id;
  closeModal('modal-snooze');
  function attempt(){
    var taskRef=state.tasks.find(function(x){return x.task_id===tid;});
    var prevDue=taskRef?taskRef.due_date:null;
    if(taskRef)taskRef.due_date=targetDate;
    renderTasks();setSyncState('loading','Snoozing...');
    apiPost({action:'snoozeTask',data:{task_id:tid,until_date:targetDate,snoozed_by:currentUser}}).then(function(){scheduleBgSync(SYNC_FAST);}).catch(function(){var t2=state.tasks.find(function(x){return x.task_id===tid;});if(t2)t2.due_date=prevDue;actionFailed("Couldn't snooze",renderTasks,'Could not snooze',attempt);});
  }
  attempt();
}

// ── TASK MENU ─────────────────────────────────────────────
function openTaskMenu(e,t){
  closeTaskMenu();
  var m=document.createElement('div');m.className='task-menu';
  m.innerHTML='<button class="task-menu-item" data-a="edit"><i class="ti ti-pencil"></i> Edit task</button><button class="task-menu-item" data-a="complete"><i class="ti ti-check"></i> Mark complete</button><button class="task-menu-item" data-a="snooze"><i class="ti ti-clock"></i> Snooze</button><button class="task-menu-item danger" data-a="delete"><i class="ti ti-trash"></i> Delete</button>';
  document.body.appendChild(m);
  var r=e.currentTarget.getBoundingClientRect();
  var left=r.right-150;if(left<8)left=8;
  m.style.left=left+'px';m.style.top=(r.bottom+4)+'px';
  m.addEventListener('click',function(ev){
    var btn=ev.target.closest('[data-a]');if(!btn)return;var a=btn.dataset.a;closeTaskMenu();
    if(a==='edit')openEditTask(t);
    else if(a==='complete')handleComplete(t);
    else if(a==='snooze')openSnooze(t);
    else if(a==='delete'){if(!confirm('Delete this task?'))return;var dtid=t.task_id;(function delAttempt(){var prevT=state.tasks.slice();state.tasks=state.tasks.filter(function(x){return x.task_id!==dtid;});delete _taskById[dtid];renderTasks();setSyncState('loading','Deleting...');apiPost({action:'deleteTask',data:{task_id:dtid}}).then(function(){scheduleBgSync(SYNC_FAST);}).catch(function(){state.tasks=prevT;rebuildTaskIndex();actionFailed("Couldn't delete task",renderTasks,'Could not delete',delAttempt);});})();}
  });
  openMenu=m;setTimeout(function(){document.addEventListener('click',closeTaskMenuOnce);},10);
}
function closeTaskMenu(){if(openMenu){openMenu.remove();openMenu=null;document.removeEventListener('click',closeTaskMenuOnce);}}
function closeTaskMenuOnce(e){if(openMenu&&!openMenu.contains(e.target))closeTaskMenu();}

// ── PTR ───────────────────────────────────────────────────
(function(){
  var pulling=false,startY=0,dy=0;
  document.addEventListener('touchstart',function(e){if(currentView!=='tasks')return;var sc=document.getElementById('task-scroll');if(!sc||sc.scrollTop>2)return;startY=e.touches[0].clientY;pulling=true;dy=0;},{passive:true});
  document.addEventListener('touchmove',function(e){if(!pulling)return;dy=e.touches[0].clientY-startY;if(dy<0){pulling=false;return;}var ptr=document.getElementById('ptr');if(ptr)ptr.classList.toggle('on',dy>70);},{passive:true});
  document.addEventListener('touchend',function(){if(!pulling)return;var ptr=document.getElementById('ptr');if(dy>70)refreshData(true).then(function(){if(ptr)ptr.classList.remove('on');});else if(ptr)ptr.classList.remove('on');pulling=false;});
})();

// ── ADD TASK ──────────────────────────────────────────────
function openAddTask(){
  editingTask=null;pickedOwner='';pickedScope='household';pickedUrgency='this_week';
  document.getElementById('task-modal-title').textContent='Add task';
  document.getElementById('task-submit-btn').textContent='Add task';
  document.getElementById('task-delete-btn').classList.add('gone');
  document.getElementById('task-history-btn').classList.add('gone');
  populateAssetDropdown();populateProjectDropdown();
  clearTaskForm();openModal('modal-task');
}
function openEditTask(t){
  populateAssetDropdown();populateProjectDropdown();
  editingTask=t;pickedScope=t.scope||'household';pickedOwner=t.owner||'';pickedUrgency=t.urgency_window||'this_week';
  document.getElementById('task-modal-title').textContent='Edit task';
  document.getElementById('task-submit-btn').textContent='Save changes';
  document.getElementById('task-delete-btn').classList.remove('gone');
  document.getElementById('task-history-btn').classList.remove('gone');
  pickScope(pickedScope);
  document.getElementById('t-name').value=t.name||'';
  document.getElementById('t-type').value=t.type||'one_off';
  document.getElementById('t-notes').value=t.notes||'';
  var asel=document.getElementById('t-asset-link');if(asel)asel.value=t.linked_asset_id||'';
  var psel=document.getElementById('t-proj-link');if(psel)psel.value=t.linked_project_id||'';
  syncOwnerBtns();
  if(t.type==='one_off'){document.getElementById('t-due').value=dval(t.due_date);document.getElementById('t-remind').value=t.reminder_offset||'';}
  else if(t.type==='floating'){pickUrgency(t.urgency_window||'this_week');}
  else if(t.type==='scheduled'){
    var freq=schedFreqOf(t);
    document.getElementById('t-sched-freq').value=freq;
    document.getElementById('t-sched-interval').value=String(parseInt(t.sched_interval)||1);
    if(freq==='week'){document.getElementById('t-sched-weekday').value=String(t.weekday||'1');}
    else if(freq==='month'){document.getElementById('t-sched-monthday').value=String(t.day_of_month||'1');}
    else if(freq==='year'){document.getElementById('t-sched-yearmonth').value=String(t.sched_month||'1');document.getElementById('t-sched-yearday').value=String(t.day_of_month||'1');}
    document.getElementById('t-sched-start').value=dval(t.sched_start);
    document.getElementById('t-end-sched').value=dval(t.end_date);
  }else if(t.type==='interval'){document.getElementById('t-days').value=t.recurrence_days||'';document.getElementById('t-days-unit').value=t.sched_freq||'day';document.getElementById('t-interval-start').value=dval(t.sched_start);document.getElementById('t-end-interval').value=dval(t.end_date);}
  updateTaskTypeFields();
  document.getElementById('t-owner-row').style.display=pickedScope==='personal'?'none':'flex';
  openModal('modal-task');
}
function clearTaskForm(){
  document.getElementById('t-name').value='';document.getElementById('t-notes').value='';
  document.getElementById('t-due').value='';document.getElementById('t-type').value='one_off';
  document.getElementById('t-remind').value='';document.getElementById('t-days').value='';document.getElementById('t-days-unit').value='day';
  document.getElementById('t-sched-start').value='';document.getElementById('t-interval-start').value='';
  document.getElementById('t-end-sched').value='';document.getElementById('t-end-interval').value='';
  document.getElementById('t-sched-freq').value='week';document.getElementById('t-sched-weekday').value='1';
  document.getElementById('t-sched-interval').value='1';
  document.getElementById('t-sched-monthday').value='1';document.getElementById('t-sched-yearmonth').value='1';document.getElementById('t-sched-yearday').value='1';
  var psel=document.getElementById('t-proj-link');if(psel)psel.value='';
  syncOwnerBtns();
  document.getElementById('scope-opt-house').className='scope-opt sel-house';
  document.getElementById('scope-opt-pers').className='scope-opt';
  document.getElementById('urg-week').className='urg-opt sel';
  document.getElementById('urg-month').className='urg-opt';document.getElementById('urg-norush').className='urg-opt';
  document.getElementById('t-owner-row').style.display='flex';
  updateTaskTypeFields();
}
function syncOwnerBtns(){
  document.getElementById('owner-either').className='who-opt'+(pickedOwner===''?' sel-either':'');
  document.getElementById('owner-f').className='who-opt'+(hasPerson(pickedOwner,'Frankie')?' sel-f':'');
  document.getElementById('owner-m').className='who-opt'+(hasPerson(pickedOwner,'Meredith')?' sel-m':'');
}
function pickScope(s){
  pickedScope=s;
  document.getElementById('scope-opt-house').className='scope-opt'+(s==='household'?' sel-house':'');
  document.getElementById('scope-opt-pers').className='scope-opt'+(s==='personal'?' sel-pers':'');
  var isP=s==='personal';
  document.getElementById('t-owner-row').style.display=isP?'none':'flex';
  var note=document.getElementById('t-personal-note');if(note)note.classList.toggle('gone',!isP);
}
function pickOwner(val){
  if(val===''){pickedOwner='';}
  else{
    var sel=peopleOf(pickedOwner),i=sel.indexOf(val);
    if(i>=0)sel.splice(i,1);else sel.push(val);
    // canonical order, and dropping the last name falls back to "either of us"
    pickedOwner=_PEOPLE.filter(function(n){return sel.indexOf(n)>=0;}).join(',');
  }
  syncOwnerBtns();
}
function pickUrgency(u){
  pickedUrgency=u;
  document.getElementById('urg-week').className='urg-opt'+(u==='this_week'?' sel':'');
  document.getElementById('urg-month').className='urg-opt'+(u==='this_month'?' sel':'');
  document.getElementById('urg-norush').className='urg-opt'+(u==='no_rush'?' sel':'');
}
function updateTaskTypeFields(){
  var type=document.getElementById('t-type').value;
  document.querySelectorAll('.type-fields').forEach(function(el){el.classList.toggle('gone',el.dataset.type!==type);});
  if(type==='scheduled')updateSchedFields();
}
function updateSchedFields(){
  var f=document.getElementById('t-sched-freq').value;
  document.getElementById('sched-week').classList.toggle('gone',f!=='week');
  document.getElementById('sched-month').classList.toggle('gone',f!=='month');
  document.getElementById('sched-year').classList.toggle('gone',f!=='year');
}
function submitTask(){
  var name=document.getElementById('t-name').value.trim();if(!name){alert('Task name required');return;}
  var type=document.getElementById('t-type').value;
  var data={name:name,type:type,scope:pickedScope,owner:pickedScope==='personal'?currentUser:pickedOwner,notes:document.getElementById('t-notes').value.trim(),status:'active'};
  if(type==='one_off'){var due=document.getElementById('t-due').value||'';var projSel2=document.getElementById('t-proj-link');var hasProj=projSel2&&projSel2.value;if(!due&&!editingTask&&!hasProj){due=todayStr();}data.due_date=due;data.reminder_offset=document.getElementById('t-remind').value||'';}
  else if(type==='floating'){data.urgency_window=pickedUrgency;}
  else if(type==='scheduled'){
    var f=document.getElementById('t-sched-freq').value;
    var iv=parseInt(document.getElementById('t-sched-interval').value)||1;if(iv<1)iv=1;
    data.sched_freq=f;data.sched_interval=iv;
    if(f==='week'){data.weekday=parseInt(document.getElementById('t-sched-weekday').value);data.day_of_month='';data.sched_month='';}
    else if(f==='month'){data.day_of_month=document.getElementById('t-sched-monthday').value;data.weekday='';data.sched_month='';}
    else if(f==='year'){data.day_of_month=document.getElementById('t-sched-yearday').value;data.sched_month=document.getElementById('t-sched-yearmonth').value;data.weekday='';}
    else{data.weekday='';data.day_of_month='';data.sched_month='';}
    data.sched_start=document.getElementById('t-sched-start').value||'';
    data.end_date=document.getElementById('t-end-sched').value||'';
    data.due_date='';
  }else if(type==='interval'){
    var days=parseInt(document.getElementById('t-days').value);if(!days||days<1){alert('Enter a number');return;}
    data.recurrence_days=days;data.sched_freq=document.getElementById('t-days-unit').value||'day';data.sched_start=document.getElementById('t-interval-start').value||'';data.end_date=document.getElementById('t-end-interval').value||'';data.due_date='';
  }
  var assetSel=document.getElementById('t-asset-link');
  data.linked_asset_id=assetSel?assetSel.value||'':'';
  var projSel=document.getElementById('t-proj-link');
  data.linked_project_id=projSel?projSel.value||'':'';
  if(type==='scheduled'){data.sched_pattern='';}
  closeModal('modal-task');
  if(editingTask){
    var etid=editingTask.task_id;
    (function editAttempt(){
      setSyncState('loading','Saving...');   // inside, so a retry shows it again
      var taskRef=state.tasks.find(function(x){return x.task_id===etid;});
      var prevTask=taskRef?Object.assign({},taskRef):null;
      if(taskRef)Object.assign(taskRef,data);
      if(currentView==='tasks')renderTasks();
      apiPost({action:'updateTask',data:{task_id:etid,updates:data,updated_by:currentUser}}).then(function(){scheduleBgSync(SYNC_FAST);}).catch(function(){var t2=state.tasks.find(function(x){return x.task_id===etid;});if(t2&&prevTask)Object.assign(t2,prevTask);actionFailed("Couldn't save changes",renderTasks,'Could not save',editAttempt);});
    })();
  }else{
    (function addAttempt(){
      setSyncState('loading','Saving...');   // inside, so a retry shows it again
      var tempId='tmp_'+Date.now();
      var tempTask=Object.assign({},data,{task_id:tempId,_temp:true});
      state.tasks.push(tempTask);_taskById[tempId]=tempTask;
      if(currentView==='tasks')renderTasks();
      apiPost({action:'addTask',data:data}).then(function(){scheduleBgSync(SYNC_FAST);}).catch(function(){state.tasks=state.tasks.filter(function(x){return x.task_id!==tempId;});delete _taskById[tempId];actionFailed("Couldn't save task",renderTasks,'Could not save',addAttempt);});
    })();
  }
}
function deleteEditingTask(){
  if(!editingTask||!confirm('Delete this task?'))return;
  var dtid=editingTask.task_id;
  closeModal('modal-task');
  function attempt(){
    var prevTasks=state.tasks.slice();
    state.tasks=state.tasks.filter(function(x){return x.task_id!==dtid;});delete _taskById[dtid];
    if(currentView==='tasks')renderTasks();setSyncState('loading','Deleting...');
    apiPost({action:'deleteTask',data:{task_id:dtid}}).then(function(){scheduleBgSync(SYNC_FAST);}).catch(function(){state.tasks=prevTasks;rebuildTaskIndex();actionFailed("Couldn't delete task",renderTasks,'Could not delete',attempt);});
  }
  attempt();
}

// ── PROJECTS ──────────────────────────────────────────────
function makeProjTaskItems(pid){
  var linked=state.tasks.filter(function(t){return String(t.linked_project_id)===String(pid);});
  var subs=state.subtasks.filter(function(s){return String(s.project_id)===String(pid);});
  var allItems=[];
  linked.forEach(function(t){allItems.push({id:t.task_id,name:t.name,due:t.due_date,type:t.type||'one_off',isDone:t.status==='done'||t.status==='ended',isTask:true,obj:t});});
  subs.forEach(function(s){allItems.push({id:s.subtask_id,name:s.name,due:s.due_date,type:'subtask',isDone:s.status==='done',isTask:false,obj:s});});
  return allItems;
}
function renderProjTaskRow(item,pid){
  var d=document.createElement('div');d.className='ptask-row';
  var dueStr=item.due?fmtDateShort(item.due):'';
  if(item.isTask){
    d.innerHTML='<div class="circ-check'+(item.isDone?' done':'')+'" onclick="event.stopPropagation();completeTask(\\''+item.id+'\\')"></div><div class="ptask-name ptask-tappable" data-edittask="'+item.id+'">'+esc(item.name)+'</div>'+(dueStr?'<div class="ptask-due">'+dueStr+'</div>':'');
  }else{
    var isDone=item.isDone;
    d.innerHTML='<div class="box'+(isDone?' done':'')+'" data-sub="'+item.id+'"></div><div class="ptask-name ptask-tappable" data-editsub="'+item.id+'">'+esc(item.name)+(item.due?' <span style="font-size:11px;color:var(--text3)">'+fmtDate(item.due)+'</span>':'')+'</div>';
  }
  return d;
}
function renderProjects(){
  var act=document.getElementById('proj-active'),pln=document.getElementById('proj-planned'),dn=document.getElementById('proj-done');
  act.innerHTML='';pln.innerHTML='';if(dn)dn.innerHTML='';
  var doneProjs=[];
  state.projects.filter(function(p){return p.status!=='done';}).forEach(function(p){
    var items=makeProjTaskItems(p.project_id);
    var done=items.filter(function(i){return i.isDone;}).length;
    var pct=items.length?Math.round(done/items.length*100):0;
    var card=document.createElement('div');card.className='pc';
    var tStr=p.target_date?'<span class="pc-mi"><i class="ti ti-calendar"></i> '+fmtDate(p.target_date)+' target</span>':'';
    card.innerHTML='<div class="pc-hdr"><div class="pc-top"><div class="pc-name">'+esc(p.name)+'</div><div style="display:flex;align-items:center;gap:8px;flex-shrink:0"><span class="bdg '+(p.status==='active'?'bdg-a':'bdg-p')+'">'+p.status+'</span><button class="pc-edit" data-editproj="'+p.project_id+'"><i class="ti ti-pencil"></i></button></div></div>'+(p.description?'<div class="pc-desc">'+esc(p.description)+'</div>':'')+'<div class="pc-meta">'+tStr+'<span class="pc-mi"><i class="ti ti-check"></i> '+done+' of '+items.length+' done</span></div><div class="prog"><div class="pf" style="width:'+pct+'%"></div></div></div>';
    var tasksDiv=document.createElement('div');tasksDiv.className='pc-tasks';
    items.forEach(function(item){tasksDiv.appendChild(renderProjTaskRow(item,p.project_id));});
    var addRow=document.createElement('div');addRow.style.marginTop='6px';
    addRow.innerHTML='<button class="btn" style="font-size:11.5px" onclick="openAddTaskForProject(\\''+p.project_id+'\\')"><i class="ti ti-plus"></i> Add task</button>'+(state.subtasks.filter(function(s){return String(s.project_id)===String(p.project_id);}).length?'<button class="btn" style="font-size:11.5px;margin-left:4px" data-addsub="'+p.project_id+'"><i class="ti ti-plus"></i> Add subtask</button>':'');
    tasksDiv.appendChild(addRow);
    card.appendChild(tasksDiv);
    if(p.status==='active')act.appendChild(card);else pln.appendChild(card);
  });
  state.projects.filter(function(p){return p.status==='done';}).forEach(function(p){doneProjs.push(p);});
  if(dn){
    doneProjs.forEach(function(p){
      var items=makeProjTaskItems(p.project_id);
      var card=document.createElement('div');card.className='pc';card.style.opacity='.75';
      card.innerHTML='<div class="pc-hdr"><div class="pc-top"><div class="pc-name">'+esc(p.name)+'</div><div style="display:flex;align-items:center;gap:8px;flex-shrink:0"><span class="bdg bdg-p">done</span><button class="pc-edit" data-editproj="'+p.project_id+'"><i class="ti ti-pencil"></i></button></div></div>'+(p.description?'<div class="pc-desc">'+esc(p.description)+'</div>':'')+'<div class="pc-meta">'+(p.target_date?'<span class="pc-mi"><i class="ti ti-calendar"></i> '+fmtDate(p.target_date)+'</span>':'')+'<span class="pc-mi"><i class="ti ti-check"></i> '+items.length+' tasks</span></div></div>';
      dn.appendChild(card);
    });
    if(!doneProjs.length&&dn)dn.innerHTML='<div style="font-size:12.5px;color:var(--text3)">No past projects.</div>';
  }
  var pw=document.getElementById('past-proj-wrap');if(pw)pw.style.display=doneProjs.length?'block':'none';
  if(!act.children.length)act.innerHTML='<div style="font-size:12.5px;color:var(--text3)">No active projects yet.</div>';
  if(!pln.children.length)pln.innerHTML='<div style="font-size:12.5px;color:var(--text3)">No planned projects.</div>';
}
function openAddTaskForProject(pid){
  openAddTask();
  var sel=document.getElementById('t-proj-link');if(sel)sel.value=pid;
  document.getElementById('t-type').value='floating';pickUrgency('no_rush');updateTaskTypeFields();
}
function togglePastProjects(){
  var d=document.getElementById('proj-done');var c=document.getElementById('past-proj-chev');
  if(d)d.classList.toggle('gone');
  if(c)c.className=d&&!d._classes&&!d.classList.contains('gone')?'ti ti-chevron-down':'ti ti-chevron-right';
}
function toggleSub(id,el){var d=el.classList.contains('done');el.classList.toggle('done');el.closest('.sub').classList.toggle('done-sub');apiPost({action:'updateSubtask',data:{subtask_id:id,updates:{status:d?'todo':'done'}}}).then(function(){apiGet({action:'getSubtasks'}).then(function(r){state.subtasks=r||[];renderProjects();});}).catch(function(){el.classList.toggle('done');el.closest('.sub').classList.toggle('done-sub');scheduleBgSync();showToast("Couldn't update subtask");});}
function quickAddSub(pid){var n=prompt('Subtask name:');if(!n)return;apiPost({action:'addSubtask',data:{project_id:pid,name:n.trim(),status:'todo'}}).then(function(){apiGet({action:'getSubtasks'}).then(function(r){state.subtasks=r||[];renderProjects();});});}
document.addEventListener('click',function(e){
  var sub=e.target.closest('[data-sub]');
  if(sub){toggleSub(sub.getAttribute('data-sub'),sub);return;}
  var esub=e.target.closest('[data-editsub]');
  if(esub){openEditSubtask(esub.getAttribute('data-editsub'));return;}
  var etask=e.target.closest('[data-edittask]');
  if(etask){var tid=etask.getAttribute('data-edittask');var t=state.tasks.find(function(x){return String(x.task_id)===String(tid);});if(t)openEditTask(t);return;}
  var eproj=e.target.closest('[data-editproj]');
  if(eproj){openEditProject(eproj.getAttribute('data-editproj'));return;}
  var add=e.target.closest('[data-addsub]');
  if(add){quickAddSub(add.getAttribute('data-addsub'));return;}
  var sn=e.target.closest('.snooze-opt[data-snooze]');
  if(sn){pickSnoozeDays(parseInt(sn.getAttribute('data-snooze')),sn);return;}
  var bsn=e.target.closest('.snooze-opt[data-bsnooze]');
  if(bsn){onBatchSnoozeOptClick(parseInt(bsn.getAttribute('data-bsnooze')));bsn.classList.add('sel');return;}
});

// ── GROCERY ───────────────────────────────────────────────
function makeGrocEl(item){
  var got=item.status==='got';
  var d=document.createElement('div');d.className='gi'+(got?' got':'');
  d.setAttribute('data-item-id',item.item_id);d.setAttribute('data-category',item.category||'Food');
  var chk=document.createElement('div');chk.className='gbox'+(got?' done':'');
  chk.addEventListener('click',function(e){e.stopPropagation();toggleGrocery(item.item_id,d);});
  var txt=document.createElement('span');txt.className='groc-text';txt.textContent=item.name;
  txt.addEventListener('click',function(e){e.stopPropagation();editGrocItem(item.item_id,txt,item);});
  var drag=document.createElement('span');drag.className='groc-drag';drag.innerHTML='<i class="ti ti-grip-vertical"></i>';
  drag.setAttribute('draggable','false');
  d.appendChild(chk);d.appendChild(txt);d.appendChild(drag);
  d.setAttribute('draggable','true');
  d.addEventListener('dragstart',function(e){e.dataTransfer.setData('text/plain',item.item_id);d.classList.add('dragging');});
  d.addEventListener('dragend',function(){d.classList.remove('dragging');});
  d.addEventListener('dragover',function(e){e.preventDefault();d.classList.add('drag-over');});
  d.addEventListener('dragleave',function(){d.classList.remove('drag-over');});
  d.addEventListener('drop',function(e){
    e.preventDefault();d.classList.remove('drag-over');
    var fromId=e.dataTransfer.getData('text/plain');
    var fromEl=document.querySelector('.gi[data-item-id="'+fromId+'"]');
    if(!fromEl||fromEl===d)return;
    var cat=d.dataset.category;
    if(fromEl.dataset.category!==cat)return;
    var parent=d.parentNode;parent.insertBefore(fromEl,d);
    var order=[];parent.querySelectorAll('.gi[data-category="'+cat+'"]').forEach(function(el){if(el.dataset.itemId)order.push(el.dataset.itemId);});
    apiPost({action:'reorderGrocery',data:{category:cat,order:order}}).then(function(){
      order.forEach(function(id,i){var it=state.grocery.find(function(g){return g.item_id===id;});if(it)it.sort_order=i+1;});
    }).catch(function(){renderGrocery();scheduleBgSync();showToast("Couldn't save order");});
  });
  return d;
}
function editGrocItem(id,textEl,item){
  var current=textEl.textContent;
  var inp=document.createElement('input');
  inp.className='groc-edit-inp';inp.value=current;
  textEl.style.display='none';textEl.parentNode.insertBefore(inp,textEl.nextSibling);
  inp.focus();inp.select();
  function save(){
    var val=inp.value.trim();
    if(inp.parentNode)inp.parentNode.removeChild(inp);
    textEl.style.display='';
    if(!val||val===current)return;
    textEl.textContent=val;
    var it=state.grocery.find(function(g){return g.item_id===id;});if(it)it.name=val;
    apiPost({action:'updateGrocery',data:{item_id:id,updates:{name:val}}}).catch(function(){textEl.textContent=current;if(it)it.name=current;scheduleBgSync();showToast("Couldn't rename item");});
  }
  inp.addEventListener('blur',save);
  inp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();inp.blur();}if(e.key==='Escape'){inp.value=current;inp.blur();}});
}
function makeGrocAdd(cat){
  var inp=document.createElement('input');
  inp.className='groc-add';inp.type='text';inp.placeholder='+ Add item';
  inp.setAttribute('enterkeyhint','done');inp.setAttribute('autocapitalize','sentences');
  inp.addEventListener('keydown',function(e){
    if(e.key==='Enter'||e.keyCode===13){
      e.preventDefault();
      var name=inp.value.trim();if(!name)return;
      inp.value='';
      var tmp={item_id:'tmp_'+Date.now(),name:name,category:cat,status:'need'};
      state.grocery.push(tmp);
      var ph=inp.parentNode.querySelector('.groc-empty');if(ph)ph.remove();
      inp.parentNode.insertBefore(makeGrocEl(tmp),inp);
      inp.focus();
      apiPost({action:'addGroceryItem',data:{name:name,category:cat,added_by:currentUser}});
    }
  });
  return inp;
}
function renderGrocery(){
  state.grocery=state.grocery.slice().sort(function(a,b){var sa=parseInt(a.sort_order)||9999,sb=parseInt(b.sort_order)||9999;return sa-sb||(a.name||'').localeCompare(b.name||'');});
  var cols={Food:document.getElementById('groc-food'),Household:document.getElementById('groc-household'),Costco:document.getElementById('groc-costco')};
  cols.Food.innerHTML='';cols.Household.innerHTML='';cols.Costco.innerHTML='';
  var cnt={Food:0,Costco:0,Household:0};
  state.grocery.forEach(function(item){
    var cat=item.category||'Food';if(!cols[cat])cat='Food';cnt[cat]=(cnt[cat]||0)+1;
    cols[cat].appendChild(makeGrocEl(item));
  });
  ['Food','Household','Costco'].forEach(function(cat){
    var col=cols[cat];
    if(!cnt[cat]){var e=document.createElement('div');e.className='groc-empty';e.textContent='Nothing yet.';col.appendChild(e);}
    col.appendChild(makeGrocAdd(cat));
  });
  document.getElementById('count-food').textContent=cnt.Food?'('+cnt.Food+')':'';
  document.getElementById('count-costco').textContent=cnt.Costco?'('+cnt.Costco+')':'';
  document.getElementById('count-household').textContent=cnt.Household?'('+cnt.Household+')':'';
}
function toggleGrocery(id,el){var got=el.classList.contains('got');el.classList.toggle('got');el.querySelector('.gbox').classList.toggle('done');var item=state.grocery.find(function(g){return g.item_id===id;});if(item)item.status=got?'need':'got';apiPost({action:'updateGrocery',data:{item_id:id,updates:{status:got?'need':'got'}}}).catch(function(){el.classList.toggle('got');el.querySelector('.gbox').classList.toggle('done');if(item)item.status=got?'got':'need';scheduleBgSync();showToast("Couldn't update item");});}
function clearGrocery(){if(!confirm('Remove all checked items?'))return;var prev=state.grocery.slice();state.grocery=state.grocery.filter(function(g){return g.status!=='got';});renderGrocery();apiPost({action:'clearChecked',data:{}}).catch(function(){state.grocery=prev;renderGrocery();scheduleBgSync();showToast("Couldn't clear items");});}

// ── ASSETS ────────────────────────────────────────────────
var STATUS_COLOR={green:'#22C55E',amber:'#C97A10',red:'#C84040'};
function renderAssets(){
  var sys=document.getElementById('asset-systems'),app=document.getElementById('asset-appliances'),str=document.getElementById('asset-structure');
  sys.innerHTML='';app.innerHTML='';str.innerHTML='';
  var today0=new Date();today0.setHours(0,0,0,0);
  (state.assets||[]).forEach(function(a){
    var linkedTasks=(state.tasks||[]).filter(function(t){return t.linked_asset_id===a.asset_id&&t.status==='active';});
    var linkedActive=linkedTasks.length;
    var hasOverdue=linkedTasks.some(function(t){if(!t.due_date)return false;var d=new Date(String(t.due_date).split('T')[0]+'T12:00:00');d.setHours(0,0,0,0);return d<today0;});
    var sc=STATUS_COLOR[a.status]||'var(--border2)';
    var sub=a.last_service_date?'Last: '+fmtDate(a.last_service_date):(a.install_date?'Since '+fmtDate(a.install_date):'');
    var badge=a.status==='red'?'<div class="arow-flag red">attention</div>':a.status==='amber'?'<div class="arow-flag">note</div>':'';
    var overdueBadge=hasOverdue?'<div class="arow-flag red"><i class="ti ti-alert-triangle"></i> overdue task</div>':'';
    var taskBadge=linkedActive&&!hasOverdue?'<div class="arow-flag">'+linkedActive+' task'+(linkedActive>1?'s':'')+'</div>':'';
    var row=document.createElement('div');row.className='arow';row.onclick=function(){openAssetPanel(a.asset_id);};
    var iconBg=a.icon_bg||'var(--bg2)';var iconColor=a.icon_color||'var(--text3)';var icon=a.icon||'ti-tool';
    row.innerHTML='<div style="width:8px;height:8px;border-radius:50%;background:'+sc+';flex-shrink:0;margin-right:2px;align-self:center"></div><div class="arow-icon" style="background:'+esc(iconBg)+'"><i class="ti '+esc(icon)+'" style="color:'+esc(iconColor)+'"></i></div><div class="arow-info"><div class="arow-name">'+esc(a.name)+'</div><div class="arow-sub">'+esc(sub)+'</div></div>'+(overdueBadge||taskBadge||badge);
    if(a.category==='Home systems')sys.appendChild(row);else if(a.category==='Appliances')app.appendChild(row);else str.appendChild(row);
  });
}
function setPanelTab(tab){
  panelTab=tab;
  ['log','tasks'].forEach(function(t){
    var btn=document.getElementById('ptab-'+t);if(btn)btn.classList.toggle('on',t===tab);
    var el=document.getElementById('panel-tab-'+t);if(el)el.classList.toggle('gone',t!==tab);
  });
}
function openAssetPanel(id){
  var a=(state.assets||[]).find(function(x){return x.asset_id===id;});if(!a)return;
  openAssetId=id;
  document.getElementById('p-title').textContent=a.name;
  document.getElementById('p-sub').textContent=a.category;
  var dot=document.getElementById('p-status-dot');if(dot){dot.style.background=STATUS_COLOR[a.status]||'var(--border2)';}
  var fh=document.getElementById('p-flags');fh.innerHTML='';
  var today0=new Date();today0.setHours(0,0,0,0);
  var linkedTasks=(state.tasks||[]).filter(function(t){return t.linked_asset_id===id&&t.status==='active';});
  var hasOverdue=linkedTasks.some(function(t){if(!t.due_date)return false;var d=new Date(String(t.due_date).split('T')[0]+'T12:00:00');d.setHours(0,0,0,0);return d<today0;});
  if(hasOverdue){var od=document.createElement('div');od.className='flag-box red';od.innerHTML='<i class="ti ti-alert-triangle"></i><span>Linked task overdue</span>';fh.appendChild(od);}
  var gh=document.getElementById('p-grid');gh.innerHTML='';
  var fields=[['Install date',fmtDate(a.install_date)],['Last service',fmtDate(a.last_service_date)],['Next service',fmtDate(a.next_service_date)],['Warranty expires',fmtDate(a.warranty_expiry)]];
  if(a.purchase_price)fields.push(['Purchase price',a.purchase_price]);
  if(a.notes)fields.push(['Notes',a.notes]);
  fields.forEach(function(row){var d=document.createElement('div');d.className='ic'+(row[0]==='Notes'?' full':'');d.innerHTML='<div class="icl">'+row[0]+'</div><div class="icv">'+(row[1]?esc(row[1]):'<span style="color:var(--text3)">--</span>')+'</div>';gh.appendChild(d);});
  var mw=document.getElementById('p-manual-wrap');
  if(a.manual_url&&/^https?:\/\//i.test(a.manual_url)){mw.style.display='block';document.getElementById('p-manual-link').href=a.manual_url;document.getElementById('p-manual-text').textContent=a.manual_url.replace(/^https?:\/\//,'').split('/')[0];}
  else{mw.style.display='none';}
  var cw=document.getElementById('p-contractors-wrap'),cl=document.getElementById('p-contractors');cl.innerHTML='';
  var contractors=[];try{contractors=JSON.parse(a.contractors||'[]');}catch(e){}
  if(contractors.length){cw.style.display='block';contractors.forEach(function(c){var d=document.createElement('div');d.className='contr-item';d.innerHTML='<div class="contr-name">'+esc(c.name||'')+'</div>'+(c.role?'<div class="contr-meta">'+esc(c.role)+'</div>':'')+(c.phone?'<a class="contr-phone" href="tel:'+esc(c.phone)+'">'+esc(c.phone)+'</a>':'')+(c.email?'<div class="contr-meta">'+esc(c.email)+'</div>':'');cl.appendChild(d);});}
  else{cw.style.display='none';}
  var lh=document.getElementById('p-log');lh.innerHTML='';
  var manualNotes=(state.maintenance_logs||[]).filter(function(l){return l.asset_id===id;}).sort(function(a,b){return new Date(b.date)-new Date(a.date);});
  var assetTaskIds=new Set((_tasksByAsset[String(id)]||[]).map(function(t){return t.task_id;}));
  var completedLinked=(state.task_log||[]).filter(function(l){return isCompletionLog(l)&&assetTaskIds.has(l.task_id);}).sort(function(a,b){return new Date(b.completed_at)-new Date(a.completed_at);});
  var combined=manualNotes.map(function(n){return{date:n.date,text:n.note,sub:(n.log_type==='service'?'Service':'Note')};}).concat(completedLinked.map(function(l){return{date:l.completed_at,text:l.task_name,sub:'Completed by '+l.completed_by,blue:true};}));
  combined.sort(function(a,b){return new Date(b.date)-new Date(a.date);});
  if(!combined.length){lh.innerHTML='<div style="font-size:12px;color:var(--text3);padding:8px 0">No maintenance history yet.</div>';}
  combined.forEach(function(l){var d=document.createElement('div');d.className='log-item';d.innerHTML='<div class="ldot'+(l.blue?' b':'')+'"></div><div><div class="lt">'+esc(l.text)+'</div><div class="lm">'+esc(l.sub)+' - '+(l.blue?fmtTimestamp(l.date):fmtDate(l.date))+'</div></div>';lh.appendChild(d);});
  var tc=document.getElementById('p-tasks-count');if(tc)tc.textContent=linkedTasks.length;
  var th=document.getElementById('p-tasks');th.innerHTML='';
  if(linkedTasks.length){linkedTasks.forEach(function(lt){var d=document.createElement('div');d.className='ptask-row';var dueStr=lt.due_date?fmtDateShort(lt.due_date):'';d.innerHTML='<div class="circ-check'+(lt.status==='done'||lt.status==='ended'?' done':'')+'" onclick="event.stopPropagation();completeTask(\\''+lt.task_id+'\\')"></div><div class="ptask-name">'+esc(lt.name)+'</div>'+(dueStr?'<div class="ptask-due">'+dueStr+'</div>':'');th.appendChild(d);});}
  else{th.innerHTML='<div style="font-size:12px;color:var(--text3);padding:4px 0">No active linked tasks.</div>';}
  setPanelTab('log');
  document.getElementById('panel').style.display='flex';
}
function closePanel(){document.getElementById('panel').style.display='none';openAssetId=null;}

// ── ASSET CRUD ────────────────────────────────────────────
function pickAssetStatus(s){
  pickedAssetStatus=s;
  document.getElementById('ea-status').value=s;
  ['green','amber','red'].forEach(function(k){document.getElementById('ea-s-'+k).className='status-opt'+(k===s?' sel-'+k:'');});
}
function openEditAsset(){
  var a=(state.assets||[]).find(function(x){return x.asset_id===openAssetId;});if(!a)return;
  editingAsset=a;
  document.getElementById('ea-modal-title').textContent='Edit asset';
  document.getElementById('ea-name').value=a.name||'';
  document.getElementById('ea-category').value=a.category||'Home systems';
  pickAssetStatus(a.status||'green');
  document.getElementById('ea-install').value=dval(a.install_date);
  document.getElementById('ea-last-service').value=dval(a.last_service_date);
  document.getElementById('ea-next-service').value=dval(a.next_service_date);
  document.getElementById('ea-warranty').value=dval(a.warranty_expiry);
  document.getElementById('ea-notes').value=a.notes||'';
  document.getElementById('ea-price').value=a.purchase_price||'';
  document.getElementById('ea-manual-url').value=a.manual_url||'';
  var cl=document.getElementById('ea-contractors-list');cl.innerHTML='';
  var contractors=[];try{contractors=JSON.parse(a.contractors||'[]');}catch(e){}
  contractors.forEach(function(c){addContractorField(c);});
  document.getElementById('ea-delete-btn').classList.remove('gone');
  openModal('modal-edit-asset');
}
function openAddAsset(){
  editingAsset=null;
  document.getElementById('ea-modal-title').textContent='Add asset';
  ['ea-name','ea-notes','ea-price','ea-manual-url'].forEach(function(id){document.getElementById(id).value='';});
  ['ea-install','ea-last-service','ea-next-service','ea-warranty'].forEach(function(id){document.getElementById(id).value='';});
  document.getElementById('ea-category').value='Home systems';
  document.getElementById('ea-contractors-list').innerHTML='';
  pickAssetStatus('green');
  document.getElementById('ea-delete-btn').classList.add('gone');
  openModal('modal-edit-asset');
}
function addContractorField(c){
  var cl=document.getElementById('ea-contractors-list');
  var wrap=document.createElement('div');wrap.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:5px;padding:7px;background:var(--bg);border-radius:var(--radius-sm);border:1px solid var(--border);';
  wrap.innerHTML='<input class="form-input contr-f-name" placeholder="Name" style="font-size:12.5px" value="'+(c&&c.name?esc(c.name):'')+'"><input class="form-input contr-f-role" placeholder="Role / company" style="font-size:12.5px" value="'+(c&&c.role?esc(c.role):'')+'"><input class="form-input contr-f-phone" placeholder="Phone" style="font-size:12.5px" value="'+(c&&c.phone?esc(c.phone):'')+'"><input class="form-input contr-f-email" placeholder="Email" style="font-size:12.5px" value="'+(c&&c.email?esc(c.email):'')+'"><button type="button" class="btn btn-danger" style="grid-column:1/-1;font-size:11px;padding:3px 8px" onclick="this.parentNode.remove()"><i class="ti ti-trash"></i> Remove</button>';
  cl.appendChild(wrap);
}
function submitEditAsset(){
  var name=document.getElementById('ea-name').value.trim();if(!name){alert('Name required');return;}
  var contractors=[];document.querySelectorAll('#ea-contractors-list > div').forEach(function(wrap){var n=wrap.querySelector('.contr-f-name').value.trim();if(!n)return;var c={name:n};var r=wrap.querySelector('.contr-f-role').value.trim();if(r)c.role=r;var p=wrap.querySelector('.contr-f-phone').value.trim();if(p)c.phone=p;var e=wrap.querySelector('.contr-f-email').value.trim();if(e)c.email=e;contractors.push(c);});
  var data={name:name,category:document.getElementById('ea-category').value,status:document.getElementById('ea-status').value,install_date:document.getElementById('ea-install').value||'',last_service_date:document.getElementById('ea-last-service').value||'',next_service_date:document.getElementById('ea-next-service').value||'',warranty_expiry:document.getElementById('ea-warranty').value||'',notes:document.getElementById('ea-notes').value.trim(),purchase_price:document.getElementById('ea-price').value.trim(),manual_url:document.getElementById('ea-manual-url').value.trim(),contractors:JSON.stringify(contractors)};
  closeModal('modal-edit-asset');setSyncState('loading','Saving...');
  if(editingAsset){var aid=editingAsset.asset_id;apiPost({action:'updateAsset',data:{asset_id:aid,updates:data}}).then(function(){refreshData(true).then(function(){if(aid){openAssetId=aid;openAssetPanel(aid);}});});}
  else{apiPost({action:'addAsset',data:data}).then(function(){refreshData(true);});}
}
function deleteEditingAsset(){
  if(!editingAsset)return;
  if(!confirm('Delete this asset?'))return;
  closeModal('modal-edit-asset');closePanel();setSyncState('loading','Deleting...');
  apiPost({action:'deleteAsset',data:{asset_id:editingAsset.asset_id}}).then(function(){refreshData(true);});
}
var _maintNoteAssetId=null;
function openAddMaintenanceNote(){
  _maintNoteAssetId=openAssetId;
  document.getElementById('mn-note').value='';
  document.getElementById('mn-date').value=todayStr();
  openModal('modal-maint-note');
}
function submitMaintenanceNote(){
  var note=document.getElementById('mn-note').value.trim();if(!note){alert('Note required');return;}
  var date=document.getElementById('mn-date').value||todayStr();
  closeModal('modal-maint-note');setSyncState('loading','Saving...');
  var aid=_maintNoteAssetId;
  apiPost({action:'addMaintenanceNote',data:{asset_id:aid,date:date,note:note}}).then(function(){refreshData(true).then(function(){if(aid){openAssetId=aid;openAssetPanel(aid);}});});
}
function openAddTaskForAsset(){
  openAddTask();
  var sel=document.getElementById('t-asset-link');if(sel&&openAssetId)sel.value=openAssetId;
}
function populateAssetDropdown(){
  var sel=document.getElementById('t-asset-link');if(!sel)return;
  sel.innerHTML='<option value="">No asset link</option>';
  (state.assets||[]).forEach(function(a){var o=document.createElement('option');o.value=a.asset_id;o.textContent=a.name;sel.appendChild(o);});
}
function populateProjectDropdown(){
  var sel=document.getElementById('t-proj-link');if(!sel)return;
  sel.innerHTML='<option value="">No project link</option>';
  (state.projects||[]).filter(function(p){return p.status!=='done';}).forEach(function(p){var o=document.createElement('option');o.value=p.project_id;o.textContent=p.name;sel.appendChild(o);});
}

// ── ACTIVITY TABS ─────────────────────────────────────────
function setMetricsTab(tab){
  metricsTab=tab;
  var isStats=tab==='stats';
  document.getElementById('metrics-stats-panel').classList.toggle('gone',!isStats);
  document.getElementById('metrics-history-panel').classList.toggle('gone',isStats);
  document.querySelectorAll('#metrics-tab-bar .tab-btn').forEach(function(b){b.classList.toggle('on',b.dataset.mtab===tab);});
  if(isStats)renderStats();else renderHistory();
}
function setStatsRange(d){
  statsDays=d;
  document.querySelectorAll('.range-btn').forEach(function(b){b.classList.toggle('on',parseInt(b.dataset.days)===d);});
  renderStats();
}
function setStatsScope(s){
  statsScope=s;
  document.querySelectorAll('.scope-pill').forEach(function(b){b.classList.toggle('on',b.dataset.scope===s);});
  renderStats();
}
function renderStats(){
  var days=statsDays||30;
  var log=(state.task_log||[]).filter(function(l){if(!isCompletionLog(l))return false;if(statsScope==='all')return true;var s=l.scope||'household';return s===statsScope;});
  var cutoff=new Date();cutoff.setDate(cutoff.getDate()-days);
  var filtered=log.filter(function(l){return new Date(l.completed_at)>=cutoff;});
  _drillAll=filtered;
  // one pass instead of two, and a jointly credited completion lands in both buckets
  _drillF=[];_drillM=[];
  filtered.forEach(function(l){
    if(hasPerson(l.completed_by,'Frankie'))_drillF.push(l);
    if(hasPerson(l.completed_by,'Meredith'))_drillM.push(l);
  });
  var nums=document.getElementById('metrics-nums');
  if(nums)nums.innerHTML=metCard(_drillAll.length,'Total completed',0)+metCard(_drillF.length,'By Frankie',1)+metCard(_drillM.length,'By Meredith',2);
  var maxBar=Math.max(_drillF.length,_drillM.length,1);
  var bars=document.getElementById('metrics-bars');
  if(bars)bars.innerHTML='<div class="bar-title">Completions by person</div><div class="bar-row"><div class="bar-lbl">Frankie</div><div class="bar-track"><div class="bar-fill pur" style="width:'+Math.round(_drillF.length/maxBar*100)+'%"></div></div><div class="bar-val">'+_drillF.length+'</div></div><div class="bar-row"><div class="bar-lbl">Meredith</div><div class="bar-track"><div class="bar-fill yel" style="width:'+Math.round(_drillM.length/maxBar*100)+'%"></div></div><div class="bar-val">'+_drillM.length+'</div></div>';
  renderTrendChart();
}
function metCard(n,l,idx){return '<div class="metrics-card" style="cursor:pointer" onclick="openMetricDrillDown('+idx+')"><div class="metrics-num">'+(n||0)+'</div><div class="metrics-lbl">'+l+'</div></div>';}
function openMetricDrillDown(idx){
  var titles=['Total completed','By Frankie','By Meredith'];
  var title=titles[idx]||'Completions';
  var items=idx===1?_drillF:idx===2?_drillM:_drillAll;
  document.getElementById('drill-title').textContent=title;
  var listEl=document.getElementById('drill-list');listEl.innerHTML='';
  var sorted=items.slice().sort(function(a,b){return new Date(b.completed_at)-new Date(a.completed_at);});
  if(!sorted.length){listEl.innerHTML='<div style="font-size:12.5px;color:var(--text3);text-align:center;padding:20px">No completions in this window.</div>';openModal('modal-metric-drill');return;}
  sorted.forEach(function(l){var d=document.createElement('div');d.className='drill-item';d.innerHTML='<div class="drill-item-name">'+esc(l.task_name)+'</div><div class="drill-item-sub">'+esc(l.completed_by)+' &middot; '+fmtTimestamp(l.completed_at)+'</div>';listEl.appendChild(d);});
  openModal('modal-metric-drill');
}
function renderTrendChart(){
  var wrapEl=document.getElementById('metrics-trend');if(!wrapEl)return;
  var tdays=statsDays||30;
  var log=(state.task_log||[]).filter(function(l){if(!isCompletionLog(l))return false;if(statsScope==='all')return true;var s=l.scope||'household';return s===statsScope;});
  var now=new Date();now.setHours(0,0,0,0);
  var cutoff=new Date(now);cutoff.setDate(cutoff.getDate()-tdays);
  var weeks=[];var d=new Date(cutoff);
  while(d<=now){weeks.push({start:new Date(d),f:0,m:0});d=new Date(d);d.setDate(d.getDate()+7);}
  if(!weeks.length){wrapEl.innerHTML='';return;}
  log.forEach(function(l){var dt=new Date(l.completed_at);if(dt<cutoff)return;var wi=Math.floor((dt-cutoff)/604800000);if(wi>=weeks.length)wi=weeks.length-1;if(wi<0)wi=0;if(hasPerson(l.completed_by,'Frankie'))weeks[wi].f++;if(hasPerson(l.completed_by,'Meredith'))weeks[wi].m++;});
  var maxV=Math.max.apply(null,weeks.map(function(w){return Math.max(w.f,w.m);}));if(!maxV)maxV=1;
  var W=280,H=100,px=28,py=12,n=weeks.length;
  function pts(key){return weeks.map(function(w,i){var x=px+Math.round(i/(n-1||1)*(W-px-14));var y=H-py-Math.round(w[key]/maxV*(H-py*2));return x+','+y;}).join(' ');}
  var fPts=pts('f'),mPts=pts('m');
  // Y-axis gridlines and labels (increments of 5)
  var yMax=Math.ceil(maxV/5)*5;if(yMax<5)yMax=5;var yLines='';
  for(var yv=0;yv<=yMax;yv+=5){var yy=H-py-Math.round(yv/maxV*(H-py*2));yLines+='<line x1="'+px+'" y1="'+yy+'" x2="'+(W-14)+'" y2="'+yy+'" stroke="var(--border)" stroke-width="0.5"/><text x="'+(px-4)+'" y="'+(yy+4)+'" font-size="7" fill="var(--text3)" text-anchor="end">'+yv+'</text>';}
  // X-axis week labels (M/D)
  var xLabels='';var step=Math.max(1,Math.ceil(n/6));
  weeks.forEach(function(w,i){if(i%step!==0&&i!==n-1)return;var x=px+Math.round(i/(n-1||1)*(W-px-14));var m=w.start.getMonth()+1;var d=w.start.getDate();xLabels+='<text x="'+x+'" y="'+(H-1)+'" font-size="7" fill="var(--text3)" text-anchor="middle">'+m+'/'+d+'</text>';});
  wrapEl.innerHTML='<div class="trend-title">Completions over time</div><svg width="100%" viewBox="0 0 '+W+' '+H+'" style="overflow:visible">'+yLines+'<polyline points="'+fPts+'" fill="none" stroke="var(--purple)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><polyline points="'+mPts+'" fill="none" stroke="var(--yellow)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>'+xLabels+'</svg><div class="trend-legend"><span><span class="trend-legend-dot" style="background:var(--purple)"></span>Frankie</span><span><span class="trend-legend-dot" style="background:var(--yellow)"></span>Meredith</span></div>';
}
function renderHistory(){
  var scope=metricsTab==='personal'?'personal':'household';
  var search=((document.getElementById('history-search')||{}).value||'').toLowerCase();
  var log=(state.task_log||[]).filter(function(l){
    if(!isCompletionLog(l))return false;
    if((l.scope||'household')!==scope)return false;
    if(scope==='personal'&&!hasPerson(l.completed_by,currentUser))return false;
    if(search&&!((l.task_name||'').toLowerCase().includes(search)||(l.completed_by||'').toLowerCase().includes(search)))return false;
    return true;
  }).slice().sort(function(a,b){return new Date(b.completed_at)-new Date(a.completed_at);});
  var listEl=document.getElementById('history-list');if(!listEl)return;listEl.innerHTML='';
  if(!log.length){listEl.innerHTML='<div style="font-size:12.5px;color:var(--text3);padding:20px 0;text-align:center">No completions found.</div>';return;}
  log.forEach(function(l){
    var d=document.createElement('div');d.className='history-item';
    var mb=document.createElement('button');mb.className='history-menu-btn';mb.innerHTML='<i class="ti ti-dots-vertical"></i>';
    mb.addEventListener('click',function(e){e.stopPropagation();openHistoryActionMenu(e,l);});
    var who=peopleLabel(l.completed_by);
    var dotCls=personDot(l.completed_by);
    d.innerHTML='<div class="ldot '+dotCls+'"></div><div style="flex:1;min-width:0"><div class="lt">'+esc(l.task_name)+'</div><div class="lm">'+esc(who)+' - '+fmtTimestamp(l.completed_at)+'</div></div>';
    d.appendChild(mb);
    listEl.appendChild(d);
  });
}
function openHistoryActionMenu(e,l){
  closeTaskMenu();
  _histMenuLog=l;
  var m=document.createElement('div');m.className='task-menu';
  m.innerHTML='<button class="task-menu-item" onclick="markIncomplete()"><i class="ti ti-arrow-back-up"></i> Mark as incomplete</button><button class="task-menu-item" onclick="openReassignMenu()"><i class="ti ti-user-check"></i> Reassign to...</button><button class="task-menu-item danger" onclick="deleteTaskLogEntry()"><i class="ti ti-trash"></i> Delete entry</button>';
  document.body.appendChild(m);
  var r=e.currentTarget.getBoundingClientRect();
  var left=r.right-170;if(left<8)left=8;
  m.style.left=left+'px';m.style.top=(r.bottom+4)+'px';
  openMenu=m;setTimeout(function(){document.addEventListener('click',closeTaskMenuOnce);},10);
}
function markIncomplete(){
  if(!_histMenuLog)return;closeTaskMenu();
  if(!confirm('Resurface "'+_histMenuLog.task_name+'" as an active task?'))return;
  setSyncState('loading','Restoring...');
  apiPost({action:'uncompleteTask',data:{log_id:_histMenuLog.log_id,task_id:_histMenuLog.task_id}}).then(function(){scheduleBgSync(SYNC_FAST);});
}
function deleteTaskLogEntry(){
  if(!_histMenuLog)return;closeTaskMenu();
  if(!confirm('Delete this history entry? This cannot be undone.'))return;
  setSyncState('loading','Deleting...');
  apiPost({action:'deleteTaskLog',data:{log_id:_histMenuLog.log_id}}).then(function(){scheduleBgSync(SYNC_FAST);}).catch(function(){setSyncState('err','Could not delete');scheduleBgSync();showToast("Couldn't delete entry");});
}
function openTaskHistory(){
  if(!editingTask)return;
  var tid=editingTask.task_id;
  var name=editingTask.name;
  document.getElementById('th-task-name').textContent=name;
  var logs=(state.task_log||[]).filter(function(l){return l.task_id===tid&&isCompletionLog(l);}).slice().sort(function(a,b){return new Date(b.completed_at)-new Date(a.completed_at);});
  var el=document.getElementById('th-list');el.innerHTML='';
  if(!logs.length){el.innerHTML='<div style="font-size:13px;color:var(--text3);padding:12px 0">No history yet.</div>';openModal('modal-task-history');return;}
  logs.forEach(function(l){
    var lt=l.log_type||'completion';
    var icon=lt==='snooze'?'ti-clock':lt==='edit'?'ti-pencil':'ti-check';
    var clr=lt==='snooze'?'var(--amber)':lt==='edit'?'var(--text3)':'var(--green)';
    var label=lt==='snooze'?'Snoozed':lt==='edit'?'Edited':'Completed';
    var by=l.completed_by?(' – '+esc(l.completed_by)):'';
    var detail='';
    if(lt==='snooze'&&l.details){try{var dp=JSON.parse(l.details);if(dp.until_date)detail=' → until '+fmtDate(dp.until_date);}catch(e){}}
    var row=document.createElement('div');row.className='th-row';
    row.innerHTML='<i class="ti '+icon+' th-icon" style="color:'+clr+'"></i><div style="flex:1;min-width:0"><div class="lt">'+label+by+'</div><div class="lm">'+fmtTimestamp(l.completed_at)+detail+'</div></div>';
    el.appendChild(row);
  });
  openModal('modal-task-history');
}
function openReassignMenu(){
  if(!_histMenuLog)return;closeTaskMenu();
  document.getElementById('reassign-name').textContent=_histMenuLog.task_name;
  _reassignPerson=_histMenuLog.completed_by||'Frankie';
  _reassignScope=_histMenuLog.scope||'household';
  pickReassignPerson(_reassignPerson);
  pickReassignScope(_reassignScope);
  openModal('modal-reassign');
}
function pickReassignPerson(p){
  _reassignPerson=p;
  [['reassign-btn-f','Frankie'],['reassign-btn-m','Meredith'],['reassign-btn-both','Frankie,Meredith']]
    .forEach(function(pair){var el=document.getElementById(pair[0]);if(el)el.classList.toggle('dimmed',p!==pair[1]);});
}
function pickReassignScope(s){
  _reassignScope=s;
  var rh=document.getElementById('reassign-scope-house');var rp=document.getElementById('reassign-scope-pers');
  if(rh)rh.className='scope-opt'+(s==='household'?' sel-house':'');
  if(rp)rp.className='scope-opt'+(s==='personal'?' sel-pers':'');
}
function submitReassign(){
  if(!_histMenuLog)return;
  closeModal('modal-reassign');setSyncState('loading','Updating...');
  apiPost({action:'reassignCompletion',data:{log_id:_histMenuLog.log_id,task_id:_histMenuLog.task_id,completed_by:_reassignPerson,scope:_reassignScope}}).then(function(){scheduleBgSync(SYNC_FAST);});
}
// ── MODALS ────────────────────────────────────────────────
function openModal(id){document.getElementById(id).classList.remove('gone');}
function closeModal(id){document.getElementById(id).classList.add('gone');}
var _MODAL_BG_IDS=['modal-task','modal-project','modal-subtask','modal-grocery','modal-qs','modal-snooze','modal-mobile-menu','modal-edit-asset','modal-maint-note','modal-metric-drill','modal-reassign','modal-batch-snooze','modal-type-info','modal-task-history'];
document.addEventListener('click',function(e){if(!e.target.id)return;var i=_MODAL_BG_IDS.indexOf(e.target.id);if(i>=0)closeModal(_MODAL_BG_IDS[i]);});

// ── PROJECT / GROCERY ─────────────────────────────────────
function openAddProject(){
  editingProject=null;
  document.getElementById('project-modal-title').textContent='New project';
  document.getElementById('project-submit-btn').textContent='Create project';
  document.getElementById('project-delete-btn').classList.add('gone');
  document.getElementById('p-name').value='';document.getElementById('p-desc').value='';
  document.getElementById('p-status').value='active';document.getElementById('p-target').value='';
  openModal('modal-project');
}
function openEditProject(pid){
  var p=state.projects.find(function(x){return String(x.project_id)===String(pid);});if(!p)return;
  editingProject=p;
  document.getElementById('project-modal-title').textContent='Edit project';
  document.getElementById('project-submit-btn').textContent='Save changes';
  document.getElementById('project-delete-btn').classList.remove('gone');
  document.getElementById('p-name').value=p.name||'';document.getElementById('p-desc').value=p.description||'';
  document.getElementById('p-status').value=p.status||'active';document.getElementById('p-target').value=dval(p.target_date);
  openModal('modal-project');
}
function submitProject(){
  var n=document.getElementById('p-name').value.trim();if(!n){alert('Name required');return;}
  var data={name:n,description:document.getElementById('p-desc').value.trim(),status:document.getElementById('p-status').value,target_date:document.getElementById('p-target').value||''};
  closeModal('modal-project');setSyncState('loading','Saving...');
  if(editingProject){apiPost({action:'updateProject',data:{project_id:editingProject.project_id,updates:data}}).then(function(){scheduleBgSync(SYNC_FAST);});}
  else{apiPost({action:'addProject',data:data}).then(function(){scheduleBgSync(SYNC_FAST);});}
}
function deleteEditingProject(){
  if(!editingProject)return;
  if(!confirm('Delete this project and all its tasks?'))return;
  closeModal('modal-project');setSyncState('loading','Deleting...');
  apiPost({action:'deleteProject',data:{project_id:editingProject.project_id}}).then(function(){scheduleBgSync(SYNC_FAST);});
}
function openEditSubtask(sid){
  var s=state.subtasks.filter(function(x){return String(x.subtask_id)===String(sid);})[0];if(!s)return;
  editingSubtask=s;
  document.getElementById('st-name').value=s.name||'';
  document.getElementById('st-status').value=s.status||'todo';
  document.getElementById('st-due').value=s.due_date||'';
  openModal('modal-subtask');
}
function submitSubtask(){
  if(!editingSubtask)return;
  var n=document.getElementById('st-name').value.trim();if(!n){alert('Name required');return;}
  var updates={name:n,status:document.getElementById('st-status').value,due_date:document.getElementById('st-due').value||''};
  closeModal('modal-subtask');setSyncState('loading','Saving...');
  apiPost({action:'updateSubtask',data:{subtask_id:editingSubtask.subtask_id,updates:updates}}).then(function(){apiGet({action:'getSubtasks'}).then(function(r){state.subtasks=r||[];renderProjects();setSyncState('ok','Saved');});});
}
function deleteEditingSubtask(){
  if(!editingSubtask)return;
  if(!confirm('Delete this task?'))return;
  closeModal('modal-subtask');setSyncState('loading','Deleting...');
  apiPost({action:'deleteSubtask',data:{subtask_id:editingSubtask.subtask_id}}).then(function(){apiGet({action:'getSubtasks'}).then(function(r){state.subtasks=r||[];renderProjects();setSyncState('ok','Deleted');});});
}
function openAddGrocery(){document.getElementById('g-name').value='';openModal('modal-grocery');}
function submitGrocery(){var n=document.getElementById('g-name').value.trim();if(!n)return;closeModal('modal-grocery');setSyncState('loading','Saving...');var tempId='tmp_'+Date.now();var cat=document.getElementById('g-cat').value;(function addAttempt(){var tid2=tempId;var tempItem={item_id:tid2,name:n,category:cat,added_by:currentUser,status:'need',_temp:true};state.grocery.push(tempItem);renderGrocery();apiPost({action:'addGroceryItem',data:{name:n,category:cat,added_by:currentUser}}).then(function(){scheduleBgSync(SYNC_FAST);}).catch(function(){state.grocery=state.grocery.filter(function(g){return g.item_id!==tid2;});actionFailed("Couldn't add item",renderGrocery,'Could not save',addAttempt);});})();}

// ── UTILS ─────────────────────────────────────────────────
function esc(s){if(s===null||s===undefined)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function fmtDate(d){if(!d)return'';try{var ds=String(d).split('T')[0];var dt=new Date(ds+'T12:00:00');if(isNaN(dt))return String(d);return dt.toLocaleDateString('en-US',{month:'short',day:'numeric'});}catch(e){return String(d);}}
function fmtTimestamp(d){if(!d)return'';try{var s=String(d);var dt=s.includes('T')?new Date(s):new Date(s+'T12:00:00');if(isNaN(dt))return fmtDate(d);return dt.toLocaleDateString('en-US',{month:'short',day:'numeric'});}catch(e){return fmtDate(d);}}
function dval(d){return d?String(d).split('T')[0]:'';}
// LOCAL calendar date, not UTC. new Date().toISOString() is a UTC timestamp, so in Denver
// (UTC-6) anything after 6pm local already reports TOMORROW. Task bucketing uses local
// midnight (setHours(0,0,0,0)), so a task defaulted to the UTC date landed in the Tomorrow
// bucket and looked like it had never been created. This is the fix for that.
function todayStr(){var d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().split('T')[0];}
function fmtDateShort(d){if(!d)return'';try{var ds=String(d).split('T')[0];var dt=new Date(ds+'T12:00:00');if(isNaN(dt))return String(d);var DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];return DOW[dt.getDay()]+' '+(dt.getMonth()+1)+'/'+dt.getDate();}catch(e){return String(d);}}
</script>
"""

# ─── COMPILE ──────────────────────────────────────────────────────────────────
body = HTML_BODY(LOGO, ICON)
js   = JS.replace('__API__', API)

HTML = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Loon HQ">
<meta name="theme-color" content="#1A8C68">
<link rel="apple-touch-icon" href="{ICON}">
<title>Loon HQ</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.44.0/tabler-icons.min.css">
<style>{CSS}</style>
</head>
<body>
{body}
{js}
<div id="toast-msg" class="toast" onclick="onToastTap()"></div>
</body>
</html>"""

out = "/mnt/user-data/outputs/LoonHQ.html"
with open(out, "w", encoding="utf-8") as f:
    f.write(HTML)

import os
kb = round(os.path.getsize(out) / 1024, 1)
print(f"Built: {kb} KB -> {out}")
