import Phaser from 'phaser';
import { BUS_STOP, LODGE_POS, PARKING_POS, ROAD_Y } from '../config/layout';
import { S } from './art';
import type { GameState } from '../core/game';
import { counts } from '../core/guests';

export class BusView {
  private bus: Phaser.GameObjects.Image;
  constructor(scene: Phaser.Scene) {
    scene.add.image(BUS_STOP.x + 96, ROAD_Y - 22, 'busstop').setOrigin(0.5, 1).setScale(1.1 / S).setDepth(ROAD_Y - 22);
    this.bus = scene.add.image(-200, ROAD_Y + 12, 'bus').setOrigin(0.5, 1).setScale(1.1 / S).setDepth(3400).setVisible(false);
  }
  update(s: GameState) {
    const t = s.rt.time + s.rt.acc - s.rt.busT0;
    if (s.rt.busT0 < 0 || t < 0 || t > 20) { this.bus.setVisible(false); return; }
    const x0 = -150, x1 = BUS_STOP.x, x2 = 1400;
    let x: number;
    if (t < 5) { const u = t / 5; x = x0 + (x1 - x0) * (1 - (1 - u) * (1 - u)); }
    else if (t < 14) x = x1;
    else { const u = (t - 14) / 6; x = x1 + (x2 - x1) * u * u; }
    this.bus.setVisible(true).setPosition(x, ROAD_Y + 12);
  }
}

export class VillageView {
  private cars: Phaser.GameObjects.Image[] = [];
  private lodge: Phaser.GameObjects.Image;
  private label: Phaser.GameObjects.Text;
  private shown = 0;
  constructor(private scene: Phaser.Scene) {
    this.lodge = scene.add.image(LODGE_POS.x, LODGE_POS.y + 12, 'lodge').setOrigin(0.5, 1).setScale(1 / S).setDepth(LODGE_POS.y + 12);
    for (let i = 0; i < 60; i++) {
      const col = i % 10, row = Math.floor(i / 10);
      const x = PARKING_POS.x - 126 + 14 + col * 28, y = PARKING_POS.y - 112 + 20 + row * 25;
      const c = scene.add.image(x, y, `car_${(i * 7) % 4}`).setOrigin(0.5, 1).setScale(0.62 / S).setDepth(y).setVisible(false);
      this.cars.push(c);
    }
    this.label = scene.add.text(PARKING_POS.x, PARKING_POS.y + 44, '', { fontFamily: 'system-ui, sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#fff', stroke: '#26384d', strokeThickness: 5 }).setOrigin(0.5, 0).setDepth(5000);
  }
  update(s: GameState, parkingCap: number, zoomRel: number) {
    const c = counts(s);
    const n = Math.min(60, c.day);
    if (n !== this.shown) { this.shown = n; this.cars.forEach((car, i) => car.setVisible(i < n)); }
    const txt = `Parking ${c.day}/${parkingCap}`;
    if (this.label.text !== txt) this.label.setText(txt);
    this.label.setVisible(zoomRel > 0.9).setScale(Math.min(1.3, 1.2 / zoomRel * 1.2));
  }
  hitParking(wx: number, wy: number) { return wx < PARKING_POS.x + 170 && wx > PARKING_POS.x - 140 && wy > PARKING_POS.y - 130 && wy < PARKING_POS.y + 60; }
  hitLodge(wx: number, wy: number) { return wx > LODGE_POS.x - 105 && wx < LODGE_POS.x + 105 && wy > LODGE_POS.y - 125 && wy < LODGE_POS.y + 20; }
}
