import React, { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import type { SunDirection } from '@/types/environment.types';
import { SUN_DIRECTIONS } from '@/types/environment.types';

/**
 * Configuration constants for compass dimensions and layout
 */
const COMPASS_CONFIG = {
  /** Total size of the compass container */
  SIZE: 280,
  /** Distance from center to inner segment edge */
  INNER_RADIUS: 70,
  /** Distance from center to outer segment edge */
  OUTER_RADIUS: 120,
  /** Distance from center for direction labels */
  LABEL_RADIUS: 95,
  /** Size of normal direction buttons (non-cardinal) */
  BUTTON_SIZE_NORMAL: 48,
  /** Size of cardinal direction buttons (N, E, S, W) */
  BUTTON_SIZE_CARDINAL: 56,
  /** Padding around the compass to prevent button clipping */
  PADDING: 30,
} as const;

interface CompassSelectorProps {
  /** Currently selected sun direction */
  selectedDirection: SunDirection | null;
  /** Callback when a direction is selected */
  onSelect: (direction: SunDirection) => void;
  /** Optional test ID for testing */
  testID?: string;
}

/**
 * Configuration for compass segment positioning
 * Each direction has an angle offset for proper placement around the circle
 */
interface SegmentConfig {
  direction: SunDirection;
  angle: number; // Degrees from top (N = 0)
  label: string;
  isCardinal: boolean;
}

/**
 * Generate segment configurations for all directions
 * Dynamically calculates angle step based on number of directions
 */
function generateSegmentConfigs(): SegmentConfig[] {
  const angleStep = 360 / SUN_DIRECTIONS.length; // 45 degrees for 8 directions

  return SUN_DIRECTIONS.map((direction, index) => ({
    direction,
    angle: index * angleStep,
    label: direction,
    isCardinal: ['N', 'E', 'S', 'W'].includes(direction),
  }));
}

/**
 * Calculate position for a segment based on angle
 */
function calculatePosition(
  angle: number,
  radius: number
): { x: number; y: number } {
  // Convert to radians and adjust for top-start (N = 0)
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: Math.cos(radians) * radius,
    y: Math.sin(radians) * radius,
  };
}

/**
 * CompassSelector displays a circular compass interface allowing users
 * to select one of 8 sun directions. The sun icon in the center represents
 * the compass direction where the sun reaches its highest point (solar noon).
 *
 * Layout:
 * - 8 direction segments arranged in a circle (N, NE, E, SE, S, SW, W, NW)
 * - Cardinal directions (N, E, S, W) are emphasized with larger buttons
 * - Intercardinal directions (NE, SE, SW, NW) use smaller buttons
 * - Selected direction is highlighted with green
 * - Sun icon in the center
 */
export function CompassSelector({
  selectedDirection,
  onSelect,
  testID = 'compass-selector',
}: CompassSelectorProps): React.JSX.Element {
  const segments = useMemo(() => generateSegmentConfigs(), []);

  // Calculate total container size including padding for overflow prevention
  const containerSize = COMPASS_CONFIG.SIZE + COMPASS_CONFIG.PADDING * 2;
  const center = containerSize / 2;

  return (
    <View
      className="items-center justify-center"
      testID={testID}
      accessibilityRole="radiogroup"
      accessibilityLabel="Selecteer zonrichting"
      accessibilityHint="Selecteer de richting waar de zon het hoogst staat op het middaguur"
    >
      <View
        style={{ width: containerSize, height: containerSize }}
        className="relative items-center justify-center"
      >
        {/* Background circle */}
        <View
          className="absolute rounded-full bg-green-900/20 border border-green-700/30"
          style={{
            width: COMPASS_CONFIG.OUTER_RADIUS * 2 + 40,
            height: COMPASS_CONFIG.OUTER_RADIUS * 2 + 40,
          }}
        />

        {/* Direction segments */}
        {segments.map((segment) => {
          const isSelected = selectedDirection === segment.direction;
          const position = calculatePosition(segment.angle, COMPASS_CONFIG.LABEL_RADIUS);
          const buttonSize = segment.isCardinal
            ? COMPASS_CONFIG.BUTTON_SIZE_CARDINAL
            : COMPASS_CONFIG.BUTTON_SIZE_NORMAL;
          const buttonOffset = buttonSize / 2;

          return (
            <Pressable
              key={segment.direction}
              onPress={() => onSelect(segment.direction)}
              className={`
                absolute items-center justify-center rounded-full
                ${isSelected ? 'bg-green-600' : 'bg-green-900/40'}
              `}
              style={{
                width: buttonSize,
                height: buttonSize,
                left: center + position.x - buttonOffset,
                top: center + position.y - buttonOffset,
              }}
              testID={`${testID}-direction-${segment.direction}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Zonrichting ${segment.direction}`}
              accessibilityHint={
                isSelected
                  ? 'Momenteel geselecteerd'
                  : 'Dubbeltik om te selecteren'
              }
            >
              <Text
                className={`
                  font-semibold
                  ${isSelected ? 'text-white' : 'text-green-200'}
                  ${segment.isCardinal ? 'text-base' : 'text-xs'}
                `}
              >
                {segment.label}
              </Text>
            </Pressable>
          );
        })}

        {/* Sun icon in center */}
        <View
          className="absolute items-center justify-center rounded-full bg-yellow-500"
          style={{
            width: 64,
            height: 64,
            left: center - 32,
            top: center - 32,
          }}
          testID={`${testID}-sun-icon`}
          accessibilityLabel="Zon"
        >
          <Text className="text-2xl">☀️</Text>
        </View>

        {/* Selected direction indicator */}
        {selectedDirection && (
          <View
            className="absolute bottom-0 left-0 right-0 items-center"
            testID={`${testID}-selected-indicator`}
          >
            <Text className="text-green-50 text-sm font-medium mt-4">
              Geselecteerd: {selectedDirection}
            </Text>
          </View>
        )}
      </View>
      <Text className="text-green-400 text-xs text-center mt-3 px-4">
        Selecteer de richting waar de zon het hoogst staat (op het zuiden = meeste zon)
      </Text>
    </View>
  );
}
