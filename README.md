# Berserk Adventure

A browser game built with **Edo's Framework Game Engine** — Phaser 3 + Vite + TypeScript.

- `npm install && npm run dev` to run locally.
- Game logic lives in `src/scenes/GameScene.ts`. The engine (main.ts, BootScene, config)
  is generated and shouldn't be edited by hand.
- Sprites go in `assets/sprites/` and load by filename (e.g. `player-run.png` -> `player-run`).
  Spritesheets are sliced per `src/spriteManifest.ts` (generated from the sprite manager's
  frame metadata on deploy) and animate via Phaser's `this.anims` API.
- Pushing to `main` builds and deploys to GitHub Pages via the included workflow.
RPG systems (dialogue trees, NPCs, inventory, combat, save state) live in `src/rpg/` —
the game scene wires them together; saves persist to localStorage per game.