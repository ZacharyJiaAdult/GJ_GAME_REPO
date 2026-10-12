/* Quiltopia — what a fresh world starts with.
   landscapeFor(block): streets, groves, lanterns (and for the first Blocks a river, a pond and a
   plaza) so no Block ever feels empty. Used by the demo, by world growth, and by
   tools/seed-sql.html for the online world.
   demoWorld(): the demo's simulated neighbors and their homes. Demo only; never sent online. */
(function (root) {
  'use strict';

  const R = root.QuiltRules;
  const DAY = 864e5;
  const B = R.BLOCK;

  function landscapeFor(block) {
    const world = R.createWorld({ blocks: [block] });
    const rand = R.mulberry32(20261011 + block.id * 7919);
    const out = new Map();
    const bx = block.gx * B, by = block.gy * B;
    const open = (lx, ly) => {
      const t = R.zoneOf(world, bx + lx, by + ly).type;
      return t === 'shared' || t === 'commons';
    };
    // Structural pieces overwrite each other (a street over the river makes a bridge);
    // decorations only fill empty squares.
    const put = (lx, ly, kind) => { if (open(lx, ly)) out.set(ly * B + lx, { x: bx + lx, y: by + ly, kind }); };
    const add = (lx, ly, kind) => { if (open(lx, ly) && !out.has(ly * B + lx)) out.set(ly * B + lx, { x: bx + lx, y: by + ly, kind }); };

    if (block.kind === 'neighborhood') {
      if (block.id === 2) {
        // Bobbin Bay: a river along the middle lane, with a little footbridge.
        for (let lx = 0; lx < B; lx++) for (const ly of [30, 31]) put(lx, ly, 'water');
        put(21, 30, 'path');
        put(21, 31, 'path');
      }
      // Main streets: row 21 and column 31 of every Neighborhood line up across Block edges.
      for (let i = 0; i < B; i++) { put(i, 21, 'path'); put(31, i, 'path'); }
      // Hedgerows along the seams, and a few trees dotted along the lanes.
      for (let ly = 0; ly < B; ly++) {
        for (let lx = 0; lx < B; lx++) {
          const edge = lx >= 62 || ly >= 62 || lx < 2 || ly < 2;
          if (rand() < (edge ? 0.22 : 0.035)) add(lx, ly, 'tree');
        }
      }
    } else {
      if (block.id === 3) {
        // The first Commons: the river runs in from Bobbin Bay and down to a pond.
        for (let lx = 0; lx < 10; lx++) for (const ly of [30, 31]) put(lx, ly, 'water');
        for (let ly = 32; ly < 44; ly++) for (const lx of [8, 9]) put(lx, ly, 'water');
        for (let ly = 42; ly <= 54; ly++) {
          for (let lx = 3; lx <= 19; lx++) {
            const dx = (lx - 11) / 6.5, dy = (ly - 48) / 5;
            if (dx * dx + dy * dy <= 1) put(lx, ly, 'water');
          }
        }
        for (let lx = 12; lx <= 22; lx++) put(lx, 38, 'path');
        for (let ly = 39; ly <= 43; ly++) put(12, ly, 'path');
        for (const [lx, ly] of [[13, 42], [4, 45], [19, 52]]) add(lx, ly, 'lantern');
      }
      // Streets line up with the Neighborhoods' and meet a plaza around the middle lot.
      for (let i = 0; i < B; i++) put(i, 21, 'path');
      for (let ly = 0; ly < 21; ly++) put(31, ly, 'path');
      for (let ly = 39; ly < B; ly++) put(31, ly, 'path');
      for (let i = 23; i <= 40; i++) put(i, 38, 'path');
      for (let i = 21; i <= 38; i++) { put(23, i, 'path'); put(40, i, 'path'); }
      for (const [lx, ly] of [[22, 20], [41, 20], [22, 39], [41, 39], [4, 20], [14, 20], [50, 20], [58, 20]]) add(lx, ly, 'lantern');
      // Community gardens either side of the south street.
      for (let ly = 44; ly <= 47; ly++) {
        for (let lx = 24; lx <= 29; lx++) add(lx, ly, 'garden');
        for (let lx = 33; lx <= 38; lx++) add(lx, ly, 'garden');
      }
      // Groves between the lots.
      for (const [gx, gy, r] of [[60, 30, 3.5], [26, 58, 4], [3, 60, 3], [40, 10, 2.5], [22, 8, 2.5], [56, 61, 2.5]]) {
        for (let ly = Math.floor(gy - r); ly <= gy + r; ly++) {
          for (let lx = Math.floor(gx - r); lx <= gx + r; lx++) {
            const d = Math.hypot(lx - gx, ly - gy);
            if (lx >= 0 && ly >= 0 && lx < B && ly < B && d < r && rand() < 0.95 - d / (r * 2.2)) add(lx, ly, 'tree');
          }
        }
      }
    }
    return [...out.values()];
  }

  // The landscape of the first four Blocks (what tools/seed-sql.html sends online).
  function landscape() {
    return R.BLOCKS.flatMap((b) => landscapeFor(b));
  }

  // A demo neighbor's home: built in a sensible order, then cut short at a random point,
  // so some neighbors have done a lot and some less.
  function demoHome(rand, extra) {
    const order = [];
    const taken = new Set();
    const hw = 1 + Math.floor(rand() * 3), hh = 1 + Math.floor(rand() * 2);
    const hx = 2 + Math.floor(rand() * (5 - hw)), hy = 1 + Math.floor(rand() * 3);
    for (let dy = 0; dy < hh; dy++) for (let dx = 0; dx < hw; dx++) order.push([hx + dx, hy + dy, 'house']);
    const door = hx + Math.floor(rand() * hw);
    for (let y = hy + hh; y < 8; y++) order.push([door, y, 'path']);
    const gw = 2 + Math.floor(rand() * 2), gh = 1 + Math.floor(rand() * 2);
    const gx = rand() < 0.5 ? hx - gw : hx + hw;
    for (let dy = 0; dy < gh; dy++) for (let dx = 0; dx < gw; dx++) order.push([gx + dx, hy + dy, 'garden']);
    const corners = [[0, 0], [7, 0], [0, 7], [7, 7], [0, 4], [7, 3]].sort(() => rand() - 0.5);
    for (let i = 0, n = 1 + Math.floor(rand() * 3); i < n; i++) order.push([corners[i][0], corners[i][1], 'tree']);
    if (rand() < 0.4) order.push([door + (rand() < 0.5 ? -1 : 1), 7, 'lantern']);
    if (rand() < 0.35) order.push([door === 0 ? 1 : door - 1, hy + hh, 'park'], [door === 0 ? 1 : door - 1, hy + hh + 1, 'park']);
    if (rand() < 0.12) order.push([door + 1, hy + hh + 1, 'market']);
    if (rand() < 0.2) {
      const px = rand() < 0.5 ? 0 : 6;
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) order.push([px + dx, 5 + dy, 'water']);
    }
    if (rand() < 0.45) {
      const decor = ['bench', 'flowerpot', 'bunting', 'scarecrow', 'birdhouse'][Math.floor(rand() * 5)];
      order.push([hx + hw, hy - 1, decor], [hx - 1, hy - 1, decor]);
    }
    const keep = Math.max(3, Math.round(order.length * (0.55 + rand() * 0.45)));
    const cells = [];
    for (const [dx, dy, kind] of (extra || []).concat(order.slice(0, keep))) {
      if (dx < 0 || dy < 0 || dx > 7 || dy > 7 || taken.has(dy * 8 + dx)) continue;
      taken.add(dy * 8 + dx);
      cells.push({ dx, dy, kind });
    }
    return cells;
  }

  // A few homes are built to host rare Stitchlings, so there's something to discover in the demo.
  const RARE_HOMES = {
    5: [[1, 5, 'water'], [2, 5, 'water'], [1, 4, 'tree'], [2, 4, 'lantern']],                 // Firefly
    40: [[5, 5, 'water'], [6, 5, 'water'], [6, 4, 'tree'], [5, 4, 'lantern']],                // Firefly
    12: [[5, 1, 'park'], [6, 1, 'garden'], [5, 0, 'tree']],                                     // Picnic Pip
    50: [[1, 1, 'park'], [2, 1, 'garden'], [1, 0, 'tree']],                                     // Picnic Pip
    30: [[0, 0, 'tree'], [7, 0, 'tree'], [0, 7, 'tree'], [6, 0, 'birdhouse']],                  // Wren
    61: [[0, 4, 'garden'], [1, 4, 'garden'], [2, 4, 'garden'], [0, 5, 'garden'], [1, 5, 'garden'], [2, 5, 'garden'], [3, 5, 'park']], // Bloomkin
    75: [[5, 5, 'fountain'], [4, 5, 'park'], [6, 5, 'park']],                                   // Splashkin
  };
  const DEMO_NATIONS = ['BR', 'US', 'DE', 'JP', 'MX', 'PH', 'FR', 'GB', 'IN', 'KR'];
  const DEMO_HOMES = [36, 36, 24]; // Thimble Hollow and Button Meadow full, Bobbin Bay two-thirds

  // The demo world: the landscape, 96 simulated neighbors, the Great Treehouse about 85% stitched,
  // and the Grand Fountain gathering founders.
  function demoWorld(now, version) {
    const rand = R.mulberry32(7);
    const data = {
      v: version, rev: 1, nextId: 1, nextWonder: 3, createdAt: now,
      blocks: R.BLOCKS.map((b) => Object.assign({}, b)),
      players: [], patches: [], waterings: [], stickers: [], gifts: [], meets: [], visits: [], reports: [],
      wonders: R.WONDERS.map((w) => Object.assign({}, w, { slots: R.slotsOf(w.blueprint).length, filled: 0, completedAt: null, status: 'open', founders: [], foundedBy: null })),
    };
    const world = R.createWorld(data);
    const add = (x, y, kind, owner, at) => {
      if (R.patchAt(world, x, y)) return null;
      const z = R.zoneOf(world, x, y);
      const p = { id: data.nextId++, x, y, kind, owner, wonder: z.type === 'slot' ? z.wonder.id : null, at: Math.round(at) };
      data.patches.push(p);
      R.addPatch(world, p);
      return p;
    };

    for (const b of data.blocks) for (const l of landscapeFor(b)) add(l.x, l.y, l.kind, null, now - 9 * DAY);

    // Neighbors arrive in order and build their homes.
    const taken = new Set();
    const styles = ['patchwork', 'patchwork', 'patchwork', 'gingham', 'polka', 'stripes'];
    const outfits = [null, null, 'scarf', 'bowtie', 'crown', 'tophat', 'raincoat'];
    let n = 0;
    DEMO_HOMES.forEach((count, block) => {
      for (let plot = 0; plot < count; plot++, n++) {
        const name = R.nameOptions(rand, 1, taken)[0];
        taken.add(name);
        const p = {
          id: 'demo-' + n, name, nation: DEMO_NATIONS[Math.floor(rand() * DEMO_NATIONS.length)],
          homeBlock: block, homePlot: plot, demo: true, createdAt: now - (1 + rand() * 6) * DAY,
          picks: 0, items: {}, keep: {}, gifts: [], lastPeriod: 0, helpPeriod: -1, helps: 0, banned: false,
          xp: Math.floor(rand() * 2400), buttons: 0, style: styles[Math.floor(rand() * styles.length)],
          outfit: outfits[Math.floor(rand() * outfits.length)], friends: [], stitchbook: {},
        };
        data.players.push(p);
        R.setPlayer(world, p);
        const rect = R.plotRect(data.blocks[block], plot);
        for (const c of demoHome(rand, RARE_HOMES[n])) add(rect.x + c.dx, rect.y + c.dy, c.kind, p.id, now - rand() * 3 * DAY);
      }
    });

    // Neighbors have laid paths along the lanes in front of their homes, so every front path
    // joins the street network. (Online, players build these themselves.)
    for (const b of data.blocks.filter((x) => x.kind === 'neighborhood')) {
      const residents = data.players.filter((p) => p.homeBlock === b.id);
      if (!residents.length) continue;
      const rows = new Set(residents.map((p) => Math.floor(p.homePlot / R.PLOTS_PER_SIDE)));
      for (const py of rows) {
        const ly = R.PLOT_OFFSET + py * R.PLOT_STRIDE + R.PLOT; // first lane row below this row of homes
        const street = R.patchAt(world, b.gx * B, b.gy * B + ly + 1);
        if (street && street.kind === 'path') continue; // the main street already runs here
        for (let lx = 0; lx < B; lx++) {
          const x = b.gx * B + lx, y = b.gy * B + ly;
          if (R.zoneOf(world, x, y).type !== 'shared') continue;
          add(x, y, 'path', pickOwner(rand, residents), now - rand() * 4 * DAY);
        }
      }
    }
    // Three lanterns along a Thimble Hollow lane bring a Lamplighter, and one by Bobbin Bay's
    // footbridge brings a Bridgekeeper.
    const th = data.players.filter((p) => p.homeBlock === 0), bb = data.players.filter((p) => p.homeBlock === 2);
    for (const lx of [5, 8, 11]) add(lx, 11, 'lantern', pickOwner(rand, th), now - 2 * DAY);
    add(21, 64 + 32, 'lantern', pickOwner(rand, bb), now - 2 * DAY);

    // The Great Treehouse, stitched from the pond upward over the last few days.
    const treehouse = data.wonders[0];
    const slots = R.slotsOf(treehouse.blueprint).slice().sort((a, b) => b.dy - a.dy || a.dx - b.dx);
    const target = Math.floor(slots.length * 0.85);
    for (let k = 0; k < target; k++) {
      const s = slots[k];
      add(treehouse.x + s.dx, treehouse.y + s.dy, s.kind, pickOwner(rand, data.players), now - (target - k) * 25 * 60000);
    }
    treehouse.filled = target;

    // The Grand Fountain has 6 of its 10 founders.
    const commons = data.blocks[3];
    const founders = data.players.slice(10, 16).map((p) => p.id);
    data.wonders.push(Object.assign({
      id: 2, blueprint: 'fountain', block: commons.id, lot: 1, slots: R.slotsOf('fountain').length, filled: 0,
      completedAt: null, status: 'founding', founders, foundedBy: founders[0], foundedAt: now - 3 * 3600e3,
    }, R.placeInLot('fountain', commons, 1)));

    // Neighbors have been leaving each other stickers.
    const kinds = Object.keys(R.STICKERS);
    for (let i = 0; i < 70; i++) {
      const from = pickOwner(rand, data.players), to = pickOwner(rand, data.players);
      if (from === to) continue;
      const at = now - rand() * 2 * DAY;
      data.stickers.push({ id: data.nextId++, from, target: 'home:' + to, kind: kinds[Math.floor(rand() * kinds.length)], at: Math.round(at), day: R.dayOf(at) });
    }
    return data;
  }

  const pickOwner = (rand, players) => players[Math.floor(rand() * players.length)].id;

  const api = { landscape, landscapeFor, demoWorld, demoHome };
  (typeof globalThis !== 'undefined' ? globalThis : root).QuiltSeed = api;
})(this);
