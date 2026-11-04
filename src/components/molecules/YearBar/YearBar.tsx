import React from 'react';
import { Pressable, Text, View } from 'react-native';

interface YearBarProps {
  year: number;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  previousLabel: string;
  nextLabel: string;
}

/**
 * ‹ 2026 › year switch of the planning timeline.
 * BEM contract (src/styles/planning/timeline.css): .year-bar, __arrow, __year
 */
export function YearBar({
  year,
  onPrev,
  onNext,
  canPrev,
  canNext,
  previousLabel,
  nextLabel,
}: YearBarProps): React.JSX.Element {
  return (
    <View className="flex-row items-center">
      <YearArrow symbol="‹" label={previousLabel} enabled={canPrev} onPress={onPrev} testID="planning-year-prev" />
      <Text className="text-on-surface text-title-medium px-2" testID="planning-year-label">
        {year}
      </Text>
      <YearArrow symbol="›" label={nextLabel} enabled={canNext} onPress={onNext} testID="planning-year-next" />
    </View>
  );
}

function YearArrow({
  symbol,
  label,
  enabled,
  onPress,
  testID,
}: {
  symbol: string;
  label: string;
  enabled: boolean;
  onPress: () => void;
  testID: string;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      hitSlop={4}
      className={`w-10 h-10 items-center justify-center ${enabled ? '' : 'opacity-40'}`}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      testID={testID}
    >
      <Text className="text-on-surface text-title-large">{symbol}</Text>
    </Pressable>
  );
}
