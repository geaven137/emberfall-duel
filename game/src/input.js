// Mouse and keyboard: clicks delegate from the document (the hand is rebuilt
// every render), keys play cards 1-8, Space ends the turn, R restarts, M mutes.
export function bindInput(controller) {
  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-index], #end-turn, #begin-btn, #again-btn, #menu-btn, .diff, #mute-btn');
    if (!target) return;
    if (target.dataset.index !== undefined) {
      controller.onPlayCard(Number(target.dataset.index));
      return;
    }
    if (target.id === 'end-turn') controller.onEndTurn();
    else if (target.id === 'begin-btn') controller.onBegin();
    else if (target.id === 'again-btn') controller.onAgain();
    else if (target.id === 'menu-btn') controller.onMenu();
    else if (target.id === 'mute-btn') controller.onMute();
    else if (target.dataset.diff) controller.onDifficulty(target.dataset.diff);
  });

  document.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key;
    if (key >= '1' && key <= '8') {
      controller.onPlayCard(Number(key) - 1);
      return;
    }
    if (key === ' ' || key === 'Enter') {
      event.preventDefault();
      controller.onConfirm();
      return;
    }
    if (key === 'r' || key === 'R') controller.onAgain();
    if (key === 'm' || key === 'M') controller.onMute();
  });
}
