import Phaser from 'phaser';
import { AREAS, areaIndex } from '../config/areas';
import { slotBase, slotTop } from '../config/layout';
import { ATLAS, S } from './art';
import { tierDef, rideTime } from '../core/economy';
import type { GameState, Line } from '../core/game';

const CARRIER: Record<string, string> = { drag1: 'carrier_dot', drag2: 'carrier_t', chair: 'carrier_chair', gondola: 'carrier_cabin' };
const carrierKey = (tier: number) => (tier === 1 ? CARRIER.drag1 : tier === 2 ? CARRIER.drag2 : tier <= 6 ? CARRIER.chair : CARRIER.gondola);

export const cableFrom = (l: { areaId: string; slot: number }) => { const b = slotBase(areaIndex(l.areaId), l.slot); return { x: b.x, y: b.y - 34 }; };
export const cableTo = (l: { areaId: string; slot: number }) => { const t = slotTop(areaIndex(l.areaId), l.slot); return { x: t.x, y: t.y - 28 }; };

export class LiftView {
  private cable: Phaser.GameObjects.Graphics;
  private dots: Phaser.GameObjects.Graphics;
  private statics: Phaser.GameObjects.GameObject[] = [];
  private carriers: Phaser.GameObjects.Image[] = [];
  private labels = new Map<string, Phaser.GameObjects.Text>();
  private plus: { img: Phaser.GameObjects.Image; areaId: string; slot: number }[] = [];
  private sig = '';
  private bridgeCabin: Phaser.GameObjects.Image | null = null;

  constructor(private scene: Phaser.Scene) {
    this.cable = scene.add.graphics().setDepth(3500);
    this.dots = scene.add.graphics().setDepth(4001);
  }

  /** rebuild static geometry when lines / owned areas change */
  sync(s: GameState) {
    const sig = s.lines.map(l => `${l.id}:${l.tier}`).sort().join('|') + '#' + s.areasOwned.join(',');
    if (sig === this.sig) return;
    this.sig = sig;
    for (const o of this.statics) o.destroy();
    this.statics = []; this.plus = [];
    this.cable.clear();
    for (const l of s.lines) this.buildLine(l);
    for (const a of AREAS) {
      if (!s.areasOwned.includes(a.id)) continue;
      a.slots.forEach((_, i) => {
        if (s.lines.some(l => l.areaId === a.id && l.slot === i)) return;
        const b = slotBase(areaIndex(a.id), i);
        const img = this.scene.add.image(b.x, b.y - 12, ATLAS, 'plus').setScale(1.9 / S).setDepth(b.y + 10);
        this.statics.push(img); this.plus.push({ img, areaId: a.id, slot: i });
      });
    }
    // decorative gondola bridge across the canyon once the Glacier is owned
    this.bridgeCabin = null;
    if (s.areasOwned.includes('glacier')) {
      for (const x of [170, 1030]) {
        const tw = this.scene.add.image(x, 560, ATLAS, 'tower').setOrigin(0.5, 1).setScale(2.2 / S).setDepth(560);
        this.statics.push(tw);
      }
      this.cable.lineStyle(2.4, 0x37424f, 1);
      this.cable.beginPath(); this.cable.moveTo(170, 505); this.cable.lineTo(1030, 505); this.cable.strokePath();
      this.bridgeCabin = this.scene.add.image(600, 505, ATLAS, 'carrier_cabin').setOrigin(0.5, 0).setScale(1.6 / S).setDepth(4000);
      this.statics.push(this.bridgeCabin);
    }
    for (const [id, t] of this.labels) if (!s.lines.some(l => l.id === id)) { t.destroy(); this.labels.delete(id); }
  }

  private buildLine(l: Line) {
    const ai = areaIndex(l.areaId);
    const b = slotBase(ai, l.slot), t = slotTop(ai, l.slot);
    const f = cableFrom(l), e = cableTo(l);
    // cable strands
    this.cable.lineStyle(2.2, 0x37424f, 1);
    this.cable.beginPath(); this.cable.moveTo(f.x - 5, f.y); this.cable.lineTo(e.x - 5, e.y); this.cable.strokePath();
    this.cable.beginPath(); this.cable.moveTo(f.x + 5, f.y); this.cable.lineTo(e.x + 5, e.y); this.cable.strokePath();
    const len = Math.hypot(e.x - f.x, e.y - f.y);
    const n = Math.max(2, Math.floor(len / 95));
    for (let k = 1; k <= n; k++) {
      const u = k / (n + 1);
      const im = this.scene.add.image(f.x + (e.x - f.x) * u, f.y + (e.y - f.y) * u + 26, ATLAS, 'tower').setOrigin(0.5, 1).setScale(1.2 / S * 2 / 2).setDepth(f.y + (e.y - f.y) * u + 26);
      this.statics.push(im);
    }
    const base = this.scene.add.image(b.x, b.y - 2, ATLAS, 'station').setOrigin(0.5, 1).setScale(1.5 / S).setDepth(b.y + 1);
    const top = this.scene.add.image(t.x, t.y + 6, ATLAS, 'station_top').setOrigin(0.5, 1).setScale(1.5 / S).setDepth(t.y + 6);
    this.statics.push(base, top);
    if (!this.labels.has(l.id)) {
      const lb = this.scene.add.text(b.x, b.y - 58, '', { fontFamily: 'system-ui, sans-serif', fontSize: '24px', fontStyle: 'bold', color: '#ffffff', stroke: '#26384d', strokeThickness: 5 }).setOrigin(0.5, 1).setDepth(5000);
      this.labels.set(l.id, lb);
    }
  }

  private carrier(i: number) {
    let c = this.carriers[i];
    if (!c) { c = this.scene.add.image(0, 0, ATLAS, 'carrier_dot').setDepth(4000); this.carriers[i] = c; }
    return c;
  }

  update(s: GameState, time: number, zoomRel: number) {
    const now = s.rt.time + s.rt.acc;
    let n = 0;
    this.dots.clear();
    for (const l of s.lines) {
      const f = cableFrom(l), e = cableTo(l);
      const key = carrierKey(l.tier);
      const sc = (key === 'carrier_cabin' ? 1.5 : key === 'carrier_chair' ? 1.5 : 1.4) / S * 1;
      const rt = rideTime(l);
      // loaded carriers going up
      for (const d of l.departures) {
        const u = (now - d.t0) / d.rideTime;
        if (u < 0 || u > 1) continue;
        const c = this.carrier(n++);
        const x = f.x + 5 + (e.x - f.x) * u, y = f.y + (e.y - f.y) * u;
        c.setFrame(key).setOrigin(0.5, 0).setPosition(x, y).setScale(sc).setVisible(true);
        const hang = key === 'carrier_cabin' ? 12 : key === 'carrier_chair' ? 10 : 6;
        this.dots.fillStyle(0xffffff, 1);
        for (let k = 0; k < Math.min(d.n, 12); k++) {
          const col = [0xe84a5f, 0x2e86de, 0xff8c42, 0x3fb57a, 0xf2b705, 0x8e5bd9][k % 6];
          this.dots.fillStyle(col, 1);
          this.dots.fillCircle(x - 6 + (k % 6) * 2.4, y + hang + 3 + Math.floor(k / 6) * 3.4, 1.5);
        }
      }
      // empties coming down
      const m = tierDef(l.tier).family === 'chair' ? 4 : 3;
      for (let k = 0; k < m; k++) {
        const u = 1 - ((k / m + now / rt) % 1);
        const c = this.carrier(n++);
        c.setFrame(key).setOrigin(0.5, 0).setPosition(f.x - 5 + (e.x - f.x) * u, f.y + (e.y - f.y) * u).setScale(sc * 0.95).setVisible(true);
      }
      const lb = this.labels.get(l.id);
      if (lb) {
        const txt = `${tierDef(l.tier).name}  Lv ${l.level}`;
        if (lb.text !== txt) lb.setText(txt);
        lb.setVisible(zoomRel > 1.25).setScale(Math.min(1, 1.25 / zoomRel * 1.15) * 0.9);
      }
    }
    for (let i = n; i < this.carriers.length; i++) this.carriers[i].setVisible(false);
    if (this.bridgeCabin) this.bridgeCabin.x = 600 + Math.sin(now / 9) * 400;
    const pulse = 1 + Math.sin(time * 3) * 0.08;
    for (const p of this.plus) p.img.setScale(1.9 / S * pulse);
  }

  hit(wx: number, wy: number): { type: 'line'; id: string } | { type: 'slot'; areaId: string; slot: number } | null {
    for (const p of this.plus) {
      if (Math.abs(p.img.x - wx) < 40 && Math.abs(p.img.y - wy) < 40) return { type: 'slot', areaId: p.areaId, slot: p.slot };
    }
    return null;
  }
}
