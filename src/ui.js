// DOM overlay: title screen, HUD, end screen. Static text carries data-i18n (its English text = the dictionary key).
import { t, tr, getLang, setLang, onLang, LANGS } from './i18n.js';
const $ = (id) => document.getElementById(id);
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export class UI {
  constructor(root) {
    root.innerHTML = `
    <div id="hud">
      <div id="focus"></div><div id="calm"></div><div id="danger"></div><div id="beerfx"></div><div id="flash"></div>
      <div id="strikes"><span data-i18n="CLAUDE STRIKES"></span><span class="dots" id="dots"></span></div>
      <div id="shipWrap"><div id="shipLabel">SHIP 0%</div><div id="shipBar"><div id="shipFill"></div></div></div>
      <div id="clock"><span id="time">0:00</span><small id="agentsLeft"></small></div>
      <div id="announce"></div>
      <div id="arrowL" class="arrow">◀</div><div id="arrowR" class="arrow">▶</div>
      <div id="cross"></div><div id="combo"></div><div id="toasts"></div>
      <div id="meters"><span data-i18n="RAGE"></span><div class="meter"><i id="rageFill"></i></div><span data-i18n="PENGUIN"></span> <span id="pengTxt"></span><div class="meter"><i id="pengFill"></i></div></div>
      <div id="vices"><div><b>B</b> <span data-i18n="beer"></span> <span id="beerN">0</span></div><div><b>V</b> <span data-i18n="vape"></span> <span id="vapeN">0</span></div><div><b>E</b> <span data-i18n="grab / throw"></span></div><div id="invoice">damage $0</div></div>
      <div id="hint"></div>
    </div>
    <div id="title">
      <h1>VIBE CODER<br>SIMULATOR<small data-i18n="WHACK-A-BAN EDITION"></small></h1>
      <div class="tag" data-i18n="2:07 AM. Eight AI agents. One over-cautious Claude that bans you for whatever reason. One emotional support penguin."></div>
      <button id="startBtn" class="click" data-i18n="▶ START VIBING"></button>
      <div class="langs click" id="langs"></div>
      <div class="keys">
        <span><b data-i18n="CLICK"></b><i data-i18n="appeal / punch"></i></span><span><b>Q</b><i data-i18n="squeeze penguin"></i></span><span><b>E</b><i data-i18n="grab / throw"></i></span><span><b>B</b><i data-i18n="beer"></i></span>
        <span><b>V</b><i data-i18n="vape (hold)"></i></span><span><b data-i18n="SPACE"></b><i data-i18n="lean back"></i></span><span><b>WASD</b><i data-i18n="stand up &amp; walk"></i></span><span><b data-i18n="MOUSE"></b><i data-i18n="look"></i></span>
      </div>
      <div class="fine" data-i18n="A parody. Not affiliated with or endorsed by Anthropic."></div>
    </div>
    <div id="end" class="click"><div id="cardSlot"></div>
      <div id="endSide"><h2 id="endTitle"></h2><p id="endText"></p>
        <button id="saveBtn" class="btn" data-i18n="⬇ SAVE AS PNG"></button><button id="againBtn" class="btn alt" data-i18n="↻ RUN IT BACK"></button></div></div>`;
    this.hintT = 0; this.annT = 0; this.last = {}; this.root = root;
    // language chooser on the title screen; the choice is remembered
    $('langs').innerHTML = Object.entries(LANGS).map(([k, v]) => `<button data-lang="${k}">${v}</button>`).join('');
    $('langs').addEventListener('click', (e) => { const l = e.target && e.target.dataset && e.target.dataset.lang; if (l) setLang(l); });
    onLang(() => this.applyLang());
    this.applyLang();
  }

  applyLang() {
    this.root.querySelectorAll('[data-i18n]').forEach((e) => { e.textContent = t(e.dataset.i18n); });
    this.root.querySelectorAll('[data-lang]').forEach((e) => { e.classList.toggle('on', e.dataset.lang === getLang()); });
    this.last = {}; // forget cached HUD text so it is redrawn in the new language
  }

  set(id, key, val) { const k = id + key; if (this.last[k] === val) return; this.last[k] = val; const e = $(id); if (key === 'text') e.textContent = val; else e.style[key] = val; }

  showTitle(on) { $('title').style.display = on ? 'flex' : 'none'; }
  showHud(on) { $('hud').style.display = on ? 'block' : 'none'; }
  showEnd(canvas, title, text, color) {
    const slot = $('cardSlot'); slot.innerHTML = ''; slot.appendChild(canvas);
    $('endTitle').textContent = tr(title); $('endTitle').style.color = color; $('endText').textContent = tr(text);
    $('end').style.display = 'flex';
  }
  hideEnd() { $('end').style.display = 'none'; }

  frame(G, dt) {
    const pct = Math.floor(G.ship);
    this.set('shipLabel', 'text', `${t('SHIP')} ${pct}%  —  ${t(G.appName)}`);
    this.set('shipFill', 'width', G.ship.toFixed(1) + '%');
    let d = ''; for (let i = 0; i < G.maxStrikes; i++) d += `<span class="${i < G.strikes ? 'on' : 'off'}">●</span>`;
    if (this.last.dots !== d) { this.last.dots = d; $('dots').innerHTML = d; }
    this.set('time', 'text', fmt(G.time));
    this.set('agentsLeft', 'text', `${G.monitors.filter((m) => m.alive()).length}/${G.monitors.length} ${t('agents alive')}`);
    this.set('rageFill', 'width', (G.rage * 100).toFixed(0) + '%');
    const ready = G.penguinCd <= 0;
    this.set('pengFill', 'width', (ready ? 100 : (1 - G.penguinCd / 14) * 100).toFixed(0) + '%');
    this.set('pengTxt', 'text', t(G.calmT > 0 ? 'calm...' : ready ? '[Q] squeeze!' : 'recovering'));
    this.set('beerN', 'text', String(G.stats.beers)); this.set('vapeN', 'text', String(G.stats.vapes));
    this.set('invoice', 'text', t('damage') + ' $' + G.stats.invoice.reduce((a, b) => a + b.price, 0).toLocaleString('en-US'));
    let urg = 0; for (const m of G.monitors) if (m.state === 'flagged') urg = Math.max(urg, 1 - m.flag.t / m.flag.max);
    this.set('danger', 'opacity', (urg * urg * (0.7 + 0.3 * Math.sin(G.real * 14))).toFixed(2));
    this.set('beerfx', 'opacity', ((G.vices ? G.vices.drinkK : 0) * 0.9).toFixed(2));
    this.set('focus', 'opacity', G.focusT > 0 ? '1' : '0');
    this.set('calm', 'opacity', G.calmT > 0 ? '1' : String(G.vapeCalm * 0.5));
    if (this.hintT > 0) { this.hintT -= dt; if (this.hintT <= 0) $('hint').style.opacity = 0; }
    if (this.annT > 0) { this.annT -= dt; if (this.annT <= 0) $('announce').style.opacity = 0; }
  }

  arrows(l, r) { this.set('arrowL', 'opacity', l ? '1' : '0'); this.set('arrowR', 'opacity', r ? '1' : '0'); }
  hot(on) { const c = $('cross'); if (c.classList.contains('hot') !== on) c.classList.toggle('hot', on); }
  cursorMode(locked) { this.set('cross', 'display', locked ? 'block' : 'none'); }

  toast(text, cls = 'info') {
    if (this.silent) return;
    const el = document.createElement('div'); el.className = 'toast ' + cls; el.textContent = tr(text);
    const box = $('toasts'); box.appendChild(el);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => el.remove(), 1300);
  }
  combo(n) {
    if (this.silent || n < 2) return;
    const c = $('combo'); c.textContent = `${t('COMBO')} x${n}`;
    c.animate([{ opacity: 1, transform: 'translateX(-50%) scale(1.5)' }, { opacity: 1, transform: 'translateX(-50%) scale(1)', offset: 0.2 }, { opacity: 0, transform: 'translateX(-50%) scale(1)' }], { duration: 1100 });
  }
  flash() { if (this.silent) return; $('flash').animate([{ opacity: 0.45 }, { opacity: 0 }], { duration: 450 }); }
  hint(text, dur = 2.2) { if (this.silent) return; const h = $('hint'); h.textContent = tr(text); h.style.opacity = 1; this.hintT = dur; }
  announce(text) { if (this.silent) return; const a = $('announce'); a.textContent = '🚨 ' + tr(text); a.style.opacity = 1; this.annT = 3.2; }
}
