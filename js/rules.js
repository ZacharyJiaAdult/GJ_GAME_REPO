/* Quiltopia — the game rules, shared by the demo world, the online client and the tests.
   No DOM access. Online, supabase/schema.sql enforces the same rules on the server, reading its
   numbers from the settings row that tools/seed-sql.html generates from this file. */
(function (root) {
  'use strict';

  // ---------- The world ----------

  const BLOCK = 64;          // squares along each side of a Block
  const PLOT = 8;            // a home plot is 8 by 8 squares
  const PLOT_STRIDE = 10;    // plots repeat every 10 squares, leaving 2-square lanes between them
  const PLOT_OFFSET = 2;     // the first plot starts 2 squares in from the Block's edge
  const PLOTS_PER_SIDE = 6;  // so a Neighborhood Block holds 36 homes
  const LOT = 16;            // Wonder lots in a Commons Block are 16 by 16
  const LOTS = [[24, 22], [4, 2], [44, 2], [44, 42]]; // top-left of each lot inside a Commons; lot 0 is the middle

  // The first four Blocks. As players arrive the quilt grows outward from here (see blockFor).
  const BLOCKS = [
    { id: 0, gx: 0, gy: 0, kind: 'neighborhood', name: 'Thimble Hollow' },
    { id: 1, gx: 1, gy: 0, kind: 'neighborhood', name: 'Button Meadow' },
    { id: 2, gx: 0, gy: 1, kind: 'neighborhood', name: 'Bobbin Bay' },
    { id: 3, gx: 1, gy: 1, kind: 'commons', name: 'The Commons' },
  ];
  const BLOCK_FIRST = ['Spool', 'Ribbon', 'Calico', 'Gingham', 'Velvet', 'Paisley', 'Tweed', 'Linen', 'Pincushion', 'Lace', 'Felt', 'Yarn', 'Satin', 'Denim', 'Flannel', 'Muslin'];
  const BLOCK_SECOND = ['Row', 'Glen', 'Green', 'Hill', 'Lane', 'Fields', 'Vale', 'Brook', 'Grove', 'Corner', 'Heights', 'End', 'Park', 'Crossing', 'Hollow', 'Meadow'];

  const PATCHES = {
    house: { name: 'House', group: 'basic', blurb: 'Stitchlings move in. Houses side by side join into one building.' },
    garden: { name: 'Garden', group: 'basic', blurb: 'Feeds Stitchlings who live within 4 squares. Neighbors can water it.' },
    tree: { name: 'Tree', group: 'basic', blurb: 'Gives shade. Trees side by side grow into a forest.' },
    water: { name: 'Water', group: 'basic', blurb: 'Ponds and rivers join up on their own.' },
    path: { name: 'Path', group: 'basic', blurb: 'Lets Stitchlings travel. Laid across a river, it becomes a bridge.' },
    park: { name: 'Park', group: 'basic', blurb: 'Fun for Stitchlings within 4 squares. Parks side by side make one big park.' },
    market: { name: 'Market', group: 'basic', blurb: 'Gets busier the more homes its paths reach.' },
    lantern: { name: 'Lantern', group: 'surprise', blurb: 'Glows at night. Lanterns only come as surprise patches.' },
    windmill: { name: 'Windmill', group: 'landmark', blurb: 'A rare landmark everyone can see. Its sails turn in the breeze.' },
    lighthouse: { name: 'Lighthouse', group: 'landmark', blurb: 'A rare landmark everyone can see. Its light sweeps at night.' },
    cherry: { name: 'Cherry Tree', group: 'landmark', blurb: 'A rare landmark everyone can see. Petals drift from it.' },
    bench: { name: 'Bench', group: 'decor', blurb: 'Stitchlings nap here. Decorations go in your home.' },
    fountain: { name: 'Fountain', group: 'decor', blurb: 'Fun for Stitchlings within 4 squares. Decorations go in your home.' },
    flowerpot: { name: 'Flower Pots', group: 'decor', blurb: 'A splash of color. Decorations go in your home.' },
    birdhouse: { name: 'Birdhouse', group: 'decor', blurb: 'A Wren may visit if your home has 3 trees. Decorations go in your home.' },
    scarecrow: { name: 'Scarecrow', group: 'decor', blurb: 'Keeps an eye on your gardens. Decorations go in your home.' },
    bunting: { name: 'Bunting', group: 'decor', blurb: 'Little flags that string together. Decorations go in your home.' },
  };
  const KINDS = Object.keys(PATCHES);
  const BASIC = KINDS.filter((k) => PATCHES[k].group === 'basic');
  const LANDMARKS = KINDS.filter((k) => PATCHES[k].group === 'landmark');
  const DECOR = KINDS.filter((k) => PATCHES[k].group === 'decor');
  const isKeepsake = (k) => PATCHES[k] && (PATCHES[k].group === 'landmark' || PATCHES[k].group === 'decor');

  // ---------- The daily allowance ----------

  const ALLOWANCE = {
    picks: 3,            // each period: 3 patches you choose (any basic kind) when you place them
    surprises: 2,        // each period: 2 random surprise patches
    cap: 15,             // the most daily patches you can hold; unused ones carry over up to this
    helpBonus: 3,        // extra picks each period for watering neighbors' gardens
    wonderPerPeriod: 3,  // slots one player can fill in one Wonder each period
    undoSeconds: 10,
  };
  // Surprises are drawn from this bag, so a Lantern turns up 3 times in 10.
  const SURPRISE_POOL = ['lantern', 'lantern', 'lantern', 'house', 'garden', 'tree', 'water', 'path', 'park', 'market'];

  // ---------- Wonders ----------
  // One character per square; '.' frames the Wonder and can't be built on.

  const SLOT_KINDS = { T: 'tree', H: 'house', P: 'path', W: 'water', G: 'garden', L: 'lantern', K: 'park', M: 'market' };
  const BLUEPRINTS = {
    treehouse: {
      name: 'Great Treehouse', size: 'Small', roof: '#a86a43', sprite: 'treesprite',
      rows: [
        '....TTTTTTTT....',
        '..TTTTTTTTTTTT..',
        '.TTTLTTTTTTLTTT.',
        '.TTTTHHHHHHTTTT.',
        'TTTTHHHHHHHHTTTT',
        'TTLTHHHHHHHHTLTT',
        'TTTTHHHHHHHHTTTT',
        '.TTTTHHHHHHTTTT.',
        '..TTTTTPPTTTTT..',
        '....LTTPPTTL....',
        '.......PP.......',
        '..GGG..PP..GGG..',
        '.GGGGG.PP.GGGGG.',
        '.WGGGG.PP.GGGGW.',
        'WWWWWWPPPPWWWWWW',
        'WWWWWWWWWWWWWWWW',
      ],
    },
    fountain: {
      name: 'Grand Fountain', size: 'Small', roof: null, sprite: 'spritzel',
      rows: [
        '..LKKKKKKKKL..',
        '.KKKKKKKKKKKK.',
        'LKKGGPPPPGGKKL',
        'KKGGPPWWPPGGKK',
        'KKGPPWWWWPPGKK',
        'KKPPWWWWWWPPKK',
        'KKPWWWLLWWWPKK',
        'KKPWWWLLWWWPKK',
        'KKPPWWWWWWPPKK',
        'KKGPPWWWWPPGKK',
        'KKGGPPWWPPGGKK',
        'LKKGGPPPPGGKKL',
        '.KKKKKKKKKKKK.',
        '..LKKKKKKKKL..',
      ],
    },
    teapot: {
      name: 'Giant Teapot', size: 'Small', roof: '#5c8e8b', sprite: 'teacuptot',
      rows: [
        '.......LL.......',
        '......MMMM......',
        '....HHHHHHHH....',
        'PPPHHHHHHHHHH...',
        'P..HHHHHHHHHHHHH',
        'P..HHHHHHHHHHH..',
        'P..HHHHHHHHHH...',
        'PPPHHHHHHHHHH...',
        '...HHHHHHHHHH...',
        '....HHHHHHHH....',
        '..KKKKKKKKKKKK..',
        '.KKKKKKKKKKKKKK.',
      ],
    },
    lighthouse: {
      name: 'Lighthouse Isle', size: 'Small', roof: '#ece6da', sprite: 'beaconbug',
      rows: [
        '.......LL.......',
        '......HHHH......',
        '.......HH.......',
        '.......HH.......',
        '......HHHH......',
        '.......HH.......',
        '.......HH.......',
        '......HHHH......',
        '....KKKKKKKK....',
        '...KKGGKKGGKK...',
        '..WKKKKPPKKKKW..',
        '.WWWKKKPPKKKWWW.',
        'WWWWWWWPPWWWWWWW',
        'WWWWWWWPPWWWWWWW',
        '.WWWWWWPPWWWWWW.',
        '..WWWWWWWWWWWW..',
      ],
    },
  };
  // The prototype starts with one Wonder already underway, in the middle of The Commons.
  const WONDERS = [{ id: 1, blueprint: 'treehouse', block: 3, lot: 0, x: 88, y: 86 }];
  const FOUNDERS_NEEDED = 10;
  const WONDER_BUTTONS = 50; // every builder of a finished Wonder gets these, plus 200 XP and its Stitchling

  // ---------- The welcome kit ----------
  // Every new player gets the same five patches and glowing spots in their home showing where
  // they go, so the first minute is building, not reading. Positions are inside the 8x8 plot.
  const KIT = [
    { dx: 3, dy: 5, kind: 'house' },
    { dx: 4, dy: 5, kind: 'garden' },
    { dx: 2, dy: 5, kind: 'tree' },
    { dx: 3, dy: 6, kind: 'path' },
    { dx: 3, dy: 7, kind: 'path' },
  ];
  const KIT_XP = 50;

  // ---------- Progress: Builder levels, Buttons, the calendar and daily goals ----------

  const XP = { patch: 10, wonderSlot: 25, water: 15, meet: 20, goal: 30, wonderDone: 200, inviteFilled: 100, sticker: 5, gift: 15, founded: 50, wish: 15 };
  const LEVEL_UNLOCKS = {
    3: { key: 'shop', text: 'The Button Shop: decorations, outfits and quilt fabrics' },
    4: { key: 'fabric:mint', text: 'Mint Gingham for your quilt square' },
    5: { key: 'found', text: 'Found a new Wonder on a Commons lot' },
    6: { key: 'style:gingham', text: 'Gingham roofs for your houses' },
    7: { key: 'style:polka', text: 'Polka-dot roofs' },
    8: { key: 'style:stripes', text: 'Striped roofs' },
    9: { key: 'fabric:heather', text: 'Heather Plaid for your quilt square' },
  };
  const SHOP_LEVEL = 3;
  const FOUND_LEVEL = 5;
  const levelFloor = (level) => 50 * level * (level - 1);

  // Seven days of rewards. Missing a day pauses the calendar; it never resets.
  const CALENDAR = [{ buttons: 20 }, { buttons: 30 }, { decor: true }, { buttons: 40 }, { outfit: true }, { buttons: 60 }, { landmark: true }];

  const GOALS = {
    place3: { text: 'Place 3 patches', target: 3 },
    wonder1: { text: 'Fill a Wonder slot', target: 1 },
    water2: { text: "Water 2 neighbors' gardens", target: 2 },
    sticker1: { text: "Leave a sticker on someone's home", target: 1 },
    meet1: { text: 'Meet a Stitchling', target: 1 },
    visit1: { text: "Visit a Block you've never been to", target: 1 },
    gift1: { text: 'Gift a patch to a friend', target: 1 },
    beside1: { text: "Build right next to a neighbor's patch", target: 1 },
  };
  const GOAL_BUTTONS = 10;
  const GOALS_BONUS = 30;

  // Stitchlings' wishes: every home's residents want food (a garden within 4 squares), fun (a park or
  // fountain within 4), a path beside the house, and paths that reach another builder's home so they
  // can visit (see visitsNeighbor in js/stitchlings.js). The first time a home has each one, its builder
  // gets XP.wish (up to WISH_DAILY a day, so moving houses around can't farm it), and a home with all
  // four is very cozy: COZY_BUTTONS more.
  const WISHES = {
    food: { kinds: ['garden'], wants: 'a garden nearby', granted: 'is fed' },
    fun: { kinds: ['park', 'fountain'], wants: 'a park nearby', granted: 'found something fun' },
    path: { kinds: ['path'], wants: 'a path to the door', granted: 'has a path to the door' },
    visit: { kinds: ['path'], wants: "a path to a neighbor's home", granted: 'is off to visit a neighbor' },
  };
  const WISH_DAILY = 6;
  const COZY_BUTTONS = 10;

  // Quilt squares: every home's ground is a fabric, so a Neighborhood looks like a patchwork quilt.
  // Each builder starts with one of the everyday fabrics (picked from their id) and can switch any
  // time; a few come with levels (level) and a few from the Button Shop (shop). Looks only.
  const FABRICS = {
    rosebud: { name: 'Rosebud Gingham', color: '#f2d3cf', pattern: 'gingham' },
    buttercup: { name: 'Buttercup Dots', color: '#f3e3b3', pattern: 'polka' },
    sage: { name: 'Sage Linen', color: '#d5e6c8', pattern: 'linen' },
    skylark: { name: 'Skylark Stripe', color: '#d0e2ef', pattern: 'stripes' },
    lavender: { name: 'Lavender Sprig', color: '#e3d7ef', pattern: 'floral' },
    apricot: { name: 'Apricot Calico', color: '#f5dbc0', pattern: 'calico' },
    mint: { name: 'Mint Gingham', color: '#d2ece2', pattern: 'gingham', level: 4 },
    heather: { name: 'Heather Plaid', color: '#e4d6e2', pattern: 'plaid', level: 9 },
    cherry: { name: 'Cherry Blossom', color: '#f7d6e1', pattern: 'floral', shop: true },
    denim: { name: 'Denim Patch', color: '#cdd8e6', pattern: 'twill', shop: true },
    sweetheart: { name: 'Sweetheart', color: '#f5d3d9', pattern: 'hearts', shop: true },
    starry: { name: 'Starry Night', color: '#c8cde6', pattern: 'stars', shop: true },
    // The Quiltopia Club's fabrics, woven with gold thread: members get the month's own, to keep.
    'gilded-rose': { name: 'Gilded Rose', color: '#f1cdd4', pattern: 'gilded', club: true },
    'gilded-sage': { name: 'Gilded Sage', color: '#d3e4c7', pattern: 'gilded', club: true },
    'gilded-sky': { name: 'Gilded Sky', color: '#cadcef', pattern: 'gilded', club: true },
    'gilded-plum': { name: 'Gilded Plum', color: '#ddcde6', pattern: 'gilded', club: true },
    'gilded-honey': { name: 'Gilded Honey', color: '#f2dfb0', pattern: 'gilded', club: true },
    'gilded-mint': { name: 'Gilded Mint', color: '#cde9df', pattern: 'gilded', club: true },
  };
  const EVERYDAY_FABRICS = Object.keys(FABRICS).filter((k) => !FABRICS[k].level && !FABRICS[k].shop && !FABRICS[k].club);
  const fabricOf = (player) => (player && player.fabric && FABRICS[player.fabric] ? player.fabric
    : EVERYDAY_FABRICS[hashString(String(player ? player.id : '')) % EVERYDAY_FABRICS.length]);
  // Whether a player may use a fabric: everyday ones always, others once reached, bought or given.
  function canUseFabric(me, id) {
    const f = FABRICS[id];
    if (!f || !me) return false;
    if (f.level) return levelOf(me.xp || 0) >= f.level;
    if (f.shop || f.club) return (me.fabrics || []).includes(id);
    return true;
  }

  // ---------- The Quiltopia Club ----------
  // A small monthly membership (price and checkout in js/config.js) that is only about looks: a new
  // gold-thread fabric each month to keep, a gold badge by your name, and your name in the season
  // credits. It never offers more building. It is only offered from CLUB_LEVEL, once a player
  // knows the game, and never to someone mid-way through their first visit.
  const CLUB_LEVEL = 8;
  const CLUB_FABRICS = Object.keys(FABRICS).filter((k) => FABRICS[k].club);
  const CLUB_DAYS = 30; // how long a demo membership lasts
  // The Club fabric for the month that `ms` falls in (UTC): they take turns.
  function clubFabricFor(ms) {
    const d = new Date(ms);
    return CLUB_FABRICS[(d.getUTCFullYear() * 12 + d.getUTCMonth()) % CLUB_FABRICS.length];
  }
  const isClub = (player, now) => !!(player && player.clubUntil && player.clubUntil > (now || Date.now()));

  const STICKERS = { heart: 'Heart', wow: 'Wow', laugh: 'Laugh', clap: 'Clap' };
  const OUTFITS = { scarf: 'Striped scarf', bowtie: 'Bow tie', crown: 'Flower crown', tophat: 'Tiny top hat', raincoat: 'Raincoat' };
  const STYLES = { patchwork: { name: 'Patchwork', level: 1 }, gingham: { name: 'Gingham', level: 6 }, polka: { name: 'Polka dot', level: 7 }, stripes: { name: 'Stripes', level: 8 } };
  const SHOP = [
    { id: 'flowerpot', type: 'decor', price: 30 }, { id: 'bench', type: 'decor', price: 40 },
    { id: 'bunting', type: 'decor', price: 50 }, { id: 'birdhouse', type: 'decor', price: 60 },
    { id: 'scarecrow', type: 'decor', price: 60 }, { id: 'fountain', type: 'decor', price: 120 },
    { id: 'scarf', type: 'outfit', price: 60 }, { id: 'bowtie', type: 'outfit', price: 60 },
    { id: 'crown', type: 'outfit', price: 80 }, { id: 'tophat', type: 'outfit', price: 80 },
    { id: 'raincoat', type: 'outfit', price: 100 },
    { id: 'cherry', type: 'fabric', price: 80 }, { id: 'denim', type: 'fabric', price: 90 },
    { id: 'sweetheart', type: 'fabric', price: 120 }, { id: 'starry', type: 'fabric', price: 150 },
  ];

  // ---------- Names come only from word lists, so nobody can type anything unkind ----------

  const WORDS = {
    adjectives: [
      'Brave', 'Cozy', 'Gentle', 'Happy', 'Sunny', 'Merry', 'Quiet', 'Lucky', 'Clever', 'Jolly',
      'Bouncy', 'Fuzzy', 'Golden', 'Silver', 'Velvet', 'Mossy', 'Misty', 'Breezy', 'Rosy', 'Minty',
      'Snug', 'Twinkly', 'Sleepy', 'Speedy', 'Tiny', 'Mighty', 'Patchy', 'Polka', 'Plucky', 'Kind',
      'Bright', 'Curly', 'Dapper', 'Daring', 'Nimble', 'Rustic', 'Starry', 'Tidy', 'Zesty', 'Woolly',
    ],
    nouns: [
      'Otter', 'Teapot', 'Button', 'Thimble', 'Bobbin', 'Acorn', 'Badger', 'Bramble', 'Clover', 'Comet',
      'Cricket', 'Daisy', 'Fern', 'Finch', 'Fox', 'Gecko', 'Hedgehog', 'Heron', 'Kite', 'Lantern',
      'Maple', 'Meadow', 'Mitten', 'Moth', 'Muffin', 'Owl', 'Pebble', 'Pickle', 'Pine', 'Puffin',
      'Quill', 'Rabbit', 'Robin', 'Sparrow', 'Spool', 'Sprout', 'Teacup', 'Toadstool', 'Walrus', 'Willow',
    ],
  };

  // ---------- Small helpers ----------

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashString(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  const pick = (rand, list) => list[Math.floor(rand() * list.length)];
  const N4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const dayOf = (ms) => Math.floor(ms / 864e5);

  // ---------- Growth ----------
  // Block index -> grid position. Each new ring adds (r,0)…(r,r)…(0,r), so the quilt stays square.
  function blockCoords(index) {
    if (index < BLOCKS.length) return [BLOCKS[index].gx, BLOCKS[index].gy];
    const r = Math.floor(Math.sqrt(index));
    const o = index - r * r;
    return o <= r ? [r, o] : [2 * r - o, r];
  }

  // Every fourth new Block is a Commons, so there's always room for more Wonders.
  function blockFor(index) {
    if (index < BLOCKS.length) return Object.assign({}, BLOCKS[index]);
    const [gx, gy] = blockCoords(index);
    const k = index - BLOCKS.length;
    if (index % 4 === 2) {
      const c = (index - 6) / 4; // the 1st, 2nd, 3rd... new Commons
      return { id: index, gx, gy, kind: 'commons', name: `${BLOCK_FIRST[c % 16]} ${['Commons', 'Square', 'Plaza', 'Fairground'][Math.floor(c / 16) % 4]}` };
    }
    return {
      id: index, gx, gy, kind: 'neighborhood',
      name: `${BLOCK_FIRST[k % 16]} ${BLOCK_SECOND[(5 * (k % 16) + Math.floor(k / 16)) % BLOCK_SECOND.length]}`,
    };
  }

  // ---------- World index ----------
  // data: { blocks, players, patches, wonders, waterings }. The index keeps references to these
  // objects, so the demo server can change them in place.

  function createWorld(data) {
    const blocks = data.blocks || BLOCKS;
    const bw = Math.max(...blocks.map((b) => b.gx)) + 1;
    const bh = Math.max(...blocks.map((b) => b.gy)) + 1;
    const w = {
      blocks, BW: bw, BH: bh, W: bw * BLOCK, H: bh * BLOCK,
      blockGrid: new Array(bw * bh).fill(null),
      grid: new Array(bw * BLOCK * bh * BLOCK),
      byId: new Map(),
      players: new Map(),
      plotOwners: new Map(),
      wonders: data.wonders || [],
      waterings: data.waterings || [],
      version: 0,
    };
    for (const b of blocks) w.blockGrid[b.gy * bw + b.gx] = b;
    for (const p of data.players || []) setPlayer(w, p);
    for (const p of data.patches || []) addPatch(w, p);
    return w;
  }

  function setPlayer(w, p) {
    const old = w.players.get(p.id);
    if (old && old.homeBlock != null) w.plotOwners.delete(old.homeBlock * 100 + old.homePlot);
    w.players.set(p.id, p);
    if (p.homeBlock != null && p.homePlot != null) w.plotOwners.set(p.homeBlock * 100 + p.homePlot, p.id);
  }

  function addPatch(w, p) {
    w.grid[p.y * w.W + p.x] = p;
    w.byId.set(p.id, p);
    w.version++;
  }

  function removePatch(w, id) {
    const p = w.byId.get(id);
    if (!p) return null;
    w.byId.delete(id);
    if (w.grid[p.y * w.W + p.x] === p) w.grid[p.y * w.W + p.x] = undefined;
    w.version++;
    return p;
  }

  function patchAt(w, x, y) {
    if (x < 0 || y < 0 || x >= w.W || y >= w.H) return undefined;
    return w.grid[y * w.W + x];
  }
  const kindAt = (w, x, y) => { const p = patchAt(w, x, y); return p ? p.kind : null; };

  function blockAt(w, x, y) {
    if (x < 0 || y < 0 || x >= w.W || y >= w.H) return null;
    return w.blockGrid[Math.floor(y / BLOCK) * w.BW + Math.floor(x / BLOCK)];
  }

  const blockById = (w, id) => w.blocks.find((b) => b.id === id) || null;

  // Plot index from coordinates inside a Block, or -1 on a lane.
  function plotIndexAt(lx, ly) {
    const ox = lx - PLOT_OFFSET, oy = ly - PLOT_OFFSET;
    if (ox < 0 || oy < 0) return -1;
    const px = Math.floor(ox / PLOT_STRIDE), py = Math.floor(oy / PLOT_STRIDE);
    if (px >= PLOTS_PER_SIDE || py >= PLOTS_PER_SIDE) return -1;
    if (ox % PLOT_STRIDE >= PLOT || oy % PLOT_STRIDE >= PLOT) return -1;
    return py * PLOTS_PER_SIDE + px;
  }

  function plotRect(block, index) {
    return {
      x: block.gx * BLOCK + PLOT_OFFSET + (index % PLOTS_PER_SIDE) * PLOT_STRIDE,
      y: block.gy * BLOCK + PLOT_OFFSET + Math.floor(index / PLOTS_PER_SIDE) * PLOT_STRIDE,
      w: PLOT,
      h: PLOT,
    };
  }

  function homeRect(w, player) {
    if (!player || player.homeBlock == null || player.homePlot == null) return null;
    const b = blockById(w, player.homeBlock);
    return b ? plotRect(b, player.homePlot) : null;
  }

  // Arrival order: the first free plot in the first Neighborhood Block that has one.
  function firstFreePlot(w) {
    const hoods = w.blocks.filter((b) => b.kind === 'neighborhood').sort((a, b) => a.id - b.id);
    for (const b of hoods) {
      for (let i = 0; i < PLOTS_PER_SIDE * PLOTS_PER_SIDE; i++) {
        if (!w.plotOwners.has(b.id * 100 + i)) return { block: b.id, plot: i };
      }
    }
    return null;
  }

  // ---------- Wonders and lots ----------

  const slotCache = new Map();
  // Every slot of a blueprint, in reading order.
  function slotsOf(blueprintId) {
    if (!slotCache.has(blueprintId)) {
      const out = [];
      BLUEPRINTS[blueprintId].rows.forEach((row, dy) => {
        for (let dx = 0; dx < row.length; dx++) {
          const kind = SLOT_KINDS[row[dx]];
          if (kind) out.push({ dx, dy, kind, index: out.length });
        }
      });
      slotCache.set(blueprintId, out);
    }
    return slotCache.get(blueprintId);
  }

  function lotRect(block, lot) {
    return { x: block.gx * BLOCK + LOTS[lot][0], y: block.gy * BLOCK + LOTS[lot][1], w: LOT, h: LOT };
  }

  // Where a blueprint sits inside a lot: centered.
  function placeInLot(blueprintId, block, lot) {
    const bp = BLUEPRINTS[blueprintId], r = lotRect(block, lot);
    return { x: r.x + Math.floor((LOT - bp.rows[0].length) / 2), y: r.y + Math.floor((LOT - bp.rows.length) / 2) };
  }

  function lotAt(w, x, y) {
    const block = blockAt(w, x, y);
    if (!block || block.kind !== 'commons') return null;
    for (let lot = 0; lot < LOTS.length; lot++) {
      const r = lotRect(block, lot);
      if (x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h) return { block, lot, rect: r };
    }
    return null;
  }

  const wonderInLot = (w, blockId, lot) => w.wonders.find((x) => x.block === blockId && x.lot === lot) || null;

  // What a square is, and who may build on it.
  //   plot: someone's home (owner is null for a free plot)   shared: a Neighborhood's common land
  //   commons: open land in a Commons   lot: an empty Wonder lot   founding: a Wonder still gathering founders
  //   slot / frame: part of a Wonder being built   outside: off the quilt
  function zoneOf(w, x, y) {
    const block = blockAt(w, x, y);
    if (!block) return { type: 'outside' };
    if (block.kind === 'commons') {
      const lot = lotAt(w, x, y);
      if (!lot) return { type: 'commons', block };
      const won = wonderInLot(w, block.id, lot.lot);
      if (!won) return { type: 'lot', block, lot: lot.lot };
      const bp = BLUEPRINTS[won.blueprint];
      if (won.status === 'founding') return { type: 'founding', block, wonder: won, bp };
      const dx = x - won.x, dy = y - won.y;
      const inside = dx >= 0 && dy >= 0 && dy < bp.rows.length && dx < bp.rows[0].length;
      const slotKind = inside ? SLOT_KINDS[bp.rows[dy][dx]] || null : null;
      return { type: slotKind ? 'slot' : 'frame', block, wonder: won, bp, slotKind };
    }
    const plot = plotIndexAt(x - block.gx * BLOCK, y - block.gy * BLOCK);
    if (plot >= 0) return { type: 'plot', block, plot, owner: w.plotOwners.get(block.id * 100 + plot) || null };
    return { type: 'shared', block };
  }

  function wonderProgress(w, won) {
    let filled = 0;
    const builders = new Map();
    for (const s of slotsOf(won.blueprint)) {
      const p = patchAt(w, won.x + s.dx, won.y + s.dy);
      if (!p) continue;
      filled++;
      if (p.owner) builders.set(p.owner, (builders.get(p.owner) || 0) + 1);
    }
    return { filled, slots: slotsOf(won.blueprint).length, builders };
  }

  // ---------- Allowance and inventory ----------
  // me.picks: patches you choose when placing   me.items: surprise patches (both count toward the cap)
  // me.keep: landmarks and decorations          me.gifts: patches friends gave you [{ id, kind, from }]

  const periodOf = (ms, periodMs) => Math.floor(ms / periodMs);

  function periodWord(periodMinutes) {
    if (periodMinutes >= 1440) return 'today';
    if (periodMinutes === 60) return 'this hour';
    return 'this round';
  }

  function itemCount(me) {
    let n = 0;
    for (const k in me.items) n += me.items[k] || 0;
    return n;
  }
  const heldTotal = (me) => (me.picks || 0) + itemCount(me);
  const giftCount = (me, kind) => (me.gifts || []).filter((g) => g.kind === kind).length;

  function available(me, kind) {
    if (!me || !PATCHES[kind]) return 0;
    if (isKeepsake(kind)) return (me.keep && me.keep[kind]) || 0;
    return (me.items[kind] || 0) + (PATCHES[kind].group === 'basic' ? me.picks : 0) + giftCount(me, kind);
  }

  // A gift is used first (so it carries the giver's name), then a matching surprise, then a pick.
  // Returns what was used: { used: 'gift' | 'item' | 'pick' | 'keep', from }.
  function spend(me, kind) {
    if (isKeepsake(kind)) {
      if (!me.keep || !me.keep[kind]) return null;
      me.keep[kind]--;
      if (!me.keep[kind]) delete me.keep[kind];
      return { used: 'keep' };
    }
    const gi = (me.gifts || []).findIndex((g) => g.kind === kind);
    if (gi >= 0) {
      const g = me.gifts[gi];
      me.gifts.splice(gi, 1);
      return { used: 'gift', from: g.from };
    }
    if ((me.items[kind] || 0) > 0) {
      me.items[kind]--;
      if (!me.items[kind]) delete me.items[kind];
      return { used: 'item' };
    }
    if (PATCHES[kind].group === 'basic' && me.picks > 0) {
      me.picks--;
      return { used: 'pick' };
    }
    return null;
  }

  // Grants every period since the last visit, stopping at the cap. Returns what it added.
  function accrue(me, period, rand) {
    const added = { picks: 0, items: [] };
    if (me.lastPeriod >= period) return added;
    const perPeriod = ALLOWANCE.picks + ALLOWANCE.surprises;
    const periods = Math.min(period - me.lastPeriod, Math.ceil(ALLOWANCE.cap / perPeriod) + 1);
    let total = heldTotal(me);
    for (let i = 0; i < periods && total < ALLOWANCE.cap; i++) {
      const picks = Math.min(ALLOWANCE.picks, ALLOWANCE.cap - total);
      me.picks += picks;
      added.picks += picks;
      total += picks;
      for (let j = 0; j < ALLOWANCE.surprises && total < ALLOWANCE.cap; j++) {
        const kind = pick(rand, SURPRISE_POOL);
        me.items[kind] = (me.items[kind] || 0) + 1;
        added.items.push(kind);
        total++;
      }
    }
    me.lastPeriod = period;
    return added;
  }

  // ---------- Placement ----------
  // opts: { wonderToday(wonderId) -> slots I've filled there this period, periodWord,
  //         commonsRequiresSignIn, signedIn }

  function canPlace(w, me, x, y, kind, opts) {
    opts = opts || {};
    const zone = zoneOf(w, x, y);
    const fail = (reason) => ({ ok: false, reason, zone });
    const info = PATCHES[kind];
    if (!info) return fail("That patch doesn't exist.");
    if (!me) return fail('Join the world to start building.');
    if (me.banned) return fail('Building is switched off for this account.');
    if (zone.type === 'outside') return fail("That's past the edge of the quilt.");
    if (patchAt(w, x, y)) return fail('Someone already patched this square.');
    if (zone.type === 'plot' && zone.owner !== me.id) {
      const owner = zone.owner && w.players.get(zone.owner);
      return fail(owner ? `That's ${owner.name}'s home. Only they can build there.` : 'That home plot is saved for a new neighbor.');
    }
    if (info.group === 'decor' && zone.type !== 'plot') return fail('Decorations go in your home.');
    if (zone.type === 'shared' && me.homeBlock !== zone.block.id) {
      return fail(`Only people who live in ${zone.block.name} can build on its shared land.`);
    }
    if (zone.type === 'lot') return fail(`This lot is saved for a new Wonder. Builders at Level ${FOUND_LEVEL} can found one here.`);
    if (zone.type === 'founding') return fail(`The ${zone.bp.name} is still gathering founders.`);
    if (zone.type === 'frame') return fail(`This square frames the ${zone.bp.name}.`);
    if ((zone.type === 'slot' || zone.type === 'commons') && opts.commonsRequiresSignIn && !opts.signedIn) {
      return fail('Sign in to build in the Commons.');
    }
    if (zone.type === 'slot') {
      if (zone.slotKind !== kind) return fail(`This Wonder slot needs a ${PATCHES[zone.slotKind].name}.`);
      const filled = opts.wonderToday ? opts.wonderToday(zone.wonder.id) : 0;
      if (filled >= ALLOWANCE.wonderPerPeriod) {
        return fail(`You've filled ${ALLOWANCE.wonderPerPeriod} slots in this Wonder ${opts.periodWord || 'today'}. Your next patches unlock more.`);
      }
    }
    if (available(me, kind) <= 0) {
      if (info.group === 'basic') return fail(`You're out of patches ${opts.periodWord || 'today'}.`);
      if (info.group === 'surprise') return fail(`You don't have a ${info.name} right now. They come as surprises.`);
      return fail(`You don't have a ${info.name}.`);
    }
    return { ok: true, zone };
  }

  // Whether a square touches someone else's patch (for the "build next to a neighbor" goal).
  function besideNeighbor(w, x, y, ownerId) {
    return N4.some(([dx, dy]) => { const p = patchAt(w, x + dx, y + dy); return p && p.owner && p.owner !== ownerId; });
  }

  // ---------- Founding a Wonder ----------

  function canFound(w, me, blueprintId, blockId, lot) {
    if (!me) return 'Join the world first.';
    if (levelOf(me.xp || 0) < FOUND_LEVEL) return `Founding a Wonder opens at Level ${FOUND_LEVEL}.`;
    if (!BLUEPRINTS[blueprintId]) return 'Pick a blueprint from the list.';
    const block = blockById(w, blockId);
    if (!block || block.kind !== 'commons' || lot < 0 || lot >= LOTS.length) return 'Wonders go on Commons lots.';
    if (wonderInLot(w, blockId, lot)) return 'That lot already has a Wonder.';
    if (w.wonders.some((x) => x.status === 'founding' && x.foundedBy === me.id)) return "You're already gathering founders for a Wonder.";
    return null;
  }

  // There's always a next Wonder. Once every Wonder is finished and none is gathering founders, the
  // town proposes one: the blueprint built least so far (ties go alphabetically), on the first free
  // Commons lot. Nobody has signed it yet. Returns { blueprint, blockId, lot }, or null.
  function nextProposal(w) {
    if (w.wonders.some((x) => !x.completedAt)) return null;
    const built = (id) => w.wonders.filter((x) => x.blueprint === id).length;
    const blueprint = Object.keys(BLUEPRINTS).sort().reduce((best, id) => (built(id) < built(best) ? id : best));
    for (const b of w.blocks.filter((x) => x.kind === 'commons').sort((a, c) => a.id - c.id)) {
      for (let lot = 0; lot < LOTS.length; lot++) if (!wonderInLot(w, b.id, lot)) return { blueprint, blockId: b.id, lot };
    }
    return null;
  }

  // ---------- Levels ----------

  function levelOf(xp) {
    let l = 1;
    while (xp >= levelFloor(l + 1)) l++;
    return l;
  }
  function levelInfo(xp) {
    const level = levelOf(xp || 0), floor = levelFloor(level), next = levelFloor(level + 1);
    return { level, into: (xp || 0) - floor, need: next - floor, next };
  }

  // Adds XP and pays Buttons for every level gained. Returns the new level if it went up.
  function grantXp(me, amount) {
    const before = levelOf(me.xp || 0);
    me.xp = (me.xp || 0) + amount;
    const after = levelOf(me.xp);
    for (let l = before + 1; l <= after; l++) me.buttons = (me.buttons || 0) + 20 * l;
    for (let l = before + 1; l <= after; l++) {
      const u = LEVEL_UNLOCKS[l];
      if (u && u.key.startsWith('style:')) {
        me.styles = me.styles || ['patchwork'];
        if (!me.styles.includes(u.key.slice(6))) me.styles.push(u.key.slice(6));
      }
    }
    return after > before ? after : null;
  }

  // ---------- Daily goals and the calendar ----------

  // Three goals for this player and day, the same every time they look.
  function goalsFor(playerId, day) {
    const ids = Object.keys(GOALS);
    const rand = mulberry32(hashString(`${playerId}:${day}`));
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    return ids.slice(0, 3);
  }

  // Applies today's calendar reward. Returns what was given, or null if today is already claimed.
  function claimCalendar(me, today, rand) {
    me.calendar = me.calendar || { day: 0, last: -1 };
    if (me.calendar.last === today) return null;
    const slot = me.calendar.day;
    const reward = CALENDAR[slot];
    const got = { day: slot + 1 };
    me.keep = me.keep || {};
    if (reward.buttons) { me.buttons = (me.buttons || 0) + reward.buttons; got.buttons = reward.buttons; }
    if (reward.decor) { const k = pick(rand, DECOR); me.keep[k] = (me.keep[k] || 0) + 1; got.keep = k; }
    if (reward.landmark) { const k = pick(rand, LANDMARKS); me.keep[k] = (me.keep[k] || 0) + 1; got.keep = k; }
    if (reward.outfit) {
      me.outfits = me.outfits || [];
      const fresh = Object.keys(OUTFITS).filter((o) => !me.outfits.includes(o));
      if (fresh.length) { const o = pick(rand, fresh); me.outfits.push(o); got.outfit = o; } else { me.buttons = (me.buttons || 0) + 60; got.buttons = 60; }
    }
    me.calendar = { day: (slot + 1) % CALENDAR.length, last: today };
    return got;
  }

  // ---------- Names and nations ----------

  function nameOptions(rand, count, taken) {
    const out = [];
    for (let i = 0; out.length < count && i < 400; i++) {
      const n = pick(rand, WORDS.adjectives) + ' ' + pick(rand, WORDS.nouns);
      if (!out.includes(n) && !(taken && taken.has(n))) out.push(n);
    }
    return out;
  }

  function isValidName(name) {
    const parts = String(name || '').split(' ');
    return parts.length === 2 && WORDS.adjectives.includes(parts[0]) && WORDS.nouns.includes(parts[1]);
  }

  // A suggestion from the device's language settings (en-GB -> GB). No location tracking.
  function suggestNation(nations, languages) {
    for (const lang of languages || []) {
      const region = String(lang).split('-')[1];
      if (!region) continue;
      const hit = nations.find(([code]) => code === region.toUpperCase());
      if (hit) return hit[0];
    }
    return null;
  }

  // Points from this week's building, divided by the nation's active builders,
  // so a small nation that plays well can beat a big one.
  function nationScores(w, nations, now) {
    const weekAgo = now - 7 * 864e5;
    const rows = new Map(nations.map(([code, name]) => [code, { code, name, points: 0, members: 0, active: new Set() }]));
    for (const p of w.players.values()) {
      const r = p.nation && rows.get(p.nation);
      if (r) r.members++;
    }
    for (const p of w.byId.values()) {
      if (!p.owner || p.at < weekAgo) continue;
      const owner = w.players.get(p.owner);
      const r = owner && owner.nation && rows.get(owner.nation);
      if (!r) continue;
      r.points += p.wonder ? 3 : 1;
      r.active.add(p.owner);
    }
    return [...rows.values()]
      .filter((r) => r.members > 0)
      .map((r) => ({ code: r.code, name: r.name, points: r.points, members: r.members, active: r.active.size, score: r.active.size ? r.points / r.active.size : 0 }))
      .sort((a, b) => b.score - a.score || b.points - a.points);
  }

  const api = {
    BLOCK, PLOT, PLOT_STRIDE, PLOT_OFFSET, PLOTS_PER_SIDE, LOT, LOTS, BLOCKS, PATCHES, KINDS, BASIC, LANDMARKS, DECOR,
    ALLOWANCE, SURPRISE_POOL, SLOT_KINDS, BLUEPRINTS, WONDERS, FOUNDERS_NEEDED, WONDER_BUTTONS, WORDS, N4, KIT, KIT_XP,
    XP, LEVEL_UNLOCKS, SHOP_LEVEL, FOUND_LEVEL, CALENDAR, GOALS, GOAL_BUTTONS, GOALS_BONUS,
    STICKERS, OUTFITS, STYLES, SHOP, WISHES, WISH_DAILY, COZY_BUTTONS, FABRICS, EVERYDAY_FABRICS, fabricOf, canUseFabric,
    CLUB_LEVEL, CLUB_FABRICS, CLUB_DAYS, clubFabricFor, isClub,
    mulberry32, hashString, dayOf, isKeepsake, blockCoords, blockFor,
    createWorld, setPlayer, addPatch, removePatch, patchAt, kindAt, blockAt, blockById,
    plotIndexAt, plotRect, homeRect, firstFreePlot, slotsOf, lotRect, placeInLot, lotAt, wonderInLot,
    zoneOf, wonderProgress, besideNeighbor, canFound, nextProposal,
    periodOf, periodWord, itemCount, heldTotal, available, spend, accrue, canPlace,
    levelFloor, levelOf, levelInfo, grantXp, goalsFor, claimCalendar,
    nameOptions, isValidName, suggestNation, nationScores,
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (typeof globalThis !== 'undefined' ? globalThis : root).QuiltRules = api;
})(this);
