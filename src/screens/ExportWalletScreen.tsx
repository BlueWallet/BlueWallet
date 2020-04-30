import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { NavigationScreenProps } from 'react-navigation';
import { useNavigationParam } from 'react-navigation-hooks';

import { Header, Chip, ScreenTemplate } from 'app/components';
import { Wallet } from 'app/consts';
import i18n from 'app/locale';
import { typography } from 'app/styles';

export const ExportWalletScreen = () => {
  const wallet: Wallet = useNavigationParam('wallet');
  const secret = wallet.getSecret();

  return (
    <ScreenTemplate>
      <Text style={styles.title}>{i18n.wallets.exportWallet.title}</Text>
      <View style={styles.qrCodeContainer}>{secret && <QRCode value={secret} size={140} ecl={'H'} />}</View>
      <View style={styles.mnemonicPhraseContainer}>
        {secret.split(' ').map((secret, index) => (
          <Chip key={index.toString()} label={`${index + 1}. ${secret}`} />
        ))}
      </View>
    </ScreenTemplate>
  );
};

ExportWalletScreen.navigationOptions = (props: NavigationScreenProps) => ({
  header: <Header title={i18n.wallets.exportWallet.header} isCancelButton={true} navigation={props.navigation} />,
});

const styles = StyleSheet.create({
  qrCodeContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  title: { ...typography.headline4, textAlign: 'center' },
  mnemonicPhraseContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
});
