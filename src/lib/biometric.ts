import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ENABLED_KEY = 'skillswap_biometric_enabled';
const EMAIL_KEY = 'skillswap_biometric_email';
const PASSWORD_KEY = 'skillswap_biometric_password';

export type BiometricKind = 'face' | 'fingerprint' | 'biometric';

/** Whether this device supports Face ID, fingerprint, or other biometrics. */
export async function isBiometricHardwareAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

/** Human-readable label: Face ID on iOS, fingerprint on Android. */
export async function getBiometricLabel(): Promise<string> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (Platform.OS === 'ios' && types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face ID';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
  }
  return 'Biometrics';
}

export async function getBiometricKind(): Promise<BiometricKind> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (Platform.OS === 'ios' && types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'face';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'fingerprint';
  }
  return 'biometric';
}

/** Ionicons name for the active biometric method. */
export async function getBiometricIcon(): Promise<'scan-outline' | 'finger-print-outline'> {
  const kind = await getBiometricKind();
  return kind === 'fingerprint' ? 'finger-print-outline' : 'scan-outline';
}

export async function isBiometricLoginEnabled(): Promise<boolean> {
  try {
    const flag = await SecureStore.getItemAsync(ENABLED_KEY);
    if (flag !== '1') return false;
    const email = await SecureStore.getItemAsync(EMAIL_KEY);
    const password = await SecureStore.getItemAsync(PASSWORD_KEY);
    if (!email?.trim() || !password) {
      await disableBiometricLogin();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function getStoredBiometricEmail(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(EMAIL_KEY);
  } catch {
    return null;
  }
}

/** Save credentials behind the device biometric lock for password-free sign-in. */
export async function enableBiometricLogin(email: string, password: string): Promise<void> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail || !password) {
    throw new Error('Email and password are required to enable biometrics.');
  }
  await SecureStore.setItemAsync(EMAIL_KEY, trimmedEmail);
  await SecureStore.setItemAsync(PASSWORD_KEY, password);
  await SecureStore.setItemAsync(ENABLED_KEY, '1');
}

/**
 * Confirm with biometrics, then save credentials. Returns false if the user cancels
 * or skips any step — leaves prior settings unchanged.
 */
export async function setupBiometricLogin(email: string, password: string): Promise<boolean> {
  if (!email.trim() || !password) return false;
  const confirmed = await confirmEnableBiometric();
  if (!confirmed) return false;
  await enableBiometricLogin(email, password);
  return true;
}

export async function disableBiometricLogin(): Promise<void> {
  await SecureStore.deleteItemAsync(ENABLED_KEY);
  await SecureStore.deleteItemAsync(EMAIL_KEY);
  await SecureStore.deleteItemAsync(PASSWORD_KEY);
}

/** Prompt Face ID / fingerprint and return stored credentials when successful. */
export async function unlockBiometricCredentials(): Promise<{ email: string; password: string } | null> {
  const enabled = await isBiometricLoginEnabled();
  if (!enabled) return null;

  const email = await SecureStore.getItemAsync(EMAIL_KEY);
  const password = await SecureStore.getItemAsync(PASSWORD_KEY);
  if (!email || !password) return null;

  const label = await getBiometricLabel();
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: `Sign in with ${label}`,
    cancelLabel: 'Use password',
    disableDeviceFallback: false,
    fallbackLabel: 'Use password',
  });

  if (!result.success) return null;
  return { email, password };
}

/** Prompt Face ID / fingerprint to unlock the app (session already restored). */
export async function promptBiometricUnlock(customMessage?: string): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const enabled = await isBiometricLoginEnabled();
  if (!enabled) return true;

  const label = await getBiometricLabel();
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: customMessage ?? `Unlock SkillSwap with ${label}`,
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
    fallbackLabel: 'Cancel',
  });
  return result.success;
}

/** Ask the user to confirm with biometrics before enabling quick sign-in. */
export async function confirmEnableBiometric(): Promise<boolean> {
  const label = await getBiometricLabel();
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: `Enable ${label} sign-in`,
    cancelLabel: 'Not now',
    disableDeviceFallback: false,
  });
  return result.success;
}
