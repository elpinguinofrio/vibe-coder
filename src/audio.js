// Everything you hear is synthesised with Web Audio. No samples.
export class Sfx {
  constructor() { this.ctx = null; this.muted = false; }

  // ?mute = no audio at all (scripted tests). ?qa = audio runs and is measurable, but the speakers stay silent.
  init() {
    if (location.search.includes('mute')) return;
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.setup(new AC(), location.search.includes('qa') ? 0 : 0.55);
    } catch (e) { this.ctx = null; }
  }

  // build the effect bus on any context (the live one, or an OfflineAudioContext that QA renders effects into)
  setup(ctx, volume = 0.55) {
    this.ctx = ctx;
    this.bus = ctx.createGain(); // every effect goes through here
    this.master = ctx.createGain(); this.master.gain.value = volume;
    this.an = ctx.createAnalyser(); this.an.fftSize = 2048;
    this.bus.connect(this.master); this.bus.connect(this.an); this.master.connect(ctx.destination);
    const len = ctx.sampleRate * 2;
    this.nbuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.nbuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  // current output level (RMS) before the master volume — used by QA to prove effects are audible
  level() {
    if (!this.ctx) return 0;
    const b = new Float32Array(2048); this.an.getFloatTimeDomainData(b);
    let t = 0; for (const v of b) t += v * v;
    return Math.sqrt(t / b.length);
  }

  get ok() { return this.ctx && !this.muted; }

  noise(dur, { type = 'bandpass', freq = 1000, q = 1, gain = 0.3, attack = 0.002, to = null, delay = 0 } = {}) {
    if (!this.ok) return;
    const c = this.ctx, t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.nbuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.bus); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }

  tone(freq, dur, { type = 'sine', gain = 0.2, to = null, delay = 0, attack = 0.004 } = {}) {
    if (!this.ok) return;
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.bus); o.start(t); o.stop(t + dur + 0.05);
  }

  // No continuous background sound: the hum, the synth pad and the rain hiss were removed on the user's request.
  // Everything below is a one-shot effect tied to something that happens in the game.
  clack() { this.noise(0.025, { type: 'highpass', freq: 2200 + Math.random() * 1800, gain: 0.028 }); }
  alarm() { this.tone(880, 0.12, { type: 'square', gain: 0.09 }); this.tone(660, 0.14, { type: 'square', gain: 0.09, delay: 0.13 }); }
  ding(combo = 0) { const f = 620 * Math.pow(1.122, Math.min(combo, 12)); this.tone(f, 0.16, { type: 'triangle', gain: 0.22 }); this.tone(f * 1.5, 0.22, { type: 'sine', gain: 0.14, delay: 0.05 }); }
  buzz() { this.tone(120, 0.3, { type: 'sawtooth', gain: 0.16, to: 80 }); }
  stamp() { this.tone(90, 0.35, { type: 'sine', gain: 0.5, to: 38 }); this.noise(0.18, { type: 'lowpass', freq: 600, gain: 0.4 }); this.tone(196, 0.5, { type: 'sawtooth', gain: 0.12, to: 98, delay: 0.1 }); }
  punch() { this.tone(150, 0.12, { gain: 0.4, to: 55 }); this.noise(0.07, { type: 'lowpass', freq: 900, gain: 0.3 }); }
  crack() { this.noise(0.09, { type: 'highpass', freq: 3200, gain: 0.3 }); this.tone(1900, 0.05, { type: 'square', gain: 0.05 }); }
  shatter() {
    this.noise(0.5, { type: 'highpass', freq: 2600, gain: 0.5 }); this.tone(70, 0.3, { gain: 0.5, to: 35 });
    for (let i = 0; i < 9; i++) this.tone(1600 + Math.random() * 3800, 0.09 + Math.random() * 0.12, { type: 'triangle', gain: 0.07, delay: 0.03 + Math.random() * 0.45 });
  }
  clink() { this.tone(1400 + Math.random() * 1600, 0.06, { type: 'triangle', gain: 0.04 }); }
  thud() { this.tone(110, 0.1, { gain: 0.22, to: 60 }); }
  canOpen() { this.tone(2400, 0.03, { type: 'square', gain: 0.1 }); this.noise(0.28, { type: 'highpass', freq: 5200, gain: 0.25, delay: 0.03 }); for (let i = 0; i < 4; i++) this.tone(190 - i * 18, 0.11, { gain: 0.22, delay: 0.5 + i * 0.2, to: 120 }); this.noise(0.25, { type: 'bandpass', freq: 900, q: 0.7, gain: 0.12, delay: 1.45 }); }
  crush() { this.noise(0.14, { type: 'bandpass', freq: 2800, q: 2, gain: 0.3 }); }
  squeak() { this.tone(950, 0.11, { gain: 0.24, to: 1750 }); this.tone(1750, 0.2, { gain: 0.2, to: 780, delay: 0.11 }); }
  hmph() { this.tone(300, 0.1, { type: 'triangle', gain: 0.2, to: 220 }); this.tone(240, 0.16, { type: 'triangle', gain: 0.2, to: 170, delay: 0.13 }); }
  puff() { this.noise(0.5, { type: 'bandpass', freq: 700, q: 0.6, gain: 0.07, to: 1500, attack: 0.1 }); }
  whoosh() { this.noise(0.28, { type: 'bandpass', freq: 500, q: 0.8, gain: 0.22, to: 2200, attack: 0.05 }); }
  focus() { this.tone(220, 0.9, { type: 'sine', gain: 0.2, to: 55 }); }
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.4, { type: 'triangle', gain: 0.2, delay: i * 0.11 })); this.noise(0.8, { type: 'highpass', freq: 4000, gain: 0.12, delay: 0.5 }); }
  lose() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.5, { type: 'sawtooth', gain: 0.14, delay: i * 0.22 })); }
}
