// DOM overlay: title screen, HUD, end screen.
const $ = (id) => document.getElementById(id);
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export class UI {
  constructor(root) {
    root.innerHTML = `
    <div id="hud">
      <div id="focus"></div><div id="calm"></div><div id="danger"></div><div id="beerfx"></div><div id="flash"></div>
      <div id="strikes">CLAUDE STRIKES<span class="dots" id="dots"></span></div>
      <div id="shipWrap"><div id="shipLabel">SHIP 0%</div><div id="shipBar"><div id="shipFill"></div></div></div>
      <div id="clock"><span id="time">0:00</span><small id="agentsLeft"></small></div>
      <div id="announce"></div>
      <div id="arrowL" class="arrow">◀</div><div id="arrowR" class="arrow">▶</div>
      <div id="cross"></div><div id="combo"></div><div id="toasts"></div>
      <div id="meters">RAGE<div class="meter"><i id="rageFill"></i></div>PENGUIN <span id="pengTxt">[Q] ready</span><div class="meter"><i id="pengFill"></i></div></div>
      <div id="vices"><div><b>B</b> beer <span id="beerN">0</span></div><div><b>V</b> vape <span id="vapeN">0</span></div><div><b>E</b> grab / throw</div><div id="invoice">damage $0</div></div>
      <div id="hint"></div>
    </div>
    <div id="title">
      <h1>VIBE CODER<br>SIMULATOR<small>WHACK-A-BAN EDITION</small></h1>
      <div class="tag">2:07 AM. Eight AI agents. One over-cautious Claude that bans you for whatever reason. One emotional support penguin.</div>
      <button id="startBtn" class="click">▶ START VIBING</button>
      <div class="keys">
        <span><b>CLICK</b>appeal / punch</span><span><b>Q</b>squeeze penguin</span><span><b>E</b>grab / throw</span><span><b>B</b>beer</span>
        <span><b>V</b>vape (hold)</span><span><b>SPACE</b>lean back</span><span><b>WASD</b>stand up &amp; walk</span><span><b>MOUSE</b>look</span>
      </div>
      <div class="fine">A parody. Not affiliated with or endorsed by Anthropic.</div>
    </div>
    <div id="end" class="click"><div id="cardSlot"></div>
      <div id="endSide"><h2 id="endTitle"></h2><p id="endText"></p>
        <button id="saveBtn" class="btn">⬇ SAVE AS PNG</button><button id="againBtn" class="btn alt">↻ RUN IT BACK</button></div></div>`;
    this.hintT = 0; this.annT = 0; this.last = {};
  }

  set(id, key, val) { const k = id + key; if (this.last[k] === val) return; this.last[k] = val; const e = $(id); if (key === 'text') e.textContent = val; else e.style[key] = val; }

  showTitle(on) { $('title').style.display = on ? 'flex' : 'none'; }
  showHud(on) { $('hud').style.display = on ? 'block' : 'none'; }
  showEnd(canvas, title, text, color) {
    const slot = $('cardSlot'); slot.innerHTML = ''; slot.appendChild(canvas);
    $('endTitle').textContent = title; $('endTitle').style.color = color; $('endText').textContent = text;
    $('end').style.display = 'flex';
  }
  hideEnd() { $('end').style.display = 'none'; }

  frame(G, dt) {
    const pct = Math.floor(G.ship);
    this.set('shipLabel', 'text', `SHIP ${pct}%  —  ${G.appName}`);
    this.set('shipFill', 'width', G.ship.toFixed(1) + '%');
    let d = ''; for (let i = 0; i < G.maxStrikes; i++) d += `<span class="${i < G.strikes ? 'on' : 'off'}">●</span>`;
    if (this.last.dots !== d) { this.last.dots = d; $('dots').innerHTML = d; }
    this.set('time', 'text', fmt(G.time));
    this.set('agentsLeft', 'text', `${G.monitors.filter((m) => m.alive()).length}/${G.monitors.length} agents alive`);
    this.set('rageFill', 'width', (G.rage * 100).toFixed(0) + '%');
    const ready = G.penguinCd <= 0;
    this.set('pengFill', 'width', (ready ? 100 : (1 - G.penguinCd / 14) * 100).toFixed(0) + '%');
    this.set('pengTxt', 'text', G.calmT > 0 ? 'calm...' : ready ? '[Q] squeeze!' : 'recovering');
    this.set('beerN', 'text', String(G.stats.beers)); this.set('vapeN', 'text', String(G.stats.vapes));
    this.set('invoice', 'text', 'damage $' + G.stats.invoice.reduce((a, b) => a + b.price, 0).toLocaleString('en-US'));
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
    const t = document.createElement('div'); t.className = 'toast ' + cls; t.textContent = text;
    const box = $('toasts'); box.appendChild(t);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => t.remove(), 1300);
  }
  combo(n) {
    if (this.silent || n < 2) return;
    const c = $('combo'); c.textContent = `COMBO x${n}`;
    c.animate([{ opacity: 1, transform: 'translateX(-50%) scale(1.5)' }, { opacity: 1, transform: 'translateX(-50%) scale(1)', offset: 0.2 }, { opacity: 0, transform: 'translateX(-50%) scale(1)' }], { duration: 1100 });
  }
  flash() { if (this.silent) return; $('flash').animate([{ opacity: 0.45 }, { opacity: 0 }], { duration: 450 }); }
  hint(text, dur = 2.2) { if (this.silent) return; const h = $('hint'); h.textContent = text; h.style.opacity = 1; this.hintT = dur; }
  announce(text) { if (this.silent) return; const a = $('announce'); a.textContent = '🚨 ' + text; a.style.opacity = 1; this.annT = 3.2; }
}
