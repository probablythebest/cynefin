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

  /* a text block, already wrapped, centred in a box */
  function textBlock(lines, cx, cy, font, fill, lineH){
    var total = (lines.length-1)*lineH;
    return lines.map(function(l,i){
      return '<text x="'+r2(cx)+'" y="'+r2(cy - total/2 + i*lineH)+'" text-anchor="middle" '+
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
        var lw = CX.textWidth(e.label, FLAB);
        out.push('<rect x="'+CX.r2(lx-lw/2-4)+'" y="'+CX.r2(ly-9)+'" width="'+CX.r2(lw+8)+'" height="18" '+
                 'rx="3" fill="var(--paper)" opacity="0.92"/>');
        out.push(CX.textBlock([e.label], lx, ly, LAB, "var(--ink-2)", LINEH));
      }
    });

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
CX.board = function(opts){
  "use strict";
  var order  = opts.order;            // ["clear","complicated","complex","chaotic","confusion"]
  var names  = opts.names;            // { clear:"Clear", ... }
  var hues   = opts.hues;             // { clear:"var(--h-clear)", ... }
  var items  = opts.items;            // { clear:[str,...], ... }
  var trans  = opts.transitions||[];  // [{f,to,l}]
  var title  = opts.title||"";

  var SERIF = 'Georgia, "Iowan Old Style", Palatino, serif';
  var SANS  = '"Avenir Next Condensed","Roboto Condensed","Arial Narrow","Segoe UI",system-ui,sans-serif';
  var ITEMF = '12.5px ' + SERIF, HEADF = '600 11px ' + SANS, TITF = '15px ' + SERIF;
  var IT = {family:SERIF,size:"12.5px"}, HD = {family:SANS,size:"11px"}, TT = {family:SERIF,size:"15px"};

  var COLW = 300, MIDW = 210, GAP = 18, PAD = 16;
  var ITEMH = 24, ITEMGAP = 6, HEADH = 30, ROWPAD = 14;

  /* quadrant column heights are driven by their own contents */
  function stackH(list){ return list.length ? list.length*ITEMH + (list.length-1)*ITEMGAP : 18; }
  var topH = Math.max(stackH(items.complex||[]), stackH(items.complicated||[]));
  var botH = Math.max(stackH(items.chaotic||[]), stackH(items.clear||[]));
  var panelTop = HEADH + ROWPAD + topH + ROWPAD;
  var panelBot = HEADH + ROWPAD + botH + ROWPAD;
  var confH    = HEADH + ROWPAD + stackH(items.confusion||[]) + ROWPAD;

  var titleH = title ? 30 : 0;
  var W = PAD*2 + COLW*2 + MIDW + GAP*2;
  var H = PAD*2 + titleH + panelTop + GAP + panelBot;
  var midY = PAD + titleH + panelTop + GAP/2;

  var out = [CX.svgOpen(W,H), CX.defs()];
  if(title){
    out.push(CX.textBlock([title], W/2, PAD+15, TT, "var(--ink)", 18));
  }

  var col = { left: PAD, mid: PAD+COLW+GAP, right: PAD+COLW+GAP+MIDW+GAP };
  var rowY = { top: PAD+titleH, bottom: PAD+titleH+panelTop+GAP };

  var place = {
    complex:     {x:col.left,  y:rowY.top,    w:COLW, h:panelTop},
    complicated: {x:col.right, y:rowY.top,    w:COLW, h:panelTop},
    chaotic:     {x:col.left,  y:rowY.bottom, w:COLW, h:panelBot},
    clear:       {x:col.right, y:rowY.bottom, w:COLW, h:panelBot},
    confusion:   {x:col.mid,   y:midY-confH/2, w:MIDW, h:confH}
  };

  /* transitions first, so panels sit on top of the lines */
  trans.forEach(function(t){
    var a = place[t.f], b = place[t.to];
    if(!a || !b) return;
    var ax = a.x+a.w/2, ay = a.y+a.h/2, bx = b.x+b.w/2, by = b.y+b.h/2;
    var dx = bx-ax, dy = by-ay, len = Math.hypot(dx,dy)||1, ux=dx/len, uy=dy/len;
    function edge(p, sx, sy){
      var hw=p.w/2+8, hh=p.h/2+8;
      var t1 = sx ? hw/Math.abs(sx) : Infinity, t2 = sy ? hh/Math.abs(sy) : Infinity;
      var k = Math.min(t1,t2);
      return [p.x+p.w/2 + sx*k, p.y+p.h/2 + sy*k];
    }
    var p0 = edge(a,ux,uy), p1 = edge(b,-ux,-uy);
    var mx=(p0[0]+p1[0])/2, my=(p0[1]+p1[1])/2, bow=26;
    var qx = mx - uy*bow, qy = my + ux*bow;
    out.push('<path d="M'+CX.r2(p0[0])+' '+CX.r2(p0[1])+'Q'+CX.r2(qx)+' '+CX.r2(qy)+' '+
             CX.r2(p1[0])+' '+CX.r2(p1[1])+'" fill="none" stroke="var(--ink-2)" stroke-width="1.3" '+
             'opacity="0.75" marker-end="url(#cx-ah)"/>');
    if(t.l){
      var lx=(p0[0]+2*qx+p1[0])/4, ly=(p0[1]+2*qy+p1[1])/4;
      var lw=CX.textWidth(t.l, '11px '+SERIF);
      out.push('<rect x="'+CX.r2(lx-lw/2-5)+'" y="'+CX.r2(ly-9)+'" width="'+CX.r2(lw+10)+'" height="18" '+
               'rx="3" fill="var(--paper)" opacity="0.94"/>');
      out.push(CX.textBlock([t.l], lx, ly, {family:SERIF,size:"11px"}, "var(--ink-2)", 14));
    }
  });

  order.forEach(function(k){
    var p = place[k], hue = hues[k], list = items[k]||[];
    out.push('<path d="'+CX.roundRect(p.x,p.y,p.w,p.h,6)+'" fill="var(--sheet)" stroke="var(--rule)" stroke-width="1"/>');
    out.push('<path d="M'+CX.r2(p.x+6)+' '+CX.r2(p.y+1)+'h'+CX.r2(p.w-12)+'" stroke="'+hue+'" stroke-width="3"/>');
    out.push('<text x="'+CX.r2(p.x+14)+'" y="'+CX.r2(p.y+20)+'" font-family="'+SANS+'" font-size="11px" '+
             'font-weight="600" letter-spacing="1.6" fill="'+hue+'">'+CX.esc(names[k].toUpperCase())+'</text>');
    out.push('<text x="'+CX.r2(p.x+p.w-14)+'" y="'+CX.r2(p.y+20)+'" text-anchor="end" font-family="'+SANS+
             '" font-size="11px" fill="var(--muted)">'+list.length+'</text>');

    var y = p.y + HEADH + ROWPAD;
    list.forEach(function(txt){
      var maxW = p.w - 28 - 10;
      var line = txt, tw = CX.textWidth(line, ITEMF);
      if(tw > maxW){                       /* single line, ellipsised to fit exactly */
        while(line.length > 1 && CX.textWidth(line + "\u2026", ITEMF) > maxW) line = line.slice(0,-1);
        line = line.replace(/\s+$/,"") + "\u2026";
      }
      out.push('<path d="'+CX.roundRect(p.x+14, y, p.w-28, ITEMH-2, 3)+'" fill="var(--paper)" stroke="var(--rule)" stroke-width="1"/>');
      out.push('<path d="M'+CX.r2(p.x+14)+' '+CX.r2(y+2)+'v'+CX.r2(ITEMH-6)+'" stroke="'+hue+'" stroke-width="2.5"/>');
      out.push('<text x="'+CX.r2(p.x+24)+'" y="'+CX.r2(y+(ITEMH-2)/2)+'" dominant-baseline="central" '+
               'font-family="'+SERIF+'" font-size="12.5px" fill="var(--ink)">'+CX.esc(line)+'</text>');
      y += ITEMH + ITEMGAP;
    });
    if(!list.length){
      out.push('<text x="'+CX.r2(p.x+14)+'" y="'+CX.r2(p.y+HEADH+ROWPAD+10)+'" font-family="'+SERIF+
               '" font-size="12px" font-style="italic" fill="var(--muted)">nothing here</text>');
    }
  });

  out.push("</svg>");
  return out.join("");
};
