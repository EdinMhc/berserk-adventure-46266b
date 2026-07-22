import Phaser from 'phaser';
import { SPRITE_FRAMES } from '../spriteManifest';

// ENGINE FILE — do not edit. Loads every sprite the user uploaded. Sprites live in
// assets/sprites/*.png (repo root) and are discovered at build time; each is registered under
// its filename without extension (player-run.png -> texture key "player-run"). Reference a
// sprite in your scene with that key, e.g. this.physics.add.sprite(x, y, 'player-run').
// Sprites with frame metadata (see spriteManifest.ts) are loaded as SPRITESHEETS instead —
// same key, but sliced into frames 0..frameCount-1 ready for this.anims animations.
export default class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    // Sprites live at the REPO ROOT (assets/sprites/), two levels up from src/scenes/.
    const sprites = import.meta.glob('../../assets/sprites/*.png', {
      eager: true, query: '?url', import: 'default',
    }) as Record<string, string>;
    for (const path in sprites) {
      const file = path.split('/').pop() || '';
      const key = file.replace(/\.png$/i, '');
      if (!key) continue;
      const frames = SPRITE_FRAMES[key];
      if (frames) {
        this.load.spritesheet(key, sprites[path], {
          frameWidth: frames.frameWidth,
          frameHeight: frames.frameHeight,
          endFrame: frames.frameCount - 1,
        });
      } else {
        this.load.image(key, sprites[path]);
      }
    }

    // A tiny 1x1 white texture is always available as a fallback ('__pixel') so scenes can
    // draw something even before any sprite is uploaded.
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1).fillRect(0, 0, 1, 1);
    g.generateTexture('__pixel', 1, 1);
    g.destroy();
  }

  create() { this.scene.start('MenuScene'); }
}