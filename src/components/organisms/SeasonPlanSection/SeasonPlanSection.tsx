import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PlantingRowMenuButton } from '@/components/atoms/PlantingRowMenuButton';
import { SeasonStatusDot } from '@/components/atoms/SeasonStatusDot';
import { RatioStepper } from '@/components/molecules/RatioStepper';
import type { RatioRowView, SeasonSectionView } from '@/types';

interface SeasonPlanSectionProps {
  view: SeasonSectionView;
  expanded: boolean;
  onToggle: () => void;
  onRatioChange: (plantingId: string, ratio: number) => void;
  onOpenMenu: (row: RatioRowView) => void;
}

/**
 * Accordion for one season: the plants starting in it with their ratio,
 * and the plants carried into it (read-only).
 * BEM contract (src/styles/planning/season.css): .season-section, __header, __row, __result--does-not-fit
 */
export function SeasonPlanSection({ view, expanded, onToggle, onRatioChange, onOpenMenu }: SeasonPlanSectionProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <View className="mb-2 rounded-xl bg-gray-900" testID={`season-section-${view.season}`}>
      <Pressable
        onPress={onToggle}
        className="flex-row items-center px-4 h-14"
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={t('seasonPlanning.sectionA11y', { season: view.title, months: view.monthsLabel, status: view.statusLabel })}
        testID={`season-section-${view.season}-header`}
      >
        <SeasonStatusDot status={view.status} />
        <Text className="text-white font-medium ml-2">{view.title}</Text>
        <Text className="text-gray-400 text-xs ml-2 flex-1">{view.monthsLabel}</Text>
        <Text className="text-gray-400 text-xs mr-2">{view.statusLabel}</Text>
        <Text className="text-gray-400">{expanded ? '▲' : '▼'}</Text>
      </Pressable>

      {expanded && view.isEmpty && (
        <View className="flex-row items-center px-4 py-2 border-t border-gray-800">
          <Text className="text-gray-400">{t('seasonPlanning.emptySeason')}</Text>
        </View>
      )}

      {expanded &&
        view.ratioRows.map((row) => (
          <View key={row.plantingId} className="flex-row items-center px-4 py-2 border-t border-gray-800" testID={`ratio-row-${view.season}-${row.plantId}`}>
            <View className="flex-1">
              <Text className="text-white">{row.name}</Text>
              {row.resultLabel !== null && (
                <Text className={`text-xs ${row.fits ? 'text-gray-400' : 'text-error'}`}>{row.resultLabel}</Text>
              )}
            </View>
            <Text className="text-gray-400 text-xs mr-2">{row.targetLabel}</Text>
            <RatioStepper
              value={row.ratio}
              onChange={(ratio) => onRatioChange(row.plantingId, ratio)}
              decreaseLabel={t('seasonPlanning.ratioDecrease', { name: row.name })}
              increaseLabel={t('seasonPlanning.ratioIncrease', { name: row.name })}
              valueLabel={t('seasonPlanning.ratioValue', { name: row.name, ratio: row.ratio })}
              testID={`ratio-${view.season}-${row.plantId}`}
            />
            <PlantingRowMenuButton
              accessibilityLabel={t('seasonPlanning.menuButton', { name: row.name })}
              onPress={() => onOpenMenu(row)}
              testID={`planting-menu-${view.season}-${row.plantId}`}
            />
          </View>
        ))}

      {expanded &&
        view.carriedRows.map((row) => (
          <View key={row.plantingId} className="flex-row items-center px-4 py-2 border-t border-gray-800" testID={`carried-row-${view.season}-${row.plantId}`}>
            <Text className="text-gray-400 flex-1">{row.name}</Text>
            <Text className="text-gray-500 text-xs">{row.label}</Text>
          </View>
        ))}
    </View>
  );
}
