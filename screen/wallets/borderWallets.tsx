import React, { useState } from 'react';
import { useTheme } from '@react-navigation/native';
import { StyleSheet, View, KeyboardAvoidingView, Platform, TextInput, Keyboard } from 'react-native';

import loc from '../../loc';
import { BlueCard, BlueSpacing10, BlueSpacing20, BlueText } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';

import { randomBytes } from '../../class/rng';
import { generateChecksumWords } from '../../blue_modules/checksumWords';
import Button from '../../components/Button';
import SafeArea from '../../components/SafeArea';

import * as bip39 from 'bip39';

const BorderWallets = () => {
  const { colors } = useTheme();

  const [mnemonic, setMnemonic] = useState('');
  const [result, setResult] = useState('');

  const createBorderWallet = () => {
    let giveSeed;
    if (entropy) {
      const random = await randomBytes(entropy.length < 32 ? 32 - entropy.length : 0);
      const buf = Buffer.concat([entropy, random], 32);
      giveSeed = bip39.entropyToMnemonic(buf.toString('hex'));
    } else {
      giveSeed = bip39.entropyToMnemonic((await randomBytes(16)).toString('hex'));
    }
    navigate('WalletsAddBorder', { walletLabel: label.trim().length > 0 ? label : loc.wallets.details_title, seedPhrase: giveSeed });
  };
  
  const importBorderWallet = () => {
    navigation.navigate('ImportBorder', { walletID: null });
  };

  return (
    <SafeArea style={styles.blueArea}>
      <View style={styles.wrapper}>
        <BlueCard style={styles.mainCard}>
          <BlueText style={styles.center}>{loc.border.border_wallet_explain}</BlueText>
          <BlueSpacing20 />
          <Button title={loc.border.create} onPress={createBorderWallet} />
          <BlueSpacing20 />
          <Button title={loc.border.import} onPress={importBorderWallet} />
          <BlueSpacing20 />
        </BlueCard>
      </View>
    </SafeArea>
  );
};

export default BorderWallets;
BorderWallets.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.border.border_wallet }));

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  blueArea: {
    paddingTop: 19,
  },
  mainCard: {
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  center: {
    textAlign: 'center',
  }
});
