/**
 * ComponentRenderer
 * Renders a garden component on the canvas (box, pot, or tower)
 */

import React from 'react';
import { View, Text } from 'react-native';
import type { ComponentData } from '@/types';
import {
  isGardenBox,
  isPot,
  isRectangularTower,
  isCircularTower,
} from '@/stores/componentStore';

interface ComponentRendererProps {
  /** Component data to render */
  component: ComponentData;
  /** Pixels per meter scale */
  pixelsPerMeter: number;
  /** Whether this component is selected */
  isSelected?: boolean;
  /** Whether this component is being dragged */
  isDragging?: boolean;
  /** Callback when component is pressed */
  onPress?: (component: ComponentData) => void;
  /** Callback when component is long pressed */
  onLongPress?: (component: ComponentData) => void;
}

/**
 * Get dimensions for a component in pixels
 */
function getComponentDimensions(
  component: ComponentData,
  pixelsPerMeter: number
): { width: number; height: number } {
  if (isGardenBox(component) || isRectangularTower(component)) {
    return {
      width: (component.widthInCm / 100) * pixelsPerMeter,
      height: (component.lengthInCm / 100) * pixelsPerMeter,
    };
  }
  if (isPot(component) || isCircularTower(component)) {
    const diameter = (component.diameterInCm / 100) * pixelsPerMeter;
    return { width: diameter, height: diameter };
  }
  return { width: 50, height: 50 };
}

/**
 * Get component color based on type
 */
function getComponentColor(component: ComponentData): string {
  switch (component.type) {
    case 'gardenBox':
      return '#8B4513'; // Brown
    case 'pot':
      return '#CD853F'; // Peru
    case 'rectangularTower':
      return '#A0522D'; // Sienna
    case 'circularTower':
      return '#D2691E'; // Chocolate
    default:
      return '#808080';
  }
}

/**
 * Get component icon/label
 */
function getComponentIcon(component: ComponentData): string {
  switch (component.type) {
    case 'gardenBox':
      return '□'; // White square
    case 'pot':
      return '○'; // Circle
    case 'rectangularTower':
      return '▲'; // Triangle up
    case 'circularTower':
      return '△'; // White triangle up
    default:
      return '?';
  }
}

/**
 * Renders a single component on the garden canvas
 */
export function ComponentRenderer({
  component,
  pixelsPerMeter,
  isSelected = false,
  isDragging = false,
}: ComponentRendererProps): React.JSX.Element {
  const { width, height } = getComponentDimensions(component, pixelsPerMeter);
  const color = getComponentColor(component);
  const icon = getComponentIcon(component);
  const isCircular = isPot(component) || isCircularTower(component);

  // Tower layer indicator
  const layerCount = isRectangularTower(component) || isCircularTower(component)
    ? component.numberOfLayers
    : null;

  // Visual state
  const borderColor = isDragging
    ? '#facc15' // Yellow when dragging
    : isSelected
    ? '#4ade80' // Green when selected
    : 'rgba(34, 197, 94, 0.5)';
  const borderWidth = isSelected || isDragging ? 3 : 1;
  const opacity = isDragging ? 0.8 : 1;
  const elevation = isDragging ? 10 : isSelected ? 5 : 0;

  return (
    <View
      style={{
        width,
        height,
        backgroundColor: color,
        opacity,
        borderRadius: isCircular ? width / 2 : 4,
        borderWidth,
        borderColor,
        alignItems: 'center',
        justifyContent: 'center',
        elevation,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: isDragging ? 4 : 2 },
        shadowOpacity: isDragging ? 0.3 : 0.1,
        shadowRadius: isDragging ? 8 : 2,
      }}
      testID={`component-${component.id}`}
    >
      {/* Component icon */}
      <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
        {icon}
      </Text>

      {/* Name label (if space permits) */}
      {width > 40 && height > 40 && (
        <Text
          style={{
            color: 'white',
            fontSize: 10,
            textAlign: 'center',
            paddingHorizontal: 4,
          }}
          numberOfLines={1}
        >
          {component.name}
        </Text>
      )}

      {/* Layer count for towers */}
      {layerCount !== null && (
        <View
          style={{
            position: 'absolute',
            top: -8,
            right: -8,
            backgroundColor: '#16a34a',
            borderRadius: 10,
            width: 20,
            height: 20,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
            {layerCount}
          </Text>
        </View>
      )}

      {/* Selection indicator */}
      {isSelected && !isDragging && (
        <View
          style={{
            position: 'absolute',
            top: -12,
            left: '50%',
            marginLeft: -6,
            width: 12,
            height: 12,
            backgroundColor: '#4ade80',
            borderRadius: 6,
            borderWidth: 2,
            borderColor: 'white',
          }}
        />
      )}
    </View>
  );
}
