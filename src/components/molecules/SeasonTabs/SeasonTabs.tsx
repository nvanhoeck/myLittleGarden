import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { SeasonStatusDot } from '@/components/atoms/SeasonStatusDot';
import type { Season, SeasonStatus } from '@/types';

export interface SeasonTab {
  readonly season: Season;
  readonly label: string;
  readonly monthsLabel: string;
  readonly status: SeasonStatus;
  readonly a11yLabel: string;
}

interface SeasonTabsProps {
  tabs: readonly SeasonTab[];
  selected: Season;
  onSelect: (season: Season) => void;
}

/**
 * Lente · Zomer · Herfst · Winter, each with its months and status dot.
 * BEM contract (src/styles/planning/season.css): .season-tabs, __tab, __tab--selected, __label, __months
 */
export function SeasonTabs({ tabs, selected, onSelect }: SeasonTabsProps): React.JSX.Element {
  return (
    <View className="flex-row border-b border-gray-800" accessibilityRole="tablist">
      {tabs.map((tab) => {
        const isSelected = tab.season === selected;
        return (
          <Pressable
            key={tab.season}
            onPress={() => onSelect(tab.season)}
            className={`flex-1 items-center py-2 ${isSelected ? 'border-b-2 border-green-500' : ''}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={tab.a11yLabel}
            testID={`season-tab-${tab.season}`}
          >
            <View className="flex-row items-center">
              <SeasonStatusDot status={tab.status} />
              <Text className="text-label-large text-on-surface ml-1">{tab.label}</Text>
            </View>
            <Text className="text-xs text-gray-400">{tab.monthsLabel}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
