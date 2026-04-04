/**
 * DraggableComponent
 * Wrapper that makes a component draggable and rotatable on the canvas
 */

import React, { useCallback, useState, useRef } from 'react';
import { View } from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import type { ComponentData } from '@/types';
import { useComponentStore } from '@/stores';
import { ComponentRenderer } from './ComponentRenderer';

interface DraggableComponentProps {
  /** Component data */
  component: ComponentData;
  /** Pixels per meter scale */
  pixelsPerMeter: number;
  /** Whether this component is selected */
  isSelected: boolean;
  /** Callback when component is tapped (for selection) */
  onSelect: (component: ComponentData) => void;
  /** Callback when component is long pressed */
  onLongPress?: (component: ComponentData) => void;
  /** Canvas offset for position calculations */
  canvasOffset: { x: number; y: number };
  /** Canvas center point */
  canvasCenter: { x: number; y: number };
}

/**
 * Makes a component draggable on the canvas
 * - Tap to show context menu
 * - Long press to start drag/rotate mode
 */
export function DraggableComponent({
  component,
  pixelsPerMeter,
  isSelected,
  onSelect,
  onLongPress,
  canvasOffset,
  canvasCenter,
}: DraggableComponentProps): React.JSX.Element {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const startTouchRef = useRef<{ x: number; y: number } | null>(null);
  const startPositionRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMoved = useRef(false);
  const moveComponent = useComponentStore((state) => state.moveComponent);

  // Current position in pixels (relative to canvas origin)
  const positionInPixels = {
    x: component.positionX * pixelsPerMeter,
    y: component.positionY * pixelsPerMeter,
  };

  const handleTouchStart = useCallback(
    (event: GestureResponderEvent) => {
      const touch = event.nativeEvent;
      startTouchRef.current = { x: touch.pageX, y: touch.pageY };
      startPositionRef.current = { x: component.positionX, y: component.positionY };
      hasMoved.current = false;

      // Start long press timer - after 400ms, enable drag mode
      longPressTimerRef.current = setTimeout(() => {
        onSelect(component);
        setIsDragging(true);
      }, 400);
    },
    [onSelect, component]
  );

  const handleTouchMove = useCallback(
    (event: GestureResponderEvent) => {
      if (!startTouchRef.current) return;

      const touch = event.nativeEvent;
      const deltaX = touch.pageX - startTouchRef.current.x;
      const deltaY = touch.pageY - startTouchRef.current.y;

      // If moved significantly, cancel the long press timer
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        hasMoved.current = true;
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }

      // Only update drag offset if we're in drag mode
      if (isDragging && startPositionRef.current) {
        setDragOffset({ x: deltaX, y: deltaY });
      }
    },
    [isDragging]
  );

  const handleTouchEnd = useCallback(() => {
    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // If we were dragging, finalize the position
    if (isDragging && startPositionRef.current) {
      const deltaXInMeters = dragOffset.x / pixelsPerMeter;
      const deltaYInMeters = dragOffset.y / pixelsPerMeter;

      const newX = startPositionRef.current.x + deltaXInMeters;
      const newY = startPositionRef.current.y + deltaYInMeters;

      moveComponent(component.id, newX, newY);
    } else if (!hasMoved.current) {
      // If we didn't move and didn't start dragging, it's a tap - show context menu
      onLongPress?.(component);
    }

    // Reset state
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
    startTouchRef.current = null;
    startPositionRef.current = null;
  }, [isDragging, dragOffset, pixelsPerMeter, moveComponent, component.id, onLongPress, component]);

  // Calculate display position (base position + drag offset)
  const displayX = positionInPixels.x + (isDragging ? dragOffset.x : 0);
  const displayY = positionInPixels.y + (isDragging ? dragOffset.y : 0);

  return (
    <View
      style={{
        position: 'absolute',
        left: displayX,
        top: displayY,
        transform: [{ rotate: `${component.rotation}deg` }],
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      testID={`draggable-component-${component.id}`}
    >
      <ComponentRenderer
        component={component}
        pixelsPerMeter={pixelsPerMeter}
        isSelected={isSelected}
        isDragging={isDragging}
      />
    </View>
  );
}
