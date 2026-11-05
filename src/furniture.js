import * as THREE from 'three';

export function createFurniture(scene, tools) {
const { mat, box, cyl, blob, canvasTexture, rand, pick } = tools;
// 书架（后墙）
const wood = '#b98457', woodDark = '#9c6a43';
box(1.8, 2.6, 0.06, woodDark, -2.4, 0, -4.95);
box(0.08, 2.6, 0.55, wood, -3.26, 0, -4.7); box(0.08, 2.6, 0.55, wood, -1.54, 0, -4.7);
const bookColors = ['#e8735a', '#f2b84b', '#5f8fd8', '#7cbf8e', '#a37ad6', '#f29fb5', '#4fb3b0', '#efe1c6'];
[0.02, 0.66, 1.3, 1.94, 2.55].forEach((y, row) => {
  box(1.74, 0.06, 0.55, wood, -2.4, y, -4.7);
  if (row === 4) return;
  let x = -3.18;
  while (x < -1.7) {
    const bw = rand(0.09, 0.17), bh = rand(0.34, 0.52);
    if (x + bw > -1.62) break;
    const book = box(bw, bh, rand(0.32, 0.42), pick(bookColors), x + bw / 2, y + 0.06, -4.72);
    if (Math.random() < 0.12) { book.rotation.z = -0.18; x += 0.05; }
    x += bw + 0.012;
  }
});
const globe = blob(0.2, '#7fc7e8', 1, 1, 1, -2.0, 2.82, -4.7, scene, mat('#7fc7e8', { roughness: 0.4 }));
cyl(0.08, 0.12, 0.06, woodDark, -2.0, 2.61, -4.7);

// 书桌、电脑、凳子
box(2.8, 0.1, 1.25, wood, 1.4, 0.95, -4.25);
[[0.1, -3.7], [2.7, -3.7], [0.1, -4.8], [2.7, -4.8]].forEach(([x, z]) => box(0.1, 0.95, 0.1, woodDark, x, 0, z));
box(0.8, 0.45, 1.1, '#c99a6c', 2.25, 0.5, -4.25);
box(0.22, 0.05, 0.04, '#fffaf2', 2.25, 0.7, -3.68);
box(0.5, 0.04, 0.3, '#3a3a48', 1.4, 1.05, -4.55);
box(0.1, 0.32, 0.1, '#3a3a48', 1.4, 1.05, -4.6);
box(1.52, 0.97, 0.07, '#2c2c38', 1.4, 1.36, -4.62);
const screen = canvasTexture(512, 320, () => {});
const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.86), new THREE.MeshBasicMaterial({ map: screen.tex, toneMapped: false }));
screenMesh.position.set(1.4, 1.845, -4.58); scene.add(screenMesh);
const screenGlow = new THREE.PointLight('#9fb6ff', 0, 3.2); screenGlow.position.set(1.4, 1.8, -4.1); scene.add(screenGlow);
box(0.95, 0.04, 0.32, '#ece6dc', 1.3, 1.05, -3.95);
box(0.14, 0.04, 0.2, '#ece6dc', 2.05, 1.05, -3.95);
cyl(0.1, 0.09, 0.2, '#f2b84b', 2.5, 1.05, -4.0);
box(0.25, 0.01, 0.25, '#ffe27a', 0.45, 1.05, -3.95).rotation.y = 0.3;

// 床
box(1.9, 0.38, 3.0, wood, -3.95, 0, 2.0);
box(1.9, 1.15, 0.12, woodDark, -3.95, 0, 0.5);
box(1.8, 0.26, 2.85, '#f8f3ea', -3.95, 0.38, 2.05);
const pillow = blob(0.5, '#ffffff', 1.25, 0.28, 0.55, -3.95, 0.74, 0.95);
box(1.86, 0.09, 1.75, '#8fb0f0', -3.95, 0.6, 2.6);
box(1.88, 0.03, 0.12, '#ffffff', -3.95, 0.69, 1.78);

// 落地灯
cyl(0.3, 0.32, 0.05, '#3a3a48', -4.35, 0, -0.05);
cyl(0.03, 0.03, 1.8, '#3a3a48', -4.35, 0.05, -0.05);
const shadeMat = mat('#fff1d6', { emissive: '#ffcf86', emissiveIntensity: 0 });
const lampShade = cyl(0.22, 0.38, 0.45, shadeMat, -4.35, 1.75, -0.05);
lampShade.castShadow = false;
const lampLight = new THREE.PointLight('#ffc477', 0, 8, 1.4); lampLight.position.set(-4.35, 1.85, -0.05); scene.add(lampLight);

// 地毯、懒人沙发、植物
cyl(2.15, 2.15, 0.03, '#f0c4a8', 0.6, 0, 1.3, 48).castShadow = false;
cyl(1.6, 1.6, 0.035, '#f7dcc6', 0.6, 0, 1.3, 48).castShadow = false;
cyl(0.9, 0.9, 0.04, '#eaa98c', 0.6, 0, 1.3, 48).castShadow = false;
blob(1, '#f2b84b', 0.95, 0.45, 0.95, -2.9, 0.42, -1.3);
cyl(0.36, 0.27, 0.62, '#e8735a', 4.25, 0, -4.25);
const plantLeaves = [];
for (let i = 0; i < 7; i++) {
  const a = i / 7 * Math.PI * 2;
  const leaf = blob(0.5, i % 2 ? '#6aa36f' : '#5b9461', 0.22, 0.85, 0.12, 4.25 + Math.cos(a) * 0.22, 1.25, -4.25 + Math.sin(a) * 0.22);
  leaf.rotation.set(Math.sin(a) * 0.5, -a, Math.cos(a) * 0.5);
  plantLeaves.push(leaf);
}

// 墙上的串灯
const fairy = [];
for (let i = 0; i < 16; i++) {
  const t = i / 15, x = -4.6 + t * 9.2, y = 4.35 - Math.sin(t * Math.PI * 3) ** 2 * 0.25;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: '#d8c7a6' }));
  bulb.position.set(x, y, -4.92); scene.add(bulb); fairy.push(bulb);
}

return { screen, screenGlow, shadeMat, lampLight, plantLeaves, fairy };
}
