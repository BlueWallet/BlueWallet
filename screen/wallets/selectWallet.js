/* eslint-disable react/prop-types */
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Image, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { SafeBlueArea, BlueNavigationStyle, BlueText, BlueSpacing20, BluePrivateBalance } from '../../BlueComponents';
import LinearGradient from 'react-native-linear-gradient';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import WalletGradient from '../../class/wallet-gradient';
import { useRoute } from '@react-navigation/native';
/** @type {AppStorage} */
const BlueApp = require('../../BlueApp');
const loc = require('../../loc');

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignContent: 'center',
    paddingTop: 20,
  },
  itemRoot: {
    backgroundColor: 'transparent',
    padding: 10,
    marginVertical: 17,
  },
  gradient: {
    padding: 15,
    borderRadius: 10,
    minHeight: 164,
    elevation: 5,
  },
  image: {
    width: 99,
    height: 94,
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  transparentText: {
    backgroundColor: 'transparent',
  },
  label: {
    backgroundColor: 'transparent',
    fontSize: 19,
    color: '#fff',
  },
  balance: {
    backgroundColor: 'transparent',
    fontWeight: 'bold',
    fontSize: 36,
    color: '#fff',
  },
  latestTxLabel: {
    backgroundColor: 'transparent',
    fontSize: 13,
    color: '#fff',
  },
  latestTxValue: {
    backgroundColor: 'transparent',
    fontWeight: 'bold',
    fontSize: 16,
    color: '#fff',
  },
  noWallets: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
  },
  center: {
    textAlign: 'center',
  },
});

const SelectWallet = () => {
  const { chainType, onWalletSelect, availableWallets } = useRoute().params;
  const [isLoading, setIsLoading] = useState(true);
  let data = chainType
    ? BlueApp.getWallets().filter(item => item.chain === chainType && item.allowSend())
    : BlueApp.getWallets().filter(item => item.allowSend()) || [];

  if (availableWallets && availableWallets.length > 0) {
    // availableWallets if provided, overrides chainType argument and `allowSend()` check
    data = availableWallets;
  }

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const renderItem = ({ item }) => {
    return (
      <TouchableOpacity
        onPress={() => {
          ReactNativeHapticFeedback.trigger('selection', { ignoreAndroidSystemSettings: false });
          onWalletSelect(item);
        }}
      >
        <View shadowOpacity={40 / 100} shadowOffset={{ width: 0, height: 0 }} shadowRadius={5} style={styles.itemRoot}>
          <LinearGradient shadowColor="#000000" colors={WalletGradient.gradientsFor(item.type)} style={styles.gradient}>
            <Image
              source={
                (LightningCustodianWallet.type === item.type && require('../../img/lnd-shape.png')) || require('../../img/btc-shape.png')
              }
              style={styles.image}
            />

            <Text style={styles.transparentText} />
            <Text numberOfLines={1} style={styles.label}>
              {item.getLabel()}
            </Text>
            {item.hideBalance ? (
              <BluePrivateBalance />
            ) : (
              <Text numberOfLines={1} adjustsFontSizeToFit style={styles.balance}>
                {loc.formatBalance(Number(item.getBalance()), item.getPreferredBalanceUnit(), true)}
              </Text>
            )}
            <Text style={styles.transparentText} />
            <Text numberOfLines={1} style={styles.latestTxLabel}>
              {loc.wallets.list.latest_transaction}
            </Text>
            <Text numberOfLines={1} style={styles.latestTxValue}>
              {loc.transactionTimeToReadable(item.getLatestTransactionTime())}
            </Text>
          </LinearGradient>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  } else if (data.length <= 0) {
    return (
      <SafeBlueArea style={styles.root}>
        <View style={styles.noWallets}>
          <BlueText style={styles.center}>There are currently no Bitcoin wallets available.</BlueText>
          <BlueSpacing20 />
          <BlueText style={styles.center}>A Bitcoin wallet is required to refill Lightning wallets. Please, create or import one.</BlueText>
        </View>
      </SafeBlueArea>
    );
  } else {
    return (
      <SafeBlueArea style={styles.root}>
        <FlatList extraData={data} data={data} renderItem={renderItem} keyExtractor={(_item, index) => `${index}`} />
      </SafeBlueArea>
    );
  }
};

SelectWallet.navigationOptions = ({ navigation }) => ({
  ...BlueNavigationStyle(navigation, true, () => navigation.goBack(null)),
  title: loc.wallets.select_wallet,
});

export default SelectWallet;
