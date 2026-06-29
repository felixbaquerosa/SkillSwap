import Constants from 'expo-constants';

// Base URL of the SkillSwap PHP backend (served by XAMPP).
//
// In development we AUTO-DETECT this PC's LAN IP from the Expo dev server that
// Expo Go is connected to, so when your Wi-Fi IP changes the API address
// follows automatically. For a production build, set PROD_API_BASE_URL.

const PROD_API_BASE_URL = 'https://yourdomain.com/SkillSwapApi/public';

// Fallback used only if the dev host can't be detected (e.g. tunnel mode).
const FALLBACK_DEV_IP = '10.0.4.99';

function detectDevHost(): string {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).expoGoConfig?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost ||
    '';
  const host = String(hostUri).split(':')[0];
  return host || FALLBACK_DEV_IP;
}

export const API_BASE_URL = __DEV__
  ? `http://${detectDevHost()}/SkillSwapApi/public`
  : PROD_API_BASE_URL;
