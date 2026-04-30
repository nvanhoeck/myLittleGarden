/**
 * AlternativePageDots
 *
 * Horizontal row of pressable dots used to navigate between optimization
 * alternatives. The selected dot is filled green; the rest are outlined.
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';

interface AlternativePageDotsProps {
  count: number;
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function AlternativePageDots({
  count,
  selectedIndex,
  onSelect,
}: AlternativePageDotsProps): React.JSX.Element {
  return (
    <View style={styles.container} accessibilityRole="tablist">
      {Array.from({ length: count }, (_, index) => {
        const isActive = index === selectedIndex;
        return (
          <Pressable
            key={index}
            onPress={() => onSelect(index)}
            hitSlop={8}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            testID={`alternative-page-dot-${index}`}
            style={[styles.dot, isActive ? styles.dotActive : styles.dotInactive]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotActive: {
    backgroundColor: '#4ade80',
  },
  dotInactive: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#4b5563',
  },
});
