import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

// RPG MODULE — dialogue trees. A tree is plain JSON, so it can live in a .ts file as a typed
// constant: nodes with text and either `choices` (branch) or `nextNode` (linear). A choice can
// set a quest flag when picked; nextNode null (or a missing id) ends the dialogue.
export interface DialogueChoice {
  text: string;
  nextNode: string | null;
  setFlag?: string;
}
export interface DialogueNode {
  id: string;
  text: string;
  nextNode?: string | null;
  choices?: DialogueChoice[];
}
export interface DialogueTree {
  npcId: string;
  nodes: DialogueNode[];
}

// Walks a tree from its first node: advance() for linear nodes, choose(i) for branches.
// Picked flags are written into the record you pass (persist it via save.ts questFlags).
export class DialogueRunner {
  private node: DialogueNode | null;
  constructor(private tree: DialogueTree, private flags: Record<string, boolean>) {
    this.node = tree.nodes[0] ?? null;
  }
  get current(): DialogueNode | null { return this.node; }
  get done(): boolean { return this.node === null; }
  advance(): void {
    if (!this.node || (this.node.choices && this.node.choices.length > 0)) return;
    this.goto(this.node.nextNode ?? null);
  }
  choose(index: number): void {
    const c = this.node?.choices?.[index];
    if (!c) return;
    if (c.setFlag) this.flags[c.setFlag] = true;
    this.goto(c.nextNode);
  }
  private goto(id: string | null): void {
    this.node = id ? this.tree.nodes.find(n => n.id === id) ?? null : null;
  }
}

// Minimal dialogue box: bottom panel with the node text and numbered choices. Choices are
// picked with keys 1-9 (wired here); linear nodes advance via advance() — call it from the
// scene's update() on interactPressed(). While isOpen, pause movement/combat in your update().
export class DialogueBox {
  private panel: Phaser.GameObjects.Rectangle;
  private text: Phaser.GameObjects.Text;
  private runner: DialogueRunner | null = null;
  private onClose?: () => void;

  constructor(scene: Phaser.Scene) {
    const h = Math.max(110, Math.floor(GAME_HEIGHT * 0.24));
    this.panel = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - h / 2 - 8, GAME_WIDTH - 16, h, 0x000000, 0.82)
      .setStrokeStyle(2, 0xffffff, 0.35).setScrollFactor(0).setDepth(1000).setVisible(false);
    this.text = scene.add.text(20, GAME_HEIGHT - h - 2, '', {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffffff',
      wordWrap: { width: GAME_WIDTH - 56 },
    }).setScrollFactor(0).setDepth(1001).setVisible(false);
    scene.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      const n = Number(ev.key);
      if (this.runner && Number.isInteger(n) && n >= 1 && n <= 9) {
        this.runner.choose(n - 1);
        this.refresh();
      }
    });
  }

  get isOpen(): boolean { return this.runner !== null; }

  open(tree: DialogueTree, flags: Record<string, boolean>, onClose?: () => void): void {
    this.runner = new DialogueRunner(tree, flags);
    this.onClose = onClose;
    this.refresh();
  }

  // Advance a linear node (no-op while the box is waiting on a numbered choice).
  advance(): void {
    if (!this.runner) return;
    const node = this.runner.current;
    if (node?.choices && node.choices.length > 0) return;
    this.runner.advance();
    this.refresh();
  }

  close(): void {
    if (!this.runner && !this.panel.visible) return;
    this.runner = null;
    this.panel.setVisible(false);
    this.text.setVisible(false);
    this.onClose?.();
  }

  private refresh(): void {
    if (!this.runner || this.runner.done) { this.close(); return; }
    const node = this.runner.current!;
    const lines = [node.text];
    if (node.choices && node.choices.length > 0) {
      lines.push('');
      node.choices.forEach((c, i) => lines.push(`  ${i + 1}. ${c.text}`));
    } else {
      lines.push('', '[interact to continue]');
    }
    this.panel.setVisible(true);
    this.text.setText(lines.join('\n')).setVisible(true);
  }
}