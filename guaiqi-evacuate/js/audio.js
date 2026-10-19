/**
 * Soft warm WebAudio — short sine / triangle blips, no asset pack.
 * Master gain stays low. Sound off = silence (and no vibrate).
 */
let ctx = null;
let master = null;
let enabled = true;
const lastAt = Object.create(null);
const MASTER = 0.32;

function ac() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = enabled ? MASTER : 0;
    const warm = ctx.createBiquadFilter();
    warm.type = 'lowpass';
    warm.frequency.value = 2600;
    warm.Q.value = 0.45;
    master.connect(warm);
    warm.connect(ctx.destination);
  }
  return ctx;
}

export function setSoundEnabled(on) {
  enabled = !!on;
  if (master && ctx) {
    master.gain.setValueAtTime(enabled ? MASTER : 0, ctx.currentTime);
  }
}

/** Short optional buzz. Off when sound is off, reduced-motion is on, or the device has no vibrator. */
export function softVibrate(ms) {
  if (!enabled) return;
  try {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    navigator.vibrate(Math.max(10, Math.min(40, ms | 0)));
  } catch (_) { /* optional */ }
}

export function resumeAudio() {
  const c = ac();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

function allow(key, gap) {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (lastAt[key] && now - lastAt[key] < gap) return false;
  lastAt[key] = now;
  return true;
}

function later(ms, fn) {
  if (!enabled) return;
  setTimeout(() => { if (enabled) fn(); }, ms);
}

function tone(freq, dur, type = 'sine', gain = 0.02, slideTo = null) {
  if (!enabled) return;
  const c = ac();
  if (!c || !master) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  const t = c.currentTime;
  o.frequency.setValueAtTime(Math.max(40, freq), t);
  if (slideTo != null) {
    o.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t + dur);
  }
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + Math.min(0.018, dur * 0.35));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur = 0.08, gain = 0.015, cutoff = 640) {
  if (!enabled) return;
  const c = ac();
  if (!c || !master) return;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const env = 1 - i / len;
    data[i] = (Math.random() * 2 - 1) * env * env;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  const g = c.createGain();
  const t = c.currentTime;
  g.gain.setValueAtTime(Math.max(0.0002, gain), t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start(t);
}

export const SFX = {
  /** Very quiet tick. Auto-fire is rate-limited so it never becomes a buzz. */
  shoot() {
    if (!allow('shoot', 160)) return;
    tone(560, 0.032, 'sine', 0.007, 400);
  },
  hit() {
    if (!allow('hit', 110)) return;
    tone(230, 0.05, 'triangle', 0.02, 150);
  },
  /** Player contact — own limiter so a swarm of hits cannot swallow it. */
  hurt() {
    if (!allow('hurt', 200)) return;
    tone(150, 0.09, 'sine', 0.032, 80);
    noise(0.06, 0.012, 480);
  },
  kill() {
    if (!allow('kill', 130)) return;
    tone(310, 0.07, 'sine', 0.024, 200);
  },
  crit() {
    if (!allow('crit', 170)) return;
    tone(480, 0.055, 'sine', 0.018, 600);
  },
  gem() {
    if (!allow('gem', 150)) return;
    tone(640, 0.035, 'sine', 0.008, 720);
  },
  level() {
    [392, 494, 587].forEach((f, i) => later(i * 85, () => tone(f, 0.11, 'sine', 0.026)));
  },
  death() {
    tone(120, 0.22, 'sine', 0.04, 64);
    noise(0.16, 0.018, 380);
  },
  click() { tone(470, 0.03, 'sine', 0.018); },
  boss() {
    if (!allow('boss', 500)) return;
    tone(92, 0.18, 'triangle', 0.026, 58);
    noise(0.09, 0.012, 320);
  },
  chest() {
    tone(320, 0.07, 'triangle', 0.026);
    later(70, () => tone(470, 0.1, 'sine', 0.022));
  },
  stageClear() {
    [349, 440, 523].forEach((f, i) => later(i * 130, () => tone(f, 0.15, 'sine', 0.026)));
  },
  announce() {
    if (!allow('ann', 420)) return;
    tone(390, 0.07, 'triangle', 0.014, 490);
  },
  combo() {
    if (!allow('combo', 280)) return;
    tone(520, 0.05, 'sine', 0.016, 640);
  },
  /** Subtle pitch step: common < rare < epic < legendary. */
  gacha(rarity) {
    const pitch = { common: 349, rare: 415, epic: 494, legendary: 587 };
    const f = pitch[rarity] || pitch.common;
    const lift = rarity === 'legendary' || rarity === 'epic' ? 1.25 : 1.16;
    tone(f, 0.1, 'sine', 0.028);
    later(85, () => tone(f * lift, 0.12, 'sine', rarity === 'common' ? 0.016 : 0.024));
  },
};
