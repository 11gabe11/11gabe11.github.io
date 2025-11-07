// scripts.js — The Wandering Pigeon
document.addEventListener("DOMContentLoaded", () => {
  /* ================================
   *  Custom cursor (desktop only)
   *  - SVG viewBox is 96x64
   *  - Beak tip hotspot ≈ (90, 26)
   * ================================ */
  const useCustomCursor = window.matchMedia("(pointer: fine)").matches;
  const cursorEl = document.getElementById("wp-cursor");

  if (useCustomCursor && cursorEl) {
const VIEW_W = 120, VIEW_H = 80;  // new SVG viewBox
const BEAK_X = 112, BEAK_Y = 40;  // beak-tip hotspot
    let lastX = 0, lastY = 0, rafId = null;

    function place(x, y) {
      const w = cursorEl.getBoundingClientRect().width || 32;
      const h = w * (VIEW_H / VIEW_W);
      const offsetX = w * (BEAK_X / VIEW_W);
      const offsetY = h * (BEAK_Y / VIEW_H);
      cursorEl.style.transform = `translate3d(${x - offsetX}px, ${y - offsetY}px, 0)`;
    }
    function onMove(e) {
      lastX = e.clientX; lastY = e.clientY;
      if (!rafId) rafId = requestAnimationFrame(() => { place(lastX, lastY); rafId = null; });
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousemove", (e) => place(e.clientX, e.clientY), { once: true });
    window.addEventListener("mouseleave", () => {
      cursorEl.style.transform = "translate3d(-9999px,-9999px,0)";
    });
  }

  /* ======================================
   *  Floating, colliding portal bubbles
   *  - Clickable <a.bubble> links
   *  - Perfect circles (size from CSS)
   * ====================================== */
  const stage = document.getElementById("stage");
  if (!stage) return;

  // ensure bubbles are clickable and positioned absolutely
  const bubbles = Array.from(stage.querySelectorAll(".bubble"));
  bubbles.forEach(b => {
    b.style.position = "absolute";
    b.style.willChange = "left, top";
    b.style.pointerEvents = "auto";
  });

  // speed controls (px per millisecond)
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SPEED_MIN = prefersReducedMotion ? 0.006 : 0.016; // gentle drift
  const SPEED_MAX = prefersReducedMotion ? 0.012 : 0.022;

  function randSpeed() {
    const v = Math.random() * (SPEED_MAX - SPEED_MIN) + SPEED_MIN;
    return (Math.random() < 0.5 ? -v : v);
  }

  // state
  const nodes = bubbles.map(el => ({
    el,
    x: 0, y: 0,
    vx: randSpeed(),
    vy: randSpeed(),
    r:  0 // computed from actual rendered size
  }));

  let W = stage.clientWidth;
  let H = stage.clientHeight;

  // measure radius from real DOM size (keeps circles perfect across devices)
  function measureRadii() {
    nodes.forEach(n => {
      const rect = n.el.getBoundingClientRect();
      n.r = rect.width / 2; // aspect-ratio:1/1 in CSS ensures width==height
    });
  }

  function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

  // initial layout (seed in a 2x2 grid, then clamp inside)
  function initializeLayout() {
    W = stage.clientWidth;
    H = stage.clientHeight;

    measureRadii();

    const cols = 2, rows = 2;
    const pad = 12;

    nodes.forEach((n, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const cellW = W / cols, cellH = H / rows;

      // seed near cell centers with a tiny random nudge
      n.x = (c + 0.5) * cellW + (Math.random() * 20 - 10);
      n.y = (r + 0.5) * cellH + (Math.random() * 20 - 10);

      // clamp inside walls
      n.x = clamp(n.x, n.r + pad, W - n.r - pad);
      n.y = clamp(n.y, n.r + pad, H - n.r - pad);

      // write initial position
      n.el.style.left = (n.x - n.r) + "px";
      n.el.style.top  = (n.y - n.r) + "px";
    });
  }

  // elastic collision (equal mass)
  function resolveCollision(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 0.0001;
    const overlap = a.r + b.r - dist;
    if (overlap <= 0) return;

    // push apart
    const nx = dx / dist, ny = dy / dist;
    const sep = overlap / 2 + 0.5;
    a.x -= nx * sep; a.y -= ny * sep;
    b.x += nx * sep; b.y += ny * sep;

    // reflect velocities along the normal if approaching
    const rvx = b.vx - a.vx;
    const rvy = b.vy - a.vy;
    const rel = rvx * nx + rvy * ny;
    if (rel < 0) {
      const j = -rel; // perfectly elastic, equal mass
      a.vx -= nx * j; a.vy -= ny * j;
      b.vx += nx * j; b.vy += ny * j;
    }
  }

  // wall containment
  function contain(n) {
    if (n.x - n.r <= 0)   { n.x = n.r;       n.vx = Math.abs(n.vx); }
    if (n.x + n.r >= W)   { n.x = W - n.r;   n.vx = -Math.abs(n.vx); }
    if (n.y - n.r <= 0)   { n.y = n.r;       n.vy = Math.abs(n.vy); }
    if (n.y + n.r >= H)   { n.y = H - n.r;   n.vy = -Math.abs(n.vy); }
  }

  function draw() {
    nodes.forEach(n => {
      n.el.style.left = (n.x - n.r) + "px";
      n.el.style.top  = (n.y - n.r) + "px";
    });
  }

  // main loop
  let last = performance.now();
  function tick(now) {
    const dt = Math.min(32, now - last); // clamp delta for stability
    last = now;

    nodes.forEach(n => {
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      contain(n);
    });

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        resolveCollision(nodes[i], nodes[j]);
      }
    }

    draw();
    requestAnimationFrame(tick);
  }

  // re-measure on resize/orientation change
  const ro = new ResizeObserver(() => {
    initializeLayout();
  });
  ro.observe(stage);

  initializeLayout();
  requestAnimationFrame(tick);

  console.log("✅ Bubbles + pigeon cursor ready.");
});
