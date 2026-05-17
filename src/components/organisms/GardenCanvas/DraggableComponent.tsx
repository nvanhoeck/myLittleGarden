/**
 * DraggableComponent
 * Gesture contract depends on canvas mode:
 *  - 'default': Tap -> context menu (onTap). Canvas can pan freely.
 *  - 'rotate':  Tap -> select for rotation (onSelect). Canvas can pan freely.
 *  - 'drag':    Touch -> drag immediately. Canvas cannot pan through component.
 */

import React, { useRef, useState } from 'react';
import { View, PanResponder } from 'react-native';
import type { ComponentData } from '@/types';
import { useComponentStore } from '@/stores';
import { ComponentRenderer } from './ComponentRenderer';

export type CanvasMode = 'default' | 'rotate' | 'drag';

const MOVE_THRESHOLD = 5;
const SWIPE_THRESHOLD = 15;

interface DraggableComponentProps {
  component: ComponentData;
  pixelsPerMeter: number;
  mode: CanvasMode;
  isSelected: boolean;
  onSelect: (component: ComponentData) => void;
  onTap?: (component: ComponentData) => void;
}

export function DraggableComponent({
  component,
  pixelsPerMeter,
  mode,
  isSelected,
  onSelect,
  onTap,
}: DraggableComponentProps): React.JSX.Element {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const moveComponent = useComponentStore((state) => state.moveComponent);

  // Refs so PanResponder (created once) always sees current values
  const componentRef = useRef(component);
  const pixelsPerMeterRef = useRef(pixelsPerMeter);
  const modeRef = useRef(mode);
  const onSelectRef = useRef(onSelect);
  const onTapRef = useRef(onTap);
  const moveComponentRef = useRef(moveComponent);

  componentRef.current = component;
  pixelsPerMeterRef.current = pixelsPerMeter;
  modeRef.current = mode;
  onSelectRef.current = onSelect;
  onTapRef.current = onTap;
  moveComponentRef.current = moveComponent;

  const startPositionRef = useRef<{ x: number; y: number } | null>(null);
  const isDragEnabledRef = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      // Always claim on touch-start to handle taps and drag initiation
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => modeRef.current === 'drag',

      // Allow canvas to steal on swipes in default/rotate; never steal in drag mode
      onPanResponderTerminationRequest: (_, gestureState) => {
        if (modeRef.current === 'drag') return false;
        return (
          Math.abs(gestureState.dx) > SWIPE_THRESHOLD ||
          Math.abs(gestureState.dy) > SWIPE_THRESHOLD
        );
      },

      onPanResponderGrant: () => {
        startPositionRef.current = {
          x: componentRef.current.positionX,
          y: componentRef.current.positionY,
        };
        isDragEnabledRef.current = false;

        if (modeRef.current === 'drag') {
          isDragEnabledRef.current = true;
          onSelectRef.current(componentRef.current);
          setIsDragging(true);
        }
      },

      onPanResponderMove: (_, gestureState) => {
        if (isDragEnabledRef.current) {
          setDragOffset({ x: gestureState.dx, y: gestureState.dy });
        }
      },

      onPanResponderRelease: (_, gestureState) => {
        if (isDragEnabledRef.current && startPositionRef.current) {
          const newX =
            startPositionRef.current.x + gestureState.dx / pixelsPerMeterRef.current;
          const newY =
            startPositionRef.current.y + gestureState.dy / pixelsPerMeterRef.current;
          moveComponentRef.current(componentRef.current.id, newX, newY);
        } else if (
          Math.abs(gestureState.dx) < SWIPE_THRESHOLD &&
          Math.abs(gestureState.dy) < SWIPE_THRESHOLD
        ) {
          const m = modeRef.current;
          if (m === 'default') {
            onTapRef.current?.(componentRef.current);
          } else if (m === 'rotate') {
            onSelectRef.current(componentRef.current);
          }
        }

        isDragEnabledRef.current = false;
        startPositionRef.current = null;
        setIsDragging(false);
        setDragOffset({ x: 0, y: 0 });
      },

      onPanResponderTerminate: () => {
        // Drag cancelled externally — snap back (position was never committed)
        isDragEnabledRef.current = false;
        startPositionRef.current = null;
        setIsDragging(false);
        setDragOffset({ x: 0, y: 0 });
      },
    })
  ).current;

  const positionInPixels = {
    x: component.positionX * pixelsPerMeter,
    y: component.positionY * pixelsPerMeter,
  };

  const displayX = positionInPixels.x + (isDragging ? dragOffset.x : 0);
  const displayY = positionInPixels.y + (isDragging ? dragOffset.y : 0);

  return (
    <View
      {...panResponder.panHandlers}
      style={{
        position: 'absolute',
        left: displayX,
        top: displayY,
        transform: [{ rotate: `${component.rotation}deg` }],
      }}
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
