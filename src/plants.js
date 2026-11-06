import * as THREE from 'three';

// 三盆共用纹理和实例批次；叶片与叶柄通过同一变换更新，避免摇摆时脱节。
export function createPlantKit(scene, canvasTexture) {
  const leafMap = canvasTexture(512, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, h, w, 0);
    g.addColorStop(0, '#284e39'); g.addColorStop(0.48, '#568253'); g.addColorStop(1, '#95ae70');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const x = (Math.sin(i * 127.1) * 43758.5453 % 1 + 1) % 1;
      const y = (Math.sin(i * 311.7) * 19642.349 % 1 + 1) % 1;
      ctx.fillStyle = i % 2 ? '#edf3b308' : '#183f2709';
      ctx.fillRect(x * w, y * h, 2, 9);
    }
    ctx.strokeStyle = '#c0cf8c88'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(256, 512); ctx.quadraticCurveTo(248, 250, 256, 0); ctx.stroke();
    for (let side of [-1, 1]) for (let i = 1; i < 8; i++) {
      const y = 490 - i * 52;
      ctx.strokeStyle = '#c1d29955'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(256, y + 38);
      ctx.quadraticCurveTo(256 + side * 65, y, 256 + side * (190 - i * 11), y - 70); ctx.stroke();
    }
  }).tex;
  const soilMap = canvasTexture(256, 256, ctx => {
    ctx.fillStyle = '#392b24'; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1600; i++) {
      ctx.fillStyle = ['#554236', '#241f1b', '#76604a'][i % 3];
      const noise = n => ((Math.sin(n) * 43758.5453) % 1 + 1) % 1;
      ctx.beginPath(); ctx.ellipse(noise(i * 127.1) * 256, noise(i * 311.7) * 256, 1 + i % 3, 1.2, i, 0, Math.PI * 2); ctx.fill();
    }
  }).tex;
  const glazeMap = canvasTexture(256, 256, ctx => {
    ctx.fillStyle = '#efe2cc'; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 256; i++) {
      ctx.fillStyle = `rgba(158,130,99,${0.025 + 0.025 * Math.sin(i * 0.3)})`;
      ctx.fillRect(0, i, 256, 1);
    }
    for (let i = 0; i < 430; i++) { ctx.fillStyle = '#92775828'; ctx.fillRect(i * 63.7 % 256, i * 117.3 % 256, 1, 1); }
  }).tex;
  const ceramic = new THREE.MeshStandardMaterial({ map: glazeMap, roughness: 0.28, metalness: 0.03 });
  const soil = new THREE.MeshStandardMaterial({ map: soilMap, roughness: 1 });
  const green = new THREE.MeshStandardMaterial({ color: '#597345', roughness: 0.65 });
  const foliage = new THREE.MeshStandardMaterial({ map: leafMap, side: THREE.DoubleSide, roughness: 0.65 });

  // 手绘心形轮廓，四对深入叶缘的裂口和四个封闭孔洞，均为真实几何。
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(-0.12, -0.09, -0.43, -0.01, -0.44, 0.19);
  shape.quadraticCurveTo(-0.44, 0.25, -0.39, 0.30);
  shape.lineTo(-0.15, 0.22); shape.quadraticCurveTo(-0.12, 0.23, -0.15, 0.27);
  shape.lineTo(-0.46, 0.39); shape.quadraticCurveTo(-0.48, 0.45, -0.43, 0.51);
  shape.lineTo(-0.13, 0.38); shape.lineTo(-0.14, 0.43);
  shape.lineTo(-0.42, 0.61); shape.quadraticCurveTo(-0.40, 0.68, -0.35, 0.70);
  shape.lineTo(-0.10, 0.55); shape.lineTo(-0.10, 0.60);
  shape.lineTo(-0.29, 0.80); shape.quadraticCurveTo(-0.24, 0.86, -0.20, 0.88);
  shape.lineTo(-0.065, 0.72); shape.lineTo(-0.06, 0.78);
  shape.quadraticCurveTo(-0.08, 0.94, 0, 1.04);
  shape.quadraticCurveTo(0.15, 0.95, 0.23, 0.86);
  shape.lineTo(0.08, 0.73); shape.lineTo(0.10, 0.69);
  shape.lineTo(0.32, 0.77); shape.quadraticCurveTo(0.38, 0.72, 0.39, 0.65);
  shape.lineTo(0.12, 0.53); shape.lineTo(0.13, 0.48);
  shape.lineTo(0.45, 0.55); shape.quadraticCurveTo(0.48, 0.49, 0.45, 0.42);
  shape.lineTo(0.16, 0.34); shape.lineTo(0.17, 0.29);
  shape.lineTo(0.43, 0.34); shape.bezierCurveTo(0.49, 0.03, 0.16, -0.10, 0, 0);
  for (const [x, y, rx, ry] of [[-0.09,0.34,0.025,0.045],[0.08,0.44,0.023,0.05],[-0.07,0.65,0.018,0.035],[0.11,0.17,0.028,0.043]]) {
    const hole = new THREE.Path(); hole.absellipse(x, y, rx, ry, -0.25, Math.PI * 2 - 0.25, true); shape.holes.push(hole);
  }
  const geo = new THREE.ShapeGeometry(shape, 9);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    pos.setZ(i, 0.13 * Math.sin(y * Math.PI) - 0.22 * x * x - 0.08 * y * y);
    uv.setXY(i, x + 0.5, (y + 0.1) / 1.15);
  }
  geo.computeVertexNormals();
  const leavesMesh = new THREE.InstancedMesh(geo, foliage, 19);
  const stemsMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.009, 0.016, 1, 6), green, 19);
  leavesMesh.name = '龟背竹叶片实例'; stemsMesh.name = '龟背竹叶柄实例';
  for (const mesh of [leavesMesh, stemsMesh]) {
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.castShadow = mesh.receiveShadow = true;
    mesh.frustumCulled = false; scene.add(mesh);
  }
  const plantLeaves = [], stemDummy = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), direction = new THREE.Vector3();
  const profile = [[0,0.025],[0.25,0.025],[0.27,0.065],[0.34,0.52],[0.365,0.54],[0.365,0.59],[0.325,0.60],[0.31,0.55],[0.24,0.09],[0,0.09]].map(p => new THREE.Vector2(...p));
  const potGeo = new THREE.LatheGeometry(profile, 24);
  const saucerGeo = new THREE.LatheGeometry([[0,0],[0.37,0],[0.40,0.035],[0.40,0.07],[0.36,0.07],[0.34,0.035],[0,0.035]].map(p=>new THREE.Vector2(...p)),24);
  function add(geometry, material, origin, size, y = 0) {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.copy(origin); mesh.position.y += y * size;
    mesh.scale.setScalar(size); mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh); return mesh;
  }
  function build(x, y, z, size, count, main = false) {
    const origin = new THREE.Vector3(x, y, z);
    add(potGeo, ceramic, origin, size, 0.04); add(saucerGeo, ceramic, origin, size);
    const dirt = add(new THREE.CircleGeometry(0.315, 24), soil, origin, size, 0.585); dirt.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 5; i++) {
      const stone = add(new THREE.IcosahedronGeometry(0.035, 0), ceramic, origin, size, 0.60);
      stone.position.x += Math.cos(i * 2.4) * 0.23 * size; stone.position.z += Math.sin(i * 2.4) * 0.23 * size;
      stone.scale.y *= 0.55;
    }
    for (let i = 0; i < count; i++) {
      const a = i * 2.399 + 0.35, tier = i % 3;
      const leaf = new THREE.Object3D();
      leaf.position.set(x + Math.cos(a) * (0.23 + tier * 0.09) * size, y + (0.94 + tier * 0.26) * size, z + Math.sin(a) * (0.23 + tier * 0.09) * size);
      leaf.rotation.set(-0.3 - tier * 0.17, -a + 0.4, Math.sin(a) * 0.55);
      leaf.scale.set((0.55 + tier * 0.10) * size, (0.63 + (i % 4) * 0.075) * size, size);
      const index = plantLeaves.length;
      const root = new THREE.Vector3(x + Math.cos(a) * 0.06 * size, y + 0.58 * size, z + Math.sin(a) * 0.06 * size);
      leaf.userData = { basePosition: leaf.position.clone(), baseRotation: leaf.rotation.clone(), baseScale: leaf.scale.clone(), phase: i * 1.73, main, index,
        sync() {
          leaf.updateMatrix(); leavesMesh.setMatrixAt(index, leaf.matrix);
          stemDummy.position.copy(root).lerp(leaf.position, 0.5);
          direction.copy(leaf.position).sub(root);
          const length = direction.length();
          stemDummy.quaternion.setFromUnitVectors(up, direction.normalize());
          stemDummy.scale.set(size, length, size); stemDummy.updateMatrix(); stemsMesh.setMatrixAt(index, stemDummy.matrix);
          leavesMesh.instanceMatrix.needsUpdate = stemsMesh.instanceMatrix.needsUpdate = true;
        } };
      leaf.userData.sync(); plantLeaves.push(leaf);
    }
  }
  return { build, plantLeaves };
}
