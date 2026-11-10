# QA report — Vibe Coder Simulator

Run: 10 Nov 2026, 23:53 WITA, in the Claude desktop app's browser pane (Chromium), viewport 1440×900, front tab.
How: open `http://127.0.0.1:8137/?qa`, click START (real click, so audio is allowed), run `await __game.qa()` in the console.
The harness (`src/qa.js`) drives the game with real DOM events (keydown / mousemove / mousedown) and measures results.
With `?qa` the speakers stay silent; audio is measured on the game's output bus and by offline rendering.

**Result: 74 passed, 0 failed, 0 skipped** (run 1, 23:53, pixel-ratio cap 1.5, table below).
**Re-run after the final changes (23:55, cap 1.25): 73 passed, 0 failed, 1 skipped** — the frame-rate check was skipped because the
browser pane had been hidden by then, so the frame rate at the final 1.25 cap is **not measured** (fewer pixels than the 78 fps run).

| | check | measured |
|---|---|---|
| PASS | audio: NO background sound when nothing happens (hum, drone and rain are gone) | peak 0 |
| PASS | audio: 19 effects each audible and ending (clack, alarm, ding, buzz, stamp, punch, crack, shatter, clink, thud, canOpen, crush, squeak, hmph, puff, whoosh, focus, win, lose) | peaks 0.033 – 1.127, longest 1.59 s (can opening + glugs) |
| PASS | audio: live context is running after a real START click | running |
| PASS | audio: live output is silent at rest and a ding raises it | rest 0.00000, ding 0.0464 |
| PASS | loop: first flag arrives within 10 s | at 2.6 s |
| PASS | ui: HUD visible and title hidden while playing | |
| PASS | loop: clicking a flagged monitor appeals it (real mouse event) | state ok, appeals 1 |
| PASS | loop: double-click right after an appeal does not punch your own monitor | hp 3 |
| PASS | loop: missed countdown bans the agent (strike, progress penalty) | banned, strikes 1 |
| PASS | loop: decoy button costs 1.5 s and does not appeal | timer 30 → 28.40 |
| PASS | loop: clicking outside the buttons on a decoy screen does nothing | |
| PASS | loop: the real APPEAL button works on a decoy screen | |
| PASS | loop: 5 strikes ends the run as BANNED | ended / banned |
| PASS | loop: 6-appeal streak reinstates a banned agent | strikes 1 → 0 |
| PASS | penguin: Q squeezes (squash + calm for 4 s) | scale.y 0.66 |
| PASS | penguin: ban timers slow to ~35 % while calm | normal 1.00 s/s, calm 0.35 s/s |
| PASS | penguin: squeeze has a cooldown | 12.7 s left |
| PASS | penguin: clicking it also squeaks (bubble shown) | |
| PASS | penguin: debris bounces off, penguin wobbles, never moves | 0 chunks inside, wobble 0.387 rad |
| PASS | penguin: thrown items bounce off, it gets offended (brows + "...rude.") | offended 1 |
| PASS | smash: first punch cracks the screen | 9 cracks, hp 2 |
| PASS | smash: punch shows the fist | |
| PASS | smash: third punch bursts the monitor into debris | 194 chunks |
| PASS | smash: hit-stop + screen shake + rage on burst | rage 0.59 |
| PASS | smash: damage invoice gets the monitor | 27" monitor (left), $449 |
| PASS | smash: debris settles and persists | 0 awake, 194 pieces in the room |
| PASS | smash: destroying a flagged monitor still counts as a ban | strikes 1 |
| PASS | smash: debris pool exhaustion recycles the oldest chunk (no error) | pool 1400 / 1400 |
| PASS | smash: desk props burst too (mouse → invoice $79) | |
| PASS | rage: full meter triggers slow-motion FOCUS (time ×0.4) | 1 s real = 0.40 s game |
| PASS | grab: E picks up the keyboard | |
| PASS | grab: swinging a held item does double damage | hp 3 → 1 |
| PASS | throw: E throws it; a thrown keyboard damages the monitor it hits | monitor hp 1, keyboard hp 1 |
| PASS | cans: first hit crushes a can | scale.y 0.38 |
| PASS | beer: B plays the drinking animation (can raised, tipped, camera tilts back) | tip 1.00, camera tilt 0.20 rad |
| PASS | beer: counts, makes you drunk, tosses an empty can onto the desk | cans 2 → 3 |
| PASS | beer: screens get typos | |
| PASS | beer: bigger appeal hitbox (near miss still appeals when drunk) | drunk 1.82 |
| PASS | beer: sober near miss does NOT appeal (control) | |
| PASS | beer: clicking the mini fridge also grabs one | |
| PASS | vape: holding V fills the room with a cloud and calms timers | 20 puffs, calm 0.87 |
| PASS | vape: the cloud drifts and fades out | |
| PASS | move: Space leans back (wider view) and releases | lean 0.99, fov 80° |
| PASS | move: WASD stands up and walks | |
| PASS | chair: clicking it spins it | spin −12.3 rad/s |
| PASS | move: Space near the chair sits back down | |
| PASS | chair: can be grabbed and thrown at a monitor | ultrawide hp 4 → 2 |
| PASS | end: reaching 100 % SHIP wins (monitors show SHIPPED, confetti) | |
| PASS | end: share card appears and exports as PNG | 760×1240, 169 KB |
| PASS | end: RUN IT BACK resets everything | |
| PASS | end: smashing every monitor ends the run cleanly | |
| PASS | balance: winnable in 3–5 min (perfect bot) | shipped at 178.6 s |
| PASS | balance: losable (AFK bot is banned) | banned at 43.2 s |
| PASS | balance: difficulty ramps (flags per minute rise) | 16 → 35 |
| PASS | perf: real frame rate ≥ 58 fps with AO, DoF and a vape cloud | 78 fps at 2160×1350 px (pixel ratio 1.5) |
| PASS | no uncaught errors during QA | 0 |

## Bugs this QA pass found and fixed
1. Thrown chair stopped at the keyboard instead of reaching the monitor → it now ploughs through desk clutter.
2. Debris counter was wrong after a restart (stale `used` flags) → reset clears them.
3. Adaptive quality could drop resolution while the tab was hidden/throttled → it now only judges visible gameplay frames.
4. Beer had no readable drinking animation → hand raises the can, tips it, camera tilts back, empty can is tossed.
5. Frame-rate headroom: AO at half resolution, shadow maps on alternating frames, pixel-ratio cap 1.5 → 1.25 (changed after this run).

## What this QA does not cover
- Safari. Real pointer-lock mouse look by a human hand. How the sounds *sound* (only that they play and stop).
- Full-screen frame rate on the built-in display (78 fps was measured at 2160×1350 px; full-screen is more pixels, hence the 1.25 cap).
