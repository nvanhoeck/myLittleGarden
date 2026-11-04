import React from 'react';
import { View } from 'react-native';
import { PlanningButton } from '@/components/atoms/PlanningButton';

interface PlanningActionBarProps {
  canRearrange: boolean;
  canStartOver: boolean;
  /** The action in progress: its button shows a spinner, both are disabled */
  running: 'rearrange' | 'startOver' | null;
  rearrangeLabel: string;
  startOverLabel: string;
  onRearrange: () => void;
  onStartOver: () => void;
}

/**
 * Bottom bar with the two planning actions, always visible.
 * BEM contract (src/styles/planning/actions.css): .planning-action-bar
 */
export function PlanningActionBar({
  canRearrange,
  canStartOver,
  running,
  rearrangeLabel,
  startOverLabel,
  onRearrange,
  onStartOver,
}: PlanningActionBarProps): React.JSX.Element {
  const isRunning = running !== null;

  return (
    <View className="flex-row items-center h-14 px-4 gap-3 border-t border-gray-800 bg-background">
      <PlanningButton
        label={rearrangeLabel}
        variant="tonal"
        disabled={!canRearrange || isRunning}
        loading={running === 'rearrange'}
        onPress={onRearrange}
        testID="planning-rearrange"
      />
      <PlanningButton
        label={startOverLabel}
        variant="outlined-danger"
        disabled={!canStartOver || isRunning}
        loading={running === 'startOver'}
        onPress={onStartOver}
        testID="planning-start-over"
      />
    </View>
  );
}
