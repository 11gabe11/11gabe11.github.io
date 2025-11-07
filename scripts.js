// scripts.js — Nests + physics + realistic twig ring + random eggs
document.addEventListener("DOMContentLoaded", () => {
  /* ===== Stage & nodes ===== */
  const stage = document.getElementById("stage");
  if (!stage) return;

  // Convert legacy .bubble anchors into nests if not already
  const items = Array.from(stage.querySelectorAll('.bubble'));
  items.forEach(el => el.classList.add('nest'));

  // Build nest internals (twigs + eggs + label already in HTML)
  items.forEach(el => {
    // clear any previous procedural twigs
    el.querySelectorAll('.twig').forEach(t => t.remove());

    // random eggs (0..3)
    const eggCount = Math.floor(Math.random() * 4); // 0,1,2,3
    el.classList.remove('eggs-0','eggs-1','eggs-2');
    el.classList.add(`eggs-${Math.min(eggCount,2)}`); // helpers hide >2
    // ensure 3 egg elements exist in DOM (lightweight)
    const have = el.querySelectorAll('.egg').length;
    for (let i = have; i < 3; i++) {
      const egg = document.createElement('i');
      egg.className = 'egg';
      el.appendChild(egg);
    }

    // Procedural twigs: three rings for depth
    const ringDefs = [
      { cls: 'back', count: 22, baseRot: 0,   spread: 190, y: 0.5,  z: 1 },
      { cls: 'mid',  count: 26, baseRot: 12,  spread: 200, y: 0.56, z: 2 },
      { cls: 'top',  count: 28, baseRot: -8,  spread: 210, y: 0.62, z: 3 },
    ];
    ringDefs.forEach(ring => {
      for (let i = 0; i < ring.count; i++) {
        const twig = document.createElement('b');
        twig.className = `twig ${ring.cls}`;

        // vary length/thickness/colour
        const len = 28 + Math.random()*36;     // px
        const thick = 2 + Math.random()*2.6;   // px
        const huePick = Math.random();
        const c1 = huePick < .33 ? getCSS('--twig-1') :
                   huePick < .66 ? getCSS('--twig-4') : getCSS('--twig-5');
        const c2 = huePick < .33 ? getCSS('--twig-2') :
                   huePick < .66 ? getCSS('--twig-3') : getCSS('--twig-2');

        twig.style.setProperty('--twig-l', `${len}px`);
        twig.style.setProperty('--twig-t', `${thick}px`);
        twig.style.setProperty('--twig-c1', c1);
        twig.style.setProperty('--twig-c2', c2);

        // place around rim
        const angle = (ring.baseRot + (i / ring.count) * ring.spread) + (Math.random()*6 - 3);
        const rad = angle * Math.PI / 180;
        const radiusPx = (el.offsetWidth/2) * 0.78;
        const cx = el.offsetWidth/2 + Math.cos(rad) * radiusPx;
        const cy = el.offsetHeight*ring.y + Math.sin(rad) * (radiusPx * 0.18);

        // small vertical wobble, slight curvature
        const tilt = (Math.random()*1.4 - 0.7);
        twig.style.left = `${cx}px`;
        twig.style.top  = `${cy}px`;
        twig.style.setProperty('--twig-tf', `translate(-50%,-50%) rotate(${angle+tilt}deg)`);

        el.appendChild(twig);
      }
    });
  });

  function getCSS(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#3a2d21';
  }

  /* ===== Gentle drift physics (same API as before) ===== */
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SPEED_MIN = prefersReducedMotion ? 0.012 : 0.016;
  const SPEED_MAX = prefersReducedMotion ? 0.018 : 0.022;

  function randSpeed(){ const v = Math.random()*(SPEED_MAX-SPEED_MIN)+SPEED_MIN; return (Math.random()<0.5?-v:v); }

  const nodes = items.map(el => ({ el, x:0, y:0, vx:randSpeed(), vy:randSpeed(), r:0 }));
  let W = stage.clientWidth, H = stage.clientHeight;

  function measure() {
    nodes.forEach(n => { n.r = n.el.getBoundingClientRect().width/2; });
    W = stage.clientWidth; H = stage.clientHeight;
  }

  function clamp(v,min,max){ return Math.max(min, Math.min(max,v)); }

  function seed() {
    measure();
    const cols=2, rows=2, pad=12;
    nodes.forEach((n,i)=>{
      const c=i%cols, r=Math.floor(i/cols);
      const cellW=W/cols, cellH=H/rows;
      n.x = (c+.5)*cellW + (Math.random()*20-10);
      n.y = (r+.5)*cellH + (Math.random()*20-10);
      n.x = clamp(n.x, n.r+pad, W-n.r-pad);
      n.y = clamp(n.y, n.r+pad, H-n.r-pad);
      n.el.style.left = (n.x - n.r) + "px";
      n.el.style.top  = (n.y - n.r) + "px";
    });
  }

  function contain(n){
    if (n.x - n.r <= 0) { n.x = n.r; n.vx = Math.abs(n.vx); }
    if (n.x + n.r >= W) { n.x = W - n.r; n.vx = -Math.abs(n.vx); }
    if (n.y - n.r <= 0) { n.y = n.r; n.vy = Math.abs(n.vy); }
    if (n.y + n.r >= H) { n.y = H - n.r; n.vy = -Math.abs(n.vy); }
  }

  function collide(a,b){
    const dx=b.x-a.x, dy=b.y-a.y;
    const dist=Math.hypot(dx,dy)||0.0001;
    const overlap=a.r+b.r-dist; if (overlap<=0) return;
    const nx=dx/dist, ny=dy/dist;
    const sep=overlap/2+0.5; a.x-=nx*sep; a.y-=ny*sep; b.x+=nx*sep; b.y+=ny*sep;
    const rvx=b.vx-a.vx, rvy=b.vy-a.vy;
    const rel=rvx*nx + rvy*ny;
    if (rel<0){ const j=-rel; a.vx-=nx*j; a.vy-=ny*j; b.vx+=nx*j; b.vy+=ny*j; }
  }

  function draw(){ nodes.forEach(n=>{ n.el.style.left=(n.x-n.r)+"px"; n.el.style.top=(n.y-n.r)+"px"; }); }

  let last=performance.now();
  function tick(now){
    const dt=Math.min(32, now-last); last=now;
    nodes.forEach(n=>{ n.x+=n.vx*dt; n.y+=n.vy*dt; contain(n); });
    for(let i=0;i<nodes.length;i++) for(let j=i+1;j<nodes.length;j++) collide(nodes[i],nodes[j]);
    draw(); requestAnimationFrame(tick);
  }

  seed(); requestAnimationFrame(tick);
  new ResizeObserver(seed).observe(stage);

  /* ===== Optional: body class on link click for micro transition ===== */
  stage.addEventListener('click', (e)=>{
    const a = e.target.closest('a.bubble');
    if(!a) return;
    document.body.classList.add('leaving');
    a.classList.add('_clicked');
  });
});
