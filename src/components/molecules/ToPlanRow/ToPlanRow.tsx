import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { getPlantIcon } from '@/assets';

interface ToPlanRowProps {
  /** Plant id: picks the icon and builds the testIDs */
  iconKey: string;
  name: string;
  count: number;
  reasonText?: string;
  /** warning after a run that could not place the plant; muted before any run */
  reasonTone: 'warning' | 'muted';
  removeAccessibilityLabel: string;
  onRemove: () => void;
}

/**
 * One plant in the "Te plannen" list: icon, name, ×count, reason and a remove button.
 * BEM contract (src/styles/planning/to-plan.css): .to-plan-row, __reason, __reason--muted, __remove
 */
export function ToPlanRow({
  iconKey,
  name,
  count,
  reasonText,
  reasonTone,
  removeAccessibilityLabel,
  onRemove,
}: ToPlanRowProps): React.JSX.Element {
  const icon = getPlantIcon(iconKey);

  return (
    <View className="flex-row items-center min-h-[56px] pl-4" testID={`planning-to-plan-row-${iconKey}`}>
      <View className="w-8 h-8 items-center justify-center mr-3">
        {icon ? (
          <Image source={icon} style={{ width: 28, height: 28 }} resizeMode="contain" />
        ) : (
          <Text className="text-lg">🌱</Text>
        )}
      </View>
      <View className="flex-1">
        <Text className="text-body-medium text-on-surface" numberOfLines={1}>
          {name} <Text className="text-on-surface-variant">×{count}</Text>
        </Text>
        {reasonText !== undefined && (
          <Text className={`text-body-small ${reasonTone === 'warning' ? 'text-warning' : 'text-outline'}`}>
            {reasonText}
          </Text>
        )}
      </View>
      <Pressable
        onPress={onRemove}
        className="w-12 h-12 items-center justify-center"
        accessibilityRole="button"
        accessibilityLabel={removeAccessibilityLabel}
        testID={`planning-to-plan-remove-${iconKey}`}
      >
        <Text className="text-on-surface-variant text-lg">✕</Text>
      </Pressable>
    </View>
  );
}
