import React, { useState, useCallback } from 'react';
import { View, Text, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { DateInputCard } from '@/components/atoms/DateInputCard';
import type { FrostDatesStepProps } from '../hooks/useEnvironmentWizard';

/**
 * Format a Date object to ISO date string (YYYY-MM-DD)
 */
function dateToISOString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse ISO date string to Date object
 */
function parseISODate(isoString: string): Date {
  return new Date(isoString);
}

/**
 * Step 2: Frost Dates Selection
 * Displays date input cards for selecting last spring frost and first fall frost dates
 */
export function FrostDatesStep({
  springFrostDate,
  fallFrostDate,
  defaultDates,
  error,
  onSpringDateChange,
  onFallDateChange,
}: Omit<FrostDatesStepProps, 'onNext' | 'onBack' | 'canProceed'>): React.JSX.Element {
  const { t } = useTranslation();
  const [showDatePicker, setShowDatePicker] = useState<'spring' | 'fall' | null>(null);

  const handleDateChange = useCallback(
    (_event: DateTimePickerEvent, selectedDate?: Date): void => {
      if (Platform.OS === 'android') {
        setShowDatePicker(null);
      }

      if (selectedDate) {
        const isoDate = dateToISOString(selectedDate);
        if (showDatePicker === 'spring') {
          onSpringDateChange(isoDate);
        } else if (showDatePicker === 'fall') {
          onFallDateChange(isoDate);
        }
      }

      if (Platform.OS === 'ios') {
        setShowDatePicker(null);
      }
    },
    [showDatePicker, onSpringDateChange, onFallDateChange]
  );

  const openSpringDatePicker = useCallback((): void => {
    setShowDatePicker('spring');
  }, []);

  const openFallDatePicker = useCallback((): void => {
    setShowDatePicker('fall');
  }, []);

  return (
    <View className="flex-1 px-6 pt-4">
      <Text className="text-green-50 text-xl font-semibold mb-2 text-center">
        {t('environmentSetup.step1.title')}
      </Text>
      <Text className="text-green-200 text-base mb-8 text-center">
        {t('environmentSetup.step1.subtitle')}
      </Text>

      <View className="gap-6">
        <DateInputCard
          label={t('environmentSetup.step1.springFrost')}
          date={springFrostDate}
          onPress={openSpringDatePicker}
          placeholder={t('environmentSetup.step1.selectDate')}
          testID="spring-frost-input"
        />

        <DateInputCard
          label={t('environmentSetup.step1.fallFrost')}
          date={fallFrostDate}
          onPress={openFallDatePicker}
          placeholder={t('environmentSetup.step1.selectDate')}
          hasError={!!error}
          errorMessage={error || undefined}
          testID="fall-frost-input"
        />
      </View>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={
            showDatePicker === 'spring'
              ? springFrostDate
                ? parseISODate(springFrostDate)
                : defaultDates.spring
              : fallFrostDate
                ? parseISODate(fallFrostDate)
                : defaultDates.fall
          }
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          testID="date-picker"
        />
      )}
    </View>
  );
}
