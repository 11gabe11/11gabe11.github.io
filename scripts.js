// scripts.js — The Drifting Pigeon (Nests Edition)
document.addEventListener("DOMContentLoaded", () => {
  /* ================================
   *  Custom cursor (desktop only)
   *  - SVG viewBox is 120x80
   *  - Beak tip hotspot ≈ (112, 40)
   * ================================ */
  const useCustomCursor = window.matchMedia("(pointer: fine)").matches;
  const cursorEl = document.getElementById("wp-cursor");

  if (useCustomCursor && cursorEl) {
    const VIEW_W = 120, VIEW_H = 80;   // SVG viewBox
    const BEAK_X = 112, BEAK_Y = 40;   // beak-tip hotspot
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
   *  Floating, colliding portal NESTS
   *  - Clickable <a.bubble.nest> links
   *  - Circle-like bodies (size from CSS)
   *  - Gentle bobbing; optional egg wobble
   * ====================================== */
  const stage = document.getElementById("stage");
  if (!stage) return;

  // Prefer nests; fall back to any .bubble if legacy markup is present
  let nests = Array.from(stage.querySelectorAll(".bubble.nest"));
  if (nests.length === 0) nests = Array.from(stage.querySelectorAll(".nest, .bubble"));

  // Ensure they’re absolutely positioned + clickable
  nests.forEach(n => {
    n.style.position = "absolute";
    n.style.willChange = "left, top, transform";
    n.style.pointerEvents = "auto";
  });

  // Motion tuning (nests feel a bit heavier than bubbles)
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SPEED_MIN = prefersReducedMotion ? 0.010 : 0.013; // px per ms
  const SPEED_MAX = prefersReducedMotion ? 0.015 : 0.018;
  const BOB_SPEED_MIN = 0.0008, BOB_SPEED_MAX = 0.0016;   // radians per ms
  const BOB_AMP_MIN = 3, BOB_AMP_MAX = 9;                 // px

  function randBetween(a, b) { return a + Math.random() * (b - a); }
  function randSpeed() {
    const v = randBetween(SPEED_MIN, SPEED_MAX);
    return (Math.random() < 0.5 ? -v : v);
  }

  // Each node: physics + bobbing + eggs
  const nodes = nests.map(el => {
    const eggs = Array.from(el.querySelectorAll(".egg"));
    return {
      el,
      eggs,
      x: 0, y: 0,
      vx: randSpeed(),
      vy: randSpeed(),
      r: 0,                    // computed from DOM
      bobPhase: Math.random() * Math.PI * 2,
      bobSpeed: randBetween(BOB_SPEED_MIN, BOB_SPEED_MAX) * (Math.random() < 0.5 ? -1 : 1),
      bobAmp: randBetween(BOB_AMP_MIN, BOB_AMP_MAX),
      hoverMul: 1              // slows when hovered/focused
    };
  });

  let W = stage.clientWidth;
  let H = stage.clientHeight;

  function measureRadii() {
    nodes.forEach(n => {
      const rect = n.el.getBoundingClientRect();
      n.r = rect.width / 2; // assume roughly circular footprint from CSS --size
    });
  }

  function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

  // Initial layout: seed a 2x2 grid near centers, then clamp inside
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

      n.x = (c + 0.5) * cellW + (Math.random() * 24 - 12);
      n.y = (r + 0.5) * cellH + (Math.random() * 24 - 12);

      n.x = clamp(n.x, n.r + pad, W - n.r - pad);
      n.y = clamp(n.y, n.r + pad, H - n.r - pad);

      n.el.style.left = (n.x - n.r) + "px";
      n.el.style.top  = (n.y - n.r) + "px";
    });
  }

  // Elastic collision (equal mass circles)
  function resolveCollision(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 0.0001;
    const overlap = a.r + b.r - dist;
    if (overlap <= 0) return;

    const nx = dx / dist, ny = dy / dist;
    const sep = overlap / 2 + 0.5; // bias to prevent sticking
    a.x -= nx * sep; a.y -= ny * sep;
    b.x += nx * sep; b.y += ny * sep;

    // Reflect velocity along normal when approaching
    const rvx = b.vx - a.vx;
    const rvy = b.vy - a.vy;
    const rel = rvx * nx + rvy * ny;
    if (rel < 0) {
      const j = -rel;
      a.vx -= nx * j; a.vy -= ny * j;
      b.vx += nx * j; b.vy += ny * j;
    }
  }

  // Containment within stage
  function contain(n) {
    if (n.x - n.r <= 0)   { n.x = n.r;       n.vx = Math.abs(n.vx); }
    if (n.x + n.r >= W)   { n.x = W - n.r;   n.vx = -Math.abs(n.vx); }
    if (n.y - n.r <= 0)   { n.y = n.r;       n.vy = Math.abs(n.vy); }
    if (n.y + n.r >= H)   { n.y = H - n.r;   n.vy = -Math.abs(n.vy); }
  }

  // Hover/focus damping (nests “settle” a little)
  function attachInteractivity() {
    nodes.forEach(n => {
      n.el.addEventListener("pointerenter", () => { n.hoverMul = 0.6; }, { passive: true });
      n.el.addEventListener("pointerleave", () => { n.hoverMul = 1.0; }, { passive: true });
      n.el.addEventListener("focus", () => { n.hoverMul = 0.6; });
      n.el.addEventListener("blur",  () => { n.hoverMul = 1.0; });
    });
  }

  function draw(now) {
    nodes.forEach(n => {
      // Position body
      n.el.style.left = (n.x - n.r) + "px";
      n.el.style.top  = (n.y - n.r) + "px";

      // Bobbing (translateY) — turned down for reduced motion
      if (!prefersReducedMotion) {
        const bob = Math.sin(n.bobPhase) * n.bobAmp;
        n.el.style.transform = `translate3d(0, ${bob.toFixed(2)}px, 0)`;
      } else {
        n.el.style.transform = "";
      }

      // Optional egg wobble (subtle)
      if (!prefersReducedMotion && n.eggs.length) {
        n.eggs.forEach((egg, i) => {
          const wob = Math.sin(n.bobPhase * (1.1 + i * 0.07) + i) * 1.6; // degrees
          egg.style.transform += ` rotate(${wob.toFixed(2)}deg)`;
        });
      }
    });
  }

  // Main loop
  let last = performance.now();
  function tick(now) {
    const dt = Math.min(32, now - last); // ms
    last = now;

    nodes.forEach(n => {
      // Base drift
      n.x += n.vx * dt * n.hoverMul;
      n.y += n.vy * dt * n.hoverMul;

      // Bounds
      contain(n);

      // Bob phase advance
      n.bobPhase += n.bobSpeed * dt;
    });

    // Pairwise collisions
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        resolveCollision(nodes[i], nodes[j]);
      }
    }

    draw(now);
    rafId = requestAnimationFrame(tick);
  }

  // Resize observer re-initializes on container change
  const ro = new ResizeObserver(() => initializeLayout());
  ro.observe(stage);

  // Visibility / motion preferences
  let rafId = null;
  function start() { if (!rafId) { last = performance.now(); rafId = requestAnimationFrame(tick); } }
  function stop()  { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } }

  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  function applyMotionPreference(){
    if (document.hidden || media.matches) stop();
    else start();
  }
  document.addEventListener("visibilitychange", applyMotionPreference);
  media.addEventListener?.("change", applyMotionPreference);

  // Boot
  attachInteractivity();
  initializeLayout();
  start();

  console.log("✅ Nests + pigeon cursor ready.");
});
