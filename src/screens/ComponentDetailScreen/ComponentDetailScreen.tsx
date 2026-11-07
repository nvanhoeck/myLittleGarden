/**
 * ComponentDetailScreen
 * Zoomed view of a component: the areas of one season, the optimizer and the canvas
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ComponentDetailScreenProps } from '@/navigation/navigationTypes';
import { useComponent, useComponentStore } from '@/stores';
import { useShallow } from 'zustand/react/shallow';
import { usePlantStore } from '@/stores/plantStore';
import { usePlanning } from '@/stores/planningContext';
import { isGardenBox, isPot, isRectangularTower, isCircularTower } from '@/stores/componentStore';
import { SeasonAreaCanvas, LayerOverviewModal } from '@/components/organisms';
import { SeasonTabs, TowerLayerTabs, YearBar } from '@/components/molecules';
import { PlanningButton, Snackbar } from '@/components/atoms';
import { layerBounds, plantingAreaOf, relationsFromCatalog, seasonContaining } from '@/domain/planning';
import type { PlantRelations } from '@/domain/planning';
import type { AreaCanvasView, AreaData, AreaPiece, AreaView, ComponentData, Season } from '@/types';
import { getTowerLayerDimensions } from '@/domain/component/towerLayerGeometry';
import { useAiChatStore } from '@/stores/ai/aiChatStore';
import { CanvasEditActions } from './CanvasEditActions';
import { buildAreaCanvas, iconPxFor, resizeHandlePoint, snappedResize } from './areaCanvasViewModel';
import { buildSeasonTabs, defaultSeasonFor, optimizeResultMessage, planningYearRange } from './seasonViewModel';
import { seasonLabel } from '../shared/seasonLabels';
import type { Translate } from '../shared/seasonLabels';

/** How long the result snackbar stays */
const SNACKBAR_DURATION_MS = 4000;
/** Lets the busy spinner render before the optimizer takes the JS thread */
const OPTIMIZE_DEFER_MS = 50;
const NO_AREAS: AreaCanvasView = { areas: [], edgeMarkers: [] };
const NO_RELATIONS: PlantRelations = () => 'neutral';

function getComponentDimensions(component: ComponentData): { width: number; height: number } {
  if (isGardenBox(component) || isRectangularTower(component)) {
    return { width: component.widthInCm, height: component.lengthInCm };
  }
  if (isPot(component) || isCircularTower(component)) {
    return { width: component.diameterInCm, height: component.diameterInCm };
  }
  return { width: 100, height: 100 };
}

function getInnerDimensions(component: ComponentData): { width: number; height: number } {
  const outer = getComponentDimensions(component);
  const border = component.borderWidthInCm * 2;
  return { width: Math.max(0, outer.width - border), height: Math.max(0, outer.height - border) };
}

export function ComponentDetailScreen({ navigation, route }: ComponentDetailScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const translate = useCallback<Translate>((key, options) => t(key, options), [t]);
  const { componentId } = route.params;
  const component = useComponent(componentId);
  const getPlantById = usePlantStore((state) => state.getPlantById);
  const actions = useComponentStore(
    useShallow((state) => ({
      optimizeSeason: state.optimizeSeason,
      moveArea: state.moveArea,
      resizeArea: state.resizeArea,
      removeArea: state.removeArea,
      toggleAreaLock: state.toggleAreaLock,
      setAllAreasLocked: state.setAllAreasLocked,
    })),
  );

  const today = useMemo(() => seasonContaining(new Date()), []);
  const [year, setYear] = useState(today.year);
  const [season, setSeason] = useState<Season>(() => defaultSeasonFor(today.year, today));
  const [selectedLayer, setSelectedLayer] = useState(0);
  const [showLayerOverview, setShowLayerOverview] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const optimizingRef = useRef(false);
  const optimizeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const snackbarTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isTower = component ? isRectangularTower(component) || isCircularTower(component) : false;
  const numberOfLayers = component && (isRectangularTower(component) || isCircularTower(component)) ? component.numberOfLayers : 1;
  const planningLayer = isTower ? selectedLayer : undefined;

  const planning = usePlanning(component, year);
  const layer = useMemo(() => (component ? plantingAreaOf(component, planningLayer) : null), [component, planningLayer]);
  const nameOf = useCallback((plantId: string) => getPlantById(plantId)?.nameNl ?? t('componentDetail.unknownPlant'), [getPlantById, t]);
  const relations = useMemo(
    () => (planning ? relationsFromCatalog(planning.plants.flatMap((plantId) => getPlantById(plantId) ?? [])) : NO_RELATIONS),
    [planning, getPlantById],
  );

  const canvasView = useMemo((): AreaCanvasView => {
    if (!planning || !layer) return NO_AREAS;
    const onLayer = (area: AreaData): boolean => planningLayer === undefined || (area.layerIndex ?? 0) === planningLayer;
    return buildAreaCanvas({
      own: planning.areasIn(season).filter(onLayer),
      carried: planning.carriedAreasIn(season).filter(onLayer),
      layer,
      plantOf: getPlantById,
      nameOf,
      relations,
      carriedLabelOf: (area) => {
        const start = planning.plantingById(area.plantingId)?.startSeason;
        return start ? t('componentDetail.carriedFrom', { season: seasonLabel(start, translate).toLowerCase() }) : '';
      },
      t: translate,
    });
  }, [planning, layer, season, planningLayer, getPlantById, nameOf, relations, t, translate]);

  // Every layer's areas of the season, for the tower layer overview
  const seasonAreas = useMemo(
    () => (planning ? [...planning.carriedAreasIn(season), ...planning.areasIn(season)] : []),
    [planning, season],
  );
  const tabs = useMemo(() => (planning ? buildSeasonTabs(planning, translate) : []), [planning, translate]);
  const status = planning?.statusOf(season) ?? 'notPlanned';
  const canOptimize = (planning?.plantingsStartingIn(season).length ?? 0) > 0;

  const yearRange = useMemo(
    () => planningYearRange(today.year, component ? Object.keys(component.plannings).map(Number) : []),
    [today.year, component],
  );

  const innerDimensions = useMemo(() => (component ? getInnerDimensions(component) : { width: 0, height: 0 }), [component]);
  const layerDimensions = useMemo(
    () => (isTower ? getTowerLayerDimensions(innerDimensions.width, innerDimensions.height, selectedLayer) : innerDimensions),
    [isTower, innerDimensions, selectedLayer],
  );

  const selectedArea = canvasView.areas.find((area) => area.id === selectedAreaId && !area.dimmed);

  // A selection of an area that is no longer drawn is dropped
  useEffect(() => {
    if (selectedAreaId !== null && selectedArea === undefined) setSelectedAreaId(null);
  }, [selectedAreaId, selectedArea]);

  useEffect(() => () => {
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
    if (optimizeTimer.current) clearTimeout(optimizeTimer.current);
  }, []);

  const changeYear = useCallback(
    (nextYear: number) => {
      setYear(nextYear);
      setSeason(defaultSeasonFor(nextYear, today));
    },
    [today],
  );

  // Show the spinner first, then run the layout on the JS thread
  const handleOptimize = useCallback(() => {
    if (optimizingRef.current) return;
    optimizingRef.current = true;
    setOptimizing(true);
    optimizeTimer.current = setTimeout(() => {
      try {
        const shares = actions.optimizeSeason(componentId, year, season);
        if (shares === null) return;
        setResultMessage(optimizeResultMessage(shares, nameOf, translate));
        if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
        snackbarTimer.current = setTimeout(() => setResultMessage(null), SNACKBAR_DURATION_MS);
      } finally {
        optimizingRef.current = false;
        setOptimizing(false);
      }
    }, OPTIMIZE_DEFER_MS);
  }, [actions, componentId, year, season, nameOf, translate]);

  const handleOpenChat = useCallback(() => {
    const store = useAiChatStore.getState();
    if (store.chatMode !== 'normal') store.clearMessages();
    store.setChatMode('normal');
    navigation.navigate('AiChat');
  }, [navigation]);

  const handleToggleEditMode = useCallback(() => {
    setSelectedAreaId(null);
    setIsEditMode((previous) => !previous);
  }, []);

  const handleAreaPress = useCallback(
    (area: AreaView) => {
      if (isEditMode) {
        setSelectedAreaId((current) => (current === area.id ? null : area.id));
      } else {
        navigation.navigate('PlantDetails', { plantId: area.plantId });
      }
    },
    [isEditMode, navigation],
  );

  const handleAreaMove = useCallback(
    (areaId: string, dxCm: number, dyCm: number) => actions.moveArea(componentId, year, season, areaId, dxCm, dyCm),
    [actions, componentId, year, season],
  );

  // The handle's drag snapped to whole plant spacings on top of the current size, inside the layer; null when nothing would change
  const previewResize = useCallback(
    (area: AreaView, pieceIndex: number, deltaWidthCm: number, deltaLengthCm: number) => {
      const piece = area.rects[pieceIndex];
      return piece && layer ? snappedResize(piece, deltaWidthCm, deltaLengthCm, area.resizeStepCm, layerBounds(layer)) : null;
    },
    [layer],
  );

  const handlePointOf = useCallback(
    (piece: AreaPiece, marginCm: number) =>
      layer ? resizeHandlePoint(piece, layer, marginCm) : { xCm: piece.xCm + piece.widthCm, yCm: piece.yCm + piece.lengthCm },
    [layer],
  );

  const handleAreaResize = useCallback(
    (area: AreaView, pieceIndex: number, deltaWidthCm: number, deltaLengthCm: number) => {
      const size = previewResize(area, pieceIndex, deltaWidthCm, deltaLengthCm);
      if (size !== null) actions.resizeArea(componentId, year, season, area.id, pieceIndex, size.widthCm, size.lengthCm);
    },
    [previewResize, actions, componentId, year, season],
  );

  const handleDeleteSelectedArea = useCallback(() => {
    if (!selectedArea) return;
    const { id, plantId } = selectedArea;
    Alert.alert(t('common.delete'), t('componentDetail.removeAreaMessage', { name: nameOf(plantId) }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          actions.removeArea(componentId, year, season, id);
          setSelectedAreaId(null);
        },
      },
    ]);
  }, [selectedArea, t, nameOf, actions, componentId, year, season]);

  const handleBackgroundPress = useCallback(() => setSelectedAreaId(null), []);
  const handleLockAll = useCallback(() => actions.setAllAreasLocked(componentId, year, season, true), [actions, componentId, year, season]);
  const handleUnlockAll = useCallback(() => actions.setAllAreasLocked(componentId, year, season, false), [actions, componentId, year, season]);

  if (!component || !planning || !layer) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-on-surface">{t('componentDetail.notFound')}</Text>
        <Pressable onPress={() => navigation.goBack()} className="mt-4 px-4 py-2 bg-green-600 rounded-lg">
          <Text className="text-white">{t('common.back')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const dimensions = getComponentDimensions(component);
  const hasAreas = canvasView.areas.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-background" testID="component-detail-screen">
      {/* Header */}
      <View className="flex-row items-center px-4 h-14 border-b border-gray-800">
        <Pressable
          onPress={() => navigation.goBack()}
          className="w-10 h-10 items-center justify-center rounded-full mr-2"
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Text className="text-white text-2xl">←</Text>
        </Pressable>
        <View className="flex-1">
          <Text className="text-white text-lg font-semibold" numberOfLines={1}>{component.name}</Text>
          <Text className="text-gray-400 text-xs" numberOfLines={1}>
            {t('componentDetail.sizeSubtitle', {
              outerWidth: dimensions.width,
              outerLength: dimensions.height,
              innerWidth: innerDimensions.width,
              innerLength: innerDimensions.height,
            })}
          </Text>
        </View>
        <Pressable
          onPress={handleOpenChat}
          className="bg-blue-600 w-10 h-10 rounded-full items-center justify-center"
          android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
          testID="ai-tuinhulp-button"
          accessibilityLabel="AI Tuinhulp"
          accessibilityRole="button"
        >
          <Text className="text-lg">🤖</Text>
        </Pressable>
      </View>

      <View className="flex-row items-center h-10 px-2 border-b border-gray-800">
        <YearBar
          year={year}
          onPrev={() => changeYear(year - 1)}
          onNext={() => changeYear(year + 1)}
          canPrev={year > yearRange.first}
          canNext={year < yearRange.last}
          previousLabel={t('planning.year.previous')}
          nextLabel={t('planning.year.next')}
        />
      </View>

      <SeasonTabs tabs={tabs} selected={season} onSelect={setSeason} />

      {status === 'outdated' && (
        <View className="flex-row items-center px-4 py-2 bg-orange-900/40 border-b border-orange-700" testID="outdated-banner">
          <Text className="flex-1 text-white text-sm">{t('componentDetail.outdated')}</Text>
          <Pressable
            onPress={handleOptimize}
            disabled={optimizing}
            className={`h-12 px-3 items-center justify-center ${optimizing ? 'opacity-40' : ''}`}
            accessibilityRole="button"
            accessibilityState={{ disabled: optimizing, busy: optimizing }}
            testID="reoptimize-button"
          >
            <Text className="text-label-large text-primary-container">{t('componentDetail.reoptimize')}</Text>
          </Pressable>
        </View>
      )}

      {isTower && (
        <View className="flex-row items-center border-b border-gray-800 bg-gray-900/30">
          <View className="flex-1">
            <TowerLayerTabs
              numberOfLayers={numberOfLayers}
              selectedLayer={selectedLayer}
              onLayerSelect={(next) => {
                setSelectedLayer(next);
                setShowLayerOverview(false);
              }}
              onOverviewPress={() => setShowLayerOverview(true)}
            />
          </View>
          <Text className="text-gray-500 text-xs pr-4">
            {t('componentDetail.layer')} {selectedLayer + 1}: {layerDimensions.width.toFixed(0)} x {layerDimensions.height.toFixed(0)} cm
          </Text>
        </View>
      )}

      <View className="flex-1 p-2">
        <SeasonAreaCanvas
          layer={layer}
          view={canvasView}
          isEditMode={isEditMode}
          selectedAreaId={selectedArea?.id ?? null}
          onAreaPress={handleAreaPress}
          onAreaMove={handleAreaMove}
          onAreaResize={handleAreaResize}
          previewResize={previewResize}
          handlePointOf={handlePointOf}
          iconPxOf={iconPxFor}
          onBackgroundPress={handleBackgroundPress}
          onToggleEditMode={handleToggleEditMode}
          onLockAll={handleLockAll}
          onUnlockAll={handleUnlockAll}
        />
        {!hasAreas && (
          <View pointerEvents="none" className="absolute top-3 left-4 right-4 items-center">
            <Text className="text-gray-400 text-xs text-center bg-black/50 px-2 py-1 rounded">{t('componentDetail.emptySeason')}</Text>
          </View>
        )}
        {hasAreas && (
          <View pointerEvents="none" className="absolute top-3 left-0 right-0 items-center">
            <Text className="text-gray-400 text-xs text-center bg-black/50 px-2 py-0.5 rounded">
              {isEditMode ? t('planning.hint.edit') : t('planning.hint.view')}
            </Text>
          </View>
        )}
        {isEditMode && (
          <CanvasEditActions
            hasSelection={selectedArea !== undefined}
            isLocked={selectedArea?.locked ?? false}
            onDelete={handleDeleteSelectedArea}
            onToggleLock={() => {
              if (!selectedArea) return;
              actions.toggleAreaLock(componentId, year, season, selectedArea.id);
            }}
          />
        )}
        <Snackbar visible={resultMessage !== null} message={resultMessage ?? ''} testID="optimize-snackbar" />
      </View>

      {/* Action bar: [Planning] [Optimaliseren] */}
      <View className="flex-row items-center h-14 px-4 gap-3 border-t border-gray-800 bg-background">
        <PlanningButton
          label={t('componentDetail.planning')}
          variant="tonal"
          disabled={false}
          onPress={() => navigation.navigate('Planning', { componentId, year })}
          testID="open-planning-button"
        />
        <PlanningButton
          label={t('componentDetail.optimize')}
          variant="tonal"
          disabled={!canOptimize}
          loading={optimizing}
          onPress={handleOptimize}
          testID="optimize-button"
        />
      </View>

      {isTower && (
        <LayerOverviewModal
          visible={showLayerOverview}
          onClose={() => setShowLayerOverview(false)}
          component={component}
          areas={seasonAreas}
        />
      )}
    </SafeAreaView>
  );
}
