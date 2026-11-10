# Vibe Coder Simulator — spec

Project folder: this folder (VM-shared/temp/fable-game/vibe-coder). Built with Claude Code, Fable 5.2, effort high.
Reference images, if any, are in ./reference/ — judge the look against them.
[BRACKETS] below are defaults; use them as written.

Naming: don't use real AI brand names or logos. The game uses a parody AI called "PARABLE"
and its safety bot "the Hall Monitor".

---

Build **[VIBE CODER SIMULATOR]**: a 3D voxel game in the browser where you are a vibe coder at 2 AM
in a messy room full of monitors, keeping your AI agents alive while an over-cautious AI safety bot
tries to ban them. It should be the kind of game people screen-record and post.

You own this whole project. Work alone: there is nobody to answer questions. Between two approaches,
build the more fun and ambitious one, but keep the scope to ONE room that is polished, not many rooms half-done.
Less is more: no feature creep beyond this brief.

## HARD DEADLINE
- Stop no later than **[01:00 WITA (UTC+8), 11 November 2026]**.
- Run `date` at the start and before every task; write the minutes left at the top of notes.md.
- Never start a task that can't finish 30 minutes before the deadline. At T-30 min: feature freeze.
  At T-10 min: final build, commit, summary. At the deadline: stop any dev server and end.
- Behind schedule → cut scope (fewer agents, fewer props). Never move the deadline.

## How to work (Superpowers, single agent)
1. `superpowers:brainstorming` — this brief IS the approved design. Answer its questions yourself
   from this brief; write the spec; max 10 minutes.
2. `superpowers:writing-plans` — tasks of ~15 minutes, ordered so the game is playable early:
   room + desk + monitors → whack-a-ban loop → voxel smashing → props → juice → share card.
3. `superpowers:executing-plans` — execute it yourself in this one session (one agent owning
   the whole project works best for this model). No subagents unless a task is fully independent.
4. `superpowers:systematic-debugging` for every bug. `superpowers:verification-before-completion`
   before you say anything works: run it, screenshot it, look at it.
5. `git init`, commit after every working task, keep notes.md as a log (decisions, checks, time left).

## The game
**Setting:** a small voxel bedroom-office at night. An L-shaped desk with 6–9 voxel monitors of
different sizes (some portrait, one ultrawide) showing live, readable fake code, terminals and agent
chat logs. City lights through the window, rain on the glass, RGB strip glow, a mini fridge,
pizza box, cables everywhere, a gaming chair that spins.

**THE PLUSH PENGUIN (most important prop):** a soft, chubby plush penguin sitting on the desk —
the coder's emotional support penguin. Make it the cutest object in the game: rounder than the voxels
around it, slight wobble when the desk shakes. Click/hold to squeeze it: it squeaks, the room calms,
and every ban timer slows for a few seconds (cooldown). It is indestructible: smashing never hurts it;
debris bounces off it. If the player throws something at it, it just wobbles and looks offended.
[YOUR PERSONAL TOUCH, e.g. "the penguin wears a tiny scarf", "a photo of Ubud on the wall"]

**Core loop — "Whack-a-Ban" (the viral hook):**
- Each monitor runs one of your AI agents building your app (progress bar = "SHIP %").
- PARABLE's Hall Monitor randomly flags agents for silly reasons ("your variable name `kill_bug`
  sounds violent", "this regex looks like it's plotting something", "you said 'execute'").
  A flagged monitor flashes red with a warning and a countdown (3–6 s, faster over time).
- Click the monitor to APPEAL (whack-a-mole) before it hits zero. Combos for fast appeals.
- Miss it → that agent is BANNED: the screen goes dead with a big stamp, progress lost.
  Too many bans → the Hall Monitor bans YOU: game over.
- Win: reach 100% SHIP before you're banned → your ridiculous app launches with confetti.
- A run lasts 3–5 minutes. Difficulty ramps; late game has multiple flags at once and fake
  "appeal" decoy buttons.

**Rage mode — voxel destruction:** everything on the desk is made of voxels and can be smashed.
Grab a keyboard or the mouse and swing; punch monitors; throw the chair. Monitors crack, then burst
into voxel chunks with sparks and glass bits that bounce and settle (real physics, debris persists).
Smashing a monitor that is about to be banned "saves" nothing — it's pure catharsis — but rage
fills a RAGE meter that gives a short slow-motion "focus" when full. Destroyed hardware is added to a
"damage invoice".

**Vices (comedic, with gameplay effects):**
- Beer from the mini fridge: drink → +confidence (bigger appeal hitbox) but the camera sways and
  the code on screens gets typos. Cans pile up and can be crushed/thrown.
- Vape: hold to puff → a big fruity cloud fills the room and slowly drifts, hiding monitors
  (risk/reward: calm bonus vs. can't see flags). Cloud is volumetric-looking and lit by the RGB glow.

**End-of-run share card (built for posting):** a stylized receipt/screenshot: time survived, agents
banned, appeals won, beers, vape clouds, monitors destroyed, total "damage invoice" in USD, the
funniest ban reason of the run, and the penguin's verdict. One button to save it as PNG.

## Controls
First-person, seated at the desk with free mouse look, can stand up and walk the room.
Mouse click: appeal / interact / punch. E: grab/throw. Hold Q: squeeze penguin. B: beer. V: vape.
Space: lean back in chair. Works in Safari and Chrome, 60 fps on an Apple Silicon MacBook.

## Quality bar
It must look like a polished indie game trailer, not a tech demo. Match ./reference/ if present.
- Voxel style with soft, warm lighting: emissive monitors as the main light sources, colored RGB bounce,
  soft shadows, ambient occlusion, bloom, light haze, slight depth of field on the background.
- Screens are the star: crisp readable text (canvas textures), scanlines, flicker when flagged.
- Juice everywhere: screen shake, hit-stop on smashes, squash-and-stretch, particles, satisfying
  sounds made with Web Audio (keyboard clacks, rain, fridge hum, can opening, penguin squeak, glass shatter).
Banned outcomes: flat or gray lighting; plain untextured cubes with no art direction; unreadable
screens; stutter; a penguin that isn't adorable; real brand names or logos; a game that looks good but
the whack-a-ban loop isn't fun within 10 seconds.

## Tech
Three.js + Vite, plain JavaScript, real modules (room, monitors, agents, banSystem, destruction,
props, vices, audio, ui, shareCard). A physics library in the project (e.g. Rapier via npm) is fine.
Instanced voxels; debris pooled. Static build for GitHub Pages, no backend.

## Checking your work (do this after every task)
1. Run the game and take screenshots (use a headless browser if one is already available; don't
   install anything system-wide).
2. Compare against this brief and ./reference/. Write DELTA.md: the 5 biggest gaps (visual or fun),
   ranked. Fix the top 2. Re-shoot.
3. Playtest the loop with a scripted bot run: is it winnable, is it losable, does it ramp?
4. Score 1–10: looks, fun in the first 10 seconds, destruction feel, penguin cuteness, performance.
   For the lowest score, write "what raises this by 2 points" and do the cheapest fix.

## Definition of done (before the deadline)
Title screen → 3–5 minute run → win or ban → share card. Screens readable, smashing satisfying,
penguin adorable. notes.md lists: how to run it, what works, what is untested, and the next 3 ideas.
