/// <reference types="@capacitor/status-bar" />
/// <reference types="@capawesome/capacitor-android-edge-to-edge-support" />
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lechefacil.app',
  appName: 'LecheFacil',
  webDir: 'dist',
  server: {
    androidScheme: 'http'
  },
  plugins: {
    Camera: {
      presentationStyle: 'fullscreen'
    }
  }
};

export default config;
