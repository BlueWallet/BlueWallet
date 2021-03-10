import React from 'react';
import { Image, Keyboard, TouchableOpacity, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  button: {
    minWidth: 40,
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
});

const navigationStyle = ({ closeButton = false, closeButtonFunc, ...opts }, formatter) => {
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
        <TouchableOpacity style={styles.button} onPress={handleClose} testID="NavigationCloseButton">
          <Image source={theme.closeImage} />
        </TouchableOpacity>
      );
    }

    let options = {
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

export const navigationStyleTx = (opts, formatter) => {
  return theme => ({ navigation, route }) => {
    let options = {
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
