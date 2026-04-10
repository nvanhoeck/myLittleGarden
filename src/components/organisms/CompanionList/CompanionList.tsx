/**
 * CompanionList
 * Displays companion and combative plant relationships
 */

import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import type {
  CompanionRelationship,
  CombativeRelationship,
  CompanionBenefit,
  CombativeHarm,
  PlantData,
} from '@/types/plant.types';
import { PLANT_CATEGORIES } from '@/types/plant.types';
import { usePlantStore } from '@/stores/plantStore';
import { getPlantIcon, hasPlantIcon } from '@/assets';

interface CompanionListProps {
  readonly companions: readonly CompanionRelationship[];
  readonly combatives: readonly CombativeRelationship[];
  readonly onPlantPress?: (plantId: string) => void;
}

interface RelationshipItemProps {
  readonly plantId: string;
  readonly tags: readonly { icon: string; label: string }[];
  readonly isNegative?: boolean;
  readonly onPress?: () => void;
}

function getBenefitIcon(benefit: CompanionBenefit): string {
  switch (benefit) {
    case 'detersPests': return '🚫';
    case 'attractsPollinators': return '🐝';
    case 'growthBoost': return '💪';
    case 'improvesFlavor': return '✨';
    case 'fixesNitrogen': return '🌿';
    default: return '✅';
  }
}

function getHarmIcon(harm: CombativeHarm): string {
  switch (harm) {
    case 'inhibitsGrowth': return '🛑';
    case 'attractsPests': return '🐛';
    case 'depletesNutrients': return '📉';
    case 'diseaseRisk': return '⚠️';
    default: return '❌';
  }
}

function getCategoryIconEmoji(plantData: PlantData | undefined): string {
  if (!plantData) return '🌱';
  const categoryInfo = PLANT_CATEGORIES.find((cat) => cat.key === plantData.category);
  return categoryInfo?.icon ?? '🌱';
}

function PlantIconDisplay({ plantId, plantData }: { plantId: string; plantData: PlantData | undefined }): React.JSX.Element {
  const plantIcon = getPlantIcon(plantId);
  const hasIcon = hasPlantIcon(plantId);
  if (hasIcon && plantIcon) {
    return <Image source={plantIcon} style={{ width: 28, height: 28 }} resizeMode="contain" />;
  }
  return <Text className="text-lg">{getCategoryIconEmoji(plantData)}</Text>;
}

function RelationshipItem({ plantId, tags, isNegative = false, onPress }: RelationshipItemProps): React.JSX.Element {
  const plant = usePlantStore((state) => state.getPlantById(plantId));
  const plantName = plant?.nameNl ?? plantId;
  const tagBg = isNegative ? 'bg-red-900/50' : 'bg-green-900/50';
  const tagText = isNegative ? 'text-red-400' : 'text-green-400';

  return (
    <Pressable
      onPress={onPress}
      className="bg-gray-800/60 rounded-xl p-3 mb-3"
      style={{ width: '100%' }}
      android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
    >
      <View className="flex-row items-center">
        <View className="w-10 h-10 rounded-full bg-gray-700 items-center justify-center mr-3">
          <PlantIconDisplay plantId={plantId} plantData={plant} />
        </View>
        <View className="flex-1 flex-shrink">
          <Text className="text-white font-medium" numberOfLines={1}>{plantName}</Text>
          <View className="flex-row flex-wrap mt-1" style={{ gap: 4 }}>
            {tags.map((tag) => (
              <View key={tag.label} className={`flex-row items-center px-2 py-0.5 rounded-full ${tagBg}`}>
                <Text className="mr-1" style={{ fontSize: 11 }}>{tag.icon}</Text>
                <Text className={`text-xs ${tagText}`}>{tag.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function SectionHeader({ title, icon, count }: { title: string; icon: string; count: number }): React.JSX.Element {
  return (
    <View className="flex-row items-center mb-3">
      <Text className="text-xl mr-2">{icon}</Text>
      <Text className="text-white text-xl font-semibold flex-1">{title}</Text>
      <View className="bg-gray-700 px-2 py-1 rounded-full">
        <Text className="text-gray-300 text-xs">{count}</Text>
      </View>
    </View>
  );
}

function EmptyState({ message }: { message: string }): React.JSX.Element {
  return (
    <View className="bg-gray-800/40 rounded-xl p-4 items-center">
      <Text className="text-gray-500 text-sm">{message}</Text>
    </View>
  );
}

export function CompanionList({ companions, combatives, onPlantPress }: CompanionListProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <View className="px-4">
      <View className="mb-6">
        <SectionHeader title={t('plantDetails.companionPlants')} icon="🤝" count={companions.length} />
        {companions.length > 0 ? (
          <View>
            {companions.map((companion) => (
              <RelationshipItem
                key={companion.plantId}
                plantId={companion.plantId}
                tags={companion.benefits.map((b) => ({ icon: getBenefitIcon(b), label: t(`plants.benefits.${b}`) }))}
                onPress={() => onPlantPress?.(companion.plantId)}
              />
            ))}
          </View>
        ) : (
          <EmptyState message={t('plantDetails.noCompanions')} />
        )}
      </View>

      <View className="mb-6">
        <SectionHeader title={t('plantDetails.combativePlants')} icon="⚠️" count={combatives.length} />
        {combatives.length > 0 ? (
          <View>
            {combatives.map((combative) => (
              <RelationshipItem
                key={combative.plantId}
                plantId={combative.plantId}
                tags={combative.harms.map((h) => ({ icon: getHarmIcon(h), label: t(`plants.harms.${h}`) }))}
                isNegative
                onPress={() => onPlantPress?.(combative.plantId)}
              />
            ))}
          </View>
        ) : (
          <EmptyState message={t('plantDetails.noCombatives')} />
        )}
      </View>
    </View>
  );
}