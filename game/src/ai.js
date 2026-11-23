// The Ashen Warden's brain: it picks a telegraphed intent each round, so the
// player can read it and counter — attack into a guard, block into a cleave,
// race a channel before the tempest lands.
import { DIFFICULTIES } from './config.js';

/** Enemy damage bonus from rage: +1 every `rageEvery` rounds. */
export function rageBonus(state) {
  const diff = DIFFICULTIES[state.difficulty];
  return Math.floor((state.round - 1) / diff.rageEvery);
}

/** Base attack growth: the duel escalates as rounds pass. */
function growth(state) {
  return Math.floor((state.round - 1) / 3);
}

/**
 * Choose the enemy's intent for the coming turn. A channelled turn always
 * follows with the heavy tempest smash. Returns { kind, value, label, icon }.
 */
export function chooseIntent(state, rng) {
  const enemy = state.enemy;
  const player = state.player;
  if (state.enemy.channelled) {
    return { kind: 'heavy', value: 11 + growth(state) + rageBonus(state), label: 'Tempest Smash', icon: 'bolt' };
  }
  const diff = DIFFICULTIES[state.difficulty];
  const roll = rng();
  if (enemy.hp <= 12 && roll < 0.45) {
    return { kind: 'drain', value: 6, label: 'Ember Drain', icon: 'flame' };
  }
  if (player.block >= 8 && roll < 0.55) {
    return { kind: 'hex', value: 3, label: 'Hex Bolt + poison 2', icon: 'wave' };
  }
  if (diff.channel && state.round >= 3 && roll < 0.25) {
    return { kind: 'channel', value: 0, label: 'Channeling the storm…', icon: 'bolt' };
  }
  if (roll < 0.45) {
    return { kind: 'guard', value: 10, label: 'Bulwark 8', icon: 'shield' };
  }
  return { kind: 'attack', value: 6 + growth(state) + rageBonus(state), label: 'Cleave', icon: 'sword' };
}
