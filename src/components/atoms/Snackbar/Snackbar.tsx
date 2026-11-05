import React from 'react';
import { Pressable, Text, View } from 'react-native';

interface SnackbarProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  visible: boolean;
  testID?: string;
}

/**
 * Short message near the bottom of its container; the screen decides when it hides.
 * It sits 56dp above the container's bottom edge, clear of the "Te plannen" header,
 * and stays inside the container so Android delivers touches to the action.
 * BEM contract (src/styles/planning/actions.css): .snackbar, __message, __action
 */
export function Snackbar({ message, actionLabel, onAction, visible, testID }: SnackbarProps): React.JSX.Element | null {
  if (!visible) return null;

  return (
    <View
      className="absolute left-4 right-4 bottom-14 flex-row items-center min-h-[48px] px-4 rounded-lg bg-on-surface"
      accessibilityLiveRegion="polite"
      testID={testID}
    >
      <Text className="flex-1 text-body-medium text-background">{message}</Text>
      {actionLabel !== undefined && onAction !== undefined && (
        <Pressable
          onPress={onAction}
          className="h-12 px-3 items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text className="text-label-large text-primary-container">{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}
