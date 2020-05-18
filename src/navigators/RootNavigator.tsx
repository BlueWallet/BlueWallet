import { Easing, Animated } from 'react-native';
import { createStackNavigator, NavigationSceneRendererProps } from 'react-navigation';

import { Route } from 'app/consts';
import { ActionSheet, ImportWalletQRCodeScreen, UnlockScreen } from 'app/screens';

import { EditTextNavigator } from './EditTextNavigator';
import { MainCardStackNavigator } from './MainCardStackNavigator';
import { MessageNavigator } from './MessageNavigator';
import { PinNavigator } from './PinNavigator';

export const RootNavigator = createStackNavigator(
  {
    MainCardStackNavigator,
    [Route.ImportWalletQRCode]: ImportWalletQRCodeScreen,
    [Route.ActionSheet]: ActionSheet,
    [Route.UnlockScreen]: UnlockScreen,
    PinNavigator,
    EditTextNavigator,
    MessageNavigator,
  },
  {
    headerMode: 'none',
    mode: 'modal',
    transparentCard: true,
    navigationOptions: {
      gesturesEnabled: false,
    },
    transitionConfig: () => ({
      transitionSpec: {
        duration: 100,
        easing: Easing.inOut(Easing.quad),
        timing: Animated.timing,
      },
      screenInterpolator: (sceneProps: NavigationSceneRendererProps) => {
        const { position, scene } = sceneProps;
        const { index } = scene;

        const opacity = position.interpolate({
          inputRange: [index - 1, index],
          outputRange: [0, 1],
        });

        return { opacity };
      },
    }),
  },
);
