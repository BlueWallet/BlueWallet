import React, { useCallback, useContext, useState } from 'react';
import { InteractionManager, useWindowDimensions, ActivityIndicator, View, StatusBar, StyleSheet } from 'react-native';
import { useFocusEffect, useRoute, useNavigation, useTheme } from '@react-navigation/native';
import navigationStyle from '../../components/navigationStyle';
import { BlueSpacing20, SafeBlueArea, BlueText, BlueCopyTextToClipboard } from '../../BlueComponents';
import Privacy from '../../blue_modules/Privacy';
import Biometric from '../../class/biometrics';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import QRCodeComponent from '../../components/QRCodeComponent';

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
});

const WalletXpub = () => {
  const { wallets } = useContext(BlueStorageContext);
  const { walletID } = useRoute().params;
  const wallet = wallets.find(w => w.getID() === walletID);
  const [isLoading, setIsLoading] = useState(true);
  const [xPub, setXPub] = useState();
  const [xPubText, setXPubText] = useState();
  const { goBack } = useNavigation();
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const stylesHook = StyleSheet.create({ root: { backgroundColor: colors.elevated } });

  useFocusEffect(
    useCallback(() => {
      Privacy.enableBlur();
      const task = InteractionManager.runAfterInteractions(async () => {
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
    }, [goBack, walletID]),
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

        <QRCodeComponent value={xPub} size={height > width ? width - 40 : width / 2} />

        <BlueSpacing20 />
        <BlueCopyTextToClipboard text={xPubText} />
      </View>
    </SafeBlueArea>
  );
};

WalletXpub.actionKeys = {
  Share: 'share',
};

WalletXpub.actionIcons = {
  Share: {
    iconType: 'SYSTEM',
    iconValue: 'square.and.arrow.up',
  },
};

WalletXpub.navigationOptions = navigationStyle(
  {
    closeButton: true,
    headerLeft: null,
  },
  opts => ({ ...opts, title: loc.wallets.xpub_title }),
);

export default WalletXpub;
