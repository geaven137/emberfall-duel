// Drawing only: game state in, DOM out. Cards are DOM (crisp at thumbnail
// size), the table is CSS, and every animation is a class the renderer adds
// and clears — the rules never know about the screen.
import { DIFFICULTIES, ELEMENTS, ENEMY_CARDS, ENEMY_NAME, GAME_NAME, ICONS } from './config.js';
import { bestScore, duelScore } from './game.js';

function icon(name, color, size = 20) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${color}" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`;
}

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstChild;
}

/** The card's headline number: damage first, then heal, block, draw. */
function primaryValue(card) {
  if (card.damage) return { n: card.damage, label: 'DMG' };
  if (card.heal) return { n: card.heal, label: 'HEAL' };
  if (card.block) return { n: card.block, label: 'BLOCK' };
  if (card.draw) return { n: card.draw, label: 'DRAW' };
  return { n: '', label: '' };
}

/** Small badges for a card's secondary effects. */
function effectBadges(card) {
  const out = [];
  if (card.draw && !primaryValue(card).label.startsWith('DRAW')) out.push(`DRAW ${card.draw}`);
  if (card.energy) out.push(`+${card.energy} ENERGY`);
  if (card.poison) out.push(`POISON ${card.poison}`);
  if (card.weaken) out.push(`WEAKEN ${card.weaken}`);
  if (card.heal && card.damage) out.push(`HEAL ${card.heal}`);
  if (card.block && card.damage) out.push(`BLOCK ${card.block}`);
  return out.map((b) => `<span class="badge">${b}</span>`).join('');
}

/** A face-up card element. `opts.small` shrinks it for the stage; `opts.playable` glows it. */
export function cardElement(card, opts = {}) {
  const e = ELEMENTS[card.element];
  const v = primaryValue(card);
  const node = el(`
    <div class="card ${opts.small ? 'small' : ''} ${opts.playable ? 'playable' : ''} ${opts.dim ? 'dim' : ''}" data-uid="${card.uid || card.id}">
      <div class="card-head" style="background:${e.color}">
        <span class="cost">${card.cost}</span>
        <span class="card-name">${card.name}</span>
        <span class="card-icon">${icon(e.icon, '#fff', 20)}</span>
      </div>
      <div class="card-art" style="background:${e.light}">
        <span class="art-icon">${icon(e.icon, e.color, 44)}</span>
        ${v.n !== '' ? `<span class="big-value" style="color:${e.dark}">${v.n}<em>${v.label}</em></span>` : ''}
      </div>
      <div class="card-text">${card.text}</div>
      <div class="card-badges">${effectBadges(card)}</div>
      <div class="card-element" style="color:${e.dark}">${icon(e.icon, e.dark, 12)} ${e.name}</div>
    </div>`);
  return node;
}

/** A face-down enemy card back. */
function cardBack() {
  return el(`<div class="card back"><div class="back-sigil">${icon('flame', '#e8b64c', 30)}</div><div class="back-name">${ENEMY_NAME}</div></div>`);
}

function hpBar(side, hp, maxHp, block, poison) {
  const pct = Math.max(0, Math.round((hp / maxHp) * 100));
  return `
    <div class="hp-row">
      <div class="hpbar"><div class="hpfill ${pct <= 30 ? 'low' : ''}" style="width:${pct}%"></div></div>
      <div class="hp-num">${hp} / ${maxHp}</div>
      ${block > 0 ? `<div class="stat-badge block">${icon('shield', '#7ec8ff', 14)} ${block}</div>` : ''}
      ${poison > 0 ? `<div class="stat-badge poison">${icon('wave', '#7be382', 14)} ${poison}</div>` : ''}
    </div>`;
}

function intentBadge(intent) {
  if (!intent) return '<div class="intent none">No intent</div>';
  const cls = intent.kind === 'guard' ? 'guard' : intent.kind === 'hex' ? 'hex' : intent.kind === 'drain' ? 'drain' : intent.kind === 'channel' ? 'channel' : 'attack';
  const value = intent.kind === 'channel' ? '!' : intent.value;
  return `
    <div class="intent ${cls}">
      <div class="intent-label">NEXT MOVE</div>
      <div class="intent-main">${icon(intent.icon, '#fff', 22)} <span class="intent-value">${value}</span></div>
      <div class="intent-name">${intent.label}</div>
    </div>`;
}

function surgePips(player) {
  return Object.keys(ELEMENTS).map((key) => {
    const e = ELEMENTS[key];
    const played = player.played[key] || 0;
    const surged = !!player.surged[key];
    return `<div class="surge ${surged ? 'surged' : ''}" title="${e.surge}">
      ${icon(e.icon, e.color, 18)}
      <span class="pip ${played >= 1 ? 'on' : ''}" style="--c:${e.color}"></span>
      <span class="pip ${played >= 2 ? 'on' : ''}" style="--c:${e.color}"></span>
    </div>`;
  }).join('');
}

/** Build the static table skeleton once. */
export function buildTable() {
  document.body.innerHTML = `
  <div id="table">
    <div id="enemy-zone">
      <div class="duelist enemy">
        <div class="portrait enemy-portrait">${icon('skull', '#e8b64c', 34)}</div>
        <div class="duelist-info">
          <div class="duelist-name">${ENEMY_NAME} <span id="rage"></span></div>
          <div id="enemy-hp"></div>
        </div>
        <div id="enemy-intent"></div>
      </div>
      <div id="enemy-hand"></div>
    </div>
    <div id="mid-zone">
      <div id="round-box"><div id="round">ROUND 1</div><div id="score">SCORE 0</div></div>
      <div id="stage"><div class="stage-emblem">${icon('flame', 'rgba(232,182,76,.35)', 64)}</div></div>
      <div id="surge-box"><div class="surge-title">SURGE — play 2 of an element</div><div id="surges"></div></div>
      <div id="log"></div>
    </div>
    <div id="player-zone">
      <div class="player-hud">
        <div class="duelist player">
          <div class="portrait player-portrait">${icon('flame', '#ffd9da', 30)}</div>
          <div class="duelist-info">
            <div class="duelist-name">You</div>
            <div id="player-hp"></div>
          </div>
          <div id="energy"></div>
        </div>
        <div id="controls">
          <div id="piles"></div>
          <button id="end-turn">End Turn <kbd>Space</kbd></button>
          <button id="mute-btn" title="Mute (M)">Sound: On</button>
        </div>
      </div>
      <div id="hand"></div>
    </div>
  </div>
  <div id="title-screen">
    <div class="title-inner">
      <div class="title-mark">${icon('flame', '#e8b64c', 54)}</div>
      <h1>${GAME_NAME}</h1>
      <p class="tagline">An elemental card duel. Outplay the Ashen Warden — read its next move, chain your surges, and burn it down.</p>
      <div class="howto">
        <span><b>1</b> Click a card to play it (keys 1–8)</span>
        <span><b>2</b> Two cards of one element trigger a <b>Surge</b></span>
        <span><b>3</b> Watch the Warden's <b>Next Move</b> — and counter it</span>
      </div>
      <div id="diff-row"></div>
      <button id="begin-btn">Begin the Duel</button>
      <div id="best-line"></div>
    </div>
  </div>
  <div id="end-screen" class="hidden"><div class="end-inner" id="end-inner"></div></div>
  <div id="floaters"></div>
  <div id="confetti"></div>
  <p id="status" role="status" aria-live="polite"></p>`;
}

let lastScreen = null;

/** Repaint everything dynamic from the state. `opts.deal` staggers the hand in. */
export function renderAll(state, opts = {}) {
  const table = document.getElementById('table');
  const title = document.getElementById('title-screen');
  const end = document.getElementById('end-screen');
  title.classList.toggle('hidden', state.screen !== 'title');
  table.classList.toggle('hidden', state.screen === 'title');
  end.classList.toggle('hidden', state.screen !== 'victory' && state.screen !== 'defeat');
  if (state.screen === 'title') {
    renderTitle(state);
    lastScreen = 'title';
    return;
  }
  if ((state.screen === 'victory' || state.screen === 'defeat') && lastScreen !== state.screen) {
    renderEnd(state);
  }
  lastScreen = state.screen;

  document.getElementById('enemy-hp').innerHTML = hpBar('enemy', state.enemy.hp, state.enemy.maxHp, state.enemy.block, state.enemy.poison);
  document.getElementById('player-hp').innerHTML = hpBar('player', state.player.hp, state.player.maxHp, state.player.block, state.player.poison);
  document.getElementById('rage').textContent = '';
  document.getElementById('enemy-intent').innerHTML = intentBadge(state.enemy.intent);
  document.getElementById('round').textContent = `ROUND ${state.round}`;
  document.getElementById('score').textContent = `SCORE ${duelScore(state)}`;
  document.getElementById('surges').innerHTML = surgePips(state.player);
  document.getElementById('log').innerHTML = state.log.slice(-3).map((l) => `<div>${l}</div>`).join('');

  const energy = document.getElementById('energy');
  energy.innerHTML = `<span class="energy-label">ENERGY</span>` + Array.from({ length: state.player.maxEnergy }, (_, i) =>
    `<span class="energy-pip ${i < state.player.energy ? 'on' : ''}">${icon('bolt', i < state.player.energy ? '#ffd23e' : '#4a4a55', 20)}</span>`).join('')
    + `<span class="energy-num">${state.player.energy}/${state.player.maxEnergy}</span>`;

  const eh = document.getElementById('enemy-hand');
  eh.innerHTML = '';
  for (let i = 0; i < state.enemy.handCount; i += 1) {
    const back = cardBack();
    back.classList.add('mini');
    back.style.setProperty('--rot', `${(i - 1) * 6}deg`);
    back.style.setProperty('--ty', `${Math.abs(i - 1) * 4}px`);
    eh.appendChild(back);
  }
  eh.insertAdjacentHTML('beforeend', `<div class="hand-count">${state.enemy.handCount} cards</div>`);

  const hand = document.getElementById('hand');
  hand.innerHTML = '';
  const n = state.player.hand.length;
  state.player.hand.forEach((card, i) => {
    const playable = state.phase === 'player' && !state.over && card.cost <= state.player.energy;
    const node = cardElement(card, { playable, dim: !playable });
    node.dataset.index = String(i);
    const off = i - (n - 1) / 2;
    node.style.setProperty('--rot', `${off * 3.5}deg`);
    node.style.setProperty('--ty', `${Math.abs(off) * 5}px`);
    if (opts.deal) {
      node.classList.add('deal-in');
      node.style.animationDelay = `${i * 70}ms`;
    }
    hand.appendChild(node);
  });

  document.getElementById('piles').innerHTML = `Deck: ${state.player.deck.length} &nbsp;·&nbsp; Discard: ${state.player.discard.length}`;
  const endBtn = document.getElementById('end-turn');
  endBtn.disabled = state.phase !== 'player' || state.over;
  document.getElementById('mute-btn').textContent = state.muted ? 'Sound: Off' : 'Sound: On';
  document.getElementById('status').textContent = state.log[state.log.length - 1] || '';
}

function renderTitle(state) {
  const row = document.getElementById('diff-row');
  if (!row) return;
  row.innerHTML = Object.entries({ apprentice: 'Apprentice', adept: 'Adept', master: 'Master' }).map(([key, name]) => {
    const d = { hp: DIFFICULTIES[key].enemyHp, blurb: DIFFICULTIES[key].blurb };
    return `<button class="diff ${state.difficulty === key ? 'selected' : ''}" data-diff="${key}">
      <span class="diff-name">${name}</span><span class="diff-hp">Warden ${d.hp} HP</span><span class="diff-blurb">${d.blurb}</span>
    </button>`;
  }).join('');
  const best = bestScore();
  document.getElementById('best-line').textContent = best > 0 ? `Best score: ${best}` : 'No duels won yet — the Warden awaits.';
}

function renderEnd(state) {
  const win = state.screen === 'victory';
  const score = duelScore(state);
  if (win) saveBestScore(score);
  document.getElementById('end-inner').innerHTML = `
    <div class="end-mark">${icon(win ? 'flame' : 'skull', win ? '#e8b64c' : '#8a8a95', 54)}</div>
    <h2 class="${win ? 'win' : 'lose'}">${win ? 'VICTORY' : 'DEFEAT'}</h2>
    <p class="end-sub">${win ? 'The Ashen Warden falls. The embers are yours.' : 'The Warden stands. The embers wait for a rematch.'}</p>
    <div class="end-score">SCORE <b>${score}</b>${score >= bestScore() && score > 0 ? ' <span class="new-best">NEW BEST</span>' : ''}</div>
    <div class="stats-grid">
      <div><span>Damage dealt</span><b>${state.stats.damageDealt}</b></div>
      <div><span>Cards played</span><b>${state.stats.cardsPlayed}</b></div>
      <div><span>Turns</span><b>${state.stats.turns + 1}</b></div>
      <div><span>HP remaining</span><b>${state.player.hp}</b></div>
    </div>
    <div class="end-btns">
      <button id="again-btn">${win ? 'Duel Again' : 'Try Again'}</button>
      <button id="menu-btn">Title</button>
    </div>`;
  if (win) confetti(state.fast);
}

function saveBestScore(score) {
  try {
    const prev = Number(localStorage.getItem('emberfall-best') || 0);
    if (score > prev) localStorage.setItem('emberfall-best', String(score));
  } catch (e) { /* no storage */ }
}

/** A played card appears centre-stage, then fades. Skipped in fast (screenshot) mode. */
export function showPlayedCard(card, opts = {}) {
  const stage = document.getElementById('stage');
  if (!stage) return;
  stage.querySelectorAll('.card').forEach((c) => c.remove());
  const node = cardElement(card, { small: true });
  node.classList.add(opts.flip ? 'flip-in' : 'stage-in');
  stage.appendChild(node);
  window.setTimeout(() => node.remove(), 1000);
}

export function clearStage() {
  const stage = document.getElementById('stage');
  if (stage) stage.querySelectorAll('.card').forEach((c) => c.remove());
}

/** A floating combat number over a side of the table. Skipped in fast mode. */
export function floatText(side, text, cls) {
  if (document.body.classList.contains('fast')) return;
  const zone = document.getElementById(side === 'enemy' ? 'enemy-zone' : 'player-zone');
  if (!zone) return;
  const box = document.getElementById('floaters');
  const rect = zone.getBoundingClientRect();
  const span = el(`<span class="floater ${cls}">${text}</span>`);
  span.style.left = `${rect.left + rect.width / 2 + (Math.random() * 60 - 30)}px`;
  span.style.top = `${rect.top + rect.height / 2}px`;
  box.appendChild(span);
  window.setTimeout(() => span.remove(), 1100);
}

export function shake() {
  if (document.body.classList.contains('fast')) return;
  const table = document.getElementById('table');
  table.classList.remove('shake');
  void table.offsetWidth;
  table.classList.add('shake');
  window.setTimeout(() => table.classList.remove('shake'), 400);
}

/** Confetti burst for a win. In fast mode the pieces sit frozen mid-fall. */
export function confetti(fast = false) {
  const box = document.getElementById('confetti');
  if (!box) return;
  box.innerHTML = '';
  const colors = ['#e5484d', '#3e9bff', '#46b96a', '#f2b705', '#e8b64c', '#ffffff'];
  for (let i = 0; i < 90; i += 1) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colors[i % colors.length];
    if (fast) {
      p.style.top = `${Math.random() * 70}%`;
      p.style.transform = `rotate(${Math.random() * 360}deg)`;
      p.style.animation = 'none';
    } else {
      p.style.animationDelay = `${Math.random() * 0.8}s`;
      p.style.animationDuration = `${1.6 + Math.random() * 1.4}s`;
    }
    box.appendChild(p);
  }
  if (!fast) window.setTimeout(() => { box.innerHTML = ''; }, 4000);
}
