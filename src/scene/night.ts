import Phaser from 'phaser';
import { BUILDINGS } from '../config/facilities';
import { LODGE_POS, PARKING_POS, WORLD } from '../config/layout';
import { NIGHT_TINT } from '../config/theme';
import { ATLAS, S } from './art';
import { edgeL } from './background';
import { mulberry32 } from './rand';
import type { GameState } from '../core/game';
import { areaIndex } from '../config/areas';
import { slotBase, slotTop } from '../config/layout';

/** Night look: a multiply tint over the world, stars and moon above it, additive glows for lit windows and lamps. */
export class NightLayer {
  private lineGlows: Phaser.GameObjects.Image[] = [];
  private sig = '';
  private buildingGlows = new Map<string, Phaser.GameObjects.Image>();

  constructor(private scene: Phaser.Scene) {
    const tint = scene.add.rectangle(-WORLD.w, -1200, WORLD.w * 3, WORLD.h + 2400, NIGHT_TINT).setOrigin(0, 0).setDepth(8000);
    tint.setBlendMode(Phaser.BlendModes.MULTIPLY);
    scene.cameras.main.setBackgroundColor('#0b1633');
    // stars + moon in the sky (only outside the mountain silhouette), above the tint so they stay bright
    if (scene.textures.exists('nightsky')) scene.textures.remove('nightsky');
    const tex = scene.textures.createCanvas('nightsky', WORLD.w, 1400)!;
    const c = tex.getContext();
    const rnd = mulberry32(5);
    for (let i = 0; i < 260; i++) {
      const y = rnd() * 1400, x = rnd() * WORLD.w;
      if (x > edgeL(y) - 6 && x < WORLD.w - edgeL(y) + 6) continue;
      c.fillStyle = `rgba(255,255,255,${0.35 + rnd() * 0.65})`;
      const r = rnd() < 0.15 ? 2.2 : 1.2;
      c.beginPath(); c.arc(x, y, r, 0, 6.3); c.fill();
    }
    const mg = c.createRadialGradient(1010, 150, 10, 1010, 150, 110);
    mg.addColorStop(0, 'rgba(255,248,214,0.55)'); mg.addColorStop(1, 'rgba(255,248,214,0)');
    c.fillStyle = mg; c.fillRect(880, 20, 260, 260);
    c.fillStyle = '#FFF6D6'; c.beginPath(); c.arc(1010, 150, 34, 0, 6.3); c.fill();
    c.fillStyle = '#0b1633'; c.beginPath(); c.arc(1022, 142, 30, 0, 6.3); c.fill();
    tex.refresh();
    scene.add.image(0, 0, 'nightsky').setOrigin(0, 0).setDepth(8010);

    // static glows: lodge windows, parking lamp posts, building windows
    this.glow(LODGE_POS.x, LODGE_POS.y - 60, 170, 0xffc25a, 0.9);
    for (let i = 0; i < 4; i++) this.glow(PARKING_POS.x - 100 + i * 90, PARKING_POS.y - 130, 90, 0xffe2a0, 0.8);
    for (const b of BUILDINGS) { const g = this.glow(b.pos.x, b.pos.y - 26, 110, 0xffc25a, 0.85); g.setVisible(false); this.buildingGlows.set(b.id, g); }
  }

  private glow(x: number, y: number, size: number, color: number, alpha: number) {
    const g = this.scene.add.image(x, y, ATLAS, 'glow').setScale(size / 64 / S * 2).setTint(color).setAlpha(alpha).setDepth(8100);
    g.setBlendMode(Phaser.BlendModes.ADD);
    return g;
  }

  update(s: GameState, time: number) {
    const sig = s.lines.map(l => l.id).sort().join(',');
    if (sig !== this.sig) {
      this.sig = sig;
      for (const g of this.lineGlows) g.destroy();
      this.lineGlows = [];
      for (const l of s.lines) {
        const ai = areaIndex(l.areaId);
        const b = slotBase(ai, l.slot), t = slotTop(ai, l.slot);
        this.lineGlows.push(this.glow(b.x, b.y - 24, 80, 0xffd58a, 0.85), this.glow(t.x, t.y - 10, 60, 0xffd58a, 0.8));
      }
    }
    for (const b of BUILDINGS) this.buildingGlows.get(b.id)!.setVisible((s.buildings[b.id] || 0) > 0).setAlpha(0.75 + Math.sin(time * 2 + b.pos.y) * 0.08);
  }
}
