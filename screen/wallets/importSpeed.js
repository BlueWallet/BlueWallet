import React, { useContext, useState } from 'react';
import { Alert, View, StatusBar, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';

import { HDSegwitBech32Wallet, WatchOnlyWallet } from '../../class';
import loc from '../../loc';
import { BlueButton, BlueFormLabel, BlueFormMultiInput, BlueSpacing20, SafeBlueArea } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import * as allStyles from './style'

const WalletsImportSpeed = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [importText, setImportText] = useState();
  const [walletType, setWalletType] = useState();
  const [passphrase, setPassphrase] = useState();
  const { addAndSaveWallet } = useContext(BlueStorageContext);

  const styles = StyleSheet.create({
    root: {
      paddingTop: 40,
      backgroundColor: colors.elevated,
    },
    center: {
      flex: 1,
      marginHorizontal: 16,
      backgroundColor: colors.elevated,
    },
  });

  const importMnemonic = async () => {
    setLoading(true);
    try {
      let WalletClass;
      switch (walletType) {
        case HDSegwitBech32Wallet.type:
          WalletClass = HDSegwitBech32Wallet;
          break;
        case WatchOnlyWallet.type:
          WalletClass = WatchOnlyWallet;
          break;
      }

      const wallet = new WalletClass();
      wallet.setSecret(importText);
      if (passphrase) wallet.setPassphrase(passphrase);
      await wallet.fetchBalance();
      navigation.dangerouslyGetParent().pop();
      addAndSaveWallet(wallet);
    } catch (e) {
      Alert.alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeBlueArea style={styles.root}>
      <StatusBar barStyle="light-content" />
      <BlueSpacing20 />
      <BlueFormLabel>Mnemonic</BlueFormLabel>
      <BlueSpacing20 />
      <BlueFormMultiInput testID="SpeedMnemonicInput" value={importText} onChangeText={setImportText} />
      <BlueFormLabel>Wallet type</BlueFormLabel>
      <TextInput testID="SpeedWalletTypeInput" value={walletType} style={[allStyles.pathInput,{borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,}]} onChangeText={setWalletType} />
      <BlueFormLabel>Passphrase</BlueFormLabel>
      <TextInput testID="SpeedPassphraseInput" value={passphrase} style={[allStyles.pathInput,{borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,}]} onChangeText={setPassphrase} />
      <BlueSpacing20 />
      <View style={styles.center}>
        <BlueButton testID="SpeedDoImport" title="Import" onPress={importMnemonic} />
        {loading && <ActivityIndicator />}
      </View>
    </SafeBlueArea>
  );
};

WalletsImportSpeed.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.wallets.import_title }));

export default WalletsImportSpeed;
