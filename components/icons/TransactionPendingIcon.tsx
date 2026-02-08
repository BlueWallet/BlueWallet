import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';

import { useTheme } from '../themes';

const styles = StyleSheet.create({
  boxIncoming: {
    position: 'relative',
  } as ViewStyle,
  ball: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  lottie: {
    width: 20,
    height: 20,
    alignSelf: 'center',
  } as ViewStyle,
});

const TransactionPendingIcon: React.FC = () => {
  const { colors } = useTheme();
  const lottieRef = useRef<LottieView>(null);

  const stylesHook = StyleSheet.create({
    ball: {
      backgroundColor: 'rgba(0, 60, 240, 0.1)', // #003CF0 at 10% opacity
    },
  });

  try {
    const pendingAnimation = require('../../img/pending.json');
    
    return (
      <View style={styles.boxIncoming}>
        <View style={[styles.ball, stylesHook.ball]}>
          <LottieView
            ref={lottieRef}
            style={styles.lottie}
            source={pendingAnimation}
            autoPlay={true}
            loop={true}
            resizeMode="cover"
          />
        </View>
      </View>
    );
  } catch (error) {
    // Fallback: return empty view if file fails to load
    return (
      <View style={styles.boxIncoming}>
        <View style={[styles.ball, stylesHook.ball]} />
      </View>
    );
  }
};

export default TransactionPendingIcon;
