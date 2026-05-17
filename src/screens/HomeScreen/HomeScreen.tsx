import React, { useState, useCallback, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { HomeScreenProps } from '@/navigation/navigationTypes';
import { useAllComponents, useComponentStore } from '@/stores';
import {
  ComponentCreationModal,
  ComponentInventory,
  ComponentContextMenu,
} from '@/components/organisms';
import { GardenCanvas } from '@/components/organisms/GardenCanvas/GardenCanvas';
import type { GardenCanvasRef, CanvasMode } from '@/components/organisms/GardenCanvas/GardenCanvas';
import type { ComponentData } from '@/types';

const ROTATION_STEP = 15;

/**
 * HomeScreen - main garden view.
 *
 * Canvas modes:
 *  - 'default': tap a component to open its context menu
 *  - 'rotate':  tap a component to select it; use toolbar to rotate
 *  - 'drag':    touch a component to drag it to a new position
 */
export function HomeScreen({ navigation }: HomeScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const components = useAllComponents();
  const rotateComponent = useComponentStore((state) => state.rotateComponent);

  const [canvasMode, setCanvasMode] = useState<CanvasMode>('default');
  const [isCreationModalVisible, setIsCreationModalVisible] = useState(false);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [placingComponent, setPlacingComponent] = useState<ComponentData | null>(null);
  const [isDragPlacing, setIsDragPlacing] = useState(false);
  const [contextMenuComponent, setContextMenuComponent] = useState<ComponentData | null>(null);
  const [isContextMenuVisible, setIsContextMenuVisible] = useState(false);
  const [editingComponent, setEditingComponent] = useState<ComponentData | null>(null);

  const gardenCanvasRef = useRef<GardenCanvasRef>(null);

  const selectedComponent = selectedComponentId
    ? components.find((c) => c.id === selectedComponentId) ?? null
    : null;

  // ── Mode management ───────────────────────────────────────────────────────
  const handleEnterRotateMode = useCallback(() => {
    setCanvasMode('rotate');
    setSelectedComponentId(null);
  }, []);

  const handleEnterDragMode = useCallback(() => {
    setCanvasMode('drag');
    setSelectedComponentId(null);
  }, []);

  const handleExitMode = useCallback(() => {
    setCanvasMode('default');
    setSelectedComponentId(null);
  }, []);

  // ── Rotation ──────────────────────────────────────────────────────────────
  const handleRotateLeft = useCallback(() => {
    if (selectedComponentId && selectedComponent) {
      rotateComponent(selectedComponentId, selectedComponent.rotation - ROTATION_STEP);
    }
  }, [selectedComponentId, selectedComponent, rotateComponent]);

  const handleRotateRight = useCallback(() => {
    if (selectedComponentId && selectedComponent) {
      rotateComponent(selectedComponentId, selectedComponent.rotation + ROTATION_STEP);
    }
  }, [selectedComponentId, selectedComponent, rotateComponent]);

  // ── Canvas events ─────────────────────────────────────────────────────────
  const handleComponentTap = useCallback((component: ComponentData) => {
    setContextMenuComponent(component);
    setIsContextMenuVisible(true);
  }, []);

  const handleComponentSelect = useCallback((component: ComponentData) => {
    setSelectedComponentId(component.id);
  }, []);

  const handleSelectionChange = useCallback((componentId: string | null) => {
    setSelectedComponentId(componentId);
  }, []);

  // ── Navigation / settings ─────────────────────────────────────────────────
  const handleSettingsPress = (): void => navigation.navigate('Settings');

  const handleFabPress = useCallback(() => setIsCreationModalVisible(true), []);

  const handleCloseCreationModal = useCallback(() => {
    setIsCreationModalVisible(false);
    setEditingComponent(null);
  }, []);

  const handleComponentCreated = useCallback((_componentId: string) => {}, []);

  // ── Context menu ──────────────────────────────────────────────────────────
  const handleCloseContextMenu = useCallback(() => {
    setIsContextMenuVisible(false);
    setContextMenuComponent(null);
  }, []);

  const handleViewDetails = useCallback((component: ComponentData) => {
    navigation.navigate('ComponentDetail', { componentId: component.id });
  }, [navigation]);

  const handleEditComponent = useCallback((component: ComponentData) => {
    setEditingComponent(component);
    setIsCreationModalVisible(true);
  }, []);

  const handleComponentDeleted = useCallback(() => setSelectedComponentId(null), []);
  const handleReturnedToInventory = useCallback(() => setSelectedComponentId(null), []);

  // ── Tap-to-place flow ─────────────────────────────────────────────────────
  const handleInventorySelectComponent = useCallback((component: ComponentData) => {
    setPlacingComponent(component);
    setIsDragPlacing(false);
    setSelectedComponentId(null);
  }, []);

  const handlePlacementComplete = useCallback(() => {
    setPlacingComponent(null);
    setIsDragPlacing(false);
  }, []);

  const handlePlacementCancel = useCallback(() => {
    setPlacingComponent(null);
    setIsDragPlacing(false);
  }, []);

  // ── Drag-to-place flow ────────────────────────────────────────────────────
  const handleInventoryDragStart = useCallback((component: ComponentData) => {
    setPlacingComponent(component);
    setIsDragPlacing(true);
    setSelectedComponentId(null);
  }, []);

  const handleInventoryDragMove = useCallback((pageX: number, pageY: number) => {
    gardenCanvasRef.current?.updateDragPlacement(pageX, pageY);
  }, []);

  const handleInventoryDragRelease = useCallback((pageX: number, pageY: number) => {
    gardenCanvasRef.current?.commitDragPlacement(pageX, pageY);
    setPlacingComponent(null);
    setIsDragPlacing(false);
  }, []);

  const hideInventoryAndFab = placingComponent !== null && !isDragPlacing;

  return (
    <SafeAreaView className="flex-1 bg-background" testID="home-screen">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 h-14">
        <Text className="text-headline-small text-on-background font-medium">
          {t('screens.home.title')}
        </Text>
        <Pressable
          onPress={handleSettingsPress}
          className="w-touch-target h-touch-target items-center justify-center rounded-full"
          testID="settings-button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          android_ripple={{ color: 'rgba(255,255,255,0.1)', borderless: true }}
        >
          <Text className="text-2xl text-on-surface">⚙️</Text>
        </Pressable>
      </View>

      {/* Mode toolbar — hidden during placement */}
      {!hideInventoryAndFab && !placingComponent && (
        <View className="flex-row items-center justify-center gap-2 px-4 py-2 bg-surface border-b border-outline/20">
          {canvasMode === 'default' ? (
            <>
              <Pressable
                onPress={handleEnterRotateMode}
                className="flex-row items-center gap-1 px-3 py-2 rounded-lg bg-gray-700"
                android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
                testID="enter-rotate-mode-button"
              >
                <Text className="text-white text-sm">↺  {t('canvas.mode.rotate')}</Text>
              </Pressable>
              <Pressable
                onPress={handleEnterDragMode}
                className="flex-row items-center gap-1 px-3 py-2 rounded-lg bg-gray-700"
                android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
                testID="enter-drag-mode-button"
              >
                <Text className="text-white text-sm">✥  {t('canvas.mode.move')}</Text>
              </Pressable>
            </>
          ) : canvasMode === 'rotate' ? (
            <>
              {selectedComponent ? (
                <View className="flex-row items-center gap-2">
                  <Pressable
                    onPress={handleRotateLeft}
                    className="w-10 h-10 items-center justify-center rounded-full bg-gray-700"
                    hitSlop={8}
                    testID="rotate-left-button"
                  >
                    <Text className="text-white text-lg">↺</Text>
                  </Pressable>
                  <Text className="text-white text-sm min-w-[40px] text-center">
                    {selectedComponent.rotation}°
                  </Text>
                  <Pressable
                    onPress={handleRotateRight}
                    className="w-10 h-10 items-center justify-center rounded-full bg-gray-700"
                    hitSlop={8}
                    testID="rotate-right-button"
                  >
                    <Text className="text-white text-lg">↻</Text>
                  </Pressable>
                  <View className="w-px h-6 bg-gray-600 mx-1" />
                </View>
              ) : (
                <Text className="text-gray-400 text-sm mr-2">{t('canvas.mode.tapToRotate')}</Text>
              )}
              <Pressable
                onPress={handleExitMode}
                className="px-3 py-2 rounded-lg bg-green-600"
                android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                testID="exit-mode-button"
              >
                <Text className="text-white text-sm font-medium">✓  {t('common.done')}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text className="text-gray-400 text-sm mr-2">{t('canvas.mode.dragToMove')}</Text>
              <Pressable
                onPress={handleExitMode}
                className="px-3 py-2 rounded-lg bg-green-600"
                android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                testID="exit-mode-button"
              >
                <Text className="text-white text-sm font-medium">✓  {t('common.done')}</Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      {/* Canvas */}
      <View className="flex-1">
        <GardenCanvas
          ref={gardenCanvasRef}
          mode={canvasMode}
          selectedComponentId={selectedComponentId}
          onSelectionChange={handleSelectionChange}
          onComponentTap={handleComponentTap}
          onComponentSelect={handleComponentSelect}
          placingComponent={placingComponent}
          onPlacementComplete={handlePlacementComplete}
          onPlacementCancel={handlePlacementCancel}
          testID="home-garden-canvas"
        />
      </View>

      {!hideInventoryAndFab && (
        <ComponentInventory
          onSelectComponent={handleInventorySelectComponent}
          onLongPressComponent={handleComponentTap}
          onStartPlacement={handleInventoryDragStart}
          onPlacementMove={handleInventoryDragMove}
          onPlacementRelease={handleInventoryDragRelease}
          testID="home-component-inventory"
        />
      )}

      {!hideInventoryAndFab && (
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

      <ComponentCreationModal
        visible={isCreationModalVisible}
        onClose={handleCloseCreationModal}
        onCreated={handleComponentCreated}
        editingComponent={editingComponent}
        testID="home-creation-modal"
      />

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
