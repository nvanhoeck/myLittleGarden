/**
 * ComponentContextMenu
 * Context menu that appears on long press of a component
 * Provides options to edit, delete, or return to inventory
 */

import React, { useCallback } from 'react';
import { View, Text, Pressable, Modal, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useComponentStore } from '@/stores';
import type { ComponentData } from '@/types';

interface ComponentContextMenuProps {
  /** The component to show options for */
  component: ComponentData | null;
  /** Whether the menu is visible */
  visible: boolean;
  /** Callback to close the menu */
  onClose: () => void;
  /** Callback when view details is selected */
  onViewDetails?: (component: ComponentData) => void;
  /** Callback when edit is selected */
  onEdit?: (component: ComponentData) => void;
  /** Callback when component is deleted */
  onDeleted?: () => void;
  /** Callback when component is returned to inventory */
  onReturnedToInventory?: () => void;
}

/**
 * Context menu with edit, delete, and return to inventory options
 */
export function ComponentContextMenu({
  component,
  visible,
  onClose,
  onViewDetails,
  onEdit,
  onDeleted,
  onReturnedToInventory,
}: ComponentContextMenuProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const removeComponent = useComponentStore((state) => state.removeComponent);
  const moveComponent = useComponentStore((state) => state.moveComponent);

  const handleViewDetails = useCallback(() => {
    if (component) {
      onClose();
      onViewDetails?.(component);
    }
  }, [component, onClose, onViewDetails]);

  const handleEdit = useCallback(() => {
    if (component) {
      onClose();
      onEdit?.(component);
    }
  }, [component, onClose, onEdit]);

  const handleDelete = useCallback(() => {
    if (!component) return;

    Alert.alert(
      t('contextMenu.deleteTitle'),
      t('contextMenu.deleteMessage', { name: component.name }),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            removeComponent(component.id);
            onClose();
            onDeleted?.();
          },
        },
      ]
    );
  }, [component, t, removeComponent, onClose, onDeleted]);

  const handleReturnToInventory = useCallback(() => {
    if (!component) return;

    // Reset position to 0,0 (unplaced state)
    moveComponent(component.id, 0, 0);
    onClose();
    onReturnedToInventory?.();
  }, [component, moveComponent, onClose, onReturnedToInventory]);

  if (!component) {
    return null;
  }

  // Check if component is placed (has non-zero position)
  const isPlaced = component.positionX !== 0 || component.positionY !== 0 || component.rotation !== 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID="component-context-menu-modal"
    >
      <Pressable
        className="flex-1 bg-black/50 justify-end"
        onPress={onClose}
      >
        <View
          className="bg-gray-900 rounded-t-2xl p-4 pb-8"
          onStartShouldSetResponder={() => true}
        >
          {/* Header */}
          <View className="items-center mb-4">
            <View className="w-12 h-1 bg-gray-700 rounded-full mb-4" />
            <Text className="text-white text-lg font-semibold">
              {component.name}
            </Text>
            <Text className="text-gray-400 text-sm">
              {t(`components.${component.type}`)}
            </Text>
          </View>

          {/* Menu Options */}
          <View className="gap-2">
            {/* View Details Option */}
            <Pressable
              onPress={handleViewDetails}
              className="flex-row items-center bg-gray-800 rounded-xl p-4"
              android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
              testID="context-menu-view-details"
            >
              <View className="w-10 h-10 rounded-full bg-green-600/20 items-center justify-center mr-4">
                <Text className="text-green-400 text-lg">🌿</Text>
              </View>
              <View className="flex-1">
                <Text className="text-white font-medium">
                  {t('contextMenu.viewDetails')}
                </Text>
                <Text className="text-gray-400 text-sm">
                  {t('contextMenu.viewDetailsDescription')}
                </Text>
              </View>
            </Pressable>

            {/* Edit Option */}
            <Pressable
              onPress={handleEdit}
              className="flex-row items-center bg-gray-800 rounded-xl p-4"
              android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
              testID="context-menu-edit"
            >
              <View className="w-10 h-10 rounded-full bg-blue-600/20 items-center justify-center mr-4">
                <Text className="text-blue-400 text-lg">✏️</Text>
              </View>
              <View className="flex-1">
                <Text className="text-white font-medium">
                  {t('contextMenu.edit')}
                </Text>
                <Text className="text-gray-400 text-sm">
                  {t('contextMenu.editDescription')}
                </Text>
              </View>
            </Pressable>

            {/* Return to Inventory Option - only shown for placed components */}
            {isPlaced && (
              <Pressable
                onPress={handleReturnToInventory}
                className="flex-row items-center bg-gray-800 rounded-xl p-4"
                android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
                testID="context-menu-return-inventory"
              >
                <View className="w-10 h-10 rounded-full bg-yellow-600/20 items-center justify-center mr-4">
                  <Text className="text-yellow-400 text-lg">↩️</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white font-medium">
                    {t('contextMenu.returnToInventory')}
                  </Text>
                  <Text className="text-gray-400 text-sm">
                    {t('contextMenu.returnToInventoryDescription')}
                  </Text>
                </View>
              </Pressable>
            )}

            {/* Delete Option */}
            <Pressable
              onPress={handleDelete}
              className="flex-row items-center bg-gray-800 rounded-xl p-4"
              android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
              testID="context-menu-delete"
            >
              <View className="w-10 h-10 rounded-full bg-red-600/20 items-center justify-center mr-4">
                <Text className="text-red-400 text-lg">❌</Text>
              </View>
              <View className="flex-1">
                <Text className="text-red-400 font-medium">
                  {t('contextMenu.delete')}
                </Text>
                <Text className="text-gray-400 text-sm">
                  {t('contextMenu.deleteDescription')}
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Cancel Button */}
          <Pressable
            onPress={onClose}
            className="mt-4 bg-gray-800 rounded-xl p-4 items-center"
            android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
            testID="context-menu-cancel"
          >
            <Text className="text-gray-300 font-medium">
              {t('common.cancel')}
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
