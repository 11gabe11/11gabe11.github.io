// scripts.js — Full-viewport nests + precise wall edges + elastic collisions + egg rolling
document.addEventListener("DOMContentLoaded", () => {
  const stage = document.getElementById("stage");
  if (!stage) return;

  /* ---------- Build nests (twigs + eggs, as before) ---------- */
  const nests = Array.from(stage.querySelectorAll(".bubble"));
  nests.forEach(el => el.classList.add("nest"));

  // Make twig bowls + random eggs (0–3)
  nests.forEach(el => {
    el.querySelectorAll(".twig").forEach(t => t.remove());

    const eggCount = Math.floor(Math.random() * 4); // 0..3
    // ensure exactly 3 egg nodes exist; show first N
    const have = el.querySelectorAll(".egg").length;
    for (let i = have; i < 3; i++) {
      const egg = document.createElement("i");
      egg.className = "egg";
      el.appendChild(egg);
    }
    Array.from(el.querySelectorAll(".egg")).forEach((egg, idx) => {
      egg.style.display = (idx < eggCount) ? "block" : "none";
    });

    // Procedural twigs in 3 rings for depth
    const ringDefs = [
      { cls: "back", count: 22, baseRot: 0,   spread: 190, y: 0.50 },
      { cls: "mid",  count: 26, baseRot: 12,  spread: 200, y: 0.56 },
      { cls: "top",  count: 28, baseRot: -8,  spread: 210, y: 0.62 },
    ];
    const getCSS = (name) =>
      getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#3a2d21";

    ringDefs.forEach(ring => {
      for (let i = 0; i < ring.count; i++) {
        const twig = document.createElement("b");
        twig.className = `twig ${ring.cls}`;

        const len   = 28 + Math.random() * 36;
        const thick =  2 + Math.random() * 2.6;
        const huePick = Math.random();
        const c1 = huePick < .33 ? getCSS("--twig-1")
                 : huePick < .66 ? getCSS("--twig-4") : getCSS("--twig-5");
        const c2 = huePick < .33 ? getCSS("--twig-2")
                 : huePick < .66 ? getCSS("--twig-3") : getCSS("--twig-2");

        twig.style.setProperty("--twig-l", `${len}px`);
        twig.style.setProperty("--twig-t", `${thick}px`);
        twig.style.setProperty("--twig-c1", c1);
        twig.style.setProperty("--twig-c2", c2);

        const angle = (ring.baseRot + (i / ring.count) * ring.spread) + (Math.random()*6 - 3);
        const rad = angle * Math.PI / 180;
        const radiusPx = (el.offsetWidth/2) * 0.78;
        const cx = el.offsetWidth/2 + Math.cos(rad) * radiusPx;
        const cy = el.offsetHeight * ring.y + Math.sin(rad) * (radiusPx * 0.18);
        const tilt = (Math.random()*1.4 - 0.7);

        twig.style.left = `${cx}px`;
        twig.style.top  = `${cy}px`;
        twig.style.setProperty("--twig-tf", `translate(-50%,-50%) rotate(${angle+tilt}deg)`);
        el.appendChild(twig);
      }
    });
  });

  /* ---------- Physics: full-viewport bounds + exact edges ---------- */
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SPEED_MIN = prefersReducedMotion ? 0.012 : 0.016;
  const SPEED_MAX = prefersReducedMotion ? 0.018 : 0.022;

  const randSpeed = () => {
    const v = Math.random() * (SPEED_MAX - SPEED_MIN) + SPEED_MIN;
    return (Math.random() < 0.5 ? -v : v);
  };

  // Node model stores per-axis radii (rx = half width, ry = half height)
  const nodes = nests.map(el => ({
    el,
    x: 0, y: 0,
    vx: randSpeed(),
    vy: randSpeed(),
    rx: 0, ry: 0, // updated from DOM
    eggs: []      // rolling state
  }));

  // viewport bounds
  let BW = window.innerWidth;
  let BH = window.innerHeight;

  function measure() {
    BW = window.innerWidth;
    BH = window.innerHeight;
    nodes.forEach(n => {
      const r = n.el.getBoundingClientRect();
      n.rx = r.width / 2;
      n.ry = r.height / 2;
    });
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function seed() {
    measure();
    const cols = 2, rows = 2, pad = 12;

    nodes.forEach((n, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const cellW = BW / cols;
      const cellH = BH / rows;
      n.x = (c + 0.5) * cellW + (Math.random()*20 - 10);
      n.y = (r + 0.5) * cellH + (Math.random()*20 - 10);
      n.x = clamp(n.x, n.rx + pad, BW - n.rx - pad);
      n.y = clamp(n.y, n.ry + pad, BH - n.ry - pad);
      n.el.style.left = (n.x - n.rx) + "px";
      n.el.style.top  = (n.y - n.ry) + "px";

      // egg rolling initial states
      const eggs = Array.from(n.el.querySelectorAll(".egg")).filter(e => e.style.display !== "none");
      n.eggs = eggs.map((egg, idx) => ({
        el: egg,
        dx: (idx - (eggs.length-1)/2) * 4,
        dy: Math.random()*1.5 - 0.75,
        vx: 0, vy: 0,
        rot: (idx-1) * 3,
        rv: 0
      }));
    });
  }

  // precise wall containment using rx/ry so edges touch window edges exactly
  function contain(n) {
    if (n.x - n.rx <= 0)   { n.x = n.rx;       n.vx = Math.abs(n.vx); }
    if (n.x + n.rx >= BW)  { n.x = BW - n.rx;  n.vx = -Math.abs(n.vx); }
    if (n.y - n.ry <= 0)   { n.y = n.ry;       n.vy = Math.abs(n.vy); }
    if (n.y + n.ry >= BH)  { n.y = BH - n.ry;  n.vy = -Math.abs(n.vy); }
  }

  // elastic collisions (approximate each nest as a circle with radius = max(rx, ry))
  function collide(a, b) {
    const ra = Math.max(a.rx, a.ry);
    const rb = Math.max(b.rx, b.ry);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 0.0001;
    const overlap = (ra + rb) - dist;
    if (overlap <= 0) return;

    const nx = dx / dist, ny = dy / dist;
    const sep = overlap / 2 + 0.5;
    a.x -= nx * sep; a.y -= ny * sep;
    b.x += nx * sep; b.y += ny * sep;

    const rvx = b.vx - a.vx;
    const rvy = b.vy - a.vy;
    const rel = rvx * nx + rvy * ny;
    if (rel < 0) {
      const j = -rel; // equal mass elastic
      a.vx -= nx * j; a.vy -= ny * j;
      b.vx += nx * j; b.vy += ny * j;
    }
  }

  function draw() {
    nodes.forEach(n => {
      n.el.style.left = (n.x - n.rx) + "px";
      n.el.style.top  = (n.y - n.ry) + "px";
    });
  }

  /* ---------- Egg rolling (same model, adapted) ---------- */
  function updateEggs(n, dt) {
    if (!n.eggs?.length) return;

    const bw = n.el.offsetWidth;
    const bh = n.el.offsetHeight;
    const maxX = bw * 0.22;
    const maxY = bh * 0.06;
    const t = dt / 1000;

    n.eggs.forEach(s => {
      const lag = 14, grav = 22, damp = 6, jitter = 6;

      const fx = (-n.vx) * lag + (Math.random()-0.5)*jitter;
      const fy = (-n.vy) * lag + grav + (Math.random()-0.5)*jitter*0.6;

      s.vx += fx * t; s.vy += fy * t;
      s.vx -= s.vx * damp * t; s.vy -= s.vy * damp * t;
      s.dx += s.vx * t * 30; s.dy += s.vy * t * 30;

      const nx = s.dx / maxX;
      const ny = s.dy / maxY;
      if (nx*nx + ny*ny > 1) {
        const ang = Math.atan2(s.dy, s.dx);
        s.dx = Math.cos(ang) * maxX;
        s.dy = Math.sin(ang) * maxY;
        const nxn = Math.cos(ang), nyn = Math.sin(ang);
        const vn = s.vx*nxn + s.vy*nyn;
        s.vx -= 1.6*vn*nxn;
        s.vy -= 1.6*vn*nyn;
        s.rv += (Math.random()<0.5 ? -1 : 1) * (8 + Math.random()*6);
      }

      s.rv -= s.rv * 2.5 * t;
      s.rot += s.rv * t;

      s.el.style.transform =
        `rotateX(-28deg) translate(${s.dx.toFixed(2)}px, ${s.dy.toFixed(2)}px) rotate(${s.rot.toFixed(2)}deg)`;
    });
  }

  /* ---------- Main loop ---------- */
  let last = performance.now();
  function tick(now) {
    const dt = Math.min(32, now - last);
    last = now;

    nodes.forEach(n => { n.x += n.vx * dt; n.y += n.vy * dt; contain(n); });
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        collide(nodes[i], nodes[j]);
      }
    }
    nodes.forEach(n => updateEggs(n, dt));

    draw();
    requestAnimationFrame(tick);
  }

  seed();
  requestAnimationFrame(tick);

  // Re-measure on resize / orientation changes
  window.addEventListener("resize", () => { seed(); });

  // Micro transition on click
  stage.addEventListener("click", (e) => {
    const a = e.target.closest("a.bubble");
    if (!a) return;
    document.body.classList.add("leaving");
    a.classList.add("_clicked");
  });
});
