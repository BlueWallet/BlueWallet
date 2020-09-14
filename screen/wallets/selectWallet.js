/* eslint-disable react/prop-types */
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Image, Text, TouchableOpacity, FlatList, StyleSheet, StatusBar } from 'react-native';
import { SafeBlueArea, BlueText, BlueSpacing20, BluePrivateBalance, BlueNavigationStyle } from '../../BlueComponents';
import LinearGradient from 'react-native-linear-gradient';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import WalletGradient from '../../class/wallet-gradient';
import { useRoute, useTheme } from '@react-navigation/native';
import loc, { formatBalance, transactionTimeToReadable } from '../../loc';
/** @type {AppStorage} */
const BlueApp = require('../../BlueApp');

const SelectWallet = ({ navigation }) => {
  const { chainType, onWalletSelect, availableWallets } = useRoute().params;
  const [isLoading, setIsLoading] = useState(true);
  const { colors } = useTheme();
  let data = chainType
    ? BlueApp.getWallets().filter(item => item.chain === chainType && item.allowSend())
    : BlueApp.getWallets().filter(item => item.allowSend()) || [];

  if (availableWallets && availableWallets.length > 0) {
    // availableWallets if provided, overrides chainType argument and `allowSend()` check
    data = availableWallets;
  }
  const styles = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loading: {
      flex: 1,
      justifyContent: 'center',
      alignContent: 'center',
      paddingTop: 20,
      backgroundColor: colors.background,
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

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const renderItem = ({ item }) => {
    return (
      <TouchableOpacity
        onPress={() => {
          ReactNativeHapticFeedback.trigger('selection', { ignoreAndroidSystemSettings: false });
          onWalletSelect(item, { navigation });
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
                {formatBalance(Number(item.getBalance()), item.getPreferredBalanceUnit(), true)}
              </Text>
            )}
            <Text style={styles.transparentText} />
            <Text numberOfLines={1} style={styles.latestTxLabel}>
              {loc.wallets.list_latest_transaction}
            </Text>
            <Text numberOfLines={1} style={styles.latestTxValue}>
              {transactionTimeToReadable(item.getLatestTransactionTime())}
            </Text>
          </LinearGradient>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator />
      </View>
    );
  } else if (data.length <= 0) {
    return (
      <SafeBlueArea style={styles.root}>
        <StatusBar barStyle="light-content" />
        <View style={styles.noWallets}>
          <BlueText style={styles.center}>{loc.wallets.select_no_bitcoin}</BlueText>
          <BlueSpacing20 />
          <BlueText style={styles.center}>{loc.wallets.select_no_bitcoin_exp}</BlueText>
        </View>
      </SafeBlueArea>
    );
  } else {
    return (
      <SafeBlueArea style={styles.root}>
        <StatusBar barStyle="default" />
        <FlatList extraData={data} data={data} renderItem={renderItem} keyExtractor={(_item, index) => `${index}`} />
      </SafeBlueArea>
    );
  }
};

SelectWallet.navigationOptions = ({ navigation }) => ({
  ...BlueNavigationStyle(navigation, true),
  headerRight: null,
  headerTitle: loc.wallets.select_wallet,
  headerBackTitleVisible: false,
});

export default SelectWallet;
