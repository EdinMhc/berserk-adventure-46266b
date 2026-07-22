import { GAME_ID } from '../config';
import { InventoryState } from './inventory';

// RPG MODULE — save state. One localStorage slot per game. saveGame() after meaningful
// progress (quest turn-in, item pickup, area change); loadGame() in create() and restore
// position/inventory/flags when it returns a state; clearSave() on death or "new game".
export interface SaveState {
  playerPos: { x: number; y: number };
  inventory: InventoryState;
  npcState: Record<string, Record<string, unknown>>;
  questFlags: Record<string, boolean>;
}

const SAVE_KEY = `game_${GAME_ID}_save`;

export function saveGame(state: SaveState): void {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* storage blocked/full */ }
}

export function loadGame(): SaveState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw) as SaveState) : null;
  } catch { return null; }
}

export function clearSave(): void {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}