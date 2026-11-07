import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { View, Text, Pressable, FlatList, Alert, useWindowDimensions } from 'react-native';
import type { ViewToken } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { HomeScreenProps } from '@/navigation/navigationTypes';
import { useAllComponents, useComponentStore } from '@/stores';
import { usePlantStore } from '@/stores/plantStore';
import { useCurrentAreasById } from '@/stores/planningContext';
import { plantCountOfAreas } from '@/domain/planning';
import { ComponentCreationModal, ComponentSlide } from '@/components/organisms';
import { ComponentListRow } from '@/components/molecules';
import type { AreaData, ComponentData } from '@/types';

const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 60 };
const NO_AREAS: readonly AreaData[] = [];

/**
 * HomeScreen - paged slider of components with a synced list below.
 */
export function HomeScreen({ navigation }: HomeScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const allComponents = useAllComponents();
  const removeComponent = useComponentStore((state) => state.removeComponent);
  const getPlantById = usePlantStore((state) => state.getPlantById);

  const components = useMemo(
    () => [...allComponents].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [allComponents],
  );

  const areasById = useCurrentAreasById(components);
  // Plants growing today per component: the plant counts of its areas together
  const plantCountById = useMemo(
    () => new Map(components.map((c) => [c.id, plantCountOfAreas(c, areasById.get(c.id) ?? [], getPlantById)])),
    [components, areasById, getPlantById],
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [isCreationModalVisible, setIsCreationModalVisible] = useState(false);
  const [editingComponent, setEditingComponent] = useState<ComponentData | null>(null);
  const sliderRef = useRef<FlatList<ComponentData>>(null);
  const pendingScrollToId = useRef<string | null>(null);

  const clampedIndex = Math.min(activeIndex, Math.max(0, components.length - 1));

  const scrollToIndex = useCallback(
    (index: number) => {
      if (components.length === 0) return;
      const safe = Math.min(Math.max(0, index), components.length - 1);
      sliderRef.current?.scrollToIndex({ index: safe, animated: true });
      setActiveIndex(safe);
    },
    [components.length],
  );

  // Keep the active index valid after deletions.
  useEffect(() => {
    if (activeIndex !== clampedIndex) setActiveIndex(clampedIndex);
  }, [activeIndex, clampedIndex]);

  // After creating a component, jump to its slide once the new slide has
  // been laid out (content size change), so the native scroll is not clamped.
  const handleSliderContentSizeChange = useCallback(() => {
    const id = pendingScrollToId.current;
    if (!id) return;
    const index = components.findIndex((c) => c.id === id);
    if (index >= 0) {
      pendingScrollToId.current = null;
      scrollToIndex(index);
    }
  }, [components, scrollToIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find((v) => v.isViewable && v.index !== null);
    if (first && first.index !== null) setActiveIndex(first.index);
  }).current;

  const getItemLayout = useCallback(
    (_: ArrayLike<ComponentData> | null | undefined, index: number) => ({
      length: windowWidth,
      offset: windowWidth * index,
      index,
    }),
    [windowWidth],
  );

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleSettingsPress = useCallback(() => navigation.navigate('Settings'), [navigation]);
  const handleFabPress = useCallback(() => setIsCreationModalVisible(true), []);

  const handleCloseCreationModal = useCallback(() => {
    setIsCreationModalVisible(false);
    setEditingComponent(null);
  }, []);

  const handleComponentCreated = useCallback((componentId: string) => {
    pendingScrollToId.current = componentId;
  }, []);

  const handleOpen = useCallback(
    (component: ComponentData) => navigation.navigate('ComponentDetail', { componentId: component.id }),
    [navigation],
  );

  const handleEdit = useCallback((component: ComponentData) => {
    setEditingComponent(component);
    setIsCreationModalVisible(true);
  }, []);

  const handleDelete = useCallback(
    (component: ComponentData) => {
      Alert.alert(
        t('component.deleteTitle'),
        t('component.deleteMessage', { name: component.name }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.delete'), style: 'destructive', onPress: () => removeComponent(component.id) },
        ],
      );
    },
    [t, removeComponent],
  );

  const handleRowPress = useCallback(
    (component: ComponentData) => {
      const index = components.findIndex((c) => c.id === component.id);
      if (index >= 0) scrollToIndex(index);
    },
    [components, scrollToIndex],
  );

  // ── Render ────────────────────────────────────────────────────────────────
  const renderSlide = useCallback(
    ({ item }: { item: ComponentData }) => (
      <ComponentSlide
        component={item}
        areas={areasById.get(item.id) ?? NO_AREAS}
        plantCount={plantCountById.get(item.id) ?? 0}
        getPlantById={getPlantById}
        slideWidth={windowWidth}
        onOpen={handleOpen}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    ),
    [areasById, plantCountById, getPlantById, windowWidth, handleOpen, handleEdit, handleDelete],
  );

  const renderRow = useCallback(
    ({ item, index }: { item: ComponentData; index: number }) => (
      <ComponentListRow
        component={item}
        plantCount={plantCountById.get(item.id) ?? 0}
        isActive={index === clampedIndex}
        onPress={handleRowPress}
      />
    ),
    [plantCountById, clampedIndex, handleRowPress],
  );

  const keyExtractor = useCallback((item: ComponentData) => item.id, []);
  const activeComponent = components[clampedIndex];

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

      {components.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8" testID="home-empty-state">
          <Text className="text-on-surface-variant text-body-large text-center">
            {t('screens.home.emptyState')}
          </Text>
        </View>
      ) : (
        <>
          {/* Slider */}
          <FlatList
            ref={sliderRef}
            data={components}
            renderItem={renderSlide}
            keyExtractor={keyExtractor}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            getItemLayout={getItemLayout}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={VIEWABILITY_CONFIG}
            onScrollToIndexFailed={() => undefined}
            onContentSizeChange={handleSliderContentSizeChange}
            style={{ flexGrow: 0 }}
            testID="home-component-slider"
          />

          {/* Dot indicator */}
          {components.length > 1 && (
            <View className="flex-row items-center justify-center gap-1 py-2" testID="home-slider-dots">
              {components.map((c, index) => (
                <View
                  key={c.id}
                  className={
                    index === clampedIndex
                      ? 'w-2 h-2 rounded-full bg-green-400'
                      : 'w-2 h-2 rounded-full bg-gray-600'
                  }
                />
              ))}
              <Text className="text-gray-400 text-xs ml-2" testID="home-slider-counter">
                {t('screens.home.slideOf', { current: clampedIndex + 1, total: components.length })}
              </Text>
            </View>
          )}

          {/* List */}
          <FlatList
            data={components}
            renderItem={renderRow}
            keyExtractor={keyExtractor}
            extraData={activeComponent?.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 96 }}
            className="flex-1"
            testID="home-component-list"
          />
        </>
      )}

      <Pressable
        onPress={handleFabPress}
        className="absolute bottom-6 right-4 w-14 h-14 bg-green-600 rounded-full items-center justify-center shadow-lg"
        testID="add-component-fab"
        accessibilityLabel={t('componentCreation.addComponent')}
        accessibilityRole="button"
        android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}
      >
        <Text className="text-white text-3xl font-light">+</Text>
      </Pressable>

      <ComponentCreationModal
        visible={isCreationModalVisible}
        onClose={handleCloseCreationModal}
        onCreated={handleComponentCreated}
        editingComponent={editingComponent}
        testID="home-creation-modal"
      />
    </SafeAreaView>
  );
}
