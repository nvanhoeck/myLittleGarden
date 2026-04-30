import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { OptimizeComponentAlternative } from '@/schemas/ai/optimizeComponentResponseSchema';

type ScoreKey = 'companion' | 'spacing' | 'sun' | 'combative';

function scoreColor(value: number): string {
  if (value >= 70) return '#16a34a';
  if (value >= 40) return '#d97706';
  return '#dc2626';
}

interface ScoreChipsProps {
  score: OptimizeComponentAlternative['score'];
}

export function ScoreChips({ score }: ScoreChipsProps): React.JSX.Element {
  const { t } = useTranslation();
  const keys: ScoreKey[] = ['companion', 'spacing', 'sun', 'combative'];

  return (
    <View style={styles.container}>
      {keys.map((key) => {
        const value = score[key];
        const color = scoreColor(value);
        return (
          <View key={key} style={[styles.chip, { borderColor: color }]}>
            <Text style={[styles.label, { color }]}>
              {t(`ai.optimize.placement.score.${key}`)}
            </Text>
            <Text style={[styles.value, { color }]}>{value}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
  },
  value: {
    fontSize: 13,
    fontWeight: '700',
  },
});
