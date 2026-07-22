import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

// ── Berserk Adventure — Dark Fantasy Title Screen ─────────────────────────
export default class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;

    // ── Deep background ────────────────────────────────────────────────
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x020204, 0x020204, 0x0a0510, 0x0a0510, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // ── Grid of dark stone tiles for ambience ──────────────────────────
    const g = this.add.graphics();
    g.lineStyle(1, 0x1a1020, 0.6);
    for (let x = 0; x < GAME_WIDTH; x += 64) g.lineBetween(x, 0, x, GAME_HEIGHT);
    for (let y = 0; y < GAME_HEIGHT; y += 64) g.lineBetween(0, y, GAME_WIDTH, y);

    // ── Scattered blood splatter ───────────────────────────────────────
    const splat = this.add.graphics();
    for (let i = 0; i < 18; i++) {
      splat.fillStyle(0x550000, Phaser.Math.FloatBetween(0.04, 0.15));
      splat.fillCircle(
        Phaser.Math.Between(0, GAME_WIDTH),
        Phaser.Math.Between(0, GAME_HEIGHT),
        Phaser.Math.Between(8, 60),
      );
    }

    // ── Brand sigil — geometric occult symbol ──────────────────────────
    const sigil = this.add.graphics();
    sigil.lineStyle(2, 0x8800aa, 0.5);
    sigil.strokeCircle(cx, cy - 50, 140);
    sigil.strokeCircle(cx, cy - 50, 100);
    // radial lines
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      sigil.lineBetween(
        cx + Math.cos(a) * 100, cy - 50 + Math.sin(a) * 100,
        cx + Math.cos(a) * 140, cy - 50 + Math.sin(a) * 140,
      );
    }
    // pentagram-style cross
    sigil.lineStyle(2, 0xcc2200, 0.6);
    sigil.lineBetween(cx - 80, cy - 50, cx + 80, cy - 50);
    sigil.lineBetween(cx, cy - 130, cx, cy + 30);

    // ── Sigil pulsing tween ───────────────────────────────────────────
    this.tweens.add({
      targets: sigil, alpha: { from: 0.4, to: 0.9 },
      duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // ── Title ─────────────────────────────────────────────────────────
    this.add.text(cx, cy - 50, 'BERSERK', {
      fontFamily: 'monospace', fontSize: '96px', color: '#cc1100',
      stroke: '#000000', strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(cx, cy + 55, 'A D V E N T U R E', {
      fontFamily: 'monospace', fontSize: '34px', color: '#885533',
      stroke: '#000000', strokeThickness: 5,
      letterSpacing: 12,
    }).setOrigin(0.5);

    // ── Tagline ───────────────────────────────────────────────────────
    this.add.text(cx, cy + 108, '"Survive the Brand. Slay the Apostles. Face Malakor."', {
      fontFamily: 'monospace', fontSize: '16px', color: '#553322',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    // ── Controls summary ──────────────────────────────────────────────
    const ctrlText = [
      'WASD / Arrow Keys — Move',
      'Q — Iron Sweep    F — Dodge Roll    E — Hand Cannon Bolt',
      'R — BERSERK ULTIMATE    X / J — Melee Attack',
      'Space / Enter — Interact with NPCs',
    ].join('\n');
    this.add.text(cx, cy + 190, ctrlText, {
      fontFamily: 'monospace', fontSize: '14px', color: '#6a5040',
      stroke: '#000', strokeThickness: 2, align: 'center',
    }).setOrigin(0.5);

    // ── Blinking prompt ────────────────────────────────────────────────
    const prompt = this.add.text(cx, cy + 290, '— Press any key or tap to begin —', {
      fontFamily: 'monospace', fontSize: '18px', color: '#884422',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);
    this.tweens.add({
      targets: prompt, alpha: { from: 0.3, to: 1 },
      duration: 900, yoyo: true, repeat: -1,
    });

    // ── Floating embers ────────────────────────────────────────────────
    for (let i = 0; i < 24; i++) {
      const ember = this.add.circle(
        Phaser.Math.Between(0, GAME_WIDTH),
        Phaser.Math.Between(0, GAME_HEIGHT),
        Phaser.Math.Between(1, 3),
        Phaser.Math.RND.pick([0xcc3300, 0xff6600, 0xaa2200, 0xffaa00]),
        Phaser.Math.FloatBetween(0.3, 0.8),
      );
      this.tweens.add({
        targets: ember,
        y: `-=${Phaser.Math.Between(80, 260)}`,
        x: `+=${Phaser.Math.Between(-40, 40)}`,
        alpha: 0,
        duration: Phaser.Math.Between(2500, 5000),
        delay: Phaser.Math.Between(0, 3000),
        repeat: -1,
        onRepeat: () => {
          ember.setPosition(Phaser.Math.Between(0, GAME_WIDTH), GAME_HEIGHT + 10);
          ember.setAlpha(Phaser.Math.FloatBetween(0.3, 0.8));
        },
      });
    }

    // ── Start game ────────────────────────────────────────────────────
    this.input.keyboard?.once('keydown', () => this.scene.start('GameScene'));
    this.input.once('pointerdown', () => this.scene.start('GameScene'));
  }
}
