/**
 * PlantPlacementCanvas
 * Interactive canvas for placing and arranging plants within a component.
 * Patch plants (plantingStyle === 'patch') render as resizable, rotatable rectangles.
 *
 * Patch resize/rotate mode:
 *   Enter via patchEditPlantId prop (set by parent when user taps a patch row in edit mode).
 *   While active: all drag-and-drop is disabled; resize/rotate handles appear on the active patch.
 *   Parent provides onPatchEditConfirm / onPatchEditCancel to exit the mode.
 */

import React, {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {Animated, GestureResponderEvent, Image, PanResponder, Pressable, ScrollView, StyleSheet, Text, View,} from 'react-native';
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
    plants?: readonly PlacedPlantData[];
    layerDimensions?: { width: number; height: number };
    onPlantPositionChange: (plantId: string, x: number, y: number) => void;
    onPlantPress?: (plant: PlacedPlantData) => void;
    onPlantLongPress?: (plant: PlacedPlantData) => void;
    isEditMode?: boolean;
    onToggleEditMode?: () => void;
    onBackgroundPress?: () => void;
    onLockAll?: () => void;
    onUnlockAll?: () => void;
    onActionPress?: () => void;
    onPatchDimensionsChange?: (plantId: string, widthInCm: number, heightInCm: number, rotationDeg: number) => void;
    /** ID of the patch plant currently being resized/rotated. Provided by the parent screen. */
    patchEditPlantId?: string | null;
    /** Called when the user confirms patch resize/rotate changes. */
    onPatchEditConfirm?: () => void;
    /** Called when the user cancels patch resize/rotate changes. */
    onPatchEditCancel?: () => void;
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
    isPatch: boolean;
    isThinning: boolean;
    draggingEnabled: boolean;
    isLocked: boolean;
    hasWallProximityWarning: boolean;
    onWarningBadgePress: () => void;
    /** True when this specific patch plant is in resize/rotate mode. Drag is disabled externally. */
    isInPatchEditMode: boolean;
    onPatchDimensionsChange?: (plantId: string, widthInCm: number, heightInCm: number, rotationDeg: number) => void;
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
        return {width: size, height: size};
    }
    return {width: 100, height: 100};
}

const PLANT_INNER_RADIUS_CM = 5;
const PLANT_IMAGE_SIZE = 28;

function getCategoryIconEmoji(plantData: PlantData | undefined): string {
    if (!plantData) return '🌱';
    const categoryInfo = PLANT_CATEGORIES.find((cat) => cat.key === plantData.category);
    return categoryInfo?.icon ?? '🌱';
}

function PlantIconInCanvas({plantData}: { plantData: PlantData | undefined }): React.JSX.Element {
    if (!plantData) return <Text style={styles.plantEmoji}>🌱</Text>;
    const plantIcon = getPlantIcon(plantData.id);
    const hasIcon = hasPlantIcon(plantData.id);
    if (hasIcon && plantIcon) {
        return <Image source={plantIcon} style={styles.plantImage} resizeMode="cover" />;
    }
    return <Text style={styles.plantEmoji}>{getCategoryIconEmoji(plantData)}</Text>;
}

/**
 * Returns center (cx, cy), half-dimensions (hw, hh) and rotation in radians for a rect plant.
 */
function getRectDims(
    plant: PlacedPlantData,
    plantData: PlantData | undefined,
): [number, number, number, number, number] {
    const spacingCm = plantData?.sowingSpacingCm ?? plantData?.spacingRadiusCm ?? 15;
    const minCm = spacingCm * 2;
    const wCm = Math.max(minCm, plant.patchWidthInCm ?? minCm);
    const hCm = Math.max(minCm, plant.patchHeightInCm ?? minCm);
    const rotRad = ((plant.patchRotationDeg ?? 0) * Math.PI) / 180;
    return [plant.positionX, plant.positionY, wCm / 2, hCm / 2, rotRad];
}

/**
 * Distance from point (px, py) to nearest point on a rotated rectangle boundary.
 * Returns 0 if the point is inside the rectangle.
 */
function distPointToRotatedRect(
    ptX: number, ptY: number,
    cx: number, cy: number,
    hw: number, hh: number,
    rotRad: number,
): number {
    const dx = ptX - cx;
    const dy = ptY - cy;
    const localX = dx * Math.cos(rotRad) + dy * Math.sin(rotRad);
    const localY = -dx * Math.sin(rotRad) + dy * Math.cos(rotRad);
    const clampedX = Math.max(-hw, Math.min(hw, localX));
    const clampedY = Math.max(-hh, Math.min(hh, localY));
    if (localX === clampedX && localY === clampedY) return 0;
    const ddx = localX - clampedX;
    const ddy = localY - clampedY;
    return Math.sqrt(ddx * ddx + ddy * ddy);
}

/**
 * Approximate minimum distance between two rotated rectangles.
 * Probes 8 representative points (corners + edge midpoints) of each rectangle.
 * Returns 0 if the rectangles overlap.
 */
function distRectToRect(
    cx1: number, cy1: number, hw1: number, hh1: number, rot1: number,
    cx2: number, cy2: number, hw2: number, hh2: number, rot2: number,
): number {
    const cos1 = Math.cos(rot1); const sin1 = Math.sin(rot1);
    const cos2 = Math.cos(rot2); const sin2 = Math.sin(rot2);
    const probes1: Array<[number, number]> = [
        [hw1, 0], [-hw1, 0], [0, hh1], [0, -hh1],
        [hw1, hh1], [hw1, -hh1], [-hw1, hh1], [-hw1, -hh1],
    ];
    const probes2: Array<[number, number]> = [
        [hw2, 0], [-hw2, 0], [0, hh2], [0, -hh2],
        [hw2, hh2], [hw2, -hh2], [-hw2, hh2], [-hw2, -hh2],
    ];
    let minDist = Infinity;
    for (const [lx, ly] of probes1) {
        const wx = cx1 + lx * cos1 - ly * sin1;
        const wy = cy1 + lx * sin1 + ly * cos1;
        const d = distPointToRotatedRect(wx, wy, cx2, cy2, hw2, hh2, rot2);
        if (d < minDist) minDist = d;
    }
    for (const [lx, ly] of probes2) {
        const wx = cx2 + lx * cos2 - ly * sin2;
        const wy = cy2 + lx * sin2 + ly * cos2;
        const d = distPointToRotatedRect(wx, wy, cx1, cy1, hw1, hh1, rot1);
        if (d < minDist) minDist = d;
    }
    return minDist === Infinity ? 0 : minDist;
}

function checkInnerCollision(
    plant1: PlacedPlantData,
    plant1IsRect: boolean,
    plant2: PlacedPlantData,
    plant2IsRect: boolean,
): boolean {
    if (plant1IsRect || plant2IsRect) return false;
    const dx = plant1.positionX - plant2.positionX;
    const dy = plant1.positionY - plant2.positionY;
    return Math.sqrt(dx * dx + dy * dy) < PLANT_INNER_RADIUS_CM * 2;
}

/**
 * Draggable plant.
 * Individual plants: long-press to drag.
 * Patch plants: resizable rotatable rectangle.
 *   Handles appear ONLY when isInPatchEditMode = true.
 *   While in patch edit mode, draggingEnabled is false (set by parent), so the
 *   PanResponder does not claim touches and child handle views work freely.
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
    showPlantName,
    isPatch,
    isThinning,
    draggingEnabled,
    isLocked,
    hasWallProximityWarning,
    onWarningBadgePress,
    isInPatchEditMode,
    onPatchDimensionsChange,
}: DraggablePlantProps): React.JSX.Element {

    const plantBodyRadiusPx = PLANT_INNER_RADIUS_CM * scale;
    const plantSizePx = Math.max(24, plantBodyRadiusPx * 2);

    const minPatchCm = (plantData?.sowingSpacingCm ?? plantData?.spacingRadiusCm ?? 15) * 2;
    const minPatchPx = minPatchCm * scale;

    const [localPatchWidthPx, setLocalPatchWidthPx] = useState(() =>
        isPatch ? Math.max(minPatchPx, (plant.patchWidthInCm ?? minPatchCm) * scale) : plantSizePx
    );
    const [localPatchHeightPx, setLocalPatchHeightPx] = useState(() =>
        isPatch ? Math.max(minPatchPx, (plant.patchHeightInCm ?? minPatchCm) * scale) : plantSizePx
    );
    const [localPatchRotDeg, setLocalPatchRotDeg] = useState(
        isPatch ? (plant.patchRotationDeg ?? 0) : 0
    );

    // Sync with persisted values when they change (e.g. AI optimization applied)
    useEffect(() => {
        if (!isPatch) return;
        setLocalPatchWidthPx(Math.max(minPatchPx, (plant.patchWidthInCm ?? minPatchCm) * scale));
        setLocalPatchHeightPx(Math.max(minPatchPx, (plant.patchHeightInCm ?? minPatchCm) * scale));
        setLocalPatchRotDeg(plant.patchRotationDeg ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [plant.patchWidthInCm, plant.patchHeightInCm, plant.patchRotationDeg]);

    // Rescale pixel dimensions when zoom changes
    useEffect(() => {
        if (!isPatch) return;
        setLocalPatchWidthPx(Math.max(minPatchPx, (plant.patchWidthInCm ?? minPatchCm) * scale));
        setLocalPatchHeightPx(Math.max(minPatchPx, (plant.patchHeightInCm ?? minPatchCm) * scale));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scale]);

    // Refs for non-stale access inside responder callbacks
    const localPatchWidthPxRef = useRef(localPatchWidthPx);
    const localPatchHeightPxRef = useRef(localPatchHeightPx);
    const localPatchRotDegRef = useRef(localPatchRotDeg);
    const minPatchPxRef = useRef(minPatchPx);
    localPatchWidthPxRef.current = localPatchWidthPx;
    localPatchHeightPxRef.current = localPatchHeightPx;
    localPatchRotDegRef.current = localPatchRotDeg;
    minPatchPxRef.current = minPatchPx;

    // Container sizing: patch uses bounding box of rotated rectangle + handle clearance
    const patchBounding = isPatch
        ? Math.ceil(Math.sqrt(
              localPatchWidthPx * localPatchWidthPx +
              localPatchHeightPx * localPatchHeightPx
          )) + 32
        : plantSizePx;
    const containerSize = patchBounding;
    const positionOffset = containerSize / 2;

    const [isDragging, setIsDragging] = useState(false);

    const plantRef = useRef(plant);
    const scaleRef = useRef(scale);
    const containerWidthRef = useRef(containerWidth);
    const containerHeightRef = useRef(containerHeight);
    const plantSizePxRef = useRef(plantSizePx);
    const positionOffsetRef = useRef(positionOffset);
    const onPositionChangeRef = useRef(onPositionChange);
    const onLongPressRef = useRef(onLongPress);
    const onSelectRef = useRef(onSelect);
    const draggingEnabledRef = useRef(draggingEnabled);
    const isLockedRef = useRef(isLocked);
    const isPatchRef = useRef(isPatch);

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
        draggingEnabledRef.current = draggingEnabled;
        isLockedRef.current = isLocked;
        isPatchRef.current = isPatch;
    }, [plant, scale, containerWidth, containerHeight, plantSizePx, positionOffset,
        onPositionChange, onLongPress, onSelect, draggingEnabled, isLocked, isPatch]);

    const pan = useRef(
        new Animated.ValueXY({
            x: plant.positionX * scale - positionOffset,
            y: plant.positionY * scale - positionOffset,
        })
    ).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const currentPosition = useRef({
        x: plant.positionX * scale,
        y: plant.positionY * scale,
    });
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isDragEnabled = useRef(false);
    const hasMoved = useRef(false);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => draggingEnabledRef.current,
            onMoveShouldSetPanResponder: () => draggingEnabledRef.current,
            onPanResponderGrant: () => {
                isDragEnabled.current = false;
                hasMoved.current = false;
                if (isLockedRef.current) return;
                longPressTimer.current = setTimeout(() => {
                    isDragEnabled.current = true;
                    onSelectRef.current();
                    setIsDragging(true);
                    Animated.spring(scaleAnim, {toValue: 1.1, useNativeDriver: true}).start();
                }, 400);
            },
            onPanResponderMove: (_, gestureState) => {
                if (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5) {
                    hasMoved.current = true;
                    if (longPressTimer.current && !isDragEnabled.current) {
                        clearTimeout(longPressTimer.current);
                        longPressTimer.current = null;
                    }
                }
                if (!isDragEnabled.current) return;

                const currentPlant = plantRef.current;
                const currentScale = scaleRef.current;
                const currentContainerWidth = containerWidthRef.current;
                const currentContainerHeight = containerHeightRef.current;
                const currentPositionOffset = positionOffsetRef.current;

                // Axis-aligned bounding box clamp: works correctly for rotated patches
                let clampHalfX: number;
                let clampHalfY: number;
                if (isPatchRef.current) {
                    const rotRad = localPatchRotDegRef.current * Math.PI / 180;
                    const hw = localPatchWidthPxRef.current / 2;
                    const hh = localPatchHeightPxRef.current / 2;
                    clampHalfX = hw * Math.abs(Math.cos(rotRad)) + hh * Math.abs(Math.sin(rotRad));
                    clampHalfY = hw * Math.abs(Math.sin(rotRad)) + hh * Math.abs(Math.cos(rotRad));
                } else {
                    clampHalfX = plantSizePxRef.current / 2;
                    clampHalfY = plantSizePxRef.current / 2;
                }
                // Guard: prevent impossible range when patch is larger than container
                const safeHalfX = Math.min(clampHalfX, currentContainerWidth / 2);
                const safeHalfY = Math.min(clampHalfY, currentContainerHeight / 2);

                const newX = Math.max(
                    safeHalfX,
                    Math.min(
                        currentContainerWidth - safeHalfX,
                        currentPlant.positionX * currentScale + gestureState.dx
                    )
                );
                const newY = Math.max(
                    safeHalfY,
                    Math.min(
                        currentContainerHeight - safeHalfY,
                        currentPlant.positionY * currentScale + gestureState.dy
                    )
                );
                currentPosition.current = {x: newX, y: newY};
                pan.setValue({x: newX - currentPositionOffset, y: newY - currentPositionOffset});
            },
            onPanResponderRelease: () => {
                if (longPressTimer.current) {
                    clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                }
                setIsDragging(false);
                Animated.spring(scaleAnim, {toValue: 1, useNativeDriver: true}).start();
                const wasTap = !hasMoved.current && !isDragEnabled.current;
                if (wasTap) {
                    if (onLongPressRef.current) onLongPressRef.current();
                    return;
                }
                if (!isDragEnabled.current) return;
                const newXCm = currentPosition.current.x / scaleRef.current;
                const newYCm = currentPosition.current.y / scaleRef.current;
                onPositionChangeRef.current(plantRef.current.id, newXCm, newYCm);
            },
            onPanResponderTerminate: () => {
                if (longPressTimer.current) {
                    clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                }
                setIsDragging(false);
                Animated.spring(scaleAnim, {toValue: 1, useNativeDriver: true}).start();
            },
        })
    ).current;

    useLayoutEffect(() => {
        const storedX = plant.positionX * scale;
        const storedY = plant.positionY * scale;
        if (!isDragging) {
            currentPosition.current = {x: storedX, y: storedY};
        }
        pan.setValue({
            x: currentPosition.current.x - positionOffset,
            y: currentPosition.current.y - positionOffset,
        });
    }, [plant.positionX, plant.positionY, scale, positionOffset, isDragging, pan]);

    // ─── Patch resize / rotate responders ────────────────────────────────────
    // These only activate when isInPatchEditMode = true.
    // At that point draggingEnabled = false, so the parent PanResponder never
    // claims the touch — child handle views win responder negotiation freely.

    const resizeStartRef = useRef<{
        pageX: number; pageY: number;
        widthPx: number; heightPx: number; rotDeg: number;
    } | null>(null);
    const rotateStartRef = useRef<{pageX: number; rotDeg: number} | null>(null);
    const onPatchDimensionsChangeRef = useRef(onPatchDimensionsChange);
    onPatchDimensionsChangeRef.current = onPatchDimensionsChange;

    const commitPatch = useCallback(() => {
        const wCm = localPatchWidthPxRef.current / scaleRef.current;
        const hCm = localPatchHeightPxRef.current / scaleRef.current;
        const rotDeg = ((Math.round(localPatchRotDegRef.current) % 360) + 360) % 360;
        onPatchDimensionsChangeRef.current?.(plantRef.current.id, wCm, hCm, rotDeg);
    }, []);

    // Dot grid showing final thinned-plant positions (only for thinning style)
    const thinnedDots = React.useMemo(() => {
        if (!isThinning || !plantData) return [];
        const diamPx = plantData.spacingRadiusCm * 2 * scale;
        if (diamPx < 8) return []; // too dense to render meaningfully
        const cols = Math.max(1, Math.floor(localPatchWidthPx / diamPx));
        const rows = Math.max(1, Math.floor(localPatchHeightPx / diamPx));
        if (cols * rows > 64) return []; // cap rendering
        const startX = (localPatchWidthPx - (cols - 1) * diamPx) / 2;
        const startY = (localPatchHeightPx - (rows - 1) * diamPx) / 2;
        const dots: Array<{x: number; y: number}> = [];
        for (let r = 0; r < rows; r++) {
            for (let c2 = 0; c2 < cols; c2++) {
                dots.push({x: startX + c2 * diamPx, y: startY + r * diamPx});
            }
        }
        return dots;
    }, [isThinning, plantData, localPatchWidthPx, localPatchHeightPx, scale]);

    // Handles visible and interactive only when in patch edit mode and not locked
    const canUseHandles = isPatch && isInPatchEditMode && !isLocked;

    const rightHandleResponders = {
        onStartShouldSetResponder: () => canUseHandles,
        onMoveShouldSetResponder: () => true,
        onResponderGrant: (e: GestureResponderEvent) => {
            resizeStartRef.current = {
                pageX: e.nativeEvent.pageX,
                pageY: e.nativeEvent.pageY,
                widthPx: localPatchWidthPxRef.current,
                heightPx: localPatchHeightPxRef.current,
                rotDeg: localPatchRotDegRef.current,
            };
        },
        onResponderMove: (e: GestureResponderEvent) => {
            if (!resizeStartRef.current) return;
            const dx = e.nativeEvent.pageX - resizeStartRef.current.pageX;
            const dy = e.nativeEvent.pageY - resizeStartRef.current.pageY;
            const rotRad = (resizeStartRef.current.rotDeg * Math.PI) / 180;
            const localDx = dx * Math.cos(rotRad) + dy * Math.sin(rotRad);
            const desiredWidthPx = Math.max(minPatchPxRef.current, resizeStartRef.current.widthPx + localDx);
            const abscos = Math.abs(Math.cos(rotRad));
            const abssin = Math.abs(Math.sin(rotRad));
            const hh = resizeStartRef.current.heightPx / 2;
            const cxPx = plantRef.current.positionX * scaleRef.current;
            const cyPx = plantRef.current.positionY * scaleRef.current;
            const maxHalfX = Math.min(cxPx, containerWidthRef.current - cxPx);
            const maxHalfY = Math.min(cyPx, containerHeightRef.current - cyPx);
            let maxHw = Infinity;
            if (abscos > 0.001) maxHw = Math.min(maxHw, (maxHalfX - hh * abssin) / abscos);
            if (abssin > 0.001) maxHw = Math.min(maxHw, (maxHalfY - hh * abscos) / abssin);
            setLocalPatchWidthPx(Math.min(Math.max(minPatchPxRef.current, maxHw * 2), desiredWidthPx));
        },
        onResponderRelease: () => { resizeStartRef.current = null; commitPatch(); },
        onResponderTerminate: () => { resizeStartRef.current = null; },
    };

    const bottomHandleResponders = {
        onStartShouldSetResponder: () => canUseHandles,
        onMoveShouldSetResponder: () => true,
        onResponderGrant: (e: GestureResponderEvent) => {
            resizeStartRef.current = {
                pageX: e.nativeEvent.pageX,
                pageY: e.nativeEvent.pageY,
                widthPx: localPatchWidthPxRef.current,
                heightPx: localPatchHeightPxRef.current,
                rotDeg: localPatchRotDegRef.current,
            };
        },
        onResponderMove: (e: GestureResponderEvent) => {
            if (!resizeStartRef.current) return;
            const dx = e.nativeEvent.pageX - resizeStartRef.current.pageX;
            const dy = e.nativeEvent.pageY - resizeStartRef.current.pageY;
            const rotRad = (resizeStartRef.current.rotDeg * Math.PI) / 180;
            const localDy = -dx * Math.sin(rotRad) + dy * Math.cos(rotRad);
            const desiredHeightPx = Math.max(minPatchPxRef.current, resizeStartRef.current.heightPx + localDy);
            const abscos = Math.abs(Math.cos(rotRad));
            const abssin = Math.abs(Math.sin(rotRad));
            const hw = resizeStartRef.current.widthPx / 2;
            const cxPx = plantRef.current.positionX * scaleRef.current;
            const cyPx = plantRef.current.positionY * scaleRef.current;
            const maxHalfX = Math.min(cxPx, containerWidthRef.current - cxPx);
            const maxHalfY = Math.min(cyPx, containerHeightRef.current - cyPx);
            let maxHh = Infinity;
            if (abssin > 0.001) maxHh = Math.min(maxHh, (maxHalfX - hw * abscos) / abssin);
            if (abscos > 0.001) maxHh = Math.min(maxHh, (maxHalfY - hw * abssin) / abscos);
            setLocalPatchHeightPx(Math.min(Math.max(minPatchPxRef.current, maxHh * 2), desiredHeightPx));
        },
        onResponderRelease: () => { resizeStartRef.current = null; commitPatch(); },
        onResponderTerminate: () => { resizeStartRef.current = null; },
    };

    const rotateHandleResponders = {
        onStartShouldSetResponder: () => canUseHandles,
        onMoveShouldSetResponder: () => true,
        onResponderGrant: (e: GestureResponderEvent) => {
            rotateStartRef.current = {
                pageX: e.nativeEvent.pageX,
                rotDeg: localPatchRotDegRef.current,
            };
        },
        onResponderMove: (e: GestureResponderEvent) => {
            if (!rotateStartRef.current) return;
            const dx = e.nativeEvent.pageX - rotateStartRef.current.pageX;
            const newRot = rotateStartRef.current.rotDeg + dx * 0.5;
            setLocalPatchRotDeg(((newRot % 360) + 360) % 360);
        },
        onResponderRelease: () => { rotateStartRef.current = null; commitPatch(); },
        onResponderTerminate: () => { rotateStartRef.current = null; },
    };

    const patchLeft = (containerSize - localPatchWidthPx) / 2;
    const patchTop = (containerSize - localPatchHeightPx) / 2;

    const showWarningIcon =
        showSpacingRadius && (hasSpacingOverlap || hasWallProximityWarning) && !hasInnerCollision;

    return (
        <Animated.View
            {...panResponder.panHandlers}
            style={[
                styles.plantContainer,
                {
                    transform: [
                        {translateX: pan.x},
                        {translateY: pan.y},
                        {scale: scaleAnim},
                    ],
                    width: containerSize,
                    height: containerSize,
                    zIndex: isDragging ? 100 : isSelected ? 50 : 1,
                },
            ]}
        >
            {isPatch ? (
                <>
                    {/* Rotate handle — above the bounding box, outside the rotated rect */}
                    {canUseHandles && (
                        <View
                            {...rotateHandleResponders}
                            style={[styles.rotateHandle, {
                                top: Math.max(0, patchTop - 28),
                                left: containerSize / 2 - 12,
                            }]}
                        >
                            <Text style={styles.rotateHandleText}>&#8635;</Text>
                        </View>
                    )}

                    {/* Patch rectangle */}
                    <View
                        style={[
                            styles.patchRect,
                            {
                                left: patchLeft,
                                top: patchTop,
                                width: localPatchWidthPx,
                                height: localPatchHeightPx,
                                transform: [{rotate: localPatchRotDeg + 'deg'}],
                                backgroundColor: hasInnerCollision ? '#dc2626' : isThinning ? '#78350f' : '#92400e',
                                borderColor: isInPatchEditMode ? '#ffffff' : isThinning ? '#f97316' : '#d97706',
                                opacity: isInPatchEditMode ? 1 : 0.85,
                            },
                        ]}
                    >
                        <PlantIconInCanvas plantData={plantData} />

                        {/* Thinning: dot grid showing final plant positions after thinning */}
                        {isThinning && thinnedDots.length > 0 && (
                            <View pointerEvents="none" style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden'}}>
                                {thinnedDots.map((dot, i) => (
                                    <View
                                        key={i}
                                        style={{
                                            position: 'absolute',
                                            left: dot.x - 3,
                                            top: dot.y - 3,
                                            width: 6,
                                            height: 6,
                                            borderRadius: 3,
                                            backgroundColor: 'rgba(255,255,255,0.4)',
                                        }}
                                    />
                                ))}
                            </View>
                        )}

                        {/* Right-edge handle — drag stretches width */}
                        {canUseHandles && (
                            <View
                                {...rightHandleResponders}
                                style={[styles.resizeHandle, {
                                    position: 'absolute',
                                    right: -10,
                                    top: localPatchHeightPx / 2 - 10,
                                }]}
                            />
                        )}

                        {/* Bottom-edge handle — drag stretches height */}
                        {canUseHandles && (
                            <View
                                {...bottomHandleResponders}
                                style={[styles.resizeHandle, {
                                    position: 'absolute',
                                    bottom: -10,
                                    left: localPatchWidthPx / 2 - 10,
                                }]}
                            />
                        )}
                    </View>
                </>
            ) : (
                /* Individual plant */
                <View
                    style={[
                        styles.plantIcon,
                        {
                            width: plantSizePx,
                            height: plantSizePx,
                            borderRadius: plantSizePx / 2,
                            backgroundColor: hasInnerCollision ? '#dc2626' : '#16a34a',
                            borderWidth: isSelected ? 2 : 0,
                            borderColor: isSelected ? '#ffffff' : 'transparent',
                        },
                    ]}
                >
                    <PlantIconInCanvas plantData={plantData} />
                </View>
            )}

            {/* Warning badge */}
            {showWarningIcon && (
                <Pressable
                    onPress={onWarningBadgePress}
                    onStartShouldSetResponder={() => true}
                    style={{
                        position: 'absolute',
                        right: isPatch ? Math.max(0, patchLeft - 6) : -10,
                        top: isPatch ? Math.max(0, patchTop - 6) : -10,
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: '#f59e0b',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: '#b45309',
                        zIndex: 200,
                    }}
                >
                    <Text style={{color: 'white', fontSize: 14, fontWeight: '800'}}>!</Text>
                </Pressable>
            )}

            {/* Lock badge */}
            {isLocked && (
                <View
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        right: isPatch ? Math.max(0, patchLeft - 4) : -8,
                        top: isPatch ? Math.max(0, patchTop - 4) : -8,
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        backgroundColor: '#1e40af',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: '#3b82f6',
                        zIndex: 200,
                    }}
                >
                    <Text style={{fontSize: 10}}>🔒</Text>
                </View>
            )}

            {/* Plant name label */}
            {(isSelected || showPlantName) && plantData && (
                <View
                    style={[
                        styles.plantLabelWrapper,
                        {
                            top: containerSize / 2 + (isPatch ? localPatchHeightPx / 2 : plantSizePx / 2) + 4,
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

// ─── PlantPlacementCanvas ─────────────────────────────────────────────────────

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
    isEditMode = false,
    onToggleEditMode,
    onBackgroundPress,
    onLockAll,
    onUnlockAll,
    onActionPress,
    onPatchDimensionsChange,
    patchEditPlantId,
    onPatchEditConfirm,
    onPatchEditCancel,
}: PlantPlacementCanvasProps): React.JSX.Element {
    const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
    const [canvasSize, setCanvasSize] = useState({width: 0, height: 0});
    const [selectedRelationship, setSelectedRelationship] = useState<PlantRelationship | null>(null);
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [showSpacingRadius, setShowSpacingRadius] = useState(false);
    const [showPlantNames, setShowPlantNames] = useState(false);
    const [showRelationships, setShowRelationships] = useState(false);
    const [activeWarningPlantId, setActiveWarningPlantId] = useState<string | null>(null);
    const [scrollOffsetX, setScrollOffsetX] = useState(0);
    const [scrollOffsetY, setScrollOffsetY] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);
    const getPlantById = usePlantStore((state) => state.getPlantById);

    const componentInnerDimensions = useMemo(() => getInnerDimensions(component), [component]);
    const innerDimensions = layerDimensions ?? componentInnerDimensions;
    const isCircular = isPot(component) || isCircularTower(component);
    const plants = filteredPlants ?? (component.plants || []);

    // While a patch is being edited, disable all drag-and-drop
    const draggingAllowed = isEditMode && patchEditPlantId == null;

    const baseScale = useMemo(() => {
        if (canvasSize.width === 0 || canvasSize.height === 0) return 1;
        const availableWidth = canvasSize.width - 32;
        const availableHeight = canvasSize.height - 32;
        const scaleX = availableWidth / innerDimensions.width;
        const scaleY = availableHeight / innerDimensions.height;
        return Math.min(scaleX, scaleY, 3);
    }, [canvasSize, innerDimensions]);

    const scale = baseScale * zoomLevel;

    const handleZoomIn = useCallback(() => {
        setZoomLevel((prev) => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
    }, []);

    const handleZoomOut = useCallback(() => {
        setZoomLevel((prev) => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
    }, []);

    const handleToggleSpacingRadius = useCallback(() => {
        onActionPress?.();
        setShowSpacingRadius((prev) => !prev);
    }, [onActionPress]);

    const handleTogglePlantNames = useCallback(() => {
        onActionPress?.();
        setShowPlantNames((prev) => !prev);
    }, [onActionPress]);

    const handleToggleRelationships = useCallback(() => {
        onActionPress?.();
        setShowRelationships((prev) => !prev);
    }, [onActionPress]);

    const containerWidth = innerDimensions.width * scale;
    const containerHeight = innerDimensions.height * scale;
    const needsScrolling = containerWidth > canvasSize.width - 32 || containerHeight > canvasSize.height - 32;

    useEffect(() => {
        if (scrollViewRef.current && needsScrolling && patchEditPlantId == null) {
            const scrollX = Math.max(0, (containerWidth - canvasSize.width + 32) / 2);
            const scrollY = Math.max(0, (containerHeight - canvasSize.height + 32) / 2);
            scrollViewRef.current.scrollTo({x: scrollX, y: scrollY, animated: false});
        }
    }, [zoomLevel, containerWidth, containerHeight, canvasSize.width, canvasSize.height, needsScrolling, patchEditPlantId]);

    // ─── Collision detection ──────────────────────────────────────────────────

    const {spacingOverlaps, innerCollisions, wallProximityViolations} = useMemo(() => {
        const spacingOverlaps = new Map<string, boolean>();
        const innerCollisions = new Map<string, boolean>();
        const wallProximityViolations = new Map<string, boolean>();

        plants.forEach((plant1) => {
            const plant1Data = getPlantById(plant1.plantId);
            const plant1Spacing = plant1Data?.spacingRadiusCm ?? 15;
            const plant1IsPatch = plant1Data?.plantingStyle === 'patch' || plant1Data?.plantingStyle === 'thinning';

            plants.forEach((plant2) => {
                if (plant1.id === plant2.id) return;
                const plant2Data = getPlantById(plant2.plantId);
                const plant2Spacing = plant2Data?.spacingRadiusCm ?? 15;
                const plant2IsPatch = plant2Data?.plantingStyle === 'patch' || plant2Data?.plantingStyle === 'thinning';

                let gap: number;
                if (!plant1IsPatch && !plant2IsPatch) {
                    // ind-ind: center-to-center distance
                    const dx = plant1.positionX - plant2.positionX;
                    const dy = plant1.positionY - plant2.positionY;
                    gap = Math.sqrt(dx * dx + dy * dy);
                } else if (plant1IsPatch && !plant2IsPatch) {
                    // rect-ind: distance from individual center to rect boundary
                    const [rcx, rcy, rhw, rhh, rrot] = getRectDims(plant1, plant1Data);
                    gap = distPointToRotatedRect(plant2.positionX, plant2.positionY, rcx, rcy, rhw, rhh, rrot);
                } else if (!plant1IsPatch && plant2IsPatch) {
                    // ind-rect: distance from individual center to rect boundary
                    const [rcx, rcy, rhw, rhh, rrot] = getRectDims(plant2, plant2Data);
                    gap = distPointToRotatedRect(plant1.positionX, plant1.positionY, rcx, rcy, rhw, rhh, rrot);
                } else {
                    // rect-rect: boundary-to-boundary distance
                    const [cx1, cy1, hw1, hh1, rr1] = getRectDims(plant1, plant1Data);
                    const [cx2, cy2, hw2, hh2, rr2] = getRectDims(plant2, plant2Data);
                    gap = distRectToRect(cx1, cy1, hw1, hh1, rr1, cx2, cy2, hw2, hh2, rr2);
                }
                if (gap < plant1Spacing) spacingOverlaps.set(plant1.id, true);
                if (gap < plant2Spacing) spacingOverlaps.set(plant2.id, true);

                if (checkInnerCollision(plant1, plant1IsPatch, plant2, plant2IsPatch)) {
                    innerCollisions.set(plant1.id, true);
                    innerCollisions.set(plant2.id, true);
                }
            });
        });

        plants.forEach((plant) => {
            const plantData = getPlantById(plant.plantId);
            const isPatchPlant = plantData?.plantingStyle === 'patch' || plantData?.plantingStyle === 'thinning';

            if (isPatchPlant) {
                const spacingCm = plantData?.sowingSpacingCm ?? plantData?.spacingRadiusCm ?? 15;
                const minCm = spacingCm * 2;
                const wCm = Math.max(minCm, plant.patchWidthInCm ?? minCm);
                const hCm = Math.max(minCm, plant.patchHeightInCm ?? minCm);
                const rotRad = ((plant.patchRotationDeg ?? 0) * Math.PI) / 180;
                const cx = plant.positionX;
                const cy = plant.positionY;
                const hw = wCm / 2;
                const hh = hCm / 2;
                const corners: [number, number][] = [
                    [hw, hh], [hw, -hh], [-hw, hh], [-hw, -hh],
                ];
                const centerOutOfBounds =
                    cx < 0 || cx > innerDimensions.width || cy < 0 || cy > innerDimensions.height;
                const cornersOutOfBounds = corners.some(([lx, ly]) => {
                    const px = cx + lx * Math.cos(rotRad) - ly * Math.sin(rotRad);
                    const py = cy + lx * Math.sin(rotRad) + ly * Math.cos(rotRad);
                    return px < 0 || px > innerDimensions.width || py < 0 || py > innerDimensions.height;
                });
                if (centerOutOfBounds || cornersOutOfBounds) wallProximityViolations.set(plant.id, true);
            } else {
                const spacing = plantData?.spacingRadiusCm ?? 15;
                const x = plant.positionX;
                const y = plant.positionY;
                if (
                    x < spacing ||
                    x > innerDimensions.width - spacing ||
                    y < spacing ||
                    y > innerDimensions.height - spacing
                ) {
                    wallProximityViolations.set(plant.id, true);
                }
            }
        });

        return {spacingOverlaps, innerCollisions, wallProximityViolations};
    }, [plants, getPlantById, innerDimensions]);

    const plantRelationships = useMemo(
        () => calculatePlantRelationships(plants, getPlantById),
        [plants, getPlantById]
    );

    const handleRelationshipPress = useCallback((relationship: PlantRelationship) => {
        setSelectedRelationship(relationship);
        setTooltipVisible(true);
    }, []);

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
        setActiveWarningPlantId(null);
        onBackgroundPress?.();
    }, [onBackgroundPress]);

    const contentPaddingX = needsScrolling ? 16 : Math.max(16, (canvasSize.width - containerWidth) / 2);
    const contentPaddingY = needsScrolling ? 16 : Math.max(16, (canvasSize.height - containerHeight) / 2);

    const warningTooltip = (() => {
        if (!activeWarningPlantId || !showSpacingRadius) return null;
        const plant = plants.find((p) => p.id === activeWarningPlantId);
        if (!plant) return null;
        const plantData = getPlantById(plant.plantId);
        const isRectPlant = plantData?.plantingStyle === 'patch' || plantData?.plantingStyle === 'thinning';
        const spacingCm = plantData?.spacingRadiusCm ?? 15;
        const hasSpacing = spacingOverlaps.get(plant.id) ?? false;
        const text = isRectPlant
            ? hasSpacing
                ? 'Te dicht bij een andere plant of vak. Minimale afstand: ' + spacingCm + 'cm.'
                : 'Vak steekt buiten de randen.'
            : hasSpacing
                ? 'Afstand moet ' + spacingCm + 'cm zijn.'
                : 'Te dicht bij de rand. Minimale afstand: ' + spacingCm + 'cm.';
        const px = contentPaddingX + plant.positionX * scale - scrollOffsetX;
        const py = contentPaddingY + plant.positionY * scale - scrollOffsetY;
        return {px, py, text};
    })();

    return (
        <GestureHandlerRootView style={styles.root}>
            <View style={styles.outerContainer}>
                <View style={styles.container} onLayout={handleLayout}>
                {canvasSize.width > 0 && (
                    <>
                        <ScrollView
                            ref={scrollViewRef}
                            style={styles.scrollView}
                            contentContainerStyle={[
                                styles.scrollContent,
                                {paddingHorizontal: contentPaddingX, paddingVertical: contentPaddingY},
                            ]}
                            horizontal={false}
                            showsVerticalScrollIndicator={needsScrolling}
                            showsHorizontalScrollIndicator={needsScrolling}
                            scrollEnabled={needsScrolling && patchEditPlantId == null}
                            nestedScrollEnabled={true}
                            onScroll={(e) => setScrollOffsetY(e.nativeEvent.contentOffset.y)}
                            scrollEventThrottle={16}
                        >
                            <ScrollView
                                horizontal={true}
                                showsHorizontalScrollIndicator={false}
                                scrollEnabled={needsScrolling && patchEditPlantId == null}
                                nestedScrollEnabled={true}
                                contentContainerStyle={styles.horizontalScrollContent}
                                onScroll={(e) => setScrollOffsetX(e.nativeEvent.contentOffset.x)}
                                scrollEventThrottle={16}
                            >
                                <Pressable onPress={handleBackgroundPress}>
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
                                        {showRelationships && plantRelationships.map((relationship) => (
                                            <RelationshipIndicator
                                                key={relationship.plant1Id + '-' + relationship.plant2Id}
                                                relationship={relationship}
                                                scale={scale}
                                                onPress={handleRelationshipPress}
                                            />
                                        ))}

                                        {plants.map((plant) => {
                                            const plantData = getPlantById(plant.plantId);
                                            const isPatchPlant = plantData?.plantingStyle === 'patch' || plantData?.plantingStyle === 'thinning';
                                            const isThinningPlant = plantData?.plantingStyle === 'thinning';
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
                                                    hasWallProximityWarning={wallProximityViolations.get(plant.id) ?? false}
                                                    isSelected={selectedPlantId === plant.id}
                                                    onSelect={() => setSelectedPlantId(plant.id)}
                                                    showSpacingRadius={showSpacingRadius}
                                                    showPlantName={showPlantNames}
                                                    isPatch={isPatchPlant}
                                                    isThinning={isThinningPlant}
                                                    draggingEnabled={draggingAllowed}
                                                    isLocked={plant.locked ?? false}
                                                    onWarningBadgePress={() => setActiveWarningPlantId((prev) => prev === plant.id ? null : plant.id)}
                                                    isInPatchEditMode={patchEditPlantId === plant.id}
                                                    onPatchDimensionsChange={onPatchDimensionsChange}
                                                />
                                            );
                                        })}

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

                        <View style={styles.scaleIndicator}>
                            {(() => {
                                const targetLineWidth = 60;
                                const rawDistanceCm = targetLineWidth / scale;
                                const niceNumbers = [5, 10, 15, 20, 25, 50, 75, 100, 150, 200, 250, 500];
                                const niceDistance = niceNumbers.reduce((prev, curr) =>
                                    Math.abs(curr - rawDistanceCm) < Math.abs(prev - rawDistanceCm) ? curr : prev
                                );
                                const adjustedLineWidth = niceDistance * scale;
                                const displayText = niceDistance >= 100
                                    ? (niceDistance / 100) + ' m'
                                    : niceDistance + ' cm';
                                return (
                                    <>
                                        <View style={[styles.scaleLine, {width: adjustedLineWidth}]} />
                                        <Text style={styles.scaleText}>{displayText}</Text>
                                    </>
                                );
                            })()}
                        </View>

                        {!isEditMode && (
                            <View style={styles.zoomControls}>
                                <Pressable
                                    style={[styles.zoomButton, zoomLevel >= MAX_ZOOM && styles.zoomButtonDisabled]}
                                    onPress={handleZoomIn}
                                    disabled={zoomLevel >= MAX_ZOOM}
                                >
                                    <Text style={[styles.zoomButtonText, zoomLevel >= MAX_ZOOM && styles.zoomButtonTextDisabled]}>+</Text>
                                </Pressable>
                                <Text style={styles.zoomLevelText}>{Math.round(zoomLevel * 100)}%</Text>
                                <Pressable
                                    style={[styles.zoomButton, zoomLevel <= MIN_ZOOM && styles.zoomButtonDisabled]}
                                    onPress={handleZoomOut}
                                    disabled={zoomLevel <= MIN_ZOOM}
                                >
                                    <Text style={[styles.zoomButtonText, zoomLevel <= MIN_ZOOM && styles.zoomButtonTextDisabled]}>-</Text>
                                </Pressable>
                            </View>
                        )}

                        {/* Patch edit mode: confirm/cancel overlay */}
                        {patchEditPlantId != null && (
                            <View style={styles.patchEditOverlay}>
                                <Text style={styles.patchEditLabel}>Formaat en rotatie aanpassen</Text>
                                <View style={styles.patchEditButtons}>
                                    <Pressable style={styles.patchCancelButton} onPress={onPatchEditCancel}>
                                        <Text style={styles.patchButtonText}>Annuleren</Text>
                                    </Pressable>
                                    <Pressable style={styles.patchConfirmButton} onPress={onPatchEditConfirm}>
                                        <Text style={styles.patchButtonText}>Bevestigen</Text>
                                    </Pressable>
                                </View>
                            </View>
                        )}
                    </>
                )}

                {warningTooltip && (
                    <View
                        pointerEvents="none"
                        style={{
                            position: 'absolute',
                            left: Math.min(warningTooltip.px + 12, canvasSize.width - 172),
                            top: Math.min(warningTooltip.py + 12, canvasSize.height - 60),
                            backgroundColor: 'rgba(17, 24, 39, 0.95)',
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 8,
                            width: 160,
                            zIndex: 2000,
                        }}
                    >
                        <Text style={{color: 'white', fontSize: 12}}>{warningTooltip.text}</Text>
                    </View>
                )}

                <RelationshipTooltip
                    relationship={selectedRelationship}
                    visible={tooltipVisible}
                    onClose={handleTooltipClose}
                />
            </View>

            <View style={styles.toggleContainer}>
                <View style={styles.toggleRow}>
                    <Pressable style={styles.toggleButton} onPress={handleToggleSpacingRadius}>
                        <Text style={styles.spacingToggleIcon}>{showSpacingRadius ? '◉' : '○'}</Text>
                        <Text style={styles.spacingToggleText}>Afstand</Text>
                    </Pressable>
                    <Pressable style={styles.toggleButton} onPress={handleTogglePlantNames}>
                        <Text style={styles.spacingToggleIcon}>{showPlantNames ? '◉' : '○'}</Text>
                        <Text style={styles.spacingToggleText}>Namen</Text>
                    </Pressable>
                    <Pressable style={styles.toggleButton} onPress={handleToggleRelationships}>
                        <Text style={styles.spacingToggleIcon}>{showRelationships ? '◉' : '○'}</Text>
                        <Text style={styles.spacingToggleText}>Companionships</Text>
                    </Pressable>
                </View>
                {(onLockAll || onUnlockAll) && (
                    <View style={styles.toggleRow}>
                        {onLockAll && (
                            <Pressable style={styles.toggleButton} onPress={() => { onActionPress?.(); onLockAll(); }}>
                                <Text style={styles.spacingToggleIcon}>🔒</Text>
                                <Text style={styles.spacingToggleText}>Vergrendel alles</Text>
                            </Pressable>
                        )}
                        {onUnlockAll && (
                            <Pressable style={styles.toggleButton} onPress={() => { onActionPress?.(); onUnlockAll(); }}>
                                <Text style={styles.spacingToggleIcon}>🔓</Text>
                                <Text style={styles.spacingToggleText}>Ontgrendel alles</Text>
                            </Pressable>
                        )}
                    </View>
                )}
                <Pressable
                    style={[styles.editModeButton, isEditMode && styles.editModeActiveButton]}
                    onPress={() => { onActionPress?.(); onToggleEditMode?.(); }}
                >
                    <Text style={[styles.spacingToggleIcon, isEditMode && styles.editModeActiveIcon]}>
                        {isEditMode ? '💾' : '✏️'}
                    </Text>
                    <Text style={[styles.spacingToggleText, isEditMode && styles.editModeActiveText]}>
                        {isEditMode ? 'Opslaan' : 'Bewerken'}
                    </Text>
                </Pressable>
            </View>
            </View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    root: {flex: 1},
    container: {flex: 1, backgroundColor: '#1f2937', borderRadius: 12, overflow: 'hidden'},
    scrollView: {flex: 1},
    scrollContent: {flexGrow: 1},
    horizontalScrollContent: {flexGrow: 1, alignItems: 'center', justifyContent: 'center'},
    componentShape: {
        backgroundColor: '#3d2914',
        borderWidth: 3,
        borderColor: '#8B4513',
        position: 'relative',
        overflow: 'hidden',
    },
    plantContainer: {position: 'absolute', alignItems: 'center', justifyContent: 'center'},
    spacingCircle: {position: 'absolute', borderStyle: 'dashed'},
    plantIcon: {
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
    },
    patchRect: {
        position: 'absolute',
        borderRadius: 4,
        borderWidth: 2,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
    },
    resizeHandle: {
        width: 20,
        height: 20,
        borderRadius: 4,
        backgroundColor: '#d97706',
        borderWidth: 2,
        borderColor: '#ffffff',
        zIndex: 300,
    },
    rotateHandle: {
        position: 'absolute',
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#7c3aed',
        borderWidth: 2,
        borderColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
    },
    rotateHandleText: {color: '#ffffff', fontSize: 14, fontWeight: '700'},
    plantEmoji: {fontSize: 14},
    plantImage: {width: PLANT_IMAGE_SIZE, height: PLANT_IMAGE_SIZE, borderRadius: PLANT_IMAGE_SIZE / 2},
    plantLabel: {backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4},
    plantLabelWrapper: {position: 'absolute', left: 0, right: 0, alignItems: 'center'},
    plantLabelText: {color: '#fff', fontSize: 10, fontWeight: '500'},
    emptyState: {flex: 1, alignItems: 'center', justifyContent: 'center'},
    emptyIcon: {fontSize: 32, marginBottom: 8},
    emptyText: {color: '#6b7280', fontSize: 14},
    outerContainer: {flex: 1, flexDirection: 'column'},
    toggleContainer: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingVertical: 6,
        paddingHorizontal: 10,
        gap: 4,
        marginTop: 8,
    },
    toggleRow: {flexDirection: 'row', alignItems: 'center'},
    editModeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'stretch',
        justifyContent: 'center',
        paddingVertical: 4,
        borderRadius: 6,
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
    spacingToggleIcon: {color: '#4ade80', fontSize: 16, marginRight: 6},
    spacingToggleText: {color: '#ffffff', fontSize: 12, fontWeight: '500'},
    scaleIndicator: {position: 'absolute', bottom: 16, right: 16, alignItems: 'center'},
    scaleLine: {height: 2, backgroundColor: '#9ca3af', marginBottom: 4},
    scaleText: {color: '#9ca3af', fontSize: 10},
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
    zoomButton: {width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#374151', borderRadius: 6},
    zoomButtonDisabled: {backgroundColor: '#1f2937'},
    zoomButtonText: {color: '#ffffff', fontSize: 20, fontWeight: '600'},
    zoomButtonTextDisabled: {color: '#6b7280'},
    zoomLevelText: {color: '#9ca3af', fontSize: 10, marginVertical: 4},
    editModeActiveButton: {backgroundColor: 'rgba(22, 163, 74, 0.4)', borderWidth: 1, borderColor: '#16a34a'},
    editModeActiveIcon: {color: '#4ade80'},
    editModeActiveText: {color: '#4ade80', fontWeight: '700'},
    patchEditOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.88)',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#7c3aed',
    },
    patchEditLabel: {
        color: '#c4b5fd',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    patchEditButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    patchCancelButton: {
        flex: 1,
        paddingVertical: 10,
        backgroundColor: '#7f1d1d',
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#dc2626',
    },
    patchConfirmButton: {
        flex: 1,
        paddingVertical: 10,
        backgroundColor: '#14532d',
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#16a34a',
    },
    patchButtonText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 14,
    },
});
