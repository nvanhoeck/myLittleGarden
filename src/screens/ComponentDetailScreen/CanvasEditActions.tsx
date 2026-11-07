/**
 * CanvasEditActions
 * Delete / lock buttons under the canvas in edit mode, for the selected area
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

interface CanvasEditActionsProps {
  hasSelection: boolean;
  isLocked: boolean;
  onDelete: () => void;
  onToggleLock: () => void;
}

const ENABLED_RIPPLE = { color: 'rgba(255,255,255,0.1)' };
const DISABLED_CLASS = 'bg-gray-900/20 border-gray-800 opacity-30';

export function CanvasEditActions({ hasSelection, isLocked, onDelete, onToggleLock }: CanvasEditActionsProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <View className="flex-row mt-2 gap-3">
      <Pressable
        onPress={hasSelection ? onDelete : undefined}
        disabled={!hasSelection}
        className={`flex-1 flex-row items-center justify-center py-3 rounded-lg border ${hasSelection ? 'bg-red-900/60 border-red-700' : DISABLED_CLASS}`}
        android_ripple={hasSelection ? ENABLED_RIPPLE : undefined}
        accessibilityRole="button"
        accessibilityState={{ disabled: !hasSelection }}
        testID="canvas-delete-area"
      >
        <Text className={`font-medium ${hasSelection ? 'text-red-300' : 'text-gray-600'}`}>🗑️ {t('componentDetail.deleteArea')}</Text>
      </Pressable>
      <Pressable
        onPress={hasSelection ? onToggleLock : undefined}
        disabled={!hasSelection}
        className={`flex-1 flex-row items-center justify-center py-3 rounded-lg border ${hasSelection ? 'bg-gray-800 border-gray-600' : DISABLED_CLASS}`}
        android_ripple={hasSelection ? ENABLED_RIPPLE : undefined}
        accessibilityRole="button"
        accessibilityState={{ disabled: !hasSelection }}
        testID="canvas-toggle-area-lock"
      >
        <Text className={`font-medium ${hasSelection ? 'text-white' : 'text-gray-600'}`}>
          {isLocked ? `🔓 ${t('componentDetail.unlockArea')}` : `🔒 ${t('componentDetail.lockArea')}`}
        </Text>
      </Pressable>
    </View>
  );
}
