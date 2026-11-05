/**
 * ComponentSlide
 * Read-only top view of one garden component for the home slider.
 * Purely presentational: all actions are callbacks.
 */
import React, { useMemo } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ComponentData, PlacedPlantData, PlantData } from '@/types';
import { PLANT_CATEGORIES } from '@/types/plant.types';
import { getPlantIcon, hasPlantIcon } from '@/assets';
import { getTowerLayerDimensions } from '@/domain/component/towerLayerGeometry';
import {
  getComponentColor,
  getComponentDimensionsLabel,
  isTowerComponent,
} from '@/utils/componentSummary';
import { fitScale, clampIconPosition } from './slideGeometry';

const DRAWING_MAX_PX = 280;
const SLIDE_HORIZONTAL_PADDING = 32;
const ICON_PX = 20;

interface ComponentSlideProps {
  component: ComponentData;
  /** Plants growing in the component today */
  plants: readonly PlacedPlantData[];
  getPlantById: (plantId: string) => PlantData | undefined;
  slideWidth: number;
  onOpen: (component: ComponentData) => void;
  onEdit: (component: ComponentData) => void;
  onDelete: (component: ComponentData) => void;
  testID?: string;
}

function getOuterDimensionsCm(component: ComponentData): { width: number; height: number } {
  switch (component.type) {
    case 'gardenBox':
    case 'rectangularTower':
      return { width: component.widthInCm, height: component.lengthInCm };
    case 'pot':
    case 'circularTower':
      return { width: component.diameterInCm, height: component.diameterInCm };
  }
}

function getNumberOfLayers(component: ComponentData): number {
  return isTowerComponent(component) && 'numberOfLayers' in component
    ? Math.max(1, component.numberOfLayers)
    : 1;
}

function PlantIcon({ plantData }: { plantData: PlantData | undefined }): React.JSX.Element {
  if (plantData && hasPlantIcon(plantData.id)) {
    const source = getPlantIcon(plantData.id);
    if (source) {
      return <Image source={source} style={{ width: ICON_PX, height: ICON_PX }} resizeMode="contain" />;
    }
  }
  const category = plantData ? PLANT_CATEGORIES.find((c) => c.key === plantData.category) : undefined;
  return <Text style={{ fontSize: 14 }}>{category?.icon ?? '🌱'}</Text>;
}

interface LayerDrawingProps {
  layerIndex: number;
  baseInnerWidthCm: number;
  baseInnerHeightCm: number;
  scale: number;
  isCircular: boolean;
  plants: readonly PlacedPlantData[];
  getPlantById: (plantId: string) => PlantData | undefined;
}

function LayerDrawing({
  layerIndex,
  baseInnerWidthCm,
  baseInnerHeightCm,
  scale,
  isCircular,
  plants,
  getPlantById,
}: LayerDrawingProps): React.JSX.Element {
  const dims = getTowerLayerDimensions(baseInnerWidthCm, baseInnerHeightCm, layerIndex);
  const widthPx = dims.width * scale;
  const heightPx = dims.height * scale;

  return (
    <View
      style={{
        position: 'absolute',
        width: widthPx,
        height: heightPx,
        borderRadius: isCircular ? widthPx / 2 : 4,
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.6)',
        backgroundColor: 'rgba(0, 0, 0, 0.15)',
      }}
    >
      {plants.map((plant) => {
        const pos = clampIconPosition(
          plant.positionX,
          plant.positionY,
          dims.width,
          dims.height,
          scale,
          ICON_PX,
        );
        return (
          <View
            key={plant.id}
            style={{
              position: 'absolute',
              left: pos.left,
              top: pos.top,
              width: ICON_PX,
              height: ICON_PX,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PlantIcon plantData={getPlantById(plant.plantId)} />
          </View>
        );
      })}
    </View>
  );
}

export function ComponentSlide({
  component,
  plants,
  getPlantById,
  slideWidth,
  onOpen,
  onEdit,
  onDelete,
  testID,
}: ComponentSlideProps): React.JSX.Element {
  const { t } = useTranslation();
  const slideTestID = testID ?? `component-slide-${component.id}`;

  const outer = getOuterDimensionsCm(component);
  const borderCm = component.borderWidthInCm;
  const inner = {
    width: Math.max(0, outer.width - borderCm * 2),
    height: Math.max(0, outer.height - borderCm * 2),
  };
  const isCircular = component.type === 'pot' || component.type === 'circularTower';
  const isTower = isTowerComponent(component);
  const numberOfLayers = getNumberOfLayers(component);

  const drawingMaxPx = Math.min(DRAWING_MAX_PX, slideWidth - SLIDE_HORIZONTAL_PADDING);
  const scale = fitScale(outer.width, outer.height, drawingMaxPx);
  const outerPx = { width: outer.width * scale, height: outer.height * scale };

  const layerIndexes = useMemo(
    () => Array.from({ length: numberOfLayers }, (_, i) => i),
    [numberOfLayers],
  );

  const plantsByLayer = useMemo(() => {
    const map = new Map<number, PlacedPlantData[]>();
    for (const plant of plants) {
      const index = isTower ? plant.layerIndex ?? 0 : 0;
      const list = map.get(index) ?? [];
      list.push(plant);
      map.set(index, list);
    }
    return map;
  }, [plants, isTower]);

  return (
    <View style={{ width: slideWidth }} className="items-center px-4" testID={slideTestID}>
      {/* Drawing */}
      <View style={{ width: drawingMaxPx, height: drawingMaxPx }} className="items-center justify-center">
        <View
          style={{
            width: outerPx.width,
            height: outerPx.height,
            backgroundColor: getComponentColor(component),
            borderRadius: isCircular ? outerPx.width / 2 : 6,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Inner area; the border ring is the gap between outer and inner */}
          <View
            style={{
              width: inner.width * scale,
              height: inner.height * scale,
              borderRadius: isCircular ? (inner.width * scale) / 2 : 4,
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {layerIndexes.map((layerIndex) => (
              <LayerDrawing
                key={layerIndex}
                layerIndex={layerIndex}
                baseInnerWidthCm={inner.width}
                baseInnerHeightCm={inner.height}
                scale={scale}
                isCircular={isCircular}
                plants={plantsByLayer.get(layerIndex) ?? []}
                getPlantById={getPlantById}
              />
            ))}
          </View>
          {isTower && (
            <View
              style={{
                position: 'absolute',
                top: -8,
                right: -8,
                backgroundColor: '#16a34a',
                borderRadius: 10,
                width: 20,
                height: 20,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              testID={`${slideTestID}-layers`}
            >
              <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{numberOfLayers}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Caption */}
      <Text className="text-white text-title-large mt-3" numberOfLines={1} testID={`${slideTestID}-name`}>
        {component.name}
      </Text>
      <Text className="text-green-400 text-body-medium mt-1">
        {t(`components.${component.type}`)} • {getComponentDimensionsLabel(component)}
      </Text>
      <Text className="text-green-500 text-body-small mt-1">
        ☀ {component.sunDirection} • {t('component.plantCount', { count: plants.length })}
        {isTower ? ` • ${t('component.layers', { count: numberOfLayers })}` : ''}
      </Text>

      {/* Actions */}
      <View className="flex-row gap-2 mt-4">
        <Pressable
          onPress={() => onOpen(component)}
          className="px-4 py-2 rounded-lg bg-green-600"
          android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
          testID={`${slideTestID}-open`}
          accessibilityRole="button"
        >
          <Text className="text-white font-medium">{t('component.open')}</Text>
        </Pressable>
        <Pressable
          onPress={() => onEdit(component)}
          className="px-4 py-2 rounded-lg bg-gray-700"
          android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
          testID={`${slideTestID}-edit`}
          accessibilityRole="button"
        >
          <Text className="text-white font-medium">{t('component.edit')}</Text>
        </Pressable>
        <Pressable
          onPress={() => onDelete(component)}
          className="px-4 py-2 rounded-lg bg-gray-800"
          android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
          testID={`${slideTestID}-delete`}
          accessibilityRole="button"
        >
          <Text className="text-red-400 font-medium">{t('component.delete')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
