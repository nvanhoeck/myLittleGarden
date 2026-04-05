/**
 * DraggableComponent
 * Wrapper that makes a component draggable and rotatable on the canvas
 */

import React, { useCallback, useState, useRef } from 'react';
import { View, Pressable } from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { ComponentData } from '@/types';
import { useComponentStore } from '@/stores';
import { ComponentRenderer } from './ComponentRenderer';

/** Rotation step in degrees (15-degree increments) */
const ROTATION_STEP = 15;

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
  const [isPendingConfirmation, setIsPendingConfirmation] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [pendingOffset, setPendingOffset] = useState({ x: 0, y: 0 });
  const startTouchRef = useRef<{ x: number; y: number } | null>(null);
  const startPositionRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMoved = useRef(false);
  const moveComponent = useComponentStore((state) => state.moveComponent);
  const rotateComponent = useComponentStore((state) => state.rotateComponent);

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

    // If we were dragging, enter pending confirmation state (don't finalize yet)
    if (isDragging && startPositionRef.current) {
      setPendingOffset({ x: dragOffset.x, y: dragOffset.y });
      setIsPendingConfirmation(true);
      setIsDragging(false);
      // Keep startPositionRef for confirmation
      return;
    } else if (!hasMoved.current) {
      // If we didn't move and didn't start dragging, it's a tap - show context menu
      onLongPress?.(component);
    }

    // Reset state
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
    startTouchRef.current = null;
    startPositionRef.current = null;
  }, [isDragging, dragOffset, onLongPress, component]);

  // Confirm placement at the current position
  const handleConfirmPlacement = useCallback(() => {
    if (startPositionRef.current) {
      const deltaXInMeters = pendingOffset.x / pixelsPerMeter;
      const deltaYInMeters = pendingOffset.y / pixelsPerMeter;

      const newX = startPositionRef.current.x + deltaXInMeters;
      const newY = startPositionRef.current.y + deltaYInMeters;

      moveComponent(component.id, newX, newY);
    }

    // Reset all state
    setIsPendingConfirmation(false);
    setPendingOffset({ x: 0, y: 0 });
    setDragOffset({ x: 0, y: 0 });
    startTouchRef.current = null;
    startPositionRef.current = null;
  }, [pendingOffset, pixelsPerMeter, moveComponent, component.id]);

  // Cancel placement and return to original position
  const handleCancelPlacement = useCallback(() => {
    setIsPendingConfirmation(false);
    setPendingOffset({ x: 0, y: 0 });
    setDragOffset({ x: 0, y: 0 });
    startTouchRef.current = null;
    startPositionRef.current = null;
  }, []);

  // Rotation handlers
  const handleRotateLeft = useCallback(() => {
    rotateComponent(component.id, component.rotation - ROTATION_STEP);
  }, [rotateComponent, component.id, component.rotation]);

  const handleRotateRight = useCallback(() => {
    rotateComponent(component.id, component.rotation + ROTATION_STEP);
  }, [rotateComponent, component.id, component.rotation]);

  // Calculate display position (base position + drag/pending offset)
  const currentOffset = isDragging ? dragOffset : isPendingConfirmation ? pendingOffset : { x: 0, y: 0 };
  const displayX = positionInPixels.x + currentOffset.x;
  const displayY = positionInPixels.y + currentOffset.y;

  return (
    <View
      style={{
        position: 'absolute',
        left: displayX,
        top: displayY,
        transform: [{ rotate: `${component.rotation}deg` }],
      }}
      onTouchStart={isPendingConfirmation ? undefined : handleTouchStart}
      onTouchMove={isPendingConfirmation ? undefined : handleTouchMove}
      onTouchEnd={isPendingConfirmation ? undefined : handleTouchEnd}
      testID={`draggable-component-${component.id}`}
    >
      <ComponentRenderer
        component={component}
        pixelsPerMeter={pixelsPerMeter}
        isSelected={isSelected}
        isDragging={isDragging || isPendingConfirmation}
      />

      {/* Pending confirmation toolbar */}
      {isPendingConfirmation && (
        <View
          style={{
            position: 'absolute',
            top: -54,
            left: '50%',
            marginLeft: -90,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#1f2937',
            borderRadius: 24,
            paddingHorizontal: 4,
            paddingVertical: 4,
            elevation: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
          }}
        >
          {/* Rotate left button */}
          <Pressable
            onPress={handleRotateLeft}
            style={{
              width: 36,
              height: 36,
              backgroundColor: '#374151',
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 4,
            }}
            testID={`rotate-left-${component.id}`}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M7.11 8.53L5.7 7.11C4.8 8.27 4.24 9.61 4.07 11h2.02c.14-.87.49-1.72 1.02-2.47zM6.09 13H4.07c.17 1.39.72 2.73 1.62 3.89l1.41-1.42c-.52-.75-.87-1.59-1.01-2.47zm1.01 5.32c1.16.9 2.51 1.44 3.9 1.61V17.9c-.87-.15-1.71-.49-2.46-1.03L7.1 18.32zM13 4.07V1L8.45 5.55 13 10V6.09c2.84.48 5 2.94 5 5.91s-2.16 5.43-5 5.91v2.02c3.95-.49 7-3.85 7-7.93s-3.05-7.44-7-7.93z"
                fill="white"
              />
            </Svg>
          </Pressable>

          {/* Rotate right button */}
          <Pressable
            onPress={handleRotateRight}
            style={{
              width: 36,
              height: 36,
              backgroundColor: '#374151',
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 8,
            }}
            testID={`rotate-right-${component.id}`}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M15.55 5.55L11 1v3.07C7.06 4.56 4 7.92 4 12s3.05 7.44 7 7.93v-2.02c-2.84-.48-5-2.94-5-5.91s2.16-5.43 5-5.91V10l4.55-4.45zM19.93 11c-.17-1.39-.72-2.73-1.62-3.89l-1.42 1.42c.54.75.88 1.6 1.02 2.47h2.02zM13 17.9v2.02c1.39-.17 2.74-.71 3.9-1.61l-1.44-1.44c-.75.54-1.59.89-2.46 1.03zm3.89-2.42l1.42 1.41c.9-1.16 1.45-2.5 1.62-3.89h-2.02c-.14.87-.48 1.72-1.02 2.48z"
                fill="white"
              />
            </Svg>
          </Pressable>

          {/* Confirm button */}
          <Pressable
            onPress={handleConfirmPlacement}
            style={{
              width: 40,
              height: 40,
              backgroundColor: '#16a34a',
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 4,
            }}
            testID={`confirm-placement-${component.id}`}
          >
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path
                d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
                fill="white"
              />
            </Svg>
          </Pressable>

          {/* Cancel button */}
          <Pressable
            onPress={handleCancelPlacement}
            style={{
              width: 36,
              height: 36,
              backgroundColor: '#dc2626',
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            testID={`cancel-placement-${component.id}`}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"
                fill="white"
              />
            </Svg>
          </Pressable>
        </View>
      )}
    </View>
  );
}
