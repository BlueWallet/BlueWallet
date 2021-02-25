import React, { useCallback, useContext, useState } from 'react';
import { InteractionManager, useWindowDimensions, ActivityIndicator, View, StatusBar, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useFocusEffect, useRoute, useNavigation, useTheme } from '@react-navigation/native';

import navigationStyle from '../../components/navigationStyle';
import { BlueSpacing20, SafeBlueArea, BlueText, BlueCopyTextToClipboard } from '../../BlueComponents';
import Privacy from '../../blue_modules/Privacy';
import Biometric from '../../class/biometrics';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 20,
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  qrCodeContainer: { borderWidth: 6, borderRadius: 8, borderColor: '#FFFFFF' },
});

const WalletXpub = () => {
  const { secret } = useRoute().params;
  const [isLoading, setIsLoading] = useState(true);
  const [xPub, setXPub] = useState();
  const [xPubText, setXPubText] = useState();
  const [wallet, setWallet] = useState();
  const { goBack } = useNavigation();
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const stylesHook = StyleSheet.create({ root: { backgroundColor: colors.elevated } });
  const { wallets } = useContext(BlueStorageContext);

  useFocusEffect(
    useCallback(() => {
      Privacy.enableBlur();
      const task = InteractionManager.runAfterInteractions(async () => {
        for (const w of wallets) {
          if (w.getSecret() === secret) {
            // found our wallet
            setWallet(w);
          }
        }

        if (wallet) {
          const isBiometricsEnabled = await Biometric.isBiometricUseCapableAndEnabled();

          if (isBiometricsEnabled) {
            if (!(await Biometric.unlockWithBiometrics())) {
              return goBack();
            }
          }
          setXPub(wallet.getXpub());
          setXPubText(wallet.getXpub());
          setIsLoading(false);
        }
      });
      return () => {
        task.cancel();
        Privacy.disableBlur();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [goBack, secret, wallet]),
  );

  return isLoading ? (
    <View style={[styles.root, stylesHook.root]}>
      <ActivityIndicator />
    </View>
  ) : (
    <SafeBlueArea style={[styles.root, stylesHook.root]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <View>
          <BlueText>{wallet.typeReadable}</BlueText>
        </View>
        <BlueSpacing20 />
        <View style={styles.qrCodeContainer}>
          <QRCode
            value={xPub}
            logo={require('../../img/qr-code.png')}
            size={height > width ? width - 40 : width / 2}
            logoSize={90}
            color="#000000"
            logoBackgroundColor={colors.brandingColor}
            backgroundColor="#FFFFFF"
            ecl="H"
          />
        </View>

        <BlueSpacing20 />
        <BlueCopyTextToClipboard text={xPubText} />
      </View>
    </SafeBlueArea>
  );
};

WalletXpub.navigationOptions = navigationStyle(
  {
    closeButton: true,
    headerLeft: null,
  },
  opts => ({ ...opts, title: loc.wallets.xpub_title }),
);

export default WalletXpub;
