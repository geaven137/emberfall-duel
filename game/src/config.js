// Emberfall Duel — tuning, elements and the card pool. One clear job: what the game is.
export const PLAYER_HP = 30;
export const HAND_LIMIT = 8;
export const DRAW_PER_TURN = 5;
export const BASE_ENERGY = 3;
export const MAX_ENERGY = 6;

/** The four elements: told apart by colour AND shape (icon), never by text alone. */
export const ELEMENTS = {
  ember: { name: 'Ember', color: '#e5484d', dark: '#7e1d22', light: '#ffd9da', icon: 'flame', surge: 'Surge: deal 3 damage' },
  tide: { name: 'Tide', color: '#3e9bff', dark: '#124a86', light: '#d8ecff', icon: 'wave', surge: 'Surge: heal 3' },
  thorn: { name: 'Thorn', color: '#46b96a', dark: '#1c5c31', light: '#d9f5e1', icon: 'leaf', surge: 'Surge: gain 4 block' },
  storm: { name: 'Storm', color: '#e8a800', dark: '#7a5800', light: '#ffefc2', icon: 'bolt', surge: 'Surge: gain 1 energy' },
};

/** Simple inline SVG paths (24x24 viewBox) for each element's icon. */
export const ICONS = {
  flame: 'M12 2 C13 6 17 7 17 12 A5 5 0 0 1 7 12 C7 9 9 8 10 6 C10 8 11 9 12 9 C11 6 11 4 12 2 Z',
  wave: 'M2 11 C5 7 8 7 10 10 C12 13 14 13 16 10 C18 7 20 7 22 11 L22 15 C20 12 18 12 16 14 C14 16 12 16 10 14 C8 12 5 12 2 15 Z',
  leaf: 'M12 2 C7 7 5 11 5 15 A7 7 0 0 0 19 15 C19 11 17 7 12 2 Z M12 21 L12 10',
  bolt: 'M13 2 L4 14 H11 L9 22 L20 9 H13 Z',
  shield: 'M12 2 L20 5 V11 C20 16 16 20 12 22 C8 20 4 16 4 11 V5 Z',
  skull: 'M12 2 A8 8 0 0 0 4 10 C4 14 6 16 8 17 L8 21 L10 21 L10 18 L14 18 L14 21 L16 21 L16 17 C18 16 20 14 20 10 A8 8 0 0 0 12 2 Z M9 12 A1.8 1.8 0 1 1 9 8.4 A1.8 1.8 0 0 1 9 12 Z M15 12 A1.8 1.8 0 1 1 15 8.4 A1.8 1.8 0 0 1 15 12 Z',
  sword: 'M4 20 L16 8 M14 4 L20 10 L17 13 L11 7 Z M3 21 L7 17 L9 19 L5 23 Z',
};

/**
 * The card pool: 12 unique cards, 2 copies each in the deck (24 cards).
 * damage / heal / block / draw / energy / poison / weaken are resolved by game.js.
 */
export const CARDS = [
  { id: 'ember-strike', name: 'Ember Strike', element: 'ember', cost: 1, damage: 3, text: 'Deal 3 damage.' },
  { id: 'inferno', name: 'Inferno', element: 'ember', cost: 3, damage: 7, text: 'Deal 7 damage.' },
  { id: 'cinder-jab', name: 'Cinder Jab', element: 'ember', cost: 0, damage: 2, text: 'Deal 2 damage.' },
  { id: 'tidal-mend', name: 'Tidal Mend', element: 'tide', cost: 1, heal: 5, text: 'Heal 5.' },
  { id: 'deep-current', name: 'Deep Current', element: 'tide', cost: 2, draw: 2, heal: 2, text: 'Draw 2. Heal 2.' },
  { id: 'riptide', name: 'Riptide', element: 'tide', cost: 2, damage: 3, draw: 1, text: 'Deal 3. Draw 1.' },
  { id: 'thorn-wall', name: 'Thorn Wall', element: 'thorn', cost: 1, block: 7, text: 'Gain 7 block.' },
  { id: 'briar-trap', name: 'Briar Trap', element: 'thorn', cost: 2, block: 5, poison: 2, text: 'Gain 5 block. Poison 2.' },
  { id: 'root-snare', name: 'Root Snare', element: 'thorn', cost: 1, damage: 2, weaken: 2, text: 'Deal 2. Weaken 2.' },
  { id: 'storm-lash', name: 'Storm Lash', element: 'storm', cost: 1, damage: 3, energy: 1, text: 'Deal 3. Gain 1 energy.' },
  { id: 'thunderhead', name: 'Thunderhead', element: 'storm', cost: 3, damage: 5, draw: 1, text: 'Deal 5. Draw 1.' },
  { id: 'static-burst', name: 'Static Burst', element: 'storm', cost: 0, damage: 1, draw: 1, text: 'Deal 1. Draw 1.' },
];

/** The enemy's face-up cards, shown when it plays its telegraphed intent. */
export const ENEMY_CARDS = {
  attack: { name: "Warden's Cleave", element: 'ember', text: 'A heavy burning slash.' },
  heavy: { name: 'Tempest Smash', element: 'storm', text: 'The charged storm lands.' },
  guard: { name: 'Bulwark Stance', element: 'thorn', text: 'Roots rise into a wall.' },
  hex: { name: 'Hex Bolt', element: 'tide', text: 'Dark water that poisons.' },
  drain: { name: 'Ember Drain', element: 'ember', text: 'The Warden feeds on fire.' },
  channel: { name: 'Storm Channel', element: 'storm', text: 'Power gathers. Brace!' },
};

export const DIFFICULTIES = {
  apprentice: { name: 'Apprentice', enemyHp: 30, rageEvery: 5, channel: false, blurb: 'A gentle first duel.' },
  adept: { name: 'Adept', enemyHp: 42, rageEvery: 4, channel: true, blurb: 'The true duel.' },
  master: { name: 'Master', enemyHp: 50, rageEvery: 3, channel: true, blurb: 'The Warden shows no mercy.' },
};

export const ENEMY_NAME = 'Ashen Warden';
export const GAME_NAME = 'Emberfall Duel';
