import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.d2feccffe48149698f1b77334e02f476",
  appName: "Duara Flow",
  webDir: "dist",
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    contentInset: "always",
  },
  server: {
    androidScheme: "https",
    // Uncomment for hot-reload against the Lovable preview during development:
    // url: "https://d2feccff-e481-4969-8f1b-77334e02f476.lovableproject.com?forceHideBadge=true",
    // cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#2b5e3f",
      showSpinner: false,
      androidSplashResourceName: "splash",
    },
  },
};

export default config;