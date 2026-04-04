/**
 * GrowingCalendar
 * Visual timeline showing planting phases based on frost dates
 * Displays indoor start, transplant, and direct sow date ranges
 */

import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PlantData } from '@/types/plant.types';
import {
  calculateGrowingCalendar,
  formatDateRangeNl,
  getYearPosition,
  MONTH_LABELS_NL,
  CALENDAR_COLORS,
  type DateRange,
  type GrowingCalendarData,
} from '@/utils/calendarCalculations';

interface GrowingCalendarProps {
  readonly plant: PlantData;
  readonly lastSpringFrost: string | null;
}

interface CalendarPhaseBarProps {
  readonly range: DateRange;
  readonly color: string;
}

interface CalendarPhaseLabelProps {
  readonly label: string;
  readonly range: DateRange;
  readonly color: string;
}

/**
 * Colored bar segment for a phase on the timeline
 */
function CalendarPhaseBar({ range, color }: CalendarPhaseBarProps): React.JSX.Element | null {
  const startPos = getYearPosition(range.start) * 100;
  const endPos = getYearPosition(range.end) * 100;
  const width = Math.max(2, endPos - startPos);

  return (
    <View
      className="absolute h-3 rounded-full"
      style={{
        left: `${startPos}%`,
        width: `${width}%`,
        backgroundColor: color,
      }}
    />
  );
}

/**
 * Phase label with colored badge and date range
 */
function CalendarPhaseLabel({ label, range, color }: CalendarPhaseLabelProps): React.JSX.Element {
  return (
    <View className="items-center mr-4 mb-2">
      <View
        className="px-3 py-1 rounded-full mb-1"
        style={{ backgroundColor: color }}
      >
        <Text className="text-white text-xs font-medium">{label}</Text>
      </View>
      <Text className="text-gray-400 text-xs">{formatDateRangeNl(range)}</Text>
    </View>
  );
}

/**
 * Today indicator on the timeline
 */
function TodayIndicator(): React.JSX.Element {
  const today = new Date();
  const position = getYearPosition(today) * 100;

  return (
    <>
      <View
        className="absolute w-0.5 bg-white"
        style={{
          left: `${position}%`,
          top: -4,
          height: 24,
        }}
      />
      <View
        className="absolute bg-gray-900 px-2 py-0.5 rounded"
        style={{
          left: `${position}%`,
          bottom: -24,
          transform: [{ translateX: -20 }],
        }}
      >
        <Text className="text-white text-xs">Vandaag</Text>
      </View>
    </>
  );
}

/**
 * Month labels along the top of the timeline
 */
function MonthLabels(): React.JSX.Element {
  return (
    <View className="flex-row justify-between mb-2">
      {MONTH_LABELS_NL.map((month, index) => (
        <Text key={month} className="text-gray-500 text-xs flex-1 text-center">
          {month.charAt(0).toUpperCase() + month.slice(1)}
        </Text>
      ))}
    </View>
  );
}

/**
 * Main timeline bar with grid lines
 */
function TimelineBar({ calendar }: { calendar: GrowingCalendarData }): React.JSX.Element {
  return (
    <View className="h-6 bg-gray-800 rounded-lg relative overflow-hidden">
      {/* Month grid lines */}
      {Array.from({ length: 11 }).map((_, index) => (
        <View
          key={index}
          className="absolute w-px h-full bg-gray-700"
          style={{ left: `${((index + 1) / 12) * 100}%` }}
        />
      ))}

      {/* Phase bars */}
      <View className="absolute inset-0 items-center justify-center">
        <View className="w-full h-3 relative">
          {calendar.indoorStart && (
            <CalendarPhaseBar
              range={calendar.indoorStart}
              color={CALENDAR_COLORS.indoorStart}
            />
          )}
          {calendar.transplant && (
            <CalendarPhaseBar
              range={calendar.transplant}
              color={CALENDAR_COLORS.transplant}
            />
          )}
          {calendar.directSow && (
            <CalendarPhaseBar
              range={calendar.directSow}
              color={CALENDAR_COLORS.directSow}
            />
          )}
        </View>
      </View>

      {/* Today indicator */}
      <TodayIndicator />
    </View>
  );
}

/**
 * GrowingCalendar - Timeline visualization of planting phases
 */
export function GrowingCalendar({
  plant,
  lastSpringFrost,
}: GrowingCalendarProps): React.JSX.Element {
  const { t } = useTranslation();

  const calendar = useMemo(() => {
    if (!lastSpringFrost) {
      return null;
    }
    return calculateGrowingCalendar(plant, lastSpringFrost);
  }, [plant, lastSpringFrost]);

  // Check if there are any phases to display
  const hasAnyPhase = calendar && (
    calendar.indoorStart || calendar.transplant || calendar.directSow
  );

  if (!lastSpringFrost) {
    return (
      <View className="px-4">
        <Text className="text-white text-xl font-semibold mb-3">
          {t('plantDetails.growingCalendar')}
        </Text>
        <View className="bg-gray-800 rounded-xl p-4">
          <Text className="text-gray-400 text-center">
            {t('plantDetails.noFrostDatesConfigured')}
          </Text>
        </View>
      </View>
    );
  }

  if (!hasAnyPhase) {
    return (
      <View className="px-4">
        <Text className="text-white text-xl font-semibold mb-3">
          {t('plantDetails.growingCalendar')}
        </Text>
        <View className="bg-gray-800 rounded-xl p-4">
          <Text className="text-gray-400 text-center">
            {t('plantDetails.noCalendarData')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="px-4">
      <Text className="text-white text-xl font-semibold mb-3">
        {t('plantDetails.growingCalendar')}
      </Text>

      {/* Timeline */}
      <View className="bg-gray-900/50 rounded-xl p-4">
        <MonthLabels />
        <View className="mb-8">
          <TimelineBar calendar={calendar!} />
        </View>

        {/* Phase labels */}
        <View className="flex-row flex-wrap justify-center">
          {calendar!.indoorStart && (
            <CalendarPhaseLabel
              label={t('plantDetails.startInside')}
              range={calendar!.indoorStart}
              color={CALENDAR_COLORS.indoorStart}
            />
          )}
          {calendar!.transplant && (
            <CalendarPhaseLabel
              label={t('plantDetails.transplant')}
              range={calendar!.transplant}
              color={CALENDAR_COLORS.transplant}
            />
          )}
          {calendar!.directSow && (
            <CalendarPhaseLabel
              label={t('plantDetails.sowOutside')}
              range={calendar!.directSow}
              color={CALENDAR_COLORS.directSow}
            />
          )}
        </View>
      </View>
    </View>
  );
}
