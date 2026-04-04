/**
 * RelationshipIndicator
 * Visual indicator showing companion or combative relationship between two plants.
 * Displays a colored line with an icon that can be tapped for details.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { PlantRelationship } from '@/utils/companionRelationships';

interface RelationshipIndicatorProps {
  relationship: PlantRelationship;
  scale: number;
  onPress?: (relationship: PlantRelationship) => void;
}

/**
 * Get emoji icon for the relationship benefit/harm
 */
function getRelationshipIcon(relationship: PlantRelationship): string {
  if (relationship.type === 'companion') {
    switch (relationship.benefit) {
      case 'detersPests':
        return '🛡️'; // Shield
      case 'attractsPollinators':
        return '🐝'; // Bee
      case 'growthBoost':
        return '⬆️'; // Up arrow
      case 'improvesFlavor':
        return '✨'; // Sparkles
      case 'fixesNitrogen':
        return '💧'; // Water drop (representing nutrients)
      default:
        return '❤️'; // Heart
    }
  } else {
    switch (relationship.harm) {
      case 'inhibitsGrowth':
        return '⬇️'; // Down arrow
      case 'attractsPests':
        return '🐛'; // Bug
      case 'depletesNutrients':
        return '⚠️'; // Warning
      case 'diseaseRisk':
        return '🦠'; // Microbe
      default:
        return '⛔'; // No entry
    }
  }
}

/**
 * Calculate the position and rotation for the indicator line
 */
function calculateLineGeometry(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  scale: number
): {
  left: number;
  top: number;
  width: number;
  rotation: number;
  midX: number;
  midY: number;
} {
  const scaledX1 = x1 * scale;
  const scaledY1 = y1 * scale;
  const scaledX2 = x2 * scale;
  const scaledY2 = y2 * scale;

  const dx = scaledX2 - scaledX1;
  const dy = scaledY2 - scaledY1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  return {
    left: scaledX1,
    top: scaledY1,
    width: length,
    rotation: angle,
    midX: (scaledX1 + scaledX2) / 2,
    midY: (scaledY1 + scaledY2) / 2,
  };
}

export function RelationshipIndicator({
  relationship,
  scale,
  onPress,
}: RelationshipIndicatorProps): React.JSX.Element {
  const { plant1Position, plant2Position, type } = relationship;
  const isCompanion = type === 'companion';
  const lineColor = isCompanion ? '#22c55e' : '#ef4444';
  const backgroundColor = isCompanion
    ? 'rgba(34, 197, 94, 0.3)'
    : 'rgba(239, 68, 68, 0.3)';

  const geometry = calculateLineGeometry(
    plant1Position.x,
    plant1Position.y,
    plant2Position.x,
    plant2Position.y,
    scale
  );

  const icon = getRelationshipIcon(relationship);

  return (
    <>
      {/* Connection line */}
      <View
        style={[
          styles.line,
          {
            left: geometry.left,
            top: geometry.top,
            width: geometry.width,
            backgroundColor: lineColor,
            transform: [
              { translateY: -1 },
              { rotate: `${geometry.rotation}deg` },
            ],
            transformOrigin: 'left center',
          },
        ]}
        pointerEvents="none"
      />

      {/* Indicator icon at midpoint */}
      <Pressable
        style={[
          styles.iconContainer,
          {
            left: geometry.midX - 14,
            top: geometry.midY - 14,
            backgroundColor,
            borderColor: lineColor,
          },
        ]}
        onPress={onPress ? () => onPress(relationship) : undefined}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.icon}>{icon}</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  line: {
    position: 'absolute',
    height: 2,
    opacity: 0.7,
    zIndex: 5,
  },
  iconContainer: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  icon: {
    fontSize: 14,
  },
});
