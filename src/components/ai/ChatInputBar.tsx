import React from 'react';
import { View, TextInput, Pressable, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export interface ChatInputBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  disabled?: boolean;
}

/**
 * ChatInputBar molecule.
 *
 * Presentational input row with a text field and a Send button.
 * The Send button is disabled when the trimmed input is empty
 * or the parent passes  = true.
 */
export function ChatInputBar({
  value,
  onChangeText,
  onSend,
  disabled = false,
}: ChatInputBarProps): React.JSX.Element {
  const { t } = useTranslation();
  const canSend = !disabled && value.trim().length > 0;

  return (
    <View className="flex-row items-end px-3 py-2 bg-background border-t border-neutral-800">
      <TextInput
        className="flex-1 min-h-[44px] max-h-32 px-4 py-2 rounded-full bg-neutral-800 text-on-background text-base"
        value={value}
        onChangeText={onChangeText}
        placeholder={t('ai.chat.placeholder')}
        placeholderTextColor="#8A8D86"
        multiline
        editable={!disabled}
        testID="chat-input"
      />
      <Pressable
        onPress={onSend}
        disabled={!canSend}
        className={`ml-2 h-11 px-5 rounded-full bg-green-600 items-center justify-center ${canSend ? '' : 'opacity-50'}`}
        testID="chat-send-button"
        accessibilityRole="button"
        accessibilityLabel={t('ai.chat.send')}
      >
        <Text className="text-white font-semibold">{t('ai.chat.send')}</Text>
      </Pressable>
    </View>
  );
}
