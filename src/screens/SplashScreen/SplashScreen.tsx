import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Logo } from '@components/atoms/Logo';
import { useEnvironmentStore } from '@/stores/environmentStore';
import type { SplashScreenProps } from '@/navigation/navigationTypes';

const SPLASH_TIMEOUT_MS = 2000;
const LOGO_SIZE = 200;

/**
 * SplashScreen displays the app logo for a brief period before navigating
 * to either the EnvironmentSetup screen (if not configured) or the Home screen
 * (if already configured). Uses navigation.reset() to prevent the user from
 * navigating back to the splash screen.
 *
 * The screen waits for the persisted store to be rehydrated before checking
 * the configuration status.
 */
export function SplashScreen({ navigation }: SplashScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const [hasHydrated, setHasHydrated] = useState(false);

  // Check if environment is fully configured
  const isConfigured = useEnvironmentStore((state) => state.isConfigured());

  // Wait for Zustand store to be rehydrated from AsyncStorage
  useEffect(() => {
    const unsubscribe = useEnvironmentStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
    });

    // Check if already hydrated (for hot reloads)
    if (useEnvironmentStore.persist.hasHydrated()) {
      setHasHydrated(true);
    }

    return () => {
      unsubscribe();
    };
  }, []);

  // Navigate after splash timeout and hydration
  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const timer = setTimeout(() => {
      const targetScreen = isConfigured ? 'Home' : 'EnvironmentSetup';

      navigation.reset({
        index: 0,
        routes: [{ name: targetScreen }],
      });
    }, SPLASH_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [navigation, isConfigured, hasHydrated]);

  return (
    <View
      className="flex-1 items-center justify-center bg-background"
      testID="splash-screen"
      accessibilityLabel={t('screens.splash.title')}
    >
      <Logo size={LOGO_SIZE} testID="splash-logo" />
    </View>
  );
}
