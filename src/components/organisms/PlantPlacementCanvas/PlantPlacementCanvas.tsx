/**
 * PlantPlacementCanvas
 * Interactive canvas for placing and arranging plants within a component.
 * Shows spacing radius circles, collision warnings, and companion plant indicators.
 */

import React, {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {Animated, Image, PanResponder, Pressable, ScrollView, StyleSheet, Text, View,} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import type {ComponentData, PlacedPlantData, PlantData} from '@/types';
import {PLANT_CATEGORIES} from '@/types/plant.types';
import {isCircularTower, isGardenBox, isPot, isRectangularTower,} from '@/stores/componentStore';
import {usePlantStore} from '@/stores/plantStore';
import {calculatePlantRelationships, type PlantRelationship,} from '@/utils/companionRelationships';
import {RelationshipIndicator} from '@/components/molecules/RelationshipIndicator';
import {RelationshipTooltip} from '@/components/molecules/RelationshipTooltip';
import {getPlantIcon, hasPlantIcon} from '@/assets';

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
    showSpacingRadius: boolean;
    showPlantName: boolean;
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
        return {width: size, height: size};
    }
    return {width: 100, height: 100};
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
function PlantIconInCanvas({plantData}: { plantData: PlantData | undefined }): React.JSX.Element {
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
                            showSpacingRadius,
                            showPlantName
                        }: DraggablePlantProps): React.JSX.Element {

    // Plant body size (NOT derived from spacing radius)
    const plantBodyRadiusPx = PLANT_INNER_RADIUS_CM * scale;
    const plantSizePx = Math.max(24, plantBodyRadiusPx * 2);

    // ✅ Wrapper size now based only on plant size (spacing circle removed)
    const containerSize = plantSizePx;
    const positionOffset = containerSize / 2;

    const [isDragging, setIsDragging] = useState(false);

    // ✅ Warning tooltip toggle (click icon -> show message)
    const [showSpacingWarningText, setShowSpacingWarningText] = useState(false);

    // Required spacing distance (cm) used in the warning text
    const requiredSpacingCm = plantData?.spacingRadiusCm ?? 15;

    // Refs to track current values - prevents stale closure bugs in panResponder
    const plantRef = useRef(plant);
    const scaleRef = useRef(scale);
    const containerWidthRef = useRef(containerWidth);
    const containerHeightRef = useRef(containerHeight);
    const plantSizePxRef = useRef(plantSizePx);
    const positionOffsetRef = useRef(positionOffset);
    const onPositionChangeRef = useRef(onPositionChange);
    const onLongPressRef = useRef(onLongPress);
    const onSelectRef = useRef(onSelect);

    // Update refs when props/values change
    React.useEffect(() => {
        plantRef.current = plant;
        scaleRef.current = scale;
        containerWidthRef.current = containerWidth;
        containerHeightRef.current = containerHeight;
        plantSizePxRef.current = plantSizePx;
        positionOffsetRef.current = positionOffset;
        onPositionChangeRef.current = onPositionChange;
        onLongPressRef.current = onLongPress;
        onSelectRef.current = onSelect;
    }, [
        plant,
        scale,
        containerWidth,
        containerHeight,
        plantSizePx,
        positionOffset,
        onPositionChange,
        onLongPress,
        onSelect
    ]);

    // Animated values for position
    const pan = useRef(
        new Animated.ValueXY({
            x: plant.positionX * scale - positionOffset,
            y: plant.positionY * scale - positionOffset,
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

                    // Optional: hide tooltip while dragging
                    setShowSpacingWarningText(false);

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
                const currentPlantSizePx = plantSizePxRef.current;
                const currentPositionOffset = positionOffsetRef.current;

                // Calculate bounded position - constrain by plant body
                const plantBodyRadius = currentPlantSizePx / 2;
                const newX = Math.max(
                    plantBodyRadius,
                    Math.min(
                        currentContainerWidth - plantBodyRadius,
                        currentPlant.positionX * currentScale + gestureState.dx
                    )
                );
                const newY = Math.max(
                    plantBodyRadius,
                    Math.min(
                        currentContainerHeight - plantBodyRadius,
                        currentPlant.positionY * currentScale + gestureState.dy
                    )
                );

                currentPosition.current = { x: newX, y: newY };
                pan.setValue({
                    x: newX - currentPositionOffset,
                    y: newY - currentPositionOffset,
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

    // Update position when plant data changes
    // Uses useLayoutEffect to update synchronously before visual render
    useLayoutEffect(() => {
        const storedX = plant.positionX * scale;
        const storedY = plant.positionY * scale;

        if (!isDragging) {
            currentPosition.current = { x: storedX, y: storedY };
        }

        pan.setValue({
            x: currentPosition.current.x - positionOffset,
            y: currentPosition.current.y - positionOffset,
        });
    }, [plant.positionX, plant.positionY, scale, positionOffset, isDragging, pan]);

    const showWarningIcon =
        showSpacingRadius && hasSpacingOverlap && !hasInnerCollision;

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
                    width: containerSize,
                    height: containerSize,
                    zIndex: isDragging ? 100 : isSelected ? 50 : 1,
                },
            ]}
        >
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

            {/* ✅ Warning icon when spacing distance is not ok (toggleable like before) */}
            {showWarningIcon && (
                <Pressable
                    onPress={() => setShowSpacingWarningText(v => !v)}
                    // Capture responder so parent PanResponder doesn't hijack this tap/press
                    onStartShouldSetResponder={() => true}
                    style={{
                        position: 'absolute',
                        right: -10,
                        top: -10,
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: '#f59e0b', // orange
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: '#b45309',
                        zIndex: 200,
                    }}
                >
                    <Text style={{ color: 'white', fontSize: 14, fontWeight: '800' }}>
                        !
                    </Text>

                    {/* Tooltip bubble */}
                    {showSpacingWarningText && (
                        <View
                            pointerEvents="none"
                            style={{
                                position: 'absolute',
                                top: 26,
                                right: 0,
                                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                borderRadius: 8,
                                maxWidth: 180,
                                zIndex: 1000
                            }}
                        >
                            <Text style={{ color: 'white', fontSize: 12 }}>
                                {`Afstand moet ${requiredSpacingCm}cm zijn.`}
                            </Text>
                        </View>
                    )}
                </Pressable>
            )}

            {/* Plant name label when selected */}
            {(isSelected || showPlantName) && plantData && (
                <View
                    style={[
                        styles.plantLabelWrapper,
                        {
                            top: containerSize / 2 + plantSizePx / 2 + 4,
                        },
                    ]}
                    pointerEvents="none"
                >
                    <View style={styles.plantLabel}>
                        <Text style={styles.plantLabelText} numberOfLines={1}>
                            {plantData.nameNl}
                        </Text>
                    </View>
                </View>
            )}
        </Animated.View>
    );
}

/**
 * PlantPlacementCanvas - main canvas for plant arrangement
 */
// Zoom constants
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;
const ZOOM_STEP = 0.25;

export function PlantPlacementCanvas({
                                         component,
                                         plants: filteredPlants,
                                         layerDimensions,
                                         onPlantPositionChange,
                                         onPlantPress,
                                         onPlantLongPress,
                                     }: PlantPlacementCanvasProps): React.JSX.Element {
    const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
    const [canvasSize, setCanvasSize] = useState({width: 0, height: 0});
    const [selectedRelationship, setSelectedRelationship] =
        useState<PlantRelationship | null>(null);
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [showSpacingRadius, setShowSpacingRadius] = useState(false);
    const [showPlantNames, setShowPlantNames] = useState(false);
    const [showRelationships, setShowRelationships] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);
    const getPlantById = usePlantStore((state) => state.getPlantById);

    const componentInnerDimensions = useMemo(() => getInnerDimensions(component), [component]);
    // Use layer dimensions if provided (for towers), otherwise use component inner dimensions
    const innerDimensions = layerDimensions ?? componentInnerDimensions;
    const isCircular = isPot(component) || isCircularTower(component);
    // Use filtered plants if provided, otherwise use all plants from component
    const plants = filteredPlants ?? (component.plants || []);

    // Calculate base scale to fit canvas in available space
    const baseScale = useMemo(() => {
        if (canvasSize.width === 0 || canvasSize.height === 0) return 1;
        // Leave some padding
        const availableWidth = canvasSize.width - 32;
        const availableHeight = canvasSize.height - 32;
        const scaleX = availableWidth / innerDimensions.width;
        const scaleY = availableHeight / innerDimensions.height;
        return Math.min(scaleX, scaleY, 3); // Max scale of 3x
    }, [canvasSize, innerDimensions]);

    // Apply zoom level to base scale
    const scale = baseScale * zoomLevel;

    // Zoom handlers
    const handleZoomIn = useCallback(() => {
        setZoomLevel((prev) => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
    }, []);

    const handleZoomOut = useCallback(() => {
        setZoomLevel((prev) => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
    }, []);

    // Toggle spacing radius visibility
    const handleToggleSpacingRadius = useCallback(() => {
        setShowSpacingRadius((prev) => !prev);
    }, []);

    // Toggle plant names visibility
    const handleTogglePlantNames = useCallback(() => {
        setShowPlantNames((prev) => !prev);
    }, []);

    // Toggle relationships visibility
    const handleToggleRelationships = useCallback(() => {
        setShowRelationships((prev) => !prev);
    }, []);

    const containerWidth = innerDimensions.width * scale;
    const containerHeight = innerDimensions.height * scale;

    // Check if content is larger than viewport (scrolling needed)
    const needsScrolling = containerWidth > canvasSize.width - 32 || containerHeight > canvasSize.height - 32;

    // Center scroll position when zoom changes
    useEffect(() => {
        if (scrollViewRef.current && needsScrolling) {
            // Calculate center offset
            const scrollX = Math.max(0, (containerWidth - canvasSize.width + 32) / 2);
            const scrollY = Math.max(0, (containerHeight - canvasSize.height + 32) / 2);
            scrollViewRef.current.scrollTo({x: scrollX, y: scrollY, animated: false});
        }
    }, [zoomLevel, containerWidth, containerHeight, canvasSize.width, canvasSize.height, needsScrolling]);

    // Calculate collisions between all plants (both spacing overlap and inner collision)
    const {spacingOverlaps, innerCollisions} = useMemo(() => {
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

        return {spacingOverlaps, innerCollisions};
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
            const {width, height} = event.nativeEvent.layout;
            setCanvasSize({width, height});
        },
        []
    );

    const handleBackgroundPress = useCallback(() => {
        setSelectedPlantId(null);
    }, []);

    // Calculate content padding for centering when not scrolling
    const contentPaddingX = needsScrolling ? 16 : Math.max(16, (canvasSize.width - containerWidth) / 2);
    const contentPaddingY = needsScrolling ? 16 : Math.max(16, (canvasSize.height - containerHeight) / 2);

    return (
        <GestureHandlerRootView style={styles.root}>
            <View style={styles.container} onLayout={handleLayout}>
                {canvasSize.width > 0 && (
                    <>
                        <ScrollView
                            ref={scrollViewRef}
                            style={styles.scrollView}
                            contentContainerStyle={[
                                styles.scrollContent,
                                {
                                    paddingHorizontal: contentPaddingX,
                                    paddingVertical: contentPaddingY,
                                },
                            ]}
                            horizontal={false}
                            showsVerticalScrollIndicator={needsScrolling}
                            showsHorizontalScrollIndicator={needsScrolling}
                            scrollEnabled={needsScrolling}
                            nestedScrollEnabled={true}
                        >
                            <ScrollView
                                horizontal={true}
                                showsHorizontalScrollIndicator={false}
                                scrollEnabled={needsScrolling}
                                nestedScrollEnabled={true}
                                contentContainerStyle={styles.horizontalScrollContent}
                            >
                                <Pressable onPress={handleBackgroundPress}>
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
                                        {showRelationships && plantRelationships.map((relationship) => (
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
                                                    showSpacingRadius={showSpacingRadius}
                                                    showPlantName={showPlantNames}
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
                                </Pressable>
                            </ScrollView>
                        </ScrollView>

                        {/* Spacing radius toggle */}
                        <View style={styles.toggleContainer}>
                            <Pressable
                                style={styles.toggleButton}
                                onPress={handleToggleSpacingRadius}
                            >
                                <Text style={styles.spacingToggleIcon}>
                                    {showSpacingRadius ? '◉' : '○'}
                                </Text>
                                <Text style={styles.spacingToggleText}>Afstand</Text>
                            </Pressable>
                            {/*Plant name toggle*/}
                            <Pressable
                                style={styles.toggleButton}
                                onPress={handleTogglePlantNames}
                            >
                                <Text style={styles.spacingToggleIcon}>
                                    {showPlantNames ? '◉' : '○'}
                                </Text>
                                <Text style={styles.spacingToggleText}>Namen</Text>
                            </Pressable>
                            <Pressable
                                style={styles.toggleButton}
                                onPress={handleToggleRelationships}
                            >
                                <Text style={styles.spacingToggleIcon}>
                                    {showRelationships ? '◉' : '○'}
                                </Text>
                                <Text style={styles.spacingToggleText}>Companionships</Text>
                            </Pressable>
                        </View>

                        {/* Scale indicator - positioned absolutely over scroll content */}
                        <View style={styles.scaleIndicator}>
                            <View style={[styles.scaleLine, {width: 50 * scale}]}/>
                            <Text style={styles.scaleText}>50 cm</Text>
                        </View>

                        {/* Zoom controls - positioned absolutely over scroll content */}
                        <View style={styles.zoomControls}>
                            <Pressable
                                style={[
                                    styles.zoomButton,
                                    zoomLevel >= MAX_ZOOM && styles.zoomButtonDisabled,
                                ]}
                                onPress={handleZoomIn}
                                disabled={zoomLevel >= MAX_ZOOM}
                            >
                                <Text style={[
                                    styles.zoomButtonText,
                                    zoomLevel >= MAX_ZOOM && styles.zoomButtonTextDisabled,
                                ]}>+</Text>
                            </Pressable>
                            <Text style={styles.zoomLevelText}>{Math.round(zoomLevel * 100)}%</Text>
                            <Pressable
                                style={[
                                    styles.zoomButton,
                                    zoomLevel <= MIN_ZOOM && styles.zoomButtonDisabled,
                                ]}
                                onPress={handleZoomOut}
                                disabled={zoomLevel <= MIN_ZOOM}
                            >
                                <Text style={[
                                    styles.zoomButtonText,
                                    zoomLevel <= MIN_ZOOM && styles.zoomButtonTextDisabled,
                                ]}>−</Text>
                            </Pressable>
                        </View>
                    </>
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
        backgroundColor: '#1f2937',
        borderRadius: 12,
        overflow: 'hidden',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    horizontalScrollContent: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
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
        shadowOffset: {width: 0, height: 2},
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
        backgroundColor: 'rgba(0,0,0,0.8)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    plantLabelWrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center', // centers the label under the plant
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
    toggleContainer: {
        position: 'absolute',
        top: 16,
        left: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 10,
    },

    toggleButton: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 10,
    },
    spacingToggleIcon: {
        color: '#4ade80',
        fontSize: 16,
        marginRight: 6,
    },
    spacingToggleText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '500',
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
    zoomControls: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 8,
        padding: 4,
    },
    zoomButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#374151',
        borderRadius: 6,
    },
    zoomButtonDisabled: {
        backgroundColor: '#1f2937',
    },
    zoomButtonText: {
        color: '#ffffff',
        fontSize: 20,
        fontWeight: '600',
    },
    zoomButtonTextDisabled: {
        color: '#6b7280',
    },
    zoomLevelText: {
        color: '#9ca3af',
        fontSize: 10,
        marginVertical: 4,
    },
});
