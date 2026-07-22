import Phaser from 'phaser';

// ── Ability cooldown tracker ───────────────────────────────────────────────
export class Cooldown {
  private lastUsed = -1e9;
  constructor(public durationMs: number) {}

  ready(now: number): boolean { return now - this.lastUsed >= this.durationMs; }
  use(now: number): void { this.lastUsed = now; }
  ratio(now: number): number {
    return Math.min(1, (now - this.lastUsed) / this.durationMs);
  }
}

// ── Projectile (Hand Cannon bolt) ─────────────────────────────────────────
export interface Bolt {
  sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  damage: number;
  born: number;
}

export function fireBolt(
  scene: Phaser.Scene,
  fromX: number, fromY: number,
  toX: number, toY: number,
  speed: number,
  damage: number,
  tint: number,
): Bolt {
  const sprite = scene.physics.add.sprite(fromX, fromY, '__pixel')
    .setDisplaySize(12, 6)
    .setTint(tint)
    .setDepth(80);
  const angle = Math.atan2(toY - fromY, toX - fromX);
  sprite.setRotation(angle);
  scene.physics.velocityFromAngle(Phaser.Math.RadToDeg(angle), speed, sprite.body.velocity);
  return { sprite, damage, born: scene.time.now };
}

// ── Sweep cone (Iron Sweep) — returns world rectangle for hit-testing ──────
export interface SweepResult {
  cx: number; cy: number;
  dx: number; dy: number;
  halfAngle: number; // radians
  range: number;
  damage: number;
  flash: Phaser.GameObjects.Arc;
}

export function sweepAttack(
  scene: Phaser.Scene,
  fromX: number, fromY: number,
  toX: number, toY: number,
  damage: number,
  tint: number,
): SweepResult {
  const dx = toX - fromX, dy = toY - fromY;
  const dist = Math.hypot(dx, dy) || 1;
  const range = 120;
  const flash = scene.add.circle(
    fromX + (dx / dist) * range * 0.5,
    fromY + (dy / dist) * range * 0.5,
    range * 0.55, tint, 0.35
  ).setDepth(79);
  scene.time.delayedCall(180, () => flash.destroy());
  return { cx: fromX, cy: fromY, dx: dx / dist, dy: dy / dist, halfAngle: Math.PI / 3, range, damage, flash };
}

export function sweepHits(sweep: SweepResult, tx: number, ty: number): boolean {
  const ex = tx - sweep.cx, ey = ty - sweep.cy;
  const dist = Math.hypot(ex, ey);
  if (dist > sweep.range || dist < 8) return false;
  const dot = (ex / dist) * sweep.dx + (ey / dist) * sweep.dy;
  return dot >= Math.cos(sweep.halfAngle);
}

// ── Rage gauge ────────────────────────────────────────────────────────────
export class RageGauge {
  current = 0;
  readonly max = 100;
  isBerserk = false;
  berserkEnd = 0;
  readonly berserkDurationMs = 8000;

  add(amount: number): void {
    if (this.isBerserk) return;
    this.current = Math.min(this.max, this.current + amount);
  }

  tryActivate(now: number): boolean {
    if (this.current < this.max || this.isBerserk) return false;
    this.isBerserk = true;
    this.berserkEnd = now + this.berserkDurationMs;
    this.current = 0;
    return true;
  }

  tick(now: number): void {
    if (this.isBerserk && now >= this.berserkEnd) {
      this.isBerserk = false;
    }
  }

  ratio(): number { return this.current / this.max; }
  berserkRatio(now: number): number {
    if (!this.isBerserk) return 0;
    return Math.max(0, (this.berserkEnd - now) / this.berserkDurationMs);
  }
}
