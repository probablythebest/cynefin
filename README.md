# Cynefin

A single page with two tabs, for sorting real work with the Cynefin framework.

- **Build** is a sorting board that is itself the Cynefin diagram: add the decisions
  in front of you, drag them onto a domain, and add transitions, which are drawn as
  arrows over the panels they connect. Underneath it, the transitions and a read
  of the board. Work persists in `localStorage`, and exports to and imports from
  both JSON and Mermaid `cynefin-beta`.
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
  render.js             original SVG renderer: the Learn diagrams, and the
                        transition arrows drawn over the Build board
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

## The board you edit is the diagram

There is one board, not a board and a picture of one. The five domain panels are
the live HTML you drag cards into, laid out as a Cynefin board, and the transitions
are drawn as an SVG layer over them. Until 2026-08-23 the Build tab carried both:
editable zones on top and a redrawn SVG copy underneath, showing the same items
twice and going out of step whenever one changed.

Keeping the editing in HTML is what makes this cheap. Drag and drop, inline text
editing, the `1`-`5` shortcuts, focus rings and screen-reader labels all keep
working because none of them moved. Only the arrows are drawn.

**The arrow layer takes no clicks.** `pointer-events: none` on the `.arrows` SVG,
because the panels underneath it are drop targets. Transitions are added and removed
in the card below the board, which is also the whole record of them when the layout
is too narrow to draw arrows at all.

**Two passes, and one would not do.** How wide the row gutter has to be and how tall
the panels have to be depend on the transitions; where the arrows go depends on where
the browser then put the panels. So `draw()` plans, writes `--rgap` and the panel
minimums, measures what it got, and draws into the overlay. It is idempotent, which
is what stops the `ResizeObserver` watching the board it resizes from looping.

**Confusion sits in the gutter, not across it.** The board is three grid rows: panels,
gutter, panels. Confusion is placed in the middle row and centered on it, overflowing
evenly above and below, which is where it belongs on a Cynefin board. Spanning both
panel rows instead filled the whole middle column and left a diagonal nowhere to turn.

**Below 860px the board stacks and the arrows are not drawn.** `CX.arrows.draw`
returns nothing unless it measures the real two-by-two, because stacked there is no
channel to route through and a wrong arrow is worse than no arrow.

## Diagrams are drawn by our own renderer

`src/render.js` builds every diagram as SVG. It is original work with no
dependencies: no code, stylesheet, markup structure or layout algorithm from
Mermaid or any other diagram library. Mermaid was removed on 2026-08-16, taking
the payload from about 985 KB gzipped to about 32 KB.

Two things this buys beyond size.

**The diagrams theme themselves.** Colors are `var(--h-clear)`, `var(--ink)` and
so on, read straight from the page. The old approach needed a light "paper" inset
with a brightness filter over it in dark mode, because the library baked light
colors into its output.

**Text is measured, not estimated.** `CX.textWidth` uses a canvas to measure the
real string in the real font, so boxes fit their labels and text wraps at exactly
the width available. Every clipping bug in this project's history came from a width
that was guessed.

The three builders: `CX.build.chain` for the per-domain decision sequences,
`CX.build.graph` for hand-positioned node graphs, and `CX.arrows` for the transitions
over the Build board. Node positions in `graph` are given as fractions of the canvas,
so the movement diagram places the domains in the real Cynefin geometry rather than
accepting whatever a generic top-down layout produces. `CX.arrows` works entirely
from measured rectangles, which is what lets it serve whatever panel sizes the
browser hands back.

Mermaid's `cynefin-beta` syntax is still generated, but only when you export a
`.mmd`. Producing that text costs nothing and keeps boards portable.

**Edge labels are collected and appended after every edge is drawn.** Drawn inline,
an edge later in the list paints over the plate of a label already placed, and the
line reads as a strikethrough through the text.

### Transition routing on the board

One generic curve cannot serve every pair, so `CX.arrows` picks a route by where the
two domains sit, and the caller sizes the board to fit what it picked.

**Same column** gives each transition its own slot across the column: the arrow on the
slot's inner edge, its label filling the rest of that slot and sitting 9px from it.
Stacking both labels on the column center instead left no way to tell which text went
with which arrow once a column carried two going opposite ways. The gutter is sized
from the tallest wrapped label: it used to be a flat 18px, which was narrower than the
padding held off each panel, so the curve collapsed to a 2px stub with the arrowhead
clipped off and only the label showed.

**Same row** bows to the outer side of its row, away from Confusion, so its label stays
clear of the band a diagonal turns in; bowing inward put the two labels on one strip
where they read as a single line of text. The bow is measured from whichever endpoint
sorts first, not from the arrow's own direction: flipping the sign per lane in the
arrow's frame cancels against the reversal, and a there-and-back pair came out as two
identical curves with two labels on the same spot.

**Diagonal** takes a rounded L out of the left-column panel, up or down the channel
beside Confusion, then in along the band above or below it. A straight diagonal passes
behind the Confusion panel. Confusion is centered on the row gutter and can be taller
than the rows beside it, so the quadrant panels grow until that band exists.

**Every label has to land in open board**, because the arrows are drawn over the live
panels and a label plate that lands on one hides the items underneath. A label that
does not clear slides along its own route first, which keeps it on its arrow, and only
then steps off it in widening rings. A bow between two panels that nearly touch has no
point on itself in open board at all: the channel between them is narrower than the
words, so it ends up in the gutter beside them.

Repeats between the same pair take separate lanes in all three routes. Every label
ends up nearer its own arrow than any other, which is the property to check when
changing any of this: on a board carrying all twelve possible transitions, no label
has a second arrow within three times its own arrow's distance, and no arrow or label
overlaps a panel.

## Board density

There is no density limit and nothing is capped. The panels are ordinary HTML that
grows to fit its contents, so items cannot collide: a 33-item board is just a taller
board. Item text wraps natively, with `overflow-wrap: anywhere` so a single long
unbroken word cannot force a panel wider than its column.

Transition labels are drawn text rather than HTML, so they wrap against a measured
width, with a 3-line cap and an ellipsis past it. That cap is a guard against one
pathological label, not the normal path.

This replaced a fixed-canvas library whose quadrants overlapped once a domain got
busy, and which needed hand-fitted width and height formulas to stay legible.

## Export and import

Two formats out, one button in. Files are named from the board title plus an ISO
date, for example `delivery-board-q3-2026-08-23.json`.

**Export JSON** is the lossless one and the reason it is offered first. The format is
`{format:"cynefin-board", version:1, exportedAt, title, items, trans}`, and it carries
everything on the board including the unsorted tray.

**Export Mermaid** writes `cynefin-beta` source, for pasting into any Mermaid-capable
tool. It cannot carry unsorted items, because the format has nowhere to put an item
that is not under a domain. The export says so at the time, naming the count, rather
than letting the tray disappear quietly. The `%%{init}%%` line carries a width and
height sized from the busiest domain: those are what stop the quadrants overlapping in
a tool that draws on a fixed canvas, which ours no longer does.

**Import** takes either, and works out which from the content rather than the
extension, so a `.txt` holding `cynefin-beta` still comes in. It replaces the board
after a confirm when there is work to lose.

Both parsers refuse rather than half-import, and leave the current board untouched
when they do: invalid JSON, a wrong or missing `format`, a missing items list, a file
that is neither format, a Mermaid file of some other diagram type, or a board with
nothing usable are each refused with a specific message. In the JSON path, items whose
domain is not one of the five come in as unsorted rather than being dropped, and
unreadable entries are counted in the result.

The Mermaid reader is deliberately loose about everything except the diagram type,
because the file may well have been written by hand: item text quoted or not, a colon
after a domain name, labels quoted or bare, `-->` with any spacing. `aporia` and
`disorder` both come in as Confusion, being the two older names for the same center
domain.

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
