import { newGame } from './core/game';
import type { GameState } from './core/game';

type Handler = (...args: any[]) => void;

/** Tiny shared store + event emitter between the Phaser scene, the HTML UI and services. */
class App {
  state: GameState = newGame();
  private handlers: Record<string, Handler[]> = {};
  debug = false;
  /** camera info published by the map for UI-space effects */
  view = { zoom: 1, cx: 600, cy: 2400, w: 390, h: 844 };

  on(ev: string, fn: Handler) { (this.handlers[ev] ||= []).push(fn); return () => this.off(ev, fn); }
  off(ev: string, fn: Handler) { this.handlers[ev] = (this.handlers[ev] || []).filter(h => h !== fn); }
  emit(ev: string, ...args: any[]) { for (const h of this.handlers[ev] || []) h(...args); }
}
export const app = new App();
