import Phaser from 'phaser';
import { START_ZOOM, WORLD, ZOOM } from '../config/layout';

/** Camera controller: drag to pan, pinch / wheel to zoom, tap detection. Uses DOM pointer events. */
export class MapView {
  cx = WORLD.w / 2; cy = 2300; zoom = 0.33;
  w = 390; h = 844; dpr = 1;
  padTop = 150; padBottom = 110;
  private pointers = new Map<number, { x: number; y: number }>();
  private vx = 0; private vy = 0;
  private lastPinch = 0;
  private downAt = { x: 0, y: 0, t: 0 };
  private moved = 0;
  fit = 0.33;
  private inited = false;
  private pan: { t: number; dur: number; fx: number; fy: number; tx: number; ty: number; fz: number; tz: number } | null = null;
  onTap: (wx: number, wy: number) => void = () => {};

  constructor(private el: HTMLElement) {
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', e => this.down(e));
    el.addEventListener('pointermove', e => this.move(e));
    el.addEventListener('pointerup', e => this.up(e));
    el.addEventListener('pointercancel', e => this.up(e, true));
    el.addEventListener('wheel', e => { e.preventDefault(); this.zoomAt(e.offsetX, e.offsetY, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
  }

  resize(w: number, h: number, dpr: number) {
    // a hidden pane / webview can report 0x0 during startup; keep the old layout until a real size arrives
    if (!(w >= 50 && h >= 50) || !Number.isFinite(dpr)) return;
    const oldFit = this.fit;
    this.w = w; this.h = h; this.dpr = dpr;
    this.fit = w / WORLD.w;
    if (!this.inited) { this.inited = true; this.zoom = this.fit * START_ZOOM; this.cy = 1e6; }
    else this.zoom *= this.fit / oldFit;
    this.clamp();
  }

  screenToWorld(sx: number, sy: number) {
    return { x: this.cx + (sx - this.w / 2) / this.zoom, y: this.cy + (sy - this.h / 2) / this.zoom };
  }

  private clamp() {
    if (!Number.isFinite(this.zoom) || this.zoom <= 0) this.zoom = this.fit;
    if (!Number.isFinite(this.cx)) this.cx = WORLD.w / 2;
    if (!Number.isFinite(this.cy)) this.cy = 1e6;
    const min = this.fit * ZOOM.minFactor, max = this.fit * ZOOM.maxFactor;
    this.zoom = Math.min(max, Math.max(min, this.zoom));
    const hw = this.w / (2 * this.zoom), hh = this.h / (2 * this.zoom);
    if (hw * 2 >= WORLD.w) this.cx = WORLD.w / 2;
    else this.cx = Math.min(WORLD.w - hw, Math.max(hw, this.cx));
    const minCy = hh - this.padTop / this.zoom, maxCy = WORLD.h - hh + this.padBottom / this.zoom;
    this.cy = minCy > maxCy ? (minCy + maxCy) / 2 : Math.min(maxCy, Math.max(minCy, this.cy));
  }

  zoomAt(sx: number, sy: number, factor: number) {
    const before = this.screenToWorld(sx, sy);
    this.zoom *= factor;
    const min = this.fit * ZOOM.minFactor, max = this.fit * ZOOM.maxFactor;
    this.zoom = Math.min(max, Math.max(min, this.zoom));
    this.cx = before.x - (sx - this.w / 2) / this.zoom;
    this.cy = before.y - (sy - this.h / 2) / this.zoom;
    this.clamp();
  }

  /** Smooth camera glide so that world point (wx, wy) ends up at the given screen fraction (used after big purchases). */
  panTo(wx: number, wy: number, zoomFactor?: number, screenYFrac = 0.5, dur = 0.9) {
    const min = this.fit * ZOOM.minFactor, max = this.fit * ZOOM.maxFactor;
    const tz = Math.min(max, Math.max(min, zoomFactor ? this.fit * zoomFactor : this.zoom));
    this.pan = { t: 0, dur, fx: this.cx, fy: this.cy, tx: wx, ty: wy + ((0.5 - screenYFrac) * this.h) / tz, fz: this.zoom, tz };
  }

  focus(wx: number, wy: number, zoomFactor?: number) {
    this.pan = null;
    if (zoomFactor) this.zoom = this.fit * zoomFactor;
    this.cx = wx; this.cy = wy; this.clamp();
  }

  private down(e: PointerEvent) {
    this.pan = null; // the player takes over
    this.el.setPointerCapture?.(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    if (this.pointers.size === 1) { this.downAt = { x: e.offsetX, y: e.offsetY, t: performance.now() }; this.moved = 0; this.vx = this.vy = 0; }
    if (this.pointers.size === 2) this.lastPinch = this.pinchDist();
  }
  private pinchDist() {
    const [a, b] = [...this.pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  private move(e: PointerEvent) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.offsetX - p.x, dy = e.offsetY - p.y;
    p.x = e.offsetX; p.y = e.offsetY;
    this.moved += Math.abs(dx) + Math.abs(dy);
    if (this.pointers.size === 1) {
      this.cx -= dx / this.zoom; this.cy -= dy / this.zoom;
      this.vx = -dx / this.zoom * 60; this.vy = -dy / this.zoom * 60;
      this.clamp();
    } else if (this.pointers.size >= 2) {
      const d = this.pinchDist();
      const [a, b] = [...this.pointers.values()];
      if (this.lastPinch > 0) this.zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / this.lastPinch);
      this.lastPinch = d;
    }
  }
  private up(e: PointerEvent, cancel = false) {
    const had = this.pointers.has(e.pointerId);
    const single = this.pointers.size === 1;
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.lastPinch = 0;
    if (had && single && !cancel && this.moved < 10 && performance.now() - this.downAt.t < 450) {
      const w = this.screenToWorld(e.offsetX, e.offsetY);
      this.onTap(w.x, w.y);
    }
  }

  update(dt: number) {
    if (this.pan) {
      const p = this.pan;
      p.t += dt;
      const u = Math.min(1, p.t / p.dur), k = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      this.zoom = p.fz + (p.tz - p.fz) * k;
      this.cx = p.fx + (p.tx - p.fx) * k;
      this.cy = p.fy + (p.ty - p.fy) * k;
      this.clamp();
      if (u >= 1) this.pan = null;
      return;
    }
    if (this.pointers.size === 0 && (Math.abs(this.vx) > 1 || Math.abs(this.vy) > 1)) {
      this.cx += this.vx * dt; this.cy += this.vy * dt;
      const k = Math.pow(0.02, dt);
      this.vx *= k; this.vy *= k;
      this.clamp();
    }
  }

  apply(cam: Phaser.Cameras.Scene2D.Camera) {
    cam.setZoom(this.zoom * this.dpr);
    cam.centerOn(this.cx, this.cy);
  }
}
