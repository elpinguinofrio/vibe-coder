# Vibe Coder Simulator — design (from spec.md, the approved brief)

Intent: a screen-recordable 3D voxel browser game. One polished room, one tight loop (Whack-a-Ban),
cathartic smashing, an adorable indestructible plush penguin, a shareable receipt card.
Deadline 01:00 WITA 11 Nov 2026; freeze 00:30.

## Builder's calls (not the user's — check these)
- **No Vite / no npm.** Node is not installed here and installing needs explicit user permission.
  Static ES modules + import map, three.js r170 vendored in `vendor/` (from the npm registry tarball).
  Serve with `python3 -m http.server`. Still a static site that works on GitHub Pages.
- **Own lightweight physics** instead of Rapier (pooled debris + sphere bodies vs AABB colliders):
  cheaper to ship in the time box, deterministic, no wasm.
- 8 monitors (1 ultrawide, 2 portrait, 5 landscape). Game over at 4 bans. Run target ~3–5 min.
- Global SHIP % grows with the number of living agents; a ban costs 5 % and that agent's output.
- Smashing a *flagged* monitor still counts as a ban ("destroying evidence").
- Clicking an unflagged monitor punches it (3 hits to burst) — spam-clicking is punished.
- Personal touch: penguin wears a tiny red scarf; framed photo of Ubud rice terraces on the wall.
- Cut if late (in this order): depth of field, real AO pass, walking polish, chair throwing.

## Modules (src/)
voxel (instanced voxel batches) · room · monitors · agents (text content) · banSystem · destruction
(debris pool, sparks, bodies) · props (penguin, fridge, desk items, chair) · vices (beer, vape) ·
audio (Web Audio synth) · ui (DOM HUD/title/end) · shareCard (canvas receipt → PNG) · player · main.

## Loop
Flags start at 2.5 s. Interval 3.6 s → 1.15 s, countdown 6 s → 3 s, simultaneous 1 → 4, decoy buttons
after 70 s (wrong button costs 1.5 s). Combo = appeals within 2.5 s. Penguin squeeze: timers ×0.35 for
4 s, 14 s cooldown. Rage meter full → 4 s slow-motion focus. Beer: bigger appeal hitbox, sway, typos.
Vape: cloud hides screens, timers up to 25 % slower.

## Testing
`window.__game.simulate(seconds, skill)` runs the loop headless with a bot (winnable / losable / ramp).
Screenshots via the in-app browser pane. DELTA.md after each milestone.

## Anti-goals
Flat gray lighting, unreadable screens, real AI brand names, a non-adorable penguin, a loop that isn't
fun within 10 seconds.
