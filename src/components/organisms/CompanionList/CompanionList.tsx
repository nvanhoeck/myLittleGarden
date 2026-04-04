/**
 * CompanionList
 * Displays companion and combative plant relationships
 * Shows benefit/harm indicators with icons
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
  readonly icon: string;
  readonly label: string;
  readonly isNegative?: boolean;
  readonly onPress?: () => void;
}

/**
 * Get benefit icon
 */
function getBenefitIcon(benefit: CompanionBenefit): string {
  switch (benefit) {
    case 'detersPests':
      return '🚫'; // No entry / deters
    case 'attractsPollinators':
      return '🐝'; // Bee
    case 'growthBoost':
      return '💪'; // Flexed bicep
    case 'improvesFlavor':
      return '✨'; // Sparkles
    case 'fixesNitrogen':
      return '🌿'; // Herb / nitrogen
    default:
      return '✅'; // Check mark
  }
}

/**
 * Get harm icon
 */
function getHarmIcon(harm: CombativeHarm): string {
  switch (harm) {
    case 'inhibitsGrowth':
      return '🛑'; // Stop sign
    case 'attractsPests':
      return '🐛'; // Bug
    case 'depletesNutrients':
      return '📉'; // Chart decreasing
    case 'diseaseRisk':
      return '⚠️'; // Warning
    default:
      return '❌'; // Cross mark
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
function PlantIconDisplay({ plantId, plantData }: { plantId: string; plantData: PlantData | undefined }): React.JSX.Element {
  const plantIcon = getPlantIcon(plantId);
  const hasIcon = hasPlantIcon(plantId);

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
 * Individual relationship item
 */
function RelationshipItem({
  plantId,
  icon,
  label,
  isNegative = false,
  onPress,
}: RelationshipItemProps): React.JSX.Element {
  const plant = usePlantStore((state) => state.getPlantById(plantId));
  const plantName = plant?.nameNl ?? plantId;

  return (
    <Pressable
      onPress={onPress}
      className="bg-gray-800/60 rounded-xl p-3 mb-3"
      style={{ width: '100%' }}
      android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
    >
      <View className="flex-row items-center">
        {/* Plant icon */}
        <View className="w-10 h-10 rounded-full bg-gray-700 items-center justify-center mr-3">
          <PlantIconDisplay plantId={plantId} plantData={plant} />
        </View>

        <View className="flex-1 flex-shrink">
          <Text className="text-white font-medium" numberOfLines={1}>{plantName}</Text>
          <View className="flex-row items-center mt-1">
            <Text className="mr-1">{icon}</Text>
            <Text
              className={`text-xs ${isNegative ? 'text-red-400' : 'text-green-400'}`}
              numberOfLines={1}
            >
              {label}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/**
 * Section header with icon
 */
function SectionHeader({
  title,
  icon,
  count,
}: {
  title: string;
  icon: string;
  count: number;
}): React.JSX.Element {
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

/**
 * Empty state component
 */
function EmptyState({ message }: { message: string }): React.JSX.Element {
  return (
    <View className="bg-gray-800/40 rounded-xl p-4 items-center">
      <Text className="text-gray-500 text-sm">{message}</Text>
    </View>
  );
}

/**
 * CompanionList - Shows companion and combative plant relationships
 */
export function CompanionList({
  companions,
  combatives,
  onPlantPress,
}: CompanionListProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <View className="px-4">
      {/* Companion Plants Section */}
      <View className="mb-6">
        <SectionHeader
          title={t('plantDetails.companionPlants')}
          icon="🤝"
          count={companions.length}
        />
        {companions.length > 0 ? (
          <View>
            {companions.map((companion) => (
              <RelationshipItem
                key={companion.plantId}
                plantId={companion.plantId}
                icon={getBenefitIcon(companion.benefit)}
                label={t(`plants.benefits.${companion.benefit}`)}
                onPress={() => onPlantPress?.(companion.plantId)}
              />
            ))}
          </View>
        ) : (
          <EmptyState message={t('plantDetails.noCompanions')} />
        )}
      </View>

      {/* Combative Plants Section */}
      <View className="mb-6">
        <SectionHeader
          title={t('plantDetails.combativePlants')}
          icon="⚠️"
          count={combatives.length}
        />
        {combatives.length > 0 ? (
          <View>
            {combatives.map((combative) => (
              <RelationshipItem
                key={combative.plantId}
                plantId={combative.plantId}
                icon={getHarmIcon(combative.harm)}
                label={t(`plants.harms.${combative.harm}`)}
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
