/**
 * All game art is drawn in code with the 2D canvas API and baked into Phaser textures at startup.
 * Textures are baked at S x world resolution and displayed scaled by 1/S.
 */
import Phaser from 'phaser';

export const S = 2;
export const GUEST_H = 28;

type Draw = (c: CanvasRenderingContext2D) => void;

export function bakeTexture(scene: Phaser.Scene, key: string, w: number, h: number, draw: Draw, scale = S) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, Math.ceil(w * scale), Math.ceil(h * scale))!;
  const c = tex.getContext();
  c.scale(scale, scale);
  draw(c);
  tex.refresh();
}


/**
 * Shelf-packed texture atlas. Every sprite in the game lives in one texture ('atlas') so the whole
 * depth-sorted scene (pines, rocks, lifts, buildings, guests) renders in about one batch.
 */
export const ATLAS = 'atlas';
class Atlas {
  private x = 2; private y = 2; private rowH = 0;
  private frames: { key: string; x: number; y: number; w: number; h: number }[] = [];
  private tex: Phaser.Textures.CanvasTexture;
  private ctx: CanvasRenderingContext2D;
  constructor(scene: Phaser.Scene, private W = 2048, private H = 1024) {
    if (scene.textures.exists(ATLAS)) scene.textures.remove(ATLAS);
    this.tex = scene.textures.createCanvas(ATLAS, W, H)!;
    this.ctx = this.tex.getContext();
  }
  add(key: string, w: number, h: number, draw: Draw, scale = S) {
    const pw = Math.ceil(w * scale), ph = Math.ceil(h * scale);
    if (this.x + pw + 2 > this.W) { this.x = 2; this.y += this.rowH + 2; this.rowH = 0; }
    if (this.y + ph + 2 > this.H) throw new Error(`atlas full at ${key}`);
    const c = this.ctx;
    c.save();
    c.translate(this.x, this.y);
    c.beginPath(); c.rect(0, 0, pw, ph); c.clip();
    c.scale(scale, scale);
    draw(c);
    c.restore();
    this.frames.push({ key, x: this.x, y: this.y, w: pw, h: ph });
    this.x += pw + 2; this.rowH = Math.max(this.rowH, ph);
  }
  finish() {
    this.tex.refresh();
    for (const f of this.frames) this.tex.add(f.key, 0, f.x, f.y, f.w, f.h);
  }
}

const rr = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
};
const fillRR = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, col: string) => { rr(c, x, y, w, h, r); c.fillStyle = col; c.fill(); };

export const SKI_COLORS = ['#F0424F', '#2F8BEA', '#FF8A2B', '#33B865', '#FFC526', '#9B5BE0'];
export const BOARD_COLORS = ['#18B79C', '#FF5C9A', '#8FCB2E', '#2E4A6B', '#D13FB0', '#33B5FF'];
const SKIN = ['#F7CBA1', '#E0A66E', '#B57A52', '#F9DCC3'];
export const CAR_COLORS = ['#F5C518', '#E5453A', '#F4F6F8', '#2F8BEA', '#33B865', '#FF8A2B', '#7E8A99', '#9B5BE0'];
export const CAR_VARIANTS = CAR_COLORS.length;

/** soft blue-grey ground shadow used by every object so things sit on the snow */
const SHADOW = 'rgba(96,128,176,0.30)';
const shadowEllipse = (c: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, a = 0.30) => {
  c.fillStyle = `rgba(96,128,176,${a})`; c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); c.fill();
};
/** shadow of a box cast toward the lower right */
const shadowBox = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, dx: number, dy: number) => {
  c.fillStyle = SHADOW; c.beginPath();
  c.moveTo(x, y + h); c.lineTo(x + dx, y + h + dy); c.lineTo(x + w + dx, y + h + dy); c.lineTo(x + w + dx, y + dy); c.lineTo(x + w, y + h); c.closePath(); c.fill();
};

// ---------- guests ----------
function drawGuest(c: CanvasRenderingContext2D, kind: 'ski' | 'board', col: string, frame: number, id: number) {
  const bob = frame === 0 ? 0 : 0.8;
  const skin = SKIN[id % SKIN.length];
  const cx = 15;
  shadowEllipse(c, cx + 2, 27.6, 10, 2.2, 0.32);
  if (kind === 'ski') {
    c.strokeStyle = '#2B3440'; c.lineWidth = 1.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx - 11, 27.4); c.lineTo(cx + 11, 27.4); c.stroke();
    c.beginPath(); c.moveTo(cx - 11, 25.8); c.lineTo(cx + 11, 25.8); c.stroke();
    c.strokeStyle = col; c.lineWidth = 1;
    c.beginPath(); c.moveTo(cx - 9, 27.4); c.lineTo(cx + 9, 27.4); c.stroke();
    c.strokeStyle = '#7E8FA3'; c.lineWidth = 1;
    const pa = frame === 0 ? 4 : 7;
    c.beginPath(); c.moveTo(cx - 5, 15); c.lineTo(cx - 10 - pa * 0.3, 26.5); c.stroke();
    c.beginPath(); c.moveTo(cx + 5, 15); c.lineTo(cx + 10 + pa * 0.3, 25.5); c.stroke();
  } else {
    fillRR(c, cx - 11, 25.4, 22, 3.2, 1.6, '#26313F');
    fillRR(c, cx - 8, 26, 16, 1.7, 0.8, col);
  }
  c.strokeStyle = '#2B3440'; c.lineWidth = 3.4; c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx - 2, 19 + bob * 0.3); c.lineTo(cx - 3.2, 25); c.stroke();
  c.beginPath(); c.moveTo(cx + 2, 19 + bob * 0.3); c.lineTo(cx + 3.2 + (frame ? 0.8 : 0), 25); c.stroke();
  // chunky puffy jacket
  fillRR(c, cx - 5.6, 9 + bob * 0.4, 11.2, 12, 4, col);
  c.fillStyle = 'rgba(0,0,0,0.14)'; c.fillRect(cx - 5.6, 17.4 + bob * 0.4, 11.2, 3.4);
  c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(cx - 5.6, 14.6 + bob * 0.4, 11.2, 1.5);
  c.strokeStyle = col; c.lineWidth = 2.8;
  if (kind === 'board') {
    const a = frame === 0 ? 0 : 2;
    c.beginPath(); c.moveTo(cx - 4, 12 + bob * 0.4); c.lineTo(cx - 9, 15 + a); c.stroke();
    c.beginPath(); c.moveTo(cx + 4, 12 + bob * 0.4); c.lineTo(cx + 9, 14 - a * 0.5); c.stroke();
  } else {
    c.beginPath(); c.moveTo(cx - 4, 12 + bob * 0.4); c.lineTo(cx - 6.2, 16); c.stroke();
    c.beginPath(); c.moveTo(cx + 4, 12 + bob * 0.4); c.lineTo(cx + 6.2, 15.5); c.stroke();
  }
  // big head with a beanie / helmet
  c.fillStyle = skin; c.beginPath(); c.arc(cx, 6 + bob * 0.4, 4.4, 0, Math.PI * 2); c.fill();
  c.fillStyle = kind === 'ski' ? '#FFFFFF' : col;
  c.beginPath(); c.arc(cx, 5 + bob * 0.4, 4.6, Math.PI, Math.PI * 2); c.fill();
  c.fillStyle = kind === 'ski' ? col : '#FFFFFF'; c.fillRect(cx - 4.6, 4.8 + bob * 0.4, 9.2, 1.4);
  if (kind === 'board') { c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(cx, 0.7 + bob * 0.4, 1.5, 0, Math.PI * 2); c.fill(); }
  else { c.fillStyle = '#1C2530'; c.fillRect(cx - 3.4, 6 + bob * 0.4, 6.8, 1.7); }
}

export function guestKey(kind: 'ski' | 'board', color: number, frame: number) { return `g_${kind}_${color}_${frame}`; }

// ---------- nature ----------
function pine(c: CanvasRenderingContext2D, w: number, h: number, tone: number) {
  shadowEllipse(c, w * 0.68, h * 0.965, w * 0.5, h * 0.055);
  c.fillStyle = '#7A4E2D'; c.fillRect(w / 2 - w * 0.07, h * 0.80, w * 0.14, h * 0.17);
  const greens = [['#4DBB6B', '#2E9152'], ['#43B064', '#2A8A4D'], ['#55C275', '#32985A']][tone % 3];
  for (let i = 0; i < 3; i++) {
    const y0 = h * (0.02 + i * 0.245), y1 = y0 + h * 0.46, half = w * (0.25 + i * 0.125);
    c.fillStyle = greens[0];
    c.beginPath(); c.moveTo(w / 2, y0); c.lineTo(w / 2 + half, y1); c.quadraticCurveTo(w / 2, y1 + h * 0.05, w / 2 - half, y1); c.closePath(); c.fill();
    c.fillStyle = greens[1];
    c.beginPath(); c.moveTo(w / 2, y0); c.lineTo(w / 2 + half, y1); c.quadraticCurveTo(w / 2 + half * 0.5, y1 + h * 0.035, w / 2, y1 + h * 0.03); c.closePath(); c.fill();
    // snow cap with scalloped edge
    const cap = (y1 - y0) * 0.52;
    c.fillStyle = '#FFFFFF';
    c.beginPath(); c.moveTo(w / 2, y0);
    c.lineTo(w / 2 + half * 0.5, y0 + cap);
    c.quadraticCurveTo(w / 2 + half * 0.32, y0 + cap + h * 0.05, w / 2 + half * 0.16, y0 + cap);
    c.quadraticCurveTo(w / 2, y0 + cap + h * 0.06, w / 2 - half * 0.16, y0 + cap);
    c.quadraticCurveTo(w / 2 - half * 0.32, y0 + cap + h * 0.05, w / 2 - half * 0.5, y0 + cap);
    c.closePath(); c.fill();
    c.fillStyle = '#D5E5F6';
    c.beginPath(); c.moveTo(w / 2, y0); c.lineTo(w / 2 + half * 0.5, y0 + cap); c.quadraticCurveTo(w / 2 + half * 0.3, y0 + cap + h * 0.04, w / 2, y0 + cap * 0.9); c.closePath(); c.fill();
  }
}
function bush(c: CanvasRenderingContext2D, w: number, h: number, tone: string) {
  shadowEllipse(c, w * 0.55, h * 0.92, w * 0.46, h * 0.09);
  const blobs: [number, number, number][] = [[0.3, 0.62, 0.26], [0.62, 0.55, 0.3], [0.48, 0.4, 0.26]];
  for (const [x, y, r] of blobs) { c.fillStyle = tone; c.beginPath(); c.arc(w * x, h * y, w * r, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = 'rgba(0,0,0,0.12)'; c.beginPath(); c.arc(w * 0.66, h * 0.62, w * 0.24, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#FFFFFF';
  c.beginPath(); c.ellipse(w * 0.45, h * 0.32, w * 0.24, h * 0.14, -0.2, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(w * 0.26, h * 0.5, w * 0.12, h * 0.08, -0.4, 0, Math.PI * 2); c.fill();
}
function rock(c: CanvasRenderingContext2D, w: number, h: number) {
  shadowEllipse(c, w * 0.58, h * 0.95, w * 0.52, h * 0.08);
  c.fillStyle = '#AFC2D8';
  c.beginPath(); c.moveTo(w * 0.02, h * 0.92); c.lineTo(w * 0.1, h * 0.42); c.lineTo(w * 0.36, h * 0.12); c.lineTo(w * 0.66, h * 0.3); c.lineTo(w * 0.9, h * 0.2); c.lineTo(w * 0.98, h * 0.92); c.closePath(); c.fill();
  c.fillStyle = '#8FA5BF';
  c.beginPath(); c.moveTo(w * 0.6, h * 0.3); c.lineTo(w * 0.9, h * 0.2); c.lineTo(w * 0.98, h * 0.92); c.lineTo(w * 0.5, h * 0.92); c.closePath(); c.fill();
  c.fillStyle = '#FFFFFF';
  c.beginPath(); c.moveTo(w * 0.36, h * 0.12); c.lineTo(w * 0.66, h * 0.3); c.lineTo(w * 0.54, h * 0.44); c.lineTo(w * 0.3, h * 0.36); c.lineTo(w * 0.14, h * 0.4); c.closePath(); c.fill();
}

// ---------- buildings ----------
interface HouseOpts { wall: string; wall2?: string; fascia: string; win?: number; floors?: number; sign?: string; awning?: boolean; chimney?: boolean; glass?: boolean; lights?: boolean }
function house(c: CanvasRenderingContext2D, w: number, h: number, o: HouseOpts) {
  const floors = o.floors ?? 1;
  const roofTop = h * 0.04, roofH = h * 0.24;
  const wallY = roofTop + roofH * 0.85, wallH = h - wallY - 3;
  shadowBox(c, w * 0.06, wallY, w * 0.88, wallH, w * 0.13, h * 0.05);
  // wall
  fillRR(c, w * 0.05, wallY, w * 0.9, wallH, 3, o.wall);
  c.fillStyle = o.wall2 ?? 'rgba(0,0,0,0.12)'; c.fillRect(w * 0.05, h - 3 - wallH * 0.16, w * 0.9, wallH * 0.16);
  c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(w * 0.05, wallY, w * 0.9, 2.2);
  // windows
  const n = o.win ?? 2;
  const winW = Math.min(9, (w * 0.78) / n - 3), winH = Math.min(11, wallH / floors * 0.5);
  for (let f = 0; f < floors; f++) {
    for (let i = 0; i < n; i++) {
      const x = w * 0.11 + i * ((w * 0.78 - winW) / Math.max(1, n - 1)) + (n === 1 ? (w * 0.78 - winW) / 2 : 0);
      const y = wallY + 4 + f * (wallH / floors) + (o.awning && f === 0 ? 5 : 0);
      fillRR(c, x - 1, y - 1, winW + 2, winH + 2, 2, '#FFFFFF');
      const g = c.createLinearGradient(0, y, 0, y + winH); g.addColorStop(0, o.glass ? '#BFE6FF' : '#8CD0F7'); g.addColorStop(1, o.glass ? '#7DB9E8' : '#5FA6E0');
      c.fillStyle = g; c.fillRect(x, y, winW, winH);
      c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(x, y, winW * 0.35, winH);
    }
  }
  // door
  fillRR(c, w / 2 - 4, h - 3 - Math.min(13, wallH * 0.42), 8, Math.min(13, wallH * 0.42), 2, '#2F4A78');
  if (o.awning) { // striped awning
    for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#FFFFFF' : '#E5453A'; c.fillRect(w * 0.05 + i * (w * 0.9 / 8), wallY + 1, w * 0.9 / 8, 5.5); }
  }
  // roof slab: colored fascia + snow on top
  fillRR(c, 0, roofTop + roofH * 0.45, w, roofH * 0.55, 3, o.fascia);
  c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(0, roofTop + roofH * 0.85, w, roofH * 0.15);
  fillRR(c, w * 0.02, roofTop, w * 0.96, roofH * 0.62, 5, '#FFFFFF');
  c.fillStyle = '#D3E4F6'; c.fillRect(w * 0.05, roofTop + roofH * 0.45, w * 0.9, roofH * 0.17);
  if (o.chimney) { fillRR(c, w * 0.72, -1, w * 0.1, roofH * 0.8, 1.5, '#B8503A'); fillRR(c, w * 0.71, -3, w * 0.12, 4, 2, '#FFFFFF'); }
  if (o.sign) {
    const sw = Math.min(w * 0.7, 20 + o.sign.length * 5.4);
    fillRR(c, w / 2 - sw / 2, wallY - 5, sw, 11, 3, '#1F3A66');
    c.fillStyle = '#FFFFFF'; c.font = 'bold 7.5px system-ui, sans-serif'; c.textAlign = 'center'; c.fillText(o.sign, w / 2, wallY + 3.4);
  }
  if (o.lights) for (let i = 0; i < 9; i++) { c.fillStyle = ['#FF5C5C', '#FFD23F', '#5CD97A', '#4DA6FF', '#FF8AD0'][i % 5]; c.beginPath(); c.arc(w * 0.1 + i * (w * 0.8 / 8), roofTop + roofH * 1.05 + (i % 2) * 1.5, 1.7, 0, Math.PI * 2); c.fill(); }
}

function car(c: CanvasRenderingContext2D, col: string) {
  c.fillStyle = 'rgba(40,60,90,0.28)'; fillRR(c, 2.6, 3.2, 13, 24.5, 5, 'rgba(40,60,90,0.28)');
  fillRR(c, 1, 1, 14, 25, 5, col);
  c.fillStyle = 'rgba(0,0,0,0.13)'; c.fillRect(1, 20, 14, 6);
  fillRR(c, 3, 5, 10, 5, 2, '#2C4C70');           // windshield
  fillRR(c, 3, 19.5, 10, 4, 2, '#2C4C70');        // rear window
  fillRR(c, 3.5, 10.5, 9, 8.5, 2, 'rgba(255,255,255,0.32)'); // roof
  c.fillStyle = '#FFF6C8'; c.fillRect(2, 1.4, 3, 2); c.fillRect(11, 1.4, 3, 2);
}

// ---------- baking ----------
export function bakeAll(scene: Phaser.Scene) {
  const atlas = new Atlas(scene);
  const bake = (_s: Phaser.Scene, key: string, w: number, h: number, draw: Draw, scale = S) => atlas.add(key, w, h, draw, scale);
  // guests (12 looks x 2 frames)
  for (let k = 0; k < 2; k++) for (let col = 0; col < 6; col++) for (let f = 0; f < 2; f++) {
    const kind = k === 0 ? 'ski' : 'board';
    bake(scene, guestKey(kind, col, f), 30, GUEST_H + 1, c => drawGuest(c, kind, (k === 0 ? SKI_COLORS : BOARD_COLORS)[col], f, col + k * 2));
  }
  // trees, bushes, rocks
  bake(scene, 'pine_s', 26, 34, c => pine(c, 26, 34, 0));
  bake(scene, 'pine_m', 34, 46, c => pine(c, 34, 46, 1));
  bake(scene, 'pine_l', 46, 62, c => pine(c, 46, 62, 2));
  bake(scene, 'bush_a', 30, 20, c => bush(c, 30, 20, '#7FB8C9'));
  bake(scene, 'bush_b', 24, 17, c => bush(c, 24, 17, '#8CC4A6'));
  bake(scene, 'rock_a', 40, 26, c => rock(c, 40, 26));
  bake(scene, 'rock_b', 64, 40, c => rock(c, 64, 40));
  bake(scene, 'rock_c', 90, 56, c => rock(c, 90, 56));
  // lift parts: orange pylon with a dark cross arm and two sheave wheels
  bake(scene, 'tower', 14, 34, c => {
    shadowEllipse(c, 9, 32.5, 6.5, 1.8);
    c.strokeStyle = '#F0A04B'; c.lineWidth = 2.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(3, 32); c.lineTo(6.2, 9); c.moveTo(11, 32); c.lineTo(7.8, 9); c.stroke();
    c.strokeStyle = '#D9822B'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(4.4, 22); c.lineTo(9.6, 22); c.moveTo(3.7, 27); c.lineTo(10.3, 27); c.stroke();
    fillRR(c, 0.5, 4.5, 13, 4.6, 2, '#3A4756');
    for (const x of [3.3, 10.7]) { c.fillStyle = '#2A343F'; c.beginPath(); c.arc(x, 7, 2.9, 0, Math.PI * 2); c.fill(); c.fillStyle = '#B7C4D3'; c.beginPath(); c.arc(x, 7, 1.1, 0, Math.PI * 2); c.fill(); }
  });
  bake(scene, 'carrier_dot', 10, 12, c => { c.strokeStyle = '#38424E'; c.lineWidth = 1; c.beginPath(); c.moveTo(5, 0); c.lineTo(5, 6); c.stroke(); c.fillStyle = '#FF8A2B'; c.beginPath(); c.arc(5, 8, 3.4, 0, 6.3); c.fill(); c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.arc(4, 7, 1.2, 0, 6.3); c.fill(); });
  bake(scene, 'carrier_t', 18, 14, c => { c.strokeStyle = '#38424E'; c.lineWidth = 1; c.beginPath(); c.moveTo(9, 0); c.lineTo(9, 9); c.stroke(); fillRR(c, 1, 9, 16, 3.4, 1.7, '#F0533B'); c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(2, 9.4, 14, 1); });
  bake(scene, 'carrier_chair', 20, 18, c => {
    c.strokeStyle = '#38424E'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(10, 0); c.lineTo(10, 7); c.stroke();
    fillRR(c, 2, 7, 16, 3.4, 1.6, '#2F8BEA'); fillRR(c, 2, 2.8, 2.6, 7.6, 1.2, '#2F8BEA');
    c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(3, 7.4, 14, 1);
    c.strokeStyle = '#38424E'; c.lineWidth = 1; c.beginPath(); c.moveTo(4, 10.4); c.lineTo(4, 14); c.moveTo(16, 10.4); c.lineTo(16, 14); c.moveTo(3, 14); c.lineTo(17, 14); c.stroke();
  });
  bake(scene, 'carrier_cabin', 24, 24, c => {
    c.strokeStyle = '#38424E'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(12, 0); c.lineTo(12, 6); c.stroke();
    fillRR(c, 3, 5, 18, 5, 3, '#2F6FD0');                       // blue roof
    fillRR(c, 2, 9, 20, 14, 4, '#FF8A2B');                       // orange body
    fillRR(c, 4, 11, 16, 6.5, 2, '#9BD8FF');                     // windows
    c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(5, 11.5, 4, 5.5);
    c.fillStyle = '#FFFFFF'; c.fillRect(11.4, 11, 1.2, 6.5);     // door seam
    c.fillStyle = 'rgba(0,0,0,0.14)'; c.fillRect(2, 19.5, 20, 3.5);
  });
  // lift stations: yellow drum house, dark-blue roof with snow, skier sign
  bake(scene, 'station', 46, 38, c => {
    shadowBox(c, 5, 16, 36, 18, 6, 3);
    fillRR(c, 5, 14, 36, 22, 4, '#FFB13B');
    c.fillStyle = '#E8942A'; c.fillRect(5, 31, 36, 5);
    fillRR(c, 17, 22, 9, 14, 2, '#2F4A78');
    fillRR(c, 28, 18, 10, 10, 3, '#FFFFFF');
    c.strokeStyle = '#1F2A38'; c.lineWidth = 1.2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(30, 26); c.lineTo(37, 22); c.moveTo(33.5, 20.5); c.lineTo(34.5, 24); c.stroke();
    c.fillStyle = '#1F2A38'; c.beginPath(); c.arc(33.4, 20.2, 1, 0, 6.3); c.fill();
    fillRR(c, 1, 7, 44, 10, 4, '#2F5FB8');
    fillRR(c, 3, 2.5, 40, 8, 4, '#FFFFFF'); c.fillStyle = '#D3E4F6'; c.fillRect(5, 8, 36, 2.5);
  });
  bake(scene, 'station_top', 36, 30, c => {
    shadowBox(c, 4, 12, 28, 14, 5, 2.5);
    fillRR(c, 4, 11, 28, 17, 4, '#FFB13B'); c.fillStyle = '#E8942A'; c.fillRect(4, 24, 28, 4);
    fillRR(c, 13, 17, 8, 11, 2, '#2F4A78');
    fillRR(c, 1, 5, 34, 9, 4, '#2F5FB8'); fillRR(c, 3, 1.5, 30, 7, 4, '#FFFFFF'); c.fillStyle = '#D3E4F6'; c.fillRect(5, 6.5, 26, 2);
  });
  // village
  CAR_COLORS.forEach((col, i) => bake(scene, `car_${i}`, 17, 28, c => car(c, col)));
  bake(scene, 'lodge', 200, 134, c => {
    house(c, 200, 134, { wall: '#F5A24B', wall2: '#DC8630', fascia: '#D9412F', win: 6, floors: 2, chimney: true, sign: 'SKI LODGE', glass: true });
    c.fillStyle = '#FF5C5C'; c.fillRect(24, -14, 1.6, 18); c.beginPath(); c.moveTo(25.6, -14); c.lineTo(36, -10.5); c.lineTo(25.6, -7); c.fill();
  });
  bake(scene, 'bus', 120, 50, c => {
    shadowEllipse(c, 66, 46, 58, 3.6);
    fillRR(c, 2, 8, 116, 34, 8, '#FFC526');
    c.fillStyle = '#E8A800'; c.fillRect(2, 30, 116, 5);
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(6, 9.5, 108, 2.4);
    for (let i = 0; i < 6; i++) fillRR(c, 10 + i * 17, 13, 13, 12, 3, '#9BD8FF');
    fillRR(c, 104, 13, 10, 20, 3, '#9BD8FF');
    fillRR(c, 28, 2, 60, 7, 3, '#2F8BEA');
    c.fillStyle = '#FFFFFF'; c.font = 'bold 6px system-ui'; c.textAlign = 'center'; c.fillText('SKI BUS', 58, 7.6);
    for (const x of [28, 90]) { c.fillStyle = '#28323F'; c.beginPath(); c.arc(x, 42, 6.4, 0, 6.3); c.fill(); c.fillStyle = '#B7C4D3'; c.beginPath(); c.arc(x, 42, 2.4, 0, 6.3); c.fill(); }
  });
  bake(scene, 'busstop', 52, 48, c => {
    shadowEllipse(c, 28, 45, 22, 2.6);
    c.fillStyle = '#4A5563'; c.fillRect(5, 10, 2.4, 36); c.fillRect(44, 10, 2.4, 36);
    fillRR(c, 0, 2, 52, 11, 4, '#2F8BEA'); c.fillStyle = '#FFFFFF'; c.font = 'bold 7px system-ui'; c.textAlign = 'center'; c.fillText('SKI BUS', 26, 10);
    fillRR(c, 9, 30, 34, 4, 2, '#F0A04B');
  });
  // buildings
  bake(scene, 'bld_snack', 50, 44, c => house(c, 50, 44, { wall: '#F5A24B', fascia: '#D9412F', win: 2, awning: true, chimney: true }));
  bake(scene, 'bld_mountain', 78, 62, c => house(c, 78, 62, { wall: '#F6DDB0', wall2: '#C9A56E', fascia: '#2F6FD0', win: 4, floors: 2, chimney: true, sign: 'RESTAURANT' }));
  bake(scene, 'bld_apres', 88, 64, c => house(c, 88, 64, { wall: '#A56BE8', wall2: '#7F45C4', fascia: '#5B2FA8', win: 4, floors: 2, sign: 'APRES', lights: true }));
  bake(scene, 'bld_lodge', 116, 76, c => house(c, 116, 76, { wall: '#E4F1FC', wall2: '#B9D4EC', fascia: '#2F8BEA', win: 5, floors: 2, sign: 'ICE LODGE', glass: true }));
  // zones
  bake(scene, 'zone_kids', 130, 72, c => {
    shadowEllipse(c, 68, 66, 62, 4);
    for (let i = 0; i < 9; i++) { c.fillStyle = '#FFFFFF'; c.fillRect(6 + i * 14, 46, 3.4, 20); c.fillStyle = '#E5453A'; c.fillRect(6 + i * 14, 50, 3.4, 5); }
    fillRR(c, 3, 50, 124, 3.4, 1.7, '#E5453A'); fillRR(c, 3, 58, 124, 3.4, 1.7, '#E5453A');
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(30, 32, 11, 0, 6.3); c.arc(30, 17, 8, 0, 6.3); c.fill();
    c.fillStyle = 'rgba(96,128,176,0.25)'; c.beginPath(); c.arc(34, 34, 8, 0, 6.3); c.fill();
    c.fillStyle = '#FF8A2B'; c.beginPath(); c.moveTo(30, 17); c.lineTo(42, 19); c.lineTo(30, 21); c.fill();
    c.fillStyle = '#28323F'; c.beginPath(); c.arc(28, 15, 1.1, 0, 6.3); c.arc(33, 15, 1.1, 0, 6.3); c.fill();
    c.fillStyle = '#E5453A'; c.fillRect(21, 24, 18, 3);
    c.fillStyle = '#F0424F'; c.beginPath(); c.moveTo(72, 44); c.quadraticCurveTo(95, 6, 118, 44); c.closePath(); c.fill();
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.moveTo(72, 44); c.quadraticCurveTo(95, 14, 118, 44); c.lineTo(111, 44); c.quadraticCurveTo(95, 24, 79, 44); c.fill();
    c.fillStyle = '#FFC526'; c.beginPath(); c.arc(54, 40, 4.5, 0, 6.3); c.fill(); c.fillRect(52, 42, 4, 6);
  });
  bake(scene, 'zone_park1', 150, 62, c => {
    shadowEllipse(c, 76, 58, 70, 3.6);
    fillRR(c, 8, 39, 62, 4, 2, '#FFC526'); c.fillStyle = '#4A5563'; c.fillRect(12, 43, 3.4, 13); c.fillRect(60, 43, 3.4, 13); fillRR(c, 8, 36, 62, 3, 1.5, '#F0533B');
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.moveTo(80, 57); c.quadraticCurveTo(100, 28, 120, 57); c.closePath(); c.fill();
    c.strokeStyle = '#2F8BEA'; c.lineWidth = 2.4; c.stroke();
    c.fillStyle = '#F0424F'; c.beginPath(); c.moveTo(124, 57); c.lineTo(142, 35); c.lineTo(147, 57); c.closePath(); c.fill();
  });
  bake(scene, 'zone_park2', 150, 72, c => {
    shadowEllipse(c, 76, 68, 70, 3.8);
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.moveTo(6, 64); c.lineTo(6, 28); c.quadraticCurveTo(50, 20, 66, 6); c.lineTo(68, 64); c.closePath(); c.fill();
    c.strokeStyle = '#2F8BEA'; c.lineWidth = 2.4; c.stroke();
    c.fillStyle = '#FFC526'; c.beginPath(); c.moveTo(84, 64); c.quadraticCurveTo(112, 20, 144, 64); c.closePath(); c.fill();
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.moveTo(94, 64); c.quadraticCurveTo(112, 34, 134, 64); c.closePath(); c.fill();
    c.fillStyle = '#F0424F'; c.fillRect(70, 54, 10, 10);
  });
  bake(scene, 'zone_park3', 150, 78, c => {
    shadowEllipse(c, 76, 73, 72, 3.8);
    c.fillStyle = '#9CC4EA'; c.beginPath(); c.moveTo(4, 72); c.lineTo(4, 14); c.quadraticCurveTo(24, 68, 75, 68); c.quadraticCurveTo(126, 68, 146, 14); c.lineTo(146, 72); c.closePath(); c.fill();
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.moveTo(12, 72); c.lineTo(12, 26); c.quadraticCurveTo(30, 63, 75, 63); c.quadraticCurveTo(120, 63, 138, 26); c.lineTo(138, 72); c.closePath(); c.fill();
    c.strokeStyle = '#2F8BEA'; c.lineWidth = 3; c.beginPath(); c.moveTo(4, 14); c.quadraticCurveTo(24, 68, 75, 68); c.quadraticCurveTo(126, 68, 146, 14); c.stroke();
    c.fillStyle = '#FFC526'; c.fillRect(2, 8, 4, 8); c.fillRect(144, 8, 4, 8);
  });
  bake(scene, 'zone_slalom', 150, 62, c => {
    for (let i = 0; i < 7; i++) {
      const x = 12 + i * 20, y = 14 + (i % 2) * 20;
      shadowEllipse(c, x + 6, y + 31, 7, 1.6, 0.25);
      c.fillStyle = '#4A5563'; c.fillRect(x, y, 1.8, 30);
      c.fillStyle = i % 2 ? '#2F8BEA' : '#F0424F'; c.beginPath(); c.moveTo(x + 1.8, y); c.lineTo(x + 14, y + 5); c.lineTo(x + 1.8, y + 10); c.fill();
    }
  });
  bake(scene, 'zone_offpiste', 130, 62, c => {
    for (let i = 0; i < 6; i++) {
      const x = 8 + i * 22, y = 12 + (i % 3) * 10;
      shadowEllipse(c, x + 6, y + 36, 7, 1.6, 0.25);
      c.fillStyle = '#4A5563'; c.fillRect(x, y, 1.8, 34);
      c.fillStyle = '#FF8A2B'; c.beginPath(); c.moveTo(x + 1.8, y); c.lineTo(x + 12, y + 4); c.lineTo(x + 1.8, y + 8); c.fill();
    }
    fillRR(c, 2, 50, 46, 10, 3, '#F0424F'); c.fillStyle = '#FFFFFF'; c.font = 'bold 7px system-ui'; c.textAlign = 'left'; c.fillText('DANGER', 6, 57.6);
  });
  // small world objects
  bake(scene, 'frown', 18, 18, c => {
    c.fillStyle = '#E5453A'; c.beginPath(); c.arc(9, 9, 8.5, 0, 6.3); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(4.5, 6.4); c.lineTo(7, 7.4); c.moveTo(13.5, 6.4); c.lineTo(11, 7.4); c.stroke();
    c.beginPath(); c.arc(9, 15, 4, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
  });
  bake(scene, 'forsale', 96, 62, c => {
    shadowEllipse(c, 50, 60, 40, 2.6);
    c.fillStyle = '#7A4E2D'; c.fillRect(10, 22, 5, 38); c.fillRect(81, 22, 5, 38);
    fillRR(c, 2, 2, 92, 36, 8, '#FFC526'); fillRR(c, 4.5, 4.5, 87, 31, 6.5, '#FF8A2B');
    c.fillStyle = '#fff'; c.font = 'bold 16px system-ui, sans-serif'; c.textAlign = 'center'; c.fillText('FOR SALE', 48, 26);
  });
  bake(scene, 'plus', 32, 34, c => {
    c.fillStyle = 'rgba(30,60,100,0.28)'; c.beginPath(); c.arc(16, 19, 14, 0, 6.3); c.fill();
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(16, 15, 14, 0, 6.3); c.fill();
    c.fillStyle = '#3CCB63'; c.beginPath(); c.arc(16, 15, 11.6, 0, 6.3); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); c.ellipse(16, 9.5, 8, 4.2, 0, 0, 6.3); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 3.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(16, 9); c.lineTo(16, 21); c.moveTo(10, 15); c.lineTo(22, 15); c.stroke();
  });
  bake(scene, 'glow', 64, 64, c => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  });
  bake(scene, 'dot', 4, 4, c => { c.fillStyle = '#fff'; c.beginPath(); c.arc(2, 2, 2, 0, 6.3); c.fill(); }, 2);
  bake(scene, 'flake', 6, 6, c => { c.fillStyle = 'rgba(255,255,255,0.95)'; c.beginPath(); c.arc(3, 3, 2.4, 0, 6.3); c.fill(); c.strokeStyle = 'rgba(150,180,220,0.5)'; c.lineWidth = 0.6; c.stroke(); }, 2);
  bake(scene, 'ring', 64, 64, c => { c.strokeStyle = '#FF8A2B'; c.lineWidth = 3; c.beginPath(); c.arc(32, 32, 28, 0, 6.3); c.stroke(); }, 2);
  atlas.finish();
}
