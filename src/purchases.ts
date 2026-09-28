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

/** Store purchases on device via cordova-plugin-purchase / RevenueCat style plugin; falls back to the mock. */
class NativePurchases implements PurchasesService {
  name = 'store';
  private prices = new Map<string, string>();
  constructor(private plugin: any) { void this.load(); }
  private async load() {
    try {
      const { products } = await this.plugin.getProducts({ productIdentifiers: PRODUCTS.map(p => p.id) });
      for (const p of products ?? []) this.prices.set(p.identifier ?? p.productIdentifier, p.priceString ?? p.price);
    } catch { /* fallback prices */ }
  }
  priceOf(id: string) { return this.prices.get(id) ?? PRODUCTS.find(p => p.id === id)?.fallbackPrice ?? ''; }
  async purchase(id: string) {
    try { await this.plugin.purchaseProduct({ productIdentifier: id }); return true; } catch { return false; }
  }
  async restore() {
    try {
      const r = await this.plugin.restorePurchases();
      return (r?.customerInfo?.entitlements ? Object.keys(r.customerInfo.entitlements.active ?? {}) : r?.ids ?? []) as string[];
    } catch { return []; }
  }
}

export let purchases: PurchasesService = new MockPurchases();

export async function initPurchases() {
  try {
    const cap = (window as any).Capacitor;
    if (!cap?.isNativePlatform?.()) return;
    const plugin = cap.Plugins?.Purchases ?? cap.Plugins?.InAppPurchase;
    if (plugin) purchases = new NativePurchases(plugin);
  } catch { /* stay on mock */ }
}
