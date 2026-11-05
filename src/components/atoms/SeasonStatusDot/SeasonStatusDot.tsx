import React from 'react';
import { View } from 'react-native';
import type { SeasonStatus } from '@/types';

const COLOR: Record<SeasonStatus, string> = {
  notPlanned: 'bg-gray-500',
  planned: 'bg-green-500',
  outdated: 'bg-orange-400',
};

/**
 * Status of a season: grey = not planned, green = planned, orange = outdated.
 * BEM contract (src/styles/planning/season.css): .season-status-dot, --not-planned, --planned, --outdated
 */
export function SeasonStatusDot({ status, testID }: { status: SeasonStatus; testID?: string }): React.JSX.Element {
  return <View className={`w-2 h-2 rounded-full ${COLOR[status]}`} testID={testID} />;
}
