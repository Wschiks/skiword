/** WebAudio synthesized sounds. No files. Master toggle in settings. */
let ctx: AudioContext | null = null;
let enabled = true;
let lastCoin = 0;
let coinBudget = 8;

export function setSoundEnabled(v: boolean) { enabled = v; }
export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') void ctx.resume(); return; }
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (AC) ctx = new AC();
  } catch { ctx = null; }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.12, when = 0, slide = 0) {
  if (!ctx || !enabled) return;
  const t0 = ctx.currentTime + when;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(ctx.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

export const sfx = {
  coin() {
    const now = performance.now();
    coinBudget = Math.min(8, coinBudget + ((now - lastCoin) / 1000) * 8);
    lastCoin = now;
    if (coinBudget < 1) return;
    coinBudget--;
    tone(1180, 0.09, 'square', 0.04); tone(1580, 0.12, 'square', 0.035, 0.05);
  },
  buy() { tone(523, 0.12, 'triangle', 0.14); tone(784, 0.18, 'triangle', 0.14, 0.08); },
  error() { tone(150, 0.16, 'sawtooth', 0.09, 0, -40); },
  horn() { tone(220, 0.5, 'sawtooth', 0.09); tone(277, 0.5, 'sawtooth', 0.08); },
  fanfare() { tone(523, 0.16, 'triangle', 0.15); tone(659, 0.16, 'triangle', 0.15, 0.14); tone(784, 0.36, 'triangle', 0.16, 0.28); },
  tap() { tone(700, 0.04, 'sine', 0.05); },
};

export function haptic(kind: 'light' | 'medium' = 'light') {
  try {
    const cap = (window as any).Capacitor?.Plugins?.Haptics;
    if (cap?.impact) { cap.impact({ style: kind === 'light' ? 'LIGHT' : 'MEDIUM' }); return; }
    navigator.vibrate?.(kind === 'light' ? 8 : 16);
  } catch { /* ignore */ }
}
