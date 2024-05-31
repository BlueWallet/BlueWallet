import React, { useCallback, useEffect } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BackHandler, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { BlueSpacing20, BlueTextCentered } from '../../BlueComponents';
import Button from '../../components/Button';
import CopyTextToClipboard from '../../components/CopyTextToClipboard';
import SafeArea from '../../components/SafeArea';
import { useTheme } from '../../components/themes';
import usePrivacy from '../../hooks/usePrivacy';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';

const PleaseBackupLdk = () => {
  const { wallets } = useStorage();
  const { walletID } = useRoute().params;
  /** @type {LightningLdkWallet} */
  const wallet = wallets.find(w => w.getID() === walletID);
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { height, width } = useWindowDimensions();
  const { enableBlur, disableBlur } = usePrivacy();
  const handleBackButton = useCallback(() => {
    navigation.getParent().pop();
    return true;
  }, [navigation]);

  const styles = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.elevated,
    },
    scrollViewContent: {
      flexGrow: 1,
      backgroundColor: colors.elevated,
      justifyContent: 'center',

      alignItems: 'center',
      padding: 20,
    },
    qrCodeContainer: { borderWidth: 6, borderRadius: 8, borderColor: '#FFFFFF' },
  });

  useEffect(() => {
    enableBlur();
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      disableBlur();
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, [disableBlur, enableBlur, handleBackButton]);

  const pop = () => navigation.getParent().pop();
  return (
    <SafeArea style={styles.root}>
      <ScrollView centerContent contentContainerStyle={styles.scrollViewContent}>
        <View>
          <BlueTextCentered>Please save this wallet backup. It allows you to restore all your channels on other device.</BlueTextCentered>
          <BlueSpacing20 />
        </View>
        <BlueSpacing20 />
        <View style={styles.qrCodeContainer}>
          <QRCode
            value={wallet.secret}
            logo={require('../../img/qr-code.png')}
            logoSize={90}
            size={height > width ? width - 40 : width / 2}
            color="#000000"
            logoBackgroundColor={colors.brandingColor}
            backgroundColor="#FFFFFF"
            ecl="H"
          />
        </View>
        <CopyTextToClipboard text={wallet.getSecret()} />
        <BlueSpacing20 />
        <Button onPress={pop} title={loc.pleasebackup.ok_lnd} />
      </ScrollView>
    </SafeArea>
  );
};

export default PleaseBackupLdk;
