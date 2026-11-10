// End-of-run share card: a receipt you can save as PNG and post.
import { pick } from './voxel.js';
import { PENGUIN_VERDICTS } from './agents.js';
import { t, tr } from './i18n.js';

const W = 760, H = 1240, F = 'Menlo, Consolas, "Courier New", monospace';
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const usd = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function penguin(x, cx, cy, s, grumpy) {
  const e = (c, px, py, rx, ry) => { x.fillStyle = c; x.beginPath(); x.ellipse(cx + px * s, cy + py * s, rx * s, ry * s, 0, 0, 7); x.fill(); };
  e('#34406e', 0, 22, 44, 48); e('#fff4e6', 0, 28, 32, 36); e('#34406e', 0, -34, 36, 33);
  e('#fff4e6', -12, -32, 15, 17); e('#fff4e6', 12, -32, 15, 17);
  e('#34406e', -46, 18, 9, 26); e('#34406e', 46, 18, 9, 26);
  e('#ffa22e', -18, 68, 15, 6); e('#ffa22e', 18, 68, 15, 6); e('#ffa22e', 0, -22, 8, 5);
  e('#ff8fa8', -24, -20, 6, 3.5); e('#ff8fa8', 24, -20, 6, 3.5);
  e('#0b0b12', -13, -33, 5, 6); e('#0b0b12', 13, -33, 5, 6); e('#fff', -11, -35, 1.6, 1.6); e('#fff', 15, -35, 1.6, 1.6);
  x.fillStyle = '#e8323c'; x.fillRect(cx - 30 * s, cy - 8 * s, 60 * s, 12 * s); x.fillRect(cx + 10 * s, cy - 2 * s, 13 * s, 30 * s);
  if (grumpy) { x.strokeStyle = '#0b0b12'; x.lineWidth = 3 * s; x.beginPath(); x.moveTo(cx - 20 * s, cy - 46 * s); x.lineTo(cx - 7 * s, cy - 41 * s); x.moveTo(cx + 20 * s, cy - 46 * s); x.lineTo(cx + 7 * s, cy - 41 * s); x.stroke(); }
}

function wrapLines(x, text, maxW) {
  const out = []; let line = '';
  for (const w of text.split(' ')) { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
  out.push(line); return out;
}

export function funniestReason(stats) {
  const pool = stats.bannedReasons.length ? stats.bannedReasons : stats.lastReason ? [stats.lastReason] : [];
  if (!pool.length) return 'none. suspiciously clean run';
  return pool.slice().sort((a, b) => b.length - a.length)[0];
}

export function verdict(G) {
  const s = G.stats;
  if (s.offended > 0) return PENGUIN_VERDICTS.offended;
  if (s.squeezes === 0 && G.outcome !== 'shipped') return PENGUIN_VERDICTS.unsqueezed;
  return pick(PENGUIN_VERDICTS[G.outcome] || PENGUIN_VERDICTS.banned);
}

export function makeCard(G) {
  const s = G.stats, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#17122b'; x.fillRect(0, 0, W, H);
  // receipt paper with zig-zag edges
  const L = 40, R = W - 40, T = 30, B = H - 30;
  x.fillStyle = '#f7f1e3'; x.beginPath(); x.moveTo(L, T);
  for (let px = L; px < R; px += 20) { x.lineTo(px + 10, T + 10); x.lineTo(px + 20, T); }
  x.lineTo(R, B); for (let px = R; px > L; px -= 20) { x.lineTo(px - 10, B - 10); x.lineTo(px - 20, B); }
  x.closePath(); x.fill();
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(90,70,40,${Math.random() * 0.05})`; x.fillRect(L + Math.random() * (R - L), T + Math.random() * (B - T), 2, 2); }

  const ink = '#1c1a26'; let y = 78;
  x.textAlign = 'center'; x.fillStyle = ink;
  x.font = '900 46px "Arial Black", Impact, sans-serif'; x.fillText('VIBE CODER SIMULATOR', W / 2, y); y += 30;
  x.font = `16px ${F}`; x.fillText(t('~ whack-a-ban receipt · 2:07 AM ~'), W / 2, y); y += 22;
  const rule = (label) => {
    x.font = `bold 16px ${F}`; x.textAlign = 'center'; x.fillStyle = ink;
    const dash = '- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -';
    x.fillText(label ? `-------- ${t(label)} --------` : dash, W / 2, y + 8); y += 34;
  };
  rule();
  // outcome stamp
  const out = { shipped: ['SHIPPED', '#0e9a55'], banned: ['BANNED BY CLAUDE', '#e01834'], nohardware: ['NO MONITORS LEFT', '#e07a18'] }[G.outcome] || ['???', ink];
  out[0] = t(out[0]);
  x.save(); x.translate(W / 2, y + 44); x.rotate(-0.05);
  x.font = `900 ${out[0].length > 8 ? 52 : 86}px "Arial Black", Impact, sans-serif`; x.fillStyle = out[1]; x.strokeStyle = out[1];
  const tw = x.measureText(out[0]).width; x.lineWidth = 7; x.strokeRect(-tw / 2 - 22, -52, tw + 44, 104);
  x.textBaseline = 'middle'; x.fillText(out[0], 0, 4); x.textBaseline = 'alphabetic'; x.restore();
  y += 128;
  x.fillStyle = ink; x.font = `bold 19px ${F}`; x.fillText(t('app: ') + t(G.appName), W / 2, y); y += 26;
  rule();
  const row = (k, v, bold) => {
    k = t(k);
    x.font = `${bold ? 'bold ' : ''}20px ${F}`; x.fillStyle = ink;
    x.textAlign = 'left'; x.fillText(k, L + 44, y); x.textAlign = 'right'; x.fillText(String(v), R - 44, y);
    const kw = x.measureText(k).width, vw = x.measureText(String(v)).width;
    x.fillStyle = 'rgba(28,26,38,.35)'; for (let px = L + 54 + kw; px < R - 54 - vw; px += 9) x.fillRect(px, y - 3, 2, 2);
    y += 29;
  };
  row('time survived', fmt(G.time)); row('SHIP progress', Math.floor(G.ship) + '%');
  row('appeals won', s.appeals); row('best combo', 'x' + s.bestCombo);
  row('agents banned by Claude', `${s.bans} / ${G.monitors.length}`);
  row('beers', s.beers); row('vape clouds', s.vapes);
  row('monitors destroyed', s.monitorsDestroyed); row('penguin squeezes', s.squeezes);
  y += 8; rule('DAMAGE INVOICE (USD)');
  const total = s.invoice.reduce((a, b) => a + b.price, 0);
  if (!s.invoice.length) row('nothing. are you ok?', usd(0));
  s.invoice.slice(0, 5).forEach((it) => { const lb = t(it.label); row(lb.length > 34 ? lb.slice(0, 33) + '…' : lb, usd(it.price)); });
  if (s.invoice.length > 5) row(`+ ${s.invoice.length - 5} ${t('more regrets')}`, usd(s.invoice.slice(5).reduce((a, b) => a + b.price, 0)));
  row('TOTAL', usd(total), true);
  y += 8; rule('FUNNIEST BAN REASON');
  x.textAlign = 'center'; x.fillStyle = '#b3122b'; x.font = `italic bold 20px ${F}`;
  for (const ln of wrapLines(x, `"${tr(funniestReason(s))}"`, R - L - 90).slice(0, 3)) { x.fillText(ln, W / 2, y); y += 27; }
  y += 12; rule("THE PENGUIN'S VERDICT");
  const py = Math.min(y + 62, B - 190);
  penguin(x, L + 110, py, 1.0, s.offended > 0);
  x.textAlign = 'left'; x.fillStyle = ink; x.font = `bold 20px ${F}`;
  let vy = py - 26; for (const ln of wrapLines(x, tr(verdict(G)), R - L - 260).slice(0, 4)) { x.fillText(ln, L + 200, vy); vy += 28; }
  // barcode + footer
  let bx = L + 60; const by = B - 92;
  x.fillStyle = ink; while (bx < R - 60) { const bw = 1 + ((Math.random() * 4) | 0); x.fillRect(bx, by, bw, 40); bx += bw + 1 + ((Math.random() * 4) | 0); }
  x.textAlign = 'center'; x.font = `13px ${F}`;
  x.fillText(t('CLAUDE SAFETY DEPT. (parody, not affiliated with Anthropic) · appeals: lol · #VibeCoderSimulator'), W / 2, B - 30);
  return c;
}

export function savePNG(canvas) {
  canvas.toBlob((blob) => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'vibe-coder-receipt.png';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }, 'image/png');
}
