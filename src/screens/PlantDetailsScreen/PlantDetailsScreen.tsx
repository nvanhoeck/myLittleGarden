/**
 * PlantDetailsScreen
 * Comprehensive plant information view with quick info, growing calendar,
 * and companion/combative plant relationships.
 */

import React, { useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PlantDetailsScreenProps } from '@/navigation/navigationTypes';
import { usePlantStore } from '@/stores/plantStore';
import { useFrostDates } from '@/stores/environmentStore';
import { QuickInfoGrid, GrowingCalendar, CompanionList } from '@/components/organisms';
import { PLANT_CATEGORIES } from '@/types/plant.types';
import { getPlantImage, hasPlantImage } from '@/assets';

/**
 * Get category info by key
 */
function getCategoryInfo(categoryKey: string) {
  return PLANT_CATEGORIES.find((cat) => cat.key === categoryKey);
}

/**
 * Plant image component - shows actual image or placeholder
 */
function PlantImageDisplay({
  plantId,
  plantName,
  categoryIcon,
}: {
  plantId: string;
  plantName: string;
  categoryIcon: string;
}): React.JSX.Element {
  const plantImage = getPlantImage(plantId);
  const hasImage = hasPlantImage(plantId);

  if (hasImage && plantImage) {
    return (
      <View className="h-48 bg-gray-800 items-center justify-center">
        <Image
          source={plantImage}
          className="w-full h-full"
          resizeMode="cover"
        />
      </View>
    );
  }

  // Fallback to emoji placeholder
  return (
    <View className="h-48 bg-gray-800 items-center justify-center">
      <Text className="text-6xl mb-2">{categoryIcon}</Text>
      <Text className="text-gray-400 text-sm">{plantName}</Text>
    </View>
  );
}

/**
 * Plant header with name, scientific name, and category
 */
function PlantHeader({
  name,
  scientificName,
  category,
  categoryLabel,
}: {
  name: string;
  scientificName: string;
  category: string;
  categoryLabel: string;
}): React.JSX.Element {
  return (
    <View className="px-4 py-4">
      <Text className="text-white text-2xl font-bold">{name}</Text>
      <Text className="text-gray-400 text-sm italic mb-2">{scientificName}</Text>
      <View className="flex-row items-center">
        <View className="bg-green-900/50 px-3 py-1 rounded-full">
          <Text className="text-green-400 text-sm">{categoryLabel}</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Plant description section
 */
function PlantDescription({ description }: { description: string }): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <View className="px-4 mb-6">
      <Text className="text-white text-xl font-semibold mb-2">
        {t('plantDetails.description')}
      </Text>
      <Text className="text-gray-300 leading-6">{description}</Text>
    </View>
  );
}

/**
 * Section divider
 */
function SectionDivider(): React.JSX.Element {
  return <View className="h-px bg-gray-800 mx-4 my-4" />;
}

/**
 * PlantDetailsScreen - Full plant information view
 */
export function PlantDetailsScreen({
  navigation,
  route,
}: PlantDetailsScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const { plantId } = route.params;
  const plant = usePlantStore((state) => state.getPlantById(plantId));
  const effectiveCompanions = usePlantStore((state) => state.getEffectiveCompanionsFor(plantId));
  const effectiveCombatives = usePlantStore((state) => state.getEffectiveCombativesFor(plantId));
  const frostDates = useFrostDates();

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handlePlantPress = useCallback(
    (relatedPlantId: string) => {
      navigation.push('PlantDetails', { plantId: relatedPlantId });
    },
    [navigation]
  );

  if (!plant) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-4xl mb-4">🌿</Text>
        <Text className="text-white text-lg mb-2">{t('plantDetails.notFound')}</Text>
        <Pressable
          onPress={handleBack}
          className="mt-4 px-6 py-3 bg-green-600 rounded-lg"
        >
          <Text className="text-white font-medium">{t('common.back')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const categoryInfo = getCategoryInfo(plant.category);
  const categoryLabel = t(`plants.categories.${plant.category}`);
  const categoryIcon = categoryInfo?.icon ?? '🌿';

  return (
    <SafeAreaView className="flex-1 bg-background" testID="plant-details-screen">
      {/* Fixed Header */}
      <View className="flex-row items-center px-4 h-14 border-b border-gray-800 bg-background">
        <Pressable
          onPress={handleBack}
          className="w-10 h-10 items-center justify-center rounded-full mr-2"
          hitSlop={8}
        >
          <Text className="text-white text-2xl">←</Text>
        </Pressable>
        <View className="flex-1">
          <Text className="text-white text-lg font-semibold" numberOfLines={1}>
            {plant.nameNl}
          </Text>
          <Text className="text-gray-400 text-xs italic">{plant.scientificName}</Text>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Plant Image */}
        <PlantImageDisplay plantId={plant.id} plantName={plant.nameNl} categoryIcon={categoryIcon} />

        {/* Plant Header */}
        <PlantHeader
          name={plant.nameNl}
          scientificName={plant.scientificName}
          category={plant.category}
          categoryLabel={categoryLabel}
        />

        {/* Description */}
        <PlantDescription description={plant.description} />

        <SectionDivider />

        {/* Quick Info Grid */}
        <View className="mb-6">
          <QuickInfoGrid plant={plant} />
        </View>

        <SectionDivider />

        {/* Growing Calendar */}
        <View className="mb-6">
          <GrowingCalendar plant={plant} lastSpringFrost={frostDates.spring} />
        </View>

        <SectionDivider />

        {/* Companion and Combative Plants */}
        <CompanionList
          companions={effectiveCompanions}
          combatives={effectiveCombatives}
          onPlantPress={handlePlantPress}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
