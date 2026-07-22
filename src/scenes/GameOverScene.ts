import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { clearSave } from '../rpg/save';

// ── Berserk Adventure — Death Screen ──────────────────────────────────────
export default class GameOverScene extends Phaser.Scene {
  private finalScore = 0;
  constructor() { super('GameOverScene'); }

  init(data: { score?: number }) {
    this.finalScore = data?.score ?? 0;
    clearSave();
  }

  create() {
    const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;

    // ── Dark bloody background ─────────────────────────────────────────
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x080003, 0x080003, 0x040008, 0x040008, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // ── Blood pools ────────────────────────────────────────────────────
    for (let i = 0; i < 24; i++) {
      bg.fillStyle(0x330000, Phaser.Math.FloatBetween(0.05, 0.2));
      bg.fillCircle(
        Phaser.Math.Between(0, GAME_WIDTH),
        Phaser.Math.Between(0, GAME_HEIGHT),
        Phaser.Math.Between(20, 120),
      );
    }

    // ── Brand sigil (broken) ──────────────────────────────────────────
    const sigil = this.add.graphics();
    sigil.lineStyle(3, 0x440000, 0.7);
    sigil.strokeCircle(cx, cy - 80, 80);
    sigil.lineStyle(2, 0x220000, 0.5);
    sigil.lineBetween(cx - 50, cy - 80, cx + 50, cy - 80);
    sigil.lineBetween(cx, cy - 130, cx, cy - 30);
    // cracked lines
    sigil.lineStyle(1, 0x660000, 0.4);
    sigil.lineBetween(cx - 80, cy - 100, cx + 40, cy - 50);
    sigil.lineBetween(cx - 20, cy - 150, cx + 60, cy - 10);

    // ── Main text ─────────────────────────────────────────────────────
    this.add.text(cx, cy - 60, 'YOU FELL', {
      fontFamily: 'monospace', fontSize: '78px', color: '#880000',
      stroke: '#000000', strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(cx, cy + 20, '"The Brand devours your soul.\nMalakor\'s laugh echoes across the void."', {
      fontFamily: 'monospace', fontSize: '18px', color: '#553333',
      stroke: '#000', strokeThickness: 3, align: 'center',
    }).setOrigin(0.5);

    // ── Score panel ───────────────────────────────────────────────────
    const panelX = cx - 180, panelY = cy + 100;
    this.add.rectangle(cx, panelY + 40, 460, 90, 0x000000, 0.6)
      .setStrokeStyle(2, 0x440000, 1);

    this.add.text(cx, panelY + 10, `SCORE: ${this.finalScore.toLocaleString()}`, {
      fontFamily: 'monospace', fontSize: '26px', color: '#cc7733',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    const rank = this._getRank(this.finalScore);
    this.add.text(cx, panelY + 55, `RANK: ${rank}`, {
      fontFamily: 'monospace', fontSize: '18px', color: '#884422',
    }).setOrigin(0.5);

    // ── Restart prompt ────────────────────────────────────────────────
    const prompt = this.add.text(cx, cy + 235, '— Face the darkness again? Press any key —', {
      fontFamily: 'monospace', fontSize: '17px', color: '#662211',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);
    this.tweens.add({
      targets: prompt, alpha: { from: 0.2, to: 0.85 },
      duration: 1100, yoyo: true, repeat: -1,
    });

    // ── Embers drifting up ────────────────────────────────────────────
    for (let i = 0; i < 16; i++) {
      const ember = this.add.circle(
        Phaser.Math.Between(0, GAME_WIDTH),
        Phaser.Math.Between(0, GAME_HEIGHT),
        Phaser.Math.Between(1, 3),
        0xcc2200, Phaser.Math.FloatBetween(0.2, 0.6),
      );
      this.tweens.add({
        targets: ember,
        y: `-=${Phaser.Math.Between(100, 300)}`,
        alpha: 0,
        duration: Phaser.Math.Between(2000, 4500),
        delay: Phaser.Math.Between(0, 2000),
        repeat: -1,
        onRepeat: () => {
          ember.setPosition(Phaser.Math.Between(0, GAME_WIDTH), GAME_HEIGHT + 10);
          ember.setAlpha(Phaser.Math.FloatBetween(0.2, 0.6));
        },
      });
    }

    // ── Input to restart ─────────────────────────────────────────────
    this.time.delayedCall(800, () => {
      this.input.keyboard?.once('keydown', () => this.scene.start('GameScene'));
      this.input.once('pointerdown', () => this.scene.start('GameScene'));
    });

    void panelX;
  }

  private _getRank(score: number): string {
    if (score >= 10000) return '★★★  APOSTLE SLAYER  ★★★';
    if (score >= 5000)  return '★★  MARKED WARRIOR  ★★';
    if (score >= 2000)  return '★  BRANDED SURVIVOR  ★';
    if (score >= 500)   return 'FALLEN MERCENARY';
    return 'CONSUMED BY THE BRAND';
  }
}
