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

enum CloseButtonPosition {
  None = 'None',
  Left = 'Left',
  Right = 'Right',
}

type OptionsFormatter = (
  options: NativeStackNavigationOptions,
  deps: { theme: Theme; navigation: any; route: any },
) => NativeStackNavigationOptions;

export type NavigationOptionsGetter = (theme: Theme) => (deps: { navigation: any; route: any }) => NativeStackNavigationOptions;

const getCloseButtonPosition = (
  closeButtonPosition: CloseButtonPosition | undefined,
  isFirstRouteInStack: boolean,
  isModal: boolean,
): CloseButtonPosition => {
  if (closeButtonPosition !== undefined) {
    return closeButtonPosition;
  }
  if (isFirstRouteInStack && isModal) {
    return CloseButtonPosition.Right;
  }
  return CloseButtonPosition.None;
};

const getHandleCloseAction = (
  onCloseButtonPressed: ((args: { navigation: any; route: any }) => void) | undefined,
  navigation: any,
  route: any,
) => {
  if (onCloseButtonPressed) {
    return () => onCloseButtonPressed({ navigation, route });
  }
  return () => {
    Keyboard.dismiss();
    navigation.goBack(null);
  };
};

const navigationStyle = (
  {
    closeButtonPosition,
    onCloseButtonPressed,
    headerBackVisible = true,
    ...opts
  }: NativeStackNavigationOptions & {
    closeButtonPosition?: CloseButtonPosition;
    onCloseButtonPressed?: (deps: { navigation: any; route: any }) => void;
  },
  formatter?: OptionsFormatter,
): NavigationOptionsGetter => {
  return theme =>
    ({ navigation, route }) => {
      const isFirstRouteInStack = navigation.getState().index === 0;
      const isModal = route.params?.presentation !== 'card';

      const closeButton = getCloseButtonPosition(closeButtonPosition, isFirstRouteInStack, isModal);
      const handleClose = getHandleCloseAction(onCloseButtonPressed, navigation, route);

      let headerRight;
      let headerLeft;

      if (!headerBackVisible) {
        headerLeft = () => <></>;
        opts.headerLeft = headerLeft;
      }

      if (closeButton === CloseButtonPosition.Right) {
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
      } else if (closeButton === CloseButtonPosition.Left) {
        headerLeft = () => (
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

      let options: NativeStackNavigationOptions = {
        headerShadowVisible: false,
        headerTitleStyle: {
          fontWeight: '600',
          color: theme.colors.foregroundColor,
        },
        headerBackTitleVisible: false,
        headerTintColor: theme.colors.foregroundColor,
        headerRight,
        headerLeft,
        ...opts,
      };

      if (formatter) {
        options = formatter(options, { theme, navigation, route });
      }

      return options;
    };
};

export default navigationStyle;
export { CloseButtonPosition };
