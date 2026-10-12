/* Quiltopia — playing together: player cards and guest books, stickers, gifts, friends (with
   arrows pointing to their homes), the "what's new" feed, and founding new Wonders. */
(function (Q) {
  'use strict';

  const { R, ST, ICONS, esc, plural, $ } = Q;
  const icon = (kind, size) => (ICONS[kind] || ICONS.pick).replace('<svg', `<svg width="${size || 40}" height="${size || 40}"`);
  const first = (name) => String(name || '').split(' ')[0];

  // ---------- Player cards and guest books ----------

  Q.on('player-card', (id) => showPlayer(id));
  Q.acts.player = (el) => showPlayer(el.dataset.id);

  function showPlayer(id) {
    const world = Q.world, p = world.players.get(id), me = Q.me;
    if (!p) return;
    const isMe = me && id === me.id;
    const friend = me && (me.friends || []).includes(id);
    const home = R.homeRect(world, p);
    const guest = Q.stickers.filter((s) => s.target === 'home:' + id).slice(-12).reverse();
    const level = p.xp != null ? R.levelOf(p.xp) : null;
    const neighbor = me && me.homeBlock != null && me.homeBlock === p.homeBlock;
    Q.openSheet(`
      <span class="eyebrow">${level ? `Level ${level}` : 'Builder'}${p.nation && Q.prefs.nations ? ` · ${esc(Q.nationName(p.nation) || '')}` : ''}</span>
      <h2 id="sheet-title">${esc(p.name)}${isMe ? ' (you)' : ''}${R.isClub(p) ? ' <span class="club-badge">★ Club</span>' : ''}</h2>
      ${home ? `<p class="muted small">Lives in ${esc(R.blockById(world, p.homeBlock).name)}${friend ? ' · your friend' : neighbor ? ' · your neighbor' : ''}</p>` : ''}
      ${!isMe ? `<p class="section-label">Leave a sticker on their home</p><div class="sticker-row">${Q.stickerButtons('home:' + id)}</div>` : ''}
      <p class="section-label">Guest book</p>
      ${guest.length ? `<ul class="guest">${guest.map((s) => `<li><canvas class="sticker-canvas" data-sticker="${s.kind}" width="22" height="22"></canvas><span><b>${esc(Q.playerName(s.from))}</b> left a ${esc(R.STICKERS[s.kind].toLowerCase())}</span><small>${Q.ago(s.at)}</small></li>`).join('')}</ul>` : '<p class="muted small">No stickers yet.</p>'}
      <div class="row wrap">
        ${home ? `<button class="btn" data-act="go" data-x="${home.x + 4}" data-y="${home.y + 4}" data-z="30">Visit home</button>` : ''}
        ${!isMe && me ? (friend ? `<button class="btn" data-act="unfriend" data-id="${id}">Friends ✓</button>` : `<button class="btn" data-act="friend" data-id="${id}">Add friend</button>`) : ''}
        ${!isMe && me && (friend || neighbor) ? `<button class="btn gold" data-act="gift" data-id="${id}">Gift a patch</button>` : ''}
      </div>
    `, { name: 'player' });
    Q.paintStickers();
  }

  // ---------- Stickers ----------

  function targetPoint(target) {
    const [type, id] = target.split(':');
    if (type === 'home') {
      const p = Q.world.players.get(id), r = p && R.homeRect(Q.world, p);
      return r ? { x: r.x + r.w - 1, y: r.y } : null;
    }
    const w = Q.world.wonders.find((x) => String(x.id) === id);
    return w ? { x: w.x + 7, y: w.y } : null;
  }

  Q.acts.sticker = async (el) => {
    const res = await Q.call('sticker', el.dataset.target, el.dataset.kind);
    if (!res.ok) return Q.toast(res.error, true);
    Q.sound.pop();
    Q.haptic(10);
    const pt = targetPoint(el.dataset.target);
    if (pt) { Q.renderer.stickerPop(el.dataset.kind, pt.x, pt.y, performance.now() / 1000); Q.popGain(pt.x, pt.y - 1, res.gain); }
    Q.toast('Sticker sent!');
    Q.track('sticker', { kind: el.dataset.kind });
    Q.emit('sticker-sent');
    el.closest('.sticker-row').querySelectorAll('button').forEach((b) => { b.disabled = true; });
  };

  Q.on('sticker', (s) => {
    const me = Q.me;
    if (!me || s.from === me.id) return;
    const pt = targetPoint(s.target);
    if (pt) Q.renderer.stickerPop(s.kind, pt.x, pt.y, performance.now() / 1000);
    if (s.target === 'home:' + me.id) {
      Q.toast(`${Q.playerName(s.from)} left a ${R.STICKERS[s.kind].toLowerCase()} on your home`);
      Q.sound.chime();
    }
  });

  Q.on('water', (w) => {
    const me = Q.me, g = Q.world.byId.get(w.garden);
    if (me && g && g.owner === me.id && w.helper !== me.id) {
      Q.toast(`${Q.playerName(w.helper)} watered your garden`);
      Q.sound.chime();
      Q.renderer.react(g.x, g.y, 'water', performance.now() / 1000);
    }
  });

  // ---------- Gifts ----------

  Q.acts.gift = (el) => {
    const to = Q.world.players.get(el.dataset.id), eff = Q.effectiveMe();
    const kinds = R.BASIC.concat(['lantern']).filter((k) => (eff.items[k] || 0) > 0 || (R.PATCHES[k].group === 'basic' && eff.picks > 0));
    if (Q.me.giftDay === R.dayOf(Date.now())) return Q.toast('You can send one gift a day. Try again tomorrow.');
    if (!kinds.length) return Q.toast(`You're out of patches to give. New ones in ${Q.untilRefill()}.`);
    Q.openSheet(`
      <span class="eyebrow">One gift a day</span>
      <h2 id="sheet-title">Send ${esc(first(to.name))} a patch</h2>
      <p class="muted">It comes from your own patches. When ${esc(first(to.name))} places it, it carries your name.</p>
      <div class="gift-grid">${kinds.map((k) => `<button class="chip" data-act="gift-send" data-to="${to.id}" data-kind="${k}">${ICONS[k]}<span class="chip-name">${R.PATCHES[k].name}</span></button>`).join('')}</div>
    `, { name: 'gift' });
  };
  Q.acts['gift-send'] = async (el) => {
    const res = await Q.call('gift', el.dataset.to, el.dataset.kind);
    if (!res.ok) return Q.toast(res.error, true);
    Q.sound.chime();
    Q.toast(`Sent a ${R.PATCHES[el.dataset.kind].name} to ${Q.playerName(el.dataset.to)}`);
    Q.track('gift', { kind: el.dataset.kind });
    Q.emit('gift-sent');
    Q.closeSheet(true);
  };
  Q.on('gift', async (g) => {
    await Q.refreshMe();
    Q.toast(`${Q.playerName(g.from)} sent you a ${R.PATCHES[g.kind].name}!`);
    Q.sound.reveal();
  });

  // ---------- Friends ----------

  Q.acts.friend = async (el) => {
    const res = await Q.call('addFriend', el.dataset.id);
    if (!res.ok) return Q.toast(res.error, true);
    Q.toast(`${Q.playerName(el.dataset.id)} is now your friend`);
    Q.track('friend_add');
    showPlayer(el.dataset.id);
  };
  Q.acts.unfriend = async (el) => {
    const res = await Q.call('removeFriend', el.dataset.id);
    if (!res.ok) return Q.toast(res.error, true);
    showPlayer(el.dataset.id);
  };
  Q.acts.friends = () => {
    const me = Q.me, list = (me.friends || []).map((id) => Q.world.players.get(id)).filter(Boolean);
    Q.openSheet(`
      <h2 id="sheet-title">Friends</h2>
      ${list.length ? `<ul class="list">${list.map((p) => `<li><button class="list-item" data-act="player" data-id="${p.id}">${ICONS.house}<span class="grow"><b>${esc(p.name)}</b><small>${esc(R.blockById(Q.world, p.homeBlock) ? R.blockById(Q.world, p.homeBlock).name : 'No home yet')}</small></span></button></li>`).join('')}</ul>`
        : '<p class="muted">No friends yet. Tap a neighbor\'s home and add them, or invite someone with a Wonder link: you become friends automatically.</p>'}
    `, { name: 'friends' });
  };

  // Arrows at the edge of the screen point toward friends' homes nearby.
  const arrows = $('#arrows');
  Q.frameHooks.push(() => {
    const me = Q.me;
    if (!me || !(me.friends || []).length || Q.cam.z < 10 || Q.frameOverride) { if (arrows.childElementCount) arrows.innerHTML = ''; return; }
    const out = [];
    for (const id of me.friends) {
      const p = Q.world.players.get(id), r = p && R.homeRect(Q.world, p);
      if (!r) continue;
      const s = Q.toScreen(r.x + 4, r.y + 4);
      if (s.x > 0 && s.y > 60 && s.x < innerWidth && s.y < innerHeight - 220) continue;
      const d = Math.hypot(r.x + 4 - Q.cam.x, r.y + 4 - Q.cam.y);
      if (d > 120) continue;
      out.push({ p, r, s, d });
    }
    out.sort((a, b) => a.d - b.d);
    const html = out.slice(0, 3).map(({ p, r, s }) => {
      const cx = innerWidth / 2, cy = innerHeight / 2 - 60;
      const a = Math.atan2(s.y - cy, s.x - cx);
      const ex = Q.clamp(cx + Math.cos(a) * 1000, 28, innerWidth - 28), ey = Q.clamp(cy + Math.sin(a) * 1000, 90, innerHeight - 240);
      return `<button class="friend-arrow" style="left:${ex}px;top:${ey}px" data-act="go" data-x="${r.x + 4}" data-y="${r.y + 4}" data-z="30" aria-label="Go to ${esc(p.name)}'s home"><span style="transform:rotate(${a}rad)">➜</span><small>${esc(first(p.name))}</small></button>`;
    }).join('');
    if (arrows.dataset.html !== html) { arrows.innerHTML = html; arrows.dataset.html = html; }
  });

  // ---------- Welcome back ----------
  // Coming back after a while (opening the game, or this tab after it was hidden): one card with a
  // picture of your home, today's calendar reward, your fresh patches, what the neighbors did, and
  // what your Stitchlings wish for. A shorter break just shows any fresh patches.

  const WELCOME_AFTER = 45 * 60000;
  const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.2-4.3-9.4-8.5C1 8.9 2.7 5.4 6.2 5.1c2-.2 3.7.9 4.8 2.5 1.1-1.6 2.8-2.7 4.8-2.5 3.5.3 5.2 3.8 3.6 6.9-2.2 4.2-9.4 8.5-9.4 8.5z" fill="#e86a92"/></svg>';
  let hiddenAt = 0, returnSince = 0;

  function awayText(since) {
    const m = Math.round((Date.now() - since) / 60000);
    if (m < 90) return plural(m, 'minute');
    if (m < 36 * 60) return plural(Math.round(m / 60), 'hour');
    return plural(Math.round(m / 1440), 'day');
  }

  // What happened in the world since then.
  function newsSince(since) {
    const me = Q.me, world = Q.world, items = [];
    const home = R.homeRect(world, me);
    const homeGo = home ? `data-act="go" data-x="${home.x + 4}" data-y="${home.y + 4}" data-z="30"` : '';
    const onMyHome = Q.stickers.filter((s) => s.target === 'home:' + me.id && s.at > since && s.from !== me.id);
    if (onMyHome.length) items.push({ svg: HEART, html: `<b>${esc([...new Set(onMyHome.map((s) => Q.playerName(s.from)))].slice(0, 3).join(', '))}</b> left ${onMyHome.length === 1 ? 'a sticker' : plural(onMyHome.length, 'sticker')} on your home`, go: homeGo });
    const gifts = (me.gifts || []).filter((g) => g.from !== 'kit' && g.at > since);
    if (gifts.length) items.push({ icon: 'gift', html: `<b>${esc([...new Set(gifts.map((g) => Q.playerName(g.from)))].join(', '))}</b> sent you ${plural(gifts.length, 'patch', 'patches')}. They're in your bag.` });
    const waters = world.waterings.filter((w) => w.at > since && w.helper !== me.id && (world.byId.get(w.garden) || {}).owner === me.id);
    if (waters.length) {
      const who = [...new Set(waters.map((w) => Q.playerName(w.helper)))];
      items.push({ icon: 'water', html: `<b>${esc(who.slice(0, 3).join(', '))}</b> watered your ${waters.length === 1 ? 'garden' : `gardens ${plural(waters.length, 'time')}`}`, go: homeGo });
    }
    const newbies = [...world.players.values()].filter((p) => p.createdAt > since && p.id !== me.id && p.homeBlock === me.homeBlock);
    if (newbies.length) items.push({ icon: 'house', html: `${plural(newbies.length, 'new neighbor')} moved into ${esc(R.blockById(world, me.homeBlock).name)}: <b>${esc(newbies.slice(0, 3).map((p) => p.name).join(', '))}</b>` });
    for (const w of world.wonders) {
      const bp = R.BLUEPRINTS[w.blueprint];
      const go = `data-act="go" data-x="${w.x + 7}" data-y="${w.y + 7}" data-z="18"`;
      if (w.status === 'founding' && w.foundedAt > since) { items.push({ icon: 'wonder', html: `A new Wonder is gathering founders: the <b>${esc(bp.name)}</b>`, go }); continue; }
      const grown = [...world.byId.values()].filter((p) => p.wonder === w.id && p.at > since).length;
      if (w.completedAt && w.completedAt > since) items.push({ icon: 'wonder', html: `The <b>${esc(bp.name)}</b> was finished!`, go });
      else if (grown) items.push({ icon: 'wonder', html: `The <b>${esc(bp.name)}</b> grew by ${plural(grown, 'patch', 'patches')}: ${w.slots - w.filled} to go`, go });
    }
    return items;
  }

  function welcomeRows(since, added, reward, goals) {
    const me = Q.me, rows = [];
    if (reward) {
      const what = reward.buttons ? `${reward.buttons} Buttons` : reward.keep ? `a ${esc(R.PATCHES[reward.keep].name)}` : reward.outfit ? `a ${esc(R.OUTFITS[reward.outfit])} for your Stitchlings` : 'a surprise';
      rows.push({ icon: reward.buttons ? 'button' : reward.keep || 'gift', html: `<b>Day ${reward.day} of your calendar:</b> ${what}` });
    }
    const fresh = added ? added.picks + added.items.length : 0;
    if (fresh) {
      const kinds = [...new Set(added.items)].map((k) => R.PATCHES[k].name);
      rows.push({ icon: 'pick', html: `<b>${plural(fresh, 'fresh patch', 'fresh patches')}</b> in your bag${kinds.length ? `, with a surprise ${esc(kinds.join(' and '))}` : ''}` });
    }
    rows.push(...newsSince(since));
    const home = R.homeRect(Q.world, me);
    const wish = ST.homes(Q.world).filter((h) => h.owner === me.id).map((h) => ({ h, need: Object.keys(R.WISHES).find((n) => !h.needs[n]) })).find((x) => x.need);
    if (wish) {
      rows.push({
        icon: R.WISHES[wish.need].kinds[0], html: `<b>${esc(ST.SPECIES[wish.h.residents[0].species].name)}</b> wishes for ${R.WISHES[wish.need].wants}`,
        go: home ? `data-act="go" data-x="${home.x + 4}" data-y="${home.y + 4}" data-z="36"` : '',
      });
    }
    // Today's goals, each a tap away in the daily panel.
    const todo = goals ? goals.list.filter((g) => !g.done).map((g) => esc(g.text.charAt(0).toLowerCase() + g.text.slice(1))) : [];
    if (todo.length) {
      rows.push({ svg: GOALS_SVG, html: `<b>Today's goals:</b> ${todo.length > 1 ? `${todo.slice(0, -1).join(', ')} and ${todo[todo.length - 1]}` : todo[0]}`, go: 'data-act="daily"' });
    }
    return rows;
  }
  const GOALS_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" style="color: var(--good)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M8.5 3v4M15.5 3v4"/><path d="m9 15 2 2 4-4"/></svg>';

  function showWelcome(since, rows) {
    const me = Q.me, home = R.homeRect(Q.world, me);
    const row = (r) => `<li>${r.go ? `<button class="welcome-row" ${r.go}>` : '<div class="welcome-row">'}<span class="wl-icon">${r.svg || icon(r.icon, 22)}</span><span class="wl-text">${r.html}</span>${r.go ? '<small>Go</small></button>' : '</div>'}</li>`;
    Q.openSheet(`
      <span class="eyebrow">Welcome back</span>
      <h2 id="sheet-title">Hi again, ${esc(first(me.name))}!</h2>
      <p class="muted">You were away ${awayText(since)}. Here's what happened.</p>
      ${home ? '<canvas class="home-snap" role="img" aria-label="Your home today"></canvas>' : ''}
      <ul class="welcome-list">${rows.map(row).join('')}</ul>
      <div class="sheet-foot"><button class="btn primary wide" data-close>Let's build</button></div>
    `, { name: 'welcome' });
    if (home) {
      // A close-up of your house, with your Stitchlings home to say hello.
      const t = performance.now() / 1000, scene = Q.scene();
      const mine = ST.homes(Q.world).filter((h) => h.owner === me.id);
      for (const h of mine) Q.renderer.ensureHome(scene, h.anchor.x, h.anchor.y, t);
      const c = document.querySelector('#sheet .home-snap');
      const at = mine.length ? { x: mine[0].anchor.x + 0.5, y: mine[0].anchor.y + 0.3 } : { x: home.x + 4, y: home.y + 4.6 };
      Q.renderer.snapshot(c, scene, at.x, at.y, c.clientHeight / 4.6, t);
    }
    Q.sound.reveal();
    Q.track('welcome_back', { rows: rows.length, away: Math.round((Date.now() - since) / 60000) });
  }

  async function welcomeBack(since, added) {
    Q.welcomePending = true; // the calendar and the patches are shown here, not on their own
    try {
      const day = Q.me.kitDone ? await Q.call('claimDay') : null;
      const reward = day && day.ok ? day.reward : null;
      if (reward) Q.track('calendar_claim', { day: reward.day });
      if (Q.updateDailyDot) Q.updateDailyDot();
      const goals = await Q.server.goals().catch(() => null);
      const rows = welcomeRows(since, added, reward, goals);
      if (rows.length) Q.queueSheet(() => showWelcome(since, rows));
      else if (added) Q.showReveal(added);
    } finally {
      Q.welcomePending = false;
    }
  }

  Q.on('ready', ({ returning, added }) => {
    const since = Q.prefs.lastSeen || 0;
    Q.prefs.lastSeen = Date.now();
    Q.savePrefs();
    if (!returning || !Q.prefs.onboard || !Q.prefs.onboard.done) return;
    if (since && Date.now() - since >= WELCOME_AFTER) welcomeBack(since, added);
    else if (added) Q.showReveal(added);
  });
  // Back to this tab after a long while: the refresh that follows says what patches arrived.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (hiddenAt && Q.me && Q.prefs.onboard && Q.prefs.onboard.done && Date.now() - hiddenAt >= WELCOME_AFTER) {
      returnSince = hiddenAt;
      Q.welcomePending = true;
    }
    hiddenAt = 0;
  });
  Q.on('refreshed', (res) => {
    if (returnSince) { const since = returnSince; returnSince = 0; welcomeBack(since, res.added); } else if (res.added) Q.showReveal(res.added);
  });
  setInterval(() => { if (Q.me && !document.hidden) { Q.prefs.lastSeen = Date.now(); Q.savePrefs(); } }, 60000);

  // ---------- Founding Wonders ----------

  function drawBlueprint(canvas, id) {
    const bp = R.BLUEPRINTS[id], PAL = window.QuiltRender.PAL;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const size = canvas.clientWidth || 64;
    canvas.width = canvas.height = Math.round(size * dpr);
    const g = canvas.getContext('2d'), cell = canvas.width / 16;
    const ox = (16 - bp.rows[0].length) / 2 * cell, oy = (16 - bp.rows.length) / 2 * cell;
    g.clearRect(0, 0, canvas.width, canvas.height);
    bp.rows.forEach((row, y) => [...row].forEach((ch, x) => {
      const kind = R.SLOT_KINDS[ch];
      if (!kind) return;
      g.fillStyle = kind === 'house' && bp.roof ? bp.roof : PAL.slot[kind];
      g.fillRect(ox + x * cell + 0.5, oy + y * cell + 0.5, cell - 1, cell - 1);
    }));
  }
  function paintBlueprints() { for (const c of document.querySelectorAll('canvas[data-blueprint]')) drawBlueprint(c, c.dataset.blueprint); }
  Q.paintBlueprints = paintBlueprints;

  Q.on('lot-tap', (z) => {
    const me = Q.me, level = me ? R.levelOf(me.xp || 0) : 0;
    Q.card(`<div class="card-row">${icon('wonder', 36)}<div class="grow"><b>Wonder lot</b><small>${level >= R.FOUND_LEVEL ? `Saved for a new Wonder in ${esc(z.block.name)}.` : `Builders at Level ${R.FOUND_LEVEL} can found a Wonder here. You're Level ${level}.`}</small></div></div>
      ${level >= R.FOUND_LEVEL ? `<div class="card-actions"><button class="btn small primary" data-act="found" data-block="${z.block.id}" data-lot="${z.lot}">Found a Wonder here</button></div>` : ''}`);
  });

  Q.acts.found = (el) => {
    Q.openSheet(`
      <span class="eyebrow">Found a Wonder</span>
      <h2 id="sheet-title">Pick a blueprint</h2>
      <p class="muted">Building starts once 10 founders sign on. Every founder earns XP, and everyone who helps build it gets its Stitchling.</p>
      <div class="blueprints">${Object.entries(R.BLUEPRINTS).map(([id, bp]) => `
        <button class="blueprint" data-act="found-pick" data-bp="${id}" data-block="${el.dataset.block}" data-lot="${el.dataset.lot}">
          <canvas data-blueprint="${id}" width="72" height="72"></canvas>
          <b>${esc(bp.name)}</b><small>${bp.size} · ${R.slotsOf(id).length} slots</small>
        </button>`).join('')}</div>
    `, { name: 'found' });
    paintBlueprints();
  };

  Q.acts['found-pick'] = async (el) => {
    const res = await Q.call('foundWonder', el.dataset.bp, +el.dataset.block, +el.dataset.lot);
    if (!res.ok) return Q.toast(res.error, true);
    Q.sound.fanfare();
    Q.track('found', { blueprint: el.dataset.bp });
    const w = Q.world.wonders.find((x) => x.id === res.wonder.id) || res.wonder;
    if (!Q.world.wonders.includes(w)) Q.world.wonders.push(w);
    Q.renderer.markAllDirty();
    showFounding(w, true);
  };

  Q.on('founding-sheet', (w) => showFounding(w));
  function showFounding(w, justFounded) {
    const bp = R.BLUEPRINTS[w.blueprint], me = Q.me;
    const signed = me && w.founders.includes(me.id);
    Q.openSheet(`
      <span class="eyebrow">${justFounded ? 'You founded a Wonder!' : w.foundedBy ? 'Gathering founders' : 'Proposed by the town'}</span>
      <h2 id="sheet-title">${esc(bp.name)}</h2>
      ${w.foundedBy ? '' : `<p class="muted">The town proposed this one when every other Wonder was finished. Anyone can sign, and building starts with ${R.FOUNDERS_NEEDED} founders.</p>`}
      <div class="row center-row"><canvas class="bp-preview" data-blueprint="${w.blueprint}" width="96" height="96"></canvas>
        <div class="grow"><div class="progress"><i style="width:${Math.round((w.founders.length / R.FOUNDERS_NEEDED) * 100)}%"></i></div>
        <p><b>${w.founders.length} of ${R.FOUNDERS_NEEDED}</b> founders. ${R.FOUNDERS_NEEDED - w.founders.length} more and building starts.</p></div></div>
      <div class="names">${w.founders.map((id) => `<span class="${me && id === me.id ? 'me' : ''}">${esc(Q.playerName(id))}</span>`).join('')}</div>
      ${signed ? '' : `<button class="btn primary wide" data-act="sign-founder" data-id="${w.id}">Sign as a founder</button>`}
      <button class="btn${signed ? ' primary' : ''} wide" data-act="invite-found" data-id="${w.id}">Invite founders</button>
      <p class="muted small">Founders earn ${R.XP.founded} XP when building starts. ${bp.slots || R.slotsOf(w.blueprint).length} slots, and each builder can fill ${R.ALLOWANCE.wonderPerPeriod} ${Q.perPeriod()}.</p>
    `, { name: 'founding' });
    paintBlueprints();
  }
  Q.showFounding = showFounding;

  Q.acts['sign-founder'] = async (el) => {
    const res = await Q.call('signFounder', +el.dataset.id);
    if (!res.ok) return Q.toast(res.error, true);
    Q.sound.chime();
    Q.track('sign_founder', { wonder: +el.dataset.id });
    const w = Q.world.wonders.find((x) => x.id === +el.dataset.id);
    // The reply can be older than an update that already came in (the signature that opened it, say).
    if (w && res.wonder && res.wonder.founders.length >= w.founders.length) Object.assign(w, res.wonder);
    if (w && w.status === 'founding') showFounding(w); else Q.closeSheet(true);
  };
  Q.acts['invite-found'] = (el) => Q.sendInvite(Q.world.wonders.find((x) => x.id === +el.dataset.id), 'found');

  Q.on('wonder', ({ wonder, before }) => {
    if (before && before.status === 'founding' && wonder.status === 'open') {
      const bp = R.BLUEPRINTS[wonder.blueprint];
      Q.showBanner(`The ${bp.name} has ${R.FOUNDERS_NEEDED} founders! Building starts now.`, 'Help build', () => Q.helpBuild(wonder));
      Q.sound.fanfare();
      if (Q.me && wonder.founders.includes(Q.me.id)) Q.refreshMe();
    }
  });
})(window.Q);
