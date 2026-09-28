# Native builds (Capacitor 8)

`android/` and `ios/` are generated Capacitor projects (iOS uses Swift Package Manager, no CocoaPods needed). Nothing is published; everything is set up for test builds.

## Build and run
```bash
npm run build && npx cap sync      # web build -> both native projects (also: npm run cap:sync)
npx cap open android               # needs Android Studio + SDK
npx cap open ios                   # needs full Xcode (not just Command Line Tools)
```
This machine only had the Command Line Tools and no Android SDK, so the native apps were **not compiled** here: `cap add`, `cap sync` and asset generation all succeeded, the web bundle builds, but a real device/emulator run is still to do.

## What is wired
| Feature | Web (dev) | Native |
|---|---|---|
| Rewarded ads | `MockAds` (1.5 s fake overlay) | `@capacitor-community/admob`, Google's public **test** unit ids, `LIVE=false` in `src/config/ads.ts` |
| Purchases | `MockPurchases` | `@capgo/native-purchases` (StoreKit 2 / Play Billing), product ids in `src/config/shop.ts` |
| Haptics | `navigator.vibrate` | `@capacitor/haptics` |
| Splash / status bar | n/a | `@capacitor/splash-screen`, `@capacitor/status-bar` |

Both services are behind `src/ads.ts` and `src/purchases.ts` (`isReady()/showRewarded()`, `priceOf()/purchase()/restore()`), so game code never touches a plugin.

## Before a real release
1. Create the AdMob app + rewarded units and put the ids in `src/config/ads.ts` (`live`), then set `LIVE = true`.
2. Replace the test app ids: `android/app/src/main/AndroidManifest.xml` (`com.google.android.gms.ads.APPLICATION_ID`) and `ios/App/App/Info.plist` (`GADApplicationIdentifier`).
3. Create the four in-app products (`gems_small`, `gems_medium`, `gems_large` consumable, `income_x2` non-consumable) in both stores.
4. Fill the publisher block in `src/config/legal.ts`, run `npm run legal`, host `public/privacy.html` / `terms.html`.
5. Change `appId` in `capacitor.config.ts` (`com.skitycoon.game` is a placeholder) and re-run `npm run icons` if the artwork changes.
6. Add the App Tracking Transparency prompt flow / UMP consent if targeting EU or iOS (plugin supports both).
