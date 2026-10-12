/* Quiltopia — draws the world: quilt Blocks, patches that shape themselves to their neighbors,
   Wonders and their lots, Stitchlings living their lives, night lights, and the little reactions
   that make the map feel like a toy. Far zoom levels draw cached pictures of each Block. */
(function (root) {
  'use strict';

  const R = root.QuiltRules;
  const ST = root.QuiltStitchlings;

  const PAL = {
    table: '#2b3851',
    tableLine: 'rgba(255, 255, 255, 0.035)',
    binding: '#c4614c',
    bindingStitch: 'rgba(255, 236, 214, 0.85)',
    fabrics: ['#e4ebd0', '#f3e6c4', '#d8e7ee', '#f0d9d2', '#e8e1f2', '#dcecd9', '#f6e3cf', '#d9e3f0'],
    seam: 'rgba(84, 62, 40, 0.32)',
    plotLine: 'rgba(104, 80, 56, 0.36)',
    plotFree: 'rgba(104, 80, 56, 0.18)',
    mine: '#2f5bd3',
    mineFill: 'rgba(47, 91, 211, 0.08)',
    outline: 'rgba(52, 36, 22, 0.42)',
    shadow: 'rgba(48, 32, 18, 0.20)',
    stitch: 'rgba(255, 255, 255, 0.82)',
    roofs: ['#d4634a', '#bd5440', '#e08455', '#ad614b', '#cf7466', '#9c5a46', '#dd9a52', '#5c8e8b', '#85617c'],
    seasonRoof: '#c4614c',
    garden: '#93c26d', gardenEdge: '#5f8f45', gardenRow: '#5f964a', flowers: ['#f2c14e', '#ec7aa0', '#ffffff', '#b98be6'],
    park: '#b3dc8f', parkEdge: '#79ad5f',
    tree: '#4f8d4b', treeHi: '#79b765', treeLo: '#33683a', blossom: '#f4a6c0',
    cherry: '#f3a7c2', cherryHi: '#ffd2e1', cherryLo: '#c9708f',
    water: '#63a9d6', waterHi: '#a7d6f0', waterLo: '#3e7fb0',
    path: '#ecd8ad', pathEdge: '#c3a476', pathStitch: 'rgba(150, 110, 62, 0.55)',
    plank: '#bf9161', plankLine: 'rgba(90, 60, 30, 0.5)', rail: '#7a5536',
    post: '#5b4636', light: '#ffd56b',
    wood: '#b98656', woodDark: '#7a5536',
    awnings: [['#e2574c', '#fff4e4'], ['#3e8fc6', '#f2f7ff'], ['#f2b84b', '#fff7e0'], ['#6aa84f', '#f3fbe9'], ['#9b6cc4', '#f7f0ff']],
    gold: '#e3b23c', door: '#6b4a33', wall: '#f6ebd4', glass: '#cfe3ee', lit: '#ffd36b', brick: '#a85a43',
    slot: { tree: '#3f7f3c', house: '#c4614c', garden: '#5f964a', water: '#3e8fc6', path: '#a8834f', lantern: '#d99a1e', park: '#5f9f45', market: '#c0573e' },
    sparks: ['#ffd56b', '#ff8fb1', '#9fe0ff', '#b9f59a', '#ffffff'],
    stickers: { heart: '#ec5f8a', wow: '#f2b84b', laugh: '#ffcf4a', clap: '#9b8cf0' },
  };
  const FONT = '"Shantell Sans", "Comic Sans MS", system-ui, sans-serif';

  // Zoom thresholds in CSS pixels per square.
  const LOD = { WORLD: 4, REGION: 10, STREET: 22 };
  const levelName = (z) => (z < LOD.WORLD ? 'World' : z < LOD.REGION ? 'Region' : z < LOD.STREET ? 'Block' : 'Street');
  const CACHE_RES = 16; // device pixels per square in the cached Block pictures

  function hash(x, y) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function roundRect(ctx, x, y, w, h, tl, tr, br, bl) {
    if (tr === undefined) { tr = tl; br = tl; bl = tl; }
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y);
    if (tr) ctx.arcTo(x + w, y, x + w, y + tr, tr); else ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h - br);
    if (br) ctx.arcTo(x + w, y + h, x + w - br, y + h, br); else ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + bl, y + h);
    if (bl) ctx.arcTo(x, y + h, x, y + h - bl, bl); else ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + tl);
    if (tl) ctx.arcTo(x, y, x + tl, y, tl); else ctx.lineTo(x, y);
    ctx.closePath();
  }

  // A square that merges with same-kind neighbors: flush toward them, inset and rounded elsewhere.
  // m holds neighbor bits: 1 north, 2 east, 4 south, 8 west.
  function cellShape(ctx, X, Y, W, H, m, inset, rad) {
    const iN = m & 1 ? 0 : inset, iE = m & 2 ? 0 : inset, iS = m & 4 ? 0 : inset, iW = m & 8 ? 0 : inset;
    const x = X + iW, y = Y + iN, w = W - iW - iE, h = H - iN - iS;
    const r = Math.max(0, Math.min(rad, w / 2, h / 2));
    roundRect(ctx, x, y, w, h, m & 9 ? 0 : r, m & 3 ? 0 : r, m & 6 ? 0 : r, m & 12 ? 0 : r);
  }

  // Running stitches just inside the open edges of a merged shape.
  function stitchEdges(ctx, X, Y, W, H, m, inset, rad, d) {
    const iN = m & 1 ? 0 : inset, iE = m & 2 ? 0 : inset, iS = m & 4 ? 0 : inset, iW = m & 8 ? 0 : inset;
    const x = X + iW, y = Y + iN, w = W - iW - iE, h = H - iN - iS;
    const r = Math.max(0, Math.min(rad, w / 2, h / 2));
    const tl = m & 9 ? 0 : r, tr = m & 3 ? 0 : r, br = m & 6 ? 0 : r, bl = m & 12 ? 0 : r;
    if (!(m & 1)) { ctx.moveTo(m & 8 ? X : x + Math.max(tl, d), y + d); ctx.lineTo(m & 2 ? X + W : x + w - Math.max(tr, d), y + d); }
    if (!(m & 2)) { ctx.moveTo(x + w - d, m & 1 ? Y : y + Math.max(tr, d)); ctx.lineTo(x + w - d, m & 4 ? Y + H : y + h - Math.max(br, d)); }
    if (!(m & 4)) { ctx.moveTo(m & 2 ? X + W : x + w - Math.max(br, d), y + h - d); ctx.lineTo(m & 8 ? X : x + Math.max(bl, d), y + h - d); }
    if (!(m & 8)) { ctx.moveTo(x + d, m & 4 ? Y + H : y + h - Math.max(bl, d)); ctx.lineTo(x + d, m & 1 ? Y : y + Math.max(tl, d)); }
    if (tl > d) { ctx.moveTo(x + d, y + tl); ctx.arc(x + tl, y + tl, tl - d, Math.PI, 1.5 * Math.PI); }
    if (tr > d) { ctx.moveTo(x + w - tr, y + d); ctx.arc(x + w - tr, y + tr, tr - d, 1.5 * Math.PI, 2 * Math.PI); }
    if (br > d) { ctx.moveTo(x + w - d, y + h - br); ctx.arc(x + w - br, y + h - br, br - d, 0, 0.5 * Math.PI); }
    if (bl > d) { ctx.moveTo(x + bl, y + h - d); ctx.arc(x + bl, y + h - bl, bl - d, 0.5 * Math.PI, Math.PI); }
  }

  // Little glyphs for empty Wonder slots and welcome-kit spots.
  function drawIcon(ctx, kind, cx, cy, s) {
    ctx.beginPath();
    if (kind === 'house') {
      ctx.moveTo(cx - s * 0.4, cy - s * 0.02); ctx.lineTo(cx, cy - s * 0.42); ctx.lineTo(cx + s * 0.4, cy - s * 0.02);
      ctx.moveTo(cx - s * 0.28, cy - s * 0.1); ctx.lineTo(cx - s * 0.28, cy + s * 0.36); ctx.lineTo(cx + s * 0.28, cy + s * 0.36); ctx.lineTo(cx + s * 0.28, cy - s * 0.1);
    } else if (kind === 'tree') {
      ctx.arc(cx, cy - s * 0.08, s * 0.3, 0, Math.PI * 2); ctx.moveTo(cx, cy + s * 0.22); ctx.lineTo(cx, cy + s * 0.42);
    } else if (kind === 'garden') {
      for (const dy of [-0.22, 0, 0.22]) { ctx.moveTo(cx - s * 0.36, cy + dy * s); ctx.lineTo(cx + s * 0.36, cy + dy * s); }
    } else if (kind === 'water') {
      for (const dy of [-0.14, 0.14]) {
        ctx.moveTo(cx - s * 0.38, cy + dy * s);
        ctx.quadraticCurveTo(cx - s * 0.19, cy + (dy - 0.16) * s, cx, cy + dy * s);
        ctx.quadraticCurveTo(cx + s * 0.19, cy + (dy + 0.16) * s, cx + s * 0.38, cy + dy * s);
      }
    } else if (kind === 'path') {
      for (const t of [-0.3, 0, 0.3]) { ctx.moveTo(cx + t * s + s * 0.08, cy + t * s * 0.6); ctx.arc(cx + t * s, cy + t * s * 0.6, s * 0.08, 0, Math.PI * 2); }
    } else if (kind === 'lantern') {
      roundRect(ctx, cx - s * 0.16, cy - s * 0.2, s * 0.32, s * 0.4, s * 0.06);
      ctx.moveTo(cx, cy - s * 0.2); ctx.lineTo(cx, cy - s * 0.38);
    } else if (kind === 'park') {
      ctx.moveTo(cx - s * 0.35, cy + s * 0.2); ctx.quadraticCurveTo(cx, cy - s * 0.35, cx + s * 0.35, cy + s * 0.2);
      ctx.moveTo(cx - s * 0.2, cy + s * 0.32); ctx.lineTo(cx + s * 0.2, cy + s * 0.32);
    } else if (kind === 'market') {
      ctx.moveTo(cx - s * 0.38, cy - s * 0.1); ctx.lineTo(cx - s * 0.3, cy - s * 0.36); ctx.lineTo(cx + s * 0.3, cy - s * 0.36); ctx.lineTo(cx + s * 0.38, cy - s * 0.1);
      ctx.moveTo(cx - s * 0.3, cy - s * 0.1); ctx.lineTo(cx - s * 0.3, cy + s * 0.34); ctx.moveTo(cx + s * 0.3, cy - s * 0.1); ctx.lineTo(cx + s * 0.3, cy + s * 0.34);
    } else {
      ctx.arc(cx, cy, s * 0.28, 0, Math.PI * 2);
    }
    ctx.stroke();
  }

  // ---------- Quilt fabrics ----------
  // A fabric's print as a 32-pixel tile that repeats: light and dark marks over the fabric's color.
  const fabricTiles = new Map();
  function fabricTile(pattern) {
    if (fabricTiles.has(pattern)) return fabricTiles.get(pattern);
    const T = 32, c = document.createElement('canvas');
    c.width = c.height = T;
    const p = c.getContext('2d');
    const light = 'rgba(255, 255, 255, 0.55)', dark = 'rgba(110, 76, 52, 0.10)';
    const dot = (x, y, r, color) => { p.fillStyle = color; p.beginPath(); p.arc(x, y, r, 0, Math.PI * 2); p.fill(); };
    if (pattern === 'gingham') {
      p.fillStyle = dark;
      p.fillRect(0, 0, T, T / 2);
      p.fillRect(0, 0, T / 2, T);
    } else if (pattern === 'polka') {
      dot(8, 8, 3, light); dot(24, 24, 3, light);
    } else if (pattern === 'stripes') {
      p.fillStyle = light;
      p.fillRect(0, 0, 6, T);
      p.fillRect(16, 0, 2, T);
    } else if (pattern === 'floral') {
      for (const [x, y, r] of [[9, 9, 2.6], [24, 23, 1.9]]) {
        for (let k = 0; k < 5; k++) dot(x + Math.cos(k * 1.2566) * r, y + Math.sin(k * 1.2566) * r, r * 0.62, light);
        dot(x, y, r * 0.5, 'rgba(240, 190, 90, 0.7)');
      }
    } else if (pattern === 'calico') {
      for (const [x, y, isLight] of [[5, 7, 1], [19, 4, 0], [27, 15, 1], [12, 20, 0], [22, 27, 1], [3, 26, 0]]) dot(x, y, 1.4, isLight ? light : dark);
    } else if (pattern === 'plaid') {
      // Wide soft bands crossed by fine light threads.
      p.fillStyle = 'rgba(110, 76, 52, 0.09)';
      p.fillRect(0, 0, T, 10); p.fillRect(0, 0, 10, T);
      p.fillStyle = 'rgba(255, 255, 255, 0.45)';
      p.fillRect(0, 20, T, 2); p.fillRect(20, 0, 2, T);
    } else if (pattern === 'twill') {
      // Denim: fine diagonal ribs.
      p.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      p.lineWidth = 1.2;
      p.beginPath();
      for (let i = -T; i < T * 2; i += 5) { p.moveTo(i, T); p.lineTo(i + T, 0); }
      p.stroke();
    } else if (pattern === 'hearts') {
      for (const [x, y, s] of [[9, 10, 3.2], [24, 24, 2.4]]) {
        p.fillStyle = 'rgba(255, 255, 255, 0.65)';
        p.beginPath();
        p.moveTo(x, y + s * 0.9);
        p.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.6, y - s * 1.4, x, y - s * 0.4);
        p.bezierCurveTo(x + s * 0.6, y - s * 1.4, x + s * 1.6, y - s * 0.2, x, y + s * 0.9);
        p.fill();
      }
    } else if (pattern === 'stars') {
      for (const [x, y, s] of [[9, 9, 3], [25, 22, 2.2]]) {
        p.fillStyle = 'rgba(255, 252, 230, 0.8)';
        p.beginPath();
        for (let k = 0; k < 10; k++) {
          const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? s * 0.42 : s;
          p.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        p.fill();
      }
      dot(20, 6, 0.8, 'rgba(255, 252, 230, 0.7)'); dot(5, 25, 0.7, 'rgba(255, 252, 230, 0.7)');
    } else if (pattern === 'gilded') {
      // The Club's fabrics: a lattice of gold thread with a tiny star where the threads cross.
      p.strokeStyle = 'rgba(206, 158, 52, 0.7)';
      p.lineWidth = 1.3;
      p.beginPath();
      p.moveTo(0, 0); p.lineTo(T, T);
      p.moveTo(T, 0); p.lineTo(0, T);
      p.stroke();
      p.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      p.lineWidth = 0.8;
      p.beginPath();
      p.moveTo(0, T / 2); p.lineTo(T / 2, 0); p.moveTo(T / 2, T); p.lineTo(T, T / 2);
      p.stroke();
      dot(T / 2, T / 2, 2, 'rgba(255, 228, 140, 0.95)');
      for (const [x, y] of [[0, 0], [T, 0], [0, T], [T, T]]) dot(x, y, 2, 'rgba(255, 228, 140, 0.95)');
    } else { // linen: a fine weave
      p.fillStyle = dark;
      for (let i = 0; i < T; i += 4) p.fillRect(i, 0, 1, T);
      p.fillStyle = 'rgba(255, 255, 255, 0.35)';
      for (let i = 2; i < T; i += 4) p.fillRect(0, i, T, 1);
    }
    fabricTiles.set(pattern, c);
    return c;
  }

  // A quilt square for the profile and the shop: the fabric, its print and a stitched seam.
  function fabricSwatch(canvas, fabricId) {
    const f = R.FABRICS[fabricId];
    if (!f) return;
    const g = canvas.getContext('2d'), S = canvas.width, rad = S * 0.16;
    g.clearRect(0, 0, S, S);
    g.beginPath(); roundRect(g, 1, 1, S - 2, S - 2, rad);
    g.fillStyle = f.color; g.fill();
    const pat = g.createPattern(fabricTile(f.pattern), 'repeat');
    if (pat.setTransform) pat.setTransform(new DOMMatrix().scale(S / 80));
    g.fillStyle = pat; g.fill();
    g.strokeStyle = 'rgba(110, 76, 52, 0.3)'; g.lineWidth = 1.2; g.stroke();
    g.setLineDash([S * 0.06, S * 0.045]);
    g.strokeStyle = 'rgba(110, 76, 52, 0.38)';
    g.beginPath(); roundRect(g, S * 0.1, S * 0.1, S * 0.8, S * 0.8, rad * 0.7); g.stroke();
    g.setLineDash([]);
  }

  // ---------- Stitchlings ----------
  // Draws one Stitchling: a round fabric body with its species' ears and extras, a stitched seam,
  // a face, and the owner's chosen outfit. o: { face, nap, outfit, level, t, phase, happy }

  function drawStitchling(g, speciesId, cx, cy, r, o) {
    o = o || {};
    const sp = ST.SPECIES[speciesId] || ST.SPECIES.buttonling;
    const ink = 'rgba(70, 48, 32, 0.65)';
    const lw = Math.max(1, r * 0.11);
    const detail = o.level === undefined ? 2 : o.level;
    g.lineWidth = lw;
    g.strokeStyle = ink;
    g.lineJoin = 'round';
    const fill = (c) => { g.fillStyle = c; g.fill(); g.stroke(); };

    if (sp.extra === 'glow' || sp.extra === 'lamp' || sp.extra === 'beacon') {
      const pulse = 0.75 + 0.25 * Math.sin((o.t || 0) * 4 + (o.phase || 0));
      const gl = g.createRadialGradient(cx, cy, 0, cx, cy, r * 2.4);
      gl.addColorStop(0, `rgba(255, 226, 120, ${0.55 * pulse})`);
      gl.addColorStop(1, 'rgba(255, 226, 120, 0)');
      g.fillStyle = gl;
      g.fillRect(cx - r * 2.4, cy - r * 2.4, r * 4.8, r * 4.8);
    }
    if (sp.extra === 'mothwings' || sp.extra === 'wings') {
      const flap = Math.sin((o.t || 0) * 14 + (o.phase || 0)) * 0.25;
      const big = sp.extra === 'mothwings' ? 1.25 : 0.8;
      g.beginPath();
      g.ellipse(cx - r * 0.9, cy - r * 0.2, r * 0.7 * big, r * 0.45 * big, -0.5 + flap, 0, Math.PI * 2);
      fill(sp.extra === 'mothwings' ? '#fffbe6' : '#a77a52');
      g.beginPath();
      g.ellipse(cx + r * 0.9, cy - r * 0.2, r * 0.7 * big, r * 0.45 * big, 0.5 - flap, 0, Math.PI * 2);
      fill(sp.extra === 'mothwings' ? '#fffbe6' : '#a77a52');
    }
    if (sp.ears === 'petals') {
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        g.beginPath();
        g.ellipse(cx + Math.cos(a) * r * 0.95, cy - r * 0.05 + Math.sin(a) * r * 0.95, r * 0.45, r * 0.32, a, 0, Math.PI * 2);
        fill('#ffd1df');
      }
    }
    // Ears behind the head.
    const ear = (dx, dy, rx, ry, rot, color) => { g.beginPath(); g.ellipse(cx + dx * r, cy + dy * r, rx * r, ry * r, rot, 0, Math.PI * 2); fill(color || sp.body); };
    if (sp.ears === 'round') { ear(-0.62, -0.72, 0.3, 0.3, 0); ear(0.62, -0.72, 0.3, 0.3, 0); }
    if (sp.ears === 'mouse') { ear(-0.7, -0.75, 0.42, 0.42, 0, '#e8c4c9'); ear(0.7, -0.75, 0.42, 0.42, 0, '#e8c4c9'); }
    if (sp.ears === 'bunny') { ear(-0.35, -1.05, 0.2, 0.5, -0.2); ear(0.35, -1.05, 0.2, 0.5, 0.2); }
    if (sp.ears === 'floppy') { ear(-0.92, -0.15, 0.22, 0.5, 0.4); ear(0.92, -0.15, 0.22, 0.5, -0.4); }
    if (sp.ears === 'pointy') {
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(cx + s * r * 0.75, cy - r * 0.4); g.lineTo(cx + s * r * 0.55, cy - r * 1.15); g.lineTo(cx + s * r * 0.15, cy - r * 0.8); g.closePath();
        fill(sp.body);
      }
    }

    // Body: a droplet for water folk, round for everyone else.
    g.beginPath();
    if (sp.ears === 'drop') {
      g.moveTo(cx, cy - r * 1.35);
      g.bezierCurveTo(cx + r * 0.5, cy - r * 0.7, cx + r * 1.05, cy - r * 0.1, cx + r * 0.95, cy + r * 0.3);
      g.arc(cx, cy + r * 0.15, r * 0.97, 0.2, Math.PI - 0.2);
      g.bezierCurveTo(cx - r * 1.05, cy - r * 0.1, cx - r * 0.5, cy - r * 0.7, cx, cy - r * 1.35);
    } else {
      g.arc(cx, cy, r, 0, Math.PI * 2);
    }
    fill(o.outfit === 'raincoat' ? '#ffd84a' : sp.body);
    if (o.outfit === 'raincoat') {
      g.beginPath(); g.arc(cx, cy - r * 0.05, r * 0.62, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    }
    if (sp.extra === 'moss') {
      g.fillStyle = '#4f8d4b';
      for (const [a, s] of [[-0.6, 0.22], [0.5, 0.2], [2.4, 0.18]]) { g.beginPath(); g.arc(cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6, r * s, 0, Math.PI * 2); g.fill(); }
    }
    if (sp.extra === 'apron') { g.beginPath(); roundRect(g, cx - r * 0.45, cy + r * 0.15, r * 0.9, r * 0.65, r * 0.15); fill('#ffffff'); }
    if (detail === 2) {
      // The stitched seam down the middle.
      g.save();
      g.setLineDash([r * 0.22, r * 0.18]);
      g.strokeStyle = 'rgba(70, 48, 32, 0.45)';
      g.beginPath(); g.arc(cx, cy, r * 0.72, Math.PI * 0.18, Math.PI * 0.82); g.stroke();
      g.restore();
    }

    // Hats and toppers.
    if (sp.ears === 'antenna') {
      g.beginPath();
      g.moveTo(cx - r * 0.3, cy - r * 0.85); g.quadraticCurveTo(cx - r * 0.5, cy - r * 1.35, cx - r * 0.6, cy - r * 1.45);
      g.moveTo(cx + r * 0.3, cy - r * 0.85); g.quadraticCurveTo(cx + r * 0.5, cy - r * 1.35, cx + r * 0.6, cy - r * 1.45);
      g.stroke();
      g.fillStyle = sp.extra === 'glow' || sp.extra === 'beacon' ? '#ffd56b' : ink;
      g.beginPath(); g.arc(cx - r * 0.6, cy - r * 1.45, r * 0.13, 0, Math.PI * 2); g.arc(cx + r * 0.6, cy - r * 1.45, r * 0.13, 0, Math.PI * 2); g.fill();
    }
    if (sp.ears === 'sprout' || sp.ears === 'leaf') {
      const big = sp.ears === 'leaf' ? 1.6 : 1;
      g.beginPath();
      g.moveTo(cx, cy - r * 0.9);
      g.quadraticCurveTo(cx + r * 0.6 * big, cy - r * 1.5 * big, cx + r * 0.7 * big, cy - r * 0.95);
      g.quadraticCurveTo(cx + r * 0.3, cy - r * 0.85, cx, cy - r * 0.9);
      fill('#5aa04a');
    }
    if (sp.extra === 'cap' || o.outfit === 'tophat') {
      if (o.outfit === 'tophat') {
        g.beginPath(); roundRect(g, cx - r * 0.38, cy - r * 1.55, r * 0.76, r * 0.7, r * 0.06); fill('#2d2a33');
        g.beginPath(); g.ellipse(cx, cy - r * 0.86, r * 0.62, r * 0.14, 0, 0, Math.PI * 2); fill('#2d2a33');
      } else {
        g.beginPath(); g.arc(cx, cy - r * 0.62, r * 0.62, Math.PI, 0); fill('#3e7fb0');
        g.beginPath(); g.ellipse(cx + r * 0.45 * (o.face || 1), cy - r * 0.62, r * 0.4, r * 0.12, 0, 0, Math.PI * 2); fill('#3e7fb0');
      }
    }
    if (sp.extra === 'teacup') {
      g.beginPath(); roundRect(g, cx - r * 0.4, cy - r * 1.45, r * 0.8, r * 0.55, r * 0.2); fill('#f6f1e8');
      g.beginPath(); g.arc(cx + r * 0.48, cy - r * 1.18, r * 0.16, -1.2, 1.2); g.stroke();
    }
    if (sp.extra === 'beacon') { g.beginPath(); g.arc(cx, cy - r * 0.95, r * 0.28, Math.PI, 0); fill('#ff6b5c'); }
    if (sp.extra === 'bandana') {
      g.beginPath(); g.arc(cx, cy, r * 0.98, Math.PI * 1.15, Math.PI * 1.85); g.lineTo(cx, cy - r * 0.35); g.closePath(); fill('#e2574c');
    }
    if (o.outfit === 'crown') {
      for (let k = -2; k <= 2; k++) {
        g.fillStyle = ['#ff8fb1', '#ffd56b', '#ffffff', '#b98be6', '#ff8fb1'][k + 2];
        g.beginPath(); g.arc(cx + k * r * 0.3, cy - r * 0.92 + Math.abs(k) * r * 0.08, r * 0.17, 0, Math.PI * 2); g.fill();
      }
    }

    // Face.
    const eyeY = cy - r * 0.08, ex = r * 0.33, look = (o.face || 1) * r * 0.08;
    g.fillStyle = '#3a2a20';
    g.strokeStyle = '#3a2a20';
    if (o.nap) {
      g.lineWidth = Math.max(1, r * 0.12);
      g.beginPath();
      g.moveTo(cx - ex - r * 0.13, eyeY); g.quadraticCurveTo(cx - ex, eyeY + r * 0.1, cx - ex + r * 0.13, eyeY);
      g.moveTo(cx + ex - r * 0.13, eyeY); g.quadraticCurveTo(cx + ex, eyeY + r * 0.1, cx + ex + r * 0.13, eyeY);
      g.stroke();
    } else {
      g.beginPath();
      g.arc(cx - ex + look, eyeY, Math.max(1, r * 0.13), 0, Math.PI * 2);
      g.arc(cx + ex + look, eyeY, Math.max(1, r * 0.13), 0, Math.PI * 2);
      g.fill();
    }
    if (sp.ears === 'beak') {
      g.beginPath(); g.moveTo(cx + look * 2, cy + r * 0.08); g.lineTo(cx + look * 2 + (o.face || 1) * r * 0.4, cy + r * 0.2); g.lineTo(cx + look * 2, cy + r * 0.32); g.closePath();
      g.fillStyle = '#f29a3c'; g.fill();
    } else if (detail === 2) {
      g.lineWidth = Math.max(1, r * 0.09);
      g.beginPath(); g.arc(cx + look, cy + r * 0.18, r * (o.happy ? 0.2 : 0.12), 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
      g.fillStyle = 'rgba(255, 120, 140, 0.35)';
      g.beginPath(); g.arc(cx - r * 0.55, cy + r * 0.14, r * 0.14, 0, Math.PI * 2); g.arc(cx + r * 0.55, cy + r * 0.14, r * 0.14, 0, Math.PI * 2); g.fill();
    }
    if (sp.extra === 'lamp') {
      const lx = cx + (o.face || 1) * r * 1.05, ly = cy + r * 0.25;
      g.fillStyle = '#5b4636'; g.fillRect(lx - r * 0.18, ly - r * 0.24, r * 0.36, r * 0.48);
      g.fillStyle = '#ffd56b'; g.fillRect(lx - r * 0.1, ly - r * 0.14, r * 0.2, r * 0.28);
    }
    if (o.outfit === 'scarf') {
      g.lineWidth = r * 0.22;
      g.strokeStyle = '#e2574c';
      g.beginPath(); g.arc(cx, cy, r * 0.82, Math.PI * 0.3, Math.PI * 0.7); g.stroke();
      g.strokeStyle = '#fff4e4'; g.lineWidth = r * 0.07;
      g.beginPath(); g.arc(cx, cy, r * 0.82, Math.PI * 0.42, Math.PI * 0.5); g.stroke();
    }
    if (o.outfit === 'bowtie') {
      g.fillStyle = '#3e8fc6';
      g.beginPath();
      g.moveTo(cx, cy + r * 0.62); g.lineTo(cx - r * 0.32, cy + r * 0.45); g.lineTo(cx - r * 0.32, cy + r * 0.8); g.closePath();
      g.moveTo(cx, cy + r * 0.62); g.lineTo(cx + r * 0.32, cy + r * 0.45); g.lineTo(cx + r * 0.32, cy + r * 0.8); g.closePath();
      g.fill();
    }
  }

  // A Stitchling portrait for the Stitchbook and cards.
  function portrait(canvas, speciesId, opts) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const size = canvas.clientWidth || canvas.width;
    canvas.width = canvas.height = Math.round(size * dpr);
    const g = canvas.getContext('2d');
    g.clearRect(0, 0, canvas.width, canvas.height);
    if (opts && opts.unknown) {
      g.globalAlpha = 0.22;
      g.filter = 'grayscale(1) brightness(0.3)';
    }
    drawStitchling(g, speciesId, canvas.width / 2, canvas.height * 0.56, canvas.width * 0.26, Object.assign({ level: 2, t: performance.now() / 1000 }, opts));
    g.filter = 'none';
    g.globalAlpha = 1;
  }

  // ---------- Sticker art (also used by the UI) ----------

  function drawSticker(g, kind, cx, cy, s) {
    g.save();
    g.translate(cx, cy);
    g.lineWidth = Math.max(1, s * 0.08);
    g.strokeStyle = '#ffffff';
    g.fillStyle = PAL.stickers[kind] || '#ec5f8a';
    g.beginPath();
    if (kind === 'heart') {
      g.moveTo(0, s * 0.42);
      g.bezierCurveTo(-s * 0.75, -s * 0.05, -s * 0.38, -s * 0.62, 0, -s * 0.22);
      g.bezierCurveTo(s * 0.38, -s * 0.62, s * 0.75, -s * 0.05, 0, s * 0.42);
      g.fill(); g.stroke();
    } else if (kind === 'wow') {
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2, rr = k % 2 ? s * 0.32 : s * 0.5;
        if (k) g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else g.moveTo(rr, 0);
      }
      g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#5b3a12';
      g.fillRect(-s * 0.05, -s * 0.22, s * 0.1, s * 0.26);
      g.beginPath(); g.arc(0, s * 0.16, s * 0.06, 0, Math.PI * 2); g.fill();
    } else if (kind === 'laugh') {
      g.arc(0, 0, s * 0.45, 0, Math.PI * 2); g.fill(); g.stroke();
      g.strokeStyle = '#5b3a12'; g.lineWidth = Math.max(1, s * 0.07);
      g.beginPath(); g.arc(-s * 0.15, -s * 0.1, s * 0.07, Math.PI, 0); g.arc(s * 0.15, -s * 0.1, s * 0.07, Math.PI, 0); g.stroke();
      g.beginPath(); g.arc(0, s * 0.05, s * 0.2, 0.1 * Math.PI, 0.9 * Math.PI); g.closePath(); g.fillStyle = '#5b3a12'; g.fill();
    } else {
      g.arc(0, 0, s * 0.45, 0, Math.PI * 2); g.fill(); g.stroke();
      g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(1, s * 0.07);
      g.beginPath();
      for (const a of [-2.4, -1.6, -0.8]) { g.moveTo(Math.cos(a) * s * 0.18, Math.sin(a) * s * 0.18); g.lineTo(Math.cos(a) * s * 0.34, Math.sin(a) * s * 0.34); }
      g.stroke();
      g.fillStyle = '#ffffff';
      g.beginPath(); g.ellipse(-s * 0.08, s * 0.1, s * 0.12, s * 0.2, -0.4, 0, Math.PI * 2); g.ellipse(s * 0.1, s * 0.12, s * 0.12, s * 0.2, 0.4, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }

  // ---------- The renderer ----------

  function create(canvas) {
    const ctx = canvas.getContext('2d');
    const st = {
      dpr: 1,
      caches: new Map(),
      weave: null,
      cacheWeave: null,
      tablePattern: null,
      styles: null,
      fabricPats: new WeakMap(), // per canvas context: { pattern name: CanvasPattern }
      // Stitchlings
      homes: [], sites: [], homeIndex: new Map(), popVersion: -1, popNight: null, popAt: -10,
      knownHomes: new Set(), newHomes: new Set(), populated: false, agents: new Map(),
      // effects
      sparks: [], shows: [], effects: [], petals: [],
      lastView: null,
    };

    function makePattern(target, color, size) {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const g = c.getContext('2d');
      g.strokeStyle = color;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(0, size); g.lineTo(size, 0);
      g.moveTo(-size / 2, size / 2); g.lineTo(size / 2, -size / 2);
      g.moveTo(size / 2, size * 1.5); g.lineTo(size * 1.5, size / 2);
      g.stroke();
      return target.createPattern(c, 'repeat');
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      st.dpr = dpr;
    }

    // ---------- Drawing one view (main canvas, magnifier or a cached Block) ----------
    // v: { scene, left, top, z (device px per square), w, h, level 0-2, t, cache }

    function cellBox(v, x, y) {
      const X = Math.round((x - v.left) * v.z), Y = Math.round((y - v.top) * v.z);
      return [X, Y, Math.round((x + 1 - v.left) * v.z) - X, Math.round((y + 1 - v.top) * v.z) - Y];
    }

    function viewRange(v, pad) {
      const world = v.scene.world;
      return [
        Math.max(0, Math.floor(v.left) - pad), Math.max(0, Math.floor(v.top) - pad),
        Math.min(world.W - 1, Math.ceil(v.left + v.w / v.z) + pad), Math.min(world.H - 1, Math.ceil(v.top + v.h / v.z) + pad),
      ];
    }

    function drawView(g, v) {
      const range = viewRange(v, 1);
      drawGround(g, v, range);
      drawPlots(g, v, range);
      drawLotsAndWonders(g, v, range);
      if (!v.cache) {
        if (v.scene.kit) drawKit(g, v);
        if (v.scene.validAt) drawGlowSpots(g, v, range);
      }
      drawPatches(g, v, range);
    }

    function drawGround(g, v, [x0, y0, x1, y1]) {
      const { z } = v;
      for (const b of v.scene.world.blocks) {
        const bx = b.gx * R.BLOCK, by = b.gy * R.BLOCK;
        if (bx > x1 || by > y1 || bx + R.BLOCK < x0 || by + R.BLOCK < y0) continue;
        const X = (bx - v.left) * z, Y = (by - v.top) * z, S = R.BLOCK * z;
        g.fillStyle = PAL.fabrics[b.id % PAL.fabrics.length];
        g.fillRect(X, Y, S, S);
        const weave = v.cache ? st.cacheWeave : st.weave;
        if (weave && z >= 3) {
          if (weave.setTransform) weave.setTransform(new DOMMatrix().translate(((-v.left * z) % 8 + 8) % 8, ((-v.top * z) % 8 + 8) % 8));
          g.fillStyle = weave;
          g.fillRect(X, Y, S, S);
        }
      }
    }

    // A fabric's print, as a repeating pattern for this canvas.
    function fabricPattern(g, pattern) {
      let pats = st.fabricPats.get(g);
      if (!pats) { pats = new Map(); st.fabricPats.set(g, pats); }
      if (!pats.has(pattern)) pats.set(pattern, g.createPattern(fabricTile(pattern), 'repeat'));
      return pats.get(pattern);
    }

    // Every home is a quilt square in its builder's fabric; free plots wait as dashed outlines.
    function drawPlots(g, v, [x0, y0, x1, y1]) {
      const { scene, z } = v;
      const world = scene.world;
      for (const b of world.blocks) {
        if (b.kind !== 'neighborhood') continue;
        for (let i = 0; i < R.PLOTS_PER_SIDE * R.PLOTS_PER_SIDE; i++) {
          const r = R.plotRect(b, i);
          if (r.x > x1 || r.y > y1 || r.x + r.w < x0 || r.y + r.h < y0) continue;
          const owner = world.plotOwners.get(b.id * 100 + i);
          const mine = owner && owner === scene.myId;
          const edge = !(mine && v.cache); // your home's outline is drawn live, so it stays crisp
          if (!owner && v.level < 1) continue;
          const pad = z * 0.12, X = (r.x - v.left) * z + pad, Y = (r.y - v.top) * z + pad, W = r.w * z - pad * 2, H = r.h * z - pad * 2;
          const square = () => { g.beginPath(); roundRect(g, X, Y, W, H, z * 0.6); };
          square();
          if (!owner) {
            g.setLineDash([z * 0.35, z * 0.25]);
            g.lineWidth = Math.max(1, z * 0.05);
            g.strokeStyle = PAL.plotFree;
            g.stroke();
            g.setLineDash([]);
            continue;
          }
          const f = scene.fabricOf ? scene.fabricOf(owner) : R.FABRICS[R.fabricOf({ id: owner })];
          g.fillStyle = f.color;
          g.fill();
          if (v.level >= 1) {
            // The print, pinned to the world so it doesn't swim as you pan, and a stitched seam.
            const pat = fabricPattern(g, f.pattern);
            if (pat.setTransform) pat.setTransform(new DOMMatrix().translate(-v.left * z, -v.top * z).scale(z / 40));
            g.fillStyle = pat;
            g.fill();
            g.setLineDash([z * 0.3, z * 0.22]);
            g.lineWidth = Math.max(1, z * 0.05);
            g.strokeStyle = 'rgba(110, 76, 52, 0.32)';
            g.beginPath();
            roundRect(g, X + z * 0.22, Y + z * 0.22, W - z * 0.44, H - z * 0.44, z * 0.42);
            g.stroke();
            g.setLineDash([]);
            square();
          }
          if (!edge) continue;
          g.lineWidth = mine ? Math.max(2, z * 0.09) : Math.max(1, z * 0.04);
          g.strokeStyle = mine ? PAL.mine : 'rgba(110, 76, 52, 0.3)';
          g.stroke();
        }
      }
    }

    // Commons lots: empty ones wait as dashed outlines, founding Wonders show as pencil sketches,
    // and Wonders being built show their glowing empty slots.
    function drawLotsAndWonders(g, v, [x0, y0, x1, y1]) {
      const { scene, z } = v;
      const world = scene.world;
      const pulse = v.cache ? 0.5 : 0.5 + 0.5 * Math.sin(v.t * 3);
      for (const b of world.blocks) {
        if (b.kind !== 'commons') continue;
        for (let lot = 0; lot < R.LOTS.length; lot++) {
          const r = R.lotRect(b, lot);
          if (r.x > x1 || r.y > y1 || r.x + r.w < x0 || r.y + r.h < y0) continue;
          const won = R.wonderInLot(world, b.id, lot);
          if (!won) {
            if (v.level < 1) continue;
            g.setLineDash([z * 0.5, z * 0.4]);
            g.strokeStyle = 'rgba(104, 80, 56, 0.28)';
            g.lineWidth = Math.max(1, z * 0.06);
            g.beginPath();
            roundRect(g, (r.x - v.left) * z + z * 0.3, (r.y - v.top) * z + z * 0.3, r.w * z - z * 0.6, r.h * z - z * 0.6, z * 1.2);
            g.stroke();
            g.setLineDash([]);
            continue;
          }
          const bp = R.BLUEPRINTS[won.blueprint];
          const bw = bp.rows[0].length, bh = bp.rows.length;
          if (won.status === 'founding') {
            // A pencil sketch of the blueprint while it gathers founders.
            g.strokeStyle = 'rgba(80, 70, 60, 0.35)';
            g.lineWidth = Math.max(1, z * 0.04);
            g.setLineDash([z * 0.15, z * 0.12]);
            g.beginPath();
            for (const s of R.slotsOf(won.blueprint)) {
              const [X, Y, W] = cellBox(v, won.x + s.dx, won.y + s.dy);
              g.rect(X + W * 0.15, Y + W * 0.15, W * 0.7, W * 0.7);
            }
            g.stroke();
            g.setLineDash([]);
            continue;
          }
          g.setLineDash(won.completedAt ? [] : [z * 0.4, z * 0.3]);
          g.strokeStyle = PAL.gold;
          g.lineWidth = Math.max(1.5, z * (won.completedAt ? 0.14 : 0.08));
          g.beginPath();
          roundRect(g, (won.x - v.left) * z - z * 0.35, (won.y - v.top) * z - z * 0.35, bw * z + z * 0.7, bh * z + z * 0.7, z * 1.4);
          g.stroke();
          g.setLineDash([]);
          for (const s of R.slotsOf(won.blueprint)) {
            const x = won.x + s.dx, y = won.y + s.dy;
            if (x < x0 || x > x1 || y < y0 || y > y1 || scene.kindAt(x, y)) continue;
            const [X, Y, W, H] = cellBox(v, x, y);
            const c = PAL.slot[s.kind];
            if (v.level === 0) {
              g.globalAlpha = 0.5;
              g.fillStyle = c;
              g.fillRect(X + W * 0.28, Y + H * 0.28, W * 0.44, H * 0.44);
            } else {
              g.globalAlpha = 0.14 + 0.12 * pulse;
              g.fillStyle = c;
              g.beginPath();
              roundRect(g, X + W * 0.1, Y + H * 0.1, W * 0.8, H * 0.8, W * 0.2);
              g.fill();
              g.globalAlpha = 0.5 + 0.35 * pulse;
              g.setLineDash([W * 0.14, W * 0.1]);
              g.strokeStyle = c;
              g.lineWidth = Math.max(1, W * 0.05);
              g.stroke();
              g.setLineDash([]);
              if (v.level === 2) {
                g.globalAlpha = 0.6;
                g.lineWidth = Math.max(1, W * 0.06);
                drawIcon(g, s.kind, X + W / 2, Y + H / 2, W * 0.55);
              }
            }
            g.globalAlpha = 1;
          }
        }
      }
    }

    // The welcome kit: glowing spots in your home showing where your first patches go.
    function drawKit(g, v) {
      const { scene, z } = v;
      for (const k of scene.kit) {
        if (scene.kindAt(k.x, k.y)) continue;
        const [X, Y, W, H] = cellBox(v, k.x, k.y);
        const p = 0.5 + 0.5 * Math.sin(v.t * (k.next ? 5 : 3));
        g.fillStyle = `rgba(47, 91, 211, ${k.next ? 0.2 + 0.2 * p : 0.1 + 0.08 * p})`;
        g.beginPath();
        const grow = k.next ? W * 0.06 * p : 0;
        roundRect(g, X + W * 0.08 - grow, Y + H * 0.08 - grow, W * 0.84 + grow * 2, H * 0.84 + grow * 2, W * 0.22);
        g.fill();
        g.setLineDash([W * 0.14, W * 0.1]);
        g.lineDashOffset = -v.t * W * 0.4;
        g.strokeStyle = k.next ? PAL.mine : 'rgba(47, 91, 211, 0.55)';
        g.lineWidth = Math.max(1.5, z * 0.07);
        g.stroke();
        g.setLineDash([]);
        g.lineDashOffset = 0;
        if (v.level >= 1) {
          g.strokeStyle = PAL.mine;
          g.globalAlpha = k.next ? 0.95 : 0.55;
          g.lineWidth = Math.max(1.2, W * 0.07);
          drawIcon(g, k.kind, X + W / 2, Y + H / 2, W * 0.6);
          g.globalAlpha = 1;
        }
        if (k.next && v.level >= 1) {
          // A tapping finger, bouncing.
          const bounce = Math.abs(Math.sin(v.t * 4)) * W * 0.25;
          const fx = X + W * 0.72, fy = Y + H * 0.78 + bounce;
          g.fillStyle = '#ffffff';
          g.strokeStyle = '#1d2639';
          g.lineWidth = Math.max(1.5, W * 0.05);
          g.beginPath();
          roundRect(g, fx - W * 0.09, fy - W * 0.05, W * 0.18, W * 0.42, W * 0.09);
          g.fill(); g.stroke();
          g.beginPath();
          roundRect(g, fx - W * 0.16, fy + W * 0.18, W * 0.4, W * 0.36, W * 0.12);
          g.fill(); g.stroke();
        }
      }
    }

    function drawGlowSpots(g, v, [x0, y0, x1, y1]) {
      const { scene } = v;
      const a = 0.5 + 0.5 * Math.sin(v.t * 4);
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          if (scene.kindAt(x, y)) continue;
          const good = scene.validAt(x, y);
          if (!good) continue;
          const [X, Y, W, H] = cellBox(v, x, y);
          if (good === 1) {
            // Allowed but not a best spot: just a small dot, so the best spots stand out.
            g.fillStyle = `rgba(255, 206, 84, ${0.45 + 0.2 * a})`;
            g.beginPath();
            g.arc(X + W / 2, Y + H / 2, Math.max(1.5, W * 0.09), 0, Math.PI * 2);
            g.fill();
            continue;
          }
          g.fillStyle = `rgba(255, 206, 84, ${0.42 + 0.18 * a})`;
          g.beginPath();
          roundRect(g, X + W * 0.1, Y + H * 0.1, W * 0.8, H * 0.8, W * 0.2);
          g.fill();
          if (v.level === 2) {
            g.setLineDash([W * 0.12, W * 0.09]);
            g.strokeStyle = 'rgba(255, 255, 255, 0.85)';
            g.lineWidth = Math.max(1, W * 0.05);
            g.stroke();
            g.setLineDash([]);
          }
        }
      }
    }

    // ---------- Patches ----------

    function drawPatches(g, v, [x0, y0, x1, y1]) {
      const { scene, z, level } = v;
      const kindAt = scene.kindAt;
      const lists = {};
      for (const k of R.KINDS) lists[k] = [];
      lists.bridge = [];
      const isWater = (x, y) => kindAt(x, y) === 'water';
      const isBridge = (x, y) => kindAt(x, y) === 'path' && ((isWater(x - 1, y) && isWater(x + 1, y)) || (isWater(x, y - 1) && isWater(x, y + 1)));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const k = kindAt(x, y);
          if (!k) continue;
          if (k === 'path' && isBridge(x, y)) lists.bridge.push(x, y);
          else lists[k].push(x, y);
        }
      }
      const maskOf = (x, y, test) => (test(x, y - 1) ? 1 : 0) | (test(x + 1, y) ? 2 : 0) | (test(x, y + 1) ? 4 : 0) | (test(x - 1, y) ? 8 : 0);
      const sameKind = (k) => (x, y) => kindAt(x, y) === k;
      const waterish = (x, y) => isWater(x, y) || isBridge(x, y);
      const ow = Math.max(1, z * 0.05);

      // Merged shapes for one kind, in two passes: a darker outline grown a little, then the fill.
      const mergedPass = (list, test, inset, rad, outline, fill) => {
        g.beginPath();
        for (let i = 0; i < list.length; i += 2) {
          const [X, Y, W, H] = cellBox(v, list[i], list[i + 1]);
          cellShape(g, X, Y, W, H, maskOf(list[i], list[i + 1], test), inset - ow, rad + ow);
        }
        g.fillStyle = outline;
        g.fill();
        g.beginPath();
        for (let i = 0; i < list.length; i += 2) {
          const [X, Y, W, H] = cellBox(v, list[i], list[i + 1]);
          cellShape(g, X, Y, W, H, maskOf(list[i], list[i + 1], test), inset, rad);
        }
        g.fillStyle = fill;
        g.fill();
      };

      // Soft shadows under raised patches.
      if (level >= 1) {
        g.beginPath();
        const off = z * 0.08;
        for (const k of ['house', 'garden', 'market']) {
          const list = lists[k];
          for (let i = 0; i < list.length; i += 2) {
            const [X, Y, W, H] = cellBox(v, list[i], list[i + 1]);
            cellShape(g, X + off * 0.5, Y + off, W, H, maskOf(list[i], list[i + 1], sameKind(k)), z * 0.1, z * 0.2);
          }
        }
        g.fillStyle = PAL.shadow;
        g.fill();
      }

      // Water first (bridges sit on it), merged into ponds and rivers.
      mergedPass(lists.water.concat(lists.bridge), waterish, z * 0.03, z * 0.4, PAL.waterLo, PAL.water);
      if (level >= 1) {
        g.strokeStyle = PAL.waterHi;
        g.lineWidth = Math.max(1, z * 0.05);
        g.beginPath();
        const drift = v.cache ? 0 : Math.sin(v.t * 1.5) * z * 0.06;
        for (let i = 0; i < lists.water.length; i += 2) {
          const x = lists.water[i], y = lists.water[i + 1];
          if (hash(x, y) < 0.45) continue;
          const [X, Y, W] = cellBox(v, x, y);
          const cx = X + W * (0.3 + hash(y, x) * 0.4) + drift, cy = Y + W * (0.35 + hash(x + 7, y) * 0.3), s = W * 0.18;
          g.moveTo(cx - s, cy);
          g.quadraticCurveTo(cx - s / 2, cy - s * 0.7, cx, cy);
          g.quadraticCurveTo(cx + s / 2, cy + s * 0.7, cx + s, cy);
        }
        g.stroke();
      }

      // Parks merge into lawns with mowing stripes and flowers.
      mergedPass(lists.park, sameKind('park'), z * 0.06, z * 0.32, PAL.parkEdge, PAL.park);
      if (level >= 1 && lists.park.length) {
        g.fillStyle = 'rgba(255, 255, 255, 0.16)';
        for (let i = 0; i < lists.park.length; i += 2) {
          const [X, Y, W] = cellBox(v, lists.park[i], lists.park[i + 1]);
          g.fillRect(X + W * 0.12, Y + W * 0.22, W * 0.76, W * 0.16);
          g.fillRect(X + W * 0.12, Y + W * 0.6, W * 0.76, W * 0.16);
        }
        if (level === 2) {
          for (let i = 0; i < lists.park.length; i += 2) {
            const x = lists.park[i], y = lists.park[i + 1];
            const [X, Y, W] = cellBox(v, x, y);
            for (let k = 0; k < 4; k++) {
              g.fillStyle = k % 2 ? '#ffffff' : '#ffe27a';
              g.beginPath();
              g.arc(X + W * (0.18 + hash(x + k, y) * 0.64), Y + W * (0.18 + hash(x, y + k) * 0.64), Math.max(1, W * 0.045), 0, Math.PI * 2);
              g.fill();
            }
            if (hash(x * 3, y) < 0.22) drawBench(g, X + W * 0.5, Y + W * 0.5, W * 0.7);
          }
        }
      }

      // Gardens merge into fields with rows of crops.
      mergedPass(lists.garden, sameKind('garden'), z * 0.08, z * 0.22, PAL.gardenEdge, PAL.garden);
      if (level >= 1) {
        g.strokeStyle = PAL.gardenRow;
        g.lineWidth = Math.max(1, z * 0.07);
        g.setLineDash(level === 2 ? [z * 0.12, z * 0.08] : []);
        g.beginPath();
        for (let i = 0; i < lists.garden.length; i += 2) {
          const x = lists.garden[i], y = lists.garden[i + 1];
          const m = maskOf(x, y, sameKind('garden'));
          const [X, Y, W, H] = cellBox(v, x, y);
          const l = X + (m & 8 ? 0 : W * 0.2), r = X + W - (m & 2 ? 0 : W * 0.2);
          for (const f of [0.3, 0.5, 0.7]) { g.moveTo(l, Y + H * f); g.lineTo(r, Y + H * f); }
        }
        g.stroke();
        g.setLineDash([]);
        if (level === 2) {
          for (let i = 0; i < lists.garden.length; i += 2) {
            const x = lists.garden[i], y = lists.garden[i + 1];
            const [X, Y, W] = cellBox(v, x, y);
            for (let k = 0; k < 3; k++) {
              if (hash(x * 3 + k, y) < 0.35) continue;
              g.fillStyle = PAL.flowers[Math.floor(hash(x, y * 5 + k) * PAL.flowers.length)];
              g.beginPath();
              g.arc(X + W * (0.25 + 0.25 * k), Y + W * (0.3 + 0.2 * k), Math.max(1, W * 0.06), 0, Math.PI * 2);
              g.fill();
            }
          }
        }
        // Watered gardens sparkle.
        for (let i = 0; i < lists.garden.length; i += 2) {
          const p = scene.patchAt(lists.garden[i], lists.garden[i + 1]);
          if (!p || !scene.watered.has(p.id)) continue;
          const [X, Y, W] = cellBox(v, p.x, p.y);
          const tw = 0.5 + 0.5 * Math.sin(v.t * 5 + p.x);
          g.fillStyle = `rgba(120, 190, 255, ${0.5 + 0.4 * tw})`;
          g.beginPath();
          g.arc(X + W * 0.72, Y + W * 0.28, Math.max(1.5, W * 0.09), 0, Math.PI * 2);
          g.arc(X + W * 0.3, Y + W * 0.62, Math.max(1.2, W * 0.07), 0, Math.PI * 2);
          g.fill();
        }
      }

      drawPaths(g, v, lists, ow);
      drawMarkets(g, v, lists.market, maskOf, sameKind('market'), ow);
      drawHouses(g, v, lists.house, maskOf, sameKind('house'), ow);
      drawTrees(g, v, lists.tree, lists.cherry, maskOf, ow);
      drawLanterns(g, v, lists.lantern);
      drawLandmarks(g, v, lists);
      drawDecor(g, v, lists);

      // Running stitches along the edges of merged patches.
      if (level === 2) {
        g.lineWidth = Math.max(1, z * 0.035);
        g.setLineDash([z * 0.1, z * 0.08]);
        const stitch = (list, test, inset, rad, color, wonderColor) => {
          const normal = new Path2D(), gold = new Path2D();
          for (let i = 0; i < list.length; i += 2) {
            const x = list[i], y = list[i + 1];
            const p = scene.patchAt(x, y);
            const [X, Y, W, H] = cellBox(v, x, y);
            stitchEdges(p && p.wonder && wonderColor ? gold : normal, X, Y, W, H, maskOf(x, y, test), inset, rad, z * 0.12);
          }
          g.strokeStyle = color;
          g.stroke(normal);
          if (wonderColor) { g.strokeStyle = wonderColor; g.stroke(gold); }
        };
        stitch(lists.house, sameKind('house'), z * 0.1, z * 0.14, PAL.stitch, PAL.gold);
        stitch(lists.garden, sameKind('garden'), z * 0.08, z * 0.22, 'rgba(255,255,255,0.6)', PAL.gold);
        stitch(lists.park, sameKind('park'), z * 0.06, z * 0.32, 'rgba(255,255,255,0.7)', PAL.gold);
        stitch(lists.water, waterish, z * 0.03, z * 0.4, PAL.waterHi, null);
        g.setLineDash([]);
      }
    }

    function drawPaths(g, v, lists, ow) {
      const { scene, z, level } = v;
      const kindAt = scene.kindAt;
      const linked = (x, y) => { const k = kindAt(x, y); return k === 'path' || k === 'house' || k === 'market'; };
      const armsOf = (x, y) => (linked(x, y - 1) ? 1 : 0) | (linked(x + 1, y) ? 2 : 0) | (linked(x, y + 1) ? 4 : 0) | (linked(x - 1, y) ? 8 : 0);
      const shape = (path, X, Y, W, H, arms, grow) => {
        const a = W * 0.24 - grow, b = W * 0.76 + grow;
        if (!arms) {
          path.moveTo(X + W / 2 + W * 0.3 + grow, Y + H / 2);
          path.arc(X + W / 2, Y + H / 2, W * 0.3 + grow, 0, Math.PI * 2);
          return;
        }
        path.rect(X + a, Y + a, b - a, b - a);
        if (arms & 1) path.rect(X + a, Y, b - a, H / 2);
        if (arms & 2) path.rect(X + W / 2, Y + a, W / 2, b - a);
        if (arms & 4) path.rect(X + a, Y + H / 2, b - a, H / 2);
        if (arms & 8) path.rect(X, Y + a, W / 2, b - a);
      };
      const list = lists.path;
      const edge = new Path2D(), fill = new Path2D();
      for (let i = 0; i < list.length; i += 2) {
        const [X, Y, W, H] = cellBox(v, list[i], list[i + 1]);
        const arms = armsOf(list[i], list[i + 1]);
        shape(edge, X, Y, W, H, arms, ow);
        shape(fill, X, Y, W, H, arms, 0);
      }
      g.fillStyle = PAL.pathEdge;
      g.fill(edge);
      g.fillStyle = PAL.path;
      g.fill(fill);
      if (level === 2) {
        g.strokeStyle = PAL.pathStitch;
        g.lineWidth = Math.max(1, z * 0.04);
        g.setLineDash([z * 0.1, z * 0.09]);
        g.beginPath();
        for (let i = 0; i < list.length; i += 2) {
          const [X, Y, W, H] = cellBox(v, list[i], list[i + 1]);
          const arms = armsOf(list[i], list[i + 1]);
          const cx = X + W / 2, cy = Y + H / 2;
          if (arms & 1) { g.moveTo(cx, cy); g.lineTo(cx, Y); }
          if (arms & 2) { g.moveTo(cx, cy); g.lineTo(X + W, cy); }
          if (arms & 4) { g.moveTo(cx, cy); g.lineTo(cx, Y + H); }
          if (arms & 8) { g.moveTo(cx, cy); g.lineTo(X, cy); }
        }
        g.stroke();
        g.setLineDash([]);
      }
      // Bridges: a plank deck with rails, running across the river.
      const isWater = (x, y) => kindAt(x, y) === 'water';
      for (let i = 0; i < lists.bridge.length; i += 2) {
        const x = lists.bridge[i], y = lists.bridge[i + 1];
        const [X, Y, W, H] = cellBox(v, x, y);
        const northSouth = isWater(x - 1, y) && isWater(x + 1, y);
        g.fillStyle = PAL.plank;
        if (northSouth) g.fillRect(X + W * 0.2, Y, W * 0.6, H); else g.fillRect(X, Y + H * 0.2, W, H * 0.6);
        if (level >= 1) {
          g.strokeStyle = PAL.plankLine;
          g.lineWidth = Math.max(1, z * 0.03);
          g.beginPath();
          for (let k = 1; k < 5; k++) {
            if (northSouth) { g.moveTo(X + W * 0.2, Y + H * k / 5); g.lineTo(X + W * 0.8, Y + H * k / 5); }
            else { g.moveTo(X + W * k / 5, Y + H * 0.2); g.lineTo(X + W * k / 5, Y + H * 0.8); }
          }
          g.stroke();
        }
        g.strokeStyle = PAL.rail;
        g.lineWidth = Math.max(1, z * 0.08);
        g.beginPath();
        if (northSouth) { g.moveTo(X + W * 0.2, Y); g.lineTo(X + W * 0.2, Y + H); g.moveTo(X + W * 0.8, Y); g.lineTo(X + W * 0.8, Y + H); }
        else { g.moveTo(X, Y + H * 0.2); g.lineTo(X + W, Y + H * 0.2); g.moveTo(X, Y + H * 0.8); g.lineTo(X + W, Y + H * 0.8); }
        g.stroke();
      }
    }

    function ownerOf(scene, x, y) {
      const p = scene.patchAt(x, y);
      return p ? p.owner : scene.myId;
    }

    // Market stalls: striped awnings in the builder's colors; side by side they make a row.
    function drawMarkets(g, v, list, maskOf, isMarket, ow) {
      if (!list.length) return;
      const { scene, z, level } = v;
      for (let i = 0; i < list.length; i += 2) {
        const x = list[i], y = list[i + 1];
        const m = maskOf(x, y, isMarket);
        const [X, Y, W, H] = cellBox(v, x, y);
        const owner = ownerOf(scene, x, y);
        const colors = PAL.awnings[(owner ? R.hashString(owner) : 0) % PAL.awnings.length];
        // Stall and goods.
        g.fillStyle = PAL.outline;
        g.beginPath(); cellShape(g, X, Y, W, H, m & 10, W * 0.08 - ow, W * 0.1 + ow); g.fill();
        g.fillStyle = PAL.wood;
        g.beginPath(); cellShape(g, X, Y, W, H, m & 10, W * 0.08, W * 0.1); g.fill();
        if (level >= 1) {
          for (let k = 0; k < 3; k++) {
            g.fillStyle = ['#e2574c', '#f2b84b', '#6aa84f'][(k + Math.floor(hash(x, y) * 3)) % 3];
            g.beginPath(); g.arc(X + W * (0.28 + 0.22 * k), Y + H * 0.78, Math.max(1, W * 0.08), 0, Math.PI * 2); g.fill();
          }
        }
        // Awning over the top 60%.
        const ax = X + (m & 8 ? 0 : W * 0.04), aw = W - (m & 8 ? 0 : W * 0.04) - (m & 2 ? 0 : W * 0.04);
        const stripes = 4;
        for (let k = 0; k < stripes; k++) {
          g.fillStyle = colors[k % 2];
          g.fillRect(ax + (aw * k) / stripes, Y + H * 0.06, aw / stripes + 0.5, H * 0.52);
        }
        if (level === 2) {
          for (let k = 0; k < stripes; k++) {
            g.fillStyle = colors[k % 2];
            g.beginPath();
            g.arc(ax + (aw * (k + 0.5)) / stripes, Y + H * 0.58, aw / stripes / 2, 0, Math.PI);
            g.fill();
          }
        }
        g.strokeStyle = 'rgba(60, 30, 20, 0.35)';
        g.lineWidth = Math.max(1, z * 0.04);
        g.strokeRect(ax, Y + H * 0.06, aw, H * 0.52);
      }
    }

    function roofColor(scene, x, y) {
      const p = scene.patchAt(x, y);
      if (p && p.wonder) {
        const w = scene.world.wonders.find((q) => q.id === p.wonder);
        return (w && R.BLUEPRINTS[w.blueprint].roof) || '#a86a43';
      }
      const owner = p ? p.owner : scene.myId;
      return owner ? PAL.roofs[R.hashString(owner) % PAL.roofs.length] : PAL.seasonRoof;
    }

    function stylePattern(style) {
      if (!st.styles) {
        const make = (draw) => {
          const c = document.createElement('canvas');
          c.width = c.height = 12;
          draw(c.getContext('2d'));
          return ctx.createPattern(c, 'repeat');
        };
        st.styles = {
          gingham: make((g) => { g.fillStyle = 'rgba(255,255,255,0.28)'; g.fillRect(0, 0, 6, 12); g.fillRect(0, 0, 12, 6); }),
          polka: make((g) => { g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.arc(3, 3, 1.8, 0, 7); g.arc(9, 9, 1.8, 0, 7); g.fill(); }),
          stripes: make((g) => { g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-3, 12); g.lineTo(12, -3); g.moveTo(3, 15); g.lineTo(15, 3); g.stroke(); }),
        };
      }
      return st.styles[style] || null;
    }

    // Houses side by side join into one building; each builder's roof keeps its own fabric.
    function drawHouses(g, v, list, maskOf, isHouse, ow) {
      const { scene, z, level } = v;
      const inset = z * 0.1, rad = z * 0.14;
      g.beginPath();
      for (let i = 0; i < list.length; i += 2) {
        const [X, Y, W, H] = cellBox(v, list[i], list[i + 1]);
        cellShape(g, X, Y, W, H, maskOf(list[i], list[i + 1], isHouse), inset - ow, rad + ow);
      }
      g.fillStyle = PAL.outline;
      g.fill();
      const byColor = new Map(), byStyle = new Map();
      for (let i = 0; i < list.length; i += 2) {
        const c = roofColor(scene, list[i], list[i + 1]);
        if (!byColor.has(c)) byColor.set(c, []);
        byColor.get(c).push(list[i], list[i + 1]);
        const p = scene.patchAt(list[i], list[i + 1]);
        const style = p && !p.wonder && scene.styleOf(p.owner);
        if (style && style !== 'patchwork') {
          if (!byStyle.has(style)) byStyle.set(style, []);
          byStyle.get(style).push(list[i], list[i + 1]);
        }
      }
      for (const [color, cells] of byColor) {
        g.beginPath();
        for (let i = 0; i < cells.length; i += 2) {
          const [X, Y, W, H] = cellBox(v, cells[i], cells[i + 1]);
          cellShape(g, X, Y, W, H, maskOf(cells[i], cells[i + 1], isHouse), inset, rad);
        }
        g.fillStyle = color;
        g.fill();
      }
      // Roof patterns a builder has unlocked: gingham, polka dots or stripes.
      if (level >= 1) {
        for (const [style, cells] of byStyle) {
          const pat = stylePattern(style);
          if (!pat) continue;
          g.beginPath();
          for (let i = 0; i < cells.length; i += 2) {
            const [X, Y, W, H] = cellBox(v, cells[i], cells[i + 1]);
            cellShape(g, X, Y, W, H, maskOf(cells[i], cells[i + 1], isHouse), inset, rad);
          }
          if (pat.setTransform) pat.setTransform(new DOMMatrix().translate(((-v.left * z) % 12 + 12) % 12, ((-v.top * z) % 12 + 12) % 12).scale(Math.max(0.6, z / 30)));
          g.fillStyle = pat;
          g.fill();
        }
      }
      if (level < 1) return;

      // Homes are cottages seen a little from the front: the back slope of the roof catches the light,
      // the front slope is in shade, and along the front runs a wall with its door and windows.
      // Houses side by side share one long roof. Wonder buildings keep their own simple roofs.
      const ridge = new Path2D();
      const cottage = (x, y) => { const p = scene.patchAt(x, y); return !(p && p.wonder); };
      const fronts = [];
      for (let i = 0; i < list.length; i += 2) {
        const x = list[i], y = list[i + 1];
        if (!cottage(x, y)) continue;
        const m = maskOf(x, y, isHouse);
        const [X, Y, W, H] = cellBox(v, x, y);
        const back = !(m & 1), front = !(m & 4);
        const left = m & 8 ? X : X + inset, right = m & 2 ? X + W : X + W - inset;
        const wallTop = Y + H * 0.56, bottom = Y + H - inset;
        const ridgeY = back ? (front ? Y + H * 0.3 : Y + H) : null;
        g.save();
        g.beginPath();
        cellShape(g, X, Y, W, H, m, inset, rad);
        g.clip();
        if (back) { g.fillStyle = 'rgba(255, 255, 255, 0.16)'; g.fillRect(X, Y, W, ridgeY - Y); }
        const shadeFrom = back ? ridgeY : Y, shadeTo = front ? wallTop : Y + H;
        if (shadeTo > shadeFrom) { g.fillStyle = 'rgba(40, 20, 10, 0.17)'; g.fillRect(X, shadeFrom, W, shadeTo - shadeFrom); }
        g.restore();
        if (back) { ridge.moveTo(m & 8 ? X : left + W * 0.08, ridgeY); ridge.lineTo(m & 2 ? X + W : right - W * 0.08, ridgeY); }
        if (front) {
          g.beginPath();
          roundRect(g, left, wallTop, right - left, bottom - wallTop, 0, 0, m & 2 ? 0 : rad, m & 8 ? 0 : rad);
          g.fillStyle = PAL.wall;
          g.fill();
          g.fillStyle = 'rgba(50, 24, 14, 0.38)';
          g.fillRect(left, wallTop, right - left, Math.max(1, z * 0.06)); // the eave's shadow
          fronts.push(x, y, X, W, wallTop, bottom, m);
        }
      }
      g.strokeStyle = 'rgba(50, 24, 14, 0.3)';
      g.lineWidth = Math.max(1, z * 0.06);
      g.stroke(ridge);
      if (level === 2) drawCottageDetails(g, v, list, fronts, maskOf, isHouse, cottage);

      // Wonder buildings: ridges follow the building's length; the south slope sits in shade.
      const wonderRidge = new Path2D();
      for (let i = 0; i < list.length; i += 2) {
        const x = list[i], y = list[i + 1];
        if (cottage(x, y)) continue;
        const m = maskOf(x, y, isHouse);
        const [X, Y, W, H] = cellBox(v, x, y);
        const cx = X + W / 2, cy = Y + H / 2;
        const across = (m & 10) !== 0, down = (m & 5) !== 0;
        if (level === 2) {
          g.save();
          g.beginPath();
          cellShape(g, X, Y, W, H, m, inset, rad);
          g.clip();
          if (!across && !down) {
            // A little house on its own gets a hip roof: four slopes, lit from the north.
            const facet = (ax, ay, bx, by, fill) => { g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.lineTo(cx, cy); g.closePath(); g.fillStyle = fill; g.fill(); };
            facet(X, Y, X + W, Y, 'rgba(255, 255, 255, 0.16)');
            facet(X + W, Y, X + W, Y + H, 'rgba(40, 20, 10, 0.10)');
            facet(X, Y + H, X + W, Y + H, 'rgba(40, 20, 10, 0.24)');
          } else {
            g.fillStyle = 'rgba(40, 20, 10, 0.12)';
            if (across || !down) g.fillRect(X, cy, W, H / 2);
            else g.fillRect(cx, Y, W / 2, H);
          }
          g.restore();
        }
        if (!across && !down) {
          const k = level === 2 ? inset + rad * 0.3 : W * 0.24;
          wonderRidge.moveTo(X + k, Y + k); wonderRidge.lineTo(cx, cy); wonderRidge.lineTo(X + W - k, Y + k);
          wonderRidge.moveTo(X + k, Y + H - k); wonderRidge.lineTo(cx, cy); wonderRidge.lineTo(X + W - k, Y + H - k);
        }
        if (across) { wonderRidge.moveTo(m & 8 ? X : X + W * 0.28, cy); wonderRidge.lineTo(m & 2 ? X + W : X + W * 0.72, cy); }
        if (down) { wonderRidge.moveTo(cx, m & 1 ? Y : Y + H * 0.28); wonderRidge.lineTo(cx, m & 4 ? Y + H : Y + H * 0.72); }
      }
      g.strokeStyle = 'rgba(50, 24, 14, 0.32)';
      g.lineWidth = Math.max(1, z * 0.07);
      g.stroke(wonderRidge);
      if (level < 2) return;

      for (let i = 0; i < list.length; i += 2) {
        const x = list[i], y = list[i + 1];
        const [X, Y, W, H] = cellBox(v, x, y);
        const m = maskOf(x, y, isHouse);
        // A seam where one builder's roof meets another's.
        const here = roofColor(scene, x, y);
        g.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        g.lineWidth = Math.max(1, z * 0.04);
        g.setLineDash([z * 0.08, z * 0.07]);
        g.beginPath();
        if (m & 2 && roofColor(scene, x + 1, y) !== here) { g.moveTo(X + W, Y + inset); g.lineTo(X + W, Y + H - inset); }
        if (m & 4 && roofColor(scene, x, y + 1) !== here) { g.moveTo(X + inset, Y + H); g.lineTo(X + W - inset, Y + H); }
        g.stroke();
        g.setLineDash([]);
      }
    }

    // Up close: doors and windows along the front walls (lit at night), chimneys and their smoke.
    // fronts: [x, y, X, W, wallTop, wallBottom, mask] for each square of front wall.
    // Where a cottage's front wall has its door and windows, as fractions of the square's width.
    // The door faces a path: below, or at an end of the wall. A house on its own always has one.
    function cottageOpenings(kindAt, x, y, m, W) {
      const door = kindAt(x, y + 1) === 'path' ? 0.5
        : !(m & 2) && kindAt(x + 1, y) === 'path' ? 0.76
          : !(m & 8) && kindAt(x - 1, y) === 'path' ? 0.24
            : m === 0 ? 0.5 : null;
      const windows = door === null ? [0.3, 0.7] : door === 0.5 ? (W > 30 * st.dpr ? [0.17, 0.83] : []) : door > 0.5 ? [0.32] : [0.68];
      return { door, windows };
    }

    function drawCottageDetails(g, v, list, fronts, maskOf, isHouse, cottage) {
      const { scene, z } = v;
      const kindAt = scene.kindAt, night = !!scene.night;
      for (let i = 0; i < fronts.length; i += 7) {
        const [x, y, X, W, wallTop, bottom, m] = fronts.slice(i, i + 7);
        const wallH = bottom - wallTop;
        const { door, windows } = cottageOpenings(kindAt, x, y, m, W);
        const ww = W * 0.15, wh = wallH * 0.42, wy = wallTop + wallH * 0.24;
        g.lineWidth = Math.max(1, z * 0.025);
        for (const f of windows) {
          const wx = X + W * f - ww / 2;
          g.fillStyle = night ? '#3d4a66' : PAL.glass; // at night the lit ones are added in drawNight
          g.fillRect(wx, wy, ww, wh);
          g.strokeStyle = '#ffffff';
          g.strokeRect(wx, wy, ww, wh);
          g.beginPath(); g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + wh); g.stroke();
        }
        if (door !== null) {
          const dw = W * 0.2, dh = wallH * 0.76, dx = X + W * door - dw / 2, dy = bottom - dh;
          g.fillStyle = PAL.door;
          g.beginPath(); roundRect(g, dx, dy, dw, dh, dw * 0.45, dw * 0.45, 0, 0); g.fill();
          g.fillStyle = '#e7c46a';
          g.beginPath(); g.arc(dx + dw * 0.72, dy + dh * 0.55, Math.max(0.8, dw * 0.08), 0, Math.PI * 2); g.fill();
        }
      }
      // Chimneys on some roofs' back edge, with smoke curling up (only live: the cached pictures stand still).
      for (let i = 0; i < list.length; i += 2) {
        const x = list[i], y = list[i + 1];
        if (!cottage(x, y) || maskOf(x, y, isHouse) & 1 || hash(x + 7, y) > 0.35) continue;
        const [X, Y, W, H] = cellBox(v, x, y);
        const cw = W * 0.15, ch = H * 0.24, cx = X + W * 0.68, cy = Y - H * 0.04;
        g.fillStyle = PAL.brick;
        g.fillRect(cx, cy, cw, ch);
        g.fillStyle = 'rgba(40, 20, 10, 0.35)';
        g.fillRect(cx - cw * 0.12, cy, cw * 1.24, ch * 0.22);
        if (v.cache) continue;
        for (let k = 0; k < 3; k++) {
          const ph = (v.t * 0.3 + k / 3 + hash(x, y + 5)) % 1;
          g.fillStyle = `rgba(250, 250, 250, ${0.55 * (1 - ph)})`;
          g.beginPath();
          g.arc(cx + cw / 2 + Math.sin(ph * 5 + k) * W * 0.06, cy - ph * H * 0.8, W * (0.05 + ph * 0.07), 0, Math.PI * 2);
          g.fill();
        }
      }
    }

    // Trees side by side grow bigger canopies that overlap into a forest. Cherry trees are bigger still.
    function drawTrees(g, v, list, cherries, maskOf, ow) {
      const { z, level } = v;
      const kindAt = v.scene.kindAt;
      const leafy = (x, y) => { const k = kindAt(x, y); return k === 'tree' || k === 'cherry'; };
      const trees = [], pinks = [];
      for (let i = 0; i < list.length; i += 2) {
        const x = list[i], y = list[i + 1];
        const [X, Y, W] = cellBox(v, x, y);
        const forest = maskOf(x, y, leafy) !== 0;
        const j = forest ? (hash(x, y) - 0.5) * W * 0.14 : 0;
        trees.push([X + W / 2 + j, Y + W / 2 + (hash(y, x) - 0.5) * W * 0.1, W * (forest ? 0.6 : 0.42), x, y]);
      }
      for (let i = 0; i < cherries.length; i += 2) {
        const [X, Y, W] = cellBox(v, cherries[i], cherries[i + 1]);
        pinks.push([X + W / 2, Y + W / 2, W * 0.72, cherries[i], cherries[i + 1]]);
      }
      const circles = (set, grow, dx, dy, scale) => {
        const p = new Path2D();
        for (const [cx, cy, r] of set) {
          const rr = r * scale + grow;
          p.moveTo(cx + dx + rr, cy + dy);
          p.arc(cx + dx, cy + dy, rr, 0, Math.PI * 2);
        }
        return p;
      };
      for (const [set, lo, mid, hi] of [[trees, PAL.treeLo, PAL.tree, PAL.treeHi], [pinks, PAL.cherryLo, PAL.cherry, PAL.cherryHi]]) {
        if (!set.length) continue;
        if (level >= 1) { g.fillStyle = PAL.shadow; g.fill(circles(set, 0, z * 0.08, z * 0.12, 1)); }
        g.fillStyle = lo; g.fill(circles(set, ow, 0, 0, 1));
        g.fillStyle = mid; g.fill(circles(set, 0, 0, 0, 1));
        g.fillStyle = hi; g.fill(circles(set, 0, -z * 0.12, -z * 0.14, 0.5));
        if (level === 2) {
          g.strokeStyle = 'rgba(255, 255, 255, 0.38)';
          g.lineWidth = Math.max(1, z * 0.035);
          g.setLineDash([z * 0.09, z * 0.08]);
          g.stroke(circles(set, 0, 0, 0, 0.72));
          g.setLineDash([]);
        }
      }
      if (level === 2) {
        g.fillStyle = PAL.blossom;
        for (const [cx, cy, r, x, y] of trees) {
          if (hash(x + 11, y) > 0.22) continue;
          for (let k = 0; k < 3; k++) {
            g.beginPath();
            g.arc(cx + Math.cos(k * 2.1) * r * 0.5, cy + Math.sin(k * 2.1) * r * 0.5, Math.max(1, z * 0.06), 0, Math.PI * 2);
            g.fill();
          }
        }
        g.fillStyle = '#ffffff';
        for (const [cx, cy, r] of pinks) {
          for (let k = 0; k < 6; k++) {
            g.beginPath();
            g.arc(cx + Math.cos(k * 1.1) * r * 0.55, cy + Math.sin(k * 1.1) * r * 0.55, Math.max(1, z * 0.05), 0, Math.PI * 2);
            g.fill();
          }
        }
      }
    }

    function drawLanterns(g, v, list) {
      const { z, level } = v;
      for (let i = 0; i < list.length; i += 2) {
        const [X, Y, W] = cellBox(v, list[i], list[i + 1]);
        const cx = X + W / 2, cy = Y + W / 2;
        if (level >= 1) {
          const halo = g.createRadialGradient(cx, cy, 0, cx, cy, W * 0.7);
          halo.addColorStop(0, 'rgba(255, 213, 107, 0.45)');
          halo.addColorStop(1, 'rgba(255, 213, 107, 0)');
          g.fillStyle = halo;
          g.fillRect(cx - W * 0.7, cy - W * 0.7, W * 1.4, W * 1.4);
        }
        g.fillStyle = PAL.pathEdge;
        g.beginPath(); g.arc(cx, cy, W * 0.33, 0, Math.PI * 2); g.fill();
        g.fillStyle = PAL.path;
        g.beginPath(); g.arc(cx, cy, W * 0.29, 0, Math.PI * 2); g.fill();
        g.fillStyle = PAL.post;
        g.beginPath(); roundRect(g, cx - W * 0.13, cy - W * 0.13, W * 0.26, W * 0.26, W * 0.05); g.fill();
        g.fillStyle = PAL.light;
        g.beginPath(); g.arc(cx, cy, Math.max(1.2, W * 0.09), 0, Math.PI * 2); g.fill();
        if (level === 2) {
          g.strokeStyle = 'rgba(255,255,255,0.6)';
          g.lineWidth = Math.max(1, z * 0.03);
          g.setLineDash([z * 0.08, z * 0.07]);
          g.beginPath(); g.arc(cx, cy, W * 0.24, 0, Math.PI * 2); g.stroke();
          g.setLineDash([]);
        }
      }
    }

    // Windmills turn, lighthouses stand striped (and sweep their light at night).
    function drawLandmarks(g, v, lists) {
      const { level } = v;
      for (let i = 0; i < lists.windmill.length; i += 2) {
        const x = lists.windmill[i], y = lists.windmill[i + 1];
        const [X, Y, W] = cellBox(v, x, y);
        const cx = X + W / 2, cy = Y + W / 2;
        g.fillStyle = PAL.shadow;
        g.beginPath(); g.arc(cx + W * 0.06, cy + W * 0.1, W * 0.38, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#efe4cf'; g.strokeStyle = '#a8916b'; g.lineWidth = Math.max(1, W * 0.05);
        g.beginPath(); g.arc(cx, cy, W * 0.36, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = '#c4614c';
        g.beginPath(); g.arc(cx, cy, W * 0.2, 0, Math.PI * 2); g.fill();
        const a0 = (v.cache ? 0.4 : v.t * 0.9) + hash(x, y) * 6;
        for (let k = 0; k < 4; k++) {
          const a = a0 + (k * Math.PI) / 2;
          g.save();
          g.translate(cx, cy);
          g.rotate(a);
          g.fillStyle = '#fbf6ea';
          g.strokeStyle = '#8a6b45';
          g.lineWidth = Math.max(1, W * 0.035);
          g.fillRect(W * 0.08, -W * 0.09, W * 0.78, W * 0.18);
          g.strokeRect(W * 0.08, -W * 0.09, W * 0.78, W * 0.18);
          if (level === 2) {
            g.beginPath();
            for (let s = 1; s < 4; s++) { g.moveTo(W * (0.08 + s * 0.19), -W * 0.09); g.lineTo(W * (0.08 + s * 0.19), W * 0.09); }
            g.stroke();
          }
          g.restore();
        }
        g.fillStyle = '#7a5536';
        g.beginPath(); g.arc(cx, cy, W * 0.07, 0, Math.PI * 2); g.fill();
      }
      for (let i = 0; i < lists.lighthouse.length; i += 2) {
        const [X, Y, W] = cellBox(v, lists.lighthouse[i], lists.lighthouse[i + 1]);
        const cx = X + W / 2, cy = Y + W / 2;
        g.fillStyle = PAL.shadow;
        g.beginPath(); g.arc(cx + W * 0.06, cy + W * 0.1, W * 0.42, 0, Math.PI * 2); g.fill();
        for (const [r, c] of [[0.44, '#f6f2ea'], [0.34, '#d4483d'], [0.25, '#f6f2ea'], [0.16, '#d4483d']]) {
          g.fillStyle = c;
          g.strokeStyle = 'rgba(70, 40, 30, 0.45)';
          g.lineWidth = Math.max(1, W * 0.03);
          g.beginPath(); g.arc(cx, cy, W * r, 0, Math.PI * 2); g.fill(); g.stroke();
        }
        g.fillStyle = '#ffd56b';
        g.beginPath(); g.arc(cx, cy, W * 0.09, 0, Math.PI * 2); g.fill();
      }
    }

    function drawBench(g, cx, cy, s) {
      g.fillStyle = '#8a5a35';
      g.fillRect(cx - s * 0.35, cy - s * 0.16, s * 0.7, s * 0.1);
      g.fillRect(cx - s * 0.35, cy - s * 0.02, s * 0.7, s * 0.1);
      g.fillStyle = '#5b3a22';
      g.fillRect(cx - s * 0.3, cy + s * 0.08, s * 0.06, s * 0.12);
      g.fillRect(cx + s * 0.24, cy + s * 0.08, s * 0.06, s * 0.12);
    }

    // Small decorations that sit in homes.
    function drawDecor(g, v, lists) {
      const { level } = v;
      const kindAt = v.scene.kindAt;
      for (const kind of R.DECOR) {
        const list = lists[kind];
        for (let i = 0; i < list.length; i += 2) {
          const x = list[i], y = list[i + 1];
          const [X, Y, W] = cellBox(v, x, y);
          const cx = X + W / 2, cy = Y + W / 2;
          if (level === 0) {
            g.fillStyle = kind === 'fountain' ? '#7cc3ea' : '#c99a6b';
            g.fillRect(X + W * 0.3, Y + W * 0.3, W * 0.4, W * 0.4);
            continue;
          }
          if (kind === 'bench') drawBench(g, cx, cy, W);
          else if (kind === 'fountain') {
            g.fillStyle = '#cfc6b8'; g.strokeStyle = '#8f8676'; g.lineWidth = Math.max(1, W * 0.04);
            g.beginPath(); g.arc(cx, cy, W * 0.4, 0, Math.PI * 2); g.fill(); g.stroke();
            g.fillStyle = '#7cc3ea';
            g.beginPath(); g.arc(cx, cy, W * 0.3, 0, Math.PI * 2); g.fill();
            const spray = v.cache ? 0.5 : 0.5 + 0.5 * Math.sin(v.t * 6 + x);
            g.fillStyle = `rgba(255, 255, 255, ${0.6 + 0.3 * spray})`;
            g.beginPath(); g.arc(cx, cy, W * (0.07 + 0.05 * spray), 0, Math.PI * 2); g.fill();
            if (level === 2) {
              g.strokeStyle = 'rgba(255,255,255,0.7)';
              g.beginPath(); g.arc(cx, cy, W * (0.14 + 0.12 * spray), 0, Math.PI * 2); g.stroke();
            }
          } else if (kind === 'flowerpot') {
            for (let k = 0; k < 3; k++) {
              const px = cx + (k - 1) * W * 0.26, py = cy + (k === 1 ? -W * 0.1 : W * 0.08);
              g.fillStyle = '#c0704e';
              g.beginPath(); g.arc(px, py, W * 0.13, 0, Math.PI * 2); g.fill();
              g.fillStyle = PAL.flowers[(k + Math.floor(hash(x, y) * 4)) % PAL.flowers.length];
              g.beginPath(); g.arc(px, py - W * 0.02, W * 0.08, 0, Math.PI * 2); g.fill();
            }
          } else if (kind === 'birdhouse') {
            g.strokeStyle = '#6b4a33'; g.lineWidth = Math.max(1, W * 0.07);
            g.beginPath(); g.moveTo(cx, cy + W * 0.1); g.lineTo(cx, cy + W * 0.4); g.stroke();
            g.fillStyle = '#e8c07a'; g.strokeStyle = '#8a5a35'; g.lineWidth = Math.max(1, W * 0.04);
            g.beginPath(); g.moveTo(cx - W * 0.22, cy - W * 0.05); g.lineTo(cx, cy - W * 0.3); g.lineTo(cx + W * 0.22, cy - W * 0.05);
            g.lineTo(cx + W * 0.22, cy + W * 0.15); g.lineTo(cx - W * 0.22, cy + W * 0.15); g.closePath(); g.fill(); g.stroke();
            g.fillStyle = '#3a2a20'; g.beginPath(); g.arc(cx, cy, W * 0.06, 0, Math.PI * 2); g.fill();
          } else if (kind === 'scarecrow') {
            g.strokeStyle = '#7a5536'; g.lineWidth = Math.max(1, W * 0.07);
            g.beginPath(); g.moveTo(cx, cy - W * 0.2); g.lineTo(cx, cy + W * 0.38); g.moveTo(cx - W * 0.32, cy); g.lineTo(cx + W * 0.32, cy); g.stroke();
            g.fillStyle = '#5a7fb0'; g.fillRect(cx - W * 0.16, cy - W * 0.04, W * 0.32, W * 0.24);
            g.fillStyle = '#f2dcae'; g.beginPath(); g.arc(cx, cy - W * 0.2, W * 0.12, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#d9a63a'; g.beginPath(); g.ellipse(cx, cy - W * 0.29, W * 0.22, W * 0.07, 0, 0, Math.PI * 2); g.fill();
          } else if (kind === 'bunting') {
            // Bunting strings join up with neighboring bunting.
            const east = kindAt(x + 1, y) === 'bunting', west = kindAt(x - 1, y) === 'bunting';
            const l = west ? X : X + W * 0.1, r = east ? X + W : X + W * 0.9;
            g.strokeStyle = '#7a5536'; g.lineWidth = Math.max(1, W * 0.03);
            g.beginPath(); g.moveTo(l, cy - W * 0.12); g.quadraticCurveTo((l + r) / 2, cy, r, cy - W * 0.12); g.stroke();
            for (let k = 0; k < 3; k++) {
              const fx = l + ((r - l) * (k + 0.5)) / 3;
              g.fillStyle = ['#e2574c', '#f2b84b', '#3e8fc6'][(k + x) % 3];
              g.beginPath(); g.moveTo(fx - W * 0.1, cy - W * 0.07); g.lineTo(fx + W * 0.1, cy - W * 0.07); g.lineTo(fx, cy + W * 0.18); g.closePath(); g.fill();
            }
          }
        }
      }
    }

    // ---------- Things drawn only on the live view ----------

    function drawOverlays(g, v) {
      const { scene, z } = v;
      for (const p of scene.pending) {
        const [X, Y, W, H] = cellBox(v, p.x, p.y);
        g.setLineDash([W * 0.16, W * 0.1]);
        g.lineDashOffset = -v.t * W * 0.6; // basting stitches march around the patch
        g.strokeStyle = '#ffffff';
        g.lineWidth = Math.max(1.5, z * 0.07);
        g.beginPath();
        roundRect(g, X + W * 0.04, Y + H * 0.04, W * 0.92, H * 0.92, W * 0.18);
        g.stroke();
        g.setLineDash([]);
        g.lineDashOffset = 0;
        const frac = Math.max(0, Math.min(1, (p.until - scene.now) / scene.undoMs));
        g.lineWidth = Math.max(2, W * 0.09);
        g.strokeStyle = 'rgba(30, 24, 18, 0.45)';
        g.beginPath(); g.arc(X + W / 2, Y + H / 2, W * 0.24, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = '#ffffff';
        g.beginPath(); g.arc(X + W / 2, Y + H / 2, W * 0.24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); g.stroke();
      }
      const pv = scene.preview;
      if (pv) {
        const [X, Y, W, H] = cellBox(v, pv.x, pv.y);
        const pulse = 0.5 + 0.5 * Math.sin(v.t * 6);
        g.lineWidth = Math.max(2, z * 0.09);
        g.beginPath();
        roundRect(g, X - W * 0.04, Y - H * 0.04, W * 1.08, H * 1.08, W * 0.2);
        if (pv.ok) {
          g.fillStyle = `rgba(255, 255, 255, ${0.1 + 0.12 * pulse})`;
          g.fill();
          g.strokeStyle = PAL.gold;
          g.stroke();
        } else {
          g.strokeStyle = '#e0535a';
          g.setLineDash([W * 0.14, W * 0.1]);
          g.stroke();
          g.setLineDash([]);
          g.beginPath();
          g.moveTo(X + W * 0.3, Y + H * 0.3); g.lineTo(X + W * 0.7, Y + H * 0.7);
          g.moveTo(X + W * 0.7, Y + H * 0.3); g.lineTo(X + W * 0.3, Y + H * 0.7);
          g.stroke();
        }
      }
    }

    // Recent building elsewhere shows as gentle rings: the "glowing spots" of the far zoom levels.
    function drawActivity(g, v) {
      const { scene, z } = v;
      for (const r of scene.recent) {
        const age = (scene.now - r.at) / 1000;
        if (age > 20) continue;
        const phase = (age % 1.6) / 1.6;
        const cx = (r.x + 0.5 - v.left) * z, cy = (r.y + 0.5 - v.top) * z;
        if (cx < -60 || cy < -60 || cx > v.w + 60 || cy > v.h + 60) continue;
        g.strokeStyle = `rgba(255, 214, 102, ${(1 - phase) * (1 - age / 20) * 0.9})`;
        g.lineWidth = Math.max(1.5, z * 0.08);
        g.beginPath();
        g.arc(cx, cy, Math.max(5 * st.dpr, z * 0.5) * (0.6 + phase * 1.6), 0, Math.PI * 2);
        g.stroke();
      }
      for (const p of scene.pops) {
        const age = (scene.now - p.at) / 550;
        if (age > 1) continue;
        const cx = (p.x + 0.5 - v.left) * z, cy = (p.y + 0.5 - v.top) * z;
        g.strokeStyle = `rgba(255, 255, 255, ${1 - age})`;
        g.lineWidth = Math.max(2, z * 0.1) * (1 - age);
        g.beginPath();
        g.arc(cx, cy, z * (0.4 + age * 0.8), 0, Math.PI * 2);
        g.stroke();
        // Little stitch sparkles flying out.
        g.fillStyle = `rgba(255, 236, 160, ${1 - age})`;
        for (let k = 0; k < 6; k++) {
          const a = k * 1.047 + p.x;
          const d = z * (0.3 + age * 0.9);
          g.beginPath();
          g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, Math.max(1.2, z * 0.06) * (1 - age), 0, Math.PI * 2);
          g.fill();
        }
      }
    }

    // Stickers that homes received today, shown at the corner of the home.
    function drawStickerBadges(g, v) {
      const { scene, z } = v;
      if (z / st.dpr < 8 || !scene.stickersToday) return;
      const world = scene.world;
      for (const [key, playerId] of world.plotOwners) {
        const kinds = scene.stickersToday.get(playerId);
        if (!kinds || !kinds.length) continue;
        const b = R.blockById(world, Math.floor(key / 100));
        if (!b) continue;
        const r = R.plotRect(b, key % 100);
        const X = (r.x + r.w - v.left) * z, Y = (r.y - v.top) * z;
        if (X < -40 || Y < -40 || X > v.w + 40 || Y > v.h + 40) continue;
        const s = Math.max(12 * st.dpr, z * 0.8);
        kinds.slice(-3).forEach((k, i) => drawSticker(g, k, X - s * 0.55 - i * s * 0.7, Y + s * 0.2, s));
      }
    }

    function drawNight(g, v) {
      const { scene, z, level } = v;
      const world = scene.world;
      g.save();
      g.globalCompositeOperation = 'multiply';
      g.fillStyle = '#5a668f';
      for (const b of world.blocks) g.fillRect((b.gx * R.BLOCK - v.left) * z, (b.gy * R.BLOCK - v.top) * z, R.BLOCK * z + 1, R.BLOCK * z + 1);
      g.globalCompositeOperation = 'lighter';
      const [x0, y0, x1, y1] = viewRange(v, 3);
      const flicker = 0.92 + 0.08 * Math.sin(v.t * 7);
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const k = scene.kindAt(x, y);
          if (k === 'lantern' || k === 'lighthouse') {
            const cx = (x + 0.5 - v.left) * z, cy = (y + 0.5 - v.top) * z, r = Math.max(10 * st.dpr, z * (k === 'lighthouse' ? 4 : 2.6));
            const glow = g.createRadialGradient(cx, cy, 0, cx, cy, r);
            glow.addColorStop(0, `rgba(255, 200, 110, ${0.55 * flicker})`);
            glow.addColorStop(1, 'rgba(255, 200, 110, 0)');
            g.fillStyle = glow;
            g.fillRect(cx - r, cy - r, r * 2, r * 2);
            if (k === 'lighthouse' && level >= 1) {
              // A sweeping beam.
              const a = v.t * 1.1 + hash(x, y) * 6, len = z * 9;
              const beam = g.createRadialGradient(cx, cy, 0, cx, cy, len);
              beam.addColorStop(0, 'rgba(255, 236, 170, 0.5)');
              beam.addColorStop(1, 'rgba(255, 236, 170, 0)');
              g.fillStyle = beam;
              g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, len, a - 0.18, a + 0.18); g.closePath(); g.fill();
            }
          } else if (k === 'house' && level >= 1 && hash(x + 3, y) < 0.7 && scene.kindAt(x, y + 1) !== 'house') {
            // Lights on in most homes: the front windows glow and spill a little light outside.
            const p = scene.patchAt(x, y);
            if (p && p.wonder) continue;
            const kindAt = scene.kindAt;
            const m = (kindAt(x, y - 1) === 'house' ? 1 : 0) | (kindAt(x + 1, y) === 'house' ? 2 : 0) | (kindAt(x - 1, y) === 'house' ? 8 : 0);
            const [X, Y, W, H] = cellBox(v, x, y);
            const { door, windows } = cottageOpenings(kindAt, x, y, m, W);
            const wallTop = Y + H * 0.56, wallH = Y + H * 0.9 - wallTop;
            const lights = windows.length ? windows : door !== null ? [door] : [];
            for (const f of lights) {
              const wx = X + W * f, wy = wallTop + wallH * 0.45;
              const glow = g.createRadialGradient(wx, wy, 0, wx, wy, W * 0.55);
              glow.addColorStop(0, `rgba(255, 205, 120, ${0.5 * flicker})`);
              glow.addColorStop(1, 'rgba(255, 205, 120, 0)');
              g.fillStyle = glow;
              g.fillRect(wx - W * 0.55, wy - W * 0.55, W * 1.1, W * 1.1);
              g.fillStyle = 'rgba(255, 214, 140, 0.85)';
              if (windows.length) g.fillRect(wx - W * 0.075, wallTop + wallH * 0.24, W * 0.15, wallH * 0.42);
            }
          }
        }
      }
      // A show's gold thread glows.
      for (const s of st.shows) {
        if (!s.outline || v.t < s.t0) continue;
        threadPath(g, v, s);
        g.lineCap = 'round';
        g.strokeStyle = `rgba(255, 200, 100, ${0.35 * Math.min(1, (showEnd(s) - v.t) / 1.5)})`;
        g.lineWidth = Math.max(5, z * 0.5);
        g.stroke();
      }
      // A Stitchling in the spotlight (a Wonder's own, stepping out for the first time).
      for (const a of st.agents.values()) {
        if (!(a.spot > v.t)) continue;
        const cx = (a.x - v.left) * z, cy = (a.y - 0.3 - v.top) * z, r = Math.max(14 * st.dpr, z * 2.4);
        const glow = g.createRadialGradient(cx, cy, 0, cx, cy, r);
        glow.addColorStop(0, `rgba(255, 222, 150, ${0.6 * Math.min(1, (a.spot - v.t) / 1.5)})`);
        glow.addColorStop(1, 'rgba(255, 222, 150, 0)');
        g.fillStyle = glow;
        g.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
      g.restore();
    }

    function pill(g, text, cx, cy, bg, fg, size, dashed) {
      g.font = `700 ${size}px ${FONT}`;
      const w = g.measureText(text).width + size * 1.4, h = size * 1.9;
      g.fillStyle = 'rgba(30, 22, 14, 0.25)';
      g.beginPath(); roundRect(g, cx - w / 2, cy - h / 2 + 2, w, h, h / 2); g.fill();
      g.fillStyle = bg;
      g.beginPath(); roundRect(g, cx - w / 2, cy - h / 2, w, h, h / 2); g.fill();
      if (dashed) {
        g.setLineDash([size * 0.4, size * 0.3]);
        g.strokeStyle = 'rgba(80, 70, 60, 0.6)';
        g.lineWidth = Math.max(1, size * 0.1);
        g.stroke();
        g.setLineDash([]);
      }
      g.fillStyle = fg;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(text, cx, cy + 1);
    }

    function drawLabels(g, v) {
      const { scene, z } = v;
      const zc = z / st.dpr;
      const world = scene.world;
      const px = (n) => Math.round(n * st.dpr);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineJoin = 'round';
      if (zc < 14) {
        for (const b of world.blocks) {
          const cx = (b.gx * R.BLOCK + R.BLOCK / 2 - v.left) * z;
          const cy = (b.gy * R.BLOCK + (b.kind === 'commons' ? 4 : R.BLOCK / 2) - v.top) * z;
          if (cx < -400 || cy < -100 || cx > v.w + 400 || cy > v.h + 100) continue;
          const size = Math.max(13, Math.min(28, zc * 3.4));
          g.font = `800 ${px(size)}px ${FONT}`;
          g.lineWidth = px(5);
          g.strokeStyle = 'rgba(255, 255, 255, 0.92)';
          g.fillStyle = '#3d2e22';
          g.strokeText(b.name, cx, cy);
          g.fillText(b.name, cx, cy);
          const homes = b.kind === 'neighborhood' ? [...world.plotOwners.keys()].filter((k) => Math.floor(k / 100) === b.id).length : 0;
          const cozy = scene.cozy && scene.cozy.get(b.id);
          const parts = b.kind === 'commons' ? ['Everyone builds here'] : [`${homes} ${homes === 1 ? 'home' : 'homes'}`];
          if (cozy) parts.push(`Cozy ${cozy.score}`);
          const sub = parts.join(' · ');
          g.font = `600 ${px(Math.max(10, size * 0.5))}px ${FONT}`;
          g.lineWidth = px(4);
          g.strokeText(sub, cx, cy + px(size * 0.85));
          g.fillStyle = '#6a5442';
          g.fillText(sub, cx, cy + px(size * 0.85));
        }
      }
      // Wonders and lots.
      if (zc > 2 && zc < 40) {
        for (const won of world.wonders) {
          const bp = R.BLUEPRINTS[won.blueprint];
          const cx = (won.x + bp.rows[0].length / 2 - v.left) * z, cy = (won.y - v.top) * z - px(16);
          if (cx < -300 || cy < -60 || cx > v.w + 300 || cy > v.h + 60) continue;
          if (won.status === 'founding') pill(g, `${bp.name} · founders ${won.founders.length}/${R.FOUNDERS_NEEDED}`, cx, cy, '#fffdf6', '#3d2e22', px(12), true);
          else if (won.completedAt) pill(g, `${bp.name} · finished`, cx, cy, PAL.gold, '#3d2e22', px(12));
          else pill(g, `${bp.name} · ${won.filled}/${won.slots}`, cx, cy, '#ffffff', '#3d2e22', px(12));
        }
        if (zc > 5 && zc < 26) {
          for (const b of world.blocks) {
            if (b.kind !== 'commons') continue;
            for (let lot = 0; lot < R.LOTS.length; lot++) {
              if (R.wonderInLot(world, b.id, lot)) continue;
              const r = R.lotRect(b, lot);
              const cx = (r.x + r.w / 2 - v.left) * z, cy = (r.y + r.h / 2 - v.top) * z;
              if (cx < -200 || cy < -60 || cx > v.w + 200 || cy > v.h + 60) continue;
              g.font = `700 ${px(12)}px ${FONT}`;
              g.fillStyle = 'rgba(104, 80, 56, 0.6)';
              g.fillText('Wonder lot', cx, cy);
            }
          }
        }
      }
      const home = scene.homeRect;
      if (home && zc >= 4) {
        const cx = (home.x + home.w / 2 - v.left) * z, cy = (home.y - v.top) * z - px(11);
        pill(g, 'Your home', cx, cy, PAL.mine, '#ffffff', px(12));
      }
      if (zc >= 26) {
        g.font = `700 ${px(11)}px ${FONT}`;
        g.textAlign = 'left';
        for (const [key, id] of world.plotOwners) {
          if (id === scene.myId) continue;
          const p = world.players.get(id);
          const b = R.blockById(world, Math.floor(key / 100));
          if (!p || !b) continue;
          const r = R.plotRect(b, key % 100);
          const X = (r.x - v.left) * z, Y = (r.y - v.top) * z;
          if (X < -200 || Y < -40 || X > v.w || Y > v.h) continue;
          g.lineWidth = px(3);
          g.strokeStyle = 'rgba(255, 255, 255, 0.9)';
          g.fillStyle = scene.friends && scene.friends.has(id) ? PAL.mine : '#5b4636';
          const label = scene.friends && scene.friends.has(id) ? `${p.name} · friend` : p.name;
          g.strokeText(label, X + px(4), Y - px(6));
          g.fillText(label, X + px(4), Y - px(6));
          if (R.isClub(p, scene.now)) {
            // A Quiltopia Club member: a little gold star after the name.
            const sx = X + px(4) + g.measureText(label).width + px(5);
            g.strokeText('★', sx, Y - px(6));
            g.fillStyle = '#d9a514';
            g.fillText('★', sx, Y - px(6));
          }
        }
        g.textAlign = 'center';
      }
    }

    // The quilt's binding: drawn under the Blocks so it shows only around the outside.
    function drawBindingUnder(g, v) {
      const { scene, z } = v;
      const bw = Math.max(5 * st.dpr, z * 0.9);
      g.fillStyle = PAL.binding;
      for (const b of scene.world.blocks) {
        const X = (b.gx * R.BLOCK - v.left) * z, Y = (b.gy * R.BLOCK - v.top) * z, S = R.BLOCK * z;
        g.beginPath();
        roundRect(g, X - bw, Y - bw, S + bw * 2, S + bw * 2, bw);
        g.fill();
      }
    }

    function drawBindingOver(g, v) {
      const { scene, z } = v;
      const world = scene.world;
      const bw = Math.max(5 * st.dpr, z * 0.9);
      const has = (gx, gy) => gx >= 0 && gy >= 0 && gx < world.BW && gy < world.BH && world.blockGrid[gy * world.BW + gx];
      const stitches = new Path2D(), seams = new Path2D();
      for (const b of world.blocks) {
        const X = (b.gx * R.BLOCK - v.left) * z, Y = (b.gy * R.BLOCK - v.top) * z, S = R.BLOCK * z, o = bw / 2;
        if (!has(b.gx, b.gy - 1)) { stitches.moveTo(X - o, Y - o); stitches.lineTo(X + S + o, Y - o); }
        if (!has(b.gx + 1, b.gy)) { stitches.moveTo(X + S + o, Y - o); stitches.lineTo(X + S + o, Y + S + o); } else { seams.moveTo(X + S, Y); seams.lineTo(X + S, Y + S); }
        if (!has(b.gx, b.gy + 1)) { stitches.moveTo(X - o, Y + S + o); stitches.lineTo(X + S + o, Y + S + o); } else { seams.moveTo(X, Y + S); seams.lineTo(X + S, Y + S); }
        if (!has(b.gx - 1, b.gy)) { stitches.moveTo(X - o, Y - o); stitches.lineTo(X - o, Y + S + o); }
      }
      g.strokeStyle = PAL.bindingStitch;
      g.lineWidth = Math.max(1, bw * 0.12);
      g.setLineDash([bw * 0.5, bw * 0.4]);
      g.stroke(stitches);
      g.strokeStyle = PAL.seam;
      g.lineWidth = Math.max(1, z * 0.12);
      g.setLineDash([Math.max(3, z * 0.5), Math.max(2, z * 0.35)]);
      g.stroke(seams);
      g.setLineDash([]);
    }

    // ---------- Stitchlings living their lives ----------

    function walkable(scene, x, y) {
      const w = scene.world;
      if (x < 0 || y < 0 || x >= w.W || y >= w.H || !R.blockAt(w, x, y)) return false;
      const k = scene.worldKindAt(x, y);
      return !k || k === 'path' || k === 'garden' || k === 'park' || k === 'bench' || k === 'flowerpot';
    }

    // Recomputes who lives where (at most a few times a second, unless forced).
    function refreshPopulation(scene, t, force) {
      const world = scene.world;
      if (st.popVersion === world.version && st.popNight === !!scene.night && st.popWorld === world) return;
      if (!force && t - st.popAt < 0.4 && st.popWorld === world) return;
      st.popVersion = world.version;
      st.popNight = !!scene.night;
      st.popAt = t;
      if (st.popWorld !== world) { st.popWorld = world; st.agents.clear(); }
      st.homes = root.QuiltStitchlings.homes(world);
      st.sites = root.QuiltStitchlings.rareSites(world, { night: scene.night });
      st.homeIndex = new Map(st.homes.map((h) => [h.key, h]));
      for (const h of st.homes) {
        if (!st.knownHomes.has(h.key)) {
          if (st.populated) st.newHomes.add(h.key);
          st.knownHomes.add(h.key);
        }
      }
      st.populated = true;
      for (const [id, a] of st.agents) {
        const gone = a.homeKey != null ? !st.homeIndex.has(a.homeKey) : !st.sites.some((s) => s.species === a.species && s.x === a.sx && s.y === a.sy);
        if (gone) st.agents.delete(id);
      }
    }

    function spawn(scene, id, species, startCells, extra, t) {
      const starts = [];
      for (const c of startCells) for (const [dx, dy] of R.N4) if (walkable(scene, c.x + dx, c.y + dy)) starts.push([c.x + dx, c.y + dy]);
      if (!starts.length) return;
      const [x, y] = starts[Math.floor(Math.random() * starts.length)];
      st.agents.set(id, Object.assign({
        id, species, cx: x, cy: y, x: x + 0.5, y: y + 0.5, tx: x, ty: y, px: x, py: y,
        speed: 0.8 + Math.random() * 0.6, wait: Math.random() * 2, nap: false, phase: Math.random() * 6, face: 1,
        emote: null, hop: 0, born: t,
      }, extra));
    }

    function syncAgents(scene, v, t) {
      if (v.z / st.dpr < 10) return;
      const m = 14;
      const x0 = v.left - m, y0 = v.top - m, x1 = v.left + v.w / v.z + m, y1 = v.top + v.h / v.z + m;
      for (const h of st.homes) {
        if (h.anchor.x < x0 || h.anchor.x > x1 || h.anchor.y < y0 || h.anchor.y > y1) continue;
        const greet = st.newHomes.has(h.key);
        h.residents.forEach((res) => {
          if (st.agents.has(res.id)) return;
          spawn(scene, res.id, res.species, h.cells, { homeKey: h.key, owner: h.owner, ax: h.anchor.x, ay: h.anchor.y, leash: 9, mood: h.needs.mood }, t);
          const a = st.agents.get(res.id);
          if (a && greet) { a.emote = { text: 'Hi!', until: t + 3 }; a.hop = t + 0.6; a.wait = 2.5; }
        });
        if (greet) st.newHomes.delete(h.key);
        // Moods change as neighbors build: keep them current.
        for (const res of h.residents) { const a = st.agents.get(res.id); if (a) a.mood = h.needs.mood; }
      }
      for (const s of st.sites) {
        if (s.x < x0 || s.x > x1 || s.y < y0 || s.y > y1) continue;
        const id = `rare:${s.species}:${s.x},${s.y}`;
        if (!st.agents.has(id)) spawn(scene, id, s.species, [{ x: s.x, y: s.y }], { sx: s.x, sy: s.y, ax: s.x, ay: s.y, leash: 3, rare: true, mood: 3 }, t);
      }
      for (const [id, a] of st.agents) if (a.x < x0 - 24 || a.x > x1 + 24 || a.y < y0 - 24 || a.y > y1 + 24) st.agents.delete(id);
    }

    function updateAgents(scene, dt, t) {
      for (const a of st.agents.values()) {
        // A Stitchling that wants to meet you stays put and waves until you tap it.
        if (a.beckon) {
          if (t >= (a.nextHop || 0)) { a.hop = t + 0.6; a.nextHop = t + 1.6; a.emote = { text: a.beckon, until: t + 1.5 }; }
          continue;
        }
        if (a.wait > 0) { a.wait -= dt; if (a.wait <= 0) a.nap = false; continue; }
        const dx = a.tx + 0.5 - a.x, dy = a.ty + 0.5 - a.y, d = Math.hypot(dx, dy);
        const step = a.speed * dt * (scene.worldKindAt(a.tx, a.ty) === 'path' ? 1.3 : 0.8);
        if (d > step) { a.x += (dx / d) * step; a.y += (dy / d) * step; if (dx) a.face = dx < 0 ? -1 : 1; continue; }
        a.x = a.tx + 0.5; a.y = a.ty + 0.5;
        a.px = a.cx; a.py = a.cy; a.cx = a.tx; a.cy = a.ty;
        // Visiting a neighbor: along the paths to their door, a hello, then back home the same way.
        if (a.route) {
          if (a.route.length) { [a.tx, a.ty] = a.route.shift(); continue; }
          a.route = null;
          if (a.trip === 'there') {
            a.trip = 'back';
            a.wait = 2.6; a.hop = t + 0.6; a.emote = { text: 'Hi!', until: t + 2.4 };
            const h = st.homeIndex.get(a.homeKey);
            a.route = h ? ST.routeAlongPaths(scene.world, a.cx, a.cy, a.owner, h) : null;
            continue;
          }
          a.trip = null;
        }
        if (!a.trip && a.homeKey != null && Math.random() < 0.05) {
          const h = st.homeIndex.get(a.homeKey);
          const route = h && h.needs.visit && ST.routeAlongPaths(scene.world, a.cx, a.cy, a.owner);
          if (route && route.length) { a.trip = 'there'; a.route = route; [a.tx, a.ty] = a.route.shift(); continue; }
        }
        const around = (k) => R.N4.some(([ax, ay]) => scene.worldKindAt(a.cx + ax, a.cy + ay) === k);
        const here = scene.worldKindAt(a.cx, a.cy);
        // Little moments: naps on benches and in the shade, snacks in gardens, dancing by fountains.
        if (here === 'bench' || (around('bench') && Math.random() < 0.5)) { a.wait = 4 + Math.random() * 5; a.nap = true; continue; }
        if (around('fountain') && Math.random() < 0.35) { a.wait = 2.5; a.emote = { text: '♪', until: t + 2.5 }; a.hop = t + 0.4; continue; }
        if (here === 'garden' && a.mood >= 1 && Math.random() < 0.3) { a.wait = 1.8; a.emote = { text: '♥', until: t + 1.8 }; continue; }
        if (around('tree') && Math.random() < 0.12) { a.wait = 4 + Math.random() * 5; a.nap = true; continue; }
        if (Math.random() < 0.08) { a.wait = 1 + Math.random() * 2.5; continue; }
        const options = [];
        for (const [ax, ay] of R.N4) {
          const nx = a.cx + ax, ny = a.cy + ay;
          if (!walkable(scene, nx, ny) || (nx === a.px && ny === a.py)) continue;
          const far = Math.abs(nx - a.ax) + Math.abs(ny - a.ay);
          if (far > a.leash && far >= Math.abs(a.cx - a.ax) + Math.abs(a.cy - a.ay)) continue; // stay near home, or head back to it
          const k = scene.worldKindAt(nx, ny);
          const weight = k === 'path' ? 6 : k === 'garden' || k === 'park' ? 3 : 1;
          for (let i = 0; i < weight; i++) options.push([nx, ny]);
        }
        const next = options.length ? options[Math.floor(Math.random() * options.length)] : [a.px, a.py];
        a.tx = next[0]; a.ty = next[1];
      }
    }

    function drawAgents(g, v) {
      const { z, level, scene } = v;
      if (z / st.dpr < 10) return;
      for (const a of st.agents.values()) {
        const cx = (a.x - v.left) * z, cy = (a.y - v.top) * z;
        if (cx < -z || cy < -z || cx > v.w + z || cy > v.h + z) continue;
        const r = Math.max(3 * st.dpr, z * (a.rare ? 0.24 : 0.2));
        const hop = a.hop > v.t ? Math.sin(((a.hop - v.t) / 0.6) * Math.PI) * z * 0.35 : 0;
        const bob = a.wait > 0 ? 0 : Math.abs(Math.sin(v.t * 9 + a.phase)) * z * 0.05;
        const y = cy - bob - hop;
        g.fillStyle = 'rgba(40, 28, 18, 0.18)';
        g.beginPath(); g.ellipse(cx, cy + r * 0.85, r * 0.8, r * 0.3, 0, 0, Math.PI * 2); g.fill();
        const outfit = a.owner ? scene.outfitOf(a.owner) : null;
        drawStitchling(g, a.species, cx, y, r, { face: a.face, nap: a.nap, outfit, level, t: v.t, phase: a.phase, happy: a.mood >= 2 });
        if (level === 2 && a.nap) {
          g.fillStyle = '#3a2a20';
          g.font = `700 ${Math.round(r * 0.9)}px ${FONT}`;
          g.fillText('z', cx + r * 1.1, y - r * 1.1 - Math.sin(v.t * 2 + a.phase) * r * 0.2);
        }
        if (a.emote && a.emote.until > v.t) {
          const s = Math.max(10 * st.dpr, r * 1.1);
          g.font = `800 ${Math.round(s * 0.8)}px ${FONT}`;
          const w = g.measureText(a.emote.text).width + s * 0.6;
          g.fillStyle = '#ffffff';
          g.strokeStyle = 'rgba(40, 28, 18, 0.35)';
          g.lineWidth = Math.max(1, st.dpr);
          g.beginPath(); roundRect(g, cx - w / 2, y - r * 1.6 - s, w, s, s / 2); g.fill(); g.stroke();
          g.fillStyle = a.emote.text === '♥' ? '#ec5f8a' : '#1d2639';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText(a.emote.text, cx, y - r * 1.6 - s / 2 + 1);
        } else if (level === 2 && a.owner && a.owner === scene.myId && !a.nap && !a.beckon && a.id.endsWith(',0')) {
          // Your own Stitchlings show what they wish for (one bubble per home).
          const h = st.homeIndex.get(a.homeKey);
          const need = h && WISH_ORDER.find((n) => !h.needs[n]);
          if (need) drawWish(g, need, cx + r * 1.35, y - r * 2.6 + Math.sin(v.t * 2 + a.phase) * r * 0.12, Math.max(15 * st.dpr, r * 1.9));
        }
      }
    }

    // A thought bubble holding what a Stitchling wishes for: a garden, a park or a path.
    const WISH_ORDER = ['food', 'fun', 'path', 'visit'];
    const WISH_ICON = { food: ['garden', '#4f8a3a'], fun: ['park', '#d9822b'], path: ['path', '#9a7442'], visit: ['house', '#2f5bd3'] };
    function drawWish(g, need, bx, by, s) {
      const [kind, color] = WISH_ICON[need];
      g.fillStyle = '#ffffff';
      g.strokeStyle = 'rgba(40, 28, 18, 0.35)';
      g.lineWidth = Math.max(1, st.dpr);
      for (const [dx, dy, pr] of [[-0.62, 0.66, 0.1], [-0.38, 0.42, 0.15], [0, 0, 0.5]]) {
        g.beginPath(); g.arc(bx + dx * s, by + dy * s, pr * s, 0, Math.PI * 2); g.fill(); g.stroke();
      }
      g.strokeStyle = color;
      g.lineWidth = Math.max(1.3 * st.dpr, s * 0.1);
      g.lineCap = 'round';
      drawIcon(g, kind, bx, by, s * 0.72);
      g.lineCap = 'butt';
    }

    // ---------- Reactions to a tap, sparks, petals ----------

    function react(x, y, kind, t) {
      st.effects.push({ type: kind === 'water' ? 'ripple' : kind === 'tree' ? 'leaves' : kind === 'cherry' ? 'petals' : kind === 'lantern' ? 'glow' : 'sparkle', x, y, t0: t });
      // Residents of a tapped house come out to say hello.
      if (kind === 'house') {
        for (const a of st.agents.values()) {
          const h = a.homeKey != null && st.homeIndex.get(a.homeKey);
          if (h && h.cells.some((c) => c.x === x && c.y === y)) { a.hop = t + 0.6; a.emote = { text: 'Hi!', until: t + 1.8 }; a.wait = 1.6; }
        }
      }
    }

    function stickerPop(kind, x, y, t) { st.effects.push({ type: 'sticker', kind, x, y, t0: t }); }

    // A little "+10 XP" that floats up from where something good happened. delay staggers a second one.
    function rewardPop(x, y, text, t, opts) {
      opts = opts || {};
      st.effects.push({ type: 'reward', text, x, y, t0: t + (opts.delay || 0), row: opts.row || 0, color: opts.color || '#fff1c9', ink: opts.ink || '#6b4510' });
    }

    function beckon(agent, text) {
      if (!text && !agent.beckon) return;
      agent.beckon = text || null;
      agent.nextHop = 0;
      if (!text) agent.emote = null;
    }

    function drawEffects(g, v) {
      const { z } = v;
      st.effects = st.effects.filter((e) => v.t - e.t0 < 1.6);
      for (const e of st.effects) {
        const age = v.t - e.t0, cx = (e.x + 0.5 - v.left) * z, cy = (e.y + 0.5 - v.top) * z;
        if (age < 0) continue;
        if (e.type === 'reward') {
          const a = Math.min(1, age / 1.5);
          const size = Math.min(17 * st.dpr, Math.max(12 * st.dpr, z * 0.42));
          const pop = a < 0.1 ? 0.5 + (a / 0.1) * 0.65 : a < 0.18 ? 1.15 - ((a - 0.1) / 0.08) * 0.15 : 1;
          const fs = Math.round(size * pop);
          g.globalAlpha = a > 0.72 ? (1 - a) / 0.28 : 1;
          g.font = `800 ${fs}px ${FONT}`;
          // A second reward (row 1) rides just under the first.
          const w = g.measureText(e.text).width + fs * 0.9, h = fs * 1.55, y = cy - z * 0.55 - a * z * 1.2 + e.row * size * 1.75;
          g.fillStyle = e.color;
          g.strokeStyle = e.ink;
          g.lineWidth = Math.max(1, st.dpr * 1.2);
          g.beginPath(); roundRect(g, cx - w / 2, y - h / 2, w, h, h / 2); g.fill(); g.stroke();
          g.fillStyle = e.ink;
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText(e.text, cx, y + fs * 0.06);
          g.globalAlpha = 1;
        } else if (e.type === 'ripple') {
          for (let k = 0; k < 3; k++) {
            const a = age - k * 0.18;
            if (a < 0 || a > 1) continue;
            g.strokeStyle = `rgba(255, 255, 255, ${0.8 * (1 - a)})`;
            g.lineWidth = Math.max(1.5, z * 0.06);
            g.beginPath(); g.ellipse(cx, cy, z * (0.2 + a * 1.1), z * (0.12 + a * 0.7), 0, 0, Math.PI * 2); g.stroke();
          }
        } else if (e.type === 'leaves' || e.type === 'petals') {
          for (let k = 0; k < 8; k++) {
            const a = Math.min(1, age / 1.4);
            const px = cx + Math.sin(k * 2.3 + age * 3) * z * 0.5 + (k - 4) * z * 0.08;
            const py = cy - z * 0.2 + a * z * 1.2 + k * z * 0.05;
            g.fillStyle = e.type === 'leaves' ? `rgba(90, 160, 74, ${1 - a})` : `rgba(255, 190, 210, ${1 - a})`;
            g.beginPath(); g.ellipse(px, py, z * 0.09, z * 0.05, k + age * 4, 0, Math.PI * 2); g.fill();
          }
        } else if (e.type === 'glow') {
          const a = Math.min(1, age / 1.2);
          const r = z * (0.6 + a * 1.4);
          const gl = g.createRadialGradient(cx, cy, 0, cx, cy, r);
          gl.addColorStop(0, `rgba(255, 220, 120, ${0.7 * (1 - a)})`);
          gl.addColorStop(1, 'rgba(255, 220, 120, 0)');
          g.fillStyle = gl;
          g.fillRect(cx - r, cy - r, r * 2, r * 2);
        } else if (e.type === 'sticker') {
          const a = Math.min(1, age / 1.4);
          const s = Math.max(16 * st.dpr, z * 1.1) * (a < 0.2 ? a / 0.2 * 1.2 : 1.2 - (a - 0.2) * 0.25);
          g.globalAlpha = a > 0.7 ? (1 - a) / 0.3 : 1;
          drawSticker(g, e.kind, cx, cy - a * z * 1.5, s);
          g.globalAlpha = 1;
        } else {
          for (let k = 0; k < 5; k++) {
            const a = Math.min(1, age / 0.9);
            const ang = k * 1.256 + e.x;
            const d = z * (0.2 + a * 0.7);
            g.fillStyle = `rgba(255, 236, 160, ${1 - a})`;
            g.beginPath(); g.arc(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, Math.max(1.5, z * 0.07) * (1 - a), 0, Math.PI * 2); g.fill();
          }
        }
      }
    }

    // Petals drift from cherry trees you can see up close.
    function updatePetals(scene, v, dt) {
      if (v.level < 2) { st.petals.length = 0; return; }
      if (st.petals.length < 40 && Math.random() < 0.3) {
        const [x0, y0, x1, y1] = viewRange(v, 0);
        for (let tries = 0; tries < 6; tries++) {
          const x = x0 + Math.floor(Math.random() * (x1 - x0 + 1)), y = y0 + Math.floor(Math.random() * (y1 - y0 + 1));
          if (scene.worldKindAt(x, y) === 'cherry') { st.petals.push({ x: x + Math.random(), y: y + Math.random() * 0.5, life: 3 + Math.random() * 2, spin: Math.random() * 6 }); break; }
        }
      }
      for (const p of st.petals) { p.x += dt * 0.35; p.y += dt * 0.45; p.spin += dt * 3; p.life -= dt; }
      st.petals = st.petals.filter((p) => p.life > 0);
    }

    function drawPetals(g, v) {
      g.fillStyle = 'rgba(255, 196, 214, 0.9)';
      for (const p of st.petals) {
        g.beginPath();
        g.ellipse((p.x - v.left) * v.z, (p.y - v.top) * v.z, v.z * 0.08, v.z * 0.045, p.spin, 0, Math.PI * 2);
        g.fill();
      }
    }

    // ---------- Wonder shows ----------

    // A show over a Wonder, or over any area ({ x, y, w, h }). opts.trace: seconds a gold thread
    // takes to run around a finished Wonder first; the fireworks start with a volley as it's tied off.
    function celebrate(won, t, opts) {
      const trace = (won.blueprint && opts && opts.trace) || 0;
      st.shows.push({ won, t0: t, next: t + trace, trace, outline: trace ? wonderOutline(won) : null });
    }
    const showEnd = (s) => s.t0 + s.trace + 9;

    // The edge of a Wonder as square-sized segments, in order clockwise from the top (so a thread can
    // run around it), and its squares.
    function wonderOutline(won) {
      const rows = R.BLUEPRINTS[won.blueprint].rows;
      const inside = (x, y) => y >= 0 && y < rows.length && x >= 0 && x < rows[y].length && rows[y][x] !== '.';
      const cx = rows[0].length / 2, cy = rows.length / 2, segs = [], cells = [];
      for (let y = 0; y < rows.length; y++) {
        for (let x = 0; x < rows[y].length; x++) {
          if (!inside(x, y)) continue;
          cells.push([won.x + x, won.y + y]);
          if (!inside(x, y - 1)) segs.push([x, y, x + 1, y]);
          if (!inside(x + 1, y)) segs.push([x + 1, y, x + 1, y + 1]);
          if (!inside(x, y + 1)) segs.push([x + 1, y + 1, x, y + 1]);
          if (!inside(x - 1, y)) segs.push([x, y + 1, x, y]);
        }
      }
      const turn = (q) => (Math.atan2((q[1] + q[3]) / 2 - cy, (q[0] + q[2]) / 2 - cx) + Math.PI * 2.5) % (Math.PI * 2);
      segs.sort((a, b) => turn(a) - turn(b));
      return { segs: segs.map((q) => [won.x + q[0], won.y + q[1], won.x + q[2], won.y + q[3]]), cells };
    }

    function burst(x, y, n, speed) {
      const color = PAL.sparks[Math.floor(Math.random() * PAL.sparks.length)];
      for (let k = 0; k < n; k++) {
        const a = Math.random() * Math.PI * 2, sp = speed * (0.75 + Math.random());
        st.sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.5, life: 1.2 + Math.random() * 0.6, color });
      }
    }

    // Gold and pink sparkles in a ring around a point: a Stitchling stepping out for the first time.
    function sparkle(x, y) {
      for (let k = 0; k < 30; k++) {
        const a = (k / 30) * Math.PI * 2, sp = 1.8 + Math.random() * 1.4;
        st.sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.2, life: 0.8 + Math.random() * 0.5, color: k % 3 ? '#ffd56b' : '#ff8fb1' });
      }
    }

    function updateShows(t, dt) {
      for (const s of st.shows) {
        if (t > showEnd(s)) continue;
        const bp = s.won.blueprint && R.BLUEPRINTS[s.won.blueprint];
        const w = s.won.w || bp.rows[0].length, h = s.won.h || bp.rows.length;
        const short = !bp && t - s.t0 > 3; // smaller celebrations end sooner
        if (s.trace && !s.volley && t >= s.t0 + s.trace) {
          s.volley = true;
          for (let k = 0; k < 4; k++) burst(s.won.x + (k + 0.5) * (w / 4), s.won.y - 1 + Math.random() * h * 0.4, 40, 4.5);
        }
        while (t >= s.next && !short) {
          s.next += 0.35 + Math.random() * 0.3;
          burst(s.won.x + Math.random() * w, s.won.y - 2 + Math.random() * h * 0.7, 34, 3.5);
        }
      }
      st.shows = st.shows.filter((s) => t <= showEnd(s));
      for (const p of st.sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 4 * dt; p.vx *= 0.985; p.life -= dt; }
      st.sparks = st.sparks.filter((p) => p.life > 0);
    }

    // Sparks glow at night; by day they're confetti with a dark edge, since glowing on pale fabric washes out.
    function drawSparks(g, v) {
      if (!st.sparks.length) return;
      const night = v.scene && v.scene.night;
      const r = Math.max(1.6 * st.dpr, v.z * 0.1);
      g.save();
      if (night) g.globalCompositeOperation = 'lighter';
      else { g.strokeStyle = 'rgba(60, 40, 24, 0.55)'; g.lineWidth = Math.max(1, st.dpr); }
      for (const p of st.sparks) {
        g.globalAlpha = Math.min(1, p.life);
        g.fillStyle = night || p.color !== '#ffffff' ? p.color : '#7fb2ff';
        g.beginPath();
        g.arc((p.x - v.left) * v.z, (p.y - v.top) * v.z, night ? r : r * 1.15, 0, Math.PI * 2);
        g.fill();
        if (!night) g.stroke();
      }
      g.restore();
    }

    // The part of a show's thread stitched so far, as a path. Returns how many segments that is.
    function threadPath(g, v, s) {
      const segs = s.outline.segs, n = Math.ceil(segs.length * Math.min(1, (v.t - s.t0) / s.trace));
      g.beginPath();
      for (let i = 0; i < n; i++) {
        const q = segs[i];
        g.moveTo((q[0] - v.left) * v.z, (q[1] - v.top) * v.z);
        g.lineTo((q[2] - v.left) * v.z, (q[3] - v.top) * v.z);
      }
      return n;
    }

    // The gold thread running around a finished Wonder (a needle's glint at its tip), then a sheen of
    // light crossing the squares as it's tied off. Both fade with the fireworks.
    function drawShows(g, v) {
      const z = v.z;
      for (const s of st.shows) {
        if (!s.outline) continue;
        const age = v.t - s.t0, fade = Math.min(1, (showEnd(s) - v.t) / 1.5);
        if (age < 0 || fade <= 0) continue;
        const sx = (x) => (x - v.left) * z, sy = (y) => (y - v.top) * z;
        g.save();
        g.globalAlpha = fade;
        const sweep = (age - s.trace) / 1.3;
        if (sweep > 0 && sweep < 1) {
          const bp = R.BLUEPRINTS[s.won.blueprint], W = bp.rows[0].length * z, H = bp.rows.length * z;
          const band = Math.max(W, H) * 0.22, along = (W + H) * sweep - band;
          const x0 = sx(s.won.x) + along, y0 = sy(s.won.y);
          const grad = g.createLinearGradient(x0 - band, y0, x0 + band, y0 + band);
          grad.addColorStop(0, 'rgba(255, 244, 200, 0)');
          grad.addColorStop(0.5, 'rgba(255, 244, 200, 0.55)');
          grad.addColorStop(1, 'rgba(255, 244, 200, 0)');
          g.save();
          g.beginPath();
          for (const [x, y] of s.outline.cells) g.rect(sx(x), sy(y), z + 0.5, z + 0.5);
          g.clip();
          g.fillStyle = grad;
          g.fillRect(sx(s.won.x), sy(s.won.y), W, H);
          g.restore();
        }
        const segs = s.outline.segs, n = threadPath(g, v, s);
        g.lineCap = 'round';
        g.strokeStyle = `rgba(255, 210, 110, ${0.3 + 0.12 * Math.sin(age * 5)})`;
        g.lineWidth = Math.max(4, z * 0.34);
        g.stroke();
        g.setLineDash([Math.max(3, z * 0.34), Math.max(2, z * 0.16)]);
        g.strokeStyle = '#c98a12';
        g.lineWidth = Math.max(2, z * 0.13);
        g.stroke();
        g.setLineDash([]);
        if (n && n < segs.length) {
          const q = segs[n - 1], x = sx(q[2]), y = sy(q[3]), r = Math.max(5, z * 0.38);
          g.fillStyle = '#fffbe8';
          g.beginPath();
          for (let k = 0; k < 8; k++) {
            const a = (k / 8) * Math.PI * 2, d = k % 2 ? r * 0.28 : r;
            g.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
          }
          g.fill();
        }
        g.restore();
      }
    }

    // ---------- Cached Block pictures for the far zoom levels ----------

    function cacheFor(block, scene) {
      let c = st.caches.get(block.id);
      if (!c) {
        const canvas2 = document.createElement('canvas');
        canvas2.width = canvas2.height = R.BLOCK * CACHE_RES;
        c = { canvas: canvas2, dirty: true, drawn: false };
        st.caches.set(block.id, c);
      }
      // A Block that has never been drawn is drawn right away; later changes redraw one Block per frame.
      if (c.dirty && (!c.drawn || !st.rebuiltThisFrame)) {
        st.rebuiltThisFrame = true;
        c.dirty = false;
        c.drawn = true;
        const g = c.canvas.getContext('2d');
        if (!st.cacheWeave) st.cacheWeave = makePattern(g, 'rgba(90, 70, 40, 0.05)', 8);
        const cacheScene = Object.assign({}, scene, { kindAt: scene.worldKindAt, validAt: null, homeRect: null, kit: null });
        g.clearRect(0, 0, c.canvas.width, c.canvas.height);
        drawView(g, { scene: cacheScene, left: block.gx * R.BLOCK, top: block.gy * R.BLOCK, z: CACHE_RES, w: c.canvas.width, h: c.canvas.height, level: 1, t: 0, cache: true });
      }
      return c.canvas;
    }

    function markDirty(world, x, y) {
      const mark = (gx, gy) => {
        const b = R.blockAt(world, gx * R.BLOCK, gy * R.BLOCK);
        if (b && st.caches.has(b.id)) st.caches.get(b.id).dirty = true;
      };
      const gx = Math.floor(x / R.BLOCK), gy = Math.floor(y / R.BLOCK);
      mark(gx, gy);
      const lx = x % R.BLOCK, ly = y % R.BLOCK;
      if (lx === 0) mark(gx - 1, gy);
      if (lx === R.BLOCK - 1) mark(gx + 1, gy);
      if (ly === 0) mark(gx, gy - 1);
      if (ly === R.BLOCK - 1) mark(gx, gy + 1);
    }

    function markAllDirty() { for (const c of st.caches.values()) c.dirty = true; }

    // ---------- One frame ----------
    // cam: { x, y, z (CSS px per square), ax, ay (where on screen the camera point sits, CSS px) }
    // opts.noCache draws every patch even far away (used by the time-lapse).

    function frame(scene, cam, t, dt, opts) {
      opts = opts || {};
      resize();
      const dpr = st.dpr;
      const z = cam.z * dpr;
      if (!st.weave) {
        st.weave = makePattern(ctx, 'rgba(90, 70, 40, 0.05)', 8);
        st.tablePattern = makePattern(ctx, PAL.tableLine, 10);
      }
      const v = {
        scene, z, w: canvas.width, h: canvas.height, t,
        left: cam.x - (cam.ax * dpr) / z, top: cam.y - (cam.ay * dpr) / z,
        level: cam.z >= LOD.STREET ? 2 : cam.z >= LOD.REGION ? 1 : 0,
      };
      st.lastView = v;
      st.rebuiltThisFrame = false;
      if (!opts.noLife) {
        refreshPopulation(scene, t);
        syncAgents(scene, v, t);
        updateAgents(scene, dt, t);
        updatePetals(scene, v, dt);
      }
      updateShows(t, dt);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = PAL.table;
      ctx.fillRect(0, 0, v.w, v.h);
      ctx.fillStyle = st.tablePattern;
      ctx.fillRect(0, 0, v.w, v.h);
      drawBindingUnder(ctx, v);

      if (z <= CACHE_RES && !opts.noCache) {
        // Far away: pre-drawn pictures of each Block, plus the live bits on top.
        ctx.imageSmoothingEnabled = true;
        for (const b of scene.world.blocks) {
          const X = (b.gx * R.BLOCK - v.left) * z, Y = (b.gy * R.BLOCK - v.top) * z, S = R.BLOCK * z;
          if (X > v.w || Y > v.h || X + S < 0 || Y + S < 0) continue;
          ctx.drawImage(cacheFor(b, scene), X, Y, S, S);
        }
        drawPlotsMineOnly(ctx, v);
        drawShows(ctx, v);
        if (scene.pending.length || scene.preview) drawOverlays(ctx, v);
      } else {
        drawView(ctx, v);
        drawShows(ctx, v);
        if (!opts.noLife) drawAgents(ctx, v);
        drawOverlays(ctx, v);
      }
      drawBindingOver(ctx, v);
      if (scene.night) drawNight(ctx, v);
      drawPetals(ctx, v);
      drawActivity(ctx, v);
      drawEffects(ctx, v);
      drawStickerBadges(ctx, v);
      drawSparks(ctx, v);
      if (!opts.noLabels) drawLabels(ctx, v);
    }

    function drawPlotsMineOnly(g, v) {
      const home = v.scene.homeRect;
      if (!home) return;
      const z = v.z, pad = z * 0.12;
      g.beginPath();
      roundRect(g, (home.x - v.left) * z + pad, (home.y - v.top) * z + pad, home.w * z - pad * 2, home.h * z - pad * 2, z * 0.6);
      g.lineWidth = Math.max(2, z * 0.12);
      g.strokeStyle = PAL.mine;
      g.stroke();
    }

    // The magnifier under your finger: the same drawing, closer, centered on one square.
    function drawMagnifier(target, scene, x, y, cssZ, t) {
      const dpr = st.dpr;
      const size = target.clientWidth * dpr;
      if (target.width !== size) { target.width = target.height = size; }
      const g = target.getContext('2d');
      const z = cssZ * dpr;
      const v = { scene, z, w: size, h: size, t, left: x + 0.5 - size / 2 / z, top: y + 0.5 - size / 2 / z, level: 2 };
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = PAL.table;
      g.fillRect(0, 0, size, size);
      drawView(g, v);
      drawOverlays(g, v);
      if (scene.night) drawNight(g, v);
      g.strokeStyle = 'rgba(255,255,255,0.9)';
      g.lineWidth = 2 * dpr;
      g.strokeRect(size / 2 - z / 2, size / 2 - z / 2, z, z);
    }

    // A still picture of part of the world, centered on (x, y), with its Stitchlings (the welcome-back
    // card shows your home this way). The canvas keeps its CSS size; cssZ is CSS px per square.
    // For a canvas that isn't on the page, opts gives its size and zoom in pixels: { w, h, z }.
    function snapshot(target, scene, x, y, cssZ, t, opts) {
      const dpr = st.dpr;
      const w = (opts && opts.w) || Math.round(target.clientWidth * dpr), h = (opts && opts.h) || Math.round(target.clientHeight * dpr);
      if (target.width !== w || target.height !== h) { target.width = w; target.height = h; }
      const g = target.getContext('2d');
      const z = (opts && opts.z) || cssZ * dpr;
      const v = { scene, z, w, h, t, left: x - w / 2 / z, top: y - h / 2 / z, level: 2 };
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = PAL.table;
      g.fillRect(0, 0, w, h);
      drawView(g, v);
      drawAgents(g, v);
      if (scene.night) drawNight(g, v);
    }

    // The Stitchling nearest a tapped world point, at zoom zc (CSS px per square), if any.
    function critterAt(wx, wy, zc) {
      if (zc < 10) return null;
      const reach = Math.max(0.5, 18 / zc);
      let best = null, bd = reach;
      for (const a of st.agents.values()) {
        const d = Math.hypot(a.x - wx, a.y - 0.15 - wy);
        if (d < bd) { bd = d; best = a; }
      }
      return best;
    }

    function poke(agent, t, text) {
      agent.hop = t + 0.6;
      agent.wait = Math.max(agent.wait, 1.5);
      agent.emote = { text: text || '!', until: t + 1.8 };
    }

    // Makes sure the Stitchlings of the home at (x, y) exist right now, greeting if it's new.
    function ensureHome(scene, x, y, t) {
      refreshPopulation(scene, t, true);
      const h = st.homes.find((home) => home.cells.some((c) => c.x === x && c.y === y));
      if (!h) return [];
      const greet = st.newHomes.has(h.key);
      for (const res of h.residents) {
        if (st.agents.has(res.id)) continue;
        spawn(scene, res.id, res.species, h.cells, { homeKey: h.key, owner: h.owner, ax: h.anchor.x, ay: h.anchor.y, leash: 9, mood: h.needs.mood }, t);
        const a = st.agents.get(res.id);
        if (a && greet) { a.emote = { text: 'Hi!', until: t + 3 }; a.hop = t + 0.6; a.wait = 2.5; }
      }
      st.newHomes.delete(h.key);
      return residentsOf(x, y);
    }

    // Makes sure the rare (or Wonder) Stitchling living near (x, y) is out right now, and returns it.
    function ensureSite(scene, species, x, y, t) {
      st.popVersion = -1; // a Wonder being finished changes no patches, so look again anyway
      refreshPopulation(scene, t, true);
      const s = st.sites.find((q) => q.species === species && Math.abs(q.x - x) <= 2 && Math.abs(q.y - y) <= 2);
      if (!s) return null;
      const id = `rare:${s.species}:${s.x},${s.y}`;
      if (!st.agents.has(id)) spawn(scene, id, s.species, [{ x: s.x, y: s.y }], { sx: s.x, sy: s.y, ax: s.x, ay: s.y, leash: 3, rare: true, mood: 3 }, t);
      return st.agents.get(id) || null;
    }

    // The rare Stitchlings out on the part of the world on screen (close enough to see them).
    function rareInView() {
      const v = st.lastView;
      if (!v || v.z / st.dpr < 10) return [];
      const x1 = v.left + v.w / v.z, y1 = v.top + v.h / v.z;
      return [...st.agents.values()].filter((a) => a.rare && a.x >= v.left && a.x <= x1 && a.y >= v.top && a.y <= y1);
    }

    // Residents of a home (for the welcome moment: "someone moved in").
    function residentsOf(x, y) {
      const out = [];
      for (const a of st.agents.values()) {
        const h = a.homeKey != null && st.homeIndex.get(a.homeKey);
        if (h && h.cells.some((c) => c.x === x && c.y === y)) out.push(a);
      }
      return out;
    }

    return {
      frame, drawMagnifier, snapshot, markDirty, markAllDirty, celebrate, sparkle, react, stickerPop, rewardPop, beckon, critterAt, poke, residentsOf, ensureHome, ensureSite, rareInView,
      homes: () => st.homes, sites: () => st.sites, agentCount: () => st.agents.size,
    };
  }

  root.QuiltRender = { create, levelName, LOD, PAL, drawStitchling, drawSticker, portrait, fabricSwatch };
})(this);
