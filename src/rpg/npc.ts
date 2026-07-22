import Phaser from 'phaser';
import { DialogueTree } from './dialogue';

// RPG MODULE — NPCs. Spawned on a TILE of the map (tilemap-first placement); each carries its
// dialogue tree and a state bag (persist it via save.ts npcState). Talk pattern from update():
//   const npc = nearestNpcInRange(this.player, this.npcs, 40);
//   if (npc && this.interactPressed()) this.dialogue.open(npc.dialogue, this.questFlags);
export interface NpcConfig {
  id: string;
  tileX: number;
  tileY: number;
  texture: string;
  frame?: number;
  dialogue: DialogueTree;
}

export interface Npc {
  id: string;
  sprite: Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
  dialogue: DialogueTree;
  state: Record<string, unknown>;
}

// Place an NPC at the centre of a tile. The body is static — add a collider against the
// player if NPCs should block movement.
export function spawnNpc(scene: Phaser.Scene, map: Phaser.Tilemaps.Tilemap, cfg: NpcConfig): Npc {
  const x = (cfg.tileX + 0.5) * map.tileWidth;
  const y = (cfg.tileY + 0.5) * map.tileHeight;
  const sprite = scene.physics.add.staticSprite(x, y, cfg.texture, cfg.frame);
  return { id: cfg.id, sprite, dialogue: cfg.dialogue, state: {} };
}

// The closest NPC within rangePx of the player, or null — the proximity trigger for dialogue.
export function nearestNpcInRange(
  player: { x: number; y: number }, npcs: Npc[], rangePx: number,
): Npc | null {
  let best: Npc | null = null;
  let bestD = rangePx;
  for (const npc of npcs) {
    const d = Phaser.Math.Distance.Between(player.x, player.y, npc.sprite.x, npc.sprite.y);
    if (d <= bestD) { best = npc; bestD = d; }
  }
  return best;
}