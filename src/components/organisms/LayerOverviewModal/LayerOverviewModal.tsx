/**
 * LayerOverviewModal
 * Modal showing all tower layers stacked with plants and their labels visible.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ComponentData, PlacedPlantData, PlantData } from '@/types';
import { PLANT_CATEGORIES } from '@/types/plant.types';
import {
  isRectangularTower,
  isCircularTower,
} from '@/stores/componentStore';
import { usePlantStore } from '@/stores/plantStore';
import { getPlantIcon, hasPlantIcon } from '@/assets';

interface LayerOverviewModalProps {
  visible: boolean;
  onClose: () => void;
  component: ComponentData;
}

interface LayerViewProps {
  layerIndex: number;
  numberOfLayers: number;
  plants: PlacedPlantData[];
  getPlantById: (id: string) => PlantData | undefined;
  widthCm: number;
  heightCm: number;
  isCircular: boolean;
}

const LAYER_REDUCTION_FACTOR = 0.85;

/**
 * Get the category icon emoji for a plant (fallback)
 */
function getCategoryIconEmoji(plantData: PlantData | undefined): string {
  if (!plantData) return '🌱';
  const categoryInfo = PLANT_CATEGORIES.find((cat) => cat.key === plantData.category);
  return categoryInfo?.icon ?? '🌱';
}

/**
 * Plant icon display for layer overview
 */
function PlantIconInLayer({ plantData }: { plantData: PlantData | undefined }): React.JSX.Element {
  if (!plantData) {
    return <Text style={styles.plantIconText}>🌱</Text>;
  }

  const plantIcon = getPlantIcon(plantData.id);
  const hasIcon = hasPlantIcon(plantData.id);

  if (hasIcon && plantIcon) {
    return (
      <Image
        source={plantIcon}
        style={styles.plantIconImage}
        resizeMode="contain"
      />
    );
  }

  return <Text style={styles.plantIconText}>{getCategoryIconEmoji(plantData)}</Text>;
}

/**
 * Calculate layer dimensions based on layer index
 */
function getLayerDimensions(
  layerIndex: number,
  baseWidth: number,
  baseHeight: number
): { width: number; height: number } {
  const factor = Math.pow(LAYER_REDUCTION_FACTOR, layerIndex);
  return {
    width: baseWidth * factor,
    height: baseHeight * factor,
  };
}

/**
 * Single layer view showing plants with labels
 */
function LayerView({
  layerIndex,
  numberOfLayers,
  plants,
  getPlantById,
  widthCm,
  heightCm,
  isCircular,
}: LayerViewProps): React.JSX.Element {
  const { t } = useTranslation();
  const layerNumber = layerIndex + 1;
  const isTopLayer = layerIndex === numberOfLayers - 1;
  const isBottomLayer = layerIndex === 0;

  const layerDimensions = getLayerDimensions(layerIndex, widthCm, heightCm);

  // Filter plants for this layer
  const layerPlants = plants.filter((p) => (p.layerIndex ?? 0) === layerIndex);

  // Scale to fit in container
  const maxContainerWidth = 280;
  const maxContainerHeight = 120;
  const scale = Math.min(
    maxContainerWidth / layerDimensions.width,
    maxContainerHeight / layerDimensions.height,
    2
  );

  const containerWidth = layerDimensions.width * scale;
  const containerHeight = layerDimensions.height * scale;

  return (
    <View style={styles.layerContainer}>
      {/* Layer header */}
      <View style={styles.layerHeader}>
        <View style={styles.layerBadge}>
          <Text style={styles.layerBadgeText}>{layerNumber}</Text>
        </View>
        <Text style={styles.layerTitle}>
          {t('componentDetail.layer')} {layerNumber}
          {isTopLayer && ' (Boven)'}
          {isBottomLayer && ' (Onder)'}
        </Text>
        <Text style={styles.layerDimensions}>
          {layerDimensions.width.toFixed(0)} x {layerDimensions.height.toFixed(0)} cm
        </Text>
      </View>

      {/* Layer visualization */}
      <View style={styles.layerVisualization}>
        <View
          style={[
            styles.layerShape,
            {
              width: containerWidth,
              height: containerHeight,
              borderRadius: isCircular ? containerWidth / 2 : 8,
            },
          ]}
        >
          {/* Plants on this layer */}
          {layerPlants.map((plant) => {
            const plantData = getPlantById(plant.plantId);
            const plantX = (plant.positionX / layerDimensions.width) * containerWidth;
            const plantY = (plant.positionY / layerDimensions.height) * containerHeight;

            return (
              <View
                key={plant.id}
                style={[
                  styles.plantDot,
                  {
                    left: plantX - 12,
                    top: plantY - 12,
                  },
                ]}
              >
                <View style={styles.plantIconContainer}>
                  <PlantIconInLayer plantData={plantData} />
                </View>
                <View style={styles.plantLabelContainer}>
                  <Text style={styles.plantLabel} numberOfLines={1}>
                    {plantData?.nameNl ?? '?'}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Empty state */}
          {layerPlants.length === 0 && (
            <View style={styles.emptyLayer}>
              <Text style={styles.emptyLayerText}>
                {t('componentDetail.emptyLayer')}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Plant count */}
      <Text style={styles.plantCount}>
        {layerPlants.length} {layerPlants.length === 1 ? 'plant' : 'planten'}
      </Text>
    </View>
  );
}

/**
 * LayerOverviewModal - shows all layers stacked
 */
export function LayerOverviewModal({
  visible,
  onClose,
  component,
}: LayerOverviewModalProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const getPlantById = usePlantStore((state) => state.getPlantById);

  // Only render for towers
  const isTower = isRectangularTower(component) || isCircularTower(component);
  if (!isTower) return null;

  const numberOfLayers = component.numberOfLayers;
  const isCircular = isCircularTower(component);

  // Get base dimensions
  const baseDimensions = useMemo(() => {
    if (isRectangularTower(component)) {
      return {
        width: component.widthInCm - component.borderWidthInCm * 2,
        height: component.lengthInCm - component.borderWidthInCm * 2,
      };
    }
    if (isCircularTower(component)) {
      const size = component.diameterInCm - component.borderWidthInCm * 2;
      return { width: size, height: size };
    }
    return { width: 100, height: 100 };
  }, [component]);

  // Create layers array from top to bottom for display
  const layers = useMemo(() => {
    return Array.from({ length: numberOfLayers }, (_, i) => numberOfLayers - 1 - i);
  }, [numberOfLayers]);

  const plants = component.plants || [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {t('componentDetail.layerOverview')}
            </Text>
            <Text style={styles.modalSubtitle}>
              {component.name} • {numberOfLayers} {t('componentInventory.layers')}
            </Text>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={12}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>

          {/* Layers scroll view (from top to bottom) */}
          <ScrollView
            style={styles.layersScroll}
            contentContainerStyle={styles.layersContent}
            showsVerticalScrollIndicator={false}
          >
            {layers.map((layerIndex) => (
              <LayerView
                key={layerIndex}
                layerIndex={layerIndex}
                numberOfLayers={numberOfLayers}
                plants={plants as PlacedPlantData[]}
                getPlantById={getPlantById}
                widthCm={baseDimensions.width}
                heightCm={baseDimensions.height}
                isCircular={isCircular}
              />
            ))}

            {/* Stack indicator */}
            <View style={styles.stackIndicator}>
              <Text style={styles.stackIcon}>⬆️</Text>
              <Text style={styles.stackText}>
                {t('componentDetail.topToBottom')}
              </Text>
              <Text style={styles.stackIcon}>⬇️</Text>
            </View>
          </ScrollView>

          {/* Close button */}
          <Pressable
            onPress={onClose}
            style={styles.doneButton}
            android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
          >
            <Text style={styles.doneButtonText}>{t('common.close')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '600',
  },
  layersScroll: {
    flex: 1,
  },
  layersContent: {
    padding: 16,
    gap: 16,
  },
  layerContainer: {
    backgroundColor: '#374151',
    borderRadius: 16,
    padding: 12,
  },
  layerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  layerBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  layerBadgeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  layerTitle: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  layerDimensions: {
    color: '#9ca3af',
    fontSize: 12,
  },
  layerVisualization: {
    alignItems: 'center',
    marginBottom: 8,
  },
  layerShape: {
    backgroundColor: '#3d2914',
    borderWidth: 2,
    borderColor: '#8B4513',
    position: 'relative',
  },
  plantDot: {
    position: 'absolute',
    alignItems: 'center',
  },
  plantIconContainer: {
    width: 24,
    height: 24,
    backgroundColor: '#16a34a',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  plantIconText: {
    fontSize: 12,
    textAlign: 'center',
  },
  plantIconImage: {
    width: 20,
    height: 20,
  },
  plantLabelContainer: {
    position: 'absolute',
    top: 26,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 60,
    alignItems: 'center',
  },
  plantLabel: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '500',
  },
  emptyLayer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  emptyLayerText: {
    color: '#6b7280',
    fontSize: 12,
    fontStyle: 'italic',
  },
  plantCount: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
  },
  stackIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  stackIcon: {
    fontSize: 14,
  },
  stackText: {
    color: '#6b7280',
    fontSize: 12,
  },
  doneButton: {
    backgroundColor: '#16a34a',
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
