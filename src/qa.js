// QA harness. Open the game with ?qa, click START (a real click is needed so the browser allows audio),
// then run `await __game.qa()` in the console. It drives the game with real DOM events (keydown / mousemove /
// mousedown) and returns a pass/fail table. With ?qa the speakers stay silent but the audio level is still measured.
import * as THREE from 'three';
import { typo } from './agents.js';
import { Sfx } from './audio.js';

export async function runQA(G) {
  const R = [];
  const check = (name, ok, detail = '') => { R.push({ name, pass: !!ok, detail: String(detail) }); };
  const skip = (name, why) => { R.push({ name, pass: null, detail: 'SKIPPED — ' + why }); };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const T = (s) => { for (let i = 0; i < Math.round(60 * s); i++) G.tick(1 / 60); };
  const key = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
  const press = (code) => { key('keydown', code); key('keyup', code); };
  const canvas = document.querySelector('#app canvas');
  const face = (v) => { const d = v.clone().sub(G.player.pos); G.player.yaw = Math.atan2(-d.x, -d.z); G.player.pitch = Math.atan2(d.y, Math.hypot(d.x, d.z)); T(0.05); };
  const aim = (v) => {
    G.camera.updateMatrixWorld(); const p = v.clone().project(G.camera);
    const x = ((p.x + 1) / 2) * innerWidth, y = ((1 - p.y) / 2) * innerHeight;
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true }));
    return { x, y };
  };
  const click = (v) => { const { x, y } = aim(v); canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y, button: 0, bubbles: true })); window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); };
  const fresh = () => { G.start(false); G.ban.next = 9999; T(0.5); };
  const flag = (m, t = 30, decoy = null) => { m.flag = { reason: 'QA flag', t, max: t, decoy, born: G.time }; m.state = 'flagged'; m.dirty = true; T(0.05); };
  // a point on a monitor's screen in world space, from uv (0..1, v up)
  const onScreen = (m, u, v) => new THREE.Vector3((u - 0.5) * m.w, (v - 0.5) * m.h, 0.001).applyMatrix4(m.group.matrixWorld);
  const prop = (kind) => G.props.list.find((p) => p.kind === kind);
  const cans = () => G.props.list.filter((p) => p.kind === 'can').length;

  let errors = 0; const onErr = () => { errors++; };
  addEventListener('error', onErr); addEventListener('unhandledrejection', onErr);
  if (document.pointerLockElement) document.exitPointerLock();
  G.manual = true; // QA owns the clock
  const realClack = G.sfx.clack; G.sfx.clack = () => {};

  try {
    // ---------- sound ----------
    // Each effect is rendered through the game's own Sfx code into an OfflineAudioContext, so the result does not
    // depend on timers, tab focus or speakers. "Background" = what plays when no effect is triggered.
    const render = async (fn) => {
      const off = new OfflineAudioContext(1, 44100 * 3, 44100), sfx = new Sfx(); sfx.setup(off, 1);
      if (fn) fn(sfx);
      const d = (await off.startRendering()).getChannelData(0);
      let peak = 0, last = 0; for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; if (v > 0.001) last = i; }
      return { peak, dur: last / 44100 };
    };
    const bg = await render(null);
    check('audio: NO background sound when nothing happens (hum, drone and rain are gone)', bg.peak === 0, 'peak ' + bg.peak);
    for (const f of ['clack', 'alarm', 'ding', 'buzz', 'stamp', 'punch', 'crack', 'shatter', 'clink', 'thud', 'canOpen', 'crush', 'squeak', 'hmph', 'puff', 'whoosh', 'focus', 'win', 'lose']) {
      const r = await render((x) => x[f]());
      check(`audio: effect "${f}" is audible and ends`, r.peak > 0.01 && r.dur < 2.9, `peak ${r.peak.toFixed(3)}, lasts ${r.dur.toFixed(2)} s`);
    }
    fresh();
    const live = G.sfx.ctx && G.sfx.ctx.state === 'running';
    check('audio: live context is running after a real START click', live, G.sfx.ctx ? G.sfx.ctx.state : 'no context (needs a real click on START, and no ?mute)');
    if (live) { // one live measurement: a ding must show up on the game's real output bus
      const c = G.sfx.ctx, wait = (sec) => { const t0 = c.currentTime, p0 = performance.now(); while (c.currentTime < t0 + sec && performance.now() - p0 < 1500) { /* spin */ } };
      wait(0.8); const quiet = G.sfx.level(); G.sfx.ding(0); wait(0.05); const loud = G.sfx.level();
      check('audio: live output is silent at rest and a ding raises it', quiet < 0.0005 && loud > 0.005, `rest ${quiet.toFixed(5)}, ding ${loud.toFixed(4)}`);
    }

    // ---------- core loop ----------
    G.start(false); let t = 0; while (!G.monitors.some((m) => m.state === 'flagged') && t < 15) { T(0.1); t += 0.1; }
    check('loop: first flag arrives within 10 s', G.time <= 10 && G.monitors.some((m) => m.state === 'flagged'), 'at ' + G.time.toFixed(1) + ' s');
    check('ui: HUD visible and title hidden while playing', getComputedStyle(document.getElementById('hud')).display === 'block' && getComputedStyle(document.getElementById('title')).display === 'none');

    fresh(); let m = G.monitors[1]; flag(m); face(m.center); click(m.center);
    check('loop: clicking a flagged monitor appeals it (real mouse event)', m.state === 'ok' && G.stats.appeals === 1, `state ${m.state}, appeals ${G.stats.appeals}`);
    const hp0 = m.hp; click(m.center);
    check('loop: double-click right after an appeal does not punch your own monitor', m.hp === hp0, 'hp ' + m.hp);

    fresh(); m = G.monitors[3]; flag(m, 1.0); T(1.2);
    check('loop: missed countdown bans the agent (strike, progress penalty)', m.state === 'banned' && G.strikes === 1 && G.stats.bans === 1, `state ${m.state}, strikes ${G.strikes}`);

    fresh(); m = G.monitors[0]; flag(m, 30, { side: 1, label: 'APPLE' }); face(m.center);
    click(onScreen(m, 0.25, 0.15)); const tAfter = m.flag ? m.flag.t : -1;
    check('loop: decoy button costs 1.5 s and does not appeal', m.state === 'flagged' && G.stats.decoys === 1 && tAfter < 28.6 && tAfter > 28.2, 'timer ' + tAfter.toFixed(2));
    click(onScreen(m, 0.5, 0.6));
    check('loop: clicking outside the buttons on a decoy screen does nothing', m.state === 'flagged');
    click(onScreen(m, 0.75, 0.15));
    check('loop: the real APPEAL button works on a decoy screen', m.state === 'ok');

    fresh(); for (let i = 0; i < 5; i++) { flag(G.monitors[i], 0.2); T(0.4); }
    check('loop: 5 strikes ends the run as BANNED', G.state === 'ended' && G.outcome === 'banned', `${G.state}/${G.outcome}`);

    fresh(); G.monitors[2].state = 'banned'; G.strikes = 1; G.streak = 5; m = G.monitors[1]; flag(m); face(m.center); click(m.center);
    check('loop: 6-appeal streak reinstates a banned agent', G.strikes === 0 && G.monitors[2].state === 'ok', `strikes ${G.strikes}, m2 ${G.monitors[2].state}`);

    fresh(); m = G.monitors[4]; flag(m, 20); const a0 = m.flag.t; T(1); const d1 = a0 - m.flag.t;
    face(G.penguin.center); key('keydown', 'KeyQ'); T(0.3);
    const squash = G.penguin.body.scale.y; const b0 = m.flag.t; T(1); const d2 = b0 - m.flag.t; key('keyup', 'KeyQ');
    check('penguin: Q squeezes (squash + calm for 4 s)', G.stats.squeezes === 1 && squash < 0.85, `scale.y ${squash.toFixed(2)}, squeezes ${G.stats.squeezes}`);
    check('penguin: ban timers slow to ~35 % while calm', d1 > 0.95 && d2 > 0.3 && d2 < 0.42, `normal ${d1.toFixed(2)} s/s, calm ${d2.toFixed(2)} s/s`);
    press('KeyQ'); check('penguin: squeeze has a cooldown', G.stats.squeezes === 1 && G.penguinCd > 10, 'cooldown ' + G.penguinCd.toFixed(1));
    T(0.5); click(G.penguin.center); check('penguin: clicking it also squeaks (bubble shown)', G.penguin.bubble.visible);

    // ---------- destruction ----------
    fresh(); m = G.monitors[1]; face(m.center); click(m.center); T(0.3);
    check('smash: first punch cracks the screen', m.cracks.length > 0 && m.hp === 2 && m.state === 'ok', `cracks ${m.cracks.length}, hp ${m.hp}`);
    check('smash: punch shows the fist', G.props.fist.visible || G.swingT > -0.2);
    click(m.center); T(0.3); click(m.center); const stopped = G.hitStop > 0; T(0.3);
    check('smash: third punch bursts the monitor into debris', m.state === 'smashed' && !m.group.parent && G.destruction.live > 60, `debris ${G.destruction.live}`);
    check('smash: hit-stop + screen shake + rage on burst', stopped && G.rage > 0.3, `hitStop ${stopped}, rage ${G.rage.toFixed(2)}`);
    check('smash: damage invoice gets the monitor', G.stats.invoice.length === 1 && G.stats.invoice[0].price === 449, JSON.stringify(G.stats.invoice));
    T(9); const awake = G.destruction.d.filter((o) => o.awake).length, used = G.destruction.d.filter((o) => o.used);
    check('smash: debris settles and persists', awake === 0 && used.length > 60 && used.every((o) => o.p.y >= 0 && Math.abs(o.p.x) <= 2.5 && Math.abs(o.p.z) <= 2.2), `awake ${awake}, pieces ${used.length}`);

    fresh(); m = G.monitors[3]; flag(m); G.hitMonitor(m, 9, new THREE.Vector3(0, 0, -1), null, null); T(0.2);
    check('smash: destroying a flagged monitor still counts as a ban', G.strikes === 1 && m.state === 'smashed', `strikes ${G.strikes}`);

    fresh(); G.addRage(1); const g0 = G.time; T(1);
    check('rage: full meter triggers slow-motion FOCUS (time ×0.4)', Math.abs(G.time - g0 - 0.4) < 0.03, `1 s real = ${(G.time - g0).toFixed(2)} s game`);

    fresh(); const D = G.destruction, P = G.penguin, home = P.group.position.clone(); let wob = 0;
    for (let i = 0; i < 40; i++) D.spawn(P.center.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.12, 0.4 + Math.random() * 0.4, (Math.random() - 0.5) * 0.12)), 0.04, 0.04, 0.04, new THREE.Color(1, 1, 1), new THREE.Quaternion(), new THREE.Vector3());
    for (let i = 0; i < 180; i++) { G.tick(1 / 60); wob = Math.max(wob, Math.abs(P.wob) + Math.abs(P.wobX)); }
    const inside = D.d.filter((o) => o.used && o.p.distanceTo(P.center) < P.r - 0.005).length;
    check('penguin: debris bounces off, penguin wobbles, never moves', inside === 0 && wob > 0.01 && P.group.position.distanceTo(home) < 1e-6 && !!P.group.parent, `inside ${inside}, wobble ${wob.toFixed(3)}`);

    let err = null; fresh();
    try { for (let k = 0; k < 30; k++) { D.burst(G.monitors[1].boxes, G.monitors[1].group.matrixWorld, new THREE.Vector3(0, 0, -1), 1); T(0.05); } } catch (e) { err = e; }
    check('smash: debris pool exhaustion recycles the oldest chunk (no error)', !err && D.live === 1400, err ? String(err) : 'live ' + D.live);

    // ---------- grab / swing / throw ----------
    fresh(); let kb = prop('keyboard'); face(kb.group.position); aim(kb.group.position); press('KeyE');
    check('grab: E picks up the keyboard', G.held === kb && kb.group.parent === G.camera);
    m = G.monitors[3]; face(m.center); click(m.center); T(0.3);
    check('grab: swinging a held item does double damage', m.hp === 1, 'hp ' + m.hp);
    m = G.monitors[1]; face(m.center); aim(m.center); press('KeyE'); T(1.2);
    check('throw: E throws it; a thrown keyboard damages the monitor it hits', !G.held && m.hp === 1 && G.stats.thrown === 1, `hp ${m.hp}, kb hp ${kb.hp}`);

    fresh(); const mug = prop('mug'); face(mug.group.position); aim(mug.group.position); press('KeyE');
    face(G.penguin.center); aim(G.penguin.center); press('KeyE'); T(1.2);
    check('penguin: thrown items bounce off, it gets offended (brows + "...rude.")', G.stats.offended === 1 && G.penguin.offT > 0 && G.penguin.brows[0].visible && !!G.penguin.group.parent, 'offended ' + G.stats.offended);

    fresh(); m = prop('mouse'); face(m.group.position); click(m.group.position); T(0.3);
    check('smash: desk props burst too (mouse → invoice $79)', !prop('mouse') && G.stats.invoice.some((i) => i.price === 79));
    const cn = prop('can'); face(cn.group.position); click(cn.group.position); T(0.2);
    check('cans: first hit crushes a can', cn.group.scale.y < 0.5 && G.stats.crushed === 1, 'scale.y ' + cn.group.scale.y);

    // ---------- vices ----------
    fresh(); const c0 = cans(); press('KeyB'); let peak = 0, seen = false, tilt = 0;
    for (let i = 0; i < 110; i++) { G.tick(1 / 60); peak = Math.max(peak, G.vices.drinkK); seen = seen || G.vices.can.visible; tilt = Math.max(tilt, G.player.tilt); }
    check('beer: B plays the drinking animation (can raised, tipped, camera tilts back)', seen && peak > 0.95 && tilt > 0.15 && !G.vices.can.visible, `tip ${peak.toFixed(2)}, camera tilt ${tilt.toFixed(2)} rad`);
    check('beer: counts, makes you drunk, tosses an empty can onto the desk', G.stats.beers === 1 && G.drunk > 0.9 && cans() === c0 + 1, `beers ${G.stats.beers}, drunk ${G.drunk.toFixed(2)}, cans ${c0}→${cans()}`);
    check('beer: screens get typos', typo('const ship = async () => await yolo();', 3) !== 'const ship = async () => await yolo();');
    T(0.3); press('KeyB'); T(2); m = G.monitors[6]; flag(m); face(m.center);
    const near = m.center.clone().add(new THREE.Vector3(0, 0.2, 0));
    click(near); check('beer: bigger appeal hitbox (near miss still appeals when drunk)', m.state === 'ok', 'drunk ' + G.drunk.toFixed(2));
    G.drunk = 0; T(0.6); flag(m); click(near); check('beer: sober near miss does NOT appeal (control)', m.state === 'flagged');
    fresh(); face(G.props.fridge.position.clone().setY(0.5)); click(G.props.fridge.position.clone().add(new THREE.Vector3(0.25, 0.5, 0)));
    check('beer: clicking the mini fridge also grabs one', G.stats.beers === 1);

    fresh(); key('keydown', 'KeyV'); T(2.2); key('keyup', 'KeyV'); T(1.5);
    const puffs = G.vices.puffs.filter((p) => p.life > 0).length;
    check('vape: holding V fills the room with a cloud and calms timers', G.stats.vapes === 1 && puffs > 12 && G.vapeCalm > 0.4, `puffs ${puffs}, calm ${G.vapeCalm.toFixed(2)}`);
    T(22); check('vape: the cloud drifts and fades out', G.vices.puffs.filter((p) => p.life > 0).length === 0 && G.vapeCalm < 0.05);

    // ---------- movement ----------
    fresh(); key('keydown', 'Space'); T(0.6); const lean = G.player.lean, fov = G.camera.fov; key('keyup', 'Space'); T(0.6);
    check('move: Space leans back (wider view) and releases', lean > 0.9 && G.player.lean < 0.1, `lean ${lean.toFixed(2)}, fov ${fov.toFixed(0)}°`);
    G.player.yaw = 0; key('keydown', 'KeyS'); T(0.5); key('keyup', 'KeyS');
    check('move: WASD stands up and walks', !G.player.seated && G.player.pos.y > 1.5 && G.player.pos.z > 0.5, 'pos ' + G.player.pos.toArray().map((v) => v.toFixed(2)));
    const ch = G.props.chair; face(ch.group.position); click(ch.group.position); T(0.1);
    check('chair: clicking it spins it', Math.abs(ch.spin) > 5, 'spin ' + ch.spin.toFixed(1));
    G.player.yaw = 0; key('keydown', 'KeyW'); T(0.3); key('keyup', 'KeyW'); press('Space'); key('keydown', 'Space'); T(0.1); key('keyup', 'Space');
    check('move: Space near the chair sits back down', G.player.seated, 'pos ' + G.player.pos.toArray().map((v) => v.toFixed(2)));
    fresh(); G.player.yaw = 0; key('keydown', 'KeyS'); T(0.4); key('keyup', 'KeyS'); face(G.props.chair.group.position); aim(G.props.chair.group.position); press('KeyE');
    const heldChair = G.held && G.held.kind === 'chair'; m = G.monitors[0]; face(m.center); aim(m.center); press('KeyE'); T(1.5);
    check('chair: can be grabbed and thrown at a monitor', heldChair && !G.held && m.hp < 4, 'ultrawide hp ' + m.hp);

    // ---------- endings + share card ----------
    fresh(); G.ship = 99.95; T(0.5);
    check('end: reaching 100 % SHIP wins (monitors show SHIPPED, confetti)', G.state === 'ended' && G.outcome === 'shipped' && G.monitors[0].state === 'shipped' && G.destruction.d.filter((o) => o.awake).length > 100);
    await sleep(4100);
    const endOn = getComputedStyle(document.getElementById('end')).display === 'flex';
    const blob = G.card ? await new Promise((r) => G.card.toBlob(r, 'image/png')) : null;
    check('end: share card appears and exports as PNG', endOn && G.card.width === 760 && blob && blob.type === 'image/png' && blob.size > 50000, blob ? `${G.card.width}×${G.card.height}, ${Math.round(blob.size / 1024)} KB` : 'no card');
    document.getElementById('againBtn').click(); T(0.5);
    check('end: RUN IT BACK resets everything', G.state === 'playing' && G.strikes === 0 && G.ship < 1 && G.stats.appeals === 0 && G.monitors.every((x) => x.state === 'ok' && x.group.parent) && getComputedStyle(document.getElementById('end')).display === 'none');
    fresh(); for (const x of G.monitors) G.hitMonitor(x, 9, new THREE.Vector3(0, 0, -1), null, null); T(0.3);
    check('end: smashing every monitor ends the run cleanly', G.state === 'ended' && G.outcome === 'nohardware');

    // ---------- balance + performance ----------
    const win = G.simulate(600, 1), afk = G.simulate(600, 0);
    check('balance: winnable in 3–5 min (perfect bot)', win.outcome === 'shipped' && win.time >= 170 && win.time <= 300, `${win.outcome} at ${win.time} s`);
    check('balance: losable (AFK bot is banned)', afk.outcome === 'banned', `${afk.outcome} at ${afk.time} s`);
    check('balance: difficulty ramps (flags per minute rise)', win.flags120to180 > win.flagsFirst60s * 1.5, `${win.flagsFirst60s} → ${win.flags120to180}`);
    // real frame rate: only meaningful when this tab is actually being drawn (fronted, visible)
    fresh(); key('keydown', 'KeyV'); T(2); key('keyup', 'KeyV'); // worst case: a vape cloud on screen
    G.manual = false;
    const fps = await Promise.race([
      new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2500) requestAnimationFrame(f); else res((n * 1000) / (performance.now() - t0)); }; requestAnimationFrame(f); }),
      sleep(6000).then(() => null),
    ]);
    G.manual = true;
    const px = `${Math.round(innerWidth * G.renderer.getPixelRatio())}×${Math.round(innerHeight * G.renderer.getPixelRatio())} px`;
    if (document.visibilityState !== 'visible' || fps === null || fps < 5) skip('perf: real frame rate ≥ 58 fps', 'tab is not being drawn (run QA in the front tab)');
    else check('perf: real frame rate ≥ 58 fps with AO, DoF and a vape cloud', fps >= 58, `${fps.toFixed(0)} fps at ${px}, quality step ${G.quality}`);
  } catch (e) {
    check('QA harness crashed', false, e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : String(e));
  }
  check('no uncaught errors during QA', errors === 0, errors + ' errors');
  removeEventListener('error', onErr); removeEventListener('unhandledrejection', onErr);
  G.sfx.clack = realClack; G.manual = false;
  G.toTitle();
  const failed = R.filter((r) => r.pass === false), skipped = R.filter((r) => r.pass === null);
  return { passed: R.filter((r) => r.pass === true).length, total: R.length, failed, skipped, all: R };
}
