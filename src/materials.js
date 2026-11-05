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

// 1. 地板：日系暖橡木拼接地板（带细腻年轮微纹、接缝与微倒角高光）
const floorTex = canvasTexture(512, 512, (ctx, w, h) => {
  const tones = ['#e0bb94', '#d7ad83', '#e6c39f', '#cc9c6f', '#e3bf9b'];
  ctx.fillStyle = '#cc9a6b'; ctx.fillRect(0, 0, w, h);
  const rowH = 64;
  for (let row = 0; row < 8; row++) {
    const y = row * rowH;
    let x = (row % 2) ? -110 : 0;
    while (x < w) {
      const len = rand(175, 275);
      const baseTone = pick(tones);
      ctx.fillStyle = baseTone;
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

      // 木板垂直接缝与微倒角
      ctx.fillStyle = 'rgba(65,36,15,0.26)'; ctx.fillRect(x + len - 2, y, 2, rowH);
      ctx.fillStyle = 'rgba(255,250,240,0.24)'; ctx.fillRect(x + len, y, 1, rowH);
      x += len;
    }
    // 水平接缝与高光倒角
    ctx.fillStyle = 'rgba(55,30,12,0.30)'; ctx.fillRect(0, y + rowH - 2, w, 2);
    ctx.fillStyle = 'rgba(255,250,240,0.28)'; ctx.fillRect(0, y, w, 1);
  }
});
floorTex.tex.wrapS = floorTex.tex.wrapT = THREE.RepeatWrapping;
floorTex.tex.repeat.set(2, 2);

// 2. 墙面：日系奶油白和纸暗纹墙纸
const wallTex = canvasTexture(512, 512, (ctx, w, h) => {
  ctx.fillStyle = '#fbf5eb'; ctx.fillRect(0, 0, w, h);
  // 细腻纵横织物纤维
  ctx.strokeStyle = 'rgba(190,165,140,0.06)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 3) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + rand(-0.4, 0.4), h); ctx.stroke();
  }
  for (let y = 0; y < h; y += 4) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + rand(-0.4, 0.4)); ctx.stroke();
  }
  // 天然和纸微小纸浆点
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = rand(0, 1) > 0.5 ? 'rgba(165,135,105,0.05)' : 'rgba(255,255,255,0.38)';
    ctx.fillRect(rand(0, w), rand(0, h), rand(1, 2), rand(1, 2));
  }
});
wallTex.tex.wrapS = wallTex.tex.wrapT = THREE.RepeatWrapping;
wallTex.tex.repeat.set(3, 2);

// 3. 护墙板：日系雾绿板条纹理（垂直木槽与柔光）
const wainscotTex = canvasTexture(256, 256, (ctx, w, h) => {
  ctx.fillStyle = '#a6c3b0'; ctx.fillRect(0, 0, w, h);
  const slatW = 32;
  for (let x = 0; x < w; x += slatW) {
    // 板条内柔和微木质纵纹
    ctx.fillStyle = 'rgba(235,248,240,0.09)'; ctx.fillRect(x + 2, 0, slatW - 4, h);
    // 阴影槽与高光倒角
    ctx.fillStyle = 'rgba(40,65,50,0.26)'; ctx.fillRect(x, 0, 2.5, h);
    ctx.fillStyle = 'rgba(255,255,255,0.30)'; ctx.fillRect(x + 2.5, 0, 1.5, h);
  }
});
wainscotTex.tex.wrapS = wainscotTex.tex.wrapT = THREE.RepeatWrapping;
wainscotTex.tex.repeat.set(4, 1);

// 4. 家具木纹：温暖焦糖/原木（书桌、书架、床身）
const furnitureWoodTex = canvasTexture(512, 512, (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#b98356'); g.addColorStop(0.5, '#ab7649'); g.addColorStop(1, '#bb8558');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // 年轮与波状木质纤维
  for (let i = 0; i < 48; i++) {
    const y = rand(0, h);
    ctx.strokeStyle = rand(0, 1) > 0.5 ? 'rgba(85,45,15,0.11)' : 'rgba(255,240,215,0.15)';
    ctx.lineWidth = rand(1, 2.8);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(w * 0.35, y + rand(-12, 12), w * 0.7, y + rand(-12, 12), w, y + rand(-8, 8));
    ctx.stroke();
  }
});
furnitureWoodTex.tex.wrapS = furnitureWoodTex.tex.wrapT = THREE.RepeatWrapping;
furnitureWoodTex.tex.repeat.set(2, 2);

// 5. 地毯：分层编织同心螺旋粗麻毛线纹理
function createRugTexture(baseColor, accentColor) {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const cx = w / 2, cy = h / 2;
    ctx.fillStyle = baseColor; ctx.fillRect(0, 0, w, h);
    // 同心编织针脚
    for (let r = 10; r < cx; r += 6.5) {
      const circum = 2 * Math.PI * r;
      const stitches = Math.floor(circum / 8.5);
      for (let s = 0; s < stitches; s++) {
        const a = (s / stitches) * Math.PI * 2;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        ctx.save();
        ctx.translate(x, y); ctx.rotate(a + Math.PI / 4);
        ctx.fillStyle = (s % 2 === 0) ? 'rgba(255,250,242,0.35)' : accentColor;
        ctx.fillRect(-2, -1, 4, 2.5);
        ctx.restore();
      }
    }
  }).tex;
}
const rugOuterTex = createRugTexture('#efa892', 'rgba(150,85,65,0.24)');
const rugMidTex = createRugTexture('#f7edd9', 'rgba(180,140,110,0.18)');
const rugInnerTex = createRugTexture('#e2947d', 'rgba(140,75,55,0.26)');

// 6. 布料/被子：细腻华夫格织物感
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

// 7. 书脊贴图生成器（带日系治愈书名、烫金线条）
const bookTexCache = {};
function getBookSpineTexture(color) {
  if (bookTexCache[color]) return bookTexCache[color];
  const texObj = canvasTexture(128, 256, (ctx, w, h) => {
    ctx.fillStyle = color; ctx.fillRect(0, 0, w, h);
    // 书脊边缘渐变立体感
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.28)');
    g.addColorStop(0.16, 'rgba(0,0,0,0)');
    g.addColorStop(0.84, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    // 烫金边框与装饰线
    ctx.strokeStyle = '#f8d67c'; ctx.lineWidth = 3;
    ctx.strokeRect(10, 14, w - 20, h - 28);
    ctx.beginPath();
    ctx.moveTo(10, 36); ctx.lineTo(w - 10, 36);
    ctx.moveTo(10, h - 36); ctx.lineTo(w - 10, h - 36);
    ctx.stroke();

    // 装饰圆点 / 小星光
    ctx.fillStyle = '#fae19c';
    ctx.beginPath(); ctx.arc(w / 2, 25, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(w / 2, h - 25, 4, 0, Math.PI * 2); ctx.fill();

    // 书脊文字条块
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    for (let y = 58; y < h - 58; y += 18) {
      const barW = rand(26, w - 36);
      ctx.fillRect((w - barW) / 2, y, barW, 8.5);
    }
  });
  bookTexCache[color] = texObj.tex;
  return texObj.tex;
}

// ------------------------------------------------------------------ 材质构建核心
const mat = (color, extra = {}) => {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.8,
    metalness: 0.0,
    ...extra,
  });
};

function shade(mesh) { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; }

// 判断颜色并赋予定制 PBR 材质
function getSpecializedMaterial(material, w, h, d, x, y, z) {
  if (material instanceof THREE.Material) return material;
  const colStr = String(material).toLowerCase();

  // 1. 墙体（左墙、后墙）
  if (colStr === '#f4e3cf' || colStr === '#f7ead9') {
    return new THREE.MeshStandardMaterial({
      color: '#fbf5ee',
      map: wallTex.tex,
      roughness: 0.92,
      metalness: 0.0,
    });
  }

  // 2. 护墙板（雾绿）
  if (colStr === '#b9cfc0' || colStr === '#c3d6c8') {
    return new THREE.MeshStandardMaterial({
      color: '#a3c2ad',
      map: wainscotTex.tex,
      roughness: 0.65,
      metalness: 0.02,
    });
  }

  // 3. 护墙线条与门窗白框
  if (colStr === '#fdf8f1' || colStr === '#fffaf2') {
    return new THREE.MeshStandardMaterial({
      color: '#fffbf5',
      roughness: 0.42,
      metalness: 0.01,
    });
  }

  // 4. 家具木材（书架、书桌、床架）
  if (colStr === '#b98457' || colStr === '#9c6a43' || colStr === '#c99a6c' || colStr === '#9b7a5a') {
    const isDark = colStr === '#9c6a43';
    return new THREE.MeshStandardMaterial({
      color: isDark ? '#98663d' : '#b88356',
      map: furnitureWoodTex.tex,
      roughness: 0.46,
      metalness: 0.02,
    });
  }

  // 5. 金属（落地灯底座与支架、显示器支架、深色金属外壳）
  if (colStr === '#3a3a48' || colStr === '#2c2c38') {
    const isLamp = x < -4.0 && z < 0.2 && z > -0.3;
    return new THREE.MeshStandardMaterial({
      color: isLamp ? '#464348' : '#2b2c36',
      roughness: 0.30,
      metalness: 0.82,
    });
  }

  // 6. 陶瓷（花盆、水杯）
  if (colStr === '#d7775c' || colStr === '#e8735a' || colStr === '#f2b84b' && y > 0.9 && x > 2.2) {
    return new THREE.MeshStandardMaterial({
      color: colStr === '#f2b84b' ? '#f2b444' : '#d86d52',
      roughness: 0.22,
      metalness: 0.04,
    });
  }

  // 7. 珊瑚粉窗帘与时钟外框
  if (colStr === '#e98f7c') {
    const isClock = y > 3.0 && x > 3.0;
    return new THREE.MeshStandardMaterial({
      color: isClock ? '#df826e' : '#eb8b78',
      roughness: isClock ? 0.32 : 0.78,
      metalness: isClock ? 0.65 : 0.02,
    });
  }

  // 8. 书架上的书脊
  const bookColors = ['#e8735a', '#f2b84b', '#5f8fd8', '#7cbf8e', '#a37ad6', '#f29fb5', '#4fb3b0', '#efe1c6'];
  if (bookColors.includes(colStr) && z < -4.5 && x < -1.5) {
    return new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: getBookSpineTexture(colStr),
      roughness: 0.55,
      metalness: 0.05,
    });
  }

  // 9. 床品（被子、枕头、床垫）
  if (colStr === '#8fb0f0') {
    return new THREE.MeshStandardMaterial({
      color: '#8daee6',
      map: fabricTex.tex,
      roughness: 0.90,
      metalness: 0.0,
    });
  }
  if (colStr === '#f8f3ea' || colStr === '#ffffff') {
    return new THREE.MeshStandardMaterial({
      color: '#fffef9',
      roughness: 0.92,
      metalness: 0.0,
    });
  }

  // 10. 地毯圆盘（外中内层分色织造）
  if (colStr === '#f0c4a8') {
    return new THREE.MeshStandardMaterial({
      color: '#efa892',
      map: rugOuterTex,
      roughness: 0.92,
      metalness: 0.0,
    });
  }
  if (colStr === '#f7dcc6') {
    return new THREE.MeshStandardMaterial({
      color: '#f7edd9',
      map: rugMidTex,
      roughness: 0.92,
      metalness: 0.0,
    });
  }
  if (colStr === '#eaa98c') {
    return new THREE.MeshStandardMaterial({
      color: '#e2947d',
      map: rugInnerTex,
      roughness: 0.92,
      metalness: 0.0,
    });
  }

  // 11. 懒人沙发（姜黄帆布）
  if (colStr === '#f2b84b') {
    return new THREE.MeshStandardMaterial({
      color: '#f2b84b',
      roughness: 0.85,
      metalness: 0.0,
    });
  }

  // 默认 Standard 材质
  return mat(material);
}

function box(w, h, d, material, x, y, z, parent = scene) {
  const finalMat = getSpecializedMaterial(material, w, h, d, x, y, z);
  const mesh = shade(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), finalMat));
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

return { mat, shade, box, cyl, blob, canvasTexture, floorTex };
}

