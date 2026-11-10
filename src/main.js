// Vibe Coder Simulator — game orchestration. One pure step(dt) drives everything so a bot can run it headless.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildRoom } from './room.js';
import { Monitor, MONITOR_DEFS } from './monitors.js';
import { AGENT_DEFS, APP_NAMES } from './agents.js';
import { Player } from './player.js';
import { BanSystem } from './banSystem.js';
import { Destruction } from './destruction.js';
import { Props } from './props.js';
import { Vices } from './vices.js';
import { UI } from './ui.js';
import { Sfx } from './audio.js';
import { makeCard, savePNG } from './shareCard.js';
import { pick } from './voxel.js';
import { setLang, getLang, onLang } from './i18n.js';

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25)); // 1.25 keeps text crisp and leaves headroom for 60 fps full-screen
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.02;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07060f);
scene.fog = new THREE.FogExp2(0x1a0f33, 0.07); // light haze
const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.05, 30);
scene.add(camera);
// image-based reflections (so metal, glass and the plush read as materials) + a faint fill light for things you hold
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.2;
const fill = new THREE.PointLight(0xc8d4ff, 0.45, 1.2, 2); fill.position.set(0.08, 0.06, 0.05); camera.add(fill);

const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
// Ambient occlusion + slight depth of field. Sprites (vape, speech bubble) and transparent planes (rain) must stay
// out of their depth/normal pre-passes, otherwise they show up as solid quads.
const ghost = (o) => o.isSprite || (o.material && o.material.transparent);
const gtao = new GTAOPass(scene, camera, innerWidth, innerHeight, undefined, { radius: 0.3, distanceExponent: 1.4, thickness: 1.3, scale: 1.25, samples: 8 });
const gtaoSize = gtao.setSize.bind(gtao);
gtao.setSize = (w, h) => gtaoSize(Math.ceil(w / 2), Math.ceil(h / 2)); // AO at half resolution: it is low-frequency, and this halves its cost
const ov = gtao.overrideVisibility.bind(gtao);
gtao.overrideVisibility = () => { ov(); scene.traverse((o) => { if (ghost(o)) o.visible = false; }); };
composer.addPass(gtao);
const bokeh = new BokehPass(scene, camera, { focus: 1.5, aperture: 0.0007, maxblur: 0.004 });
const bokehRender = bokeh.render.bind(bokeh);
bokeh.render = (...args) => {
  const hidden = [];
  scene.traverse((o) => { if (o.visible && ghost(o)) { o.visible = false; hidden.push(o); } });
  try { bokehRender(...args); } finally { for (const o of hidden) o.visible = true; }
};
composer.addPass(bokeh);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.42, 0.65, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const newStats = () => ({ flags: 0, appeals: 0, bans: 0, bestCombo: 0, beers: 0, vapes: 0, decoys: 0, squeezes: 0, offended: 0, thrown: 0, crushed: 0, monitorsDestroyed: 0, invoice: [], bannedReasons: [], lastReason: '', flagTimes: [] });

const G = {
  state: 'title', outcome: null, sim: false, time: 0, real: 0, ship: 0, strikes: 0, maxStrikes: 5, streak: 0, combo: 0, comboT: 0,
  rage: 0, focusT: 0, hitStop: 0, calmT: 0, penguinCd: 0, drunk: 0, vapeCalm: 0, swingT: 0, held: null,
  appName: pick(APP_NAMES), monitors: [], stats: newStats(), scene, camera,
};
window.__game = G;

G.ui = new UI(document.getElementById('ui'));
G.sfx = new Sfx();
G.player = new Player(camera, renderer.domElement);
const room = buildRoom(scene);
G.monitors = MONITOR_DEFS.map((d, i) => new Monitor(d, i, AGENT_DEFS[i], scene));
const ban = new BanSystem(G);
const destruction = new Destruction(G, room.colliders);
G.props = new Props(G, destruction);
const vices = new Vices(G, room);
G.ban = ban; G.destruction = destruction; G.vices = vices; G.renderer = renderer;
G.fx = { gtao, bokeh, bloom, composer };

// ---------- game actions ----------
G.addRage = (a) => {
  if (G.focusT > 0) return;
  G.rage = Math.min(1, G.rage + a);
  if (G.rage >= 1) { G.rage = 0; G.focusT = 4; G.sfx.focus(); G.ui.toast('RAGE → FOCUS', 'info'); }
};

G.hitMonitor = (m, dmg, dir, uv, point) => {
  if (m.state === 'smashed') return;
  m.hp -= dmg; m.crack(uv);
  G.addRage(0.1 * dmg); G.player.shake(0.3); G.sfx.punch(); G.sfx.crack();
  destruction.sparks(point || m.center, 8); G.penguin.bonk(0.8);
  if (m.hp <= 0) smashMonitor(m, dir);
};

function smashMonitor(m, dir) {
  const flagged = m.state === 'flagged';
  m.group.updateMatrixWorld(true);
  destruction.burst(m.boxes, m.group.matrixWorld, dir, 1);
  destruction.glass(m, dir); destruction.sparks(m.center, 34);
  m.remove();
  G.stats.monitorsDestroyed++; G.stats.invoice.push({ label: m.def.label, price: m.def.price });
  G.sfx.shatter(); G.player.shake(0.85); G.hitStop = 0.07; G.addRage(0.3); G.penguin.bonk(2);
  G.ui.toast(`-$${m.def.price.toLocaleString('en-US')}`, 'info');
  if (flagged) { G.ui.hint('Destroying evidence? Banned anyway.'); ban.ban(m, m.flag.reason + ' (also: destroying evidence)'); }
  m.state = 'smashed';
}

G.penguinOffend = () => { G.stats.offended++; G.penguin.offend(); G.sfx.hmph(); G.ui.hint('The penguin is indestructible. And offended.'); };

let squeakT = 0;
function squeeze() {
  if (G.state !== 'playing') return;
  if (squeakT <= 0) { G.sfx.squeak(); G.penguin.squeak(); squeakT = 0.35; }
  if (G.penguinCd <= 0) { G.calmT = 4; G.penguinCd = 14; G.stats.squeezes++; G.ui.toast('SQUEAK — ban timers slowed', 'good'); }
}

function pickTarget() {
  const ray = G.player.aim();
  const targets = G.monitors.filter((m) => m.state !== 'smashed').map((m) => m.screen).concat(G.props.targets());
  const hits = ray.intersectObjects(targets, true);
  for (const h of hits) {
    let o = h.object;
    while (o && !(o.userData.monitor || o.userData.prop || o.userData.penguin || o.userData.fridge)) o = o.parent;
    if (o) return { h, mon: o.userData.monitor, prop: o.userData.prop, penguin: o.userData.penguin, fridge: o.userData.fridge };
  }
  return null;
}

let mouseSqueeze = false;
function click() {
  if (G.state !== 'playing') return;
  const hit = pickTarget();
  const dir = G.player.ray.ray.direction.clone();
  if (hit && hit.mon && hit.mon.state === 'flagged') { if (ban.appeal(hit.mon, hit.h.uv) === 'appealed') { hit.mon.grace = G.real + 0.45; hit.mon.pop = 1; } return; }
  if (G.drunk > 0.2 && !(hit && (hit.penguin || hit.fridge))) { // liquid confidence: near misses count
    let best = null, bestA = 0.05 + G.drunk * 0.075;
    for (const m of G.monitors) if (m.state === 'flagged') { const a = dir.angleTo(m.center.clone().sub(camera.position)); if (a < bestA) { bestA = a; best = m; } }
    if (best) { ban.appeal(best, null); best.grace = G.real + 0.45; best.pop = 1; return; }
  }
  G.swingT = 0.22;
  if (!hit) { G.sfx.whoosh(); return; }
  if (hit.penguin) { if (G.held) G.penguinOffend(); else { mouseSqueeze = true; squeeze(); } return; }
  if (hit.fridge) { vices.beer(); return; }
  if (hit.h.distance > 2.5) { G.ui.hint('Too far — stand up (WASD) or throw something (E)'); return; }
  const dmg = G.held ? 2 : 1;
  if (hit.mon) { if ((hit.mon.grace || 0) > G.real) return; G.hitMonitor(hit.mon, dmg, dir, hit.h.uv, hit.h.point); }
  else if (hit.prop) G.props.hit(hit.prop, dmg, dir);
}

function grabThrow() {
  if (G.state !== 'playing') return;
  const ray = G.player.aim(), dir = ray.ray.direction.clone();
  if (G.held) { const p = G.held; G.held = null; G.props.throw(p, dir); return; }
  const hit = pickTarget();
  if (hit && hit.prop && hit.prop.grab && hit.h.distance < 2.7) {
    if (hit.prop.kind === 'chair' && G.player.seated) { G.ui.hint('Stand up first (WASD) — then throw the chair'); return; }
    G.props.grab(hit.prop); G.held = hit.prop; G.ui.hint('Click to swing · E to throw');
  } else G.ui.hint('Aim at the keyboard, mouse, mug, cans, pizza or chair to grab it');
}

// ---------- run lifecycle ----------
function resetWorld() {
  G.time = 0; G.ship = 0; G.strikes = 0; G.streak = 0; G.combo = 0; G.comboT = 0; G.rage = 0; G.focusT = 0; G.hitStop = 0; G.calmT = 0; G.penguinCd = 0;
  G.swingT = 0; G.outcome = null; G.stats = newStats(); G.appName = pick(APP_NAMES);
  if (G.held) { G.held = null; }
  destruction.reset(); G.props.reset(); vices.reset(); ban.reset(); G.player.reset();
  for (const m of G.monitors) m.reset();
}

function start(sim = false) {
  resetWorld();
  G.sim = sim; G.ui.silent = sim; G.sfx.muted = sim;
  G.state = 'playing';
  if (!sim) {
    G.sfx.init(); G.ui.showTitle(false); G.ui.hideEnd(); G.ui.showHud(true); G.player.lock();
    G.ui.hint('Red screen = click it before the countdown ends. Q squeezes the penguin.', 6);
  }
}

function toTitle() { resetWorld(); G.state = 'title'; G.sim = false; G.ui.silent = false; G.sfx.muted = false; G.ui.showHud(false); G.ui.hideEnd(); G.ui.showTitle(true); }

G.end = (outcome) => {
  if (G.state !== 'playing') return;
  G.state = 'ended'; G.outcome = outcome;
  if (G.sim) return;
  if (outcome === 'shipped') {
    for (const m of G.monitors) if (m.alive()) { m.state = 'shipped'; m.flag = null; }
    destruction.confetti(); G.sfx.win(); G.ui.toast(`${G.appName} IS LIVE`, 'good');
  } else { G.sfx.lose(); G.ui.toast(outcome === 'banned' ? 'CLAUDE HAS BANNED YOU' : 'NO MONITORS LEFT', 'bad'); G.ui.flash(); }
  setTimeout(() => {
    if (G.state !== 'ended') return;
    G.player.unlock();
    const card = makeCard(G); G.card = card;
    const T = { shipped: ['SHIPPED!', `"${G.appName}" is live. Claude is furious. Screenshot the receipt.`, '#2bff8a'],
      banned: ['BANNED BY CLAUDE.', 'Claude banned you personally. For whatever reason. Post the receipt as evidence.', '#ff2b4a'],
      nohardware: ['NO HARDWARE.', 'You destroyed every monitor. Technically nobody can ban you now.', '#ffa22e'] }[outcome];
    G.ui.showEnd(card, T[0], T[1], T[2]);
  }, outcome === 'shipped' ? 3800 : 2400);
};

// ---------- simulation step ----------
function step(dt) {
  G.real += dt;
  let gdt = dt;
  if (G.state === 'playing') {
    if (G.hitStop > 0) { G.hitStop -= dt; gdt = 0; } else gdt = dt * (G.focusT > 0 ? 0.4 : 1);
    G.time += gdt;
    G.focusT = Math.max(0, G.focusT - dt); G.calmT = Math.max(0, G.calmT - dt); G.penguinCd = Math.max(0, G.penguinCd - dt);
    G.rage = Math.max(0, G.rage - dt * 0.015);
    ban.update(gdt);
  }
  if (G.sim) return;
  squeakT -= dt; G.swingT -= dt;
  destruction.update(gdt);
  const k = G.player.keys;
  G.penguin.squeezing = G.state === 'playing' && (!!k.KeyQ || mouseSqueeze);
  if (G.penguin.squeezing && k.KeyQ) squeeze();
  vices.update(dt, G.real, !!k.KeyV);
  G.props.update(dt, G.real);
}

// scripted bot run: skill 0..1 = chance to answer each flag in time. Returns the outcome.
G.simulate = (seconds = 420, skill = 1) => {
  start(true);
  const dt = 1 / 30; let busy = 0;
  while (G.state === 'playing' && G.time < seconds) {
    step(dt); busy -= dt;
    for (const m of G.monitors) {
      if (m.state !== 'flagged') continue;
      const f = m.flag;
      if (f.bot === undefined) f.bot = Math.random() < skill ? 0.55 + Math.random() * 0.9 : Infinity;
      if (f.max - f.t >= f.bot && busy <= 0) {
        if (f.decoy && Math.random() > skill) { f.t -= 1.5; f.bot += 0.6; } else ban.appeal(m, null);
        busy = 0.4;
      }
    }
  }
  const s = G.stats, ft = s.flagTimes;
  const r = { outcome: G.outcome || 'timeout', time: +G.time.toFixed(1), ship: +G.ship.toFixed(1), strikes: G.strikes, flags: s.flags, appeals: s.appeals, bans: s.bans,
    flagsFirst60s: ft.filter((t) => t < 60).length, flags120to180: ft.filter((t) => t >= 120 && t < 180).length };
  toTitle();
  return r;
};

// ---------- input ----------
renderer.domElement.addEventListener('mousedown', (e) => {
  if (G.state !== 'playing') return;
  if (!G.player.locked) G.player.lock();
  if (e.button === 0) click();
});
addEventListener('mouseup', () => { mouseSqueeze = false; });
addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'KeyE') grabThrow();
  if (e.code === 'KeyB') vices.beer();
  if (e.code === 'KeyQ') squeeze();
  if (e.code === 'Space') e.preventDefault();
});
document.getElementById('startBtn').addEventListener('click', () => start(false));
document.getElementById('againBtn').addEventListener('click', () => start(false));
document.getElementById('saveBtn').addEventListener('click', () => G.card && savePNG(G.card));
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
});

// ---------- frame loop ----------
let last = performance.now(), frameN = 0, rr = 0;
const _v = new THREE.Vector3();
G.fps = 60; G.quality = 0;
let slow = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const raw = (now - last) / 1000, dt = Math.min(0.05, raw); last = now;
  if (raw > 0 && raw < 0.1 && G.state === 'playing' && document.visibilityState === 'visible') { // only judge real, visible gameplay frames
    G.fps += (1 / raw - G.fps) * 0.05;
    // adaptive quality: hold 60 fps by shedding resolution first, then AO, then depth of field
    slow = G.fps < 50 ? slow + 1 : Math.max(0, slow - 2);
    if (slow > 120 && G.quality < 3) {
      slow = 0; G.quality++;
      if (G.quality === 1) { renderer.setPixelRatio(1); composer.setPixelRatio(1); }
      else if (G.quality === 2) gtao.enabled = false;
      else bokeh.enabled = false;
    }
  }
  if (!G.manual) tick(dt); // QA takes over the clock
}
// one full frame (logic + visuals). Exposed so tests can advance time without waiting for rAF.
function tick(dt) {
  frameN++;
  step(dt);

  const flagged = G.monitors.filter((m) => m.state === 'flagged');
  const alert = G.state === 'playing' ? Math.min(1, flagged.length / 2) : 0;
  room.update(G.real, alert, G.calmT > 0 ? 1 : 0, G.state === 'playing' && flagged.length ? flagged.reduce((a, m) => (m.flag.t < a.flag.t ? m : a)).center : null);
  G.player.update(dt, G.real, G.drunk, G.state === 'playing');
  if (G.state === 'title') {
    camera.position.set(Math.sin(G.real * 0.14) * 0.8, 1.78, 0.95);
    camera.lookAt(Math.sin(G.real * 0.14) * 0.15, 1.08, -1.6);
  }

  rr = (rr + 1) % G.monitors.length;
  for (const m of G.monitors) {
    if (m.state === 'smashed') continue;
    const anim = m.state === 'flagged' || m.state === 'shipped';
    if (m.dirty || (anim && frameN % 2 === 0) || (m.i === rr && m.state === 'ok')) m.draw(G);
    m.pop = Math.max(0, (m.pop || 0) - dt * 6);
    m.group.scale.setScalar(1 + 0.09 * m.pop * m.pop);
    m.screen.position.x = m.state === 'flagged' ? Math.sin(G.real * 47) * 0.004 * (1 + (1 - m.flag.t / m.flag.max) * 2) : 0;
    m.mat.color.setScalar(m.state === 'flagged' ? 1.25 + 0.3 * Math.sin(G.real * 31) : m.state === 'banned' ? 0.75 : 1.15);
  }

  if (G.state === 'playing') {
    G.ui.frame(G, dt);
    let l = false, r = false;
    camera.updateMatrixWorld();
    for (const m of flagged) {
      _v.copy(m.center).applyMatrix4(camera.matrixWorldInverse);
      const off = _v.z > 0 || Math.abs(_v.x / -_v.z) > Math.tan((camera.fov * Math.PI) / 360) * camera.aspect;
      if (off) { if (_v.x < 0) l = true; else r = true; }
    }
    G.ui.arrows(l, r);
    G.ui.cursorMode(G.player.locked);
    const hit = G.player.aim().intersectObjects(flagged.map((m) => m.screen), false);
    G.ui.hot(hit.length > 0);
    if (Math.random() < dt * 3) G.sfx.clack(); // sparse, quiet key clicks
    if (!G.player.seated && G.player.chairOk && G.player.nearSeat() && G.ui.hintT <= 0) G.ui.hint('SPACE to sit back down', 0.5);
    if (!G.player.locked && G.ui.hintT <= 0 && G.time > 8) G.ui.hint('Click the game to capture the mouse (Esc releases it)', 0.5);
  }
  // shadow maps refresh every other frame (lamp on even frames, monitor glow on odd): invisible, and it halves their cost
  room.lamp.shadow.needsUpdate = frameN % 2 === 0; room.screenL.shadow.needsUpdate = frameN % 2 === 1;
  bokeh.uniforms.focus.value = 1.5 + G.player.lean * 0.5;
  composer.render();
}
onLang(() => { for (const m of G.monitors) m.dirty = true; }); // redraw every screen in the new language
G.setLang = setLang; G.getLang = getLang;
G.tick = tick; G.toTitle = toTitle; G.start = start; G.click = click; G.grabThrow = grabThrow; G.squeeze = squeeze;
if (location.search.includes('qa')) import('./qa.js').then((m) => { G.qa = () => m.runQA(G); });
G.ui.showTitle(true);
requestAnimationFrame(frame);
