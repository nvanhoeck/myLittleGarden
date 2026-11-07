/**
 * SeasonAreaCanvas
 * One season of a component (or tower layer) as planting areas, scaled to fit.
 * Each area piece is a rounded rectangle tinted by plant category; plant icons
 * are drawn only for areas of at most 50 plants (the view model decides), so a
 * 15 x 20 m component costs a few dozen elements. Carried areas are dimmed and
 * not interactive. In edit mode an area is dragged to move it, tapped to select
 * it, and the selected area's first piece has a corner handle to resize it.
 * Roads of a garden box lie under the areas; in edit mode a road is tapped to
 * edit it and every border without a road has a + to add one.
 * Pan and zoom: zoom 1.0 is the scale-to-fit; zoomed in, the drawing scrolls in
 * a vertical ScrollView with a nested horizontal one (only when it is larger
 * than the view) and is centred on every zoom step. Area drags keep the touch
 * (their responder blocks the scroll views in edit mode); dragging the
 * background scrolls.
 * Purely presentational: every change goes out through a callback.
 *
 * BEM contract (src/styles/planning/season.css): .season-area-canvas, __drawing, __layer;
 * .season-area, --dimmed, --selected, --warning, __warning, __label, __label-text, __carried-label, __icon,
 * __resize-handle, __resize-preview, __edge-marker, --companion, --combative;
 * .season-road, __lock; .season-road-add, __text;
 * .season-area-zoom, __button, __button--disabled, __button-text, __button-text--disabled, __level;
 * .season-area-toolbar, __button, __button--active, __text
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AreaPlantIcon, categoryTint, ROAD_TINT } from '@/components/molecules/AreaShapes';
import type { AreaCanvasView, AreaPiece, AreaView, EdgeMarkerView, RoadSlotView, RoadView } from '@/types';

/** A drag shorter than this (px) is a tap */
const TAP_SLOP_PX = 6;
const HANDLE_PX = 28;
const MARKER_PX = 12;
const ROAD_ADD_PX = 28;
/** After a released drag, how long the store has to redraw the area before a refused move snaps back */
const REFUSED_MOVE_CHECK_MS = 150;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;
/** Room around the drawing while it scrolls (px) */
const SCROLL_PADDING_PX = 16;
/** Room around the drawing at zoom 1.0 (px): half a + button or resize handle on the box edge stays visible */
const FIT_MARGIN_PX = ROAD_ADD_PX / 2;
/** Sizes within this (px) of the view still fit */
const FIT_TOLERANCE_PX = 0.5;

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
  /** Edit mode: a road was tapped (garden box only) */
  onRoadPress?: (road: RoadView) => void;
  /** Edit mode: the + on a border was tapped (garden box only) */
  onRoadSlotPress?: (slot: RoadSlotView) => void;
  /** Edit mode: "🛤 Paden" was tapped; the button is shown only when this is given (garden box only) */
  onAutomaticRoads?: () => void;
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
        // In edit mode the area keeps the touch: the scroll views may not take it over
        onPanResponderTerminationRequest: () => !latest.current.editable,
        onShouldBlockNativeResponder: () => latest.current.editable,
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

/** A road under the areas: tappable in edit mode, 🔒 when locked */
function RoadItem({
  road,
  index,
  scale,
  label,
  onPress,
}: {
  road: RoadView;
  index: number;
  scale: number;
  label: string;
  onPress: ((road: RoadView) => void) | undefined;
}): React.JSX.Element {
  const width = road.rect.widthCm * scale;
  const height = road.rect.lengthCm * scale;
  return (
    <Pressable
      onPress={onPress ? () => onPress(road) : undefined}
      disabled={onPress === undefined}
      pointerEvents={onPress === undefined ? 'none' : 'auto'}
      className="absolute items-center justify-center"
      style={{ left: road.rect.xCm * scale, top: road.rect.yCm * scale, width, height, backgroundColor: ROAD_TINT }}
      accessibilityRole={onPress === undefined ? undefined : 'button'}
      accessibilityLabel={label}
      testID={`season-road-${index}`}
    >
      {road.locked && Math.min(width, height) >= 8 && (
        <Text className="text-[8px]" style={{ fontSize: Math.min(10, Math.min(width, height) - 2) }}>🔒</Text>
      )}
    </Pressable>
  );
}

/** The round + on a border without a road */
function RoadSlot({
  slot,
  index,
  scale,
  label,
  onPress,
}: {
  slot: RoadSlotView;
  index: number;
  scale: number;
  label: string;
  onPress: (slot: RoadSlotView) => void;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={() => onPress(slot)}
      className="absolute w-7 h-7 rounded-full bg-amber-100 border border-amber-700 items-center justify-center"
      style={{ left: slot.xCm * scale - ROAD_ADD_PX / 2, top: slot.yCm * scale - ROAD_ADD_PX / 2 }}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={`road-add-${index}`}
    >
      <Text className="text-amber-900 text-base font-bold">+</Text>
    </Pressable>
  );
}

/** + / % / − bottom-left of the canvas */
function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  zoomInLabel,
  zoomOutLabel,
  levelLabel,
}: {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  zoomInLabel: string;
  zoomOutLabel: string;
  levelLabel: string;
}): React.JSX.Element {
  const canZoomIn = zoom < MAX_ZOOM;
  const canZoomOut = zoom > MIN_ZOOM;
  return (
    <View className="absolute bottom-4 left-4 items-center bg-black/60 rounded-lg p-1">
      <Pressable
        onPress={onZoomIn}
        disabled={!canZoomIn}
        className={`w-9 h-9 items-center justify-center rounded-md ${canZoomIn ? 'bg-gray-700' : 'bg-gray-800'}`}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={zoomInLabel}
        accessibilityState={{ disabled: !canZoomIn }}
        testID="canvas-zoom-in"
      >
        <Text className={`text-xl font-semibold ${canZoomIn ? 'text-white' : 'text-gray-500'}`}>+</Text>
      </Pressable>
      <Text className="text-gray-400 text-[10px] my-1" accessibilityLabel={levelLabel} testID="canvas-zoom-level">
        {Math.round(zoom * 100)}%
      </Text>
      <Pressable
        onPress={onZoomOut}
        disabled={!canZoomOut}
        className={`w-9 h-9 items-center justify-center rounded-md ${canZoomOut ? 'bg-gray-700' : 'bg-gray-800'}`}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={zoomOutLabel}
        accessibilityState={{ disabled: !canZoomOut }}
        testID="canvas-zoom-out"
      >
        <Text className={`text-xl font-semibold ${canZoomOut ? 'text-white' : 'text-gray-500'}`}>−</Text>
      </Pressable>
    </View>
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
  onRoadPress,
  onRoadSlotPress,
  onAutomaticRoads,
}: SeasonAreaCanvasProps): React.JSX.Element {
  const { t } = useTranslation();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const verticalScroll = useRef<ScrollView>(null);
  const horizontalScroll = useRef<ScrollView>(null);
  const bounds = boundsOf(layer);
  // Zoom 1.0 is the scale-to-fit, leaving room for the half of a + or handle that sticks out of the box edge
  const fitScale = bounds.widthCm > 0 && bounds.lengthCm > 0 && size.width > 2 * FIT_MARGIN_PX && size.height > 2 * FIT_MARGIN_PX
    ? Math.min((size.width - 2 * FIT_MARGIN_PX) / bounds.widthCm, (size.height - 2 * FIT_MARGIN_PX) / bounds.lengthCm)
    : 0;
  const scale = fitScale * zoom;
  const widthPx = bounds.widthCm * scale;
  const heightPx = bounds.lengthCm * scale;
  const needsScrolling = widthPx > size.width + FIT_TOLERANCE_PX || heightPx > size.height + FIT_TOLERANCE_PX;
  // Centred while it fits, a small margin while it scrolls
  const paddingX = needsScrolling ? SCROLL_PADDING_PX : Math.max(0, (size.width - widthPx) / 2);
  const paddingY = needsScrolling ? SCROLL_PADDING_PX : Math.max(0, (size.height - heightPx) / 2);

  const handleLayout = (event: LayoutChangeEvent): void => {
    const { width, height } = event.nativeEvent.layout;
    if (width !== size.width || height !== size.height) setSize({ width, height });
  };

  // Every zoom step shows the middle of the drawing
  useEffect(() => {
    if (!needsScrolling) return;
    const x = Math.max(0, (widthPx + 2 * SCROLL_PADDING_PX - size.width) / 2);
    const y = Math.max(0, (heightPx + 2 * SCROLL_PADDING_PX - size.height) / 2);
    horizontalScroll.current?.scrollTo({ x, y: 0, animated: false });
    verticalScroll.current?.scrollTo({ x: 0, y, animated: false });
  }, [zoom, needsScrolling, widthPx, heightPx, size.width, size.height]);

  const zoomIn = (): void => setZoom((previous) => Math.min(MAX_ZOOM, previous + ZOOM_STEP));
  const zoomOut = (): void => setZoom((previous) => Math.max(MIN_ZOOM, previous - ZOOM_STEP));
  const roadsEditable = isEditMode && onRoadPress !== undefined;

  return (
    <View className="flex-1">
      <View className="flex-1" onLayout={handleLayout}>
        {scale > 0 && (
          <ScrollView
            ref={verticalScroll}
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1, paddingVertical: paddingY }}
            scrollEnabled={needsScrolling}
            showsVerticalScrollIndicator={needsScrolling}
            nestedScrollEnabled
            testID="season-area-scroll"
          >
            <ScrollView
              ref={horizontalScroll}
              horizontal
              contentContainerStyle={{ flexGrow: 1, paddingHorizontal: paddingX, alignItems: 'center' }}
              scrollEnabled={needsScrolling}
              showsHorizontalScrollIndicator={needsScrolling}
              nestedScrollEnabled
            >
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
                {view.roads.map((road, index) => (
                  <RoadItem
                    key={road.id}
                    road={road}
                    index={index}
                    scale={scale}
                    label={`${t('componentDetail.roadA11y', { width: Math.round(Math.min(road.rect.widthCm, road.rect.lengthCm)) })}${road.locked ? t('componentDetail.areaLocked') : ''}`}
                    onPress={roadsEditable ? onRoadPress : undefined}
                  />
                ))}
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
                {isEditMode && onRoadSlotPress !== undefined && view.roadSlots.map((slot, index) => (
                  <RoadSlot
                    key={slot.key}
                    slot={slot}
                    index={index}
                    scale={scale}
                    label={t('componentDetail.roadAdd')}
                    onPress={onRoadSlotPress}
                  />
                ))}
              </Pressable>
            </ScrollView>
          </ScrollView>
        )}
        {scale > 0 && (
          <ZoomControls
            zoom={zoom}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            zoomInLabel={t('componentDetail.zoomIn')}
            zoomOutLabel={t('componentDetail.zoomOut')}
            levelLabel={t('componentDetail.zoomLevel', { percent: Math.round(zoom * 100) })}
          />
        )}
      </View>
      <View className="flex-row flex-wrap gap-2 mt-2">
        <ToolbarButton label={`🔒 ${t('componentDetail.lockAll')}`} onPress={onLockAll} testID="canvas-lock-all" />
        <ToolbarButton label={`🔓 ${t('componentDetail.unlockAll')}`} onPress={onUnlockAll} testID="canvas-unlock-all" />
        {isEditMode && onAutomaticRoads !== undefined && (
          <ToolbarButton label={`🛤 ${t('componentDetail.roadsAuto')}`} onPress={onAutomaticRoads} testID="canvas-roads-auto" />
        )}
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
