import React, { useEffect, useState, useRef } from 'react';
import LottieView from 'lottie-react-native';
import WalletMigrate from './screen/wallets/walletMigrate';
import * as NavigationService from './NavigationService';
import { StackActions } from '@react-navigation/native';

const LoadingScreen = () => {
  const [isMigratingData, setIsMigratinData] = useState(true);
  const loadingAnimation = useRef();

  const handleMigrationComplete = async () => {
    setIsMigratinData(false);
  };
  const walletMigrate = useRef(new WalletMigrate(handleMigrationComplete));

  const replaceStackNavigation = () => {
    NavigationService.dispatch(StackActions.replace('UnlockWithScreenRoot'));
  };

  const onAnimationFinish = () => {
    if (isMigratingData) {
      loadingAnimation.current.play(0);
    } else {
      replaceStackNavigation();
    }
  };

  useEffect(() => {
    walletMigrate.current.start();
  }, [walletMigrate]);

  return (
    <LottieView
      ref={loadingAnimation}
      source={require('./img/bluewalletsplash.json')}
      autoPlay
      loop={false}
      onAnimationFinish={onAnimationFinish}
    />
  );
};
export default LoadingScreen;
