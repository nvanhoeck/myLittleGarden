/**
 * PlacedPlantItem
 * A placed plant in the list view of the Component Detail screen
 */

import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import type { PlacedPlantData, PlantData } from '@/types';
import { PLANT_CATEGORIES } from '@/types/plant.types';
import { getPlantIcon, hasPlantIcon } from '@/assets';

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
export function PlacedPlantItem({
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
              : plant.positionX.toFixed(0) + 'cm, ' + plant.positionY.toFixed(0) + 'cm • ' + spacingRadius * 2 + 'cm afstand'
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
