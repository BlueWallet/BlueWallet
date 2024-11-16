import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BlueFormLabel, BlueFormMultiInput, BlueSpacing20 } from '../../BlueComponents';
import { HDSegwitBech32Wallet, WatchOnlyWallet } from '../../class';
import presentAlert from '../../components/Alert';
import Button from '../../components/Button';
import SafeArea from '../../components/SafeArea';
import { useTheme } from '../../components/themes';
import { useStorage } from '../../hooks/context/useStorage';
import { AddWalletStackParamList } from '../../navigation/AddWalletStack';

type NavigationProp = NativeStackNavigationProp<AddWalletStackParamList, 'ImportSpeed'>;

const ImportSpeed = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const [loading, setLoading] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>('');
  const [walletType, setWalletType] = useState<string>('');
  const [passphrase, setPassphrase] = useState<string>('');
  const { addAndSaveWallet } = useStorage();

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
    pathInput: {
      flexDirection: 'row',
      borderWidth: 1,
      borderBottomWidth: 0.5,
      minHeight: 44,
      height: 44,
      alignItems: 'center',
      marginVertical: 8,
      borderRadius: 4,
      paddingHorizontal: 8,
      color: '#81868e',
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
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

      if (!WalletClass) {
        throw new Error('Invalid wallet type');
      }

      const wallet = new WalletClass();
      wallet.setSecret(importText);
      // check wallet is type of HDSegwitBech32Wallet
      if (passphrase && wallet instanceof HDSegwitBech32Wallet) {
        wallet.setPassphrase(passphrase);
      }
      await wallet.fetchBalance();
      // @ts-ignore: navigation
      navigation.getParent().pop();
      addAndSaveWallet(wallet);
    } catch (e: any) {
      presentAlert({ message: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeArea style={styles.root}>
      <BlueSpacing20 />
      <BlueFormLabel>Mnemonic</BlueFormLabel>
      <BlueSpacing20 />
      <BlueFormMultiInput testID="SpeedMnemonicInput" value={importText} onChangeText={setImportText} />
      <BlueFormLabel>Wallet type</BlueFormLabel>
      <TextInput testID="SpeedWalletTypeInput" value={walletType} style={styles.pathInput} onChangeText={setWalletType} />
      <BlueFormLabel>Passphrase</BlueFormLabel>
      <TextInput testID="SpeedPassphraseInput" value={passphrase} style={styles.pathInput} onChangeText={setPassphrase} />
      <BlueSpacing20 />
      <View style={styles.center}>
        <Button testID="SpeedDoImport" title="Import" onPress={importMnemonic} />
        {loading && <ActivityIndicator />}
      </View>
    </SafeArea>
  );
};

export default ImportSpeed;
