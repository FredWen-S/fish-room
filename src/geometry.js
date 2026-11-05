import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Bake only static room meshes. Animated leaves, lamp shade and instanced lights
// retain their original objects and materials for the existing animation loop.
export function batchStaticRoom(scene, excluded) {
  const groups = new Map();
  scene.updateMatrixWorld(true);
  for (const mesh of [...scene.children]) {
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
    for (const mesh of meshes) { scene.remove(mesh); mesh.geometry.dispose(); }
  }
}
