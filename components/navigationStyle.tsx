import type { NativeStackNavigationOptions, NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ParamListBase, RouteProp } from '@react-navigation/native';
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

/** navigation/route of a screen; defaults to "any screen of any stack" for helpers shared by every navigator */
export type ScreenDeps<P extends ParamListBase = ParamListBase, R extends keyof P = keyof P> = {
  navigation: NativeStackNavigationProp<P, R>;
  route: RouteProp<P, R>;
};

export type OptionsFormatter<P extends ParamListBase = ParamListBase, R extends keyof P = keyof P> = (
  options: NativeStackNavigationOptions,
  deps: ScreenDeps<P, R> & { theme: Theme },
) => NativeStackNavigationOptions;

type RouteParamHeaderOptions = {
  headerLeft?: boolean;
  headerRight?: boolean;
  headerBackVisible?: boolean;
  statusBarStyle?: boolean;
};

/** what Stack.Screen options={} takes; React Navigation types navigation as optional there */
export type NavigationOptionsGetter<P extends ParamListBase = ParamListBase, R extends keyof P = keyof P> = (
  theme: Theme,
) => (deps: { navigation: NativeStackNavigationProp<P, R> | undefined; route: RouteProp<P, R> }) => NativeStackNavigationOptions;

/** params a screen may receive to override its header; see RouteParamHeaderOptions */
type HeaderParams = Pick<
  NativeStackNavigationOptions,
  'headerLeft' | 'headerRight' | 'headerBackVisible' | 'statusBarStyle' | 'presentation'
>;

const withRouteParamHeaderOptions =
  <P extends ParamListBase = ParamListBase, R extends keyof P = keyof P>(config: RouteParamHeaderOptions): OptionsFormatter<P, R> =>
  (options, { route }) => {
    const routeParams: HeaderParams = route?.params ?? {};
    return {
      ...options,
      ...(config.headerLeft && routeParams.headerLeft !== undefined ? { headerLeft: routeParams.headerLeft } : {}),
      ...(config.headerRight && routeParams.headerRight !== undefined ? { headerRight: routeParams.headerRight } : {}),
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

const getHandleCloseAction = <P extends ParamListBase, R extends keyof P>(
  onCloseButtonPressed: ((deps: ScreenDeps<P, R>) => void) | undefined,
  deps: ScreenDeps<P, R>,
) => {
  if (onCloseButtonPressed) {
    return () => onCloseButtonPressed(deps);
  }
  return () => {
    Keyboard.dismiss();
    deps.navigation.goBack();
  };
};

const navigationStyle = <P extends ParamListBase = ParamListBase, R extends keyof P = keyof P>(
  {
    closeButtonPosition,
    closeButtonIfFirstInStack,
    onCloseButtonPressed,
    ...opts
  }: NativeStackNavigationOptions & {
    closeButtonPosition?: CloseButtonPosition;
    /** When set, show this close control only if this screen is the first route in the stack (e.g. Coin Control opened from wallet details). */
    closeButtonIfFirstInStack?: CloseButtonPosition;
    onCloseButtonPressed?: (deps: ScreenDeps<P, R>) => void;
  },
  formatter?: OptionsFormatter<P, R>,
): NavigationOptionsGetter<P, R> => {
  return theme =>
    ({ navigation, route }) => {
      if (!navigation) return opts; // static navigation config only; never the case with our navigators
      const isFirstRouteInStack = navigation.getState().index === 0;
      const params: HeaderParams | undefined = route.params;
      const isModal = params?.presentation === 'modal' || params?.presentation === 'transparentModal';
      const isFormSheet = params?.presentation === 'formSheet';

      const closeButton =
        closeButtonIfFirstInStack && isFirstRouteInStack
          ? closeButtonIfFirstInStack
          : getCloseButtonPosition(closeButtonPosition, isFirstRouteInStack, isModal);
      const handleClose = getHandleCloseAction(onCloseButtonPressed, {
        navigation,
        route,
      });

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

// Shared by the receive form sheets, registered in both ReceiveDetailsStack and DetailViewScreensStack.
const receiveSheetOptions = (headerTitle: string, androidDetent = 0.5) =>
  navigationStyle({
    presentation: 'formSheet',
    sheetAllowedDetents: Platform.OS === 'ios' ? 'fitToContents' : [androidDetent],
    headerTitle,
    sheetGrabberVisible: true,
    closeButtonPosition: CloseButtonPosition.Right,
  });

export default navigationStyle;
export { CloseButtonPosition, withRouteParamHeaderOptions, receiveSheetOptions };
