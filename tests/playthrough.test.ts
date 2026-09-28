import { describe, it, expect } from 'vitest';
import { newGame, startNewSeason, seasonBonus, estimate, canNewSeason } from '../src/core/game';
import { runBot, MILESTONES, isMaxed, claimAllQuests } from '../src/core/bot';
import { QUESTS } from '../src/config/quests';
import { areaOwned } from '../src/core/state';

describe('balance bot playthrough (fast)', () => {
  it('plays Season 1 to the end: every milestone and quest', () => {
    const s = newGame(1);
    const r = runBot(s, { mode: 'fast', maxSeconds: 400 * 3600 });
    expect(r.finished).toBe(true);
    expect(isMaxed(s)).toBe(true);
    for (const m of MILESTONES) expect(r.timeline[m.id], m.id).toBeDefined();
    claimAllQuests(s);
    // the last quest (New Season) needs prestige; everything before must be complete
    const undone = QUESTS.filter(q => !s.quests.doneIds.includes(q.id)).map(q => q.id);
    expect(undone).toEqual(['q26']);
    expect(r.time / 3600).toBeGreaterThan(12); // fast variant
    expect(r.time / 3600).toBeLessThan(45);
  });
  it('second run: New Season applies the bonus and the New Season quest completes', () => {
    const s = newGame(1);
    runBot(s, { mode: 'fast', maxSeconds: 400 * 3600 });
    const before = estimate(s).total;
    expect(canNewSeason(s).ok).toBe(true);
    expect(startNewSeason(s).ok).toBe(true);
    expect(seasonBonus(s)).toBeGreaterThan(1.5);
    expect(areaOwned(s, 'lower')).toBe(false);
    // Season 2 starts faster than Season 1
    const r2 = runBot(s, { mode: 'fast', maxSeconds: 2 * 3600, until: st => areaOwned(st, 'mid') });
    const s1 = newGame(1);
    const r1 = runBot(s1, { mode: 'fast', maxSeconds: 2 * 3600, until: st => areaOwned(st, 'mid') });
    expect(r2.time).toBeLessThan(r1.time);
    claimAllQuests(s);
    expect(s.quests.doneIds).toContain('q26');
    expect(before).toBeGreaterThan(0);
  });
});

describe('full simulation bot (first 20 minutes)', () => {
  it('reaches the T-Bar and parking level 5 with few angry guests', () => {
    const s = newGame(2);
    const r = runBot(s, { mode: 'full', maxSeconds: 20 * 60 });
    expect(r.timeline.tbar).toBeDefined();
    expect(r.timeline.tbar).toBeLessThan(8 * 60);
    expect(r.timeline.parking5).toBeLessThan(10 * 60);
    expect(s.stats.ridesTotal).toBeGreaterThan(100);
    expect(r.angryLeaves).toBeLessThan(40);
  });
});
