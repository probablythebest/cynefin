/* ------------------------------------------------------------------------
   Original SVG diagram renderer for this page. Written from scratch: no code,
   CSS, markup structure or layout algorithm taken from any diagram library.

   Two things this buys over a general-purpose library. Colours come from the
   page's own CSS custom properties, so the diagrams theme themselves in light
   and dark instead of needing a light "paper" inset with a brightness filter.
   And text is measured for real with a canvas, so boxes fit their labels
   rather than being sized from an estimate.
   ------------------------------------------------------------------------ */
var CX = (function(){
  "use strict";

  var _ctx = null;
  function ctx(){
    if(!_ctx) _ctx = document.createElement("canvas").getContext("2d");
    return _ctx;
  }
  /* Real measurement, not an estimate. Every clipping bug in this project came
     from a width that was guessed instead of measured. */
  function textWidth(s, font){ var c = ctx(); c.font = font; return c.measureText(String(s)).width; }

  function esc(s){
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
                    .replace(/"/g,"&quot;");
  }

  /* greedy wrap on whole words, falling back to a hard break for a word that
     cannot fit on a line by itself */
  function wrap(text, font, maxW){
    var words = String(text).split(/\s+/).filter(Boolean), lines = [], cur = "";
    for(var i=0;i<words.length;i++){
      var next = cur ? cur + " " + words[i] : words[i];
      if(textWidth(next, font) <= maxW || !cur){
        if(textWidth(next, font) > maxW && !cur){
          var w = words[i];
          while(textWidth(w, font) > maxW && w.length > 1){
            var cut = w.length - 1;
            while(cut > 1 && textWidth(w.slice(0,cut), font) > maxW) cut--;
            lines.push(w.slice(0,cut)); w = w.slice(cut);
          }
          cur = w;
        } else cur = next;
      } else { lines.push(cur); cur = words[i]; }
    }
    if(cur) lines.push(cur);
    return lines;
  }

  function r2(n){ return Math.round(n*100)/100; }

  /* a rounded rectangle as an explicit path, so no rx/ry rounding surprises */
  function roundRect(x,y,w,h,r){
    r = Math.min(r, h/2, w/2);
    return "M"+r2(x+r)+" "+r2(y)+
           "h"+r2(w-2*r)+"a"+r2(r)+" "+r2(r)+" 0 0 1 "+r2(r)+" "+r2(r)+
           "v"+r2(h-2*r)+"a"+r2(r)+" "+r2(r)+" 0 0 1 "+r2(-r)+" "+r2(r)+
           "h"+r2(-(w-2*r))+"a"+r2(r)+" "+r2(r)+" 0 0 1 "+r2(-r)+" "+r2(-r)+
           "v"+r2(-(h-2*r))+"a"+r2(r)+" "+r2(r)+" 0 0 1 "+r2(r)+" "+r2(-r)+"z";
  }

  /* one arrowhead definition, referenced by every edge */
  function defs(){
    return '<defs><marker id="cx-ah" viewBox="0 0 10 10" refX="9" refY="5" '+
           'markerWidth="7" markerHeight="7" orient="auto-start-reverse">'+
           '<path d="M0 0L10 5L0 10z" fill="var(--ink-2)"/></marker></defs>';
  }

  function svgOpen(w,h){
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+r2(w)+' '+r2(h)+'" '+
           'width="100%" height="auto" role="img" style="display:block;max-width:'+Math.ceil(w)+'px;margin:0 auto">';
  }

  /* a text block, already wrapped, centred vertically on cy. anchor defaults to
     "middle", so cx is the centre; pass "start" for a left-aligned block, where
     cx is the left edge instead. */
  function textBlock(lines, cx, cy, font, fill, lineH, anchor){
    var total = (lines.length-1)*lineH;
    return lines.map(function(l,i){
      return '<text x="'+r2(cx)+'" y="'+r2(cy - total/2 + i*lineH)+'" text-anchor="'+(anchor||"middle")+'" '+
             'dominant-baseline="central" font-family="'+font.family+'" font-size="'+font.size+'" '+
             'fill="'+fill+'">'+esc(l)+'</text>';
    }).join("");
  }

  return { textWidth:textWidth, esc:esc, wrap:wrap, r2:r2, roundRect:roundRect,
           defs:defs, svgOpen:svgOpen, textBlock:textBlock };
})();

/* ---- diagram builders -------------------------------------------------- */
CX.build = (function(){
  "use strict";
  var SERIF = 'Georgia, "Iowan Old Style", Palatino, serif';
  var F     = { family: SERIF, size: "13px" };
  var FONT  = '13px ' + SERIF;          // the string canvas measures with
  var FLAB  = '11px ' + SERIF;
  var LAB   = { family: SERIF, size: "11px" };
  var PADX = 14, PADY = 9, LINEH = 18, RAD = 4, GAP = 34;

  function boxFor(label, maxW){
    var lines = CX.wrap(label, FONT, maxW || 220);
    var w = Math.max.apply(null, lines.map(function(l){ return CX.textWidth(l, FONT); })) + PADX*2;
    var h = lines.length*LINEH + PADY*2;
    return { lines:lines, w:Math.ceil(w), h:Math.ceil(h) };
  }

  /* A left-to-right chain of steps, used for the per-domain decision sequence.
     Optional trailing step drawn with a dashed connector (the practice it yields). */
  function chain(steps, hue){
    var boxes = steps.map(function(s){ return boxFor(s.t, 200); });
    var h = Math.max.apply(null, boxes.map(function(b){ return b.h; }));
    var w = boxes.reduce(function(a,b){ return a+b.w; }, 0) + GAP*(boxes.length-1);
    var pad = 6, W = w + pad*2, H = h + pad*2;
    var out = [CX.svgOpen(W,H), CX.defs()], x = pad, cy = pad + h/2;

    boxes.forEach(function(b,i){
      var s = steps[i], dashed = !!s.dashed;
      if(i > 0){
        var x0 = x - GAP + 4, x1 = x - 5;
        out.push('<path d="M'+CX.r2(x0)+' '+CX.r2(cy)+'H'+CX.r2(x1)+'" stroke="var(--ink-2)" '+
                 'stroke-width="1.3" fill="none" marker-end="url(#cx-ah)"'+
                 (dashed ? ' stroke-dasharray="4 3"' : '')+'/>');
      }
      out.push('<path d="'+CX.roundRect(x, pad+(h-b.h)/2, b.w, b.h, RAD)+'" '+
               'fill="var(--sheet)" stroke="'+hue+'" stroke-width="1.5"/>');
      out.push(CX.textBlock(b.lines, x+b.w/2, cy, F, "var(--ink)", LINEH));
      x += b.w + GAP;
    });
    out.push("</svg>");
    return out.join("");
  }

  /* Hand-positioned node graph. Positions are given as fractions of the canvas,
     so the caller places nodes where they mean something rather than accepting
     whatever a generic layout produces. */
  function graph(nodes, edges, W, H){
    var pad = 8;
    var placed = {};
    nodes.forEach(function(n){
      var b = boxFor(n.label, n.maxW || 150);
      placed[n.id] = { n:n, b:b, cx:pad + n.x*(W-pad*2), cy:pad + n.y*(H-pad*2) };
    });
    var out = [CX.svgOpen(W,H), CX.defs()];
    /* Labels are collected separately and appended after every edge is drawn.
       Drawn inline, an edge later in the list paints over the plate of a label
       already placed, and the line reads as a strikethrough through the text. */
    var labels = [];

    edges.forEach(function(e){
      var a = placed[e.from], b = placed[e.to];
      if(!a || !b) return;
      var dx = b.cx-a.cx, dy = b.cy-a.cy, len = Math.hypot(dx,dy) || 1;
      /* stop the line at each box edge rather than its centre */
      function edgePoint(p, sx, sy){
        var hw = p.b.w/2 + 6, hh = p.b.h/2 + 6;
        var tx = sx ? hw/Math.abs(sx) : Infinity, ty = sy ? hh/Math.abs(sy) : Infinity;
        var t = Math.min(tx, ty);
        return [p.cx + sx*t, p.cy + sy*t];
      }
      var ux = dx/len, uy = dy/len;
      var p0 = edgePoint(a, ux, uy), p1 = edgePoint(b, -ux, -uy);
      var mx = (p0[0]+p1[0])/2, my = (p0[1]+p1[1])/2;
      var bow = (e.bow || 0);
      var qx = mx - uy*bow, qy = my + ux*bow;
      out.push('<path d="M'+CX.r2(p0[0])+' '+CX.r2(p0[1])+'Q'+CX.r2(qx)+' '+CX.r2(qy)+' '+
               CX.r2(p1[0])+' '+CX.r2(p1[1])+'" fill="none" stroke="var(--ink-2)" stroke-width="1.3" '+
               'marker-end="url(#cx-ah)"'+(e.dashed?' stroke-dasharray="5 4"':'')+'/>');
      if(e.label){
        /* quadratic bezier at t; bidirectional pairs pass different t so their
           labels separate along the edge instead of sitting on top of each other */
        var t = (typeof e.labelT === "number") ? e.labelT : 0.5, mt = 1-t;
        var lx = mt*mt*p0[0] + 2*mt*t*qx + t*t*p1[0];
        var ly = mt*mt*p0[1] + 2*mt*t*qy + t*t*p1[1];
        /* opaque, and --sunk to match the plate the diagram sits on: the label
           has to erase the edge behind it, and a translucent --paper fill let
           the line show through and read as a strikethrough */
        var lw = CX.textWidth(e.label, FLAB);
        labels.push('<rect x="'+CX.r2(lx-lw/2-5)+'" y="'+CX.r2(ly-11)+'" width="'+CX.r2(lw+10)+'" height="22" '+
                    'rx="3" fill="var(--sunk)"/>');
        labels.push(CX.textBlock([e.label], lx, ly, LAB, "var(--ink-2)", LINEH));
      }
    });
    out.push.apply(out, labels);

    nodes.forEach(function(n){
      var p = placed[n.id], b = p.b;
      out.push('<path d="'+CX.roundRect(p.cx-b.w/2, p.cy-b.h/2, b.w, b.h, n.round? b.h/2 : RAD)+'" '+
               'fill="var(--sheet)" stroke="'+(n.hue||"var(--rule)")+'" stroke-width="1.6"/>');
      out.push(CX.textBlock(b.lines, p.cx, p.cy, F, "var(--ink)", LINEH));
    });
    out.push("</svg>");
    return out.join("");
  }

  return { chain:chain, graph:graph, boxFor:boxFor, FONT:FONT };
})();

/* ---- the Cynefin board ------------------------------------------------- */
/* Original layout. The four ordered/unordered domains sit as quadrants with
   Confusion at the centre, matching the geometry the Learn map already uses,
   so the two tabs agree. Every item is drawn: the panel grows to fit rather
   than the canvas being fixed and the contents colliding. */

/* ---- transition arrows over a Cynefin board -----------------------------
   The board the user edits IS the diagram, so these arrows are drawn over the
   live HTML panels rather than over a picture of them. Everything here works
   from measured rectangles, which is what lets the same routing serve whatever
   panel sizes the browser hands back.

   One generic curve cannot serve every pair, so each transition takes one of
   three routes:
     same column  a straight run down the row gutter, each transition in its
                  own slot across the column with its label beside its arrow
     same row     a shallow bow to the outer side of the row, clear of the band
                  a diagonal turns in
     diagonal     a rounded L up the channel beside Confusion, then in along the
                  band above or below it, because a straight diagonal would pass
                  behind the Confusion panel
   Lane indices keep repeats between the same pair off each other.           */
CX.arrows = (function(){
  "use strict";
  var SERIF = 'Georgia, "Iowan Old Style", Palatino, serif';
  var LABF = '11px ' + SERIF, LAB = {family:SERIF, size:"11px"}, LABLH = 15;

  var LCOL = {complex:1, chaotic:1}, RCOL = {complicated:1, clear:1};
  var TROW = {complex:1, complicated:1}, BROW = {chaotic:1, clear:1};
  var DOMAINS = {clear:1, complicated:1, complex:1, chaotic:1, confusion:1};

  function isQuad(k){ return !!(TROW[k] || BROW[k]); }
  function sameCol(a,b){ return !!((LCOL[a]&&LCOL[b]) || (RCOL[a]&&RCOL[b])); }
  function sameRow(a,b){ return !!((TROW[a]&&TROW[b]) || (BROW[a]&&BROW[b])); }
  function isDiag(a,b){ return isQuad(a) && isQuad(b) && !sameCol(a,b) && !sameRow(a,b); }
  /* a diagonal always joins one left-column panel to one right-column panel */
  function ends(t){ var R = RCOL[t.f] ? t.f : t.to; return { R:R, L:(R === t.f ? t.to : t.f) }; }

  function labSlot(colW, n){ return colW / Math.max(1, n); }
  function labMaxW(colW, n){ return labSlot(colW, n) - (n > 1 ? 60 : 34); }

  /* What the transitions need from the layout, worked out before the browser
     lays it out: the caller sizes the row gutter and the panels from this, then
     hands back the rectangles it ended up with. */
  function plan(transitions, colW){
    var tl   = (transitions||[]).filter(function(t){ return t.f !== t.to && DOMAINS[t.f] && DOMAINS[t.to]; });
    var vert = tl.filter(function(t){ return sameCol(t.f, t.to); });
    var diag = tl.filter(function(t){ return isDiag(t.f, t.to); });
    var bows = tl.filter(function(t){ return !sameCol(t.f, t.to) && !isDiag(t.f, t.to); });

    var vLeft  = vert.filter(function(t){ return LCOL[t.f]; }).length;
    var p = {
      vert:vert, diag:diag, bows:bows, vLeft:vLeft,
      vLanes: Math.max(vLeft, vert.length - vLeft),
      dTop: diag.filter(function(t){ return TROW[ends(t).R]; }).length,
      bowTop: bows.some(function(t){ return TROW[t.f] && TROW[t.to]; }),
      bowBot: bows.some(function(t){ return BROW[t.f] && BROW[t.to]; })
    };
    p.dBot = diag.length - p.dTop;

    /* the gutter holds a real arrow, not a stub, and the tallest wrapped label */
    var lines = 1;
    vert.forEach(function(t){
      var n = LCOL[t.f] ? vLeft : vert.length - vLeft;
      lines = Math.max(lines, CX.wrap(t.l || "", LABF, labMaxW(colW, n)).length);
    });
    p.rowGap = p.vLanes ? Math.max(46, lines*LABLH + 34) : 16;

    /* A diagonal turns in the band between Confusion and the row it lands in, so
       that band has to exist. Confusion is centred on the gutter and can be
       taller than the rows beside it, so the caller grows those rows until it
       does. A same-row transition needs its own strip further out, or its label
       lands on the band and the two read as one. */
    p.rowMin = function(confH){
      function need(n, bow){ return n ? confH/2 - p.rowGap/2 + 28 + n*24 + (bow ? 44 : 0) : 0; }
      return { top: need(p.dTop, p.bowTop), bottom: need(p.dBot, p.bowBot) };
    };
    return p;
  }

  /* polyline with the corners rounded off, never past the midpoint of a leg */
  function rounded(pts, r){
    var d = 'M'+CX.r2(pts[0][0])+' '+CX.r2(pts[0][1]);
    for(var i=1;i<pts.length-1;i++){
      var a = pts[i-1], p = pts[i], b = pts[i+1];
      var d1 = Math.hypot(p[0]-a[0], p[1]-a[1]) || 1, d2 = Math.hypot(b[0]-p[0], b[1]-p[1]) || 1;
      var rr = Math.min(r, d1/2, d2/2);
      d += 'L'+CX.r2(p[0]-(p[0]-a[0])/d1*rr)+' '+CX.r2(p[1]-(p[1]-a[1])/d1*rr);
      d += 'Q'+CX.r2(p[0])+' '+CX.r2(p[1])+' '+
                CX.r2(p[0]+(b[0]-p[0])/d2*rr)+' '+CX.r2(p[1]+(b[1]-p[1])/d2*rr);
    }
    var e = pts[pts.length-1];
    return d + 'L'+CX.r2(e[0])+' '+CX.r2(e[1]);
  }

  /* draw(plan, rects, plate) -> markup for the arrow layer. rects are {x,y,w,h}
     per domain in the layer's own coordinates, plate is the colour a label uses
     to erase the line behind its words. Returns "" when the board is not in its
     two-by-two form, which is what a narrow screen gives: there is no channel to
     route through, and a wrong arrow is worse than no arrow. */
  function draw(p, rects, plate){
    var need = ["complex","complicated","chaotic","clear","confusion"], i;
    for(i=0;i<need.length;i++){ if(!rects[need[i]]) return ""; }
    var conf = rects.confusion;
    var twoByTwo = rects.complex.x < rects.complicated.x &&
                   rects.chaotic.x < rects.clear.x &&
                   rects.complex.y + rects.complex.h <= rects.chaotic.y + 1 &&
                   conf.x >= rects.complex.x + rects.complex.w &&
                   conf.x + conf.w <= rects.complicated.x;
    if(!twoByTwo) return "";

    var colW = rects.complex.w;
    var rowTopBottom = rects.complex.y + rects.complex.h;
    var rowBotTop    = rects.chaotic.y;
    var midY   = (rowTopBottom + rowBotTop) / 2;
    var sliver = (rects.complex.x + colW + conf.x) / 2;   // the channel left of Confusion
    var gapW   = conf.x - (rects.complex.x + colW);

    var lines = [], marks = [];
    function stroke(d){
      lines.push('<path d="'+d+'" fill="none" stroke="var(--ink-2)" stroke-width="1.3" '+
                 'opacity="0.75" marker-end="url(#cx-ah)"/>');
    }
    /* The arrows are drawn over the live panels, so a label plate that lands on
       one covers the items underneath. Every label has to sit in open board. */
    var panels = need.map(function(k){ return rects[k]; });
    function clears(x, y, w, h){
      return !panels.some(function(q){
        return x < q.x+q.w-2 && x+w > q.x+2 && y < q.y+q.h-2 && y+h > q.y+2;
      });
    }

    /* Labels wrap rather than being cut off. The plate is opaque and the colour
       the board sits on, so it erases the line under the words instead of
       letting it read as a strikethrough. align "end" puts x at the plate's
       right edge and "start" at its left, which is how a label is made to sit
       against its own arrow rather than floating between two of them. Pass
       `along` for a route that can slide its label: it is called with a
       position from 0 to 1 and returns a point, and the first point whose plate
       sits in open board wins. */
    function label(text, x, y, maxW, align, along){
      if(!text) return;
      var ls = CX.wrap(text, LABF, maxW);
      if(ls.length > 3){
        ls = ls.slice(0,3);
        while(ls[2].length > 1 && CX.textWidth(ls[2] + "…", LABF) > maxW) ls[2] = ls[2].slice(0,-1);
        ls[2] = ls[2].replace(/\s+$/,"") + "…";
      }
      var lw = ls.reduce(function(m,l){ return Math.max(m, CX.textWidth(l, LABF)); }, 0);
      var h  = ls.length*LABLH + 6, w = lw + 10;
      function at(px, py){
        var cx = align === "end" ? px - lw/2 - 5 : align === "start" ? px + lw/2 + 5 : px;
        return { cx:cx, x:cx - lw/2 - 5, y:py - h/2 };
      }
      var spot = at(x, y), i, cand, pt;
      if(!clears(spot.x, spot.y, w, h)){
        var tries = [];
        /* first slide along the route, which keeps the label on its own arrow */
        if(along){
          [.5,.44,.56,.38,.62,.32,.68,.26,.74,.2,.8].forEach(function(s){ tries.push(along(s)); });
        }
        /* then step off it. A bow between two panels that nearly touch has no
           point on itself in open board: the channel between them is narrower
           than the words. The nearest open strip is the gutter or the channel
           beside Confusion, and this finds whichever is closer. */
        [24,40,60,80,110].forEach(function(rad){
          [[0,-1],[0,1],[-1,0],[1,0],[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(d){
            tries.push([x + d[0]*rad, y + d[1]*rad]);
          });
        });
        for(i=0;i<tries.length;i++){
          pt = tries[i]; cand = at(pt[0], pt[1]);
          if(clears(cand.x, cand.y, w, h)){ spot = cand; break; }
        }
      }
      marks.push('<rect x="'+CX.r2(spot.x)+'" y="'+CX.r2(spot.y)+'" width="'+CX.r2(w)+'" '+
                 'height="'+CX.r2(h)+'" rx="3" fill="'+(plate || "var(--paper)")+'"/>');
      marks.push(CX.textBlock(ls, spot.cx, spot.y + h/2, LAB, "var(--ink-2)", LABLH));
    }

    /* same column: each transition in its own slot, arrow on the slot's inner
       edge and its label right beside it */
    var vLane = { l:0, r:0 };
    p.vert.forEach(function(t){
      var left = !!LCOL[t.f], side = left ? "l" : "r";
      var lane = vLane[side]++, n = left ? p.vLeft : p.vert.length - p.vLeft;
      var a = rects[t.f], slot = labSlot(colW, n);
      var down = rects[t.to].y > a.y;
      var x = left ? a.x + (lane+1)*slot - 14 : a.x + a.w - (lane+1)*slot + 14;
      var yTop = rowTopBottom + 5, yBot = rowBotTop - 5;
      stroke('M'+CX.r2(x)+' '+CX.r2(down ? yTop : yBot)+'L'+CX.r2(x)+' '+CX.r2(down ? yBot : yTop));
      label(t.l, left ? x - 9 : x + 9, midY, labMaxW(colW, n), left ? "end" : "start");
    });

    /* diagonal: out of the left panel, up or down the channel beside Confusion,
       then in along the band above or below it */
    var dLane = { top:0, bot:0 };
    p.diag.forEach(function(t, di){
      var e = ends(t), L = rects[e.L], R = rects[e.R], up = !!TROW[e.R];
      var lane = up ? dLane.top++ : dLane.bot++;
      /* lanes share the channel beside Confusion, so the spread has to fit in it */
      var step = Math.min(12, (gapW - 14) / Math.max(1, p.diag.length - 1));
      var sx = sliver + (di - (p.diag.length-1)/2) * step;
      var yH = up ? conf.y - 16 - lane*22 : conf.y + conf.h + 16 + lane*22;
      var yL = up ? L.y + 26 + lane*22 : L.y + L.h - 26 - lane*22;
      var pts = [[L.x + L.w, yL], [sx, yL], [sx, yH], [R.x, yH]];
      if(t.f === e.R) pts.reverse();
      stroke(rounded(pts, 10));
      label(t.l, (sx + R.x)/2, yH, R.x - sx - 30);
    });

    /* everything else (same row, and anything joining Confusion) bows across */
    function unit(a, b){
      var dx = (b.x+b.w/2)-(a.x+a.w/2), dy = (b.y+b.h/2)-(a.y+a.h/2);
      var len = Math.hypot(dx,dy) || 1;
      return [dx/len, dy/len];
    }
    function edge(r, sx, sy){
      var hw = r.w/2+8, hh = r.h/2+8;
      var t1 = sx ? hw/Math.abs(sx) : Infinity, t2 = sy ? hh/Math.abs(sy) : Infinity;
      var k = Math.min(t1,t2);
      return [r.x+r.w/2 + sx*k, r.y+r.h/2 + sy*k];
    }
    var bowLane = {};
    p.bows.forEach(function(t){
      var a = rects[t.f], b = rects[t.to];
      var u = unit(a, b);
      var p0 = edge(a, u[0], u[1]), p1 = edge(b, -u[0], -u[1]);
      /* The bow is measured in a canonical frame, from whichever endpoint sorts
         first, not from the arrow's own direction. Flipping the sign per lane in
         the arrow's frame cancels against the reversal, so a there-and-back pair
         came out as two identical curves with two labels on the same spot. */
      var key = [t.f, t.to].sort(), lane = (bowLane[key.join(">")] || 0);
      bowLane[key.join(">")] = lane + 1;
      var c = unit(rects[key[0]], rects[key[1]]);
      /* A same-row bow is held to the outer side of its row, away from Confusion
         and clear of the band a diagonal turns in. Bowing inward put its label on
         the same strip as the diagonal's, where the two read as one label. */
      var away = (TROW[t.f] && TROW[t.to]) ? -1 : (BROW[t.f] && BROW[t.to]) ? 1 : 0;
      var bow;
      if(away){
        var half = (away < 0 ? rects.complex.h : rects.chaotic.h) / 2;
        var off  = Math.min(Math.max(half - 30, 14), 46) * (1 + lane*0.55);
        bow = 2 * off * away * Math.sign(c[0] || 1);
      } else {
        bow = 26 * (1 + Math.floor(lane/2) * 0.9) * (lane % 2 ? -1 : 1);
      }
      var mx = (p0[0]+p1[0])/2, my = (p0[1]+p1[1])/2;
      var qx = mx - c[1]*bow, qy = my + c[0]*bow;
      stroke('M'+CX.r2(p0[0])+' '+CX.r2(p0[1])+'Q'+CX.r2(qx)+' '+CX.r2(qy)+' '+
             CX.r2(p1[0])+' '+CX.r2(p1[1]));
      /* a bow can slide its label along itself, which is how a short one between
         two close panels finds open board instead of sitting on a panel corner */
      function on(s){
        var m = 1-s;
        return [m*m*p0[0] + 2*m*s*qx + s*s*p1[0], m*m*p0[1] + 2*m*s*qy + s*s*p1[1]];
      }
      var mid = on(0.5);
      label(t.l, mid[0], mid[1], colW - 40, null, on);
    });

    /* labels after every line, so no later route paints over one already placed */
    return CX.defs() + lines.join("") + marks.join("");
  }

  return { plan:plan, draw:draw };
})();
