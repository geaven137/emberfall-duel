// The duel's rules and state, with no drawing and no browser in it: turns,
// combat, surges, poison, weaken, block and the win/loss. Every function
// returns the events it caused, so the renderer and the sounds can react;
// the controller sequences them with delays, the screenshot staging runs
// them back to back.
import { BASE_ENERGY, DIFFICULTIES, DRAW_PER_TURN, ELEMENTS, ENEMY_NAME, MAX_ENERGY, PLAYER_HP } from './config.js';
import { buildDeck, drawCards } from './deck.js';
import { chooseIntent } from './ai.js';
import { makeRng } from './random.js';

export function energyForRound(round) {
  return Math.min(MAX_ENERGY, BASE_ENERGY + Math.floor((round - 1) / 3));
}

function freshSide(hp) {
  return { hp, maxHp: hp, block: 0, poison: 0 };
}

/** A fresh game on the title screen; call startDuel to begin. */
export function createGame(seed) {
  return {
    seed,
    rng: makeRng(seed),
    screen: 'title',
    difficulty: 'adept',
    round: 1,
    phase: 'title',
    player: { ...freshSide(PLAYER_HP), energy: BASE_ENERGY, maxEnergy: BASE_ENERGY, deck: [], hand: [], discard: [], played: {}, surged: {} },
    enemy: { ...freshSide(DIFFICULTIES.adept.enemyHp), weaken: 0, channelled: false, intent: null, handCount: 3 },
    log: [],
    stats: { damageDealt: 0, cardsPlayed: 0, turns: 0, healed: 0 },
    over: false,
    fast: false,
    muted: false,
  };
}

function applyDamage(state, side, amount) {
  const target = side === 'player' ? state.player : state.enemy;
  const absorbed = Math.min(target.block, amount);
  target.block -= absorbed;
  const hurt = amount - absorbed;
  target.hp = Math.max(0, target.hp - hurt);
  if (side === 'enemy') state.stats.damageDealt += hurt;
  return { absorbed, hurt };
}

function checkEnd(state, events) {
  if (state.enemy.hp <= 0 && !state.over) {
    state.over = true;
    state.screen = 'victory';
    state.phase = 'over';
    events.push({ kind: 'victory' });
  } else if (state.player.hp <= 0 && !state.over) {
    state.over = true;
    state.screen = 'defeat';
    state.phase = 'over';
    events.push({ kind: 'defeat' });
  }
}

export function duelScore(state) {
  const s = state.stats;
  return Math.max(0, s.damageDealt + state.player.hp * 2 + s.cardsPlayed - s.turns * 2);
}

export function bestScore() {
  try {
    return Number(localStorage.getItem('emberfall-best') || 0);
  } catch (e) {
    return 0;
  }
}

export function saveBest(score) {
  try {
    if (score > bestScore()) localStorage.setItem('emberfall-best', String(score));
  } catch (e) {
    /* storage unavailable: best score just does not persist */
  }
}

/** Begin a duel at the chosen difficulty: fresh deck, opening hand, first intent. */
export function startDuel(state, difficulty) {
  const diff = DIFFICULTIES[difficulty] || DIFFICULTIES.adept;
  state.difficulty = difficulty;
  state.round = 1;
  state.phase = 'player';
  state.screen = 'play';
  state.over = false;
  state.log = [`The duel begins. ${ENEMY_NAME} awaits.`];
  state.stats = { damageDealt: 0, cardsPlayed: 0, turns: 0, healed: 0 };
  state.player = { ...freshSide(PLAYER_HP), energy: BASE_ENERGY, maxEnergy: BASE_ENERGY, deck: [], hand: [], discard: [], played: {}, surged: {} };
  state.enemy = { ...freshSide(diff.enemyHp), weaken: 0, channelled: false, intent: null, handCount: 3 };
  state.player.deck = buildDeck(state.rng);
  drawCards(state.player, DRAW_PER_TURN, state.rng, state.log);
  state.enemy.intent = chooseIntent(state, state.rng);
}

/** Can the player afford and play this card right now? */
export function canPlay(state, card) {
  return state.screen === 'play' && state.phase === 'player' && !state.over && card.cost <= state.player.energy;
}

/** Trigger an element's surge: the second card of an element in one turn. */
function triggerSurge(state, element, events) {
  const player = state.player;
  if (player.surged[element]) return;
  player.surged[element] = true;
  events.push({ kind: 'surge', element });
  state.log.push(`${ELEMENTS[element].name} surge!`);
  if (element === 'ember') {
    const { hurt } = applyDamage(state, 'enemy', 3);
    events.push({ kind: 'damage', side: 'enemy', amount: 3, hurt, surge: true });
  } else if (element === 'tide') {
    const healed = Math.min(3, player.maxHp - player.hp);
    player.hp += healed;
    state.stats.healed += healed;
    events.push({ kind: 'heal', side: 'player', amount: healed, surge: true });
  } else if (element === 'thorn') {
    player.block += 4;
    events.push({ kind: 'block', side: 'player', amount: 4, surge: true });
  } else if (element === 'storm') {
    player.energy = Math.min(player.maxEnergy + 2, player.energy + 1);
    events.push({ kind: 'energy', amount: 1, surge: true });
  }
}

/** Play the card at `handIndex`; returns { played, events }. No-op when illegal. */
export function playCard(state, handIndex) {
  const events = [];
  const card = state.player.hand[handIndex];
  if (!card || !canPlay(state, card)) return { played: null, events };
  state.player.energy -= card.cost;
  state.player.hand.splice(handIndex, 1);
  state.player.discard.push(card);
  state.stats.cardsPlayed += 1;
  state.log.push(`You play ${card.name}.`);
  if (card.damage) {
    const { hurt, absorbed } = applyDamage(state, 'enemy', card.damage);
    events.push({ kind: 'damage', side: 'enemy', amount: card.damage, hurt, absorbed });
  }
  if (card.heal) {
    const healed = Math.min(card.heal, state.player.maxHp - state.player.hp);
    state.player.hp += healed;
    state.stats.healed += healed;
    events.push({ kind: 'heal', side: 'player', amount: healed });
  }
  if (card.block) {
    state.player.block += card.block;
    events.push({ kind: 'block', side: 'player', amount: card.block });
  }
  if (card.draw) {
    drawCards(state.player, card.draw, state.rng, state.log);
    events.push({ kind: 'draw', count: card.draw });
  }
  if (card.energy) {
    state.player.energy = Math.min(state.player.maxEnergy + 2, state.player.energy + card.energy);
    events.push({ kind: 'energy', amount: card.energy });
  }
  if (card.poison) {
    state.enemy.poison += card.poison;
    events.push({ kind: 'poison', side: 'enemy', stacks: card.poison });
  }
  if (card.weaken) {
    state.enemy.weaken += card.weaken;
    events.push({ kind: 'weaken', amount: card.weaken });
  }
  const played = state.player.played;
  played[card.element] = (played[card.element] || 0) + 1;
  if (played[card.element] >= 2) triggerSurge(state, card.element, events);
  checkEnd(state, events);
  return { played: card, events };
}

/** The enemy's turn: poison ticks, block fades, then it plays its intent. */
export function resolveEnemyIntent(state) {
  const events = [];
  const enemy = state.enemy;
  const player = state.player;
  state.phase = 'enemy';
  enemy.block = 0;
  if (enemy.poison > 0) {
    const { hurt } = applyDamage(state, 'enemy', enemy.poison);
    events.push({ kind: 'poison-tick', side: 'enemy', amount: enemy.poison, hurt });
    enemy.poison = Math.max(0, enemy.poison - 1);
    checkEnd(state, events);
    if (state.over) return events;
  }
  const intent = enemy.intent;
  if (!intent) return events;
  state.log.push(`${ENEMY_NAME} plays ${intent.label}.`);
  events.push({ kind: 'enemy-card', intent });
  if (intent.kind === 'attack' || intent.kind === 'heavy') {
    const raw = Math.max(0, intent.value - enemy.weaken);
    if (enemy.weaken > 0) {
      state.log.push(`Weakened: the blow loses ${enemy.weaken}.`);
      enemy.weaken = 0;
    }
    const { hurt, absorbed } = applyDamage(state, 'player', raw);
    events.push({ kind: 'damage', side: 'player', amount: raw, hurt, absorbed, heavy: intent.kind === 'heavy' });
  } else if (intent.kind === 'guard') {
    enemy.block += intent.value;
    events.push({ kind: 'block', side: 'enemy', amount: intent.value });
  } else if (intent.kind === 'hex') {
    const { hurt } = applyDamage(state, 'player', intent.value);
    player.poison += 2;
    events.push({ kind: 'damage', side: 'player', amount: intent.value, hurt });
    events.push({ kind: 'poison', side: 'player', stacks: 2 });
  } else if (intent.kind === 'drain') {
    const healed = Math.min(intent.value, enemy.maxHp - enemy.hp);
    enemy.hp += healed;
    events.push({ kind: 'heal', side: 'enemy', amount: healed });
  } else if (intent.kind === 'channel') {
    enemy.channelled = true;
    events.push({ kind: 'channel' });
  }
  checkEnd(state, events);
  return events;
}

/** The next player turn: round up, poison ticks, block fades, fresh energy and hand, new intent. */
export function startPlayerTurn(state) {
  const events = [];
  if (state.over) return events;
  state.round += 1;
  state.stats.turns += 1;
  state.phase = 'player';
  const player = state.player;
  player.block = 0;
  if (player.poison > 0) {
    const { hurt } = applyDamage(state, 'player', player.poison);
    events.push({ kind: 'poison-tick', side: 'player', amount: player.poison, hurt });
    player.poison = Math.max(0, player.poison - 1);
    checkEnd(state, events);
    if (state.over) return events;
  }
  player.maxEnergy = energyForRound(state.round);
  player.energy = player.maxEnergy;
  player.played = {};
  player.surged = {};
  drawCards(player, DRAW_PER_TURN, state.rng, state.log);
  state.enemy.intent = chooseIntent(state, state.rng);
  return events;
}
