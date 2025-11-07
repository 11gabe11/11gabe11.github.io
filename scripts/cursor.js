// scripts/cursor.js — inject & drive the pigeon cursor on any page
const USE_CUSTOM = matchMedia('(pointer: fine)').matches;
const VIEW_W = 120, VIEW_H = 80;   // SVG viewBox
const BEAK_X = 112, BEAK_Y = 40;   // hotspot inside viewBox

const SVG = `
  <svg viewBox="0 0 120 80" width="96" height="64" role="img" aria-label="Homing pigeon cursor">
    <defs>
      <linearGradient id="p-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#d0d4d8"/>
        <stop offset="60%" stop-color="#b3b8be"/>
        <stop offset="100%" stop-color="#959ba3"/>
      </linearGradient>
      <linearGradient id="p-wing" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#c7ccd1"/>
        <stop offset="50%" stop-color="#aab1b8"/>
        <stop offset="100%" stop-color="#8a929a"/>
      </linearGradient>
      <linearGradient id="p-neck" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%"   stop-color="#27ce80"/>
        <stop offset="55%"  stop-color="#32a6ee"/>
        <stop offset="100%" stop-color="#ad6bf0"/>
      </linearGradient>
    </defs>

    <path d="M14,52 30,47 30,57 Z" fill="url(#p-wing)" stroke="#2c3136" stroke-width="1"/>
    <ellipse cx="50" cy="50" rx="30" ry="18" fill="url(#p-body)" stroke="#2c3136" stroke-width="1"/>
    <path d="M66,36 C66,48 58,54 50,56 C52,48 56,45 60,40 C62,37 64,36 66,36 Z"
          fill="url(#p-neck)" opacity=".85"/>
    <circle cx="84" cy="40" r="10" fill="url(#p-body)" stroke="#2c3136" stroke-width="1"/>
    <circle cx="86.6" cy="38.2" r="1.8" fill="#0b0b0b"/>
    <circle cx="86.1" cy="37.9" r="0.6" fill="#ffffff" opacity=".9"/>
    <polygon id="wp-beak" points="88,40 112,36 112,44" fill="#e6c35a" stroke="#8b6b1f" stroke-width=".9"/>
    <g id="wp-wing-R">
      <path d="M48,40 C42,28 54,24 66,28 C58,28 53,31 52,34 C51,36 50,38 48,40 Z"
            fill="url(#p-wing)" stroke="#2c3136" stroke-width="1"/>
      <path d="M50,36 L59,30" stroke="#67707a" stroke-width="1" opacity=".7"/>
      <path d="M48,39 L57,33" stroke="#67707a" stroke-width="1" opacity=".6"/>
    </g>
    <g id="wp-wing-L">
      <path d="M48,40 C42,52 54,56 66,52 C58,52 53,49 52,46 C51,44 50,42 48,40 Z"
            fill="url(#p-wing)" stroke="#2c3136" stroke-width="1"/>
      <path d="M50,44 L59,50" stroke="#67707a" stroke-width="1" opacity=".6"/>
      <path d="M48,41 L57,47" stroke="#67707a" stroke-width="1" opacity=".5"/>
    </g>
    <ellipse cx="50" cy="60" rx="18" ry="5" fill="#000" opacity=".12"/>
  </svg>
`;

function mountCursor() {
  if (!USE_CUSTOM) return;

  // avoid duplicates
  if (document.getElementById('wp-cursor')) return;

  const wrap = document.createElement('div');
  wrap.id = 'wp-cursor';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = SVG;
  document.body.appendChild(wrap);

  let lastX = 0, lastY = 0, rafId = null;

  function place(x, y) {
    const r = wrap.getBoundingClientRect();
    const w = r.width || 32;
    const h = w * (VIEW_H / VIEW_W);
    const offX = w * (BEAK_X / VIEW_W);
    const offY = h * (BEAK_Y / VIEW_H);
    wrap.style.transform = `translate3d(${x - offX}px, ${y - offY}px, 0)`;
  }

  function onMove(e) {
    lastX = e.clientX; lastY = e.clientY;
    if (!rafId) rafId = requestAnimationFrame(() => { rafId = null; place(lastX, lastY); });
  }

  window.addEventListener('mousemove', onMove, { passive: true });
  window.addEventListener('mousemove', e => place(e.clientX, e.clientY), { once: true });
  window.addEventListener('mouseleave', () => {
    wrap.style.transform = 'translate3d(-9999px,-9999px,0)';
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountCursor);
} else {
  mountCursor();
}
