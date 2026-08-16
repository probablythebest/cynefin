/* Assemble ../index.html from the scoped parts merge.js produced. */
const fs = require('fs');
const P = JSON.parse(fs.readFileSync('merged-parts.json', 'utf8'));

/* Make the page encoding-proof: it must render correctly even if it is ever
   served without a charset header. CSS non-ASCII is comment-only rule art;
   HTML gets numeric entities; JS strings get \\u escapes. */
const nonAscii = /[^\x00-\x7F]/g;
const toAscii = s => s.replace(nonAscii, '-');
const toEntities = s => s.replace(nonAscii, c => '&#x' + c.charCodeAt(0).toString(16).toUpperCase() + ';');
const toJsEsc = s => s.replace(nonAscii, c => '\\u' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'));

P.learnCss = toAscii(P.learnCss);
P.buildCss = toAscii(P.buildCss);
P.learnHtml = toEntities(P.learnHtml);
P.buildHtml = toEntities(P.buildHtml);
P.learnScript = toJsEsc(P.learnScript);
P.buildScript = toJsEsc(P.buildScript);

const SHARED_CSS = `
  /* ===== Shared shell =================================================== */
  :root{
    color-scheme: light dark;
    --paper:#F0F1EC; --sheet:#F8F9F5; --sunk:#E7E9E2;
    --ink:#1B211E; --ink-2:#4E5A55; --muted:#7C8883; --rule:#CDD3CB;
    --plate:#E6E9E1; --plate-2:#DDE1D8;
    --shadow:0 1px 0 rgba(27,33,30,.05), 0 10px 24px -18px rgba(27,33,30,.5);
    --inset-dim:none;
    /* meaning-led domain palette: clear=green complicated=yellow
       complex=orange chaotic=red confusion=grey */
    --h-clear:#3B7A32; --h-complicated:#806E0C; --h-complex:#AD5510;
    --h-chaotic:#AF2723; --h-confusion:#5E6A64; --h-unplaced:#8D9791;
    --serif:"Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua","Hoefler Text",Georgia,serif;
    --sans:"Avenir Next Condensed","Roboto Condensed","Helvetica Neue Condensed","Arial Narrow","Segoe UI",system-ui,sans-serif;
    --w:1120px; --prose:68ch;
  }
  @media (prefers-color-scheme:dark){
    :root:not([data-theme="light"]){
      --paper:#141815; --sheet:#1C221E; --sunk:#101413;
      --ink:#E9ECE5; --ink-2:#AAB5AF; --muted:#7F8B85; --rule:#2C3531;
      --plate:#222925; --plate-2:#1D2420;
      --shadow:0 1px 0 rgba(0,0,0,.4), 0 14px 30px -20px rgba(0,0,0,.9);
      --inset-dim:brightness(.82) saturate(.95);
      --h-clear:#63BE55; --h-complicated:#DCC341; --h-complex:#E8913F;
      --h-chaotic:#E85C52; --h-confusion:#A6B0AA; --h-unplaced:#79837E;
    }
  }
  :root[data-theme="dark"]{
    --paper:#141815; --sheet:#1C221E; --sunk:#101413;
    --ink:#E9ECE5; --ink-2:#AAB5AF; --muted:#7F8B85; --rule:#2C3531;
    --plate:#222925; --plate-2:#1D2420;
    --shadow:0 1px 0 rgba(0,0,0,.4), 0 14px 30px -20px rgba(0,0,0,.9);
    --inset-dim:brightness(.82) saturate(.95);
    --h-clear:#63BE55; --h-complicated:#DCC341; --h-complex:#E8913F;
    --h-chaotic:#E85C52; --h-confusion:#A6B0AA; --h-unplaced:#79837E;
  }

  *{ box-sizing:border-box; }
  body{
    margin:0; background:var(--paper); color:var(--ink);
    font-family:var(--serif); font-size:16px; line-height:1.5;
    -webkit-font-smoothing:antialiased;
    overflow-x:clip;   /* clip, not hidden: hidden would move scrolling to body */
  }
  button,input,select{ font:inherit; color:inherit; }
  :focus-visible{ outline:2px solid var(--ink); outline-offset:2px; border-radius:2px; }

  /* the explainer was authored at its own reading size */
  #learn{ font-size:17px; line-height:1.62; }
  [hidden]{ display:none !important; }

  /* ---- top bar shared by both tabs ---- */
  .topbar{
    position:sticky; top:0; z-index:40;
    background:var(--sheet); border-bottom:1px solid var(--rule);
    display:flex; flex-wrap:wrap; gap:10px 16px; align-items:center;
    padding:11px clamp(12px,2.2vw,22px);
  }
  .topbar .brand{
    font-size:1.28rem; margin:0; font-weight:400; letter-spacing:-.01em; white-space:nowrap;
  }
  .topbar .spacer{ flex:1 1 0; min-width:0; }
  .seg{ display:flex; border:1px solid var(--rule); border-radius:2px; overflow:hidden; flex:none; }
  .seg button{
    font-family:var(--sans); font-size:.7rem; letter-spacing:.16em; text-transform:uppercase;
    font-weight:600; padding:8px 18px; cursor:pointer;
    background:transparent; color:var(--muted); border:0;
    transition:background .16s, color .16s;
  }
  .seg button + button{ border-left:1px solid var(--rule); }
  .seg button:hover{ color:var(--ink); }
  .seg button[aria-selected="true"]{ background:var(--ink); color:var(--paper); }
  .buildonly{ display:flex; flex-wrap:wrap; gap:10px; align-items:center; flex:1 1 260px; min-width:0; justify-content:flex-end; }
  #boardTitle{
    background:var(--paper); border:1px solid var(--rule); border-radius:2px;
    padding:7px 11px; font-size:.95rem; min-width:0; flex:1 1 340px; max-width:680px;
  }
  #boardTitle::placeholder{ color:var(--muted); }
  .btn{
    font-family:var(--sans); font-size:.68rem; letter-spacing:.14em; text-transform:uppercase; font-weight:600;
    padding:8px 13px; border-radius:2px; cursor:pointer; white-space:nowrap;
    background:transparent; color:var(--ink-2); border:1px solid var(--rule);
    transition:color .16s, border-color .16s, background .16s, opacity .16s;
  }
  .btn:hover{ color:var(--ink); border-color:var(--ink-2); }
  .btn.solid{ background:var(--ink); color:var(--paper); border-color:var(--ink); }
  .btn.solid:hover{ opacity:.84; color:var(--paper); }
  .btn[disabled]{ opacity:.42; cursor:not-allowed; }
  /* transient result line for export/import, muted so it never reads as an error
     colour (the domain palette owns red) */
  .io-note{ flex:1 1 100%; font-size:.84rem; font-style:italic; color:var(--ink-2); }
  .io-note[data-bad="true"]{ color:var(--ink); font-weight:600; }
  .btn[disabled]:hover{ color:var(--ink-2); border-color:var(--rule); }

  /* learn diagrams are rendered from <pre class="mmd-src"> by the bundled mermaid */
  #learn pre.mmd-src{ display:none; }
  #learn .mmd{ width:100%; }
  #learn .mmd svg{ max-width:100%; height:auto; display:block; margin:0 auto; }

  /* Mermaid measures each label with its own font and sizes the box to fit BEFORE
     the SVG reaches the page. Any page typography applied afterward makes the text
     outgrow its box and clip. Mermaid emits class="label" of its own, so quarantine
     both diagram containers from inherited text styling. */
  #learn .mmd, #build #dia{ font-family:Georgia, "Iowan Old Style", Palatino, serif; }
  #learn .mmd .label, #learn .mmd .nodeLabel, #learn .mmd .edgeLabel,
  #learn .mmd text, #learn .mmd tspan, #learn .mmd foreignObject div, #learn .mmd span,
  #build #dia .label, #build #dia .nodeLabel, #build #dia .edgeLabel,
  #build #dia text, #build #dia tspan, #build #dia foreignObject div, #build #dia span{
    text-transform:none !important;
    letter-spacing:normal !important;
    font-family:inherit !important;
  }

  @media (prefers-reduced-motion:reduce){ *{ transition-duration:.001ms !important; animation-duration:.001ms !important; } }
`;

/* A full document now: the artifact host used to supply doctype/head/body. Without
   the doctype the page renders in quirks mode, and without the viewport meta every
   responsive breakpoint is dead on a phone. */
const HEAD = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cynefin</title>
<meta name="description" content="Sort your own work onto a Cynefin board, or learn the framework from an interactive field sheet.">
<style>
${SHARED_CSS}
  /* ===== Build pane ===================================================== */
${P.buildCss}
  /* ===== Learn pane ===================================================== */
${P.learnCss}
</style>
</head>
<body>

<div class="topbar">
  <h1 class="brand">Cynefin</h1>
  <div class="seg" role="tablist" aria-label="View">
    <button type="button" role="tab" id="tabBuild" aria-controls="build" aria-selected="true">Build</button>
    <button type="button" role="tab" id="tabLearn" aria-controls="learn" aria-selected="false">Learn</button>
  </div>
  <div class="buildonly" id="buildControls">
    <input id="boardTitle" type="text" placeholder="Name this board&hellip;" aria-label="Board title" autocomplete="off" />
    <button class="btn" type="button" id="exportBoard">Export</button>
    <button class="btn" type="button" id="importBoard">Import</button>
    <input type="file" id="importFile" accept="application/json,.json" hidden />
    <button class="btn" type="button" id="loadEg">Load example</button>
    <button class="btn" type="button" id="clearAll">Clear board</button>
    <span class="io-note" id="ioNote" role="status" hidden></span>
  </div>
</div>

<div id="build" role="tabpanel" aria-labelledby="tabBuild">
${P.buildHtml}
</div>

<div id="learn" role="tabpanel" aria-labelledby="tabLearn" hidden>
${P.learnHtml}
</div>

<!-- Mermaid is vendored rather than inlined so the browser caches it separately:
     the page is ~27 KB gzipped, the library ~948 KB. Editing the page no longer
     invalidates the library. Plain src, NOT defer: the inline scripts below are
     not deferred, so a deferred library would load after them and __MM__ would
     be undefined. Relative path, so file:// and a project Pages path both work. -->
<script src="assets/mermaid.min.js"></script>
<script>window.__MM__ = window.mermaid;</script>
`;

const TAIL = `
${P.buildScript}
${P.learnScript}
<script>
/* ---- render the Learn diagrams with the bundled mermaid --------------- */
(function(){
  var MM = window.__MM__;
  if(!MM || typeof MM.render !== "function") return;
  var pres = document.querySelectorAll("#learn pre.mmd-src");
  Array.prototype.forEach.call(pres, function(pre, i){
    var src = pre.textContent;
    var done = function(res){
      var d = document.createElement("div");
      d.className = "mmd";
      d.innerHTML = res.svg;
      if(pre.parentNode) pre.parentNode.replaceChild(d, pre);
    };
    try{
      var p = MM.render("lrn" + i, src);
      if(p && typeof p.then === "function") p.then(done, function(){});
      else if(p && p.svg) done(p);
    }catch(e){}
  });
})();

/* ---- Build / Learn switch -------------------------------------------- */
(function(){
  var tab = { build:document.getElementById("tabBuild"), learn:document.getElementById("tabLearn") };
  var pane = { build:document.getElementById("build"),   learn:document.getElementById("learn") };
  var ctl  = document.getElementById("buildControls");

  function show(which){
    ["build","learn"].forEach(function(k){
      pane[k].hidden = (k !== which);
      tab[k].setAttribute("aria-selected", k === which ? "true" : "false");
    });
    ctl.hidden = (which !== "build");   /* board title + example/clear are Build-only */
  }
  tab.build.addEventListener("click", function(){ show("build"); });
  tab.learn.addEventListener("click", function(){ show("learn"); });
  tab.build.addEventListener("keydown", function(e){ if(e.key==="ArrowRight"){ show("learn"); tab.learn.focus(); } });
  tab.learn.addEventListener("keydown",  function(e){ if(e.key==="ArrowLeft"){  show("build"); tab.build.focus(); } });

  /* Always open on the first tab. The tab is deliberately NOT persisted: a page
     that reopens on whatever you last clicked is disorienting, and Build is the
     job. Board contents still persist; only the view resets. */
  show("build");
})();
</script>

</body>
</html>
`;

const PAGE = HEAD + TAIL;

/* Em and en dashes are banned in anything a human reads, and this page is as
   user-facing as it gets. Check the built output, including the escaped forms,
   so the ban cannot rot back in through a source edit. */
const BS = String.fromCharCode(92);
const dashes =
  (PAGE.split('—').length - 1) + (PAGE.split('–').length - 1) +
  (PAGE.split('&mdash;').length - 1) + (PAGE.split('&ndash;').length - 1) +
  (PAGE.split('&#x2014;').length - 1) + (PAGE.split('&#x2013;').length - 1) +
  (PAGE.split(BS + 'u2014').length - 1) + (PAGE.split(BS + 'u2013').length - 1);
if (dashes > 0) throw new Error('em/en dashes in user-facing output: ' + dashes);

fs.writeFileSync('../index.html', PAGE);
console.log('index.html bytes:', PAGE.length, '| dash check: clean');
