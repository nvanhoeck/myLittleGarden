/**
 * PlanningScreen
 * The plants of a component's planning for one year and their ratio per season
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PlanningScreenProps } from '@/navigation/navigationTypes';
import { useComponent, useComponentStore } from '@/stores';
import { useEnvironmentStore } from '@/stores/environmentStore';
import { usePlantStore } from '@/stores/plantStore';
import { usePlanningStore } from '@/stores/planningStore';
import { usePlanning } from '@/stores/planningContext';
import { SeasonPlanSection } from '@/components/organisms/SeasonPlanSection';
import type { Season } from '@/types';
import { buildPlantList, buildSeasonSections } from './planningScreenViewModel';
import type { Translate } from '../shared/seasonLabels';

export function PlanningScreen({ navigation, route }: PlanningScreenProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const translate = useCallback<Translate>((key, options) => t(key, options), [t]);
  const { componentId, year } = route.params;
  const component = useComponent(componentId);
  const planning = usePlanning(component, year);
  const lastSpringFrost = useEnvironmentStore((state) => state.lastSpringFrost);
  const getPlantById = usePlantStore((state) => state.getPlantById);
  const lastShares = usePlanningStore((state) => state.lastShares);
  const sharesOf = usePlanningStore((state) => state.sharesOf);
  const removePlantFromPlanning = useComponentStore((state) => state.removePlantFromPlanning);
  const setRatio = useComponentStore((state) => state.setRatio);
  const [expanded, setExpanded] = useState<ReadonlySet<Season>>(new Set(['spring', 'summer', 'autumn', 'winter']));

  // Seasons come from the frost date; without one there is nothing to plan
  useEffect(() => {
    if (lastSpringFrost === null) {
      navigation.replace('EnvironmentSetup');
    }
  }, [lastSpringFrost, navigation]);

  const nameOf = useCallback(
    (plantId: string) => getPlantById(plantId)?.nameNl ?? t('componentDetail.unknownPlant'),
    [getPlantById, t],
  );
  const plantList = useMemo(() => (planning ? buildPlantList(planning, nameOf, translate) : []), [planning, nameOf, translate]);
  const sections = useMemo(
    () => (planning ? buildSeasonSections(planning, nameOf, (season) => sharesOf({ componentId, year, season }), translate) : []),
    // lastShares makes the rows update after an optimization
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [planning, nameOf, sharesOf, componentId, year, translate, lastShares],
  );

  const handleRemove = useCallback(
    (plantId: string) => {
      const name = nameOf(plantId);
      Alert.alert(t('seasonPlanning.removeTitle', { name }), t('seasonPlanning.removeMessage', { name, year }), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => removePlantFromPlanning(componentId, year, plantId) },
      ]);
    },
    [nameOf, t, year, removePlantFromPlanning, componentId],
  );

  const toggleSection = useCallback((season: Season) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(season)) next.delete(season);
      else next.add(season);
      return next;
    });
  }, []);

  if (lastSpringFrost === null) return null;

  if (!component || !planning) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-on-surface">{t('componentDetail.notFound')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" testID="planning-screen">
      <View className="flex-row items-center px-4 h-16 border-b border-gray-800">
        <Pressable
          onPress={() => navigation.goBack()}
          className="w-10 h-10 items-center justify-center rounded-full mr-2"
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Text className="text-white text-2xl">←</Text>
        </Pressable>
        <View className="flex-1">
          <Text className="text-white text-lg font-semibold">{t('seasonPlanning.title')}</Text>
          <Text className="text-gray-400 text-sm">{t('seasonPlanning.subtitle', { name: component.name, year })}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        <View className="flex-row items-center mb-2">
          <Text className="text-white font-semibold flex-1">{t('seasonPlanning.plants')}</Text>
          <Pressable
            onPress={() => navigation.navigate('PlantSelection', { componentId, year })}
            className="bg-green-600 px-4 h-12 rounded-full items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel={t('seasonPlanning.addPlant')}
            testID="planning-add-plant-button"
          >
            <Text className="text-white font-medium">+ {t('seasonPlanning.addPlant')}</Text>
          </Pressable>
        </View>

        {plantList.length === 0 && <Text className="text-gray-400 mb-4">{t('seasonPlanning.empty')}</Text>}
        {plantList.map((item) => (
          <View key={item.plantId} className="flex-row items-center py-2 border-b border-gray-800" testID={`planning-plant-${item.plantId}`}>
            <View className="flex-1">
              <Text className="text-white">{item.name}</Text>
              <Text className={`text-xs ${item.hasCalendar ? 'text-gray-400' : 'text-orange-400'}`}>
                {item.hasCalendar ? item.seasonLabels.join(' · ') : t('seasonPlanning.noCalendar')}
              </Text>
            </View>
            <Pressable
              onPress={() => handleRemove(item.plantId)}
              className="w-12 h-12 items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel={t('seasonPlanning.removePlant', { name: item.name })}
              testID={`planning-remove-${item.plantId}`}
            >
              <Text className="text-error text-lg">✕</Text>
            </Pressable>
          </View>
        ))}

        <View className="mt-4">
          {sections.map((view) => (
            <SeasonPlanSection
              key={view.season}
              view={view}
              expanded={expanded.has(view.season)}
              onToggle={() => toggleSection(view.season)}
              onRatioChange={(plantId, ratio) => setRatio(componentId, year, view.season, plantId, ratio)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
