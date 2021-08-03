import React, { useCallback, useContext, useRef, useState } from 'react';
import {
  InteractionManager,
  TouchableWithoutFeedback,
  useWindowDimensions,
  ActivityIndicator,
  View,
  StatusBar,
  StyleSheet,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useFocusEffect, useRoute, useNavigation, useTheme } from '@react-navigation/native';
import navigationStyle from '../../components/navigationStyle';
import { BlueSpacing20, SafeBlueArea, BlueText, BlueCopyTextToClipboard } from '../../BlueComponents';
import Privacy from '../../blue_modules/Privacy';
import Biometric from '../../class/biometrics';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import Share from 'react-native-share';
import ToolTipMenu from '../../components/TooltipMenu';

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
  const toolTip = useRef();
  const qrCode = useRef();

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

  const showToolTipMenu = () => {
    toolTip.current.showMenu();
  };

  const handleShareQRCode = () => {
    qrCode.current.toDataURL(data => {
      const shareImageBase64 = {
        url: `data:image/png;base64,${data}`,
      };
      Share.open(shareImageBase64).catch(error => console.log(error));
    });
  };

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
        <TouchableWithoutFeedback onLongPress={showToolTipMenu}>
          <View style={styles.qrCodeContainer}>
            <ToolTipMenu
              ref={toolTip}
              anchorRef={qrCode}
              actions={[
                {
                  id: 'shareQRCode',
                  text: loc.receive.details_share,
                  onPress: handleShareQRCode,
                },
              ]}
            />

            <QRCode
              value={xPub}
              logo={require('../../img/qr-code.png')}
              size={height > width ? width - 40 : width / 2}
              logoSize={90}
              color="#000000"
              logoBackgroundColor={colors.brandingColor}
              backgroundColor="#FFFFFF"
              ecl="H"
              getRef={qrCode}
            />
          </View>
        </TouchableWithoutFeedback>

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
