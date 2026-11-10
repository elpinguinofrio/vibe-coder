// High-fidelity hero props: the things you hold up to your face are smooth, textured models, not voxels.
// Beer can (printed label, aluminium shoulders, pull tab, condensation), the hand that holds things, the vape pen,
// and the wispy cloud textures.
import * as THREE from 'three';

const ALU = new THREE.MeshStandardMaterial({ color: 0xdfe3ec, metalness: 0.92, roughness: 0.3 });
const ALU_DARK = new THREE.MeshStandardMaterial({ color: 0xa3a9b8, metalness: 0.9, roughness: 0.36 });
const BLACK = new THREE.MeshStandardMaterial({ color: 0x0b0b12, metalness: 0.4, roughness: 0.3 });
const SKIN = new THREE.MeshStandardMaterial({ color: 0xf2c6a0, roughness: 0.62, emissive: 0x3a1c10, emissiveIntensity: 0.08 });
const HOODIE = new THREE.MeshStandardMaterial({ color: 0x6a4bd8, roughness: 0.95, emissive: 0x1a1040, emissiveIntensity: 0.3 });
const CAN_R = 0.033;
const G = {
  body: new THREE.CylinderGeometry(CAN_R, CAN_R, 0.1, 56, 1, true),
  shoulder: new THREE.CylinderGeometry(0.0262, CAN_R, 0.014, 56),
  lid: new THREE.CylinderGeometry(0.0256, 0.0256, 0.0016, 56),
  rim: new THREE.TorusGeometry(0.0259, 0.0017, 10, 56),
  tab: new THREE.BoxGeometry(0.011, 0.0012, 0.019),
  tabRing: new THREE.TorusGeometry(0.0046, 0.0012, 8, 20),
  mouth: new THREE.CircleGeometry(0.0072, 24),
  foot: new THREE.CylinderGeometry(CAN_R, 0.0272, 0.01, 56),
  base: new THREE.CylinderGeometry(0.0272, 0.0262, 0.003, 56),
  drop: new THREE.SphereGeometry(1, 10, 8),
  sphere: new THREE.SphereGeometry(1, 20, 14),
};

const labelMats = new Map();
function labelMaterial(hex) {
  if (labelMats.has(hex)) return labelMats.get(hex);
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const x = c.getContext('2d'), col = '#' + hex.toString(16).padStart(6, '0');
  const g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#f6f8fc'); g.addColorStop(0.1, col); g.addColorStop(0.9, col); g.addColorStop(1, '#f6f8fc');
  x.fillStyle = g; x.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * 0.07})`; x.fillRect(Math.random() * 1024, 0, 1 + Math.random() * 2, 512); } // brushed metal
  for (let i = 0; i < 14; i++) { x.fillStyle = 'rgba(0,0,0,.10)'; x.fillRect(0, 70 + i * 28, 1024, 2); }
  const panel = (ox) => {
    x.fillStyle = 'rgba(10,12,26,.92)'; x.beginPath(); x.ellipse(ox, 256, 190, 172, 0, 0, 7); x.fill();
    x.strokeStyle = '#ffffff'; x.lineWidth = 6; x.beginPath(); x.ellipse(ox, 256, 174, 156, 0, 0, 7); x.stroke();
    x.strokeStyle = col; x.lineWidth = 3; x.beginPath(); x.ellipse(ox, 256, 162, 144, 0, 0, 7); x.stroke();
    x.textAlign = 'center'; x.fillStyle = '#fff'; x.font = '900 70px "Arial Black", Impact, sans-serif'; x.fillText('DEADLINE', ox, 262);
    x.fillStyle = col; x.font = 'bold 34px Menlo, monospace'; x.fillText('L A G E R', ox, 310);
    x.fillStyle = '#cfd3ff'; x.font = '21px Menlo, monospace'; x.fillText('★ ships on friday ★', ox, 186); x.fillText('4.04% · brewed at 2 AM', ox, 352);
  };
  panel(0); panel(512); panel(1024); // u=0 faces +z (the drinker), u=0.5 faces away
  x.fillStyle = 'rgba(255,255,255,.9)'; x.fillRect(0, 50, 1024, 5); x.fillRect(0, 457, 1024, 5);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = THREE.RepeatWrapping;
  const m = new THREE.MeshStandardMaterial({ map: t, metalness: 0.72, roughness: 0.3 });
  labelMats.set(hex, m); return m;
}

// a 330 ml can, 66 mm wide; wet = fresh from the fridge (condensation)
export function canModel(hex, wet = false) {
  const g = new THREE.Group();
  const add = (geo, mat, y, fn) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; m.castShadow = true; if (fn) fn(m); g.add(m); return m; };
  add(G.body, labelMaterial(hex), 0);
  add(G.shoulder, ALU, 0.057); add(G.lid, ALU_DARK, 0.0636);
  add(G.rim, ALU, 0.0648, (m) => { m.rotation.x = Math.PI / 2; });
  add(G.tab, ALU, 0.0654, (m) => { m.position.z = 0.005; });
  add(G.tabRing, ALU, 0.0658, (m) => { m.rotation.x = Math.PI / 2; m.position.z = 0.0135; });
  add(G.mouth, BLACK, 0.0646, (m) => { m.rotation.x = -Math.PI / 2; m.position.z = -0.009; m.castShadow = false; });
  add(G.foot, ALU, -0.055); add(G.base, ALU_DARK, -0.0615);
  if (wet) {
    const n = 70, drops = new THREE.InstancedMesh(G.drop, new THREE.MeshStandardMaterial({ color: 0xcfe6ff, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.38 }), n);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = 0.0008 + Math.random() * Math.random() * 0.0026;
      p.set(Math.sin(a) * (CAN_R + r * 0.3), -0.045 + Math.random() * 0.09, Math.cos(a) * (CAN_R + r * 0.3));
      m4.compose(p, q, s.set(r, r * (1.1 + Math.random()), r)); drops.setMatrixAt(i, m4);
    }
    g.add(drops);
  }
  return g;
}

// a right hand wrapped around something of radius R (fingers behind, thumb in front), with a hoodie sleeve
export function handModel(R) {
  const g = new THREE.Group();
  for (let k = 0; k < 4; k++) {
    const f = new THREE.Mesh(new THREE.TorusGeometry(R + 0.0055, 0.0082 - k * 0.0005, 12, 30, Math.PI * 1.08), SKIN);
    f.rotation.x = -Math.PI / 2; f.position.y = 0.03 - k * 0.0185; f.castShadow = true; g.add(f);
  }
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.0088, 0.03, 6, 14), SKIN);
  thumb.position.set(R * 0.62, 0.014, R * 0.82); thumb.rotation.set(0.1, 0, 1.0); g.add(thumb);
  const palm = new THREE.Mesh(G.sphere, SKIN); palm.scale.set(0.017, 0.042, 0.03); palm.position.set(R + 0.012, -0.004, -0.002); g.add(palm);
  const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.023, 0.06, 18), SKIN); wrist.position.set(R + 0.03, -0.05, 0); wrist.rotation.z = 0.45; g.add(wrist);
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.24, 24), HOODIE); sleeve.position.set(R + 0.094, -0.182, 0.004); sleeve.rotation.z = 0.45; g.add(sleeve);
  const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.007, 10, 24), HOODIE); cuff.position.set(R + 0.043, -0.077, 0.002); cuff.rotation.set(Math.PI / 2, 0, 0); cuff.rotation.z = 0; cuff.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), 0.45); g.add(cuff);
  return g;
}

// pod-style vape pen: anodised body, glowing tank, LED ring that pulses while you inhale
export function vapeModel() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.0115, 0.066, 10, 24), new THREE.MeshStandardMaterial({ color: 0xff4fd8, metalness: 0.85, roughness: 0.26, emissive: 0x40102e, emissiveIntensity: 0.4 }));
  g.add(body);
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.0104, 0.0104, 0.03, 24), new THREE.MeshStandardMaterial({ color: 0x8dffd9, transparent: true, opacity: 0.6, roughness: 0.08, emissive: 0x2bffb0, emissiveIntensity: 0.5 }));
  tank.position.y = 0.062; g.add(tank);
  for (const y of [0.046, 0.078]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.0108, 0.0015, 8, 24), ALU); r.rotation.x = Math.PI / 2; r.position.y = y; g.add(r); }
  const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.0046, 0.0088, 0.026, 18), BLACK); mouth.position.y = 0.092; g.add(mouth);
  const led = new THREE.Mesh(new THREE.TorusGeometry(0.0119, 0.0017, 8, 28), new THREE.MeshBasicMaterial({ color: 0x37e6ff, toneMapped: false }));
  led.rotation.x = Math.PI / 2; led.position.y = -0.022; g.add(led);
  const btn = new THREE.Mesh(G.sphere, ALU); btn.scale.setScalar(0.004); btn.position.set(0, 0.012, 0.0118); g.add(btn);
  g.userData.led = led;
  return g;
}

// wispy cloud sprites: many soft lobes, eroded by holes, with a soft outer falloff
export function puffTextures(n = 4) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    for (let i = 0; i < 34; i++) {
      const a = Math.random() * 6.283, d = Math.random() * Math.random() * 78, px = 128 + Math.cos(a) * d, py = 128 + Math.sin(a) * d * 0.85, r = 22 + Math.random() * 46;
      const g = x.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, `rgba(255,255,255,${0.1 + Math.random() * 0.14})`); g.addColorStop(0.6, 'rgba(255,255,255,0.05)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    }
    x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 16; i++) {
      const px = 40 + Math.random() * 176, py = 40 + Math.random() * 176, r = 10 + Math.random() * 30;
      const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, `rgba(0,0,0,${0.2 + Math.random() * 0.3})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    }
    x.globalCompositeOperation = 'destination-in';
    const m = x.createRadialGradient(128, 128, 30, 128, 128, 126); m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = m; x.fillRect(0, 0, 256, 256);
    out.push(new THREE.CanvasTexture(c));
  }
  return out;
}
