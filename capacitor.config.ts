import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cosmicdestiny.app',
  appName: 'Cosmic Destiny',
  webDir: 'dist/public',
  server: {
    url: 'https://cosmic-destiny-universe.replit.app',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f0a1e',
      showSpinner: false,
      launchAutoHide: true,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f0a1e',
    },
    Keyboard: {
      resize: 'body' as any,
      resizeOnFullScreen: true,
    },
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0f0a1e',
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#0f0a1e',
    preferredContentMode: 'mobile',
  },
};

export default config;
