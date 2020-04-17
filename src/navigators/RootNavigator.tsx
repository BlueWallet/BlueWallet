import { Easing, Animated } from 'react-native';
import { createStackNavigator, NavigationSceneRendererProps } from 'react-navigation';

import { MessageScreen, ActionSheet } from 'app/screens';

import { EditTextNavigator } from './EditTextNavigator';
import { MainTabNavigator } from './MainTabNavigator';

export const RootNavigator = createStackNavigator(
  {
    MainTabNavigator,
    Message: MessageScreen,
    ActionSheet: ActionSheet,
    EditTextNavigator,
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
