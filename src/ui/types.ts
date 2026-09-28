import type { GameState } from '../core/game';
import type { Count } from '../core/unlocks';

export interface Ctx {
  s: GameState;
  mult: Count;
  focus: string | null;
  picker: string | null;
  tut: string | null;
  now: number;
  legal?: string | null;
  helpOpen?: boolean;
  resetArmed?: boolean;
}
export type ActResult = { ok: true; silent?: boolean; n?: number } | { ok: false; reason: string } | undefined;
