import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.skitycoon.game',
  appName: 'Ski Idle Tycoon',
  webDir: 'dist',
  backgroundColor: '#8FC4E8',
  ios: { contentInset: 'never', backgroundColor: '#8FC4E8' },
  android: { backgroundColor: '#8FC4E8', allowMixedContent: false },
  plugins: {
    SplashScreen: { launchShowDuration: 0, backgroundColor: '#8FC4E8', showSpinner: false },
    StatusBar: { style: 'DARK', overlaysWebView: true },
  },
};
export default config;
