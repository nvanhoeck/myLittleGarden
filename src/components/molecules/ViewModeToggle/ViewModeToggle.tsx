import React from 'react';
import { Pressable, Text, View } from 'react-native';

export type ViewMode = 'canvas' | 'list';

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  canvasLabel: string;
  listLabel: string;
}

/**
 * Small Canvas / Lijst segmented control in the year bar.
 * BEM contract (src/styles/planning/timeline.css):
 *   .view-mode-toggle, __option, __option--selected, __label, __label--selected
 */
export function ViewModeToggle({ value, onChange, canvasLabel, listLabel }: ViewModeToggleProps): React.JSX.Element {
  const options: readonly { mode: ViewMode; label: string }[] = [
    { mode: 'canvas', label: canvasLabel },
    { mode: 'list', label: listLabel },
  ];

  return (
    <View className="flex-row ml-auto rounded-full border border-outline overflow-hidden">
      {options.map(({ mode, label }) => {
        const isSelected = value === mode;
        return (
          <Pressable
            key={mode}
            onPress={() => onChange(mode)}
            hitSlop={{ top: 8, bottom: 8 }}
            className={`px-3 py-1 ${isSelected ? 'bg-primary-container' : ''}`}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: isSelected }}
            testID={`view-mode-${mode}`}
          >
            <Text className={`text-label-medium ${isSelected ? 'text-on-primary-container' : 'text-on-surface-variant'}`}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
