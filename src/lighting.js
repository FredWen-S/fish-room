import * as THREE from 'three';

export function createLighting(scene, sky, room, rand) {
// ------------------------------------------------------------------ 光照与时间
scene.add(new THREE.AmbientLight('#ffffff', 0.25));
const hemi = new THREE.HemisphereLight('#fff6ea', '#b29a86', 0.8); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff1dc', 1.5);
sun.position.set(7, 13, 9); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
scene.add(sun);

function daylight(date = new Date()) {
  const override = Number(new URLSearchParams(location.search).get('hour'));
  const h = new URLSearchParams(location.search).has('hour') && Number.isFinite(override) && override >= 0 && override < 24 ? override : date.getHours() + date.getMinutes() / 60;
  const ramp = (a, b) => Math.min(1, Math.max(0, (h - a) / (b - a)));
  return Math.min(ramp(5.5, 8), 1 - ramp(17, 19.5));
}
function drawSky() {
  const { ctx } = sky, w = 256, h = 210, d = daylight(), hour = new URLSearchParams(location.search).has('hour') ? Number(new URLSearchParams(location.search).get('hour')) : new Date().getHours();
  const dusk = d > 0 && d < 1;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  if (d >= 1) { g.addColorStop(0, '#78c6f5'); g.addColorStop(1, '#d9f1ff'); }
  else if (dusk) { g.addColorStop(0, hour < 12 ? '#9cc7f0' : '#6d6fc4'); g.addColorStop(1, '#ffb38a'); }
  else { g.addColorStop(0, '#0d1638'); g.addColorStop(1, '#2b3270'); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  if (d < 0.5) {
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 40; i++) { ctx.globalAlpha = rand(0.3, 1); ctx.fillRect((i * 97) % w, (i * 53) % (h * 0.8), 2, 2); }
    ctx.globalAlpha = 1; ctx.fillStyle = '#fdf3c4'; ctx.beginPath(); ctx.arc(190, 52, 22, 0, 7); ctx.fill();
    ctx.fillStyle = '#1c2452'; ctx.beginPath(); ctx.arc(201, 45, 19, 0, 7); ctx.fill();
  } else {
    ctx.fillStyle = dusk ? '#ffd08a' : '#fff4b8'; ctx.beginPath(); ctx.arc(dusk ? 60 : 196, dusk ? 150 : 50, 24, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    [[60, 60], [150, 110]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 16, 0, 7); ctx.arc(x + 20, y - 8, 20, 0, 7); ctx.arc(x + 42, y, 15, 0, 7); ctx.fill(); });
  }
  ctx.fillStyle = d < 0.5 ? '#141a3a' : '#7fb08a';
  ctx.beginPath(); ctx.moveTo(0, h); for (let x = 0; x <= w; x += 16) ctx.lineTo(x, h - 28 - Math.sin(x / 30) * 10); ctx.lineTo(w, h); ctx.fill();
  if (d < 0.5) { ctx.fillStyle = '#ffd36b'; [[30, 185], [90, 190], [170, 183], [220, 192]].forEach(([x, y]) => ctx.fillRect(x, y, 5, 5)); }
  sky.tex.needsUpdate = true;
}
const light = { sun: 1.5, hemi: 0.8, lamp: 0, fairy: 0 };
function lightTargets() {
  const d = daylight(), resting = room().state === 'resting';
  return {
    sun: (0.25 + 1.35 * d) * (resting ? 0.55 : 1),
    hemi: (0.3 + 0.55 * d) * (resting ? 0.6 : 1),
    lamp: resting ? 2.6 : (1 - d) * 3.2,
    fairy: Math.max(1 - d, resting ? 0.8 : 0),
  };
}
function applyDayClass() { document.body.classList.toggle('night', daylight() < 0.4); }

return { sun, hemi, daylight, drawSky, light, lightTargets, applyDayClass };
}
