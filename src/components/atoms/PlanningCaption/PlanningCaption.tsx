import React from 'react';
import { Text, View } from 'react-native';

interface PlanningCaptionProps {
  /** "W18 · 27 apr – 3 mei" or "W18 - W24 · 3 planten" */
  text: string;
}

/**
 * Caption chip above the canvas with the displayed week or zone.
 * BEM contract (src/styles/planning/timeline.css): .planning-caption, __text
 */
export function PlanningCaption({ text }: PlanningCaptionProps): React.JSX.Element {
  return (
    <View className="self-center mt-2 px-3 py-1 rounded-full bg-surface-variant" testID="planning-caption">
      <Text className="text-label-medium text-on-surface" numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}
