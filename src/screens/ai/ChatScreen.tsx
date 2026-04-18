import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/navigationTypes';
import { ChatBubble } from '@/components/ai/ChatBubble';
import { ChatInputBar } from '@/components/ai/ChatInputBar';
import { useAiChat } from '@/hooks/ai/useAiChat';
import { getHealth } from '@/services/ai/healthService';
import type { ChatMessage } from '@/stores/ai/aiChatStore';

type ChatScreenProps = NativeStackScreenProps<RootStackParamList, 'AiChat'>;

type HealthGateState =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'down' };

/**
 * ChatScreen - AI Tuinassistent conversation screen.
 *
 * Responsibilities:
 *  - Health-gate the screen on mount (D11)
 *  - Show message list (D2), input bar (D5), loading spinner (D9)
 *  - Show error banner with retry (D10)
 */
export function ChatScreen({ navigation }: ChatScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const { messages, status, error, sendMessage } = useAiChat();
  const [draft, setDraft] = useState('');
  const [gate, setGate] = useState<HealthGateState>({ kind: 'loading' });
  const lastUserMessageRef = useRef<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const health = await getHealth();
        if (cancelled) return;
        setGate(health.status === 'down' ? { kind: 'down' } : { kind: 'ready' });
      } catch {
        if (cancelled) return;
        setGate({ kind: 'down' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    lastUserMessageRef.current = text;
    await sendMessage(text);
  }, [draft, sendMessage]);

  const handleRetry = useCallback(async () => {
    const last = lastUserMessageRef.current;
    if (last) {
      await sendMessage(last);
    }
  }, [sendMessage]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <ChatBubble role={item.role} content={item.content} />
    ),
    [],
  );

  const keyExtractor = useCallback(
    (_item: ChatMessage, index: number) => String(index),
    [],
  );

  // Header bar
  const header = (
    <View className="flex-row items-center px-3 h-14 border-b border-neutral-800">
      <Pressable
        onPress={handleBack}
        className="w-11 h-11 items-center justify-center rounded-full"
        testID="chat-back-button"
        accessibilityRole="button"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text className="text-on-background text-2xl">‹</Text>
      </Pressable>
      <Text className="flex-1 text-on-background text-xl font-medium ml-2">
        {t('ai.chat.title')}
      </Text>
    </View>
  );

  // Health gate: loading
  if (gate.kind === 'loading') {
    return (
      <SafeAreaView className="flex-1 bg-background" testID="chat-screen">
        {header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#5DB075" />
        </View>
      </SafeAreaView>
    );
  }

  // Health gate: down
  if (gate.kind === 'down') {
    return (
      <SafeAreaView className="flex-1 bg-background" testID="chat-screen">
        {header}
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-on-background text-center text-base">
            {t('ai.shared.offline')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" testID="chat-screen">
      {header}
      <KeyboardAvoidingView
        className="flex-1"
        behavior='padding'
      >
        {messages.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-on-background text-center text-base opacity-70">
              {t('ai.chat.emptyState')}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerClassName="py-3"
            testID="chat-messages-list"
          />
        )}

        {status === 'loading' && (
          <View
            className="flex-row items-center px-4 py-2"
            testID="chat-loading-indicator"
          >
            <ActivityIndicator size="small" color="#5DB075" />
            <Text className="text-on-background ml-2 opacity-70">
              {t('ai.chat.loading')}
            </Text>
          </View>
        )}

        {status === 'error' && error !== null && (
          <View
            className="flex-row items-center mx-3 my-2 px-4 py-3 rounded-lg bg-red-900/40 border border-red-700"
            testID="chat-error-banner"
          >
            <Text className="flex-1 text-error text-sm">{error}</Text>
            <Pressable
              onPress={handleRetry}
              className="ml-3 px-3 py-2 rounded-full bg-green-600"
              testID="chat-error-retry"
              accessibilityRole="button"
            >
              <Text className="text-white font-semibold">{t('ai.shared.retry')}</Text>
            </Pressable>
          </View>
        )}

        <ChatInputBar
          value={draft}
          onChangeText={setDraft}
          onSend={handleSend}
          disabled={status === 'loading'}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
