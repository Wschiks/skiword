export interface Product { id: string; name: string; kind: 'consumable' | 'permanent'; gems?: number; fallbackPrice: string; desc: string }
export const PRODUCTS: Product[] = [
  { id: 'gems_small',  name: 'Handful of Gems', kind: 'consumable', gems: 100,  fallbackPrice: '$1.99',  desc: '100 gems' },
  { id: 'gems_medium', name: 'Bag of Gems',     kind: 'consumable', gems: 550,  fallbackPrice: '$8.99',  desc: '550 gems' },
  { id: 'gems_large',  name: 'Chest of Gems',   kind: 'consumable', gems: 1200, fallbackPrice: '$16.99', desc: '1200 gems' },
  { id: 'income_x2',   name: 'Double Income',   kind: 'permanent',               fallbackPrice: '$7.99',  desc: 'Permanent 2x income' },
];
