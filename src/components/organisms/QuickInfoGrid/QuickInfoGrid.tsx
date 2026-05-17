/**
 * QuickInfoGrid
 * Displays plant quick info in a 3-column card grid layout
 * Based on the Planter app design with icons and values
 */

import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PlantData } from '@/types/plant.types';
import {
  formatDayRange,
  formatSunRequirementNl,
  formatWaterRequirementNl,
  formatFrostToleranceNl,
} from '@/utils/calendarCalculations';

interface QuickInfoGridProps {
  readonly plant: PlantData;
}

interface QuickInfoCardProps {
  readonly label: string;
  readonly icon: string;
  readonly value: string;
}

/**
 * Individual info card component
 */
function QuickInfoCard({ label, icon, value }: QuickInfoCardProps): React.JSX.Element {
  return (
    <View className="bg-gray-800 rounded-xl p-3 items-center min-h-[100px]">
      <Text className="text-gray-400 text-xs mb-2">{label}</Text>
      <Text className="text-3xl mb-1">{icon}</Text>
      <Text className="text-white text-sm text-center" numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

/**
 * Get sun icon based on requirement
 */
function getSunIcon(sun: string): string {
  switch (sun) {
    case 'full':
      return '☀️'; // Sun
    case 'partial':
      return '⛅'; // Sun behind cloud
    case 'shade':
      return '☁️'; // Cloud
    default:
      return '☀️';
  }
}

/**
 * Get water icon based on requirement
 */
function getWaterIcon(water: string): string {
  switch (water) {
    case 'low':
      return '💧'; // Droplet
    case 'moderate':
      return '🫖'; // Teapot / watering
    case 'high':
      return '💦'; // Sweat droplets
    default:
      return '💧';
  }
}

/**
 * Get frost icon based on tolerance
 */
function getFrostIcon(frost: string): string {
  switch (frost) {
    case 'tender':
      return '🔥'; // Fire (sensitive to cold)
    case 'semi-hardy':
      return '❄️'; // Snowflake
    case 'hardy':
      return '🧊'; // Ice cube
    default:
      return '❄️';
  }
}

/**
 * QuickInfoGrid - 3-column grid displaying plant growing information
 */
export function QuickInfoGrid({ plant }: QuickInfoGridProps): React.JSX.Element {
  const { t } = useTranslation();

  const isThinning = plant.plantingStyle === 'thinning';
  const isPatch = plant.plantingStyle === 'patch';
  const spacingLabel = isThinning
    ? t('plantDetails.finalSpacing')
    : isPatch
      ? t('plantDetails.sowingSpacing')
      : t('plantDetails.spacing');
  const spacingValue = isThinning
    ? plant.spacingRadiusCm
    : isPatch
      ? (plant.sowingSpacingCm ?? plant.spacingRadiusCm)
      : plant.spacingRadiusCm;

  const infoCards = [
    {
      label: spacingLabel,
      icon: isThinning ? '✂️' : isPatch ? '🌾' : '📏',
      value: `${spacingValue} cm`,
    },
    {
      label: t('plantDetails.depth'),
      icon: '⬇️', // Down arrow
      value: `${plant.plantingDepthCm} cm`,
    },
    {
      label: t('plantDetails.sun'),
      icon: getSunIcon(plant.sun),
      value: formatSunRequirementNl(plant.sun),
    },
    {
      label: t('plantDetails.water'),
      icon: getWaterIcon(plant.water),
      value: formatWaterRequirementNl(plant.water),
    },
    {
      label: t('plantDetails.frost'),
      icon: getFrostIcon(plant.frostTolerance),
      value: formatFrostToleranceNl(plant.frostTolerance),
    },
    {
      label: t('plantDetails.germination'),
      icon: '🌱', // Seedling
      value: `${formatDayRange(plant.germinationDays.min, plant.germinationDays.max)} ${t('units.days')}`,
    },
    {
      label: t('plantDetails.harvest'),
      icon: '📅', // Calendar
      value: `${formatDayRange(plant.daysToHarvest.min, plant.daysToHarvest.max)} ${t('units.days')}`,
    },
  ];

  return (
    <View className="px-4">
      <Text className="text-white text-xl font-semibold mb-3">
        {t('plantDetails.quickInfo')}
      </Text>
      <View className="flex-row flex-wrap justify-between">
        {infoCards.map((card, index) => (
          <View
            key={card.label}
            className="w-[31%] mb-3"
            style={{ marginRight: (index + 1) % 3 === 0 ? 0 : '3.5%' }}
          >
            <QuickInfoCard
              label={card.label}
              icon={card.icon}
              value={card.value}
            />
          </View>
        ))}
      </View>
    </View>
  );
}
