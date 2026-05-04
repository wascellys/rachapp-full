import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rachapp.app',
  appName: 'RachApp',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#020617',
    allowMixedContent: false,
  },
  plugins: {
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
      backgroundColor: '#020617',

    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#020617',
      showSpinner: false,
      androidSplashResourceName: 'splash',
    },
  },
};

export default config;
