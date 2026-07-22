import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { worldMap } from '../rpg/map';
import { Health, HealthBar, Attack } from '../rpg/combat';
import { DialogueBox } from '../rpg/dialogue';
import { Inventory, InventoryUI } from '../rpg/inventory';
import { Npc, spawnNpc, nearestNpcInRange } from '../rpg/npc';
import { saveGame, loadGame, clearSave } from '../rpg/save';
import { RageGauge, Cooldown, fireBolt, Bolt, sweepAttack, sweepHits } from '../rpg/abilities';
import { HUD } from '../rpg/hud';
import { Enemy, spawnEnemy, updateEnemy, knockback } from '../rpg/enemies';
import {
  lyraDialogue, lyraHealDialogue, lyraWinDialogue,
  elderDialogue, smithDialogue,
} from '../rpg/dialogues';

// ── Day / Night constants ─────────────────────────────────────────────────
const DAY_MS   = 60_000;
const NIGHT_MS = 40_000;
const CYCLE_MS = DAY_MS + NIGHT_MS;

// ── Apostle spawn configs ─────────────────────────────────────────────────
const APOSTLE_POSITIONS: [number, number][] = [
  [55, 11],
  [60, 28],
  [18, 22],
  [70, 8],
  [68, 26],
];

// ── Night wave spawn points ───────────────────────────────────────────────
const WAVE_SPAWNS: [number, number][] = [
  [5, 5], [74, 5], [5, 28], [74, 28], [38, 5], [38, 28],
];

export default class GameScene extends Phaser.Scene {
  // ── Input ──────────────────────────────────────────────────────────────
  protected cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyX!: Phaser.Input.Keyboard.Key;
  private keyJ!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private keyEnter!: Phaser.Input.Keyboard.Key;
  private keyQ!: Phaser.Input.Keyboard.Key;
  private keyR!: Phaser.Input.Keyboard.Key;
  private keyF!: Phaser.Input.Keyboard.Key;
  private pointerIsDown = false;
  private _wasDown = false;

  // ── Score & state ─────────────────────────────────────────────────────
  protected score = 0;
  private kills = 0;
  private shards = 0;
  private questFlags: Record<string, boolean> = {};

  // ── World ─────────────────────────────────────────────────────────────
  protected map!: Phaser.Tilemaps.Tilemap;
  private groundLayer!: Phaser.Tilemaps.TilemapLayer;

  // ── Player ────────────────────────────────────────────────────────────
  protected player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private playerHealth!: Health;
  private playerHpBar!: HealthBar;
  private isInvincible = false;
  private invincibleTimer = 0;
  private facingX = 1;
  private facingY = 0;
  private dodgeActive = false;
  private dodgeTimer = 0;
  private dodgeDirX = 0;
  private dodgeDirY = 0;
  private lyraSprite!: Phaser.GameObjects.Arc;
  private lyraAngle = 0;

  // ── Abilities ─────────────────────────────────────────────────────────
  private cooldownSweep!: Cooldown;
  private cooldownDodge!: Cooldown;
  private cooldownBolt!: Cooldown;
  private cooldownBerserk!: Cooldown;
  private rage!: RageGauge;
  private bolts: Bolt[] = [];

  // ── RPG Systems ───────────────────────────────────────────────────────
  private dialogue!: DialogueBox;
  private inventory!: Inventory;
  private inventoryUI!: InventoryUI;
  private npcs: Npc[] = [];
  private lyraHealFlag = false;

  // ── Enemies ───────────────────────────────────────────────────────────
  private enemies: Enemy[] = [];
  private apostles: Enemy[] = [];

  // ── HUD ───────────────────────────────────────────────────────────────
  private hud!: HUD;

  // ── Day / Night ───────────────────────────────────────────────────────
  private cycleTimer = 0;
  private isNight = false;
  private nightWaveTimer = 0;
  private nightWaveInterval = 12_000;

  // ── Win state ─────────────────────────────────────────────────────────
  private gameWon = false;
  private winScreen!: Phaser.GameObjects.Container;

  constructor() { super('GameScene'); }

  // ══════════════════════════════════════════════════════════════════════
  //  CREATE
  // ══════════════════════════════════════════════════════════════════════
  create() {
    this.score = 0;
    this.kills = 0;
    this.shards = 0;
    this.questFlags = {};
    this.enemies = [];
    this.apostles = [];
    this.bolts = [];
    this.gameWon = false;

    // ── Input setup ────────────────────────────────────────────────────
    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.cursors  = kb.createCursorKeys();
    this.keyA     = kb.addKey(K.A);  this.keyD = kb.addKey(K.D);
    this.keyW     = kb.addKey(K.W);  this.keyS = kb.addKey(K.S);
    this.keyE     = kb.addKey(K.E);  this.keyX = kb.addKey(K.X);
    this.keyJ     = kb.addKey(K.J);  this.keyQ = kb.addKey(K.Q);
    this.keyR     = kb.addKey(K.R);  this.keyF = kb.addKey(K.F);
    this.keySpace = kb.addKey(K.SPACE);
    this.keyEnter = kb.addKey(K.ENTER);
    this.input.on('pointerdown', () => { this.pointerIsDown = true; });
    this.input.on('pointerup',   () => { this.pointerIsDown = false; });

    // ── Build tilemap ──────────────────────────────────────────────────
    this._buildMap();

    // ── Player ─────────────────────────────────────────────────────────
    this._buildPlayer();

    // ── Abilities ─────────────────────────────────────────────────────
    this.cooldownSweep   = new Cooldown(1200);
    this.cooldownDodge   = new Cooldown(1800);
    this.cooldownBolt    = new Cooldown(2000);
    this.cooldownBerserk = new Cooldown(20_000);
    this.rage = new RageGauge();

    // ── RPG systems ────────────────────────────────────────────────────
    this.dialogue = new DialogueBox(this);
    this.inventory = new Inventory();
    this.inventoryUI = new InventoryUI(this, this.inventory);

    this.inventory.add({ id: 'broadsword', name: 'Iron Broadsword', equipSlot: 'weapon' });
    this.inventory.equip('broadsword');

    // ── NPCs ───────────────────────────────────────────────────────────
    this._spawnNpcs();

    // ── Spawn apostles ────────────────────────────────────────────────
    this._spawnApostles();

    // ── HUD ────────────────────────────────────────────────────────────
    this.hud = new HUD(this);

    // ── Camera ─────────────────────────────────────────────────────────
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.35);

    // ── Lyra companion orb ─────────────────────────────────────────────
    this.lyraSprite = this.add.circle(0, 0, 8, 0xaaddff, 0.9).setDepth(70);
    this.add.circle(0, 0, 16, 0x6699ff, 0.18).setDepth(69);

    // ── Day/Night cycle start ──────────────────────────────────────────
    this.cycleTimer = 0;

    // ── Restore save if exists ─────────────────────────────────────────
    const saved = loadGame();
    if (saved) {
      this.player.setPosition(saved.playerPos.x, saved.playerPos.y);
      this.inventory = Inventory.from(saved.inventory);
      this.inventoryUI = new InventoryUI(this, this.inventory);
      this.questFlags = saved.questFlags ?? {};
      this.shards = Object.keys(this.questFlags).filter(k => k.startsWith('shard_')).length;
    }

    // ── Title ─────────────────────────────────────────────────────────
    this.add.text(GAME_WIDTH / 2, 14, '— BERSERK ADVENTURE —', {
      fontFamily: 'monospace', fontSize: '13px', color: '#553322',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1000);

    // ── Controls reminder ─────────────────────────────────────────────
    this.add.text(12, GAME_HEIGHT - 100,
      'WASD/↑↓←→:Move  Q:Sweep  F:Dodge  E:Bolt  R:Berserk  X/J:Attack  Space:Talk', {
      fontFamily: 'monospace', fontSize: '11px', color: '#443322',
      stroke: '#000', strokeThickness: 2,
    }).setScrollFactor(0).setDepth(1000);
  }

  // ── Build tilemap ────────────────────────────────────────────────────
  private _buildMap(): void {
    const ts = worldMap.tileSize;

    if (!this.textures.exists('__tiles_berserk')) {
      // Build rich pixel texture for floor and walls using Graphics
      const g = this.make.graphics({ x: 0, y: 0 });
      // Frame 0: muddy cobblestone floor
      g.fillStyle(0x2a2018, 1).fillRect(0, 0, ts, ts);
      g.fillStyle(0x1e160f, 1).fillRect(2, 2, ts - 4, ts - 4);
      g.fillStyle(0x302418, 0.8).fillRect(4, 4, 10, 8);
      g.fillStyle(0x302418, 0.8).fillRect(16, 6, 12, 7);
      g.fillStyle(0x252010, 0.8).fillRect(6, 16, 8, 10);
      g.fillStyle(0x302010, 0.8).fillRect(18, 18, 10, 8);
      // Frame 1: solid dark stone wall
      g.fillStyle(0x161210, 1).fillRect(ts, 0, ts, ts);
      g.fillStyle(0x0f0c0a, 0.9).fillRect(ts + 2, 2, ts - 4, ts - 4);
      g.fillStyle(0x201a14, 0.5).fillRect(ts + 4, 4, ts - 8, 4);
      g.fillStyle(0x0a0806, 0.5).fillRect(ts + 4, ts - 8, ts - 8, 4);
      g.generateTexture('__tiles_berserk', ts * 2, ts);
      g.destroy();
    }

    const usedKey = this.textures.exists(worldMap.tileset) ? worldMap.tileset : '__tiles_berserk';

    this.map = this.make.tilemap({
      data: worldMap.rows,
      tileWidth: ts,
      tileHeight: ts,
    });

    const tileset = this.map.addTilesetImage(usedKey, usedKey, ts, ts)!;
    this.groundLayer = this.map.createLayer(0, tileset, 0, 0)!;
    this.groundLayer.setCollision(worldMap.collision);

    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

    // Mud/blood spot decals
    const decals = this.add.graphics().setDepth(3);
    decals.fillStyle(0x0a0808, 0.35);
    for (let i = 0; i < 120; i++) {
      const dx = Phaser.Math.Between(1, this.map.width - 2) * ts + ts / 2;
      const dy = Phaser.Math.Between(1, this.map.height - 2) * ts + ts / 2;
      const tile = this.map.getTileAtWorldXY(dx, dy);
      if (tile && !worldMap.collision.includes(tile.index)) {
        decals.fillCircle(dx, dy, Phaser.Math.Between(4, 14));
      }
    }
  }

  // ── Build player ──────────────────────────────────────────────────────
  private _buildPlayer(): void {
    const ts = worldMap.tileSize;
    const startX = 8 * ts + ts / 2;
    const startY = 8 * ts + ts / 2;

    // ── Character animations (4×4 sheet, 48×48 frames) ─────────────────
    // Row 0 (frames 0-3):  walk down
    // Row 1 (frames 4-7):  walk left
    // Row 2 (frames 8-11): walk right
    // Row 3 (frames 12-15): walk up
    const CHAR_KEY = 'gen-i-want-a-main-character-to-look-like-thi';

    const createOnce = (key: string, cfg: Phaser.Types.Animations.GenerateFrameNumbersConfig, frameRate: number, repeat: number) => {
      if (!this.anims.exists(key)) {
        this.anims.create({ key, frames: this.anims.generateFrameNumbers(CHAR_KEY, cfg), frameRate, repeat });
      }
    };

    createOnce('player-walk-down',  { start: 0,  end: 3  }, 8, -1);
    createOnce('player-walk-left',  { start: 4,  end: 7  }, 8, -1);
    createOnce('player-walk-right', { start: 8,  end: 11 }, 8, -1);
    createOnce('player-walk-up',    { start: 12, end: 15 }, 8, -1);
    createOnce('player-idle',       { start: 0,  end: 0  }, 1, -1);

    this.player = this.physics.add.sprite(startX, startY, CHAR_KEY, 0)
      .setDisplaySize(40, 40)
      .setDepth(65);
    this.player.body.setSize(22, 22);
    this.player.body.setOffset(13, 22); // centre the hitbox on the feet
    this.player.body.setCollideWorldBounds(true);
    this.player.anims.play('player-idle', true);

    this.physics.add.collider(this.player, this.groundLayer);

    this.playerHealth = new Health(120);
    this.playerHpBar  = new HealthBar(this, this.player, this.playerHealth, 44);

    this.playerHealth.onDeath = () => {
      clearSave();
      this.cameras.main.shake(500, 0.025);
      this.time.delayedCall(800, () => this.gameOver(this.kills));
    };

    this.playerHealth.onChange = (_cur, _max) => {
      if (this.hud) this.hud.updateHealth(this.playerHealth);
      this.cameras.main.flash(80, 120, 0, 0);
      const ratio = _cur / _max;
      this.rage.add(8 + (1 - ratio) * 8);
    };

    // Brand sigil overlay
    const brand = this.add.graphics().setDepth(66);
    brand.lineStyle(1, 0xcc2200, 0.7);
    brand.strokeCircle(0, 0, 4);
    brand.beginPath();
    brand.moveTo(-4, 0); brand.lineTo(4, 0);
    brand.moveTo(0, -4); brand.lineTo(0, 4);
    brand.strokePath();
    this.events.on(Phaser.Scenes.Events.UPDATE, () => {
      brand.setPosition(this.player.x, this.player.y - 4);
    });
  }

  // ── Spawn NPCs ────────────────────────────────────────────────────────
  private _spawnNpcs(): void {
    const lyraNpc = spawnNpc(this, this.map, {
      id: 'lyra',
      tileX: 10, tileY: 9,
      texture: '__pixel',
      dialogue: lyraDialogue,
    });
    lyraNpc.sprite.setDisplaySize(18, 18).setTint(0x88bbff);
    this.npcs.push(lyraNpc);

    const elder = spawnNpc(this, this.map, {
      id: 'elder',
      tileX: 8, tileY: 11,
      texture: '__pixel',
      dialogue: elderDialogue,
    });
    elder.sprite.setDisplaySize(20, 22).setTint(0x998866);
    this._addNpcLabel(elder, 'Elder Craw', 0x886644);
    this.npcs.push(elder);

    const smith = spawnNpc(this, this.map, {
      id: 'smith',
      tileX: 32, tileY: 11,
      texture: '__pixel',
      dialogue: smithDialogue,
    });
    smith.sprite.setDisplaySize(22, 24).setTint(0x775544);
    this._addNpcLabel(smith, 'Gorn the Smith', 0x774433);
    this.npcs.push(smith);
  }

  private _addNpcLabel(npc: Npc, name: string, color: number): void {
    const lbl = this.add.text(npc.sprite.x, npc.sprite.y - 20, name, {
      fontFamily: 'monospace', fontSize: '11px',
      color: '#' + color.toString(16).padStart(6, '0'),
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(500);
    const prompt = this.add.text(npc.sprite.x, npc.sprite.y - 32, '[E]', {
      fontFamily: 'monospace', fontSize: '10px', color: '#aaaaaa',
    }).setOrigin(0.5).setDepth(500).setVisible(false);
    npc.state['label']  = lbl;
    npc.state['prompt'] = prompt;
  }

  // ── Spawn apostles ────────────────────────────────────────────────────
  private _spawnApostles(): void {
    const ts = worldMap.tileSize;
    APOSTLE_POSITIONS.forEach(([tx, ty], i) => {
      const e = spawnEnemy(this, 'apostle', tx * ts + ts / 2, ty * ts + ts / 2, i);
      this.apostles.push(e);
      this.enemies.push(e);
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  //  UPDATE
  // ══════════════════════════════════════════════════════════════════════
  update(time: number, delta: number) {
    if (this.gameWon) return;
    if (this.playerHealth.dead) return;

    const now = time;

    // ── Dialogue takes priority ────────────────────────────────────────
    if (this.dialogue.isOpen) {
      if (this.interactPressed()) this.dialogue.advance();

      if (!this.lyraHealFlag && this.questFlags['lyra_healed']) {
        this.lyraHealFlag = true;
        this.playerHealth.heal(40);
        this.hud.showPrompt('Lyra heals you for 40 HP!', 2000);
      }
      if (this.questFlags['enter_eclipse'] && !this.gameWon) {
        this._triggerWin();
      }
      this._updateLyraOrb(now, delta);
      return;
    }

    // ── Day / Night cycle ─────────────────────────────────────────────
    this.cycleTimer = (this.cycleTimer + delta) % CYCLE_MS;
    const wasNight = this.isNight;
    this.isNight = this.cycleTimer > DAY_MS;
    if (!wasNight && this.isNight) {
      this.hud.showPrompt('⚠ NIGHT FALLS — The Interstice bleeds through!', 3000);
      this.cameras.main.flash(400, 0, 0, 20);
    } else if (wasNight && !this.isNight) {
      this.hud.showPrompt('Dawn breaks. Demons retreat...', 2500);
      this.enemies = this.enemies.filter(e => {
        if (!e.isApostle && !e.health.dead && e.state !== 'dead') {
          e.health.damage(9999);
          return false;
        }
        return true;
      });
    }

    const cycleRatio = this.isNight
      ? (this.cycleTimer - DAY_MS) / NIGHT_MS
      : this.cycleTimer / DAY_MS;
    this.hud.updateDayNight(cycleRatio, this.isNight);

    if (this.isNight) {
      this.nightWaveTimer -= delta;
      if (this.nightWaveTimer <= 0) {
        this.nightWaveTimer = this.nightWaveInterval;
        this._spawnNightWave();
      }
    }

    // ── Player movement ───────────────────────────────────────────────
    this._updatePlayerMovement(now, delta);

    // ── Abilities ─────────────────────────────────────────────────────
    this._updateAbilities(now);

    // ── Bolts flight ──────────────────────────────────────────────────
    this._updateBolts(now);

    // ── Melee attack ──────────────────────────────────────────────────
    if (this.attackPressed()) {
      this._doMeleeAttack(now);
    }

    // ── Enemy AI ──────────────────────────────────────────────────────
    this._updateEnemies(now, delta);

    // ── Clean dead enemies ────────────────────────────────────────────
    this.enemies = this.enemies.filter(e => !(e.state === 'dead' || e.health.dead));

    // ── NPC interaction ───────────────────────────────────────────────
    this._updateNpcInteraction();

    // ── Lyra companion orb ────────────────────────────────────────────
    this._updateLyraOrb(now, delta);

    // ── Invincibility frames ──────────────────────────────────────────
    if (this.isInvincible) {
      this.invincibleTimer -= delta;
      if (this.invincibleTimer <= 0) {
        this.isInvincible = false;
        this.player.setAlpha(1);
      } else {
        this.player.setAlpha(Math.sin(now / 60) > 0 ? 0.5 : 1);
      }
    }

    // ── Berserk mode health drain ─────────────────────────────────────
    if (this.rage.isBerserk) {
      if (now % 500 < delta) {
        this.playerHealth.damage(3);
      }
    }

    // ── HUD updates ───────────────────────────────────────────────────
    this.hud.updateHealth(this.playerHealth);
    this.hud.updateRage(this.rage, now);
    this.hud.updateShards(this.shards);
    this.hud.updateScore(this.kills);
    this.hud.updateCooldowns([
      this.cooldownSweep.ratio(now),
      this.cooldownDodge.ratio(now),
      this.cooldownBolt.ratio(now),
      this.cooldownBerserk.ratio(now),
    ]);
    this.hud.update(delta);

    // ── NPC prompt visibility ─────────────────────────────────────────
    for (const npc of this.npcs) {
      const prompt = npc.state['prompt'] as Phaser.GameObjects.Text | undefined;
      if (prompt) {
        const d = Phaser.Math.Distance.Between(
          this.player.x, this.player.y, npc.sprite.x, npc.sprite.y);
        prompt.setVisible(d < 60);
      }
    }

    // ── Win condition ─────────────────────────────────────────────────
    if (this.shards >= 5 && !this.gameWon) {
      const lyra = this.npcs.find(n => n.id === 'lyra');
      if (lyra) {
        const d = Phaser.Math.Distance.Between(
          this.player.x, this.player.y, lyra.sprite.x, lyra.sprite.y);
        if (d < 60 && this.interactPressed()) {
          this.dialogue.open(lyraWinDialogue, this.questFlags);
        }
      }
      if (this.questFlags['enter_eclipse']) {
        this._triggerWin();
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  //  PLAYER MOVEMENT
  // ══════════════════════════════════════════════════════════════════════
  private _updatePlayerMovement(_now: number, delta: number): void {
    if (this.dodgeActive) {
      this.dodgeTimer -= delta;
      const spd = this.rage.isBerserk ? 640 : 480;
      this.player.setVelocity(this.dodgeDirX * spd, this.dodgeDirY * spd);
      if (this.dodgeTimer <= 0) {
        this.dodgeActive = false;
        this.isInvincible = false;
        this.player.setAlpha(1);
      }
      return;
    }

    const baseSpeed = this.rage.isBerserk ? 240 : 170;
    let vx = 0, vy = 0;

    vx += this.movingLeft()  ? -1 : 0;
    vx += this.movingRight() ?  1 : 0;
    vy += this.movingUp()    ? -1 : 0;
    vy += this.movingDown()  ?  1 : 0;

    const target = this.pointerTarget();
    if (vx === 0 && vy === 0 && target) {
      const dx = target.x - this.player.x, dy = target.y - this.player.y;
      if (Math.abs(dx) > 8) vx = Math.sign(dx);
      if (Math.abs(dy) > 8) vy = Math.sign(dy);
    }

    const len = Math.hypot(vx, vy) || 1;
    this.player.setVelocity((vx / len) * baseSpeed, (vy / len) * baseSpeed);

    if (vx !== 0 || vy !== 0) {
      this.facingX = vx / len;
      this.facingY = vy / len;
    }

    // ── Drive directional animations ────────────────────────────────
    if (!this.isInvincible || this.dodgeActive) {
      if (vx !== 0 || vy !== 0) {
        // Pick dominant axis; prefer horizontal when equal
        if (Math.abs(vy) > Math.abs(vx)) {
          this.player.anims.play(vy > 0 ? 'player-walk-down' : 'player-walk-up', true);
        } else {
          this.player.anims.play(vx > 0 ? 'player-walk-right' : 'player-walk-left', true);
        }
      } else {
        this.player.anims.play('player-idle', true);
      }
    }

    // Berserk tint overlay (subtle red, preserves sprite colours)
    this.player.setTint(this.rage.isBerserk ? 0xff9966 : 0xffffff);
  }

  // ══════════════════════════════════════════════════════════════════════
  //  ABILITIES
  // ══════════════════════════════════════════════════════════════════════
  private _updateAbilities(now: number): void {
    const berserk = this.rage.isBerserk;

    // Q — Iron Sweep
    if (Phaser.Input.Keyboard.JustDown(this.keyQ) && this.cooldownSweep.ready(now)) {
      this.cooldownSweep.use(now);
      const dmg = berserk ? 55 : 32;
      const ptr = this._getAimPoint();
      const sweep = sweepAttack(
        this, this.player.x, this.player.y, ptr.x, ptr.y, dmg,
        berserk ? 0xff4400 : 0xcc8822,
      );
      let hit = false;
      for (const enemy of this.enemies) {
        if (!enemy.health.dead && sweepHits(sweep, enemy.sprite.x, enemy.sprite.y)) {
          enemy.health.damage(dmg);
          knockback(enemy, this.player.x, this.player.y, berserk ? 400 : 260);
          this._spawnHitVfx(enemy.sprite.x, enemy.sprite.y, 0xcc4400);
          this.rage.add(berserk ? 0 : 10);
          hit = true;
          if (enemy.health.dead) this._onEnemyKilled(enemy);
        }
      }
      if (hit) this.cameras.main.shake(60, 0.006);
    }

    // F — Dodge Roll
    if (Phaser.Input.Keyboard.JustDown(this.keyF) && this.cooldownDodge.ready(now) && !this.dodgeActive) {
      this.cooldownDodge.use(now);
      const ptr = this._getAimPoint();
      const dx = ptr.x - this.player.x, dy = ptr.y - this.player.y;
      const len = Math.hypot(dx, dy) || 1;
      this.dodgeDirX = dx / len;
      this.dodgeDirY = dy / len;
      this.dodgeActive = true;
      this.dodgeTimer = berserk ? 260 : 200;
      this.isInvincible = true;
      this.invincibleTimer = this.dodgeTimer;
      this.player.setAlpha(0.4);
      this._spawnHitVfx(this.player.x, this.player.y, 0x4488cc);
    }

    // E — Hand Cannon bolt
    if (Phaser.Input.Keyboard.JustDown(this.keyE) && this.cooldownBolt.ready(now)) {
      this.cooldownBolt.use(now);
      const ptr = this._getAimPoint();
      const dmg = berserk ? 70 : 42;
      const spd = berserk ? 700 : 520;
      const bolt = fireBolt(
        this, this.player.x, this.player.y, ptr.x, ptr.y, spd, dmg,
        berserk ? 0xff3300 : 0x88aaff,
      );
      this.bolts.push(bolt);
      this.cameras.main.shake(30, 0.003);
      this.rage.add(5);
    }

    // R — Berserk / Ultimate
    if (Phaser.Input.Keyboard.JustDown(this.keyR) && this.cooldownBerserk.ready(now)) {
      if (this.rage.tryActivate(now)) {
        this.cooldownBerserk.use(now);
        this.cameras.main.shake(300, 0.018);
        this.cameras.main.flash(200, 80, 0, 0);
        this.hud.showPrompt('⚡ BERSERK MODE ACTIVATED ⚡', 3000);
        this._spawnHitVfx(this.player.x, this.player.y, 0xff4400);
        this.playerHealth.heal(20);
      } else if (this.rage.current < this.rage.max) {
        this.hud.showPrompt('Rage not full!', 1000);
      }
    }
  }

  // ── Bolt flight & collision ───────────────────────────────────────────
  private _updateBolts(now: number): void {
    const toRemove: number[] = [];
    for (let i = 0; i < this.bolts.length; i++) {
      const bolt = this.bolts[i];
      if (!bolt.sprite.active) { toRemove.push(i); continue; }
      if (now - bolt.born > 2500) { bolt.sprite.destroy(); toRemove.push(i); continue; }
      const tile = this.map.getTileAtWorldXY(bolt.sprite.x, bolt.sprite.y);
      if (tile && worldMap.collision.includes(tile.index)) {
        this._spawnHitVfx(bolt.sprite.x, bolt.sprite.y, 0x8888ff);
        bolt.sprite.destroy();
        toRemove.push(i);
        continue;
      }
      let hit = false;
      for (const enemy of this.enemies) {
        if (enemy.health.dead) continue;
        const d = Phaser.Math.Distance.Between(
          bolt.sprite.x, bolt.sprite.y, enemy.sprite.x, enemy.sprite.y);
        if (d < enemy.sprite.displayWidth * 0.7) {
          enemy.health.damage(bolt.damage);
          knockback(enemy, bolt.sprite.x, bolt.sprite.y, this.rage.isBerserk ? 350 : 200);
          this._spawnHitVfx(enemy.sprite.x, enemy.sprite.y, 0xaa66ff);
          this.rage.add(this.rage.isBerserk ? 0 : 12);
          if (enemy.health.dead) this._onEnemyKilled(enemy);
          bolt.sprite.destroy();
          toRemove.push(i);
          hit = true;
          break;
        }
      }
      if (hit) continue;
    }
    for (let i = toRemove.length - 1; i >= 0; i--) this.bolts.splice(toRemove[i], 1);
  }

  // ── Melee attack ──────────────────────────────────────────────────────
  private _doMeleeAttack(_now: number): void {
    const range = this.rage.isBerserk ? 72 : 54;
    const dmg   = this.rage.isBerserk ? 45 : 22;
    let hit = false;
    for (const enemy of this.enemies) {
      if (enemy.health.dead) continue;
      const d = Phaser.Math.Distance.Between(
        this.player.x, this.player.y, enemy.sprite.x, enemy.sprite.y);
      if (d < range) {
        const atk = new Attack(dmg, 420);
        const landed = atk.tryHit(this, enemy.health);
        if (landed) {
          knockback(enemy, this.player.x, this.player.y, this.rage.isBerserk ? 320 : 200);
          this._spawnHitVfx(enemy.sprite.x, enemy.sprite.y, 0xcc3300);
          this.rage.add(this.rage.isBerserk ? 0 : 14);
          hit = true;
          if (enemy.health.dead) this._onEnemyKilled(enemy);
        }
      }
    }
    if (hit) {
      this.cameras.main.shake(40, 0.005);
      const flashX = this.player.x + this.facingX * 30;
      const flashY = this.player.y + this.facingY * 30;
      const slash = this.add.rectangle(
        flashX, flashY,
        this.rage.isBerserk ? 60 : 44, 8,
        this.rage.isBerserk ? 0xff5500 : 0xddbb44, 0.8,
      ).setDepth(75).setRotation(Math.atan2(this.facingY, this.facingX));
      this.time.delayedCall(120, () => slash.destroy());
    }
  }

  // ── Enemy AI update ────────────────────────────────────────────────────
  private _updateEnemies(now: number, delta: number): void {
    for (const enemy of this.enemies) {
      if (enemy.health.dead || enemy.state === 'dead') continue;

      updateEnemy(enemy, this.player, this.playerHealth, now, delta, this.isNight, this);

      if (this.isInvincible) continue;

      const d = Phaser.Math.Distance.Between(
        this.player.x, this.player.y, enemy.sprite.x, enemy.sprite.y);
      const aRange = enemy.isApostle ? 70 : 45;
      if (d < aRange) {
        const hit = enemy.attack.tryHit(this, this.playerHealth);
        if (hit) {
          this.isInvincible = true;
          this.invincibleTimer = 600;
          this.rage.add(12);
          this.cameras.main.shake(80, 0.01);
        }
      }
    }
  }

  // ── NPC interaction ────────────────────────────────────────────────────
  private _updateNpcInteraction(): void {
    const near = nearestNpcInRange(this.player, this.npcs, 55);
    if (near && this.interactPressed()) {
      if (near.id === 'lyra' && this.shards >= 5) {
        this.dialogue.open(lyraWinDialogue, this.questFlags);
      } else if (near.id === 'lyra') {
        if (this.questFlags['lyra_met']) {
          this.questFlags['lyra_healed'] = false;
          this.dialogue.open(lyraHealDialogue, this.questFlags, () => {
            this.playerHealth.heal(35);
            this.hud.showPrompt('Lyra mends your wounds. +35 HP', 2000);
          });
        } else {
          this.questFlags['lyra_met'] = true;
          this.dialogue.open(near.dialogue, this.questFlags);
        }
      } else {
        this.dialogue.open(near.dialogue, this.questFlags);
      }
    }
  }

  // ── Lyra companion orb ─────────────────────────────────────────────────
  private _updateLyraOrb(now: number, delta: number): void {
    this.lyraAngle += delta * 0.002;
    const radius = 28;
    const orbX = this.player.x + Math.cos(this.lyraAngle) * radius;
    const orbY = this.player.y + Math.sin(this.lyraAngle) * radius - 8;
    this.lyraSprite.setPosition(orbX, orbY);
    this.lyraSprite.setAlpha(0.75 + 0.25 * Math.sin(now / 300));
    this.lyraSprite.setRadius(this.isNight ? 11 : 8);
  }

  // ── Night wave spawner ─────────────────────────────────────────────────
  private _spawnNightWave(): void {
    const count = Phaser.Math.Between(3, 6);
    const ts = worldMap.tileSize;
    for (let i = 0; i < count; i++) {
      const spawnPt = WAVE_SPAWNS[Phaser.Math.Between(0, WAVE_SPAWNS.length - 1)];
      const type = Math.random() < 0.35 ? 'demon' : 'wraith';
      const e = spawnEnemy(
        this, type,
        spawnPt[0] * ts + Phaser.Math.Between(-24, 24),
        spawnPt[1] * ts + Phaser.Math.Between(-24, 24),
      );
      this.enemies.push(e);
    }
  }

  // ── Enemy killed callback ──────────────────────────────────────────────
  private _onEnemyKilled(enemy: Enemy): void {
    this.kills++;
    this.score += enemy.isApostle ? 500 : enemy.type === 'demon' ? 50 : 20;
    this.rage.add(enemy.isApostle ? 35 : 15);
    this.cameras.main.shake(enemy.isApostle ? 250 : 60, enemy.isApostle ? 0.016 : 0.004);

    if (enemy.isApostle && enemy.shardIndex >= 0) {
      const key = `shard_${enemy.shardIndex}`;
      if (!this.questFlags[key]) {
        this.questFlags[key] = true;
        this.shards++;
        this._spawnShardPickup(enemy.sprite.x, enemy.sprite.y, enemy.shardIndex);
        this.hud.showPrompt(`★ CORRUPTED SHARD ${this.shards}/5 OBTAINED! ★`, 3500);
        this.cameras.main.flash(300, 80, 0, 80);
        if (this.shards >= 5) {
          this.hud.showPrompt(
            'All 5 Shards collected! Return to Lyra to open the Eclipse Gate!', 5000);
        }
      }
    }

    if (this.kills % 5 === 0) {
      this.hud.showCombo(`${this.kills} KILLS — "Fight on, Marked One!"`);
    }

    if (this.kills % 3 === 0) {
      saveGame({
        playerPos: { x: this.player.x, y: this.player.y },
        inventory: this.inventory.toJSON(),
        npcState: {},
        questFlags: this.questFlags,
      });
    }
  }

  // ── Shard pickup VFX ──────────────────────────────────────────────────
  private _spawnShardPickup(x: number, y: number, index: number): void {
    const shard = this.add.circle(x, y, 10, 0xaa44ff, 0.9).setDepth(85);
    const lbl = this.add.text(x, y - 16, `SHARD ${index + 1}`, {
      fontFamily: 'monospace', fontSize: '12px', color: '#cc88ff',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(86);
    this.tweens.add({
      targets: [shard, lbl], y: '-=60', alpha: 0, duration: 1400,
      onComplete: () => { shard.destroy(); lbl.destroy(); },
    });
    this.inventory.add({ id: `shard_${index}`, name: `Corrupted Shard #${index + 1}` });
  }

  // ── Hit VFX ───────────────────────────────────────────────────────────
  private _spawnHitVfx(x: number, y: number, color: number): void {
    for (let i = 0; i < 5; i++) {
      const p = this.add.circle(
        x + Phaser.Math.Between(-10, 10),
        y + Phaser.Math.Between(-10, 10),
        Phaser.Math.Between(2, 5), color, 0.85,
      ).setDepth(90);
      this.tweens.add({
        targets: p, alpha: 0, scaleX: 2, scaleY: 2, duration: 280,
        onComplete: () => p.destroy(),
      });
    }
  }

  // ── Get aim point ─────────────────────────────────────────────────────
  private _getAimPoint(): Phaser.Math.Vector2 {
    const ptr = this.pointerTarget();
    if (ptr) return ptr;
    return new Phaser.Math.Vector2(
      this.player.x + this.facingX * 200,
      this.player.y + this.facingY * 200,
    );
  }

  // ── Win trigger ────────────────────────────────────────────────────────
  private _triggerWin(): void {
    if (this.gameWon) return;
    this.gameWon = true;
    this.player.setVelocity(0, 0);

    this.cameras.main.flash(600, 80, 0, 80);
    this.cameras.main.shake(800, 0.02);

    this.time.delayedCall(1000, () => {
      const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;
      const panel = this.add.rectangle(cx, cy, 760, 380, 0x050508, 0.97)
        .setStrokeStyle(3, 0x6600aa, 1).setScrollFactor(0).setDepth(2000);

      this.add.text(cx, cy - 130, '★ ECLIPSE GATE OPENS ★', {
        fontFamily: 'monospace', fontSize: '30px', color: '#cc88ff',
        stroke: '#000', strokeThickness: 4,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

      this.add.text(cx, cy - 60,
        '"You step through the rift, blade heavy\nwith the blood of five Apostles."', {
        fontFamily: 'monospace', fontSize: '16px', color: '#aaaacc', align: 'center',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

      this.add.text(cx, cy + 10,
        '"Lyra\'s light gutters — the world\nbeyond is absolute darkness."\n\n"But you have survived worse."', {
        fontFamily: 'monospace', fontSize: '16px', color: '#9988aa', align: 'center',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

      this.add.text(cx, cy + 110, `APOSTLES SLAIN: ${this.kills}   SHARDS: 5/5`, {
        fontFamily: 'monospace', fontSize: '15px', color: '#cc8844',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

      this.add.text(cx, cy + 145, '— Press any key to face Malakor —', {
        fontFamily: 'monospace', fontSize: '14px', color: '#554433',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

      this.winScreen = this.add.container(0, 0, [panel]).setScrollFactor(0).setDepth(1999);

      clearSave();

      this.input.keyboard?.once('keydown', () => this.gameOver(this.kills * 100 + this.score));
      this.input.once('pointerdown', () => this.gameOver(this.kills * 100 + this.score));
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  //  Named Input Helpers (engine contract)
  // ══════════════════════════════════════════════════════════════════════
  protected movingLeft():  boolean { return this.cursors.left.isDown  || this.keyA.isDown; }
  protected movingRight(): boolean { return this.cursors.right.isDown || this.keyD.isDown; }
  protected movingUp():    boolean { return this.cursors.up.isDown    || this.keyW.isDown; }
  protected movingDown():  boolean { return this.cursors.down.isDown  || this.keyS.isDown; }

  protected pointerTarget(): Phaser.Math.Vector2 | null {
    if (!this.pointerIsDown) return null;
    const p = this.input.activePointer;
    return this.cameras.main.getWorldPoint(p.x, p.y);
  }

  protected interactPressed(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.keySpace)
      || Phaser.Input.Keyboard.JustDown(this.keyEnter)
      || this.tapped();
  }

  protected attackPressed(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.keyX)
      || Phaser.Input.Keyboard.JustDown(this.keyJ);
  }

  private tapped(): boolean {
    const now = this.pointerIsDown && !this._wasDown;
    this._wasDown = this.pointerIsDown;
    return now;
  }

  protected gameOver(score?: number): void {
    this.scene.start('GameOverScene', { score: score ?? this.score });
  }
}
