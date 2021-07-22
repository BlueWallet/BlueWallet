import React from 'react';
import { Image, Keyboard, TouchableOpacity, StyleSheet } from 'react-native';
import { Theme } from './themes';

const styles = StyleSheet.create({
  button: {
    minWidth: 40,
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
});

type NavigationOptions = {
  headerStyle?: {
    borderBottomWidth: number;
    elevation: number;
    shadowOpacity?: number;
    shadowOffset: { height?: number; width?: number };
  };
  headerTitleStyle?: {
    fontWeight: string;
    color: string;
  };
  headerLeft?: (() => React.ReactElement) | null;
  headerRight?: (() => React.ReactElement) | null;
  headerBackTitleVisible?: false;
  headerTintColor?: string;
  title?: string;
};

type OptionsFormatter = (options: NavigationOptions, deps: { theme: Theme; navigation: any; route: any }) => NavigationOptions;

export type NavigationOptionsGetter = (theme: Theme) => (deps: { navigation: any; route: any }) => NavigationOptions;

const navigationStyle = (
  {
    closeButton = false,
    closeButtonFunc,
    ...opts
  }: NavigationOptions & {
    closeButton?: boolean;
    closeButtonFunc?: (deps: { navigation: any; route: any }) => React.ReactElement;
  },
  formatter: OptionsFormatter,
): NavigationOptionsGetter => {
  return theme => ({ navigation, route }) => {
    let headerRight = null;
    if (closeButton) {
      const handleClose = closeButtonFunc
        ? () => closeButtonFunc({ navigation, route })
        : () => {
            Keyboard.dismiss();
            navigation.goBack(null);
          };
      headerRight = () => (
        <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={handleClose} testID="NavigationCloseButton">
          <Image source={theme.closeImage} />
        </TouchableOpacity>
      );
    }

    let options: NavigationOptions = {
      headerStyle: {
        borderBottomWidth: 0,
        elevation: 0,
        shadowOpacity: 0,
        shadowOffset: { height: 0, width: 0 },
      },
      headerTitleStyle: {
        fontWeight: '600',
        color: theme.colors.foregroundColor,
      },
      headerRight: headerRight,
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

export const navigationStyleTx = (opts: NavigationOptions, formatter: OptionsFormatter): NavigationOptionsGetter => {
  return theme => ({ navigation, route }) => {
    let options: NavigationOptions = {
      headerStyle: {
        borderBottomWidth: 0,
        elevation: 0,
        shadowOffset: { height: 0, width: 0 },
      },
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
