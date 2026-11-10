# Vibe Coder Simulator — notes

**Minutes left to the hard deadline (01:00 WITA, 11 Nov 2026): 77** (written 23:42 WITA, 10 Nov 2026 — finished early, feature freeze not needed)

## How to run
```bash
python3 serve.py
```
Then open http://127.0.0.1:8137/ in Chrome or Safari. (`python3 -m http.server` also works; `serve.py` just turns caching off.)
Add `?mute` to the URL for a silent game. It is a static site: push the folder to GitHub Pages as-is, no build step.

Controls: mouse look · click = appeal / punch / interact · Q squeeze penguin · E grab / throw · B beer · V (hold) vape ·
Space lean back (or sit back down) · WASD stand up and walk · arrow keys also look around.

## What works (each checked in the in-app browser, by script and screenshot — see docs/screens/)
- Title screen → run → win ("SHIPPED" + confetti) or loss ("BANNED" / "NO MONITORS LEFT") → share card → Run it back.
- One voxel room: L-desk, 8 monitors (ultrawide, 2 portrait, 5 landscape) with live readable code / terminal / chat,
  panoramic window with city lights and rain, RGB strips, lamp, PC tower, shelves, cables, mini fridge, pizza box, spinning gaming chair,
  the Hall Monitor bot on the ceiling that turns to stare at whoever it flagged.
- Whack-a-Ban: flags from 2.5 s, countdown 6.5 → 3.3 s, 1 → 4 flags at once, decoy buttons after 70 s (APPLE / ACCEPT / APPEAR…),
  combos, 5 strikes = game over, 6 appeals in a row reinstates a banned agent.
- Destruction: 3–4 punches crack then burst a monitor into pooled voxel chunks + glass + sparks, hit-stop, screen shake,
  debris persists; keyboard, mouse, mug, pizza, cans, chair can be grabbed (E), swung (click), thrown (E) and smashed. Damage invoice.
- Rage meter → 4 s slow-motion FOCUS. Penguin squeeze → ban timers ×0.35 for 4 s (14 s cooldown).
- Penguin: round plush with scarf, blinks, breathes, wobbles, squashes, speech bubble; indestructible, debris bounces off, gets offended if you throw things at it.
- Beer (B or click the fridge): bigger appeal hitbox, camera sway, typos on screens, cans pile up, cans can be crushed.
- Vape (hold V): drifting RGB-tinted cloud that hides screens and slows timers up to 25 %.
- Share card PNG: time, SHIP %, appeals, combo, bans, beers, vape clouds, monitors destroyed, invoice in USD, funniest ban reason, penguin's verdict.
- Sound (Web Audio, all synthesised): rain, key clacks, alarm, appeal ding, ban stamp, punch, glass shatter, can open, penguin squeak, vape, win/lose.

### Bot playtest (`window.__game.simulate(seconds, skill)`, 10 runs per skill, 23:37 WITA)
| bot answers | wins | avg win time | avg loss time | flags in first 60 s | flags 120–180 s |
|---|---|---|---|---|---|
| 100 % | 10/10 | 3:04 | — | 16 | 33 |
| 95 % | 9/10 | 3:34 | 1:02 | 15 | 29 |
| 90 % | 3/10 | 3:48 | 2:59 | 15 | 25 |
| 80 % | 0/10 | — | 1:51 | 14 | 6 |
| 0 % (AFK) | 0/10 | — | 0:41 | 5 | 0 |
Winnable, losable, and it ramps (flag rate doubles). A 200 s scripted run with the full render pipeline, random beers, vapes,
grabs and throws finished with no console errors. Frame cost measured 4.3 ms with AO + DoF on (1.4 ms without) at 676×885 @1.5x in the app pane.

## Untested / not done
- **Safari: untested** (I may not open browsers on this machine). Only the Chromium-based in-app pane was used.
- **Sound was never heard by me** — only checked that it runs without errors. The fridge hum and synth drone were removed at 23:34
  because the user found the drone annoying; only soft rain + event sounds remain.
- **Real pointer-lock play by hand: untested by me.** Clicks were tested through the cursor fallback and by script.
- **Save-as-PNG button: not clicked** (downloads need explicit permission); the card canvas itself renders correctly.
- AO (GTAO) and depth of field (bokeh) were added at 23:39 and checked by screenshot only; adaptive quality sheds them if fps < 50, but that fallback path was **not exercised**.
- **No Vite, no Rapier:** Node is not installed here, so this is plain ES modules + vendored three.js r170 and a small hand-written physics (see Rulings).
- **60 fps full-screen is not confirmed.** Measured 10.4 ms per frame (CPU-side timing) at 1440×900 @1.5x with AO, DoF and a vape cloud; a full-screen 16" Retina window is ~1.5× more pixels. Adaptive quality is the safety net.
- No ./reference/ folder existed, so looks were judged against the brief only.

## Rulings I made (decisions taken without asking)
1. No Vite/npm (Node missing; installing needs the user's explicit OK). Cost if wrong: add package.json + vite later, ~10 min.
2. Own physics instead of Rapier. Cost if wrong: debris does not stack realistically.
3. notes.md is the execution ledger; worked on main of a fresh repo in this folder (no worktree). Cost: none for a new repo.
4. 8 monitors, 5 strikes, streak-of-6 reinstatement, ban costs 3 % — tuned from the bot table above.
5. Smashing a flagged monitor still counts as a ban ("destroying evidence"). Clicking an unflagged monitor punches it.
6. Personal touch: red scarf on the penguin, framed UBUD rice-terrace photo on the right wall.
7. Removed hum + drone on the user's mid-run request; added `?mute` and auto-silence when the tab is hidden.

## Log
- 23:09 start, read spec · 23:14 design doc + plan · 23:28 first render, no errors · 23:30 playable core committed
- 23:33 Hall Monitor bot, balance, DELTA rounds 1–2 · 23:34 user: "annoying sound" → drone removed
- 23:36 juice pass (monitor pop/jitter, drinking can, fist), monitor-glow shadows, finer debris, danger vignette
- 23:39 AO + depth of field + adaptive quality; 23:40 landscape 1440×900 check, keyboard events (B/Q/V/Space) verified by synthetic key events; bot run with random chaos reached SHIPPED at 3:05 with no errors
- 23:41 decoy hint, narrow-window HUD · 23:42 final check: real Start click → bot run → SHIPPED at 3:02 → share card shown, 0 console messages
- Final review: self-review (no subagents, per spec.md "single agent"); weaker than a fresh reviewer.

## Next 3 ideas
1. A 10-second auto "trailer" camera on the title screen + one-key GIF/WebM capture of the last 8 seconds (the smash that got you banned).
2. Daily seed + leaderboard-less "share code" on the receipt so friends can replay the exact same flags.
3. Hall Monitor boss phase at 90 % SHIP: it flags the penguin, and you must defend it.
