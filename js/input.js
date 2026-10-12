/* Quiltopia — touch and mouse gestures for the map.
   Drag to pan (with momentum), pinch or wheel to zoom, double-tap to zoom in, double-tap then drag
   to zoom with one thumb, and press-and-hold to aim a patch with the magnifier. */
(function (root) {
  'use strict';

  // handlers: { pan(dx, dy), zoom(factor, x, y), fling(vx, vy), stop(), tap(x, y), tapCancel(),
  //             doubleTap(x, y), canHold(x, y), hold(phase, x, y), hover(x, y) }
  function attach(el, h) {
    const pts = new Map();
    let mode = null;            // 'pan' | 'pinch' | 'hold' | 'dtzoom'
    let maybeTap = false;
    let holdTimer = 0;
    let lastTap = { t: 0, x: 0, y: 0 };
    let dt = null;              // double-tap-drag state
    let pinch = null;
    let track = [];             // recent pan samples for momentum

    const first = () => pts.values().next().value;
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

    el.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* old browsers */ }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
      h.stop();
      if (pts.size === 1) {
        const now = performance.now();
        track = [{ t: now, x: e.clientX, y: e.clientY }];
        maybeTap = true;
        mode = null;
        if (now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 34) {
          h.tapCancel();
          mode = 'dtzoom';
          dt = { x: e.clientX, y: e.clientY, lastY: e.clientY, moved: false };
        } else if (h.canHold(e.clientX, e.clientY)) {
          clearTimeout(holdTimer);
          holdTimer = setTimeout(() => {
            if (maybeTap && pts.size === 1 && mode === null) {
              mode = 'hold';
              maybeTap = false;
              const p = first();
              h.hold('start', p.x, p.y);
            }
          }, 260);
        }
      } else if (pts.size === 2) {
        clearTimeout(holdTimer);
        if (mode === 'hold') h.hold('cancel');
        maybeTap = false;
        mode = 'pinch';
        const [a, b] = [...pts.values()];
        pinch = { d: dist(a, b), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      }
    });

    el.addEventListener('pointermove', (e) => {
      const p = pts.get(e.pointerId);
      if (!p) {
        if (e.pointerType === 'mouse') h.hover(e.clientX, e.clientY);
        return;
      }
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (mode === 'pinch' && pts.size >= 2) {
        const [a, b] = [...pts.values()];
        const d = dist(a, b), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        h.pan(mx - pinch.x, my - pinch.y);
        if (pinch.d > 0) h.zoom(d / pinch.d, mx, my);
        pinch = { d, x: mx, y: my };
        return;
      }
      if (mode === 'hold') { h.hold('move', p.x, p.y); return; }
      if (mode === 'dtzoom') {
        if (Math.abs(p.y - dt.y) > 6) dt.moved = true;
        if (dt.moved) h.zoom(Math.exp((p.y - dt.lastY) * 0.012), dt.x, dt.y);
        dt.lastY = p.y;
        return;
      }
      if (maybeTap && Math.hypot(p.x - p.sx, p.y - p.sy) > 8) {
        maybeTap = false;
        clearTimeout(holdTimer);
        mode = 'pan';
      }
      if (mode === 'pan') {
        h.pan(dx, dy);
        const now = performance.now();
        track.push({ t: now, x: p.x, y: p.y });
        while (track.length > 2 && now - track[0].t > 90) track.shift();
      }
      if (e.pointerType === 'mouse' && mode === null) h.hover(e.clientX, e.clientY);
    });

    const end = (e) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      pts.delete(e.pointerId);
      clearTimeout(holdTimer);
      if (mode === 'hold') {
        h.hold(e.type === 'pointercancel' ? 'cancel' : 'end', p.x, p.y);
      } else if (mode === 'dtzoom') {
        if (!dt.moved && e.type !== 'pointercancel') h.doubleTap(p.x, p.y);
        lastTap = { t: 0, x: 0, y: 0 };
      } else if (mode === 'pan' && pts.size === 0) {
        const a = track[0], b = track[track.length - 1];
        const span = b && a ? b.t - a.t : 0;
        if (span > 0 && performance.now() - b.t < 60) h.fling((b.x - a.x) / span, (b.y - a.y) / span);
      } else if (maybeTap && mode === null && e.type !== 'pointercancel') {
        h.tap(p.x, p.y);
        lastTap = { t: performance.now(), x: p.x, y: p.y };
      }
      if (pts.size === 1 && mode === 'pinch') {
        // One finger lifted: keep panning with the other.
        mode = 'pan';
        const q = first();
        q.sx = q.x; q.sy = q.y;
        track = [{ t: performance.now(), x: q.x, y: q.y }];
      }
      if (pts.size === 0) { mode = null; maybeTap = false; }
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);

    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0018));
      h.zoom(factor, e.clientX, e.clientY);
    }, { passive: false });

    el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !pts.size) h.hover(null, null); });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  root.QuiltInput = { attach };
})(this);
