import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { BlueSpacing20, BlueTextCentered } from '../../BlueComponents';
import Button from '../../components/Button';
import CopyTextToClipboard from '../../components/CopyTextToClipboard';
import QRCodeComponent from '../../components/QRCodeComponent';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { useSettings } from '../../hooks/context/useSettings';
import { enableScreenProtect, disableScreenProtect } from '../../helpers/screenProtect';

const PleaseBackupLNDHub = () => {
  const { wallets } = useStorage();
  const { walletID } = useRoute().params;
  const wallet = wallets.find(w => w.getID() === walletID);
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [qrCodeSize, setQRCodeSize] = useState(90);
  const { isPrivacyBlurEnabled } = useSettings();

  const dismiss = useCallback(() => {
    navigation.getParent().goBack();
  }, [navigation]);
  const handleBackButton = useCallback(() => {
    dismiss();
    return true;
  }, [dismiss]);
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
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      disableScreenProtect();
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, [handleBackButton, isPrivacyBlurEnabled]);

  const onLayout = e => {
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
