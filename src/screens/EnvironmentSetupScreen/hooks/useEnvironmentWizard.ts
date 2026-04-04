import { useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/navigationTypes';
import { useEnvironmentStore } from '@/stores/environmentStore';
import { GardenEnvironment } from '@/domain/environment';

/**
 * Get default dates for frost period selection
 * Spring: April 15, Fall: October 15
 */
function getDefaultFrostDates(): { spring: Date; fall: Date } {
  const currentYear = new Date().getFullYear();
  return {
    spring: new Date(currentYear, 3, 15), // April 15
    fall: new Date(currentYear, 9, 15), // October 15
  };
}

/**
 * Props for the FrostDatesStep component
 */
export interface FrostDatesStepProps {
  springFrostDate: string | null;
  fallFrostDate: string | null;
  defaultDates: { spring: Date; fall: Date };
  error: string | null;
  onSpringDateChange: (date: string) => void;
  onFallDateChange: (date: string) => void;
}

/**
 * Return type for useEnvironmentWizard hook
 */
export interface UseEnvironmentWizardReturn {
  frostDatesProps: FrostDatesStepProps;
  canComplete: boolean;
  handleComplete: () => void;
}

/**
 * Navigation prop type for environment setup screen
 */
type EnvironmentSetupNavigation = NativeStackNavigationProp<RootStackParamList, 'EnvironmentSetup'>;

/**
 * Custom hook for managing the environment setup wizard state and logic
 * Encapsulates all wizard state, validation, and navigation logic
 *
 * Single step: Frost dates (last spring frost, first fall frost)
 *
 * Note: Garden dimensions have been removed as the canvas is infinite (Miro-style).
 * Sun direction has been moved to Component level for microclimate considerations.
 */
export function useEnvironmentWizard(
  navigation: EnvironmentSetupNavigation
): UseEnvironmentWizardReturn {
  // Store actions
  const setFrostPeriod = useEnvironmentStore((state) => state.setFrostPeriod);

  // Frost dates state
  const defaultDates = useMemo(() => getDefaultFrostDates(), []);
  const [springFrostDate, setSpringFrostDate] = useState<string | null>(null);
  const [fallFrostDate, setFallFrostDate] = useState<string | null>(null);
  const [frostDateError, setFrostDateError] = useState<string | null>(null);

  // Validation using domain methods
  const canComplete = useMemo(() => {
    const result = GardenEnvironment.validateFrostDates(springFrostDate, fallFrostDate);
    return result.isValid;
  }, [springFrostDate, fallFrostDate]);

  // Complete handler
  const handleComplete = useCallback((): void => {
    const result = GardenEnvironment.validateFrostDates(springFrostDate, fallFrostDate);

    if (!result.isValid) {
      setFrostDateError(result.errors[0] ?? 'Ongeldige vorstdatums');
      return;
    }

    // Save frost period to store
    try {
      if (springFrostDate && fallFrostDate) {
        setFrostPeriod(springFrostDate, fallFrostDate);
      }

      // Navigate to Home
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (error) {
      console.error('Failed to save environment settings:', error);
      Alert.alert(
        'Fout bij opslaan',
        'Er is een fout opgetreden bij het opslaan van de instellingen. Probeer het opnieuw.'
      );
    }
  }, [springFrostDate, fallFrostDate, setFrostPeriod, navigation]);

  // Date Change Handlers
  const handleSpringDateChange = useCallback((date: string): void => {
    setSpringFrostDate(date);
    setFrostDateError(null);
  }, []);

  const handleFallDateChange = useCallback((date: string): void => {
    setFallFrostDate(date);
    setFrostDateError(null);
  }, []);

  // Build props object
  const frostDatesProps: FrostDatesStepProps = useMemo(
    () => ({
      springFrostDate,
      fallFrostDate,
      defaultDates,
      error: frostDateError,
      onSpringDateChange: handleSpringDateChange,
      onFallDateChange: handleFallDateChange,
    }),
    [
      springFrostDate,
      fallFrostDate,
      defaultDates,
      frostDateError,
      handleSpringDateChange,
      handleFallDateChange,
    ]
  );

  return {
    frostDatesProps,
    canComplete,
    handleComplete,
  };
}
