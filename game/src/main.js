// Boot and the turn controller: wires input to the rules, sequences the
// enemy turn with delays so its card is seen, and turns game events into
// floats, shakes and sounds. ?seed=N fixes the shuffle; ?shot=title|play|
// win|loss stages that screenshot scene with no interaction.
import { ENEMY_CARDS } from './config.js';
import { canPlay, createGame, playCard, resolveEnemyIntent, startDuel, startPlayerTurn } from './game.js';
import { bindInput } from './input.js';
import { buildTable, cardElement, clearStage, floatText, renderAll, shake, showPlayedCard } from './render.js';
import { setMuted, sfx } from './audio.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed')) || (Date.now() % 100000);
const shot = params.get('shot');

const state = createGame(seed);
state.fast = !!shot;
if (shot) document.body.classList.add('fast');
try {
  state.muted = localStorage.getItem('emberfall-muted') === '1';
  setMuted(state.muted);
} catch (e) { /* no storage */ }

buildTable();

/** The enemy's intent as a face-up card for the centre stage. */
function enemyFace(intent) {
  const base = ENEMY_CARDS[intent.kind];
  const face = { ...base, id: `enemy-${intent.kind}`, cost: intent.value, uid: `enemy-${intent.kind}` };
  if (intent.kind === 'attack' || intent.kind === 'heavy') face.damage = intent.value;
  if (intent.kind === 'guard') face.block = intent.value;
  if (intent.kind === 'hex') face.damage = intent.value;
  if (intent.kind === 'drain') face.heal = intent.value;
  return face;
}

/** Turn a batch of game events into floats, shakes and sounds. */
function handleEvents(events) {
  for (const e of events) {
    if (e.kind === 'damage' && e.hurt > 0) {
      floatText(e.side, `-${e.hurt}`, 'dmg');
      if (e.hurt >= 6) shake();
      sfx.hit(e.heavy || e.hurt >= 6);
    } else if (e.kind === 'damage' && e.absorbed > 0) {
      floatText(e.side, 'BLOCKED', 'block');
      sfx.hit(false);
    } else if (e.kind === 'heal' && e.amount > 0) {
      floatText(e.side, `+${e.amount}`, 'heal');
      sfx.heal();
    } else if (e.kind === 'block') {
      floatText(e.side, `+${e.amount} BLOCK`, 'block');
    } else if (e.kind === 'poison') {
      floatText(e.side, `POISON ${e.stacks}`, 'poison');
    } else if (e.kind === 'poison-tick' && e.hurt > 0) {
      floatText(e.side, `-${e.hurt} POISON`, 'poison');
    } else if (e.kind === 'surge') {
      floatText('player', 'SURGE!', 'surge');
      sfx.surge();
    } else if (e.kind === 'draw') {
      sfx.draw();
    } else if (e.kind === 'victory') {
      sfx.win();
    } else if (e.kind === 'defeat') {
      sfx.lose();
    }
  }
}

const controller = {
  onPlayCard(index) {
    if (state.fast || state.over || state.phase !== 'player') return;
    const card = state.player.hand[index];
    if (!card || !canPlay(state, card)) return;
    const { played, events } = playCard(state, index);
    if (!played) return;
    sfx.play();
    showPlayedCard(played);
    handleEvents(events);
    renderAll(state);
  },

  onEndTurn() {
    if (state.fast || state.over || state.phase !== 'player') return;
    sfx.turn();
    state.phase = 'enemy';
    renderAll(state);
    window.setTimeout(() => {
      const events = resolveEnemyIntent(state);
      const cardEvent = events.find((e) => e.kind === 'enemy-card');
      if (cardEvent) showPlayedCard(enemyFace(cardEvent.intent), { flip: true });
      handleEvents(events);
      renderAll(state);
      if (state.over) return;
      window.setTimeout(() => {
        const next = startPlayerTurn(state);
        handleEvents(next);
        clearStage();
        renderAll(state, { deal: true });
        if (!state.over) sfx.deal();
      }, 950);
    }, 450);
  },

  onBegin() {
    sfx.click();
    startDuel(state, state.difficulty);
    renderAll(state, { deal: true });
    sfx.deal();
  },

  onAgain() {
    if (state.screen !== 'victory' && state.screen !== 'defeat') return;
    sfx.click();
    startDuel(state, state.difficulty);
    renderAll(state, { deal: true });
    sfx.deal();
  },

  onMenu() {
    window.location.href = window.location.pathname;
  },

  onDifficulty(key) {
    state.difficulty = key;
    sfx.click();
    renderAll(state);
  },

  onMute() {
    state.muted = !state.muted;
    setMuted(state.muted);
    try {
      localStorage.setItem('emberfall-muted', state.muted ? '1' : '0');
    } catch (e) { /* no storage */ }
    renderAll(state);
  },

  onConfirm() {
    if (state.screen === 'title') controller.onBegin();
    else if (state.screen === 'victory' || state.screen === 'defeat') controller.onAgain();
    else controller.onEndTurn();
  },
};

if (shot) {
  stageShot(shot, state);
  renderAll(state);
} else {
  renderAll(state);
}
bindInput(controller);

// Exposed for play-testing: the page's own state, and a ready flag.
window.__game = state;
window.__ready = true;
export { state };
