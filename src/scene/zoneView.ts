import Phaser from 'phaser';
import { ZONES } from '../config/zones';
import { ATLAS, S } from './art';
import { areaOwned } from '../core/state';
import type { GameState } from '../core/game';

export class ZoneView {
  private imgs = new Map<string, Phaser.GameObjects.Image>();
  private plots = new Map<string, Phaser.GameObjects.Image>();
  private labels = new Map<string, Phaser.GameObjects.Text>();
  constructor(private scene: Phaser.Scene) {
    for (const z of ZONES) {
      const key = z.id === 'park' ? 'zone_park1' : `zone_${z.id}`;
      const im = scene.add.image(z.pos.x, z.pos.y, ATLAS, key).setOrigin(0, 1).setScale(1.5 / S).setDepth(z.pos.y).setVisible(false);
      this.imgs.set(z.id, im);
      const plot = scene.add.image(z.pos.x + 70, z.pos.y - 20, ATLAS, 'plus').setScale(1.9 / S).setDepth(z.pos.y + 5).setVisible(false);
      this.plots.set(z.id, plot);
      const lb = scene.add.text(z.pos.x + 100, z.pos.y - 110, '', { fontFamily: 'system-ui, sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#fff', stroke: '#26384d', strokeThickness: 5 }).setOrigin(0.5, 1).setDepth(5000).setVisible(false);
      this.labels.set(z.id, lb);
    }
  }
  update(s: GameState, time: number, zoomRel: number) {
    for (const z of ZONES) {
      const zs = s.zones[z.id];
      const im = this.imgs.get(z.id)!, plot = this.plots.get(z.id)!, lb = this.labels.get(z.id)!;
      im.setVisible(zs.owned);
      if (zs.owned && z.stages) {
        const key = `zone_park${zs.stage + 1}`;
        if (im.frame.name !== key) im.setFrame(key);
      }
      plot.setVisible(!zs.owned && areaOwned(s, z.requiresArea)).setScale((1.9 / S) * (1 + Math.sin(time * 3 + z.pos.x) * 0.08));
      if (zs.owned) {
        const name = z.stages ? z.stages[zs.stage].name : z.name;
        const txt = `${name}  Lv ${zs.level}`;
        if (lb.text !== txt) lb.setText(txt);
        lb.setVisible(zoomRel > 1.2).setScale(Math.min(1, 1.2 / zoomRel * 1.1) * 0.9);
      } else lb.setVisible(false);
    }
  }
  hit(wx: number, wy: number): string | null {
    for (const z of ZONES) if (wx > z.pos.x - 10 && wx < z.pos.x + 240 && wy > z.pos.y - 100 && wy < z.pos.y + 15) return z.id;
    return null;
  }
}
