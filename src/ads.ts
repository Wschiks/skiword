import { AD_UNITS, LIVE, MOCK_AD_DELAY_MS } from './config/ads';

export interface AdsService { isReady(): boolean; showRewarded(): Promise<boolean>; readonly name: string }

/** Web / dev implementation: shows a fake "ad" overlay for 1.5 s and grants the reward. */
class MockAds implements AdsService {
  name = 'mock';
  isReady() { return true; }
  showRewarded(): Promise<boolean> {
    return new Promise(resolve => {
      const el = document.createElement('div');
      el.className = 'mock-ad';
      el.innerHTML = '<div class="mock-ad-box"><div class="mock-ad-tag">Test ad</div><div class="mock-ad-body">Rewarded ad playing...</div></div>';
      document.body.appendChild(el);
      setTimeout(() => { el.remove(); resolve(true); }, MOCK_AD_DELAY_MS);
    });
  }
}

/** AdMob rewarded ads on device (Capacitor). Uses Google's public test unit ids unless LIVE is true. */
class NativeAds implements AdsService {
  name = 'admob';
  private ready = false;
  private plugin: any;
  constructor(plugin: any, private platform: 'android' | 'ios') {
    this.plugin = plugin;
    this.init();
  }
  private unit() { const u = AD_UNITS[this.platform]; return LIVE ? u.live : u.test; }
  private async init() {
    try {
      await this.plugin.initialize({ initializeForTesting: !LIVE });
      await this.preload();
    } catch { this.ready = false; }
  }
  private async preload() {
    try { await this.plugin.prepareRewardVideoAd({ adId: this.unit(), isTesting: !LIVE }); this.ready = true; } catch { this.ready = false; }
  }
  isReady() { return this.ready; }
  async showRewarded() {
    if (!this.ready) await this.preload();
    if (!this.ready) return false;
    try {
      const r = await this.plugin.showRewardVideoAd();
      this.ready = false;
      void this.preload();
      return !!r;
    } catch { this.ready = false; void this.preload(); return false; }
  }
}

const ADMOB_MODULE = '@capacitor-community/admob';
export let ads: AdsService = new MockAds();

/** Called at startup: swaps in the native implementation when running inside Capacitor with the AdMob plugin. */
export async function initAds() {
  try {
    const cap = (window as any).Capacitor;
    if (!cap?.isNativePlatform?.()) return;
    const platform = cap.getPlatform() as 'android' | 'ios';
    const mod: any = await import(/* @vite-ignore */ ADMOB_MODULE).catch(() => null);
    if (mod?.AdMob) ads = new NativeAds(mod.AdMob, platform);
  } catch { /* stay on mock */ }
}
