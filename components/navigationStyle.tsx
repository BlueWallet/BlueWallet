import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import React from 'react';
import { Image, Keyboard, StyleSheet, TouchableOpacity } from 'react-native';
import loc from '../loc';
import { Theme } from './themes';

const styles = StyleSheet.create({
  button: {
    minWidth: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

type OptionsFormatter = (
  options: NativeStackNavigationOptions,
  deps: { theme: Theme; navigation: any; route: any },
) => NativeStackNavigationOptions;

export type NavigationOptionsGetter = (theme: Theme) => (deps: { navigation: any; route: any }) => NativeStackNavigationOptions;

const navigationStyle = (
  {
    closeButtonFunc,
    headerBackVisible = true,
    ...opts
  }: NativeStackNavigationOptions & {
    closeButton?: boolean;
    closeButtonFunc?: (deps: { navigation: any; route: any }) => React.ReactElement;
  },
  formatter?: OptionsFormatter,
): NavigationOptionsGetter => {
  return theme =>
    ({ navigation, route }) => {
      // Determine if the current screen is the first one in the stack using the updated method
      const isFirstRouteInStack = navigation.getState().index === 0;

      // Default closeButton to true if the current screen is the first one in the stack
      const closeButton = opts.closeButton !== undefined ? opts.closeButton : isFirstRouteInStack;

      let headerRight;
      let headerLeft;
      if (closeButton) {
        const handleClose = closeButtonFunc
          ? () => closeButtonFunc({ navigation, route })
          : () => {
              Keyboard.dismiss();
              navigation.goBack(null);
            };
        headerRight = () => (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={loc._.close}
            style={styles.button}
            onPress={handleClose}
            testID="NavigationCloseButton"
          >
            <Image source={theme.closeImage} />
          </TouchableOpacity>
        );
      }

      if (!headerBackVisible) {
        headerLeft = () => <></>;
        opts.headerLeft = headerLeft;
      }

      let options: NativeStackNavigationOptions = {
        headerShadowVisible: false,
        headerTitleStyle: {
          fontWeight: '600',
          color: theme.colors.foregroundColor,
        },
        headerRight,
        headerBackTitleVisible: false,
        headerTintColor: theme.colors.foregroundColor,
        ...opts,
      };

      if (formatter) {
        options = formatter(options, { theme, navigation, route });
      }

      return options;
    };
};

export default navigationStyle;

export const navigationStyleTx = (opts: NativeStackNavigationOptions, formatter: OptionsFormatter): NavigationOptionsGetter => {
  return theme =>
    ({ navigation, route }) => {
      let options: NativeStackNavigationOptions = {
        headerTitleStyle: {
          fontWeight: '600',
          color: theme.colors.foregroundColor,
        },
        // headerBackTitle: null,
        headerBackTitleVisible: false,
        headerTintColor: theme.colors.foregroundColor,
        headerLeft: () => (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={loc._.close}
            style={styles.button}
            onPress={() => {
              Keyboard.dismiss();
              navigation.goBack(null);
            }}
          >
            <Image source={theme.closeImage} />
          </TouchableOpacity>
        ),
        ...opts,
      };

      if (formatter) {
        options = formatter(options, { theme, navigation, route });
      }

      return options;
    };
};
