import React from 'react';
import { Pressable, Text, View } from 'react-native';

/** Width of one week slot; the zone band uses it to size its segments */
export const WEEK_SLOT_WIDTH = 72;

interface WeekSlotProps {
  weekLabel: string;
  dateLabel: string;
  hasPlants: boolean;
  isSelected: boolean;
  isCurrent: boolean;
  isInZone: boolean;
  /** Tiny tag on the current week, e.g. "nu" */
  currentLabel: string;
  accessibilityLabel: string;
  onPress: () => void;
  testID?: string;
}

/**
 * One ISO week in the week strip: "W18" over "27 apr", a dot when plants grow in it.
 * BEM contract (src/styles/planning/timeline.css):
 *   .week-slot, --selected, --current, --in-zone, --empty; __ring, __labels, __week, __date, __dot, __now
 */
export function WeekSlot({
  weekLabel,
  dateLabel,
  hasPlants,
  isSelected,
  isCurrent,
  isInZone,
  currentLabel,
  accessibilityLabel,
  onPress,
  testID,
}: WeekSlotProps): React.JSX.Element {
  const stateClass = isSelected
    ? 'bg-primary'
    : isInZone
      ? 'bg-primary-container/60 border-primary'
      : '';
  const textClass = isSelected ? 'text-on-primary' : 'text-on-surface-variant';

  return (
    <Pressable
      onPress={onPress}
      className={`w-[72px] h-[52px] items-center justify-center border-b-2 border-transparent ${stateClass}`}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: isSelected || isInZone }}
      testID={testID}
    >
      {/* Current week: 1dp outline ring inside the slot */}
      {isCurrent && <View pointerEvents="none" className="absolute inset-1 border border-outline rounded-md" />}
      {isCurrent && <Text className="absolute top-0.5 right-1 text-[9px] text-outline">{currentLabel}</Text>}
      <View className={hasPlants || isSelected ? 'items-center' : 'items-center opacity-60'}>
        <Text className={`text-label-large ${textClass}`}>{weekLabel}</Text>
        <Text className={`text-label-small ${textClass}`}>{dateLabel}</Text>
      </View>
      {hasPlants && (
        <View className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-on-primary' : 'bg-primary'}`} />
      )}
    </Pressable>
  );
}
