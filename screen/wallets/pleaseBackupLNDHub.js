import React, { useState, useCallback, useEffect } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { View, Dimensions, StyleSheet, BackHandler } from 'react-native';
import {
  SafeBlueArea,
  BlueNavigationStyle,
  BlueSpacing20,
  BlueCopyTextToClipboard,
  BlueButton,
  BlueCard,
  BlueTextCentered,
} from '../../BlueComponents';
import QRCode from 'react-native-qrcode-svg';
import Privacy from '../../Privacy';
import { ScrollView } from 'react-native-gesture-handler';
const { height, width } = Dimensions.get('window');
const BlueApp = require('../../BlueApp');
const loc = require('../../loc');

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
});

const PleaseBackupLNDHub = () => {
  const { wallet } = useRoute().params;
  const navigation = useNavigation();
  const [qrCodeHeight, setQrCodeHeight] = useState(height > width ? width - 40 : width / 2);

  const handleBackButton = useCallback(() => {
    navigation.dangerouslyGetParent().pop();
    return true;
  }, [navigation]);

  useEffect(() => {
    Privacy.enableBlur();
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      Privacy.disableBlur();
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, [handleBackButton]);

  const onLayout = () => {
    const { height } = Dimensions.get('window');
    setQrCodeHeight(height > width ? width - 40 : width / 2);
  };

  return (
    <SafeBlueArea style={styles.root}>
      <ScrollView centerContent contentContainerStyle={styles.scrollViewContent} onLayout={onLayout}>
        <BlueCard>
          <View>
            <BlueTextCentered>
              Please take a moment to save this LNDHub authentication. It's your backup you can use to restore the wallet on other device.
            </BlueTextCentered>
          </View>
          <BlueSpacing20 />

          <QRCode
            value={wallet.secret}
            logo={require('../../img/qr-code.png')}
            logoSize={90}
            size={qrCodeHeight}
            color={BlueApp.settings.foregroundColor}
            logoBackgroundColor={BlueApp.settings.brandingColor}
            ecl="H"
          />

          <BlueSpacing20 />
          <BlueCopyTextToClipboard text={wallet.secret} />
          <BlueSpacing20 />
          <BlueButton onPress={() => navigation.dangerouslyGetParent().pop()} title="OK, I have saved it." />
        </BlueCard>
      </ScrollView>
    </SafeBlueArea>
  );
};

PleaseBackupLNDHub.navigationOptions = ({ navigation }) => ({
  ...BlueNavigationStyle(navigation, true),
  title: loc.pleasebackup.title,
  headerLeft: null,
  headerRight: null,
  gestureEnabled: false,
  swipeEnabled: false,
});

export default PleaseBackupLNDHub;
