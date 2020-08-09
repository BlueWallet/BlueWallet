/* eslint-disable react/prop-types */
/* global alert */
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, TouchableOpacity, Image, Text, FlatList, StyleSheet, StatusBar } from 'react-native';
import {
  SafeBlueArea,
  BlueText,
  BlueSpacing20,
  BluePrivateBalance,
  BlueNavigationStyle,
  BlueListItemHooks,
  BlueTextHooks,
} from '../../../BlueComponents';
import LinearGradient from 'react-native-linear-gradient';
import { LightningCustodianWallet } from '../../../class/wallets/lightning-custodian-wallet';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import WalletGradient from '../../../class/wallet-gradient';
import { useTheme, useNavigation } from '@react-navigation/native';
import loc, { formatBalance, transactionTimeToReadable } from '../../../loc';
/** @type {AppStorage} */
const BlueApp = require('../../../BlueApp');
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
    width: '90%',
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
  marginRight: {
    marginRight: 20,
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

const SelectWalletsExport = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { colors } = useTheme();
  const data = BlueApp.getWallets() || [];
  const [selectedWallets, setSelectedWallets] = useState(data.slice(0, 4));
  const { navigate, setOptions } = useNavigation();
  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.background,
    },
  });

  useEffect(() => {
    setIsLoading(false);
    const disabled = selectedWallets.length < 1 || selectedWallets.length > 4;
    const opacity = { opacity: disabled ? 0.5 : 1.0 };
    setOptions({
      headerRight: () => (
        <TouchableOpacity
          disabled={disabled}
          style={[styles.marginRight, opacity]}
          onPress={() => navigate('SelectWalletsExportQRCode', { selectedWallets })}
        >
          <BlueTextHooks>{loc._.continue}</BlueTextHooks>
        </TouchableOpacity>
      ),
    });
  }, [navigate, selectedWallets, setOptions]);

  const renderItem = ({ item }) => {
    return (
      <BlueListItemHooks
        onPress={() => {
          ReactNativeHapticFeedback.trigger('selection', { ignoreAndroidSystemSettings: false });
          if (selectedWallets.includes(item)) {
            setSelectedWallets(selectedWallets.filter(wallet => wallet !== item));
          } else {
            if (selectedWallets.length < 4) {
              setSelectedWallets([...selectedWallets, item]);
            } else {
              alert(loc.wallets.export_all_maximum_error);
            }
          }
        }}
        checkmark={selectedWallets.includes(item)}
        pad={0}
        leftAvatar={
          <View shadowOpacity={40 / 100} shadowOffset={{ width: 0, height: 0 }} shadowRadius={5} style={styles.itemRoot}>
            <LinearGradient shadowColor="#000000" colors={WalletGradient.gradientsFor(item.type)} style={styles.gradient}>
              <Image
                defaultSource={
                  (LightningCustodianWallet.type === item.type && require('../../../img/lnd-shape.png')) ||
                  require('../../../img/btc-shape.png')
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
        }
      />
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
      <SafeBlueArea style={[styles.root, stylesHook.root]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.noWallets}>
          <BlueText style={styles.center}>{loc.wallets.select_no_bitcoin}</BlueText>
        </View>
      </SafeBlueArea>
    );
  } else {
    return (
      <SafeBlueArea style={[styles.root, stylesHook.root]}>
        <StatusBar barStyle="default" />
        <FlatList extraData={data} data={data} renderItem={renderItem} keyExtractor={(_item, index) => `${index}`} />
      </SafeBlueArea>
    );
  }
};

SelectWalletsExport.navigationOptions = ({ navigation }) => ({
  ...BlueNavigationStyle(),
  headerTitle: loc.wallets.export_all_title,
  headerBackTitleVisible: false,
  headerLeft: null,
});

export default SelectWalletsExport;
