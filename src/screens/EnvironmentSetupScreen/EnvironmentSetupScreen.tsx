import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { EnvironmentSetupScreenProps } from '@/navigation/navigationTypes';
import { useEnvironmentWizard } from './hooks';
import { FrostDatesStep } from './steps';

/**
 * EnvironmentSetupScreen is a single-step setup for configuring the garden environment.
 *
 * Step 1: Frost Dates - Select last spring frost and first fall frost dates
 *
 * Note: Garden dimensions have been removed as the canvas is infinite (Miro-style).
 * Sun direction has been moved to Component level for microclimate considerations.
 *
 * This screen acts as a simple orchestrator, delegating state management
 * to the useEnvironmentWizard hook and rendering to the frost dates step component.
 */
export function EnvironmentSetupScreen({
  navigation,
}: EnvironmentSetupScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const wizard = useEnvironmentWizard(navigation);

  return (
    <SafeAreaView
      className="flex-1 bg-gray-900"
      testID="environment-setup-screen"
    >
      {/* Header */}
      <View className="px-6 pt-4 pb-2">
        <Text className="text-green-50 text-2xl font-bold text-center mb-4">
          {t('environmentSetup.title')}
        </Text>
      </View>

      {/* Step Content */}
      <FrostDatesStep
        springFrostDate={wizard.frostDatesProps.springFrostDate}
        fallFrostDate={wizard.frostDatesProps.fallFrostDate}
        defaultDates={wizard.frostDatesProps.defaultDates}
        error={wizard.frostDatesProps.error}
        onSpringDateChange={wizard.frostDatesProps.onSpringDateChange}
        onFallDateChange={wizard.frostDatesProps.onFallDateChange}
      />

      {/* Complete Button */}
      <View className="px-6 py-4">
        <Pressable
          onPress={wizard.handleComplete}
          className={`
            py-4 rounded-xl items-center justify-center
            ${wizard.canComplete ? 'bg-green-600 active:bg-green-700' : 'bg-green-600/40'}
          `}
          testID="complete-button"
          accessibilityRole="button"
          accessibilityLabel={t('environmentSetup.complete')}
          accessibilityState={{ disabled: !wizard.canComplete }}
        >
          <Text
            className={`
              text-lg font-semibold
              ${wizard.canComplete ? 'text-white' : 'text-white/50'}
            `}
          >
            {t('environmentSetup.complete')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
