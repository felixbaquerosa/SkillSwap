import * as SecureStore from 'expo-secure-store';
import { Alert, Platform } from 'react-native';
import { apiLogin, apiLogout, apiMe, apiRegister, ApiUser, setAuthToken } from '../services/api';
import {
  confirmEnableBiometric,
  disableBiometricLogin,
  enableBiometricLogin,
  setupBiometricLogin,
  getBiometricLabel,
  isBiometricHardwareAvailable,
  isBiometricLoginEnabled,
  unlockBiometricCredentials,
  promptBiometricUnlock,
} from './biometric';

const TOKEN_KEY = 'skillswap_token';
const USER_KEY = 'skillswap_user';

export type Session = { token: string; user: ApiUser };

let current: Session | null = null;

/**
 * Restore a saved session on app start and prime the API client with the token.
 */
export async function restoreSession(): Promise<Session | null> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    const userRaw = await SecureStore.getItemAsync(USER_KEY);
    if (token && userRaw) {
      current = { token, user: JSON.parse(userRaw) as ApiUser };
      setAuthToken(token);
      return current;
    }
  } catch {
    // Ignore corrupt storage; treat as logged out.
  }
  setAuthToken(null);
  return null;
}

export function getCurrentUser(): ApiUser | null {
  return current?.user ?? null;
}

export async function refreshCurrentUser(): Promise<ApiUser | null> {
  try {
    const res = await apiMe();
    if (current && res.user) {
      current = { ...current, user: res.user };
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(res.user));
    }
    return res.user;
  } catch {
    return current?.user ?? null;
  }
}

export async function updateStoredUser(user: ApiUser): Promise<void> {
  if (!current) return;
  current = { ...current, user };
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

async function persist(session: Session): Promise<void> {
  current = session;
  setAuthToken(session.token);
  await SecureStore.setItemAsync(TOKEN_KEY, session.token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(session.user));
}

/** Offer to enable Face ID / fingerprint after a successful password sign-in. */
export async function offerBiometricSetup(email: string, password: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const available = await isBiometricHardwareAvailable();
  if (!available) return;

  const alreadyEnabled = await isBiometricLoginEnabled();
  const label = await getBiometricLabel();

  if (alreadyEnabled) {
    const confirmed = await confirmEnableBiometric();
    if (!confirmed) return;
    await enableBiometricLogin(email, password);
    return;
  }

  Alert.alert(
    `Enable ${label}?`,
    `Use ${label} next time so you can unlock the app without typing your password.`,
    [
      { text: 'Not now', style: 'cancel' },
      {
        text: 'Enable',
        onPress: async () => {
          await setupBiometricLogin(email, password);
        },
      },
    ]
  );
}

export async function login(email: string, password: string, options?: { skipBiometricOffer?: boolean }): Promise<Session> {
  const res = await apiLogin(email, password);
  const session = { token: res.token, user: res.user };
  await persist(session);
  if (!options?.skipBiometricOffer) {
    await offerBiometricSetup(email, password);
  }
  return session;
}

export async function loginWithBiometric(): Promise<Session> {
  const creds = await unlockBiometricCredentials();
  if (!creds) {
    throw new Error('Biometric sign-in was cancelled or failed.');
  }
  return login(creds.email, creds.password, { skipBiometricOffer: true });
}

export async function register(
  name: string,
  email: string,
  password: string,
  birthdate: string,
  location?: string
): Promise<Session> {
  const res = await apiRegister(name, email, password, birthdate, location);
  const session = { token: res.token, user: res.user };
  await persist(session);
  await offerBiometricSetup(email, password);
  return session;
}

/** Require Face ID / fingerprint when reopening the app with a saved session. */
export async function unlockSessionWithBiometric(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  if (!current) return false;

  const enabled = await isBiometricLoginEnabled();
  if (!enabled) return true;

  const label = await getBiometricLabel();
  return promptBiometricUnlock(`Unlock SkillSwap with ${label}`);
}

export { disableBiometricLogin, getBiometricIcon, getBiometricLabel, isBiometricHardwareAvailable, isBiometricLoginEnabled, setupBiometricLogin } from './biometric';

export async function logout(): Promise<void> {
  try {
    await apiLogout();
  } catch {
    // Even if the network call fails, clear locally.
  }
  current = null;
  setAuthToken(null);
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
  // Sign-out clears quick unlock so the next sign-in requires email, password, and verification.
  await disableBiometricLogin();
}
