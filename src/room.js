import * as THREE from 'three';

export function createRoom(scene, tools) {
const { mat, box, cyl, blob, canvasTexture, floorTex, rand, pick } = tools;
box(10, 0.3, 10, mat('#ffffff', { map: floorTex.tex }), 0, -0.3, 0);
box(0.3, 5.2, 10.3, '#f4e3cf', -5.15, -0.3, -0.15);   // 左墙
box(10.3, 5.2, 0.3, '#f7ead9', -0.15, -0.3, -5.15);   // 后墙
box(0.06, 1.25, 10, '#b9cfc0', -4.99, 0, 0);          // 护墙板
box(10, 1.25, 0.06, '#c3d6c8', 0, 0, -4.99);
box(0.1, 0.08, 10, '#fdf8f1', -4.96, 1.25, 0);
box(10, 0.08, 0.1, '#fdf8f1', 0, 1.25, -4.96);

// 窗户（左墙）
const sky = canvasTexture(256, 210, () => {});
const skyPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.8), new THREE.MeshBasicMaterial({ map: sky.tex, toneMapped: false }));
skyPlane.rotation.y = Math.PI / 2; skyPlane.position.set(-4.965, 2.65, -2.0); scene.add(skyPlane);
const frameColor = '#fffaf2';
box(0.14, 0.12, 2.42, frameColor, -4.93, 3.55, -2.0); box(0.14, 0.12, 2.42, frameColor, -4.93, 1.63, -2.0);
box(0.14, 1.92, 0.12, frameColor, -4.93, 1.69, -3.15); box(0.14, 1.92, 0.12, frameColor, -4.93, 1.69, -0.85);
box(0.1, 1.8, 0.06, frameColor, -4.94, 1.75, -2.0); box(0.1, 0.06, 2.2, frameColor, -4.94, 2.62, -2.0);
box(0.42, 0.07, 2.7, frameColor, -4.82, 1.58, -2.0);
box(0.08, 2.5, 0.55, '#e98f7c', -4.88, 1.3, -3.55); box(0.08, 2.5, 0.55, '#e98f7c', -4.88, 1.3, -0.45);
box(0.1, 0.06, 3.4, '#9b7a5a', -4.9, 3.85, -2.0);
const pot1 = cyl(0.13, 0.1, 0.18, '#d7775c', -4.75, 1.65, -1.3);
blob(0.16, '#6aa36f', 1, 0.9, 1, -4.75, 1.98, -1.3);

// 海报
const poster = canvasTexture(256, 200, (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#bfe6f5'); g.addColorStop(1, '#4f8fd0');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffffff99';
  for (let i = 0; i < 3; i++) { ctx.beginPath(); for (let x = 0; x <= w; x += 8) ctx.lineTo(x, 120 + i * 26 + Math.sin(x / 22 + i) * 6); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill(); }
  ctx.fillStyle = '#3f5fe0'; ctx.beginPath(); ctx.ellipse(128, 86, 52, 30, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(78, 86); ctx.lineTo(48, 66); ctx.lineTo(56, 104); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(150, 80, 5, 0, 7); ctx.fill();
  ctx.font = 'bold 22px "Microsoft YaHei", sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText('去大海', 18, 34);
});
box(1.36, 1.06, 0.05, '#fffaf2', -0.1, 2.75, -4.98);
const posterMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.24, 0.96), mat('#fff', { map: poster.tex }));
posterMesh.position.set(-0.1, 3.28, -4.945); scene.add(posterMesh);

// 墙上的钟
const clockTex = canvasTexture(256, 256, () => {});
const clockRim = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.08, 40), mat('#e98f7c'));
clockRim.rotation.x = Math.PI / 2; clockRim.position.set(3.7, 3.45, -4.96); scene.add(clockRim);
const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.42, 40), new THREE.MeshBasicMaterial({ map: clockTex.tex }));
clockFace.position.set(3.7, 3.45, -4.91); scene.add(clockFace);
function drawClock() {
  const { ctx } = clockTex, now = new Date();
  ctx.fillStyle = '#fffaf2'; ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#3b3446';
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ctx.beginPath(); ctx.arc(128 + Math.sin(a) * 100, 128 - Math.cos(a) * 100, i % 3 ? 4 : 7, 0, 7); ctx.fill(); }
  const hand = (angle, len, width, color) => { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(128, 128); ctx.lineTo(128 + Math.sin(angle) * len, 128 - Math.cos(angle) * len); ctx.stroke(); };
  const h = now.getHours() % 12 + now.getMinutes() / 60, m = now.getMinutes() + now.getSeconds() / 60;
  hand(h / 12 * Math.PI * 2, 55, 10, '#3b3446'); hand(m / 60 * Math.PI * 2, 82, 6, '#3b3446');
  hand(now.getSeconds() / 60 * Math.PI * 2, 88, 2, '#e8735a');
  clockTex.tex.needsUpdate = true;
}

return { sky, clockTex, drawClock };
}
