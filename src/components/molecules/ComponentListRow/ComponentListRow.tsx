/**
 * ComponentListRow
 * One row in the home screen component list. Tapping it jumps the slider.
 */
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ComponentData } from '@/types';
import { getComponentTypeIcon, getComponentDimensionsLabel } from '@/utils/componentSummary';

interface ComponentListRowProps {
  component: ComponentData;
  /** Plants growing in the component today */
  plantCount: number;
  isActive: boolean;
  onPress: (component: ComponentData) => void;
  testID?: string;
}

export function ComponentListRow({
  component,
  plantCount,
  isActive,
  onPress,
  testID,
}: ComponentListRowProps): React.JSX.Element {
  const { t } = useTranslation();
  const rowTestID = testID ?? `component-list-row-${component.id}`;

  return (
    <Pressable
      onPress={() => onPress(component)}
      className={
        isActive
          ? 'flex-row items-center rounded-lg px-3 py-3 mb-2 bg-green-900/60 border-l-4 border-green-400'
          : 'flex-row items-center rounded-lg px-3 py-3 mb-2 bg-surface-variant/30 border-l-4 border-transparent'
      }
      android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
      testID={rowTestID}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={`${component.name}, ${t(`components.${component.type}`)}`}
    >
      <View className="w-10 h-10 rounded-full bg-green-800/50 items-center justify-center mr-3">
        <Text className="text-xl text-green-300">{getComponentTypeIcon(component)}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-white font-medium" numberOfLines={1}>
          {component.name}
        </Text>
        <Text className="text-green-400 text-xs">
          {getComponentDimensionsLabel(component)} • {t('component.plantCount', { count: plantCount })}
        </Text>
      </View>
      <View className="items-center ml-2">
        <Text className="text-yellow-400 text-xs">☀</Text>
        <Text className="text-green-500 text-xs">{component.sunDirection}</Text>
      </View>
    </Pressable>
  );
}
