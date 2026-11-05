/**
 * ComponentDetailScreen
 * Zoomed view of a component: the plants of one season, the optimizer and the canvas
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
import { PlantPlacementCanvas, LayerOverviewModal } from '@/components/organisms';
import { SeasonTabs, TowerLayerTabs, YearBar } from '@/components/molecules';
import { PlanningButton, Snackbar } from '@/components/atoms';
import { seasonContaining } from '@/domain/planning';
import type { ComponentData, PlacedPlantData, Season } from '@/types';
import { getTowerLayerDimensions } from '@/domain/component/towerLayerGeometry';
import { useAiChatStore } from '@/stores/ai/aiChatStore';
import { CanvasEditActions } from './CanvasEditActions';
import { buildSeasonTabs, defaultSeasonFor, optimizeResultMessage, planningYearRange } from './seasonViewModel';
import { seasonLabel } from '../shared/seasonLabels';
import type { Translate } from '../shared/seasonLabels';
import { useSeasonCanvas } from './useSeasonCanvas';

/** How long the result snackbar stays */
const SNACKBAR_DURATION_MS = 4000;

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
      movePlacement: state.movePlacement,
      removePlacement: state.removePlacement,
      togglePlacementLock: state.togglePlacementLock,
      setAllPlacementsLocked: state.setAllPlacementsLocked,
      resizePatch: state.resizePatch,
    })),
  );

  const today = useMemo(() => seasonContaining(new Date()), []);
  const [year, setYear] = useState(today.year);
  const [season, setSeason] = useState<Season>(() => defaultSeasonFor(today.year, today));
  const [selectedLayer, setSelectedLayer] = useState(0);
  const [showLayerOverview, setShowLayerOverview] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const [selectedPlantInstance, setSelectedPlantInstance] = useState<{ id: string; name: string } | null>(null);
  const [patchEditPlantId, setPatchEditPlantId] = useState<string | null>(null);
  const [patchEditOriginal, setPatchEditOriginal] = useState<{ widthInCm: number; heightInCm: number; rotationDeg: number } | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const snackbarTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isTower = component ? isRectangularTower(component) || isCircularTower(component) : false;
  const numberOfLayers = component && (isRectangularTower(component) || isCircularTower(component)) ? component.numberOfLayers : 1;
  const planningLayer = isTower ? selectedLayer : undefined;

  const planning = usePlanning(component, year);
  const canvas = useSeasonCanvas(component, planning, season, planningLayer);
  // Every layer's plants of the season, for the tower layer overview
  const seasonPlants = useMemo(
    () => (planning ? [...planning.carriedPlacementsIn(season), ...planning.placementsIn(season)] : []),
    [planning, season],
  );
  const tabs = useMemo(() => (planning ? buildSeasonTabs(planning, translate) : []), [planning, translate]);
  const status = planning?.statusOf(season) ?? 'notPlanned';
  const canOptimize = (planning?.plantsStartingIn(season).length ?? 0) > 0;

  const yearRange = useMemo(
    () => planningYearRange(today.year, component ? Object.keys(component.plannings).map(Number) : []),
    [today.year, component],
  );

  const innerDimensions = useMemo(() => (component ? getInnerDimensions(component) : { width: 0, height: 0 }), [component]);
  const layerDimensions = useMemo(
    () => (isTower ? getTowerLayerDimensions(innerDimensions.width, innerDimensions.height, selectedLayer) : innerDimensions),
    [isTower, innerDimensions, selectedLayer],
  );

  // A selection or patch edit of a plant that is no longer drawn is dropped
  useEffect(() => {
    const ids = new Set(canvas.ownPlants.map((plant) => plant.id));
    if (selectedPlantInstance && !ids.has(selectedPlantInstance.id)) setSelectedPlantInstance(null);
    if (patchEditPlantId && !ids.has(patchEditPlantId)) {
      setPatchEditPlantId(null);
      setPatchEditOriginal(null);
    }
  }, [canvas.ownPlants, selectedPlantInstance, patchEditPlantId]);

  useEffect(() => () => {
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
  }, []);

  const changeYear = useCallback(
    (nextYear: number) => {
      setYear(nextYear);
      setSeason(defaultSeasonFor(nextYear, today));
    },
    [today],
  );

  const nameOf = useCallback((plantId: string) => getPlantById(plantId)?.nameNl ?? t('componentDetail.unknownPlant'), [getPlantById, t]);

  const handleOptimize = useCallback(() => {
    const shares = actions.optimizeSeason(componentId, year, season);
    if (shares === null) return;
    setCanvasKey((key) => key + 1);
    setResultMessage(optimizeResultMessage(shares, nameOf, translate));
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
    snackbarTimer.current = setTimeout(() => setResultMessage(null), SNACKBAR_DURATION_MS);
  }, [actions, componentId, year, season, nameOf, translate]);

  const handleOpenChat = useCallback(() => {
    const store = useAiChatStore.getState();
    if (store.chatMode !== 'normal') store.clearMessages();
    store.setChatMode('normal');
    navigation.navigate('AiChat');
  }, [navigation]);

  const handleToggleEditMode = useCallback(() => {
    if (isEditMode) setCanvasKey((key) => key + 1);
    setIsEditMode((previous) => !previous);
  }, [isEditMode]);

  const handleCanvasPlantTap = useCallback(
    (plant: PlacedPlantData) => setSelectedPlantInstance({ id: plant.id, name: nameOf(plant.plantId) }),
    [nameOf],
  );

  const handleDeleteSelectedPlant = useCallback(() => {
    if (!selectedPlantInstance) return;
    const { id, name } = selectedPlantInstance;
    Alert.alert(t('common.delete'), `${name} verwijderen?`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          actions.removePlacement(componentId, year, season, id);
          setSelectedPlantInstance(null);
        },
      },
    ]);
  }, [selectedPlantInstance, t, actions, componentId, year, season]);

  const handleEnterPatchEditMode = useCallback(
    (plant: PlacedPlantData) => {
      const plantData = getPlantById(plant.plantId);
      const minCm = (plantData?.sowingSpacingCm ?? plantData?.spacingRadiusCm ?? 15) * 2;
      setPatchEditOriginal({
        widthInCm: plant.patchWidthInCm ?? minCm,
        heightInCm: plant.patchHeightInCm ?? minCm,
        rotationDeg: plant.patchRotationDeg ?? 0,
      });
      setPatchEditPlantId(plant.id);
    },
    [getPlantById],
  );

  const handleCancelPatchEdit = useCallback(() => {
    if (patchEditPlantId && patchEditOriginal) {
      actions.resizePatch(componentId, year, season, patchEditPlantId, patchEditOriginal.widthInCm, patchEditOriginal.heightInCm, patchEditOriginal.rotationDeg);
    }
    setPatchEditPlantId(null);
    setPatchEditOriginal(null);
  }, [patchEditPlantId, patchEditOriginal, actions, componentId, year, season]);

  if (!component || !planning) {
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
  const selectedPlant = selectedPlantInstance ? canvas.ownPlants.find((p) => p.id === selectedPlantInstance.id) : undefined;
  const selectedPlantData = selectedPlant ? getPlantById(selectedPlant.plantId) : undefined;
  const isSelectedPatch = selectedPlantData?.plantingStyle === 'patch' || selectedPlantData?.plantingStyle === 'thinning';
  const hasPlants = canvas.ownPlants.length + canvas.carriedPlants.length > 0;

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
          <Pressable onPress={handleOptimize} className="h-12 px-3 items-center justify-center" accessibilityRole="button" testID="reoptimize-button">
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
              onLayerSelect={(layer) => {
                setSelectedLayer(layer);
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
        <PlantPlacementCanvas
          key={canvasKey}
          component={component}
          plants={canvas.ownPlants}
          carriedPlants={canvas.carriedPlants}
          carriedLabelOf={(plant) => {
            const start = planning.startSeasonOf(plant.plantId);
            return start ? t('componentDetail.carriedFrom', { season: seasonLabel(start, translate).toLowerCase() }) : '';
          }}
          layerDimensions={isTower ? layerDimensions : undefined}
          footprints={canvas.footprints}
          conflictIds={canvas.conflictIds}
          outOfBoundsIds={canvas.outOfBoundsIds}
          onPlantPositionChange={(id, x, y) => actions.movePlacement(componentId, year, season, id, x, y)}
          onPlantPress={(plant) => navigation.navigate('PlantDetails', { plantId: plant.plantId })}
          onPlantLongPress={handleCanvasPlantTap}
          isEditMode={isEditMode}
          onToggleEditMode={handleToggleEditMode}
          onBackgroundPress={() => setSelectedPlantInstance(null)}
          onLockAll={() => actions.setAllPlacementsLocked(componentId, year, season, true)}
          onUnlockAll={() => actions.setAllPlacementsLocked(componentId, year, season, false)}
          onActionPress={() => setSelectedPlantInstance(null)}
          onPatchDimensionsChange={(id, w, h, rotation) => actions.resizePatch(componentId, year, season, id, w, h, rotation)}
          patchEditPlantId={patchEditPlantId}
          onPatchEditConfirm={() => {
            setPatchEditPlantId(null);
            setPatchEditOriginal(null);
          }}
          onPatchEditCancel={handleCancelPatchEdit}
        />
        {!hasPlants && (
          <View pointerEvents="none" className="absolute top-3 left-4 right-4 items-center">
            <Text className="text-gray-400 text-xs text-center bg-black/50 px-2 py-1 rounded">{t('componentDetail.emptySeason')}</Text>
          </View>
        )}
        {hasPlants && (
          <View pointerEvents="none" className="absolute top-3 left-0 right-0 items-center">
            <Text className="text-gray-400 text-xs text-center bg-black/50 px-2 py-0.5 rounded">
              {isEditMode ? t('planning.hint.edit') : t('planning.hint.view')}
            </Text>
          </View>
        )}
        {isEditMode && (
          <CanvasEditActions
            hasSelection={selectedPlant != null}
            canResize={selectedPlant != null && isSelectedPatch}
            isLocked={selectedPlant?.locked ?? false}
            onResize={() => {
              if (!selectedPlant) return;
              handleEnterPatchEditMode(selectedPlant);
              setSelectedPlantInstance(null);
            }}
            onDelete={handleDeleteSelectedPlant}
            onToggleLock={() => {
              if (!selectedPlantInstance) return;
              actions.togglePlacementLock(componentId, year, season, selectedPlantInstance.id);
              setSelectedPlantInstance(null);
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
          onPress={handleOptimize}
          testID="optimize-button"
        />
      </View>

      {isTower && (
        <LayerOverviewModal
          visible={showLayerOverview}
          onClose={() => setShowLayerOverview(false)}
          component={component}
          plants={seasonPlants}
        />
      )}
    </SafeAreaView>
  );
}
