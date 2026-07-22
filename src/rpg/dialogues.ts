import { DialogueTree } from './dialogue';

// ── Lyra (companion light-spirit) ──────────────────────────────────────────
export const lyraDialogue: DialogueTree = {
  npcId: 'lyra',
  nodes: [
    {
      id: 'start',
      text: 'Lyra: "Edin… you bleed again. Will you ever learn to dodge?" She hovers beside you, her pale glow casting trembling light on your scarred face.',
      choices: [
        { text: '"Scars prove I survived."', nextNode: 'survive', setFlag: undefined },
        { text: '"Patch me up, spirit."', nextNode: 'heal' },
        { text: '"Tell me what you know about the Brand."', nextNode: 'brand' },
      ],
    },
    {
      id: 'survive',
      text: 'Lyra: "...Sometimes I think the Brand is the only thing keeping you alive. That, and pure stubbornness." She sighs softly.',
      nextNode: 'quest_hook',
    },
    {
      id: 'heal',
      text: 'Lyra: "As always." A warm light pulses from her palms, knitting your wounds. You feel slightly less like dying.',
      nextNode: 'quest_hook',
      // healing happens via setFlag checked in GameScene
    },
    {
      id: 'brand',
      text: 'Lyra: "The sigil on your chest… it is Malakor\'s seal. Each Apostle you slay weakens it. Kill them all before the eclipse, or the Brand consumes your soul entirely."',
      nextNode: 'quest_hook',
    },
    {
      id: 'quest_hook',
      text: 'Lyra: "The first Apostle, the Rotted Shepherd, lurks in the fields to the east. He commands a horde of wraiths. Find the corrupted shard on his corpse." She presses a small rune into your hand.',
      nextNode: null,
    },
  ],
};

export const lyraHealDialogue: DialogueTree = {
  npcId: 'lyra',
  nodes: [
    {
      id: 'start',
      text: 'Lyra: "You look terrible. Let me help." Her light washes over your wounds — you feel strength returning.',
      nextNode: null,
    },
  ],
};

export const lyraWinDialogue: DialogueTree = {
  npcId: 'lyra',
  nodes: [
    {
      id: 'start',
      text: 'Lyra: "You have all five shards, Edin! The gateway to the Eclipse Realm cracks open. Malakor awaits — but so does your freedom. Are you ready?"',
      choices: [
        { text: '"Born ready. Let\'s end this."', nextNode: 'go', setFlag: 'enter_eclipse' },
        { text: '"Give me a moment."', nextNode: null },
      ],
    },
    {
      id: 'go',
      text: 'Lyra: "Then walk forward. I will light your way — even into the dark between worlds."',
      nextNode: null,
    },
  ],
};

// ── Village Elder (quest giver) ────────────────────────────────────────────
export const elderDialogue: DialogueTree = {
  npcId: 'elder',
  nodes: [
    {
      id: 'start',
      text: 'Elder Craw: "Stranger… you bear the Brand. Gods help us, another Marked One." He clutches his walking staff with white knuckles.',
      choices: [
        { text: '"Tell me what happened to this village."', nextNode: 'village' },
        { text: '"Where are the Apostles?"', nextNode: 'apostles' },
        { text: '"I need supplies."', nextNode: 'supplies' },
      ],
    },
    {
      id: 'village',
      text: 'Elder Craw: "Malakor\'s Apostles fell upon us at dusk. They took half our people. Those who remain... are changed. Dark, hollow. The nights bring only screaming now."',
      nextNode: 'end_village',
    },
    {
      id: 'end_village',
      text: 'Elder Craw: "If you have any mercy left in that scarred heart — hunt the Apostles. Destroy them. Bring us silence."',
      nextNode: null,
    },
    {
      id: 'apostles',
      text: 'Elder Craw: "Five have been spotted: the Rotted Shepherd to the east, the Hollow Knight to the north, the Plague Witch near the well, the Iron Beast in the ruins, and the Shadow Weaver at the forest edge. Each carries a Corrupted Shard."',
      nextNode: null,
    },
    {
      id: 'supplies',
      text: 'Elder Craw: "We have nothing left to give. Malakor took everything. Fight on your own blood and spite — it seems to have carried you this far."',
      nextNode: null,
    },
  ],
};

// ── Blacksmith ─────────────────────────────────────────────────────────────
export const smithDialogue: DialogueTree = {
  npcId: 'smith',
  nodes: [
    {
      id: 'start',
      text: 'Gorn the Smith: "That blade of yours is barely holding together. Let me reinforce it. Give me the word and I\'ll put an edge on it that\'ll cut through anything Malakor throws at you."',
      choices: [
        { text: '"Reinforce my blade." [costs nothing]', nextNode: 'forge', setFlag: 'blade_forged' },
        { text: '"Tell me about the Berserker Armor."', nextNode: 'armor' },
        { text: '"Not now."', nextNode: null },
      ],
    },
    {
      id: 'forge',
      text: 'Gorn: "Done. Iron and rage — best alloy there is. Go bring me those Apostle corpses and I\'ll make you something legendary."',
      nextNode: null,
    },
    {
      id: 'armor',
      text: 'Gorn: "They say the Berserker Armor keeps you alive by sheer force of will — but each time it saves you, it costs something. Your sanity, perhaps. Or your humanity." He hammers in silence for a moment.',
      nextNode: null,
    },
  ],
};
