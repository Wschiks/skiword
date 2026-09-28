import Phaser from 'phaser';
import './styles.css';
import { app } from './app';
import { MapScene } from './scene/MapScene';
import { newGame, buyLiftLevel, rebuildLine, buyParkingLevel, buyArea, nextArea, buildLine } from './core/game';
import { loadState } from './core/save';
import { initUI, saveNow } from './ui/ui';
import { setSoundEnabled, setHapticsEnabled } from './ui/sound';
import { initAds } from './ads';
import { initPurchases } from './purchases';
import { AUTOSAVE_INTERVAL } from './config/balance';

const params = new URLSearchParams(location.search);
app.debug = params.has('debug');
app.state = (params.has('new') ? null : loadState()) ?? newGame(Math.floor(Math.random() * 1e9));

const host = document.getElementById('game')!;
const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: host,
  width: host.clientWidth || window.innerWidth,
  height: host.clientHeight || window.innerHeight,
  backgroundColor: '#8FC4E8',
  scale: { mode: Phaser.Scale.NONE },
  render: { antialias: true, roundPixels: false, maxTextures: 8 } as never,
  input: { mouse: false, touch: false, keyboard: false, gamepad: false },
  audio: { noAudio: true },
  banner: false,
  scene: [MapScene],
});
(window as any).__game = game;
(window as any).__app = app;

initUI();
setSoundEnabled(app.state.settings.sound);
setHapticsEnabled(app.state.settings.haptics);
void initAds(); void initPurchases();
setInterval(() => saveNow(), AUTOSAVE_INTERVAL * 1000);

app.on('sceneReady', () => {
  document.getElementById('splash')?.classList.add('hide');
  setTimeout(() => document.getElementById('splash')?.remove(), 600);
});

// debug buy keys (M3): L level, R rebuild, P parking, A next area, N new line, M money x10
window.addEventListener('keydown', e => {
  if (!app.debug) return;
  const s = app.state;
  const l = s.lines[0];
  if (e.key === 'l') buyLiftLevel(s, l.id, 'max');
  if (e.key === 'r') rebuildLine(s, l.id);
  if (e.key === 'p') buyParkingLevel(s, 5);
  if (e.key === 'a') { const a = nextArea(s); if (a) buyArea(s, a.id); }
  if (e.key === 'n') { for (const a of s.areasOwned) for (let i = 0; i < 3; i++) if (buildLine(s, a, i, s.unlockedTier).ok) return; }
  if (e.key === 'm') s.money = Math.max(100, s.money * 10);
});

// test / tooling hooks
import * as core from './core/game';
import * as bot from './core/bot';
(window as any).__core = core;
(window as any).__bot = bot;
