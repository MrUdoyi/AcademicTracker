import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aridstone.app',
  appName: 'AridStone',
  webDir: 'public', // We point this to 'public' as a placeholder
  server: {
    // REPLACE THIS with your computer's local IP address!
    // Format: "http://192.168.x.x:3000"
    url: 'http://192.168.0.160:3000', 
    cleartext: true,
  },
};

export default config;