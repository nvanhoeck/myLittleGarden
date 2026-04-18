import React, { useState, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { HomeScreenProps } from '@/navigation/navigationTypes';
import {
  GardenCanvas,
  ComponentCreationModal,
  ComponentInventory,
  ComponentContextMenu,
} from '@/components/organisms';
import type { ComponentData } from '@/types';

/**
 * HomeScreen is the main garden view where users can see and interact
 * with their garden components. Features:
 * - Transparent top app bar with garden title and settings button
 * - GardenCanvas showing the garden layout with placed components
 * - Floating action button for adding new components
 * - ComponentInventory accordion at the bottom showing unplaced components
 * - Tap component in inventory to place it on canvas
 * - Long press component for edit/delete options
 */
export function HomeScreen({ navigation }: HomeScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const [isCreationModalVisible, setIsCreationModalVisible] = useState(false);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [placingComponent, setPlacingComponent] = useState<ComponentData | null>(null);

  // Context menu state
  const [contextMenuComponent, setContextMenuComponent] = useState<ComponentData | null>(null);
  const [isContextMenuVisible, setIsContextMenuVisible] = useState(false);

  // Edit mode state (for editing existing component)
  const [editingComponent, setEditingComponent] = useState<ComponentData | null>(null);

  const handleSettingsPress = (): void => {
    navigation.navigate('Settings');
  };


  const handleFabPress = useCallback(() => {
    setIsCreationModalVisible(true);
  }, []);

  const handleCloseCreationModal = useCallback(() => {
    setIsCreationModalVisible(false);
    setEditingComponent(null);
  }, []);

  const handleComponentCreated = useCallback((componentId: string) => {
    // Component was created and added to inventory
    console.log('Component created:', componentId);
  }, []);

  const handleComponentPress = useCallback((component: ComponentData) => {
    // Select component on canvas
    setSelectedComponentId(component.id);
  }, []);

  const handleSelectionChange = useCallback((componentId: string | null) => {
    setSelectedComponentId(componentId);
  }, []);

  const handleComponentLongPress = useCallback((component: ComponentData) => {
    // Show context menu
    setContextMenuComponent(component);
    setIsContextMenuVisible(true);
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setIsContextMenuVisible(false);
    setContextMenuComponent(null);
  }, []);

  const handleViewDetails = useCallback((component: ComponentData) => {
    navigation.navigate('ComponentDetail', { componentId: component.id });
  }, [navigation]);

  const handleEditComponent = useCallback((component: ComponentData) => {
    // Open creation modal in edit mode
    setEditingComponent(component);
    setIsCreationModalVisible(true);
  }, []);

  const handleComponentDeleted = useCallback(() => {
    // Clear selection if deleted component was selected
    setSelectedComponentId(null);
  }, []);

  const handleReturnedToInventory = useCallback(() => {
    // Clear selection
    setSelectedComponentId(null);
  }, []);

  const handleInventorySelectComponent = useCallback((component: ComponentData) => {
    // Enter placement mode - user can now tap on canvas to place
    setPlacingComponent(component);
    setSelectedComponentId(null); // Deselect any selected component
  }, []);

  const handlePlacementComplete = useCallback(() => {
    // Component was placed successfully
    setPlacingComponent(null);
  }, []);

  const handlePlacementCancel = useCallback(() => {
    // User cancelled placement
    setPlacingComponent(null);
  }, []);

  // Hide FAB and inventory when in placement mode
  const isPlacementMode = placingComponent !== null;

  return (
    <SafeAreaView className="flex-1 bg-background" testID="home-screen">
      {/* Transparent TopAppBar */}
      <View className="flex-row items-center justify-between px-4 h-16">
        <Text className="text-headline-small text-on-background font-medium">
          {t('screens.home.title')}
        </Text>

        <View className="flex-row items-center">
        <Pressable
          onPress={handleSettingsPress}
          className="w-touch-target h-touch-target items-center justify-center rounded-full"
          testID="settings-button"
          accessibilityLabel={t('screens.settings.title')}
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          android_ripple={{ color: 'rgba(255,255,255,0.1)', borderless: true }}
        >
          {/* Settings gear icon using Unicode character */}
          <Text className="text-2xl text-on-surface">
            ⚙️
          </Text>
        </Pressable>
        </View>
      </View>

      {/* Garden Canvas */}
      <View className="flex-1">
        <GardenCanvas
          selectedComponentId={selectedComponentId}
          onSelectionChange={handleSelectionChange}
          onComponentPress={handleComponentPress}
          onComponentLongPress={handleComponentLongPress}
          placingComponent={placingComponent}
          onPlacementComplete={handlePlacementComplete}
          onPlacementCancel={handlePlacementCancel}
          testID="home-garden-canvas"
        />
      </View>

      {/* Component Inventory - hidden during placement */}
      {!isPlacementMode && (
        <ComponentInventory
          onSelectComponent={handleInventorySelectComponent}
          onLongPressComponent={handleComponentLongPress}
          testID="home-component-inventory"
        />
      )}

      {/* Floating Action Button - hidden during placement */}
      {!isPlacementMode && (
        <Pressable
          onPress={handleFabPress}
          className="absolute bottom-28 right-4 w-14 h-14 bg-green-600 rounded-full items-center justify-center shadow-lg"
          testID="add-component-fab"
          accessibilityLabel={t('componentCreation.addComponent')}
          accessibilityRole="button"
          android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}
        >
          <Text className="text-white text-3xl font-light">+</Text>
        </Pressable>
      )}

      {/* Component Creation Modal */}
      <ComponentCreationModal
        visible={isCreationModalVisible}
        onClose={handleCloseCreationModal}
        onCreated={handleComponentCreated}
        editingComponent={editingComponent}
        testID="home-creation-modal"
      />

      {/* Component Context Menu */}
      <ComponentContextMenu
        component={contextMenuComponent}
        visible={isContextMenuVisible}
        onClose={handleCloseContextMenu}
        onViewDetails={handleViewDetails}
        onEdit={handleEditComponent}
        onDeleted={handleComponentDeleted}
        onReturnedToInventory={handleReturnedToInventory}
      />
    </SafeAreaView>
  );
}
