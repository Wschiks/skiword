import Phaser from 'phaser';
import { AREAS } from '../config/areas';
import { WORLD, slotBase, slotTop } from '../config/layout';
import { app } from '../app';
import { advance, areaCost, parkingCapacity } from '../core/game';
import { ATLAS, bakeAll, S } from './art';
import { PisteLayer, bakeBackground, edgeL, placeDecor } from './background';
import { MapView } from './MapView';
import { GuestView } from './guestView';
import { LiftView, cableFrom, cableTo } from './liftView';
import { BuildingView } from './buildingView';
import { ZoneView } from './zoneView';
import { BusView, VillageView } from './busView';
import { Fx } from './fx';
import { formatMoney } from '../ui/format';

export type MapHit =
  | { type: 'line'; id: string } | { type: 'slot'; areaId: string; slot: number }
  | { type: 'area'; id: string } | { type: 'building'; id: string } | { type: 'zone'; id: string }
  | { type: 'parking' } | { type: 'lodge' };

export class MapScene extends Phaser.Scene {
  mv!: MapView;
  private guests!: GuestView; private lifts!: LiftView; private buildings!: BuildingView; private zones!: ZoneView;
  private bus!: BusView; private village!: VillageView; private fx!: Fx;
  private pistes!: PisteLayer;
  private locks!: Phaser.GameObjects.Graphics;
  private areaLabels: Phaser.GameObjects.Text[] = [];
  private priceLabels = new Map<string, Phaser.GameObjects.Text>();
  private signs = new Map<string, Phaser.GameObjects.Image>();
  private pisteSig = ''; private lockSig = '';
  private syncT = 0;
  private dprV = 1;
  private hilite?: Phaser.GameObjects.Image;

  constructor() { super('map'); }

  create() {
    bakeAll(this);
    bakeBackground(this);
    this.add.image(0, 0, 'bg').setOrigin(0, 0).setDepth(-100);
    this.add.rectangle(0, WORLD.h, WORLD.w * 3, 900, 0xc9d9e6).setOrigin(0.5, 0).setDepth(-101);
    this.add.rectangle(0, -900, WORLD.w * 3, 900, 0x4f8fd0).setOrigin(0.5, 0).setDepth(-101);
    this.pistes = new PisteLayer(this);
    const decor = this.add.layer();
    placeDecor(this, decor);
    this.village = new VillageView(this);
    this.buildings = new BuildingView(this);
    this.zones = new ZoneView(this);
    this.lifts = new LiftView(this);
    this.guests = new GuestView(this);
    this.bus = new BusView(this);
    this.fx = new Fx(this);
    this.locks = this.add.graphics().setDepth(5200);
    this.makeAreaLabels();

    const host = document.getElementById('game')!;
    this.mv = new MapView(host);
    this.mv.onTap = (x, y) => { const h = this.hitTest(x, y); if (h) app.emit('mapTap', h); };
    const resize = () => this.onResize();
    window.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('resize', resize);
    this.onResize();
    this.cameras.main.setBackgroundColor('#8FC4E8');
    app.emit('sceneReady', this);
  }

  private onResize() {
    const host = document.getElementById('game')!;
    const w = host.clientWidth || window.innerWidth, h = host.clientHeight || window.innerHeight;
    if (!(w >= 50 && h >= 50)) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.dprV = dpr;
    this.scale.setZoom(1 / dpr);
    this.scale.resize(Math.round(w * dpr), Math.round(h * dpr));
    this.mv.resize(w, h, dpr);
    this.mv.dpr = dpr;
    app.view.w = w; app.view.h = h;
  }

  private makeAreaLabels() {
    AREAS.forEach((a, i) => {
      const t = this.add.text(edgeL(a.band[0] + 40) + 60, a.band[0] + 22, a.name.toUpperCase(), { fontFamily: 'system-ui, sans-serif', fontSize: '40px', fontStyle: 'bold', color: '#ffffff', stroke: '#3b5675', strokeThickness: 7 }).setDepth(5100).setAlpha(0.92);
      this.areaLabels.push(t);
      const sign = this.add.image(600, (a.band[0] + a.band[1]) / 2, ATLAS, 'forsale').setScale(2.2 / S).setDepth(5300).setVisible(false);
      this.signs.set(a.id, sign);
      const p = this.add.text(600, (a.band[0] + a.band[1]) / 2 + 95, '', { fontFamily: 'system-ui, sans-serif', fontSize: '46px', fontStyle: 'bold', color: '#ffffff', stroke: '#26384d', strokeThickness: 8 }).setOrigin(0.5).setDepth(5301).setVisible(false);
      this.priceLabels.set(a.id, p);
    });
  }

  private syncStatics(force = false) {
    const s = app.state;
    this.lifts.sync(s);
    const psig = s.lines.map(l => l.id).sort().join(',') + '#' + s.areasOwned.join(',');
    if (psig !== this.pisteSig || force) { this.pisteSig = psig; this.pistes.redraw(s.lines, s.areasOwned); }
    const lsig = s.areasOwned.join(',') + '#' + Math.floor(s.money >= 0 ? 1 : 0);
    const next = AREAS.find(a => !s.areasOwned.includes(a.id));
    const nsig = lsig + (next ? `${next.id}:${Math.round(areaCost(next.id))}` : '');
    if (nsig !== this.lockSig || force) {
      this.lockSig = nsig;
      this.locks.clear();
      AREAS.forEach((a, i) => {
        const owned = s.areasOwned.includes(a.id);
        this.signs.get(a.id)!.setVisible(!owned);
        const pl = this.priceLabels.get(a.id)!;
        pl.setVisible(!owned);
        if (owned) return;
        const isNext = next?.id === a.id;
        pl.setText(formatMoney(areaCost(a.id)));
        pl.setColor(isNext ? '#ffe28a' : '#c9d3df');
        this.locks.fillStyle(0x1e2f44, isNext ? 0.5 : 0.68);
        const [y0, y1] = a.band;
        const pts: Phaser.Math.Vector2[] = [];
        for (let y = y0; y <= y1; y += 40) pts.push(new Phaser.Math.Vector2(edgeL(y) + 24, y));
        for (let y = y1; y >= y0; y -= 40) pts.push(new Phaser.Math.Vector2(WORLD.w - edgeL(y) - 24, y));
        this.locks.fillPoints(pts, true);
        });
    }
  }

  update(_t: number, delta: number) {
    const dt = Math.min(0.1, delta / 1000);
    const s = app.state;
    advance(s, dt);
    this.mv.update(dt);
    this.mv.apply(this.cameras.main);
    const zoom = this.mv.zoom;
    const zoomRel = zoom / this.mv.fit;
    const hw = this.mv.w / (2 * zoom), hh = this.mv.h / (2 * zoom);
    const view = { l: this.mv.cx - hw, r: this.mv.cx + hw, t: this.mv.cy - hh, b: this.mv.cy + hh };
    app.view = { zoom, cx: this.mv.cx, cy: this.mv.cy, w: this.mv.w, h: this.mv.h };
    this.syncT -= dt;
    if (this.syncT <= 0) { this.syncT = 0.2; this.syncStatics(); }
    const time = this.time.now / 1000;
    this.guests.update(s, time, view);
    this.lifts.update(s, time, zoomRel);
    this.buildings.update(s, time, zoomRel);
    this.zones.update(s, time, zoomRel);
    this.village.update(s, parkingCapacity(s), zoomRel);
    this.bus.update(s);
    // events
    const ev = s.rt.events;
    for (const e of ev) {
      if (e.k === 'pay') { if (e.x > view.l - 80 && e.x < view.r + 80 && e.y > view.t - 80 && e.y < view.b + 80) this.fx.pay(e.x, e.y, e.amount, e.src); }
      app.emit('event', e);
    }
    ev.length = 0;
    this.fx.update(dt, zoom, this.dprV, this.mv.w, this.mv.h, true);
  }

  hitTest(wx: number, wy: number): MapHit | null {
    const s = app.state;
    const slot = this.lifts.hit(wx, wy);
    if (slot) return slot;
    for (const l of s.lines) {
      const f = cableFrom(l), e = cableTo(l);
      const ai = AREAS.findIndex(a => a.id === l.areaId);
      const b = slotBase(ai, l.slot), t = slotTop(ai, l.slot);
      // distance to segment
      const dx = e.x - f.x, dy = e.y - f.y, L2 = dx * dx + dy * dy;
      const u = Math.max(0, Math.min(1, ((wx - f.x) * dx + (wy - f.y) * dy) / L2));
      const d = Math.hypot(wx - (f.x + dx * u), wy - (f.y + dy * u));
      if (d < 46 || (Math.abs(wx - b.x) < 44 && wy > b.y - 44 && wy < b.y + 90) || (Math.abs(wx - t.x) < 30 && Math.abs(wy - t.y) < 30)) return { type: 'line', id: l.id };
    }
    const b = this.buildings.hit(wx, wy); if (b) return { type: 'building', id: b };
    const z = this.zones.hit(wx, wy); if (z) return { type: 'zone', id: z };
    if (this.village.hitParking(wx, wy) || this.village.hitLodge(wx, wy)) return { type: this.village.hitLodge(wx, wy) ? 'lodge' : 'parking' };
    for (const a of AREAS) if (!s.areasOwned.includes(a.id) && wy >= a.band[0] && wy <= a.band[1]) return { type: 'area', id: a.id };
    return null;
  }

  /** highlight ring on the map (tutorial) */
  ring(x: number | null, y = 0, size = 90) {
    if (x === null) { this.hilite?.setVisible(false); return; }
    if (!this.hilite) this.hilite = this.add.image(0, 0, ATLAS, 'ring').setDepth(7000);
    this.hilite.setVisible(true).setPosition(x, y).setScale(size / 32 / S * 2 * (1 + Math.sin(this.time.now / 200) * 0.08));
  }
}
