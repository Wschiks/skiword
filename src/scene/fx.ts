import Phaser from 'phaser';
import { formatMoney } from '../ui/format';
import { ATLAS, S } from './art';

interface Float { text: Phaser.GameObjects.Text; t: number; x: number; y: number; on: boolean }

/** floating +$ texts (pooled, throttled to 30/s, aggregated when over) and cheap snowfall */
export class Fx {
  private floats: Float[] = [];
  private budget = 30;
  private agg = 0; private aggPos = { x: 0, y: 0 }; private aggTimer = 0;
  private bursts: { ring: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image; t: number; on: boolean; size: number }[] = [];
  private flakes: { img: Phaser.GameObjects.Image; x: number; y: number; v: number; sw: number; ph: number }[] = [];

  constructor(scene: Phaser.Scene) {
    for (let i = 0; i < 32; i++) {
      const t = scene.add.text(0, 0, '', { fontFamily: 'system-ui, sans-serif', fontSize: '26px', fontStyle: 'bold', color: '#1f8a4c', stroke: '#ffffff', strokeThickness: 5 }).setOrigin(0.5, 1).setDepth(6000).setVisible(false);
      this.floats.push({ text: t, t: 0, x: 0, y: 0, on: false });
    }
    for (let i = 0; i < 6; i++) {
      const ring = scene.add.image(0, 0, ATLAS, 'ring').setDepth(6500).setVisible(false);
      const glow = scene.add.image(0, 0, ATLAS, 'glow').setDepth(6499).setTint(0xffe28a).setVisible(false);
      this.bursts.push({ ring, glow, t: 0, on: false, size: 100 });
    }
    for (let i = 0; i < 60; i++) {
      const img = scene.add.image(0, 0, ATLAS, 'flake').setScrollFactor(0).setDepth(9000).setAlpha(0.85);
      this.flakes.push({ img, x: Math.random(), y: Math.random(), v: 0.03 + Math.random() * 0.05, sw: 0.01 + Math.random() * 0.02, ph: Math.random() * 6.28 });
    }
  }

  private spawn(x: number, y: number, amount: number, color: string) {
    const f = this.floats.find(v => !v.on);
    if (!f) return;
    f.on = true; f.t = 0; f.x = x + (Math.random() - 0.5) * 24; f.y = y;
    f.text.setText('+' + formatMoney(amount)).setColor(color).setVisible(true);
  }

  /** purchase burst in the world: expanding ring + warm glow */
  burst(x: number, y: number, size = 110) {
    const b = this.bursts.find(v => !v.on) ?? this.bursts[0];
    b.on = true; b.t = 0; b.size = size;
    b.ring.setPosition(x, y).setVisible(true); b.glow.setPosition(x, y).setVisible(true);
  }

  pay(x: number, y: number, amount: number, src: 'ride' | 'zone') {
    if (this.budget >= 1) { this.budget--; this.spawn(x, y, amount, src === 'ride' ? '#1f8a4c' : '#c77700'); }
    else { this.agg += amount; this.aggPos = { x, y }; }
  }

  update(dt: number, zoom: number, dpr: number, w: number, h: number, snow: boolean) {
    this.budget = Math.min(30, this.budget + 30 * dt);
    this.aggTimer -= dt;
    if (this.agg > 0 && this.aggTimer <= 0) { this.spawn(this.aggPos.x, this.aggPos.y, this.agg, '#1f8a4c'); this.agg = 0; this.aggTimer = 0.5; }
    for (const b of this.bursts) {
      if (!b.on) continue;
      b.t += dt;
      const k = b.t / 0.75;
      if (k >= 1) { b.on = false; b.ring.setVisible(false); b.glow.setVisible(false); continue; }
      const grow = 0.35 + 1.25 * (1 - Math.pow(1 - k, 3));
      b.ring.setScale((b.size * grow) / 64 / S * 2).setAlpha(1 - k);
      b.glow.setScale((b.size * 1.4 * grow) / 64 / S * 2).setAlpha(0.9 * (1 - k));
    }
    const sc = Math.min(2.2, Math.max(0.45, 12 / (26 * zoom)));
    for (const f of this.floats) {
      if (!f.on) continue;
      f.t += dt;
      if (f.t > 1.1) { f.on = false; f.text.setVisible(false); continue; }
      f.text.setPosition(f.x, f.y - 70 * sc * f.t).setAlpha(Math.min(1, (1.1 - f.t) * 2.2)).setScale(sc);
    }
    // snowfall in screen space (device px)
    const cw = w * dpr, ch = h * dpr, camZ = zoom * dpr;
    for (const fl of this.flakes) {
      fl.img.setVisible(snow);
      if (!snow) continue;
      fl.y += fl.v * dt; fl.ph += dt;
      if (fl.y > 1) { fl.y = -0.02; fl.x = Math.random(); }
      const sx = (fl.x + Math.sin(fl.ph) * fl.sw) * cw, sy = fl.y * ch;
      fl.img.setPosition((sx - cw / 2) / camZ + cw / 2, (sy - ch / 2) / camZ + ch / 2).setScale((0.42 * dpr) / camZ);
    }
  }
}
