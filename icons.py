"""Inline icon set for LoonHQ.

Why this file exists: the app used to pull the Tabler icon webfont from jsdelivr on every
load. That stylesheet is render-blocking, so a slow or unreachable CDN froze the app before
it could paint, and if the request failed outright EVERY icon in the interface vanished.
Measured: 106ms to interactive when the CDN fails fast, 6029ms when it hangs.

These are hand-authored replacements drawn to match Tabler's conventions (24x24 grid, 2px
stroke, round caps and joins, no fill). They are NOT the original Tabler artwork, which
could not be fetched offline. Visually equivalent, not byte-identical.

They are painted with CSS `mask-image` rather than `background-image` so each icon still
inherits its colour from `color`, exactly as the font glyphs did. That matters because the
app colours icons contextually (red for delete, green for complete, and so on).

To add an icon: add an entry here, run `python3 build_v4.py`, and use it as
`<i class="ti ti-your-name"></i>` exactly as before.
"""

# Inner SVG markup for each icon, on a 24x24 canvas. Stroke and fill are applied by the
# wrapper below, so these only describe geometry.
ICON_PATHS = {
    "check":              '<path d="M5 12l5 5L20 7"/>',
    "x":                  '<path d="M18 6L6 18M6 6l12 12"/>',
    "plus":               '<path d="M12 5v14M5 12h14"/>',
    "trash":              '<path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
    "pencil":             '<path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3zM13.5 6.5l3 3"/>',
    "clock":             ('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    "refresh":            '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/>',
    "search":            ('<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.8-4.8"/>'),
    "lock":              ('<rect x="5" y="11" width="14" height="9" rx="2"/>'
                          '<path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    "home":               '<path d="M4 11l8-7 8 7M6 10v10h12V10M10 20v-6h4v6"/>',
    "tool":               '<path d="M7 10a4 4 0 0 1 5-5l-2.5 2.5 2 2L14 7a4 4 0 0 1-5 5l-4 4a1.8 1.8 0 0 1-2.5-2.5l4.5-3.5z"/>',
    "wind":               '<path d="M4 8h9a2.5 2.5 0 1 0-2.5-2.5M4 12h13a2.5 2.5 0 1 1-2.5 2.5M4 16h7a2 2 0 1 1-2 2"/>',
    "calendar":          ('<rect x="4" y="6" width="16" height="14" rx="2"/>'
                          '<path d="M4 10h16M8 4v4M16 4v4"/>'),
    "calendar-event":    ('<rect x="4" y="6" width="16" height="14" rx="2"/>'
                          '<path d="M4 10h16M8 4v4M16 4v4"/><rect x="8" y="13" width="4" height="4" rx="1"/>'),
    "history":            '<path d="M12 8v4l3 2M3.5 10A9 9 0 1 1 5 15.5M3 6v4h4"/>',
    "chevron-right":      '<path d="M9 6l6 6-6 6"/>',
    "chevron-down":       '<path d="M6 9l6 6 6-6"/>',
    "dots-vertical":     ('<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/>'
                          '<circle cx="12" cy="19" r="1.4"/>'),
    "grip-vertical":     ('<circle cx="9" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/>'
                          '<circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="6" r="1.3"/>'
                          '<circle cx="15" cy="12" r="1.3"/><circle cx="15" cy="18" r="1.3"/>'),
    "alert-triangle":     '<path d="M12 4L2.5 20h19L12 4zM12 10v4M12 17.5v.01"/>',
    "info-circle":       ('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>'),
    "shopping-cart":     ('<circle cx="9.5" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>'
                          '<path d="M3 4h2l2.2 10.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L20 8H6"/>'),
    "layout-list":       ('<rect x="4" y="5" width="16" height="6" rx="2"/>'
                          '<rect x="4" y="14" width="16" height="6" rx="2"/>'),
    "list-check":         '<path d="M4 6l2 2 3-3M4 14l2 2 3-3M13 7h7M13 15h7"/>',
    "clipboard-list":    ('<path d="M9 4h6v3H9zM9 5.5H7a2 2 0 0 0-2 2V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5a2 2 0 0 0-2-2h-2"/>'
                          '<path d="M9 12h6M9 16h4"/>'),
    "select-all":        ('<rect x="7" y="7" width="12" height="12" rx="2"/>'
                          '<path d="M5 15V5h10"/><path d="M10.5 13l2 2 4-4"/>'),
    "chart-bar":          '<path d="M4 20h16M7 20v-7M12 20V6M17 20v-4"/>',
    "user-check":        ('<circle cx="9" cy="8" r="4"/><path d="M3 20a6 6 0 0 1 10-4.5M16 17l2 2 4-4"/>'),
    "file-text":         ('<path d="M14 3H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7l-4-4z"/>'
                          '<path d="M14 3v4h4M9 13h6M9 17h4"/>'),
    "arrow-back-up":      '<path d="M9 13l-4-4 4-4"/><path d="M5 9h9a5 5 0 0 1 0 10h-2"/>',
    "layers":             '<path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5"/>',
    "flame":              '<path d="M12 3c3 4 5.5 6 5.5 9.5a5.5 5.5 0 1 1-11 0C6.5 10 8 8.5 9 7c.5 2 1.5 3 3 3.5-.5-3 0-5.5 0-7.5z"/>',
    "droplet":            '<path d="M12 3.5l5 6.5a6 6 0 1 1-10 0l5-6.5z"/>',
    "ripple":             '<path d="M3 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 14c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 19c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>',
    "wash":              ('<circle cx="12" cy="13" r="6"/><circle cx="12" cy="13" r="2.2"/>'
                          '<path d="M4 7h16"/>'),
    "wash-machine":      ('<rect x="4" y="3" width="16" height="18" rx="2"/>'
                          '<circle cx="12" cy="14" r="4.5"/><path d="M7 6.5h.01M11 6.5h.01"/>'),
    "solar-panel":       ('<path d="M3 15h18l-2-8H5l-2 8zM12 7v8M8.5 15l.8-8M15.5 15l-.8-8M4 11h16"/>'
                          '<path d="M12 15v5M9 20h6"/>'),
    "fence":              '<path d="M4 9l2-3 2 3v11H4V9zM12 9l2-3 2 3v11h-4V9zM4 13h16M4 16h16"/>',
    "building-warehouse": '<path d="M3 20V9l9-5 9 5v11M3 20h18M7 20v-7h10v7M7 16h10"/>',
}

# Every icon name the app actually references, so the build can fail loudly on a typo
# rather than silently shipping a blank square.
def build_icon_css(used_names):
    """Return (css_text, missing_names). css_text defines --i-<name> vars plus .ti rules."""
    missing = sorted(n for n in used_names if n not in ICON_PATHS)
    vars_out, rules_out = [], []
    for name in sorted(used_names):
        if name not in ICON_PATHS:
            continue
        # Write the SVG with PLAIN characters, then encode once. Encoding order matters:
        # an earlier version pre-wrote the stroke as %23000 and then escaped '%' again,
        # producing stroke='%2523000'. That is not a valid colour, so nothing was drawn and
        # every icon rendered as an empty box. Encode '#' exactly once, here.
        svg = (
            "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' "
            "stroke='#000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>"
            + ICON_PATHS[name] + "</svg>"
        )
        enc = (svg.replace('%', '%25')       # must be first, or later escapes get re-escaped
                  .replace('"', "'")
                  .replace('<', '%3C').replace('>', '%3E')
                  .replace('#', '%23'))
        vars_out.append("  --i-%s:url(\"data:image/svg+xml,%s\");" % (name, enc))
        rules_out.append(".ti-%s{-webkit-mask-image:var(--i-%s);mask-image:var(--i-%s)}" % (name, name, name))

    css = (
        "/* Inline icons. See icons.py for why these are not the Tabler webfont. */\n"
        ":root{\n" + "\n".join(vars_out) + "\n}\n"
        # mask + currentColor keeps the colour-inheritance the font glyphs had
        ".ti{display:inline-block;width:1em;height:1em;vertical-align:-.125em;flex-shrink:0;"
        "background-color:currentColor;"
        "-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;"
        "-webkit-mask-position:center;mask-position:center;"
        "-webkit-mask-size:contain;mask-size:contain}\n"
        + "\n".join(rules_out) + "\n"
    )
    return css, missing
