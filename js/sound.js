// Arcade sounds, made in code with the Web Audio API: no audio files to download. The audio context
// starts on the first sound, which always follows a click or key press, as browsers require. Sound is
// on by default; the footer switch turns it off and js/memory.js remembers that.

let ctx = null;
let enabled = true;

export const soundOn = () => enabled;
export function setSound(on) {
  enabled = on;
  if (!on && ctx) ctx.suspend();
}

function audio() {
  if (!enabled) return null;
  const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** One tone: frequency in Hz (or [from, to] for a slide), length in s, wave shape, start delay in s. */
function tone(freq, length, { type = 'square', delay = 0, volume = 0.08 } = {}) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  const [from, to] = Array.isArray(freq) ? freq : [freq, freq];
  osc.frequency.setValueAtTime(from, t0);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t0 + length);
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + length);
  osc.connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + length + 0.02);
}

/** A short burst of noise, for sparks and bangs. */
function noise(length, { volume = 0.12, delay = 0 } = {}) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const buffer = a.createBuffer(1, Math.ceil(a.sampleRate * length), a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = a.createBufferSource();
  const gain = a.createGain();
  src.buffer = buffer;
  gain.gain.setValueAtTime(volume, t0);
  src.connect(gain).connect(a.destination);
  src.start(t0);
}

/** The arcade's sound effects, named by what happens. */
export const sfx = {
  blip: () => tone(660, 0.05),
  tag: () => tone([440, 880], 0.08, { type: 'triangle' }),
  untag: () => tone([880, 440], 0.08, { type: 'triangle' }),
  spark: () => { noise(0.35); tone([220, 55], 0.35, { type: 'sawtooth', volume: 0.06 }); },
  /** The gear clicking up one notch. */
  notch: (delay = 0) => tone(1320, 0.03, { delay, volume: 0.05 }),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, { delay: i * 0.09 })),
  start: () => tone([330, 660], 0.12, { type: 'triangle' }),
  /** A bulb leaving a hand, a soft pop where it hits, a dull thud where it does not. */
  lob: () => tone([300, 620], 0.16, { type: 'triangle' }),
  pop: () => { tone([700, 350], 0.14, { type: 'sine', volume: 0.07 }); noise(0.08, { volume: 0.04 }); },
  thud: () => tone([140, 60], 0.12, { type: 'triangle', volume: 0.07 }),
};
