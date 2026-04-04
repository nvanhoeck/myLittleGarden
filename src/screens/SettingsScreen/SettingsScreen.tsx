import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { SettingsScreenProps } from '@/navigation/navigationTypes';

/**
 * SettingsScreen displays app settings including garden configuration
 * and export options. Features a standard top app bar with back button.
 */
export function SettingsScreen({ navigation }: SettingsScreenProps): React.JSX.Element {
  const { t } = useTranslation();

  const handleBackPress = (): void => {
    navigation.goBack();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" testID="settings-screen">
      {/* Standard TopAppBar with back button */}
      <View className="flex-row items-center px-2 h-16">
        <Pressable
          onPress={handleBackPress}
          className="w-touch-target h-touch-target items-center justify-center rounded-full"
          testID="back-button"
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          android_ripple={{ color: 'rgba(255,255,255,0.1)', borderless: true }}
        >
          {/* Back arrow icon using Unicode character */}
          <Text className="text-2xl text-on-surface">
            ←
          </Text>
        </Pressable>

        <Text className="flex-1 text-headline-small text-on-background font-medium text-center">
          {t('screens.settings.title')}
        </Text>

        {/* Spacer to balance the header layout */}
        <View className="w-touch-target" />
      </View>

      {/* Content area - placeholder */}
      <View className="flex-1 items-center justify-center px-4">
        <Text className="text-body-medium text-on-surface-variant text-center">
          {t('screens.settings.placeholder')}
        </Text>
      </View>
    </SafeAreaView>
  );
}
