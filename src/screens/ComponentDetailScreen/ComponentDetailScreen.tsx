/**
 * ComponentDetailScreen
 * Zoomed view of a component for viewing and placing plants, week by week
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ComponentDetailScreenProps } from '@/navigation/navigationTypes';
import { useComponent, useComponentStore } from '@/stores';
import { useShallow } from 'zustand/react/shallow';
import { usePlantStore } from '@/stores/plantStore';
import {
  isGardenBox,
  isPot,
  isRectangularTower,
  isCircularTower,
} from '@/stores/componentStore';
import {
  PlantPlacementCanvas,
  LayerOverviewModal,
  WeekTimeline,
  ToPlanAccordion,
  PlanningActionBar,
} from '@/components/organisms';
import { TowerLayerTabs, YearBar, ViewModeToggle } from '@/components/molecules';
import type { ViewMode } from '@/components/molecules';
import { PlanningCaption, Snackbar } from '@/components/atoms';
import type { ComponentData, PlacedPlantData, PlantData } from '@/types';
import { getTowerLayerDimensions } from '@/domain/component/towerLayerGeometry';
import { plantsForOptimization, useOptimizeComponent } from '@/hooks/ai/useOptimizeComponent';
import type { OptimizeScope } from '@/hooks/ai/useOptimizeComponent';
import { plantsSharingWeeksWith } from '@/domain/planning';
import { OptimizationAlternativesModal } from '@/components/ai/OptimizationAlternativesModal';
import { useAiChatStore } from '@/stores/ai/aiChatStore';
import { useAiOptimizeComponentStore } from '@/stores/ai/aiOptimizeComponentStore';
import { PlacedPlantItem } from './PlacedPlantItem';
import { CanvasEditActions } from './CanvasEditActions';
import { usePlanningTimeline } from './usePlanningTimeline';
import { usePlanningActions } from './usePlanningActions';

/**
 * Get component dimensions in cm
 */
function getComponentDimensions(component: ComponentData): { width: number; height: number } {
  if (isGardenBox(component) || isRectangularTower(component)) {
    return {
      width: component.widthInCm,
      height: component.lengthInCm,
    };
  }
  if (isPot(component) || isCircularTower(component)) {
    return {
      width: component.diameterInCm,
      height: component.diameterInCm,
    };
  }
  return { width: 100, height: 100 };
}

/**
 * Get inner dimensions (excluding border)
 */
function getInnerDimensions(component: ComponentData): { width: number; height: number } {
  const outer = getComponentDimensions(component);
  const border = component.borderWidthInCm * 2;
  return {
    width: Math.max(0, outer.width - border),
    height: Math.max(0, outer.height - border),
  };
}

/**
 * ComponentDetailScreen - shows a component and the plants growing in the selected week
 */
export function ComponentDetailScreen({
  navigation,
  route,
}: ComponentDetailScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const { componentId } = route.params;
  const component = useComponent(componentId);
  const getPlantById = usePlantStore((state) => state.getPlantById);
  const { updateComponent, togglePlantLock, lockAllPlants, unlockAllPlants, updatePatchDimensions } = useComponentStore(
    useShallow((state) => ({
      updateComponent: state.updateComponent,
      togglePlantLock: state.togglePlantLock,
      lockAllPlants: state.lockAllPlants,
      unlockAllPlants: state.unlockAllPlants,
      updatePatchDimensions: state.updatePatchDimensions,
    }))
  );
  const [viewMode, setViewMode] = useState<ViewMode>('canvas');
  const [selectedLayer, setSelectedLayer] = useState(0);
  const [showLayerOverview, setShowLayerOverview] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [patchEditPlantId, setPatchEditPlantId] = useState<string | null>(null);
  const [patchEditOriginalDimensions, setPatchEditOriginalDimensions] = useState<{
    widthInCm: number; heightInCm: number; rotationDeg: number;
  } | null>(null);
  const [canvasKey, setCanvasKey] = useState(0);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [selectedPlantInstance, setSelectedPlantInstance] = useState<{ id: string; name: string } | null>(null);

  // Check if component is a tower
  const isTower = component
    ? isRectangularTower(component) || isCircularTower(component)
    : false;
  const numberOfLayers = useMemo(() => {
    if (!component) return 1;
    if (isRectangularTower(component)) return component.numberOfLayers;
    if (isCircularTower(component)) return component.numberOfLayers;
    return 1;
  }, [component]);
  // Planning works per tower layer; components without layers have none
  const planningLayer = isTower ? selectedLayer : undefined;

  const planning = usePlanningTimeline(component, planningLayer);
  const planningActions = usePlanningActions(component, planning.year, planningLayer);
  const visiblePlants = planning.visiblePlants;
  const hasVisiblePlants = visiblePlants.length > 0;

  // For towers, the layer-specific dimensions
  const innerDimensions = useMemo(
    () => (component ? getInnerDimensions(component) : { width: 0, height: 0 }),
    [component],
  );
  const layerDimensions = useMemo(() => {
    if (!isTower) return innerDimensions;
    return getTowerLayerDimensions(innerDimensions.width, innerDimensions.height, selectedLayer);
  }, [isTower, innerDimensions, selectedLayer]);

  // A selection or patch edit of a plant that is no longer drawn (other week,
  // zone, year or layer, or moved by a planning run) is dropped
  useEffect(() => {
    const visibleIds = new Set(visiblePlants.map((plant) => plant.id));
    if (selectedPlantInstance && !visibleIds.has(selectedPlantInstance.id)) {
      setSelectedPlantInstance(null);
    }
    if (patchEditPlantId && !visibleIds.has(patchEditPlantId)) {
      setPatchEditPlantId(null);
      setPatchEditOriginalDimensions(null);
    }
  }, [visiblePlants, selectedPlantInstance, patchEditPlantId]);

  const {
    status: optimizeStatus,
    alternatives,
    selectedIndex: optimizeSelectedIndex,
    setSelectedIndex: setOptimizeSelectedIndex,
    requestOptimization,
    applyAlternative,
    reset: resetOptimization,
  } = useOptimizeComponent();

  // The AI optimizes what was in the ground in the displayed week when it was asked
  const [optimizeScope, setOptimizeScope] = useState<OptimizeScope | null>(null);
  const optimizeComponent = useMemo(
    () => (component && optimizeScope ? { ...component, plants: plantsForOptimization(optimizeScope) } : undefined),
    [component, optimizeScope],
  );

  // Another week, year or layer makes an optimization (running or done) stale
  useEffect(() => {
    resetOptimization();
    setOptimizeScope(null);
    setShowOptimizeModal(false);
  }, [planning.year, planning.displayedWeek, planningLayer, resetOptimization]);

  // Build plant data map keyed by placed-plant instance ID for the optimization modal
  const plantDataMap = useMemo(() => {
    const map: Record<string, PlantData | undefined> = {};
    for (const plant of component?.plants ?? []) {
      map[plant.id] = getPlantById(plant.plantId);
    }
    return map;
  }, [component?.plants, getPlantById]);

  // Open modal when optimization succeeds
  useEffect(() => {
    if (optimizeStatus === 'success') {
      setShowOptimizeModal(true);
    }
  }, [optimizeStatus]);

  // Re-show the optimization modal when returning from AiChat (if results still live)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const { status, alternatives: alts } = useAiOptimizeComponentStore.getState();
      if (status === 'success' && alts && alts.length > 0) {
        setShowOptimizeModal(true);
      }
    });
    return unsubscribe;
  }, [navigation]);


  // Reset optimization store on unmount
  useEffect(() => {
    return () => {
      resetOptimization();
    };
  }, [resetOptimization]);

  const handlePatchDimensionsChange = useCallback(
    (plantInstanceId: string, widthInCm: number, heightInCm: number, rotationDeg: number) => {
      updatePatchDimensions(componentId, plantInstanceId, widthInCm, heightInCm, rotationDeg);
    },
    [componentId, updatePatchDimensions]
  );

  const handleEnterPatchEditMode = useCallback(
    (plant: PlacedPlantData) => {
      const plantData = getPlantById(plant.plantId);
      const minCm = (plantData?.sowingSpacingCm ?? plantData?.spacingRadiusCm ?? 15) * 2;
      setPatchEditOriginalDimensions({
        widthInCm: plant.patchWidthInCm ?? minCm,
        heightInCm: plant.patchHeightInCm ?? minCm,
        rotationDeg: plant.patchRotationDeg ?? 0,
      });
      setPatchEditPlantId(plant.id);
      setViewMode('canvas');
    },
    [getPlantById]
  );

  const handleConfirmPatchEdit = useCallback(() => {
    setPatchEditPlantId(null);
    setPatchEditOriginalDimensions(null);
  }, []);

  const handleCancelPatchEdit = useCallback(() => {
    if (patchEditPlantId && patchEditOriginalDimensions) {
      updatePatchDimensions(
        componentId,
        patchEditPlantId,
        patchEditOriginalDimensions.widthInCm,
        patchEditOriginalDimensions.heightInCm,
        patchEditOriginalDimensions.rotationDeg,
      );
    }
    setPatchEditPlantId(null);
    setPatchEditOriginalDimensions(null);
  }, [patchEditPlantId, patchEditOriginalDimensions, componentId, updatePatchDimensions]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleToggleEditMode = useCallback(() => {
    if (isEditMode) {
      setCanvasKey((k) => k + 1);
    }
    setIsEditMode((prev) => !prev);
  }, [isEditMode]);

  const handleAddPlant = useCallback(() => {
    navigation.navigate('PlantSelection', {
      componentId,
      layerIndex: planningLayer,
      year: planning.year,
    });
  }, [navigation, componentId, planningLayer, planning.year]);

  const handleOptimize = useCallback(async () => {
    if (!component || visiblePlants.length === 0) return;
    // Plants sharing weeks with the visible ones are obstacles, so no overlap appears in other weeks
    const scope: OptimizeScope = {
      plants: visiblePlants,
      obstacles: plantsSharingWeeksWith(component, visiblePlants, planningLayer),
    };
    setOptimizeScope(scope);
    await requestOptimization(component, scope, getPlantById, null);
  }, [component, visiblePlants, planningLayer, getPlantById, requestOptimization]);

  const handleApplyOptimization = useCallback(() => {
    if (!component || !optimizeScope) return;
    // Applied to the whole component: only the optimized plants move, and only in position
    applyAlternative(
      component,
      componentId,
      (id, updates) => updateComponent(id, updates as Partial<ComponentData>),
      new Set(optimizeScope.plants.map((plant) => plant.id)),
    );
    resetOptimization();
    setOptimizeScope(null);
    setShowOptimizeModal(false);
    setCanvasKey((k) => k + 1);
  }, [component, componentId, optimizeScope, applyAlternative, updateComponent, resetOptimization]);

  const handleCloseOptimizeModal = useCallback(() => {
    setShowOptimizeModal(false);
    setOptimizeScope(null);
    resetOptimization();
  }, [resetOptimization]);

  const handleOptimizeAiFeedback = useCallback(() => {
    const { alternatives: alts, selectedIndex: idx } = useAiOptimizeComponentStore.getState();
    const selected = alts?.[idx];

    const store = useAiChatStore.getState();
    const switching = store.chatMode !== 'optimization';
    if (switching) {
      store.clearMessages();
    }
    store.setChatMode('optimization');
    if (switching && selected) {
      const positionLines = selected.positions
        .map((p) => {
          const plant = plantDataMap[p.plantInstanceId];
          return plant ? ('- ' + plant.nameNl + ': (' + p.positionXInCm + 'cm, ' + p.positionYInCm + 'cm)') : null;
        })
        .filter(Boolean)
        .join('\n');
      const parts = [
        'Optimalisatieresultaat optie ' + (idx + 1) + ' van ' + (alts?.length ?? 1) + ':',
        'Samenvatting: ' + selected.summary,
        'Score: ' + selected.score.total + '/100 (companion: ' + selected.score.companion + ', spacing: ' + selected.score.spacing + ', sun: ' + selected.score.sun + ', combative: ' + selected.score.combative + ')',
      ];
      if (positionLines) parts.push('Plantenposities:\n' + positionLines);
      store.addMessage('user', parts.join('\n'));
    }

    setShowOptimizeModal(false);
    navigation.navigate('AiChat');
  }, [navigation, plantDataMap]);

  const handleOpenChat = useCallback(() => {
    const store = useAiChatStore.getState();
    if (store.chatMode !== 'normal') {
      store.clearMessages();
    }
    store.setChatMode('normal');
    navigation.navigate('AiChat');
  }, [navigation]);

  const handlePlantPress = useCallback(
    (plantId: string) => {
      navigation.navigate('PlantDetails', { plantId });
    },
    [navigation]
  );

  // A drag changes the position only, never the growing period
  const handlePlantPositionChange = useCallback(
    (plantInstanceId: string, x: number, y: number) => {
      if (!component) return;

      const updatedPlants = (component.plants || []).map((plant) =>
        plant.id === plantInstanceId
          ? { ...plant, positionX: x, positionY: y, layerIndex: plant.layerIndex }
          : plant
      );

      updateComponent(componentId, { plants: updatedPlants });
    },
    [component, componentId, updateComponent]
  );

  const handleLayerSelect = useCallback((layerIndex: number) => {
    setSelectedLayer(layerIndex);
    setShowLayerOverview(false);
  }, []);

  const handleOverviewPress = useCallback(() => {
    setShowLayerOverview(true);
  }, []);

  const handleDeletePlant = useCallback(
    (plantInstanceId: string, plantName: string) => {
      Alert.alert(
        t('common.delete'),
        `${plantName} verwijderen?`,
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: () => {
              if (!component) return;
              const updatedPlants = (component.plants || []).filter(
                (plant) => plant.id !== plantInstanceId
              );
              updateComponent(componentId, { plants: updatedPlants });
            },
          },
        ]
      );
    },
    [component, componentId, updateComponent, t]
  );

  const handleCanvasPlantTap = useCallback(
    (plant: PlacedPlantData) => {
      const plantData = getPlantById(plant.plantId);
      const name = plantData?.nameNl ?? t('componentDetail.unknownPlant');
      setSelectedPlantInstance({ id: plant.id, name });
    },
    [getPlantById, t]
  );

  const handleDeleteSelectedPlant = useCallback(() => {
    if (!selectedPlantInstance || !component) return;
    const { id, name } = selectedPlantInstance;
    Alert.alert(
      t('common.delete'),
      `${name} verwijderen?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            const updatedPlants = (component.plants || []).filter((p) => p.id !== id);
            updateComponent(componentId, { plants: updatedPlants });
            setSelectedPlantInstance(null);
          },
        },
      ]
    );
  }, [selectedPlantInstance, component, componentId, updateComponent, t]);

  const handleToggleLockSelected = useCallback(() => {
    if (!selectedPlantInstance) return;
    togglePlantLock(componentId, selectedPlantInstance.id);
    setSelectedPlantInstance(null);
  }, [selectedPlantInstance, componentId, togglePlantLock]);

  if (!component) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-on-surface">{t('componentDetail.notFound')}</Text>
        <Pressable onPress={handleBack} className="mt-4 px-4 py-2 bg-green-600 rounded-lg">
          <Text className="text-white">{t('common.back')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const dimensions = getComponentDimensions(component);
  const selectedPlant = selectedPlantInstance ? visiblePlants.find((p) => p.id === selectedPlantInstance.id) : undefined;
  const selectedPlantData = selectedPlant ? getPlantById(selectedPlant.plantId) : undefined;
  const isSelectedPatch = selectedPlantData?.plantingStyle === 'patch' || selectedPlantData?.plantingStyle === 'thinning';
  // Tiny footprints have no room for a name, so the caption names the selected plant
  const caption = selectedPlant && selectedPlantInstance
    ? `${planning.timeline.caption} · ${selectedPlantInstance.name}`
    : planning.timeline.caption;

  return (
    <SafeAreaView className="flex-1 bg-background" testID="component-detail-screen">
      {/* Header */}
      <View className="flex-row items-center px-4 h-14 border-b border-gray-800">
        <Pressable
          onPress={handleBack}
          className="w-10 h-10 items-center justify-center rounded-full mr-2"
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Text className="text-white text-2xl">←</Text>
        </Pressable>
        <View className="flex-1">
          <Text className="text-white text-lg font-semibold" numberOfLines={1}>
            {component.name}
          </Text>
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
          className="bg-blue-600 w-10 h-10 rounded-full items-center justify-center mr-2"
          android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
          testID="ai-tuinhulp-button"
          accessibilityLabel="AI Tuinhulp"
          accessibilityRole="button"
        >
          <Text className="text-lg">🤖</Text>
        </Pressable>
        <Pressable
          onPress={handleOptimize}
          disabled={!hasVisiblePlants || optimizeStatus === 'loading'}
          className={`w-10 h-10 rounded-full items-center justify-center mr-2 ${
            hasVisiblePlants ? 'bg-purple-600' : 'bg-gray-700'
          }`}
          android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
          testID="optimize-placement-button"
          accessibilityLabel={t('ai.optimize.placement.button')}
          accessibilityRole="button"
        >
          {optimizeStatus === 'loading' ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text className="text-lg">✨</Text>
          )}
        </Pressable>
        <Pressable
          onPress={handleAddPlant}
          className="bg-green-600 w-10 h-10 rounded-full items-center justify-center"
          android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
          testID="add-plant-button"
          accessibilityLabel={t('componentDetail.addPlant')}
          accessibilityRole="button"
        >
          <Text className="text-white text-xl font-bold">+</Text>
        </Pressable>
      </View>

      {/* Year bar with the Canvas / Lijst toggle */}
      <View className="flex-row items-center h-10 px-2 border-b border-gray-800">
        <YearBar
          year={planning.year}
          onPrev={planning.goToPreviousYear}
          onNext={planning.goToNextYear}
          canPrev={planning.canGoToPreviousYear}
          canNext={planning.canGoToNextYear}
          previousLabel={t('planning.year.previous')}
          nextLabel={t('planning.year.next')}
        />
        <ViewModeToggle
          value={viewMode}
          onChange={setViewMode}
          canvasLabel={t('planning.viewMode.canvas')}
          listLabel={t('planning.viewMode.list')}
        />
      </View>

      <WeekTimeline
        weeks={planning.timeline.weeks}
        zones={planning.timeline.zones}
        selection={planning.timeline.selection}
        currentLabel={t('planning.week.current')}
        onSelectWeek={planning.selectWeek}
        onSelectZone={planning.selectZone}
      />

      {/* Tower layer tabs with the layer size */}
      {isTower && (
        <View className="flex-row items-center border-b border-gray-800 bg-gray-900/30">
          <View className="flex-1">
            <TowerLayerTabs
              numberOfLayers={numberOfLayers}
              selectedLayer={selectedLayer}
              onLayerSelect={handleLayerSelect}
              onOverviewPress={handleOverviewPress}
            />
          </View>
          <Text className="text-gray-500 text-xs pr-4">
            {t('componentDetail.layer')} {selectedLayer + 1}: {layerDimensions.width.toFixed(0)} x {layerDimensions.height.toFixed(0)} cm
          </Text>
        </View>
      )}

      <View className="flex-1">
        <ToPlanAccordion
          groups={planningActions.toPlanGroups}
          expanded={planningActions.isToPlanExpanded}
          title={t('planning.toPlan.title', { count: planningActions.toPlanCount })}
          emptyTitle={t('planning.toPlan.empty')}
          emptyHint={t('planning.toPlan.emptyHint')}
          onToggle={planningActions.toggleToPlan}
          onRemove={planningActions.removeToPlan}
        >
          <PlanningCaption text={caption} />

          {/* Canvas or List view */}
          {viewMode === 'canvas' ? (
            <View className="flex-1 p-2">
              <PlantPlacementCanvas
                key={canvasKey}
                component={component}
                plants={visiblePlants}
                layerDimensions={isTower ? layerDimensions : undefined}
                footprints={planning.footprints}
                conflictIds={planning.conflictIds}
                outOfBoundsIds={planning.outOfBoundsIds}
                onPlantPositionChange={handlePlantPositionChange}
                onPlantPress={(plant) => handlePlantPress(plant.plantId)}
                onPlantLongPress={handleCanvasPlantTap}
                isEditMode={isEditMode}
                onToggleEditMode={handleToggleEditMode}
                onBackgroundPress={() => setSelectedPlantInstance(null)}
                onLockAll={() => lockAllPlants(componentId)}
                onUnlockAll={() => unlockAllPlants(componentId)}
                onActionPress={() => setSelectedPlantInstance(null)}
                onPatchDimensionsChange={handlePatchDimensionsChange}
                patchEditPlantId={patchEditPlantId}
                onPatchEditConfirm={handleConfirmPatchEdit}
                onPatchEditCancel={handleCancelPatchEdit}
              />
              {/* Hint as an overlay on the canvas */}
              {hasVisiblePlants && (
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
                  onToggleLock={handleToggleLockSelected}
                />
              )}
            </View>
          ) : (
            <View className="flex-1 p-4">
              {!hasVisiblePlants ? (
                <View className="flex-1 items-center justify-center">
                  <Text className="text-4xl mb-2">🌱</Text>
                  <Text className="text-gray-400 text-center">
                    {isTower
                      ? t('componentDetail.emptyLayer')
                      : t('componentDetail.emptyPlantsMessage')}
                  </Text>
                  <Pressable
                    onPress={handleAddPlant}
                    className="mt-4 bg-green-600 px-6 py-3 rounded-lg"
                  >
                    <Text className="text-white font-medium">{t('componentDetail.addPlant')}</Text>
                  </Pressable>
                </View>
              ) : (
                <ScrollView className="flex-1" showsVerticalScrollIndicator>
                  {visiblePlants.map((plant) => {
                    const plantData = getPlantById(plant.plantId);
                    return (
                      <PlacedPlantItem
                        key={plant.id}
                        plant={plant}
                        plantData={plantData}
                        onPress={() => handlePlantPress(plant.plantId)}
                        onDelete={() =>
                          handleDeletePlant(
                            plant.id,
                            plantData?.nameNl ?? t('componentDetail.unknownPlant')
                          )
                        }
                        isEditMode={isEditMode}
                        onResizePatch={plantData?.plantingStyle === 'patch' || plantData?.plantingStyle === 'thinning' ? () => handleEnterPatchEditMode(plant) : undefined}
                      />
                    );
                  })}
                </ScrollView>
              )}
            </View>
          )}
        </ToPlanAccordion>

        <Snackbar
          visible={planningActions.result !== null}
          message={planningActions.result?.message ?? ''}
          actionLabel={planningActions.result?.showViewAction ? t('planning.result.view') : undefined}
          onAction={planningActions.viewResult}
          testID="planning-snackbar"
        />
      </View>

      <PlanningActionBar
        canRearrange={planningActions.canPlan}
        canStartOver={planningActions.canPlan}
        running={planningActions.running}
        rearrangeLabel={t('planning.actions.rearrange')}
        startOverLabel={t('planning.actions.startOver')}
        onRearrange={planningActions.rearrange}
        onStartOver={planningActions.startOver}
      />

      {/* Layer overview modal for towers */}
      {isTower && (
        <LayerOverviewModal
          visible={showLayerOverview}
          onClose={() => setShowLayerOverview(false)}
          component={component}
        />
      )}

      {/* Optimization alternatives modal: the optimized plants and their (locked) obstacles */}
      {showOptimizeModal && optimizeComponent && alternatives && alternatives.length > 0 && (
        <OptimizationAlternativesModal
          visible={showOptimizeModal}
          onClose={handleCloseOptimizeModal}
          onApply={handleApplyOptimization}
          onAiFeedback={handleOptimizeAiFeedback}
          component={optimizeComponent}
          alternatives={alternatives}
          selectedIndex={optimizeSelectedIndex}
          onSelectIndex={setOptimizeSelectedIndex}
          plantDataMap={plantDataMap}
        />
      )}
    </SafeAreaView>
  );
}
