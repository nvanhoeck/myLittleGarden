/**
 * ComponentDetailScreen
 * Zoomed view of a component for viewing and placing plants
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, Alert, ScrollView, Image, ActivityIndicator } from 'react-native';
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
import { PlantPlacementCanvas, LayerOverviewModal } from '@/components/organisms';
import { TowerLayerTabs } from '@/components/molecules';
import type { ComponentData, PlacedPlantData, PlantData } from '@/types';
import { PLANT_CATEGORIES } from '@/types/plant.types';
import { getPlantIcon, hasPlantIcon } from '@/assets';
import { useOptimizeComponent } from '@/hooks/ai/useOptimizeComponent';
import { OptimizationAlternativesModal } from '@/components/ai/OptimizationAlternativesModal';
import { useAiChatStore } from '@/stores/ai/aiChatStore';
import { useAiOptimizeComponentStore } from '@/stores/ai/aiOptimizeComponentStore';

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
 * Get component type label
 */
function getComponentTypeLabel(component: ComponentData, t: (key: string) => string): string {
  return t(`components.${component.type}`);
}

/**
 * Get component color
 */
function getComponentColor(component: ComponentData): string {
  switch (component.type) {
    case 'gardenBox':
      return '#8B4513';
    case 'pot':
      return '#CD853F';
    case 'rectangularTower':
      return '#A0522D';
    case 'circularTower':
      return '#D2691E';
    default:
      return '#808080';
  }
}

/**
 * Get the category icon emoji for a plant (fallback)
 */
function getCategoryIconEmoji(plantData: PlantData | undefined): string {
  if (!plantData) return '🌱';
  const categoryInfo = PLANT_CATEGORIES.find((cat) => cat.key === plantData.category);
  return categoryInfo?.icon ?? '🌱';
}

/**
 * Plant icon display component - shows image or emoji fallback
 */
function PlantIconDisplay({ plantData }: { plantData: PlantData | undefined }): React.JSX.Element {
  if (!plantData) {
    return <Text className="text-lg">🌱</Text>;
  }

  const plantIcon = getPlantIcon(plantData.id);
  const hasIcon = hasPlantIcon(plantData.id);

  if (hasIcon && plantIcon) {
    return (
      <Image
        source={plantIcon}
        style={{ width: 28, height: 28 }}
        resizeMode="contain"
      />
    );
  }

  return <Text className="text-lg">{getCategoryIconEmoji(plantData)}</Text>;
}

/**
 * Component to render a placed plant in the list
 */
function PlacedPlantItem({
  plant,
  plantData,
  onPress,
  onDelete,
  isEditMode,
  onResizePatch,
}: {
  plant: PlacedPlantData;
  plantData: PlantData | undefined;
  onPress: () => void;
  onDelete: () => void;
  isEditMode?: boolean;
  onResizePatch?: () => void;
}): React.JSX.Element {
  const plantName = plantData?.nameNl ?? 'Onbekende plant';
  const spacingRadius = plantData?.spacingRadiusCm ?? 15;
  const isPatch = plantData?.plantingStyle === 'patch' || plantData?.plantingStyle === 'thinning';
  const isThinning = plantData?.plantingStyle === 'thinning';

  return (
    <View className="flex-row items-center bg-green-900/40 rounded-lg mb-2 overflow-hidden">
      <Pressable
        onPress={onPress}
        className="flex-row items-center flex-1 p-3"
        android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
      >
        <View className={`w-10 h-10 ${isThinning ? 'rounded-md bg-orange-900' : isPatch ? 'rounded-md bg-amber-900' : 'rounded-full bg-green-700'} items-center justify-center mr-3`}>
          <PlantIconDisplay plantData={plantData} />
        </View>
        <View className="flex-1">
          <Text className="text-white font-medium">{plantName}</Text>
          <Text className={`text-xs ${isThinning ? 'text-orange-400' : isPatch ? 'text-amber-400' : 'text-green-400'}`}>
            {isPatch
              ? (() => {
                  const minCm = spacingRadius * 2;
                  const wCm = Math.round(plant.patchWidthInCm ?? minCm);
                  const hCm = Math.round(plant.patchHeightInCm ?? minCm);
                  const rot = plant.patchRotationDeg ?? 0;
                  const rotStr = rot > 0 ? ' • ' + rot + '° gedraaid' : '';
                  return plant.positionX.toFixed(0) + 'cm, ' + plant.positionY.toFixed(0) + 'cm • ' + wCm + ' x ' + hCm + ' cm' + rotStr;
                })()
              : plant.positionX.toFixed(0) + 'cm, ' + plant.positionY.toFixed(0) + 'cm • ' + spacingRadius + 'cm afstand'
            }
          </Text>
        </View>
      </Pressable>
      {isEditMode && isPatch && onResizePatch && (
        <Pressable
          onPress={onResizePatch}
          className="px-4 py-3 bg-purple-900/40"
          android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
        >
          <Text className="text-purple-300 text-lg">⤢</Text>
        </Pressable>
      )}
      <Pressable
        onPress={onDelete}
        className="px-4 py-3 bg-red-900/40"
        android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
      >
        <Text className="text-red-400 text-lg">🗑️</Text>
      </Pressable>
    </View>
  );
}

/**
 * ComponentDetailScreen - shows a component and its plants
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
  const [viewMode, setViewMode] = useState<'canvas' | 'list'>('canvas');
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

  const {
    status: optimizeStatus,
    alternatives,
    selectedIndex: optimizeSelectedIndex,
    setSelectedIndex: setOptimizeSelectedIndex,
    requestOptimization,
    applyAlternative,
    reset: resetOptimization,
  } = useOptimizeComponent();

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
      layerIndex: isTower ? selectedLayer : undefined,
    });
  }, [navigation, componentId, isTower, selectedLayer]);

  const handleOptimize = useCallback(async () => {
    if (!component || component.plants.length === 0) return;
    await requestOptimization(component, getPlantById, null);
  }, [component, getPlantById, requestOptimization]);

  const handleApplyOptimization = useCallback(() => {
    if (!component) return;
    applyAlternative(
      component,
      componentId,
      (id, updates) => updateComponent(id, updates as Partial<ComponentData>),
    );
    resetOptimization();
    setShowOptimizeModal(false);
    setCanvasKey((k) => k + 1);
  }, [component, componentId, applyAlternative, updateComponent, resetOptimization]);

  const handleCloseOptimizeModal = useCallback(() => {
    setShowOptimizeModal(false);
    resetOptimization();
  }, [resetOptimization]);

  const handleOptimizeAiFeedback = useCallback(() => {
    const { alternatives: alts, selectedIndex: idx } = useAiOptimizeComponentStore.getState();
    const selected = alts?.[idx];

    const { clearMessages, addMessage } = useAiChatStore.getState();
    clearMessages();
    if (selected) {
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
      addMessage('user', parts.join('\n'));
    }

    setShowOptimizeModal(false);
    navigation.navigate('AiChat');
  }, [navigation, plantDataMap]);

  const handleOpenChat = useCallback(() => {
    useAiChatStore.getState().clearMessages();
    navigation.navigate('AiChat');
  }, [navigation]);

  const handlePlantPress = useCallback(
    (plantId: string) => {
      navigation.navigate('PlantDetails', { plantId });
    },
    [navigation]
  );

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
  const innerDimensions = getInnerDimensions(component);
  const plants = component.plants || [];
  const hasPlants = plants.length > 0;

  // For towers, calculate layer-specific dimensions and filter plants
  const LAYER_REDUCTION_FACTOR = 0.85;
  const layerDimensions = useMemo(() => {
    if (!isTower) return innerDimensions;
    const factor = Math.pow(LAYER_REDUCTION_FACTOR, selectedLayer);
    return {
      width: innerDimensions.width * factor,
      height: innerDimensions.height * factor,
    };
  }, [isTower, innerDimensions, selectedLayer]);

  // Filter plants for current layer (or all for non-towers)
  const visiblePlants = useMemo(() => {
    if (!isTower) return plants;
    return plants.filter((p) => (p.layerIndex ?? 0) === selectedLayer);
  }, [plants, isTower, selectedLayer]);

  return (
    <SafeAreaView className="flex-1 bg-background" testID="component-detail-screen">
      {/* Header */}
      <View className="flex-row items-center px-4 h-16 border-b border-gray-800">
        <Pressable
          onPress={handleBack}
          className="w-10 h-10 items-center justify-center rounded-full mr-2"
          hitSlop={8}
        >
          <Text className="text-white text-2xl">←</Text>
        </Pressable>
        <View className="flex-1">
          <Text className="text-white text-lg font-semibold" numberOfLines={1}>
            {component.name}
          </Text>
          <Text className="text-gray-400 text-sm">
            {getComponentTypeLabel(component, t)} • {t('componentDetail.sunAt')} {component.sunDirection}
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
          disabled={!hasPlants || optimizeStatus === 'loading'}
          className={`w-10 h-10 rounded-full items-center justify-center mr-2 ${
            hasPlants ? 'bg-purple-600' : 'bg-gray-700'
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
        >
          <Text className="text-white text-xl font-bold">+</Text>
        </Pressable>
      </View>

      {/* Info bar */}
      <View className="flex-row px-4 py-2 border-b border-gray-800 bg-gray-900/50">
        <View className="flex-1 items-center">
          <Text className="text-gray-400 text-xs">{t('componentDetail.outerSize')}</Text>
          <Text className="text-white text-sm">
            {dimensions.width} x {dimensions.height} cm
          </Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="text-gray-400 text-xs">{t('componentDetail.innerSize')}</Text>
          <Text className="text-white text-sm">
            {innerDimensions.width} x {innerDimensions.height} cm
          </Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="text-gray-400 text-xs">{t('componentDetail.plants')}</Text>
          <Text className="text-white text-sm">{plants.length}</Text>
        </View>
      </View>

      {/* View toggle */}
      <View className="flex-row px-4 py-2 border-b border-gray-800">
        <Pressable
          onPress={() => setViewMode('canvas')}
          className={`flex-1 py-2 rounded-lg mr-1 items-center ${
            viewMode === 'canvas' ? 'bg-green-600' : 'bg-gray-800'
          }`}
        >
          <Text className={viewMode === 'canvas' ? 'text-white font-medium' : 'text-gray-400'}>
            🗺️ Canvas
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setViewMode('list')}
          className={`flex-1 py-2 rounded-lg ml-1 items-center ${
            viewMode === 'list' ? 'bg-green-600' : 'bg-gray-800'
          }`}
        >
          <Text className={viewMode === 'list' ? 'text-white font-medium' : 'text-gray-400'}>
            📋 Lijst
          </Text>
        </Pressable>
      </View>

      {/* Tower layer tabs */}
      {isTower && (
        <View className="border-b border-gray-800 bg-gray-900/30">
          <TowerLayerTabs
            numberOfLayers={numberOfLayers}
            selectedLayer={selectedLayer}
            onLayerSelect={handleLayerSelect}
            onOverviewPress={handleOverviewPress}
          />
          <Text className="text-center text-gray-500 text-xs pb-2">
            {t('componentDetail.layer')} {selectedLayer + 1}: {layerDimensions.width.toFixed(0)} x {layerDimensions.height.toFixed(0)} cm
          </Text>
        </View>
      )}

      {/* Canvas or List view */}
      {viewMode === 'canvas' ? (
        <View className="flex-1 p-4">
          <PlantPlacementCanvas
            key={canvasKey}
            component={component}
            plants={visiblePlants}
            layerDimensions={isTower ? layerDimensions : undefined}
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
          {visiblePlants.length > 0 && (
            <Text className="text-gray-500 text-xs text-center mt-2">
              {isEditMode
                ? 'Sleep planten om te verplaatsen • Tik om te vergrendelen/verwijderen'
                : 'Druk op ✏️ Bewerken om planten te verplaatsen'}
            </Text>
          )}
          {isEditMode && (() => {
            const selPlant = selectedPlantInstance ? visiblePlants.find((p) => p.id === selectedPlantInstance.id) : null;
            const selPlantData = selPlant ? getPlantById(selPlant.plantId) : null;
            const isLocked = selPlant?.locked ?? false;
            const isSelPatch = selPlantData?.plantingStyle === 'patch' || selPlantData?.plantingStyle === 'thinning';
            const hasSelection = selectedPlantInstance != null;
            const canResize = hasSelection && isSelPatch && selPlant != null;
            return (
              <View className="flex-row mt-2 gap-3">
                <Pressable
                  onPress={canResize ? () => { handleEnterPatchEditMode(selPlant); setSelectedPlantInstance(null); } : undefined}
                  disabled={!canResize}
                  className={`flex-1 flex-row items-center justify-center py-3 rounded-lg border ${canResize ? 'bg-purple-900/60 border-purple-700' : 'bg-gray-900/20 border-gray-800 opacity-30'}`}
                  android_ripple={canResize ? { color: 'rgba(255,255,255,0.1)' } : undefined}
                >
                  <Text className={`font-medium ${canResize ? 'text-purple-300' : 'text-gray-600'}`}>⧂ Formaat</Text>
                </Pressable>
                <Pressable
                  onPress={hasSelection ? handleDeleteSelectedPlant : undefined}
                  disabled={!hasSelection}
                  className={`flex-1 flex-row items-center justify-center py-3 rounded-lg border ${hasSelection ? 'bg-red-900/60 border-red-700' : 'bg-gray-900/20 border-gray-800 opacity-30'}`}
                  android_ripple={hasSelection ? { color: 'rgba(255,255,255,0.1)' } : undefined}
                >
                  <Text className={`font-medium ${hasSelection ? 'text-red-300' : 'text-gray-600'}`}>🗑️ Verwijderen</Text>
                </Pressable>
                <Pressable
                  onPress={hasSelection ? handleToggleLockSelected : undefined}
                  disabled={!hasSelection}
                  className={`flex-1 flex-row items-center justify-center py-3 rounded-lg border ${hasSelection ? 'bg-gray-800 border-gray-600' : 'bg-gray-900/20 border-gray-800 opacity-30'}`}
                  android_ripple={hasSelection ? { color: 'rgba(255,255,255,0.1)' } : undefined}
                >
                  <Text className={`font-medium ${hasSelection ? 'text-white' : 'text-gray-600'}`}>{isLocked ? '🔓 Ontgrendelen' : '🔒 Vergrendelen'}</Text>
                </Pressable>
              </View>
            );
          })()}
        </View>
      ) : (
        <View className="flex-1 p-4">
          {visiblePlants.length === 0 ? (
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

      {/* Layer overview modal for towers */}
      {isTower && (
        <LayerOverviewModal
          visible={showLayerOverview}
          onClose={() => setShowLayerOverview(false)}
          component={component}
        />
      )}

      {/* Optimization alternatives modal */}
      {showOptimizeModal && alternatives && alternatives.length > 0 && (
        <OptimizationAlternativesModal
          visible={showOptimizeModal}
          onClose={handleCloseOptimizeModal}
          onApply={handleApplyOptimization}
          onAiFeedback={handleOptimizeAiFeedback}
          component={component}
          alternatives={alternatives}
          selectedIndex={optimizeSelectedIndex}
          onSelectIndex={setOptimizeSelectedIndex}
          plantDataMap={plantDataMap}
        />
      )}
    </SafeAreaView>
  );
}
