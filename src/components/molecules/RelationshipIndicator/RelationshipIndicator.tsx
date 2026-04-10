/**
 * RelationshipIndicator
 * Visual indicator showing companion or combative relationship between two plants.
 * Shows the primary icon and a count badge when multiple benefits/harms exist.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { PlantRelationship } from '@/utils/companionRelationships';

interface RelationshipIndicatorProps {
  relationship: PlantRelationship;
  scale: number;
  onPress?: (relationship: PlantRelationship) => void;
}

function getPrimaryIcon(relationship: PlantRelationship): string {
  if (relationship.type === 'companion') {
    const benefit = relationship.benefits?.[0];
    switch (benefit) {
      case 'detersPests': return '🛡️';
      case 'attractsPollinators': return '🐝';
      case 'growthBoost': return '⬆️';
      case 'improvesFlavor': return '✨';
      case 'fixesNitrogen': return '💧';
      default: return '❤️';
    }
  } else {
    const harm = relationship.harms?.[0];
    switch (harm) {
      case 'inhibitsGrowth': return '⬇️';
      case 'attractsPests': return '🐛';
      case 'depletesNutrients': return '⚠️';
      case 'diseaseRisk': return '🦠';
      default: return '⛔';
    }
  }
}

function calculateLineGeometry(
  x1: number, y1: number, x2: number, y2: number, scale: number
): { left: number; top: number; width: number; rotation: number; midX: number; midY: number } {
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

export function RelationshipIndicator({ relationship, scale, onPress }: RelationshipIndicatorProps): React.JSX.Element {
  const { plant1Position, plant2Position, type } = relationship;
  const isCompanion = type === 'companion';
  const lineColor = isCompanion ? '#22c55e' : '#ef4444';
  const backgroundColor = isCompanion ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)';

  const geometry = calculateLineGeometry(
    plant1Position.x, plant1Position.y,
    plant2Position.x, plant2Position.y,
    scale
  );

  const icon = getPrimaryIcon(relationship);
  const extraCount = isCompanion
    ? (relationship.benefits?.length ?? 1) - 1
    : (relationship.harms?.length ?? 1) - 1;

  return (
    <>
      <View
        style={[
          styles.line,
          {
            left: geometry.left,
            top: geometry.top,
            width: geometry.width,
            backgroundColor: lineColor,
            transform: [{ translateY: -1 }, { rotate: `${geometry.rotation}deg` }],
            transformOrigin: 'left center',
          },
        ]}
        pointerEvents="none"
      />
      <Pressable
        style={[
          styles.iconContainer,
          { left: geometry.midX - 14, top: geometry.midY - 14, backgroundColor, borderColor: lineColor },
        ]}
        onPress={onPress ? () => onPress(relationship) : undefined}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.icon}>{icon}</Text>
        {extraCount > 0 && (
          <View style={[styles.countBadge, { borderColor: lineColor }]}>
            <Text style={styles.countText}>+{extraCount}</Text>
          </View>
        )}
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
  countBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  countText: {
    fontSize: 8,
    color: '#f3f4f6',
    fontWeight: '700',
  },
});