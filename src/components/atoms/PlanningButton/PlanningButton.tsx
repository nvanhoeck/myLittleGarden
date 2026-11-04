import React from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';

interface PlanningButtonProps {
  label: string;
  variant: 'tonal' | 'outlined-danger';
  disabled: boolean;
  /** Shows a spinner instead of the label; also disables the button */
  loading?: boolean;
  onPress: () => void;
  testID?: string;
}

/**
 * Button of the planning action bar.
 * BEM contract (src/styles/planning/actions.css):
 *   .planning-button, --tonal, --danger, --disabled; __label, __label--danger
 */
export function PlanningButton({
  label,
  variant,
  disabled,
  loading = false,
  onPress,
  testID,
}: PlanningButtonProps): React.JSX.Element {
  const isDanger = variant === 'outlined-danger';
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      hitSlop={{ top: 4, bottom: 4 }}
      className={`flex-1 flex-row h-10 items-center justify-center rounded-full ${
        isDanger ? 'border border-outline' : 'bg-primary-container'
      } ${isDisabled ? 'opacity-40' : ''}`}
      android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isDanger ? '#FFB4AB' : '#78D892'} />
      ) : (
        <Text className={`text-label-large ${isDanger ? 'text-error' : 'text-on-primary-container'}`}>{label}</Text>
      )}
    </Pressable>
  );
}
