import { Redirect } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { BiometricUnlockScreen } from '../components/BiometricUnlockScreen';
import { LoadingSplash } from '../components/LoadingSplash';
import { isBiometricLoginEnabled, logout, restoreSession } from '../lib/auth';

/** Minimum time the branded splash is visible so the animation is noticeable. */
const MIN_SPLASH_MS = 2200;

/**
 * Entry gate: splash → biometric unlock (if session saved) → tabs or login.
 */
export default function Index() {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [needsUnlock, setNeedsUnlock] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [, session] = await Promise.all([
        new Promise<void>((resolve) => setTimeout(resolve, MIN_SPLASH_MS)),
        restoreSession(),
      ]);

      if (cancelled) return;

      if (session && (await isBiometricLoginEnabled())) {
        setNeedsUnlock(true);
      } else {
        setLoggedIn(session !== null);
        setReady(true);
      }

      await SplashScreen.hideAsync();
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const onUnlocked = () => {
    setLoggedIn(true);
    setNeedsUnlock(false);
    setReady(true);
  };

  const onUsePassword = async () => {
    await logout();
    setNeedsUnlock(false);
    setLoggedIn(false);
    setReady(true);
  };

  if (needsUnlock && !ready) {
    return <BiometricUnlockScreen onUnlocked={onUnlocked} onUsePassword={onUsePassword} />;
  }

  if (!ready) {
    return <LoadingSplash message="Starting SkillSwap…" />;
  }

  return <Redirect href={loggedIn ? '/(tabs)' : '/(auth)/login'} />;
}
