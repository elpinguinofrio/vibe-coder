// Voxel monitors with live canvas screens: working, flagged, banned, shipped, cracked.
import * as THREE from 'three';
import { VoxelBatch, clamp } from './voxel.js';
import { nextLine, typo } from './agents.js';

const PPM = 820; // canvas pixels per metre of screen
const FONT = 'Menlo, Consolas, "Courier New", monospace';

export const MONITOR_DEFS = [
  { x: 0, y: 1.1, z: -1.72, w: 1.05, h: 0.42, price: 1299, label: '34" ultrawide (curved, allegedly)' },
  { x: -0.98, y: 1.08, z: -1.58, w: 0.62, h: 0.38, price: 449, label: '27" monitor (left)' },
  { x: -1.52, y: 1.16, z: -1.2, w: 0.34, h: 0.58, price: 379, label: 'portrait monitor (for logs)' },
  { x: 0.98, y: 1.08, z: -1.58, w: 0.62, h: 0.38, price: 449, label: '27" monitor (right)' },
  { x: 1.5, y: 1.16, z: -1.02, w: 0.34, h: 0.58, price: 379, label: 'portrait monitor (for vibes)' },
  { x: 1.52, y: 1.02, z: -0.4, w: 0.5, h: 0.32, price: 299, label: '24" monitor (hand-me-down)' },
  { x: -0.43, y: 1.6, z: -1.8, w: 0.56, h: 0.32, price: 329, label: 'top-shelf monitor' },
  { x: 0.43, y: 1.6, z: -1.8, w: 0.56, h: 0.32, price: 329, label: 'other top-shelf monitor' },
];

const THEMES = {
  code: { bg: '#0b1022', bar: '#232a52' },
  term: { bg: '#050d08', bar: '#12301e' },
  chat: { bg: '#150f22', bar: '#3a2456' },
};

function wrap(c, text, x, y, maxW, lh, maxLines) {
  const words = text.split(' ');
  let line = '', n = 0;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (c.measureText(test).width > maxW && line) {
      c.fillText(line, x, y + n * lh); n++; line = w;
      if (n >= maxLines - 1) break;
    } else line = test;
  }
  c.fillText(line, x, y + n * lh);
  return n + 1;
}

export class Monitor {
  constructor(def, i, agent, scene) {
    this.def = def; this.i = i; this.agent = agent; this.scene = scene;
    this.w = def.w; this.h = def.h;
    this.cw = Math.round(def.w * PPM); this.ch = Math.round(def.h * PPM);
    this.group = new THREE.Group();
    this.group.position.set(def.x, def.y, def.z);
    this.group.lookAt(0, def.y, -0.25);

    const { w, h } = def, D = 0x16171f, B = 0x262833;
    const b = new VoxelBatch();
    b.box(0, 0, -0.03, w + 0.05, h + 0.05, 0.05, D);
    b.box(0, h / 2 + 0.012, 0.004, w + 0.05, 0.025, 0.022, B);
    b.box(0, -h / 2 - 0.012, 0.004, w + 0.05, 0.025, 0.022, B);
    b.box(-w / 2 - 0.012, 0, 0.004, 0.025, h, 0.022, B);
    b.box(w / 2 + 0.012, 0, 0.004, 0.025, h, 0.022, B);
    const neckH = def.y - h / 2 - 0.75;
    b.box(0, -h / 2 - neckH / 2, -0.07, 0.05, neckH, 0.04, 0x30323e);
    b.box(0, -h / 2 - neckH + 0.012, -0.04, 0.26, 0.024, 0.18, 0x30323e);
    b.box(w / 2 - 0.03, -h / 2 - 0.012, 0.017, 0.014, 0.008, 0.004, 0x44ff88, { glow: 2.5, j: 0 });
    // sticky note, because of course
    if (i % 2 === 0) b.box(-w / 2 + 0.05, -h / 2 - 0.012, 0.018, 0.05, 0.05, 0.003, i % 4 ? 0xffe066 : 0xff8fd0, { j: 0 });
    this.shell = b.build();
    this.boxes = b.boxes;
    this.group.add(this.shell);

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.cw; this.canvas.height = this.ch;
    this.ctx = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 8;
    this.mat = new THREE.MeshBasicMaterial({ map: this.tex, toneMapped: false });
    this.screen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this.mat);
    this.screen.position.z = 0.0005;
    this.screen.userData.monitor = this;
    this.group.add(this.screen);

    const sc = document.createElement('canvas'); sc.width = 1; sc.height = 3;
    const sx = sc.getContext('2d'); sx.fillStyle = 'rgba(0,0,0,0.22)'; sx.fillRect(0, 2, 1, 1);
    this.scan = this.ctx.createPattern(sc, 'repeat');
    this.maxLines = Math.floor((this.ch - 44) / 19);
    this.reset();
  }

  reset() {
    this.state = 'ok'; this.hp = 3; this.flag = null; this.cracks = []; this.banReason = '';
    this.lines = []; this.cur = nextLine(this.agent.kind); this.typed = 0; this.dirty = true;
    this.offset = (Math.random() - 0.5) * 7;
    for (let k = 0; k < this.maxLines - 2; k++) this.lines.push(nextLine(this.agent.kind));
    if (!this.group.parent) this.scene.add(this.group);
    this.group.updateMatrixWorld(true);
    this.box = new THREE.Box3().setFromObject(this.screen).expandByScalar(0.06);
    this.center = this.box.getCenter(new THREE.Vector3());
    this.mat.color.setScalar(1.15);
  }

  alive() { return this.state === 'ok' || this.state === 'flagged'; }

  // add cracks radiating from a hit point (uv from the raycast)
  crack(uv) {
    const x = (uv ? uv.x : 0.5) * this.cw, y = (1 - (uv ? uv.y : 0.5)) * this.ch;
    for (let k = 0; k < 8; k++) {
      let a = Math.random() * Math.PI * 2, px = x, py = y;
      const pts = [[px, py]];
      const segs = 3 + ((Math.random() * 4) | 0);
      for (let s = 0; s < segs; s++) {
        a += (Math.random() - 0.5) * 0.9;
        const L = 14 + Math.random() * this.cw * 0.14;
        px += Math.cos(a) * L; py += Math.sin(a) * L; pts.push([px, py]);
      }
      this.cracks.push(pts);
    }
    this.cracks.push({ blot: [x, y, 10 + Math.random() * 14] });
    this.dirty = true;
  }

  remove() { if (this.group.parent) this.group.parent.remove(this.group); }

  draw(G) {
    if (this.state === 'smashed') return;
    const c = this.ctx, W = this.cw, H = this.ch;
    c.textBaseline = 'top'; c.textAlign = 'left';
    if (this.state === 'banned') this.drawBanned(c, W, H);
    else if (this.state === 'shipped') this.drawShipped(c, W, H, G);
    else if (this.state === 'flagged') this.drawFlag(c, W, H, G);
    else this.drawWork(c, W, H, G);

    if (this.cracks.length) {
      c.lineWidth = 1.6; c.strokeStyle = 'rgba(235,245,255,0.92)';
      for (const p of this.cracks) {
        if (p.blot) {
          c.fillStyle = '#000'; c.beginPath(); c.arc(p.blot[0], p.blot[1], p.blot[2], 0, 7); c.fill();
          c.fillStyle = 'rgba(120,255,220,.5)'; c.fillRect(0, p.blot[1] - 2, W, 3);
          continue;
        }
        c.beginPath(); c.moveTo(p[0][0], p[0][1]);
        for (let k = 1; k < p.length; k++) c.lineTo(p[k][0], p[k][1]);
        c.stroke();
      }
    }
    c.fillStyle = this.scan; c.fillRect(0, 0, W, H);
    this.tex.needsUpdate = true;
    this.dirty = false;
  }

  drawWork(c, W, H, G) {
    const th = THEMES[this.agent.kind];
    c.fillStyle = th.bg; c.fillRect(0, 0, W, H);
    c.fillStyle = th.bar; c.fillRect(0, 0, W, 26);
    c.font = `bold 14px ${FONT}`;
    c.fillStyle = '#fff'; c.fillText('● ' + this.agent.name, 8, 6);
    const pct = clamp(Math.round(G.ship + this.offset * (G.ship > 4 && G.ship < 96 ? 1 : 0)), 0, 100);
    c.textAlign = 'right'; c.fillStyle = '#7dffb0'; c.fillText(`SHIP ${pct}%`, W - 8, 6); c.textAlign = 'left';
    c.fillStyle = '#000'; c.fillRect(0, 26, W, 8);
    c.fillStyle = '#35e08a'; c.fillRect(0, 26, (W * pct) / 100, 8);

    this.typed += 2 + Math.random() * 5;
    if (this.typed >= this.cur.t.length + 5) {
      this.lines.push(this.cur); this.cur = nextLine(this.agent.kind); this.typed = 0;
      while (this.lines.length > this.maxLines - 1) this.lines.shift();
    }
    const wide = W > 700, textW = wide ? W * 0.6 : W;
    c.save(); c.beginPath(); c.rect(0, 36, textW - 6, H); c.clip();
    c.font = `15px ${FONT}`;
    let y = 42;
    for (const L of this.lines) { c.fillStyle = L.c; c.fillText(typo(L.t, G.drunk), 8, y); y += 19; }
    c.fillStyle = this.cur.c; c.fillText(this.cur.t.slice(0, this.typed | 0) + '█', 8, y);
    c.restore();
    if (wide) {
      // ultrawide gets a "dashboard" pane
      const x0 = textW + 10, bw = (W - x0 - 14) / 14;
      c.fillStyle = 'rgba(255,255,255,.06)'; c.fillRect(textW, 36, W - textW, H);
      c.font = `bold 13px ${FONT}`; c.fillStyle = '#ffcb6b'; c.fillText('TOKENS BURNED / MIN', x0, 44);
      for (let k = 0; k < 14; k++) {
        const v = 0.25 + 0.75 * Math.abs(Math.sin(G.real * 1.3 + k * 0.7 + Math.sin(k * 3.1)));
        c.fillStyle = k % 3 ? '#8f7bff' : '#ff4fd8';
        c.fillRect(x0 + k * bw, H - 60 - v * (H - 150), bw - 4, v * (H - 150));
      }
      c.fillStyle = '#9fe3ff'; c.font = `13px ${FONT}`;
      c.fillText('vibes: immaculate   burn: $' + (41 + G.real * 0.9).toFixed(2), x0, H - 46);
      c.fillText('building: ' + (G.appName || '???'), x0, H - 26);
    }
  }

  drawFlag(c, W, H, G) {
    const f = this.flag, fl = Math.sin(G.real * 16) > 0;
    c.fillStyle = fl ? '#c40022' : '#6a0012'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#200'; c.fillRect(0, 0, W, 12);
    c.fillStyle = '#ffe14a'; c.fillRect(0, 0, W * clamp(f.t / f.max, 0, 1), 12);
    c.textAlign = 'center';
    c.fillStyle = '#ffe14a'; c.font = `bold 17px ${FONT}`; c.fillText('⚠ HALL MONITOR FLAG ⚠', W / 2, 18);
    c.fillStyle = '#fff'; c.font = `14px ${FONT}`;
    wrap(c, '"' + f.reason + '"', W / 2, 42, W - 16, 17, H > 400 ? 5 : 3);
    const big = Math.min(H * 0.3, W * 0.34, 120);
    c.font = `bold ${big}px ${FONT}`; c.textBaseline = 'middle';
    c.fillStyle = '#fff'; c.fillText(Math.max(0, f.t).toFixed(1), W / 2, H * 0.57);
    const by = H * 0.74, bh = H * 0.22;
    const btn = (x, bw, label) => {
      c.fillStyle = fl ? '#2bff8a' : '#1fd870'; c.fillRect(x, by, bw, bh);
      c.fillStyle = '#03240f';
      let fs = Math.min(bh * 0.5, 30); c.font = `bold ${fs}px ${FONT}`;
      while (c.measureText(label).width > bw - 10 && fs > 9) { fs -= 1; c.font = `bold ${fs}px ${FONT}`; }
      c.fillText(label, x + bw / 2, by + bh / 2);
    };
    if (f.decoy) {
      btn(8, W / 2 - 12, f.decoy.side === 0 ? 'APPEAL' : f.decoy.label);
      btn(W / 2 + 4, W / 2 - 12, f.decoy.side === 1 ? 'APPEAL' : f.decoy.label);
    } else btn(8, W - 16, W > 330 ? 'CLICK TO APPEAL' : 'APPEAL');
    c.textBaseline = 'top'; c.textAlign = 'left';
  }

  drawBanned(c, W, H) {
    c.fillStyle = '#08080b'; c.fillRect(0, 0, W, H);
    for (let k = 0; k < 160; k++) { c.fillStyle = `rgba(255,255,255,${Math.random() * 0.07})`; c.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
    c.textAlign = 'center'; c.fillStyle = '#6b6f85'; c.font = `13px ${FONT}`;
    c.fillText(this.agent.name + ' — account terminated', W / 2, 12);
    wrap(c, 'reason: ' + this.banReason, W / 2, H - 58, W - 20, 16, 3);
    c.save(); c.translate(W / 2, H / 2); c.rotate(-0.2);
    const fs = Math.min(W / 4.6, H / 2.6);
    c.font = `900 ${fs}px "Arial Black", Impact, sans-serif`; c.textBaseline = 'middle';
    const tw = c.measureText('BANNED').width;
    c.strokeStyle = '#ff1a3c'; c.lineWidth = Math.max(4, fs * 0.09);
    c.strokeRect(-tw / 2 - fs * 0.22, -fs * 0.68, tw + fs * 0.44, fs * 1.36);
    c.lineWidth = 2; c.strokeRect(-tw / 2 - fs * 0.34, -fs * 0.8, tw + fs * 0.68, fs * 1.6);
    c.fillStyle = '#ff1a3c'; c.fillText('BANNED', 0, fs * 0.04);
    c.restore(); c.textBaseline = 'top'; c.textAlign = 'left';
  }

  drawShipped(c, W, H, G) {
    const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0d5a35'); g.addColorStop(1, '#0a2c5a');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (let k = 0; k < 40; k++) {
      c.fillStyle = ['#ff4fd8', '#ffe14a', '#37e6ff', '#2bff8a'][k % 4];
      c.fillRect((k * 97 + G.real * 40 * (1 + (k % 3))) % W, (k * 53 + G.real * 90) % H, 6, 10);
    }
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff';
    const fs = Math.min(W / 5.2, H / 3);
    c.font = `900 ${fs}px "Arial Black", Impact, sans-serif`; c.fillText('SHIPPED', W / 2, H / 2);
    c.textBaseline = 'top'; c.textAlign = 'left';
  }
}
