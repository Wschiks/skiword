import Phaser from 'phaser';
import { BUILDINGS } from '../config/facilities';
import { ATLAS, S } from './art';
import { areaOwned } from '../core/state';
import type { GameState } from '../core/game';

export class BuildingView {
  private imgs = new Map<string, Phaser.GameObjects.Image>();
  private plots = new Map<string, Phaser.GameObjects.Image>();
  private labels = new Map<string, Phaser.GameObjects.Text>();
  constructor(scene: Phaser.Scene) {
    for (const b of BUILDINGS) {
      const im = scene.add.image(b.pos.x, b.pos.y, ATLAS, `bld_${b.id}`).setOrigin(0.5, 1).setScale(2.1 / S).setDepth(b.pos.y).setVisible(false);
      this.imgs.set(b.id, im);
      const plot = scene.add.image(b.pos.x, b.pos.y - 14, ATLAS, 'plus').setScale(1.9 / S).setDepth(b.pos.y + 5).setVisible(false);
      this.plots.set(b.id, plot);
      const lb = scene.add.text(b.pos.x, b.pos.y - 150, '', { fontFamily: 'system-ui, sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#fff', stroke: '#2F5F9E', strokeThickness: 5 }).setOrigin(0.5, 1).setDepth(5000).setVisible(false);
      this.labels.set(b.id, lb);
    }
  }
  update(s: GameState, time: number, zoomRel: number) {
    for (const b of BUILDINGS) {
      const L = s.buildings[b.id] || 0;
      const im = this.imgs.get(b.id)!, plot = this.plots.get(b.id)!, lb = this.labels.get(b.id)!;
      im.setVisible(L > 0);
      plot.setVisible(L === 0 && areaOwned(s, b.requiresArea)).setScale((1.9 / S) * (1 + Math.sin(time * 3 + b.pos.y) * 0.08));
      const txt = `${b.name}  Lv ${L}`;
      if (L > 0) { if (lb.text !== txt) lb.setText(txt); lb.setVisible(zoomRel > 1.2).setScale(Math.min(1, 1.2 / zoomRel * 1.1) * 0.9); } else lb.setVisible(false);
    }
  }
  hit(wx: number, wy: number): string | null {
    for (const b of BUILDINGS) if (Math.abs(wx - b.pos.x) < 90 && wy > b.pos.y - 130 && wy < b.pos.y + 15) return b.id;
    return null;
  }
}
