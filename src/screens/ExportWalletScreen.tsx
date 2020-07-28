import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Header, Mnemonic, ScreenTemplate } from 'app/components';
import { RootStackParams, Route } from 'app/consts';
import { typography } from 'app/styles';

const i18n = require('../../loc');

interface Props {
  navigation: StackNavigationProp<RootStackParams, Route.ExportWallet>;
  route: RouteProp<RootStackParams, Route.ExportWallet>;
}

export const ExportWalletScreen = ({ route, navigation }: Props) => {
  const { wallet } = route.params;
  const secret = wallet.getSecret();

  return (
    <ScreenTemplate
      header={<Header title={i18n.wallets.exportWallet.header} isCancelButton={true} navigation={navigation} />}
    >
      <Text style={styles.title}>{i18n.wallets.exportWallet.title}</Text>
      <View style={styles.qrCodeContainer}>
        {secret && <QRCode quietZone={10} value={secret} size={140} ecl={'H'} />}
      </View>
      <Mnemonic mnemonic={secret} />
    </ScreenTemplate>
  );
};

const styles = StyleSheet.create({
  qrCodeContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  title: { ...typography.headline4, textAlign: 'center' },
});
