/* Quiltopia — the time-lapse: replays every patch in the order it was placed, so you can watch
   the world grow. Where the browser can, it also records the replay as a video to share. */
(function (Q) {
  'use strict';

  const { R, $ } = Q;
  const DURATION = 14000;

  Q.acts.timelapse = () => play(false);
  Q.acts['timelapse-record'] = () => play(true);
  Q.acts['timelapse-close'] = () => stop();

  let session = null;

  function play(record) {
    Q.closeSheet(true);
    Q.hideCard();
    if (Q.placing) Q.stopPlacing();
    stop(true);
    const world = Q.world;
    const patches = [...world.byId.values()].sort((a, b) => a.at - b.at);
    if (patches.length < 2) return Q.toast('Not much to watch yet!');
    const t0 = patches[0].at, t1 = Math.max(patches[patches.length - 1].at, t0 + 1);
    const replay = R.createWorld({ blocks: world.blocks, players: [...world.players.values()], wonders: world.wonders.map((w) => Object.assign({}, w, { completedAt: null })) });
    const saved = { x: Q.cam.x, y: Q.cam.y, z: Q.cam.z };
    Q.cam.x = world.W / 2;
    Q.cam.y = world.H / 2;
    Q.cam.z = Math.max(0.6, Math.min(innerWidth / (world.W + 12), (innerHeight - 160) / (world.H + 12)));
    const el = $('#timelapse');
    el.hidden = false;
    el.innerHTML = `<div class="tl-bar"><b id="tl-date"></b><div class="progress"><i id="tl-progress"></i></div>
      <button class="btn small" data-act="timelapse-close">Close</button></div>`;
    document.body.classList.add('timelapse');
    let recorder = null, chunks = [];
    if (record && window.MediaRecorder && $('#world').captureStream) {
      try {
        recorder = new MediaRecorder($('#world').captureStream(30), { mimeType: MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : '' });
        recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
        recorder.start();
      } catch (e) { recorder = null; }
    }
    const start = performance.now();
    let i = 0;
    const pops = [];
    session = { saved, recorder, chunks };
    Q.track('timelapse', { record: !!recorder });
    Q.frameOverride = (now, dt) => {
      const p = Math.min(1, (now - start) / DURATION);
      const until = t0 + (t1 - t0) * (1 - Math.pow(1 - p, 1.6));
      let added = 0;
      while (i < patches.length && patches[i].at <= until) {
        const q = patches[i++];
        if (!R.patchAt(replay, q.x, q.y)) R.addPatch(replay, q);
        if (q.owner && added++ < 6) pops.push({ x: q.x, y: q.y, at: Date.now() });
      }
      while (pops.length > 60) pops.shift();
      const W = replay.W, H = replay.H;
      const kindAt = (x, y) => { if (x < 0 || y < 0 || x >= W || y >= H) return null; const q = replay.grid[y * W + x]; return q ? q.kind : null; };
      const scene = {
        world: replay, now: Date.now(), undoMs: 1, myId: Q.me && Q.me.id, homeRect: null,
        kindAt, worldKindAt: kindAt, patchAt: (x, y) => R.patchAt(replay, x, y),
        styleOf: (id) => ((id && replay.players.get(id)) || {}).style || 'patchwork', outfitOf: () => null,
        fabricOf: (id) => R.FABRICS[R.fabricOf(replay.players.get(id) || { id })],
        pending: [], preview: null, validAt: null, kit: null, watered: new Set(), recent: [], pops,
        cozy: null, stickersToday: new Map(), friends: new Set(), night: false,
      };
      Q.renderer.frame(scene, Q.cam, now / 1000, dt, { noCache: true, noLife: true });
      const d = new Date(until);
      $('#tl-date').textContent = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
      $('#tl-progress').style.width = Math.round(p * 100) + '%';
      if (p >= 1 && !session.ended) {
        session.ended = true;
        setTimeout(() => finish(), 1500);
      }
    };
  }

  function finish() {
    if (!session) return;
    const { recorder, chunks } = session;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = () => {
        const url = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
        $('#timelapse .tl-bar').insertAdjacentHTML('beforeend', `<a class="btn small gold" href="${url}" download="quiltopia-timelapse.webm">Save video</a>`);
      };
      recorder.stop();
    } else {
      $('#timelapse .tl-bar').insertAdjacentHTML('beforeend', '<button class="btn small" data-act="timelapse">Replay</button>' +
        (window.MediaRecorder ? '<button class="btn small gold" data-act="timelapse-record">Record a video</button>' : ''));
    }
  }

  function stop(silent) {
    if (!session) return;
    const { saved, recorder } = session;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    session = null;
    Q.frameOverride = null;
    Q.cam.x = saved.x;
    Q.cam.y = saved.y;
    Q.cam.z = saved.z;
    $('#timelapse').hidden = true;
    document.body.classList.remove('timelapse');
    Q.renderer.markAllDirty();
    if (!silent) Q.toast('Back to the live world');
  }
})(window.Q);
