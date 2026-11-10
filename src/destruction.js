// Voxel destruction: a pooled debris field, sparks, and simple rigid "bodies" for grabbable props.
// Own lightweight physics (gravity, bounce, friction, sleep) against the floor, walls, desk slabs and the penguin.
import * as THREE from 'three';
import { UNIT, LIT, GLOW, rand, clamp } from './voxel.js';

const N = 1400, NS = 200;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _c = new THREE.Color();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const CONFETTI = [0xff4fd8, 0xffe14a, 0x37e6ff, 0x2bff8a, 0xff7a3a, 0xffffff];

export class Destruction {
  constructor(G, colliders) {
    this.G = G; this.colliders = colliders;
    this.mesh = new THREE.InstancedMesh(UNIT, LIT, N);
    this.mesh.castShadow = true; this.mesh.receiveShadow = true; this.mesh.frustumCulled = false;
    this.sparkMesh = new THREE.InstancedMesh(UNIT, GLOW, NS); this.sparkMesh.frustumCulled = false;
    this.d = []; this.sp = [];
    for (let i = 0; i < N; i++) {
      this.mesh.setMatrixAt(i, ZERO); this.mesh.setColorAt(i, _c.set(0xffffff));
      this.d.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), s: new THREE.Vector3(), q: new THREE.Quaternion(), ax: new THREE.Vector3(1, 0, 0), w: 0, awake: false, rest: 0, r: 0.03, drag: 0 });
    }
    for (let i = 0; i < NS; i++) {
      this.sparkMesh.setMatrixAt(i, ZERO); this.sparkMesh.setColorAt(i, _c.set(0xffffff));
      this.sp.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0, max: 1 });
    }
    this.next = 0; this.nextS = 0; this.bodies = []; this.live = 0; this.hitP = false;
    G.scene.add(this.mesh, this.sparkMesh);
  }

  reset() {
    for (let i = 0; i < N; i++) { this.d[i].awake = false; this.mesh.setMatrixAt(i, ZERO); }
    for (let i = 0; i < NS; i++) { this.sp[i].life = 0; this.sparkMesh.setMatrixAt(i, ZERO); }
    this.mesh.instanceMatrix.needsUpdate = true; this.sparkMesh.instanceMatrix.needsUpdate = true;
    this.bodies = []; this.next = 0; this.live = 0;
  }

  // returns -1 for no ground contact, otherwise the downward impact speed
  collide(p, v, r, isBody) {
    let hit = -1;
    const land = () => { hit = Math.max(hit, -v.y); v.y = v.y < -0.7 ? -v.y * 0.32 : 0; v.x *= 0.8; v.z *= 0.8; };
    if (p.y < r) { p.y = r; land(); }
    if (p.x < -2.5 + r) { p.x = -2.5 + r; v.x = Math.abs(v.x) * 0.4; } else if (p.x > 2.5 - r) { p.x = 2.5 - r; v.x = -Math.abs(v.x) * 0.4; }
    if (p.z < -2.2 + r) { p.z = -2.2 + r; v.z = Math.abs(v.z) * 0.4; } else if (p.z > 2.2 - r) { p.z = 2.2 - r; v.z = -Math.abs(v.z) * 0.4; }
    if (p.y > 2.7 - r) { p.y = 2.7 - r; v.y = -Math.abs(v.y) * 0.3; }
    for (const c of this.colliders) {
      const x0 = c.min[0] - r, x1 = c.max[0] + r, y0 = c.min[1] - r, y1 = c.max[1] + r, z0 = c.min[2] - r, z1 = c.max[2] + r;
      if (p.x <= x0 || p.x >= x1 || p.y <= y0 || p.y >= y1 || p.z <= z0 || p.z >= z1) continue;
      const dxa = p.x - x0, dxb = x1 - p.x, dya = p.y - y0, dyb = y1 - p.y, dza = p.z - z0, dzb = z1 - p.z;
      const m = Math.min(dxa, dxb, dya, dyb, dza, dzb);
      if (m === dyb) { p.y = y1; land(); }
      else if (m === dya) { p.y = y0; v.y = -Math.abs(v.y) * 0.3; }
      else if (m === dxa) { p.x = x0; v.x = -Math.abs(v.x) * 0.4; }
      else if (m === dxb) { p.x = x1; v.x = Math.abs(v.x) * 0.4; }
      else if (m === dza) { p.z = z0; v.z = -Math.abs(v.z) * 0.4; }
      else { p.z = z1; v.z = Math.abs(v.z) * 0.4; }
    }
    // the penguin is indestructible: everything bounces off, it only wobbles
    const P = this.G.penguin;
    if (P) {
      _v.subVectors(p, P.center); const d = _v.length(), R = P.r + r;
      if (d < R && d > 1e-4) {
        _v.multiplyScalar(1 / d); p.copy(P.center).addScaledVector(_v, R);
        const vn = v.dot(_v);
        if (vn < 0) { v.addScaledVector(_v, -1.6 * vn); P.bonk(Math.min(3, -vn) * (isBody ? 1 : 0.2)); if (isBody) this.hitP = true; }
      }
    }
    return hit;
  }

  spawn(p, sx, sy, sz, color, q, v, drag = 0) {
    const i = this.next; this.next = (i + 1) % N; // pool exhausted → the oldest chunk is recycled
    const o = this.d[i];
    if (!o.used) { o.used = true; this.live++; }
    o.p.copy(p); o.s.set(sx, sy, sz); o.q.copy(q); o.v.copy(v);
    o.ax.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize(); o.w = rand(4, 14);
    o.awake = true; o.rest = 0; o.drag = drag; o.r = Math.max(0.012, (sx + sy + sz) / 6);
    this.mesh.setColorAt(i, color); this.mesh.instanceColor.needsUpdate = true;
  }

  // shatter a list of voxel boxes (local space of matrixWorld) into chunks
  burst(boxes, mw, dir, power = 1) {
    const Q0 = new THREE.Quaternion(), S0 = new THREE.Vector3();
    mw.decompose(_p, Q0, S0);
    let S = 0.045;
    const count = (s) => boxes.reduce((a, b) => a + clamp(Math.round(b.w / s), 1, 10) * clamp(Math.round(b.h / s), 1, 10) * clamp(Math.round(b.d / s), 1, 10), 0);
    const total = count(S); if (total > 170) S *= Math.cbrt(total / 170);
    const pos = new THREE.Vector3(), vel = new THREE.Vector3();
    for (const b of boxes) {
      const nx = clamp(Math.round(b.w / S), 1, 10), ny = clamp(Math.round(b.h / S), 1, 10), nz = clamp(Math.round(b.d / S), 1, 10);
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) {
        pos.set(b.x - b.w / 2 + (i + 0.5) * b.w / nx, b.y - b.h / 2 + (j + 0.5) * b.h / ny, b.z - b.d / 2 + (k + 0.5) * b.d / nz).applyMatrix4(mw);
        vel.copy(dir).multiplyScalar(rand(0.8, 3.6) * power).add(_v.set(rand(-1.6, 1.6), rand(0.6, 3.6), rand(-1.6, 1.6)));
        this.spawn(pos, (b.w / nx) * S0.x * 0.96, (b.h / ny) * S0.y * 0.96, (b.d / nz) * S0.z * 0.96, b.c, Q0, vel);
      }
    }
  }

  glass(mon, dir) {
    const q = mon.group.quaternion, pos = new THREE.Vector3(), vel = new THREE.Vector3();
    for (let i = 0; i < 30; i++) {
      pos.set(rand(-mon.w / 2, mon.w / 2), rand(-mon.h / 2, mon.h / 2), 0.02).applyMatrix4(mon.group.matrixWorld);
      vel.copy(dir).multiplyScalar(-rand(0.5, 3)).add(_v.set(rand(-2, 2), rand(0.5, 4), rand(-2, 2)));
      const s = rand(0.015, 0.045);
      this.spawn(pos, s, s * rand(0.5, 1.4), 0.006, _c.setRGB(2.2, 3.0, 3.6), q, vel);
    }
  }

  sparks(pos, n = 12) {
    for (let k = 0; k < n; k++) {
      const i = this.nextS; this.nextS = (i + 1) % NS; const s = this.sp[i];
      s.p.copy(pos); s.v.set(rand(-3, 3), rand(0, 4.5), rand(-3, 3)); s.max = s.life = rand(0.25, 0.7);
      this.sparkMesh.setColorAt(i, _c.setRGB(3.2, rand(1.2, 2.6), 0.4));
    }
    this.sparkMesh.instanceColor.needsUpdate = true;
  }

  confetti() {
    const p = new THREE.Vector3(), v = new THREE.Vector3(), q = new THREE.Quaternion();
    for (let i = 0; i < 220; i++) {
      p.set(rand(-1.8, 1.8), rand(2.0, 2.6), rand(-1.9, 0.4)); v.set(rand(-1.5, 1.5), rand(-0.5, 2.5), rand(-1.5, 1.5));
      this.spawn(p, 0.035, 0.005, 0.055, _c.set(CONFETTI[i % 6]).multiplyScalar(1.4), q, v, 3.2);
    }
  }

  addBody(b) { b.vel = b.vel || new THREE.Vector3(); b.ang = b.ang || new THREE.Vector3(); b.restT = 0; this.bodies.push(b); return b; }
  removeBody(b) { const i = this.bodies.indexOf(b); if (i >= 0) this.bodies.splice(i, 1); }

  update(dt) {
    if (dt <= 0) return;
    const G = this.G;
    let any = false;
    for (let i = 0; i < N; i++) {
      const o = this.d[i]; if (!o.awake) continue; any = true;
      o.v.y -= 9.8 * dt; if (o.drag) o.v.multiplyScalar(Math.exp(-o.drag * dt));
      o.p.addScaledVector(o.v, dt);
      const hit = this.collide(o.p, o.v, o.r, false);
      _q.setFromAxisAngle(o.ax, o.w * dt); o.q.premultiply(_q);
      if (hit >= 0) {
        o.w *= 0.7; if (hit > 2.8 && Math.random() < 0.12) G.sfx.clink();
        if (o.v.lengthSq() < 0.03) { o.rest += dt; if (o.rest > 0.3) o.awake = false; } else o.rest = 0;
      }
      _m.compose(o.p, o.q, o.s); this.mesh.setMatrixAt(i, _m);
    }
    if (any) this.mesh.instanceMatrix.needsUpdate = true;

    let anyS = false;
    for (let i = 0; i < NS; i++) {
      const s = this.sp[i]; if (s.life <= 0) continue; anyS = true;
      s.life -= dt; s.v.y -= 9.8 * dt; s.p.addScaledVector(s.v, dt);
      if (s.p.y < 0.01) { s.p.y = 0.01; s.v.y *= -0.4; }
      const k = s.life <= 0 ? 0 : 0.018 * (s.life / s.max);
      _m.compose(s.p, _q.identity(), _s.set(k, k, k)); this.sparkMesh.setMatrixAt(i, _m);
    }
    if (anyS) this.sparkMesh.instanceMatrix.needsUpdate = true;

    for (const b of this.bodies.slice()) {
      if (b.held || b.sleep) continue;
      const sub = 3, h = dt / sub; let hit = -1;
      for (let s = 0; s < sub; s++) {
        b.vel.y -= 9.8 * h; b.obj.position.addScaledVector(b.vel, h);
        this.hitP = false;
        hit = Math.max(hit, this.collide(b.obj.position, b.vel, b.r, true));
        if (this.hitP && b.thrown) { G.penguinOffend(); b.thrown = false; }
        if (b.thrown && b.vel.lengthSq() > 5) {
          const dir = _v.copy(b.vel).normalize().clone();
          let done = false;
          for (const m of G.monitors) {
            if (m.state !== 'smashed' && m.box.distanceToPoint(b.obj.position) < b.hitR) {
              G.hitMonitor(m, 2, dir, null, b.obj.position.clone()); done = true; break;
            }
          }
          if (!done) for (const o of this.bodies) {
            if (o !== b && !o.held && o.obj.position.distanceTo(b.obj.position) < b.hitR + o.hitR) { G.props.hit(o.prop, 2, dir); done = true; break; }
          }
          if (done) { b.vel.multiplyScalar(-0.25); b.thrown = false; G.props.hit(b.prop, 1, dir); break; }
        }
      }
      b.obj.rotation.x += b.ang.x * dt; b.obj.rotation.y += b.ang.y * dt; b.obj.rotation.z += b.ang.z * dt;
      if (hit > 1.4) { G.sfx.thud(); b.ang.multiplyScalar(0.5); }
      if (hit >= 0 && b.vel.lengthSq() < 0.04) {
        b.restT += dt;
        if (b.restT > 0.3) { b.sleep = true; b.thrown = false; b.obj.rotation.x = 0; b.obj.rotation.z = 0; }
      } else b.restT = 0;
    }
  }
}
