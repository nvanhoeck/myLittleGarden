/**
 * OptimizationMiniCanvas
 *
 * Read-only, non-interactive preview of a single placement alternative.
 * Mirrors the visual contract of PlantPlacementCanvas (component shape,
 * plant circles, spacing-overlap warning) but without drag, zoom, or
 * scroll. Pure presentational <View>.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ComponentData, PlantData } from '@/types';
import {
  isCircularTower,
  isGardenBox,
  isPot,
  isRectangularTower,
} from '@/stores/componentStore';

const PLANT_INNER_RADIUS_CM = 5;

export interface MiniCanvasPosition {
  readonly plantInstanceId: string;
  readonly positionXInCm: number;
  readonly positionYInCm: number;
}

interface OptimizationMiniCanvasProps {
  component: ComponentData;
  positions: readonly MiniCanvasPosition[];
  plantDataMap: Record<string, PlantData | undefined>;
  width: number;
  height: number;
}

function getInnerDimensions(component: ComponentData): { width: number; height: number } {
  const border = component.borderWidthInCm * 2;
  if (isGardenBox(component) || isRectangularTower(component)) {
    return {
      width: Math.max(0, component.widthInCm - border),
      height: Math.max(0, component.lengthInCm - border),
    };
  }
  if (isPot(component) || isCircularTower(component)) {
    const size = Math.max(0, component.diameterInCm - border);
    return { width: size, height: size };
  }
  return { width: 100, height: 100 };
}

function hasSpacingOverlap(
  current: MiniCanvasPosition,
  others: readonly MiniCanvasPosition[],
  plantDataMap: Record<string, PlantData | undefined>,
): boolean {
  const currentPlant = plantDataMap[current.plantInstanceId];
  if (!currentPlant || currentPlant.plantingStyle === 'patch') return false;
  const currentSpacing = currentPlant.spacingRadiusCm;

  return others.some((other) => {
    if (other.plantInstanceId === current.plantInstanceId) return false;
    const otherPlant = plantDataMap[other.plantInstanceId];
    if (!otherPlant || otherPlant.plantingStyle === 'patch') return false;
    const dx = current.positionXInCm - other.positionXInCm;
    const dy = current.positionYInCm - other.positionYInCm;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = Math.max(currentSpacing, otherPlant.spacingRadiusCm);
    return distance < minDistance;
  });
}

export function OptimizationMiniCanvas({
  component,
  positions,
  plantDataMap,
  width,
  height,
}: OptimizationMiniCanvasProps): React.JSX.Element {
  const innerDims = useMemo(() => getInnerDimensions(component), [component]);
  const isCircular = isPot(component) || isCircularTower(component);

  const scale = useMemo(() => {
    if (innerDims.width === 0 || innerDims.height === 0) return 1;
    return Math.min(width / innerDims.width, height / innerDims.height);
  }, [width, height, innerDims]);

  const containerWidth = innerDims.width * scale;
  const containerHeight = innerDims.height * scale;
  const offsetX = (width - containerWidth) / 2;
  const offsetY = (height - containerHeight) / 2;

  const plantBodyPx = Math.max(16, PLANT_INNER_RADIUS_CM * scale * 2);

  return (
    <View style={[styles.canvas, { width, height }]}>
      <View
        style={[
          styles.componentShape,
          {
            width: containerWidth,
            height: containerHeight,
            left: offsetX,
            top: offsetY,
            borderRadius: isCircular ? containerWidth / 2 : 8,
          },
        ]}
      >
        {positions.map((position) => {
          const plant = plantDataMap[position.plantInstanceId];
          const isPatch = plant?.plantingStyle === 'patch';
          const overlap = hasSpacingOverlap(position, positions, plantDataMap);
          const cx = position.positionXInCm * scale;
          const cy = position.positionYInCm * scale;

          return (
            <View
              key={position.plantInstanceId}
              style={[
                styles.plantWrapper,
                {
                  left: cx - plantBodyPx / 2,
                  top: cy - plantBodyPx / 2,
                  width: plantBodyPx,
                },
              ]}
              pointerEvents="none"
            >
              <View
                style={[
                  styles.plantBody,
                  {
                    width: plantBodyPx,
                    height: plantBodyPx,
                    borderRadius: isPatch ? 4 : plantBodyPx / 2,
                    backgroundColor: isPatch ? '#92400e' : '#16a34a',
                    borderWidth: overlap ? 2 : isPatch ? 2 : 0,
                    borderStyle: isPatch ? 'dashed' : 'solid',
                    borderColor: overlap
                      ? '#f59e0b'
                      : isPatch
                      ? '#d97706'
                      : 'transparent',
                  },
                ]}
              />
              {plant?.nameNl ? (
                <View style={styles.labelContainer}>
                  <Text style={styles.labelText} numberOfLines={1}>
                    {plant.nameNl}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    overflow: 'hidden',
  },
  componentShape: {
    position: 'absolute',
    backgroundColor: '#3d2914',
    borderWidth: 3,
    borderColor: '#8B4513',
    overflow: 'hidden',
  },
  plantWrapper: {
    position: 'absolute',
    alignItems: 'center',
  },
  plantBody: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    marginTop: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 3,
    maxWidth: 80,
  },
  labelText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '500',
  },
});
