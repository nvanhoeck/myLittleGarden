import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { WeekSlot, WEEK_SLOT_WIDTH } from '@/components/atoms/WeekSlot';
import { TimeZoneSegment } from '@/components/molecules/TimeZoneSegment';

export interface WeekTimelineWeek {
  /** "{year}-{week}" */
  readonly id: string;
  readonly week: number;
  readonly weekLabel: string;
  readonly dateLabel: string;
  readonly hasPlants: boolean;
  readonly isCurrent: boolean;
  readonly isSelected: boolean;
  readonly isInZone: boolean;
  readonly accessibilityLabel: string;
}

export interface WeekTimelineZone {
  readonly startWeek: number;
  readonly weekCount: number;
  readonly label: string;
  readonly isEmpty: boolean;
  readonly isSelected: boolean;
  readonly containsSelectedWeek: boolean;
  readonly tone: 0 | 1;
  readonly accessibilityLabel: string;
}

interface WeekTimelineProps {
  weeks: readonly WeekTimelineWeek[];
  zones: readonly WeekTimelineZone[];
  /** Index in `weeks` or `zones` of the selection */
  selection: { readonly kind: 'week' | 'zone'; readonly index: number };
  /** Tag on the current week, e.g. "nu" */
  currentLabel: string;
  onSelectWeek: (week: number) => void;
  onSelectZone: (startWeek: number) => void;
}

/**
 * Week strip with the zone band under it, in one horizontal scroll so they
 * stay aligned. Scrolls the selection to the centre on mount, on a year
 * change and on a zone tap; a tapped week only scrolls when it is not fully visible.
 * BEM contract (src/styles/planning/timeline.css): .week-timeline, __scroll, __band
 */
export function WeekTimeline({
  weeks,
  zones,
  selection,
  currentLabel,
  onSelectWeek,
  onSelectZone,
}: WeekTimelineProps): React.JSX.Element {
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(0);
  const centredYear = useRef<string | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);

  // The first week id ("2026-1") identifies the year shown
  const yearKey = weeks[0]?.id ?? '';
  const zoneStart = zones[selection.index]?.startWeek ?? 1;
  const startPx = selection.kind === 'zone' ? (zoneStart - 1) * WEEK_SLOT_WIDTH : selection.index * WEEK_SLOT_WIDTH;
  const endPx = selection.kind === 'zone'
    ? startPx + (zones[selection.index]?.weekCount ?? 1) * WEEK_SLOT_WIDTH
    : startPx + WEEK_SLOT_WIDTH;

  useEffect(() => {
    if (viewportWidth === 0) return;
    const yearChanged = centredYear.current !== yearKey;
    centredYear.current = yearKey;
    const fullyVisible = startPx >= scrollX.current && endPx <= scrollX.current + viewportWidth;
    if (!yearChanged && selection.kind === 'week' && fullyVisible) return;
    scrollRef.current?.scrollTo({ x: Math.max(0, (startPx + endPx - viewportWidth) / 2), animated: true });
  }, [viewportWidth, yearKey, selection.kind, startPx, endPx]);

  return (
    <View className="border-b border-gray-800" onLayout={(e) => setViewportWidth(e.nativeEvent.layout.width)}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => { scrollX.current = e.nativeEvent.contentOffset.x; }}
        scrollEventThrottle={32}
      >
        <View className="flex-col">
          <View className="flex-row">
            {weeks.map((week) => (
              <WeekSlot
                key={week.id}
                weekLabel={week.weekLabel}
                dateLabel={week.dateLabel}
                hasPlants={week.hasPlants}
                isSelected={week.isSelected}
                isCurrent={week.isCurrent}
                isInZone={week.isInZone}
                currentLabel={currentLabel}
                accessibilityLabel={week.accessibilityLabel}
                onPress={() => onSelectWeek(week.week)}
                testID={`planning-week-${week.id}`}
              />
            ))}
          </View>
          <View className="flex-row h-12">
            {zones.map((zone) => (
              <TimeZoneSegment
                key={zone.startWeek}
                widthPx={zone.weekCount * WEEK_SLOT_WIDTH}
                label={zone.label}
                isSelected={zone.isSelected}
                isEmpty={zone.isEmpty}
                isMarked={zone.containsSelectedWeek}
                tone={zone.tone}
                accessibilityLabel={zone.accessibilityLabel}
                onPress={() => onSelectZone(zone.startWeek)}
                testID={`planning-zone-${zone.startWeek}`}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
