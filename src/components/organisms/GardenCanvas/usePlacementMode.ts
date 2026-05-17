/**
 * Hook for managing component placement mode
 * Handles drag-to-place interaction for components from inventory
 */

import { useState, useCallback } from 'react';
import type { GestureResponderEvent } from 'react-native';
import type { ComponentData } from '@/types';
import { useComponentStore } from '@/stores';

interface PlacementPosition {
  x: number;
  y: number;
}

export interface CanvasLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UsePlacementModeResult {
  /** Component currently being placed (null if not in placement mode) */
  placingComponent: ComponentData | null;
  /** Current position of the component being placed */
  placementPosition: PlacementPosition | null;
  /** Whether we're actively dragging */
  isDragging: boolean;
  /** Start placement mode with a component */
  startPlacement: (component: ComponentData) => void;
  /** Cancel placement mode */
  cancelPlacement: () => void;
  /** Handle touch start during placement */
  onPlacementTouchStart: (event: GestureResponderEvent) => void;
  /** Handle touch move during placement */
  onPlacementTouchMove: (event: GestureResponderEvent, canvasOffset: PlacementPosition, canvasCenter: PlacementPosition) => void;
  /** Handle touch end - confirm placement */
  onPlacementTouchEnd: (canvasOffset: PlacementPosition, canvasCenter: PlacementPosition, pixelsPerMeter: number) => void;
  /** Update placement position from page coordinates (for cross-component drag) */
  updatePlacementFromPageCoords: (pageX: number, pageY: number, canvasLayout: CanvasLayout) => void;
  /** Commit placement from page coordinates (for cross-component drag) */
  commitPlacementFromPageCoords: (pageX: number, pageY: number, canvasLayout: CanvasLayout, canvasOffset: PlacementPosition, canvasCenter: PlacementPosition, pixelsPerMeter: number) => void;
}

/**
 * Hook for managing component placement from inventory to canvas
 */
export function usePlacementMode(): UsePlacementModeResult {
  const [placingComponent, setPlacingComponent] = useState<ComponentData | null>(null);
  const [placementPosition, setPlacementPosition] = useState<PlacementPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const moveComponent = useComponentStore((state) => state.moveComponent);

  const startPlacement = useCallback((component: ComponentData) => {
    setPlacingComponent(component);
    setPlacementPosition(null);
    setIsDragging(false);
  }, []);

  const cancelPlacement = useCallback(() => {
    setPlacingComponent(null);
    setPlacementPosition(null);
    setIsDragging(false);
  }, []);

  const onPlacementTouchStart = useCallback((event: GestureResponderEvent) => {
    if (!placingComponent) return;

    const touch = event.nativeEvent;
    setPlacementPosition({ x: touch.locationX, y: touch.locationY });
    setIsDragging(true);
  }, [placingComponent]);

  const onPlacementTouchMove = useCallback(
    (
      event: GestureResponderEvent,
      canvasOffset: PlacementPosition,
      canvasCenter: PlacementPosition
    ) => {
      if (!placingComponent || !isDragging) return;

      const touch = event.nativeEvent;
      setPlacementPosition({ x: touch.locationX, y: touch.locationY });
    },
    [placingComponent, isDragging]
  );

  const onPlacementTouchEnd = useCallback(
    (
      canvasOffset: PlacementPosition,
      canvasCenter: PlacementPosition,
      pixelsPerMeter: number
    ) => {
      if (!placingComponent || !placementPosition) {
        cancelPlacement();
        return;
      }

      // Convert screen position to canvas position in meters
      const canvasOriginX = canvasCenter.x + canvasOffset.x;
      const canvasOriginY = canvasCenter.y + canvasOffset.y;

      const relativeX = placementPosition.x - canvasOriginX;
      const relativeY = placementPosition.y - canvasOriginY;

      // Convert pixels to meters
      const positionXInMeters = relativeX / pixelsPerMeter;
      const positionYInMeters = relativeY / pixelsPerMeter;

      // Update the component's position in the store
      moveComponent(placingComponent.id, positionXInMeters, positionYInMeters);

      // Exit placement mode
      setPlacingComponent(null);
      setPlacementPosition(null);
      setIsDragging(false);
    },
    [placingComponent, placementPosition, moveComponent, cancelPlacement]
  );

  const updatePlacementFromPageCoords = useCallback(
    (pageX: number, pageY: number, canvasLayout: CanvasLayout) => {
      if (!placingComponent) return;

      // Convert page coordinates to canvas-relative coordinates
      const canvasRelativeX = pageX - canvasLayout.x;
      const canvasRelativeY = pageY - canvasLayout.y;

      setPlacementPosition({ x: canvasRelativeX, y: canvasRelativeY });
      setIsDragging(true);
    },
    [placingComponent]
  );

  const commitPlacementFromPageCoords = useCallback(
    (
      pageX: number,
      pageY: number,
      canvasLayout: CanvasLayout,
      canvasOffset: PlacementPosition,
      canvasCenter: PlacementPosition,
      pixelsPerMeter: number
    ) => {
      if (!placingComponent) {
        cancelPlacement();
        return;
      }

      // Convert page coordinates to canvas-relative coordinates
      const canvasRelativeX = pageX - canvasLayout.x;
      const canvasRelativeY = pageY - canvasLayout.y;

      // Check if the release point is within the canvas bounds
      const isInsideCanvas =
        canvasRelativeX >= 0 &&
        canvasRelativeX <= canvasLayout.width &&
        canvasRelativeY >= 0 &&
        canvasRelativeY <= canvasLayout.height;

      if (!isInsideCanvas) {
        // Released outside the canvas - cancel placement
        cancelPlacement();
        return;
      }

      // Convert to canvas content coordinates (accounting for pan offset and center)
      const canvasOriginX = canvasCenter.x + canvasOffset.x;
      const canvasOriginY = canvasCenter.y + canvasOffset.y;

      const relativeX = canvasRelativeX - canvasOriginX;
      const relativeY = canvasRelativeY - canvasOriginY;

      // Convert pixels to meters
      const positionXInMeters = relativeX / pixelsPerMeter;
      const positionYInMeters = relativeY / pixelsPerMeter;

      // Update the component's position in the store
      moveComponent(placingComponent.id, positionXInMeters, positionYInMeters);

      // Exit placement mode
      setPlacingComponent(null);
      setPlacementPosition(null);
      setIsDragging(false);
    },
    [placingComponent, moveComponent, cancelPlacement]
  );

  return {
    placingComponent,
    placementPosition,
    isDragging,
    startPlacement,
    cancelPlacement,
    onPlacementTouchStart,
    onPlacementTouchMove,
    onPlacementTouchEnd,
    updatePlacementFromPageCoords,
    commitPlacementFromPageCoords,
  };
}
