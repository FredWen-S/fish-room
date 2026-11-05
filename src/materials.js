import * as THREE from 'three';

export function createMaterials(scene, rand, pick) {
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...extra });
function shade(mesh) { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; }
function box(w, h, d, material, x, y, z, parent = scene) {
  const mesh = shade(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material instanceof THREE.Material ? material : mat(material)));
  mesh.position.set(x, y + h / 2, z); parent.add(mesh); return mesh;
}
function cyl(rt, rb, h, material, x, y, z, seg = 24) {
  const mesh = shade(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material instanceof THREE.Material ? material : mat(material)));
  mesh.position.set(x, y + h / 2, z); scene.add(mesh); return mesh;
}
function blob(r, color, sx, sy, sz, x, y, z, parent = scene, material) {
  const mesh = shade(new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), material || mat(color)));
  mesh.scale.set(sx, sy, sz); mesh.position.set(x, y, z); parent.add(mesh); return mesh;
}
function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return { tex, ctx, canvas: c };
}
function wrapText(ctx, text, maxWidth) {
  const lines = []; let line = '';
  for (const ch of String(text)) {
    if (ch === '\n') { lines.push(line); line = ''; continue; }
    if (ctx.measureText(line + ch).width > maxWidth && line) { lines.push(line); line = ch; } else line += ch;
  }
  lines.push(line); return lines;
}
const floorTex = canvasTexture(512, 512, (ctx, w, h) => {
  const tones = ['#d9a878', '#d29f6f', '#dcae80', '#cf9a69'];
  for (let row = 0; row < 8; row++) {
    let x = row % 2 ? -90 : 0;
    while (x < w) {
      const len = rand(150, 260);
      ctx.fillStyle = pick(tones); ctx.fillRect(x, row * 64, len, 64);
      ctx.fillStyle = 'rgba(90,50,20,.18)'; ctx.fillRect(x, row * 64, 2, 64);
      x += len;
    }
    ctx.fillStyle = 'rgba(90,50,20,.22)'; ctx.fillRect(0, row * 64, w, 2);
  }
});
floorTex.tex.wrapS = floorTex.tex.wrapT = THREE.RepeatWrapping; floorTex.tex.repeat.set(2, 2);
return { mat, shade, box, cyl, blob, canvasTexture, floorTex };
}
