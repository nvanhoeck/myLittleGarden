/**
 * ComponentSlide
 * Read-only top view of one garden component for the home slider.
 * Purely presentational: all actions are callbacks.
 */
import React, { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { AreaData, AreaPiece, ComponentData, PlantData } from '@/types';
import { getTowerLayerDimensions } from '@/domain/component/towerLayerGeometry';
import { AreaShapes, RoadShapes } from '@/components/molecules/AreaShapes';
import {
  getComponentColor,
  getComponentDimensionsLabel,
  isTowerComponent,
} from '@/utils/componentSummary';
import { fitScale } from './slideGeometry';

const DRAWING_MAX_PX = 280;
const SLIDE_HORIZONTAL_PADDING = 32;
const ICON_PX = 20;
const NO_ROADS: readonly AreaPiece[] = [];

interface ComponentSlideProps {
  component: ComponentData;
  /** Areas growing in the component today */
  areas: readonly AreaData[];
  /** The plants of those areas together */
  plantCount: number;
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

interface LayerDrawingProps {
  layerIndex: number;
  baseInnerWidthCm: number;
  baseInnerHeightCm: number;
  scale: number;
  isCircular: boolean;
  areas: readonly AreaData[];
  /** Roads of a garden box, drawn under the areas */
  roads: readonly AreaPiece[];
  getPlantById: (plantId: string) => PlantData | undefined;
}

function LayerDrawing({
  layerIndex,
  baseInnerWidthCm,
  baseInnerHeightCm,
  scale,
  isCircular,
  areas,
  roads,
  getPlantById,
}: LayerDrawingProps): React.JSX.Element {
  const dims = getTowerLayerDimensions(baseInnerWidthCm, baseInnerHeightCm, layerIndex);
  const widthPx = dims.width * scale;
  const heightPx = dims.height * scale;
  const shapes = areas.map((area) => ({
    id: area.id,
    plantId: area.plantId,
    category: getPlantById(area.plantId)?.category,
    pieces: area.pieces,
  }));

  return (
    <View
      style={{
        position: 'absolute',
        width: widthPx,
        height: heightPx,
        borderRadius: isCircular ? widthPx / 2 : 4,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.6)',
        backgroundColor: 'rgba(0, 0, 0, 0.15)',
      }}
    >
      <RoadShapes roads={roads} scale={scale} />
      <AreaShapes areas={shapes} scale={scale} maxIconPx={ICON_PX} />
    </View>
  );
}

export function ComponentSlide({
  component,
  areas,
  plantCount,
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

  // Only garden boxes have roads; they lie in the inner area like the area pieces
  const roads = useMemo(
    (): readonly AreaPiece[] => (component.type === 'gardenBox' ? component.roads ?? NO_ROADS : NO_ROADS),
    [component],
  );

  const areasByLayer = useMemo(() => {
    const map = new Map<number, AreaData[]>();
    for (const area of areas) {
      const index = isTower ? area.layerIndex ?? 0 : 0;
      const list = map.get(index) ?? [];
      list.push(area);
      map.set(index, list);
    }
    return map;
  }, [areas, isTower]);

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
                areas={areasByLayer.get(layerIndex) ?? []}
                roads={layerIndex === 0 ? roads : NO_ROADS}
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
        ☀ {component.sunDirection} • {t('component.plantCount', { count: plantCount })}
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
