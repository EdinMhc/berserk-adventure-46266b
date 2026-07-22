import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { Health } from './combat';
import { RageGauge } from './abilities';

// ── In-game HUD: health, rage, ability cooldowns, shards, day/night ────────
export class HUD {
  private scene: Phaser.Scene;

  // Health bar
  private hpBg: Phaser.GameObjects.Rectangle;
  private hpFill: Phaser.GameObjects.Rectangle;
  private hpText: Phaser.GameObjects.Text;

  // Rage bar
  private rageBg: Phaser.GameObjects.Rectangle;
  private rageFill: Phaser.GameObjects.Rectangle;
  private rageText: Phaser.GameObjects.Text;
  private berserkLabel: Phaser.GameObjects.Text;

  // Ability slots Q / F / E / R
  private abilitySlots: Phaser.GameObjects.Container[] = [];
  private cooldownOverlays: Phaser.GameObjects.Rectangle[] = [];
  private abilityKeys = ['Q', 'F', 'E', 'R'];

  // Shard counter
  private shardText: Phaser.GameObjects.Text;

  // Day / Night
  private dayNightLabel: Phaser.GameObjects.Text;
  private dayNightBg: Phaser.GameObjects.Rectangle;
  private dayNightFill: Phaser.GameObjects.Rectangle;

  // Night overlay (covers whole screen)
  nightOverlay: Phaser.GameObjects.Rectangle;

  // Score / kills
  private scoreText: Phaser.GameObjects.Text;

  // Prompt
  private promptText: Phaser.GameObjects.Text;
  private promptTimer = 0;

  // Combo
  private comboText: Phaser.GameObjects.Text;

  private readonly SLOT_SIZE = 54;
  private readonly SLOT_GAP = 8;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const D = 2; // depth base
    const W = GAME_WIDTH, H = GAME_HEIGHT;

    // ── Health bar ────────────────────────────────────────────────────────
    const hpW = 240, hpH = 18;
    this.hpBg = scene.add.rectangle(20, 22, hpW, hpH, 0x000000, 0.7)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(D + 900);
    this.hpFill = scene.add.rectangle(20, 22, hpW, hpH, 0xb22222, 1)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(D + 901);
    this.hpText = scene.add.text(20 + hpW + 8, 22, 'HP', {
      fontFamily: 'monospace', fontSize: '13px', color: '#cc4444',
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(D + 902);

    // ── Rage bar ──────────────────────────────────────────────────────────
    const rageW = 180, rageH = 14;
    this.rageBg = scene.add.rectangle(20, 46, rageW, rageH, 0x000000, 0.7)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(D + 900);
    this.rageFill = scene.add.rectangle(20, 46, 0, rageH, 0xcc2200, 1)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(D + 901);
    this.rageText = scene.add.text(20 + rageW + 8, 46, 'RAGE', {
      fontFamily: 'monospace', fontSize: '11px', color: '#cc2200',
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(D + 902);
    this.berserkLabel = scene.add.text(W / 2, H / 2 - 80, '⚡ BERSERK RAGE ⚡', {
      fontFamily: 'monospace', fontSize: '28px', color: '#ff4400',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 950).setVisible(false);

    // ── Ability slots ─────────────────────────────────────────────────────
    const slotStartX = W / 2 - ((this.SLOT_SIZE + this.SLOT_GAP) * 2);
    for (let i = 0; i < 4; i++) {
      const x = slotStartX + i * (this.SLOT_SIZE + this.SLOT_GAP);
      const y = H - this.SLOT_SIZE / 2 - 12;
      const bg = scene.add.rectangle(x, y, this.SLOT_SIZE, this.SLOT_SIZE, 0x0a0a14, 0.85)
        .setStrokeStyle(2, 0x441111, 1).setScrollFactor(0).setDepth(D + 900);
      const lbl = scene.add.text(x, y + this.SLOT_SIZE / 2 - 14, this.abilityKeys[i], {
        fontFamily: 'monospace', fontSize: '11px', color: '#888888',
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(D + 903);
      const names = ['SWEEP', 'DODGE', 'BOLT', 'BERSERK'];
      const icon = scene.add.text(x, y - 6, names[i], {
        fontFamily: 'monospace', fontSize: '10px', color: '#cc5500',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 903);
      const overlay = scene.add.rectangle(x, y, this.SLOT_SIZE, this.SLOT_SIZE, 0x000000, 0.7)
        .setScrollFactor(0).setDepth(D + 902);
      const container = scene.add.container(0, 0, [bg, lbl, icon, overlay]).setScrollFactor(0);
      this.abilitySlots.push(container);
      this.cooldownOverlays.push(overlay);
    }

    // ── Shard counter ─────────────────────────────────────────────────────
    this.shardText = scene.add.text(W - 16, 16, '◆ 0 / 5 SHARDS', {
      fontFamily: 'monospace', fontSize: '16px', color: '#8844cc',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(D + 900);

    // ── Day/Night bar ─────────────────────────────────────────────────────
    const dnW = 160, dnH = 10;
    this.dayNightLabel = scene.add.text(W - 16, 42, 'DAY', {
      fontFamily: 'monospace', fontSize: '12px', color: '#aaaaaa',
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(D + 900);
    this.dayNightBg = scene.add.rectangle(W - 16 - dnW / 2 - 45, 42, dnW, dnH, 0x000000, 0.7)
      .setScrollFactor(0).setDepth(D + 900);
    this.dayNightFill = scene.add.rectangle(
      W - 16 - dnW - 45, 42, dnW, dnH, 0xffcc44, 1
    ).setOrigin(0, 0.5).setScrollFactor(0).setDepth(D + 901);

    // ── Night overlay ─────────────────────────────────────────────────────
    this.nightOverlay = scene.add.rectangle(W / 2, H / 2, W, H, 0x000011, 0)
      .setScrollFactor(0).setDepth(D + 500);

    // ── Score ─────────────────────────────────────────────────────────────
    this.scoreText = scene.add.text(W / 2, 14, 'KILLS: 0', {
      fontFamily: 'monospace', fontSize: '14px', color: '#996633',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(D + 900);

    // ── Prompt ────────────────────────────────────────────────────────────
    this.promptText = scene.add.text(W / 2, H - 100, '', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ddddcc',
      stroke: '#000000', strokeThickness: 3,
      backgroundColor: '#00000088', padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 900).setVisible(false);

    // ── Combo ─────────────────────────────────────────────────────────────
    this.comboText = scene.add.text(W / 2, H / 2 - 140, '', {
      fontFamily: 'monospace', fontSize: '22px', color: '#ff6600',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 905).setVisible(false);

    // suppress unused warning
    void this.rageBg;
    void this.hpBg;
    void this.dayNightBg;
  }

  updateHealth(health: Health): void {
    const ratio = health.max > 0 ? health.current / health.max : 0;
    this.hpFill.scaleX = ratio;
    this.hpText.setText(`${health.current}/${health.max}`);
  }

  updateRage(gauge: RageGauge, now: number): void {
    gauge.tick(now);
    if (gauge.isBerserk) {
      const r = gauge.berserkRatio(now);
      this.rageFill.setFillStyle(0xff4400).scaleX = r;
      this.rageText.setText('BERSERK');
      this.berserkLabel.setVisible(true).setAlpha(0.7 + 0.3 * Math.sin(now / 100));
    } else {
      this.rageFill.setFillStyle(0xcc2200).scaleX = gauge.ratio();
      this.rageText.setText(`RAGE ${Math.floor(gauge.current)}%`);
      this.berserkLabel.setVisible(false);
    }
  }

  updateCooldowns(ratios: number[]): void {
    for (let i = 0; i < this.cooldownOverlays.length; i++) {
      const r = Math.max(0, 1 - (ratios[i] ?? 1));
      this.cooldownOverlays[i].setAlpha(r * 0.75);
    }
  }

  updateShards(count: number): void {
    this.shardText.setText(`◆ ${count} / 5 SHARDS`);
    if (count >= 5) this.shardText.setColor('#dd88ff');
  }

  updateDayNight(dayRatio: number, isNight: boolean): void {
    this.dayNightFill.scaleX = isNight ? 1 - dayRatio : dayRatio;
    this.dayNightFill.setFillStyle(isNight ? 0x3322aa : 0xffcc44);
    this.dayNightLabel.setText(isNight ? 'NIGHT' : 'DAY').setColor(isNight ? '#6688cc' : '#ccaa44');
    // Night overlay opacity
    const alpha = isNight ? Phaser.Math.Clamp(0.55 - dayRatio * 0.3, 0.3, 0.6) : 0;
    this.nightOverlay.setAlpha(alpha);
  }

  updateScore(kills: number): void {
    this.scoreText.setText(`KILLS: ${kills}`);
  }

  showPrompt(msg: string, durationMs = 2500): void {
    this.promptText.setText(msg).setVisible(true);
    this.promptTimer = durationMs;
  }

  showCombo(text: string): void {
    this.comboText.setText(text).setVisible(true).setAlpha(1);
    this.scene.tweens.add({
      targets: this.comboText,
      alpha: 0,
      duration: 1200,
      ease: 'Power2',
      onComplete: () => this.comboText.setVisible(false),
    });
  }

  update(delta: number): void {
    if (this.promptTimer > 0) {
      this.promptTimer -= delta;
      if (this.promptTimer <= 0) this.promptText.setVisible(false);
    }
  }
}
