import Phaser from 'phaser';
import { AREAS, CANYON_BAND } from '../config/areas';
import { BUILDINGS } from '../config/facilities';
import { ZONES } from '../config/zones';
import { LODGE_POS, PARKING_POS, ROAD_Y, WORLD, hub, slotBase, slotTop } from '../config/layout';
import { ATLAS, bakeTexture } from './art';
import { mulberry32 } from './rand';

/** left edge of the mountain silhouette at world y (right edge is mirrored) */
export function edgeL(y: number): number {
  const pts: [number, number][] = [[0, 250], [300, 170], [500, 120], [560, 100], [900, 70], [1300, 40], [1900, 10], [2400, -20], [3300, -40]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [y0, x0] = pts[i], [y1, x1] = pts[i + 1];
    if (y >= y0 && y <= y1) return x0 + ((x1 - x0) * (y - y0)) / (y1 - y0);
  }
  return -40;
}

const SNOW = ['#F4F8FB', '#EEF5FB', '#E8F1F9', '#E1EDF7', '#D5EAF8'];

export function bakeBackground(scene: Phaser.Scene) {
  bakeTexture(scene, 'bg', WORLD.w, WORLD.h, c => {
    const rnd = mulberry32(42);
    // sky
    const sky = c.createLinearGradient(0, 0, 0, 2600);
    sky.addColorStop(0, '#4F8FD0'); sky.addColorStop(0.45, '#8FC4E8'); sky.addColorStop(1, '#CFE8F7');
    c.fillStyle = sky; c.fillRect(0, 0, WORLD.w, WORLD.h);
    // soft clouds
    for (let i = 0; i < 9; i++) {
      const cx = rnd() * 1200, cy = 40 + rnd() * 900, s = 0.7 + rnd() * 1.1;
      c.fillStyle = 'rgba(255,255,255,0.55)';
      for (let k = 0; k < 5; k++) { c.beginPath(); c.ellipse(cx + k * 24 * s - 48 * s, cy + (k % 2) * 6, 34 * s, 16 * s, 0, 0, 6.3); c.fill(); }
    }
    // distant blue mountain ranges behind the main mountain
    c.fillStyle = '#7FA9CE';
    c.beginPath(); c.moveTo(0, 900);
    for (let x = 0; x <= 1200; x += 60) c.lineTo(x, 620 + Math.sin(x * 0.012) * 90 + rnd() * 60);
    c.lineTo(1200, 1400); c.lineTo(0, 1400); c.closePath(); c.fill();
    c.fillStyle = '#6E97BF';
    c.beginPath(); c.moveTo(0, 1200);
    for (let x = 0; x <= 1200; x += 50) c.lineTo(x, 1000 + Math.sin(x * 0.02 + 2) * 110 + rnd() * 70);
    c.lineTo(1200, 1800); c.lineTo(0, 1800); c.closePath(); c.fill();

    // rock body of the main mountain
    const outline = (inset: number, jag: number, seed: number) => {
      const r = mulberry32(seed);
      const left: [number, number][] = [];
      for (let y = 0; y <= 3000; y += 26) left.push([edgeL(y) + inset + (r() - 0.5) * jag, y]);
      c.beginPath();
      c.moveTo(left[0][0], left[0][1]);
      for (const [x, y] of left) c.lineTo(x, y);
      for (let i = left.length - 1; i >= 0; i--) c.lineTo(WORLD.w - left[i][0], left[i][1]);
      c.closePath();
    };
    outline(0, 26, 7); c.fillStyle = '#5A6878'; c.fill();
    outline(6, 22, 8); c.fillStyle = '#6D7A8C'; c.fill();
    // snow per area with vertical gradients
    AREAS.forEach((a, i) => {
      const [y0, y1] = a.band;
      c.save();
      outline(26, 30, 11); c.clip();
      const g = c.createLinearGradient(0, y0, 0, y1);
      g.addColorStop(0, SNOW[Math.min(4, i + 1)]); g.addColorStop(1, SNOW[i]);
      c.fillStyle = g; c.fillRect(0, y0, WORLD.w, y1 - y0 + 1);
      // soft drifts
      for (let k = 0; k < 14; k++) {
        const x = rnd() * 1200, y = y0 + rnd() * (y1 - y0), w = 90 + rnd() * 200;
        c.fillStyle = 'rgba(190,212,232,0.28)'; c.beginPath(); c.ellipse(x, y, w, 9 + rnd() * 10, 0, 0, 6.3); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.ellipse(x - 12, y - 6, w * 0.8, 6, 0, 0, 6.3); c.fill();
      }
      c.restore();
    });
    // glacier crevasses and ice highlights
    c.save(); outline(26, 30, 11); c.clip();
    for (let i = 0; i < 16; i++) {
      const x = 100 + rnd() * 1000, y = 30 + rnd() * 440;
      c.strokeStyle = 'rgba(70,130,180,0.45)'; c.lineWidth = 1.6 + rnd() * 2;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + 30 + rnd() * 50, y + 10 + rnd() * 20); c.lineTo(x + 60 + rnd() * 60, y + 4 + rnd() * 26); c.stroke();
    }
    c.restore();
    // area ridge lines (shadow + snow lip)
    for (let i = 1; i < AREAS.length; i++) {
      if (i === 4) continue;
      const yy = AREAS[i - 1].band[0];
      c.save(); outline(26, 30, 11); c.clip();
      const g = c.createLinearGradient(0, yy - 6, 0, yy + 22);
      g.addColorStop(0, 'rgba(90,110,135,0.38)'); g.addColorStop(1, 'rgba(90,110,135,0)');
      c.fillStyle = g; c.fillRect(0, yy - 6, WORLD.w, 28);
      c.beginPath(); c.moveTo(0, yy);
      for (let x = 0; x <= 1200; x += 40) c.lineTo(x, yy - 4 + Math.sin(x * 0.03 + i) * 5 + rnd() * 4);
      c.lineTo(1200, yy - 14); c.lineTo(0, yy - 14); c.closePath(); c.fillStyle = 'rgba(255,255,255,0.75)'; c.fill();
      c.restore();
    }
    // canyon
    const [cy0, cy1] = CANYON_BAND;
    c.save(); outline(26, 30, 11); c.clip();
    const cg = c.createLinearGradient(0, cy0, 0, cy1);
    cg.addColorStop(0, '#5B6B7E'); cg.addColorStop(0.5, '#2B3A4C'); cg.addColorStop(1, '#4A5A6D');
    c.fillStyle = cg;
    c.beginPath(); c.moveTo(0, cy0 + 8);
    for (let x = 0; x <= 1200; x += 30) c.lineTo(x, cy0 + 6 + rnd() * 10);
    for (let x = 1200; x >= 0; x -= 30) c.lineTo(x, cy1 - 4 + rnd() * 10);
    c.closePath(); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.25)';
    for (let x = 0; x < 1200; x += 70) { c.beginPath(); c.moveTo(x, cy0 + 12); c.lineTo(x + 20, cy1 - 8); c.lineTo(x + 34, cy0 + 12); c.fill(); }
    c.restore();

    // village ground
    const vg = c.createLinearGradient(0, 2900, 0, 3200);
    vg.addColorStop(0, '#EAF3FA'); vg.addColorStop(1, '#C9D9E6');
    c.fillStyle = vg; c.fillRect(0, 2895, WORLD.w, 305);
    c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.moveTo(0, 2896); for (let x = 0; x <= 1200; x += 40) c.lineTo(x, 2892 + Math.sin(x * 0.05) * 4 + rnd() * 4); c.lineTo(1200, 2908); c.lineTo(0, 2908); c.fill();
    // road
    c.fillStyle = '#4C5866'; c.fillRect(0, ROAD_Y - 24, WORLD.w, 48);
    c.fillStyle = '#5E6B7B'; c.fillRect(0, ROAD_Y - 24, WORLD.w, 4);
    c.strokeStyle = '#F2D34F'; c.lineWidth = 3; c.setLineDash([26, 20]); c.beginPath(); c.moveTo(0, ROAD_Y); c.lineTo(WORLD.w, ROAD_Y); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#AFC2D3'; c.fillRect(0, ROAD_Y + 24, WORLD.w, 8);
    // parking lot
    c.fillStyle = '#5A6675'; c.fillRect(PARKING_POS.x - 130, PARKING_POS.y - 122, 296, 160);
    c.fillStyle = '#6A7686'; c.fillRect(PARKING_POS.x - 128, PARKING_POS.y - 120, 292, 4);
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.4;
    for (let col = 0; col <= 10; col++) { c.beginPath(); c.moveTo(PARKING_POS.x - 126 + col * 28, PARKING_POS.y - 118); c.lineTo(PARKING_POS.x - 126 + col * 28, PARKING_POS.y + 34); c.stroke(); }
    c.fillStyle = '#F4F8FB'; c.font = 'bold 13px system-ui, sans-serif'; c.textAlign = 'center';
    c.fillText('P', PARKING_POS.x - 150, PARKING_POS.y - 100);
    // lodge plaza
    c.fillStyle = '#DCEAF5'; c.beginPath(); c.ellipse(LODGE_POS.x, LODGE_POS.y + 8, 130, 22, 0, 0, 6.3); c.fill();
  }, 1);
}

export const SKI_SWAY = (id: number) => Math.sin(id * 12.9898) * 26;

export function pisteCurve(fromX: number, fromY: number, toX: number, toY: number, sway = 0) {
  const cx = fromX + (toX - fromX) * 0.15 + sway;
  const cy = (fromY + toY) / 2;
  return { cx, cy };
}

const PISTE_SCALE = 0.75;

/** pistes are baked into a canvas texture (smooth joins, no per-frame geometry) and redrawn only when lines change */
export class PisteLayer {
  private tex: Phaser.Textures.CanvasTexture;
  constructor(scene: Phaser.Scene) {
    this.tex = scene.textures.createCanvas('pistes', Math.ceil(WORLD.w * PISTE_SCALE), Math.ceil(WORLD.h * PISTE_SCALE))!;
    scene.add.image(0, 0, 'pistes').setOrigin(0, 0).setScale(1 / PISTE_SCALE).setDepth(-90);
  }
  redraw(lines: { areaId: string; slot: number }[], ownedAreas: string[]) {
    const c = this.tex.getContext();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.tex.width, this.tex.height);
    c.scale(PISTE_SCALE, PISTE_SCALE);
    c.lineCap = 'round'; c.lineJoin = 'round';
    const strip = (x0: number, y0: number, x1: number, y1: number, w: number, col: string) => {
      const { cx, cy } = pisteCurve(x0, y0, x1, y1);
      c.strokeStyle = col; c.lineWidth = w;
      c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(cx, cy, x1, y1); c.stroke();
    };
    AREAS.forEach((a, ai) => {
      if (!ownedAreas.includes(a.id)) return;
      const h = hub(ai);
      c.fillStyle = 'rgba(190,212,232,0.7)'; c.beginPath(); c.ellipse(h.x, h.y + 6, 170, 26, 0, 0, 6.3); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.97)'; c.beginPath(); c.ellipse(h.x, h.y + 2, 150, 19, 0, 0, 6.3); c.fill();
    });
    for (const l of lines) {
      const ai = AREAS.findIndex(a => a.id === l.areaId);
      const b = slotBase(ai, l.slot), t = slotTop(ai, l.slot), h = hub(ai);
      strip(t.x, t.y, h.x, h.y, 122, 'rgba(178,203,226,0.6)');
      strip(t.x, t.y, h.x, h.y, 100, 'rgba(255,255,255,0.98)');
      strip(t.x - 24, t.y, h.x - 24, h.y, 2.4, 'rgba(206,222,236,0.9)');
      strip(t.x + 24, t.y, h.x + 24, h.y, 2.4, 'rgba(206,222,236,0.9)');
      // soft queue apron under the base station
      c.fillStyle = 'rgba(190,212,232,0.55)'; c.beginPath(); c.ellipse(b.x, b.y + 46, 60, 52, 0, 0, 6.3); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.96)'; c.beginPath(); c.ellipse(b.x, b.y + 44, 54, 46, 0, 0, 6.3); c.fill();
    }
    this.tex.refresh();
  }
}

/** static decoration: pines and rocks, avoiding lifts, zones and buildings */
export function placeDecor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
  const rnd = mulberry32(99);
  const keepOut: { x: number; y: number; r: number }[] = [];
  AREAS.forEach((a, ai) => {
    a.slots.forEach((_, i) => {
      const b = slotBase(ai, i), t = slotTop(ai, i);
      for (let k = 0; k <= 6; k++) keepOut.push({ x: b.x + (t.x - b.x) * k / 6, y: b.y + (t.y - b.y) * k / 6, r: 85 });
      keepOut.push({ x: 600, y: hub(ai).y, r: 190 });
    });
  });
  for (const b of BUILDINGS) keepOut.push({ x: b.pos.x, y: b.pos.y, r: 90 });
  for (const z of ZONES) keepOut.push({ x: z.pos.x + 70, y: z.pos.y - 30, r: 100 });
  const free = (x: number, y: number) => !keepOut.some(k => (k.x - x) ** 2 + (k.y - y) ** 2 < k.r * k.r);
  const keys = ['pine_s', 'pine_m', 'pine_l'];
  for (let y = 40; y < 2890; y += 30) {
    if (y > 500 && y < 570) continue;
    for (let side = 0; side < 2; side++) {
      for (let k = 0; k < 2; k++) {
        const inset = 30 + rnd() * 90;
        const x = side === 0 ? edgeL(y) + inset : WORLD.w - edgeL(y) - inset;
        const yy = y + rnd() * 26;
        if (!free(x, yy) || rnd() < 0.2) continue;
        const key = keys[Math.floor(rnd() * 3)];
        const img = scene.add.image(x, yy, ATLAS, key).setOrigin(0.5, 1).setScale(0.5 * (0.85 + rnd() * 0.3));
        img.setDepth(yy); layer.add(img);
      }
    }
  }
  // scattered clusters in open snow
  for (let i = 0; i < 90; i++) {
    const y = 60 + rnd() * 2820;
    if (y > 495 && y < 575) continue;
    const x = edgeL(y) + 60 + rnd() * (WORLD.w - 2 * edgeL(y) - 120);
    if (!free(x, y) || rnd() < 0.35) continue;
    const img = scene.add.image(x, y, ATLAS, rnd() < 0.7 ? keys[Math.floor(rnd() * 3)] : ['rock_a', 'rock_b'][Math.floor(rnd() * 2)]).setOrigin(0.5, 1).setScale(0.5 * (0.8 + rnd() * 0.4));
    img.setDepth(y); layer.add(img);
  }
  // rocks along ridge lines
  for (const a of AREAS) {
    for (let i = 0; i < 6; i++) {
      const y = a.band[0] + 4 + rnd() * 10, x = 100 + rnd() * 1000;
      if (!free(x, y)) continue;
      const img = scene.add.image(x, y, ATLAS, ['rock_b', 'rock_c'][Math.floor(rnd() * 2)]).setOrigin(0.5, 1).setScale(0.5 * (0.8 + rnd() * 0.5));
      img.setDepth(y); layer.add(img);
    }
  }
  // village trees
  for (let i = 0; i < 14; i++) {
    const x = 40 + rnd() * 1120, y = 2915 + rnd() * 30;
    if (Math.abs(x - 600) < 120 || x < 380 || (x > 900 && x < 1140)) continue;
    const img = scene.add.image(x, y, ATLAS, keys[Math.floor(rnd() * 3)]).setOrigin(0.5, 1).setScale(0.5);
    img.setDepth(y); layer.add(img);
  }
}
