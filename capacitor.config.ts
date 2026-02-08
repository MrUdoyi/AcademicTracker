import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aridstone.app',
  appName: 'AcadTracker',
  webDir: 'public',
  server: {
    // This points the app to your live Vercel site
    url: 'https://foss-project-arid-stone.vercel.app', 
    androidScheme: 'https'
  },
};

export default config;