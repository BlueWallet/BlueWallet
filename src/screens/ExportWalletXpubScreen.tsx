import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { NavigationScreenProps } from 'react-navigation';
import { useNavigationParam } from 'react-navigation-hooks';

import { Header, ScreenTemplate } from 'app/components';
import { CopyButton } from 'app/components/CopyButton';
import { Wallet } from 'app/consts';
import { typography } from 'app/styles';

import { WatchOnlyWallet } from '../../class';

const i18n = require('../../loc');

export const ExportWalletXpubScreen = () => {
  const wallet: Wallet = useNavigationParam('wallet');
  const isWatchOnlyWallet = wallet.type === WatchOnlyWallet.type;
  const xpub = isWatchOnlyWallet ? wallet.secret : wallet.getXpub();

  return (
    <ScreenTemplate>
      <Text style={styles.title}>{wallet.label}</Text>
      <View style={styles.qrCodeContainer}>
        <QRCode quietZone={10} value={xpub} size={140} ecl={'H'} />
      </View>
      <Text style={styles.xpub}>{xpub}</Text>
      <CopyButton textToCopy={xpub} />
    </ScreenTemplate>
  );
};

ExportWalletXpubScreen.navigationOptions = (props: NavigationScreenProps) => ({
  header: <Header title={i18n.wallets.exportWalletXpub.header} isCancelButton={true} navigation={props.navigation} />,
});

const styles = StyleSheet.create({
  qrCodeContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  title: { ...typography.headline4, marginTop: 16, textAlign: 'center' },
  xpub: {
    ...typography.caption,
  },
});
