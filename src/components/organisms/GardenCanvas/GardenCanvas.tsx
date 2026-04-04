/**
 * GardenCanvas component
 * Miro-style infinite canvas for placing garden components
 */

import React, { useCallback } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAllComponents, useComponentStore } from '@/stores';
import { DraggableComponent } from './DraggableComponent';
import { PlacementGhost } from './PlacementGhost';
import { useCanvasPan } from './useCanvasPan';
import { usePlacementMode } from './usePlacementMode';
import type { ComponentData } from '@/types';

interface GardenCanvasProps {
  /** Callback when a component is pressed */
  onComponentPress?: (component: ComponentData) => void;
  /** Callback when a component is long pressed */
  onComponentLongPress?: (component: ComponentData) => void;
  /** ID of currently selected component */
  selectedComponentId?: string | null;
  /** Callback to update selected component */
  onSelectionChange?: (componentId: string | null) => void;
  /** Component being placed from inventory */
  placingComponent?: ComponentData | null;
  /** Callback when placement starts (from inventory tap) */
  onPlacementStart?: (component: ComponentData) => void;
  /** Callback when placement completes */
  onPlacementComplete?: () => void;
  /** Callback when placement is cancelled */
  onPlacementCancel?: () => void;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Fixed scale: 1 meter = 100 pixels
 * This gives a consistent zoom level for component placement
 */
const PIXELS_PER_METER = 100;

/**
 * Rotation step in degrees (15-degree increments)
 */
const ROTATION_STEP = 15;

/**
 * Miro-style infinite canvas for garden components
 * - No grid lines
 * - No dimension constraints
 * - Free panning in all directions
 * - Components can be placed anywhere
 * - Supports drag-to-place from inventory
 * - Selected components can be moved and rotated
 */
export function GardenCanvas({
  onComponentPress,
  onComponentLongPress,
  selectedComponentId,
  onSelectionChange,
  placingComponent,
  onPlacementComplete,
  onPlacementCancel,
  testID = 'garden-canvas',
}: GardenCanvasProps): React.JSX.Element {
  const { t } = useTranslation();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const components = useAllComponents();
  const rotateComponent = useComponentStore((state) => state.rotateComponent);

  // Find selected component
  const selectedComponent = selectedComponentId
    ? components.find((c) => c.id === selectedComponentId)
    : null;

  // Canvas center point (origin for components)
  const canvasCenter = { x: windowWidth / 2, y: windowHeight / 3 };

  // Free panning without bounds
  const {
    offset,
    onTouchStart: onPanTouchStart,
    onTouchMove: onPanTouchMove,
    onTouchEnd: onPanTouchEnd,
  } = useCanvasPan({
    enabled: !placingComponent, // Disable panning during placement
  });

  // Placement mode
  const {
    placementPosition,
    onPlacementTouchStart,
    onPlacementTouchMove,
    onPlacementTouchEnd,
    startPlacement,
  } = usePlacementMode();

  // Start placement when component is passed
  React.useEffect(() => {
    if (placingComponent) {
      startPlacement(placingComponent);
    }
  }, [placingComponent, startPlacement]);

  // Handle touch events - route to placement or pan
  const handleTouchStart = useCallback(
    (event: GestureResponderEvent) => {
      if (placingComponent) {
        onPlacementTouchStart(event);
      } else {
        onPanTouchStart(event);
      }
    },
    [placingComponent, onPlacementTouchStart, onPanTouchStart]
  );

  const handleTouchMove = useCallback(
    (event: GestureResponderEvent) => {
      if (placingComponent) {
        onPlacementTouchMove(event, offset, canvasCenter);
      } else {
        onPanTouchMove(event);
      }
    },
    [placingComponent, onPlacementTouchMove, onPanTouchMove, offset, canvasCenter]
  );

  const handleTouchEnd = useCallback(() => {
    if (placingComponent && placementPosition) {
      onPlacementTouchEnd(offset, canvasCenter, PIXELS_PER_METER);
      onPlacementComplete?.();
    } else if (placingComponent) {
      // Touched but didn't drag - cancel
      onPlacementCancel?.();
    } else {
      onPanTouchEnd();
    }
  }, [
    placingComponent,
    placementPosition,
    onPlacementTouchEnd,
    onPlacementComplete,
    onPlacementCancel,
    onPanTouchEnd,
    offset,
    canvasCenter,
  ]);

  // Handle background tap to deselect
  const handleBackgroundPress = useCallback(() => {
    if (selectedComponentId && !placingComponent) {
      onSelectionChange?.(null);
    }
  }, [selectedComponentId, placingComponent, onSelectionChange]);

  // Handle component selection
  const handleComponentSelect = useCallback(
    (component: ComponentData) => {
      onSelectionChange?.(component.id);
      onComponentPress?.(component);
    },
    [onSelectionChange, onComponentPress]
  );

  // Handle rotation
  const handleRotateLeft = useCallback(() => {
    if (selectedComponentId && selectedComponent) {
      const newRotation = selectedComponent.rotation - ROTATION_STEP;
      rotateComponent(selectedComponentId, newRotation);
    }
  }, [selectedComponentId, selectedComponent, rotateComponent]);

  const handleRotateRight = useCallback(() => {
    if (selectedComponentId && selectedComponent) {
      const newRotation = selectedComponent.rotation + ROTATION_STEP;
      rotateComponent(selectedComponentId, newRotation);
    }
  }, [selectedComponentId, selectedComponent, rotateComponent]);

  // Filter out the component being placed (it will be shown as ghost)
  const visibleComponents = placingComponent
    ? components.filter((c) => c.id !== placingComponent.id)
    : components;

  return (
    <View
      className="flex-1 bg-surface"
      testID={testID}
    >
      {/* Placement mode indicator */}
      {placingComponent && (
        <View className="absolute top-2 left-0 right-0 z-10 items-center">
          <View className="bg-green-600 px-4 py-2 rounded-full flex-row items-center">
            <Text className="text-white font-medium mr-2">
              {t('canvas.placementMode', { name: placingComponent.name })}
            </Text>
            <Pressable
              onPress={onPlacementCancel}
              className="bg-white/20 rounded-full px-2 py-1"
              hitSlop={8}
            >
              <Text className="text-white text-xs">{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Rotation toolbar - shown when component is selected */}
      {selectedComponent && !placingComponent && (
        <View className="absolute top-2 left-0 right-0 z-10 items-center">
          <View className="bg-gray-800 px-2 py-1 rounded-full flex-row items-center">
            <Pressable
              onPress={handleRotateLeft}
              className="w-10 h-10 items-center justify-center rounded-full bg-gray-700 mr-2"
              hitSlop={4}
              testID="rotate-left-button"
            >
              <Text className="text-white text-lg">↺</Text>
            </Pressable>
            <Text className="text-white text-sm px-2">
              {selectedComponent.rotation}°
            </Text>
            <Pressable
              onPress={handleRotateRight}
              className="w-10 h-10 items-center justify-center rounded-full bg-gray-700 ml-2"
              hitSlop={4}
              testID="rotate-right-button"
            >
              <Text className="text-white text-lg">↻</Text>
            </Pressable>
            <View className="w-px h-6 bg-gray-600 mx-2" />
            <Pressable
              onPress={() => onSelectionChange?.(null)}
              className="px-3 py-1 rounded-full bg-gray-700"
              hitSlop={4}
            >
              <Text className="text-white text-xs">{t('common.close')}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Canvas container - fills available space */}
      <Pressable
        className="flex-1 overflow-hidden"
        onPress={handleBackgroundPress}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        testID={`${testID}-container`}
      >
        {/* Pannable content layer */}
        <View
          style={{
            position: 'absolute',
            left: canvasCenter.x + offset.x,
            top: canvasCenter.y + offset.y,
          }}
          testID={`${testID}-content`}
        >
          {/* Render all components as draggable */}
          {visibleComponents.map((component) => (
            <DraggableComponent
              key={component.id}
              component={component}
              pixelsPerMeter={PIXELS_PER_METER}
              isSelected={component.id === selectedComponentId}
              onSelect={handleComponentSelect}
              onLongPress={onComponentLongPress}
              canvasOffset={offset}
              canvasCenter={canvasCenter}
            />
          ))}
        </View>

        {/* Placement ghost - follows finger */}
        {placingComponent && placementPosition && (
          <PlacementGhost
            component={placingComponent}
            position={placementPosition}
            pixelsPerMeter={PIXELS_PER_METER}
          />
        )}
      </Pressable>

      {/* Tap hint when in placement mode but not yet dragging */}
      {placingComponent && !placementPosition && (
        <View className="absolute bottom-4 left-0 right-0 items-center">
          <Text className="text-green-400 text-sm">
            {t('canvas.tapToPlace')}
          </Text>
        </View>
      )}
    </View>
  );
}
