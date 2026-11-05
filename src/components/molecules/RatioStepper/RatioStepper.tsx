import React from 'react';
import { Pressable, Text, View } from 'react-native';

interface RatioStepperProps {
  value: number;
  onChange: (value: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
  /** Read by screen readers for the value, e.g. "Verhouding van Sla: 3" */
  valueLabel: string;
  testID: string;
}

/**
 * − [n] + for a ratio of at least 1. Buttons are 48 dp touch targets.
 * BEM contract (src/styles/planning/season.css): .ratio-stepper, __button, __value
 */
export function RatioStepper({ value, onChange, decreaseLabel, increaseLabel, valueLabel, testID }: RatioStepperProps): React.JSX.Element {
  const canDecrease = value > 1;
  return (
    <View className="flex-row items-center bg-gray-800 rounded-xl" testID={testID}>
      <Pressable
        onPress={() => onChange(value - 1)}
        disabled={!canDecrease}
        className="w-12 h-12 items-center justify-center"
        accessibilityRole="button"
        accessibilityLabel={decreaseLabel}
        accessibilityState={{ disabled: !canDecrease }}
        testID={`${testID}-decrease`}
      >
        <Text className={`text-xl ${canDecrease ? 'text-white' : 'text-gray-600'}`}>−</Text>
      </Pressable>
      <Text className="text-white font-bold px-2 min-w-[24px] text-center" accessibilityLabel={valueLabel} testID={`${testID}-value`}>
        {value}
      </Text>
      <Pressable
        onPress={() => onChange(value + 1)}
        className="w-12 h-12 items-center justify-center"
        accessibilityRole="button"
        accessibilityLabel={increaseLabel}
        testID={`${testID}-increase`}
      >
        <Text className="text-xl text-white">+</Text>
      </Pressable>
    </View>
  );
}
