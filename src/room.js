import * as THREE from 'three';

export function createRoom(scene, tools) {
const { mat, box, cyl, blob, canvasTexture, floorTex, rand, pick } = tools;

// ── 地板 ──────────────────────────────────────────────
box(10, 0.3, 10, mat('#ffffff', { map: floorTex.tex }), 0, -0.3, 0);

// ── 墙壁 ──────────────────────────────────────────────
box(0.3, 5.2, 10.3, '#f4e3cf', -5.15, -0.3, -0.15);   // 左墙
box(10.3, 5.2, 0.3, '#f7ead9', -0.15, -0.3, -5.15);   // 后墙

// 护墙板 + 木条装饰（日式腰线）
box(0.06, 1.25, 10, '#b9cfc0', -4.99, 0, 0);
box(10, 1.25, 0.06, '#c3d6c8', 0, 0, -4.99);
// 腰线顶边
box(0.1, 0.08, 10, '#fdf8f1', -4.96, 1.25, 0);
box(10, 0.08, 0.1, '#fdf8f1', 0, 1.25, -4.96);

// ── 踢脚线 ────────────────────────────────────────────
box(0.04, 0.12, 10, '#9c6a43', -4.99, 0, 0);
box(10, 0.12, 0.04, '#9c6a43', 0, 0, -4.99);

// ── 窗户（左墙）────────────────────────────────────────
const sky = canvasTexture(256, 210, () => {});
const skyPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(2.2, 1.8),
  new THREE.MeshBasicMaterial({ map: sky.tex, toneMapped: false })
);
skyPlane.rotation.y = Math.PI / 2;
skyPlane.position.set(-4.965, 2.65, -2.0);
scene.add(skyPlane);

const frameColor = '#fffaf2';
// 窗框横杆
box(0.14, 0.12, 2.42, frameColor, -4.93, 3.55, -2.0);
box(0.14, 0.12, 2.42, frameColor, -4.93, 1.63, -2.0);
// 窗框竖杆
box(0.14, 1.92, 0.12, frameColor, -4.93, 1.69, -3.15);
box(0.14, 1.92, 0.12, frameColor, -4.93, 1.69, -0.85);
// 窗中横
box(0.1, 1.8, 0.06, frameColor, -4.94, 1.75, -2.0);
box(0.1, 0.06, 2.2, frameColor, -4.94, 2.62, -2.0);
// 窗台
box(0.42, 0.07, 2.7, frameColor, -4.82, 1.58, -2.0);

// 窗帘（短帘，日式）
box(0.08, 2.5, 0.55, '#e98f7c', -4.88, 1.3, -3.55);
box(0.08, 2.5, 0.55, '#e98f7c', -4.88, 1.3, -0.45);

// 窗帘杆
box(0.1, 0.06, 3.4, '#9b7a5a', -4.9, 3.85, -2.0);
// 窗帘杆头（小球装饰）
blob(0.06, '#9b7a5a', 1, 1, 1, -4.9, 3.88, -3.7);
blob(0.06, '#9b7a5a', 1, 1, 1, -4.9, 3.88, -0.3);

// 窗台小盆栽
const pot1 = cyl(0.13, 0.1, 0.18, '#d7775c', -4.75, 1.65, -1.3);
blob(0.16, '#6aa36f', 1, 0.9, 1, -4.75, 1.98, -1.3);
// 第二个小盆栽
cyl(0.10, 0.08, 0.14, '#b98457', -4.75, 1.65, -2.7);
blob(0.12, '#5b9461', 0.8, 1.1, 0.8, -4.75, 1.90, -2.7);

// ── 海报（后墙 - 鲸鱼主题）────────────────────────────
const poster = canvasTexture(256, 200, (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#bfe6f5');
  g.addColorStop(1, '#4f8fd0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // 小波浪
  ctx.fillStyle = '#ffffff99';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 8)
      ctx.lineTo(x, 120 + i * 26 + Math.sin(x / 22 + i) * 6);
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
  }
  // 鲸鱼
  ctx.fillStyle = '#3f5fe0';
  ctx.beginPath(); ctx.ellipse(128, 86, 52, 30, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(78, 86); ctx.lineTo(48, 66); ctx.lineTo(56, 104); ctx.fill();
  // 鲸鱼眼
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(150, 80, 5, 0, 7); ctx.fill();
  // 标题
  ctx.font = 'bold 22px "Microsoft YaHei", sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText('去大海', 18, 34);
  // 小鱼
  ctx.fillStyle = '#ffd36b';
  ctx.beginPath(); ctx.ellipse(200, 130, 10, 6, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(190, 130); ctx.lineTo(182, 124); ctx.lineTo(182, 136); ctx.fill();
});
// 海报框
box(1.36, 1.06, 0.05, '#fffaf2', -0.1, 2.75, -4.98);
const posterMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(1.24, 0.96),
  mat('#fff', { map: poster.tex })
);
posterMesh.position.set(-0.1, 3.28, -4.945);
scene.add(posterMesh);

// ── 墙上的钟 ──────────────────────────────────────────
const clockTex = canvasTexture(256, 256, () => {});
const clockRim = new THREE.Mesh(
  new THREE.CylinderGeometry(0.48, 0.48, 0.08, 40),
  mat('#e98f7c')
);
clockRim.rotation.x = Math.PI / 2;
clockRim.position.set(3.7, 3.45, -4.96);
scene.add(clockRim);
const clockFace = new THREE.Mesh(
  new THREE.CircleGeometry(0.42, 40),
  new THREE.MeshBasicMaterial({ map: clockTex.tex })
);
clockFace.position.set(3.7, 3.45, -4.91);
scene.add(clockFace);

function drawClock() {
  const { ctx } = clockTex, now = new Date();
  ctx.fillStyle = '#fffaf2';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#3b3446';
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(128 + Math.sin(a) * 100, 128 - Math.cos(a) * 100, i % 3 ? 4 : 7, 0, 7);
    ctx.fill();
  }
  const hand = (angle, len, width, color) => {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(128, 128);
    ctx.lineTo(128 + Math.sin(angle) * len, 128 - Math.cos(angle) * len);
    ctx.stroke();
  };
  const h = now.getHours() % 12 + now.getMinutes() / 60;
  const m = now.getMinutes() + now.getSeconds() / 60;
  hand(h / 12 * Math.PI * 2, 55, 10, '#3b3446');
  hand(m / 60 * Math.PI * 2, 82, 6, '#3b3446');
  hand(now.getSeconds() / 60 * Math.PI * 2, 88, 2, '#e8735a');
  clockTex.tex.needsUpdate = true;
}

// ── 左墙装饰 ──────────────────────────────────────────
// 小木框照片（窗户上方）
box(0.04, 0.45, 0.35, '#9c6a43', -4.97, 3.9, 2.0);
const photoTex = canvasTexture(128, 100, (ctx, w, h) => {
  // 温暖的渐变背景
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#ffd6a5'); g.addColorStop(1, '#ff9a76');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // 小房子
  ctx.fillStyle = '#ffffff'; ctx.fillRect(40, 50, 48, 40);
  ctx.fillStyle = '#e8735a'; ctx.beginPath();
  ctx.moveTo(34, 52); ctx.lineTo(64, 28); ctx.lineTo(94, 52); ctx.fill();
  // 小树
  ctx.fillStyle = '#6aa36f';
  ctx.beginPath(); ctx.arc(108, 64, 12, 0, 7); ctx.fill();
  ctx.fillStyle = '#9c6a43'; ctx.fillRect(106, 74, 4, 16);
});
const photoMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(0.28, 0.36),
  mat('#fff', { map: photoTex.tex })
);
photoMesh.rotation.y = Math.PI / 2;
photoMesh.position.set(-4.95, 4.125, 2.0);
scene.add(photoMesh);

// ── 天花板角落小装饰（和纸灯笼效果）────────────────────
const lanternMat = mat('#fff6e8', { emissive: '#ffcf86', emissiveIntensity: 0.15 });
blob(0.18, null, 1, 1.3, 1, 4.0, 4.5, 3.5, scene, lanternMat);
cyl(0.005, 0.005, 0.5, '#9c6a43', 4.0, 4.6, 3.5);

return { sky, clockTex, drawClock };
}
