import { Capacitor } from '@capacitor/core';
import { NativePurchases as Store, PURCHASE_TYPE } from '@capgo/native-purchases';
import { PRODUCTS } from './config/shop';

export interface PurchasesService {
  readonly name: string;
  priceOf(id: string): string;
  purchase(id: string): Promise<boolean>;
  restore(): Promise<string[]>;
}

const OWNED_KEY = 'skitycoon.owned.v1';

class MockPurchases implements PurchasesService {
  name = 'mock';
  priceOf(id: string) { return PRODUCTS.find(p => p.id === id)?.fallbackPrice ?? ''; }
  async purchase(id: string) {
    await new Promise(r => setTimeout(r, 400));
    if (id === 'income_x2') { try { localStorage.setItem(OWNED_KEY, JSON.stringify(['income_x2'])); } catch { /* ignore */ } }
    return true;
  }
  async restore() {
    try { return JSON.parse(localStorage.getItem(OWNED_KEY) || '[]') as string[]; } catch { return []; }
  }
}

/** Store purchases on device via StoreKit 2 / Google Play Billing (@capgo/native-purchases). */
class NativePurchases implements PurchasesService {
  name = 'store';
  private prices = new Map<string, string>();
  constructor() { void this.load(); }
  private async load() {
    try {
      const { products } = await Store.getProducts({ productIdentifiers: PRODUCTS.map(p => p.id), productType: PURCHASE_TYPE.INAPP });
      for (const p of products) if (p.identifier) this.prices.set(p.identifier, p.priceString);
    } catch { /* keep fallback prices */ }
  }
  priceOf(id: string) { return this.prices.get(id) ?? PRODUCTS.find(p => p.id === id)?.fallbackPrice ?? ''; }
  async purchase(id: string) {
    const p = PRODUCTS.find(x => x.id === id);
    try {
      await Store.purchaseProduct({ productIdentifier: id, productType: PURCHASE_TYPE.INAPP, isConsumable: p?.kind === 'consumable' });
      return true;
    } catch { return false; }
  }
  async restore() {
    try {
      await Store.restorePurchases();
      const { purchases } = await Store.getPurchases({ productType: PURCHASE_TYPE.INAPP });
      return purchases.map(x => x.productIdentifier);
    } catch { return []; }
  }
}

export let purchases: PurchasesService = new MockPurchases();

export async function initPurchases() {
  if (Capacitor.isNativePlatform()) purchases = new NativePurchases();
}
