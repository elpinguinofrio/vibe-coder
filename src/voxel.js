// Instanced voxel batches: every object in the room is a list of boxes drawn as one InstancedMesh.
import * as THREE from 'three';

export const UNIT = new THREE.BoxGeometry(1, 1, 1);
export const LIT = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0.05 });
export const GLOW = new THREE.MeshBasicMaterial({ toneMapped: false });
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();

export const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;

export class VoxelBatch {
  constructor() { this.boxes = []; }

  // box by centre + size. o.j = brightness jitter (default small), o.glow = emissive multiplier
  box(x, y, z, w, h, d, color, o = {}) {
    const c = new THREE.Color(color);
    const j = o.j ?? 0.06;
    if (j) c.multiplyScalar(1 + (Math.random() - 0.5) * 2 * j);
    if (o.glow) c.multiplyScalar(o.glow === true ? 1.8 : o.glow);
    this.boxes.push({ x, y, z, w, h, d, c, glow: !!o.glow });
    return this;
  }

  // fill a volume with a grid of jittered voxels (planks, rugs, bricks)
  fill(x, y, z, w, h, d, s, color, o = {}) {
    const nx = Math.max(1, Math.round(w / s)), ny = Math.max(1, Math.round(h / s)), nz = Math.max(1, Math.round(d / s));
    const sx = w / nx, sy = h / ny, sz = d / nz;
    for (let i = 0; i < nx; i++) for (let k = 0; k < ny; k++) for (let l = 0; l < nz; l++) {
      const col = typeof color === 'function' ? color(i, k, l) : color;
      if (col == null) continue;
      this.box(x - w / 2 + sx * (i + 0.5), y - h / 2 + sy * (k + 0.5), z - d / 2 + sz * (l + 0.5), sx, sy, sz, col, { j: 0.12, ...o });
    }
    return this;
  }

  build(shadow = true) {
    const g = new THREE.Group();
    for (const glow of [false, true]) {
      const list = this.boxes.filter((b) => b.glow === glow);
      if (!list.length) continue;
      const mesh = new THREE.InstancedMesh(UNIT, glow ? GLOW : LIT, list.length);
      list.forEach((b, i) => {
        _m.compose(_p.set(b.x, b.y, b.z), _q, _s.set(b.w, b.h, b.d));
        mesh.setMatrixAt(i, _m);
        mesh.setColorAt(i, b.c);
      });
      mesh.castShadow = shadow && !glow;
      mesh.receiveShadow = shadow && !glow;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.computeBoundingBox();
      g.add(mesh);
    }
    g.userData.boxes = this.boxes;
    return g;
  }
}
