/**
 * ComponentTypeSelector
 * Grid of cards for selecting component type (Garden Box, Pot, Towers)
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ComponentType } from '@/types';

interface ComponentTypeOption {
  type: ComponentType;
  icon: string;
  labelKey: string;
  descriptionKey: string;
}

const COMPONENT_TYPES: ComponentTypeOption[] = [
  {
    type: 'gardenBox',
    icon: '□', // Square
    labelKey: 'components.gardenBox',
    descriptionKey: 'componentCreation.gardenBoxDescription',
  },
  {
    type: 'pot',
    icon: '○', // Circle
    labelKey: 'components.pot',
    descriptionKey: 'componentCreation.potDescription',
  },
  {
    type: 'rectangularTower',
    icon: '▲', // Triangle
    labelKey: 'components.rectangularTower',
    descriptionKey: 'componentCreation.rectangularTowerDescription',
  },
  {
    type: 'circularTower',
    icon: '△', // Triangle outline
    labelKey: 'components.circularTower',
    descriptionKey: 'componentCreation.circularTowerDescription',
  },
];

interface ComponentTypeSelectorProps {
  /** Currently selected type */
  selectedType: ComponentType | null;
  /** Callback when a type is selected */
  onSelect: (type: ComponentType) => void;
  /** Test ID prefix */
  testID?: string;
}

/**
 * Grid of component type cards
 */
export function ComponentTypeSelector({
  selectedType,
  onSelect,
  testID = 'component-type-selector',
}: ComponentTypeSelectorProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <View className="flex-row flex-wrap justify-between px-4" testID={testID}>
      {COMPONENT_TYPES.map((option) => {
        const isSelected = selectedType === option.type;

        return (
          <Pressable
            key={option.type}
            onPress={() => onSelect(option.type)}
            className={`
              w-[48%] mb-3 p-4 rounded-xl items-center
              ${isSelected ? 'bg-green-600 border-2 border-green-400' : 'bg-green-900/40 border border-green-700/50'}
            `}
            testID={`${testID}-${option.type}`}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={t(option.labelKey)}
          >
            {/* Icon */}
            <View
              className={`
                w-16 h-16 rounded-full items-center justify-center mb-2
                ${isSelected ? 'bg-green-500' : 'bg-green-800/50'}
              `}
            >
              <Text className="text-3xl text-white">{option.icon}</Text>
            </View>

            {/* Label */}
            <Text
              className={`
                text-sm font-semibold text-center
                ${isSelected ? 'text-white' : 'text-green-200'}
              `}
            >
              {t(option.labelKey)}
            </Text>

            {/* Description */}
            <Text
              className={`
                text-xs text-center mt-1
                ${isSelected ? 'text-green-100' : 'text-green-400'}
              `}
              numberOfLines={2}
            >
              {t(option.descriptionKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
