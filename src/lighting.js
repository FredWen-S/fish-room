import * as THREE from 'three';

export function createLighting(scene, sky, room, rand) {
// ------------------------------------------------------------------ 光照与时间
// 基础环境光与 ACES 色调映射
scene.add(new THREE.AmbientLight('#ffffff', 0.22));
const hemi = new THREE.HemisphereLight('#fff6ea', '#bca896', 0.82);
scene.add(hemi);

// 主太阳光（日间主光源，温润日光与柔化阴影）
const sun = new THREE.DirectionalLight('#fff7eb', 1.6);
sun.position.set(7.5, 13, 8.5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.radius = 2.4;
sun.shadow.bias = -0.00035;
sun.shadow.normalBias = 0.025;
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
scene.add(sun);

// 窗外夜间月光柔和漫射（静谧冷蓝，投射在地板与窗台）
const moon = new THREE.DirectionalLight('#4d6da6', 0);
moon.position.set(-8, 7.5, -2);
scene.add(moon);

// 夜间落地灯温暖漫反射光（照亮地毯与床边，营造治愈温馨氛围）
const lampBounce = new THREE.PointLight('#ffa048', 0, 7.5, 1.6);
lampBounce.position.set(-2.8, 1.25, 0.4);
scene.add(lampBounce);

// ACES Filmic Tone Mapping 渲染钩子
scene.onBeforeRender = (renderer) => {
  if (renderer.toneMapping !== THREE.ACESFilmicToneMapping) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
  }
  const d = daylight();
  // 昼夜动态曝光控制：日间明媚通透(1.05)，夜间温厚饱满(1.16)
  renderer.toneMappingExposure = 1.05 + (1 - d) * 0.11;
};

function daylight(date = new Date()) {
  const override = Number(new URLSearchParams(location.search).get('hour'));
  const h = new URLSearchParams(location.search).has('hour') && Number.isFinite(override) && override >= 0 && override < 24 ? override : date.getHours() + date.getMinutes() / 60;
  const ramp = (a, b) => Math.min(1, Math.max(0, (h - a) / (b - a)));
  return Math.min(ramp(5.5, 8), 1 - ramp(17, 19.5));
}

function drawSky() {
  const { ctx } = sky, w = 256, h = 210, d = daylight(), hour = new URLSearchParams(location.search).has('hour') ? Number(new URLSearchParams(location.search).get('hour')) : new Date().getHours();
  const dusk = d > 0 && d < 1;
  const g = ctx.createLinearGradient(0, 0, 0, h);

  if (d >= 1) {
    // 晴朗白天：日系治愈晴空渐变
    g.addColorStop(0, '#64bbf0');
    g.addColorStop(0.65, '#bce1fa');
    g.addColorStop(1, '#eaf5ff');
  } else if (dusk) {
    // 黄昏暮色：晚霞珊瑚粉与金橙
    g.addColorStop(0, hour < 12 ? '#8eb9e4' : '#52528a');
    g.addColorStop(0.48, '#e88772');
    g.addColorStop(1, '#ffd092');
  } else {
    // 静谧深蓝夜晚
    g.addColorStop(0, '#091026');
    g.addColorStop(0.6, '#171f43');
    g.addColorStop(1, '#2a3362');
  }
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

  if (d < 0.5) {
    // 星空与月色
    for (let i = 0; i < 50; i++) {
      ctx.globalAlpha = rand(0.35, 1);
      const starColors = ['#ffffff', '#fff2d6', '#d6e6ff'];
      ctx.fillStyle = starColors[i % 3];
      const sz = i % 6 === 0 ? 2.5 : 1.4;
      ctx.fillRect((i * 97) % (w - 8) + 4, (i * 53) % (h * 0.72) + 4, sz, sz);
    }
    ctx.globalAlpha = 1;
    // 弯月与月晕
    ctx.fillStyle = 'rgba(255, 245, 190, 0.16)'; ctx.beginPath(); ctx.arc(190, 52, 30, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff6cd'; ctx.beginPath(); ctx.arc(190, 52, 21, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#151d42'; ctx.beginPath(); ctx.arc(201, 45, 18, 0, Math.PI * 2); ctx.fill();
  } else {
    // 白天与黄昏的柔和白云
    ctx.fillStyle = dusk ? '#ffd394' : '#fff5bf';
    ctx.beginPath(); ctx.arc(dusk ? 60 : 196, dusk ? 145 : 50, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = dusk ? 'rgba(255,235,220,0.85)' : 'rgba(255,255,255,0.92)';
    [[52, 60], [146, 106], [105, 78]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, Math.PI * 2);
      ctx.arc(x + 20, y - 8, 20, 0, Math.PI * 2);
      ctx.arc(x + 40, y, 14, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // 远山轮廓
  ctx.fillStyle = d < 0.5 ? '#0f142f' : (dusk ? '#647466' : '#78ad84');
  ctx.beginPath(); ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 16) ctx.lineTo(x, h - 28 - Math.sin(x / 30) * 10);
  ctx.lineTo(w, h); ctx.fill();

  // 远景小窗温暖灯火
  if (d < 0.5) {
    ctx.fillStyle = '#ffd672';
    [[30, 185], [90, 190], [170, 183], [220, 192]].forEach(([x, y]) => ctx.fillRect(x, y, 5, 5));
  }
  sky.tex.needsUpdate = true;
}

const light = { sun: 1.6, hemi: 0.82, lamp: 0, fairy: 0 };
function lightTargets() {
  const d = daylight(), resting = room().state === 'resting';
  // 动态联动窗外月光与落地灯漫射
  moon.intensity = (1 - d) * 0.48 * (resting ? 0.6 : 1);
  lampBounce.intensity = (1 - d) * 1.35 * (resting ? 0.65 : 1);
  return {
    sun: (0.16 + 1.44 * d) * (resting ? 0.52 : 1),
    hemi: (0.36 + 0.46 * d) * (resting ? 0.6 : 1),
    lamp: resting ? 2.8 : (1 - d) * 3.4,
    fairy: Math.max(1 - d, resting ? 0.85 : 0),
  };
}

function applyDayClass() {
  document.body.classList.toggle('night', daylight() < 0.4);
}

return { sun, hemi, daylight, drawSky, light, lightTargets, applyDayClass };
}

