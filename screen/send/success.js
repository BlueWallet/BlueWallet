import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import LottieView from 'lottie-react-native';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { Text } from 'react-native-elements';
import BigNumber from 'bignumber.js';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';

import { BlueButton, BlueCard } from '../../BlueComponents';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import loc from '../../loc';

const Success = () => {
  const pop = () => {
    dangerouslyGetParent().pop();
  };
  const { colors } = useTheme();
  const { dangerouslyGetParent } = useNavigation();
  const { amount, fee, amountUnit = BitcoinUnit.BTC, invoiceDescription = '', onDonePressed = pop } = useRoute().params;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={[styles.root, stylesHook.root]}>
      <SuccessView
        amount={amount}
        amountUnit={amountUnit}
        fee={fee}
        invoiceDescription={invoiceDescription}
        onDonePressed={onDonePressed}
      />
      <View style={styles.buttonContainer}>
        <BlueButton onPress={onDonePressed} title={loc.send.success_done} />
      </View>
    </SafeAreaView>
  );
};

export default Success;

export const SuccessView = ({ amount, amountUnit, fee, invoiceDescription, shouldAnimate = true }) => {
  const animationRef = useRef();
  const { colors } = useTheme();

  const stylesHook = StyleSheet.create({
    amountValue: {
      color: colors.alternativeTextColor2,
    },
    amountUnit: {
      color: colors.alternativeTextColor2,
    },
  });

  useEffect(() => {
    if (shouldAnimate && animationRef.current) {
      /*
      https://github.com/lottie-react-native/lottie-react-native/issues/832#issuecomment-1008209732
      Temporary workaround until Lottie is fixed.
      */
      setTimeout(() => {
        animationRef.current?.reset();
        animationRef.current?.play();
      }, 100);
    }
  }, [colors, shouldAnimate]);

  return (
    <View style={styles.root}>
      {amount || fee > 0 ? (
        <BlueCard style={styles.amount}>
          <View style={styles.view}>
            {amount ? (
              <>
                <Text style={[styles.amountValue, stylesHook.amountValue]}>{amount}</Text>
                <Text style={[styles.amountUnit, stylesHook.amountUnit]}>{' ' + loc.units[amountUnit]}</Text>
              </>
            ) : null}
          </View>
          {fee > 0 && (
            <Text style={styles.feeText}>
              {loc.send.create_fee}: {new BigNumber(fee).toFixed()} {loc.units[BitcoinUnit.BTC]}
            </Text>
          )}
          <Text numberOfLines={0} style={styles.feeText}>
            {invoiceDescription}
          </Text>
        </BlueCard>
      ) : null}

      <View style={styles.ready}>
        <LottieView
          style={styles.lottie}
          source={require('../../img/bluenice.json')}
          autoPlay={shouldAnimate}
          ref={animationRef}
          loop={false}
          progress={shouldAnimate ? 0 : 1}
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
          resizeMode="center"
        />
      </View>
    </View>
  );
};

SuccessView.propTypes = {
  amount: PropTypes.number,
  amountUnit: PropTypes.string,
  fee: PropTypes.number,
  invoiceDescription: PropTypes.string,
  shouldAnimate: PropTypes.bool,
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 19,
  },
  buttonContainer: {
    paddingHorizontal: 58,
    paddingBottom: 16,
  },
  amount: {
    alignItems: 'center',
  },
  view: {
    flexDirection: 'row',
    justifyContent: 'center',
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
    paddingVertical: 6,
    fontWeight: '500',
    alignSelf: 'center',
  },
  ready: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    alignItems: 'center',
    marginBottom: 53,
  },
  lottie: {
    width: 200,
    height: 200,
  },
});
