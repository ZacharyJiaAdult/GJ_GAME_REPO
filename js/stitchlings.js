/* Quiltopia — Stitchlings: who lives where, what they need, how cozy each Block is, and where
   rare Stitchlings turn up. Pure functions over the world index; the renderer animates them. */
(function (root) {
  'use strict';

  const R = root.QuiltRules;

  // body: fabric color. ears and extra pick the little details the renderer stitches on.
  const SPECIES = {
    buttonling: { name: 'Buttonling', page: 'everyday', body: '#f4c7a1', ears: 'round', hint: 'Lives in homes all over the quilt.' },
    thimblet: { name: 'Thimblet', page: 'everyday', body: '#bfe0f5', ears: 'pointy', hint: 'Lives in homes all over the quilt.' },
    spoolkin: { name: 'Spoolkin', page: 'everyday', body: '#f6cde1', ears: 'bunny', hint: 'Lives in homes all over the quilt.' },
    patchpup: { name: 'Patchpup', page: 'everyday', body: '#f1e2a8', ears: 'floppy', hint: 'Lives in homes all over the quilt.' },
    yarnling: { name: 'Yarnling', page: 'everyday', body: '#ddd0f6', ears: 'antenna', hint: 'Lives in homes all over the quilt.' },
    pinbun: { name: 'Pinbun', page: 'everyday', body: '#cfeec0', ears: 'sprout', hint: 'Lives in homes all over the quilt.' },

    firefly: { name: 'Firefly Stitchling', page: 'rare', body: '#ffe48a', ears: 'antenna', extra: 'glow', hint: 'Where water, a tree and a lantern meet.' },
    mossling: { name: 'Mossling', page: 'rare', body: '#8cc97a', ears: 'sprout', extra: 'moss', hint: 'Deep in a forest of 9 or more trees.' },
    bloomkin: { name: 'Bloomkin', page: 'rare', body: '#ffb3c8', ears: 'petals', hint: 'In a garden field of 6 or more squares, beside a park.' },
    picnicpip: { name: 'Picnic Pip', page: 'rare', body: '#f7d9a8', ears: 'round', extra: 'bandana', hint: 'Where a park, a garden and a tree all touch.' },
    lamplighter: { name: 'Lamplighter', page: 'rare', body: '#c9b8f2', ears: 'pointy', extra: 'lamp', hint: 'Where 3 lanterns line a path.' },
    bazaarmouse: { name: 'Bazaar Mouse', page: 'rare', body: '#d9d3cc', ears: 'mouse', extra: 'apron', hint: 'At a market whose paths reach 4 or more homes.' },
    bridgekeeper: { name: 'Bridgekeeper', page: 'rare', body: '#a9cde8', ears: 'round', extra: 'cap', hint: 'On a bridge with a lantern beside it.' },
    splashkin: { name: 'Splashkin', page: 'rare', body: '#9fd8f0', ears: 'drop', hint: 'By a fountain with 2 parks around it.' },
    wren: { name: 'Wren', page: 'rare', body: '#c9a27a', ears: 'beak', extra: 'wings', hint: 'At a birdhouse in a home with 3 or more trees.' },
    glowmoth: { name: 'Glowmoth', page: 'rare', body: '#f3eecd', ears: 'antenna', extra: 'mothwings', hint: 'Near lanterns, but only at night.' },

    treesprite: { name: 'Treehouse Sprite', page: 'wonder', wonder: 'treehouse', body: '#9bd17f', ears: 'leaf', hint: 'Given to everyone who helps finish the Great Treehouse.' },
    spritzel: { name: 'Spritzel', page: 'wonder', wonder: 'fountain', body: '#7fc8f0', ears: 'drop', extra: 'glow', hint: 'Given to everyone who helps finish the Grand Fountain.' },
    teacuptot: { name: 'Teacup Tot', page: 'wonder', wonder: 'teapot', body: '#f2efe6', ears: 'round', extra: 'teacup', hint: 'Given to everyone who helps finish the Giant Teapot.' },
    beaconbug: { name: 'Beacon Bug', page: 'wonder', wonder: 'lighthouse', body: '#ff9f80', ears: 'antenna', extra: 'beacon', hint: 'Given to everyone who helps finish Lighthouse Isle.' },
  };
  const EVERYDAY = Object.keys(SPECIES).filter((id) => SPECIES[id].page === 'everyday');
  const PAGES = [
    { id: 'everyday', name: 'Everyday Stitchlings', reward: { buttons: 50, keep: 'bench' } },
    { id: 'rare', name: 'Rare Stitchlings', reward: { buttons: 150, keep: 'cherry' } },
    { id: 'wonder', name: 'Wonder Stitchlings', reward: { buttons: 100, keep: 'fountain' } },
  ];

  function hash2(x, y) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  // ---------- Homes and their Stitchlings ----------
  // Houses side by side are one home. One Stitchling lives there for every two house squares.
  // The list is worked out once per change to the world.

  const homesCache = new WeakMap();
  function homes(world) {
    const hit = homesCache.get(world);
    if (hit && hit.version === world.version) return hit.list;
    const list = findHomes(world);
    homesCache.set(world, { version: world.version, list });
    return list;
  }

  function findHomes(world) {
    const seen = new Set(), out = [];
    for (const p of world.byId.values()) {
      if (p.kind !== 'house' || p.wonder || seen.has(p.id)) continue;
      const cells = [], stack = [p];
      seen.add(p.id);
      while (stack.length) {
        const c = stack.pop();
        cells.push(c);
        for (const [dx, dy] of R.N4) {
          const n = R.patchAt(world, c.x + dx, c.y + dy);
          if (n && n.kind === 'house' && !n.wonder && !seen.has(n.id)) { seen.add(n.id); stack.push(n); }
        }
      }
      let anchor = cells[0];
      for (const c of cells) if (c.y < anchor.y || (c.y === anchor.y && c.x < anchor.x)) anchor = c;
      const block = R.blockAt(world, anchor.x, anchor.y);
      const base = Math.floor(hash2(anchor.x, anchor.y) * EVERYDAY.length);
      const residents = [];
      for (let i = 0, n = Math.max(1, Math.ceil(cells.length / 2)); i < n; i++) {
        residents.push({ id: `${anchor.x},${anchor.y},${i}`, species: EVERYDAY[(base + i) % EVERYDAY.length] });
      }
      const home = { key: anchor.y * world.W + anchor.x, anchor, cells, owner: anchor.owner, block: block ? block.id : null, residents };
      home.needs = needsOf(world, home);
      out.push(home);
    }
    return out;
  }

  // A Stitchling needs a home (it has one), food from a garden and fun from a park or fountain
  // within 4 squares, a path at the door, and paths that lead to a neighbor's home so it can visit.
  // Mood is 0 to 4 hearts.
  function needsOf(world, home) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, path = false;
    for (const c of home.cells) {
      if (c.x < minX) minX = c.x;
      if (c.y < minY) minY = c.y;
      if (c.x > maxX) maxX = c.x;
      if (c.y > maxY) maxY = c.y;
      for (const [dx, dy] of R.N4) if (R.kindAt(world, c.x + dx, c.y + dy) === 'path') path = true;
    }
    let food = false, fun = false;
    for (let y = minY - 4; y <= maxY + 4; y++) {
      for (let x = minX - 4; x <= maxX + 4; x++) {
        const k = R.kindAt(world, x, y);
        if (k === 'garden') food = true;
        else if (k === 'park' || k === 'fountain') fun = true;
      }
    }
    const visit = path && visitsNeighbor(world, home);
    return { food, fun, path, visit, mood: (food ? 1 : 0) + (fun ? 1 : 0) + (path ? 1 : 0) + (visit ? 1 : 0) };
  }

  // Whether a home's paths reach another builder's house within VISIT_STEPS squares of path
  // (supabase/schema.sql's home_needs walks the same way).
  const VISIT_STEPS = 30;
  function visitsNeighbor(world, home) {
    const seen = new Set();
    let frontier = [];
    for (const c of home.cells) {
      for (const [dx, dy] of R.N4) {
        const x = c.x + dx, y = c.y + dy, key = y * world.W + x;
        if (!seen.has(key) && R.kindAt(world, x, y) === 'path') { seen.add(key); frontier.push([x, y]); }
      }
    }
    for (let step = 0; frontier.length; step++) {
      const next = [];
      for (const [x, y] of frontier) {
        for (const [dx, dy] of R.N4) {
          const p = R.patchAt(world, x + dx, y + dy);
          if (!p) continue;
          if (p.kind === 'house' && !p.wonder && p.owner && p.owner !== home.owner) return true;
          const key = (y + dy) * world.W + x + dx;
          if (p.kind === 'path' && step < VISIT_STEPS && !seen.has(key)) { seen.add(key); next.push([x + dx, y + dy]); }
        }
      }
      frontier = next;
    }
    return false;
  }

  // The way along the paths from (x, y) to the nearest neighbor's door (or, with home, back to
  // home's door), as the squares to walk. Null when there's none within reach.
  function routeAlongPaths(world, x, y, owner, home) {
    const W = world.W, prev = new Map([[y * W + x, -1]]);
    const isGoal = (cx, cy) => R.N4.some(([dx, dy]) => {
      const p = R.patchAt(world, cx + dx, cy + dy);
      if (!p || p.kind !== 'house' || p.wonder) return false;
      return home ? home.cells.some((c) => c.x === cx + dx && c.y === cy + dy) : p.owner && p.owner !== owner;
    });
    let frontier = [[x, y]];
    for (let step = 0; frontier.length && step <= VISIT_STEPS * 2; step++) {
      const next = [];
      for (const [cx, cy] of frontier) {
        if (step > 0 && isGoal(cx, cy)) {
          const route = [];
          for (let k = cy * W + cx; k !== y * W + x; k = prev.get(k)) route.unshift([k % W, Math.floor(k / W)]);
          return route;
        }
        for (const [dx, dy] of R.N4) {
          const nx = cx + dx, ny = cy + dy, key = ny * W + nx;
          if (prev.has(key) || R.kindAt(world, nx, ny) !== 'path') continue;
          prev.set(key, cy * W + cx);
          next.push([nx, ny]);
        }
      }
      frontier = next;
    }
    return null;
  }

  // Cozy score per Block: how happy its Stitchlings are, from 0 to 100.
  function cozy(homeList) {
    const sums = new Map();
    for (const h of homeList) {
      if (h.block == null) continue;
      const s = sums.get(h.block) || { mood: 0, residents: 0 };
      s.mood += h.needs.mood * h.residents.length;
      s.residents += h.residents.length;
      sums.set(h.block, s);
    }
    const out = new Map();
    for (const [id, s] of sums) out.set(id, { residents: s.residents, score: Math.round((s.mood / (s.residents * 4)) * 100) });
    return out;
  }

  // ---------- Rare Stitchlings ----------

  function components(world, kinds) {
    const seen = new Set(), out = [];
    for (const p of world.byId.values()) {
      if (!kinds.includes(p.kind) || seen.has(p.id)) continue;
      const cells = [], stack = [p];
      seen.add(p.id);
      while (stack.length) {
        const c = stack.pop();
        cells.push(c);
        for (const [dx, dy] of R.N4) {
          const n = R.patchAt(world, c.x + dx, c.y + dy);
          if (n && kinds.includes(n.kind) && !seen.has(n.id)) { seen.add(n.id); stack.push(n); }
        }
      }
      out.push(cells);
    }
    return out;
  }

  // The square of a group closest to its middle.
  function middleOf(cells) {
    const mx = cells.reduce((s, c) => s + c.x, 0) / cells.length, my = cells.reduce((s, c) => s + c.y, 0) / cells.length;
    let best = cells[0], bd = Infinity;
    for (const c of cells) { const d = (c.x - mx) ** 2 + (c.y - my) ** 2; if (d < bd) { bd = d; best = c; } }
    return best;
  }

  // How many different builders' houses a market's paths reach.
  function marketReach(world, market) {
    const queue = [], seen = new Set(), owners = new Set();
    for (const [dx, dy] of R.N4) {
      const x = market.x + dx, y = market.y + dy;
      if (R.kindAt(world, x, y) === 'path') { queue.push([x, y]); seen.add(y * world.W + x); }
    }
    for (let qi = 0; qi < queue.length && seen.size < 500; qi++) {
      const [x, y] = queue[qi];
      for (const [dx, dy] of R.N4) {
        const nx = x + dx, ny = y + dy, p = R.patchAt(world, nx, ny);
        if (!p) continue;
        if (p.kind === 'house' && p.owner) owners.add(p.owner);
        if (p.kind === 'path' && !seen.has(ny * world.W + nx)) { seen.add(ny * world.W + nx); queue.push([nx, ny]); }
      }
    }
    return owners.size;
  }

  // Every spot where a rare Stitchling lives right now. opts.night adds Glowmoths.
  function rareSites(world, opts) {
    const at = (x, y) => R.kindAt(world, x, y);
    const count = (x, y, r, kinds) => {
      let n = 0;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if ((dx || dy) && kinds.includes(at(x + dx, y + dy))) n++;
      return n;
    };
    const isWater = (x, y) => at(x, y) === 'water';
    const isBridge = (x, y) => at(x, y) === 'path' && ((isWater(x - 1, y) && isWater(x + 1, y)) || (isWater(x, y - 1) && isWater(x, y + 1)));
    const sites = [];
    const add = (species, x, y) => {
      if (sites.some((s) => s.species === species && Math.abs(s.x - x) + Math.abs(s.y - y) < 8)) return;
      sites.push({ species, x, y });
    };
    const list = [...world.byId.values()].sort((a, b) => a.y - b.y || a.x - b.x);
    for (const p of list) {
      if (p.kind === 'lantern') {
        if (count(p.x, p.y, 2, ['water']) && count(p.x, p.y, 2, ['tree', 'cherry'])) add('firefly', p.x, p.y);
        if (count(p.x, p.y, 4, ['lantern']) >= 2 && count(p.x, p.y, 1, ['path'])) add('lamplighter', p.x, p.y);
        for (const [dx, dy] of R.N4) if (isBridge(p.x + dx, p.y + dy)) add('bridgekeeper', p.x + dx, p.y + dy);
        if (opts && opts.night && hash2(p.x, p.y) < 0.35) add('glowmoth', p.x, p.y);
      } else if (p.kind === 'park') {
        if (count(p.x, p.y, 1, ['garden']) && count(p.x, p.y, 1, ['tree', 'cherry'])) add('picnicpip', p.x, p.y);
      } else if (p.kind === 'market') {
        if (marketReach(world, p) >= 4) add('bazaarmouse', p.x, p.y);
      } else if (p.kind === 'fountain') {
        if (count(p.x, p.y, 2, ['park']) >= 2) add('splashkin', p.x, p.y);
      } else if (p.kind === 'birdhouse') {
        const z = R.zoneOf(world, p.x, p.y);
        if (z.type === 'plot') {
          const r = R.plotRect(z.block, z.plot);
          let trees = 0;
          for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (at(x, y) === 'tree' || at(x, y) === 'cherry') trees++;
          if (trees >= 3) add('wren', p.x, p.y);
        }
      }
    }
    for (const forest of components(world, ['tree', 'cherry'])) {
      if (forest.length >= 9) { const m = middleOf(forest); add('mossling', m.x, m.y); }
    }
    for (const field of components(world, ['garden'])) {
      if (field.length >= 6 && field.some((c) => count(c.x, c.y, 1, ['park']))) { const m = middleOf(field); add('bloomkin', m.x, m.y); }
    }
    // A finished Wonder's own Stitchling lives at the Wonder.
    for (const w of world.wonders) {
      if (!w.completedAt) continue;
      const bp = R.BLUEPRINTS[w.blueprint];
      add(bp.sprite, w.x + Math.floor(bp.rows[0].length / 2), w.y + bp.rows.length - 2);
    }
    return sites;
  }

  // Whether a player who tapped this Stitchling at (x, y) really met it there.
  function meetAllowed(world, species, x, y, opts) {
    const s = SPECIES[species];
    if (!s) return false;
    if (s.page === 'everyday') return true;
    if (s.page === 'wonder') return false; // a finished Wonder gives its Stitchling to its builders
    return rareSites(world, opts).some((site) => site.species === species && Math.abs(site.x - x) <= 6 && Math.abs(site.y - y) <= 6);
  }

  function pageProgress(book, page) {
    const ids = Object.keys(SPECIES).filter((id) => SPECIES[id].page === page);
    return { ids, found: ids.filter((id) => book && book[id]).length, total: ids.length };
  }

  const api = { SPECIES, EVERYDAY, PAGES, VISIT_STEPS, homes, needsOf, visitsNeighbor, routeAlongPaths, cozy, rareSites, marketReach, meetAllowed, pageProgress };
  (typeof globalThis !== 'undefined' ? globalThis : root).QuiltStitchlings = api;
})(this);
