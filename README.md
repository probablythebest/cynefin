# Cynefin

A single page with two tabs, for sorting real work with the Cynefin framework.

- **Build** is a sorting board. Add the decisions in front of you, drag them onto a
  domain, add transitions between domains, and get a live Mermaid `cynefin-beta`
  diagram plus a read of the board. Work persists in `localStorage`, and can be
  exported to and imported from JSON.
- **Learn** is an interactive field sheet: a clickable terrain map, per-domain
  decision sequences, the movement between domains, a two-question orientation
  test, and the common misuses.

No build step to view it and no network at runtime. Open `index.html`, or serve the
repository root as a static site.

## Hosting on GitHub Pages

Settings, Pages, deploy from a branch, root folder. Nothing else to configure.
Every path is relative, so a project site at `https://user.github.io/repo/` works
without a `<base>` tag. `.nojekyll` keeps Jekyll out of the way.

## Layout

```
index.html              the built page, committed so a clone opens with no toolchain
src/
  render.js             original SVG diagram renderer, no dependencies
  explainer.html        source for the Learn tab
  builder-template.html source for the Build tab
  merge.js              reconciles the two into one document
  assemble.js           writes the shared shell and ../index.html
```

## Building

`index.html` is generated. Edit the files in `src/`, then:

```bash
cd src && node merge.js && node assemble.js
```

Do not hand-edit `index.html`; the next build overwrites it. CI rebuilds on every
push and fails if the committed page does not match `src/`, so drift is a build
error rather than a slow surprise.

`merge.js` scopes each source page's CSS under its pane id (`#build` / `#learn`),
because both used bare element selectors that would otherwise leak across tabs. It
also renames the center domain and repoints the Learn diagram colors at the shared
palette. `assemble.js` writes the document shell, the tab switcher, and escapes all
non-ASCII so the page survives being served without a charset header.

### Build guards

Both scripts fail loudly rather than degrading the page quietly. If a build throws,
read the message before changing anything else.

- `merge.js` asserts every exact-string transform actually applied and that no stale
  text survives. Those transforms match literal strings in the source pages, so
  editing that copy can silently stop one applying. That happened once: a copy sweep
  changed a matched string, the replacement stopped firing, and a panel reverted to
  the wrong text with no error anywhere.
- `assemble.js` fails the build if an em or en dash reaches user-facing output,
  checking the raw characters, the HTML entities, the numeric entities, and the
  JavaScript escapes.
- `merge.js` strips comments from a rule's prelude before testing its selector. The
  parser only skips a comment that starts exactly where it is looking, so a comment
  sitting above a rule ends up inside that rule's prelude. The Learn pane's `:root`
  token block survived on that account and, coming last in the cascade, overrode the
  shared meaning-led palette in light mode while dark mode looked correct.

### Editing the sources: geometry is sized against pre-rename text

`merge.js` rewrites copy during the build, so hand-placed SVG geometry in `src/` is
fitted to the text as it reads *before* the transform. The center diamond on the
Learn map was drawn for the 6-character label "Aporia"; the rename to the
9-character "Confusion" made the label 50% wider and the shape did not follow, so it
overflowed unnoticed. If you re-fit anything anchored to a label, check the label
`merge.js` emits, not the one in the source file. The Learn terrain map is the only
place with hand-placed SVG text.

## Diagrams are drawn by our own renderer

`src/render.js` builds every diagram as SVG. It is original work with no
dependencies: no code, stylesheet, markup structure or layout algorithm from
Mermaid or any other diagram library. Mermaid was removed on 2026-08-16, taking
the payload from about 985 KB gzipped to about 32 KB.

Two things this buys beyond size.

**The diagrams theme themselves.** Colours are `var(--h-clear)`, `var(--ink)` and
so on, read straight from the page. The old approach needed a light "paper" inset
with a brightness filter over it in dark mode, because the library baked light
colours into its output.

**Text is measured, not estimated.** `CX.textWidth` uses a canvas to measure the
real string in the real font, so boxes fit their labels and long item text is
ellipsised at exactly the width available. Every clipping bug in this project's
history came from a width that was guessed.

The three builders: `CX.build.chain` for the per-domain decision sequences,
`CX.build.graph` for hand-positioned node graphs, and `CX.board` for the Cynefin
board itself. Node positions in `graph` are given as fractions of the canvas, so
the movement diagram places the domains in the real Cynefin geometry rather than
accepting whatever a generic top-down layout produces.

Mermaid's `cynefin-beta` syntax is still emitted as an export format. Generating
that text costs nothing and keeps boards portable.

Two rendering rules that are easy to break by accident:

**The diagram plate is `--sunk`, in both panes.** It used to be a fixed light
`#EFEDE3` with `filter: brightness(.82)` dropped over it in dark mode, which was
scaffolding for a renderer that baked light colors into its SVG. Ours does not, so
the plate is a normal themed surface. Edge labels paint an opaque `--sunk` plate to
erase the line behind them, which only works while the two agree.

**Edge labels are collected and appended after every edge is drawn.** Drawn inline,
an edge later in the list paints over the plate of a label already placed, and the
line reads as a strikethrough through the text.

### Transition routing on the board

One generic curve cannot serve every pair, so `CX.board` picks a route by where the
two domains sit, and sizes the board to fit what it picked.

**Same column** runs straight down the row gutter, held to the panel's inner edge so
the label sits on the column center without covering the arrow. The gutter is sized
from the number of lanes: it used to be a flat 18px, which was narrower than the
padding held off each panel, so the curve collapsed to a 2px stub with the arrowhead
clipped off and only the label showed.

**Same row** bows across the middle, which has room for one. The bow is measured from
whichever endpoint sorts first, not from the arrow's own direction: flipping the sign
per lane in the arrow's frame cancels against the reversal, and a there-and-back pair
came out as two identical curves with two labels on the same spot.

**Diagonal** takes a rounded L out of the left-column panel, up or down the channel
beside Confusion, then in along the band above or below it. A straight diagonal runs
under the Confusion panel, and panels are drawn over the lines, so most of the arrow
vanished. Confusion is centered on the row gutter and can be taller than the rows
beside it, so the quadrant panels grow until that band exists.

Repeats between the same pair take separate lanes in all three routes.

## Diagram density

There is no density limit and nothing is capped. Panels grow to fit their
contents, so items cannot collide: a 33-item board renders with zero overlapping
chips and zero text outside the canvas, and adding more just makes the board
taller.

Item labels wider than their column are ellipsised at the measured width, so a
long label shortens rather than escaping its box.

This replaced a fixed-canvas library whose quadrants overlapped once a domain got
busy, and which needed hand-fitted width and height formulas to stay legible.

## Export and import

Export writes the board to a JSON file named from the board title plus an ISO date,
for example `delivery-board-q3-2026-08-16.json`. Import reads one back, replacing
the board after a confirm when there is work to lose.

The format is `{format:"cynefin-board", version:1, exportedAt, title, items, trans}`.
Import validates it: invalid JSON, a wrong or missing `format`, a missing items list,
or a board with nothing usable are each refused with a specific message, and the
current board is left untouched. Items whose domain is not one of the five come in as
unsorted rather than being dropped, and unreadable entries are counted in the result.

## Conventions

**Domain colors are meaning-led:** clear = green, complicated = yellow, complex =
orange, chaotic = red, confusion = gray. The light-theme yellow and orange are darker
than their dark-theme counterparts because the zone name is small uppercase type and
the brighter values fell below 4.5:1 contrast.

**Domain order runs ordered to unordered:** clear, complicated, complex, chaotic,
confusion. One array, `ORDER` in the Build script, drives the stacked board order,
the `1`-`5` keyboard shortcuts, the tally strip, and the Mermaid emission order, so
they cannot drift apart. The desktop 2x2 is separate: it comes from explicit grid
placement keyed on `data-domain`, which is why the board markup can be in reading
order without disturbing the layout. Reorder the DOM, never CSS `order`, so tab and
screen-reader order keep matching what is on screen.

**The page always opens on the first tab, Build.** The tab is deliberately not
persisted: a page that reopens on whatever you last clicked is disorienting. Board
contents still persist; only the view resets.

**The transition form opens on the first two domains in that order** (Clear to
Complicated), taken from `ORDER` rather than hardcoded, so it matches what the
dropdowns show and cannot drift if the order changes again. Picking the same domain
twice disables Add and says why, instead of silently doing nothing.

**Aporia and confusion are not synonyms**, and the copy must not treat them as one.
They are the two modes of the center domain: aporia is active (you know you do not
know and hold the question open on purpose), confusion is passive (you have not
noticed, so you drift to your favorite domain). Snowden notates them A and C; only
confusion is a failure state. The board and export say "Confusion" because that is
Mermaid's `cynefin-beta` keyword, so what you see matches what you emit, but the
prose names both. In particular `merge.js` must NOT rename "stay in aporia
deliberately" to confusion: staying deliberately is by definition aporia.

**Diagram SVG sets its own type; do not restyle it from page CSS.** The renderer
measures each label with a canvas and sizes the box to fit, so page typography applied
afterward would make text outgrow the box it was measured for. Set font on the diagram
through `render.js`, not through a selector that reaches into the SVG. The old
quarantine rules for a third-party renderer are gone, along with the class collision
that made the Learn eyebrows `.eyebrow` rather than `.label`; that rename stays, since
nothing is served by undoing it.

**Learn opens on Clear**, set in three places that must agree: the boot call
`select("clear")` and the panel's static `data-domain` and heading, which are what
shows before the script runs.

**No em or en dashes in anything a human reads**, enforced by `assemble.js` on every
build. Copy is US English.

## Credits and license

The framework is Dave Snowden's; this is a secondary summary, not a Cynefin Co.
publication. See the Provenance section on the Learn tab.

Licensed MIT, see [LICENSE](LICENSE). It covers everything in the repository:
no third-party code is vendored any more, as [THIRD-PARTY.md](THIRD-PARTY.md) records.
