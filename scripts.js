// scripts.js — floating, colliding portal bubbles (no unlock)
document.addEventListener("DOMContentLoaded", () => {
  const stage = document.getElementById("stage");
  if (!stage) return;

  const bubbles = Array.from(stage.querySelectorAll(".bubble"));

  // helpers
  function pxFromPercent(pct, sizePx){ return (pct / 100) * sizePx; }

  let W = stage.clientWidth;
  let H = stage.clientHeight;

  // bubble state
// --- speed controls (px per millisecond) ---
const SPEED_MIN = 0.010;   // very slow
const SPEED_MAX = 0.030;   // still slow
function randSpeed(){ return (Math.random() * (SPEED_MAX - SPEED_MIN) + SPEED_MIN) * (Math.random() < 0.5 ? -1 : 1); }

const nodes = bubbles.map(el => ({
  el,
  x: 0, y: 0,
  vx: randSpeed(),
  vy: randSpeed(),
  r:  0
}));

  // initial layout
  function initializeLayout(){
    W = stage.clientWidth;
    H = stage.clientHeight;

    nodes.forEach(n => {
      const diameterPct = 22; // match --d in CSS
      const d = pxFromPercent(diameterPct, Math.min(W, H));
      n.r = d / 2;
    });

    const cols = 2, rows = 2;
    const pad = 12;

    nodes.forEach((n, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      n.x = (c + 0.5) * (W / cols) + (Math.random() * 20 - 10);
      n.y = (r + 0.5) * (H / rows) + (Math.random() * 20 - 10);
      n.x = Math.max(n.r + pad, Math.min(W - n.r - pad, n.x));
      n.y = Math.max(n.r + pad, Math.min(H - n.r - pad, n.y));
      n.el.style.position = "absolute";
      n.el.style.left = (n.x - n.r) + "px";
      n.el.style.top  = (n.y - n.r) + "px";
      n.el.style.willChange = "left, top";
    });
  }

  // collisions (equal mass, elastic)
  function resolveCollision(a, b){
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 0.0001;
    const overlap = a.r + b.r - dist;
    if (overlap <= 0) return;

    const nx = dx / dist, ny = dy / dist;
    const sep = overlap / 2 + 0.5;
    a.x -= nx * sep; a.y -= ny * sep;
    b.x += nx * sep; b.y += ny * sep;

    const rvx = b.vx - a.vx;
    const rvy = b.vy - a.vy;
    const rel = rvx * nx + rvy * ny;
    if (rel < 0){
      const j = -rel;
      a.vx -= nx * j; a.vy -= ny * j;
      b.vx += nx * j; b.vy += ny * j;
    }
  }

  // walls
  function contain(n){
    if (n.x - n.r <= 0){ n.x = n.r; n.vx = Math.abs(n.vx); }
    if (n.x + n.r >= W){ n.x = W - n.r; n.vx = -Math.abs(n.vx); }
    if (n.y - n.r <= 0){ n.y = n.r; n.vy = Math.abs(n.vy); }
    if (n.y + n.r >= H){ n.y = H - n.r; n.vy = -Math.abs(n.vy); }
  }

  function draw(){
    nodes.forEach(n => {
      n.el.style.left = (n.x - n.r) + "px";
      n.el.style.top  = (n.y - n.r) + "px";
    });
  }

  let last = performance.now();
  function tick(now){
    const dt = Math.min(32, now - last); // ms
    last = now;

    nodes.forEach(n => { n.x += n.vx * dt; n.y += n.vy * dt; contain(n); });

    for (let i = 0; i < nodes.length; i++){
      for (let j = i + 1; j < nodes.length; j++){
        resolveCollision(nodes[i], nodes[j]);
      }
    }

    draw();
    requestAnimationFrame(tick);
  }

  const ro = new ResizeObserver(() => initializeLayout());
  ro.observe(stage);

  initializeLayout();
  requestAnimationFrame(tick);

  console.log("✅ Floating bubbles active (no unlock).");
});
