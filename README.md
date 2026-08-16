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
assets/mermaid.min.js   Mermaid 11.16.1, vendored
src/
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

### Editing the sources: geometry is sized against pre-rename text

`merge.js` rewrites copy during the build, so hand-placed SVG geometry in `src/` is
fitted to the text as it reads *before* the transform. The center diamond on the
Learn map was drawn for the 6-character label "Aporia"; the rename to the
9-character "Confusion" made the label 50% wider and the shape did not follow, so it
overflowed unnoticed. If you re-fit anything anchored to a label, check the label
`merge.js` emits, not the one in the source file. The Learn terrain map is the only
place with hand-placed SVG text.

## Why Mermaid is vendored, not inlined

Mermaid loads from `assets/` as a separate file so the browser caches it
independently. The page is about 28 KB gzipped; the library is about 948 KB. Split
this way, a repeat visit re-fetches only the page, and editing the page does not
invalidate the library.

It is a plain `<script src>`, deliberately not `defer`: the inline scripts after it
are not deferred, so a deferred library would load after them and be missing when
they run.

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

**Page CSS must not restyle Mermaid output.** Mermaid measures each label with its
own font and sizes the box to fit before the SVG reaches the page, so any typography
applied afterward makes text outgrow its box and clip. Mermaid emits `class="label"`
of its own, which is why the Learn pane's section eyebrows use `.eyebrow` rather than
`.label`, and why both diagram containers are quarantined with `text-transform: none`
and `letter-spacing: normal`.

**Learn opens on Clear**, set in three places that must agree: the boot call
`select("clear")` and the panel's static `data-domain` and heading, which are what
shows before the script runs.

**No em or en dashes in anything a human reads**, enforced by `assemble.js` on every
build. Copy is US English.

## Credits and license

The framework is Dave Snowden's; this is a secondary summary, not a Cynefin Co.
publication. See the Provenance section on the Learn tab.

Licensed MIT, see [LICENSE](LICENSE). That covers the work in this repository: the
page, the sources in `src/`, and the docs. It does **not** relicense
`assets/mermaid.min.js`, which is vendored third-party code and keeps its own terms;
those are recorded in [THIRD-PARTY.md](THIRD-PARTY.md).
