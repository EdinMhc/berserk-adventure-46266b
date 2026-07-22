import Phaser from 'phaser';
import { Health, HealthBar, Attack } from './combat';

export type EnemyType = 'wraith' | 'demon' | 'apostle';

export interface Enemy {
  type: EnemyType;
  sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  health: Health;
  attack: Attack;
  bar: HealthBar;
  state: 'idle' | 'chase' | 'attack' | 'dead';
  spawnX: number;
  spawnY: number;
  label?: Phaser.GameObjects.Text;
  isApostle: boolean;
  shardIndex: number;  // -1 = no shard
  lastStateChange: number;
  knockTimer: number;
}

const WRAITH_COLOR = 0x4488cc;
const DEMON_COLOR  = 0xcc3322;
const APOSTLE_COLOR = 0xaa00ff;

/** Spawn one enemy at pixel coordinates */
export function spawnEnemy(
  scene: Phaser.Scene,
  type: EnemyType,
  x: number,
  y: number,
  shardIndex = -1,
): Enemy {
  const isApostle = type === 'apostle';
  const size  = isApostle ? 36 : type === 'demon' ? 28 : 22;
  const hp    = isApostle ? 280 : type === 'demon' ? 90 : 45;
  const dmg   = isApostle ? 22  : type === 'demon' ? 12 : 7;
  const color = isApostle ? APOSTLE_COLOR : type === 'demon' ? DEMON_COLOR : WRAITH_COLOR;

  const sprite = scene.physics.add.sprite(x, y, '__pixel')
    .setDisplaySize(size, size)
    .setTint(color)
    .setDepth(60);

  sprite.body.setSize(size * 0.8, size * 0.8);

  const health = new Health(hp);
  const attack = new Attack(dmg, isApostle ? 1200 : 800);
  const bar = new HealthBar(scene, sprite, health, isApostle ? 54 : 36);

  let label: Phaser.GameObjects.Text | undefined;
  if (isApostle) {
    const names = ['Rotted Shepherd', 'Hollow Knight', 'Plague Witch', 'Iron Beast', 'Shadow Weaver'];
    const name = shardIndex >= 0 && shardIndex < names.length ? names[shardIndex] : 'Apostle';
    label = scene.add.text(x, y - size / 2 - 18, name, {
      fontFamily: 'monospace', fontSize: '12px', color: '#cc88ff',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(910);
  }

  const enemy: Enemy = {
    type, sprite, health, attack, bar,
    state: 'idle',
    spawnX: x, spawnY: y,
    label,
    isApostle,
    shardIndex,
    lastStateChange: 0,
    knockTimer: 0,
  };

  health.onDeath = () => {
    enemy.state = 'dead';
    if (label) label.destroy();
    // flash on death
    scene.tweens.add({
      targets: sprite,
      alpha: 0,
      duration: 400,
      onComplete: () => sprite.destroy(),
    });
  };

  return enemy;
}

/** Update one enemy's AI toward the player */
export function updateEnemy(
  enemy: Enemy,
  player: { x: number; y: number },
  playerHealth: Health,
  now: number,
  delta: number,
  isNight: boolean,
  scene: Phaser.Scene,
): void {
  if (enemy.state === 'dead' || enemy.health.dead || !enemy.sprite.active) return;

  // update label position
  if (enemy.label && enemy.sprite.active) {
    enemy.label.setPosition(enemy.sprite.x, enemy.sprite.y - enemy.sprite.displayHeight / 2 - 18);
  }

  // knockback timer
  if (enemy.knockTimer > 0) {
    enemy.knockTimer -= delta;
    return;
  }

  const dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.sprite.x, enemy.sprite.y);
  const aggroRange = enemy.isApostle ? 600 : isNight ? 800 : 320;
  const attackRange = enemy.isApostle ? 70 : 50;
  const chaseSpeed  = enemy.isApostle ? 120 : isNight ? 160 : 100;

  if (dist < aggroRange) {
    // Chase player
    scene.physics.moveTo(enemy.sprite, player.x, player.y, chaseSpeed);

    if (dist < attackRange) {
      enemy.attack.tryHit(scene, playerHealth);
      // push player back subtly
    }
  } else {
    // Idle — drift slowly back to spawn
    const dsx = enemy.spawnX - enemy.sprite.x;
    const dsy = enemy.spawnY - enemy.sprite.y;
    const ds = Math.hypot(dsx, dsy);
    if (ds > 8) {
      enemy.sprite.setVelocity((dsx / ds) * 30, (dsy / ds) * 30);
    } else {
      enemy.sprite.setVelocity(0, 0);
    }
  }

  // Hostile flicker at night
  if (isNight && enemy.type !== 'apostle') {
    enemy.sprite.setAlpha(0.7 + 0.3 * Math.sin(now / 120 + enemy.spawnX));
  } else {
    enemy.sprite.setAlpha(1);
  }
}

/** Knock the enemy back when hit */
export function knockback(enemy: Enemy, fromX: number, fromY: number, force: number): void {
  const dx = enemy.sprite.x - fromX, dy = enemy.sprite.y - fromY;
  const d = Math.hypot(dx, dy) || 1;
  enemy.sprite.setVelocity((dx / d) * force, (dy / d) * force);
  enemy.knockTimer = 220;
}
