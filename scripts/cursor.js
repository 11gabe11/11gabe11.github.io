// scripts/cursor.js — realistic homing pigeon cursor (SVG)
const USE_CUSTOM = matchMedia('(pointer: fine)').matches;
const VIEW_W = 150, VIEW_H = 96;     // SVG viewBox
const BEAK_X = 138, BEAK_Y = 46;     // hotspot at beak tip

const SVG = `
<svg viewBox="0 0 150 96" role="img" aria-label="Homing pigeon cursor">
  <defs>
    <!-- slate body -->
    <linearGradient id="g-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#c9ced3"/>
      <stop offset="55%" stop-color="#a7aeb6"/>
      <stop offset="100%" stop-color="#8e969f"/>
    </linearGradient>
    <!-- darker mantle/wing -->
    <linearGradient id="g-mantle" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#b5bac0"/>
      <stop offset="60%" stop-color="#969ea8"/>
      <stop offset="100%" stop-color="#7e8791"/>
    </linearGradient>
    <!-- neck iridescence -->
    <linearGradient id="g-neck" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#1dd086"/>
      <stop offset="40%"  stop-color="#2aa0f0"/>
      <stop offset="80%"  stop-color="#9d6af2"/>
      <stop offset="100%" stop-color="#c0a7ff"/>
    </linearGradient>
    <!-- tail bars -->
    <linearGradient id="g-tail" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#9aa2ab"/>
      <stop offset="70%"  stop-color="#4e545b"/>
      <stop offset="100%" stop-color="#2f343a"/>
    </linearGradient>
  </defs>

  <!-- shadow -->
  <ellipse cx="78" cy="78" rx="22" ry="6" fill="#000" opacity=".14"></ellipse>

  <!-- tail -->
  <g id="tail">
    <path d="M58,64 L92,64 L102,70 L56,70 Z" fill="url(#g-tail)" stroke="#2c3136" stroke-width="1" />
  </g>

  <!-- body -->
  <ellipse cx="58" cy="56" rx="34" ry="22" fill="url(#g-body)" stroke="#2c3136" stroke-width="1"/>

  <!-- neck / breast -->
  <path d="M70,32 C72,46 64,56 58,58 C60,50 62,46 66,40 C68,36 69,33 70,32 Z"
        fill="url(#g-neck)" opacity=".95"></path>

  <!-- head -->
  <g id="head">
    <circle cx="98" cy="46" r="11" fill="url(#g-body)" stroke="#2c3136" stroke-width="1"/>
    <!-- eye: orange with pale orbital ring and highlight -->
    <circle cx="101.4" cy="43.6" r="3.2" fill="#f28b28"></circle>
    <circle cx="101.4" cy="43.6" r="4.5" fill="none" stroke="#f4eadc" stroke-width="1.2" opacity=".9"></circle>
    <circle cx="100.7" cy="42.9" r="1.0" fill="#fff" opacity=".9"></circle>
    <!-- cere (pale) + two-tone beak -->
    <path d="M104,45 C108,44 112,44 116,45 C116,45 136,43 138,46 C136,49 116,48 112,49 C110,49 108,49 104,48 Z"
          fill="#e8e0d6" opacity=".95"></path>
    <path d="M114,46 L138,44 L138,48 L114,49 Z" fill="#d5c79e" stroke="#8b6b1f" stroke-width="0.9"></path>
  </g>

  <!-- near wing -->
  <g id="wing-L">
    <path d="M50,56 C38,70 52,76 74,72 C60,72 54,66 52,62 C51,60 50,58 50,56 Z"
          fill="url(#g-mantle)" stroke="#2c3136" stroke-width="1"/>
    <!-- feather hints -->
    <path d="M52,60 L68,68" stroke="#6c7580" stroke-width="1" opacity=".6"/>
    <path d="M50,58 L66,66" stroke="#6c7580" stroke-width="1" opacity=".5"/>
  </g>

  <!-- far wing -->
  <g id="wing-R">
    <path d="M50,56 C40,40 54,36 76,40 C62,40 56,44 54,48 C52,52 51,54 50,56 Z"
          fill="url(#g-mantle)" stroke="#2c3136" stroke-width="1"/>
    <path d="M52,50 L68,42" stroke="#6c7580" stroke-width="1" opacity=".7"/>
    <path d="M50,54 L66,46" stroke="#6c7580" stroke-width="1" opacity=".6"/>
  </g>
</svg>
`;

function mountCursor() {
  if (!USE_CUSTOM) return;
  if (document.getElementById('wp-cursor')) return;

  const wrap = document.createElement('div');
  wrap.id = 'wp-cursor';
  wrap.setAttribute('aria-hidden','true');
  wrap.innerHTML = SVG;
  document.body.appendChild(wrap);

  let lastX=0,lastY=0,rafId=null;

  function place(x,y){
    const r = wrap.getBoundingClientRect();
    const w = r.width || 36;
    const h = w * (VIEW_H/VIEW_W);
    const offX = w * (BEAK_X/VIEW_W);
    const offY = h * (BEAK_Y/VIEW_H);
    wrap.style.transform = `translate3d(${x-offX}px, ${y-offY}px, 0)`;
  }

  function onMove(e){
    lastX=e.clientX; lastY=e.clientY;
    if(!rafId) rafId=requestAnimationFrame(()=>{ rafId=null; place(lastX,lastY); });
  }

  window.addEventListener('mousemove', onMove, { passive:true });
  window.addEventListener('mousemove', e=>place(e.clientX, e.clientY), { once:true });
  window.addEventListener('mouseleave', ()=>{ wrap.style.transform='translate3d(-9999px,-9999px,0)'; });
}

if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', mountCursor);
else mountCursor();
