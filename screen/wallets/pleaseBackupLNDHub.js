import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';
import { BlueSpacing20, BlueTextCentered } from '../../BlueComponents';
import Button from '../../components/Button';
import CopyTextToClipboard from '../../components/CopyTextToClipboard';
import QRCodeComponent from '../../components/QRCodeComponent';
import SafeArea from '../../components/SafeArea';
import { useTheme } from '../../components/themes';
import { disallowScreenshot } from 'react-native-screen-capture';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { useSettings } from '../../hooks/context/useSettings';
import { isDesktop } from '../../blue_modules/environment';

const PleaseBackupLNDHub = () => {
  const { wallets } = useStorage();
  const { walletID } = useRoute().params;
  const wallet = wallets.find(w => w.getID() === walletID);
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [qrCodeSize, setQRCodeSize] = useState(90);
  const { isPrivacyBlurEnabled } = useSettings();

  const handleBackButton = useCallback(() => {
    navigation.getParent().pop();
    return true;
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
    },
  });

  useEffect(() => {
    if (!isDesktop) disallowScreenshot(isPrivacyBlurEnabled);
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      if (!isDesktop) disallowScreenshot(false);
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, [handleBackButton, isPrivacyBlurEnabled]);

  const pop = () => navigation.getParent().pop();

  const onLayout = e => {
    const { height, width } = e.nativeEvent.layout;
    setQRCodeSize(height > width ? width - 40 : e.nativeEvent.layout.width / 1.5);
  };
  return (
    <SafeArea style={styles.root} onLayout={onLayout}>
      <ScrollView centerContent contentContainerStyle={styles.scrollViewContent}>
        <View>
          <BlueTextCentered>{loc.pleasebackup.text_lnd}</BlueTextCentered>
          <BlueSpacing20 />
        </View>
        <BlueSpacing20 />
        <QRCodeComponent value={wallet.getSecret()} size={qrCodeSize} />
        <CopyTextToClipboard text={wallet.getSecret()} />
        <BlueSpacing20 />
        <Button onPress={pop} title={loc.pleasebackup.ok_lnd} />
      </ScrollView>
    </SafeArea>
  );
};

export default PleaseBackupLNDHub;
