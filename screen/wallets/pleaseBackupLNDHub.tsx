import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { BlueTextCentered } from '../../BlueComponents';
import Button from '../../components/Button';
import CopyTextToClipboard from '../../components/CopyTextToClipboard';
import QRCodeComponent from '../../components/QRCodeComponent';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { useSettings } from '../../hooks/context/useSettings';
import { useScreenProtect } from '../../hooks/useScreenProtect';
import { BlueSpacing20 } from '../../components/BlueSpacing';
import useWalletSubscribe from '../../hooks/useWalletSubscribe.tsx';

type PleaseBackupLNDHubRouteParams = {
  walletID: string;
};

const PleaseBackupLNDHub = () => {
  const { walletID } = useRoute<RouteProp<{ params: PleaseBackupLNDHubRouteParams }, 'params'>>().params;
  const wallet = useWalletSubscribe(walletID);
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [qrCodeSize, setQRCodeSize] = useState(90);
  const { isPrivacyBlurEnabled } = useSettings();
  const { enableScreenProtect, disableScreenProtect } = useScreenProtect();

  const dismiss = useCallback(() => {
    navigation.getParent()?.goBack();
  }, [navigation]);
  const styles = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
    scrollViewContent: {
      flexGrow: 1,
      backgroundColor: colors.elevated,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      paddingHorizontal: 30, // Added additional horizontal padding
    },
  });

  useEffect(() => {
    if (isPrivacyBlurEnabled) {
      enableScreenProtect();
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      dismiss();
      return true;
    });

    return () => {
      disableScreenProtect();
      subscription.remove();
    };
  }, [dismiss, isPrivacyBlurEnabled, enableScreenProtect, disableScreenProtect]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { height, width } = e.nativeEvent.layout;
    setQRCodeSize(height > width ? width - 40 : e.nativeEvent.layout.width / 1.5);
  };
  return (
    <SafeAreaScrollView style={styles.root} contentContainerStyle={styles.scrollViewContent} centerContent onLayout={onLayout}>
      <View>
        <BlueTextCentered>{loc.pleasebackup.text_lnd}</BlueTextCentered>
        <BlueSpacing20 />
      </View>
      <BlueSpacing20 />
      <QRCodeComponent value={wallet.getSecret()} size={qrCodeSize} />
      <CopyTextToClipboard text={wallet.getSecret()} />
      <BlueSpacing20 />
      <Button onPress={dismiss} title={loc.pleasebackup.ok_lnd} />
    </SafeAreaScrollView>
  );
};

export default PleaseBackupLNDHub;
