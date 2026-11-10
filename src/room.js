// The one room: voxel bedroom-office at 2 AM. Static geometry, lights, window with city + rain, RGB strip.
import * as THREE from 'three';
import { VoxelBatch, UNIT, GLOW, rand } from './voxel.js';

export const ROOM = { x: 2.5, z: 2.2, h: 2.7, deskY: 0.75 };

function cityTexture() {
  const c = document.createElement('canvas'); c.width = 640; c.height = 256;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#070818'); g.addColorStop(0.55, '#1b1140'); g.addColorStop(0.85, '#5a2360'); g.addColorStop(1, '#c2553f');
  x.fillStyle = g; x.fillRect(0, 0, 640, 256);
  for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * 0.5})`; x.fillRect(Math.random() * 640, Math.random() * 110, 1, 1); }
  // moon
  x.fillStyle = '#fff4d6'; x.beginPath(); x.arc(520, 46, 15, 0, 7); x.fill();
  for (let layer = 0; layer < 3; layer++) {
    const base = ['#141234', '#0d0b26', '#07061a'][layer];
    let px = -10;
    while (px < 650) {
      const w = 22 + Math.random() * 46, h = 50 + Math.random() * (70 + layer * 45);
      x.fillStyle = base; x.fillRect(px, 256 - h, w, h);
      const lit = ['#ffd27a', '#7fe9ff', '#ff7ad1', '#fff1b8'][(Math.random() * 4) | 0];
      for (let wy = 256 - h + 5; wy < 250; wy += 7) for (let wx = px + 3; wx < px + w - 4; wx += 6) {
        if (Math.random() < 0.34 - layer * 0.06) { x.fillStyle = Math.random() < 0.8 ? lit : '#ffffff'; x.globalAlpha = 0.45 + Math.random() * 0.55; x.fillRect(wx, wy, 3, 4); }
      }
      x.globalAlpha = 1;
      if (Math.random() < 0.3) { x.fillStyle = ['#ff2bd6', '#2bf0ff', '#ffe14a'][(Math.random() * 3) | 0]; x.fillRect(px + 4, 256 - h + 8, w - 8, 5); }
      if (Math.random() < 0.25) { x.fillStyle = '#ff3355'; x.fillRect(px + w / 2, 256 - h - 8, 2, 8); }
      px += w + Math.random() * 8;
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function rainTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const x = c.getContext('2d');
  for (let i = 0; i < 26; i++) {
    const px = Math.random() * 256, py = Math.random() * 256, L = 8 + Math.random() * 34;
    const g = x.createLinearGradient(0, py, 0, py + L);
    g.addColorStop(0, 'rgba(190,220,255,0)'); g.addColorStop(1, `rgba(190,220,255,${0.25 + Math.random() * 0.5})`);
    x.fillStyle = g; x.fillRect(px, py, 1.5, L);
    x.fillStyle = 'rgba(220,240,255,.75)'; x.beginPath(); x.arc(px + 0.7, py + L, 1.6, 0, 7); x.fill();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function ubudTexture() {
  const c = document.createElement('canvas'); c.width = 160; c.height = 120;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 60); g.addColorStop(0, '#ffcf8a'); g.addColorStop(1, '#ffe9c2');
  x.fillStyle = g; x.fillRect(0, 0, 160, 120);
  x.fillStyle = '#fff6da'; x.beginPath(); x.arc(118, 26, 12, 0, 7); x.fill();
  x.fillStyle = '#5f8f6a'; x.beginPath(); x.moveTo(0, 60); x.lineTo(40, 30); x.lineTo(80, 55); x.lineTo(120, 34); x.lineTo(160, 58); x.lineTo(160, 120); x.lineTo(0, 120); x.fill();
  for (let i = 0; i < 9; i++) { // rice terraces in pixel steps
    x.fillStyle = ['#2f7d3a', '#49a14a', '#7cc45a', '#3a8f52'][i % 4];
    x.fillRect(0, 56 + i * 7, 160, 7);
    x.fillStyle = 'rgba(190,240,255,.55)'; x.fillRect((i * 37) % 120, 61 + i * 7, 46, 2);
  }
  for (const px of [18, 138, 150]) { x.fillStyle = '#3b2a1a'; x.fillRect(px, 30, 3, 44); x.fillStyle = '#1f6b32'; x.fillRect(px - 9, 24, 21, 5); x.fillRect(px - 5, 19, 13, 5); }
  x.fillStyle = '#fff'; x.font = 'bold 11px monospace'; x.fillText('UBUD', 6, 114);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  return t;
}

export function buildRoom(scene) {
  const { x: RX, z: RZ, h: RH, deskY } = ROOM;
  const b = new VoxelBatch();

  // floor planks + rug
  for (let r = 0; r < 18; r++) {
    let px = -RX;
    while (px < RX) { const L = Math.min(rand(0.9, 1.9), RX - px); b.box(px + L / 2, -0.025, -RZ + 0.122 + r * 0.2445, L - 0.006, 0.05, 0.238, 0x4a3225, { j: 0.16 }); px += L; }
  }
  b.fill(0, 0.008, -0.15, 2.4, 0.016, 1.8, 0.2, (i, k, l) => ((i + l) % 2 ? 0x5b2f6e : 0x3d2a6b));
  b.fill(0, 0.012, -0.15, 2.0, 0.02, 1.4, 0.2, (i, k, l) => ((i * 3 + l * 5) % 7 === 0 ? 0xff7ac8 : null));

  // walls (panelled so they catch light unevenly) — back wall leaves a panoramic window hole
  const WALL = 0x2d2f52, WALL2 = 0x343760;
  for (let i = 0; i < 10; i++) {
    const px = -RX + 0.25 + i * 0.5;
    b.box(px, 0.625, -RZ - 0.05, 0.496, 1.25, 0.1, i % 2 ? WALL : WALL2);
    b.box(px, 2.525, -RZ - 0.05, 0.496, 0.35, 0.1, i % 2 ? WALL : WALL2);
    if (i < 1 || i > 8) b.box(px, 1.8, -RZ - 0.05, 0.496, 1.1, 0.1, WALL);
    b.box(px, RH / 2, RZ + 0.05, 0.496, RH, 0.1, i % 2 ? WALL : WALL2);
  }
  for (let i = 0; i < 9; i++) {
    const pz = -RZ + 0.245 + i * 0.489;
    b.box(-RX - 0.05, RH / 2, pz, 0.1, RH, 0.485, i % 2 ? WALL2 : WALL);
    b.box(RX + 0.05, RH / 2, pz, 0.1, RH, 0.485, i % 2 ? WALL : WALL2);
  }
  b.box(0, RH + 0.05, 0, RX * 2, 0.1, RZ * 2, 0x1c1d33, { j: 0 });
  b.box(0, 0.06, -RZ + 0.02, RX * 2, 0.12, 0.04, 0x1a1a2c); b.box(-RX + 0.02, 0.06, 0, 0.04, 0.12, RZ * 2, 0x1a1a2c); b.box(RX - 0.02, 0.06, 0, 0.04, 0.12, RZ * 2, 0x1a1a2c);
  // window frame + mullions + sill
  const F = 0x11121c;
  b.box(0, 1.25, -RZ + 0.02, 4.1, 0.06, 0.16, F); b.box(0, 2.35, -RZ, 4.1, 0.06, 0.1, F);
  for (const px of [-2.0, -0.67, 0.67, 2.0]) b.box(px, 1.8, -RZ, 0.06, 1.1, 0.1, F);
  b.box(0, 1.8, -RZ, 4.0, 0.03, 0.06, F);

  // L-shaped desk: plank top, metal legs, drawer unit
  const WOOD = 0x7a5236;
  for (let k = 0; k < 7; k++) b.box(0, deskY - 0.02, -2.1 + 0.082 + k * 0.164, 3.5, 0.04, 0.16, WOOD, { j: 0.14 });
  for (let k = 0; k < 4; k++) b.box(1.15 + 0.075 + k * 0.15, deskY - 0.02, -0.35, 0.146, 0.04, 1.2, WOOD, { j: 0.14 });
  const LEG = 0x1c1d26;
  for (const [lx, lz] of [[-1.68, -2.03], [-1.68, -1.02], [1.68, -2.03], [1.68, 0.18], [1.2, 0.18], [0.2, -2.03]]) b.box(lx, 0.365, lz, 0.06, 0.73, 0.06, LEG);
  b.box(-1.3, 0.37, -1.55, 0.6, 0.7, 0.9, 0x24263a);
  for (let k = 0; k < 3; k++) { b.box(-1.3, 0.16 + k * 0.22, -1.09, 0.56, 0.2, 0.02, 0x2e3150); b.box(-1.3, 0.16 + k * 0.22, -1.075, 0.16, 0.025, 0.02, 0x9aa0c8); }
  // PC tower under desk with glowing fans
  b.box(0.75, 0.3, -1.6, 0.24, 0.56, 0.5, 0x15161f);
  for (let k = 0; k < 3; k++) b.box(0.75, 0.13 + k * 0.17, -1.345, 0.13, 0.13, 0.01, [0xff2bd6, 0x2bf0ff, 0x8f7bff][k], { glow: 1.6, j: 0 });

  // desk lamp (tall arm, warm bulb)
  b.box(-1.5, deskY + 0.015, -1.92, 0.16, 0.03, 0.16, 0x22232e);
  b.box(-1.5, deskY + 0.5, -1.92, 0.03, 1.0, 0.03, 0x22232e);
  b.box(-1.34, deskY + 1.0, -1.82, 0.36, 0.03, 0.03, 0x22232e);
  b.box(-1.16, deskY + 0.96, -1.78, 0.16, 0.08, 0.14, 0xd94a3a);
  b.box(-1.16, deskY + 0.915, -1.78, 0.1, 0.02, 0.09, 0xffd9a0, { glow: 2.6, j: 0 });

  // shelves + books + plant (left wall), books on right wall
  b.box(-RX + 0.14, 1.75, 0.5, 0.26, 0.04, 1.3, WOOD);
  const BOOKS = [0xe0503a, 0x3aa0e0, 0xe0c23a, 0x49c46b, 0xb05ae0, 0xe07a3a, 0xdddddd];
  let bz = -0.08;
  for (let k = 0; k < 11; k++) { const t = rand(0.035, 0.07), hh = rand(0.17, 0.27); b.box(-RX + 0.14, 1.77 + hh / 2, bz + t / 2, 0.17, hh, t - 0.004, BOOKS[k % 7]); bz += t; }
  b.box(-RX + 0.15, 1.83, 0.98, 0.13, 0.12, 0.13, 0xb5653a);
  b.fill(-RX + 0.15, 2.0, 0.98, 0.24, 0.24, 0.24, 0.08, (i, k, l) => ((i + k + l) % 3 === 0 ? null : 0x3fae5a));
  b.box(RX - 0.14, 1.55, -0.2, 0.26, 0.04, 1.0, WOOD);
  bz = -0.62;
  for (let k = 0; k < 8; k++) { const t = rand(0.04, 0.07), hh = rand(0.16, 0.25); b.box(RX - 0.14, 1.57 + hh / 2, bz + t / 2, 0.17, hh, t - 0.004, BOOKS[(k + 3) % 7]); bz += t; }
  // pixel-art space critter poster on the left wall (voxel pixels)
  const ART = ['..X..X..', '...XX...', '..XXXX..', '.XX..XX.', 'XXXXXXXX', 'X.XXXX.X', 'X.X..X.X', '...XX...'];
  ART.forEach((row, ry) => [...row].forEach((ch, rx) => { if (ch === 'X') b.box(-RX + 0.012, 1.3 - ry * 0.06, -1.0 + rx * 0.06, 0.02, 0.056, 0.056, 0x7dff9a, { glow: 0.9, j: 0 }); }));
  b.box(-RX + 0.006, 1.09, -0.79, 0.01, 0.6, 0.6, 0x10111c, { j: 0 });

  // cables everywhere: random axis-aligned walks on the desk and floor
  const cable = (x0, y, z0, n, col) => {
    let cx = x0, cz = z0, ax = Math.random() < 0.5;
    for (let s = 0; s < n; s++) {
      const L = rand(0.1, 0.34) * (Math.random() < 0.5 ? -1 : 1);
      if (ax) { b.box(cx + L / 2, y, cz, Math.abs(L) + 0.014, 0.012, 0.014, col, { j: 0.2 }); cx += L; }
      else { b.box(cx, y, cz + L / 2, 0.014, 0.012, Math.abs(L) + 0.014, col, { j: 0.2 }); cz += L; }
      cx = Math.max(-1.6, Math.min(1.6, cx)); ax = !ax;
    }
  };
  for (const col of [0x111118, 0x2b2d3a, 0xd23a4a, 0x2f6fe0, 0xe0c23a]) {
    let z0 = rand(-1.95, -1.75); cable(rand(-1.2, 1.2), deskY + 0.006, z0, 9, col);
    cable(rand(-1.4, 1.4), 0.03, rand(-1.9, -1.2), 12, col);
  }
  b.box(0.2, 0.04, -1.9, 0.5, 0.05, 0.1, 0xe8e8ee);
  for (let k = 0; k < 4; k++) b.box(0.02 + k * 0.12, 0.07, -1.9, 0.02, 0.012, 0.02, 0xff5533, { glow: 2, j: 0 });
  // energy-drink graveyard + sticky notes on the desk
  for (let k = 0; k < 5; k++) b.box(-0.95 + k * 0.075 + rand(-0.01, 0.01), deskY + 0.06, -1.9 + rand(-0.04, 0.04), 0.055, 0.12, 0.055, [0x2bff8a, 0xff4fd8, 0x37e6ff][k % 3], { j: 0.1 });
  for (let k = 0; k < 4; k++) b.box(0.62 + k * 0.09, deskY + 0.002, -1.02 - (k % 2) * 0.06, 0.075, 0.004, 0.075, [0xffe066, 0xff8fd0, 0x8fe0ff, 0xb7ff8f][k], { j: 0 });

  const room = b.build();
  scene.add(room);

  // window: city far behind the wall (soft, low-res = cheap depth blur), rain sliding on the glass
  const city = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 2.9), new THREE.MeshBasicMaterial({ map: cityTexture(), toneMapped: false, fog: false }));
  city.position.set(0, 1.95, -RZ - 1.6); city.material.color.setScalar(1.25); scene.add(city);
  const rainTex = rainTexture(), rainTex2 = rainTex.clone();
  rainTex.repeat.set(3, 0.9); rainTex2.repeat.set(5, 1.5); rainTex2.needsUpdate = true;
  const mk = (t, z, o) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 1.1), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: o, depthWrite: false, fog: false })); m.position.set(0, 1.8, z); scene.add(m); return m; };
  mk(rainTex, -RZ - 0.01, 0.6); mk(rainTex2, -RZ - 0.03, 0.32);

  // Ubud photo (personal touch) in a voxel frame on the right wall
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.375), new THREE.MeshBasicMaterial({ map: ubudTexture() }));
  photo.material.color.setScalar(0.75);
  photo.position.set(RX - 0.012, 1.98, -0.2); photo.rotation.y = -Math.PI / 2; scene.add(photo);
  const fr = new VoxelBatch(); fr.box(RX - 0.008, 1.98, -0.2, 0.012, 0.43, 0.56, 0xd9b36a, { j: 0 });
  scene.add(fr.build(false));

  // RGB strips: instanced glow segments whose colours cycle every frame
  const segs = [];
  for (let i = 0; i < 28; i++) segs.push([-1.72 + i * 0.1275, deskY + 0.012, -2.085, 0.125, 0.02, 0.02]);
  for (let i = 0; i < 28; i++) segs.push([-1.72 + i * 0.1275, deskY - 0.05, -0.96, 0.125, 0.015, 0.015]);
  for (let i = 0; i < 40; i++) segs.push([-2.44 + i * 0.125, RH - 0.03, -RZ + 0.03, 0.122, 0.025, 0.025]);
  const rgb = new THREE.InstancedMesh(UNIT, GLOW, segs.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  segs.forEach((s, i) => { m4.compose(new THREE.Vector3(s[0], s[1], s[2]), q, new THREE.Vector3(s[3], s[4], s[5])); rgb.setMatrixAt(i, m4); rgb.setColorAt(i, col.set(0xff00ff)); });
  scene.add(rgb);

  // lights — the monitors and RGB do the work; ambient stays low and coloured, never gray
  scene.add(new THREE.AmbientLight(0x3a3470, 0.55));
  scene.add(new THREE.HemisphereLight(0x4a5cc0, 0x2a1020, 0.5));
  const screenL = new THREE.PointLight(0x9dbcff, 3.0, 7, 1.6); screenL.position.set(0, 1.3, -0.95); scene.add(screenL);
  const screenR = new THREE.PointLight(0x9dbcff, 1.6, 4, 1.8); screenR.position.set(1.0, 1.2, -0.5); scene.add(screenR);
  const rgbA = new THREE.PointLight(0xff2bd6, 3.2, 5, 1.7); rgbA.position.set(-1.3, 1.05, -1.9); scene.add(rgbA);
  const rgbB = new THREE.PointLight(0x2bf0ff, 3.2, 5, 1.7); rgbB.position.set(1.3, 1.05, -1.9); scene.add(rgbB);
  const rgbC = new THREE.PointLight(0x8f7bff, 1.8, 3.5, 1.8); rgbC.position.set(0, 0.45, -1.2); scene.add(rgbC);
  const cityL = new THREE.PointLight(0xa070ff, 2.2, 6, 1.6); cityL.position.set(0, 2.1, -1.9); scene.add(cityL);
  const lamp = new THREE.SpotLight(0xffb878, 5, 6, 0.62, 0.85, 1.5);
  lamp.position.set(-1.16, deskY + 0.9, -1.78); lamp.target.position.set(-0.45, deskY, -1.25);
  lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.radius = 5; lamp.shadow.bias = -0.0015; lamp.shadow.camera.near = 0.1; lamp.shadow.camera.far = 6;
  scene.add(lamp, lamp.target);

  // the Hall Monitor: PARABLE's safety bot, hanging from the ceiling, staring at whoever it flagged
  const hb = new VoxelBatch();
  hb.box(0, 0, 0, 0.26, 0.17, 0.3, 0xe9ecf4); hb.box(0, 0, 0.152, 0.2, 0.11, 0.01, 0x0d0e16, { j: 0 });
  hb.box(-0.14, 0.02, 0, 0.03, 0.06, 0.1, 0xffc61a); hb.box(0.14, 0.02, 0, 0.03, 0.06, 0.1, 0xffc61a);
  hb.box(0, 0.1, -0.05, 0.05, 0.05, 0.05, 0x8a8fa8); hb.box(0, -0.1, 0.1, 0.2, 0.03, 0.02, 0xffc61a);
  const bot = hb.build(); bot.position.set(0, 2.06, -1.93); scene.add(bot);
  const eye = new THREE.Mesh(UNIT, new THREE.MeshBasicMaterial({ color: 0x33ff88, toneMapped: false })); eye.scale.set(0.07, 0.07, 0.02); eye.position.set(0, 0, 0.16); bot.add(eye);
  const arm = new VoxelBatch(); arm.box(0, 2.42, -1.98, 0.04, 0.56, 0.04, 0x8a8fa8); arm.box(0, 2.68, -1.98, 0.2, 0.04, 0.2, 0x555a70); scene.add(arm.build());
  const botQ = new THREE.Quaternion(), botM = new THREE.Matrix4(), botT = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);

  const cA = new THREE.Color(), cB = new THREE.Color(), cool = new THREE.Color(0x9dbcff), hot = new THREE.Color(0xff3048);
  const colliders = [
    { min: [-1.75, 0.69, -2.1], max: [1.75, 0.75, -0.95] },
    { min: [1.15, 0.69, -0.95], max: [1.75, 0.75, 0.25] },
  ];

  return {
    colliders, rgbA, rgbB,
    rgbColor(phase, out) { return out.setHSL((phase % 1 + 1) % 1, 1, 0.55); },
    // t = seconds, alert = 0..1 (flag pressure), calm = 0..1
    update(t, alert, calm, target) {
      if (target) botT.copy(target); else botT.set(Math.sin(t * 0.5) * 1.4, 1.0, -0.3);
      botM.lookAt(botT, bot.position, UP); botQ.setFromRotationMatrix(botM); bot.quaternion.slerp(botQ, 0.12);
      if (target) eye.material.color.setRGB(3.2, 0.1 + 0.3 * Math.sin(t * 20) ** 2, 0.15); else eye.material.color.setRGB(0.2, 1.6, 0.6);
      eye.scale.x = eye.scale.y = target ? 0.085 : 0.06;
      rainTex.offset.y = t * 0.11; rainTex2.offset.y = t * 0.2; rainTex2.offset.x = Math.sin(t * 0.2) * 0.02;
      const h = t * 0.045;
      for (let i = 0; i < segs.length; i++) { col.setHSL((h + i * 0.012) % 1, 1, 0.55).multiplyScalar(1.7); rgb.setColorAt(i, col); }
      rgb.instanceColor.needsUpdate = true;
      rgbA.color.copy(cA.setHSL(h % 1, 1, 0.55)); rgbB.color.copy(cB.setHSL((h + 0.38) % 1, 1, 0.55));
      rgbC.color.setHSL((h + 0.2) % 1, 1, 0.6);
      screenL.color.copy(cool).lerp(hot, alert * (0.6 + 0.4 * Math.sin(t * 16)));
      screenL.intensity = 3.0 + Math.sin(t * 9) * 0.15 + alert * 1.5;
      lamp.intensity = 5 + calm * 4;
    },
  };
}
