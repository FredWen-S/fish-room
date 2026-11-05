import * as THREE from 'three';

export function createFurniture(scene, tools) {
const { mat, box, cyl, blob, canvasTexture, rand, pick } = tools;

class RoundedBoxGeometry extends THREE.ExtrudeGeometry {
  constructor(width, height, depth, radius = 0.08) {
    const r = Math.min(radius, width / 2, height / 2);
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2 + r, -height / 2);
    shape.lineTo(width / 2 - r, -height / 2);
    shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + r);
    shape.lineTo(width / 2, height / 2 - r);
    shape.quadraticCurveTo(width / 2, height / 2, width / 2 - r, height / 2);
    shape.lineTo(-width / 2 + r, height / 2);
    shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - r);
    shape.lineTo(-width / 2, -height / 2 + r);
    shape.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + r, -height / 2);
    super(shape, { depth, bevelEnabled: true, bevelSegments: 2, bevelSize: r * 0.45, bevelThickness: r * 0.45, curveSegments: 2 });
    this.translate(0, 0, -depth / 2);
  }
}
const roundedBox = (w, h, d, material, x, y, z, radius = 0.08) => {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, radius), material instanceof THREE.Material ? material : mat(material));
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
};

// ── 共用材质（减少 draw calls）──────────────────────────
const wood     = '#b98457', woodDark = '#9c6a43', woodLight = '#d4b896';
const cream    = '#fffaf2', offWhite = '#f8f3ea';
const coralPink = '#f0a8a0', dustyBlue = '#8fb0f0', softGreen = '#a3c9a8';
const warmGray = '#3a3a48';

// ── 书架（后墙）────────────────────────────────────────
// 背板 + 侧板 + 隔板
box(1.8, 2.6, 0.06, woodDark, -2.4, 0, -4.95);
box(0.08, 2.6, 0.55, wood, -3.26, 0, -4.7);
box(0.08, 2.6, 0.55, wood, -1.54, 0, -4.7);

const bookColors = ['#e8735a', '#f2b84b', '#5f8fd8', '#7cbf8e', '#a37ad6', '#f29fb5', '#4fb3b0', '#efe1c6'];
[0.02, 0.66, 1.3, 1.94, 2.55].forEach((y, row) => {
  // 隔板（微圆角效果 - 用略厚板模拟）
  box(1.74, 0.07, 0.55, wood, -2.4, y, -4.7);
  if (row === 4) return;
  // 书本
  let x = -3.18;
  while (x < -1.7) {
    const bw = rand(0.09, 0.17), bh = rand(0.34, 0.52);
    if (x + bw > -1.62) break;
    const book = box(bw, bh, rand(0.32, 0.42), pick(bookColors), x + bw / 2, y + 0.07, -4.72);
    if (Math.random() < 0.12) { book.rotation.z = -0.18; x += 0.05; }
    x += bw + 0.012;
  }
  // 每层随机放一个小摆件
  if (row === 1) {
    // 小相框
    box(0.28, 0.36, 0.04, cream, -1.72, y + 0.07, -4.62);
    box(0.22, 0.30, 0.02, '#dce8f5', -1.72, y + 0.10, -4.59);
  }
  if (row === 2) {
    // 小仙人掌盆栽
    cyl(0.09, 0.08, 0.10, coralPink, -1.72, y + 0.07, -4.62);
    blob(0.08, '#6aa36f', 0.7, 1.4, 0.7, -1.72, y + 0.26, -4.62);
    blob(0.05, '#6aa36f', 1.0, 0.9, 0.7, -1.65, y + 0.34, -4.62);
  }
});

// 书架顶部地球仪
const globe = blob(0.2, '#7fc7e8', 1, 1, 1, -2.0, 2.82, -4.7, scene, mat('#7fc7e8', { roughness: 0.4 }));
cyl(0.08, 0.12, 0.06, woodDark, -2.0, 2.61, -4.7);
// 地球仪支架弧线
const arcMat = mat('#9c6a43', { roughness: 0.6 });
const arcMesh = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.012, 8, 16, Math.PI), arcMat);
arcMesh.position.set(-2.0, 2.82, -4.7);
arcMesh.rotation.y = Math.PI / 4;
scene.add(arcMesh);

// ── 书桌 + 电脑 + 桌面小物 ─────────────────────────────
// 桌面（日式圆角 — 用略厚板模拟圆润感）
roundedBox(2.8, 0.12, 1.25, wood, 1.4, 0.93, -4.25, 0.06);
// 桌腿（圆柱腿更温馨）
[[0.15, -3.72], [2.65, -3.72], [0.15, -4.78], [2.65, -4.78]].forEach(([x, z]) =>
  cyl(0.06, 0.06, 0.93, woodDark, x, 0, z));
// 小抽屉柜
box(0.8, 0.45, 1.1, '#c99a6c', 2.25, 0.5, -4.25);
box(0.22, 0.05, 0.04, cream, 2.25, 0.7, -3.68); // 抽屉把手

// 显示器
box(0.5, 0.04, 0.3, warmGray, 1.4, 1.05, -4.55);  // 底座
box(0.1, 0.32, 0.1, warmGray, 1.4, 1.05, -4.6);    // 支架
box(1.52, 0.97, 0.07, '#2c2c38', 1.4, 1.36, -4.62); // 屏幕壳
const screen = canvasTexture(512, 320, () => {});
const screenMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(1.4, 0.86),
  new THREE.MeshBasicMaterial({ map: screen.tex, toneMapped: false })
);
screenMesh.position.set(1.4, 1.845, -4.58);
scene.add(screenMesh);
const screenGlow = new THREE.PointLight('#9fb6ff', 0, 3.2);
screenGlow.position.set(1.4, 1.8, -4.1);
scene.add(screenGlow);

// 键盘 + 鼠标
box(0.95, 0.04, 0.32, '#ece6dc', 1.3, 1.05, -3.95);
box(0.14, 0.04, 0.2, '#ece6dc', 2.05, 1.05, -3.95);

// 主机（桌下左侧，避开抽屉柜和桌腿）
const pcCase = mat('#252936', { roughness: 0.32, metalness: 0.35 });
box(0.46, 0.68, 0.56, pcCase, 0.72, 0.37, -4.25);
box(0.28, 0.26, 0.012, '#30384a', 0.72, 0.56, -3.965);
box(0.12, 0.025, 0.012, '#8fb0f0', 0.72, 0.42, -3.964);
box(0.05, 0.025, 0.012, '#7cbf8e', 0.72, 0.35, -3.964);

// 办公椅（桌前，朝向显示器）
const chairFrame = mat('#353746', { roughness: 0.42, metalness: 0.28 });
const chairSeat = mat('#6e7895', { roughness: 0.72 });
roundedBox(0.92, 0.16, 0.82, chairSeat, 1.4, 0.63, -2.95, 0.08);
roundedBox(0.78, 0.95, 0.14, chairSeat, 1.4, 1.08, -2.59, 0.08);
box(0.08, 0.12, 0.72, chairFrame, 0.91, 0.72, -2.95);
box(0.08, 0.12, 0.72, chairFrame, 1.89, 0.72, -2.95);
cyl(0.07, 0.07, 0.48, chairFrame, 1.4, 0.27, -2.95);
cyl(0.24, 0.24, 0.06, chairFrame, 1.4, 0.04, -2.95, 16);
// 五星脚轮
[[1.4, -2.95], [1.73, -2.95], [1.07, -2.95], [1.4, -2.68], [1.4, -3.22]].forEach(([x, z]) => {
  box(0.34, 0.035, 0.045, chairFrame, (x + 1.4) / 2, 0.02, (z - 2.95) / 2 - 2.95);
  cyl(0.055, 0.055, 0.06, '#222532', x, -0.02, z, 10);
});

// 桌面装饰：马克杯（圆柱 + 把手）
cyl(0.1, 0.09, 0.2, '#f2b84b', 2.5, 1.05, -4.0);
// 杯子里的"咖啡"
cyl(0.085, 0.085, 0.01, '#6b4226', 2.5, 1.24, -4.0);

// 笔筒
cyl(0.07, 0.06, 0.18, coralPink, 0.55, 1.05, -4.55);
// 铅笔（细圆柱）
cyl(0.012, 0.012, 0.22, '#f2b84b', 0.55, 1.22, -4.55);
cyl(0.012, 0.012, 0.20, '#5f8fd8', 0.52, 1.22, -4.53);

// 便签纸
const stickyMat = mat('#fff6a6');
box(0.25, 0.01, 0.25, stickyMat, 0.45, 1.05, -3.95);
box(0.25, 0.01, 0.25, '#ffcce0', 0.48, 1.06, -3.93).rotation.y = 0.15;

// 桌上小盆栽
cyl(0.07, 0.06, 0.08, '#d4b896', 0.2, 1.05, -4.6);
blob(0.06, '#7cbf8e', 1, 1.2, 1, 0.2, 1.21, -4.6);

// ── 床 ─────────────────────────────────────────────────
// 床架（日式矮床框）
roundedBox(1.9, 0.38, 3.0, wood, -3.95, 0, 2.0, 0.12);
// 床头板（圆角 — 用略厚板 + 顶部圆柱边缘模拟）
box(1.9, 1.05, 0.12, woodDark, -3.95, 0, 0.5);
cyl(0.06, 0.06, 1.9, woodDark, -3.95, 1.05, 0.5);
// 床垫
roundedBox(1.8, 0.26, 2.85, offWhite, -3.95, 0.38, 2.05, 0.12);

// 枕头（两个，更温馨）
const pillow1 = blob(0.5, '#ffffff', 1.25, 0.28, 0.55, -3.6, 0.74, 0.95);
const pillow2 = blob(0.45, '#dce8f5', 1.1, 0.24, 0.5, -4.3, 0.72, 1.0);

// 被子 — 格子花纹条纹（用叠加的薄板模拟图案）
box(1.86, 0.09, 1.75, dustyBlue, -3.95, 0.6, 2.6);
// 被子上的条纹装饰
box(1.86, 0.005, 0.12, '#a3c0e8', -3.95, 0.655, 2.2);
box(1.86, 0.005, 0.12, '#a3c0e8', -3.95, 0.655, 3.0);
// 被边折痕
box(1.88, 0.03, 0.12, '#ffffff', -3.95, 0.69, 1.78);
// 小毛毯（搭在被子角上）
box(0.7, 0.04, 0.9, coralPink, -4.55, 0.64, 3.1);

// ── 落地灯 ─────────────────────────────────────────────
cyl(0.3, 0.32, 0.05, warmGray, -4.35, 0, -0.05);
cyl(0.03, 0.03, 1.8, warmGray, -4.35, 0.05, -0.05);
const shadeMat = mat('#fff1d6', { emissive: '#ffcf86', emissiveIntensity: 0 });
const lampShade = cyl(0.22, 0.38, 0.45, shadeMat, -4.35, 1.75, -0.05);
lampShade.castShadow = false;
const lampLight = new THREE.PointLight('#ffc477', 0, 8, 1.4);
lampLight.position.set(-4.35, 1.85, -0.05);
scene.add(lampLight);

// ── 地毯（同心圆 + 编织纹理环）───────────────────────
cyl(2.15, 2.15, 0.03, '#f0c4a8', 0.6, 0, 1.3, 48).castShadow = false;
cyl(1.6, 1.6, 0.035, '#f7dcc6', 0.6, 0, 1.3, 48).castShadow = false;
cyl(0.9, 0.9, 0.04, '#eaa98c', 0.6, 0, 1.3, 48).castShadow = false;
// 装饰环（模拟编织纹理的深色细环）
const rugRingGeo = new THREE.TorusGeometry(1.3, 0.025, 6, 48);
const rugRing = new THREE.Mesh(rugRingGeo, mat('#d49578'));
rugRing.rotation.x = -Math.PI / 2;
rugRing.position.set(0.6, 0.04, 1.3);
rugRing.castShadow = false;
scene.add(rugRing);

// ── 懒人沙发 + 靠垫 ────────────────────────────────────
blob(1, '#f2b84b', 0.95, 0.45, 0.95, -2.9, 0.42, -1.3);
// 沙发上的小靠垫
blob(0.25, coralPink, 1.1, 0.7, 0.8, -2.7, 0.72, -1.15);

// ── 植物 ────────────────────────────────────────────────
// 花盆 + 底碟
cyl(0.38, 0.3, 0.04, '#d4b896', 4.25, 0, -4.25, 24); // 底碟
cyl(0.36, 0.27, 0.62, '#e8735a', 4.25, 0.04, -4.25);
const plantLeaves = [];
for (let i = 0; i < 7; i++) {
  const a = i / 7 * Math.PI * 2;
  const leaf = blob(0.5, i % 2 ? '#6aa36f' : '#5b9461', 0.22, 0.85, 0.12,
    4.25 + Math.cos(a) * 0.22, 1.25, -4.25 + Math.sin(a) * 0.22);
  leaf.rotation.set(Math.sin(a) * 0.5, -a, Math.cos(a) * 0.5);
  plantLeaves.push(leaf);
}

// ── 墙面装饰 ────────────────────────────────────────────
// 左墙小挂钩 + 小包
cyl(0.03, 0.03, 0.08, woodDark, -4.92, 2.2, 1.8);
blob(0.12, '#c99a6c', 1, 1.2, 0.6, -4.85, 2.0, 1.8);

// 后墙 - 和纸风小挂饰（木棍 + 垂坠）
box(0.5, 0.03, 0.03, woodDark, 2.8, 3.8, -4.95);
// 挂饰垂线（三个小球）
[2.6, 2.8, 3.0].forEach((x, i) => {
  cyl(0.005, 0.005, 0.3 + i * 0.12, '#d4b896', x, 3.5 - i * 0.12, -4.93);
  blob(0.06, pick([coralPink, dustyBlue, softGreen]), 1, 1, 1, x, 3.18 - i * 0.12, -4.93);
});

// ── 地面小物 ─────────────────────────────────────────
// 地板坐垫（地毯旁，不挡路线）
cyl(0.4, 0.4, 0.08, '#e8735a', 2.8, 0, 2.0, 24);
cyl(0.32, 0.32, 0.09, '#f2b84b', 2.8, 0, 2.0, 24);

// 小边桌 + 蜡烛
cyl(0.25, 0.25, 0.45, woodLight, 3.8, 0, 1.5, 16);
cyl(0.22, 0.22, 0.02, woodDark, 3.8, 0.45, 1.5, 16);
// 蜡烛
cyl(0.04, 0.04, 0.15, cream, 3.8, 0.47, 1.5);
// 烛芯 + 小火焰
cyl(0.005, 0.005, 0.04, '#3b3446', 3.8, 0.62, 1.5);
const flameMat = mat('#ffb347', { emissive: '#ff8c00', emissiveIntensity: 0.8 });
blob(0.02, null, 0.8, 1.6, 0.8, 3.8, 0.68, 1.5, scene, flameMat);

// ── 串灯（后墙上方）──────────────────────────────────
const fairy = [];
const fairyMat = new THREE.MeshBasicMaterial({ color: '#d8c7a6' });
const fairyMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), fairyMat, 16);
const fairyDummy = new THREE.Object3D();
for (let i = 0; i < 16; i++) {
  const t = i / 15, x = -4.6 + t * 9.2, y = 4.35 - Math.sin(t * Math.PI * 3) ** 2 * 0.25;
  fairyDummy.position.set(x, y, -4.92);
  fairyDummy.updateMatrix();
  fairyMesh.setMatrixAt(i, fairyDummy.matrix);
  fairy.push({ x, y, material: fairyMat });
}
fairyMesh.instanceMatrix.needsUpdate = true;
scene.add(fairyMesh);
// 串灯线缆
const fairyLineMat = mat('#8c7a60');
for (let i = 0; i < 15; i++) {
  const t0 = i / 15, t1 = (i + 1) / 15;
  const x0 = -4.6 + t0 * 9.2, y0 = 4.35 - Math.sin(t0 * Math.PI * 3) ** 2 * 0.25;
  const x1 = -4.6 + t1 * 9.2, y1 = 4.35 - Math.sin(t1 * Math.PI * 3) ** 2 * 0.25;
  const dx = x1 - x0, dy = y1 - y0, len = Math.sqrt(dx * dx + dy * dy);
  const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, len, 4), fairyLineMat);
  wire.position.set((x0 + x1) / 2, (y0 + y1) / 2, -4.92);
  wire.rotation.z = Math.atan2(dx, dy);
  wire.castShadow = false;
  scene.add(wire);
}

return { screen, screenGlow, shadeMat, lampLight, plantLeaves, fairy };
}
