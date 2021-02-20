import React, { useCallback, useContext, useEffect } from 'react';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import { View, useWindowDimensions, StyleSheet, BackHandler, StatusBar } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { ScrollView } from 'react-native-gesture-handler';

import { BlueButton, BlueCopyTextToClipboard, BlueSpacing20, BlueText, BlueTextCentered, SafeBlueArea } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import Privacy from '../../blue_modules/Privacy';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { LightningCustodianWallet } from '../../class';

const PleaseBackupLNDHub = () => {
  const { wallets } = useContext(BlueStorageContext);
  const { walletID } = useRoute().params;
  const wallet = wallets.find(w => w.getID() === walletID);
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { height, width } = useWindowDimensions();
  const handleBackButton = useCallback(() => {
    navigation.dangerouslyGetParent().pop();
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
    Privacy.enableBlur();
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      Privacy.disableBlur();
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, [handleBackButton]);

  const pop = () => navigation.dangerouslyGetParent().pop();
  return (
    <SafeBlueArea style={styles.root}>
      <StatusBar barStyle="light-content" />
      <ScrollView centerContent contentContainerStyle={styles.scrollViewContent}>
        <View>
          <BlueTextCentered>{loc.pleasebackup.text_lnd}</BlueTextCentered>
          <BlueSpacing20 />
          {wallet.getBaseURI() === LightningCustodianWallet.defaultBaseUri && <BlueText>- {loc.pleasebackup.text_lnd2}</BlueText>}
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
        <BlueCopyTextToClipboard text={wallet.getSecret()} />
        <BlueSpacing20 />
        <BlueButton onPress={pop} title={loc.pleasebackup.ok_lnd} />
      </ScrollView>
    </SafeBlueArea>
  );
};

PleaseBackupLNDHub.navigationOptions = navigationStyle(
  {
    closeButton: true,
    headerLeft: null,
    headerRight: null,
    gestureEnabled: false,
    swipeEnabled: false,
  },
  opts => ({ ...opts, title: loc.pleasebackup.title }),
);

export default PleaseBackupLNDHub;
