// Deck, hand and discard: build, shuffle, draw, reshuffle. Pure state, no DOM.
import { CARDS, HAND_LIMIT } from './config.js';
import { shuffle } from './random.js';

/** A fresh 24-card deck: 2 copies of each of the 12 cards, shuffled. */
export function buildDeck(rng) {
  const cards = [];
  for (const card of CARDS) {
    cards.push({ ...card, uid: `${card.id}-a` });
    cards.push({ ...card, uid: `${card.id}-b` });
  }
  return shuffle(cards, rng);
}

/**
 * Draw `count` cards into `pile.hand` from `pile.deck`, reshuffling the discard
 * when the deck runs out. Over the hand limit, drawn cards burn (logged).
 */
export function drawCards(pile, count, rng, log) {
  for (let i = 0; i < count; i += 1) {
    if (pile.deck.length === 0) {
      if (pile.discard.length === 0) return;
      pile.deck = shuffle(pile.discard, rng);
      pile.discard = [];
      log.push('Deck reshuffled.');
    }
    const card = pile.deck.pop();
    if (pile.hand.length >= HAND_LIMIT) {
      pile.discard.push(card);
    } else {
      pile.hand.push(card);
    }
  }
}
