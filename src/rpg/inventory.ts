import Phaser from 'phaser';
import { GAME_HEIGHT } from '../config';

// RPG MODULE — inventory + equipment. Inventory is pure serializable state (save it via
// save.ts with toJSON()/Inventory.from()); InventoryUI renders a slot bar (items + weapon/
// armor/trinket equipment slots) and refreshes itself on every change.
export type EquipSlot = 'weapon' | 'armor' | 'trinket';

export interface Item {
  id: string;
  name: string;
  icon?: string;         // sprite key drawn in the slot; falls back to the name's first letter
  equipSlot?: EquipSlot; // present = equippable
}

export interface InventoryState {
  items: Item[];
  equipment: Partial<Record<EquipSlot, Item>>;
}

export class Inventory {
  items: Item[] = [];
  equipment: Partial<Record<EquipSlot, Item>> = {};
  onChange?: () => void;

  add(item: Item): void { this.items.push(item); this.onChange?.(); }

  remove(itemId: string): Item | null {
    const i = this.items.findIndex(it => it.id === itemId);
    if (i < 0) return null;
    const item = this.items[i];
    this.items.splice(i, 1);
    this.onChange?.();
    return item;
  }

  has(itemId: string): boolean {
    return this.items.some(it => it.id === itemId)
      || Object.values(this.equipment).some(it => it?.id === itemId);
  }

  equip(itemId: string): boolean {
    const item = this.items.find(it => it.id === itemId);
    if (!item || !item.equipSlot) return false;
    const slot = item.equipSlot;
    this.items.splice(this.items.indexOf(item), 1);
    const prev = this.equipment[slot];
    if (prev) this.items.push(prev);
    this.equipment[slot] = item;
    this.onChange?.();
    return true;
  }

  unequip(slot: EquipSlot): void {
    const item = this.equipment[slot];
    if (!item) return;
    delete this.equipment[slot];
    this.items.push(item);
    this.onChange?.();
  }

  toJSON(): InventoryState { return { items: this.items, equipment: this.equipment }; }

  static from(state: InventoryState | null | undefined): Inventory {
    const inv = new Inventory();
    if (state) {
      inv.items = state.items ?? [];
      inv.equipment = state.equipment ?? {};
    }
    return inv;
  }
}

// Bottom-left slot bar: item slots, a gap, then the three equipment slots. Rebuilt on every
// inventory change (it takes over inventory.onChange).
export class InventoryUI {
  private container: Phaser.GameObjects.Container;
  private static readonly ITEM_SLOTS = 6;

  constructor(private scene: Phaser.Scene, private inventory: Inventory) {
    this.container = scene.add.container(12, GAME_HEIGHT - 52).setScrollFactor(0).setDepth(900);
    inventory.onChange = () => this.refresh();
    this.refresh();
  }

  refresh(): void {
    this.container.removeAll(true);
    const size = 40, gap = 6;
    const draw = (index: number, item: Item | undefined, label?: string) => {
      const x = index * (size + gap);
      this.container.add(this.scene.add.rectangle(x, 0, size, size, 0x000000, 0.55)
        .setOrigin(0, 0).setStrokeStyle(1, 0xffffff, 0.4));
      if (item && item.icon && this.scene.textures.exists(item.icon)) {
        this.container.add(this.scene.add.image(x + size / 2, size / 2, item.icon)
          .setDisplaySize(size - 10, size - 10));
      } else if (item) {
        this.container.add(this.scene.add.text(x + size / 2, size / 2, item.name.charAt(0).toUpperCase(), {
          fontFamily: 'monospace', fontSize: '18px', color: '#ffffff',
        }).setOrigin(0.5));
      } else if (label) {
        this.container.add(this.scene.add.text(x + size / 2, size / 2, label, {
          fontFamily: 'monospace', fontSize: '9px', color: '#888888',
        }).setOrigin(0.5));
      }
    };
    for (let i = 0; i < InventoryUI.ITEM_SLOTS; i++) draw(i, this.inventory.items[i]);
    const slots: EquipSlot[] = ['weapon', 'armor', 'trinket'];
    slots.forEach((s, i) =>
      draw(InventoryUI.ITEM_SLOTS + 1 + i, this.inventory.equipment[s], s.slice(0, 3).toUpperCase()));
  }
}