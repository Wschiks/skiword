import { simulate, estimate } from '../src/core/game';
import { SPECS, build } from '../tests/helpers/states';
for (const sp of SPECS) {
  const s = build(sp);
  const e = estimate(s);
  simulate(s, 360);
  const m0 = s.money;
  simulate(s, 240);
  const measured = (s.money - m0) / 240;
  console.log(sp.name.padEnd(24), 'est', e.total.toFixed(2).padStart(10), 'meas', measured.toFixed(2).padStart(10), 'ratio', (measured / e.total).toFixed(2), 'D', e.D.toFixed(2), 'S', e.S.toFixed(2), 'pop', s.rt.guests.length, 'angry', s.stats.angryLeaves);
}
console.log('--- component split');
for (const sp of SPECS.slice(3)) {
  const s = build(sp);
  const e = estimate(s);
  simulate(s, 360);
  const a = { ...s.rt.src };
  const r0 = s.stats.ridesTotal;
  simulate(s, 240);
  const d = (k: 'rides' | 'zones' | 'buildings') => ((s.rt.src[k] - a[k]) / 240).toFixed(1);
  console.log(sp.name, 'rides', d('rides'), 'est', e.rideIncome.toFixed(1), '| zones', d('zones'), 'est', e.zoneIncome.toFixed(1), '| bld', d('buildings'), 'est', e.buildingIncome.toFixed(1), '| rides/s', ((s.stats.ridesTotal - r0) / 240).toFixed(2), 'est', e.rides.toFixed(2), 'cycle', e.cycle.toFixed(0));
}
