/**
 * Custom hook for canvas pan gestures
 * Handles panning of the garden canvas with gesture handler
 */

import { useCallback, useState } from 'react';
import type { GestureResponderEvent } from 'react-native';

interface PanOffset {
  x: number;
  y: number;
}

interface UseCanvasPanOptions {
  /** Initial offset */
  initialOffset?: PanOffset;
  /** Minimum allowed offset (for bounds) */
  minOffset?: PanOffset;
  /** Maximum allowed offset (for bounds) */
  maxOffset?: PanOffset;
  /** Whether panning is enabled */
  enabled?: boolean;
}

interface UseCanvasPanResult {
  /** Current pan offset */
  offset: PanOffset;
  /** Whether user is currently panning */
  isPanning: boolean;
  /** Handler for touch start */
  onTouchStart: (event: GestureResponderEvent) => void;
  /** Handler for touch move */
  onTouchMove: (event: GestureResponderEvent) => void;
  /** Handler for touch end */
  onTouchEnd: () => void;
  /** Reset offset to initial position */
  resetOffset: () => void;
  /** Set offset programmatically */
  setOffset: (offset: PanOffset) => void;
}

/**
 * Hook for handling canvas pan gestures
 * Uses simple touch events for compatibility
 */
export function useCanvasPan(options: UseCanvasPanOptions = {}): UseCanvasPanResult {
  const {
    initialOffset = { x: 0, y: 0 },
    minOffset,
    maxOffset,
    enabled = true,
  } = options;

  const [offset, setOffset] = useState<PanOffset>(initialOffset);
  const [isPanning, setIsPanning] = useState(false);
  const [startTouch, setStartTouch] = useState<PanOffset | null>(null);
  const [startOffset, setStartOffset] = useState<PanOffset>(initialOffset);

  const clampOffset = useCallback(
    (newOffset: PanOffset): PanOffset => {
      let clampedX = newOffset.x;
      let clampedY = newOffset.y;

      if (minOffset) {
        clampedX = Math.max(clampedX, minOffset.x);
        clampedY = Math.max(clampedY, minOffset.y);
      }
      if (maxOffset) {
        clampedX = Math.min(clampedX, maxOffset.x);
        clampedY = Math.min(clampedY, maxOffset.y);
      }

      return { x: clampedX, y: clampedY };
    },
    [minOffset, maxOffset]
  );

  const onTouchStart = useCallback(
    (event: GestureResponderEvent) => {
      if (!enabled) return;

      const touch = event.nativeEvent;
      setStartTouch({ x: touch.pageX, y: touch.pageY });
      setStartOffset(offset);
      setIsPanning(true);
    },
    [enabled, offset]
  );

  const onTouchMove = useCallback(
    (event: GestureResponderEvent) => {
      if (!enabled || !startTouch || !isPanning) return;

      const touch = event.nativeEvent;
      const deltaX = touch.pageX - startTouch.x;
      const deltaY = touch.pageY - startTouch.y;

      const newOffset = clampOffset({
        x: startOffset.x + deltaX,
        y: startOffset.y + deltaY,
      });

      setOffset(newOffset);
    },
    [enabled, startTouch, startOffset, isPanning, clampOffset]
  );

  const onTouchEnd = useCallback(() => {
    setIsPanning(false);
    setStartTouch(null);
  }, []);

  const resetOffset = useCallback(() => {
    setOffset(initialOffset);
  }, [initialOffset]);

  const setOffsetManual = useCallback(
    (newOffset: PanOffset) => {
      setOffset(clampOffset(newOffset));
    },
    [clampOffset]
  );

  return {
    offset,
    isPanning,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    resetOffset,
    setOffset: setOffsetManual,
  };
}
