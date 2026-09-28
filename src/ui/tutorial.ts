import type { GameState } from '../core/game';

export interface TutStep { text: string; target: 'upgrade' | 'parking' | 'rebuild' | 'mountain' | null }

/** Scripted highlights (spec 12.4). Steps 5 (first angry leave toast) and 7 (done) show no persistent text. */
export function tutorialStep(s: GameState): TutStep | null {
  if (s.tutorial.done) return null;
  switch (s.tutorial.step) {
    case 1: return { text: 'Tap the lift to upgrade it.', target: 'upgrade' };
    case 2: return { text: 'Guests pay for every ride. Upgrade again.', target: 'upgrade' };
    case 3: return { text: 'More parking means more guests.', target: 'parking' };
    case 4: return { text: 'Rebuild your button lift into a T-Bar.', target: 'rebuild' };
    case 6: return { text: 'Open more mountain.', target: 'mountain' };
    default: return null;
  }
}
export const ANGRY_TOAST = 'Guests give up when queues are long. Upgrade your lift.';
