/**
 * TowerLayerTabs
 * Round tab buttons for selecting tower layers, plus an eye icon for overview mode.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

interface TowerLayerTabsProps {
  numberOfLayers: number;
  selectedLayer: number;
  onLayerSelect: (layerIndex: number) => void;
  onOverviewPress: () => void;
  isOverviewActive?: boolean;
}

/**
 * TowerLayerTabs - displays round buttons for each layer plus overview toggle
 */
export function TowerLayerTabs({
  numberOfLayers,
  selectedLayer,
  onLayerSelect,
  onOverviewPress,
  isOverviewActive = false,
}: TowerLayerTabsProps): React.JSX.Element {
  const { t } = useTranslation();

  // Create array of layer indices (0 = bottom, n-1 = top)
  const layers = Array.from({ length: numberOfLayers }, (_, i) => i);

  return (
    <View style={styles.container}>
      {/* Layer tabs */}
      <View style={styles.tabsContainer}>
        {layers.map((layerIndex) => {
          const isSelected = selectedLayer === layerIndex && !isOverviewActive;
          const layerNumber = layerIndex + 1; // Display as 1-indexed for users

          return (
            <Pressable
              key={layerIndex}
              onPress={() => onLayerSelect(layerIndex)}
              style={[
                styles.layerTab,
                isSelected && styles.layerTabSelected,
              ]}
              android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
              testID={`layer-tab-${layerIndex}`}
            >
              <Text style={[
                styles.layerTabText,
                isSelected && styles.layerTabTextSelected,
              ]}>
                {layerNumber}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Overview button with eye icon */}
      <Pressable
        onPress={onOverviewPress}
        style={[
          styles.overviewButton,
          isOverviewActive && styles.overviewButtonActive,
        ]}
        android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
        testID="layer-overview-button"
      >
        <Text style={styles.overviewIcon}>
          {isOverviewActive ? '👁️' : '👁️‍🗨️'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  layerTab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4b5563',
  },
  layerTabSelected: {
    backgroundColor: '#16a34a',
    borderColor: '#22c55e',
  },
  layerTabText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '600',
  },
  layerTabTextSelected: {
    color: '#ffffff',
  },
  overviewButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4b5563',
  },
  overviewButtonActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0ea5e9',
  },
  overviewIcon: {
    fontSize: 18,
  },
});
