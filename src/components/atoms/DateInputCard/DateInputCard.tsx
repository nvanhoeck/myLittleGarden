import React from 'react';
import { View, Text, Pressable } from 'react-native';

interface DateInputCardProps {
  /** Label text displayed above the date */
  label: string;
  /** Selected date in ISO format (YYYY-MM-DD) or null */
  date: string | null;
  /** Callback when the card is pressed to open date picker */
  onPress: () => void;
  /** Placeholder text when no date is selected */
  placeholder?: string;
  /** Whether the input is in an error state */
  hasError?: boolean;
  /** Error message to display */
  errorMessage?: string;
  /** Optional test ID for testing */
  testID?: string;
}

/**
 * Invalid date placeholder text
 */
const INVALID_DATE_TEXT = 'Ongeldige datum';

/**
 * Format an ISO date string to a localized Dutch date format
 * Returns a localized error message if the date is invalid
 */
function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) {
      return INVALID_DATE_TEXT;
    }
    return date.toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return INVALID_DATE_TEXT;
  }
}

/**
 * DateInputCard displays a pressable card for date selection.
 * Shows a calendar icon, label, and either the formatted date
 * or placeholder text.
 *
 * Visual states:
 * - Default: Dark card with green border
 * - Error: Red border with error message
 * - Filled: Shows formatted date in green
 */
export function DateInputCard({
  label,
  date,
  onPress,
  placeholder = 'Selecteer een datum',
  hasError = false,
  errorMessage,
  testID = 'date-input-card',
}: DateInputCardProps): React.JSX.Element {
  const formattedDate = date ? formatDate(date) : null;

  return (
    <View className="w-full" testID={testID}>
      {/* Label */}
      <Text
        className="text-green-200 text-sm font-medium mb-2"
        testID={`${testID}-label`}
      >
        {label}
      </Text>

      {/* Card */}
      <Pressable
        onPress={onPress}
        className={`
          flex-row items-center
          px-4 py-4 rounded-xl
          bg-green-900/20
          border
          ${hasError ? 'border-red-500' : 'border-green-700/30'}
          active:bg-green-900/40
        `}
        testID={`${testID}-button`}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formattedDate || placeholder}`}
        accessibilityHint="Dubbeltik om datum te selecteren"
      >
        {/* Calendar Icon */}
        <View
          className="h-10 w-10 items-center justify-center rounded-lg bg-green-800/50 mr-3"
          testID={`${testID}-icon`}
        >
          <Text className="text-xl">📅</Text>
        </View>

        {/* Date Text */}
        <View className="flex-1">
          <Text
            className={`
              text-base
              ${formattedDate ? 'text-green-50 font-medium' : 'text-green-200/60'}
            `}
            testID={`${testID}-value`}
          >
            {formattedDate || placeholder}
          </Text>
        </View>

        {/* Chevron Icon */}
        <Text className="text-green-200/60 text-lg">›</Text>
      </Pressable>

      {/* Error Message */}
      {hasError && errorMessage && (
        <Text
          className="text-red-400 text-sm mt-2"
          testID={`${testID}-error`}
          accessibilityRole="alert"
        >
          {errorMessage}
        </Text>
      )}
    </View>
  );
}
