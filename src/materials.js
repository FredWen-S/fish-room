import * as THREE from 'three';

export function createMaterials(scene, rand, pick) {
// ------------------------------------------------------------------ 程序化纹理与辅助工具
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

// 1. 地板：日系暖橡木拼接地板（漫反射 Diffuse、粗糙度 Roughness Map、法线微法向 Normal Map）
const plankLayout = []; // 记录地板接缝布局以保证 Diffuse、Roughness、Normal 完全对齐
const rowH = 64;
for (let row = 0; row < 8; row++) {
  const y = row * rowH;
  let x = (row % 2) ? -110 : 0;
  const rowPlanks = [];
  while (x < 512) {
    const len = Math.floor(rand(175, 275));
    rowPlanks.push({ x, y, len, w: len });
    x += len;
  }
  plankLayout.push(rowPlanks);
}

// 1a. 地板 Diffuse 贴图
const floorTex = canvasTexture(512, 512, (ctx, w, h) => {
  const tones = ['#e0bb94', '#d7ad83', '#e6c39f', '#cc9c6f', '#e3bf9b'];
  ctx.fillStyle = '#cc9a6b'; ctx.fillRect(0, 0, w, h);
  plankLayout.forEach((rowPlanks, row) => {
    const y = row * rowH;
    rowPlanks.forEach(({ x, len }, idx) => {
      ctx.fillStyle = tones[(row * 3 + idx) % tones.length];
      ctx.fillRect(x, y, len, rowH);

      // 细腻天然木纹
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y, len, rowH); ctx.clip();
      for (let g = 0; g < 16; g++) {
        const gy = y + rand(2, rowH - 2);
        ctx.strokeStyle = rand(0, 1) > 0.45 ? 'rgba(105,60,25,0.075)' : 'rgba(255,245,230,0.14)';
        ctx.lineWidth = rand(0.7, 1.6);
        ctx.beginPath();
        ctx.moveTo(x, gy);
        ctx.bezierCurveTo(x + len * 0.35, gy + rand(-4, 4), x + len * 0.65, gy + rand(-4, 4), x + len, gy + rand(-2, 2));
        ctx.stroke();
      }
      ctx.restore();

      // 木板垂直接缝
      ctx.fillStyle = 'rgba(65,36,15,0.26)'; ctx.fillRect(x + len - 2, y, 2, rowH);
      ctx.fillStyle = 'rgba(255,250,240,0.24)'; ctx.fillRect(x + len, y, 1, rowH);
    });
    // 水平接缝与高光倒角
    ctx.fillStyle = 'rgba(55,30,12,0.30)'; ctx.fillRect(0, y + rowH - 2, w, 2);
    ctx.fillStyle = 'rgba(255,250,240,0.28)'; ctx.fillRect(0, y, w, 1);
  });
});
floorTex.tex.wrapS = floorTex.tex.wrapT = THREE.RepeatWrapping;
floorTex.tex.repeat.set(2, 2);

// 1b. 地板 Roughness Map（数据贴图必须使用 THREE.NoColorSpace）
const floorRoughnessTex = canvasTexture(512, 512, (ctx, w, h) => {
  ctx.fillStyle = '#787878'; ctx.fillRect(0, 0, w, h);
  plankLayout.forEach((rowPlanks, row) => {
    const y = row * rowH;
    rowPlanks.forEach(({ x, len }, idx) => {
      const plankRough = 105 + ((row * 5 + idx * 7) % 30);
      ctx.fillStyle = `rgb(${plankRough},${plankRough},${plankRough})`;
      ctx.fillRect(x + 1, y + 1, len - 2, rowH - 2);

      ctx.save();
      ctx.beginPath(); ctx.rect(x, y, len, rowH); ctx.clip();
      for (let g = 0; g < 10; g++) {
        const gy = y + rand(2, rowH - 2);
        ctx.strokeStyle = 'rgba(150,150,150,0.18)';
        ctx.lineWidth = rand(0.8, 1.8);
        ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + len, gy + rand(-3, 3)); ctx.stroke();
      }
      ctx.restore();

      ctx.fillStyle = '#dedede';
      ctx.fillRect(x + len - 2, y, 3, rowH);
    });
    ctx.fillStyle = '#dedede';
    ctx.fillRect(0, y + rowH - 2, w, 3);
  });
});
floorRoughnessTex.tex.colorSpace = THREE.NoColorSpace;
floorRoughnessTex.tex.wrapS = floorRoughnessTex.tex.wrapT = THREE.RepeatWrapping;
floorRoughnessTex.tex.repeat.set(2, 2);

// 1c. 地板 Normal Map（数据贴图必须使用 THREE.NoColorSpace）
const floorNormalTex = canvasTexture(512, 512, (ctx, w, h) => {
  ctx.fillStyle = '#8080ff'; ctx.fillRect(0, 0, w, h);
  plankLayout.forEach((rowPlanks, row) => {
    const y = row * rowH;
    rowPlanks.forEach(({ x, len }) => {
      ctx.fillStyle = 'rgb(160, 128, 255)'; ctx.fillRect(x + len - 2, y, 1, rowH);
      ctx.fillStyle = 'rgb(96, 128, 255)'; ctx.fillRect(x + len, y, 1, rowH);

      for (let g = 0; g < 6; g++) {
        const gy = y + rand(4, rowH - 4);
        ctx.strokeStyle = rand(0, 1) > 0.5 ? 'rgb(134, 134, 255)' : 'rgb(122, 122, 255)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + len, gy + rand(-2, 2)); ctx.stroke();
      }
    });
    ctx.fillStyle = 'rgb(128, 160, 255)'; ctx.fillRect(0, y + rowH - 2, w, 1);
    ctx.fillStyle = 'rgb(128, 96, 255)'; ctx.fillRect(0, y, w, 1);
  });
});
floorNormalTex.tex.colorSpace = THREE.NoColorSpace;
floorNormalTex.tex.wrapS = floorNormalTex.tex.wrapT = THREE.RepeatWrapping;
floorNormalTex.tex.repeat.set(2, 2);

// 2. 墙面：日系奶油白和纸暗纹墙纸（优化至 256x256 节省显存）
const wallTex = canvasTexture(256, 256, (ctx, w, h) => {
  ctx.fillStyle = '#fbf5eb'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(190,165,140,0.06)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 3) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + rand(-0.4, 0.4), h); ctx.stroke();
  }
  for (let y = 0; y < h; y += 4) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + rand(-0.4, 0.4)); ctx.stroke();
  }
  for (let i = 0; i < 100; i++) {
    ctx.fillStyle = rand(0, 1) > 0.5 ? 'rgba(165,135,105,0.05)' : 'rgba(255,255,255,0.38)';
    ctx.fillRect(rand(0, w), rand(0, h), rand(1, 2), rand(1, 2));
  }
});
wallTex.tex.wrapS = wallTex.tex.wrapT = THREE.RepeatWrapping;
wallTex.tex.repeat.set(3, 2);

// 3. 护墙板：日系雾绿板条纹理（垂直木槽与柔光，256x256）
const wainscotTex = canvasTexture(256, 256, (ctx, w, h) => {
  ctx.fillStyle = '#a6c3b0'; ctx.fillRect(0, 0, w, h);
  const slatW = 32;
  for (let x = 0; x < w; x += slatW) {
    ctx.fillStyle = 'rgba(235,248,240,0.09)'; ctx.fillRect(x + 2, 0, slatW - 4, h);
    ctx.fillStyle = 'rgba(40,65,50,0.26)'; ctx.fillRect(x, 0, 2.5, h);
    ctx.fillStyle = 'rgba(255,255,255,0.30)'; ctx.fillRect(x + 2.5, 0, 1.5, h);
  }
});
wainscotTex.tex.wrapS = wainscotTex.tex.wrapT = THREE.RepeatWrapping;
wainscotTex.tex.repeat.set(4, 1);

// 4. 家具木纹：温暖焦糖/原木（书桌、书架、床身，优化至 256x256）
const furnitureWoodTex = canvasTexture(256, 256, (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#b98356'); g.addColorStop(0.5, '#ab7649'); g.addColorStop(1, '#bb8558');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 32; i++) {
    const y = rand(0, h);
    ctx.strokeStyle = rand(0, 1) > 0.5 ? 'rgba(85,45,15,0.11)' : 'rgba(255,240,215,0.15)';
    ctx.lineWidth = rand(1, 2.2);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(w * 0.35, y + rand(-8, 8), w * 0.7, y + rand(-8, 8), w, y + rand(-6, 6));
    ctx.stroke();
  }
});
furnitureWoodTex.tex.wrapS = furnitureWoodTex.tex.wrapT = THREE.RepeatWrapping;
furnitureWoodTex.tex.repeat.set(2, 2);

// 5. 地毯：分层编织同心螺旋粗麻毛线纹理（优化至 256x256 释放显存）
function createRugTexture(baseColor, accentColor) {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const cx = w / 2, cy = h / 2;
    ctx.fillStyle = baseColor; ctx.fillRect(0, 0, w, h);
    for (let r = 8; r < cx; r += 5.5) {
      const circum = 2 * Math.PI * r;
      const stitches = Math.floor(circum / 7.5);
      for (let s = 0; s < stitches; s++) {
        const a = (s / stitches) * Math.PI * 2;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        ctx.save();
        ctx.translate(x, y); ctx.rotate(a + Math.PI / 4);
        ctx.fillStyle = (s % 2 === 0) ? 'rgba(255,250,242,0.35)' : accentColor;
        ctx.fillRect(-1.5, -0.8, 3, 2);
        ctx.restore();
      }
    }
  }).tex;
}
const rugOuterTex = createRugTexture('#efa892', 'rgba(150,85,65,0.24)');
const rugMidTex = createRugTexture('#f7edd9', 'rgba(180,140,110,0.18)');
const rugInnerTex = createRugTexture('#e2947d', 'rgba(140,75,55,0.26)');

// 6. 布料/被子：细腻华夫格织物感（256x256）
const fabricTex = canvasTexture(256, 256, (ctx, w, h) => {
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 1.2;
  for (let i = -w; i < w * 2; i += 6) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i + h, 0); ctx.lineTo(i, h); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  for (let i = -w; i < w * 2; i += 6) {
    ctx.beginPath(); ctx.moveTo(i + 3, 0); ctx.lineTo(i + 3 + h, h); ctx.stroke();
  }
});
fabricTex.tex.wrapS = fabricTex.tex.wrapT = THREE.RepeatWrapping;
fabricTex.tex.repeat.set(4, 4);

// 7. 书脊贴图生成器（优化至 64x128，带日系治愈书名、烫金线条）
const bookTexCache = {};
function getBookSpineTexture(color) {
  if (bookTexCache[color]) return bookTexCache[color];
  const texObj = canvasTexture(64, 128, (ctx, w, h) => {
    ctx.fillStyle = color; ctx.fillRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.28)');
    g.addColorStop(0.16, 'rgba(0,0,0,0)');
    g.addColorStop(0.84, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    // 烫金边框与装饰线
    ctx.strokeStyle = '#f8d67c'; ctx.lineWidth = 2;
    ctx.strokeRect(5, 8, w - 10, h - 16);
    ctx.beginPath();
    ctx.moveTo(5, 20); ctx.lineTo(w - 5, 20);
    ctx.moveTo(5, h - 20); ctx.lineTo(w - 5, h - 20);
    ctx.stroke();

    ctx.fillStyle = '#fae19c';
    ctx.beginPath(); ctx.arc(w / 2, 14, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(w / 2, h - 14, 2.5, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    for (let y = 30; y < h - 30; y += 12) {
      const barW = rand(14, w - 18);
      ctx.fillRect((w - barW) / 2, y, barW, 5);
    }
  });
  bookTexCache[color] = texObj.tex;
  return texObj.tex;
}

// ------------------------------------------------------------------ 材质构建核心与对齐接口
const mat = (colorOrType, extra = {}) => {
  if (typeof colorOrType === 'string') {
    const key = colorOrType.toLowerCase();
    if (key === 'wood' || key === '#b98457') return new THREE.MeshStandardMaterial({ color: '#b88356', map: furnitureWoodTex.tex, roughness: 0.46, metalness: 0.02, ...extra });
    if (key === 'wooddark' || key === '#9c6a43') return new THREE.MeshStandardMaterial({ color: '#98663d', map: furnitureWoodTex.tex, roughness: 0.46, metalness: 0.02, ...extra });
    if (key === 'wall' || key === '#f4e3cf' || key === '#f7ead9') return new THREE.MeshStandardMaterial({ color: '#fbf5ee', map: wallTex.tex, roughness: 0.92, metalness: 0.0, ...extra });
    if (key === 'wainscot' || key === 'sage' || key === '#b9cfc0' || key === '#c3d6c8') return new THREE.MeshStandardMaterial({ color: '#a3c2ad', map: wainscotTex.tex, roughness: 0.65, metalness: 0.02, ...extra });
    if (key === 'ceramic' || key === 'pot' || key === '#d7775c' || key === '#e8735a') return new THREE.MeshStandardMaterial({ color: '#d86d52', roughness: 0.22, metalness: 0.04, ...extra });
    if (key === 'metal' || key === '#3a3a48' || key === '#2c2c38') return new THREE.MeshStandardMaterial({ color: '#32323c', roughness: 0.30, metalness: 0.82, ...extra });
    if (key === 'fabric' || key === 'coral' || key === '#e98f7c') return new THREE.MeshStandardMaterial({ color: '#eb8b78', roughness: 0.78, metalness: 0.02, ...extra });
    if (key === 'quilt' || key === '#8fb0f0') return new THREE.MeshStandardMaterial({ color: '#eb8f7c', map: fabricTex.tex, roughness: 0.88, metalness: 0.0, ...extra });
    if (key === 'trim' || key === 'cream' || key === '#fffaf2' || key === '#fdf8f1' || key === '#ffffff') return new THREE.MeshStandardMaterial({ color: '#fffbf5', roughness: 0.42, metalness: 0.01, ...extra });
  }
  return new THREE.MeshStandardMaterial({
    color: colorOrType,
    roughness: 0.8,
    metalness: 0.0,
    ...extra,
  });
};

function shade(mesh) { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; }

// 判断颜色并赋予定制 PBR 材质（修复书脊位置优先路由，避免陶瓷分支吞色）
function getSpecializedMaterial(material, w, h, d, x, y, z) {
  if (material instanceof THREE.Material) return material;
  const colStr = String(material).toLowerCase();

  // 【核心修复】：优先按位置与书架空间判定书脊，即使含有 #e8735a 也绝不被陶瓷分支吞掉
  const bookColors = ['#e8735a', '#f2b84b', '#5f8fd8', '#7cbf8e', '#a37ad6', '#f29fb5', '#4fb3b0', '#efe1c6'];
  if (z < -4.5 && x < -1.5 && y > 0 && y < 3.2 && (bookColors.includes(colStr) || w < 0.25)) {
    return new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: getBookSpineTexture(colStr),
      roughness: 0.55,
      metalness: 0.05,
    });
  }

  // 1. 墙体（左墙、后墙）
  if (colStr === '#f4e3cf' || colStr === '#f7ead9' || colStr === 'wall') {
    return new THREE.MeshStandardMaterial({
      color: '#fbf5ee',
      map: wallTex.tex,
      roughness: 0.92,
      metalness: 0.0,
    });
  }

  // 2. 护墙板（雾绿）
  if (colStr === '#b9cfc0' || colStr === '#c3d6c8' || colStr === 'wainscot' || colStr === 'sage') {
    return new THREE.MeshStandardMaterial({
      color: '#a3c2ad',
      map: wainscotTex.tex,
      roughness: 0.65,
      metalness: 0.02,
    });
  }

  // 3. 护墙线条与门窗白框
  if (colStr === '#fdf8f1' || colStr === '#fffaf2' || colStr === 'trim' || colStr === 'cream') {
    return new THREE.MeshStandardMaterial({
      color: '#fffbf5',
      roughness: 0.42,
      metalness: 0.01,
    });
  }

  // 4. 家具木材（书架、书桌、床架）
  if (colStr === '#b98457' || colStr === '#9c6a43' || colStr === '#c99a6c' || colStr === '#9b7a5a' || colStr === 'wood' || colStr === 'wooddark') {
    const isDark = colStr === '#9c6a43' || colStr === 'wooddark';
    return new THREE.MeshStandardMaterial({
      color: isDark ? '#98663d' : '#b88356',
      map: furnitureWoodTex.tex,
      roughness: 0.46,
      metalness: 0.02,
    });
  }

  // 5. 金属（落地灯底座与支架、显示器支架、深色金属外壳）
  if (colStr === '#3a3a48' || colStr === '#2c2c38' || colStr === 'metal') {
    const isLamp = x < -4.0 && z < 0.2 && z > -0.3;
    return new THREE.MeshStandardMaterial({
      color: isLamp ? '#464348' : '#2b2c36',
      roughness: 0.30,
      metalness: 0.82,
    });
  }

  // 6. 陶瓷（花盆、桌面黄色水杯）
  if (colStr === '#d7775c' || colStr === '#e8735a' || colStr === 'ceramic' || (colStr === '#f2b84b' && y > 0.9 && x > 2.2)) {
    return new THREE.MeshStandardMaterial({
      color: colStr === '#f2b84b' ? '#f2b444' : '#d86d52',
      roughness: 0.22,
      metalness: 0.04,
    });
  }

  // 7. 珊瑚粉窗帘与时钟外框
  if (colStr === '#e98f7c' || colStr === 'coral') {
    const isClock = y > 3.0 && x > 3.0;
    return new THREE.MeshStandardMaterial({
      color: isClock ? '#df826e' : '#eb8b78',
      roughness: isClock ? 0.32 : 0.78,
      metalness: isClock ? 0.65 : 0.02,
    });
  }

  // 8. 床品（改用温馨珊瑚粉 / 奶油白 / 雾绿，与蓝色大肥鱼形成鲜明人物明度对比）
  if (colStr === '#8fb0f0' || colStr === 'quilt') {
    return new THREE.MeshStandardMaterial({
      color: '#eb8f7c', // 温馨珊瑚粉床被，与角色蓝色三视图形成明度反差
      map: fabricTex.tex,
      roughness: 0.88,
      metalness: 0.0,
    });
  }
  if (colStr === '#f8f3ea' || colStr === '#ffffff' || colStr === 'linen') {
    return new THREE.MeshStandardMaterial({
      color: '#fffdf7',
      roughness: 0.92,
      metalness: 0.0,
    });
  }

  // 9. 地毯圆盘（外中内层分色织造）
  if (colStr === '#f0c4a8') return new THREE.MeshStandardMaterial({ color: '#efa892', map: rugOuterTex, roughness: 0.92, metalness: 0.0 });
  if (colStr === '#f7dcc6') return new THREE.MeshStandardMaterial({ color: '#f7edd9', map: rugMidTex, roughness: 0.92, metalness: 0.0 });
  if (colStr === '#eaa98c') return new THREE.MeshStandardMaterial({ color: '#e2947d', map: rugInnerTex, roughness: 0.92, metalness: 0.0 });

  // 10. 懒人沙发（姜黄帆布）
  if (colStr === '#f2b84b' || colStr === 'cushion') {
    return new THREE.MeshStandardMaterial({
      color: '#f2b84b',
      roughness: 0.85,
      metalness: 0.0,
    });
  }

  return mat(material);
}

function box(w, h, d, material, x, y, z, parent = scene) {
  let finalMat = getSpecializedMaterial(material, w, h, d, x, y, z);
  // 当识别到地板几何体（w >= 9.9 且 d >= 9.9）或传入带有 floorTex 的材质时，自动挂载 roughnessMap 与 normalMap
  if (material instanceof THREE.Material && (material.map === floorTex.tex || (w >= 9.9 && d >= 9.9 && y < 0))) {
    material.roughnessMap = floorRoughnessTex.tex;
    material.normalMap = floorNormalTex.tex;
    material.normalScale = new THREE.Vector2(0.35, 0.35);
    material.roughness = 0.52;
    material.metalness = 0.0;
    material.needsUpdate = true;
    finalMat = material;
  }
  const mesh = shade(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), finalMat));
  // 墙壁不投射阴影，保证窗外直射阳光与月光能够穿透并在房间地板投影出清晰窗格
  const colStr = String(material).toLowerCase();
  if (colStr === '#f4e3cf' || colStr === '#f7ead9' || colStr === 'wall') {
    mesh.castShadow = false;
  }
  // 书架内书脊与小件物品免投阴影（深处无外向明显阴影贡献），大幅节约阴影 pass draw calls
  if (z < -4.5 && x < -1.5 && y > 0 && y < 3.2) {
    mesh.castShadow = false;
  }
  // 紧贴墙壁的线条装饰免投阴影
  if ((x <= -4.85 || z <= -4.85) && (w < 0.25 || d < 0.25)) {
    mesh.castShadow = false;
  }
  mesh.position.set(x, y + h / 2, z); parent.add(mesh); return mesh;
}

function cyl(rt, rb, h, material, x, y, z, seg = 24) {
  const finalMat = getSpecializedMaterial(material, rt * 2, h, rb * 2, x, y, z);
  const mesh = shade(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), finalMat));
  mesh.position.set(x, y + h / 2, z); scene.add(mesh); return mesh;
}

function blob(r, color, sx, sy, sz, x, y, z, parent = scene, material) {
  const finalMat = material || getSpecializedMaterial(color, r * sx * 2, r * sy * 2, r * sz * 2, x, y, z);
  const mesh = shade(new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), finalMat));
  mesh.scale.set(sx, sy, sz); mesh.position.set(x, y, z); parent.add(mesh); return mesh;
}

// 地板 PBR 材质（装配 diffuse、roughnessMap 和微 normalMap）
const floorMaterial = new THREE.MeshStandardMaterial({
  color: '#ffffff',
  map: floorTex.tex,
  roughnessMap: floorRoughnessTex.tex,
  normalMap: floorNormalTex.tex,
  normalScale: new THREE.Vector2(0.35, 0.35),
  roughness: 0.52,
  metalness: 0.0,
});

// 供家具布局师使用的显式材质接口字典
const materials = {
  wood: mat('wood'),
  woodDark: mat('woodDark'),
  wall: mat('wall'),
  wainscot: mat('wainscot'),
  trim: mat('trim'),
  curtain: mat('coral'),
  quilt: mat('quilt'),
  ceramic: mat('ceramic'),
  metal: mat('metal'),
  fabric: mat('fabric'),
  cream: mat('cream'),
  floor: floorMaterial,
  getSpine: getBookSpineTexture,
};

return { mat, shade, box, cyl, blob, canvasTexture, floorTex, floorMaterial, materials };
}


