import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/**
 * Root stack parameter list defining all screens and their parameters
 */
export type RootStackParamList = {
  Splash: undefined;
  EnvironmentSetup: undefined;
  Home: undefined;
  Settings: undefined;
  ComponentDetail: { componentId: string };
  PlantSelection: { componentId: string; year: number };
  Planning: { componentId: string; year: number };
  PlantDetails: { plantId: string };
  AiChat: undefined;
};

/**
 * Screen prop types for each screen
 */
export type SplashScreenProps = NativeStackScreenProps<RootStackParamList, 'Splash'>;
export type EnvironmentSetupScreenProps = NativeStackScreenProps<RootStackParamList, 'EnvironmentSetup'>;
export type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
export type SettingsScreenProps = NativeStackScreenProps<RootStackParamList, 'Settings'>;
export type ComponentDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'ComponentDetail'>;
export type PlantSelectionScreenProps = NativeStackScreenProps<RootStackParamList, 'PlantSelection'>;
export type PlanningScreenProps = NativeStackScreenProps<RootStackParamList, 'Planning'>;
export type PlantDetailsScreenProps = NativeStackScreenProps<RootStackParamList, 'PlantDetails'>;
export type AiChatScreenProps = NativeStackScreenProps<RootStackParamList, 'AiChat'>;

/**
 * Type helper for useNavigation hook
 */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
