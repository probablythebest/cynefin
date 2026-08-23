# Third-party notices

**None.** This repository vendors no third-party code.

The page previously bundled Mermaid to draw its diagrams. That was removed on
2026-08-16 in favour of an original SVG renderer (`src/render.js`), written from
scratch: no code, stylesheet, markup structure or layout algorithm was taken from
Mermaid or any other diagram library.

Mermaid's `cynefin-beta` **syntax** is still emitted by the Build tab as an export
format, so a board can be pasted into any Mermaid-capable tool. That is text
generation for interoperability, not use of their implementation.

Everything here is the author's own work, licensed MIT; see LICENSE.
