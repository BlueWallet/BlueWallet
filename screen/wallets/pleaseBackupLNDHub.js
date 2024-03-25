import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { View, StyleSheet, ScrollView, BackHandler } from 'react-native';

import { BlueCopyTextToClipboard, BlueSpacing20, BlueTextCentered } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import QRCodeComponent from '../../components/QRCodeComponent';
import { useTheme } from '../../components/themes';
import Button from '../../components/Button';
import SafeArea from '../../components/SafeArea';
import usePrivacy from '../../hooks/usePrivacy';

const PleaseBackupLNDHub = () => {
  const { wallets } = useContext(BlueStorageContext);
  const { walletID } = useRoute().params;
  const wallet = wallets.find(w => w.getID() === walletID);
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [qrCodeSize, setQRCodeSize] = useState(90);
  const { enableBlur, disableBlur } = usePrivacy();

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
    enableBlur();
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      disableBlur();
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, [disableBlur, enableBlur, handleBackButton]);

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
        <BlueCopyTextToClipboard text={wallet.getSecret()} />
        <BlueSpacing20 />
        <Button onPress={pop} title={loc.pleasebackup.ok_lnd} />
      </ScrollView>
    </SafeArea>
  );
};

PleaseBackupLNDHub.navigationOptions = navigationStyle(
  {
    gestureEnabled: false,
    swipeEnabled: false,
    headerBackVisible: false,
  },
  opts => ({ ...opts, headerTitle: loc.pleasebackup.title }),
);

export default PleaseBackupLNDHub;
