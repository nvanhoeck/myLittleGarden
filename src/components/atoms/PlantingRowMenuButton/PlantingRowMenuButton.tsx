import React from 'react';
import { Pressable, Text } from 'react-native';

interface PlantingRowMenuButtonProps {
  accessibilityLabel: string;
  onPress: () => void;
  testID: string;
}

/**
 * ⋯ button of a planting row, a 48 dp touch target.
 * BEM contract (src/styles/planning/season.css): .planting-menu-button, __icon
 */
export function PlantingRowMenuButton({ accessibilityLabel, onPress, testID }: PlantingRowMenuButtonProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      className="w-12 h-12 items-center justify-center"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      <Text className="text-gray-300 text-xl">⋯</Text>
    </Pressable>
  );
}
