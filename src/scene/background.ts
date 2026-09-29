import Phaser from 'phaser';
import { AREAS, CANYON_BAND } from '../config/areas';
import { BUILDINGS } from '../config/facilities';
import { ZONES } from '../config/zones';
import { LODGE_POS, PARKING_POS, ROAD_Y, WORLD, hub, slotBase, slotTop } from '../config/layout';
import { ATLAS, S, bakeTexture } from './art';
import { mulberry32 } from './rand';

/** the snowfield fills the whole world width; trees line the left and right edges */
export function edgeL(y: number): number {
  return 14 + Math.sin(y * 0.011) * 7 + Math.sin(y * 0.037) * 3;
}

export const LOT = { x0: PARKING_POS.x - 130, y0: 2944, w: 296, h: 178 };

export function bakeBackground(scene: Phaser.Scene) {
  bakeTexture(scene, 'bg', WORLD.w, WORLD.h, c => {
    const rnd = mulberry32(42);
    // ---- snowfield: near-white with a faint ice tint on the glacier
    const base = c.createLinearGradient(0, 0, 0, WORLD.h);
    base.addColorStop(0, '#E2F0FB'); base.addColorStop(0.16, '#EEF6FD'); base.addColorStop(0.19, '#FAFDFF'); base.addColorStop(0.9, '#FFFFFF'); base.addColorStop(1, '#F1F7FD');
    c.fillStyle = base; c.fillRect(0, 0, WORLD.w, WORLD.h);
    // ---- soft dunes: blue-grey shadow with a white highlight on top
    for (let i = 0; i < 260; i++) {
      const x = rnd() * 1200, y = 20 + rnd() * 2880, rx = 80 + rnd() * 240, ry = 18 + rnd() * 52;
      if (y > 500 && y < 566) continue;
      c.fillStyle = 'rgba(184,205,232,0.27)'; c.beginPath(); c.ellipse(x + 12, y + 9, rx, ry, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.92)'; c.beginPath(); c.ellipse(x, y, rx * 0.93, ry * 0.86, 0, 0, Math.PI * 2); c.fill();
    }
    // ---- glacier: ice patches and cracks
    for (let i = 0; i < 26; i++) {
      const x = rnd() * 1200, y = 30 + rnd() * 450;
      c.fillStyle = 'rgba(150,205,245,0.22)'; c.beginPath(); c.ellipse(x, y, 40 + rnd() * 90, 10 + rnd() * 22, 0, 0, Math.PI * 2); c.fill();
    }
    for (let i = 0; i < 22; i++) {
      let x = 60 + rnd() * 1080, y = 30 + rnd() * 440;
      c.strokeStyle = 'rgba(96,160,220,0.55)'; c.lineWidth = 2 + rnd() * 2; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(x, y);
      for (let k = 0; k < 4; k++) { x += 20 + rnd() * 40; y += (rnd() - 0.4) * 24; c.lineTo(x, y); }
      c.stroke();
    }
    // ---- area ridges: a soft shadow under every border
    for (const a of AREAS) {
      const y = a.band[0];
      if (y === 0) continue;
      const g = c.createLinearGradient(0, y, 0, y + 34);
      g.addColorStop(0, 'rgba(150,180,220,0.38)'); g.addColorStop(1, 'rgba(150,180,220,0)');
      c.fillStyle = g; c.fillRect(0, y, WORLD.w, 34);
    }
    // ---- canyon: deep blue crevasse with icy lips
    const [cy0, cy1] = CANYON_BAND;
    c.fillStyle = 'rgba(150,180,220,0.4)'; c.fillRect(0, cy0 - 8, WORLD.w, 12);
    const cg = c.createLinearGradient(0, cy0, 0, cy1);
    cg.addColorStop(0, '#5C86BC'); cg.addColorStop(0.5, '#274C86'); cg.addColorStop(1, '#3D68A3');
    c.fillStyle = cg; c.beginPath(); c.moveTo(0, cy0 + 6);
    for (let x = 0; x <= 1200; x += 26) c.lineTo(x, cy0 + 4 + rnd() * 9);
    for (let x = 1200; x >= 0; x -= 26) c.lineTo(x, cy1 - 5 + rnd() * 9);
    c.closePath(); c.fill();
    c.fillStyle = 'rgba(20,40,80,0.28)';
    for (let x = 0; x < 1200; x += 60) { c.beginPath(); c.moveTo(x, cy0 + 12); c.lineTo(x + 18, cy1 - 8); c.lineTo(x + 30, cy0 + 12); c.fill(); }
    c.fillStyle = '#FFFFFF';
    for (let x = 0; x < 1200; x += 22) { c.beginPath(); c.moveTo(x, cy0 + 5); c.lineTo(x + 11, cy0 + 14 + rnd() * 8); c.lineTo(x + 22, cy0 + 5); c.fill(); }
    // ---- soft edge shading on the left and right border
    for (const side of [0, 1]) {
      const x0 = side ? WORLD.w - 70 : 0;
      const g = c.createLinearGradient(side ? WORLD.w : 0, 0, side ? WORLD.w - 70 : 70, 0);
      g.addColorStop(0, 'rgba(120,160,205,0.38)'); g.addColorStop(1, 'rgba(120,160,205,0)');
      c.fillStyle = g; c.fillRect(x0, 0, 70, WORLD.h);
    }
    // ---- village: cleared ground, road, parking lot, plaza
    const vg = c.createLinearGradient(0, 2900, 0, 3200);
    vg.addColorStop(0, '#FFFFFF'); vg.addColorStop(1, '#E4EEF8');
    c.fillStyle = vg; c.fillRect(0, 2900, WORLD.w, 300);
    c.fillStyle = '#DDE7F2'; c.beginPath(); c.roundRect(LODGE_POS.x - 150, LODGE_POS.y - 30, 300, 74, 22); c.fill();
    c.strokeStyle = 'rgba(160,185,215,0.55)'; c.lineWidth = 1.5;
    for (let x = LODGE_POS.x - 130; x < LODGE_POS.x + 140; x += 36) { c.beginPath(); c.moveTo(x, LODGE_POS.y - 28); c.lineTo(x, LODGE_POS.y + 42); c.stroke(); }
    // road
    c.fillStyle = 'rgba(96,128,176,0.28)'; c.fillRect(0, ROAD_Y - 20, WORLD.w, 52);
    c.fillStyle = '#3E4A5B'; c.fillRect(0, ROAD_Y - 24, WORLD.w, 48);
    c.fillStyle = '#4C5A6E'; c.fillRect(0, ROAD_Y - 24, WORLD.w, 5);
    c.strokeStyle = '#FFD23F'; c.lineWidth = 3.4; c.setLineDash([28, 20]); c.beginPath(); c.moveTo(0, ROAD_Y); c.lineTo(WORLD.w, ROAD_Y); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#F4F8FC'; c.fillRect(0, ROAD_Y + 24, WORLD.w, 8);
    // parking lot
    c.fillStyle = 'rgba(96,128,176,0.3)'; c.beginPath(); c.roundRect(LOT.x0 + 8, LOT.y0 + 8, LOT.w, LOT.h, 10); c.fill();
    c.fillStyle = '#465267'; c.beginPath(); c.roundRect(LOT.x0, LOT.y0, LOT.w, LOT.h, 10); c.fill();
    c.fillStyle = '#525F76'; c.fillRect(LOT.x0 + 6, LOT.y0 + 4, LOT.w - 12, 3);
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1.5;
    for (let col = 0; col <= 10; col++) { c.beginPath(); c.moveTo(LOT.x0 + 6 + col * 28, LOT.y0 + 10); c.lineTo(LOT.x0 + 6 + col * 28, LOT.y0 + LOT.h - 8); c.stroke(); }
    c.fillStyle = '#FFFFFF'; c.font = 'bold 15px system-ui, sans-serif'; c.textAlign = 'center';
    fillPlate(c, LOT.x0 - 6, LOT.y0 + 6);
  }, 1);
}

function fillPlate(c: CanvasRenderingContext2D, x: number, y: number) {
  c.fillStyle = '#2F8BEA'; c.beginPath(); c.roundRect(x - 12, y - 4, 24, 24, 6); c.fill();
  c.fillStyle = '#FFFFFF'; c.font = 'bold 17px system-ui, sans-serif'; c.textAlign = 'center'; c.fillText('P', x, y + 14);
}

export const SKI_SWAY = (id: number) => Math.sin(id * 12.9898) * 26;

export function pisteCurve(fromX: number, fromY: number, toX: number, toY: number, sway = 0) {
  const cx = fromX + (toX - fromX) * 0.15 + sway;
  const cy = (fromY + toY) / 2;
  return { cx, cy };
}

const LAYER_SCALE = 0.75;

/** red-orange net fence between two points (drawn on a canvas layer) */
function net(c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
  if (len < 4) return;
  c.save(); c.translate(x0, y0); c.rotate(Math.atan2(dy, dx));
  c.fillStyle = 'rgba(96,128,176,0.3)'; c.fillRect(0, 1, len, 4);
  c.fillStyle = 'rgba(240,83,59,0.88)'; c.fillRect(0, -9, len, 7);
  c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 1.1;
  for (let k = 0; k < len - 4; k += 6) { c.beginPath(); c.moveTo(k, -2); c.lineTo(k + 5, -9); c.stroke(); }
  c.fillStyle = '#C9402C'; c.fillRect(0, -10.4, len, 1.8);
  const n = Math.max(1, Math.round(len / 14));
  c.fillStyle = '#4A5563';
  for (let i = 0; i <= n; i++) c.fillRect((i * len) / n - 1, -12, 2, 13);
  c.restore();
}

/** thin ski tracks, snow aprons and red fences: baked into canvas layers and redrawn only when lifts change */
export class PisteLayer {
  private tex: Phaser.Textures.CanvasTexture;
  private fenceTex: Phaser.Textures.CanvasTexture;
  constructor(scene: Phaser.Scene) {
    const w = Math.ceil(WORLD.w * LAYER_SCALE), h = Math.ceil(WORLD.h * LAYER_SCALE);
    this.tex = scene.textures.createCanvas('pistes', w, h)!;
    scene.add.image(0, 0, 'pistes').setOrigin(0, 0).setScale(1 / LAYER_SCALE).setDepth(-90);
    this.fenceTex = scene.textures.createCanvas('fences', w, h)!;
    // fences sit above the ground props, below guests: depth by y is not needed for thin lines
    scene.add.image(0, 0, 'fences').setOrigin(0, 0).setScale(1 / LAYER_SCALE).setDepth(2000);
    this.drawFences([]);
  }

  redraw(lines: { areaId: string; slot: number }[], ownedAreas: string[]) {
    const c = this.tex.getContext();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.tex.width, this.tex.height);
    c.scale(LAYER_SCALE, LAYER_SCALE);
    c.lineCap = 'round'; c.lineJoin = 'round';
    const point = (x0: number, y0: number, x1: number, y1: number, t: number, off: number, wob: number) => {
      const { cx, cy } = pisteCurve(x0, y0, x1, y1);
      const u = 1 - t;
      const px = u * u * x0 + 2 * u * t * cx + t * t * x1, py = u * u * y0 + 2 * u * t * cy + t * t * y1;
      const tx = 2 * u * (cx - x0) + 2 * t * (x1 - cx), ty = 2 * u * (cy - y0) + 2 * t * (y1 - cy);
      const l = Math.hypot(tx, ty) || 1;
      return [px - (ty / l) * off + Math.sin(t * 14 + wob) * 2.4, py + (tx / l) * off];
    };
    const track = (x0: number, y0: number, x1: number, y1: number, off: number, wob: number, col: string, w: number) => {
      c.strokeStyle = col; c.lineWidth = w; c.beginPath();
      for (let i = 0; i <= 34; i++) { const [px, py] = point(x0, y0, x1, y1, i / 34, off, wob); if (i === 0) c.moveTo(px, py); else c.lineTo(px, py); }
      c.stroke();
    };
    AREAS.forEach((a, ai) => {
      if (!ownedAreas.includes(a.id)) return;
      const h = hub(ai);
      c.fillStyle = 'rgba(184,205,232,0.5)'; c.beginPath(); c.ellipse(h.x, h.y + 4, 176, 28, 0, 0, 6.3); c.fill();
      c.fillStyle = '#FFFFFF'; c.beginPath(); c.ellipse(h.x, h.y, 160, 22, 0, 0, 6.3); c.fill();
      for (let k = 0; k < 9; k++) { c.strokeStyle = 'rgba(160,188,222,0.6)'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(h.x - 140 + k * 14 + (k % 2) * 6, h.y - 8); c.quadraticCurveTo(h.x - 100 + k * 25, h.y + 6, h.x - 60 + k * 18, h.y + 12); c.stroke(); }
    });
    for (const l of lines) {
      const ai = AREAS.findIndex(a => a.id === l.areaId);
      const b = slotBase(ai, l.slot), t = slotTop(ai, l.slot), h = hub(ai);
      track(t.x, t.y, h.x, h.y, 0, 0, 'rgba(196,214,238,0.55)', 96);
      track(t.x, t.y, h.x, h.y, 0, 0, 'rgba(255,255,255,0.95)', 82);
      [-30, -15, 0, 15, 30].forEach((o, k) => track(t.x, t.y, h.x, h.y, o, k * 1.7, 'rgba(146,176,214,0.78)', 2.1));
      // queue apron under the base station
      c.fillStyle = 'rgba(184,205,232,0.5)'; c.beginPath(); c.roundRect(b.x - 52, b.y - 10, 104, 118, 20); c.fill();
      c.fillStyle = '#FFFFFF'; c.beginPath(); c.roundRect(b.x - 47, b.y - 6, 94, 108, 17); c.fill();
      for (let k = 0; k < 4; k++) { c.strokeStyle = 'rgba(146,176,214,0.5)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(b.x - 36 + k * 24, b.y + 8); c.lineTo(b.x - 36 + k * 24, b.y + 94); c.stroke(); }
    }
    this.tex.refresh();
    this.drawFences(lines);
  }

  private drawFences(lines: { areaId: string; slot: number }[]) {
    const c = this.fenceTex.getContext();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.fenceTex.width, this.fenceTex.height);
    c.scale(LAYER_SCALE, LAYER_SCALE);
    // border nets between areas, with a gap where guests walk between hubs
    // (pieces are skipped where a lift base, a lift top or the hub walkway is)
    AREAS.forEach((a, ai) => {
      const y = a.band[0];
      if (y === 0) return;
      const gaps: [number, number][] = [[520, 680]];
      for (const l of lines) {
        const li = AREAS.findIndex(x => x.id === l.areaId);
        if (li === ai) { const tp = slotTop(li, l.slot); gaps.push([tp.x - 66, tp.x + 66]); }
        if (li === ai - 1) { const bs = slotBase(li, l.slot); gaps.push([bs.x - 66, bs.x + 66]); }
      }
      gaps.sort((p, q) => p[0] - q[0]);
      let x = 24;
      for (const [g0, g1] of gaps) { if (g0 > x) net(c, x, y, Math.min(g0, 1176), y); x = Math.max(x, g1); }
      if (x < 1176) net(c, x, y, 1176, y);
    });
    // short wing nets guiding the queue at each lift base
    for (const l of lines) {
      const ai = AREAS.findIndex(a => a.id === l.areaId);
      const b = slotBase(ai, l.slot);
      net(c, b.x - 50, b.y + 46, b.x - 50, b.y + 6);
      net(c, b.x + 50, b.y + 46, b.x + 50, b.y + 6);
    }
    // parking lot fence
    c.strokeStyle = '#2F4A78'; c.lineWidth = 2.4; c.strokeRect(LOT.x0 - 3, LOT.y0 - 3, LOT.w + 6, LOT.h + 6);
    c.fillStyle = '#2F4A78'; for (let x = LOT.x0; x <= LOT.x0 + LOT.w; x += 20) { c.fillRect(x - 1, LOT.y0 - 7, 2.4, 6); c.fillRect(x - 1, LOT.y0 + LOT.h + 1, 2.4, 6); }
    this.fenceTex.refresh();
  }
}

/** static decoration: dense forest at the edges, tree groups, bushes and rocks, avoiding lifts, zones and buildings */
export function placeDecor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
  const rnd = mulberry32(99);
  const keepOut: { x: number; y: number; r: number }[] = [];
  AREAS.forEach((a, ai) => {
    a.slots.forEach((_, i) => {
      const b = slotBase(ai, i), t = slotTop(ai, i);
      for (let k = 0; k <= 8; k++) keepOut.push({ x: b.x + (t.x - b.x) * k / 8, y: b.y + (t.y - b.y) * k / 8, r: 92 });
    });
    keepOut.push({ x: 600, y: hub(ai).y, r: 200 });
  });
  for (const b of BUILDINGS) keepOut.push({ x: b.pos.x, y: b.pos.y - 30, r: 95 });
  for (const z of ZONES) keepOut.push({ x: z.pos.x + 70, y: z.pos.y - 30, r: 100 });
  keepOut.push({ x: LODGE_POS.x, y: LODGE_POS.y - 40, r: 150 }, { x: PARKING_POS.x + 20, y: PARKING_POS.y - 40, r: 200 });
  const free = (x: number, y: number) => !keepOut.some(k => (k.x - x) ** 2 + (k.y - y) ** 2 < k.r * k.r);
  const pines = ['pine_s', 'pine_m', 'pine_l'];
  const put = (key: string, x: number, y: number, sc: number) => {
    const img = scene.add.image(x, y, ATLAS, key).setOrigin(0.5, 0.97).setScale(sc / S);
    img.setDepth(y); layer.add(img);
  };
  // dense forest at both edges
  for (let y = 20; y < 2900; y += 24) {
    if (y > 500 && y < 570) continue;
    for (const side of [0, 1]) {
      const rows = 2 + Math.floor(rnd() * 2);
      for (let k = 0; k < rows; k++) {
        const inset = 18 + k * 34 + rnd() * 22;
        const x = side === 0 ? inset : WORLD.w - inset;
        const yy = y + rnd() * 20;
        if (!free(x, yy) || rnd() < 0.12) continue;
        put(pines[Math.floor(rnd() * 3)], x, yy, 0.85 + rnd() * 0.4);
      }
    }
  }
  // top edge of the glacier and the far end of the village
  for (let x = 30; x < 1180; x += 30) { const y = 26 + rnd() * 26; if (free(x, y) && rnd() < 0.7) put(pines[Math.floor(rnd() * 3)], x, y, 0.85 + rnd() * 0.3); }
  // scattered groups in open snow
  for (let i = 0; i < 130; i++) {
    const y = 90 + rnd() * 2800;
    if (y > 495 && y < 575) continue;
    const x = 110 + rnd() * 980;
    if (!free(x, y)) continue;
    const r = rnd();
    if (r < 0.5) put(pines[Math.floor(rnd() * 3)], x, y, 0.8 + rnd() * 0.35);
    else if (r < 0.8) put(rnd() < 0.5 ? 'bush_a' : 'bush_b', x, y, 0.9 + rnd() * 0.4);
    else put(['rock_a', 'rock_b'][Math.floor(rnd() * 2)], x, y, 0.75 + rnd() * 0.4);
  }
  // rocks tucked along the borders
  for (const a of AREAS) for (let i = 0; i < 5; i++) {
    const y = a.band[0] + 18 + rnd() * 10, x = 80 + rnd() * 1040;
    if (Math.abs(x - 600) < 110 || !free(x, y)) continue;
    put(['rock_b', 'rock_c'][Math.floor(rnd() * 2)], x, y, 0.7 + rnd() * 0.4);
  }
  // village trees
  for (let i = 0; i < 16; i++) {
    const x = 380 + rnd() * 500, y = 2918 + rnd() * 30;
    if (Math.abs(x - 600) < 130 || !free(x, y)) continue;
    put(pines[Math.floor(rnd() * 3)], x, y, 0.85);
  }
}
