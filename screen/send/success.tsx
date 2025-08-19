import React, { useEffect } from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';
import BigNumber from 'bignumber.js';
import LottieView from 'lottie-react-native';
import { StyleSheet, View } from 'react-native';
import { Text } from '@rneui/themed';
import { BlueCard } from '../../BlueComponents';
import Button from '../../components/Button';
import SafeArea from '../../components/SafeArea';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import HandOffComponent from '../../components/HandOffComponent';
import { HandOffActivityType } from '../../components/types';
import { useSettings } from '../../hooks/context/useSettings';
import { SendDetailsStackParamList } from '../../navigation/SendDetailsStackParamList.ts';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation.ts';

type RouteProps = RouteProp<SendDetailsStackParamList, 'Success'>;

const Success = () => {
  const navigation = useExtendedNavigation();
  const { colors } = useTheme();
  const { selectedBlockExplorer } = useSettings();
  const route = useRoute<RouteProps>();
  const { amount, fee, amountUnit = BitcoinUnit.BTC, invoiceDescription = '', txid } = route.params || {};
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

  const onDonePressed = () => {
    // @ts-ignore idk
    navigation?.getParent().pop();
  };

  useEffect(() => {
    console.log('send/success - useEffect');
  }, []);

  return (
    <SafeArea style={[styles.root, stylesHook.root]}>
      <SuccessView amount={amount} amountUnit={amountUnit} fee={fee} invoiceDescription={invoiceDescription} />
      <View style={styles.buttonContainer}>
        <Button onPress={onDonePressed} title={loc.send.success_done} />
      </View>
      {txid && (
        <HandOffComponent
          title={loc.transactions.details_title}
          type={HandOffActivityType.ViewInBlockExplorer}
          url={`${selectedBlockExplorer.url}/tx/${txid}`}
        />
      )}
    </SafeArea>
  );
};

export default Success;

interface SuccessViewParam {
  amount?: number;
  amountUnit?: BitcoinUnit;
  fee?: number;
  invoiceDescription?: string;
  shouldAnimate?: boolean;
}

export const SuccessView = ({ amount, amountUnit, fee, invoiceDescription, shouldAnimate = true }: SuccessViewParam) => {
  const { colors } = useTheme();

  let unit: string = '';
  switch (amountUnit) {
    case BitcoinUnit.BTC:
    case BitcoinUnit.SATS:
      unit = loc.units[amountUnit];
      break;
  }

  const stylesHook = StyleSheet.create({
    amountValue: {
      color: colors.alternativeTextColor2,
    },
    amountUnit: {
      color: colors.alternativeTextColor2,
    },
  });

  return (
    <View style={styles.root}>
      {amount || (fee ?? 0) > 0 ? (
        <BlueCard style={styles.amount}>
          <View style={styles.view}>
            {amount ? (
              <>
                <Text style={[styles.amountValue, stylesHook.amountValue]}>{amount}</Text>
                <Text style={[styles.amountUnit, stylesHook.amountUnit]}>{' ' + unit}</Text>
              </>
            ) : null}
          </View>
          {(fee ?? 0) > 0 && (
            <Text style={styles.feeText}>
              {loc.send.create_fee}: {new BigNumber(fee ?? 0).toFixed(8)} {loc.units[BitcoinUnit.BTC]}
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
