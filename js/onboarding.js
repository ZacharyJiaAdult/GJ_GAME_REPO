/* Quiltopia — the first visit. No forms first: a new player lands on their own home with five
   glowing spots, taps to build, meets the Stitchling who moves in, then picks a name and puts it
   on a Wonder with one more tap. Progress is saved, so a reload picks up where it left off. */
(function (Q) {
  'use strict';

  const { R, ST, esc } = Q;
  const HOME_Z = 36, MEET_Z = 66; // zoom for the whole home, and for a close-up of a Stitchling
  let wonderTarget = null;
  const state = () => Q.prefs.onboard;
  const save = () => Q.savePrefs();

  // A sheet that should open only after the current one closes.
  function afterSheet(fn) {
    if (!Q.sheetOpen()) return fn();
    const once = () => { Q.offSheetClosed = null; fn(); };
    Q.on('sheet-closed', () => { if (Q.offSheetClosed === once) once(); });
    Q.offSheetClosed = once;
  }

  Q.on('ready', ({ returning }) => {
    const o = state();
    if (!returning) return start();
    if (!o) {
      // Joined on another device or before this version: only guide them if the kit is untouched.
      if (Q.kitSpots()) { Q.prefs.onboard = { step: 'kit' }; save(); return resume(); }
      Q.prefs.onboard = { step: 'done', done: true };
      save();
      return Q.emit('daily-check');
    }
    if (!o.done) return resume();
    Q.emit('daily-check');
  });

  async function start() {
    Q.onboarding = true;
    const name = R.nameOptions(Math.random, 1)[0];
    const res = await Q.call('join', { name, nation: null, invitedBy: Q.invite.from || null });
    if (!res.ok) { Q.onboarding = false; return Q.toast(res.error, true); }
    Q.track('joined', { auto: true, viaInvite: !!Q.invite.from });
    Q.prefs.onboard = { step: 'kit' };
    save();
    Q.scheduleRefill();
    Q.renderer.markAllDirty();
    if (res.grew) Q.showBanner(`${res.grew} was just stitched onto the quilt for you!`, null, null, 6000);
    const inviter = Q.invite.from && Q.world.players.get(Q.invite.from);
    const home = R.homeRect(Q.world, Q.me);
    Q.coach({
      text: inviter ? `<b>${esc(inviter.name)}</b> invited you to Quiltopia! First, your very own home.` : '<b>Welcome to Quiltopia!</b> A world everyone builds together. This bit is yours.',
      world: home ? { x: home.x + home.w / 2 - 0.5, y: home.y } : null,
      blocking: true,
    });
    setTimeout(() => {
      if (!home) return wonderHook();
      Q.flyTo(home.x + home.w / 2, home.y + home.h / 2 + 1, HOME_Z, { ms: 1600, done: () => setTimeout(kitStep, 250) });
    }, 1500);
  }

  function residentName() {
    const home = R.homeRect(Q.world, Q.me);
    const h = home && Q.renderer.homes().find((x) => x.owner === Q.me.id);
    return h ? ST.SPECIES[h.residents[0].species].name : 'Your Stitchling';
  }

  // Points at the next glowing spot of the welcome kit.
  function kitStep() {
    const spots = Q.kitSpots();
    if (!spots) return;
    const next = spots[0];
    const text = {
      house: 'This is your home. <b>Tap the glowing house</b> to stitch it.',
      garden: `${esc(residentName())} is hungry. <b>Tap the glowing garden.</b>`,
      tree: 'Trees give shade for naps. <b>Tap the glowing tree.</b>',
      path: spots.length > 1 ? 'Last ones: <b>tap both paths</b> so they can visit the neighbors.' : 'One more path!',
    }[next.kind] || '<b>Tap the glowing square.</b>';
    Q.coach({ text, world: next, blocking: true });
    // Back out from a close-up so the whole home is in view.
    const home = R.homeRect(Q.world, Q.me);
    if (home && Q.cam.z > HOME_Z + 8) Q.flyTo(home.x + home.w / 2, home.y + home.h / 2 + 1, HOME_Z, { ms: 700 });
  }

  Q.on('placed', ({ patch }) => {
    const o = state();
    if (!o || o.done) return;
    if (o.step === 'kit') {
      if (patch.kind === 'house' && !o.metPrompt) {
        o.metPrompt = true;
        save();
        Q.coachHide();
        setTimeout(() => promptMeet(patch), 900);
        return;
      }
      // Step aside so the reward can float up, then point at the next spot.
      if (!o.waitingMeet) { Q.coachHide(); setTimeout(kitStep, 800); }
      if (patch.kind === 'garden') {
        // Their new neighbor gets a snack right away.
        for (const a of Q.renderer.residentsOf(patch.x - 1, patch.y)) Q.renderer.poke(a, performance.now() / 1000, '♥');
      }
    } else if (o.step === 'wonder' && patch.wonder) {
      wonderDone();
    }
  });

  function promptMeet(patch) {
    const o = state();
    const a = Q.renderer.ensureHome(Q.scene(), patch.x, patch.y, performance.now() / 1000)[0];
    if (!a) return kitStep();
    o.waitingMeet = true;
    save();
    // A close-up: your first Stitchling waves from the doorstep until you say hi.
    Q.renderer.beckon(a, 'Hi!');
    Q.sound.squeak();
    Q.flyTo(a.x, a.y + 0.6, MEET_Z, { ms: 800 });
    Q.coach({ text: 'Someone moved in! <b>Tap them</b> to say hi.', follow: a, blocking: true });
  }

  Q.on('met', () => {
    const o = state();
    if (!o || o.done || !o.waitingMeet) return;
    o.waitingMeet = false;
    save();
    // The card says who they are and that they're in your Stitchbook; let it and the reward breathe.
    Q.coachHide();
    setTimeout(kitStep, 2400);
  });

  Q.on('kitdone', () => {
    const o = state();
    if (!o || o.done || o.step !== 'kit') return;
    o.step = 'name';
    o.waitingMeet = false;
    save();
    Q.coachHide();
    Q.sound.fanfare();
    const home = R.homeRect(Q.world, Q.me);
    if (home) Q.renderer.celebrate({ x: home.x - 3, y: home.y - 3, w: home.w + 6, h: home.h + 6 }, performance.now() / 1000);
    Q.track('kit_done');
    setTimeout(showHomeDone, 1600);
  });

  function showHomeDone() {
    const me = Q.me, info = R.levelInfo(me.xp || 0);
    Q.openSheet(`
      <span class="eyebrow">Home sweet home</span>
      <h2 id="sheet-title">Your Stitchling loves it here</h2>
      <div class="stat-row">
        <div><b>Level ${info.level}</b><span>Builder level</span></div>
        <div><b>${me.buttons || 0}</b><span>Buttons</span></div>
        <div><b>${Object.keys(me.stitchbook || {}).length}</b><span>Stitchlings met</span></div>
      </div>
      <p>Every builder needs a name. It goes on the plaque of every Wonder you help build.</p>
      <button class="btn primary wide" data-act="ob-name">Pick my name</button>
    `, { locked: true, name: 'ob-home' });
  }

  Q.acts['ob-name'] = () => Q.showNamePicker({
    eyebrow: 'Your builder name', title: 'Pick your name', button: "That's me", locked: true,
    text: 'Names come from word lists, so nobody can type anything unkind. You can change it any time.',
    onDone: wonderHook,
  });

  // The hook: a nearly finished Wonder, one tap away from carrying your name.
  function wonderHook() {
    const o = state();
    o.step = 'wonder';
    save();
    const invited = Q.invite.wonder && Q.world.wonders.find((w) => w.id === Q.invite.wonder);
    if (invited && invited.status === 'founding') {
      Q.emit('founding-sheet', invited);
      return afterSheet(nationStep);
    }
    const won = invited && !invited.completedAt ? invited
      : Q.openWonders().sort((a, b) => b.filled / b.slots - a.filled / a.slots)[0];
    if (!won) return nationStep();
    wonderTarget = won;
    const bp = R.BLUEPRINTS[won.blueprint], left = won.slots - won.filled;
    const inviter = Q.invite.from && Q.world.players.get(Q.invite.from);
    // Say it like it is: almost done, going up, or waiting for its very first patch.
    const title = won.filled === 0 ? `Be the first to build the ${esc(bp.name)}`
      : won.filled / won.slots >= 0.6 ? `The ${esc(bp.name)} is almost done` : `The ${esc(bp.name)} is going up`;
    const lead = won.filled === 0 ? `<b>${left} slots, all empty.</b> Add the very first patch` : `<b>${left} slots to go.</b> Add one`;
    Q.openSheet(`
      <span class="eyebrow">${inviter ? `${esc(inviter.name)} needs your help` : 'Your neighbors need you'}</span>
      <h2 id="sheet-title">${title}</h2>
      <p>${lead} and your name goes on its plaque for good. When it's finished, everyone who helped gets its very own Stitchling.</p>
      <button class="btn primary wide" data-act="ob-wonder">Add my patch</button>
      <button class="btn wide" data-act="ob-skip">Maybe later</button>
    `, { locked: true, name: 'ob-wonder' });
  }

  Q.acts['ob-wonder'] = () => {
    Q.closeSheet(true);
    Q.helpBuild(wonderTarget);
    if (!Q.placing) return nationStep();
    setTimeout(() => Q.coach({ text: 'Tap <b>Stitch it here</b> to fill the glowing slot.', el: '#btn-confirm', blocking: true }), 1300);
  };
  Q.acts['ob-skip'] = () => { Q.closeSheet(true); nationStep(); };

  Q.on('basting', () => {
    const o = state();
    if (o && !o.done && o.step === 'wonder') Q.coach({ text: 'Basting… you have <b>10 seconds</b> to undo. Watch it stitch in!', el: '#basting', blocking: true });
  });

  function wonderDone() {
    const o = state();
    o.step = 'builder'; // once only, even if they fill more slots while this opens
    save();
    Q.coachHide();
    const won = wonderTarget || Q.featuredWonder();
    // Their very first slot finished it: the show and the plaque say it all, then the visit carries on.
    if (won.completedAt || Q.showing()) return Q.afterShow(nationStep);
    Q.sound.fanfare();
    const bp = R.BLUEPRINTS[won.blueprint];
    setTimeout(() => {
      Q.openSheet(`
        <span class="eyebrow">You're a builder</span>
        <h2 id="sheet-title">Your name is on the ${esc(bp.name)}!</h2>
        <p>Each builder can fill ${R.ALLOWANCE.wonderPerPeriod} slots ${Q.perPeriod()}, so finishing takes a crowd. Friends who come through your link land right on an empty slot, and you both become friends.</p>
        <button class="btn primary wide" data-act="ob-invite">Invite a friend</button>
        <button class="btn wide" data-act="ob-later">Maybe later</button>
      `, { locked: true, name: 'ob-builder' });
    }, 1400);
  }
  Q.acts['ob-invite'] = async () => { await Q.sendInvite(wonderTarget, 'help'); Q.closeSheet(true); nationStep(); };
  Q.acts['ob-later'] = () => { Q.closeSheet(true); nationStep(); };

  function nationStep() {
    if (Q.placing) Q.stopPlacing();
    if (!Q.prefs.nations || (Q.me && Q.me.nation)) return finish();
    Q.showNationPicker(finish, true);
  }

  function finish() {
    const o = state();
    o.done = true;
    o.step = 'done';
    save();
    Q.onboarding = false;
    Q.track('onboarded');
    Q.coach({ text: 'Your <b>daily rewards</b> and goals live here. Fresh patches arrive every ' + Q.periodNoun() + '.', el: '#btn-daily', button: 'Got it', onButton: () => Q.emit('daily-check') });
  }

  // Picks up where a reloaded first visit left off.
  function resume() {
    const o = state();
    Q.onboarding = true;
    if (o.step === 'kit') {
      if (!Q.kitSpots()) { o.step = 'name'; save(); return showHomeDone(); }
      // Reloaded while their first Stitchling was waving: say hi again, then carry on.
      const house = o.waitingMeet && [...Q.world.byId.values()].find((p) => p.owner === Q.me.id && p.kind === 'house');
      o.waitingMeet = false;
      save();
      const next = () => (house && !Object.keys(Q.me.stitchbook || {}).length ? promptMeet(house) : kitStep());
      const home = R.homeRect(Q.world, Q.me);
      if (home) return Q.flyTo(home.x + home.w / 2, home.y + home.h / 2 + 1, HOME_Z, { done: () => setTimeout(next, 250) });
      return next();
    }
    if (o.step === 'name') return showHomeDone();
    if (o.step === 'wonder') return wonderHook();
    if (o.step === 'builder') return nationStep();
    finish();
  }
})(window.Q);
