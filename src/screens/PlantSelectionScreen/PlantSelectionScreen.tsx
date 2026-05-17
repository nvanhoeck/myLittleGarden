/**
 * PlantSelectionScreen
 * Grid view for selecting plants to add to a component
 */

import React, { useCallback, useState, useMemo } from 'react';
import { View, Text, Pressable, FlatList, TextInput, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PlantSelectionScreenProps } from '@/navigation/navigationTypes';
import { useAllPlants, useComponent, useComponentStore } from '@/stores';
import { generateId } from '@/utils/idGenerator';
import type { PlantData, PlantCategory, PlacedPlantData } from '@/types';
import { PLANT_CATEGORIES } from '@/types/plant.types';
import { getPlantIcon, hasPlantIcon } from '@/assets';

/**
 * Plant tile component for the selection grid
 */
/**
 * Get the category icon emoji for a plant (fallback)
 */
function getCategoryIcon(plant: PlantData): string {
  const categoryInfo = PLANT_CATEGORIES.find((cat) => cat.key === plant.category);
  return categoryInfo?.icon ?? '🌱';
}

/**
 * Plant icon display - shows image or emoji fallback
 */
function PlantIconDisplay({ plant }: { plant: PlantData }): React.JSX.Element {
  const plantIcon = getPlantIcon(plant.id);
  const hasIcon = hasPlantIcon(plant.id);

  if (hasIcon && plantIcon) {
    return (
      <Image
        source={plantIcon}
        style={{ width: 40, height: 40 }}
        resizeMode="contain"
      />
    );
  }

  return <Text className="text-2xl">{getCategoryIcon(plant)}</Text>;
}

function PlantTile({
  plant,
  isSelected,
  onPress,
  onLongPress,
}: {
  plant: PlantData;
  isSelected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      className={`
        flex-1 m-1 p-3 rounded-xl items-center
        ${isSelected ? 'bg-green-600' : 'bg-gray-800'}
      `}
      style={{ minWidth: 100, maxWidth: 120 }}
      android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
      testID={`plant-tile-${plant.id}`}
    >
      <View className="mb-1">
        <PlantIconDisplay plant={plant} />
      </View>
      <Text
        className={`text-sm font-medium text-center ${isSelected ? 'text-white' : 'text-gray-200'}`}
        numberOfLines={2}
      >
        {plant.nameNl}
      </Text>
      <Text className={`text-xs ${isSelected ? 'text-green-200' : 'text-gray-400'}`}>
        {plant.plantingStyle === "patch" ? (plant.sowingSpacingCm ?? plant.spacingRadiusCm) : plant.spacingRadiusCm}cm
      </Text>
    </Pressable>
  );
}

/**
 * Category accordion/section
 */
function CategorySection({
  category,
  plants,
  selectedPlantId,
  onSelectPlant,
  onPlantLongPress,
  isExpanded,
  onToggle,
}: {
  category: { key: PlantCategory; labelNl: string; icon: string };
  plants: PlantData[];
  selectedPlantId: string | null;
  onSelectPlant: (plant: PlantData) => void;
  onPlantLongPress: (plant: PlantData) => void;
  isExpanded: boolean;
  onToggle: () => void;
}): React.JSX.Element {
  return (
    <View className="mb-2">
      <Pressable
        onPress={onToggle}
        className="flex-row items-center justify-between bg-gray-800 rounded-xl px-4 py-3"
        android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
      >
        <View className="flex-row items-center">
          <Text className="text-xl mr-2">{category.icon}</Text>
          <Text className="text-white font-medium">{category.labelNl}</Text>
          <View className="ml-2 bg-gray-700 rounded-full px-2 py-0.5">
            <Text className="text-gray-300 text-xs">{plants.length}</Text>
          </View>
        </View>
        <Text className="text-gray-400">{isExpanded ? '▲' : '▼'}</Text>
      </Pressable>

      {isExpanded && (
        <View className="flex-row flex-wrap mt-2 px-1">
          {plants.map((plant) => (
            <PlantTile
              key={plant.id}
              plant={plant}
              isSelected={selectedPlantId === plant.id}
              onPress={() => onSelectPlant(plant)}
              onLongPress={() => onPlantLongPress(plant)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * PlantSelectionScreen - select plants to add to a component
 */
export function PlantSelectionScreen({
  navigation,
  route,
}: PlantSelectionScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const { componentId, layerIndex } = route.params;
  const component = useComponent(componentId);
  const allPlants = useAllPlants();
  const updateComponent = useComponentStore((state) => state.updateComponent);

  // State
  const [selectedPlant, setSelectedPlant] = useState<PlantData | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<PlantCategory>>(
    new Set(['fruit', 'kruiden'])
  );

  // Filter plants by search query
  const filteredPlants = useMemo(() => {
    if (!searchQuery.trim()) return allPlants;
    const query = searchQuery.toLowerCase();
    return allPlants.filter(
      (plant) =>
        plant.nameNl.toLowerCase().includes(query) ||
        plant.scientificName.toLowerCase().includes(query)
    );
  }, [allPlants, searchQuery]);

  // Group plants by category
  const plantsByCategory = useMemo(() => {
    const grouped = new Map<PlantCategory, PlantData[]>();
    PLANT_CATEGORIES.forEach((cat) => grouped.set(cat.key, []));
    filteredPlants.forEach((plant) => {
      const list = grouped.get(plant.category);
      if (list) list.push(plant);
    });
    return grouped;
  }, [filteredPlants]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSelectPlant = useCallback((plant: PlantData) => {
    setSelectedPlant(plant);
    setQuantity(1);
  }, []);

  const handleToggleCategory = useCallback((category: PlantCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const handlePlantLongPress = useCallback((plant: PlantData) => {
    navigation.navigate('PlantDetails', { plantId: plant.id });
  }, [navigation]);

  const handleQuantityChange = useCallback((delta: number) => {
    setQuantity((prev) => Math.max(1, Math.min(10, prev + delta)));
  }, []);

  const handleAddPlants = useCallback(() => {
    if (!selectedPlant || !component) return;

    // Calculate inner dimensions based on component type
    let innerWidth: number;
    let innerHeight: number;
    const layerScale = layerIndex !== undefined ? Math.pow(0.85, layerIndex) : 1;

    switch (component.type) {
      case 'gardenBox':
        innerWidth = component.widthInCm - 2 * component.borderWidthInCm;
        innerHeight = component.lengthInCm - 2 * component.borderWidthInCm;
        break;
      case 'pot':
        innerWidth = component.diameterInCm - 2 * component.borderWidthInCm;
        innerHeight = innerWidth;
        break;
      case 'rectangularTower':
        innerWidth = (component.widthInCm - 2 * component.borderWidthInCm) * layerScale;
        innerHeight = (component.lengthInCm - 2 * component.borderWidthInCm) * layerScale;
        break;
      case 'circularTower':
        innerWidth = (component.diameterInCm - 2 * component.borderWidthInCm) * layerScale;
        innerHeight = innerWidth;
        break;
      default:
        innerWidth = 100;
        innerHeight = 100;
    }

    // Calculate center position
    const centerX = innerWidth / 2;
    const centerY = innerHeight / 2;

    // Horizontal offset for multiple plants (2cm spacing)
    const horizontalOffsetCm = 2;

    // Calculate horizontal offsets for each plant
    const getHorizontalOffsets = (count: number): number[] => {
      if (count === 1) return [0];
      const offsets: number[] = [];
      const halfCount = Math.floor(count / 2);
      if (count % 2 === 1) {
        // Odd: center first, then alternate left/right
        offsets.push(0);
        for (let j = 1; j <= halfCount; j++) {
          offsets.push(-j * horizontalOffsetCm);
          offsets.push(j * horizontalOffsetCm);
        }
      } else {
        // Even: alternate left/right from center
        for (let j = 0; j < halfCount; j++) {
          offsets.push(-(j + 0.5) * horizontalOffsetCm);
          offsets.push((j + 0.5) * horizontalOffsetCm);
        }
      }
      return offsets.slice(0, count);
    };

    const offsets = getHorizontalOffsets(quantity);

    // Create placed plant instances
    const newPlants: PlacedPlantData[] = [];
    const existingPlants = component.plants || [];

    for (let i = 0; i < quantity; i++) {
      newPlants.push({
        id: generateId(),
        plantId: selectedPlant.id,
        // Place in center with horizontal offset
        positionX: centerX + offsets[i],
        positionY: centerY,
        placedAt: new Date().toISOString(),
        // Include layer index for towers (undefined for non-towers)
        layerIndex: layerIndex,
      });
    }

    // Update component with new plants
    updateComponent(componentId, {
      plants: [...existingPlants, ...newPlants],
    });

    // Navigate back to component detail
    navigation.goBack();
  }, [selectedPlant, component, quantity, componentId, updateComponent, navigation, layerIndex]);

  if (!component) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-on-surface">{t('componentDetail.notFound')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" testID="plant-selection-screen">
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
          <Text className="text-white text-lg font-semibold">
            {t('plantSelection.title')}
          </Text>
          <Text className="text-gray-400 text-sm">
            {component.name}
          </Text>
        </View>
      </View>

      {/* Search */}
      <View className="px-4 py-3">
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('plantSelection.searchPlaceholder')}
          placeholderTextColor="#6b7280"
          className="bg-gray-800 rounded-xl px-4 py-3 text-white"
          testID="plant-search-input"
        />
      </View>

      {/* Plant Categories */}
      <FlatList
        data={PLANT_CATEGORIES}
        keyExtractor={(item) => item.key}
        renderItem={({ item: category }) => {
          const plants = plantsByCategory.get(category.key) || [];
          if (plants.length === 0 && searchQuery) return null;
          return (
            <CategorySection
              category={category}
              plants={plants}
              selectedPlantId={selectedPlant?.id ?? null}
              onSelectPlant={handleSelectPlant}
              onPlantLongPress={handlePlantLongPress}
              isExpanded={expandedCategories.has(category.key)}
              onToggle={() => handleToggleCategory(category.key)}
            />
          );
        }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Selection Footer */}
      {selectedPlant && (
        <View className="absolute bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 p-4">
          <View className="flex-row items-center mb-3">
            <View className="flex-1">
              <Text className="text-white font-semibold">{selectedPlant.nameNl}</Text>
              <Text className="text-gray-400 text-sm">
                {selectedPlant.plantingStyle === 'thinning' ? t('plantSelection.finalSpacing') : selectedPlant.plantingStyle === 'patch' ? t('plantSelection.sowingSpacing') : t('plantSelection.spacing')}: {selectedPlant.plantingStyle === 'patch' ? (selectedPlant.sowingSpacingCm ?? selectedPlant.spacingRadiusCm) : selectedPlant.spacingRadiusCm}cm
              </Text>
            </View>

            {/* Quantity selector */}
            <View className="flex-row items-center bg-gray-800 rounded-xl">
              <Pressable
                onPress={() => handleQuantityChange(-1)}
                className="w-10 h-10 items-center justify-center"
                disabled={quantity <= 1}
              >
                <Text className={`text-xl ${quantity <= 1 ? 'text-gray-600' : 'text-white'}`}>
                  -
                </Text>
              </Pressable>
              <Text className="text-white font-bold px-4">{quantity}</Text>
              <Pressable
                onPress={() => handleQuantityChange(1)}
                className="w-10 h-10 items-center justify-center"
                disabled={quantity >= 10}
              >
                <Text className={`text-xl ${quantity >= 10 ? 'text-gray-600' : 'text-white'}`}>
                  +
                </Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={handleAddPlants}
            className="bg-green-600 rounded-xl py-4 items-center"
            android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
            testID="add-plants-button"
          >
            <Text className="text-white font-semibold">
              {t('plantSelection.addToComponent', { count: quantity })}
            </Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}
