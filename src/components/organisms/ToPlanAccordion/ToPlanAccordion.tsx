import React from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { ToPlanRow } from '@/components/molecules/ToPlanRow';

export interface ToPlanGroup {
  readonly plantId: string;
  readonly name: string;
  readonly count: number;
  readonly reasonText: string;
  readonly reasonTone: 'warning' | 'muted';
  readonly removeAccessibilityLabel: string;
}

interface ToPlanAccordionProps {
  groups: readonly ToPlanGroup[];
  expanded: boolean;
  /** "Te plannen (6)" */
  title: string;
  emptyTitle: string;
  emptyHint: string;
  onToggle: () => void;
  onRemove: (plantId: string) => void;
  /** The content the expanded list overlays (the canvas or the plant list) */
  children: React.ReactNode;
}

/** The expanded list overlays the content up to this share of the screen height */
const MAX_BODY_HEIGHT_RATIO = 0.4;

/**
 * "Te plannen" accordion directly above the action bar. The header is always
 * visible; the expanded body overlays the bottom of the content, so the
 * content never resizes. The body stays inside this view's bounds, because
 * Android does not deliver touches outside a parent's bounds.
 * BEM contract (src/styles/planning/to-plan.css): .to-plan-accordion, __header, __body, __empty
 */
export function ToPlanAccordion({
  groups,
  expanded,
  title,
  emptyTitle,
  emptyHint,
  onToggle,
  onRemove,
  children,
}: ToPlanAccordionProps): React.JSX.Element {
  const { height } = useWindowDimensions();

  return (
    <View className="flex-1">
      <View className="flex-1">
        {children}
        {expanded && (
          <View
            className="absolute left-0 right-0 bottom-0 bg-background border-t border-gray-800 rounded-t-xl"
            style={{ maxHeight: height * MAX_BODY_HEIGHT_RATIO }}
          >
            {groups.length === 0 ? (
              <View className="items-center py-6 px-4">
                <Text className="text-3xl mb-2">🌱</Text>
                <Text className="text-title-small text-on-surface">{emptyTitle}</Text>
                <Text className="text-body-small text-on-surface-variant mt-1">{emptyHint}</Text>
              </View>
            ) : (
              <ScrollView nestedScrollEnabled>
                {groups.map((group) => (
                  <ToPlanRow
                    key={group.plantId}
                    iconKey={group.plantId}
                    name={group.name}
                    count={group.count}
                    reasonText={group.reasonText}
                    reasonTone={group.reasonTone}
                    removeAccessibilityLabel={group.removeAccessibilityLabel}
                    onRemove={() => onRemove(group.plantId)}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        )}
      </View>
      <Pressable
        onPress={onToggle}
        className="flex-row items-center h-12 px-4 border-t border-gray-800 bg-background"
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded }}
        testID="planning-to-plan-header"
      >
        <Text className="flex-1 text-title-small text-on-surface">{title}</Text>
        <Text className="text-on-surface-variant text-base">{expanded ? '▾' : '▴'}</Text>
      </Pressable>
    </View>
  );
}
