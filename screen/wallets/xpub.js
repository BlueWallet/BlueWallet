import React, { useCallback, useContext, useEffect, useState } from 'react';
import { InteractionManager, ActivityIndicator, View, StyleSheet } from 'react-native';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import navigationStyle from '../../components/navigationStyle';
import { BlueSpacing20, SafeBlueArea, BlueText, BlueCopyTextToClipboard, BlueButton } from '../../BlueComponents';
import Privacy from '../../blue_modules/Privacy';
import Biometric from '../../class/biometrics';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import QRCodeComponent from '../../components/QRCodeComponent';
import HandoffComponent from '../../components/handoff';
import Share from 'react-native-share';
import { useTheme } from '../../components/themes';

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
  share: {
    alignSelf: 'center',
    width: '40%',
  },
});

const WalletXpub = () => {
  const { wallets } = useContext(BlueStorageContext);
  const { walletID, xpub } = useRoute().params;
  const wallet = wallets.find(w => w.getID() === walletID);
  const [isLoading, setIsLoading] = useState(true);
  const [xPubText, setXPubText] = useState();
  const { goBack, setParams } = useNavigation();
  const { colors } = useTheme();
  const [qrCodeSize, setQRCodeSize] = useState(90);
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
          setParams({ xpub: wallet.getXpub() });
          setIsLoading(false);
        } else if (xpub) {
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

  useEffect(() => {
    setXPubText(xpub);
  }, [xpub]);

  const onLayout = e => {
    const { height, width } = e.nativeEvent.layout;
    setQRCodeSize(height > width ? width - 40 : e.nativeEvent.layout.width / 1.8);
  };

  const handleShareButtonPressed = () => {
    Share.open({ message: xpub }).catch(error => console.log(error));
  };

  return isLoading ? (
    <View style={[styles.container, stylesHook.root]}>
      <ActivityIndicator />
    </View>
  ) : (
    <SafeBlueArea style={[styles.root, stylesHook.root]} onLayout={onLayout}>
      <>
        <View style={styles.container}>
          {wallet && (
            <>
              <View>
                <BlueText>{wallet.typeReadable}</BlueText>
              </View>
              <BlueSpacing20 />
            </>
          )}
          <QRCodeComponent value={xpub} size={qrCodeSize} />

          <BlueSpacing20 />
          <BlueCopyTextToClipboard text={xPubText} />
        </View>
        <HandoffComponent title={loc.wallets.xpub_title} type={HandoffComponent.activityTypes.Xpub} userInfo={{ xpub: xPubText }} />
        <View style={styles.share}>
          <BlueButton onPress={handleShareButtonPressed} title={loc.receive.details_share} />
        </View>
      </>
    </SafeBlueArea>
  );
};

WalletXpub.navigationOptions = navigationStyle(
  {
    closeButton: true,
    headerHideBackButton: true,
  },
  opts => ({ ...opts, headerTitle: loc.wallets.xpub_title }),
);

export default WalletXpub;
