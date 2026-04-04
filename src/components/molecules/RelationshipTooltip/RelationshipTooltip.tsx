/**
 * RelationshipTooltip
 * Modal tooltip showing details about a companion or combative plant relationship.
 */

import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PlantRelationship } from '@/utils/companionRelationships';

interface RelationshipTooltipProps {
  relationship: PlantRelationship | null;
  visible: boolean;
  onClose: () => void;
}

export function RelationshipTooltip({
  relationship,
  visible,
  onClose,
}: RelationshipTooltipProps): React.JSX.Element {
  const { t } = useTranslation();

  if (!relationship) {
    return <></>;
  }

  const isCompanion = relationship.type === 'companion';
  const titleColor = isCompanion ? '#22c55e' : '#ef4444';
  const icon = isCompanion ? '❤️' : '⛔';
  const title = isCompanion
    ? t('plants.companions')
    : t('plants.combatives');

  // Get the translated benefit or harm description
  const description = isCompanion
    ? relationship.benefit
      ? t(`plants.benefits.${relationship.benefit}`)
      : ''
    : relationship.harm
      ? t(`plants.harms.${relationship.harm}`)
      : '';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.tooltipContainer}>
          <Pressable style={styles.tooltip} onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerIcon}>{icon}</Text>
              <Text style={[styles.headerTitle, { color: titleColor }]}>
                {title}
              </Text>
            </View>

            {/* Plant names */}
            <View style={styles.plantsRow}>
              <View style={styles.plantBadge}>
                <Text style={styles.plantEmoji}>🌿</Text>
                <Text style={styles.plantName}>{relationship.plant1Name}</Text>
              </View>
              <Text style={styles.relationArrow}>
                {isCompanion ? '↔️' : '⚡'}
              </Text>
              <View style={styles.plantBadge}>
                <Text style={styles.plantEmoji}>🌿</Text>
                <Text style={styles.plantName}>{relationship.plant2Name}</Text>
              </View>
            </View>

            {/* Benefit/Harm description */}
            <View
              style={[
                styles.descriptionContainer,
                { backgroundColor: isCompanion ? '#dcfce7' : '#fee2e2' },
              ]}
            >
              <Text
                style={[
                  styles.descriptionText,
                  { color: isCompanion ? '#166534' : '#991b1b' },
                ]}
              >
                {description}
              </Text>
            </View>

            {/* Close button */}
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>{t('common.close')}</Text>
            </Pressable>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltipContainer: {
    width: '85%',
    maxWidth: 320,
  },
  tooltip: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  plantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  plantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 4,
  },
  plantEmoji: {
    fontSize: 14,
  },
  plantName: {
    color: '#f3f4f6',
    fontSize: 13,
    fontWeight: '500',
  },
  relationArrow: {
    fontSize: 18,
    color: '#9ca3af',
  },
  descriptionContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#374151',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#f3f4f6',
    fontSize: 14,
    fontWeight: '600',
  },
});
