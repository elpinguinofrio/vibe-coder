// Props: the plush penguin (the star), mini fridge, gaming chair, and everything on the desk you can grab, swing, throw and smash.
import * as THREE from 'three';
import { VoxelBatch, rand } from './voxel.js';
import { ROOM } from './room.js';
import { canModel } from './hifi.js';
import { t } from './i18n.js';

const DY = ROOM.deskY;

function bubbleSprite() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 96;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, fog: false }));
  s.scale.set(0.36, 0.135, 1); s.visible = false;
  s.userData.say = (text) => {
    const x = c.getContext('2d'); x.clearRect(0, 0, 256, 96);
    x.fillStyle = '#fff'; x.beginPath(); x.roundRect ? x.roundRect(4, 4, 248, 66, 22) : x.rect(4, 4, 248, 66); x.fill();
    x.beginPath(); x.moveTo(110, 68); x.lineTo(128, 94); x.lineTo(146, 68); x.fill();
    x.fillStyle = '#1a1c2c'; x.font = 'bold 30px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t(text), 128, 38);
    tex.needsUpdate = true; s.visible = true;
  };
  return s;
}

// The cutest object in the game: round where everything else is square.
export class Penguin {
  constructor(scene) {
    const g = (this.group = new THREE.Group());
    const plush = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1 });
    const NAVY = plush(0x34406e), WHITE = plush(0xfff4e6), ORANGE = plush(0xffa22e), RED = plush(0xe8323c), BLACK = new THREE.MeshStandardMaterial({ color: 0x0b0b12, roughness: 0.25 });
    const sph = new THREE.SphereGeometry(1, 28, 20);
    const ball = (mat, r, x, y, z, sx = 1, sy = 1, sz = 1, parent = this.body) => { const m = new THREE.Mesh(sph, mat); m.position.set(x, y, z); m.scale.set(r * sx, r * sy, r * sz); m.castShadow = true; parent.add(m); return m; };
    this.body = new THREE.Group(); g.add(this.body);
    ball(NAVY, 0.105, 0, 0.108, 0, 1, 1.08, 0.96);
    ball(WHITE, 0.088, 0, 0.098, 0.036, 0.9, 0.98, 0.78);
    ball(NAVY, 0.05, -0.105, 0.125, 0.0, 0.36, 1, 0.62).rotation.z = -0.42;
    ball(NAVY, 0.05, 0.105, 0.125, 0.0, 0.36, 1, 0.62).rotation.z = 0.42;
    ball(ORANGE, 0.032, -0.045, 0.012, 0.07, 1, 0.42, 1.45);
    ball(ORANGE, 0.032, 0.045, 0.012, 0.07, 1, 0.42, 1.45);
    // tiny scarf (personal touch)
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.02, 12, 28), RED); scarf.rotation.x = Math.PI / 2; scarf.position.y = 0.19; scarf.castShadow = true; this.body.add(scarf);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.085, 0.016), RED); tail.position.set(0.045, 0.145, 0.082); tail.rotation.z = 0.25; this.body.add(tail);
    const tail2 = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.012, 0.018), plush(0xfff4e6)); tail2.position.set(0.053, 0.118, 0.083); tail2.rotation.z = 0.25; this.body.add(tail2);

    this.head = new THREE.Group(); this.head.position.y = 0.245; this.body.add(this.head);
    ball(NAVY, 0.084, 0, 0, 0, 1.04, 0.96, 1, this.head);
    ball(WHITE, 0.062, -0.027, -0.012, 0.042, 0.72, 0.8, 0.62, this.head);
    ball(WHITE, 0.062, 0.027, -0.012, 0.042, 0.72, 0.8, 0.62, this.head);
    this.eyes = [ball(BLACK, 0.0135, -0.03, 0.002, 0.079, 1, 1.15, 0.7, this.head), ball(BLACK, 0.0135, 0.03, 0.002, 0.079, 1, 1.15, 0.7, this.head)];
    const SHINE = new THREE.MeshBasicMaterial({ color: 0xffffff });
    ball(SHINE, 0.0045, -0.026, 0.008, 0.088, 1, 1, 1, this.head); ball(SHINE, 0.0045, 0.034, 0.008, 0.088, 1, 1, 1, this.head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.017, 0.03, 14), ORANGE); beak.rotation.x = Math.PI / 2; beak.position.set(0, -0.02, 0.09); beak.scale.set(1.25, 1, 0.8); this.head.add(beak);
    const BLUSH = new THREE.MeshBasicMaterial({ color: 0xff8fa8, transparent: true, opacity: 0.75 });
    ball(BLUSH, 0.013, -0.052, -0.022, 0.066, 1, 0.6, 0.4, this.head); ball(BLUSH, 0.013, 0.052, -0.022, 0.066, 1, 0.6, 0.4, this.head);
    this.brows = [-1, 1].map((s) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.008, 0.008), BLACK); m.position.set(s * 0.03, 0.026, 0.082); m.rotation.z = s * 0.55; m.visible = false; this.head.add(m); return m; });

    this.bubble = bubbleSprite(); this.bubble.position.set(0.02, 0.47, 0); g.add(this.bubble);
    this.home = new THREE.Vector3(-0.6, DY, -1.36);
    g.position.copy(this.home); g.scale.setScalar(0.82);
    this.baseYaw = Math.atan2(0 - this.home.x, -0.42 - this.home.z);
    g.userData.penguin = this;
    this.center = this.home.clone().add(new THREE.Vector3(0, 0.125, 0)); this.r = 0.13;
    scene.add(g);
    this.reset();
  }

  reset() { this.wob = 0; this.wobV = 0; this.wobX = 0; this.wobXV = 0; this.sq = 0; this.squeezing = false; this.offT = 0; this.bubT = 0; this.blink = 2; this.bubble.visible = false; }
  bonk(a) { this.wobV += (Math.random() < 0.5 ? -1 : 1) * a * 1.6; this.wobXV += rand(-1, 1) * a; }
  say(t, dur = 2) { this.bubble.userData.say(t); this.bubT = dur; }
  offend() { this.offT = 3.2; this.say('...rude.', 2.6); this.bonk(2.5); }
  squeak() { this.say('♥ squeak ♥', 1.4); this.bonk(0.6); }

  update(dt, t) {
    // wobble spring (soft toy physics)
    this.wobV += (-90 * this.wob - 5 * this.wobV) * dt; this.wob += this.wobV * dt;
    this.wobXV += (-90 * this.wobX - 5 * this.wobXV) * dt; this.wobX += this.wobXV * dt;
    this.wob = Math.max(-0.5, Math.min(0.5, this.wob)); this.wobX = Math.max(-0.4, Math.min(0.4, this.wobX));
    this.sq += ((this.squeezing ? 1 : 0) - this.sq) * (1 - Math.exp(-dt * 16));
    const breathe = Math.sin(t * 2.1) * 0.018, s = this.sq;
    this.body.scale.set(1 + s * 0.3 - breathe * 0.5, 1 - s * 0.36 + breathe, 1 + s * 0.3 - breathe * 0.5);
    this.body.rotation.z = this.wob; this.body.rotation.x = this.wobX;
    this.offT = Math.max(0, this.offT - dt);
    const off = this.offT > 0;
    this.brows[0].visible = this.brows[1].visible = off;
    this.group.rotation.y += ((this.baseYaw + (off ? -1.25 : 0)) - this.group.rotation.y) * (1 - Math.exp(-dt * 8));
    this.head.rotation.z = Math.sin(t * 0.7) * 0.09 + this.wob * 0.6; this.head.rotation.x = off ? -0.2 : Math.sin(t * 0.45) * 0.05;
    this.blink -= dt; if (this.blink < -0.12) this.blink = rand(2, 4.5);
    const ey = this.blink < 0 || s > 0.5 ? 0.15 : 1.15;
    this.eyes[0].scale.y = this.eyes[1].scale.y = 0.0135 * ey;
    if (this.bubT > 0) { this.bubT -= dt; if (this.bubT <= 0) this.bubble.visible = false; }
  }
}

function keyboard() {
  const b = new VoxelBatch();
  b.box(0, 0, 0, 0.46, 0.022, 0.16, 0x1b1c28);
  const caps = [0xb9b2a2, 0xb9b2a2, 0xb9b2a2, 0xd978b0, 0x62c2b4];
  for (let i = 0; i < 14; i++) for (let r = 0; r < 5; r++) {
    if (r === 4 && i > 3 && i < 10) { if (i === 4) b.box(0.012, 0.017, 0.058, 0.17, 0.012, 0.024, 0xb9b2a2, { j: 0.02 }); continue; }
    const accent = (i === 0 && r === 0) || (i === 13 && r > 1) ? 0xff5f6e : caps[(i * 7 + r * 3) % 5];
    b.box(-0.2 + i * 0.0308, 0.017, -0.058 + r * 0.029, 0.026, 0.012, 0.024, accent, { j: 0.04 });
  }
  b.box(0, -0.008, -0.07, 0.44, 0.006, 0.01, 0xff2bd6, { glow: 1.6, j: 0 });
  return b;
}
function mouse() { const b = new VoxelBatch(); b.box(0, 0, 0, 0.06, 0.03, 0.1, 0x22232e); b.box(0, 0.012, -0.012, 0.05, 0.016, 0.07, 0x2c2e3c); b.box(0, 0.022, -0.03, 0.01, 0.008, 0.022, 0x37e6ff, { glow: 2, j: 0 }); return b; }
function mug() {
  const b = new VoxelBatch(), C = 0xf2efe6;
  b.box(0, -0.04, 0, 0.08, 0.012, 0.08, C); b.box(-0.034, 0, 0, 0.012, 0.09, 0.08, C); b.box(0.034, 0, 0, 0.012, 0.09, 0.08, C);
  b.box(0, 0, -0.034, 0.056, 0.09, 0.012, C); b.box(0, 0, 0.034, 0.056, 0.09, 0.012, C); b.box(0, 0.025, 0, 0.056, 0.01, 0.056, 0x3b2314);
  b.box(0.055, 0.02, 0, 0.03, 0.012, 0.014, C); b.box(0.055, -0.02, 0, 0.03, 0.012, 0.014, C); b.box(0.066, 0, 0, 0.012, 0.04, 0.014, C);
  b.box(0, 0.005, 0.041, 0.03, 0.03, 0.003, 0xff5f6e, { j: 0 });
  return b;
}
function pizza() {
  const b = new VoxelBatch();
  b.box(0, -0.018, 0, 0.38, 0.012, 0.38, 0xb98a55); b.fill(0, -0.006, 0, 0.3, 0.012, 0.3, 0.06, (i, k, l) => ((i + l) % 3 === 0 ? 0xd9432f : 0xf2c14e));
  b.box(0, 0.012, 0, 0.38, 0.012, 0.38, 0xc49a66); b.box(0, 0.019, 0, 0.2, 0.003, 0.2, 0xd9432f, { j: 0 });
  for (const s of [-1, 1]) { b.box(s * 0.184, -0.003, 0, 0.012, 0.03, 0.38, 0xb98a55); b.box(0, -0.003, s * 0.184, 0.38, 0.03, 0.012, 0xb98a55); }
  return b;
}
function can(col) { const b = new VoxelBatch(); b.box(0, 0, 0, 0.054, 0.1, 0.054, col); b.box(0, 0.053, 0, 0.046, 0.006, 0.046, 0xc9ced8); b.box(0, -0.053, 0, 0.046, 0.006, 0.046, 0xc9ced8); b.box(0, 0.005, 0.0275, 0.03, 0.04, 0.002, 0xffffff, { j: 0 }); return b; }
function chair() {
  const b = new VoxelBatch(), K = 0x17181f, R = 0xe8323c;
  for (let a = 0; a < 5; a++) { const an = (a / 5) * Math.PI * 2; b.box(Math.sin(an) * 0.17, -0.42, Math.cos(an) * 0.17, 0.07, 0.04, 0.07, 0x2a2c38); b.box(Math.sin(an) * 0.3, -0.42, Math.cos(an) * 0.3, 0.08, 0.05, 0.08, 0x111118); }
  b.box(0, -0.43, 0, 0.14, 0.04, 0.14, 0x2a2c38); b.box(0, -0.23, 0, 0.05, 0.4, 0.05, 0x8a8fa8);
  b.box(0, 0, 0, 0.5, 0.09, 0.5, K); b.box(0, 0.05, 0, 0.14, 0.012, 0.5, R);
  b.box(0, 0.42, 0.25, 0.48, 0.76, 0.09, K); b.box(-0.17, 0.42, 0.203, 0.06, 0.74, 0.012, R); b.box(0.17, 0.42, 0.203, 0.06, 0.74, 0.012, R);
  b.box(0, 0.86, 0.25, 0.3, 0.16, 0.1, K); b.box(0, 0.86, 0.198, 0.2, 0.05, 0.012, R);
  for (const s of [-1, 1]) { b.box(s * 0.27, 0.12, 0.02, 0.05, 0.2, 0.05, 0x2a2c38); b.box(s * 0.27, 0.23, -0.02, 0.07, 0.03, 0.3, K); }
  return b;
}
function fridge() {
  const b = new VoxelBatch(), W = 0xdfe4ee;
  b.box(0, 0.42, 0, 0.5, 0.84, 0.5, W); b.box(0.256, 0.42, 0, 0.012, 0.8, 0.46, 0xeef2f8); b.box(0.268, 0.6, 0.17, 0.014, 0.3, 0.03, 0x8a8fa8);
  b.box(0.264, 0.14, 0, 0.004, 0.02, 0.4, 0x37e6ff, { glow: 2, j: 0 });
  for (const [y, z, c] of [[0.66, -0.1, 0xff4fd8], [0.5, -0.02, 0xffe14a], [0.72, 0.02, 0x2bff8a], [0.42, -0.14, 0xff7a3a]]) b.box(0.264, y, z, 0.004, 0.06, 0.07, c, { j: 0 });
  return b;
}

export class Props {
  constructor(G, destruction) {
    this.G = G; this.D = destruction; this.list = [];
    this.penguin = new Penguin(G.scene); G.penguin = this.penguin;
    this.fridge = fridge().build(); this.fridge.position.set(-2.12, 0, -0.5); this.fridge.userData.fridge = true; G.scene.add(this.fridge);
    destruction.colliders.push({ min: [-2.37, 0, -0.75], max: [-1.87, 0.84, -0.25] });
    const pad = new VoxelBatch(); pad.box(0.42, DY + 0.003, -1.15, 0.26, 0.006, 0.22, 0x2a1f4a); G.scene.add(pad.build());
    // your fist (hoodie sleeve included) — jabs on every click
    const f = new VoxelBatch();
    f.box(0, 0, 0.2, 0.1, 0.1, 0.34, 0x6a4bd8); f.box(0, 0, 0.02, 0.105, 0.105, 0.03, 0x4d34b0); f.box(0, 0, -0.04, 0.09, 0.085, 0.09, 0xf0c39a); f.box(-0.05, -0.01, -0.03, 0.025, 0.04, 0.06, 0xe6b488);
    this.fist = f.build(false); this.fist.scale.setScalar(0.62); G.camera.add(this.fist);
    this.reset();
  }

  add(kind, batch, x, y, z, o) {
    const group = o.mesh || batch.build(); group.position.set(x, y, z); // o.mesh = smooth model; the voxel batch is then only the debris recipe
    const prop = { kind, group, boxes: batch.boxes, hp: 1, price: 0, label: kind, grab: true, home: true, spin: 0, ...o };
    group.userData.prop = prop;
    prop.body = this.D.addBody({ obj: group, r: o.r, hitR: o.hitR, sleep: o.sleep ?? true, prop });
    this.G.scene.add(group); this.list.push(prop);
    return prop;
  }

  reset() {
    for (const p of this.list) { p.group.parent && p.group.parent.remove(p.group); }
    this.list = []; this.penguin.reset(); this.canT = [];
    this.add('keyboard', keyboard(), 0.02, DY + 0.012, -1.16, { hp: 2, price: 189, label: 'mechanical keyboard (custom keycaps)', r: 0.012, hitR: 0.2 });
    this.add('mouse', mouse(), 0.42, DY + 0.021, -1.15, { hp: 1, price: 79, label: 'gaming mouse (26,000 DPI)', r: 0.016, hitR: 0.07 });
    this.add('mug', mug(), 0.74, DY + 0.046, -1.3, { hp: 1, price: 24, label: 'mug ("World\'s Okayest Dev")', r: 0.046, hitR: 0.08 });
    this.add('pizza', pizza(), 1.45, DY + 0.025, 0.02, { hp: 1, price: 18.99, label: 'pizza (two slices left, RIP)', r: 0.025, hitR: 0.22 });
    this.chair = this.add('chair', chair(), 0, 0.45, -0.3, { hp: 4, price: 399, label: 'gaming chair (racing stripes)', r: 0.45, hitR: 0.45 });
    for (let k = 0; k < 2; k++) this.spawnCan(-0.82 + k * 0.09, DY + 0.063, -1.36 - k * 0.05, true);
  }

  spawnCan(x = rand(0.55, 1.0), y = DY + 0.4, z = rand(-1.45, -1.2), sleep = false) {
    const col = [0x2bff8a, 0xff4fd8, 0x37e6ff, 0xffe14a][(Math.random() * 4) | 0];
    const mesh = canModel(col); mesh.rotation.y = rand(0, 6.28);
    const p = this.add('can', can(col), x, y, z, { hp: 2, label: 'empty can', r: 0.063, hitR: 0.075, sleep, mesh });
    if (!sleep) { p.body.vel.set(rand(-0.5, 0.5), 1.2, rand(-0.3, 0.3)); p.body.ang.set(rand(-4, 4), rand(-4, 4), rand(-4, 4)); }
    return p;
  }

  targets() { const t = [this.penguin.group, this.fridge]; for (const p of this.list) if (!p.body.held) t.push(p.group); return t; }

  grab(p) {
    p.body.held = true; p.body.sleep = false; p.home = false;
    this.G.camera.add(p.group); p.group.rotation.set(0.25, 0.5, 0.1);
    this.G.sfx.clink();
  }

  throw(p, dir) {
    const G = this.G, w = new THREE.Vector3();
    p.group.getWorldPosition(w); G.scene.add(p.group);
    p.group.position.copy(G.camera.position).addScaledVector(dir, 0.55); p.group.position.y -= 0.12;
    p.body.held = false; p.body.sleep = false; p.body.thrown = true; p.body.restT = 0;
    p.body.vel.copy(dir).multiplyScalar(p.kind === 'chair' ? 7.5 : 11).add(new THREE.Vector3(0, 1.6, 0));
    p.body.ang.set(rand(-9, 9), rand(-9, 9), rand(-9, 9));
    G.sfx.whoosh(); G.stats.thrown++;
  }

  hit(p, dmg, dir) {
    const G = this.G;
    if (!p || p.dead) return;
    if (p.kind === 'chair' && dmg === 1 && !p.body.thrown && p.body.sleep) { p.spin += 14 * (Math.random() < 0.5 ? -1 : 1); G.sfx.whoosh(); return; }
    p.hp -= dmg;
    if (p.kind === 'can' && p.hp === 1) { p.group.scale.y = 0.38; p.body.r *= 0.4; G.sfx.crush(); G.stats.crushed++; }
    if (p.hp <= 0) return this.smash(p, dir);
    p.body.sleep = false; p.body.restT = 0;
    p.body.vel.copy(dir).multiplyScalar(2.2).add(new THREE.Vector3(rand(-0.6, 0.6), 2.2, rand(-0.6, 0.6)));
    p.body.ang.set(rand(-7, 7), rand(-7, 7), rand(-7, 7));
    G.sfx.punch(); G.addRage(0.07); G.player.shake(0.2);
  }

  smash(p, dir) {
    const G = this.G;
    p.dead = true; p.group.updateMatrixWorld(true);
    this.D.burst(p.boxes, p.group.matrixWorld, dir, 0.8);
    this.D.sparks(p.group.getWorldPosition(new THREE.Vector3()), 8);
    p.group.parent && p.group.parent.remove(p.group);
    this.D.removeBody(p.body); this.list.splice(this.list.indexOf(p), 1);
    if (G.held === p) G.held = null;
    if (p.price) { G.stats.invoice.push({ label: p.label, price: p.price }); G.ui.toast(`-$${p.price}`, 'info'); }
    G.sfx.shatter(); G.player.shake(0.5); G.hitStop = 0.05; G.addRage(0.22);
    this.penguin.bonk(1.2);
  }

  update(dt, t) {
    const G = this.G, P = this.penguin;
    P.update(dt, t);
    if (G.player.trauma > 0.3) P.bonk(G.player.trauma * dt * 6);
    const c = this.chair;
    if (c && !c.dead) {
      G.player.chairOk = c.home;
      if (c.body.sleep && !c.body.held) {
        if (G.player.seated && c.home) { c.group.rotation.y = G.player.yaw; c.spin = 0; }
        else { c.group.rotation.y += c.spin * dt; c.spin *= Math.exp(-dt * 1.3); }
      }
    } else G.player.chairOk = false;
    const fk = G.held ? 0 : Math.sin((Math.max(0, G.swingT) / 0.22) * Math.PI);
    this.fist.visible = fk > 0.01;
    this.fist.position.set(0.2 - fk * 0.12, -0.3 + fk * 0.14, -0.4 - fk * 0.32); this.fist.rotation.set(-0.3 + 0.2 * fk, 0.35 * (1 - fk), 0);
    if (G.held) {
      const s = Math.max(0, G.swingT) / 0.22, k = Math.sin(s * Math.PI);
      const big = G.held.kind === 'chair';
      G.held.group.position.set(0.36 - k * 0.2, (big ? -0.5 : -0.3) + k * 0.05, (big ? -1.0 : -0.62) - k * 0.25);
      G.held.group.rotation.set(0.25 - k * 1.5, 0.5 + k * 0.5, 0.1);
    }
    for (let i = this.canT.length - 1; i >= 0; i--) { this.canT[i] -= dt; if (this.canT[i] <= 0) { this.canT.splice(i, 1); this.spawnCan(); } }
  }
}
