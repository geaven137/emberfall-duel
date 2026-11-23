// Synthesised sound: every effect is a WebAudio oscillator, no audio files.
// The context starts on the first user gesture (browser autoplay policy).
let ctx = null;
let master = null;
let muted = false;

export function setMuted(value) {
  muted = value;
  if (master) master.gain.value = value ? 0 : 0.5;
}

export function isMuted() {
  return muted;
}

function audio() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  } catch (e) {
    ctx = null;
  }
  return ctx;
}

/** One tone: `type` wave, `from` to `to` Hz over `seconds`, peaking at `volume`. */
function tone(type, from, to, seconds, volume, delay = 0) {
  const ac = audio();
  if (!ac || muted) return;
  if (ac.state === 'suspended') ac.resume();
  const start = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + seconds);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  osc.connect(gain);
  gain.connect(master);
  osc.start(start);
  osc.stop(start + seconds + 0.05);
}

export const sfx = {
  click() { tone('square', 660, 660, 0.06, 0.08); },
  deal() { tone('sine', 500, 900, 0.12, 0.1); },
  play() { tone('triangle', 300, 700, 0.15, 0.14); },
  hit(big = false) { tone('sine', big ? 160 : 220, 55, big ? 0.35 : 0.2, big ? 0.4 : 0.25); },
  heal() { tone('sine', 520, 780, 0.25, 0.12); tone('sine', 660, 990, 0.25, 0.1, 0.08); },
  surge() { tone('triangle', 880, 1320, 0.18, 0.14); tone('triangle', 1320, 1760, 0.18, 0.1, 0.07); },
  draw() { tone('sine', 700, 1000, 0.08, 0.07); },
  turn() { tone('triangle', 440, 440, 0.1, 0.1); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.35, 0.14, i * 0.13)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => tone('sine', f, f, 0.4, 0.12, i * 0.16)); },
};
