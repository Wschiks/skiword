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

export const SKI_COLORS = ['#E84A5F', '#2E86DE', '#FF8C42', '#3FB57A', '#F2B705', '#8E5BD9'];
export const BOARD_COLORS = ['#1ABC9C', '#FF6B9D', '#9BCB3B', '#34495E', '#C0399F', '#3ABEFF'];
const SKIN = ['#F2C9A0', '#D9A066', '#A9714B', '#F5D5B8'];
export const CAR_COLORS = ['#D64545', '#2E86DE', '#F2B705', '#5D6D7E'];

// ---------- guests ----------
function drawGuest(c: CanvasRenderingContext2D, kind: 'ski' | 'board', col: string, frame: number, id: number) {
  const bob = frame === 0 ? 0 : 0.8;
  const skin = SKIN[id % SKIN.length];
  const cx = 15;
  // gear
  if (kind === 'ski') {
    c.strokeStyle = '#2B3440'; c.lineWidth = 1.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx - 11, 27.2); c.lineTo(cx + 11, 27.2); c.stroke();
    c.beginPath(); c.moveTo(cx - 11, 25.6 + 0); c.lineTo(cx + 11, 25.6); c.stroke();
    c.strokeStyle = col; c.lineWidth = 0.9;
    c.beginPath(); c.moveTo(cx - 9, 27.2); c.lineTo(cx + 9, 27.2); c.stroke();
    // poles
    c.strokeStyle = '#8A97A6'; c.lineWidth = 0.9;
    const pa = frame === 0 ? 4 : 7;
    c.beginPath(); c.moveTo(cx - 5, 15); c.lineTo(cx - 10 - pa * 0.3, 26.5); c.stroke();
    c.beginPath(); c.moveTo(cx + 5, 15); c.lineTo(cx + 10 + pa * 0.3, 26.5 - 1); c.stroke();
  } else {
    fillRR(c, cx - 11, 25.4, 22, 3, 1.5, '#2B3440');
    fillRR(c, cx - 8, 25.9, 16, 1.6, 0.8, col);
  }
  // legs
  c.strokeStyle = '#2B3440'; c.lineWidth = 3.2; c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx - 2, 19 + bob * 0.3); c.lineTo(cx - 3.2, 25); c.stroke();
  c.beginPath(); c.moveTo(cx + 2, 19 + bob * 0.3); c.lineTo(cx + 3.2 + (frame ? 0.8 : 0), 25); c.stroke();
  // torso
  fillRR(c, cx - 5, 9.5 + bob * 0.4, 10, 11, 3.5, col);
  c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(cx - 5, 15.6 + bob * 0.4, 10, 1.4);
  // arms (board: out to sides)
  c.strokeStyle = col; c.lineWidth = 2.6;
  if (kind === 'board') {
    const a = frame === 0 ? 0 : 2;
    c.beginPath(); c.moveTo(cx - 4, 12 + bob * 0.4); c.lineTo(cx - 9, 15 + a); c.stroke();
    c.beginPath(); c.moveTo(cx + 4, 12 + bob * 0.4); c.lineTo(cx + 9, 14 - a * 0.5); c.stroke();
  } else {
    c.beginPath(); c.moveTo(cx - 4, 12 + bob * 0.4); c.lineTo(cx - 6, 16); c.stroke();
    c.beginPath(); c.moveTo(cx + 4, 12 + bob * 0.4); c.lineTo(cx + 6, 15.5); c.stroke();
  }
  // head + hat
  c.fillStyle = skin; c.beginPath(); c.arc(cx, 6.2 + bob * 0.4, 3.9, 0, Math.PI * 2); c.fill();
  c.fillStyle = kind === 'ski' ? '#FFFFFF' : '#2B3440';
  c.beginPath(); c.arc(cx, 5.2 + bob * 0.4, 4.1, Math.PI, Math.PI * 2); c.fill();
  c.fillStyle = col; c.fillRect(cx - 4.1, 5 + bob * 0.4, 8.2, 1.1);
  if (kind === 'board') { c.fillStyle = '#1C2530'; c.fillRect(cx - 3.2, 6 + bob * 0.4, 6.4, 1.6); }
}

export function guestKey(kind: 'ski' | 'board', color: number, frame: number) { return `g_${kind}_${color}_${frame}`; }

// ---------- misc object drawers ----------
function pine(c: CanvasRenderingContext2D, w: number, h: number, seed: number) {
  const g = c.createLinearGradient(0, 0, 0, h);
  const dark = seed % 2 ? '#2A6244' : '#2F6B4F';
  g.addColorStop(0, '#3F8A66'); g.addColorStop(1, dark);
  c.fillStyle = '#5A3E2B'; c.fillRect(w / 2 - w * 0.06, h * 0.82, w * 0.12, h * 0.18);
  const tiers = 3;
  for (let i = 0; i < tiers; i++) {
    const y0 = h * 0.06 + (i * h * 0.26), y1 = y0 + h * 0.42, half = w * (0.26 + i * 0.12);
    c.fillStyle = g;
    c.beginPath(); c.moveTo(w / 2, y0); c.lineTo(w / 2 + half, y1); c.lineTo(w / 2 - half, y1); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.beginPath(); c.moveTo(w / 2, y0); c.lineTo(w / 2 + half * 0.55, y0 + (y1 - y0) * 0.45);
    c.quadraticCurveTo(w / 2, y0 + (y1 - y0) * 0.6, w / 2 - half * 0.55, y0 + (y1 - y0) * 0.45); c.closePath(); c.fill();
  }
}
function rock(c: CanvasRenderingContext2D, w: number, h: number, tone: string) {
  c.fillStyle = tone;
  c.beginPath(); c.moveTo(0, h); c.lineTo(w * 0.1, h * 0.4); c.lineTo(w * 0.35, h * 0.1); c.lineTo(w * 0.62, h * 0.32); c.lineTo(w * 0.85, h * 0.18); c.lineTo(w, h); c.closePath(); c.fill();
  c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.moveTo(w * 0.55, h * 0.32); c.lineTo(w * 0.85, h * 0.18); c.lineTo(w, h); c.lineTo(w * 0.5, h); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.moveTo(w * 0.35, h * 0.1); c.lineTo(w * 0.62, h * 0.32); c.lineTo(w * 0.5, h * 0.4); c.lineTo(w * 0.3, h * 0.3); c.closePath(); c.fill();
}
function chalet(c: CanvasRenderingContext2D, w: number, h: number, wall: string, roof: string, opts: { windows?: number; sign?: string; chimney?: boolean; floors?: number } = {}) {
  const floors = opts.floors ?? 1;
  const bodyH = h * (floors === 1 ? 0.58 : 0.72), bodyY = h - bodyH;
  c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.ellipse(w / 2, h - 1, w * 0.52, 3.2, 0, 0, Math.PI * 2); c.fill();
  fillRR(c, w * 0.06, bodyY, w * 0.88, bodyH, 2, wall);
  c.fillStyle = 'rgba(0,0,0,0.12)'; for (let x = w * 0.06; x < w * 0.94; x += 5) c.fillRect(x, bodyY, 0.8, bodyH);
  // roof
  c.fillStyle = roof; c.beginPath(); c.moveTo(0, bodyY + 2); c.lineTo(w / 2, 0); c.lineTo(w, bodyY + 2); c.closePath(); c.fill();
  c.fillStyle = '#FFFFFF'; c.beginPath(); c.moveTo(w * 0.02, bodyY - 0.5); c.lineTo(w / 2, h * 0.02); c.lineTo(w * 0.98, bodyY - 0.5); c.lineTo(w * 0.9, bodyY - 3.5); c.lineTo(w / 2, h * 0.02 + 4); c.lineTo(w * 0.1, bodyY - 3.5); c.closePath(); c.fill();
  if (opts.chimney) { c.fillStyle = '#7B4A32'; c.fillRect(w * 0.7, h * 0.05, w * 0.08, h * 0.22); c.fillStyle = '#fff'; c.fillRect(w * 0.7, h * 0.05, w * 0.08, 2); }
  const n = opts.windows ?? 2;
  for (let f = 0; f < floors; f++) {
    for (let i = 0; i < n; i++) {
      const x = w * 0.14 + i * ((w * 0.72 - 6) / Math.max(1, n - 1 || 1)) * (n > 1 ? 1 : 0) + (n === 1 ? w * 0.34 : 0);
      const y = bodyY + 4 + f * (bodyH / floors);
      fillRR(c, x, y, 6, 6.5, 1, '#FFE08A'); c.fillStyle = '#7B5A2E'; c.fillRect(x + 2.7, y, 0.7, 6.5); c.fillRect(x, y + 3, 6, 0.7);
    }
  }
  fillRR(c, w / 2 - 3.5, h - 11, 7, 11, 1.5, '#5A3E2B');
}


export function bakeAll(scene: Phaser.Scene) {
  const atlas = new Atlas(scene);
  const bake = (_s: Phaser.Scene, key: string, w: number, h: number, draw: Draw, scale = S) => atlas.add(key, w, h, draw, scale);
  // guests (12 looks x 2 frames)
  for (let k = 0; k < 2; k++) for (let col = 0; col < 6; col++) for (let f = 0; f < 2; f++) {
    const kind = k === 0 ? 'ski' : 'board';
    bake(scene, guestKey(kind, col, f), 30, GUEST_H + 1, c => drawGuest(c, kind, (k === 0 ? SKI_COLORS : BOARD_COLORS)[col], f, col + k * 2));
  }
  // trees and rocks
  bake(scene, 'pine_s', 22, 30, c => pine(c, 22, 30, 0));
  bake(scene, 'pine_m', 30, 42, c => pine(c, 30, 42, 1));
  bake(scene, 'pine_l', 40, 58, c => pine(c, 40, 58, 2));
  bake(scene, 'rock_a', 40, 26, c => rock(c, 40, 26, '#6D7A8C'));
  bake(scene, 'rock_b', 64, 40, c => rock(c, 64, 40, '#5E6B7D'));
  bake(scene, 'rock_c', 90, 56, c => rock(c, 90, 56, '#7A8698'));
  // lift parts
  bake(scene, 'tower', 10, 26, c => {
    c.fillStyle = '#4C5866'; c.fillRect(4.2, 5, 1.6, 21); c.fillStyle = '#8391A1'; c.fillRect(0, 3, 10, 2.2);
    c.fillStyle = '#4C5866'; c.beginPath(); c.moveTo(1, 26); c.lineTo(5, 12); c.lineTo(9, 26); c.lineWidth = 1; c.strokeStyle = '#4C5866'; c.stroke();
  });
  bake(scene, 'carrier_dot', 8, 10, c => { c.strokeStyle = '#333'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(4, 0); c.lineTo(4, 5); c.stroke(); c.fillStyle = '#F2B705'; c.beginPath(); c.arc(4, 6.5, 2.6, 0, 6.3); c.fill(); });
  bake(scene, 'carrier_t', 16, 12, c => { c.strokeStyle = '#333'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(8, 0); c.lineTo(8, 8); c.stroke(); c.fillStyle = '#E8663A'; c.fillRect(1, 8, 14, 2.6); });
  bake(scene, 'carrier_chair', 18, 16, c => {
    c.strokeStyle = '#333'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(9, 0); c.lineTo(9, 7); c.stroke();
    c.fillStyle = '#C0392B'; c.fillRect(1.5, 7, 15, 2.4); c.fillRect(1.5, 3.6, 2, 6);
    c.fillStyle = '#7F2A20'; c.fillRect(2, 9.4, 1.2, 4); c.fillRect(14.4, 9.4, 1.2, 4);
  });
  bake(scene, 'carrier_cabin', 22, 22, c => {
    c.strokeStyle = '#333'; c.lineWidth = 1; c.beginPath(); c.moveTo(11, 0); c.lineTo(11, 6); c.stroke();
    fillRR(c, 2, 6, 18, 14, 4, '#2E86DE'); fillRR(c, 4, 8.5, 14, 6.5, 2, 'rgba(230,245,255,0.9)');
    c.fillStyle = '#fff'; c.fillRect(2, 17, 18, 1.4);
  });
  bake(scene, 'station', 44, 34, c => chalet(c, 44, 34, '#B98A5E', '#B24A3A', { windows: 2 }));
  bake(scene, 'station_top', 34, 26, c => chalet(c, 34, 26, '#9C7350', '#8A3E30', { windows: 1 }));
  // village
  CAR_COLORS.forEach((col, i) => bake(scene, `car_${i}`, 44, 24, c => {
    c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.ellipse(22, 22.5, 20, 2.4, 0, 0, 6.3); c.fill();
    fillRR(c, 2, 9, 40, 10, 3, col);
    c.fillStyle = col; c.beginPath(); c.moveTo(9, 9); c.lineTo(14, 3); c.lineTo(31, 3); c.lineTo(36, 9); c.closePath(); c.fill();
    c.fillStyle = 'rgba(210,235,250,0.95)'; c.beginPath(); c.moveTo(12, 9); c.lineTo(15.5, 4.6); c.lineTo(21, 4.6); c.lineTo(21, 9); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(23, 9); c.lineTo(23, 4.6); c.lineTo(30, 4.6); c.lineTo(34, 9); c.closePath(); c.fill();
    c.fillStyle = '#222'; c.beginPath(); c.arc(11, 19, 3.6, 0, 6.3); c.arc(33, 19, 3.6, 0, 6.3); c.fill();
    c.fillStyle = '#aaa'; c.beginPath(); c.arc(11, 19, 1.4, 0, 6.3); c.arc(33, 19, 1.4, 0, 6.3); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.9)'; c.fillRect(6, 7.4, 30, 1.6);
  }));
  bake(scene, 'lodge', 200, 130, c => {
    chalet(c, 200, 130, '#C79A6B', '#9E3B33', { windows: 6, floors: 2, chimney: true });
    fillRR(c, 62, 4, 76, 16, 3, '#5A3E2B'); c.fillStyle = '#FFE9B0'; c.font = 'bold 11px system-ui, sans-serif'; c.textAlign = 'center'; c.fillText('SKI LODGE', 100, 16);
  });
  bake(scene, 'bus', 120, 46, c => {
    c.fillStyle = 'rgba(0,0,0,0.22)'; c.beginPath(); c.ellipse(60, 44, 56, 3.4, 0, 0, 6.3); c.fill();
    fillRR(c, 2, 6, 116, 34, 7, '#F2B705');
    c.fillStyle = '#E39B00'; c.fillRect(2, 28, 116, 4);
    for (let i = 0; i < 6; i++) fillRR(c, 10 + i * 17, 11, 13, 12, 2.5, 'rgba(215,240,255,0.95)');
    fillRR(c, 104, 11, 10, 20, 2.5, 'rgba(215,240,255,0.95)');
    c.fillStyle = '#222'; c.beginPath(); c.arc(28, 40, 6, 0, 6.3); c.arc(90, 40, 6, 0, 6.3); c.fill();
    c.fillStyle = '#aaa'; c.beginPath(); c.arc(28, 40, 2.4, 0, 6.3); c.arc(90, 40, 2.4, 0, 6.3); c.fill();
    c.fillStyle = '#2B3440'; c.font = 'bold 8px system-ui, sans-serif'; c.textAlign = 'left'; c.fillText('SKI BUS', 10, 36);
  });
  bake(scene, 'busstop', 50, 46, c => {
    c.fillStyle = '#4C5866'; c.fillRect(4, 8, 2, 38); c.fillRect(44, 8, 2, 38);
    fillRR(c, 0, 2, 50, 8, 2, '#2E86DE'); c.fillStyle = '#fff'; c.font = 'bold 6px system-ui'; c.textAlign = 'center'; c.fillText('SKI BUS', 25, 8.5);
    c.fillStyle = '#7B5A2E'; c.fillRect(8, 30, 34, 3);
  });
  // buildings
  bake(scene, 'bld_snack', 46, 40, c => chalet(c, 46, 40, '#D9A066', '#C0392B', { windows: 2, chimney: true }));
  bake(scene, 'bld_mountain', 74, 56, c => chalet(c, 74, 56, '#B98A5E', '#7F4B37', { windows: 4, floors: 2, chimney: true }));
  bake(scene, 'bld_apres', 84, 58, c => {
    chalet(c, 84, 58, '#8E5BD9', '#5B3A9E', { windows: 4, floors: 2 });
    c.fillStyle = '#FFE9B0'; c.font = 'bold 6.5px system-ui'; c.textAlign = 'center'; c.fillText('APRES', 42, 27);
    for (let i = 0; i < 6; i++) { c.fillStyle = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF6B9D', '#FFD93D'][i]; c.beginPath(); c.arc(8 + i * 13.5, 34, 1.7, 0, 6.3); c.fill(); }
  });
  bake(scene, 'bld_lodge', 110, 70, c => {
    chalet(c, 110, 70, '#DDE7EF', '#3B6FA0', { windows: 5, floors: 2 });
    c.fillStyle = '#3B6FA0'; c.font = 'bold 8px system-ui'; c.textAlign = 'center'; c.fillText('ICE LODGE', 55, 33);
  });
  // zones
  bake(scene, 'zone_kids', 130, 70, c => {
    c.fillStyle = '#8B5E3C'; for (let i = 0; i < 9; i++) { c.fillRect(6 + i * 14, 44, 3, 22); }
    c.fillRect(4, 50, 122, 3); c.fillRect(4, 58, 122, 3);
    c.fillStyle = '#fff'; c.beginPath(); c.arc(30, 30, 10, 0, 6.3); c.arc(30, 16, 7.5, 0, 6.3); c.fill();
    c.fillStyle = '#E8663A'; c.beginPath(); c.moveTo(30, 16); c.lineTo(41, 18); c.lineTo(30, 20); c.fill();
    c.fillStyle = '#222'; c.beginPath(); c.arc(28, 14, 1, 0, 6.3); c.arc(32.4, 14, 1, 0, 6.3); c.fill();
    c.fillStyle = '#E84A5F'; c.beginPath(); c.moveTo(72, 42); c.quadraticCurveTo(95, 8, 118, 42); c.closePath(); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(72, 42); c.quadraticCurveTo(95, 14, 118, 42); c.lineTo(112, 42); c.quadraticCurveTo(95, 22, 78, 42); c.fill();
    c.fillStyle = '#F2B705'; c.beginPath(); c.arc(56, 38, 4, 0, 6.3); c.fill(); c.fillRect(54, 40, 4, 6);
  });
  bake(scene, 'zone_park1', 150, 60, c => {
    c.fillStyle = '#8391A1'; c.fillRect(8, 40, 60, 3); c.fillRect(12, 43, 3, 12); c.fillRect(60, 43, 3, 12);
    c.fillStyle = '#F2B705'; c.fillRect(8, 38, 60, 2);
    c.fillStyle = '#DCEAF5'; c.beginPath(); c.moveTo(80, 56); c.quadraticCurveTo(100, 30, 120, 56); c.closePath(); c.fill();
    c.strokeStyle = '#2E86DE'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#E84A5F'; c.beginPath(); c.moveTo(124, 56); c.lineTo(142, 36); c.lineTo(146, 56); c.closePath(); c.fill();
  });
  bake(scene, 'zone_park2', 150, 70, c => {
    c.fillStyle = '#DCEAF5'; c.beginPath(); c.moveTo(6, 62); c.lineTo(6, 28); c.quadraticCurveTo(50, 20, 66, 8); c.lineTo(68, 62); c.closePath(); c.fill();
    c.strokeStyle = '#2E86DE'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#F2B705'; c.beginPath(); c.moveTo(84, 62); c.quadraticCurveTo(112, 20, 144, 62); c.closePath(); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(94, 62); c.quadraticCurveTo(112, 34, 134, 62); c.closePath(); c.fill();
    c.fillStyle = '#E84A5F'; c.fillRect(70, 52, 10, 10);
  });
  bake(scene, 'zone_park3', 150, 76, c => {
    c.fillStyle = '#B7CCE0'; c.beginPath(); c.moveTo(4, 70); c.lineTo(4, 14); c.quadraticCurveTo(24, 66, 75, 66); c.quadraticCurveTo(126, 66, 146, 14); c.lineTo(146, 70); c.closePath(); c.fill();
    c.fillStyle = '#F4F8FB'; c.beginPath(); c.moveTo(12, 70); c.lineTo(12, 26); c.quadraticCurveTo(30, 62, 75, 62); c.quadraticCurveTo(120, 62, 138, 26); c.lineTo(138, 70); c.closePath(); c.fill();
    c.strokeStyle = '#2E86DE'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(4, 14); c.quadraticCurveTo(24, 66, 75, 66); c.quadraticCurveTo(126, 66, 146, 14); c.stroke();
    c.fillStyle = '#F2B705'; c.fillRect(2, 8, 4, 8); c.fillRect(144, 8, 4, 8);
  });
  bake(scene, 'zone_slalom', 150, 60, c => {
    for (let i = 0; i < 7; i++) {
      const x = 12 + i * 20, y = 14 + (i % 2) * 20;
      c.fillStyle = '#4C5866'; c.fillRect(x, y, 1.6, 30);
      c.fillStyle = i % 2 ? '#2E86DE' : '#E84A5F'; c.beginPath(); c.moveTo(x + 1.6, y); c.lineTo(x + 14, y + 5); c.lineTo(x + 1.6, y + 10); c.fill();
    }
  });
  bake(scene, 'zone_offpiste', 130, 60, c => {
    for (let i = 0; i < 6; i++) {
      const x = 8 + i * 22, y = 12 + (i % 3) * 10;
      c.fillStyle = '#4C5866'; c.fillRect(x, y, 1.6, 34);
      c.fillStyle = '#FF8C42'; c.beginPath(); c.moveTo(x + 1.6, y); c.lineTo(x + 12, y + 4); c.lineTo(x + 1.6, y + 8); c.fill();
    }
    c.fillStyle = '#fff'; c.font = 'bold 9px system-ui'; c.textAlign = 'left'; c.fillText('DANGER', 4, 56);
  });
  // ui-ish world objects
  bake(scene, 'frown', 18, 18, c => {
    c.fillStyle = '#D64545'; c.beginPath(); c.arc(9, 9, 8.5, 0, 6.3); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 1.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(4.5, 6.4); c.lineTo(7, 7.4); c.moveTo(13.5, 6.4); c.lineTo(11, 7.4); c.stroke();
    c.beginPath(); c.arc(9, 15, 4, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
  });
  bake(scene, 'forsale', 96, 60, c => {
    c.fillStyle = '#5A3E2B'; c.fillRect(8, 20, 5, 40); c.fillRect(83, 20, 5, 40);
    fillRR(c, 2, 2, 92, 34, 5, '#E8663A'); c.strokeStyle = '#fff'; c.lineWidth = 2; rr(c, 4.5, 4.5, 87, 29, 4); c.stroke();
    c.fillStyle = '#fff'; c.font = 'bold 15px system-ui, sans-serif'; c.textAlign = 'center'; c.fillText('FOR SALE', 48, 25);
  });
  bake(scene, 'plus', 30, 30, c => {
    c.fillStyle = 'rgba(46,134,222,0.95)'; c.beginPath(); c.arc(15, 15, 14, 0, 6.3); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 3.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(15, 8); c.lineTo(15, 22); c.moveTo(8, 15); c.lineTo(22, 15); c.stroke();
  });
  bake(scene, 'flake', 6, 6, c => { c.fillStyle = 'rgba(255,255,255,0.95)'; c.beginPath(); c.arc(3, 3, 2.4, 0, 6.3); c.fill(); }, 2);
  bake(scene, 'dot', 4, 4, c => { c.fillStyle = '#fff'; c.beginPath(); c.arc(2, 2, 2, 0, 6.3); c.fill(); }, 2);
  bake(scene, 'ring', 64, 64, c => { c.strokeStyle = '#FF6B3D'; c.lineWidth = 3; c.beginPath(); c.arc(32, 32, 28, 0, 6.3); c.stroke(); }, 2);
  atlas.finish();
}
