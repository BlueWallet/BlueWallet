import React from 'react';
import LottieView from 'lottie-react-native';
import * as NavigationService from './NavigationService';
import { StackActions } from '@react-navigation/native';

const LoadingScreen = () => {
  const replaceStackNavigation = () => {
    NavigationService.dispatch(StackActions.replace('UnlockWithScreenRoot'));
  };

  const onAnimationFinish = () => {
    replaceStackNavigation();
  };

  return <LottieView source={require('./img/bluewalletsplash.json')} autoPlay loop={false} onAnimationFinish={onAnimationFinish} />;
};
export default LoadingScreen;
