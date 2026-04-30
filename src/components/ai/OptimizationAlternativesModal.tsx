import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ComponentData, PlantData } from '@/types';
import type { OptimizeComponentAlternative } from '@/schemas/ai/optimizeComponentResponseSchema';
import { AlternativePageDots } from './AlternativePageDots';
import { OptimizationMiniCanvas } from './OptimizationMiniCanvas';
import { ScoreChips } from './ScoreChips';

interface OptimizationAlternativesModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: () => void;
  onAiFeedback: () => void;
  component: ComponentData;
  alternatives: OptimizeComponentAlternative[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  plantDataMap: Record<string, PlantData | undefined>;
}

export function OptimizationAlternativesModal({
  visible,
  onClose,
  onApply,
  onAiFeedback,
  component,
  alternatives,
  selectedIndex,
  onSelectIndex,
  plantDataMap,
}: OptimizationAlternativesModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const current = alternatives[selectedIndex];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('ai.optimize.placement.title')}</Text>
            <Text style={styles.subtitle}>
              {t('ai.optimize.placement.alternative', {
                n: selectedIndex + 1,
                total: alternatives.length,
              })}
            </Text>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {/* Page dots */}
          <View style={styles.dotsRow}>
            <AlternativePageDots
              count={alternatives.length}
              selectedIndex={selectedIndex}
              onSelect={onSelectIndex}
            />
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {current ? (
              <>
                {/* Mini canvas */}
                <View style={styles.canvasWrapper}>
                  <OptimizationMiniCanvas
                    component={component}
                    positions={current.positions}
                    plantDataMap={plantDataMap}
                    width={300}
                    height={220}
                  />
                </View>

                {/* Total score */}
                <View style={styles.totalScoreRow}>
                  <Text style={styles.totalScoreLabel}>Score</Text>
                  <Text style={styles.totalScoreValue}>{current.score.total}/100</Text>
                </View>

                {/* Dimension score chips */}
                <ScoreChips score={current.score} />

                {/* Summary */}
                {current.summary ? (
                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryText}>{current.summary}</Text>
                  </View>
                ) : null}
              </>
            ) : null}
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.actions}>
            <Pressable
              onPress={onAiFeedback}
              style={styles.feedbackBtn}
              android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
            >
              <Text style={styles.feedbackBtnText}>
                🤖 {t('ai.optimize.placement.aiFeedback')}
              </Text>
            </Pressable>
            <View style={styles.applyRow}>
              <Pressable
                onPress={onClose}
                style={styles.cancelBtn}
                android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
              >
                <Text style={styles.cancelBtnText}>
                  {t('ai.optimize.placement.cancel')}
                </Text>
              </Pressable>
              <Pressable
                onPress={onApply}
                style={styles.applyBtn}
                android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
              >
                <Text style={styles.applyBtnText}>
                  {t('ai.optimize.placement.apply')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '600',
  },
  dotsRow: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
    alignItems: 'center',
  },
  canvasWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  totalScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#374151',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  totalScoreLabel: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  totalScoreValue: {
    color: '#4ade80',
    fontSize: 22,
    fontWeight: '700',
  },
  summaryBox: {
    width: '100%',
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 12,
  },
  summaryText: {
    color: '#d1d5db',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  actions: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  feedbackBtn: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  feedbackBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  applyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#374151',
  },
  cancelBtnText: {
    color: '#d1d5db',
    fontSize: 15,
    fontWeight: '600',
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#16a34a',
  },
  applyBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
