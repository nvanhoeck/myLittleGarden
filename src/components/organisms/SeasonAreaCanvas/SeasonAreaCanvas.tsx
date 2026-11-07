/**
 * SeasonAreaCanvas
 * One season of a component (or tower layer) as planting areas, scaled to fit.
 * Each area piece is a rounded rectangle tinted by plant category; plant icons
 * are drawn only for areas of at most 50 plants (the view model decides), so a
 * 15 x 20 m component costs a few dozen elements. Carried areas are dimmed and
 * not interactive. In edit mode an area is dragged to move it, tapped to select
 * it, and the selected area's first piece has a corner handle to resize it.
 * Purely presentational: every change goes out through a callback.
 *
 * BEM contract (src/styles/planning/season.css): .season-area-canvas, __drawing, __layer;
 * .season-area, --dimmed, --selected, --warning, __warning, __label, __label-text, __carried-label, __icon,
 * __resize-handle, __resize-preview, __edge-marker, --companion, --combative;
 * .season-area-toolbar, __button, __button--active, __text
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AreaPlantIcon, categoryTint } from '@/components/molecules/AreaShapes';
import type { AreaCanvasView, AreaPiece, AreaView, EdgeMarkerView } from '@/types';

/** A drag shorter than this (px) is a tap */
const TAP_SLOP_PX = 6;
const HANDLE_PX = 28;
const MARKER_PX = 12;
/** After a released drag, how long the store has to redraw the area before a refused move snaps back */
const REFUSED_MOVE_CHECK_MS = 150;

type LayerShape = { readonly shape: 'rectangle'; readonly widthCm: number; readonly lengthCm: number } | { readonly shape: 'circle'; readonly diameterCm: number };

interface SeasonAreaCanvasProps {
  layer: LayerShape;
  view: AreaCanvasView;
  isEditMode: boolean;
  selectedAreaId: string | null;
  /** View mode: open the plant; edit mode: select the area */
  onAreaPress: (area: AreaView) => void;
  /** Edit mode: an area was dragged by (dx, dy) cm */
  onAreaMove: (areaId: string, dxCm: number, dyCm: number) => void;
  /**
   * Edit mode: a resize drag (beyond the tap slop) ended. The canvas passes
   * the drag in cm; the caller snaps it and decides whether anything changed.
   */
  onAreaResize: (area: AreaView, pieceIndex: number, deltaWidthCm: number, deltaLengthCm: number) => void;
  /** The snapped size a resize drag would give, for the preview; null = unchanged */
  previewResize: (area: AreaView, pieceIndex: number, deltaWidthCm: number, deltaLengthCm: number) => { widthCm: number; lengthCm: number } | null;
  /** Where a piece's resize handle sits (cm), at least marginCm inside the layer */
  handlePointOf: (piece: AreaPiece, marginCm: number) => { xCm: number; yCm: number };
  /** The icon size (px) for a plant square of iconSizeCm, or null when too small to draw */
  iconPxOf: (iconSizeCm: number, pxPerCm: number) => number | null;
  onBackgroundPress: () => void;
  onToggleEditMode: () => void;
  onLockAll: () => void;
  onUnlockAll: () => void;
}

function boundsOf(layer: LayerShape): { widthCm: number; lengthCm: number } {
  return layer.shape === 'rectangle' ? { widthCm: layer.widthCm, lengthCm: layer.lengthCm } : { widthCm: layer.diameterCm, lengthCm: layer.diameterCm };
}

interface AreaItemProps {
  area: AreaView;
  scale: number;
  editable: boolean;
  selected: boolean;
  lockedLabel: string;
  resizeLabel: string;
  onPress: (area: AreaView) => void;
  onMove: (areaId: string, dxCm: number, dyCm: number) => void;
  onResize: SeasonAreaCanvasProps['onAreaResize'];
  previewResize: SeasonAreaCanvasProps['previewResize'];
  handlePointOf: SeasonAreaCanvasProps['handlePointOf'];
  iconPxOf: SeasonAreaCanvasProps['iconPxOf'];
}

/** The resize handle on the corner of a piece, with a dashed preview of the snapped size while dragging */
function ResizeHandle({
  area,
  piece,
  scale,
  label,
  onResize,
  previewResize,
  handlePointOf,
}: {
  area: AreaView;
  piece: AreaPiece;
  scale: number;
  label: string;
  onResize: SeasonAreaCanvasProps['onAreaResize'];
  previewResize: SeasonAreaCanvasProps['previewResize'];
  handlePointOf: SeasonAreaCanvasProps['handlePointOf'];
}): React.JSX.Element {
  const [preview, setPreview] = useState<{ widthCm: number; lengthCm: number } | null>(null);
  const latest = useRef({ area, scale, onResize, previewResize });
  latest.current = { area, scale, onResize, previewResize };

  const responder = useMemo(() => {
    // A tap or a jitter within the slop is no drag: nothing changes
    const isTap = (dx: number, dy: number): boolean => Math.abs(dx) < TAP_SLOP_PX && Math.abs(dy) < TAP_SLOP_PX;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => {
        const { area: a, scale: s, previewResize: snap } = latest.current;
        setPreview(isTap(g.dx, g.dy) ? null : snap(a, 0, g.dx / s, g.dy / s));
      },
      onPanResponderRelease: (_, g) => {
        setPreview(null);
        if (isTap(g.dx, g.dy)) return;
        const { area: a, scale: s, onResize: resize } = latest.current;
        resize(a, 0, g.dx / s, g.dy / s);
      },
      onPanResponderTerminate: () => setPreview(null),
    });
  }, []);

  const handle = handlePointOf(piece, HANDLE_PX / 2 / scale);
  return (
    <>
      {preview !== null && (
        <View
          pointerEvents="none"
          className="absolute border-2 border-dashed border-white rounded-md"
          style={{ left: piece.xCm * scale, top: piece.yCm * scale, width: preview.widthCm * scale, height: preview.lengthCm * scale }}
        />
      )}
      <View
        {...responder.panHandlers}
        className="absolute w-7 h-7 rounded-full bg-white items-center justify-center"
        style={{ left: handle.xCm * scale - HANDLE_PX / 2, top: handle.yCm * scale - HANDLE_PX / 2 }}
        hitSlop={8}
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        testID="season-area-resize"
      >
        <Text className="text-black text-xs font-bold">◢</Text>
      </View>
    </>
  );
}

const AreaItem = React.memo(function AreaItem({
  area,
  scale,
  editable,
  selected,
  lockedLabel,
  resizeLabel,
  onPress,
  onMove,
  onResize,
  previewResize,
  handlePointOf,
  iconPxOf,
}: AreaItemProps): React.JSX.Element {
  const pan = useRef(new Animated.ValueXY()).current;
  const latest = useRef({ area, scale, editable, onPress, onMove });
  latest.current = { area, scale, editable, onPress, onMove };
  const refusedCheck = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A moved area keeps its drag offset until it is drawn at its new place: no flicker back.
  // Reset before paint, so the new place is never drawn with the old offset on top
  useLayoutEffect(() => {
    pan.setValue({ x: 0, y: 0 });
  }, [area.rects, pan]);

  useEffect(() => () => {
    if (refusedCheck.current) clearTimeout(refusedCheck.current);
  }, []);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !latest.current.area.dimmed,
        onPanResponderTerminationRequest: () => !latest.current.editable,
        onPanResponderMove: (_, g) => {
          if (latest.current.editable) pan.setValue({ x: g.dx, y: g.dy });
        },
        onPanResponderRelease: (_, g) => {
          const current = latest.current;
          if (Math.abs(g.dx) < TAP_SLOP_PX && Math.abs(g.dy) < TAP_SLOP_PX) {
            pan.setValue({ x: 0, y: 0 });
            current.onPress(current.area);
            return;
          }
          if (!current.editable) {
            pan.setValue({ x: 0, y: 0 });
            return;
          }
          const rectsBefore = current.area.rects;
          current.onMove(current.area.id, Math.round(g.dx / current.scale), Math.round(g.dy / current.scale));
          // A refused move leaves the area where it was: snap back once the store had its say
          if (refusedCheck.current) clearTimeout(refusedCheck.current);
          refusedCheck.current = setTimeout(() => {
            if (latest.current.area.rects === rectsBefore) pan.setValue({ x: 0, y: 0 });
          }, REFUSED_MOVE_CHECK_MS);
        },
        onPanResponderTerminate: () => pan.setValue({ x: 0, y: 0 }),
      }),
    [pan],
  );

  const tint = categoryTint(area.category);
  const iconPx = iconPxOf(area.iconSizeCm, scale);
  const testID = area.dimmed ? `carried-area-${area.plantId}` : `season-area-${area.plantId}`;
  const first = area.rects[0];

  return (
    <Animated.View
      pointerEvents={area.dimmed ? 'none' : 'box-none'}
      style={[StyleSheet.absoluteFill, { transform: pan.getTranslateTransform() }, area.dimmed && styles.dimmed]}
    >
      {area.rects.map((piece, index) => (
        <View
          key={index}
          {...responder.panHandlers}
          className={`absolute rounded-md overflow-hidden ${selected ? 'border-2 border-white' : area.warningLabel !== null ? 'border-2 border-red-500' : 'border border-white/30'}`}
          style={{
            left: piece.xCm * scale,
            top: piece.yCm * scale,
            width: piece.widthCm * scale,
            height: piece.lengthCm * scale,
            backgroundColor: tint,
          }}
          accessible={index === 0}
          accessibilityRole="button"
          accessibilityLabel={`${area.label}${area.locked ? lockedLabel : ''}${area.warningLabel !== null ? `, ${area.warningLabel}` : ''}`}
          accessibilityState={{ selected }}
          testID={index === 0 ? testID : undefined}
        >
          {index === 0 && (
            <>
              <View className="flex-row items-center self-start m-0.5 px-1 rounded bg-black/50">
                {area.warningLabel !== null && (
                  <Text
                    className="text-red-400 text-[10px] font-bold mr-0.5"
                    accessibilityLabel={area.warningLabel}
                    testID={`area-warning-${area.plantId}`}
                  >
                    ⚠
                  </Text>
                )}
                {(area.icons.length === 0 || iconPx === null) && <AreaPlantIcon plantId={area.plantId} category={area.category} size={10} />}
                <Text className="text-white text-[10px] font-medium" numberOfLines={1}>
                  {area.locked ? '🔒 ' : ''}
                  {area.label}
                </Text>
              </View>
              {area.carriedLabel !== null && <Text className="text-gray-200 text-[9px] italic px-1">{area.carriedLabel}</Text>}
            </>
          )}
        </View>
      ))}
      {iconPx !== null && area.icons.map((icon, index) => (
        <View
          key={index}
          pointerEvents="none"
          className="absolute items-center justify-center"
          style={{ left: icon.xCm * scale - iconPx / 2, top: icon.yCm * scale - iconPx / 2, width: iconPx, height: iconPx }}
        >
          <AreaPlantIcon plantId={area.plantId} category={area.category} size={iconPx} />
        </View>
      ))}
      {editable && selected && first !== undefined && (
        <ResizeHandle
          area={area}
          piece={first}
          scale={scale}
          label={resizeLabel}
          onResize={onResize}
          previewResize={previewResize}
          handlePointOf={handlePointOf}
        />
      )}
    </Animated.View>
  );
});

function EdgeMarker({ marker, scale }: { marker: EdgeMarkerView; scale: number }): React.JSX.Element {
  return (
    <View
      pointerEvents="none"
      className={`absolute w-3 h-3 rounded-full border border-white ${marker.kind === 'companion' ? 'bg-green-500' : 'bg-red-500'}`}
      style={{ left: marker.xCm * scale - MARKER_PX / 2, top: marker.yCm * scale - MARKER_PX / 2 }}
      testID={`area-relation-${marker.kind}`}
    />
  );
}

function ToolbarButton({ label, active = false, onPress, testID }: { label: string; active?: boolean; onPress: () => void; testID: string }): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center px-3 h-10 rounded-lg ${active ? 'bg-green-700/40 border border-green-600' : 'bg-black/60'}`}
      android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
      accessibilityRole="button"
      testID={testID}
    >
      <Text className="text-white text-xs font-medium">{label}</Text>
    </Pressable>
  );
}

export function SeasonAreaCanvas({
  layer,
  view,
  isEditMode,
  selectedAreaId,
  onAreaPress,
  onAreaMove,
  onAreaResize,
  previewResize,
  handlePointOf,
  iconPxOf,
  onBackgroundPress,
  onToggleEditMode,
  onLockAll,
  onUnlockAll,
}: SeasonAreaCanvasProps): React.JSX.Element {
  const { t } = useTranslation();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const bounds = boundsOf(layer);
  const scale = bounds.widthCm > 0 && bounds.lengthCm > 0 && size.width > 0
    ? Math.min(size.width / bounds.widthCm, size.height / bounds.lengthCm)
    : 0;
  const widthPx = bounds.widthCm * scale;
  const heightPx = bounds.lengthCm * scale;

  const handleLayout = (event: LayoutChangeEvent): void => {
    const { width, height } = event.nativeEvent.layout;
    if (width !== size.width || height !== size.height) setSize({ width, height });
  };

  return (
    <View className="flex-1">
      <View className="flex-1 items-center justify-center" onLayout={handleLayout}>
        {scale > 0 && (
          <Pressable
            onPress={onBackgroundPress}
            className="border border-green-700 bg-black/25"
            // A circular layer clips its areas (pieces live in its bounding square) to the circle
            style={{
              width: widthPx,
              height: heightPx,
              borderRadius: layer.shape === 'circle' ? widthPx / 2 : 6,
              overflow: layer.shape === 'circle' ? 'hidden' : 'visible',
            }}
            testID="season-area-canvas"
          >
            {view.areas.map((area) => (
              <AreaItem
                key={area.id}
                area={area}
                scale={scale}
                editable={isEditMode && !area.dimmed}
                selected={area.id === selectedAreaId}
                lockedLabel={t('componentDetail.areaLocked')}
                resizeLabel={t('componentDetail.resizeArea')}
                onPress={onAreaPress}
                onMove={onAreaMove}
                onResize={onAreaResize}
                previewResize={previewResize}
                handlePointOf={handlePointOf}
                iconPxOf={iconPxOf}
              />
            ))}
            {view.edgeMarkers.map((marker) => (
              <EdgeMarker key={marker.key} marker={marker} scale={scale} />
            ))}
          </Pressable>
        )}
      </View>
      <View className="flex-row flex-wrap gap-2 mt-2">
        <ToolbarButton label={`🔒 ${t('componentDetail.lockAll')}`} onPress={onLockAll} testID="canvas-lock-all" />
        <ToolbarButton label={`🔓 ${t('componentDetail.unlockAll')}`} onPress={onUnlockAll} testID="canvas-unlock-all" />
        <ToolbarButton
          label={isEditMode ? `💾 ${t('componentDetail.editDone')}` : `✏️ ${t('componentDetail.edit')}`}
          active={isEditMode}
          onPress={onToggleEditMode}
          testID="canvas-edit-toggle"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dimmed: { opacity: 0.4 },
});
