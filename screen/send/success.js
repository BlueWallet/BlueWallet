import React, { useEffect, useRef } from 'react';
import LottieView from 'lottie-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-elements';
import { BlueButton, SafeBlueArea, BlueCard } from '../../BlueComponents';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import loc from '../../loc';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';

const Success = () => {
  const { colors } = useTheme();
  const { dangerouslyGetParent } = useNavigation();
  const { amount, fee = 0, amountUnit = BitcoinUnit.BTC, invoiceDescription = '' } = useRoute().params;
  const animationRef = useRef();
  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
    amountValue: {
      color: colors.alternativeTextColor2,
    },
    amountUnit: {
      color: colors.alternativeTextColor2,
    },
  });
  useEffect(() => {
    console.log('send/success - useEffect');
    ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pop = () => {
    dangerouslyGetParent().pop();
  };

  useEffect(() => {
    animationRef.current.reset();
    animationRef.current.resume();
  }, [colors]);

  return (
    <SafeBlueArea style={[styles.root, stylesHook.root]}>
      <BlueCard style={styles.amout}>
        {amount > 0 && (
          <View style={styles.view}>
            <Text style={[styles.amountValue, stylesHook.amountValue]}>{amount}</Text>
            <Text style={[styles.amountUnit, stylesHook.amountUnit]}>{' ' + amountUnit}</Text>
          </View>
        )}
        {fee > 0 && (
          <Text style={styles.feeText}>
            {loc.send.create_fee}: {fee} {BitcoinUnit.BTC}
          </Text>
        )}
        {fee <= 0 && (
          <Text numberOfLines={0} style={styles.feeText}>
            {invoiceDescription}
          </Text>
        )}
      </BlueCard>
      <View style={styles.ready}>
        <LottieView
          style={styles.lottie}
          source={require('../../img/bluenice.json')}
          autoPlay
          ref={animationRef}
          loop={false}
          colorFilters={[
            {
              keypath: 'spark',
              color: colors.success,
            },
            {
              keypath: 'circle',
              color: colors.success,
            },
            {
              keypath: 'Oval',
              color: colors.successCheck,
            },
          ]}
        />
      </View>
      <BlueCard>
        <BlueButton onPress={pop} title={loc.send.success_done} />
      </BlueCard>
    </SafeBlueArea>
  );
};

Success.navigationOptions = {
  headerShown: false,
  gesturesEnabled: false,
};

export default Success;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 19,
  },
  amout: {
    alignItems: 'center',
    flex: 1,
  },
  view: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 76,
    paddingBottom: 16,
  },
  amountValue: {
    fontSize: 36,
    fontWeight: '600',
  },
  amountUnit: {
    fontSize: 16,
    marginHorizontal: 4,
    paddingBottom: 6,
    fontWeight: '600',
    alignSelf: 'flex-end',
  },
  feeText: {
    color: '#37c0a1',
    fontSize: 14,
    marginHorizontal: 4,
    paddingBottom: 6,
    fontWeight: '500',
    alignSelf: 'center',
  },
  ready: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 43,
    marginBottom: 53,
  },
  lottie: {
    width: 400,
    height: 400,
  },
});
