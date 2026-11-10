// First-person camera: seated at the desk (lean back with Space), or stand up and walk with WASD.
import * as THREE from 'three';
import { clamp, lerp } from './voxel.js';

const SEAT = new THREE.Vector3(0, 1.2, -0.42);

export class Player {
  constructor(camera, dom) {
    this.camera = camera; this.dom = dom;
    this.keys = {}; this.mouse = new THREE.Vector2(0, 0); this.locked = false;
    this.ray = new THREE.Raycaster(); this.ray.far = 12;
    this.reset();
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === dom; });
    document.addEventListener('mousemove', (e) => {
      if (this.locked) {
        this.yaw -= e.movementX * 0.0021; this.pitch = clamp(this.pitch - e.movementY * 0.0021, -1.35, 1.35);
      } else {
        this.mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      }
    });
    addEventListener('keydown', (e) => { this.keys[e.code] = true; });
    addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = {}; });
  }

  reset() {
    this.yaw = 0; this.pitch = -0.03; this.seated = true; this.lean = 0; this.trauma = 0;
    this.pos = SEAT.clone(); this.chairOk = true; this.punchT = 0;
  }

  lock() { try { const p = this.dom.requestPointerLock && this.dom.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* cursor fallback */ } }
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); }
  shake(a) { this.trauma = Math.min(1, this.trauma + a); }
  nearSeat() { return Math.hypot(this.pos.x - SEAT.x, this.pos.z - SEAT.z) < 1.0; }

  // ray through the crosshair (pointer lock) or the cursor (fallback)
  aim() { this.ray.setFromCamera(this.locked ? new THREE.Vector2(0, 0) : this.mouse, this.camera); return this.ray; }

  update(dt, t, drunk, playing) {
    const k = this.keys;
    // arrow keys always look around (also the no-pointer-lock fallback)
    const lk = (k.ArrowLeft ? 1 : 0) - (k.ArrowRight ? 1 : 0), lp = (k.ArrowUp ? 1 : 0) - (k.ArrowDown ? 1 : 0);
    this.yaw += lk * dt * 1.9; this.pitch = clamp(this.pitch + lp * dt * 1.3, -1.35, 1.35);

    if (playing) {
      const mv = new THREE.Vector3((k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0), 0, (k.KeyS ? 1 : 0) - (k.KeyW ? 1 : 0));
      if (this.seated) {
        if (mv.lengthSq() > 0) { this.seated = false; this.pos.set(SEAT.x, 1.6, SEAT.z + 0.35); }
        this.lean = lerp(this.lean, k.Space ? 1 : 0, 1 - Math.exp(-dt * 7));
        if (this.seated) this.pos.set(SEAT.x, SEAT.y - this.lean * 0.06, SEAT.z + this.lean * 0.55);
      } else {
        this.lean = lerp(this.lean, 0, 1 - Math.exp(-dt * 7));
        if (mv.lengthSq() > 0) {
          mv.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw).multiplyScalar(dt * 2.3);
          this.pos.add(mv);
        }
        this.pos.y = lerp(this.pos.y, 1.6, 1 - Math.exp(-dt * 10));
        this.pos.x = clamp(this.pos.x, -2.25, 2.25); this.pos.z = clamp(this.pos.z, -2.0, 1.95);
        // keep out of the L-desk
        if (this.pos.z < -0.7 && this.pos.x < 1.0) this.pos.z = -0.7;
        if (this.pos.x > 0.95 && this.pos.z < 0.45) { if (this.pos.z > 0.3 && this.pos.x < 1.9) this.pos.z = 0.45; else this.pos.x = 0.95; }
        if (k.Space && this.chairOk && this.nearSeat()) { this.seated = true; }
      }
    }
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    const s = this.trauma * this.trauma;
    const sway = drunk * 0.018;
    const e = new THREE.Euler(
      this.pitch + this.lean * 0.1 + s * (Math.random() - 0.5) * 0.09 + Math.sin(t * 0.83) * sway,
      this.yaw + s * (Math.random() - 0.5) * 0.09 + Math.sin(t * 0.57) * sway * 1.4,
      s * (Math.random() - 0.5) * 0.07 + Math.sin(t * 0.71) * sway * 1.6, 'YXZ');
    this.camera.quaternion.setFromEuler(e);
    this.camera.position.copy(this.pos);
    this.camera.position.x += Math.sin(t * 0.5) * sway * 1.2;
    // keep ~94° of horizontal view on narrow windows so the side monitors stay reachable
    const base = Math.min(100, Math.max(68, (2 * Math.atan(Math.tan(0.82) / this.camera.aspect) * 180) / Math.PI));
    const fov = base + this.lean * 12;
    if (Math.abs(this.camera.fov - fov) > 0.05) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
    this.punchT = Math.max(0, this.punchT - dt);
  }
}
