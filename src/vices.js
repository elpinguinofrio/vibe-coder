// Vices: beer (confidence, sway, typos) and vape (a drifting fruity cloud that hides your monitors but calms the timers).
import * as THREE from 'three';
import { rand, clamp } from './voxel.js';
import { canModel, handModel, vapeModel, puffTextures } from './hifi.js';

const NP = 96, BEER_T = 1.7;
const WHITE = new THREE.Color(1, 1, 1);

export class Vices {
  constructor(G, room) {
    this.G = G; this.room = room;
    const tex = puffTextures(4);
    this.puffs = [];
    for (let i = 0; i < NP; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex[i % 4], transparent: true, depthWrite: false, opacity: 0, fog: false, rotation: rand(0, 6.28) }));
      s.visible = false; s.renderOrder = 5; G.scene.add(s);
      this.puffs.push({ s, v: new THREE.Vector3(), age: 0, life: 0, seed: rand(0, 100), big: rand(0.8, 1.25) });
    }
    // high-fidelity hero props held up to the camera: vape pen and beer can, each in a modelled hand
    this.pen = new THREE.Group(); this.penModel = vapeModel(); this.pen.add(this.penModel, handModel(0.0115));
    this.pen.visible = false; this.penK = 0; G.camera.add(this.pen);
    this.can = new THREE.Group(); this.can.add(canModel(0x2bff8a, true), handModel(0.033));
    this.can.visible = false; G.camera.add(this.can);
    this.np = 0; this.reset();
  }

  reset() {
    for (const p of this.puffs) { p.life = 0; p.s.visible = false; }
    this.G.drunk = 0; this.G.vapeCalm = 0; this.beerCd = 0; this.drinkK = 0; this.tossed = false; this.holdT = 0; this.emitT = 0; this.counted = false; this.pen.visible = false; this.penK = 0;
  }

  beer() {
    const G = this.G;
    if (G.state !== 'playing' || this.beerCd > 0) return;
    this.beerCd = BEER_T; this.tossed = false; G.drunk = Math.min(4, G.drunk + 1); G.stats.beers++;
    G.sfx.canOpen(); G.ui.toast('+CONFIDENCE', 'good');
    G.ui.hint(G.drunk >= 3 ? 'Appeal hitbox: enormous. Typing: questionable.' : 'Beer: bigger appeal hitbox, wobblier everything');
  }

  update(dt, t, held) {
    const G = this.G;
    this.beerCd = Math.max(0, this.beerCd - dt);
    const cam = G.camera;
    // drinking animation: raise the can to your face, tip it back (the camera tips with it), lower it, toss the empty
    const u = this.beerCd > 0 ? 1 - this.beerCd / BEER_T : 1, ss = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
    const raise = ss(0, 0.2, u), tip = ss(0.2, 0.42, u) * (1 - ss(0.76, 0.9, u)), lower = ss(0.86, 1, u);
    this.drinkK = this.beerCd > 0 ? tip : 0;
    this.can.visible = this.beerCd > 0;
    this.can.position.set(0.24 - raise * 0.21 + lower * 0.12, -0.46 + raise * 0.34 + tip * 0.07 - lower * 0.45, -0.33 + tip * 0.07);
    this.can.rotation.set(tip * 1.5, -0.35 + raise * 0.2, -0.15 * (1 - tip));
    G.player.tilt = this.drinkK * 0.2;
    if (this.beerCd > 0 && u > 0.88 && !this.tossed) { // toss the empty onto the desk
      this.tossed = true;
      const dir = new THREE.Vector3(0.25, 0, -1).applyQuaternion(cam.quaternion).normalize();
      const p = G.props.spawnCan(cam.position.x + dir.x * 0.4, cam.position.y - 0.25, cam.position.z + dir.z * 0.4, false);
      p.body.vel.copy(dir).multiplyScalar(2.4).add(new THREE.Vector3(0, 1.6, 0));
    }
    G.drunk = Math.max(0, G.drunk - dt / 24);
    if (held && G.state === 'playing') {
      this.holdT += dt; this.emitT -= dt;
      if (!this.counted && this.holdT > 0.3) { this.counted = true; G.stats.vapes++; G.sfx.puff(); G.ui.hint('Vape: timers slow down... if you can still see them'); }
      if (this.holdT > 0.25 && this.emitT <= 0) {
        this.emitT = 0.065;
        const p = this.puffs[this.np]; this.np = (this.np + 1) % NP;
        const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
        p.s.position.copy(cam.position).addScaledVector(dir, 0.35); p.s.position.y -= 0.1;
        p.v.copy(dir).multiplyScalar(rand(0.9, 1.7)).add(new THREE.Vector3(rand(-0.25, 0.25), rand(-0.05, 0.3), rand(-0.25, 0.25)));
        p.age = 0; p.life = rand(13, 20); p.s.visible = true;
        if (Math.random() < 0.12) G.sfx.puff();
      }
    } else { this.holdT = 0; this.counted = false; }
    // pen comes up to your mouth while V is held, LED pulses, then lowers
    const vaping = held && G.state === 'playing';
    this.penK += ((vaping ? 1 : 0) - this.penK) * (1 - Math.exp(-dt * 12));
    this.pen.visible = this.penK > 0.02;
    this.pen.position.set(0.2 - this.penK * 0.13, -0.42 + this.penK * 0.33, -0.3 + this.penK * 0.03);
    this.pen.rotation.set(0.45 + this.penK * 0.8, -0.25, -0.35 + this.penK * 0.2);
    this.penModel.userData.led.material.color.setRGB(0.2, 0.9, 1.0).multiplyScalar(vaping ? 2.2 + Math.sin(t * 18) * 1.2 : 0.6);

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
      const size = (0.12 + 1.3 * (1 - Math.exp(-p.age * 0.5))) * p.big;
      p.s.scale.set(size, size, 1);
      p.s.material.rotation += dt * 0.05 * (p.seed % 2 ? 1 : -1);
      p.s.material.opacity = Math.min(1, p.age * 2.5) * 0.46 * Math.pow(1 - p.age / p.life, 1.2);
      // lit by the RGB strips: tint follows whichever strip the puff is nearer to
      const k = clamp((p.s.position.x + 1.5) / 3, 0, 1);
      p.s.material.color.copy(cA).lerp(cB, k).lerp(WHITE, 0.3);
    }
    const target = clamp(active / 20, 0, 1);
    G.vapeCalm += (target - G.vapeCalm) * (1 - Math.exp(-dt * 2));
  }
}
