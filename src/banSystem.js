// Whack-a-Ban: the Hall Monitor flags agents, you appeal before the countdown ends.
import { pick, lerp } from './voxel.js';
import { REASONS, DECOYS } from './agents.js';

export class BanSystem {
  constructor(G) { this.G = G; this.reset(); }
  reset() { this.next = 2.5; this.pool = []; }

  interval(t) { return lerp(4.2, 1.35, Math.min(1, t / 210)) * (0.75 + Math.random() * 0.5); }
  countdown(t) { return lerp(6.5, 3.3, Math.min(1, t / 180)); }
  maxSimul(t) { return t < 40 ? 1 : t < 100 ? 2 : t < 165 ? 3 : 4; }

  reason() { if (!this.pool.length) this.pool = REASONS.slice().sort(() => Math.random() - 0.5); return this.pool.pop(); }

  update(dt) {
    const G = this.G, t = G.time;
    const alive = G.monitors.filter((m) => m.alive());
    if (!alive.length) { G.end('nohardware'); return; }
    G.ship += dt * (alive.length / G.monitors.length) * (100 / 235);
    if (G.ship >= 100) { G.ship = 100; G.end('shipped'); return; }
    if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }

    const calm = (G.calmT > 0 ? 0.35 : 1) * (1 - 0.25 * G.vapeCalm);
    let flagged = 0;
    for (const m of G.monitors) {
      if (m.state !== 'flagged') continue;
      flagged++;
      m.flag.t -= dt * calm;
      if (m.flag.t <= 0) { this.ban(m); if (G.state !== 'playing') return; }
    }
    this.next -= dt;
    if (this.next <= 0) {
      this.next = this.interval(t);
      if (flagged < this.maxSimul(t)) {
        this.flagRandom();
        if (t > 150 && Math.random() < 0.3 && flagged + 1 < this.maxSimul(t)) this.flagRandom();
      }
    }
  }

  flagRandom() {
    const G = this.G, t = G.time;
    const c = G.monitors.filter((m) => m.state === 'ok');
    if (!c.length) return null;
    const m = pick(c), cd = this.countdown(t), reason = this.reason();
    const decoy = t > 70 && Math.random() < Math.min(0.7, (t - 70) / 120) ? { side: Math.random() < 0.5 ? 0 : 1, label: pick(DECOYS) } : null;
    m.flag = { reason, t: cd, max: cd, decoy, born: t };
    m.state = 'flagged'; m.dirty = true;
    G.stats.flags++; G.stats.lastReason = reason; G.stats.flagTimes.push(t);
    if (decoy && !G.stats.decoyHint) { G.stats.decoyHint = true; G.ui.hint('New: DECOY buttons. Read before you click — only APPEAL counts.', 4); }
    G.sfx.alarm();
    G.ui.announce(`HALL MONITOR flagged ${m.agent.name}: ${reason}`);
    return m;
  }

  // uv = where on the screen the click landed (null = anywhere counts, e.g. beer confidence or the bot)
  appeal(m, uv) {
    const G = this.G;
    if (m.state !== 'flagged') return 'none';
    const f = m.flag;
    if (f.decoy && uv) {
      if (uv.y > 0.3) { if (!G.drunk) { G.ui.hint('Hit the APPEAL button!'); return 'none'; } }
      else if ((uv.x < 0.5 ? 0 : 1) !== f.decoy.side) {
        f.t -= 1.5; G.stats.decoys++; G.combo = 0;
        G.sfx.buzz(); G.ui.toast(`"${f.decoy.label}"?! -1.5s`, 'bad'); G.player.shake(0.25);
        m.dirty = true;
        return 'decoy';
      }
    }
    m.state = 'ok'; m.flag = null; m.dirty = true;
    G.combo = G.comboT > 0 ? G.combo + 1 : 1; G.comboT = 2.5;
    G.stats.appeals++; G.stats.bestCombo = Math.max(G.stats.bestCombo, G.combo);
    G.ship = Math.min(100, G.ship + 0.1 * Math.min(G.combo, 10));
    G.sfx.ding(G.combo);
    G.ui.toast(G.combo > 1 ? `APPEALED  x${G.combo}` : 'APPEALED', 'good');
    G.ui.combo(G.combo);
    // good behaviour: every 10 appeals in a row wipes a strike and reboots a banned agent
    G.streak = (G.streak || 0) + 1;
    if (G.streak % 6 === 0 && G.strikes > 0) {
      G.strikes--;
      const b = G.monitors.find((x) => x.state === 'banned');
      if (b) { b.state = 'ok'; b.dirty = true; }
      G.ui.toast(b ? `STREAK x${G.streak}: ${b.agent.name} REINSTATED` : `STREAK x${G.streak}: strike removed`, 'good');
    }
    return 'appealed';
  }

  ban(m, why) {
    const G = this.G;
    m.banReason = why || m.flag?.reason || 'vibes'; m.state = 'banned'; m.flag = null; m.dirty = true;
    G.strikes++; G.ship = Math.max(0, G.ship - 3); G.combo = 0; G.streak = 0;
    G.stats.bans++; G.stats.bannedReasons.push(m.banReason);
    G.sfx.stamp(); G.ui.toast(`${m.agent.name} BANNED`, 'bad'); G.ui.flash(); G.player.shake(0.55);
    if (G.strikes >= G.maxStrikes) G.end('banned');
  }
}
