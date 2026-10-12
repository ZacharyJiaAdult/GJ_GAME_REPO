/* Quiltopia — the demo server. The whole world lives in this browser's storage and follows the
   same rules as the online server. Simulated neighbors keep building, arriving, founding Wonders
   and leaving stickers while the page is open. To try two players on one computer, open
   index.html?player=2 in a second tab. */
(function (root) {
  'use strict';

  const R = root.QuiltRules;
  const ST = root.QuiltStitchlings;
  const VERSION = 2;
  const WORLD_KEY = 'quiltopia:demo-world:v' + VERSION;
  const EVENTS_KEY = 'quiltopia:demo-events';
  const SIM_KEY = 'quiltopia:demo-sim';
  const DAY = 864e5;

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const err = (error, extra) => Object.assign({ ok: false, error }, extra);
  const today = () => R.dayOf(Date.now());

  // Fields every player row has, so older rows and demo neighbors behave the same.
  function normalize(p) {
    return Object.assign(p, Object.assign({
      picks: 0, items: {}, keep: {}, gifts: [], lastPeriod: 0, helpPeriod: -1, helps: 0, banned: false,
      xp: 0, buttons: 0, calendar: { day: 0, last: -1 }, goals: { day: -1, done: [], bonus: false },
      stitchbook: {}, friends: [], visited: [], style: 'patchwork', styles: ['patchwork'], outfit: null, outfits: [],
      invitedBy: null, inviteRewarded: false, kitDone: false, giftDay: -1, wishes: {}, wishDay: -1, wishCount: 0,
      fabric: null, fabrics: [], clubUntil: 0,
    }, p));
  }

  class LocalServer {
    constructor(cfg, opts) {
      this.mode = 'demo';
      this.cfg = cfg;
      this.periodMs = cfg.periodMinutes * 60000;
      this.meKey = 'quiltopia:demo-me' + (opts.player ? ':' + opts.player : '');
      this.simOn = opts.sim !== false;
      this.listeners = new Set();
      this.tab = Math.random().toString(36).slice(2);
      this.rand = Math.random;
    }

    on(fn) { this.listeners.add(fn); }
    emit(ev) { for (const fn of this.listeners) fn(ev); }
    period() { return R.periodOf(Date.now(), this.periodMs); }
    periodWord() { return R.periodWord(this.cfg.periodMinutes); }
    meRow() { return this.meId ? this.world.players.get(this.meId) : null; }

    read() {
      try {
        const d = JSON.parse(localStorage.getItem(WORLD_KEY));
        return d && d.v === VERSION ? d : null;
      } catch (e) { return null; }
    }

    write() {
      this.data.rev++;
      try { localStorage.setItem(WORLD_KEY, JSON.stringify(this.data)); } catch (e) { /* storage full or blocked: this visit still works */ }
    }

    async init() {
      this.data = this.read();
      if (!this.data) {
        this.data = root.QuiltSeed.demoWorld(Date.now(), VERSION);
        this.write();
      }
      this.data.players.forEach(normalize);
      this.world = R.createWorld(this.data);
      window.addEventListener('storage', (e) => { if (e.key === WORLD_KEY) this.pull(); });
      let meId = null;
      try { meId = localStorage.getItem(this.meKey); } catch (e) { /* storage blocked */ }
      this.meId = meId && this.world.players.has(meId) ? meId : null;
      if (this.simOn) this.startSim();
      return { world: clone(this.publicData()), me: this.meId ? clone(this.meRow()) : null, periodMs: this.periodMs };
    }

    publicData() {
      const d = this.data, since = Date.now() - 3 * DAY;
      return {
        blocks: d.blocks, players: d.players, patches: d.patches, wonders: d.wonders,
        waterings: d.waterings, stickers: d.stickers.filter((s) => s.at >= since),
      };
    }

    // Another tab changed the world: load the newest copy and report what changed.
    pull() {
      const latest = this.read();
      if (!latest || latest.rev <= this.data.rev) return;
      if (latest.createdAt !== this.data.createdAt) {
        this.data = latest;
        this.world = R.createWorld(latest);
        this.emit({ type: 'reset' });
        return;
      }
      latest.players.forEach(normalize);
      const old = this.world, oldData = this.data;
      const oldWonders = new Map(old.wonders.map((w) => [w.id, JSON.stringify(w)]));
      const oldBlocks = new Set(oldData.blocks.map((b) => b.id));
      const counts = { waterings: oldData.waterings.length, stickers: oldData.stickers.length };
      const myGifts = this.meId ? (old.players.get(this.meId) || {}).gifts || [] : [];
      this.data = latest;
      this.world = R.createWorld(latest);
      for (const b of latest.blocks) {
        if (!oldBlocks.has(b.id)) this.emit({ type: 'block', block: clone(b), patches: [] });
      }
      for (const p of latest.players) {
        const o = old.players.get(p.id);
        if (!o || o.name !== p.name || o.nation !== p.nation || o.banned !== p.banned || o.style !== p.style || o.outfit !== p.outfit || o.fabric !== p.fabric || o.clubUntil !== p.clubUntil) {
          this.emit({ type: 'player', player: clone(p) });
        }
      }
      for (const p of latest.patches) if (!old.byId.has(p.id)) this.emit({ type: 'patch:add', patch: clone(p) });
      for (const id of old.byId.keys()) if (!this.world.byId.has(id)) this.emit({ type: 'patch:remove', id });
      for (const w of latest.wonders) if (oldWonders.get(w.id) !== JSON.stringify(w)) this.emit({ type: 'wonder', wonder: clone(w) });
      for (const wt of latest.waterings.slice(counts.waterings)) this.emit({ type: 'water', watering: clone(wt) });
      for (const s of latest.stickers.slice(counts.stickers)) this.emit({ type: 'sticker', sticker: clone(s) });
      const me = this.meRow();
      if (me) for (const g of me.gifts) if (!myGifts.some((x) => x.id === g.id)) this.emit({ type: 'gift', gift: clone(g) });
    }

    wonderToday(owner, wonderId, period) {
      let n = 0;
      for (const p of this.data.patches) {
        if (p.owner === owner && p.wonder === wonderId && R.periodOf(p.at, this.periodMs) === period) n++;
      }
      return n;
    }

    // Adds a patch and handles everything it sets off. Returns the patch.
    insert(x, y, kind, owner, zone, extra) {
      const patch = Object.assign({ id: this.data.nextId++, x, y, kind, owner, wonder: zone.type === 'slot' ? zone.wonder.id : null, at: Date.now() }, extra);
      if (owner && R.besideNeighbor(this.world, x, y, owner)) patch.beside = true;
      this.data.patches.push(patch);
      R.addPatch(this.world, patch);
      this.emit({ type: 'patch:add', patch: clone(patch) });
      if (patch.wonder) {
        const w = this.data.wonders.find((x) => x.id === patch.wonder);
        w.filled++;
        const finished = w.filled >= w.slots && !w.completedAt;
        if (finished) this.completeWonder(w);
        this.emit({ type: 'wonder', wonder: clone(w) });
        if (finished) this.proposeNext();
      }
      return patch;
    }

    // With every Wonder finished and none gathering founders, the town proposes the next one.
    proposeNext() {
      const next = R.nextProposal(this.world);
      if (!next) return null;
      const block = R.blockById(this.world, next.blockId);
      const w = Object.assign({
        id: this.data.nextWonder++, blueprint: next.blueprint, block: next.blockId, lot: next.lot, slots: R.slotsOf(next.blueprint).length, filled: 0,
        completedAt: null, status: 'founding', founders: [], foundedBy: null, foundedAt: Date.now(),
      }, R.placeInLot(next.blueprint, block, next.lot));
      this.data.wonders.push(w);
      this.emit({ type: 'wonder', wonder: clone(w) });
      return w;
    }

    // Every builder gets XP, Buttons and the Wonder's own Stitchling.
    completeWonder(w) {
      w.completedAt = Date.now();
      const sprite = R.BLUEPRINTS[w.blueprint].sprite;
      for (const id of R.wonderProgress(this.world, w).builders.keys()) {
        const p = this.world.players.get(id);
        if (!p) continue;
        R.grantXp(p, R.XP.wonderDone);
        p.buttons += R.WONDER_BUTTONS;
        if (!p.stitchbook[sprite]) p.stitchbook[sprite] = Date.now();
      }
    }

    removeAt(patch) {
      const i = this.data.patches.indexOf(patch);
      if (i >= 0) this.data.patches.splice(i, 1);
      R.removePatch(this.world, patch.id);
      this.emit({ type: 'patch:remove', id: patch.id });
      if (patch.wonder) {
        const w = this.data.wonders.find((x) => x.id === patch.wonder);
        w.filled--;
        if (w.filled < w.slots) w.completedAt = null;
        this.emit({ type: 'wonder', wonder: clone(w) });
      }
    }

    // When every home plot is taken, stitch new Blocks onto the quilt until one has a home free
    // (every fourth new Block is a Commons, with no homes). Returns the new Neighborhood.
    growIfFull() {
      let grew = null;
      while (!R.firstFreePlot(this.world)) {
        const block = R.blockFor(this.data.blocks.length);
        this.data.blocks.push(block);
        const patches = root.QuiltSeed.landscapeFor(block).map((l) => ({ id: this.data.nextId++, x: l.x, y: l.y, kind: l.kind, owner: null, wonder: null, at: Date.now() }));
        this.data.patches.push(...patches);
        this.world = R.createWorld(this.data);
        this.emit({ type: 'block', block: clone(block), patches: clone(patches) });
        if (block.kind === 'neighborhood') grew = block;
      }
      return grew;
    }

    reward(me, xp) { R.grantXp(me, xp); }

    // The reply to a player action, noting a level-up since `levelBefore`.
    result(me, extra, levelBefore) {
      const out = Object.assign({ ok: true, me: clone(me) }, extra);
      if (levelBefore != null && R.levelOf(me.xp) > levelBefore) out.levelUp = R.levelOf(me.xp);
      return out;
    }

    // ---------- Joining and the daily allowance ----------

    async join({ name, nation, invitedBy }) {
      this.pull();
      if (this.meId) return this.result(this.meRow(), { added: { picks: 0, items: [] } });
      if (!R.isValidName(name)) return err('Pick a name from the list.');
      const grew = this.growIfFull();
      const home = R.firstFreePlot(this.world);
      const now = Date.now(), period = this.period();
      const me = normalize({
        id: 'p-' + Math.random().toString(36).slice(2, 10), name, nation: nation || null,
        homeBlock: home ? home.block : null, homePlot: home ? home.plot : null,
        lastPeriod: period - 1, createdAt: now,
        // The welcome kit: five patches with glowing spots in your home showing where they go.
        gifts: R.KIT.map((k, i) => ({ id: 'kit-' + i, kind: k.kind, from: 'kit' })),
      });
      const added = R.accrue(me, period, this.rand);
      const inviter = invitedBy && this.world.players.get(invitedBy);
      if (inviter) {
        me.invitedBy = inviter.id;
        me.friends.push(inviter.id);
        if (!inviter.friends.includes(me.id)) inviter.friends.push(me.id);
      }
      this.data.players.push(me);
      R.setPlayer(this.world, me);
      this.meId = me.id;
      try { localStorage.setItem(this.meKey, me.id); } catch (e) { /* storage blocked */ }
      this.write();
      this.emit({ type: 'player', player: clone(me) });
      return this.result(me, { added, grew: grew ? grew.name : null });
    }

    async refresh() {
      this.pull();
      const me = this.meRow();
      if (!me) return err('Join the world first.');
      const before = me.lastPeriod;
      const added = R.accrue(me, this.period(), this.rand);
      const clubFabric = this.grantClubFabric(me);
      if (me.lastPeriod !== before || clubFabric) this.write();
      return this.result(me, { added, clubFabric });
    }

    // ---------- The Quiltopia Club ----------

    // A member gets each month's Club fabric to keep. Returns it if it was just given.
    grantClubFabric(me) {
      if (!R.isClub(me)) return null;
      const f = R.clubFabricFor(Date.now());
      if (me.fabrics.includes(f)) return null;
      me.fabrics.push(f);
      return f;
    }

    // The demo has no payments: joining is pretend, for a month. Online, Stripe does this (README).
    async joinClub() {
      this.pull();
      const me = this.meRow();
      if (!me) return err('Join the world first.');
      if (R.levelOf(me.xp) < R.CLUB_LEVEL) return err(`The Club opens at Level ${R.CLUB_LEVEL}.`);
      me.clubUntil = Math.max(me.clubUntil || 0, Date.now()) + R.CLUB_DAYS * 864e5;
      const clubFabric = this.grantClubFabric(me);
      this.write();
      this.emit({ type: 'player', player: clone(me) });
      return this.result(me, { clubFabric: clubFabric || R.clubFabricFor(Date.now()) });
    }

    async place(x, y, kind) {
      this.pull();
      const me = this.meRow();
      if (!me) return err('Join the world first.');
      const period = this.period();
      R.accrue(me, period, this.rand);
      const check = R.canPlace(this.world, me, x, y, kind, {
        wonderToday: (id) => this.wonderToday(me.id, id, period),
        periodWord: this.periodWord(),
      });
      if (!check.ok) { this.write(); return err(check.reason, { me: clone(me) }); }
      const lv = R.levelOf(me.xp);
      const spent = R.spend(me, kind);
      const patch = this.insert(x, y, kind, me.id, check.zone, spent.used === 'gift' ? { gift: spent.from } : null);
      this.reward(me, patch.wonder ? R.XP.wonderSlot : R.XP.patch);
      const extra = { patch: clone(patch) };
      // The welcome kit is done when its last patch is placed.
      if (spent.from === 'kit' && !me.kitDone && !me.gifts.some((g) => g.from === 'kit')) {
        me.kitDone = true;
        extra.kitDone = true;
        this.reward(me, R.KIT_XP);
      }
      // A friend who came in through an invite and fills their first Wonder slot rewards the inviter.
      if (patch.wonder && me.invitedBy && !me.inviteRewarded) {
        me.inviteRewarded = true;
        const inviter = this.world.players.get(me.invitedBy);
        if (inviter) R.grantXp(inviter, R.XP.inviteFilled);
      }
      const wishes = this.grantWishes(me);
      if (wishes.length) extra.wishes = wishes;
      this.write();
      return this.result(me, extra, lv);
    }

    // Wishes this player's homes have newly had granted: [{ x, y, need }] at each home's anchor.
    // Each pays once per home, up to WISH_DAILY a day; a home with everything is very cozy.
    grantWishes(me) {
      const day = today(), out = [];
      if (me.wishDay !== day) { me.wishDay = day; me.wishCount = 0; }
      for (const h of ST.homes(this.world)) {
        if (h.owner !== me.id) continue;
        const key = h.anchor.x + ',' + h.anchor.y;
        const done = me.wishes[key] || (me.wishes[key] = []);
        for (const need of Object.keys(R.WISHES)) {
          if (!h.needs[need] || done.includes(need) || me.wishCount >= R.WISH_DAILY) continue;
          done.push(need);
          me.wishCount++;
          this.reward(me, R.XP.wish);
          out.push({ x: h.anchor.x, y: h.anchor.y, need });
        }
        if (Object.keys(R.WISHES).every((n) => h.needs[n]) && !done.includes('cozy')) {
          done.push('cozy');
          me.buttons += R.COZY_BUTTONS;
          out.push({ x: h.anchor.x, y: h.anchor.y, need: 'cozy' });
        }
        if (!done.length) delete me.wishes[key];
      }
      return out;
    }

    // Patches in your own home can be picked up and rearranged; everything else is permanent.
    async pickUp(id) {
      this.pull();
      const me = this.meRow();
      const patch = this.world.byId.get(id);
      if (!me || !patch || patch.owner !== me.id) return err('You can only pick up your own patches.');
      if (R.zoneOf(this.world, patch.x, patch.y).type !== 'plot') return err('Patches outside your home stay for the whole season.');
      if (R.isKeepsake(patch.kind)) me.keep[patch.kind] = (me.keep[patch.kind] || 0) + 1;
      else if (R.heldTotal(me) >= R.ALLOWANCE.cap) return err(`Your bag is full (${R.ALLOWANCE.cap}). Place a patch first.`);
      else me.items[patch.kind] = (me.items[patch.kind] || 0) + 1;
      this.removeAt(patch);
      this.write();
      return this.result(me);
    }

    async water(id) {
      this.pull();
      const me = this.meRow();
      const garden = this.world.byId.get(id);
      if (!me || !garden || garden.kind !== 'garden') return err('Only gardens can be watered.');
      if (garden.owner === me.id) return err("That's your own garden. Water a neighbor's to earn a bonus patch.");
      const period = this.period();
      if (this.data.waterings.some((w) => w.garden === id && w.helper === me.id && w.period === period)) {
        return err(`You've already watered this garden ${this.periodWord()}.`);
      }
      const lv = R.levelOf(me.xp);
      if (me.helpPeriod !== period) { me.helpPeriod = period; me.helps = 0; }
      me.helps++;
      const bonus = me.helps <= R.ALLOWANCE.helpBonus && R.heldTotal(me) < R.ALLOWANCE.cap;
      if (bonus) me.picks++;
      const watering = { garden: id, helper: me.id, period, at: Date.now() };
      this.data.waterings.push(watering);
      if (this.data.waterings.length > 800) this.data.waterings.splice(0, 100);
      this.reward(me, R.XP.water);
      this.write();
      this.emit({ type: 'water', watering: clone(watering) });
      return this.result(me, { bonus }, lv);
    }

    async report(id, reason) {
      this.pull();
      const patch = this.world.byId.get(id);
      if (!patch) return err('That patch is gone already.');
      this.data.reports.push({
        id: this.data.nextId++, patch: id, x: patch.x, y: patch.y, kind: patch.kind, owner: patch.owner,
        reporter: this.meId, reason, at: Date.now(), resolved: false,
      });
      this.write();
      return { ok: true };
    }

    async setName(name) {
      this.pull();
      const me = this.meRow();
      if (!me || !R.isValidName(name)) return err('Pick a name from the list.');
      me.name = name;
      this.write();
      this.emit({ type: 'player', player: clone(me) });
      return this.result(me);
    }

    async setNation(code) {
      this.pull();
      const me = this.meRow();
      if (!me) return err('Join the world first.');
      if (code && !this.cfg.nations.some(([c]) => c === code)) return err('Pick a nation from the list.');
      me.nation = code || null;
      this.write();
      this.emit({ type: 'player', player: clone(me) });
      return this.result(me);
    }

    async nationBoard() {
      this.pull();
      return R.nationScores(this.world, this.cfg.nations, Date.now());
    }

    // ---------- Stitchlings and exploring ----------

    async meet(species, x, y, night) {
      this.pull();
      const me = this.meRow();
      if (!me) return err('Join the world first.');
      const s = ST.SPECIES[species];
      if (!s) return err('That Stitchling wandered off.');
      if (s.page === 'wonder') {
        return me.stitchbook[species] ? this.result(me, { isNew: false })
          : err(`Only the builders of the ${R.BLUEPRINTS[s.wonder].name} get this one.`);
      }
      if (!ST.meetAllowed(this.world, species, x, y, { night })) return err('That Stitchling wandered off.');
      this.data.meets.push({ player: me.id, species, at: Date.now() });
      if (this.data.meets.length > 2000) this.data.meets.splice(0, 200);
      if (me.stitchbook[species]) { this.write(); return this.result(me, { isNew: false }); }
      const lv = R.levelOf(me.xp);
      me.stitchbook[species] = Date.now();
      this.reward(me, R.XP.meet);
      const extra = { isNew: true };
      // A finished Stitchbook page pays out once.
      const page = ST.PAGES.find((pg) => pg.id === s.page);
      const prog = ST.pageProgress(me.stitchbook, s.page);
      if (prog.found === prog.total) {
        me.buttons += page.reward.buttons;
        me.keep[page.reward.keep] = (me.keep[page.reward.keep] || 0) + 1;
        extra.pageDone = page.id;
      }
      this.write();
      return this.result(me, extra, lv);
    }

    async visit(blockId) {
      this.pull();
      const me = this.meRow();
      if (!me || me.visited.includes(blockId) || me.homeBlock === blockId) return { ok: true, isNew: false };
      me.visited.push(blockId);
      this.data.visits.push({ player: me.id, block: blockId, at: Date.now() });
      this.write();
      return this.result(me, { isNew: true });
    }

    // ---------- The calendar and daily goals ----------

    async claimDay() {
      this.pull();
      const me = this.meRow();
      if (!me) return err('Join the world first.');
      const reward = R.claimCalendar(me, today(), this.rand);
      if (reward) this.write();
      return this.result(me, { reward });
    }

    goalState(me) {
      const day = today(), since = day * DAY;
      if (!me.goals || me.goals.day !== day) me.goals = { day, done: [], bonus: false };
      const mine = (p) => p.owner === me.id && p.at >= since;
      const counts = {
        place3: this.data.patches.filter(mine).length,
        wonder1: this.data.patches.filter((p) => mine(p) && p.wonder).length,
        water2: this.data.waterings.filter((w) => w.helper === me.id && w.at >= since).length,
        sticker1: this.data.stickers.filter((s) => s.from === me.id && s.at >= since).length,
        meet1: this.data.meets.filter((m) => m.player === me.id && m.at >= since).length,
        visit1: this.data.visits.filter((v) => v.player === me.id && v.at >= since).length,
        gift1: this.data.gifts.filter((g) => g.from === me.id && g.at >= since).length,
        beside1: this.data.patches.filter((p) => mine(p) && p.beside).length,
      };
      return {
        day,
        bonus: me.goals.bonus,
        list: R.goalsFor(me.id, day).map((id) => ({
          id, text: R.GOALS[id].text, target: R.GOALS[id].target, count: Math.min(counts[id], R.GOALS[id].target),
          done: counts[id] >= R.GOALS[id].target, claimed: me.goals.done.includes(id),
        })),
      };
    }

    async goals() {
      this.pull();
      const me = this.meRow();
      return me ? this.goalState(me) : null;
    }

    // Pays out any goals finished since last time, plus a bonus when all three are done.
    async claimGoals() {
      this.pull();
      const me = this.meRow();
      if (!me) return err('Join the world first.');
      const lv = R.levelOf(me.xp);
      const state = this.goalState(me);
      const newly = state.list.filter((g) => g.done && !g.claimed);
      for (const g of newly) {
        me.goals.done.push(g.id);
        me.buttons += R.GOAL_BUTTONS;
        this.reward(me, R.XP.goal);
      }
      let bonus = false;
      if (!me.goals.bonus && me.goals.done.length >= 3) { me.goals.bonus = true; me.buttons += R.GOALS_BONUS; bonus = true; }
      if (newly.length || bonus) this.write();
      return this.result(me, { newly: newly.map((g) => g.id), bonus, goals: this.goalState(me) }, lv);
    }

    // ---------- Kindness: stickers, gifts, friends ----------

    async sticker(target, kind) {
      this.pull();
      const me = this.meRow();
      if (!me) return err('Join the world first.');
      if (!R.STICKERS[kind]) return err('Pick a sticker.');
      const [type, rawId] = String(target).split(':');
      if (type === 'home') {
        if (rawId === me.id) return err('Stickers are for other people\'s homes.');
        if (!this.world.players.has(rawId)) return err('That home is empty.');
      } else if (type !== 'wonder' || !this.data.wonders.some((w) => String(w.id) === rawId)) return err('Stickers go on homes and Wonders.');
      const day = today();
      if (this.data.stickers.some((s) => s.from === me.id && s.target === target && s.day === day)) return err('You already left a sticker here today.');
      const lv = R.levelOf(me.xp);
      const sticker = { id: this.data.nextId++, from: me.id, target, kind, at: Date.now(), day };
      this.data.stickers.push(sticker);
      if (this.data.stickers.length > 1500) this.data.stickers.splice(0, 200);
      this.reward(me, R.XP.sticker);
      this.write();
      this.emit({ type: 'sticker', sticker: clone(sticker) });
      return this.result(me, {}, lv);
    }

    async gift(toId, kind) {
      this.pull();
      const me = this.meRow();
      const to = this.world.players.get(toId);
      if (!me || !to || to.id === me.id) return err('Pick a friend or neighbor to send it to.');
      if (!me.friends.includes(to.id) && me.homeBlock !== to.homeBlock) return err('You can gift patches to friends and neighbors.');
      if (!R.PATCHES[kind] || R.isKeepsake(kind)) return err('Pick a patch from your bag.');
      if (me.giftDay === today()) return err('You can send one gift a day. Try again tomorrow.');
      // Gifts come from your own daily patches, never from gifts you were given.
      if ((me.items[kind] || 0) > 0) { me.items[kind]--; if (!me.items[kind]) delete me.items[kind]; }
      else if (R.PATCHES[kind].group === 'basic' && me.picks > 0) me.picks--;
      else return err(`You don't have a ${R.PATCHES[kind].name} to give.`);
      const lv = R.levelOf(me.xp);
      const gift = { id: 'g' + this.data.nextId++, kind, from: me.id, at: Date.now() };
      to.gifts.push(gift);
      this.data.gifts.push({ from: me.id, to: to.id, kind, at: gift.at });
      me.giftDay = today();
      this.reward(me, R.XP.gift);
      this.write();
      return this.result(me, {}, lv);
    }

    async addFriend(id) {
      this.pull();
      const me = this.meRow();
      if (!me || !this.world.players.has(id) || id === me.id) return err('That builder is gone.');
      if (!me.friends.includes(id)) me.friends.push(id);
      this.write();
      return this.result(me);
    }

    async removeFriend(id) {
      this.pull();
      const me = this.meRow();
      if (!me) return err('Join the world first.');
      me.friends = me.friends.filter((f) => f !== id);
      this.write();
      return this.result(me);
    }

    // ---------- The Button Shop ----------

    async buy(itemId) {
      this.pull();
      const me = this.meRow();
      const item = R.SHOP.find((s) => s.id === itemId);
      if (!me || !item) return err('That item is sold out.');
      if (R.levelOf(me.xp) < R.SHOP_LEVEL) return err(`The Button Shop opens at Level ${R.SHOP_LEVEL}.`);
      if (item.type === 'outfit' && me.outfits.includes(itemId)) return err('You already have that outfit.');
      if (item.type === 'fabric' && me.fabrics.includes(itemId)) return err('You already have that fabric.');
      if (me.buttons < item.price) return err(`You need ${item.price - me.buttons} more Buttons.`);
      me.buttons -= item.price;
      if (item.type === 'decor') me.keep[itemId] = (me.keep[itemId] || 0) + 1;
      else if (item.type === 'fabric') me.fabrics.push(itemId);
      else me.outfits.push(itemId);
      this.write();
      return this.result(me);
    }

    async equip(change) {
      this.pull();
      const me = this.meRow();
      if (!me) return err('Join the world first.');
      if ('style' in change) {
        if (!me.styles.includes(change.style)) return err('That roof style is still locked.');
        me.style = change.style;
      }
      if ('outfit' in change) {
        if (change.outfit && !me.outfits.includes(change.outfit)) return err('Get that outfit first.');
        me.outfit = change.outfit || null;
      }
      if ('fabric' in change) {
        if (change.fabric && !R.canUseFabric(me, change.fabric)) return err('That fabric is still locked.');
        me.fabric = change.fabric || null;
      }
      this.write();
      this.emit({ type: 'player', player: clone(me) });
      return this.result(me);
    }

    // ---------- Founding Wonders ----------

    async foundWonder(blueprint, blockId, lot) {
      this.pull();
      const me = this.meRow();
      const problem = R.canFound(this.world, me, blueprint, blockId, lot);
      if (problem) return err(problem);
      const block = R.blockById(this.world, blockId);
      const w = Object.assign({
        id: this.data.nextWonder++, blueprint, block: blockId, lot, slots: R.slotsOf(blueprint).length, filled: 0,
        completedAt: null, status: 'founding', founders: [me.id], foundedBy: me.id, foundedAt: Date.now(),
      }, R.placeInLot(blueprint, block, lot));
      this.data.wonders.push(w);
      this.write();
      this.emit({ type: 'wonder', wonder: clone(w) });
      return this.result(me, { wonder: clone(w) });
    }

    async signFounder(wonderId) {
      this.pull();
      const me = this.meRow();
      const w = this.data.wonders.find((x) => x.id === wonderId);
      if (!me || !w || w.status !== 'founding') return err('That Wonder is already underway.');
      if (w.founders.includes(me.id)) return err("You've already signed.");
      const lv = R.levelOf(me.xp);
      this.addFounder(w, me.id);
      this.write();
      return this.result(me, { wonder: clone(w) }, lv);
    }

    // Adds a founder; at ten, the Wonder opens for building and every founder gets XP.
    addFounder(w, playerId) {
      w.founders.push(playerId);
      if (w.founders.length >= R.FOUNDERS_NEEDED) {
        w.status = 'open';
        w.openedAt = Date.now();
        for (const id of w.founders) {
          const p = this.world.players.get(id);
          if (p) this.reward(p, R.XP.founded);
        }
      }
      this.emit({ type: 'wonder', wonder: clone(w) });
    }

    // ---------- Moderation (in the demo, you moderate your own world) ----------

    async isAdmin() { return true; }

    async listReports() {
      this.pull();
      return this.data.reports.filter((r) => !r.resolved).map((r) => Object.assign({}, r, {
        ownerName: r.owner ? (this.world.players.get(r.owner) || {}).name : null,
        reporterName: (this.world.players.get(r.reporter) || {}).name,
      }));
    }

    async resolveReport(id) {
      this.pull();
      const r = this.data.reports.find((x) => x.id === id);
      if (r) r.resolved = true;
      this.write();
      return { ok: true };
    }

    async removePatch(id) {
      this.pull();
      const patch = this.world.byId.get(id);
      if (patch) this.removeAt(patch);
      for (const r of this.data.reports) if (r.patch === id) r.resolved = true;
      this.write();
      return { ok: true, removed: patch ? 1 : 0 };
    }

    // Removes every player-made patch within `radius` squares placed in the last `hours`.
    async rollbackArea(x, y, radius, hours) {
      this.pull();
      const since = Date.now() - hours * 3600e3;
      const doomed = this.data.patches.filter((p) => p.owner && p.at >= since && Math.abs(p.x - x) <= radius && Math.abs(p.y - y) <= radius);
      for (const p of doomed) this.removeAt(p);
      for (const r of this.data.reports) if (Math.abs(r.x - x) <= radius && Math.abs(r.y - y) <= radius) r.resolved = true;
      this.write();
      return { ok: true, removed: doomed.length };
    }

    async banPlayer(id) {
      this.pull();
      const p = this.world.players.get(id);
      if (!p) return err('No such player.');
      p.banned = true;
      this.write();
      this.emit({ type: 'player', player: clone(p) });
      return { ok: true };
    }

    // ---------- Analytics (kept apart from the world so it doesn't slow saves down) ----------

    track(name, props) {
      try {
        const list = JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]');
        list.push({ name, props: props || {}, at: Date.now(), player: this.meId });
        localStorage.setItem(EVENTS_KEY, JSON.stringify(list.slice(-800)));
      } catch (e) { /* storage blocked */ }
    }

    resetWorld() {
      const rev = this.data.rev;
      this.data = root.QuiltSeed.demoWorld(Date.now(), VERSION);
      this.data.rev = rev;
      this.write();
      try { localStorage.removeItem(this.meKey); } catch (e) { /* storage blocked */ }
    }

    // ---------- Simulated neighbors ----------
    // Only one open tab runs the simulation, so two tabs don't double the activity.

    startSim() {
      const tick = () => {
        this.simTimer = setTimeout(tick, 3500 + Math.random() * 4500);
        if (document.hidden || !this.isSimLeader()) return;
        this.pull();
        this.simStep(Math.random);
      };
      this.simTimer = setTimeout(tick, 2500);
    }

    stopSim() { clearTimeout(this.simTimer); }

    isSimLeader() {
      const now = Date.now();
      let hb = null;
      try { hb = JSON.parse(localStorage.getItem(SIM_KEY)); } catch (e) { /* storage blocked */ }
      if (hb && hb.tab !== this.tab && now - hb.at < 12000) return false;
      try { localStorage.setItem(SIM_KEY, JSON.stringify({ tab: this.tab, at: now })); } catch (e) { /* storage blocked */ }
      return true;
    }

    simStep(rand) {
      const neighbors = this.data.players.filter((p) => p.demo && !p.banned);
      if (!neighbors.length) return;
      const who = neighbors[Math.floor(rand() * neighbors.length)];
      const roll = rand();
      const founding = this.data.wonders.find((w) => w.status === 'founding');
      if (roll < 0.05 && this.simArrival(rand)) return;
      if (roll < 0.1 && this.simWater(who, rand)) return;
      if (roll < 0.16 && this.simSticker(rand)) return;
      if (roll < 0.18 && this.simGift(rand)) return;
      if (founding && roll < 0.3 && !founding.founders.includes(who.id)) {
        this.addFounder(founding, who.id);
        this.write();
        return;
      }
      const open = this.data.wonders.filter((w) => w.status === 'open' && !w.completedAt);
      const won = open[Math.floor(rand() * open.length)];
      const spot = won && roll < 0.5 ? this.simWonderSpot(won, who, rand)
        : roll < 0.85 ? this.simHomeSpot(who, rand)
          : this.simSharedSpot(who, rand);
      if (!spot || R.patchAt(this.world, spot.x, spot.y)) return;
      this.insert(spot.x, spot.y, spot.kind, who.id, R.zoneOf(this.world, spot.x, spot.y));
      this.write();
    }

    // A new neighbor moves in (and when the plots run out, the quilt grows).
    simArrival(rand) {
      const taken = new Set(this.data.players.map((p) => p.name));
      const name = R.nameOptions(rand, 1, taken)[0];
      if (!name) return false;
      this.growIfFull();
      const home = R.firstFreePlot(this.world);
      if (!home) return false;
      const nations = ['BR', 'US', 'DE', 'JP', 'MX', 'PH', 'FR', 'GB', 'IN', 'KR'];
      const p = normalize({
        id: 'demo-' + this.data.nextId++, name, nation: nations[Math.floor(rand() * nations.length)], homeBlock: home.block, homePlot: home.plot,
        demo: true, createdAt: Date.now(), xp: 0,
      });
      this.data.players.push(p);
      R.setPlayer(this.world, p);
      this.emit({ type: 'player', player: clone(p) });
      const rect = R.homeRect(this.world, p);
      for (const k of R.KIT.slice(0, 1 + Math.floor(rand() * R.KIT.length))) {
        const x = rect.x + k.dx, y = rect.y + k.dy;
        if (!R.patchAt(this.world, x, y)) this.insert(x, y, k.kind, p.id, R.zoneOf(this.world, x, y));
      }
      this.write();
      return true;
    }

    // Wonders grow outward from what's already stitched.
    simWonderSpot(won, who, rand) {
      if (this.wonderToday(who.id, won.id, this.period()) >= R.ALLOWANCE.wonderPerPeriod) return null;
      let best = [], bestScore = -1;
      const bottom = R.BLUEPRINTS[won.blueprint].rows.length - 1;
      for (const s of R.slotsOf(won.blueprint)) {
        const x = won.x + s.dx, y = won.y + s.dy;
        if (R.patchAt(this.world, x, y)) continue;
        // Start from the bottom row, then grow outward from what's stitched.
        const score = R.N4.filter(([dx, dy]) => R.patchAt(this.world, x + dx, y + dy)).length + (s.dy === bottom ? 0.5 : 0);
        if (score > bestScore) { best = []; bestScore = score; }
        if (score === bestScore) best.push({ x, y, kind: s.kind });
      }
      return best.length ? best[Math.floor(rand() * best.length)] : null;
    }

    // Homes grow in clumps: houses next to houses, gardens next to gardens.
    simHomeSpot(who, rand) {
      const rect = R.homeRect(this.world, who);
      if (!rect) return null;
      const kinds = ['house', 'house', 'garden', 'garden', 'tree', 'tree', 'path', 'park', 'lantern', 'water', 'market'];
      const kind = kinds[Math.floor(rand() * kinds.length)];
      let best = null, bestScore = -1;
      for (let y = rect.y; y < rect.y + rect.h; y++) {
        for (let x = rect.x; x < rect.x + rect.w; x++) {
          if (R.patchAt(this.world, x, y)) continue;
          let score = rand();
          for (const [dx, dy] of R.N4) {
            const n = R.patchAt(this.world, x + dx, y + dy);
            if (n) score += n.kind === kind ? 3 : 1;
          }
          if (score > bestScore) { best = { x, y, kind }; bestScore = score; }
        }
      }
      return best;
    }

    // Shared land: groves spread and paths stretch a little at a time.
    simSharedSpot(who, rand) {
      const block = R.blockById(this.world, who.homeBlock);
      if (!block) return null;
      for (let tries = 0; tries < 40; tries++) {
        const x = block.gx * R.BLOCK + Math.floor(rand() * R.BLOCK), y = block.gy * R.BLOCK + Math.floor(rand() * R.BLOCK);
        const seed = R.patchAt(this.world, x, y);
        if (!seed || (seed.kind !== 'tree' && seed.kind !== 'path' && seed.kind !== 'garden')) continue;
        const [dx, dy] = R.N4[Math.floor(rand() * 4)];
        const nx = x + dx, ny = y + dy;
        if (R.patchAt(this.world, nx, ny) || R.zoneOf(this.world, nx, ny).type !== 'shared') continue;
        if (seed.kind === 'path') {
          const touching = R.N4.filter(([ax, ay]) => R.kindAt(this.world, nx + ax, ny + ay) === 'path').length;
          if (touching !== 1) continue; // keep paths as lines, not blobs
        }
        return { x: nx, y: ny, kind: seed.kind };
      }
      return null;
    }

    // Now and then a neighbor waters your garden, so kindness shows up in the demo too.
    simWater(who) {
      const me = this.meRow();
      if (!me) return false;
      const period = this.period();
      const gardens = this.data.patches.filter((p) => p.kind === 'garden' && p.owner === me.id);
      if (!gardens.length) return false;
      const g = gardens[Math.floor(Math.random() * gardens.length)];
      if (this.data.waterings.some((w) => w.garden === g.id && w.period === period)) return false;
      const watering = { garden: g.id, helper: who.id, period, at: Date.now() };
      this.data.waterings.push(watering);
      this.write();
      this.emit({ type: 'water', watering: clone(watering) });
      return true;
    }

    // Neighbors notice what you build and leave stickers on your home.
    simSticker(rand) {
      const me = this.meRow();
      if (!me || this.data.patches.filter((p) => p.owner === me.id).length < 2) return false;
      const near = this.data.players.filter((p) => p.demo && (p.homeBlock === me.homeBlock || me.friends.includes(p.id)));
      if (!near.length) return false;
      const from = near[Math.floor(rand() * near.length)];
      const target = 'home:' + me.id, day = today();
      if (this.data.stickers.some((s) => s.from === from.id && s.target === target && s.day === day)) return false;
      const kinds = Object.keys(R.STICKERS);
      const sticker = { id: this.data.nextId++, from: from.id, target, kind: kinds[Math.floor(rand() * kinds.length)], at: Date.now(), day };
      this.data.stickers.push(sticker);
      this.write();
      this.emit({ type: 'sticker', sticker: clone(sticker) });
      return true;
    }

    // A friend sends you a patch now and then.
    simGift(rand) {
      const me = this.meRow();
      if (!me || !me.friends.length) return false;
      const friend = this.world.players.get(me.friends[Math.floor(rand() * me.friends.length)]);
      if (!friend || !friend.demo || friend.giftDay === today()) return false;
      const kind = R.BASIC[Math.floor(rand() * R.BASIC.length)];
      const gift = { id: 'g' + this.data.nextId++, kind, from: friend.id, at: Date.now() };
      me.gifts.push(gift);
      friend.giftDay = today();
      this.data.gifts.push({ from: friend.id, to: me.id, kind, at: gift.at });
      this.write();
      this.emit({ type: 'gift', gift: clone(gift) });
      return true;
    }
  }

  root.QuiltLocal = LocalServer;
})(this);
