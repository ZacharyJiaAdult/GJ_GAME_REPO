/* Quiltopia — progress: meeting Stitchlings and the Stitchbook, your profile and Builder level,
   the Button Shop, roof styles and outfits, the 7-day calendar and daily goals. */
(function (Q) {
  'use strict';

  const { R, ST, ICONS, esc, plural, $ } = Q;
  const icon = (kind, size) => (ICONS[kind] || ICONS.pick).replace('<svg', `<svg width="${size || 40}" height="${size || 40}"`);

  function paintPortraits() {
    for (const c of document.querySelectorAll('canvas.portrait[data-species]')) {
      window.QuiltRender.portrait(c, c.dataset.species, { unknown: c.dataset.unknown === '1' });
    }
  }
  Q.paintPortraits = paintPortraits;

  // ---------- Meeting Stitchlings ----------

  Q.on('critter', async (agent) => {
    const t = performance.now() / 1000;
    Q.renderer.beckon(agent, null);
    Q.renderer.poke(agent, t, agent.rare ? '!' : '♥');
    Q.sound.squeak();
    Q.haptic(10);
    const sp = ST.SPECIES[agent.species];
    const home = agent.homeKey != null ? ST.homes(Q.world).find((h) => h.key === agent.homeKey) : null;
    let res = { ok: true, isNew: false };
    if (Q.me) {
      res = sp.page === 'wonder' && !(Q.me.stitchbook || {})[agent.species]
        ? { ok: false, error: `Only the builders of the ${R.BLUEPRINTS[sp.wonder].name} get this one.` }
        : await Q.call('meet', agent.species, Math.floor(agent.x), Math.floor(agent.y), Q.isNight());
    }
    showCritterCard(sp, agent.species, home, res);
    if (res.gain) Q.popGain(agent.x - 0.5, agent.y - 1.3, res.gain);
    if (res.ok) {
      Q.emit('met', { species: agent.species, isNew: res.isNew });
      Q.track('meet', { species: agent.species, isNew: !!res.isNew });
      if (res.isNew) {
        Q.sound.reveal();
        if (sp.page === 'rare') Q.showBanner(`You found a ${sp.name}!`, null, null, 5000);
      }
      if (res.pageDone) {
        const page = ST.PAGES.find((p) => p.id === res.pageDone);
        Q.queueSheet(() => Q.openSheet(`<span class="eyebrow">Stitchbook page complete</span><h2 id="sheet-title">${esc(page.name)}: all found!</h2>
          <p>You earned <b>${page.reward.buttons} Buttons</b> and a <b>${R.PATCHES[page.reward.keep].name}</b>.</p><button class="btn primary wide" data-close>Wonderful</button>`));
      }
    }
  });

  // ---------- Wishes ----------
  // A home whose wish just came true: its Stitchlings celebrate where they live, and say so.
  const WISH_LABEL = { food: 'Fed!', fun: 'Fun!', path: 'A path!', visit: 'Visiting!', cozy: 'Very cozy!' };
  Q.on('wishes', (list) => {
    const t = performance.now() / 1000;
    const homes = ST.homes(Q.world);
    const lines = [], rows = new Map();
    list.forEach((w) => {
      const home = homes.find((h) => h.anchor.x === w.x && h.anchor.y === w.y);
      const name = home ? ST.SPECIES[home.residents[0].species].name : 'Your Stitchling';
      for (const a of Q.renderer.residentsOf(w.x, w.y)) Q.renderer.poke(a, t, w.need === 'cozy' ? '★' : '♥');
      // One stack of pills per home, starting once the XP has floated clear.
      const key = w.x + ',' + w.y, row = rows.get(key) || 0;
      rows.set(key, row + 1);
      Q.renderer.rewardPop(w.x, w.y - 1.2, WISH_LABEL[w.need], t + 0.6, { row, color: '#ffe3ec', ink: '#a3264f' });
      lines.push(w.need === 'cozy' ? `${name}'s home is very cozy! +${R.COZY_BUTTONS} Buttons` : `${name} ${R.WISHES[w.need].granted}!`);
    });
    Q.sound.chime();
    Q.haptic(15);
    Q.toast(lines.join(' '));
    Q.track('wish', { needs: list.map((w) => w.need) });
  });

  const need = (label, ok) => `<span class="need ${ok ? 'ok' : 'no'}">${ok ? '♥' : '·'} ${label}</span>`;

  function showCritterCard(sp, species, home, res) {
    const owner = home && Q.world.players.get(home.owner);
    const mine = home && Q.me && home.owner === Q.me.id;
    const needs = home && home.needs;
    const where = home ? `Lives in ${mine ? 'your' : `${esc(owner ? owner.name : 'a builder')}'s`} home` : res.ok === false ? esc(res.error) : esc(sp.hint);
    let tip = '';
    if (mine && needs) {
      tip = !needs.food ? 'Hungry: a garden within 4 squares would feed them.'
        : !needs.fun ? 'A little bored: a park within 4 squares would be fun.'
          : !needs.path ? 'Stuck at home: run a path up to the house.'
            : !needs.visit ? `Lonely: paths that reach a neighbor's home (within ${ST.VISIT_STEPS} squares) would let them visit.`
              : 'Very cozy, and off visiting the neighbors. Nice work!';
    }
    Q.card(`
      <div class="card-row">
        <canvas class="portrait" data-species="${species}" width="56" height="56"></canvas>
        <div class="grow"><b>${esc(sp.name)}</b>${res.isNew ? '<span class="new-badge">New in your Stitchbook!</span>' : ''}<small>${where}</small></div>
      </div>
      ${needs ? `<div class="needs">${need('Home', true)}${need('Food', needs.food)}${need('Fun', needs.fun)}${need('Path', needs.path)}${need('Friends', needs.visit)}</div>` : ''}
      ${tip ? `<p class="card-tip">${tip}</p>` : ''}
      <div class="card-actions"><button class="btn small" data-act="book" data-page="${sp.page}">Stitchbook</button></div>
    `, 8000);
    paintPortraits();
  }

  // ---------- The Stitchbook ----------

  $('#btn-book').addEventListener('click', () => showBook());
  Q.acts.book = (el) => showBook(el && el.dataset.page);
  Q.acts['book-page'] = (el) => showBook(el.dataset.page);

  function showBook(page) {
    page = page || 'everyday';
    const book = (Q.me && Q.me.stitchbook) || {};
    const pg = ST.PAGES.find((p) => p.id === page);
    const prog = ST.pageProgress(book, page);
    const tabs = ST.PAGES.map((p) => {
      const pp = ST.pageProgress(book, p.id);
      return `<button role="tab" aria-selected="${p.id === page}" data-act="book-page" data-page="${p.id}">${esc(p.name.split(' ')[0])} ${pp.found}/${pp.total}</button>`;
    }).join('');
    // Rare ones say where one lives right now (someone built just the right spot), a tap away.
    const night = Q.isNight(), sites = page === 'rare' ? ST.rareSites(Q.world, { night }) : [];
    const cards = prog.ids.map((id) => {
      const s = ST.SPECIES[id], got = book[id];
      const site = page === 'rare' && nearest(sites.filter((q) => q.species === id), (q) => q, homeCenter());
      const where = page !== 'rare' ? ''
        : site ? `<span class="spotted">${got ? 'Lives in' : 'Somewhere in'} ${esc(R.blockAt(Q.world, site.x, site.y).name)}</span><button class="btn small${got ? '' : ' primary'}" data-act="rare-go" data-species="${id}">${got ? 'Visit' : 'Go look'}</button>`
          : `<span class="spotted none">${id === 'glowmoth' && !night ? 'Comes out at night' : 'Nobody has built its spot yet'}</span>`;
      return `<div class="book-card${got ? '' : ' unknown'}"><canvas class="portrait" data-species="${id}" data-unknown="${got ? 0 : 1}" width="64" height="64"></canvas><b>${got ? esc(s.name) : '???'}</b><small>${esc(s.hint)}</small>${where}</div>`;
    }).join('');
    const total = Object.keys(ST.SPECIES).length, found = Object.keys(ST.SPECIES).filter((id) => book[id]).length;
    Q.openSheet(`
      <span class="eyebrow">Stitchbook · ${found} of ${total}</span>
      <h2 id="sheet-title">${esc(pg.name)}</h2>
      <div class="tabs" role="tablist">${tabs}</div>
      <div class="book-grid">${cards}</div>
      <p class="muted small">Tap any Stitchling on the map to meet it. Rare ones only live where certain patches sit together. Finish this page for ${pg.reward.buttons} Buttons and a ${R.PATCHES[pg.reward.keep].name}.</p>
    `, { name: 'book' });
    paintPortraits();
  }

  // ---------- Finding rare Stitchlings ----------

  // From the Stitchbook. One you've met: straight there to say hi. One you haven't: to its Block, to look
  // around (it waves once it's on screen), so finding it is still yours to do.
  Q.acts['rare-go'] = (el) => {
    const species = el.dataset.species, met = (Q.me.stitchbook || {})[species];
    const site = nearest(ST.rareSites(Q.world, { night: Q.isNight() }).filter((s) => s.species === species), (s) => s, homeCenter());
    if (!site) return Q.toast('None is out right now. Check back soon!');
    Q.track('rare_go', { species, met: !!met });
    if (!met) {
      const b = R.blockAt(Q.world, site.x, site.y);
      flyThen((b.gx + 0.5) * R.BLOCK, (b.gy + 0.5) * R.BLOCK, 14, () => Q.toast(`Something rare lives somewhere in ${b.name}. Look around!`));
      return;
    }
    flyThen(site.x + 0.5, site.y + 0.5, 44, () => {
      const t = performance.now() / 1000, a = Q.renderer.ensureSite(Q.scene(), species, site.x, site.y, t);
      if (a) Q.renderer.poke(a, t, '♥');
    });
  };

  // Out exploring: a rare Stitchling you haven't met, on screen, waves and says so (once a visit each).
  const spotted = new Set();
  function lookForRare() {
    if (!Q.me || !Q.prefs.onboard || !Q.prefs.onboard.done || Q.placing || Q.sheetOpen() || (Q.showing && Q.showing())) return null;
    const book = Q.me.stitchbook || {};
    const a = Q.renderer.rareInView().find((x) => ST.SPECIES[x.species].page === 'rare' && !book[x.species] && !spotted.has(x.species));
    if (!a) return null;
    spotted.add(a.species);
    Q.renderer.beckon(a, '!');
    Q.showBanner('Something rare is out here! Tap it to meet it.', null, null, 6000);
    Q.sound.chime();
    Q.track('rare_spotted', { species: a.species });
    return a;
  }
  Q.lookForRare = lookForRare;
  setInterval(() => { if (!document.hidden) lookForRare(); }, 1500);

  // Building the right spot: when your patch makes a home for a rare Stitchling, it steps out right there.
  Q.on('placed', ({ patch }) => {
    if (!Q.prefs.onboard || !Q.prefs.onboard.done || (Q.showing && Q.showing())) return;
    const night = Q.isNight(), key = (s) => `${s.species}:${s.x},${s.y}`;
    // The spots as they were without this patch (it goes straight back).
    const p = R.removePatch(Q.world, patch.id);
    if (!p) return;
    const before = new Set(ST.rareSites(Q.world, { night }).map(key));
    R.addPatch(Q.world, p);
    const fresh = ST.rareSites(Q.world, { night })
      .find((s) => !before.has(key(s)) && Math.max(Math.abs(s.x - patch.x), Math.abs(s.y - patch.y)) <= 8);
    if (!fresh) return;
    const sp = ST.SPECIES[fresh.species], t = performance.now() / 1000, isNew = !(Q.me.stitchbook || {})[fresh.species];
    const a = Q.renderer.ensureSite(Q.scene(), fresh.species, fresh.x, fresh.y, t);
    if (a) {
      Q.renderer.sparkle(a.x, a.y - 0.4);
      if (isNew) { spotted.add(fresh.species); Q.renderer.beckon(a, '!'); } else Q.renderer.poke(a, t, '♥');
    }
    Q.showBanner(isNew ? 'You built just the right spot, and something rare moved in! Tap it to meet it.' : `You made another home for a ${sp.name}!`, null, null, 7000);
    Q.sound.reveal();
    Q.track('rare_built', { species: fresh.species, isNew });
    Q.emit('rare-built', fresh);
  });

  // ---------- You: level, Buttons, looks and the shop ----------

  $('#me-pill').addEventListener('click', () => showYou());

  function badgesFor(me) {
    const world = Q.world, out = [];
    if (me.kitDone) out.push('Homemaker');
    const built = world.wonders.filter((w) => w.completedAt && R.wonderProgress(world, w).builders.has(me.id)).length;
    if (built) out.push(`Wonder Builder ×${built}`);
    if (world.wonders.some((w) => w.foundedBy === me.id)) out.push('Founder');
    if ((me.visited || []).length >= 3) out.push('Explorer');
    if ((me.friends || []).length) out.push('Good Friend');
    if (Object.keys(me.stitchbook || {}).length >= 10) out.push('Stitchling Spotter');
    return out;
  }

  function showYou() {
    const me = Q.me;
    if (!me) return;
    const info = R.levelInfo(me.xp || 0);
    const next = Object.keys(R.LEVEL_UNLOCKS).map(Number).find((l) => l > info.level);
    const mine = [...Q.world.byId.values()].filter((p) => p.owner === me.id).length;
    const found = Object.keys(me.stitchbook || {}).length;
    const styles = Object.keys(R.STYLES).map((s) => {
      const owned = (me.styles || ['patchwork']).includes(s);
      return `<button role="radio" aria-checked="${me.style === s}" data-act="equip-style" data-style="${s}"${owned ? '' : ' disabled'}>${esc(R.STYLES[s].name)}${owned ? '' : ` · L${R.STYLES[s].level}`}</button>`;
    }).join('');
    const outfits = [`<button role="radio" aria-checked="${!me.outfit}" data-act="equip-outfit" data-outfit="">None</button>`]
      .concat((me.outfits || []).map((o) => `<button role="radio" aria-checked="${me.outfit === o}" data-act="equip-outfit" data-outfit="${o}">${esc(R.OUTFITS[o])}</button>`)).join('');
    // Everyday fabrics, the ones levels bring, and any bought in the shop.
    const fabricNow = R.fabricOf(me);
    const fabrics = Object.keys(R.FABRICS).filter((id) => !(R.FABRICS[id].shop || R.FABRICS[id].club) || (me.fabrics || []).includes(id)).map((id) => {
      const f = R.FABRICS[id], ok = R.canUseFabric(me, id);
      return `<button class="swatch" role="radio" aria-checked="${fabricNow === id}" data-act="equip-fabric" data-fabric="${id}"${ok ? '' : ' disabled'}>` +
        `<canvas class="fabric" data-fabric="${id}" width="96" height="96"></canvas><span>${esc(f.name)}</span>${ok ? '' : `<small>Level ${f.level}</small>`}</button>`;
    }).join('');
    const inShop = R.SHOP.filter((s) => s.type === 'fabric' && !(me.fabrics || []).includes(s.id)).length;
    const badges = badgesFor(me);
    Q.openSheet(`
      <span class="eyebrow">${esc(me.nation ? Q.nationName(me.nation) || '' : 'Builder')}</span>
      <h2 id="sheet-title">${esc(me.name)}${R.isClub(me) ? ' <span class="club-badge">★ Club</span>' : ''}</h2>
      <div class="level-card">
        <div class="level-num">${info.level}</div>
        <div class="grow">
          <b>Level ${info.level}</b>
          <div class="progress xp"><i style="width:${Math.round((info.into / info.need) * 100)}%"></i></div>
          <small>${info.need - info.into} XP to Level ${info.level + 1}${next ? ` · Level ${next}: ${esc(R.LEVEL_UNLOCKS[next].text)}` : ''}</small>
        </div>
      </div>
      <div class="stat-row">
        <div><b>${me.buttons || 0}</b><span>Buttons</span></div>
        <div><b>${mine}</b><span>patches placed</span></div>
        <div><b>${found}</b><span>Stitchlings met</span></div>
      </div>
      ${badges.length ? `<div class="names">${badges.map((b) => `<span class="me">${esc(b)}</span>`).join('')}</div>` : ''}
      <p class="section-label">Your quilt square</p>
      <div class="swatches" role="radiogroup" aria-label="Quilt fabric for your home">${fabrics}</div>
      ${inShop ? `<p class="muted small">${plural(inShop, 'more fabric')} in the Button Shop.</p>` : ''}
      <p class="section-label">Your roofs</p>
      <div class="seg wrap" role="radiogroup" aria-label="Roof style">${styles}</div>
      <p class="section-label">Your Stitchlings' outfit</p>
      <div class="seg wrap" role="radiogroup" aria-label="Outfit">${outfits}</div>
      ${clubCard(me)}
      <div class="row">
        <button class="btn" data-act="shop">Button Shop</button>
        <button class="btn" data-act="daily">Daily rewards</button>
      </div>
      <div class="row">
        <button class="btn" data-act="book">Stitchbook</button>
        <button class="btn" data-act="friends">Friends</button>
      </div>
    `, { name: 'you' });
    paintSwatches();
  }
  Q.showYou = showYou;
  Q.acts.you = () => showYou();

  function paintSwatches() {
    for (const c of document.querySelectorAll('canvas.fabric[data-fabric]')) window.QuiltRender.fabricSwatch(c, c.dataset.fabric);
  }

  async function wearFabric(id) {
    const res = await Q.call('equip', { fabric: id });
    if (!res.ok) { Q.toast(res.error, true); return false; }
    Q.renderer.markAllDirty();
    Q.sound.pop();
    Q.toast(`Your home is ${R.FABRICS[id].name} now`);
    Q.track('fabric', { fabric: id });
    return true;
  }
  Q.acts['equip-fabric'] = async (el) => { if (await wearFabric(el.dataset.fabric)) showYou(); };

  Q.acts['equip-style'] = async (el) => {
    const res = await Q.call('equip', { style: el.dataset.style });
    if (!res.ok) return Q.toast(res.error, true);
    Q.renderer.markAllDirty();
    Q.toast(`${R.STYLES[el.dataset.style].name} roofs on all your houses`);
    showYou();
  };
  Q.acts['equip-outfit'] = async (el) => {
    const res = await Q.call('equip', { outfit: el.dataset.outfit || null });
    if (!res.ok) return Q.toast(res.error, true);
    Q.toast(el.dataset.outfit ? `Your Stitchlings put on their ${R.OUTFITS[el.dataset.outfit].toLowerCase()}` : 'Outfits off');
    showYou();
  };

  // ---------- The Quiltopia Club ----------
  // Only about looks, never building. Offered quietly in your profile once you're at CLUB_LEVEL.

  const clubDate = (ms) => new Date(ms).toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
  function clubCard(me) {
    if (R.levelOf(me.xp || 0) < R.CLUB_LEVEL) return '';
    if (R.isClub(me)) {
      return `<button class="club-card member" data-act="club"><span class="club-star">★</span><span class="grow"><b>Quiltopia Club</b><small>You're a member until ${esc(clubDate(me.clubUntil))}. Thank you!</small></span></button>`;
    }
    return `<button class="club-card" data-act="club"><span class="club-star">★</span><span class="grow"><b>Support Quiltopia</b><small>The Club: a new gold-thread fabric every month and a ★ by your name. ${esc(Q.CFG.clubPrice)}.</small></span></button>`;
  }

  Q.acts.club = () => showClub();
  function showClub() {
    const me = Q.me;
    if (!me) return;
    const fabric = R.clubFabricFor(Date.now());
    const member = R.isClub(me);
    const credits = [...Q.world.players.values()].filter((p) => R.isClub(p)).map((p) => p.name);
    Q.openSheet(`
      <span class="eyebrow">Support Quiltopia</span>
      <h2 id="sheet-title">The Quiltopia Club</h2>
      <p class="club-price"><b>${esc(Q.CFG.clubPrice)}</b> · cancel any time</p>
      <ul class="club-perks">
        <li><canvas class="fabric" data-fabric="${fabric}" width="92" height="92"></canvas><span class="grow"><b>A new Club fabric every month</b><small>Woven with gold thread. This month: ${esc(R.FABRICS[fabric].name)}. Each one is yours to keep.</small></span></li>
        <li><span class="club-star">★</span><span class="grow"><b>A gold star by your name</b><small>On your home, your profile and every Wonder plaque you're on.</small></span></li>
        <li><span class="club-star">✎</span><span class="grow"><b>Your name in the season credits</b><small>With everyone who keeps the quilt going.</small></span></li>
      </ul>
      <p class="callout">No building advantages: patches, Wonder slots and everything else work the same for everyone, member or not.</p>
      ${member
        ? `<p><b>You're in the Club until ${esc(clubDate(me.clubUntil))}.</b> Thank you for keeping Quiltopia going!</p>`
        : `<button class="btn primary wide" data-act="club-join">Join for ${esc(Q.CFG.clubPrice)}</button>
          <p class="muted small">Under 13? Ask a grown-up before joining.</p>`}
      <p class="section-label">Season credits</p>
      <p class="muted small">${credits.length ? credits.map(esc).join(' · ') : 'Be the first name here.'}</p>
    `, { name: 'club' });
    paintSwatches();
  }

  Q.acts['club-join'] = async () => {
    if (Q.server.mode === 'demo') {
      // No real payments in the demo world: say so plainly.
      return Q.openSheet(`
        <span class="eyebrow">Demo world</span>
        <h2 id="sheet-title">A pretend checkout</h2>
        <p>This is the demo, so nothing is charged. In the live game, this button opens a secure Stripe checkout for <b>${esc(Q.CFG.clubPrice)}</b>.</p>
        <button class="btn primary wide" data-act="club-pretend">Pretend to join for a month</button>
        <button class="btn wide" data-act="club">Not now</button>
      `, { name: 'club-demo' });
    }
    const res = await Q.call('joinClub');
    if (!res.ok) return Q.toast(res.error, true);
    Q.track('club_checkout');
    Q.toast('The checkout opened in a new tab. Your badge appears as soon as it goes through.');
  };
  Q.acts['club-pretend'] = async () => {
    const res = await Q.call('joinClub');
    if (!res.ok) return Q.toast(res.error, true);
    Q.track('club_join', { demo: true });
    Q.sound.fanfare();
    Q.renderer.markAllDirty();
    Q.toast(`Welcome to the Club! ${R.FABRICS[res.clubFabric].name} is yours. Wear it from your profile.`);
    showClub();
  };
  // A member's monthly fabric, given when they come back in a new month.
  const clubGift = (fabric) => { if (fabric) Q.toast(`This month's Club fabric is here: ${R.FABRICS[fabric].name}. It's in your profile.`); };
  Q.on('ready', (e) => clubGift(e.clubFabric));
  Q.on('refreshed', (res) => clubGift(res.clubFabric));

  Q.acts.shop = () => showShop();
  function showShop() {
    const me = Q.me;
    const level = R.levelOf(me.xp || 0);
    if (level < R.SHOP_LEVEL) {
      return Q.openSheet(`<h2 id="sheet-title">Button Shop</h2><p>The shop opens at <b>Level ${R.SHOP_LEVEL}</b>. You're Level ${level}: keep building, helping and meeting Stitchlings.</p>
        <p class="muted small">Everything in the shop is just for looks, and earned with Buttons from playing. Nothing here gives anyone extra building power.</p><button class="btn primary wide" data-close>OK</button>`);
    }
    const item = (s) => {
      if (s.type === 'fabric') {
        const owned = (me.fabrics || []).includes(s.id);
        return `<li><div class="list-item"><canvas class="fabric" data-fabric="${s.id}" width="92" height="92"></canvas>
          <span class="grow"><b>${esc(R.FABRICS[s.id].name)}</b><small>A quilt fabric for your home${owned ? ' · Yours' : ''}</small></span>
          <button class="btn small${owned ? '' : ' gold'}" data-act="buy" data-id="${s.id}"${owned || me.buttons < s.price ? ' disabled' : ''}>${owned ? 'Owned' : `${icon('button', 16)} ${s.price}`}</button></div></li>`;
      }
      const name = s.type === 'decor' ? R.PATCHES[s.id].name : R.OUTFITS[s.id];
      const owned = s.type === 'outfit' && (me.outfits || []).includes(s.id);
      const have = s.type === 'decor' ? (me.keep || {})[s.id] || 0 : 0;
      return `<li><div class="list-item">${s.type === 'decor' ? icon(s.id, 30) : '<canvas class="portrait" data-species="buttonling" width="34" height="34"></canvas>'}
        <span class="grow"><b>${esc(name)}</b><small>${s.type === 'decor' ? `${esc(R.PATCHES[s.id].blurb)}${have ? ` · You have ${have}` : ''}` : 'An outfit for the Stitchlings in your home'}</small></span>
        <button class="btn small${owned ? '' : ' gold'}" data-act="buy" data-id="${s.id}"${owned || me.buttons < s.price ? ' disabled' : ''}>${owned ? 'Owned' : `${icon('button', 16)} ${s.price}`}</button></div></li>`;
    };
    Q.openSheet(`
      <span class="eyebrow">${icon('button', 16)} ${me.buttons || 0} Buttons</span>
      <h2 id="sheet-title">Button Shop</h2>
      <p class="section-label">Decorations for your home</p>
      <ul class="list">${R.SHOP.filter((s) => s.type === 'decor').map(item).join('')}</ul>
      <p class="section-label">Quilt fabrics for your home</p>
      <ul class="list">${R.SHOP.filter((s) => s.type === 'fabric').map(item).join('')}</ul>
      <p class="section-label">Outfits for your Stitchlings</p>
      <ul class="list">${R.SHOP.filter((s) => s.type === 'outfit').map(item).join('')}</ul>
      <p class="muted small">Everything here is just for looks. Buttons come from your daily calendar, goals, wishes, level-ups and finished Wonders.</p>
    `, { name: 'shop' });
    paintPortraits();
    paintSwatches();
  }
  Q.acts.buy = async (el) => {
    const res = await Q.call('buy', el.dataset.id);
    if (!res.ok) return Q.toast(res.error, true);
    Q.sound.coin();
    const s = R.SHOP.find((x) => x.id === el.dataset.id);
    Q.track('buy', { item: s.id });
    // A new fabric goes straight onto your home.
    if (s.type === 'fabric') await wearFabric(s.id);
    else Q.toast(s.type === 'decor' ? `${R.PATCHES[s.id].name} is in your bag. Place it in your home!` : `${R.OUTFITS[s.id]} unlocked. Put it on from your profile.`);
    showShop();
  };

  // ---------- Level-ups ----------

  Q.on('levelup', (level) => {
    Q.sound.fanfare();
    Q.track('level_up', { level });
    const home = Q.me && R.homeRect(Q.world, Q.me);
    if (home) Q.renderer.celebrate({ x: home.x - 2, y: home.y - 2, w: home.w + 4, h: home.h + 4 }, performance.now() / 1000);
    const unlock = R.LEVEL_UNLOCKS[level];
    if (Q.onboarding) { Q.toast(`Level ${level}! +${20 * level} Buttons`); return; }
    Q.queueSheet(() => Q.openSheet(`
      <span class="eyebrow">Level up</span>
      <h2 id="sheet-title">Level ${level}!</h2>
      <p>You earned <b>${20 * level} Buttons</b>.</p>
      ${unlock ? `<p class="callout">Unlocked: <b>${esc(unlock.text)}</b></p>` : ''}
      <button class="btn primary wide" data-close>Keep building</button>
    `, { name: 'levelup' }));
  });

  // ---------- The daily calendar and goals ----------

  $('#btn-daily').addEventListener('click', () => showDaily());
  Q.acts.daily = () => showDaily();

  const rewardText = (r) => (r.buttons ? `${r.buttons} Buttons` : r.decor ? 'A decoration' : r.outfit ? 'An outfit' : 'A rare landmark');
  function calendarStrip(me) {
    const cal = me.calendar || { day: 0, last: -1 };
    const claimedToday = cal.last === R.dayOf(Date.now());
    // cal.day is the next tile to claim; the tile before it was the latest one claimed.
    const latest = claimedToday ? (cal.day + 6) % 7 : cal.day - 1;
    return `<div class="calendar">${R.CALENDAR.map((r, i) => {
      const done = i <= latest;
      const isToday = claimedToday ? i === latest : i === cal.day;
      return `<div class="cal-day${done ? ' done' : ''}${isToday ? ' today' : ''}"><small>Day ${i + 1}</small>${r.buttons ? icon('button', 24) : r.landmark ? icon('windmill', 24) : r.outfit ? '<span class="cal-glyph">✿</span>' : icon('bench', 24)}<b>${r.buttons || (r.landmark ? '★' : '')}</b></div>`;
    }).join('')}</div>`;
  }

  async function showDaily() {
    const me = Q.me;
    if (!me) return;
    const state = await Q.server.goals();
    renderPips(state);
    const cal = me.calendar || { day: 0, last: -1 };
    const claimed = cal.last === R.dayOf(Date.now());
    Q.openSheet(`
      <span class="eyebrow">Daily rewards</span>
      <h2 id="sheet-title">${claimed ? "Today's reward is yours" : 'A reward is waiting'}</h2>
      ${calendarStrip(me)}
      ${claimed ? `<p class="muted small">Come back tomorrow for day ${((cal.day) % 7) + 1}. Missing a day pauses the calendar; it never resets.</p>` : '<button class="btn gold wide" data-act="claim-day">Claim today\'s reward</button>'}
      <p class="section-label">Today's goals · new ones in ${Q.untilTomorrow()}</p>
      <ul class="goals">${(state ? state.list : []).map((g) => `
        <li class="${g.done ? 'done' : ''}"><span class="goal-check">${g.done ? '✓' : ''}</span>
          <span class="grow"><b>${esc(g.text)}</b><span class="progress mini"><i style="width:${Math.round((g.count / g.target) * 100)}%"></i></span></span>
          <small>${g.count}/${g.target}</small>${g.done ? '' : `<button class="btn small primary" data-act="goal-go" data-goal="${g.id}">Go</button>`}</li>`).join('')}</ul>
      <p class="muted small">Each goal pays ${R.GOAL_BUTTONS} Buttons, and all three pay ${R.GOALS_BONUS} more.</p>
    `, { name: 'daily' });
  }
  Q.showDaily = showDaily;

  Q.acts['claim-day'] = () => claimDay(true);

  async function claimDay(fromSheet) {
    const res = await Q.call('claimDay');
    if (!res.ok) return Q.toast(res.error, true);
    updateDailyDot();
    if (!res.reward) { if (fromSheet) showDaily(); return; }
    Q.track('calendar_claim', { day: res.reward.day });
    Q.sound.coin();
    const r = res.reward;
    const what = r.buttons ? `<b>${r.buttons} Buttons</b>` : r.keep ? `a <b>${R.PATCHES[r.keep].name}</b>` : r.outfit ? `a <b>${esc(R.OUTFITS[r.outfit])}</b> for your Stitchlings` : 'a surprise';
    const show = () => Q.openSheet(`
      <span class="eyebrow">Daily reward · day ${r.day} of 7</span>
      <h2 id="sheet-title">You got ${what.replace(/<[^>]+>/g, '')}!</h2>
      <div class="reward-big">${r.buttons ? icon('button', 64) : r.keep ? icon(r.keep, 64) : '<canvas class="portrait" data-species="patchpup" width="72" height="72"></canvas>'}</div>
      ${calendarStrip(Q.me)}
      <p class="muted small">${r.keep && R.PATCHES[r.keep].group === 'landmark' ? 'Landmarks are rare. Place it anywhere you can build so everyone can see it.' : r.keep ? "It's in your bag. Decorations go in your home." : r.outfit ? 'Put it on from your profile.' : 'Spend Buttons in the Button Shop.'}</p>
      <button class="btn primary wide" data-act="daily">See today's goals</button>
    `, { name: 'day-reward' });
    if (fromSheet) show(); else Q.queueSheet(() => { show(); Q.paintPortraits(); });
    Q.paintPortraits();
  }
  Q.claimDay = claimDay;

  Q.updateDailyDot = () => updateDailyDot();
  function updateDailyDot() {
    const me = Q.me;
    $('#daily-dot').hidden = !(me && (!me.calendar || me.calendar.last !== R.dayOf(Date.now())));
  }
  Q.on('hud', updateDailyDot);

  // Goals pay out on their own shortly after the actions that count toward them.
  let goalTimer = 0;
  function claimGoalsSoon() {
    clearTimeout(goalTimer);
    goalTimer = setTimeout(async () => {
      if (!Q.me) return;
      const res = await Q.call('claimGoals');
      if (!res.ok) return;
      for (const id of res.newly || []) {
        goalCard(`<span class="goal-tick">✓</span><span class="grow"><small>Goal done</small><b>${esc(R.GOALS[id].text)}</b></span><span class="goal-reward">+${R.GOAL_BUTTONS} <i class="btn-coin"></i></span>`);
        Q.track('goal_done', { goal: id });
      }
      if (res.bonus) goalCard(`<span class="goal-tick">★</span><span class="grow"><small>All three goals done</small><b>New ones arrive tomorrow</b></span><span class="goal-reward">+${R.GOALS_BONUS} <i class="btn-coin"></i></span>`, true);
      if (res.goals) renderPips(res.goals, true);
    }, 900);
  }
  Q.claimGoalsSoon = claimGoalsSoon;
  for (const ev of ['placed', 'helped', 'met', 'sticker-sent', 'gift-sent', 'visited']) Q.on(ev, claimGoalsSoon);

  // Three pips on the calendar button: today's goals at a glance. A newly done one pops.
  let pipsDone = -1;
  function renderPips(state, animate) {
    if (!state) return;
    const done = state.list.filter((g) => g.done).length;
    const pips = [...document.querySelectorAll('#goal-pips i')];
    pips.forEach((p, i) => {
      p.classList.toggle('on', i < done);
      p.classList.remove('pop');
      if (animate && i < done && i >= pipsDone && pipsDone >= 0) { void p.offsetWidth; p.classList.add('pop'); }
    });
    pipsDone = done;
    $('#btn-daily').setAttribute('aria-label', `Daily rewards and goals: ${done} of ${state.list.length} goals done today`);
  }
  async function refreshPips() { if (Q.me) renderPips(await Q.server.goals()); }
  for (const ev of ['ready', 'refreshed', 'return']) Q.on(ev, refreshPips);

  // A finished goal rises from the dock with its Buttons; several in a row wait their turn, and all
  // three done gets a fanfare and confetti.
  const goalQueue = [];
  function goalCard(html, all) {
    goalQueue.push({ html, all });
    if (goalQueue.length === 1) nextGoalCard();
  }
  function nextGoalCard() {
    const el = $('#goal-card'), g = goalQueue[0];
    if (!g) { el.hidden = true; return; }
    el.innerHTML = g.html;
    el.classList.toggle('all', !!g.all);
    el.hidden = false;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    if (g.all) {
      Q.sound.fanfare();
      const c = Q.cam;
      Q.renderer.celebrate({ x: c.x - 4, y: c.y - 3, w: 8, h: 4 }, performance.now() / 1000);
    } else Q.sound.coin();
    setTimeout(() => { goalQueue.shift(); nextGoalCard(); }, 2600);
  }

  // ---------- Goals you can go and do ----------
  // Each goal's Go button takes you straight to it: the right place on the map, with the card or
  // panel that does it already open.

  const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  function homeCenter() {
    const h = Q.me && R.homeRect(Q.world, Q.me);
    return h ? { x: h.x + h.w / 2, y: h.y + h.h / 2 } : { x: Q.cam.x, y: Q.cam.y };
  }
  function flyThen(x, y, z, fn) {
    Q.closeSheet(true);
    Q.hideCard();
    if (Q.placing) Q.stopPlacing();
    Q.remember();
    Q.flyTo(x, y, z, { done: () => setTimeout(fn, 150) });
  }
  const homeMiddle = (p) => { const r = R.homeRect(Q.world, p); return r && { x: r.x + r.w / 2, y: r.y + r.h / 2 }; };
  const nearest = (list, at, c) => list.slice().sort((a, b) => dist2(at(a), c) - dist2(at(b), c))[0];
  const outOfPatches = () => Q.toast(`You're out of patches. New ones in ${Q.untilRefill()}.`);

  const GOAL_GO = {
    // Home, holding a patch your Stitchlings wish for if you have one.
    place3() {
      const eff = Q.effectiveMe();
      const wished = Q.myWishes().flatMap((w) => R.WISHES[w.need].kinds).find((k) => R.available(eff, k) > 0);
      const kind = wished || R.BASIC.find((k) => R.available(eff, k) > 0);
      if (!kind) return outOfPatches();
      const c = homeCenter();
      flyThen(c.x, c.y, Math.max(Q.cam.z, Q.STREET_Z), () => Q.startPlacing(kind));
    },
    wonder1() { Q.closeSheet(true); Q.helpBuild(null); },
    // The nearest neighbor's garden that nobody has watered yet, with its Water button.
    water2() {
      const me = Q.me, c = homeCenter();
      const gardens = [...Q.world.byId.values()].filter((p) => p.kind === 'garden' && p.owner && p.owner !== me.id);
      const thirsty = gardens.filter((p) => !Q.watered.has(p.id));
      const g = nearest(thirsty.length ? thirsty : gardens, (p) => p, c);
      if (!g) return Q.toast('No neighbor has planted a garden yet.');
      flyThen(g.x + 0.5, g.y + 0.5, 36, () => Q.inspect(g.x, g.y));
    },
    // A friend's home (or the nearest neighbor's) you haven't left a sticker on today: their guest book.
    sticker1() {
      const me = Q.me, c = homeCenter(), day = R.dayOf(Date.now());
      const done = new Set(Q.stickers.filter((s) => s.from === me.id && R.dayOf(s.at) === day).map((s) => s.target));
      const people = [...Q.world.players.values()].filter((p) => p.id !== me.id && homeMiddle(p) && !done.has('home:' + p.id));
      const friends = people.filter((p) => (me.friends || []).includes(p.id));
      const p = nearest(friends.length ? friends : people, homeMiddle, c);
      if (!p) return Q.toast("You've left a sticker on every home today!");
      const m = homeMiddle(p);
      flyThen(m.x, m.y, 30, () => Q.emit('player-card', p.id));
    },
    // Your own Stitchling (or the nearest neighbor's) waves until you tap it.
    meet1() {
      const me = Q.me, c = homeCenter();
      const homes = ST.homes(Q.world).filter((h) => h.residents.length);
      const h = homes.find((x) => x.owner === me.id) || nearest(homes, (x) => x.anchor, c);
      if (!h) return Q.toast('No Stitchlings live nearby yet. Build a house and one moves in!');
      flyThen(h.anchor.x + 0.5, h.anchor.y + 0.5, 44, () => {
        const a = Q.renderer.ensureHome(Q.scene(), h.anchor.x, h.anchor.y, performance.now() / 1000)[0];
        if (a) Q.renderer.beckon(a, 'Hi!');
      });
    },
    // The nearest Block you've never been to: arriving counts.
    visit1() {
      const me = Q.me, c = homeCenter(), seen = new Set(me.visited || []);
      const mid = (b) => ({ x: (b.gx + 0.5) * R.BLOCK, y: (b.gy + 0.5) * R.BLOCK });
      const b = nearest(Q.world.blocks.filter((x) => x.id !== me.homeBlock && !seen.has(x.id)), mid, c);
      if (!b) return Q.toast("You've visited every Block! New ones appear as the quilt grows.");
      const m = mid(b);
      flyThen(m.x, m.y, 12, () => {});
    },
    // A friend first, else the nearest neighbor: the gift panel.
    gift1() {
      const me = Q.me, c = homeCenter();
      const people = [...Q.world.players.values()].filter((p) => p.id !== me.id && homeMiddle(p));
      const friends = people.filter((p) => (me.friends || []).includes(p.id));
      const p = nearest(friends.length ? friends : people.filter((x) => x.homeBlock === me.homeBlock), homeMiddle, c);
      if (!p) return Q.toast('Gifts go to friends and neighbors. Invite a friend!');
      Q.acts.gift({ dataset: { id: p.id } });
    },
    // The nearest open square beside someone else's patch, ready to stitch.
    beside1() {
      const ctx = Q.placeContext(), me = Q.me, c = homeCenter();
      const kinds = R.BASIC.filter((k) => R.available(ctx.me, k) > 0);
      if (!kinds.length) return outOfPatches();
      const spot = besideSpot(ctx, me, kinds, Math.floor(c.x), Math.floor(c.y));
      if (!spot) return Q.toast("No open square beside a neighbor's patch nearby. Try the Commons!");
      Q.closeSheet(true);
      Q.hideCard();
      Q.remember();
      Q.startPlacing(spot.kind, { noFly: true });
      Q.setPreview(spot.x, spot.y, true);
      Q.flyTo(spot.x + 0.5, spot.y + 0.5, Math.max(Q.cam.z, Q.STREET_Z + 6));
    },
  };

  // Searches outward in rings for a square you can build on that touches someone else's patch.
  function besideSpot(ctx, me, kinds, x0, y0) {
    for (let r = 0; r < 48; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const x = x0 + dx, y = y0 + dy;
          if (Q.pendingAt(x, y) || !R.besideNeighbor(Q.world, x, y, me.id)) continue;
          const kind = kinds.find((k) => R.canPlace(Q.world, ctx.me, x, y, k, ctx.opts).ok);
          if (kind) return { x, y, kind };
        }
      }
    }
    return null;
  }

  Q.acts['goal-go'] = (el) => {
    const go = GOAL_GO[el.dataset.goal];
    if (!go || !Q.me) return;
    Q.track('goal_go', { goal: el.dataset.goal });
    go();
  };
  Q.goalGo = (id) => GOAL_GO[id] && GOAL_GO[id]();

  // Once a day (after the first visit is over), the calendar reward pops up by itself.
  Q.on('daily-check', () => {
    const me = Q.me;
    if (!me || !me.kitDone || Q.welcomePending) return; // the welcome-back card claims it itself
    if (!me.calendar || me.calendar.last !== R.dayOf(Date.now())) claimDay(false);
  });
  Q.on('return', () => Q.emit('daily-check'));
})(window.Q);
