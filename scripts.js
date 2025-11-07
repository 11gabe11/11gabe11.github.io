// scripts.js — The Drifting Pigeon (Nests ++ Twigs ++ Random Eggs ++ Real Pigeon Cursor)
document.addEventListener("DOMContentLoaded", () => {
  /* =========================
   *  Stage
   * ========================= */
  const stage = document.getElementById("stage");
  if (!stage) return;

  // Prefer nests (keep .bubble for back-compat)
  const nests = Array.from(stage.querySelectorAll(".bubble.nest, .nest, .bubble"));

  // Ensure absolute positioning for physics
  nests.forEach(n => {
    n.style.position = "absolute";
    n.style.willChange = "left, top, transform";
    n.style.pointerEvents = "auto";
  });

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* =========================
   *  Inject minimal CSS for twigs + cursor (runtime so you don’t edit style.css now)
   * ========================= */
  if (!document.getElementById("dp-runtime-style")) {
    const style = document.createElement("style");
    style.id = "dp-runtime-style";
    style.textContent = `
      /* Procedural twigs that ring each nest rim */
      .bubble.nest .twig {
        position: absolute;
        left: 50%; top: 60%;
        width: var(--twig-l, 32px);
        height: var(--twig-t, 3px);
        transform-origin: calc(var(--twig-l, 32px) * -0.1) 50%;
        border-radius: 8px;
        background:
          linear-gradient(180deg, rgba(0,0,0,.35), rgba(0,0,0,.0)),
          linear-gradient(90deg, var(--twig-c1, #3a2d21), var(--twig-c2, #2b2118));
        box-shadow:
          0 1px 0 rgba(255,255,255,.08) inset,
          0 -1px 0 rgba(0,0,0,.25) inset,
          0 2px 4px rgba(0,0,0,.35);
        z-index: 2;
        opacity: .98;
        animation: dp-twig-sway 3000ms ease-in-out infinite;
      }
      @keyframes dp-twig-sway {
        0%,100% { transform: var(--twig-tf) rotate(0.6deg); }
        50%     { transform: var(--twig-tf) rotate(-0.6deg); }
      }
      .bubble.nest:hover .twig { animation-duration: 2600ms; opacity: 1; }

      /* Realistic homing pigeon cursor */
      #wp-cursor {
        position: fixed; left: 0; top: 0; z-index: 9999; pointer-events: none;
        width: clamp(28px, 3.8vmin, 44px); height: auto;
        transform: translate3d(-9999px,-9999px,0);
        filter: drop-shadow(0 1px 0 rgba(255,255,255,.06)) drop-shadow(0 10px 20px rgba(0,0,0,.35));
      }
      #wp-cursor svg #wing-R, #wp-cursor svg #wing-L { transform-origin: 60px 42px; }
      @keyframes dp-flap-R { 0%{transform:rotate(16deg)} 30%{transform:rotate(-44deg)} 60%{transform:rotate(-36deg)} 100%{transform:rotate(16deg)} }
      @keyframes dp-flap-L { 0%{transform:rotate(-16deg)} 30%{transform:rotate(44deg)} 60%{transform:rotate(36deg)} 100%{transform:rotate(-16deg)} }
      @keyframes dp-body { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-0.7px)} }
      #wp-cursor svg #wing-R { animation: dp-flap-R 720ms ease-in-out infinite; }
      #wp-cursor svg #wing-L { animation: dp-flap-L 720ms ease-in-out infinite; }
      #wp-cursor svg           { animation: dp-body   720ms ease-in-out infinite; }

      /* Glide/Burst modifiers (can be toggled on #wp-cursor) */
      @keyframes dp-glide-R { 0%,100%{transform:rotate(6deg)} 50%{transform:rotate(0)} }
      @keyframes dp-glide-L { 0%,100%{transform:rotate(-6deg)} 50%{transform:rotate(0)} }
      @keyframes dp-body-glide { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-0.4px)} }
      #wp-cursor.cursor--glide svg #wing-R { animation: dp-glide-R 1600ms ease-in-out infinite !important; }
      #wp-cursor.cursor--glide svg #wing-L { animation: dp-glide-L 1600ms ease-in-out infinite !important; }
      #wp-cursor.cursor--glide svg         { animation: dp-body-glide 1600ms ease-in-out infinite !important; }

      @keyframes dp-burst-R { 0%{transform:rotate(22deg)} 30%{transform:rotate(-52deg)} 60%{transform:rotate(-40deg)} 100%{transform:rotate(22deg)} }
      @keyframes dp-burst-L { 0%{transform:rotate(-22deg)} 30%{transform:rotate(52deg)} 60%{transform:rotate(40deg)} 100%{transform:rotate(-22deg)} }
      @keyframes dp-body-burst { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-1.1px)} }
      #wp-cursor.cursor--burst svg #wing-R { animation: dp-burst-R 700ms ease-in-out infinite !important; }
      #wp-cursor.cursor--burst svg #wing-L { animation: dp-burst-L 700ms ease-in-out infinite !important; }
      #wp-cursor.cursor--burst svg         { animation: dp-body-burst 700ms ease-in-out infinite !important; }
    `;
    document.head.appendChild(style);
  }

  /* =========================
   *  Random egg count per nest (0–3) on every load
   * ========================= */
  nests.forEach(n => {
    if (!n.matches(".nest, .bubble.nest, .bubble")) return;
    const eggs = n.querySelectorAll(".egg");
    if (eggs.length) {
      n.classList.remove("eggs-0","eggs-1","eggs-2","eggs-3");
      const count = Math.floor(Math.random() * 4); // 0..3
      n.classList.add(`eggs-${count}`);
    }
  });

  /* =========================
   *  Procedural twig ring (authentic twiggy rim along front)
   * ========================= */
  const TWIG_MIN = 28, TWIG_MAX = 46;  // how many twigs
  const RIM_OFFSET = 0.46;             // front rim center as fraction of height

  nests.forEach(n => {
    if (!n.classList.contains("nest")) return;
    if (n._twigsAdded) return;
    n._twigsAdded = true;

    const rect = n.getBoundingClientRect();
    const w = rect.width  || n.offsetWidth  || 180;
    const h = rect.height || n.offsetHeight || (w * 0.68);
    const cx = w / 2;
    const cy = h * RIM_OFFSET;
    const count = randInt(TWIG_MIN, TWIG_MAX);

    for (let i = 0; i < count; i++) {
      const twig = document.createElement("span");
      twig.className = "twig";

      // Bark colors (mellow pigeon-friendly)
      const c1 = pick(["#3a2d21","#3c2e22","#3b2e21","#3a2b1e","#3d2f23","#392b1f"]);
      const c2 = pick(["#2b2118","#2a2117","#2e241a","#2a2017","#251b12","#231a10"]);
      const len   = randInt(24, Math.max(38, Math.floor(w * 0.18)));
      const thick = randInt(2, 4);
      const ang   = randBetween(-22, 22);
      const spread= randBetween(-80, 80);
      const out   = randBetween(-6, 10);

      twig.style.setProperty("--twig-c1", c1);
      twig.style.setProperty("--twig-c2", c2);
      twig.style.setProperty("--twig-l", `${len}px`);
      twig.style.setProperty("--twig-t", `${thick}px`);

      const x = cx + spread;
      const y = cy + (0.12 * Math.abs(spread)) + out;
      const base = `translate(${x}px, ${y}px) rotate(${ang}deg)`;
      twig.style.setProperty("--twig-tf", base);
      twig.style.transform = base;

      if (prefersReducedMotion) twig.style.animation = "none";
      n.appendChild(twig);
    }
  });

  /* =========================
   *  Physics: drift + collisions + bobbing
   * ========================= */
  const SPEED_MIN = prefersReducedMotion ? 0.010 : 0.013; // px/ms
  const SPEED_MAX = prefersReducedMotion ? 0.015 : 0.018;
  const BOB_SPEED_MIN = 0.0008, BOB_SPEED_MAX = 0.0016;   // rad/ms
  const BOB_AMP_MIN = 3, BOB_AMP_MAX = 9;                 // px

  const nodes = nests.map(el => {
    const rect = el.getBoundingClientRect();
    const r = (rect.width || el.offsetWidth || 180) / 2;
    return {
      el,
      x: el.offsetLeft || 0,
      y: el.offsetTop  || 0,
      vx: randSpeed(SPEED_MIN, SPEED_MAX),
      vy: randSpeed(SPEED_MIN, SPEED_MAX),
      r,
      bobPhase: Math.random() * Math.PI * 2,
      bobSpeed: randBetween(BOB_SPEED_MIN, BOB_SPEED_MAX) * (Math.random() < 0.5 ? -1 : 1),
      bobAmp:   randBetween(BOB_AMP_MIN, BOB_AMP_MAX),
      hoverMul: 1
    };
  });

  let bounds = stage.getBoundingClientRect();
  window.addEventListener("resize", () => { bounds = stage.getBoundingClientRect(); });

  nodes.forEach(n => {
    n.el.addEventListener("pointerenter", () => { n.hoverMul = 0.6; }, { passive:true });
    n.el.addEventListener("pointerleave", () => { n.hoverMul = 1.0; }, { passive:true });
    n.el.addEventListener("focus", () => { n.hoverMul = 0.6; });
    n.el.addEventListener("blur",  () => { n.hoverMul = 1.0; });
  });

  function contain(n) {
    if (n.x - n.r <= 0)             { n.x = n.r;                   n.vx = Math.abs(n.vx); }
    if (n.x + n.r >= bounds.width)  { n.x = bounds.width - n.r;    n.vx = -Math.abs(n.vx); }
    if (n.y - n.r <= 0)             { n.y = n.r;                   n.vy = Math.abs(n.vy); }
    if (n.y + n.r >= bounds.height) { n.y = bounds.height - n.r;   n.vy = -Math.abs(n.vy); }
  }
  function collide(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 0.0001;
    const overlap = a.r + b.r - dist;
    if (overlap <= 0) return;
    const nx = dx / dist, ny = dy / dist;
    const sep = overlap / 2 + 0.5;
    a.x -= nx * sep; a.y -= ny * sep;
    b.x += nx * sep; b.y += ny * sep;
    const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
    const rel = rvx * nx + rvy * ny;
    if (rel < 0) {
      const j = -rel;
      a.vx -= nx * j; a.vy -= ny * j;
      b.vx += nx * j; b.vy += ny * j;
    }
  }
  function drawNode(n) {
    n.el.style.left = (n.x - n.r) + "px";
    n.el.style.top  = (n.y - n.r) + "px";
    if (!prefersReducedMotion) {
      const bob = Math.sin(n.bobPhase) * n.bobAmp;
      n.el.style.transform = `perspective(900px) rotateX(32deg) translate3d(0, ${bob.toFixed(2)}px, 0)`;
    } else {
      n.el.style.transform = `perspective(900px) rotateX(32deg)`;
    }
  }

  function initializeLayout() {
    bounds = stage.getBoundingClientRect();
    const cols = 2, rows = 2, pad = 12;
    nodes.forEach((n, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const cellW = bounds.width / cols, cellH = bounds.height / rows;
      n.x = (c + 0.5) * cellW + randBetween(-12, 12);
      n.y = (r + 0.5) * cellH + randBetween(-12, 12);
      const rect = n.el.getBoundingClientRect();
      n.r = (rect.width || n.el.offsetWidth || 180) / 2;
      n.x = clamp(n.x, n.r + pad, bounds.width  - n.r - pad);
      n.y = clamp(n.y, n.r + pad, bounds.height - n.r - pad);
      drawNode(n);
    });
  }

  // main loop
  let last = performance.now();
  let raf = null;
  function tick(now) {
    const dt = Math.min(32, now - last);
    last = now;
    nodes.forEach(n => {
      n.x += n.vx * dt * n.hoverMul;
      n.y += n.vy * dt * n.hoverMul;
      contain(n);
      n.bobPhase += n.bobSpeed * dt;
    });
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) collide(nodes[i], nodes[j]);
    }
    nodes.forEach(drawNode);
    raf = requestAnimationFrame(tick);
  }

  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  function applyMotionPreference() {
    if (document.hidden || media.matches) { if (raf) cancelAnimationFrame(raf), raf = null; }
    else { if (!raf) last = performance.now(), raf = requestAnimationFrame(tick); }
  }
  document.addEventListener("visibilitychange", applyMotionPreference);
  media.addEventListener?.("change", applyMotionPreference);

  // subtle parallax
  function parallax(e){
    const r = stage.getBoundingClientRect();
    const cx = r.left + r.width/2, cy = r.top + r.height/2;
    const dx = (e.clientX - cx) / r.width, dy = (e.clientY - cy) / r.height;
    stage.style.transform = `perspective(900px) rotateX(${(dy*-3).toFixed(2)}deg) rotateY(${(dx*3).toFixed(2)}deg)`;
  }
  window.addEventListener("pointermove", parallax);

  initializeLayout();
  applyMotionPreference();

  /* =========================
   *  Realistic Homing Pigeon Cursor
   *   - Only on precise pointers
   *   - Beak-tip hotspot alignment
   *   - Flap/glide/burst animations
   * ========================= */
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  if (finePointer) {
    const VIEW_W = 140, VIEW_H = 90;     // SVG viewBox
    const BEAK_X = 128, BEAK_Y = 44;     // beak-tip hotspot (approx)

    // build cursor if not present
    let cursor = document.getElementById("wp-cursor");
    if (!cursor) {
      cursor = document.createElement("div");
      cursor.id = "wp-cursor";
      cursor.innerHTML = makePigeonSVG(VIEW_W, VIEW_H);
      document.body.appendChild(cursor);
    }

    let lastX = 0, lastY = 0, rafMove = null;
    function place(x, y) {
      const w = cursor.getBoundingClientRect().width || 36;
      const h = w * (VIEW_H / VIEW_W);
      const offsetX = w * (BEAK_X / VIEW_W);
      const offsetY = h * (BEAK_Y / VIEW_H);
      cursor.style.transform = `translate3d(${x - offsetX}px, ${y - offsetY}px, 0)`;
    }
    function onMove(e) {
      lastX = e.clientX; lastY = e.clientY;
      if (!rafMove) rafMove = requestAnimationFrame(() => { place(lastX, lastY); rafMove = null; });
    }
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousemove", (e) => place(e.clientX, e.clientY), { once: true });
    window.addEventListener("mouseleave", () => { cursor.style.transform = "translate3d(-9999px,-9999px,0)"; });

    // occasional glide/burst mood
    if (!prefersReducedMotion) {
      setInterval(() => {
        if (Math.random() < 0.25) toggleCursorMode(cursor, "cursor--glide", 1500);
        else if (Math.random() < 0.12) toggleCursorMode(cursor, "cursor--burst", 800);
      }, 2500);
    }

    // reduce motion compliance
    if (prefersReducedMotion) {
      // strip animations by toggling glide (low motion) or removing classes
      toggleCursorMode(cursor, "cursor--glide", 0);
    }
  }

  /* ===== Helpers ===== */
  function randBetween(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(randBetween(a, b + 1)); }
  function pick(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
  function randSpeed(min, max){ const v = randBetween(min, max); return Math.random()<0.5 ? -v : v; }
  function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }

  function toggleCursorMode(el, cls, ms){
    el.classList.add(cls);
    if (ms>0) setTimeout(()=> el.classList.remove(cls), ms);
  }

  // Draw a realistic homing pigeon (blue-grey body, wing bars, iridescent neck, orange eye, pale beak)
  function makePigeonSVG(VW, VH){
    return `
<svg viewBox="0 0 ${VW} ${VH}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="neck-iri" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0"  stop-color="#3ad5a5"/>
      <stop offset="0.45" stop-color="#3a7ad5"/>
      <stop offset="1"  stop-color="#7a4ad5"/>
    </linearGradient>
    <linearGradient id="wing-grey" x1="0" x2="1">
      <stop offset="0" stop-color="#8a97a6"/>
      <stop offset="1" stop-color="#6f7e8d"/>
    </linearGradient>
    <linearGradient id="back-grey" x1="0" x2="1">
      <stop offset="0" stop-color="#9aa7b6"/>
      <stop offset="1" stop-color="#7b8998"/>
    </linearGradient>
    <linearGradient id="rump-white" x1="0" x2="1">
      <stop offset="0" stop-color="#e9eef2"/>
      <stop offset="1" stop-color="#cfd8df"/>
    </linearGradient>
    <linearGradient id="beak" x1="0" x2="1">
      <stop offset="0" stop-color="#f2d8d8"/>
      <stop offset="1" stop-color="#e0c0c0"/>
    </linearGradient>
  </defs>

  <!-- right wing (behind) -->
  <g id="wing-R" opacity="0.92">
    <path d="M58,42 C78,28 98,20 120,26 110,34 100,44 84,52 70,58 60,56 58,42Z" fill="url(#wing-grey)"/>
    <!-- bars -->
    <path d="M78,44 C92,39 106,36 118,37" stroke="#4a5561" stroke-width="3" stroke-linecap="round" fill="none" opacity=".9"/>
    <path d="M74,50 C90,45 106,43 118,43" stroke="#3c4650" stroke-width="3" stroke-linecap="round" fill="none" opacity=".9"/>
  </g>

  <!-- body -->
  <g id="body">
    <!-- back -->
    <path d="M20,56 C34,60 52,58 66,50 C78,44 86,36 92,30 C90,48 78,62 58,70 C44,76 28,74 20,56Z" fill="url(#back-grey)"/>
    <!-- rump (white patch) -->
    <path d="M54,62 C64,58 72,52 78,44 C72,58 60,66 48,70 44,70 46,64 54,62Z" fill="url(#rump-white)" opacity=".95"/>
    <!-- neck -->
    <path d="M36,34 C44,28 52,26 62,28 C56,36 52,42 46,48 C40,50 36,44 36,34Z" fill="url(#neck-iri)"/>
    <!-- breast -->
    <path d="M22,58 C14,46 18,36 28,30 C34,28 40,30 44,34 C40,42 36,48 32,52 C28,56 26,58 22,58Z" fill="#9fb0bf"/>
    <!-- tail -->
    <path d="M10,58 C18,62 26,64 32,64 C26,68 18,70 8,70 12,66 10,62 10,58Z" fill="#515d69"/>
    <path d="M10,62 L32,64" stroke="#2e3740" stroke-width="4" stroke-linecap="round" opacity=".9"/>
  </g>

  <!-- head -->
  <g id="head">
    <path d="M58,26 C60,18 54,12 46,12 C38,12 34,16 34,22 C34,28 38,32 46,32 C50,32 54,30 58,26Z" fill="#8ea2b3"/>
    <!-- eye (orange ring + black pupil + spec) -->
    <circle cx="44.5" cy="22" r="4.2" fill="#e67e22" stroke="#f7c38a" stroke-width="0.8"/>
    <circle cx="44.5" cy="22" r="2.2" fill="#0b0b0b"/>
    <circle cx="43.7" cy="21.2" r="0.8" fill="#ffffff" opacity=".9"/>
    <!-- beak + cere (beak tip ~ (128,44) after scaling) -->
    <path d="M60,22 C68,20 78,20 88,22 82,24 76,26 70,26 66,26 62,24 60,22Z" fill="url(#beak)"/>
    <ellipse cx="60" cy="22" rx="3" ry="2" fill="#f1e9e9" opacity=".9"/>
  </g>

  <!-- left wing (front) -->
  <g id="wing-L">
    <path d="M58,42 C78,28 98,20 120,26 110,34 100,44 84,52 70,58 60,56 58,42Z" fill="url(#wing-grey)"/>
    <!-- bars -->
    <path d="M78,44 C92,39 106,36 118,37" stroke="#4a5561" stroke-width="3" stroke-linecap="round" fill="none" opacity=".95"/>
    <path d="M74,50 C90,45 106,43 118,43" stroke="#3c4650" stroke-width="3" stroke-linecap="round" fill="none" opacity=".95"/>
    <!-- darker tips -->
    <path d="M118,26 C114,34 106,42 96,48" stroke="#2b333a" stroke-width="5" stroke-linecap="round" opacity=".9"/>
  </g>
</svg>`;
  }
});
