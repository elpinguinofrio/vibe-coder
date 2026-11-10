# Vibe Coder Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline, single agent — fixed by spec.md).

**Goal:** Title → 3–5 min Whack-a-Ban run in a voxel room → win or ban → share card PNG.
**Architecture:** Static ES modules, three.js r170 vendored + import map, no build. `main.js` owns the
game state and a pure `update(dt)` so a bot can run the loop headless. DOM overlay for HUD.
**Tech Stack:** three.js r170, Web Audio, Canvas 2D, python3 http.server for dev.
**Spec:** `spec.md`, `docs/superpowers/specs/2026-11-10-vibe-coder-simulator-design.md`

## Global Constraints
- Stop by 01:00 WITA 11 Nov 2026; freeze 00:30; final commit by 00:50. `date` before every task.
- No real AI brand names/logos: parody AI is "PARABLE", its bot "the Hall Monitor".
- No system-wide installs. One room only. Commit after every working task.
- Safari + Chrome, 60 fps on Apple Silicon. Instanced voxels, pooled debris.

## Review Focus
1. Pointer lock refused/unavailable → game still playable with cursor-ray fallback.
2. Audio context blocked until gesture → no crash, sound starts on first click.
3. All monitors smashed by the player → run ends cleanly (not a stuck game).
4. Debris pool exhausted → oldest chunk recycled, no exception.
5. Restart after an end screen → all state reset (no leftover flags, clouds, debris timers).

## Tasks (each ends: run in browser pane, screenshot, commit)
- [ ] **T1 Room + monitors (23:20–23:40).** `index.html`, `src/voxel.js` (`VoxelBatch.box()/build()`),
  `src/room.js` (`buildRoom(scene) → {colliders, update(t, alert)}`), `src/agents.js` (names, code/term/chat
  lines, ban reasons), `src/monitors.js` (`Monitor` with canvas screen, `draw(game)`), `src/player.js`,
  `src/main.js`. Check: screenshot shows lit room, 8 readable screens.
- [ ] **T2 Whack-a-Ban loop + UI (23:40–23:58).** `src/banSystem.js` (`BanSystem.update(dt)`,
  `appeal(mon,uv)`, `ban(mon)`), `src/ui.js` (title, HUD, end screen), `src/audio.js`.
  Test: `__game.simulate(400, 1.0)` → `won`; `simulate(400, 0.0)` → `banned` before 120 s;
  flag interval at t=180 shorter than at t=10.
- [ ] **T3 Destruction (23:58–00:12).** `src/destruction.js` (`Destruction.burst(boxes, matrix, dir)`,
  bodies, sparks, pool of 1400 with oldest-recycle). Punch monitors, cracks, hit-stop, shake, rage → focus.
  Test: burst 30 objects in a loop → no exception, pool count constant.
- [ ] **T4 Props + penguin + vices (00:12–00:28).** `src/props.js` (`Penguin`, fridge, keyboard, mouse,
  mug, pizza, chair, grab/throw), `src/vices.js` (beer, vape). Check: screenshot of penguin close-up.
- [ ] **T5 Share card + restart (00:28–00:38).** `src/shareCard.js` (`makeCard(stats) → canvas`,
  `savePNG(canvas)`). Test: restart after end → `strikes===0`, no flagged monitors.
- [ ] **T6 Freeze: DELTA.md, self-score, top-2 fixes, notes.md, final commit (00:38–00:50).**
