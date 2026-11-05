import React from 'react';
import { Pressable, Text, View } from 'react-native';

interface TimeZoneSegmentProps {
  widthPx: number;
  label: string;
  isSelected: boolean;
  isEmpty: boolean;
  /** The selected single week lies in this zone: a subtle top marker */
  isMarked: boolean;
  tone: 0 | 1;
  accessibilityLabel: string;
  onPress: () => void;
  testID?: string;
}

/**
 * One time zone in the zone band, spanning its weeks (at least one 72 wide week).
 * The band is drawn 28 high; the touch target is 48 high, extending below the
 * band instead of overlapping the week slots above it.
 * BEM contract (src/styles/planning/timeline.css):
 *   .zone-segment, --selected, --empty, --tone-a, --tone-b, --marked; __band, __label
 */
export function TimeZoneSegment({
  widthPx,
  label,
  isSelected,
  isEmpty,
  isMarked,
  tone,
  accessibilityLabel,
  onPress,
  testID,
}: TimeZoneSegmentProps): React.JSX.Element {
  const toneClass = tone === 0 ? 'bg-surface-variant' : 'bg-primary-container/60';
  const borderClass = isSelected
    ? 'border-2 border-primary'
    : `border-t-2 ${isMarked ? 'border-t-primary/50' : 'border-transparent'}`;
  return (
    <Pressable
      onPress={onPress}
      style={{ width: widthPx }}
      className="h-12"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: isSelected }}
      testID={testID}
    >
      <View className={`h-7 items-center justify-center ${toneClass} ${borderClass}`}>
        <Text className={`text-label-small ${isEmpty ? 'text-outline' : 'text-on-surface'}`} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
