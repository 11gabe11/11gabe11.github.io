// scripts.js — Full-viewport nests + ellipse-ellipse collisions + clipped twigs + rolling eggs
document.addEventListener("DOMContentLoaded", () => {
  const stage = document.getElementById("stage");
  if (!stage) return;

  /* ---------- Promote .bubble → .nest and (re)build eggs + twigs ---------- */
  const nests = Array.from(stage.querySelectorAll(".bubble"));
  nests.forEach(el => el.classList.add("nest"));

  nests.forEach(el => {
    // remove old procedural twigs, if any
    el.querySelectorAll(".twig").forEach(t => t.remove());

    // --- Random eggs (0..3) on every load ---
    const eggCount = Math.floor(Math.random() * 4);
    // ensure 3 egg nodes exist; show first N
    const have = el.querySelectorAll(".egg").length;
    for (let i = have; i < 3; i++) {
      const egg = document.createElement("i");
      egg.className = "egg";
      el.appendChild(egg);
    }
    Array.from(el.querySelectorAll(".egg")).forEach((egg, idx) => {
      egg.style.display = (idx < eggCount) ? "block" : "none";
    });

    // --- Procedural twigs: 3 rings, but inside the nest, and clipped by overflow:hidden ---
    const ringDefs = [
      { cls: "back", count: 22, baseRot: 0,   spread: 190, y: 0.50 },
      { cls: "mid",  count: 26, baseRot: 12,  spread: 200, y: 0.56 },
      { cls: "top",  count: 28, baseRot: -8,  spread: 210, y: 0.62 },
    ];
    const getCSS = (name) =>
      getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#3a2d21";

    const w = el.offsetWidth;
    const h = el.offsetHeight;

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

        // place along an ellipse, but inset so tips never cross the visual rim
        const inset = 0.80;                         // 0.00 = outer edge, <1.0 pulls twigs in
        const rx = (w * 0.5) * inset;
        const ry = (h * 0.58) * inset;              // a little flatter to match bowl tilt
        const angle = (ring.baseRot + (i / ring.count) * ring.spread) + (Math.random()*6 - 3);
        const rad = angle * Math.PI / 180;

        const cx = w/2 + Math.cos(rad) * rx;
        const cy = h*ring.y + Math.sin(rad) * (ry * 0.35);
        const tilt = (Math.random()*1.4 - 0.7);

        twig.style.left = `${cx}px`;
        twig.style.top  = `${cy}px`;
        twig.style.setProperty("--twig-tf", `translate(-50%,-50%) rotate(${angle+tilt}deg)`);

        el.appendChild(twig);
      }
    });
  });

  /* ---------- Physics: full-viewport bounds + ellipse–ellipse collisions ---------- */
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SPEED_MIN = prefersReducedMotion ? 0.012 : 0.016;
  const SPEED_MAX = prefersReducedMotion ? 0.018 : 0.022;

  const randSpeed = () => {
    const v = Math.random() * (SPEED_MAX - SPEED_MIN) + SPEED_MIN;
    return (Math.random() < 0.5 ? -v : v);
  };

  const nodes = nests.map(el => ({
    el,
    x: 0, y: 0,
    vx: randSpeed(),
    vy: randSpeed(),
    rx: 0, ry: 0,  // half-width / half-height used for walls
    eggs: []
  }));

  let BW = window.innerWidth;
  let BH = window.innerHeight;

  function measure() {
    BW = window.innerWidth;
    BH = window.innerHeight;
    nodes.forEach(n => {
      const r = n.el.getBoundingClientRect();
      n.rx = r.width  / 2;
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
      const cellW = BW / cols, cellH = BH / rows;

      n.x = (c + 0.5) * cellW + (Math.random() * 20 - 10);
      n.y = (r + 0.5) * cellH + (Math.random() * 20 - 10);

      n.x = clamp(n.x, n.rx + pad, BW - n.rx - pad);
      n.y = clamp(n.y, n.ry + pad, BH - n.ry - pad);

      n.el.style.left = (n.x - n.rx) + "px";
      n.el.style.top  = (n.y - n.ry) + "px";

      // egg rolling state
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

  // precise wall containment by ellipse edges (rx/ry)
  function contain(n) {
    if (n.x - n.rx <= 0)  { n.x = n.rx;      n.vx = Math.abs(n.vx); }
    if (n.x + n.rx >= BW) { n.x = BW - n.rx; n.vx = -Math.abs(n.vx); }
    if (n.y - n.ry <= 0)  { n.y = n.ry;      n.vy = Math.abs(n.vy); }
    if (n.y + n.ry >= BH) { n.y = BH - n.ry; n.vy = -Math.abs(n.vy); }
  }

  // helper: radius of an ellipse along a unit direction n = (ux,uy)
  function ellipseRadiusAlong(ux, uy, rx, ry) {
    // r(θ) = 1 / sqrt( (cos^2θ)/rx^2 + (sin^2θ)/ry^2 )
    const denom = (ux*ux)/(rx*rx) + (uy*uy)/(ry*ry);
    return 1 / Math.sqrt(Math.max(denom, 1e-9));
  }

  // true ellipse–ellipse separation and velocity reflection along the line of centers
  function collide(a, b) {
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    let dist = Math.hypot(dx, dy);

    // handle identical center (rare): nudge
    if (dist < 1e-6) { dx = 1e-3; dy = 0; dist = 1e-3; }

    const ux = dx / dist;
    const uy = dy / dist;

    const ra = ellipseRadiusAlong(ux, uy, a.rx, a.ry);
    const rb = ellipseRadiusAlong(-ux, -uy, b.rx, b.ry); // opposite direction
    const needed = ra + rb;

    const overlap = needed - dist;
    if (overlap <= 0) return;

    // separate along the normal
    const sep = overlap / 2 + 0.5; // small bias to avoid sticky contacts
    a.x -= ux * sep; a.y -= uy * sep;
    b.x += ux * sep; b.y += uy * sep;

    // reflect velocities along the collision normal if approaching
    const rvx = b.vx - a.vx;
    const rvy = b.vy - a.vy;
    const rel = rvx * ux + rvy * uy;
    if (rel < 0) {
      const j = -rel; // equal mass, perfectly elastic along normal
      a.vx -= ux * j; a.vy -= uy * j;
      b.vx += ux * j; b.vy += uy * j;
    }
  }

  function draw() {
    nodes.forEach(n => {
      n.el.style.left = (n.x - n.rx) + "px";
      n.el.style.top  = (n.y - n.ry) + "px";
    });
  }

  /* ---------- Egg rolling inside each bowl ---------- */
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
    const dt = Math.min(32, now - last); last = now;

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
  window.addEventListener("resize", seed);

  // leave-page micro transition
  stage.addEventListener("click", (e) => {
    const a = e.target.closest("a.bubble");
    if (!a) return;
    document.body.classList.add("leaving");
    a.classList.add("_clicked");
  });
});
