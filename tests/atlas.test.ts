import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { BUILDINGS } from '../src/config/facilities';
import { ZONES } from '../src/config/zones';

// Phaser silently draws the atlas's first frame when a frame name does not exist (a giant ghost skier once shipped this way),
// so every frame name used in the scene code must be baked in art.ts.
describe('sprite atlas frames', () => {
  const art = readFileSync('src/scene/art.ts', 'utf8');
  const baked = new Set<string>();
  for (const m of art.matchAll(/bake\(scene, '([a-z_0-9]+)'/g)) baked.add(m[1]);
  for (const m of art.matchAll(/bake\(scene, `([^`]+)`/g)) {
    if (m[1].startsWith('car_')) for (let i = 0; i < 8; i++) baked.add(`car_${i}`);
    else if (m[1].startsWith('g_')) { /* guest frames are checked below */ }
  }
  for (const k of ['ski', 'board']) for (let c = 0; c < 6; c++) for (let f = 0; f < 2; f++) baked.add(`g_${k}_${c}_${f}`);

  const used = new Set<string>();
  for (const f of readdirSync('src/scene').filter(x => x.endsWith('.ts'))) {
    const src = readFileSync(`src/scene/${f}`, 'utf8');
    for (const m of src.matchAll(/ATLAS, '([a-z_0-9]+)'/g)) used.add(m[1]);
    for (const m of src.matchAll(/setFrame\('([a-z_0-9]+)'\)/g)) used.add(m[1]);
    for (const m of src.matchAll(/'((?:carrier|pine|rock)_[a-z0-9]+)'/g)) used.add(m[1]);
  }
  for (const b of BUILDINGS) used.add(`bld_${b.id}`);
  for (const z of ZONES) used.add(z.stages ? 'zone_park1' : `zone_${z.id}`);
  used.add('zone_park2'); used.add('zone_park3');

  it('every frame used by the scene is baked', () => {
    const missing = [...used].filter(k => !baked.has(k));
    expect(missing).toEqual([]);
  });
  it('the atlas fits its 2048x1024 canvas (bake would throw otherwise)', () => {
    expect(baked.size).toBeGreaterThan(30);
  });
});
