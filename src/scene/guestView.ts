import Phaser from 'phaser';
import { ZONES } from '../config/zones';
import { BUILDINGS } from '../config/facilities';
import { LODGE_POS, hub } from '../config/layout';
import { S, guestKey } from './art';
import { SKI_SWAY, pisteCurve } from './background';
import type { GameState, Guest } from '../core/game';
import { areaIndex } from '../config/areas';
import { lineBase } from '../core/lifts';

const zonePos = (id: string) => ZONES.find(z => z.id === id)!.pos;
void BUILDINGS;

export interface Pos { x: number; y: number; visible: boolean; moving: boolean; dir: number }

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function guestPos(s: GameState, g: Guest, out: Pos): Pos {
  const acc = s.rt.acc;
  const t = clamp01(1 - (g.timer - acc) / Math.max(0.01, g.dur));
  out.visible = true; out.moving = false; out.dir = 0;
  switch (g.state) {
    case 'arriving': case 'walkingToLift': case 'walkingToZone': case 'returning': case 'leaving':
      out.x = g.from.x + (g.to.x - g.from.x) * t;
      out.y = g.from.y + (g.to.y - g.from.y) * t;
      out.moving = true; out.dir = Math.sign(g.to.x - g.from.x);
      break;
    case 'skiing': {
      const { cx, cy } = pisteCurve(g.from.x, g.from.y, g.to.x, g.to.y, SKI_SWAY(g.id));
      const u = 1 - t;
      out.x = u * u * g.from.x + 2 * u * t * cx + t * t * g.to.x;
      out.y = u * u * g.from.y + 2 * u * t * cy + t * t * g.to.y;
      out.dir = Math.sign(2 * u * (cx - g.from.x) + 2 * t * (g.to.x - cx));
      out.moving = true;
      break;
    }
    case 'queueing': {
      const line = s.lines.find(l => l.id === g.lineId);
      if (!line) { out.visible = false; break; }
      const b = lineBase(line);
      out.x = b.x + ((g.qi % 5) - 2) * 12;
      out.y = b.y + 20 + Math.floor(g.qi / 5) * 14;
      break;
    }
    case 'lobby': {
      const h = hub(g.area);
      out.x = h.x + ((g.id * 37) % 200) - 100; out.y = h.y + ((g.id * 53) % 22) - 4;
      break;
    }
    case 'inZone': {
      const p = zonePos(g.zoneId!);
      out.x = p.x + (((g.id * 29) % 120) - 55); out.y = p.y + 14 + ((g.id * 17) % 26);
      break;
    }
    case 'eating': {
      const k = t < 0.3 ? t / 0.3 : t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
      out.x = g.from.x + (g.to.x - g.from.x) * k; out.y = g.from.y + (g.to.y - g.from.y) * k;
      out.moving = k > 0 && k < 1; out.dir = Math.sign(g.to.x - g.from.x) * (t > 0.75 ? -1 : 1);
      break;
    }
    default:
      out.visible = false; // riding, resting, choosing
  }
  void LODGE_POS; void areaIndex;
  return out;
}

export class GuestView {
  private pool: Phaser.GameObjects.Image[] = [];
  private badges: Phaser.GameObjects.Image[] = [];
  private tmp: Pos = { x: 0, y: 0, visible: true, moving: false, dir: 0 };
  visibleCount = 0;

  constructor(private scene: Phaser.Scene) {}

  private img(i: number) {
    let im = this.pool[i];
    if (!im) {
      im = this.scene.add.image(0, 0, 'guests', guestKey('ski', 0, 0)).setOrigin(0.5, 1).setScale(1 / S);
      this.pool[i] = im;
    }
    return im;
  }

  update(s: GameState, time: number, view: { l: number; r: number; t: number; b: number }) {
    const guests = s.rt.guests;
    let n = 0, nb = 0;
    const m = 40;
    for (const g of guests) {
      const p = guestPos(s, g, this.tmp);
      if (!p.visible || p.x < view.l - m || p.x > view.r + m || p.y < view.t - m || p.y > view.b + m) continue;
      const im = this.img(n++);
      const frame = p.moving ? (Math.floor(time * 6 + g.id) & 1) : 0;
      im.setFrame(guestKey(g.kind, g.color, frame));
      im.setPosition(p.x, p.y - (p.moving && g.state !== 'skiing' && frame ? 1.2 : 0));
      im.setFlipX(p.dir < 0);
      im.setDepth(p.y + 1);
      im.setVisible(true);
      if (g.angry && g.state === 'leaving') {
        let b = this.badges[nb];
        if (!b) { b = this.scene.add.image(0, 0, 'frown').setScale(1 / S * 1.1); this.badges[nb] = b; }
        b.setPosition(p.x, p.y - 34).setDepth(p.y + 2).setVisible(true);
        nb++;
      }
    }
    for (let i = n; i < this.pool.length; i++) this.pool[i].setVisible(false);
    for (let i = nb; i < this.badges.length; i++) this.badges[i].setVisible(false);
    this.visibleCount = n;
  }
}
