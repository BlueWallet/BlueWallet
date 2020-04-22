import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { NavigationScreenProps } from 'react-navigation';
import { useNavigationParam } from 'react-navigation-hooks';

import { images } from 'app/assets';
import { Header, Chip, ScreenTemplate } from 'app/components';
import { CopyButton } from 'app/components/CopyButton';
import { Wallet } from 'app/consts';
import { en } from 'app/locale';
import { typography, palette } from 'app/styles';

export const ExportWalletScreen = () => {
  const wallet: Wallet = useNavigationParam('wallet');
  const secret = wallet.getSecret();
  const address = wallet.getAddress()!.join('');

  return (
    <ScreenTemplate>
      <Text style={styles.title}>{en.exportWallet.title}</Text>
      {address && (
        <>
          <Text style={styles.address}>{address}</Text>
          <CopyButton textToCopy={address} />
        </>
      )}
      <View style={styles.qrCodeContainer}>
        {secret && (
          <QRCode
            value={secret}
            logo={images.qrCode}
            size={160}
            logoSize={40}
            logoBackgroundColor={palette.background}
            ecl={'H'}
          />
        )}
      </View>
      <View style={styles.mnemonicPhraseContainer}>
        {secret.split(' ').map((secret, index) => (
          <Chip key={index.toString()} label={`${index + 1}. ${secret}`} />
        ))}
      </View>
    </ScreenTemplate>
  );
};

ExportWalletScreen.navigationOptions = (props: NavigationScreenProps) => ({
  header: <Header title={en.exportWallet.header} isCancelButton={true} navigation={props.navigation} />,
});

const styles = StyleSheet.create({
  qrCodeContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  title: { ...typography.headline4, marginTop: 16, textAlign: 'center' },
  address: {
    ...typography.caption,
    marginTop: 18,
    flexGrow: 1,
  },
  mnemonicPhraseContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
});
