import React from 'react';
import { View, Text, TextInput } from 'react-native';

interface DimensionInputProps {
  /** Label text displayed above the input */
  label: string;
  /** Current input value as string */
  value: string;
  /** Callback when text changes */
  onChangeText: (text: string) => void;
  /** Unit label displayed after the input (e.g., "m", "cm") */
  unit: string;
  /** Whether the input is in an error state */
  hasError?: boolean;
  /** Error message to display */
  errorMessage?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Optional test ID for testing */
  testID?: string;
}

/**
 * DimensionInput provides a numeric input field for entering garden dimensions.
 * Displays a label, input field with decimal keyboard, and unit suffix.
 *
 * Features:
 * - Decimal keyboard for numeric input
 * - Unit label displayed inline
 * - Error state with message
 * - Accessible with proper labels
 */
export function DimensionInput({
  label,
  value,
  onChangeText,
  unit,
  hasError = false,
  errorMessage,
  placeholder = '0.0',
  testID = 'dimension-input',
}: DimensionInputProps): React.JSX.Element {
  /**
   * Filter input to only allow valid decimal numbers
   * Handles: empty strings, multiple decimal points, leading zeros
   */
  const handleChangeText = (text: string): void => {
    // Allow empty string to clear the input
    if (text === '') {
      onChangeText('');
      return;
    }

    // Remove all non-numeric characters except decimal point
    let filtered = text.replace(/[^0-9.]/g, '');

    // Handle multiple decimal points: keep only the first one
    const parts = filtered.split('.');
    if (parts.length > 2) {
      filtered = parts[0] + '.' + parts.slice(1).join('');
    }

    // Remove leading zeros (except for "0." decimal values)
    filtered = filtered.replace(/^0+(\d)/, '$1');

    onChangeText(filtered);
  };

  return (
    <View className="w-full" testID={testID}>
      {/* Label */}
      <Text
        className="text-green-200 text-sm font-medium mb-2"
        testID={`${testID}-label`}
      >
        {label}
      </Text>

      {/* Input Container */}
      <View
        className={`
          flex-row items-center
          rounded-xl
          bg-green-900/20
          border
          ${hasError ? 'border-red-500' : 'border-green-700/30'}
          overflow-hidden
        `}
      >
        {/* Text Input */}
        <TextInput
          value={value}
          onChangeText={handleChangeText}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor="#86EFAC80"
          className="flex-1 px-4 py-4 text-green-50 text-lg font-medium"
          testID={`${testID}-input`}
          accessibilityLabel={label}
          accessibilityHint={`Voer ${label.toLowerCase()} in ${unit}`}
          accessibilityValue={{ text: value ? `${value} ${unit}` : undefined }}
        />

        {/* Unit Label */}
        <View
          className="px-4 py-4 bg-green-800/30 border-l border-green-700/30"
          testID={`${testID}-unit`}
        >
          <Text className="text-green-200 text-lg font-medium">{unit}</Text>
        </View>
      </View>

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
