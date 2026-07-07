import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import React from 'react';
import { Image, Keyboard, Platform, StyleSheet, TouchableOpacity } from 'react-native';

import loc from '../loc';
import { Theme } from './themes';

const styles = StyleSheet.create({
  button: {
    minWidth: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonFormSheet: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
    height: 30,
    borderRadius: 15,
    marginLeft: 22,
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

type RouteParamHeaderOptions = {
  headerLeft?: boolean;
  headerRight?: boolean;
  unstable_headerLeftItems?: boolean;
  unstable_headerRightItems?: boolean;
  headerBackVisible?: boolean;
  statusBarStyle?: boolean;
};

export type NavigationOptionsGetter = (theme: Theme) => (deps: { navigation: any; route: any }) => NativeStackNavigationOptions;

const withRouteParamHeaderOptions =
  (config: RouteParamHeaderOptions): OptionsFormatter =>
  (options, { route }) => {
    const routeParams = route?.params ?? {};
    return {
      ...options,
      ...(config.headerLeft && routeParams.headerLeft !== undefined ? { headerLeft: routeParams.headerLeft } : {}),
      ...(config.headerRight && routeParams.headerRight !== undefined ? { headerRight: routeParams.headerRight } : {}),
      ...(config.unstable_headerLeftItems && routeParams.unstable_headerLeftItems !== undefined
        ? { unstable_headerLeftItems: routeParams.unstable_headerLeftItems }
        : {}),
      ...(config.unstable_headerRightItems && routeParams.unstable_headerRightItems !== undefined
        ? { unstable_headerRightItems: routeParams.unstable_headerRightItems }
        : {}),
      ...(config.headerBackVisible && routeParams.headerBackVisible !== undefined
        ? { headerBackVisible: routeParams.headerBackVisible }
        : {}),
      ...(config.statusBarStyle && routeParams.statusBarStyle !== undefined ? { statusBarStyle: routeParams.statusBarStyle } : {}),
    };
  };

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
    closeButtonIfFirstInStack,
    onCloseButtonPressed,
    ...opts
  }: NativeStackNavigationOptions & {
    closeButtonPosition?: CloseButtonPosition;
    /** When set, show this close control only if this screen is the first route in the stack (e.g. Coin Control opened from wallet details). */
    closeButtonIfFirstInStack?: CloseButtonPosition;
    onCloseButtonPressed?: (deps: { navigation: any; route: any }) => void;
  },
  formatter?: OptionsFormatter,
): NavigationOptionsGetter => {
  return theme =>
    ({ navigation, route }) => {
      const isFirstRouteInStack = navigation.getState().index === 0;
      const isModal = route.params?.presentation === 'modal' || route.params?.presentation === 'transparentModal';
      const isFormSheet = route.params?.presentation === 'formSheet';

      const closeButton =
        closeButtonIfFirstInStack && isFirstRouteInStack
          ? closeButtonIfFirstInStack
          : getCloseButtonPosition(closeButtonPosition, isFirstRouteInStack, isModal);
      const handleClose = getHandleCloseAction(onCloseButtonPressed, navigation, route);

      type HeaderItemsGetter = NonNullable<NativeStackNavigationOptions['unstable_headerRightItems']>;

      let headerRight;
      let headerLeft;
      let unstable_headerRightItems: HeaderItemsGetter | undefined;
      let unstable_headerLeftItems: HeaderItemsGetter | undefined;

      const renderCloseButtonElement = () => (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={loc._.close}
          style={isFormSheet ? [styles.buttonFormSheet, { backgroundColor: theme.colors.lightButton }] : styles.button}
          onPress={handleClose}
          testID="NavigationCloseButton"
        >
          <Image source={theme.closeImage} />
        </TouchableOpacity>
      );

      const buildUnstableCloseButtonItems = (): ReturnType<HeaderItemsGetter> => [
        {
          type: 'button',
          label: loc._.close,
          icon: { type: 'sfSymbol', name: 'xmark' },
          identifier: 'NavigationCloseButton',
          onPress: handleClose,
          accessibilityLabel: loc._.close,
        },
      ];

      if (closeButton === CloseButtonPosition.Right) {
        headerRight = renderCloseButtonElement;
        unstable_headerRightItems = buildUnstableCloseButtonItems;
      } else if (closeButton === CloseButtonPosition.Left) {
        headerLeft = renderCloseButtonElement;
        unstable_headerLeftItems = buildUnstableCloseButtonItems;
      }
      const baseHeaderStyle = {
        headerShadowVisible: false,
        headerTitleStyle: {
          fontWeight: '600' as const,
          color: theme.colors.foregroundColor,
        },
        headerTintColor: theme.colors.foregroundColor,
        headerBackButtonDisplayMode: 'minimal',
      };
      const isLeftCloseButtonAndroid = closeButton === CloseButtonPosition.Left && Platform.OS === 'android';

      const leftCloseButtonStyle = isLeftCloseButtonAndroid ? { headerBackImageSource: theme.closeImage } : { headerLeft };

      // statusBarStyle: auto is not supported on Android, so we get it based on the theme.barStyle
      const statusBarStyle: NativeStackNavigationOptions['statusBarStyle'] =
        opts.statusBarStyle && opts.statusBarStyle !== 'auto' ? opts.statusBarStyle : theme.barStyle === 'light-content' ? 'light' : 'dark';

      let options: NativeStackNavigationOptions = {
        ...baseHeaderStyle,
        ...leftCloseButtonStyle,
        headerBackButtonDisplayMode: 'minimal',
        headerRight,
        ...(unstable_headerRightItems ? { unstable_headerRightItems } : {}),
        ...(unstable_headerLeftItems ? { unstable_headerLeftItems } : {}),
        ...opts,
        statusBarStyle,
      };

      if (formatter) {
        options = formatter(options, { theme, navigation, route });
      }

      return options;
    };
};

export default navigationStyle;
export { CloseButtonPosition, withRouteParamHeaderOptions };
