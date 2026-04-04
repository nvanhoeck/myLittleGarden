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
  PlantSelection: { componentId: string; layerIndex?: number };
  PlantDetails: { plantId: string };
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
export type PlantDetailsScreenProps = NativeStackScreenProps<RootStackParamList, 'PlantDetails'>;

/**
 * Type helper for useNavigation hook
 */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
