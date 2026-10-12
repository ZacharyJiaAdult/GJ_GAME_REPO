/* Quiltopia — the online server: Supabase for sign-in, the shared database and live updates.
   Used when js/config.js has a Supabase URL and anon key. It offers the same actions as the demo
   server (js/local-server.js); the database functions in supabase/schema.sql check every rule
   again, so a modified client can't cheat. */
(function (root) {
  'use strict';

  const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const DAY = 864e5;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Could not load the Supabase library.'));
      document.head.appendChild(s);
    });
  }

  // Table rows use snake_case; the game uses camelCase. (Player actions already reply in the
  // game's shape, built by the database.)
  const time = (t) => (t ? Date.parse(t) : null);
  const mapPlayer = (r) => ({
    id: r.id, name: r.name, nation: r.nation, homeBlock: r.home_block, homePlot: r.home_plot, createdAt: time(r.created_at),
    xp: r.xp || 0, style: r.style || 'patchwork', outfit: r.outfit || null, fabric: r.fabric || null, clubUntil: time(r.club_until) || 0,
  });
  const mapPatch = (r) => ({
    id: r.id, x: r.x, y: r.y, kind: r.kind, owner: r.owner, wonder: r.wonder_id, at: time(r.placed_at),
    gift: r.gift_from || null, beside: !!r.beside,
  });
  const mapWonder = (r) => ({
    id: r.id, blueprint: r.blueprint, x: r.x, y: r.y, slots: r.slots, filled: r.filled, completedAt: time(r.completed_at),
    block: r.block_id, lot: r.lot, status: r.status || 'open', founders: r.founders || [], foundedBy: r.founded_by,
    foundedAt: time(r.founded_at), openedAt: time(r.opened_at),
  });
  const mapWatering = (r) => ({ garden: r.garden_id, helper: r.helper, period: r.period, at: time(r.at) });
  const mapSticker = (r) => ({ id: r.id, from: r.from_player, target: r.target, kind: r.kind, at: time(r.at), day: r.day });
  const PUBLIC_PLAYER = 'id, name, nation, home_block, home_plot, created_at, xp, style, outfit, fabric, club_until';
  const PATCH = 'id, x, y, kind, owner, wonder_id, placed_at, gift_from, beside';

  class SupabaseServer {
    constructor(cfg) {
      this.mode = 'online';
      this.cfg = cfg;
      this.periodMs = cfg.periodMinutes * 60000;
      this.listeners = new Set();
      this.known = new Set();
      this.blockIds = new Set();
    }

    on(fn) { this.listeners.add(fn); }
    emit(ev) { for (const fn of this.listeners) fn(ev); }
    signedIn() { return !!(this.user && !this.user.is_anonymous); }

    async init() {
      await loadScript(LIB);
      this.sb = root.supabase.createClient(this.cfg.supabaseUrl, this.cfg.supabaseAnonKey);
      let { data: { session } } = await this.sb.auth.getSession();
      if (!session) {
        // Players start without an account; signing in with Google later keeps their progress.
        const { data, error } = await this.sb.auth.signInAnonymously();
        if (error) throw new Error(`Guest sign-in failed (${error.message}). Turn on Anonymous sign-ins in Supabase.`);
        session = data.session;
      }
      this.user = session.user;
      const since = new Date(Date.now() - 3 * DAY).toISOString();
      const [settings, blocks, wonders, players, patches, waterings, stickers] = await Promise.all([
        this.one('settings', 'period_minutes, commons_requires_signin'),
        this.all('blocks', 'id, gx, gy, kind, name', 'id'),
        this.all('wonders', '*', 'id'),
        this.all('players', PUBLIC_PLAYER, 'id'),
        this.all('patches', PATCH, 'id'),
        this.all('waterings', 'garden_id, helper, period, at', 'at'),
        this.all('stickers', 'id, from_player, target, kind, day, at', 'id', (q) => q.gte('at', since)),
      ]);
      this.periodMs = settings.period_minutes * 60000;
      this.commonsRequiresSignIn = settings.commons_requires_signin;
      for (const p of players) this.known.add(p.id);
      for (const b of blocks) this.blockIds.add(b.id);
      const meRes = await this.rpc('get_me');
      this.meId = meRes && meRes.me ? meRes.me.id : null;
      this.subscribe();
      return {
        world: {
          blocks, players: players.map(mapPlayer), patches: patches.map(mapPatch), wonders: wonders.map(mapWonder),
          waterings: waterings.map(mapWatering), stickers: stickers.map(mapSticker),
        },
        me: meRes && meRes.me ? meRes.me : null,
        periodMs: this.periodMs,
      };
    }

    // Supabase returns at most 1,000 rows per request, so read big tables in pages.
    async all(table, columns, order, filter) {
      const out = [];
      for (let from = 0; ; from += 1000) {
        let q = this.sb.from(table).select(columns);
        if (filter) q = filter(q);
        const { data, error } = await q.order(order).range(from, from + 999);
        if (error) throw new Error(`Loading ${table} failed: ${error.message}. Did you run supabase/schema.sql and seed.sql?`);
        out.push(...data);
        if (data.length < 1000) return out;
      }
    }

    async one(table, columns) {
      const { data, error } = await this.sb.from(table).select(columns).limit(1).single();
      if (error) throw new Error(`Loading ${table} failed: ${error.message}. Did you run supabase/schema.sql and seed.sql?`);
      return data;
    }

    async rpc(fn, args) {
      const { data, error } = await this.sb.rpc(fn, args || {});
      if (error) throw new Error(error.message);
      return data;
    }

    // Wraps a game action so a network or database error comes back as a friendly result.
    async act(fn, args) {
      try {
        const r = await this.rpc(fn, args);
        if (r && r.me) this.meId = r.me.id;
        return Object.assign({}, r);
      } catch (e) {
        console.warn(`Quiltopia: ${fn} failed`, e);
        return { ok: false, error: "Couldn't reach the world. Check your connection and try again." };
      }
    }

    subscribe() {
      this.channel = this.sb.channel('world')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'patches' }, (m) => this.onPatch(mapPatch(m.new)))
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'patches' }, (m) => this.emit({ type: 'patch:remove', id: m.old.id }))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'wonders' }, (m) => { if (m.new && m.new.id) this.emit({ type: 'wonder', wonder: mapWonder(m.new) }); })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'waterings' }, (m) => this.emit({ type: 'water', watering: mapWatering(m.new) }))
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stickers' }, (m) => this.onSticker(mapSticker(m.new)))
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gifts' }, (m) => this.onGift(m.new))
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'blocks' }, (m) => this.onBlock(m.new))
        .subscribe();
    }

    // Someone we haven't met: fetch their public profile first, so their name shows.
    async meetPlayer(id) {
      if (!id || this.known.has(id)) return;
      this.known.add(id);
      const { data } = await this.sb.from('players').select(PUBLIC_PLAYER).eq('id', id).maybeSingle();
      if (data) this.emit({ type: 'player', player: mapPlayer(data) });
    }

    async onPatch(p) {
      await this.meetPlayer(p.owner);
      this.emit({ type: 'patch:add', patch: p });
    }

    async onSticker(s) {
      await this.meetPlayer(s.from);
      this.emit({ type: 'sticker', sticker: s });
    }

    // Gifts are private: the database only sends the ones to or from you.
    async onGift(g) {
      if (!this.meId || g.to_player !== this.meId || g.kit) return;
      await this.meetPlayer(g.from_player);
      this.emit({ type: 'gift', gift: { id: g.id, kind: g.kind, from: g.from_player } });
    }

    // The quilt grew: bring the new Block's landscape along with it.
    async onBlock(b) {
      if (this.blockIds.has(b.id)) return;
      this.blockIds.add(b.id);
      const B = root.QuiltRules.BLOCK, x0 = b.gx * B, y0 = b.gy * B;
      const rows = await this.all('patches', PATCH, 'id', (q) => q.gte('x', x0).lt('x', x0 + B).gte('y', y0).lt('y', y0 + B)).catch(() => []);
      this.emit({ type: 'block', block: { id: b.id, gx: b.gx, gy: b.gy, kind: b.kind, name: b.name }, patches: rows.map(mapPatch) });
    }

    // ---------- Player actions (each one is checked by the database) ----------

    join({ name, nation, invitedBy }) {
      return this.act('join_world', { p_name: name, p_nation: nation || null, p_invited_by: UUID.test(invitedBy || '') ? invitedBy : null })
        .then((r) => { if (r.me) this.known.add(r.me.id); return r; });
    }
    refresh() { return this.act('get_me').then((r) => Object.assign(r, { ok: !!r.me })); }
    place(x, y, kind) { return this.act('place_patch', { p_x: x, p_y: y, p_kind: kind }); }
    pickUp(id) { return this.act('pick_up', { p_patch: id }); }
    water(id) { return this.act('water_garden', { p_patch: id }); }
    report(id, reason) { return this.act('report_patch', { p_patch: id, p_reason: reason }); }
    setName(name) { return this.act('set_name', { p_name: name }); }
    setNation(code) { return this.act('set_nation', { p_nation: code || null }); }

    async nationBoard() {
      const rows = await this.rpc('nation_board');
      return (rows || []).map((r) => ({ code: r.code, name: r.name, points: r.points, members: r.members, active: r.active, score: Number(r.score) }));
    }

    meet(species, x, y, night) { return this.act('meet_stitchling', { p_species: species, p_x: x, p_y: y, p_night: !!night }); }
    visit(blockId) { return this.act('visit_block', { p_block: blockId }); }
    claimDay() { return this.act('claim_day'); }
    goals() { return this.rpc('get_goals').catch(() => null); }
    claimGoals() { return this.act('claim_goals'); }
    sticker(target, kind) { return this.act('send_sticker', { p_target: target, p_kind: kind }); }
    gift(toId, kind) { return this.act('send_gift', { p_to: toId, p_kind: kind }); }
    addFriend(id) { return this.act('add_friend', { p_friend: id }); }
    removeFriend(id) { return this.act('remove_friend', { p_friend: id }); }
    buy(itemId) { return this.act('buy_item', { p_item: itemId }); }
    equip(change) { return this.act('equip', { p_change: change }); }
    foundWonder(blueprint, blockId, lot) { return this.act('found_wonder', { p_blueprint: blueprint, p_block: blockId, p_lot: lot }); }

    // The Club is paid on Stripe's own page (opened in a new tab). When the payment arrives,
    // supabase/functions/club-webhook records it and the badge appears on the next refresh.
    async joinClub() {
      if (!this.cfg.clubCheckoutUrl) return { ok: false, error: 'The Club opens soon.' };
      const url = new URL(this.cfg.clubCheckoutUrl);
      if (this.meId) url.searchParams.set('client_reference_id', this.meId);
      window.open(url.href, '_blank', 'noopener');
      return { ok: true, checkout: true };
    }
    signFounder(wonderId) { return this.act('sign_founder', { p_wonder: wonderId }); }

    signInWithGoogle() {
      return this.sb.auth.linkIdentity({ provider: 'google', options: { redirectTo: location.href.split('#')[0] } })
        .then(({ error }) => { if (error) throw new Error(`Google sign-in isn't set up yet (${error.message}).`); });
    }

    // ---------- Moderation (only works for accounts in the admins table) ----------

    isAdmin() { return this.rpc('is_admin').then(Boolean); }
    async listReports() {
      const rows = await this.rpc('list_reports');
      return (rows || []).map((r) => ({
        id: r.id, patch: r.patch_id, x: r.x, y: r.y, kind: r.kind, owner: r.owner, ownerName: r.owner_name,
        reporterName: r.reporter_name, reason: r.reason, at: Date.parse(r.created_at),
      }));
    }
    resolveReport(id) { return this.act('resolve_report', { p_report: id }); }
    removePatch(id) { return this.act('remove_patch', { p_patch: id }); }
    rollbackArea(x, y, radius, hours) { return this.act('rollback_area', { p_x: x, p_y: y, p_radius: radius, p_hours: hours }); }
    banPlayer(id) { return this.act('ban_player', { p_player: id }); }

    track(name, props) {
      this.sb.rpc('track', { p_name: name, p_props: props || {} }).then(() => {}, () => {});
    }
  }

  root.QuiltSupabase = SupabaseServer;
})(this);
