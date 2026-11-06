// 256² 程序化海景：固定笔触避免每分钟刷新时风景随机跳动。
export function paintSeascape(ctx, daylight, hour) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  ctx.save(); ctx.scale(w / 256, h / 256);
  const night = daylight <= 0, dusk = daylight > 0 && daylight < 1;
  const horizon = 116, sunX = dusk ? 171 : 197, sunY = dusk ? 105 : 44;
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  const colors = night ? ['#101d39', '#344b69', '#718393'] : dusk
    ? [hour < 12 ? '#90acc3' : '#7c83a9', '#e6a799', '#f8d6aa'] : ['#83bcd3', '#c3e0e7', '#edf0df'];
  colors.forEach((c,i)=>sky.addColorStop(i/2,c));
  ctx.fillStyle = sky; ctx.fillRect(0,0,256,256);
  if (night) {
    for(let i=0;i<34;i++) {
      ctx.fillStyle = i%3 ? '#e8efe7aa' : '#fff0bd';
      ctx.beginPath();ctx.arc(8+(i*73)%241,8+(i*43)%91,i%7===0?1.1:0.6,0,Math.PI*2);ctx.fill();
    }
    ctx.fillStyle='#d7e7e91c';ctx.beginPath();ctx.arc(197,44,25,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#f5eed4';ctx.beginPath();ctx.arc(197,44,12,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#273c59';ctx.beginPath();ctx.arc(202,40,10,0,Math.PI*2);ctx.fill();
  } else {
    ctx.fillStyle=dusk?'#ffe7b7':'#fff4cf';ctx.beginPath();ctx.arc(sunX,sunY,dusk?15:12,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=dusk?'#fff1da77':'#ffffffa8';
    for(const [x,y,s] of [[30,39,1],[102,69,0.7],[210,80,0.65]]) {
      ctx.beginPath();ctx.ellipse(x,y,25*s,4*s,0,0,Math.PI*2);ctx.ellipse(x-5*s,y-4*s,13*s,7*s,0,0,Math.PI*2);ctx.fill();
    }
    // 小海鸥，轻微不对称的双弧。
    ctx.strokeStyle=dusk?'#826e78':'#6b8e9e';ctx.lineWidth=1;
    for(const [x,y] of [[67,74],[85,64],[144,39]]) {ctx.beginPath();ctx.moveTo(x-4,y);ctx.quadraticCurveTo(x-2,y-3,x,y);ctx.quadraticCurveTo(x+3,y-3,x+5,y-1);ctx.stroke();}
  }
  const sea=ctx.createLinearGradient(0,horizon,0,256);
  const seaColors=night?['#344e6c','#29465a','#3f6971']:dusk?['#9d909a','#729ba4','#9ebbb6']:['#6dabb9','#65b5bf','#a2d4cb'];
  seaColors.forEach((c,i)=>sea.addColorStop(i/2,c));ctx.fillStyle=sea;ctx.fillRect(0,horizon,256,140);
  ctx.fillStyle=night?'#839fb14d':'#f5f1dfb0';ctx.fillRect(0,horizon,256,1);
  // 远方低矮海岛与小灯塔。
  ctx.fillStyle=night?'#243d4c':dusk?'#797f8a':'#7f9e9b';
  ctx.beginPath();ctx.moveTo(0,120);ctx.bezierCurveTo(19,118,22,107,37,106);ctx.bezierCurveTo(51,106,54,118,79,121);ctx.closePath();ctx.fill();
  ctx.fillStyle=night?'#9fa9a5':'#f2eedb';ctx.beginPath();ctx.moveTo(30,109);ctx.lineTo(32,93);ctx.lineTo(37,93);ctx.lineTo(39,109);ctx.closePath();ctx.fill();
  ctx.fillStyle=night?'#f4d595':'#b87e6c';ctx.fillRect(31,92,7,4);
  ctx.beginPath();ctx.moveTo(30,92);ctx.lineTo(34,88);ctx.lineTo(39,92);ctx.fill();
  // 分层细浪，曲线和短横笔触代替写实噪声。
  ctx.lineCap='round';
  for(let row=0;row<15;row++) {
    const y=123+row*8;
    ctx.strokeStyle=night?'#b6d4d52a':dusk?'#f9e5cd50':'#effff16b';ctx.lineWidth=row<4?0.65:1.1;
    for(let j=0;j<5;j++) {
      const x=(j*61+row*29)%281-17, len=7+row*0.7+(j%3)*4;
      ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+len/2,y-1.7,x+len,y);ctx.stroke();
    }
  }
  // 日月在海面的碎光，越近越宽。
  for(let i=0;i<17;i++) {
    const y=120+i*6, half=2+i*0.72, x=(night?197:sunX)+Math.sin(i*2.1)*3;
    ctx.strokeStyle=night?'#d8e7d878':dusk?'#ffe5b6a0':'#f9ffdd55';ctx.lineWidth=1.1+i*0.055;
    ctx.beginPath();ctx.moveTo(x-half,y);ctx.lineTo(x+half,y);ctx.stroke();
  }
  // 一艘远处的小帆船。
  ctx.fillStyle=night?'#9aacb4':'#fff5dd';ctx.beginPath();ctx.moveTo(111,131);ctx.lineTo(111,151);ctx.lineTo(98,151);ctx.closePath();ctx.fill();
  ctx.fillStyle=night?'#71899c':'#ead6b9';ctx.beginPath();ctx.moveTo(114,137);ctx.lineTo(122,151);ctx.lineTo(114,151);ctx.fill();
  ctx.strokeStyle=night?'#c2c3af':'#8b8270';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(113,129);ctx.lineTo(113,155);ctx.stroke();
  ctx.fillStyle=night?'#233b4a':'#817d70';ctx.beginPath();ctx.moveTo(98,154);ctx.lineTo(125,154);ctx.lineTo(120,158);ctx.lineTo(103,158);ctx.fill();
  // 近处的一角沙滩与柔软白浪。
  ctx.fillStyle=night?'#6e7b7b':dusk?'#d8bd9d':'#e7d9b7';
  ctx.beginPath();ctx.moveTo(0,217);ctx.bezierCurveTo(53,229,75,256,157,256);ctx.lineTo(0,256);ctx.closePath();ctx.fill();
  ctx.strokeStyle=night?'#c3d8d39c':'#fff8e8dc';ctx.lineWidth=2.5;
  ctx.beginPath();ctx.moveTo(-5,211);ctx.bezierCurveTo(49,222,88,255,154,253);ctx.stroke();
  ctx.strokeStyle=night?'#b1c5c754':'#edf7eac0';ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(-5,204);ctx.bezierCurveTo(52,214,92,246,169,248);ctx.stroke();
  ctx.restore();
}
