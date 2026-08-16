/* Merge the explainer (Learn) and the builder (Build) into one tabbed page.
   Run: node merge.js   ->  writes merged-template.html                       */
const fs = require('fs');

/* ── CSS scoping ──────────────────────────────────────────────────────────
   Both stylesheets use bare element selectors (section, h1, p, footer) that
   would leak across panes, so every rule gets scoped under its pane id.
   Truly global rules are listed in SKIP and hoisted by hand instead.        */
const SKIP = new Set([
  '*', 'body', ':root', ':root:not([data-theme="light"])', ':root[data-theme="dark"]',
  ':focus-visible', 'button,input', 'button,input,select'
]);

function scope(css, prefix) {
  let out = '', i = 0;
  while (i < css.length) {
    // Emit leading whitespace first, otherwise a comment sitting after a newline
    // is not seen as a comment and gets swept into the next selector prelude,
    // where the prefix is spliced into the middle of the comment text.
    const ws = /^\s+/.exec(css.slice(i));
    if (ws) { out += ws[0]; i += ws[0].length; continue; }
    // pass through comments verbatim
    if (css.startsWith('/*', i)) {
      const e = css.indexOf('*/', i + 2);
      const end = e === -1 ? css.length : e + 2;
      out += css.slice(i, end); i = end; continue;
    }
    const brace = css.indexOf('{', i);
    if (brace === -1) { out += css.slice(i); break; }

    const prelude = css.slice(i, brace);
    // find the matching close brace
    let depth = 0, j = brace;
    for (; j < css.length; j++) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') { depth--; if (depth === 0) break; }
    }
    const body = css.slice(brace + 1, j);
    const head = prelude.trim();

    if (head.startsWith('@')) {
      if (/^@(media|supports|layer|container)/i.test(head)) {
        out += prelude + '{' + scope(body, prefix) + '}';       // recurse inside
      } else {
        out += prelude + '{' + body + '}';                       // keyframes, font-face
      }
    } else {
      const sels = head.split(',').map(s => s.trim()).filter(Boolean);
      const joined = sels.join(',');
      if (SKIP.has(joined) || sels.every(s => SKIP.has(s))) {
        out += prelude + '{' + body + '}';                       // hoisted global
      } else {
        const lead = prelude.slice(0, prelude.length - prelude.trimStart().length);
        out += lead + sels.map(s => prefix + ' ' + s).join(',\n  ') + '{' + body + '}';
      }
    }
    i = j + 1;
  }
  return out;
}

/* strip rules whose selector matches a predicate (used to drop each file's
   own token blocks and the builder's old top bar, replaced by shared CSS) */
function dropRules(css, pred) {
  let out = '', i = 0;
  while (i < css.length) {
    if (css.startsWith('/*', i)) {
      const e = css.indexOf('*/', i + 2);
      const end = e === -1 ? css.length : e + 2;
      out += css.slice(i, end); i = end; continue;
    }
    const brace = css.indexOf('{', i);
    if (brace === -1) { out += css.slice(i); break; }
    let depth = 0, j = brace;
    for (; j < css.length; j++) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') { depth--; if (depth === 0) break; }
    }
    const head = css.slice(i, brace).trim();
    const body = css.slice(brace + 1, j);
    if (pred(head, body)) { /* dropped */ }
    else if (/^@(media|supports)/i.test(head)) {
      const inner = dropRules(body, pred);
      if (inner.trim()) out += css.slice(i, brace) + '{' + inner + '}';
    } else {
      out += css.slice(i, brace) + '{' + body + '}';
    }
    i = j + 1;
  }
  return out;
}

const read = f => fs.readFileSync(f, 'utf8');
function split(f) {
  const s = read(f);
  const a = s.indexOf('<style>'), b = s.indexOf('</style>');
  return { css: s.slice(a + 7, b), rest: s.slice(b + 8) };
}

const L = split('explainer.html');
const B = split('builder-template.html');

/* ── 1. Learn: Aporia -> Confusion, matching the builder and mermaid ────── */
let lcss = L.css, lrest = L.rest;
const apToConf = s => s
  .replace(/--h-aporia/g, '--h-confusion')
  .replace(/data-domain="aporia"/g, 'data-domain="confusion"')
  .replace(/data-for="aporia"/g, 'data-for="confusion"')   // panel switcher keys off this
  .replace(/HUE\.aporia/g, 'HUE.confusion')
  .replace(/(\baporia\s*:)/g, 'confusion:')            // object keys
  .replace(/to:\s*"aporia"/g, 'to: "confusion"')
  .replace(/aporia:\s*"var\(--h-aporia\)"/g, 'confusion: "var(--h-confusion)"');
lcss = apToConf(lcss);
lrest = apToConf(lrest);

/* visible labels */
lrest = lrest
  .replace(/aria-label="Aporia, the central domain of not knowing"/,
           'aria-label="Confusion, the central domain of not knowing"')
  .replace(/(<text class="dname"[^>]*>)Aporia(<\/text>)/, '$1Confusion$2')
  .replace(/name:\s*"Aporia"/, 'name: "Confusion"')
  /* aporia and confusion are the two modes of the centre, not synonyms: aporia is
     active (you know you do not know), confusion is passive (you have not noticed).
     Snowden notates them A and C. Do not reduce this to an alias list. */
  .replace(/aka:\s*"formerly Disorder - the central domain"/,
           'aka: "the central domain, in its passive mode; aporia is the active one"')
  .replace(/AP\(\["Aporia"\]\)/g, 'AP(["Confusion"])')
  .replace(/A\["Break it<br\/>into parts"\]/g, 'A["Break it<br/>into parts"]')
  .replace(/>Aporia<\/button>/, '>Confusion</button>')
  .replace(/Aporia is not a failure state\./,
           'Confusion is not a failure state.')
  .replace(/Under Aporia, people do not choose a domain/,
           'Under Confusion, people do not choose a domain')
  .replace(/Aporia is not turbulence\./, 'Confusion is not turbulence.')
  /* NOT renamed: staying deliberately IS aporia. Calling it confusion inverts the
     framework, since confusion is precisely the state you have not chosen. */
  .replace(/<span class="lbl">Aporia<\/span>/g, '<span class="lbl">Confusion</span>');

/* ── 2. Learn: mermaid colors -> the meaning-led palette ────────────────
   clear=green complicated=yellow complex=orange chaotic=red confusion=grey */
const MM_COLORS = [
  [/fill:#F7F4EA,stroke:#A07717/g, 'fill:#EDF4EA,stroke:#3B7A32'],  // clear
  [/fill:#EDE0BF,stroke:#A07717/g, 'fill:#D6E7CF,stroke:#3B7A32'],
  [/fill:#EEF3F6,stroke:#2F6485/g, 'fill:#F5F2DF,stroke:#806E0C'],  // complicated
  [/fill:#D5E4EE,stroke:#2F6485/g, 'fill:#EAE4BE,stroke:#806E0C'],
  [/fill:#EBF4F0,stroke:#2C7A5D/g, 'fill:#F8EFE5,stroke:#AD5510'],  // complex
  [/fill:#CDE6DC,stroke:#2C7A5D/g, 'fill:#F0DCC4,stroke:#AD5510'],
  [/fill:#F8EDE9,stroke:#A63F26/g, 'fill:#F8E9E8,stroke:#AF2723'],  // chaotic
  [/fill:#EFD3C9,stroke:#A63F26/g, 'fill:#EFCECB,stroke:#AF2723'],
  [/fill:#F0EEF5,stroke:#5B5578/g, 'fill:#EDEFEE,stroke:#5E6A64'],  // confusion
];
for (const [re, to] of MM_COLORS) lrest = lrest.replace(re, to);

/* ── 3. Learn: render mermaid with the bundled copy, not the host runtime ─ */
lrest = lrest.replace(/<pre class="mermaid">/g, '<pre class="mmd-src">');

/* The transforms above are exact-string matches against the source pages, so any
   later edit to that copy can silently stop one applying. Fail loudly instead. */
for (const needle of ['in its passive mode; aporia is the active one', 'name: "Confusion"',
                      'data-for="confusion"', 'class="mmd-src"']) {
  if (!lrest.includes(needle)) throw new Error('learn transform did not apply: ' + needle);
}
for (const stale of ['formerly Disorder', 'data-domain="aporia"', '--h-aporia',
                     'data-for="aporia"', 'class="mermaid"']) {
  if (lrest.includes(stale)) throw new Error('learn transform left stale text: ' + stale);
}

/* ── 4. Drop each file's own tokens/reset (shared block replaces them) ──── */
const isToken = h => /^:root/.test(h) || h === '*' || h === 'body' ||
                     /^button,input/.test(h) || h === ':focus-visible';
lcss = dropRules(lcss, isToken);
let bcss = dropRules(B.css, isToken);
/* builder's old top bar becomes the shared one */
bcss = dropRules(bcss, h => /^\.bar\b/.test(h) || /^#boardTitle/.test(h) || /^\.btn\b/.test(h));
/* learn keeps its own .btn (quiz styling) - scoping makes it an override */

/* ── 5. Scope ────────────────────────────────────────────────────────────── */
const learnCss = scope(lcss, '#learn');
const buildCss = scope(bcss, '#build');

/* ── 6. Body markup ──────────────────────────────────────────────────────── */
function bodyOf(rest) {
  const i = rest.indexOf('<script>');
  return { html: rest.slice(0, i), scripts: rest.slice(i) };
}
const lb = bodyOf(lrest), bb = bodyOf(B.rest);

/* builder: lift the top-bar controls out, the rest becomes the Build pane */
let buildHtml = bb.html;
/* the bar contains nested <div>s, so match the closing tag by depth -
   a lazy regex stops at the first </div> and orphans the rest */
function sliceBalancedDiv(html, openTag) {
  const start = html.indexOf(openTag);
  if (start === -1) throw new Error(openTag + ' not found');
  const re = /<\/?div\b[^>]*>/g;
  re.lastIndex = start + openTag.length;
  let depth = 1, m;
  while ((m = re.exec(html))) {
    depth += m[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return { start, end: m.index + m[0].length };
  }
  throw new Error('unbalanced ' + openTag);
}
const bar = sliceBalancedDiv(buildHtml, '<div class="bar">');
const barHtml = buildHtml.slice(bar.start, bar.end);
buildHtml = buildHtml.slice(0, bar.start) + buildHtml.slice(bar.end);
/* the lifted bar must not leave duplicate ids behind in the Build pane */
for (const id of ['loadEg', 'clearAll', 'boardTitle']) {
  if (buildHtml.includes('id="' + id + '"')) throw new Error('duplicate id left in build pane: ' + id);
}
if (!/class="board"/.test(buildHtml)) throw new Error('board lost from build pane');
if (!/class="app"/.test(buildHtml)) throw new Error('app lost from build pane');

/* scripts: learn IIFE, build IIFE (strip the bundle placeholder line) */
const buildScript = bb.scripts
  .replace(/<script>\/\*__MERMAID_BUNDLE__\*\/<\/script>\s*/, '')
  .replace(/<script>window\.__MM__ = window\.mermaid;<\/script>\s*/, '');

fs.writeFileSync('merged-parts.json', JSON.stringify({
  learnCss, buildCss, learnHtml: lb.html, buildHtml,
  learnScript: lb.scripts, buildScript
}, null, 0));

console.log('learn css   ', learnCss.length);
console.log('build css   ', buildCss.length);
console.log('learn html  ', lb.html.length);
console.log('build html  ', buildHtml.length);
console.log('learn script', lb.scripts.length);
console.log('build script', buildScript.length);
console.log('aporia left in learn html:', (lb.html.match(/[Aa]poria/g) || []).length);
console.log('mmd-src blocks:', (lb.html.match(/mmd-src/g) || []).length);
