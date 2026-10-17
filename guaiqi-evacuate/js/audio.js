/** Punchier WebAudio SFX — no external assets */
let ctx = null;
let enabled = true;

function ac() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

export function setSoundEnabled(on) {
  enabled = !!on;
}

export function resumeAudio() {
  const c = ac();
  if (c && c.state === 'suspended') c.resume();
}

function beep(freq, dur, type = 'sine', gain = 0.04, slideTo = null) {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime);
  if (slideTo != null) {
    o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), c.currentTime + dur);
  }
  g.gain.value = gain;
  o.connect(g);
  g.connect(c.destination);
  const t = c.currentTime;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.start(t);
  o.stop(t + dur);
}

function noiseBurst(dur = 0.06, gain = 0.03) {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(g);
  g.connect(c.destination);
  src.start();
}

export const SFX = {
  shoot() { beep(720, 0.04, 'square', 0.022, 420); },
  hit() { beep(180, 0.07, 'triangle', 0.04, 90); noiseBurst(0.04, 0.025); },
  crit() {
    beep(520, 0.05, 'square', 0.045);
    setTimeout(() => beep(880, 0.08, 'sawtooth', 0.035, 1200), 30);
    noiseBurst(0.05, 0.03);
  },
  gem() { beep(980, 0.07, 'sine', 0.028, 1400); },
  level() {
    beep(523, 0.09, 'sine', 0.05);
    setTimeout(() => beep(659, 0.1, 'sine', 0.05), 70);
    setTimeout(() => beep(784, 0.14, 'sine', 0.045), 150);
  },
  death() { beep(140, 0.4, 'sawtooth', 0.055, 40); },
  click() { beep(480, 0.035, 'square', 0.02); },
  boss() { beep(70, 0.3, 'sawtooth', 0.07, 45); noiseBurst(0.12, 0.04); },
  chest() {
    beep(300, 0.08, 'triangle', 0.04);
    setTimeout(() => beep(600, 0.1, 'sine', 0.04), 60);
    setTimeout(() => beep(900, 0.12, 'sine', 0.035), 130);
  },
  stageClear() {
    beep(392, 0.12, 'sine', 0.05);
    setTimeout(() => beep(523, 0.12, 'sine', 0.05), 100);
    setTimeout(() => beep(659, 0.12, 'sine', 0.05), 200);
    setTimeout(() => beep(784, 0.22, 'sine', 0.055), 320);
  },
  announce() { beep(440, 0.1, 'triangle', 0.04, 660); },
  combo() { beep(760, 0.06, 'square', 0.03, 1100); },
};
