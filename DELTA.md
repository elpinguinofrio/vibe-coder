# DELTA — gaps vs spec.md (no ./reference/ folder exists, so judged against the brief)

## Round 1 — 23:30 WITA (after first playable)
1. Lighting blown out: desk lamp washed the keyboard and penguin white. → FIXED (lamp 26 → 5 cd, exposure 1.2 → 1.02, bloom threshold 0.9).
2. Rain layer hid the city (too dense). → FIXED (90 → 26 streaks, lower opacity).
3. Penguin too big, blocked the left monitor. → FIXED (scaled 0.82, moved between monitors).
4. Too hard: a bot answering 90 % of flags always lost. → FIXED (5 strikes, 6-appeal streak reinstates an agent, ban costs 3 %).
5. Hall Monitor had no body. → FIXED (ceiling bot that turns to stare at the flagged screen, eye goes red).

## Round 2 — 23:34 WITA
1. No real ambient-occlusion pass and no depth-of-field pass (spec asks for both). Only the lamp's soft shadows,
   fog haze and a low-res city backdrop stand in for them. → NOT FIXED (perf/time risk; listed in notes.md).
2. Punch fist is a crude block that filled the view at wide FOV. → FIXED (smaller, angled).
3. Glass shards were dull. → FIXED (bright shards that catch bloom).
4. Vape cloud is billboard sprites: reads as fog, not truly volumetric. → partly (RGB tint stronger).
5. Standing/walking is basic (simple desk clamp, no step sounds); chair throw only tested by script.

## Self-score (1–10) — 23:34 WITA
- looks 7 · fun in first 10 s 8 · destruction feel 7 · penguin cuteness 9 · performance 9 (120 fps in the app pane, 1024×768 @1.5x)
- Lowest: looks/destruction (7). "+2 points" = real AO + per-voxel monitor debris with glass refraction.
  Cheapest fix done: brighter glass + sparks + hit-stop + shake already in; AO left for next session.
