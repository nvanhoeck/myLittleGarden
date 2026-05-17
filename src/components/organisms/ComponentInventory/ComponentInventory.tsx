/**
 * ComponentInventory
 * Collapsible accordion showing unplaced garden components
 */

import React, { useState, useCallback, useRef } from 'react';
import { View, Text, Pressable, FlatList, PanResponder } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useUnplacedComponents, useComponentActions } from '@/stores';
import type { ComponentData } from '@/types';
import { isGardenBox, isPot, isRectangularTower, isCircularTower } from '@/stores/componentStore';

interface ComponentInventoryProps {
  /** Callback when a component is selected for placement */
  onSelectComponent?: (component: ComponentData) => void;
  /** Callback when long pressing a component (for edit/delete) */
  onLongPressComponent?: (component: ComponentData) => void;
  /** Callback when drag starts on an inventory item (for cross-component placement) */
  onStartPlacement?: (component: ComponentData) => void;
  /** Callback during drag movement with page coordinates */
  onPlacementMove?: (pageX: number, pageY: number) => void;
  /** Callback when drag is released with page coordinates */
  onPlacementRelease?: (pageX: number, pageY: number) => void;
  /** Test ID prefix */
  testID?: string;
}

/**
 * Get component icon based on type
 */
function getComponentIcon(component: ComponentData): string {
  switch (component.type) {
    case 'gardenBox':
      return '□';
    case 'pot':
      return '○';
    case 'rectangularTower':
      return '▲';
    case 'circularTower':
      return '△';
    default:
      return '?';
  }
}

/**
 * Get component dimensions description
 */
function getComponentDimensions(component: ComponentData): string {
  if (isGardenBox(component) || isRectangularTower(component)) {
    return `${component.widthInCm} x ${component.lengthInCm} cm`;
  }
  if (isPot(component) || isCircularTower(component)) {
    return `Ø ${component.diameterInCm} cm`;
  }
  return '';
}

/**
 * Get additional info for component
 */
function getComponentInfo(component: ComponentData, t: (key: string) => string): string {
  if (isRectangularTower(component) || isCircularTower(component)) {
    return `${component.numberOfLayers} ${t('componentInventory.layers')}`;
  }
  return '';
}

/**
 * Single inventory item component
 */
function InventoryItem({
  component,
  onPress,
  onLongPress,
  onDragStart,
  onDragMove,
  onDragRelease,
  testID,
  t,
}: {
  component: ComponentData;
  onPress?: () => void;
  onLongPress?: () => void;
  onDragStart?: () => void;
  onDragMove?: (pageX: number, pageY: number) => void;
  onDragRelease?: (pageX: number, pageY: number) => void;
  testID: string;
  t: (key: string) => string;
}): React.JSX.Element {
  const icon = getComponentIcon(component);
  const dimensions = getComponentDimensions(component);
  const info = getComponentInfo(component, t);

  const isDraggingRef = useRef(false);
  const hasMovedRef = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderGrant: () => {
        isDraggingRef.current = false;
        hasMovedRef.current = false;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!isDraggingRef.current && Math.abs(gestureState.dy) > 10) {
          isDraggingRef.current = true;
          hasMovedRef.current = true;
          onDragStart?.();
        }
        if (isDraggingRef.current) {
          onDragMove?.(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
        }
      },
      onPanResponderRelease: (evt) => {
        if (isDraggingRef.current) {
          onDragRelease?.(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
          isDraggingRef.current = false;
        } else if (!hasMovedRef.current) {
          onPress?.();
        }
      },
      onPanResponderTerminate: () => {
        isDraggingRef.current = false;
      },
    })
  ).current;

  return (
    <View
      {...panResponder.panHandlers}
      className="flex-row items-center bg-green-900/40 rounded-lg p-3 mb-2 mr-2 border border-green-700/50"
      style={{ minWidth: 140 }}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={component.name + ', ' + t('components.' + component.type)}
    >
      {/* Icon */}
      <View className="w-10 h-10 rounded-full bg-green-800/50 items-center justify-center mr-3">
        <Text className="text-xl text-green-300">{icon}</Text>
      </View>

      {/* Details */}
      <View className="flex-1">
        <Text className="text-white font-medium" numberOfLines={1}>
          {component.name}
        </Text>
        <Text className="text-green-400 text-xs">
          {dimensions}
        </Text>
        {info ? (
          <Text className="text-green-500 text-xs">{info}</Text>
        ) : null}
      </View>

      {/* Sun direction indicator */}
      <View className="items-center">
        <Text className="text-yellow-400 text-xs">☀</Text>
        <Text className="text-green-500 text-xs">{component.sunDirection}</Text>
      </View>
    </View>
  );
}

/**
 * Collapsible component inventory
 */
export function ComponentInventory({
  onSelectComponent,
  onLongPressComponent,
  onStartPlacement,
  onPlacementMove,
  onPlacementRelease,
  testID = 'component-inventory',
}: ComponentInventoryProps): React.JSX.Element {
  const { t } = useTranslation();
  const unplacedComponents = useUnplacedComponents();
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleItemPress = useCallback(
    (component: ComponentData) => {
      onSelectComponent?.(component);
    },
    [onSelectComponent]
  );

  const handleItemLongPress = useCallback(
    (component: ComponentData) => {
      onLongPressComponent?.(component);
    },
    [onLongPressComponent]
  );

  const renderItem = useCallback(
    ({ item }: { item: ComponentData }) => (
      <InventoryItem
        component={item}
        onPress={() => handleItemPress(item)}
        onLongPress={() => handleItemLongPress(item)}
        onDragStart={() => onStartPlacement?.(item)}
        onDragMove={(pageX, pageY) => onPlacementMove?.(pageX, pageY)}
        onDragRelease={(pageX, pageY) => onPlacementRelease?.(pageX, pageY)}
        testID={testID + '-item-' + item.id}
        t={t}
      />
    ),
    [handleItemPress, handleItemLongPress, onStartPlacement, onPlacementMove, onPlacementRelease, testID, t]
  );

  const keyExtractor = useCallback((item: ComponentData) => item.id, []);

  return (
    <View
      className="bg-green-950 border-t border-green-800"
      testID={testID}
    >
      {/* Header - always visible */}
      <Pressable
        onPress={toggleExpand}
        className="flex-row items-center justify-between px-4 py-3"
        testID={`${testID}-header`}
        accessibilityRole="button"
        accessibilityLabel={t('componentInventory.title')}
        accessibilityHint={isExpanded ? t('componentInventory.tapToCollapse') : t('componentInventory.tapToExpand')}
      >
        <View className="flex-row items-center">
          <Text className="text-green-200 font-semibold">
            {t('componentInventory.title')}
          </Text>
          <View className="ml-2 bg-green-700 rounded-full px-2 py-0.5">
            <Text className="text-white text-xs font-bold">
              {unplacedComponents.length}
            </Text>
          </View>
        </View>
        <Text className="text-green-400 text-lg">
          {isExpanded ? '▲' : '▼'}
        </Text>
      </Pressable>

      {/* Content - collapsible */}
      {isExpanded && (
        <View className="px-4 pb-4">
          {unplacedComponents.length === 0 ? (
            <Text className="text-green-600 text-center py-4">
              {t('componentInventory.empty')}
            </Text>
          ) : (
            <FlatList
              data={unplacedComponents}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16 }}
              testID={`${testID}-list`}
            />
          )}
        </View>
      )}
    </View>
  );
}
