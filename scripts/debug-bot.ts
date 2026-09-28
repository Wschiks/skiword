import { newGame, fastAdvance, estimate } from '../src/core/game';
import { plan, claimAllQuests } from '../src/core/bot';
const s = newGame(1);
for (let i = 0; i < 70; i++) {
  claimAllQuests(s);
  const pl = plan(s);
  if (!pl) break;
  const e = estimate(s);
  console.log(`t=${s.rt.time.toFixed(0)} money=${s.money.toFixed(0)} inc=${e.total.toFixed(2)} D=${e.D.toFixed(2)} S=${e.S.toFixed(2)} -> ${pl.p.label} cost=${pl.p.cost.toFixed(0)} wait=${pl.wait.toFixed(0)}`);
  if (pl.wait > 0) fastAdvance(s, pl.wait + 1e-6);
  pl.p.apply(s);
}
