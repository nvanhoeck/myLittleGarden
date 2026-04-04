/**
 * PlacementGhost component
 * Shows a semi-transparent preview of a component during placement
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

interface PlacementGhostProps {
  /** Component being placed */
  component: ComponentData;
  /** Current screen position (follows finger) */
  position: { x: number; y: number };
  /** Pixels per meter scale */
  pixelsPerMeter: number;
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
 * Get component icon
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
 * Semi-transparent ghost component that follows the user's finger during placement
 */
export function PlacementGhost({
  component,
  position,
  pixelsPerMeter,
}: PlacementGhostProps): React.JSX.Element {
  const { width, height } = getComponentDimensions(component, pixelsPerMeter);
  const color = getComponentColor(component);
  const icon = getComponentIcon(component);
  const isCircular = isPot(component) || isCircularTower(component);

  // Center the ghost on the finger position
  const left = position.x - width / 2;
  const top = position.y - height / 2;

  return (
    <View
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        backgroundColor: color,
        opacity: 0.7,
        borderRadius: isCircular ? width / 2 : 4,
        borderWidth: 2,
        borderColor: '#4ade80', // Green border to indicate placement
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        // Lift above other elements
        zIndex: 100,
        elevation: 10,
      }}
      pointerEvents="none"
      testID={`placement-ghost-${component.id}`}
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
    </View>
  );
}
