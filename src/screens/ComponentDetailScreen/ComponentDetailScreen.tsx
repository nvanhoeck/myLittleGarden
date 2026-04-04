/**
 * ComponentDetailScreen
 * Zoomed view of a component for viewing and placing plants
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, Alert, ScrollView, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ComponentDetailScreenProps } from '@/navigation/navigationTypes';
import { useComponent, useComponentStore } from '@/stores';
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
}: {
  plant: PlacedPlantData;
  plantData: PlantData | undefined;
  onPress: () => void;
  onDelete: () => void;
}): React.JSX.Element {
  const plantName = plantData?.nameNl ?? 'Onbekende plant';
  const spacingRadius = plantData?.spacingRadiusCm ?? 15;

  return (
    <View className="flex-row items-center bg-green-900/40 rounded-lg mb-2 overflow-hidden">
      <Pressable
        onPress={onPress}
        className="flex-row items-center flex-1 p-3"
        android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
      >
        <View className="w-10 h-10 rounded-full bg-green-700 items-center justify-center mr-3">
          <PlantIconDisplay plantData={plantData} />
        </View>
        <View className="flex-1">
          <Text className="text-white font-medium">{plantName}</Text>
          <Text className="text-green-400 text-xs">
            {plant.positionX.toFixed(0)}cm, {plant.positionY.toFixed(0)}cm • {spacingRadius}cm afstand
          </Text>
        </View>
      </Pressable>
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
  const updateComponent = useComponentStore((state) => state.updateComponent);
  const [viewMode, setViewMode] = useState<'canvas' | 'list'>('canvas');
  const [selectedLayer, setSelectedLayer] = useState(0);
  const [showLayerOverview, setShowLayerOverview] = useState(false);

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

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleAddPlant = useCallback(() => {
    // For towers, pass the selected layer index
    navigation.navigate('PlantSelection', {
      componentId,
      layerIndex: isTower ? selectedLayer : undefined,
    });
  }, [navigation, componentId, isTower, selectedLayer]);

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

  const handleCanvasPlantLongPress = useCallback(
    (plant: PlacedPlantData) => {
      const plantData = getPlantById(plant.plantId);
      handleDeletePlant(plant.id, plantData?.nameNl ?? t('componentDetail.unknownPlant'));
    },
    [getPlantById, handleDeletePlant, t]
  );

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
            {getComponentTypeLabel(component, t)} • {component.sunDirection}
          </Text>
        </View>
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
            component={component}
            plants={visiblePlants}
            layerDimensions={isTower ? layerDimensions : undefined}
            onPlantPositionChange={handlePlantPositionChange}
            onPlantPress={(plant) => handlePlantPress(plant.plantId)}
            onPlantLongPress={handleCanvasPlantLongPress}
          />
          {visiblePlants.length > 0 && (
            <Text className="text-gray-500 text-xs text-center mt-2">
              Sleep planten om te verplaatsen • Lang drukken om te verwijderen
            </Text>
          )}
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
                  />
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      {/* Layer overview modal for towers */}
      {component && isTower && (
        <LayerOverviewModal
          visible={showLayerOverview}
          onClose={() => setShowLayerOverview(false)}
          component={component}
        />
      )}
    </SafeAreaView>
  );
}
