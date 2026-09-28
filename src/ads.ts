import { Capacitor } from '@capacitor/core';
import { AdMob } from '@capacitor-community/admob';
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
  constructor(private platform: 'android' | 'ios') { void this.init(); }
  private unit() { const u = AD_UNITS[this.platform]; return LIVE ? u.live : u.test; }
  private async init() {
    try {
      await AdMob.initialize({ initializeForTesting: !LIVE });
      await this.preload();
    } catch { this.ready = false; }
  }
  private async preload() {
    try { await AdMob.prepareRewardVideoAd({ adId: this.unit(), isTesting: !LIVE }); this.ready = true; } catch { this.ready = false; }
  }
  isReady() { return this.ready; }
  async showRewarded() {
    if (!this.ready) await this.preload();
    if (!this.ready) return false;
    try {
      const reward = await AdMob.showRewardVideoAd();
      this.ready = false;
      void this.preload();
      return !!reward;
    } catch { this.ready = false; void this.preload(); return false; }
  }
}

export let ads: AdsService = new MockAds();

/** Called at startup: swaps in AdMob when running inside a Capacitor native shell. */
export async function initAds() {
  if (!Capacitor.isNativePlatform()) return;
  const platform = Capacitor.getPlatform();
  if (platform === 'android' || platform === 'ios') ads = new NativeAds(platform);
}
