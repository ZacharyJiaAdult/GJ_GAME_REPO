/* Quiltopia — the everyday panels: tap cards for patches and places, Wonders and their plaques,
   Go To, the Nations Cup, settings, your bag, fresh patches, reporting and moderation. */
(function (Q) {
  'use strict';

  const { R, ICONS, esc, plural, $ } = Q;
  const icon = (kind, size) => (ICONS[kind] || ICONS.pick).replace('<svg', `<svg width="${size || 40}" height="${size || 40}"`);

  // ---------- Tap cards: a quick answer without covering the map ----------

  Q.on('inspect', ({ patch, zone, x, y }) => {
    const me = Q.me;
    if (patch) {
      const owner = patch.owner ? Q.world.players.get(patch.owner) : null;
      const mine = me && patch.owner === me.id;
      const who = !patch.owner ? `Part of ${esc(Q.CFG.season)}'s landscape` : mine ? 'Yours' : `${esc(owner ? owner.name : 'A builder')}'s`;
      const actions = [];
      if (patch.kind === 'house' && owner && !mine) actions.push(`<button class="btn small" data-act="player" data-id="${owner.id}">Visit ${esc(owner.name.split(' ')[0])}</button>`);
      if (patch.kind === 'garden' && me && !mine) actions.push(`<button class="btn small primary" data-act="water" data-id="${patch.id}">Water it</button>`);
      if (mine && Q.inMyHome(R.zoneOf(Q.world, patch.x, patch.y))) actions.push(`<button class="btn small" data-act="pickup" data-id="${patch.id}">Pick it up</button>`);
      actions.push(`<button class="btn small" data-act="patch" data-id="${patch.id}">More</button>`);
      const gift = patch.gift && patch.gift !== 'kit' ? ` · a gift from ${esc(Q.playerName(patch.gift))}` : '';
      return Q.card(`<div class="card-row">${icon(patch.kind, 36)}<div class="grow"><b>${R.PATCHES[patch.kind].name}</b><small>${who}${patch.owner ? ` · ${Q.ago(patch.at)}` : ''}${gift}</small></div></div><div class="card-actions">${actions.join('')}</div>`);
    }
    const z = zone;
    if (!z) return;
    if (z.type === 'slot' || z.type === 'frame' || z.type === 'founding') return Q.emit('wonder-tap', z.wonder);
    if (z.type === 'lot') return Q.emit('lot-tap', z);
    if (z.type === 'plot') {
      if (me && z.owner === me.id) return Q.card('<div class="card-row"><div class="grow"><b>Your home</b><small>Pick a patch below and tap here to build. In your home it stitches straight away.</small></div></div>');
      const o = z.owner && Q.world.players.get(z.owner);
      if (o) return Q.emit('player-card', o.id);
      return Q.card('<div class="card-row"><div class="grow"><b>A free home plot</b><small>Saved for the next neighbor to arrive.</small></div></div>');
    }
    if (z.type === 'shared') {
      return Q.card(`<div class="card-row"><div class="grow"><b>${esc(z.block.name)}</b><small>${me && me.homeBlock === z.block.id ? 'Shared land. You and your neighbors can build here.' : 'Shared land, for the people who live here.'}</small></div></div>`);
    }
    if (z.type === 'commons') return Q.card(`<div class="card-row"><div class="grow"><b>${esc(z.block.name)}</b><small>Open land. Anyone can build here.</small></div></div>`);
  });

  // ---------- A patch, close up ----------

  Q.acts.patch = (el) => showPatch(Q.world.byId.get(+el.dataset.id));

  function showPatch(p) {
    if (!p) return;
    const me = Q.me;
    const owner = p.owner ? Q.world.players.get(p.owner) : null;
    const mine = me && p.owner === me.id;
    const zone = R.zoneOf(Q.world, p.x, p.y);
    const won = p.wonder ? Q.world.wonders.find((w) => w.id === p.wonder) : null;
    const who = !p.owner ? `Part of ${esc(Q.CFG.season)}'s landscape` : `Placed by <b>${esc(owner ? owner.name : 'a builder')}</b>${mine ? ' (you)' : ''}`;
    const nation = owner && owner.nation && Q.prefs.nations ? ` · ${esc(Q.nationName(owner.nation) || '')}` : '';
    Q.openSheet(`
      <div class="row center-row">
        <span class="sheet-icon">${icon(p.kind, 52)}</span>
        <div class="grow">
          <h2 id="sheet-title">${R.PATCHES[p.kind].name}</h2>
          <p class="muted small">${who}${nation}${p.owner ? ` · ${Q.ago(p.at)}` : ''}</p>
        </div>
      </div>
      <p>${R.PATCHES[p.kind].blurb}</p>
      ${p.gift && p.gift !== 'kit' ? `<p class="callout">${icon('gift', 20)} A gift from <b>${esc(Q.playerName(p.gift))}</b>.</p>` : ''}
      ${won ? `<p class="callout">Part of the <b>${esc(R.BLUEPRINTS[won.blueprint].name)}</b>. <button class="link" data-act="wonder" data-id="${won.id}">See the Wonder</button></p>` : ''}
      <div class="stack">
        ${p.kind === 'garden' && me && !mine ? `<button class="btn primary wide" data-act="water" data-id="${p.id}">Water this garden</button>` : ''}
        ${mine && zone.type === 'plot' ? `<button class="btn wide" data-act="pickup" data-id="${p.id}">Pick it up and put it back in your bag</button>` : ''}
        ${mine && zone.type !== 'plot' ? '<p class="muted small">Patches outside your home stay for the whole season.</p>' : ''}
        ${owner && !mine ? `<button class="btn wide" data-act="player" data-id="${owner.id}">About ${esc(owner.name)}</button>` : ''}
        ${!mine && p.owner ? `<button class="btn wide danger" data-act="report" data-id="${p.id}">Report this patch</button>` : ''}
      </div>
    `, { name: 'patch' });
  }

  Q.acts.water = async (el) => {
    const id = +el.dataset.id;
    const res = await Q.call('water', id);
    if (!res.ok) return Q.toast(res.error, true);
    Q.watered.add(id);
    Q.sound.chime();
    const g = Q.world.byId.get(id);
    if (g) { Q.renderer.react(g.x, g.y, 'water', performance.now() / 1000); Q.popGain(g.x, g.y, res.gain); }
    Q.toast(res.bonus ? 'Watered! You earned a bonus patch.' : 'Watered. Thank you!');
    Q.track('help_water', { bonus: res.bonus });
    Q.hideCard();
    Q.closeSheet(true);
    Q.emit('helped');
  };

  Q.acts.pickup = async (el) => {
    const res = await Q.call('pickUp', +el.dataset.id);
    if (!res.ok) return Q.toast(res.error, true);
    Q.sound.unpick();
    Q.toast('Back in your bag.');
    Q.hideCard();
    Q.closeSheet(true);
  };

  Q.acts.report = (el) => {
    Q.openSheet(`
      <h2 id="sheet-title">Report this patch</h2>
      <p class="muted">Reports go to a moderator, who can remove patches or roll back a whole area. Pick what's wrong:</p>
      <div class="stack">
        <button class="btn wide" data-act="report-send" data-id="${el.dataset.id}" data-reason="symbol">It looks like letters or a symbol</button>
        <button class="btn wide" data-act="report-send" data-id="${el.dataset.id}" data-reason="other">Something else feels wrong</button>
      </div>
    `);
  };
  Q.acts['report-send'] = async (el) => {
    await Q.server.report(+el.dataset.id, el.dataset.reason);
    Q.track('report', { reason: el.dataset.reason });
    Q.toast('Thanks. A moderator will take a look.');
    Q.closeSheet(true);
  };

  // ---------- Wonders ----------

  Q.on('wonder-tap', (won) => showWonder(won));
  Q.acts.wonder = (el) => showWonder(Q.world.wonders.find((w) => w.id === +el.dataset.id));
  $('#wonder-card').addEventListener('click', () => showWonder(Q.world.wonders.find((w) => w.id === +$('#wonder-card').dataset.wonder)));

  function showWonder(won) {
    won = won || Q.featuredWonder();
    if (!won) return;
    if (won.status === 'founding') return Q.emit('founding-sheet', won);
    const bp = R.BLUEPRINTS[won.blueprint];
    const prog = R.wonderProgress(Q.world, won);
    const left = prog.slots - prog.filled;
    const mineToday = Q.me ? Q.placeContext().opts.wonderToday(won.id) : 0;
    const pct = Math.round((prog.filled / prog.slots) * 100);
    Q.openSheet(`
      <span class="eyebrow">${bp.size} Wonder · ${esc(R.blockById(Q.world, won.block).name)}</span>
      <h2 id="sheet-title">${esc(bp.name)}</h2>
      <div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
      <div class="stat-row">
        <div><b>${prog.filled}/${prog.slots}</b><span>slots stitched</span></div>
        <div><b>${prog.builders.size}</b><span>builders</span></div>
        <div><b>${mineToday}/${R.ALLOWANCE.wonderPerPeriod}</b><span>yours ${Q.periodWord()}</span></div>
      </div>
      ${won.completedAt
        ? `<p>Finished! Every builder's name is stitched into its plaque, and every builder got its own Stitchling.</p>
           <button class="btn gold wide" data-act="show" data-id="${won.id}">Watch the show again</button>`
        : `<p>${plural(left, 'slot')} to go. Each builder can fill ${R.ALLOWANCE.wonderPerPeriod} ${Q.perPeriod()}, so it needs <b>at least ${plural(Math.ceil(left / R.ALLOWANCE.wonderPerPeriod), 'more builder')}</b>. Everyone who helps gets its Stitchling when it's done.</p>
           <button class="btn primary wide" data-act="help" data-id="${won.id}">Help build</button>
           <button class="btn wide" data-act="invite" data-id="${won.id}">Invite a friend to a slot</button>`}
      <button class="btn wide" data-act="plaque" data-id="${won.id}">${won.completedAt ? 'The plaque and its postcard' : 'See who built it'}</button>
      <div class="sticker-row" aria-label="Leave a sticker">${stickerButtons('wonder:' + won.id)}</div>
    `, { name: 'wonder' });
  }

  function stickerButtons(target) {
    return Object.keys(R.STICKERS).map((k) => `<button class="sticker-btn" data-act="sticker" data-target="${target}" data-kind="${k}" aria-label="${R.STICKERS[k]}"><canvas class="sticker-canvas" data-sticker="${k}" width="36" height="36"></canvas></button>`).join('');
  }
  Q.stickerButtons = stickerButtons;
  Q.on('sheet', () => paintStickers());
  function paintStickers() {
    for (const c of document.querySelectorAll('canvas[data-sticker]')) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5), s = c.clientWidth || 36;
      c.width = c.height = Math.round(s * dpr);
      window.QuiltRender.drawSticker(c.getContext('2d'), c.dataset.sticker, c.width / 2, c.height / 2, c.width * 0.8);
    }
  }
  Q.paintStickers = paintStickers;

  Q.acts.help = (el) => helpBuild(Q.world.wonders.find((w) => w.id === +el.dataset.id));
  Q.acts.plaque = (el) => showPlaque(Q.world.wonders.find((w) => w.id === +el.dataset.id), false);
  Q.acts.show = (el) => playShow(Q.world.wonders.find((w) => w.id === +el.dataset.id));
  Q.acts.invite = (el) => sendInvite(Q.world.wonders.find((w) => w.id === +el.dataset.id), 'help');
  $('#btn-help-build').addEventListener('click', () => helpBuild(null));

  // Takes you straight to an open slot that matches a patch you hold, next to what's stitched.
  // With nothing going up, the Wonder gathering founders is the next thing to help with.
  function helpBuild(won) {
    won = won || Q.openWonders().sort((a, b) => b.filled / b.slots - a.filled / a.slots)[0] || Q.world.wonders.find((w) => w.status === 'founding');
    if (!won) return Q.toast(`No Wonder needs builders right now. Found one at Level ${R.FOUND_LEVEL}!`);
    if (won.status === 'founding') return Q.emit('founding-sheet', won);
    const bp = R.BLUEPRINTS[won.blueprint];
    if (won.completedAt) return Q.toast(`The ${bp.name} is finished. Thank you, builders!`);
    if (!Q.me) return;
    const ctx = Q.placeContext();
    if (ctx.opts.wonderToday(won.id) >= R.ALLOWANCE.wonderPerPeriod) {
      return Q.toast(`You've filled ${R.ALLOWANCE.wonderPerPeriod} slots here ${Q.periodWord()}. Your next patches unlock more.`);
    }
    const options = [], needed = new Set();
    for (const s of R.slotsOf(won.blueprint)) {
      const x = won.x + s.dx, y = won.y + s.dy;
      if (R.patchAt(Q.world, x, y) || Q.pendingAt(x, y)) continue;
      needed.add(s.kind);
      if (!R.canPlace(Q.world, ctx.me, x, y, s.kind, ctx.opts).ok) continue;
      const touching = R.N4.filter(([dx, dy]) => R.patchAt(Q.world, x + dx, y + dy)).length;
      options.push({ x, y, kind: s.kind, score: touching + Math.random() * 0.5 });
    }
    if (!options.length) {
      const names = [...needed].map((k) => R.PATCHES[k].name).join(', ');
      return Q.toast(R.heldTotal(ctx.me) ? `The open slots need: ${names}. You don't hold any right now.` : `You're out of patches. New ones in ${Q.untilRefill()}.`);
    }
    options.sort((a, b) => b.score - a.score);
    const s = options[0];
    Q.closeSheet(true);
    Q.remember();
    Q.startPlacing(s.kind, { noFly: true });
    Q.setPreview(s.x, s.y, true);
    Q.flyTo(s.x + 0.5, s.y + 0.5, Math.max(Q.cam.z, Q.STREET_Z + 6));
    Q.emit('help-build', s);
  }
  Q.helpBuild = helpBuild;

  // The plaque: a postcard of the finished Wonder with every builder's name on it (the very picture
  // that gets shared), then the names with how many slots each one stitched. While it's still going
  // up, the plaque is just the names so far.
  function showPlaque(won, celebrating) {
    const bp = R.BLUEPRINTS[won.blueprint], sprite = Q.ST.SPECIES[bp.sprite];
    const prog = R.wonderProgress(Q.world, won);
    const builders = [...prog.builders.entries()].sort((a, b) => b[1] - a[1]);
    const me = Q.me;
    const helped = me && prog.builders.has(me.id);
    const done = !!won.completedAt;
    const touch = matchMedia('(pointer: coarse)').matches;
    const date = done ? new Date(won.completedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    Q.openSheet(`
      <span class="eyebrow">${celebrating ? 'Finished!' : 'The plaque'}${date ? ` · ${esc(date)}` : ''}</span>
      <h2 id="sheet-title">${esc(bp.name)}</h2>
      ${done ? `<img class="postcard" id="postcard" src="${BLANK}" width="${CARD.w}" height="${CARD.h}" alt="A postcard of the finished ${esc(bp.name)}, with the names of everyone who stitched it">
        ${touch ? '<p class="muted small postcard-hint">Press and hold the picture to save it.</p>' : ''}`
        : `<p class="muted">Every builder's name goes on the plaque. When the last slot is stitched, it becomes a postcard with all the names on it, to share.</p>`}
      ${helped ? `<p class="callout">Your name is on it. You stitched ${plural(prog.builders.get(me.id), 'slot')}${done ? `, and the ${esc(sprite.name)} is in your Stitchbook${celebrating ? `. Every builder got ${R.XP.wonderDone} XP and ${R.WONDER_BUTTONS} Buttons too` : ''}` : ''}.</p>` : ''}
      ${done ? `<button class="btn primary wide" data-act="share-wonder" data-id="${won.id}">${canShareFiles() ? 'Share the picture' : 'Save the picture'}</button>
        <div class="row">
          <button class="btn" data-act="copy-wonder" data-id="${won.id}">Copy the news</button>
          <button class="btn" data-act="show" data-id="${won.id}">${celebrating ? 'Watch again' : 'Watch the show'}</button>
        </div>
        ${upNextCard(won)}` : ''}
      <p class="section-label">${done ? 'Stitched by' : 'Stitched so far by'} ${plural(builders.length, 'builder')}</p>
      <div class="names">${builders.map(([id, n]) => `<span class="${me && id === me.id ? 'me' : ''}">${esc(Q.playerName(id))}${R.isClub(Q.world.players.get(id)) ? ' <b class="club-star-inline">★</b>' : ''} · ${n}</span>`).join('')}</div>
    `, { name: 'plaque', onClose: () => { if (show && show.won.id === won.id) endShow(); } });
    if (!done) return;
    Q.paintBlueprints();
    postcard(won).then((blob) => {
      const img = $('#postcard');
      if (!blob || !img || !img.isConnected) return;
      if (cardUrl) URL.revokeObjectURL(cardUrl);
      cardUrl = URL.createObjectURL(blob);
      img.src = cardUrl;
    });
  }

  // On a finished Wonder's plaque: the next one to work on, one tap away. That's one going up (the
  // closest to done), or else the one gathering founders (the town proposes one when none is left).
  function upNextCard(won) {
    const next = Q.openWonders().filter((w) => w.id !== won.id).sort((a, b) => b.filled / b.slots - a.filled / a.slots)[0]
      || Q.world.wonders.find((w) => w.status === 'founding');
    if (!next) return '';
    const bp = R.BLUEPRINTS[next.blueprint], me = Q.me;
    const founding = next.status === 'founding', signed = founding && me && next.founders.includes(me.id);
    const sub = !founding ? `${next.filled} of ${next.slots} slots stitched`
      : `${next.founders.length} of ${R.FOUNDERS_NEEDED} founders${next.foundedBy ? '' : ' · proposed by the town'}`;
    const button = !founding ? `<button class="btn small primary" data-act="help" data-id="${next.id}">Help build</button>`
      : signed ? `<button class="btn small" data-act="invite-found" data-id="${next.id}">Invite</button>`
        : `<button class="btn small primary" data-act="sign-founder" data-id="${next.id}">Sign</button>`;
    return `<div class="up-next"><canvas class="bp-preview" data-blueprint="${next.blueprint}" width="56" height="56"></canvas>
      <span class="grow"><small>Up next</small><b>${esc(bp.name)}</b><small>${sub}</small></span>${button}</div>`;
  }

  function wonderNews(won) {
    const bp = R.BLUEPRINTS[won.blueprint], prog = R.wonderProgress(Q.world, won);
    return `We finished the ${bp.name} in Quiltopia! ${prog.slots} patches, ${plural(prog.builders.size, 'builder')}${Q.me && prog.builders.has(Q.me.id) ? ', and I was one of them' : ''}.`;
  }
  const siteLink = () => (Q.CFG.siteUrl ? Q.CFG.siteUrl.replace(/\/$/, '') + '/' : location.href.split('#')[0]);

  // Phones share the picture itself (with the news); elsewhere it downloads and the news is copied.
  Q.acts['share-wonder'] = async (el) => {
    const won = Q.world.wonders.find((w) => w.id === +el.dataset.id), text = wonderNews(won);
    Q.track('wonder_shared', { wonder: won.id });
    const blob = await postcard(won);
    const file = blob && new File([blob], `quiltopia-${won.blueprint}.png`, { type: 'image/png' });
    if (file && canShareFiles()) {
      try { await navigator.share({ files: [file], text: `${text} ${siteLink()}` }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    Q.copyText(`${text} ${siteLink()}`);
    if (file) Q.saveFile(blob, file.name);
    Q.toast(file ? 'Saving the picture. The news is copied too, to post with it.' : 'Copied. Paste it anywhere!');
  };
  Q.acts['copy-wonder'] = (el) => {
    Q.copyText(`${wonderNews(Q.world.wonders.find((w) => w.id === +el.dataset.id))} ${siteLink()}`);
    Q.toast('Copied. Paste it anywhere!');
  };

  function canShareFiles() {
    try { return !!(navigator.canShare && navigator.canShare({ files: [new File([new Blob(['x'])], 'x.png', { type: 'image/png' })] })); } catch (e) { return false; }
  }
  Q.saveFile = (blob, name) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  };

  // ---------- The postcard ----------
  // 1080 x 1350 (the shape most feeds show whole): cream cotton inside a gold running stitch, the
  // Wonder in a mat with a rosette, then every builder's name. Yours comes first, on a denim ribbon.

  const CARD = { w: 1080, h: 1350 };
  const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  const DISPLAY = '"Shantell Sans", "Comic Sans MS", sans-serif', BODY = '"Atkinson Hyperlegible", "Segoe UI", sans-serif';
  let cardCache = null, cardUrl = null;

  async function postcard(won) {
    const prog = R.wonderProgress(Q.world, won), key = `${won.id}:${prog.builders.size}:${Q.isNight()}`;
    if (cardCache && cardCache.key === key) return cardCache.blob;
    if (document.fonts && document.fonts.load) {
      await Promise.all([`800 80px ${DISPLAY}`, `700 30px ${BODY}`, `400 27px ${BODY}`].map((f) => document.fonts.load(f).catch(() => null)));
    }
    const c = document.createElement('canvas');
    drawPostcard(c, won);
    const blob = await new Promise((res) => { try { c.toBlob(res, 'image/png'); } catch (e) { res(null); } });
    if (blob) cardCache = { key, blob };
    return blob;
  }
  Q.postcard = postcard;

  function rounded(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function spaced(g, text, x, y, px) {
    if ('letterSpacing' in g) { g.letterSpacing = `${px}px`; g.fillText(text, x + px / 2, y); g.letterSpacing = '0px'; } else g.fillText(text, x, y);
  }

  function drawPostcard(c, won) {
    const { w: W, h: H } = CARD, g = c.getContext('2d');
    c.width = W;
    c.height = H;
    const bp = R.BLUEPRINTS[won.blueprint], prog = R.wonderProgress(Q.world, won), me = Q.me;
    const date = new Date(won.completedAt || Date.now()).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

    g.fillStyle = '#f8efdc';
    g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(120, 88, 40, 0.045)';
    for (let i = 0; i < W; i += 6) g.fillRect(i, 0, 2, H);
    for (let i = 0; i < H; i += 6) g.fillRect(0, i, W, 2);
    g.setLineDash([22, 14]);
    g.lineWidth = 5;
    g.strokeStyle = '#d6a23a';
    rounded(g, 30, 30, W - 60, H - 60, 34);
    g.stroke();
    g.setLineDash([]);

    g.textAlign = 'center';
    g.fillStyle = '#9a7432';
    g.font = `700 25px ${BODY}`;
    spaced(g, 'QUILTOPIA  ·  A FINISHED WONDER', W / 2, 100, 5);
    g.fillStyle = '#1d2639';
    let size = 80;
    do { g.font = `800 ${size}px ${DISPLAY}`; size -= 4; } while (g.measureText(bp.name).width > 880 && size > 40);
    g.fillText(bp.name, W / 2, 180);

    // The Wonder, on a cream mat.
    const P = { x: 76, y: 222, w: 928, h: 660 };
    g.save();
    g.shadowColor = 'rgba(70, 45, 10, 0.28)';
    g.shadowBlur = 30;
    g.shadowOffsetY = 10;
    g.fillStyle = '#fffaf0';
    rounded(g, P.x - 16, P.y - 16, P.w + 32, P.h + 32, 30);
    g.fill();
    g.restore();
    const cols = bp.rows[0].length, rows = bp.rows.length;
    const pic = document.createElement('canvas');
    Q.renderer.snapshot(pic, Q.scene(), won.x + cols / 2, won.y + rows / 2, 0, performance.now() / 1000, { w: P.w, h: P.h, z: Math.min(P.w / (cols + 3), P.h / (rows + 1.8)) });
    g.save();
    rounded(g, P.x, P.y, P.w, P.h, 18);
    g.clip();
    g.drawImage(pic, P.x, P.y);
    g.restore();
    g.setLineDash([14, 10]);
    g.lineWidth = 3;
    g.strokeStyle = '#e0cba0';
    rounded(g, P.x - 8, P.y - 8, P.w + 16, P.h + 16, 24);
    g.stroke();
    g.setLineDash([]);
    rosette(g, P.x + P.w - 46, P.y + 20, 84, date);

    g.fillStyle = '#1d2639';
    g.font = `800 46px ${DISPLAY}`;
    g.fillText(`Stitched by ${plural(prog.builders.size, 'builder')}`, W / 2, 972);
    g.fillStyle = '#7a6440';
    g.font = `400 27px ${BODY}`;
    g.fillText(`${prog.slots} patches, placed one at a time`, W / 2, 1012);
    drawNames(g, prog, me, W, 1074);

    const site = (Q.CFG.siteUrl || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
    g.font = `400 26px ${BODY}`;
    g.fillStyle = '#8a7350';
    g.fillText(site ? `Build the next one with us at ${site}` : 'Build the next one with us in Quiltopia', W / 2, H - 58);
  }

  // A gold rosette pinned to the picture's corner: FINISHED and the date.
  function rosette(g, x, y, r, date) {
    g.save();
    g.translate(x, y);
    g.rotate(-0.16);
    g.shadowColor = 'rgba(70, 45, 10, 0.3)';
    g.shadowBlur = 16;
    g.shadowOffsetY = 6;
    g.fillStyle = '#e3b23c';
    g.beginPath();
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2, px = Math.cos(a) * r * 0.86, py = Math.sin(a) * r * 0.86;
      g.moveTo(px + r * 0.17, py);
      g.arc(px, py, r * 0.17, 0, Math.PI * 2);
    }
    g.moveTo(r * 0.9, 0);
    g.arc(0, 0, r * 0.9, 0, Math.PI * 2);
    g.fill();
    g.shadowColor = 'transparent';
    g.setLineDash([8, 6]);
    g.lineWidth = 3;
    g.strokeStyle = '#fff3cf';
    g.beginPath();
    g.arc(0, 0, r * 0.72, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
    g.textAlign = 'center';
    g.fillStyle = '#5a3a06';
    g.font = `800 26px ${DISPLAY}`;
    g.fillText('★', 0, -r * 0.24);
    g.font = `700 20px ${BODY}`;
    spaced(g, 'FINISHED', 0, r * 0.1, 3);
    g.font = `700 17px ${BODY}`;
    g.fillText(date.toUpperCase(), 0, r * 0.38);
    g.restore();
  }

  // Up to four centered lines of names with dots between; "and 12 more" when they don't all fit.
  function drawNames(g, prog, me, W, top) {
    const people = [...prog.builders.entries()].sort((a, b) => b[1] - a[1])
      .map(([id]) => ({ name: Q.playerName(id), me: !!me && id === me.id, club: R.isClub(Q.world.players.get(id)) }));
    const mine = people.findIndex((p) => p.me);
    if (mine > 0) people.unshift(people.splice(mine, 1)[0]);
    g.font = `700 30px ${BODY}`;
    const GAP = 40, MAX = 930, PAD = 16;
    const width = (p) => g.measureText(p.name).width + (p.club ? 28 : 0) + (p.me ? PAD * 2 : 0);
    const lines = [];
    let line = null, shown = 0;
    for (const p of people) {
      const w = width(p);
      if (!line || line.w + GAP + w > MAX) {
        if (lines.length === 4) break;
        line = { items: [], w: -GAP };
        lines.push(line);
      }
      line.items.push(p);
      line.w += GAP + w;
      shown++;
    }
    let more = people.length - shown;
    if (more) {
      const tag = () => ({ name: `and ${more} more`, more: true });
      while (line.items.length > 1 && line.w + GAP + width(tag()) > MAX) { line.w -= GAP + width(line.items.pop()); more++; }
      const t = tag();
      line.items.push(t);
      line.w += GAP + width(t);
    }
    lines.forEach((l, i) => {
      let x = W / 2 - l.w / 2;
      const y = top + i * 50;
      l.items.forEach((p, j) => {
        if (j) {
          g.textAlign = 'center';
          g.fillStyle = '#d6a23a';
          g.fillText('·', x + GAP / 2, y);
          x += GAP;
        }
        const w = width(p);
        if (p.me) {
          g.fillStyle = '#2f5bd3';
          rounded(g, x, y - 32, w, 44, 22);
          g.fill();
        }
        g.textAlign = 'left';
        g.fillStyle = p.me ? '#ffffff' : p.more ? '#8a7350' : '#2d3548';
        g.fillText(p.name, x + (p.me ? PAD : 0), y);
        if (p.club) {
          g.fillStyle = p.me ? '#ffe08a' : '#d6a23a';
          g.fillText('★', x + w - 26 - (p.me ? PAD : 0), y);
        }
        x += w;
      });
    });
    g.textAlign = 'center';
  }

  async function sendInvite(won, kind) {
    won = won || Q.featuredWonder();
    const bp = R.BLUEPRINTS[won.blueprint];
    const text = kind === 'found'
      ? `Help me found the ${bp.name} in Quiltopia! It needs ${R.FOUNDERS_NEEDED - won.founders.length} more founders to start building.`
      : `Help me finish the ${bp.name} in Quiltopia! ${won.filled} of ${won.slots} patches are stitched. This link drops you right onto an empty slot:`;
    Q.track('invite_sent', { wonder: won.id, kind });
    Q.bump('invitesSent');
    const how = await Q.shareText(text, Q.inviteLink(won, kind));
    if (how === 'copied') Q.toast('Invite link copied. Send it to a friend!');
    Q.emit('invited', won);
  }
  Q.sendInvite = sendInvite;

  // A Wonder is finished: everyone online gets the show. Its builders always see it, even mid-placing
  // or as soon as the panel they're reading closes; anyone else who's busy gets a banner to watch it.
  let waiting = null;
  Q.on('wonder', ({ wonder, before }) => {
    if (!before || before.completedAt || !wonder.completedAt) return;
    Q.track('wonder_completed', { wonder: wonder.id });
    if (Q.me) Q.refreshMe();
    const bp = R.BLUEPRINTS[wonder.blueprint];
    const mine = Q.me && R.wonderProgress(Q.world, wonder).builders.has(Q.me.id);
    if (mine && Q.placing) Q.stopPlacing();
    if (!Q.placing && !Q.sheetOpen()) return playShow(wonder);
    if (mine && !waiting) { waiting = wonder; Q.holdSheets(true); }
    Q.showBanner(`The ${bp.name} is finished!`, 'Watch', () => playShow(wonder));
  });
  Q.on('sheet-closed', () => setTimeout(() => {
    if (waiting && !show && !Q.sheetOpen() && !Q.placing) playShow(waiting);
  }, 400));

  // The show: the camera takes in the whole Wonder, a gold thread runs all the way around it, then
  // fireworks and music; its own Stitchling steps out to say hello, and the plaque comes up. Sheets
  // that pop up on their own (a level-up from the reward) wait until the plaque is closed.
  const TRACE = 1.6;
  let show = null;
  function playShow(won) {
    if (!won || !won.completedAt) return;
    if (waiting) { waiting = null; Q.holdSheets(false); }
    const after = show ? show.after.splice(0) : []; // watching again: what waits for the show still waits
    endShow();
    if (Q.placing) Q.stopPlacing();
    Q.closeSheet(true);
    Q.hideCard();
    const bp = R.BLUEPRINTS[won.blueprint], cols = bp.rows[0].length, rows = bp.rows.length;
    show = { won, timers: [], after, started: false };
    const me = show;
    const at = (ms, fn) => me.timers.push(setTimeout(() => { if (show === me) fn(); }, ms));
    Q.holdSheets(true);
    Q.showBanner(`The ${bp.name} is finished!`, null, null, 12000);
    Q.remember();
    const start = () => {
      if (show !== me || me.started) return;
      me.started = true;
      Q.renderer.celebrate(won, performance.now() / 1000, { trace: TRACE });
      Q.sound.thread(TRACE);
      Q.emit('show-start', won);
      at(TRACE * 1000 - 150, () => Q.sound.melody());
      at(TRACE * 1000 + 1300, () => debut(won));
      at(TRACE * 1000 + 6400, () => {
        if (!Q.sheetOpen() && !Q.placing) return showPlaque(won, true);
        endShow();
        Q.showBanner(`The ${bp.name} is finished!`, 'See the plaque', () => showPlaque(won, false));
      });
    };
    Q.flyTo(won.x + cols / 2, won.y + rows / 2, Math.min(innerWidth / (cols + 6), (innerHeight - 260) / (rows + 6)), { done: start });
    at(1500, start); // if the flight was interrupted, the show goes on where you are
  }

  // The Wonder's own Stitchling steps out for the very first time.
  function debut(won) {
    const bp = R.BLUEPRINTS[won.blueprint], sprite = Q.ST.SPECIES[bp.sprite], t = performance.now() / 1000;
    const a = Q.renderer.ensureSite(Q.scene(), bp.sprite, won.x + Math.floor(bp.rows[0].length / 2), won.y + bp.rows.length - 2, t);
    Q.showBanner(`Meet the ${sprite.name}! It lives at the ${bp.name} now.`, null, null, 6000);
    Q.sound.reveal();
    Q.emit('show-debut', won);
    if (!a) return;
    a.wait = 5;
    a.hop = t + 0.6;
    a.emote = { text: 'Ta-da!', until: t + 3.4 };
    a.spot = t + 9;
    Q.renderer.sparkle(a.x, a.y - 0.4);
    if (Q.me && R.wonderProgress(Q.world, won).builders.has(Q.me.id)) {
      Q.renderer.rewardPop(a.x - 0.5, a.y - 2.2, 'In your Stitchbook!', t + 0.5, { color: '#e3efff', ink: '#1c4f8f' });
    }
    Q.flyTo(a.x, a.y - 1.4, Math.max(Q.cam.z * 2.6, 46), { ms: 1300 });
  }

  function endShow() {
    const s = show;
    if (!s) return;
    show = null;
    s.timers.forEach(clearTimeout);
    Q.holdSheets(false);
    s.after.forEach((fn) => fn());
  }
  // Runs fn once the show (and its plaque) is over, or right away when there's no show.
  Q.afterShow = (fn) => { if (show) show.after.push(fn); else fn(); };
  Q.showing = () => !!show;

  // ---------- Go To: bring the map to the player ----------

  $('#btn-goto').addEventListener('click', showGoTo);

  function showGoTo() {
    const me = Q.me, world = Q.world;
    const home = me && R.homeRect(world, me);
    const item = (x, y, z, ic, title, sub) => `<li><button class="list-item" data-act="go" data-x="${x}" data-y="${y}" data-z="${z}">${ic}<span class="grow"><b>${esc(title)}</b><small>${esc(sub)}</small></span></button></li>`;
    const rows = [];
    if (home) rows.push(item(home.x + 4, home.y + 4, 30, ICONS.house, 'Your home', R.blockById(world, me.homeBlock).name));
    for (const w of world.wonders) {
      const bp = R.BLUEPRINTS[w.blueprint];
      const sub = w.status === 'founding' ? `Gathering founders · ${w.founders.length}/${R.FOUNDERS_NEEDED}` : w.completedAt ? 'Finished Wonder' : `${w.filled}/${w.slots} stitched · needs builders`;
      rows.push(item(w.x + bp.rows[0].length / 2, w.y + bp.rows.length / 2, 18, ICONS.wonder, bp.name, sub));
    }
    const friends = (me && me.friends || []).map((id) => world.players.get(id)).filter(Boolean);
    const cozy = Q.ST.cozy(Q.renderer.homes());
    const places = world.blocks.map((b) => item(b.gx * R.BLOCK + 32, b.gy * R.BLOCK + 32, 8, ICONS.tree, b.name, `${b.kind === 'commons' ? 'Commons' : 'Neighborhood'}${cozy.get(b.id) ? ` · Cozy ${cozy.get(b.id).score}` : ''}`));
    const marks = Q.prefs.bookmarks.map((b, i) => `<li class="row center-row"><button class="list-item" data-act="go" data-x="${b.x}" data-y="${b.y}" data-z="${b.z}"><span class="grow"><b>${esc(b.name)}</b><small>Saved place</small></span></button><button class="btn small" data-act="unmark" data-i="${i}" aria-label="Remove ${esc(b.name)}">×</button></li>`).join('');
    Q.openSheet(`
      <h2 id="sheet-title">Go to</h2>
      <ul class="list">${rows.join('')}</ul>
      ${friends.length ? `<p class="section-label">Friends</p><ul class="list">${friends.map((f) => { const r = R.homeRect(world, f); return r ? item(r.x + 4, r.y + 4, 30, ICONS.house, f.name, 'Friend') : ''; }).join('')}</ul>` : ''}
      <p class="section-label">Places</p>
      <ul class="list">${places.join('')}</ul>
      <p class="section-label">Saved places (${Q.prefs.bookmarks.length}/10)</p>
      ${marks ? `<ul class="list">${marks}</ul>` : '<p class="muted small">Save up to 10 favorite spots.</p>'}
      <div class="row">
        <button class="btn" data-act="bookmark"${Q.prefs.bookmarks.length >= 10 ? ' disabled' : ''}>Save this spot</button>
        <button class="btn" data-act="back">Back to last place</button>
      </div>
      <button class="btn wide" data-act="timelapse">Watch the world grow (time-lapse)</button>
    `, { name: 'goto' });
  }
  Q.showGoTo = showGoTo;

  Q.acts.go = (el) => {
    Q.closeSheet(true);
    Q.hideCard();
    Q.remember();
    if (Q.placing) Q.stopPlacing();
    Q.flyTo(+el.dataset.x, +el.dataset.y, +el.dataset.z);
  };
  Q.acts.back = () => { Q.closeSheet(true); Q.goBack(); };
  Q.acts.bookmark = () => {
    const b = R.blockAt(Q.world, Math.floor(Q.cam.x), Math.floor(Q.cam.y));
    Q.prefs.bookmarks.push({ name: `${b ? b.name : 'The edge'} (${Math.floor(Q.cam.x)}, ${Math.floor(Q.cam.y)})`, x: Q.cam.x, y: Q.cam.y, z: Q.cam.z });
    Q.savePrefs();
    Q.toast('Saved this spot');
    showGoTo();
  };
  Q.acts.unmark = (el) => { Q.prefs.bookmarks.splice(+el.dataset.i, 1); Q.savePrefs(); showGoTo(); };

  // ---------- Nations Cup ----------

  $('#btn-cup').addEventListener('click', showCup);

  async function showCup() {
    if (!Q.prefs.nations) {
      return Q.openSheet('<h2 id="sheet-title">Nations Cup</h2><p>National features are switched off.</p><button class="btn primary wide" data-act="nations-on">Switch them on</button>');
    }
    Q.openSheet('<h2 id="sheet-title">Nations Cup</h2><p class="muted">Counting this week\'s patches…</p>');
    let board = [];
    try { board = await Q.server.nationBoard(); } catch (e) { return Q.toast("Couldn't load the Nations Cup.", true); }
    const me = Q.me;
    const top = board.slice(0, 3);
    const mineIdx = me && me.nation ? board.findIndex((r) => r.code === me.nation) : -1;
    const fmt = (r) => r.score.toFixed(1);
    const place = (r, cls, medal) => (r ? `<div class="${cls}"><span class="medal">${medal}</span><b>${esc(r.name)}</b><small>${fmt(r)} pts each</small></div>` : '<div></div>');
    Q.openSheet(`
      <span class="eyebrow">This week</span>
      <h2 id="sheet-title">Nations Cup</h2>
      ${board.length ? `<div class="podium">${place(top[1], 'silver-place', '2nd')}${place(top[0], 'gold-place', '1st')}${place(top[2], 'bronze-place', '3rd')}</div>` : '<p class="muted">No nation has built anything this week yet.</p>'}
      ${mineIdx >= 0 ? `<p class="callout">Your nation, <b>${esc(board[mineIdx].name)}</b>, is <b>#${mineIdx + 1}</b> with ${fmt(board[mineIdx])} points per active builder (${plural(board[mineIdx].active, 'active builder')}).</p>`
        : me && me.nation ? `<p class="callout">Your nation, <b>${esc(Q.nationName(me.nation))}</b>, hasn't built this week yet. Your next patch puts it on the board.</p>`
          : '<button class="btn wide" data-act="pick-nation">Pick a nation to join the Cup</button>'}
      <p class="muted small">Points come from this week's building: 1 per patch and 3 per Wonder slot, divided by each nation's active builders, so a small nation can beat a big one. Only the top three are celebrated; there are no last-place lists.</p>
      ${Q.server.mode === 'demo' ? '<p class="demo-note">Demo world: the other nations\' builders are simulated.</p>' : ''}
    `, { name: 'cup' });
  }
  Q.acts['nations-on'] = () => { Q.prefs.nations = true; Q.savePrefs(); $('#btn-cup').hidden = false; showCup(); };

  // ---------- Nation picker ----------

  let pickerDone = null;
  function showNationPicker(onDone, locked) {
    pickerDone = onDone || null;
    const suggested = R.suggestNation(Q.CFG.nations, navigator.languages || [navigator.language]);
    const sorted = Q.CFG.nations.slice().sort((a, b) => (a[0] === suggested ? -1 : b[0] === suggested ? 1 : a[1].localeCompare(b[1])));
    Q.openSheet(`
      <span class="eyebrow">Nations Cup</span>
      <h2 id="sheet-title">Build for a nation?</h2>
      <p class="muted">Nations earn medals by building, never by tearing anything down. The suggestion comes from your language settings; there's no location tracking.</p>
      <input class="search" id="nation-search" placeholder="Search nations" autocomplete="off" aria-label="Search nations">
      <ul class="list list-scroll" id="nation-list">${sorted.map(([code, name]) => `
        <li><button class="list-item${code === suggested ? ' suggested' : ''}" data-act="nation" data-code="${code}" data-name="${esc(name.toLowerCase())}">
          <span class="grow"><b>${esc(name)}</b>${code === suggested ? '<small>Suggested from your language settings</small>' : ''}</span>
        </button></li>`).join('')}
      </ul>
      <button class="btn wide" data-act="nation" data-code="">Play without a nation</button>
      <p class="demo-note">This list is a placeholder for the prototype. The final list follows an international sports list.</p>
    `, { locked, name: 'nations' });
  }
  Q.showNationPicker = showNationPicker;
  Q.acts['pick-nation'] = () => showNationPicker();
  Q.acts.nation = async (el) => {
    const res = await Q.call('setNation', el.dataset.code || null);
    if (!res.ok) return Q.toast(res.error, true);
    Q.toast(Q.me.nation ? `You're building for ${Q.nationName(Q.me.nation)}` : 'Playing without a nation');
    Q.closeSheet(true);
    Q.renderer.markAllDirty();
    const fn = pickerDone;
    pickerDone = null;
    if (fn) fn();
  };
  document.addEventListener('input', (e) => {
    if (e.target.id !== 'nation-search') return;
    const q = e.target.value.trim().toLowerCase();
    for (const b of document.querySelectorAll('#nation-list [data-code]')) b.parentElement.hidden = q && !b.dataset.name.includes(q);
  });

  // ---------- Your bag and fresh patches ----------

  $('#btn-bag').addEventListener('click', showBag);

  function showBag() {
    const eff = Q.effectiveMe();
    if (!eff) return;
    const items = Object.entries(eff.items).filter(([, n]) => n > 0);
    const gifts = (eff.gifts || []).filter((g) => g.from !== 'kit');
    const keep = Object.entries(eff.keep || {}).filter(([, n]) => n > 0);
    const me = Q.me;
    const helps = me.helpPeriod === Q.currentPeriod() ? me.helps : 0;
    const row = (ic, title, sub) => `<li><div class="list-item">${ic}<span class="grow"><b>${title}</b><small>${sub}</small></span></div></li>`;
    Q.openSheet(`
      <span class="eyebrow">Your patch bag</span>
      <h2 id="sheet-title">${plural(R.heldTotal(eff) + gifts.length, 'patch', 'patches')} to place</h2>
      <ul class="list">
        ${row(ICONS.pick, plural(eff.picks, 'pick'), 'Any House, Garden, Tree, Water, Path, Park or Market')}
        ${items.map(([k, n]) => row(ICONS[k], `${R.PATCHES[k].name} ×${n}`, 'Surprise patch')).join('')}
        ${gifts.map((g) => row(ICONS[g.kind], R.PATCHES[g.kind].name, `A gift from ${esc(Q.playerName(g.from))}`)).join('')}
        ${keep.map(([k, n]) => row(ICONS[k], `${R.PATCHES[k].name} ×${n}`, R.PATCHES[k].group === 'landmark' ? 'Landmark · place it anywhere you can build' : 'Decoration · goes in your home')).join('')}
      </ul>
      <p class="callout">Every ${Q.periodNoun()}: <b>3 picks and 2 surprises</b>. Unused patches carry over, up to ${R.ALLOWANCE.cap}. Next delivery in <b>${Q.untilRefill()}</b>.</p>
      <p class="muted small">Water a neighbor's garden to earn a bonus pick, up to ${R.ALLOWANCE.helpBonus} ${Q.periodWord()}. You've earned ${Math.min(helps, R.ALLOWANCE.helpBonus)} so far.${Q.periodMinutes() < 1440 ? ' (The prototype refills hourly so testers see the loop quickly; the real game refills daily.)' : ''}</p>
    `, { name: 'bag' });
  }

  // (When the patches reveal shows is decided with the welcome-back card, in ui-social.js.)

  function showReveal(added, title) {
    if (!added || (!added.picks && !added.items.length)) return;
    Q.queueSheet(() => {
      const cards = [];
      for (let i = 0; i < added.picks; i++) cards.push(`<div class="reveal-card pick" style="animation-delay:${i * 90}ms">${ICONS.pick}<span class="tag">Your pick</span>Any patch</div>`);
      added.items.forEach((k, i) => cards.push(`<div class="reveal-card surprise" style="animation-delay:${(added.picks + i) * 90 + 150}ms">${ICONS[k]}<span class="tag">Surprise</span>${R.PATCHES[k].name}</div>`));
      const total = added.picks + added.items.length;
      Q.openSheet(`
        <span class="eyebrow">Fresh patches</span>
        <h2 id="sheet-title">${title || `${total} new ${total === 1 ? 'patch' : 'patches'}!`}</h2>
        <div class="reveal">${cards.join('')}</div>
        <p class="muted small">A pick becomes any basic patch when you place it. Unused patches carry over, up to ${R.ALLOWANCE.cap}. New ones arrive every ${Q.periodNoun()}.</p>
        <button class="btn primary wide" data-close>Start stitching</button>
      `, { name: 'reveal' });
      Q.sound.reveal();
    });
  }
  Q.showReveal = showReveal;

  // ---------- Settings ----------

  $('#btn-settings').addEventListener('click', showSettings);

  async function showSettings() {
    const prefs = Q.prefs, me = Q.me, metrics = Q.metrics;
    const night = (v, label) => `<button role="radio" aria-checked="${prefs.night === v}" data-act="night" data-v="${v}">${label}</button>`;
    const admin = await Q.server.isAdmin().catch(() => false);
    const today = Q.dayKey(new Date());
    const first = metrics.firstDay;
    const dayN = (d) => (first ? Math.round((Date.parse(d) - Date.parse(first)) / 864e5) : 0);
    const returned = (n) => metrics.days.some((d) => dayN(d) === n);
    Q.openSheet(`
      <h2 id="sheet-title">Settings</h2>
      <div>
        <div class="setting"><span><b>${esc(me ? me.name : 'Not joined yet')}</b><small>Your builder name</small></span>${me ? '<button class="btn small" data-act="rename">Change</button>' : ''}</div>
        ${prefs.nations ? `<div class="setting"><span><b>${esc(me && me.nation ? Q.nationName(me.nation) : 'No nation')}</b><small>Who you build for in the Nations Cup</small></span>${me ? '<button class="btn small" data-act="pick-nation">Change</button>' : ''}</div>` : ''}
        <label class="setting"><span><b>National features</b><small>The nation picker and the Nations Cup. Parents can switch these off.</small></span><input type="checkbox" id="set-nations" ${prefs.nations ? 'checked' : ''}></label>
        <label class="setting"><span><b>Sound</b><small>Every sound in the game</small></span><input type="checkbox" id="set-sound" ${prefs.sound ? 'checked' : ''}></label>
        <label class="setting"><span><b>Nature sounds</b><small>A breeze with birdsong by day, crickets at night</small></span><input type="checkbox" id="set-ambience" ${prefs.ambience !== false ? 'checked' : ''}${prefs.sound ? '' : ' disabled'}></label>
        <div class="setting"><span><b>Night lighting</b><small>Lanterns glow after 7 pm on your clock</small></span><div class="seg" role="radiogroup" aria-label="Night lighting">${night('auto', 'Auto')}${night('day', 'Day')}${night('night', 'Night')}</div></div>
        <div class="setting"><span><b>${Q.server.mode === 'demo' ? 'Demo world' : Q.signedIn ? 'Signed in' : 'Playing as a guest'}</b><small>${Q.server.mode === 'demo'
          ? 'Lives on this device. Neighbors are simulated. Connect Supabase to make it a shared world (see README).'
          : Q.signedIn ? 'Your progress is tied to your Google account.' : 'Progress is saved on this device. Sign in to keep it everywhere.'}</small></span>
          ${Q.server.mode !== 'demo' && !Q.signedIn ? '<button class="btn small" data-act="google">Sign in with Google</button>' : ''}</div>
      </div>
      <button class="btn wide" data-act="how">How to play</button>
      ${admin ? '<button class="btn wide" data-act="moderate">Moderator tools</button>' : ''}
      <p class="section-label">Prototype test numbers (this device)</p>
      <div class="metrics">
        <span>Days played</span><span>${metrics.days.length}</span>
        <span>Came back the next day</span><span>${returned(1) ? 'Yes' : dayN(today) >= 1 ? 'No' : 'Not yet'}</span>
        <span>Came back a week later</span><span>${returned(7) ? 'Yes' : dayN(today) >= 7 ? 'No' : 'Not yet'}</span>
        <span>Patches placed</span><span>${metrics.patches}</span>
        <span>Wonder slots filled</span><span>${metrics.wonderSlots}</span>
        <span>Invites sent</span><span>${metrics.invitesSent}</span>
        <span>Invites opened here</span><span>${metrics.invitesOpened}</span>
        <span>Invites that led to a Wonder slot</span><span>${metrics.invitesAccepted}</span>
      </div>
      ${Q.server.mode === 'demo' ? '<button class="btn wide danger" data-act="reset">Start the demo world over</button>' : '<p class="muted small">Every player\'s numbers are in your Supabase events table; the README has the queries.</p>'}
    `, { name: 'settings' });
  }

  document.addEventListener('change', (e) => {
    if (e.target.id === 'set-sound' || e.target.id === 'set-ambience') {
      Q.prefs[e.target.id === 'set-sound' ? 'sound' : 'ambience'] = e.target.checked;
      Q.savePrefs();
      Q.sound.ambience(Q.prefs.sound && Q.prefs.ambience !== false);
      const amb = $('#set-ambience');
      if (amb) amb.disabled = !Q.prefs.sound;
    }
    if (e.target.id === 'set-nations') { Q.prefs.nations = e.target.checked; Q.savePrefs(); $('#btn-cup').hidden = !Q.prefs.nations; showSettings(); }
  });
  Q.acts.night = (el) => {
    Q.prefs.night = el.dataset.v;
    Q.savePrefs();
    for (const b of document.querySelectorAll('[data-act="night"]')) b.setAttribute('aria-checked', String(b === el));
  };
  Q.acts.google = async () => { try { await Q.server.signInWithGoogle(); } catch (e) { Q.toast(e.message, true); } };
  Q.acts.reset = (el) => {
    if (!el.dataset.sure) { el.dataset.sure = '1'; el.textContent = 'Tap again to erase the demo world'; return; }
    Q.server.resetWorld();
    try { Object.keys(localStorage).filter((k) => k.startsWith('quiltopia:prefs') || k.startsWith('quiltopia:pending')).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* storage blocked */ }
    location.reload();
  };

  // A name from the word lists: no free typing anywhere.
  let nameOptions = [], nameChoice = null, nameDone = null;
  function showNamePicker(opts) {
    opts = opts || {};
    nameOptions = R.nameOptions(Math.random, 6);
    nameChoice = Q.me ? Q.me.name : nameOptions[0];
    if (!nameOptions.includes(nameChoice)) nameOptions[0] = nameChoice;
    nameDone = opts.onDone || null;
    Q.openSheet(`
      ${opts.eyebrow ? `<span class="eyebrow">${esc(opts.eyebrow)}</span>` : ''}
      <h2 id="sheet-title">${esc(opts.title || 'Pick a new name')}</h2>
      <p class="muted">${esc(opts.text || 'Names come from word lists, so nobody can type anything unkind.')}</p>
      <div class="choices" id="name-choices">${choices()}</div>
      <button class="link" data-act="more-names">Show other names</button>
      <button class="btn primary wide" data-act="save-name">${esc(opts.button || 'Save')}</button>
    `, { locked: !!opts.locked, name: 'name' });
  }
  const choices = () => nameOptions.map((n) => `<button class="choice" data-act="pick-name" data-name="${esc(n)}" aria-pressed="${n === nameChoice}">${esc(n)}</button>`).join('');
  Q.showNamePicker = showNamePicker;
  Q.acts.rename = () => showNamePicker();
  Q.acts['pick-name'] = (el) => { nameChoice = el.dataset.name; $('#name-choices').innerHTML = choices(); };
  Q.acts['more-names'] = () => { nameOptions = R.nameOptions(Math.random, 6); nameChoice = nameOptions[0]; $('#name-choices').innerHTML = choices(); };
  Q.acts['save-name'] = async () => {
    if (Q.me && nameChoice !== Q.me.name) {
      const res = await Q.call('setName', nameChoice);
      if (!res.ok) return Q.toast(res.error, true);
      Q.toast(`You're now ${Q.me.name}`);
    }
    Q.closeSheet(true);
    const fn = nameDone;
    nameDone = null;
    if (fn) fn();
  };

  Q.acts.how = () => {
    Q.openSheet(`
      <h2 id="sheet-title">How to play</h2>
      <ul class="facts">
        <li>${ICONS.pick}<span><b>Pick a patch and tap a square.</b> In your home it stitches straight away. Elsewhere, tap Stitch it here, and you have 10 seconds to undo.</span></li>
        <li>${ICONS.sprout}<span><b>Stitchlings move into houses.</b> Gardens feed them, parks are fun, and paths let them visit. Happy Stitchlings make your Block cozy.</span></li>
        <li>${ICONS.wonder}<span><b>Wonders need everyone.</b> Each slot takes one kind of patch. Fill up to 3 ${Q.perPeriod()}, and invite friends for the rest.</span></li>
        <li>${ICONS.garden}<span><b>Be kind.</b> Water gardens for bonus picks, leave stickers, and gift patches to friends.</span></li>
        <li>${ICONS.calendar}<span><b>Come back daily</b> for your calendar reward and three goals that pay Buttons.</span></li>
      </ul>
      <p class="muted small">Drag to move, pinch or scroll to zoom, double-tap to zoom in. Tap anything to see what it is. Keys: 1–8 pick patches, Enter stitches, Z undoes, H goes home, Esc cancels.</p>
      <button class="btn primary wide" data-close>Got it</button>
    `);
  };

  // ---------- Moderation ----------

  Q.acts.moderate = () => showModerator();
  async function showModerator() {
    const reports = await Q.server.listReports();
    Q.openSheet(`
      <span class="eyebrow">${Q.server.mode === 'demo' ? 'Your demo world' : 'Moderator'}</span>
      <h2 id="sheet-title">Reports</h2>
      ${reports.length ? reports.map((r) => `
        <div class="report-item">
          <div><b>${esc(R.PATCHES[r.kind] ? R.PATCHES[r.kind].name : r.kind)} at (${r.x}, ${r.y})</b>
            <small class="muted"> by ${esc(r.ownerName || 'the landscape')} · reported by ${esc(r.reporterName || 'someone')} · ${r.reason === 'symbol' ? 'looks like letters or a symbol' : 'something else'} · ${Q.ago(r.at)}</small></div>
          <div class="row wrap">
            <button class="btn small" data-act="go" data-x="${r.x + 0.5}" data-y="${r.y + 0.5}" data-z="34">Go there</button>
            <button class="btn small" data-act="mod-remove" data-id="${r.patch}">Remove patch</button>
            <button class="btn small" data-act="mod-rollback" data-x="${r.x}" data-y="${r.y}">Roll back area</button>
            ${r.owner ? `<button class="btn small danger" data-act="mod-ban" data-id="${r.owner}">Stop them building</button>` : ''}
            <button class="btn small" data-act="mod-dismiss" data-id="${r.id}">Dismiss</button>
          </div>
        </div>`).join('') : '<p class="muted">No open reports.</p>'}
      <p class="muted small">Rolling back removes every player-made patch within 5 squares that was placed in the last 24 hours.</p>
    `, { name: 'moderator' });
  }
  Q.acts['mod-remove'] = async (el) => { await Q.server.removePatch(+el.dataset.id); Q.toast('Patch removed'); showModerator(); };
  Q.acts['mod-rollback'] = async (el) => {
    const res = await Q.server.rollbackArea(+el.dataset.x, +el.dataset.y, 5, 24);
    Q.toast(`Rolled back ${plural(res.removed || 0, 'patch', 'patches')}`);
    showModerator();
  };
  Q.acts['mod-ban'] = async (el) => { await Q.server.banPlayer(el.dataset.id); Q.toast("They can't build anymore"); showModerator(); };
  Q.acts['mod-dismiss'] = async (el) => { await Q.server.resolveReport(+el.dataset.id); showModerator(); };
})(window.Q);
