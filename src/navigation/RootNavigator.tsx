import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SplashScreen } from '@screens/SplashScreen';
import { EnvironmentSetupScreen } from '@screens/EnvironmentSetupScreen';
import { HomeScreen } from '@screens/HomeScreen';
import { SettingsScreen } from '@screens/SettingsScreen';
import { ComponentDetailScreen } from '@screens/ComponentDetailScreen';
import { PlantSelectionScreen } from '@screens/PlantSelectionScreen';
import { PlantDetailsScreen } from '@screens/PlantDetailsScreen';
import { theme } from '@/styles/theme';
import type { RootStackParamList } from './navigationTypes';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * RootNavigator defines the main navigation structure of the app.
 * All screens are configured with headers hidden by default since
 * each screen manages its own header for maximum flexibility.
 */
export function RootNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen
        name="Splash"
        component={SplashScreen}
      />
      <Stack.Screen
        name="EnvironmentSetup"
        component={EnvironmentSetupScreen}
        options={{
          // Prevent back navigation during setup
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="Home"
        component={HomeScreen}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="ComponentDetail"
        component={ComponentDetailScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="PlantSelection"
        component={PlantSelectionScreen}
        options={{
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="PlantDetails"
        component={PlantDetailsScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
    </Stack.Navigator>
  );
}
