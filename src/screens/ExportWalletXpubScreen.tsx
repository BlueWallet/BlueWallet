import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Header, ScreenTemplate } from 'app/components';
import { CopyButton } from 'app/components/CopyButton';
import { RootStackParams, Route } from 'app/consts';
import { typography } from 'app/styles';

import { WatchOnlyWallet } from '../../class';

const i18n = require('../../loc');

interface Props {
  navigation: StackNavigationProp<RootStackParams, Route.ExportWalletXpub>;
  route: RouteProp<RootStackParams, Route.ExportWalletXpub>;
}

export const ExportWalletXpubScreen = ({ navigation, route }: Props) => {
  const { wallet } = route.params;
  const isWatchOnlyWallet = wallet.type === WatchOnlyWallet.type;

  const xpub = isWatchOnlyWallet ? wallet.secret : wallet._xpub;

  return (
    <ScreenTemplate
      header={<Header title={i18n.wallets.exportWalletXpub.header} isCancelButton={true} navigation={navigation} />}
    >
      <Text style={styles.title}>{wallet.label}</Text>
      <View style={styles.qrCodeContainer}>
        <QRCode quietZone={10} value={xpub} size={140} ecl={'H'} />
      </View>
      <Text style={styles.xpub}>{xpub}</Text>
      <CopyButton textToCopy={xpub} />
    </ScreenTemplate>
  );
};

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
