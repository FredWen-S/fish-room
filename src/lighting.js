import * as THREE from 'three';
import { paintSeascape } from './seascape.js';

export function createLighting(scene, sky, room, rand) {
// ------------------------------------------------------------------ 光照与时间
// 基础环境光与 ACES 色调映射
scene.add(new THREE.AmbientLight('#ffffff', 0.22));
const hemi = new THREE.HemisphereLight('#fff6ea', '#bca896', 0.82);
scene.add(hemi);

// 全局主太阳光（柔和漫射日光）
const sun = new THREE.DirectionalLight('#fff7eb', 1.35);
sun.position.set(7.5, 13, 8.5);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.radius = 2.4;
sun.shadow.bias = -0.00035;
sun.shadow.normalBias = 0.025;
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
scene.add(sun);

// 窗外直射阳光与窗格投影（定向穿透窗户，在木地板上投射出清晰温暖的田字窗格阴影）
const windowSun = new THREE.DirectionalLight('#fff5e0', 1.75);
windowSun.position.set(-11, 8.2, -4.5);
windowSun.castShadow = true;
windowSun.shadow.mapSize.set(1024, 1024);
windowSun.shadow.radius = 1.6;
windowSun.shadow.bias = -0.0003;
windowSun.shadow.normalBias = 0.02;
Object.assign(windowSun.shadow.camera, {
  left: -4.2, right: 4.2, top: 4.2, bottom: -4.2, near: 1, far: 30,
});
const sunTarget = new THREE.Object3D();
sunTarget.position.set(-1.2, 0, 0);
scene.add(sunTarget);
windowSun.target = sunTarget;
scene.add(windowSun);

// 窗户反光玻璃面（半透明物理反射，带微斜向高光拉丝感）
const glassGeo = new THREE.PlaneGeometry(2.18, 1.78);
const glassCanvas = document.createElement('canvas'); glassCanvas.width = 256; glassCanvas.height = 256;
const gctx = glassCanvas.getContext('2d');
gctx.fillStyle = 'rgba(255, 255, 255, 0.03)'; gctx.fillRect(0, 0, 256, 256);
const glG = gctx.createLinearGradient(0, 0, 256, 256);
glG.addColorStop(0, 'rgba(255,255,255,0)');
glG.addColorStop(0.38, 'rgba(255,255,255,0.18)');
glG.addColorStop(0.46, 'rgba(255,255,255,0.30)');
glG.addColorStop(0.54, 'rgba(255,255,255,0)');
glG.addColorStop(0.70, 'rgba(255,255,255,0.14)');
glG.addColorStop(0.76, 'rgba(255,255,255,0)');
gctx.fillStyle = glG; gctx.fillRect(0, 0, 256, 256);
const glassTex = new THREE.CanvasTexture(glassCanvas);
glassTex.colorSpace = THREE.SRGBColorSpace;
const glassMat = new THREE.MeshStandardMaterial({
  color: '#ffffff',
  map: glassTex,
  transparent: true,
  opacity: 0.38,
  roughness: 0.08,
  metalness: 0.12,
  side: THREE.DoubleSide,
  depthWrite: false,
});
const glassPane = new THREE.Mesh(glassGeo, glassMat);
glassPane.rotation.y = Math.PI / 2;
glassPane.position.set(-4.94, 2.65, -2.0);
scene.add(glassPane);

// 窗外夜间月光柔和漫射（静谧冷蓝，投射在地板与窗台）
const moon = new THREE.DirectionalLight('#4d6da6', 0);
moon.position.set(-9, 7, -3.5);
scene.add(moon);

// 夜间落地灯温暖漫反射光（照亮地毯与床边，营造治愈温馨氛围）
const lampBounce = new THREE.PointLight('#ffa048', 0, 7.5, 1.6);
lampBounce.position.set(-2.8, 1.25, 0.4);
scene.add(lampBounce);

// 墙上串灯暖色点光源（夜间点缀墙面与书架上方，带来星星点点的温暖光晕）
const fairyLight = new THREE.PointLight('#ffba58', 0, 6.5, 1.8);
fairyLight.position.set(-0.5, 4.15, -4.6);
scene.add(fairyLight);

// ACES Filmic Tone Mapping 渲染钩子与平滑灯光更新
scene.onBeforeRender = (renderer) => {
  if (renderer.toneMapping !== THREE.ACESFilmicToneMapping) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
  }
  const d = daylight();
  // 昼夜动态曝光控制：日间明媚通透(1.05)，夜间温厚饱满(1.16)
  renderer.toneMappingExposure = 1.05 + (1 - d) * 0.11;

  // 使用在主循环中已完成平滑插值的 light 字典值同步更新附加光源，杜绝休息状态切换与昼夜突变
  if (light.windowSun !== undefined) windowSun.intensity = light.windowSun;
  if (light.moon !== undefined) moon.intensity = light.moon;
  if (light.lampBounce !== undefined) lampBounce.intensity = light.lampBounce;
  fairyLight.intensity = (light.fairy ?? 0) * 1.8;
};

function daylight(date = new Date()) {
  const override = Number(new URLSearchParams(location.search).get('hour'));
  const h = new URLSearchParams(location.search).has('hour') && Number.isFinite(override) && override >= 0 && override < 24 ? override : date.getHours() + date.getMinutes() / 60;
  const ramp = (a, b) => Math.min(1, Math.max(0, (h - a) / (b - a)));
  return Math.min(ramp(5.5, 8), 1 - ramp(17, 19.5));
}

function drawSky() {
  const params = new URLSearchParams(location.search);
  const value = Number(params.get('hour'));
  const hour = params.has('hour') && Number.isFinite(value) && value >= 0 && value < 24 ? value : new Date().getHours();
  paintSeascape(sky.ctx, daylight(), hour);
  sky.tex.needsUpdate = true;
}

const light = { sun: 1.35, hemi: 0.82, lamp: 0, fairy: 0, windowSun: 1.75, moon: 0, lampBounce: 0 };
function lightTargets() {
  const d = daylight(), resting = room().state === 'resting';
  return {
    sun: (0.16 + 1.25 * d) * (resting ? 0.52 : 1),
    hemi: (0.36 + 0.46 * d) * (resting ? 0.6 : 1),
    lamp: resting ? 2.8 : (1 - d) * 3.4,
    fairy: Math.max(1 - d, resting ? 0.85 : 0),
    windowSun: d * 1.75 * (resting ? 0.6 : 1),
    moon: (1 - d) * 0.48 * (resting ? 0.6 : 1),
    lampBounce: (1 - d) * 1.35 * (resting ? 0.65 : 1),
  };
}

function applyDayClass() {
  document.body.classList.toggle('night', daylight() < 0.4);
}

return { sun, hemi, daylight, drawSky, light, lightTargets, applyDayClass };
}


