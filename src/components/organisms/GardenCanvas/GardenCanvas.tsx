/**
 * GardenCanvas component
 * Infinite canvas. Mode-based interaction is delegated to DraggableComponent;
 * the rotation toolbar lives in the parent (HomeScreen).
 */

import React, { useCallback, useRef } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import type { GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAllComponents } from '@/stores';
import { DraggableComponent } from './DraggableComponent';
import type { CanvasMode } from './DraggableComponent';
import { PlacementGhost } from './PlacementGhost';
import { useCanvasPan } from './useCanvasPan';
import { usePlacementMode } from './usePlacementMode';
import type { CanvasLayout } from './usePlacementMode';
import type { ComponentData } from '@/types';

export type { CanvasMode };

/** Imperative handle exposed to parent for drag-from-inventory placement */
export interface GardenCanvasRef {
  updateDragPlacement: (pageX: number, pageY: number) => void;
  commitDragPlacement: (pageX: number, pageY: number) => void;
}

interface GardenCanvasProps {
  mode: CanvasMode;
  onComponentTap?: (component: ComponentData) => void;
  onComponentSelect?: (component: ComponentData) => void;
  selectedComponentId?: string | null;
  onSelectionChange?: (componentId: string | null) => void;
  placingComponent?: ComponentData | null;
  onPlacementComplete?: () => void;
  onPlacementCancel?: () => void;
  testID?: string;
}

const PIXELS_PER_METER = 100;

export const GardenCanvas = React.forwardRef<GardenCanvasRef, GardenCanvasProps>(
  function GardenCanvas(
    {
      mode,
      onComponentTap,
      onComponentSelect,
      selectedComponentId,
      onSelectionChange,
      placingComponent,
      onPlacementComplete,
      onPlacementCancel,
      testID = 'garden-canvas',
    },
    ref
  ): React.JSX.Element {
    const { t } = useTranslation();
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const components = useAllComponents();

    const canvasLayoutRef = useRef<CanvasLayout | null>(null);
    const canvasCenter = { x: windowWidth / 2, y: windowHeight / 3 };

    const { offset, panHandlers } = useCanvasPan({ enabled: !placingComponent });

    const {
      placementPosition, onPlacementTouchStart, onPlacementTouchMove,
      onPlacementTouchEnd, startPlacement, updatePlacementFromPageCoords, commitPlacementFromPageCoords,
    } = usePlacementMode();

    React.useEffect(() => {
      if (placingComponent) startPlacement(placingComponent);
    }, [placingComponent, startPlacement]);

    const handleCanvasLayout = useCallback((event: LayoutChangeEvent) => {
      const target = event.target as any;
      target?.measureInWindow?.((pageX: number, pageY: number, w: number, h: number) => {
        canvasLayoutRef.current = { x: pageX, y: pageY, width: w, height: h };
      });
    }, []);

    const offsetRef = useRef(offset);
    const canvasCenterRef = useRef(canvasCenter);
    React.useEffect(() => { offsetRef.current = offset; }, [offset]);
    React.useEffect(() => { canvasCenterRef.current = canvasCenter; }, [canvasCenter]);

    React.useImperativeHandle(ref, () => ({
      updateDragPlacement: (pageX, pageY) => {
        if (canvasLayoutRef.current) updatePlacementFromPageCoords(pageX, pageY, canvasLayoutRef.current);
      },
      commitDragPlacement: (pageX, pageY) => {
        if (!canvasLayoutRef.current) { onPlacementCancel?.(); return; }
        commitPlacementFromPageCoords(pageX, pageY, canvasLayoutRef.current, offsetRef.current, canvasCenterRef.current, PIXELS_PER_METER);
        onPlacementComplete?.();
      },
    }));

    const handlePlacementTouchStart = useCallback(
      (e: GestureResponderEvent) => onPlacementTouchStart(e),
      [onPlacementTouchStart]
    );
    const handlePlacementTouchMove = useCallback(
      (e: GestureResponderEvent) => onPlacementTouchMove(e, offset, canvasCenter),
      [onPlacementTouchMove, offset, canvasCenter]
    );
    const handlePlacementTouchEnd = useCallback(() => {
      if (placementPosition) { onPlacementTouchEnd(offset, canvasCenter, PIXELS_PER_METER); onPlacementComplete?.(); }
      else { onPlacementCancel?.(); }
    }, [placementPosition, onPlacementTouchEnd, onPlacementComplete, onPlacementCancel, offset, canvasCenter]);

    const handleBackgroundPress = useCallback(() => {
      if (selectedComponentId && !placingComponent) onSelectionChange?.(null);
    }, [selectedComponentId, placingComponent, onSelectionChange]);

    const handleComponentSelect = useCallback((component: ComponentData) => {
      onSelectionChange?.(component.id);
      onComponentSelect?.(component);
    }, [onSelectionChange, onComponentSelect]);

    const visibleComponents = placingComponent
      ? components.filter((c) => c.id !== placingComponent.id)
      : components;

    return (
      <View {...panHandlers} className="flex-1 bg-surface" testID={testID} onLayout={handleCanvasLayout}>
        {placingComponent && (
          <View className="absolute top-2 left-0 right-0 z-10 items-center">
            <View className="bg-green-600 px-4 py-2 rounded-full flex-row items-center">
              <Text className="text-white font-medium mr-2">
                {t('canvas.placementMode', { name: placingComponent.name })}
              </Text>
              <Pressable onPress={onPlacementCancel} className="bg-white/20 rounded-full px-2 py-1" hitSlop={8}>
                <Text className="text-white text-xs">{t('common.cancel')}</Text>
              </Pressable>
            </View>
          </View>
        )}

        <Pressable
          className="flex-1 overflow-hidden"
          onPress={handleBackgroundPress}
          onTouchStart={placingComponent ? handlePlacementTouchStart : undefined}
          onTouchMove={placingComponent ? handlePlacementTouchMove : undefined}
          onTouchEnd={placingComponent ? handlePlacementTouchEnd : undefined}
          testID={`${testID}-container`}
        >
          <View
            style={{ position: 'absolute', left: canvasCenter.x + offset.x, top: canvasCenter.y + offset.y }}
            testID={`${testID}-content`}
          >
            {visibleComponents.map((component) => (
              <DraggableComponent
                key={component.id}
                component={component}
                pixelsPerMeter={PIXELS_PER_METER}
                mode={mode}
                isSelected={component.id === selectedComponentId}
                onSelect={handleComponentSelect}
                onTap={onComponentTap}
              />
            ))}
          </View>

          {placingComponent && placementPosition && (
            <PlacementGhost component={placingComponent} position={placementPosition} pixelsPerMeter={PIXELS_PER_METER} />
          )}
        </Pressable>

        {placingComponent && !placementPosition && (
          <View className="absolute bottom-4 left-0 right-0 items-center">
            <Text className="text-green-400 text-sm">{t('canvas.tapToPlace')}</Text>
          </View>
        )}
      </View>
    );
  }
);
