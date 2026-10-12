/* Quiltopia — the game client's core: camera, placing patches, the dock and top bar, sheets,
   cards and coach bubbles, and the connection to the server. Feature modules (ui-*.js,
   onboarding.js, timelapse.js) build on the shared `Q` object this file creates. */
(function () {
  'use strict';

  const CFG = window.QUILT_CONFIG;
  const R = window.QuiltRules;
  const ST = window.QuiltStitchlings;
  const params = new URLSearchParams(location.search);
  const slot = params.get('player') ? ':' + params.get('player') : '';
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + 's'}`;
  const haptic = (ms) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* unsupported */ } };

  const online = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);
  const server = online
    ? new window.QuiltSupabase(CFG)
    : new window.QuiltLocal(CFG, { player: params.get('player'), sim: params.get('sim') !== 'off' });
  const UNDO_MS = R.ALLOWANCE.undoSeconds * 1000;
  const STREET_Z = 30;
  const MAX_Z = 80;
  const PREFS_KEY = 'quiltopia:prefs' + slot;
  const PENDING_KEY = 'quiltopia:pending' + slot;
  const METRICS_KEY = 'quiltopia:metrics' + slot;

  // Patch icons for the dock and sheets.
  const I = (body) => `<svg viewBox="0 0 32 32" aria-hidden="true">${body}</svg>`;
  const ICONS = {
    house: I('<path d="M5 15 16 5l11 10v12H5z" fill="#d4634a"/><path d="M3.5 15.5 16 4.5l12.5 11" fill="none" stroke="#8f3d2c" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><rect x="13" y="19" width="6" height="8" rx="1" fill="#6b4a33"/><rect x="7.5" y="17" width="3.5" height="3.5" rx=".6" fill="#ffe39a"/>'),
    garden: I('<rect x="4" y="7" width="24" height="19" rx="5" fill="#93c26d" stroke="#5f8f45" stroke-width="1.6"/><path d="M8 13h16M8 17.5h16M8 22h16" stroke="#5f964a" stroke-width="2" stroke-dasharray="2.5 2"/><circle cx="11" cy="12.5" r="1.8" fill="#ec7aa0"/><circle cx="20" cy="17" r="1.8" fill="#f2c14e"/><circle cx="14.5" cy="21.5" r="1.6" fill="#fff"/>'),
    tree: I('<ellipse cx="17.5" cy="21" rx="10" ry="7" fill="rgba(48,32,18,.18)"/><circle cx="16" cy="15" r="10" fill="#4f8d4b" stroke="#33683a" stroke-width="1.6"/><circle cx="12.5" cy="11.5" r="5" fill="#79b765"/><circle cx="16" cy="15" r="7" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="1.2" stroke-dasharray="2 1.8"/>'),
    water: I('<rect x="3" y="6" width="26" height="20" rx="9" fill="#63a9d6" stroke="#3e7fb0" stroke-width="1.6"/><path d="M8 14c2-2 4-2 6 0s4 2 6 0M12 19.5c2-2 4-2 6 0s4 2 6 0" fill="none" stroke="#a7d6f0" stroke-width="1.8" stroke-linecap="round"/>'),
    path: I('<path d="M5 27c4-6 3-10 9-12s10-4 13-10" fill="none" stroke="#c3a476" stroke-width="9" stroke-linecap="round"/><path d="M5 27c4-6 3-10 9-12s10-4 13-10" fill="none" stroke="#ecd8ad" stroke-width="6" stroke-linecap="round"/><path d="M5 27c4-6 3-10 9-12s10-4 13-10" fill="none" stroke="rgba(150,110,62,.6)" stroke-width="1.2" stroke-dasharray="2 2"/>'),
    park: I('<rect x="3" y="5" width="26" height="22" rx="8" fill="#b3dc8f" stroke="#79ad5f" stroke-width="1.6"/><path d="M7 11h18M7 21h18" stroke="rgba(255,255,255,.45)" stroke-width="3"/><rect x="11" y="14" width="10" height="2" fill="#8a5a35"/><rect x="11" y="17" width="10" height="2" fill="#8a5a35"/><circle cx="8" cy="8" r="1.4" fill="#fff"/><circle cx="24" cy="24" r="1.4" fill="#ffe27a"/>'),
    market: I('<rect x="5" y="12" width="22" height="15" rx="2" fill="#b98656" stroke="#7a5536" stroke-width="1.4"/><path d="M4 6h24v8H4z" fill="#fff4e4"/><path d="M4 6h6v8H4zM16 6h6v8h-6z" fill="#e2574c"/><path d="M4 14a3 3 0 0 0 6 0a3 3 0 0 0 6 0a3 3 0 0 0 6 0a3 3 0 0 0 6 0" fill="#e2574c"/><circle cx="11" cy="22" r="2" fill="#f2b84b"/><circle cx="17" cy="22" r="2" fill="#6aa84f"/><circle cx="22" cy="22" r="2" fill="#e2574c"/>'),
    lantern: I('<circle cx="16" cy="17" r="12" fill="rgba(255,213,107,.38)"/><path d="M16 3v4" stroke="#5b4636" stroke-width="2" stroke-linecap="round"/><rect x="10.5" y="7" width="11" height="15" rx="3" fill="#5b4636"/><rect x="12.5" y="9.5" width="7" height="10" rx="2" fill="#ffd56b"/><rect x="9" y="22" width="14" height="3" rx="1.5" fill="#5b4636"/>'),
    windmill: I('<circle cx="16" cy="18" r="7" fill="#efe4cf" stroke="#a8916b" stroke-width="1.5"/><g stroke="#8a6b45" stroke-width="1.2" fill="#fbf6ea"><rect x="15" y="2" width="3" height="13" transform="rotate(20 16 16)"/><rect x="15" y="2" width="3" height="13" transform="rotate(110 16 16)"/><rect x="15" y="2" width="3" height="13" transform="rotate(200 16 16)"/><rect x="15" y="2" width="3" height="13" transform="rotate(290 16 16)"/></g><circle cx="16" cy="16" r="2" fill="#7a5536"/>'),
    lighthouse: I('<circle cx="16" cy="16" r="12" fill="#f6f2ea" stroke="#9a6a5a" stroke-width="1.2"/><circle cx="16" cy="16" r="9" fill="#d4483d"/><circle cx="16" cy="16" r="6.5" fill="#f6f2ea"/><circle cx="16" cy="16" r="4" fill="#d4483d"/><circle cx="16" cy="16" r="2.2" fill="#ffd56b"/>'),
    cherry: I('<circle cx="16" cy="16" r="12" fill="#f3a7c2" stroke="#c9708f" stroke-width="1.6"/><circle cx="12" cy="12" r="5.5" fill="#ffd2e1"/><g fill="#fff"><circle cx="20" cy="11" r="1.4"/><circle cx="22" cy="19" r="1.4"/><circle cx="13" cy="21" r="1.4"/><circle cx="9" cy="16" r="1.2"/></g>'),
    bench: I('<rect x="5" y="11" width="22" height="4" rx="1" fill="#8a5a35"/><rect x="5" y="17" width="22" height="4" rx="1" fill="#8a5a35"/><rect x="7" y="21" width="2.5" height="6" fill="#5b3a22"/><rect x="22.5" y="21" width="2.5" height="6" fill="#5b3a22"/>'),
    fountain: I('<circle cx="16" cy="17" r="11" fill="#cfc6b8" stroke="#8f8676" stroke-width="1.5"/><circle cx="16" cy="17" r="8" fill="#7cc3ea"/><circle cx="16" cy="17" r="2.6" fill="#fff"/><path d="M16 14c-2-5 1-9 0-11M16 14c3-4 6-5 7-7M16 14c-3-4-6-5-7-7" fill="none" stroke="#a7d6f0" stroke-width="1.6" stroke-linecap="round"/>'),
    flowerpot: I('<path d="M5 18h7l-1 8H6zM12.5 14h7l-1 9h-5zM20 18h7l-1 8h-5z" fill="#c0704e"/><circle cx="8.5" cy="15" r="3" fill="#ec7aa0"/><circle cx="16" cy="11" r="3" fill="#f2c14e"/><circle cx="23.5" cy="15" r="3" fill="#b98be6"/>'),
    birdhouse: I('<path d="M16 19v10" stroke="#6b4a33" stroke-width="2.5"/><path d="M7 13 16 5l9 8v8H7z" fill="#e8c07a" stroke="#8a5a35" stroke-width="1.5" stroke-linejoin="round"/><circle cx="16" cy="15" r="2.4" fill="#3a2a20"/>'),
    scarecrow: I('<path d="M16 9v20M5 15h22" stroke="#7a5536" stroke-width="2.5" stroke-linecap="round"/><rect x="11" y="14" width="10" height="8" rx="1.5" fill="#5a7fb0"/><circle cx="16" cy="9" r="4" fill="#f2dcae"/><ellipse cx="16" cy="5.5" rx="7" ry="2" fill="#d9a63a"/>'),
    bunting: I('<path d="M3 8q13 8 26 0" fill="none" stroke="#7a5536" stroke-width="1.5"/><path d="M6 10l5 1-2 8zM14 12l5 0-2.5 8zM21 11l5-1-1.5 8z" fill="#e2574c"/><path d="M14 12l5 0-2.5 8z" fill="#f2b84b"/><path d="M21 11l5-1-1.5 8z" fill="#3e8fc6"/>'),
    pick: I('<rect x="4" y="4" width="24" height="24" rx="7" fill="#dfe6f7" stroke="#2f5bd3" stroke-width="1.8" stroke-dasharray="3 2.4"/><path d="M12.5 12.5a3.5 3.5 0 1 1 5 3.2c-1 .5-1.5 1.2-1.5 2.3v.6" fill="none" stroke="#2f5bd3" stroke-width="2.2" stroke-linecap="round"/><circle cx="16" cy="22.5" r="1.3" fill="#2f5bd3"/>'),
    shield: I('<path d="M16 4 26 8v8c0 6-4.5 10-10 12C10.5 26 6 22 6 16V8z" fill="#dfe6f7" stroke="#2f5bd3" stroke-width="1.8"/><path d="m11.5 16 3 3 6-6.5" fill="none" stroke="#2f5bd3" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
    wonder: I('<circle cx="16" cy="13" r="10" fill="#4f8d4b" stroke="#33683a" stroke-width="1.6"/><rect x="10" y="10" width="12" height="7" rx="1.5" fill="#a86a43"/><path d="M15 17h2v11h-2z" fill="#c3a476"/><circle cx="8.5" cy="9" r="1.6" fill="#ffd56b"/><circle cx="23.5" cy="9" r="1.6" fill="#ffd56b"/>'),
    gift: I('<rect x="5" y="12" width="22" height="15" rx="2" fill="#e86a92"/><rect x="4" y="9" width="24" height="5" rx="1.5" fill="#f08bab"/><path d="M16 9v18" stroke="#ffd56b" stroke-width="3"/><path d="M16 9c-3-6-9-4-6 0M16 9c3-6 9-4 6 0" fill="none" stroke="#ffd56b" stroke-width="2.2"/>'),
    button: I('<circle cx="16" cy="16" r="12" fill="#f2b84b" stroke="#c98b1c" stroke-width="1.6"/><circle cx="16" cy="16" r="8.5" fill="none" stroke="#c98b1c" stroke-width="1.2" stroke-dasharray="2 1.6"/><g fill="#8a5a12"><circle cx="13" cy="13" r="1.5"/><circle cx="19" cy="13" r="1.5"/><circle cx="13" cy="19" r="1.5"/><circle cx="19" cy="19" r="1.5"/></g>'),
    sprout: I('<path d="M16 28V15" stroke="#4f8d4b" stroke-width="2.5" stroke-linecap="round"/><path d="M16 16C16 9 21 6 27 6c0 7-5 10-11 10zM16 19c0-5-4-8-10-8 0 5 4 8 10 8z" fill="#79b765" stroke="#4f8d4b" stroke-width="1.4"/>'),
    calendar: I('<rect x="5" y="7" width="22" height="20" rx="3" fill="#fff" stroke="#2f5bd3" stroke-width="1.8"/><path d="M5 13h22" stroke="#2f5bd3" stroke-width="1.8"/><path d="M11 4v5M21 4v5" stroke="#2f5bd3" stroke-width="2" stroke-linecap="round"/><path d="m12 20 3 3 5-6" fill="none" stroke="#e86a92" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
  };

  // ---------- Events between modules ----------

  const bus = new Map();
  const on = (name, fn) => { if (!bus.has(name)) bus.set(name, []); bus.get(name).push(fn); };
  function emit(name, data) {
    for (const fn of bus.get(name) || []) {
      try { fn(data); } catch (e) { console.error(`Quiltopia: ${name} handler failed`, e); }
    }
  }

  // ---------- Preferences and metrics (this device only) ----------

  function load(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage blocked */ }
  }
  const prefs = Object.assign({ sound: true, ambience: true, night: 'auto', nations: CFG.nationsEnabled, bookmarks: [], onboard: null, lastSeen: 0, seenDay: -1 }, load(PREFS_KEY, {}));
  const savePrefs = () => store(PREFS_KEY, prefs);
  const metrics = Object.assign({ firstDay: null, days: [], invitesSent: 0, invitesOpened: 0, invitesAccepted: 0, patches: 0, wonderSlots: 0 }, load(METRICS_KEY, {}));
  function bump(key) { metrics[key] = (metrics[key] || 0) + 1; store(METRICS_KEY, metrics); }
  function track(name, props) { try { server.track(name, props || {}); } catch (e) { /* analytics never breaks the game */ } }

  // ---------- Sound ----------

  // Everything is synthesized here, so there are no sound files to download. Voices go through a soft
  // compressor with a touch of room reverb: wooden mallets for building, bells for rewards, fabric
  // swishes, and a quiet bed of breeze with birdsong by day and crickets by night.
  const sound = (() => {
    let ctx = null, master = null, wet = null, noiseBuf = null;
    function ac() {
      if (!prefs.sound) return null;
      try {
        if (!ctx) {
          const C = window.AudioContext || window.webkitAudioContext;
          if (!C) return null;
          ctx = new C();
          const comp = ctx.createDynamicsCompressor();
          comp.threshold.value = -20;
          comp.ratio.value = 3;
          master = ctx.createGain();
          master.gain.value = 0.9;
          master.connect(comp).connect(ctx.destination);
          wet = ctx.createConvolver();
          wet.buffer = room(1.5);
          const back = ctx.createGain();
          back.gain.value = 0.25;
          wet.connect(back).connect(comp);
        }
        if (ctx.state === 'suspended') ctx.resume();
      } catch (e) { return null; }
      return ctx;
    }
    // A small room's echo: noise that fades away.
    function room(seconds) {
      const len = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = buf.getChannelData(c);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
      }
      return buf;
    }
    function noise() {
      if (!noiseBuf) {
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      return src;
    }
    // Sends a voice to the speakers (panned), with some of it into the reverb.
    function out(node, o) {
      let n = node;
      if (o.pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = o.pan; n.connect(p); n = p; }
      n.connect(master);
      if (o.reverb) { const s = ctx.createGain(); s.gain.value = o.reverb; n.connect(s).connect(wet); }
    }
    function env(g, t, peak, attack, decay) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    }
    // A soft wooden mallet: a round note with a short bright strike on top.
    function mallet(freq, o) {
      const a = ac();
      if (!a) return;
      o = o || {};
      const t = a.currentTime + (o.delay || 0), decay = o.decay || 0.45, peak = o.gain || 0.07;
      const g = a.createGain();
      env(g, t, peak, 0.004, decay);
      for (const [mult, share] of [[1, 1], [4, 0.18], [10.2, 0.05]]) {
        const osc = a.createOscillator(), og = a.createGain();
        osc.frequency.value = freq * mult;
        og.gain.setValueAtTime(share, t);
        og.gain.exponentialRampToValueAtTime(0.0001, t + (mult === 1 ? decay : decay * 0.18));
        osc.connect(og).connect(g);
        osc.start(t);
        osc.stop(t + decay + 0.05);
      }
      out(g, { pan: o.pan, reverb: 0.35 });
    }
    // A little glass bell: inharmonic partials that ring.
    function bell(freq, o) {
      const a = ac();
      if (!a) return;
      o = o || {};
      const t = a.currentTime + (o.delay || 0), decay = o.decay || 1.1, peak = o.gain || 0.045;
      const g = a.createGain();
      env(g, t, peak, 0.003, decay);
      for (const [mult, share] of [[1, 1], [2.76, 0.4], [5.4, 0.16]]) {
        const osc = a.createOscillator(), og = a.createGain();
        osc.frequency.value = freq * mult;
        og.gain.value = share;
        osc.connect(og).connect(g);
        osc.start(t);
        osc.stop(t + decay + 0.05);
      }
      out(g, { pan: o.pan, reverb: 0.6 });
    }
    // Fabric: a puff of filtered noise, swept from one pitch to another.
    function swish(from, to, dur, o) {
      const a = ac();
      if (!a) return;
      o = o || {};
      const t = a.currentTime + (o.delay || 0);
      const src = noise(), f = a.createBiquadFilter(), g = a.createGain();
      f.type = 'bandpass';
      f.Q.value = o.q || 1.4;
      f.frequency.setValueAtTime(from, t);
      f.frequency.exponentialRampToValueAtTime(to, t + dur);
      env(g, t, o.gain || 0.08, dur * 0.25, dur * 0.75);
      src.connect(f).connect(g);
      out(g, { reverb: 0.15 });
      src.start(t, Math.random());
      src.stop(t + dur + 0.05);
    }
    function glide(from, to, dur, o) {
      const a = ac();
      if (!a) return;
      o = o || {};
      const t = a.currentTime + (o.delay || 0);
      const osc = a.createOscillator(), g = a.createGain();
      osc.frequency.setValueAtTime(from, t);
      osc.frequency.exponentialRampToValueAtTime(to, t + dur);
      env(g, t, o.gain || 0.05, 0.006, dur);
      osc.connect(g);
      out(g, { pan: o.pan, reverb: o.reverb || 0.2 });
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }

    // Building in a quick run climbs a pentatonic scale, so a spree of patches plays a little tune.
    const SCALE = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760];
    let step = 0, lastStitch = 0;
    function nextNote() {
      const now = performance.now();
      step = now - lastStitch < 4000 ? Math.min(step + 1, SCALE.length - 1) : 0;
      lastStitch = now;
      return SCALE[step];
    }

    // ---------- Ambience: a breeze, birds by day, crickets by night ----------
    const amb = { on: false, timer: 0, breeze: null };
    function bird() {
      const base = 2200 + Math.random() * 1800, pan = Math.random() * 1.6 - 0.8;
      const notes = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < notes; i++) {
        const up = Math.random() < 0.5;
        glide(base * (up ? 0.9 : 1.15), base * (up ? 1.2 : 0.85), 0.07 + Math.random() * 0.05, { gain: 0.016, delay: i * 0.11, pan, reverb: 0.5 });
      }
    }
    function crickets() {
      const pan = Math.random() * 1.6 - 0.8, f = 4200 + Math.random() * 600;
      for (let burst = 0; burst < 2; burst++) {
        for (let i = 0; i < 4; i++) glide(f, f * 1.02, 0.018, { gain: 0.008, delay: burst * 0.42 + i * 0.045, pan, reverb: 0.4 });
      }
    }
    function ambience(on) {
      const a = on && prefs.ambience !== false ? ac() : null;
      if (!a) {
        amb.on = false;
        clearTimeout(amb.timer);
        if (amb.breeze) { try { amb.breeze.src.stop(); } catch (e) { /* already stopped */ } amb.breeze = null; }
        return;
      }
      if (amb.on) return;
      amb.on = true;
      const src = noise(), f = a.createBiquadFilter(), g = a.createGain();
      f.type = 'lowpass';
      f.frequency.value = 450;
      g.gain.setValueAtTime(0.0001, a.currentTime);
      g.gain.linearRampToValueAtTime(0.018, a.currentTime + 4);
      src.connect(f).connect(g);
      out(g, { reverb: 0.1 });
      src.start();
      amb.breeze = { src, f };
      const tick = () => {
        amb.timer = setTimeout(tick, 2500 + Math.random() * 6500);
        if (!amb.on || document.hidden) return;
        if (isNight()) crickets(); else if (Math.random() < 0.8) bird();
        amb.breeze.f.frequency.setTargetAtTime(300 + Math.random() * 500, ctx.currentTime, 2.5); // the wind rises and falls
      };
      amb.timer = setTimeout(tick, 1500);
    }
    // Quiet while the game isn't on screen.
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      try { if (document.hidden) ctx.suspend(); else if (prefs.sound) ctx.resume(); } catch (e) { /* not allowed yet */ }
    });

    return {
      tick() { swish(5200, 4200, 0.04, { gain: 0.025, q: 3 }); },
      baste() { swish(900, 2600, 0.22, { gain: 0.07 }); },
      stitch() { swish(1600, 700, 0.07, { gain: 0.06 }); mallet(nextNote(), { delay: 0.03 }); },
      pop() { swish(1800, 800, 0.06, { gain: 0.05 }); const n = nextNote(); mallet(n, { delay: 0.02, gain: 0.08 }); bell(n * 2, { delay: 0.06, gain: 0.018, decay: 0.6 }); },
      unpick() { swish(2400, 700, 0.2, { gain: 0.06 }); },
      bump() { glide(220, 130, 0.14, { gain: 0.07, reverb: 0.05 }); },
      chime() { bell(1319, { gain: 0.04 }); bell(1760, { gain: 0.03, delay: 0.12 }); },
      squeak() { const f = 900 + Math.random() * 300; glide(f, f * 1.7, 0.08, { gain: 0.05 }); glide(f * 1.3, f * 2, 0.09, { gain: 0.04, delay: 0.09 }); },
      coin() { bell(1568, { gain: 0.035, decay: 0.5 }); bell(2093, { gain: 0.03, decay: 0.7, delay: 0.07 }); },
      // A gold thread running all the way around a finished Wonder: quick stitches climbing, then a knot.
      thread(seconds) {
        const s = seconds || 1.6, n = 12;
        for (let i = 0; i < n; i++) swish(1100 + i * 190, 600 + i * 110, 0.07, { gain: 0.045, delay: (i * s) / n });
        bell(1568, { delay: s, gain: 0.035 });
        bell(2349, { delay: s + 0.08, gain: 0.02, decay: 1.6 });
      },
      reveal() { [523, 659, 784, 1047, 1319].forEach((f, i) => mallet(f, { delay: i * 0.085, gain: 0.06, pan: (i - 2) * 0.2 })); bell(2093, { delay: 0.45, gain: 0.025 }); },
      fanfare() {
        [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => mallet(f, { delay: i * 0.09, gain: 0.065 }));
        [262, 330, 392].forEach((f) => bell(f, { delay: 0.6, gain: 0.03, decay: 1.6 }));
      },
      melody() {
        const notes = [784, 659, 784, 1047, 988, 784, 880, 784, 659, 587, 659, 523, 659, 784, 1047, 1319];
        notes.forEach((f, i) => mallet(f, { delay: i * 0.24, gain: 0.06, decay: 0.6 }));
        [131, 98, 110, 131].forEach((f, i) => bell(f * 2, { delay: i * 0.96, gain: 0.03, decay: 1.8 }));
      },
      ambience,
    };
  })();

  // ---------- State ----------

  let world = null;
  let me = null;
  let periodMs = CFG.periodMinutes * 60000;
  let renderer = null;
  let signedIn = false;
  const pending = [];
  let placing = null;
  let preview = null;
  let magTarget = null;
  const recent = [];
  const pops = [];
  const watered = new Set();
  const stickers = [];
  const invite = { wonder: null, from: null, kind: null, pending: false, accepted: false };
  let lastScene = null;

  const periodMinutes = () => Math.round(periodMs / 60000);
  const currentPeriod = () => R.periodOf(Date.now(), periodMs);
  const periodWord = () => R.periodWord(periodMinutes());
  const periodNoun = () => (periodMinutes() >= 1440 ? 'day' : periodMinutes() === 60 ? 'hour' : `${periodMinutes()} minutes`);
  // "3 slots a day", "3 slots an hour", "3 slots every 30 minutes".
  const perPeriod = () => (periodMinutes() >= 1440 ? 'a day' : periodMinutes() === 60 ? 'an hour' : `every ${periodMinutes()} minutes`);

  function untilRefill() {
    const ms = (currentPeriod() + 1) * periodMs - Date.now();
    const m = Math.max(1, Math.ceil(ms / 60000));
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60), r = m % 60;
    return r ? `${h}h ${r}m` : `${h}h`;
  }
  function untilTomorrow() {
    const ms = (R.dayOf(Date.now()) + 1) * 864e5 - Date.now();
    const h = Math.floor(ms / 3600e3), m = Math.ceil((ms % 3600e3) / 60000);
    return h ? `${h}h ${m}m` : `${m}m`;
  }
  function ago(ms) {
    const s = Math.max(0, (Date.now() - ms) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return plural(Math.floor(s / 60), 'minute') + ' ago';
    if (s < 86400) return plural(Math.floor(s / 3600), 'hour') + ' ago';
    return plural(Math.floor(s / 86400), 'day') + ' ago';
  }
  const nationName = (code) => { const n = CFG.nations.find(([c]) => c === code); return n ? n[1] : null; };
  const playerName = (id) => (id === 'kit' ? 'the welcome kit' : (world && world.players.get(id) || {}).name || 'a builder');

  // My patches in hand, minus the ones still basting (the server spends them when they commit).
  function effectiveMe() {
    if (!me) return null;
    const eff = Object.assign({}, me, { items: Object.assign({}, me.items), keep: Object.assign({}, me.keep), gifts: (me.gifts || []).slice() });
    for (const p of pending) R.spend(eff, p.kind);
    return eff;
  }
  const pendingAt = (x, y) => pending.find((p) => p.x === x && p.y === y);

  let countsKey = '', counts = new Map();
  function placeContext() {
    const period = currentPeriod();
    const key = `${world.version}:${pending.length}:${period}`;
    if (key !== countsKey) {
      countsKey = key;
      counts = new Map();
      if (me) {
        for (const p of world.byId.values()) {
          if (p.owner === me.id && p.wonder && R.periodOf(p.at, periodMs) === period) counts.set(p.wonder, (counts.get(p.wonder) || 0) + 1);
        }
        for (const p of pending) if (p.wonder) counts.set(p.wonder, (counts.get(p.wonder) || 0) + 1);
      }
    }
    return {
      me: effectiveMe(),
      opts: { wonderToday: (id) => counts.get(id) || 0, periodWord: periodWord(), commonsRequiresSignIn: !!server.commonsRequiresSignIn, signedIn },
    };
  }

  // Applies a server reply: my row, level-ups, and a fresh dock.
  function applyResult(res) {
    if (!res) return { ok: false, error: 'Something went wrong. Try again.' };
    if (res.me) {
      const before = me;
      me = res.me;
      R.setPlayer(world, me);
      // What this action earned, so it can float up from wherever it happened.
      if (before && before.id === me.id) {
        const gain = { xp: (me.xp || 0) - (before.xp || 0), buttons: (me.buttons || 0) - (before.buttons || 0) };
        if (gain.xp > 0 || gain.buttons > 0) { res.gain = gain; pulsePill(); }
      }
    }
    if (res.levelUp) emit('levelup', res.levelUp);
    renderHud();
    renderDock();
    return res;
  }
  function pulsePill() {
    const el = $('#me-pill');
    el.classList.remove('gain');
    void el.offsetWidth;
    el.classList.add('gain');
  }
  // Floats "+10 XP" (and any Buttons) up from a square.
  function popGain(x, y, gain) {
    if (!gain) return;
    const t = performance.now() / 1000;
    if (gain.xp > 0) renderer.rewardPop(x, y, `+${gain.xp} XP`, t);
    if (gain.buttons > 0) renderer.rewardPop(x, y, `+${gain.buttons} Buttons`, t, { delay: gain.xp > 0 ? 0.15 : 0, row: gain.xp > 0 ? 1 : 0, color: '#ffe08a', ink: '#7a4d00' });
  }
  async function call(name, ...args) {
    let res;
    try { res = await server[name](...args); } catch (e) { res = { ok: false, error: "Couldn't reach the world. Check your connection and try again." }; }
    return applyResult(res);
  }

  // ---------- Camera ----------

  const cam = { x: 64, y: 64, z: 6, ax: 0, ay: 0 };
  let fly = null, zoomAnim = null, fling = null;
  const camHistory = [];

  function layout() {
    const dock = $('#dock');
    const bottom = innerHeight - (dock ? dock.offsetHeight : 200);
    cam.ax = innerWidth / 2;
    cam.ay = clamp((70 + bottom) / 2, 120, innerHeight / 2);
  }
  const minZoom = () => Math.max(0.6, Math.min(innerWidth / (world.W + 12), (innerHeight - 200) / (world.H + 12)));
  function clampCam() {
    cam.z = clamp(cam.z, minZoom(), MAX_Z);
    cam.x = clamp(cam.x, -6, world.W + 6);
    cam.y = clamp(cam.y, -6, world.H + 6);
  }
  const toWorld = (sx, sy) => ({ x: cam.x + (sx - cam.ax) / cam.z, y: cam.y + (sy - cam.ay) / cam.z });
  const toScreen = (x, y) => ({ x: cam.ax + (x - cam.x) * cam.z, y: cam.ay + (y - cam.y) * cam.z });
  const cellAt = (sx, sy) => { const p = toWorld(sx, sy); return { x: Math.floor(p.x), y: Math.floor(p.y) }; };

  function zoomAt(factor, sx, sy) {
    const before = toWorld(sx, sy);
    cam.z = clamp(cam.z * factor, minZoom(), MAX_Z);
    const after = toWorld(sx, sy);
    cam.x += before.x - after.x;
    cam.y += before.y - after.y;
    clampCam();
  }
  function panBy(dx, dy) { cam.x -= dx / cam.z; cam.y -= dy / cam.z; clampCam(); }

  // Flights zoom out on the way so you keep a sense of where you're going.
  function flyTo(x, y, z, opts) {
    opts = opts || {};
    fling = null;
    zoomAnim = null;
    const from = { x: cam.x, y: cam.y, z: cam.z }, to = { x, y, z: clamp(z || cam.z, minZoom(), MAX_Z) };
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const fit = Math.min(innerWidth, innerHeight) / Math.max(1, dist * 1.5);
    const mid = Math.max(minZoom(), Math.min(from.z, to.z, fit));
    const f = { from, to, mid, t0: performance.now(), ms: opts.ms || clamp(450 + dist * 6, 550, 1200), done: opts.done };
    fly = f;
    // Land on time even when animation frames pause (a background tab, a busy phone).
    setTimeout(() => { if (fly === f) finishFly(); }, f.ms + 120);
  }
  function finishFly() {
    const f = fly;
    fly = null;
    cam.x = f.to.x;
    cam.y = f.to.y;
    cam.z = f.to.z;
    clampCam();
    if (f.done) f.done();
  }
  function remember() {
    camHistory.push({ x: cam.x, y: cam.y, z: cam.z });
    if (camHistory.length > 30) camHistory.shift();
  }
  function goBack() {
    const p = camHistory.pop();
    if (p) flyTo(p.x, p.y, p.z);
  }
  function goHome() {
    const home = me && R.homeRect(world, me);
    if (!home) return toast('Every home plot is taken right now, but the Commons is open to all.');
    remember();
    flyTo(home.x + home.w / 2, home.y + home.h / 2, Math.max(cam.z, 26));
  }

  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  function stepCamera(now, dt) {
    if (fly) {
      const p = clamp((now - fly.t0) / fly.ms, 0, 1), e = ease(p);
      cam.x = fly.from.x + (fly.to.x - fly.from.x) * e;
      cam.y = fly.from.y + (fly.to.y - fly.from.y) * e;
      const lz = p < 0.5
        ? Math.log(fly.from.z) + (Math.log(fly.mid) - Math.log(fly.from.z)) * ease(p * 2)
        : Math.log(fly.mid) + (Math.log(fly.to.z) - Math.log(fly.mid)) * ease((p - 0.5) * 2);
      cam.z = Math.exp(lz);
      if (p >= 1) finishFly();
    } else if (zoomAnim) {
      const p = clamp((now - zoomAnim.t0) / 220, 0, 1);
      const target = zoomAnim.from * Math.pow(zoomAnim.factor, ease(p));
      zoomAt(target / cam.z, zoomAnim.sx, zoomAnim.sy);
      if (p >= 1) zoomAnim = null;
    } else if (fling) {
      panBy(fling.vx * dt * 1000, fling.vy * dt * 1000);
      const decay = Math.pow(0.9, dt * 60);
      fling.vx *= decay;
      fling.vy *= decay;
      if (Math.hypot(fling.vx, fling.vy) < 0.02) fling = null;
    }
  }
  function animateZoom(factor, sx, sy) {
    fly = null;
    fling = null;
    zoomAnim = { from: cam.z, factor, sx: sx == null ? cam.ax : sx, sy: sy == null ? cam.ay : sy, t0: performance.now() };
  }

  // ---------- Scene for the renderer ----------

  // Welcome-kit spots still waiting for their patch (only while you hold the kit).
  function kitSpots() {
    if (!me || !me.gifts) return null;
    const home = R.homeRect(world, me);
    if (!home) return null;
    const left = {};
    for (const g of me.gifts) if (g.from === 'kit') left[g.kind] = (left[g.kind] || 0) + 1;
    for (const p of pending) if (left[p.kind]) left[p.kind]--;
    const spots = [];
    for (const k of R.KIT) {
      const x = home.x + k.dx, y = home.y + k.dy;
      if (!left[k.kind] || R.patchAt(world, x, y) || pendingAt(x, y)) continue;
      left[k.kind]--;
      spots.push({ x, y, kind: k.kind, next: spots.length === 0 });
    }
    return spots.length ? spots : null;
  }

  let cozyFor = null, cozyCache = null;
  function cozyMap() {
    const homes = renderer.homes();
    if (homes !== cozyFor) { cozyFor = homes; cozyCache = ST.cozy(homes); }
    return cozyCache;
  }

  function stickersToday() {
    const day = R.dayOf(Date.now()), out = new Map();
    for (const s of stickers) {
      if (s.day !== day || !s.target.startsWith('home:')) continue;
      const id = s.target.slice(5);
      if (!out.has(id)) out.set(id, []);
      out.get(id).push(s.kind);
    }
    return out;
  }

  function buildScene(now) {
    const W = world.W, H = world.H;
    const overlay = new Map();
    for (const p of pending) overlay.set(p.y * W + p.x, p.kind);
    if (placing && preview && preview.ok) overlay.set(preview.y * W + preview.x, placing);
    const worldKindAt = (x, y) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return null;
      const p = world.grid[y * W + x];
      return p ? p.kind : null;
    };
    let validAt = null;
    if (placing && me) {
      const ctx = placeContext(), home = R.homeRect(world, me);
      validAt = (x, y) => {
        const r = R.canPlace(world, ctx.me, x, y, placing, ctx.opts);
        if (!r.ok) return 0;
        if (r.zone.type === 'slot') return 2;
        if (home && x >= home.x && x < home.x + home.w && y >= home.y && y < home.y + home.h) return 2;
        return 1;
      };
    }
    const players = world.players;
    return {
      world, now, undoMs: UNDO_MS, myId: me && me.id,
      homeRect: me ? R.homeRect(world, me) : null,
      kindAt: (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? null : overlay.get(y * W + x) || worldKindAt(x, y)),
      worldKindAt,
      patchAt: (x, y) => R.patchAt(world, x, y),
      styleOf: (id) => (id && players.get(id) || {}).style || 'patchwork',
      outfitOf: (id) => (id && players.get(id) || {}).outfit || null,
      fabricOf: (id) => R.FABRICS[R.fabricOf(players.get(id) || { id })],
      pending, preview: placing ? preview : null, validAt,
      kit: kitSpots(),
      watered, recent, pops,
      cozy: renderer ? cozyMap() : null,
      stickersToday: stickersToday(),
      friends: new Set(me && me.friends || []),
      night: isNight(),
    };
  }

  function isNight() {
    if (prefs.night === 'day') return false;
    if (prefs.night === 'night') return true;
    const h = new Date().getHours();
    return h >= 19 || h < 6;
  }

  const frameHooks = [];
  let lastFrame = performance.now();
  let frameOverride = null;
  function loop(nowMs) {
    const dt = Math.min(0.05, (nowMs - lastFrame) / 1000);
    lastFrame = nowMs;
    if (frameOverride) {
      frameOverride(nowMs, dt);
    } else {
      stepCamera(nowMs, dt);
      lastScene = buildScene(Date.now());
      renderer.frame(lastScene, cam, nowMs / 1000, dt);
      if (magTarget) renderer.drawMagnifier($('#magnifier-canvas'), lastScene, magTarget.x, magTarget.y, Math.max(48, cam.z * 1.8), nowMs / 1000);
      updateZoomPill();
      for (const fn of frameHooks) fn(nowMs, dt);
    }
    requestAnimationFrame(loop);
  }

  let pillText = '';
  function updateZoomPill() {
    const t = window.QuiltRender.levelName(cam.z);
    if (t !== pillText) { pillText = t; $('#zoom-pill').textContent = t; }
  }

  // ---------- Placing patches ----------

  function startPlacing(kind, opts) {
    opts = opts || {};
    if (!me) return;
    const eff = effectiveMe();
    if (R.available(eff, kind) <= 0) {
      sound.bump();
      const info = R.PATCHES[kind];
      return toast(info.group === 'basic' ? `You're out of patches. New ones in ${untilRefill()}.` : info.group === 'surprise' ? 'Lanterns only come as surprise patches.' : `You don't have a ${info.name}.`);
    }
    placing = kind;
    preview = null;
    document.body.classList.add('placing');
    hideCard();
    sound.tick();
    renderDock();
    if (opts.noFly) return;
    // Zoom to street level, near the closest square where this patch fits.
    const spot = nearestSpot(kind, cam.x, cam.y);
    if (!spot) { placeHint('No open squares for this patch nearby. Try your home or the Commons.', true); return; }
    const visible = Math.abs(spot.x - cam.x) * cam.z < innerWidth / 2 - 30 && Math.abs(spot.y - cam.y) * cam.z < innerHeight / 3;
    if (cam.z < STREET_Z || !visible) {
      if (!visible) remember();
      flyTo(visible ? cam.x : spot.x + 0.5, visible ? cam.y : spot.y + 0.5, Math.max(cam.z, STREET_Z));
    }
  }

  function stopPlacing() {
    placing = null;
    preview = null;
    hideMagnifier();
    document.body.classList.remove('placing');
    renderDock();
    emit('placing-stopped');
  }

  // Searches outward in rings, preferring your home and matching Wonder slots.
  function nearestSpot(kind, cx, cy) {
    const ctx = placeContext(), home = R.homeRect(world, me);
    const ok = (x, y) => !pendingAt(x, y) && R.canPlace(world, ctx.me, x, y, kind, ctx.opts).ok;
    if (home && Math.hypot(home.x + 4 - cx, home.y + 4 - cy) < 40) {
      for (let y = home.y; y < home.y + home.h; y++) for (let x = home.x; x < home.x + home.w; x++) if (ok(x, y)) return { x, y };
    }
    const x0 = Math.floor(cx), y0 = Math.floor(cy);
    for (let r = 0; r < 90; r++) {
      for (let dx = -r; dx <= r; dx++) for (const dy of r === 0 ? [0] : [-r, r]) if (ok(x0 + dx, y0 + dy)) return { x: x0 + dx, y: y0 + dy };
      for (let dy = -r + 1; dy <= r - 1; dy++) for (const dx of [-r, r]) if (ok(x0 + dx, y0 + dy)) return { x: x0 + dx, y: y0 + dy };
    }
    return null;
  }

  function setPreview(x, y, quiet) {
    if (!placing) return;
    if (pendingAt(x, y)) {
      preview = { x, y, ok: false, reason: "You're already stitching a patch here." };
    } else {
      const ctx = placeContext();
      const r = R.canPlace(world, ctx.me, x, y, placing, ctx.opts);
      preview = { x, y, ok: r.ok, reason: r.reason, zone: r.zone };
    }
    if (!quiet) { if (preview.ok) sound.tick(); else { sound.bump(); haptic(20); } }
    renderPlaceDock();
    emit('preview', preview);
  }

  const inMyHome = (zone) => zone && zone.type === 'plot' && me && zone.owner === me.id;

  // Inside your own home a patch is stitched at once (you can always pick it back up).
  // Everywhere else it bastes for 10 seconds, so a mis-tap can be undone.
  function confirmPlacement() {
    if (!placing || !preview || !preview.ok) return;
    const zone = preview.zone;
    const p = {
      x: preview.x, y: preview.y, kind: placing, until: Date.now() + (inMyHome(zone) ? 0 : UNDO_MS),
      wonder: zone && zone.type === 'slot' ? zone.wonder.id : null, zone: zone ? zone.type : null,
    };
    pending.push(p);
    preview = null;
    haptic(12);
    if (inMyHome(zone)) {
      sound.pop();
      commit(p);
    } else {
      sound.baste();
      p.timer = setTimeout(() => commit(p), UNDO_MS);
      savePending();
      renderBasting(); // show the Undo pill first, so anything pointing at it finds it
      emit('basting', p);
    }
    if (R.available(effectiveMe(), placing) <= 0) stopPlacing(); else renderPlaceDock();
    renderBasting();
    renderDock();
  }

  async function commit(p) {
    const i = pending.indexOf(p);
    if (i < 0) return;
    let res;
    try { res = await server.place(p.x, p.y, p.kind); } catch (e) {
      res = { ok: false, error: "Couldn't reach the world, so that patch is back in your bag." };
    }
    const j = pending.indexOf(p);
    if (j >= 0) pending.splice(j, 1);
    savePending();
    renderBasting();
    if (res.ok) {
      ingestPatch(res.patch, true);
      applyResult(res);
      popGain(p.x, p.y, res.gain);
      if (res.wishes) emit('wishes', res.wishes);
      if (p.zone !== 'plot') sound.stitch();
      track('patch_placed', { kind: p.kind, zone: p.zone });
      bump('patches');
      if (p.wonder) {
        track('wonder_slot', { wonder: p.wonder });
        bump('wonderSlots');
        if (invite.from && !invite.accepted && invite.from !== me.id) {
          invite.accepted = true;
          track('invite_accepted', { from: invite.from, wonder: p.wonder });
          bump('invitesAccepted');
        }
      }
      emit('placed', { patch: res.patch, res });
      if (res.kitDone) emit('kitdone', res);
    } else {
      applyResult(res);
      toast(res.error, true);
      sound.bump();
    }
  }

  function undoLast() {
    const p = pending.slice().reverse().find((q) => q.timer);
    if (!p) return;
    clearTimeout(p.timer);
    pending.splice(pending.indexOf(p), 1);
    savePending();
    sound.unpick();
    toast('Unpicked. That patch is back in your bag.');
    renderBasting();
    renderDock();
  }

  function savePending() {
    store(PENDING_KEY, pending.filter((p) => p.timer).map(({ x, y, kind, until, wonder, zone }) => ({ x, y, kind, until, wonder, zone })));
  }
  function restorePending() {
    for (const p of load(PENDING_KEY, [])) {
      pending.push(p);
      p.timer = setTimeout(() => commit(p), Math.max(0, p.until - Date.now()));
    }
    renderBasting();
  }

  // One tap on a glowing welcome-kit spot stitches it.
  function placeKit(spot) {
    startPlacing(spot.kind, { noFly: true });
    if (!placing) return;
    setPreview(spot.x, spot.y, true);
    confirmPlacement();
    if (placing) stopPlacing();
  }

  // ---------- Magnifier ----------

  function showMagnifier(sx, sy, cell) {
    const el = $('#magnifier');
    el.hidden = false;
    const size = 124;
    let top = sy - size - 70;
    if (top < 60) top = sy + 50;
    el.style.left = clamp(sx - size / 2, 8, innerWidth - size - 8) + 'px';
    el.style.top = clamp(top, 8, innerHeight - size - 8) + 'px';
    magTarget = cell;
  }
  function hideMagnifier() { $('#magnifier').hidden = true; magTarget = null; }

  // ---------- World events ----------

  function ingestPatch(p, mine) {
    if (!p || world.byId.has(p.id)) return;
    // Online, a new Block's patches can arrive before the Block does; it brings them along.
    if (!R.blockAt(world, p.x, p.y) || R.patchAt(world, p.x, p.y)) return;
    R.addPatch(world, p);
    renderer.markDirty(world, p.x, p.y);
    pops.push({ x: p.x, y: p.y, at: Date.now() });
    if (pops.length > 40) pops.shift();
    if (!mine && (!me || p.owner !== me.id)) {
      recent.push({ x: p.x, y: p.y, at: Date.now() });
      if (recent.length > 60) recent.shift();
    }
    renderWonderCard();
  }

  function addBlock(block, patches) {
    if (world.blocks.some((b) => b.id === block.id)) return;
    world = R.createWorld({
      blocks: world.blocks.concat([block]), players: [...world.players.values()], patches: [...world.byId.values()],
      wonders: world.wonders, waterings: world.waterings,
    });
    for (const p of patches || []) if (!world.byId.has(p.id) && !R.patchAt(world, p.x, p.y)) R.addPatch(world, p);
    renderer.markAllDirty();
    emit('block', block);
  }

  function onServerEvent(ev) {
    if (!world) return;
    if (ev.type === 'patch:add') ingestPatch(ev.patch, false);
    else if (ev.type === 'patch:remove') {
      const p = R.removePatch(world, ev.id);
      if (p) renderer.markDirty(world, p.x, p.y);
      renderWonderCard();
    } else if (ev.type === 'wonder') updateWonder(ev.wonder);
    else if (ev.type === 'player') {
      R.setPlayer(world, ev.player);
      if (me && ev.player.id === me.id) Object.assign(me, { name: ev.player.name, nation: ev.player.nation, banned: !!ev.player.banned, style: ev.player.style, outfit: ev.player.outfit, fabric: ev.player.fabric, clubUntil: ev.player.clubUntil });
      renderer.markAllDirty();
    } else if (ev.type === 'block') addBlock(ev.block, ev.patches);
    else if (ev.type === 'water') {
      if (ev.watering.period === currentPeriod()) watered.add(ev.watering.garden);
      emit('water', ev.watering);
    } else if (ev.type === 'sticker') {
      if (!stickers.some((s) => s.id === ev.sticker.id)) stickers.push(ev.sticker);
      emit('sticker', ev.sticker);
    } else if (ev.type === 'gift') {
      emit('gift', ev.gift);
    } else if (ev.type === 'reset') location.reload();
  }

  function updateWonder(w) {
    const cur = world.wonders.find((x) => x.id === w.id);
    const before = cur ? { status: cur.status, completedAt: cur.completedAt } : null;
    if (cur) Object.assign(cur, w); else world.wonders.push(w);
    renderer.markAllDirty();
    renderWonderCard();
    emit('wonder', { wonder: cur || w, before });
  }

  // ---------- Dock and top bar ----------

  const openWonders = () => world.wonders.filter((w) => w.status !== 'founding' && !w.completedAt);
  function featuredWonder() {
    const open = openWonders();
    if (!open.length) return world.wonders.find((w) => w.status === 'founding') || world.wonders[0];
    return open.sort((a, b) => b.filled / b.slots - a.filled / a.slots)[0];
  }

  function renderDock() {
    if (!world) return;
    const browsing = !placing;
    $('#dock-browse').hidden = !browsing;
    $('#dock-place').hidden = browsing;
    if (browsing) renderTray(); else renderPlaceDock();
    renderBag();
    renderWonderCard();
  }

  // The patches you can place, then any keepsakes (landmarks and decorations) you own.
  function trayKinds(eff) {
    const kinds = R.BASIC.concat(['lantern']);
    for (const k of R.LANDMARKS.concat(R.DECOR)) if (eff && eff.keep && eff.keep[k]) kinds.push(k);
    return kinds;
  }

  function renderTray() {
    const eff = effectiveMe();
    const total = eff ? R.heldTotal(eff) + (eff.gifts || []).length : 0;
    const placedAny = me && [...world.byId.values()].some((p) => p.owner === me.id);
    const wishes = myWishes();
    emit('tray-hint');
    $('#dock-hint').innerHTML = !me ? ''
      : !total ? `Out of patches. New ones in <b>${untilRefill()}</b>.`
        : !placedAny ? 'Tap a glowing square in your home to start.'
          : wishes.length ? `<b>${esc(wishes[0].name)}</b> wishes for ${R.WISHES[wishes[0].need].wants} · ${total} left`
            : `<b>${plural(total, 'patch', 'patches')}</b> to place · more in ${untilRefill()}`;
    const wished = new Set(wishes.flatMap((w) => R.WISHES[w.need].kinds));
    $('#tray').innerHTML = trayKinds(eff).map((kind) => {
      const n = eff ? R.available(eff, kind) : 0;
      const surprise = eff && eff.items[kind] > 0;
      const gifted = eff && (eff.gifts || []).some((g) => g.kind === kind && g.from !== 'kit');
      const wish = n > 0 && wished.has(kind);
      const keepsake = R.isKeepsake(kind);
      return `<button class="chip${n ? '' : ' empty'}${keepsake ? ' keepsake' : ''}${wish ? ' wished' : ''}" data-kind="${kind}" aria-label="${R.PATCHES[kind].name}: ${n} to place${wish ? ', wished for by your Stitchlings' : ''}">` +
        (gifted ? '<span class="badge gift-badge" title="A gift from a friend">♥</span>'
          : wish ? `<span class="badge wish-badge" title="Your Stitchlings wish for one">${WISH_BADGE}</span>`
            : surprise ? '<span class="badge" title="Includes a surprise patch">★</span>' : '') +
        `${ICONS[kind]}<span class="chip-name">${R.PATCHES[kind].name}</span><span class="count">${n}</span></button>`;
    }).join('');
  }

  // What your homes' Stitchlings still wish for: [{ name, need }], in home order.
  const WISH_BADGE = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="9.5" cy="6.5" r="5.5"/><circle cx="3.6" cy="12.4" r="1.6"/><circle cx="1.6" cy="15" r="0.9"/></svg>';
  function myWishes() {
    const out = [];
    if (!me || !world) return out;
    for (const h of ST.homes(world)) {
      if (h.owner !== me.id) continue;
      for (const need of Object.keys(R.WISHES)) if (!h.needs[need]) out.push({ name: ST.SPECIES[h.residents[0].species].name, need });
    }
    return out;
  }

  function placeHint(text, bad) {
    const el = $('#place-hint');
    el.textContent = text;
    el.classList.toggle('bad', !!bad);
  }

  function renderPlaceDock() {
    if (!placing) return;
    const n = R.available(effectiveMe(), placing);
    $('#place-icon').innerHTML = ICONS[placing];
    $('#place-title').textContent = `Placing a ${R.PATCHES[placing].name}`;
    $('#place-sub').textContent = `${n} left · ${R.PATCHES[placing].blurb}`;
    if (!preview) placeHint('Tap a glowing square. In your home it stitches straight away. Hold to aim with the magnifier.');
    else if (preview.ok) placeHint(preview.zone && preview.zone.type === 'slot' ? 'A Wonder slot! Tap Stitch it here to fill it.' : 'Looks good. Tap Stitch it here, or pick another square.');
    else placeHint(preview.reason, true);
    $('#btn-confirm').disabled = !(preview && preview.ok);
  }

  function renderBag() {
    const eff = effectiveMe();
    $('#bag-count').textContent = eff ? R.heldTotal(eff) + (eff.gifts || []).length : 0;
    $('#bag-timer').textContent = me ? untilRefill() : '';
  }

  function renderHud() {
    $('#brand').hidden = !!me;
    if (!me) { $('#me-pill').hidden = true; return; }
    $('#me-pill').hidden = false;
    const info = R.levelInfo(me.xp || 0);
    $('#me-name').textContent = me.name;
    $('#me-level').textContent = `Level ${info.level}`;
    $('#me-buttons').textContent = me.buttons || 0;
    $('#me-xp').style.width = Math.round((info.into / info.need) * 100) + '%';
    emit('hud');
  }

  function renderBasting() {
    const el = $('#basting');
    const list = pending.filter((p) => p.timer);
    if (!list.length) { el.hidden = true; return; }
    el.hidden = false;
    const last = list[list.length - 1];
    const secs = Math.max(0, Math.ceil((last.until - Date.now()) / 1000));
    $('#basting-text').textContent = list.length > 1 ? `Basting ${list.length} patches · ${secs}s` : `Basting your ${R.PATCHES[last.kind].name} · ${secs}s`;
  }

  function renderWonderCard() {
    const won = world && featuredWonder();
    const card = $('#wonder-card');
    if (!won || placing) { card.hidden = true; return; }
    card.hidden = false;
    const bp = R.BLUEPRINTS[won.blueprint];
    const ring = $('#wonder-ring');
    ring.setAttribute('pathLength', '100');
    const frac = won.status === 'founding' ? won.founders.length / R.FOUNDERS_NEEDED : won.filled / won.slots;
    ring.setAttribute('stroke-dasharray', `${Math.round(frac * 100)} 100`);
    $('#wonder-name').textContent = bp.name;
    const signed = me && won.founders.includes(me.id);
    $('#wonder-sub').textContent = won.status === 'founding'
      ? (won.founders.length ? `${won.founders.length}/${R.FOUNDERS_NEEDED} founders · ${signed ? 'invite more' : 'join them'}` : 'Up next · be its first founder')
      : won.completedAt ? 'Finished! See the plaque' : `${won.filled}/${won.slots} stitched · help build`;
    card.dataset.wonder = won.id;
  }

  // ---------- Sheets, cards, coach bubbles, banner, toast ----------

  const acts = {};
  let sheetLocked = false, sheetOnClose = null, queued = [];
  const sheetOpen = () => !$('#sheet-wrap').hidden;

  function openSheet(html, opts) {
    opts = opts || {};
    hideCard();
    const s = $('#sheet');
    s.innerHTML = (opts.locked ? '' : '<button class="sheet-x" data-close aria-label="Close">×</button>') + html;
    s.className = 'sheet' + (opts.className ? ' ' + opts.className : '');
    $('#sheet-wrap').hidden = false;
    sheetLocked = !!opts.locked;
    sheetOnClose = opts.onClose || null;
    s.scrollTop = 0;
    const f = s.querySelector('.btn.primary:not([disabled])');
    if (f) f.focus({ preventScroll: true });
    emit('sheet', opts.name || null);
  }
  function closeSheet(force) {
    if (!sheetOpen() || (sheetLocked && !force)) return;
    $('#sheet-wrap').hidden = true;
    $('#sheet').innerHTML = '';
    sheetLocked = false;
    const cb = sheetOnClose;
    sheetOnClose = null;
    if (cb) cb();
    emit('sheet-closed');
    setTimeout(runQueue, 200);
  }
  // Sheets that pop up on their own (level-ups, fresh patches) wait their turn, and wait while a show
  // holds them back (holdSheets(true) ... holdSheets(false)).
  let held = 0;
  function queueSheet(fn) { queued.push(fn); if (!sheetOpen() && !placing && !held) setTimeout(runQueue, 50); }
  function runQueue() {
    if (sheetOpen() || placing || held || !queued.length || coachBusy()) return;
    const fn = queued.shift();
    fn();
  }
  function holdSheets(on) {
    held = Math.max(0, held + (on ? 1 : -1));
    if (!held) setTimeout(runQueue, 200);
  }

  let cardTimer = 0;
  // A small card just above the dock: tap the world, get a quick answer without losing the map.
  function card(html, ms) {
    const el = $('#card');
    el.innerHTML = html;
    el.hidden = false;
    clearTimeout(cardTimer);
    if (ms !== 0) cardTimer = setTimeout(hideCard, ms || 6000);
  }
  function hideCard() { $('#card').hidden = true; }

  // Coach bubbles point at something in the world or on screen during the first visit.
  let coachState = null;
  function coach(opts) {
    coachState = opts;
    const el = $('#coach');
    el.innerHTML = `<p>${opts.text}</p>${opts.button ? `<button class="btn small primary" id="coach-btn">${esc(opts.button)}</button>` : ''}`;
    el.hidden = false;
    if (opts.button) $('#coach-btn').onclick = () => { const fn = coachState && coachState.onButton; coachHide(); if (fn) fn(); };
    positionCoach();
  }
  function coachHide() { coachState = null; $('#coach').hidden = true; setTimeout(runQueue, 300); }
  const coachBusy = () => !!(coachState && coachState.blocking);
  function positionCoach() {
    if (!coachState) return;
    const el = $('#coach');
    let x, y, below = false;
    if (coachState.follow) coachState.world = { x: coachState.follow.x - 0.5, y: coachState.follow.y - 0.7 };
    if (coachState.world) {
      const p = toScreen(coachState.world.x + 0.5, coachState.world.y);
      x = p.x; y = p.y - 18;
      if (y < 170) { y = toScreen(coachState.world.x + 0.5, coachState.world.y + 1).y + 18; below = true; }
    } else if (coachState.el) {
      const r = document.querySelector(coachState.el);
      if (!r) return;
      const box = r.getBoundingClientRect();
      x = box.left + box.width / 2;
      y = box.top - 12;
    } else { x = innerWidth / 2; y = innerHeight * 0.32; }
    const w = el.offsetWidth, h = el.offsetHeight;
    el.style.left = clamp(x - w / 2, 10, innerWidth - w - 10) + 'px';
    el.style.top = clamp(below ? y : y - h, 64, innerHeight - h - 10) + 'px';
    el.classList.toggle('below', below);
    el.style.setProperty('--arrow-x', clamp(x - parseFloat(el.style.left), 18, w - 18) + 'px');
  }

  let bannerTimer = 0;
  function showBanner(text, action, onAction, ms) {
    const el = $('#banner');
    el.innerHTML = `<span>${esc(text)}</span>${action ? `<button class="btn small gold" id="banner-btn">${esc(action)}</button>` : ''}`;
    el.hidden = false;
    if (action) $('#banner-btn').onclick = onAction;
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(hideBanner, ms || 12000);
  }
  function hideBanner() { $('#banner').hidden = true; }

  let toastTimer = 0;
  function toast(text, bad) {
    const el = $('#toast');
    el.textContent = text;
    el.classList.toggle('bad', !!bad);
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    else fallbackCopy(text);
  }
  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* nothing more to try */ }
    ta.remove();
  }

  // ---------- Refills and visits ----------

  let refillTimer = 0;
  function scheduleRefill() {
    clearTimeout(refillTimer);
    const next = (currentPeriod() + 1) * periodMs;
    refillTimer = setTimeout(async () => { await refreshMe(); scheduleRefill(); }, Math.min(next - Date.now() + 800, 2147483000));
  }
  async function refreshMe() {
    if (!me) return;
    const res = await call('refresh');
    if (res.ok) emit('refreshed', res);
  }

  const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  function recordVisit() {
    const today = dayKey(new Date());
    if (!metrics.firstDay) metrics.firstDay = today;
    const returning = metrics.days.length > 0 && !metrics.days.includes(today);
    if (!metrics.days.includes(today)) metrics.days.push(today);
    store(METRICS_KEY, metrics);
    track('app_open', { day: Math.round((Date.parse(today) - Date.parse(metrics.firstDay)) / 864e5), returning });
  }

  // Exploring a Block for the first time counts toward a daily goal.
  let lastVisitCheck = 0;
  function checkVisit(now) {
    if (!me || now - lastVisitCheck < 1500 || cam.z < 8) return;
    lastVisitCheck = now;
    const b = R.blockAt(world, Math.floor(cam.x), Math.floor(cam.y));
    if (b && b.id !== me.homeBlock && !(me.visited || []).includes(b.id)) {
      me.visited = (me.visited || []).concat([b.id]);
      call('visit', b.id).then((res) => { if (res.isNew) emit('visited', b); });
    }
  }

  // ---------- Invites ----------

  function parseInvite() {
    const m = /^#(help|found)\.(\d+)\.([A-Za-z0-9-]{1,64})$/.exec(location.hash);
    if (!m) return;
    invite.kind = m[1];
    invite.wonder = +m[2];
    invite.from = m[3];
    invite.pending = true;
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ }
    track('invite_opened', { from: invite.from, wonder: invite.wonder, kind: invite.kind });
    bump('invitesOpened');
  }
  function inviteLink(won, kind) {
    const base = CFG.siteUrl ? CFG.siteUrl.replace(/\/$/, '') + '/' : location.href.split('#')[0];
    return `${base}#${kind || 'help'}.${won.id}.${me.id}`;
  }
  async function shareText(text, url) {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try { await navigator.share({ text, url }); return 'shared'; } catch (e) { if (e.name === 'AbortError') return 'cancelled'; }
    }
    copyText(url ? `${text} ${url}` : text);
    return 'copied';
  }

  // ---------- Inspecting the map ----------

  function inspect(x, y) {
    const p = R.patchAt(world, x, y);
    if (p) {
      renderer.react(x, y, p.kind, performance.now() / 1000);
      sound.tick();
      return emit('inspect', { patch: p, x, y });
    }
    emit('inspect', { zone: R.zoneOf(world, x, y), x, y });
  }

  // ---------- Wiring ----------

  function bind() {
    let tapTimer = 0;
    window.QuiltInput.attach($('#world'), {
      pan: (dx, dy) => { fly = null; zoomAnim = null; panBy(dx, dy); },
      zoom: (f, x, y) => { fly = null; zoomAnim = null; zoomAt(f, x, y); },
      fling: (vx, vy) => { fling = { vx, vy }; },
      stop: () => { fling = null; },
      tap: (sx, sy) => {
        if (sheetOpen() || frameOverride) return;
        const c = cellAt(sx, sy);
        if (placing) {
          setPreview(c.x, c.y);
          if (preview && preview.ok && inMyHome(preview.zone)) confirmPlacement();
          return;
        }
        const kit = (kitSpots() || []).find((k) => k.x === c.x && k.y === c.y);
        const wp = toWorld(sx, sy);
        const critter = renderer.critterAt(wp.x, wp.y, cam.z);
        // A glowing spot beats a Stitchling wandering across it, unless the coach is pointing at that Stitchling.
        if (critter && (!kit || (coachState && coachState.follow === critter))) return emit('critter', critter);
        if (kit) return placeKit(kit);
        clearTimeout(tapTimer);
        tapTimer = setTimeout(() => inspect(c.x, c.y), 220); // wait to rule out a double-tap
      },
      tapCancel: () => clearTimeout(tapTimer),
      doubleTap: (sx, sy) => animateZoom(2, sx, sy),
      canHold: () => !!placing,
      hold: (phase, sx, sy) => {
        if (phase === 'start' || phase === 'move') {
          const c = cellAt(sx, sy);
          if (!preview || preview.x !== c.x || preview.y !== c.y) setPreview(c.x, c.y, true);
          showMagnifier(sx, sy, c);
          if (phase === 'start') haptic(10);
        } else {
          hideMagnifier();
          if (phase === 'end' && preview) setPreview(preview.x, preview.y, false);
        }
      },
      hover: () => {},
    });

    $('#tray').addEventListener('click', (e) => {
      const chip = e.target.closest('[data-kind]');
      if (chip) startPlacing(chip.dataset.kind);
    });
    $('#btn-confirm').addEventListener('click', confirmPlacement);
    $('#btn-done').addEventListener('click', stopPlacing);
    $('#btn-undo').addEventListener('click', undoLast);
    $('#btn-home').addEventListener('click', goHome);
    $('#zoom-in').addEventListener('click', () => animateZoom(1.8));
    $('#zoom-out').addEventListener('click', () => animateZoom(1 / 1.8));

    // Anything with data-act, anywhere (sheets, cards, coach bubbles).
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) return closeSheet(true);
      const a = e.target.closest('[data-act]');
      if (!a || a.disabled) return;
      const fn = acts[a.dataset.act];
      if (fn) { e.preventDefault(); fn(a); }
    });
    $('#sheet-wrap').addEventListener('click', (e) => { if (e.target === $('#sheet-wrap')) closeSheet(); });

    document.addEventListener('keydown', (e) => {
      if (e.target.matches && e.target.matches('input, textarea')) return;
      if (e.key === 'Escape') {
        if (sheetOpen()) closeSheet();
        else if (placing) stopPlacing();
        return;
      }
      if (sheetOpen() || !world) return;
      const step = 80;
      const keys = {
        ArrowLeft: () => panBy(step, 0), ArrowRight: () => panBy(-step, 0), ArrowUp: () => panBy(0, step), ArrowDown: () => panBy(0, -step),
        '+': () => animateZoom(1.8), '=': () => animateZoom(1.8), '-': () => animateZoom(1 / 1.8),
        Enter: confirmPlacement, z: undoLast, Z: undoLast, h: goHome, H: goHome,
      };
      if (keys[e.key]) { e.preventDefault(); keys[e.key](); return; }
      const n = Number(e.key);
      if (n >= 1 && n <= R.BASIC.length + 1) startPlacing(R.BASIC.concat(['lantern'])[n - 1]);
    });

    window.addEventListener('resize', () => { layout(); clampCam(); positionCoach(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { refreshMe(); scheduleRefill(); emit('return'); } });
    setInterval(() => { renderBasting(); renderBag(); }, 250);
    setInterval(() => { if (!placing && me) renderTray(); }, 30000);
    frameHooks.push((now) => { positionCoach(); checkVisit(now); });
  }

  // ---------- Start ----------

  async function boot() {
    renderer = window.QuiltRender.create($('#world'));
    Q.renderer = renderer;
    parseInvite();
    server.on(onServerEvent);
    let snap;
    try {
      snap = await server.init();
    } catch (e) {
      const el = $('#loading');
      el.classList.add('error');
      el.innerHTML = `<span>Couldn't connect to the world.<br><small>${esc(e.message)}</small><br><small>Check the Supabase settings in js/config.js, or clear them to play the demo world.</small></span>`;
      return;
    }
    world = R.createWorld(snap.world);
    me = snap.me;
    if (snap.periodMs) periodMs = snap.periodMs;
    if (me) R.setPlayer(world, me);
    for (const s of snap.world.stickers || []) stickers.push(s);
    signedIn = server.signedIn ? server.signedIn() : false;
    for (const w of world.waterings) if (w.period === currentPeriod()) watered.add(w.garden);

    $('#season-label').textContent = `${CFG.season} · ${server.mode === 'demo' ? 'demo' : 'prototype'}`;
    $('#btn-cup').hidden = !prefs.nations;
    renderHud();
    renderDock();
    layout();
    cam.x = world.W / 2;
    cam.y = world.H / 2;
    cam.z = minZoom();
    bind();
    requestAnimationFrame(loop);
    // Browsers only allow sound after the first tap or key.
    const wake = () => { sound.ambience(true); document.removeEventListener('pointerdown', wake); document.removeEventListener('keydown', wake); };
    document.addEventListener('pointerdown', wake);
    document.addEventListener('keydown', wake);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => renderer.markAllDirty());
    $('#loading').classList.add('done');
    recordVisit();

    if (me) {
      restorePending();
      const res = await call('refresh');
      scheduleRefill();
      emit('ready', { returning: true, added: res.ok ? res.added : null, clubFabric: res.ok ? res.clubFabric : null });
    } else {
      emit('ready', { returning: false });
    }
  }

  // The shared object every feature module builds on.
  const Q = window.Q = {
    CFG, R, ST, server, params, prefs, savePrefs, metrics, bump, track, sound, haptic, ICONS, $, esc, clamp, plural,
    get world() { return world; }, get me() { return me; }, set me(v) { me = v; },
    get placing() { return placing; }, get preview() { return preview; }, get pending() { return pending; },
    get signedIn() { return signedIn; }, get invite() { return invite; }, stickers, watered, cam,
    on, emit, acts, call, applyResult, popGain, effectiveMe, placeContext, pendingAt, kitSpots,
    flyTo, remember, goBack, goHome, toScreen, toWorld, STREET_Z, layout, animateZoom,
    startPlacing, stopPlacing, setPreview, confirmPlacement, undoLast, placeKit, inMyHome,
    openSheet, closeSheet, sheetOpen, queueSheet, holdSheets, card, hideCard, coach, coachHide, showBanner, hideBanner, toast,
    renderDock, renderHud, renderTray, renderWonderCard, featuredWonder, openWonders, scheduleRefill, refreshMe,
    untilRefill, untilTomorrow, ago, periodWord, periodNoun, perPeriod, periodMinutes, currentPeriod, nationName, playerName, dayKey,
    inviteLink, shareText, copyText, frameHooks, inspect, isNight, myWishes,
    set frameOverride(fn) { frameOverride = fn; }, get frameOverride() { return frameOverride; },
    get lastScene() { return lastScene; }, scene: () => buildScene(Date.now()),
  };

  window.addEventListener('DOMContentLoaded', boot);
})();
