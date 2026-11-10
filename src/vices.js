// Vices: beer (confidence, sway, typos) and vape (a drifting fruity cloud that hides your monitors but calms the timers).
import * as THREE from 'three';
import { VoxelBatch, rand, clamp } from './voxel.js';

const NP = 70;

function puffTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  for (let i = 0; i < 9; i++) { // lumpy cloud = several soft blobs
    const px = 64 + rand(-22, 22), py = 64 + rand(-22, 22), r = rand(24, 40);
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, 'rgba(255,255,255,0.34)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(c);
}

export class Vices {
  constructor(G, room) {
    this.G = G; this.room = room;
    const tex = puffTexture();
    this.puffs = [];
    for (let i = 0; i < NP; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0, fog: false, rotation: rand(0, 6.28) }));
      s.visible = false; s.renderOrder = 5; G.scene.add(s);
      this.puffs.push({ s, v: new THREE.Vector3(), age: 0, life: 0, seed: rand(0, 100) });
    }
    const b = new VoxelBatch();
    b.box(0, 0, 0, 0.022, 0.1, 0.022, 0xff4fd8); b.box(0, 0.06, 0, 0.014, 0.03, 0.014, 0x15161f); b.box(0, -0.04, 0.012, 0.01, 0.01, 0.003, 0x37e6ff, { glow: 3, j: 0 });
    this.pen = b.build(false); this.pen.position.set(0.12, -0.16, -0.32); this.pen.rotation.set(0.5, 0, -0.5); this.pen.visible = false; G.camera.add(this.pen);
    this.np = 0; this.reset();
  }

  reset() {
    for (const p of this.puffs) { p.life = 0; p.s.visible = false; }
    this.G.drunk = 0; this.G.vapeCalm = 0; this.beerCd = 0; this.holdT = 0; this.emitT = 0; this.counted = false; this.pen.visible = false;
  }

  beer() {
    const G = this.G;
    if (G.state !== 'playing' || this.beerCd > 0) return;
    this.beerCd = 1.4; G.drunk = Math.min(4, G.drunk + 1); G.stats.beers++;
    G.sfx.canOpen(); G.ui.toast('+CONFIDENCE', 'good');
    G.ui.hint(G.drunk >= 3 ? 'Appeal hitbox: enormous. Typing: questionable.' : 'Beer: bigger appeal hitbox, wobblier everything');
    G.props.canT.push(1.0);
  }

  update(dt, t, held) {
    const G = this.G;
    this.beerCd = Math.max(0, this.beerCd - dt);
    G.drunk = Math.max(0, G.drunk - dt / 24);
    const cam = G.camera;
    if (held && G.state === 'playing') {
      this.holdT += dt; this.emitT -= dt; this.pen.visible = true;
      if (!this.counted && this.holdT > 0.3) { this.counted = true; G.stats.vapes++; G.sfx.puff(); G.ui.hint('Vape: timers slow down... if you can still see them'); }
      if (this.holdT > 0.25 && this.emitT <= 0) {
        this.emitT = 0.085;
        const p = this.puffs[this.np]; this.np = (this.np + 1) % NP;
        const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
        p.s.position.copy(cam.position).addScaledVector(dir, 0.35); p.s.position.y -= 0.1;
        p.v.copy(dir).multiplyScalar(rand(0.9, 1.7)).add(new THREE.Vector3(rand(-0.25, 0.25), rand(-0.05, 0.3), rand(-0.25, 0.25)));
        p.age = 0; p.life = rand(13, 20); p.s.visible = true;
        if (Math.random() < 0.12) G.sfx.puff();
      }
    } else { this.holdT = 0; this.counted = false; this.pen.visible = false; }

    let active = 0;
    const cA = this.room.rgbA.color, cB = this.room.rgbB.color;
    for (const p of this.puffs) {
      if (p.life <= 0) continue;
      p.age += dt;
      if (p.age >= p.life) { p.life = 0; p.s.visible = false; continue; }
      active += 1 - p.age / p.life;
      p.v.multiplyScalar(Math.exp(-dt * 1.4));
      p.v.x += Math.sin(t * 0.4 + p.seed) * 0.012 * dt; p.v.y += 0.01 * dt; p.v.z += Math.cos(t * 0.33 + p.seed) * 0.012 * dt;
      p.s.position.addScaledVector(p.v, dt);
      p.s.position.y = clamp(p.s.position.y, 0.3, 2.5); p.s.position.z = Math.max(-2.0, p.s.position.z);
      const size = 0.14 + 1.35 * (1 - Math.exp(-p.age * 0.55));
      p.s.scale.set(size, size, 1);
      p.s.material.rotation += dt * 0.05 * (p.seed % 2 ? 1 : -1);
      p.s.material.opacity = Math.min(1, p.age * 2.5) * 0.62 * Math.pow(1 - p.age / p.life, 1.2);
      // lit by the RGB strips: tint follows whichever strip the puff is nearer to
      const k = clamp((p.s.position.x + 1.5) / 3, 0, 1);
      p.s.material.color.copy(cA).lerp(cB, k).lerp(new THREE.Color(1, 1, 1), 0.5);
    }
    const target = clamp(active / 20, 0, 1);
    G.vapeCalm += (target - G.vapeCalm) * (1 - Math.exp(-dt * 2));
  }
}
