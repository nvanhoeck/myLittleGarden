/**
 * Custom hook for canvas pan gestures using PanResponder
 */

import { useRef, useState } from 'react';
import { PanResponder } from 'react-native';

interface PanOffset {
  x: number;
  y: number;
}

interface UseCanvasPanOptions {
  initialOffset?: PanOffset;
  enabled?: boolean;
}

interface UseCanvasPanResult {
  offset: PanOffset;
  isPanning: boolean;
  panHandlers: ReturnType<typeof PanResponder.create>['panHandlers'];
  resetOffset: () => void;
  setOffset: (offset: PanOffset) => void;
}

export function useCanvasPan(options: UseCanvasPanOptions = {}): UseCanvasPanResult {
  const { initialOffset = { x: 0, y: 0 }, enabled = true } = options;

  const [offset, setOffsetState] = useState<PanOffset>(initialOffset);
  const [isPanning, setIsPanning] = useState(false);

  const enabledRef = useRef(enabled);
  const startOffsetRef = useRef<PanOffset>(initialOffset);
  const offsetRef = useRef<PanOffset>(initialOffset);

  // Keep refs current every render
  enabledRef.current = enabled;
  offsetRef.current = offset;

  const panResponder = useRef(
    PanResponder.create({
      // Do NOT claim on start — let Pressable handle taps and DraggableComponents handle their own.
      // Claim on move so that a swipe on the background steals from Pressable and pans.
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: () => enabledRef.current,

      onPanResponderGrant: () => {
        startOffsetRef.current = offsetRef.current;
        setIsPanning(true);
      },

      onPanResponderMove: (_, gestureState) => {
        if (!enabledRef.current) return;
        const next = {
          x: startOffsetRef.current.x + gestureState.dx,
          y: startOffsetRef.current.y + gestureState.dy,
        };
        offsetRef.current = next;
        setOffsetState(next);
      },

      onPanResponderRelease: () => {
        setIsPanning(false);
      },

      onPanResponderTerminate: () => {
        setIsPanning(false);
      },
    })
  ).current;

  return {
    offset,
    isPanning,
    panHandlers: panResponder.panHandlers,
    resetOffset: () => setOffsetState(initialOffset),
    setOffset: (newOffset: PanOffset) => setOffsetState(newOffset),
  };
}
