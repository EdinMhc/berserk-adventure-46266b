import Phaser from 'phaser';

// RPG MODULE — combat primitives, component-style: attach a Health to any fighter, draw it
// with a HealthBar, land hits through an Attack (cooldown built in). Death fires onDeath
// once — destroy the sprite / drop loot there, and for the player call gameOver().
export class Health {
  current: number;
  onChange?: (current: number, max: number) => void;
  onDeath?: () => void;
  private died = false;

  constructor(public max: number) { this.current = max; }

  get dead(): boolean { return this.died; }

  damage(amount: number): void {
    if (this.died) return;
    this.current = Math.max(0, this.current - Math.max(0, amount));
    this.onChange?.(this.current, this.max);
    if (this.current === 0) { this.died = true; this.onDeath?.(); }
  }

  heal(amount: number): void {
    if (this.died) return;
    this.current = Math.min(this.max, this.current + Math.max(0, amount));
    this.onChange?.(this.current, this.max);
  }
}

// An attack with damage + cooldown so a held button doesn't hit every frame.
// if (this.attackPressed() && npcInReach) this.swordAttack.tryHit(this, npcHealth);
export class Attack {
  private lastHit = -1e9;
  constructor(public damage: number, public cooldownMs = 400) {}

  tryHit(scene: Phaser.Scene, target: Health): boolean {
    if (scene.time.now - this.lastHit < this.cooldownMs || target.dead) return false;
    this.lastHit = scene.time.now;
    target.damage(this.damage);
    return true;
  }
}

// A small bar floating above a sprite; follows it every frame and empties with the Health.
// Cleans itself up when the sprite is destroyed.
export class HealthBar {
  constructor(scene: Phaser.Scene, target: Phaser.GameObjects.Sprite, health: Health, width = 36) {
    const bg = scene.add.rectangle(target.x, target.y, width + 2, 7, 0x000000, 0.7).setDepth(950);
    const fill = scene.add.rectangle(target.x, target.y, width, 5, 0x4caf50, 1)
      .setOrigin(0, 0.5).setDepth(951);
    const follow = () => {
      const x = target.x, y = target.y - target.displayHeight / 2 - 10;
      bg.setPosition(x, y);
      fill.setPosition(x - width / 2, y);
      const ratio = health.max > 0 ? health.current / health.max : 0;
      fill.scaleX = ratio;
      fill.fillColor = ratio > 0.5 ? 0x4caf50 : ratio > 0.25 ? 0xf5b73c : 0xf2553d;
    };
    follow();
    scene.events.on(Phaser.Scenes.Events.UPDATE, follow);
    target.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.events.off(Phaser.Scenes.Events.UPDATE, follow);
      bg.destroy();
      fill.destroy();
    });
  }
}