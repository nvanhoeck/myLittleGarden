import React from 'react';
import { Image, View } from 'react-native';

interface LogoProps {
  /**
   * Size of the logo in pixels (width and height)
   * @default 200
   */
  size?: number;
  /**
   * Optional test ID for testing purposes
   */
  testID?: string;
}

/**
 * Logo component displays the My Little Garden app logo
 * Uses the splash.png asset from the assets folder
 */
export function Logo({ size = 200, testID }: LogoProps): React.JSX.Element {
  return (
    <View
      className="items-center justify-center"
      testID={testID}
      style={{ width: size, height: size }}
    >
      <Image
        source={require('../../../../assets/splash.png')}
        className="rounded-lg"
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityLabel="My Little Garden logo"
      />
    </View>
  );
}
