import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Keep high-DPI displays from multiplying fragment work by four. Adjust only
// drawing-buffer resolution; CSS layout, camera and character logic are unchanged.
// Never undersample native CSS pixels: a host frame-rate cap is not evidence
// that reducing scene resolution will help.
export function createResolutionController(renderer) {
  const maximum = Math.max(1, Math.min(devicePixelRatio, 1.5));
  renderer.setPixelRatio(maximum);
  let previous = 0, total = 0, count = 0, cooldown = 0;
  return timestamp => {
    const elapsed = timestamp - previous;
    previous = timestamp;
    if (document.hidden || elapsed <= 0 || elapsed > 100) { total = count = 0; return; }
    total += elapsed; count++;
    if (total < 1500) return;
    const average = total / count;
    total = count = 0;
    if (timestamp < cooldown) return;
    const current = renderer.getPixelRatio();
    const next = average > 17.8 ? Math.max(1, current - 0.125)
      : average < 12.5 ? Math.min(maximum, current + 0.125) : current;
    if (next !== current) { renderer.setPixelRatio(next); cooldown = timestamp + 3000; }
  };
}

// Bake only static room meshes. Animated leaves, lamp shade and instanced lights
// retain their original objects and materials for the existing animation loop.
export function batchStaticRoom(scene, excluded) {
  const groups = new Map();
  scene.updateMatrixWorld(true);
  // 组合家具也参与合批；变换烘焙到世界坐标后统一挂在场景根节点。
  const candidates = [];
  scene.traverse(mesh => candidates.push(mesh));
  for (const mesh of candidates) {
    if (!mesh.isMesh || mesh.isInstancedMesh || excluded.has(mesh) || Array.isArray(mesh.material)) continue;
    const { uuid, metadata, textures, images, ...properties } = mesh.material.toJSON();
    const key = JSON.stringify([properties, mesh.castShadow, mesh.receiveShadow, mesh.renderOrder]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(mesh);
  }
  for (const meshes of groups.values()) {
    if (meshes.length < 2) continue;
    const geometries = meshes.map(mesh => {
      const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      geometry.clearGroups();
      return geometry.applyMatrix4(mesh.matrixWorld);
    });
    const merged = mergeGeometries(geometries, false);
    geometries.forEach(geometry => geometry.dispose());
    if (!merged) continue;
    const first = meshes[0];
    const batch = new THREE.Mesh(merged, first.material);
    batch.name = 'Static room batch';
    batch.castShadow = first.castShadow;
    batch.receiveShadow = first.receiveShadow;
    batch.renderOrder = first.renderOrder;
    scene.add(batch);
    for (const mesh of meshes) { mesh.removeFromParent(); mesh.geometry.dispose(); }
  }
}
