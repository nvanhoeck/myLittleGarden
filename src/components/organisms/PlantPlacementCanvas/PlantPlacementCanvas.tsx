/**
 * PlantPlacementCanvas
 * Interactive canvas for placing and arranging plants within a component.
 * Shows spacing radius circles, collision warnings, and companion plant indicators.
 */

import React, { useCallback, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  PanResponder,
  Image,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import type { ComponentData, PlacedPlantData, PlantData } from '@/types';
import { PLANT_CATEGORIES } from '@/types/plant.types';
import {
  isGardenBox,
  isPot,
  isRectangularTower,
  isCircularTower,
} from '@/stores/componentStore';
import { usePlantStore } from '@/stores/plantStore';
import {
  calculatePlantRelationships,
  type PlantRelationship,
} from '@/utils/companionRelationships';
import { RelationshipIndicator } from '@/components/molecules/RelationshipIndicator';
import { RelationshipTooltip } from '@/components/molecules/RelationshipTooltip';
import { getPlantIcon, hasPlantIcon } from '@/assets';

interface PlantPlacementCanvasProps {
  component: ComponentData;
  plants?: readonly PlacedPlantData[]; // Optional filtered plants (for tower layers)
  layerDimensions?: { width: number; height: number }; // Optional layer-specific dimensions
  onPlantPositionChange: (plantId: string, x: number, y: number) => void;
  onPlantPress?: (plant: PlacedPlantData) => void;
  onPlantLongPress?: (plant: PlacedPlantData) => void;
}

interface DraggablePlantProps {
  plant: PlacedPlantData;
  plantData: PlantData | undefined;
  scale: number;
  containerWidth: number;
  containerHeight: number;
  onPositionChange: (plantId: string, x: number, y: number) => void;
  onPress?: () => void;
  onLongPress?: () => void;
  hasSpacingOverlap: boolean;
  hasInnerCollision: boolean;
  isSelected: boolean;
  onSelect: () => void;
}

/**
 * Get inner dimensions (excluding border) for a component
 */
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

// Inner circle size in cm (the actual plant body, not the spacing)
const PLANT_INNER_RADIUS_CM = 5;

/**
 * Get the category icon emoji for a plant (fallback)
 */
function getCategoryIconEmoji(plantData: PlantData | undefined): string {
  if (!plantData) return '🌱';
  const categoryInfo = PLANT_CATEGORIES.find((cat) => cat.key === plantData.category);
  return categoryInfo?.icon ?? '🌱';
}

// Fixed size for plant images on canvas (in pixels)
const PLANT_IMAGE_SIZE = 28;

/**
 * Plant icon component for canvas - shows image or emoji fallback
 */
function PlantIconInCanvas({ plantData }: { plantData: PlantData | undefined }): React.JSX.Element {
  if (!plantData) {
    return <Text style={styles.plantEmoji}>🌱</Text>;
  }

  const plantIcon = getPlantIcon(plantData.id);
  const hasIcon = hasPlantIcon(plantData.id);

  if (hasIcon && plantIcon) {
    return (
      <Image
        source={plantIcon}
        style={styles.plantImage}
        resizeMode="cover"
      />
    );
  }

  return <Text style={styles.plantEmoji}>{getCategoryIconEmoji(plantData)}</Text>;
}

/**
 * Check if two plants' spacing circles overlap (indicative warning only)
 */
function checkSpacingOverlap(
  plant1: PlacedPlantData,
  plant1Spacing: number,
  plant2: PlacedPlantData,
  plant2Spacing: number
): boolean {
  const dx = plant1.positionX - plant2.positionX;
  const dy = plant1.positionY - plant2.positionY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const minDistance = plant1Spacing + plant2Spacing;
  return distance < minDistance;
}

/**
 * Check if two plants' inner circles (actual plant bodies) overlap
 * This is a hard collision that should block placement
 */
function checkInnerCollision(
  plant1: PlacedPlantData,
  plant2: PlacedPlantData
): boolean {
  const dx = plant1.positionX - plant2.positionX;
  const dy = plant1.positionY - plant2.positionY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  // Inner collision when the plant bodies overlap
  const minDistance = PLANT_INNER_RADIUS_CM * 2;
  return distance < minDistance;
}

/**
 * Draggable plant component using PanResponder
 */
function DraggablePlant({
  plant,
  plantData,
  scale,
  containerWidth,
  containerHeight,
  onPositionChange,
  onPress,
  onLongPress,
  hasSpacingOverlap,
  hasInnerCollision,
  isSelected,
  onSelect,
}: DraggablePlantProps): React.JSX.Element {
  const spacingRadiusPx = (plantData?.spacingRadiusCm ?? 15) * scale;
  const plantSizePx = Math.max(24, spacingRadiusPx * 0.6);

  const [isDragging, setIsDragging] = useState(false);

  // Refs to track current values - prevents stale closure bugs in panResponder
  const plantRef = useRef(plant);
  const scaleRef = useRef(scale);
  const containerWidthRef = useRef(containerWidth);
  const containerHeightRef = useRef(containerHeight);
  const spacingRadiusPxRef = useRef(spacingRadiusPx);
  const plantSizePxRef = useRef(plantSizePx);
  const onPositionChangeRef = useRef(onPositionChange);
  const onLongPressRef = useRef(onLongPress);
  const onSelectRef = useRef(onSelect);

  // Update refs when props/values change
  React.useEffect(() => {
    plantRef.current = plant;
    scaleRef.current = scale;
    containerWidthRef.current = containerWidth;
    containerHeightRef.current = containerHeight;
    spacingRadiusPxRef.current = spacingRadiusPx;
    plantSizePxRef.current = plantSizePx;
    onPositionChangeRef.current = onPositionChange;
    onLongPressRef.current = onLongPress;
    onSelectRef.current = onSelect;
  }, [plant, scale, containerWidth, containerHeight, spacingRadiusPx, plantSizePx, onPositionChange, onLongPress, onSelect]);

  // Animated values for position
  const pan = useRef(
    new Animated.ValueXY({
      x: plant.positionX * scale - spacingRadiusPx,
      y: plant.positionY * scale - spacingRadiusPx,
    })
  ).current;

  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Track current position for bounds checking
  const currentPosition = useRef({
    x: plant.positionX * scale,
    y: plant.positionY * scale,
  });

  // Long press timer for drag mode
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragEnabled = useRef(false);
  const hasMoved = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isDragEnabled.current = false;
        hasMoved.current = false;

        // Start long press timer - after 400ms, enable drag mode
        longPressTimer.current = setTimeout(() => {
          isDragEnabled.current = true;
          onSelectRef.current();
          setIsDragging(true);
          Animated.spring(scaleAnim, {
            toValue: 1.1,
            useNativeDriver: true,
          }).start();
        }, 400);
      },
      onPanResponderMove: (_, gestureState) => {
        // Track if user has moved
        if (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5) {
          hasMoved.current = true;
          // Cancel long press if moved before it triggered
          if (longPressTimer.current && !isDragEnabled.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }
        }

        // Only move if drag mode is enabled
        if (!isDragEnabled.current) return;

        // Use refs to get current values (prevents stale closure)
        const currentPlant = plantRef.current;
        const currentScale = scaleRef.current;
        const currentContainerWidth = containerWidthRef.current;
        const currentContainerHeight = containerHeightRef.current;
        const currentSpacingRadiusPx = spacingRadiusPxRef.current;
        const currentPlantSizePx = plantSizePxRef.current;

        // Calculate bounded position - only constrain by plant body, not spacing circle
        const plantBodyRadius = currentPlantSizePx / 2;
        const newX = Math.max(
          plantBodyRadius,
          Math.min(currentContainerWidth - plantBodyRadius, currentPlant.positionX * currentScale + gestureState.dx)
        );
        const newY = Math.max(
          plantBodyRadius,
          Math.min(currentContainerHeight - plantBodyRadius, currentPlant.positionY * currentScale + gestureState.dy)
        );

        currentPosition.current = { x: newX, y: newY };
        pan.setValue({
          x: newX - currentSpacingRadiusPx,
          y: newY - currentSpacingRadiusPx,
        });
      },
      onPanResponderRelease: () => {
        // Clear long press timer
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }

        setIsDragging(false);
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
        }).start();

        // Check if it was a tap (no movement and drag wasn't enabled)
        const wasTap = !hasMoved.current && !isDragEnabled.current;
        if (wasTap) {
          // Tap shows context menu (what long press used to do)
          if (onLongPressRef.current) {
            onLongPressRef.current();
          }
          return;
        }

        // If drag wasn't enabled, don't update position
        if (!isDragEnabled.current) return;

        // Use refs to get current values (prevents stale closure)
        const currentPlant = plantRef.current;
        const currentScale = scaleRef.current;

        // Report position change
        const newXCm = currentPosition.current.x / currentScale;
        const newYCm = currentPosition.current.y / currentScale;
        onPositionChangeRef.current(currentPlant.id, newXCm, newYCm);
      },
      onPanResponderTerminate: () => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        setIsDragging(false);
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  // Update position when plant data changes externally
  React.useEffect(() => {
    currentPosition.current = {
      x: plant.positionX * scale,
      y: plant.positionY * scale,
    };
    pan.setValue({
      x: plant.positionX * scale - spacingRadiusPx,
      y: plant.positionY * scale - spacingRadiusPx,
    });
  }, [plant.positionX, plant.positionY, scale, spacingRadiusPx, pan]);

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.plantContainer,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale: scaleAnim },
          ],
          width: spacingRadiusPx * 2,
          height: spacingRadiusPx * 2,
          zIndex: isDragging ? 100 : isSelected ? 50 : 1,
        },
      ]}
    >
      {/* Spacing radius circle - shows warning (orange) for spacing overlap, error (red) for inner collision */}
      <View
        style={[
          styles.spacingCircle,
          {
            width: spacingRadiusPx * 2,
            height: spacingRadiusPx * 2,
            borderRadius: spacingRadiusPx,
            borderColor: hasInnerCollision
              ? '#ef4444' // Red for inner collision
              : hasSpacingOverlap
                ? '#f59e0b' // Orange/amber for spacing overlap warning
                : isSelected
                  ? '#22c55e'
                  : '#4ade80',
            backgroundColor: hasInnerCollision
              ? 'rgba(239, 68, 68, 0.15)' // Red tint for inner collision
              : hasSpacingOverlap
                ? 'rgba(245, 158, 11, 0.15)' // Orange tint for spacing warning
                : isSelected
                  ? 'rgba(34, 197, 94, 0.2)'
                  : 'rgba(74, 222, 128, 0.1)',
            borderWidth: isSelected ? 2 : 1,
          },
        ]}
      />

      {/* Plant icon - only shows red for inner collision (plant bodies overlapping) */}
      <View
        style={[
          styles.plantIcon,
          {
            width: plantSizePx,
            height: plantSizePx,
            borderRadius: plantSizePx / 2,
            backgroundColor: hasInnerCollision ? '#dc2626' : '#16a34a',
          },
        ]}
      >
        <PlantIconInCanvas plantData={plantData} />
      </View>

      {/* Plant name label when selected */}
      {isSelected && plantData && (
        <View style={styles.plantLabel}>
          <Text style={styles.plantLabelText} numberOfLines={1}>
            {plantData.nameNl}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

/**
 * PlantPlacementCanvas - main canvas for plant arrangement
 */
export function PlantPlacementCanvas({
  component,
  plants: filteredPlants,
  layerDimensions,
  onPlantPositionChange,
  onPlantPress,
  onPlantLongPress,
}: PlantPlacementCanvasProps): React.JSX.Element {
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [selectedRelationship, setSelectedRelationship] =
    useState<PlantRelationship | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const getPlantById = usePlantStore((state) => state.getPlantById);

  const componentInnerDimensions = useMemo(() => getInnerDimensions(component), [component]);
  // Use layer dimensions if provided (for towers), otherwise use component inner dimensions
  const innerDimensions = layerDimensions ?? componentInnerDimensions;
  const isCircular = isPot(component) || isCircularTower(component);
  // Use filtered plants if provided, otherwise use all plants from component
  const plants = filteredPlants ?? (component.plants || []);

  // Calculate scale to fit canvas in available space
  const scale = useMemo(() => {
    if (canvasSize.width === 0 || canvasSize.height === 0) return 1;
    // Leave some padding
    const availableWidth = canvasSize.width - 32;
    const availableHeight = canvasSize.height - 32;
    const scaleX = availableWidth / innerDimensions.width;
    const scaleY = availableHeight / innerDimensions.height;
    return Math.min(scaleX, scaleY, 3); // Max scale of 3x
  }, [canvasSize, innerDimensions]);

  const containerWidth = innerDimensions.width * scale;
  const containerHeight = innerDimensions.height * scale;

  // Calculate collisions between all plants (both spacing overlap and inner collision)
  const { spacingOverlaps, innerCollisions } = useMemo(() => {
    const spacingOverlaps = new Map<string, boolean>();
    const innerCollisions = new Map<string, boolean>();

    plants.forEach((plant1) => {
      const plant1Data = getPlantById(plant1.plantId);
      const plant1Spacing = plant1Data?.spacingRadiusCm ?? 15;

      plants.forEach((plant2) => {
        if (plant1.id === plant2.id) return;

        const plant2Data = getPlantById(plant2.plantId);
        const plant2Spacing = plant2Data?.spacingRadiusCm ?? 15;

        // Check spacing overlap (indicative warning)
        if (checkSpacingOverlap(plant1, plant1Spacing, plant2, plant2Spacing)) {
          spacingOverlaps.set(plant1.id, true);
          spacingOverlaps.set(plant2.id, true);
        }

        // Check inner collision (hard error - plant bodies overlapping)
        if (checkInnerCollision(plant1, plant2)) {
          innerCollisions.set(plant1.id, true);
          innerCollisions.set(plant2.id, true);
        }
      });
    });

    return { spacingOverlaps, innerCollisions };
  }, [plants, getPlantById]);

  // Calculate companion/combative relationships between plants
  const plantRelationships = useMemo(
    () => calculatePlantRelationships(plants, getPlantById),
    [plants, getPlantById]
  );

  // Handle relationship indicator tap
  const handleRelationshipPress = useCallback(
    (relationship: PlantRelationship) => {
      setSelectedRelationship(relationship);
      setTooltipVisible(true);
    },
    []
  );

  // Handle tooltip close
  const handleTooltipClose = useCallback(() => {
    setTooltipVisible(false);
    setSelectedRelationship(null);
  }, []);

  const handleLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
      const { width, height } = event.nativeEvent.layout;
      setCanvasSize({ width, height });
    },
    []
  );

  const handleBackgroundPress = useCallback(() => {
    setSelectedPlantId(null);
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.container} onLayout={handleLayout}>
        {canvasSize.width > 0 && (
          <Pressable onPress={handleBackgroundPress} style={styles.canvasWrapper}>
            {/* Component shape */}
            <View
              style={[
                styles.componentShape,
                {
                  width: containerWidth,
                  height: containerHeight,
                  borderRadius: isCircular ? containerWidth / 2 : 8,
                },
              ]}
            >
              {/* Relationship indicators layer (below plants) */}
              {plantRelationships.map((relationship) => (
                <RelationshipIndicator
                  key={`${relationship.plant1Id}-${relationship.plant2Id}`}
                  relationship={relationship}
                  scale={scale}
                  onPress={handleRelationshipPress}
                />
              ))}

              {/* Plants layer */}
              {plants.map((plant) => {
                const plantData = getPlantById(plant.plantId);
                return (
                  <DraggablePlant
                    key={plant.id}
                    plant={plant}
                    plantData={plantData}
                    scale={scale}
                    containerWidth={containerWidth}
                    containerHeight={containerHeight}
                    onPositionChange={onPlantPositionChange}
                    onPress={onPlantPress ? () => onPlantPress(plant) : undefined}
                    onLongPress={onPlantLongPress ? () => onPlantLongPress(plant) : undefined}
                    hasSpacingOverlap={spacingOverlaps.get(plant.id) ?? false}
                    hasInnerCollision={innerCollisions.get(plant.id) ?? false}
                    isSelected={selectedPlantId === plant.id}
                    onSelect={() => setSelectedPlantId(plant.id)}
                  />
                );
              })}

              {/* Empty state */}
              {plants.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>🌱</Text>
                  <Text style={styles.emptyText}>Voeg planten toe</Text>
                </View>
              )}
            </View>

            {/* Scale indicator */}
            <View style={styles.scaleIndicator}>
              <View style={[styles.scaleLine, { width: 50 * scale }]} />
              <Text style={styles.scaleText}>50 cm</Text>
            </View>
          </Pressable>
        )}

        {/* Relationship tooltip */}
        <RelationshipTooltip
          relationship={selectedRelationship}
          visible={tooltipVisible}
          onClose={handleTooltipClose}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    overflow: 'hidden',
  },
  canvasWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  componentShape: {
    backgroundColor: '#3d2914',
    borderWidth: 3,
    borderColor: '#8B4513',
    position: 'relative',
    overflow: 'hidden',
  },
  plantContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacingCircle: {
    position: 'absolute',
    borderStyle: 'dashed',
  },
  plantIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  plantEmoji: {
    fontSize: 14,
  },
  plantImage: {
    width: PLANT_IMAGE_SIZE,
    height: PLANT_IMAGE_SIZE,
    borderRadius: PLANT_IMAGE_SIZE / 2,
  },
  plantLabel: {
    position: 'absolute',
    bottom: -20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  plantLabelText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
  },
  scaleIndicator: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    alignItems: 'center',
  },
  scaleLine: {
    height: 2,
    backgroundColor: '#9ca3af',
    marginBottom: 4,
  },
  scaleText: {
    color: '#9ca3af',
    fontSize: 10,
  },
});
