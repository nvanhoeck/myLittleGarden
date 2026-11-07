/**
 * CanvasEditActions
 * Delete / lock buttons (and optionally resize) under the canvas in edit mode, for the selected area
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';

interface CanvasEditActionsProps {
  hasSelection: boolean;
  isLocked: boolean;
  /** Without these the resize button is not shown (areas resize with their corner handle) */
  canResize?: boolean;
  onResize?: () => void;
  onDelete: () => void;
  onToggleLock: () => void;
}

const ENABLED_RIPPLE = { color: 'rgba(255,255,255,0.1)' };
const DISABLED_CLASS = 'bg-gray-900/20 border-gray-800 opacity-30';

export function CanvasEditActions({
  hasSelection,
  canResize = false,
  isLocked,
  onResize,
  onDelete,
  onToggleLock,
}: CanvasEditActionsProps): React.JSX.Element {
  return (
    <View className="flex-row mt-2 gap-3">
      {onResize !== undefined && (
        <Pressable
          onPress={canResize ? onResize : undefined}
          disabled={!canResize}
          className={`flex-1 flex-row items-center justify-center py-3 rounded-lg border ${canResize ? 'bg-purple-900/60 border-purple-700' : DISABLED_CLASS}`}
          android_ripple={canResize ? ENABLED_RIPPLE : undefined}
        >
          <Text className={`font-medium ${canResize ? 'text-purple-300' : 'text-gray-600'}`}>⧂ Formaat</Text>
        </Pressable>
      )}
      <Pressable
        onPress={hasSelection ? onDelete : undefined}
        disabled={!hasSelection}
        className={`flex-1 flex-row items-center justify-center py-3 rounded-lg border ${hasSelection ? 'bg-red-900/60 border-red-700' : DISABLED_CLASS}`}
        android_ripple={hasSelection ? ENABLED_RIPPLE : undefined}
        testID="canvas-delete-area"
      >
        <Text className={`font-medium ${hasSelection ? 'text-red-300' : 'text-gray-600'}`}>🗑️ Verwijderen</Text>
      </Pressable>
      <Pressable
        onPress={hasSelection ? onToggleLock : undefined}
        disabled={!hasSelection}
        className={`flex-1 flex-row items-center justify-center py-3 rounded-lg border ${hasSelection ? 'bg-gray-800 border-gray-600' : DISABLED_CLASS}`}
        android_ripple={hasSelection ? ENABLED_RIPPLE : undefined}
        testID="canvas-toggle-area-lock"
      >
        <Text className={`font-medium ${hasSelection ? 'text-white' : 'text-gray-600'}`}>{isLocked ? '🔓 Ontgrendelen' : '🔒 Vergrendelen'}</Text>
      </Pressable>
    </View>
  );
}
