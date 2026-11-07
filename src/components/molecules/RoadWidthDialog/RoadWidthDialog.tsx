/**
 * RoadWidthDialog
 * Asks the width of a road (whole cm). Three uses: a new road on a border,
 * the automatic roads (with the "ook rondom" toggle) and an existing road
 * (with its lock and "Pad verwijderen"). OK is disabled while the typed width
 * is not valid; the caller decides what a valid width is.
 * Purely presentational apart from the text being typed.
 *
 * BEM contract (src/styles/planning/season.css): .road-dialog, __backdrop, __panel, __title, __label, __input,
 * __input--invalid, __hint, __row, __row-label, __remove, __remove-text, __actions, __button, __button--disabled, __button-text
 */
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

const SWITCH_TRACK = { false: '#1e3a2f', true: '#059669' };
const SWITCH_THUMB_ON = '#10b981';
const SWITCH_THUMB_OFF = '#4a7c59';

interface RoadWidthDialogProps {
  visible: boolean;
  title: string;
  /** The width the input starts with (cm) */
  initialWidthCm: number;
  /** The width the text stands for, or null when it cannot be confirmed */
  widthFrom: (text: string) => number | null;
  /** Automatic roads: show the "ook rondom" toggle */
  showRingToggle?: boolean;
  /** An existing road: its lock, shown as a toggle when onToggleLock is given */
  locked?: boolean;
  onToggleLock?: () => void;
  /** An existing road: show "Pad verwijderen" */
  onRemove?: () => void;
  onConfirm: (widthCm: number, withRing: boolean) => void;
  onCancel: () => void;
}

export function RoadWidthDialog({
  visible,
  title,
  initialWidthCm,
  widthFrom,
  showRingToggle = false,
  locked = false,
  onToggleLock,
  onRemove,
  onConfirm,
  onCancel,
}: RoadWidthDialogProps): React.JSX.Element {
  const { t } = useTranslation();
  const [text, setText] = useState(String(initialWidthCm));
  const [withRing, setWithRing] = useState(false);

  // Every opening starts from the given width, ring off
  useEffect(() => {
    if (visible) {
      setText(String(initialWidthCm));
      setWithRing(false);
    }
  }, [visible, initialWidthCm]);

  const widthCm = widthFrom(text);
  const canConfirm = widthCm !== null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        className="flex-1 bg-black/60 items-center justify-center px-6"
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel={t('common.cancel')}
      >
        <Pressable className="w-full bg-gray-900 rounded-2xl p-4" onPress={() => undefined} accessible={false} testID="road-width-dialog">
          <Text className="text-white text-lg font-semibold mb-3" accessibilityRole="header">{title}</Text>

          <Text className="text-gray-300 text-sm mb-1">{t('componentDetail.roadWidth')}</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            keyboardType="number-pad"
            maxLength={3}
            selectTextOnFocus
            className={`h-12 px-3 rounded-lg bg-gray-800 text-white text-base border ${canConfirm ? 'border-gray-600' : 'border-red-500'}`}
            accessibilityLabel={t('componentDetail.roadWidth')}
            accessibilityHint={t('componentDetail.roadWidthHint')}
            testID="road-width-input"
          />
          <Text className={`text-xs mt-1 ${canConfirm ? 'text-gray-500' : 'text-red-400'}`}>{t('componentDetail.roadWidthHint')}</Text>

          {showRingToggle && (
            <View className="flex-row items-center justify-between min-h-12 mt-3">
              <Text className="flex-1 text-white text-base">{t('componentDetail.roadRing')}</Text>
              <Switch
                value={withRing}
                onValueChange={setWithRing}
                trackColor={SWITCH_TRACK}
                thumbColor={withRing ? SWITCH_THUMB_ON : SWITCH_THUMB_OFF}
                accessibilityLabel={t('componentDetail.roadRing')}
                testID="road-ring-toggle"
              />
            </View>
          )}

          {onToggleLock !== undefined && (
            <View className="flex-row items-center justify-between min-h-12 mt-3">
              <Text className="flex-1 text-white text-base">🔒 {t('componentDetail.roadLocked')}</Text>
              <Switch
                value={locked}
                onValueChange={onToggleLock}
                trackColor={SWITCH_TRACK}
                thumbColor={locked ? SWITCH_THUMB_ON : SWITCH_THUMB_OFF}
                accessibilityLabel={t('componentDetail.roadLocked')}
                testID="road-lock-toggle"
              />
            </View>
          )}

          {onRemove !== undefined && (
            <Pressable
              onPress={onRemove}
              className="flex-row items-center h-12 mt-2"
              accessibilityRole="button"
              testID="road-remove"
            >
              <Text className="text-red-400 text-base font-medium">🗑️ {t('componentDetail.roadRemove')}</Text>
            </Pressable>
          )}

          <View className="flex-row justify-end gap-2 mt-4">
            <Pressable
              onPress={onCancel}
              className="h-12 px-4 items-center justify-center rounded-lg"
              accessibilityRole="button"
              testID="road-width-cancel"
            >
              <Text className="text-gray-300 font-medium">{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (widthCm !== null) onConfirm(widthCm, withRing);
              }}
              disabled={!canConfirm}
              className={`h-12 px-5 items-center justify-center rounded-lg ${canConfirm ? 'bg-green-600' : 'bg-gray-800 opacity-50'}`}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canConfirm }}
              testID="road-width-ok"
            >
              <Text className={`font-semibold ${canConfirm ? 'text-white' : 'text-gray-500'}`}>{t('common.ok')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
