import React from 'react';
import { View, Text } from 'react-native';

export interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * ChatBubble atom.
 *
 * Purely presentational: renders a single chat message bubble styled
 * according to its role. BEM contract:
 *   .chat__bubble--user       (right-aligned, primary background)
 *   .chat__bubble--assistant  (left-aligned, neutral background)
 */
export function ChatBubble({ role, content }: ChatBubbleProps): React.JSX.Element {
  const isUser = role === 'user';
  const containerClass = isUser
    ? 'self-end max-w-[80%] my-1 mx-3 px-4 py-3 rounded-2xl bg-green-600'
    : 'self-start max-w-[80%] my-1 mx-3 px-4 py-3 rounded-2xl bg-neutral-800';
  const textClass = isUser ? 'text-white text-base' : 'text-on-background text-base';

  return (
    <View className={containerClass} testID={`chat-bubble-${role}`}>
      <Text className={textClass}>{content}</Text>
    </View>
  );
}
