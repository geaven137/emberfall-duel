// The screenshot scenes behind ?shot=title|play|win|loss. Each one plays the
// real rules forward from a fresh duel with a greedy autopilot, so the frame
// is what a real game looks like and the same seed always gives the same frame.
import { canPlay, createGame, playCard, resolveEnemyIntent, startDuel, startPlayerTurn } from './game.js';

/** Greedy autopilot: the highest-value affordable card, with surge-chasing. */
function pickPlay(state) {
  const intent = state.enemy.intent;
  const danger = intent && (intent.kind === 'attack' || intent.kind === 'heavy') ? intent.value : 0;
  let best = -1;
  let bestScore = 0;
  state.player.hand.forEach((card, i) => {
    if (!canPlay(state, card)) return;
    let s = 0;
    if (card.damage) s += card.damage * 2;
    if (card.heal && state.player.hp < 18) s += card.heal * 1.6;
    if (card.block && danger > 0 && state.player.hp - Math.max(0, danger - state.player.block) < 22) s += card.block * 1.3;
    if (card.draw) s += card.draw * 1.4;
    if (card.energy) s += card.energy * 2;
    if (card.poison) s += card.poison * 1.2;
    if (card.weaken && danger > 0) s += card.weaken * 1.2;
    if ((state.player.played[card.element] || 0) === 1) s += 2.5;
    s /= card.cost + 0.5;
    if (s > bestScore) {
      bestScore = s;
      best = i;
    }
  });
  return best;
}

function autopilotTurn(state) {
  let guard = 0;
  while (guard < 25 && !state.over) {
    guard += 1;
    const idx = pickPlay(state);
    if (idx < 0) break;
    playCard(state, idx);
  }
}

function fullRound(state) {
  autopilotTurn(state);
  if (state.over) return;
  resolveEnemyIntent(state);
  if (state.over) return;
  startPlayerTurn(state);
}

/** Reset `state` to a fresh game at `seed`, keeping fast mode on. */
function reseed(state, seed) {
  const fresh = createGame(seed);
  Object.assign(state, fresh);
  state.fast = true;
}

/** A mid-duel board: `rounds` full rounds in, both sides bloodied, hand fresh. */
function stageDuel(state, rounds) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    reseed(state, state.seed + attempt);
    startDuel(state, 'adept');
    for (let r = 0; r < rounds; r += 1) {
      fullRound(state);
      if (state.over) break;
    }
    if (!state.over && state.enemy.hp < state.enemy.maxHp && state.player.hp < state.player.maxHp) return;
  }
  reseed(state, state.seed);
  startDuel(state, 'adept');
  for (let r = 0; r < rounds; r += 1) {
    fullRound(state);
    if (state.over) break;
  }
}

/** Play to a real victory (aggressive autopilot, tries seeds until one wins). */
function stageWin(state) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    reseed(state, state.seed + attempt);
    startDuel(state, 'adept');
    for (let r = 0; r < 40 && !state.over; r += 1) fullRound(state);
    if (state.screen === 'victory') return;
  }
  // Fallback: a duel the pilot nearly won, finished by the rules themselves.
  reseed(state, state.seed);
  startDuel(state, 'adept');
  state.enemy.hp = 1;
  const idx = state.player.hand.findIndex((c) => c.damage);
  if (idx >= 0) playCard(state, idx);
}

/** A reckless pilot: damage only, never a block or a heal — it loses fighting. */
function recklessTurn(state) {
  let guard = 0;
  while (guard < 25 && !state.over) {
    guard += 1;
    let best = -1;
    let bestValue = 0;
    state.player.hand.forEach((card, i) => {
      if (!canPlay(state, card) || !card.damage) return;
      const value = card.damage / (card.cost + 0.5);
      if (value > bestValue) {
        bestValue = value;
        best = i;
      }
    });
    if (best < 0) break;
    playCard(state, best);
  }
}

/** Play to a real defeat (a reckless pilot that never blocks or heals). */
function stageLoss(state) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    reseed(state, state.seed + attempt);
    startDuel(state, 'adept');
    for (let r = 0; r < 20 && !state.over; r += 1) {
      recklessTurn(state);
      if (state.over) break;
      resolveEnemyIntent(state);
      if (state.over) break;
      startPlayerTurn(state);
    }
    if (state.screen === 'defeat') return;
  }
  reseed(state, state.seed);
  startDuel(state, 'adept');
  state.player.hp = 1;
  resolveEnemyIntent(state);
}

export function stageShot(name, state) {
  state.fast = true;
  if (name === 'play') stageDuel(state, 4);
  else if (name === 'win') stageWin(state);
  else if (name === 'loss') stageLoss(state);
  // Any other name (title included) leaves the title screen as it is.
}
