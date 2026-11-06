import React from 'react';
import { Modal, Pressable, Text } from 'react-native';
import type { PlantingMenuItemView } from '@/types';

interface PlantingActionsSheetProps {
  visible: boolean;
  title: string;
  items: readonly PlantingMenuItemView[];
  /** Shown above the items, e.g. why duplicate and move are missing */
  hint?: string;
  cancelLabel: string;
  onSelect: (item: PlantingMenuItemView) => void;
  onClose: () => void;
}

/**
 * Bottom sheet with the actions of one planting.
 * BEM contract (src/styles/planning/season.css): .planting-sheet, __backdrop, __panel, __title, __hint, __item, __item--destructive
 */
export function PlantingActionsSheet({ visible, title, items, hint, cancelLabel, onSelect, onClose }: PlantingActionsSheetProps): React.JSX.Element {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50 justify-end" onPress={onClose} accessibilityRole="button" accessibilityLabel={cancelLabel}>
        <Pressable className="bg-gray-900 rounded-t-2xl pb-6" onPress={() => undefined} testID="planting-actions-sheet">
          <Text className="text-white font-semibold px-4 pt-4 pb-2">{title}</Text>
          {hint !== undefined && <Text className="text-gray-400 px-4 pb-2" testID="planting-actions-hint">{hint}</Text>}
          {items.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => onSelect(item)}
              className="h-12 px-4 justify-center border-t border-gray-800"
              accessibilityRole="button"
              testID={item.testID}
            >
              <Text className={item.kind === 'remove' ? 'text-error' : 'text-white'}>{item.label}</Text>
            </Pressable>
          ))}
          <Pressable onPress={onClose} className="h-12 px-4 justify-center border-t border-gray-800" accessibilityRole="button">
            <Text className="text-gray-400">{cancelLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
