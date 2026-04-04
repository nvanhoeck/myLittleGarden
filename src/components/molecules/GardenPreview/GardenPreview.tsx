import React, { useMemo } from 'react';
import { View, Text } from 'react-native';

interface GardenPreviewProps {
  /** Garden width in meters */
  width: number;
  /** Garden height in meters */
  height: number;
  /** Maximum display size in pixels */
  maxSize?: number;
  /** Optional test ID for testing */
  testID?: string;
}

/**
 * Calculate scaled dimensions to fit within maxSize while maintaining aspect ratio
 */
function calculateScaledDimensions(
  width: number,
  height: number,
  maxSize: number
): { scaledWidth: number; scaledHeight: number; scale: number } {
  if (width <= 0 || height <= 0) {
    return { scaledWidth: 0, scaledHeight: 0, scale: 0 };
  }

  const aspectRatio = width / height;
  let scaledWidth: number;
  let scaledHeight: number;

  if (aspectRatio > 1) {
    // Wider than tall
    scaledWidth = maxSize;
    scaledHeight = maxSize / aspectRatio;
  } else {
    // Taller than wide or square
    scaledHeight = maxSize;
    scaledWidth = maxSize * aspectRatio;
  }

  const scale = scaledWidth / width;

  return { scaledWidth, scaledHeight, scale };
}

/**
 * Format a dimension value for display
 */
function formatDimension(value: number): string {
  if (value === 0) return '0';
  if (value < 1) {
    return `${(value * 100).toFixed(0)} cm`;
  }
  // Show one decimal if not whole number
  if (value % 1 !== 0) {
    return `${value.toFixed(1)} m`;
  }
  return `${value} m`;
}

/**
 * GardenPreview displays a scaled visual representation of the garden
 * proportions with dimension labels.
 *
 * Features:
 * - Maintains aspect ratio while scaling to fit
 * - Shows width and height labels
 * - Calculates and displays area
 * - Grid pattern background for visual context
 */
export function GardenPreview({
  width,
  height,
  maxSize = 180,
  testID = 'garden-preview',
}: GardenPreviewProps): React.JSX.Element {
  const { scaledWidth, scaledHeight } = useMemo(
    () => calculateScaledDimensions(width, height, maxSize),
    [width, height, maxSize]
  );

  const area = width * height;
  const isValid = width > 0 && height > 0;

  if (!isValid) {
    return (
      <View
        className="items-center justify-center p-4"
        testID={testID}
        accessibilityLabel="Tuinvoorbeeld: nog geen afmetingen ingevoerd"
      >
        <View
          className="items-center justify-center rounded-lg bg-green-900/20 border border-dashed border-green-700/30"
          style={{ width: maxSize, height: maxSize }}
        >
          <Text className="text-green-200/60 text-sm text-center px-4">
            Voer afmetingen in om een voorbeeld te zien
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      className="items-center justify-center p-4"
      testID={testID}
      accessibilityLabel={`Tuinvoorbeeld: ${formatDimension(width)} breed, ${formatDimension(height)} hoog, oppervlakte ${area.toFixed(1)} vierkante meter`}
    >
      {/* Preview Container with dimension labels */}
      <View className="items-center">
        {/* Width label (top) */}
        <View className="mb-2 flex-row items-center">
          <View className="h-px flex-1 bg-green-600/50" />
          <Text
            className="text-green-50 text-sm font-medium mx-2"
            testID={`${testID}-width-label`}
          >
            {formatDimension(width)}
          </Text>
          <View className="h-px flex-1 bg-green-600/50" />
        </View>

        <View className="flex-row items-center">
          {/* Garden shape */}
          <View
            className="items-center justify-center rounded-lg bg-green-800/40 border-2 border-green-600"
            style={{
              width: scaledWidth,
              height: scaledHeight,
            }}
            testID={`${testID}-shape`}
          >
            {/* Grid pattern (decorative) */}
            <View className="absolute inset-0 opacity-20">
              {Array.from({ length: 3 }).map((_, rowIndex) => (
                <View key={rowIndex} className="flex-1 flex-row">
                  {Array.from({ length: 3 }).map((_, colIndex) => (
                    <View
                      key={colIndex}
                      className="flex-1 border border-green-600/30"
                    />
                  ))}
                </View>
              ))}
            </View>

            {/* Area label */}
            <Text
              className="text-green-50 text-lg font-bold"
              testID={`${testID}-area`}
            >
              {area.toFixed(1)} m²
            </Text>
          </View>

          {/* Height label (right) */}
          <View className="ml-2 h-full items-center justify-center">
            <View className="w-px flex-1 bg-green-600/50" />
            <Text
              className="text-green-50 text-sm font-medium my-2 -rotate-90"
              style={{ width: scaledHeight }}
              testID={`${testID}-height-label`}
            >
              {formatDimension(height)}
            </Text>
            <View className="w-px flex-1 bg-green-600/50" />
          </View>
        </View>
      </View>
    </View>
  );
}
