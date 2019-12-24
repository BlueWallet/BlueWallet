import React, { useState } from 'react';
import { useNavigation, useNavigationParam } from 'react-navigation-hooks';
import { View, Dimensions } from 'react-native';
import { SafeBlueArea, BlueSpacing20, BlueCopyTextToClipboard, BlueButton, BlueCard, BlueTextCentered } from '../../BlueComponents';
import QRCode from 'react-native-qrcode-svg';
import { ScrollView } from 'react-native-gesture-handler';
const { height, width } = Dimensions.get('window');
const BlueApp = require('../../BlueApp');

const PleaseBackupLNDHub = () => {
  const wallet = useNavigationParam('wallet');
  const navigation = useNavigation();
  const [qrCodeHeight, setQrCodeHeight] = useState(height > width ? width - 40 : width / 2);

  const onLayout = () => {
    const { height } = Dimensions.get('window');
    setQrCodeHeight(height > width ? width - 40 : width / 2);
  };

  return (
    <SafeBlueArea style={{ flex: 1 }}>
      <ScrollView centerContent contentContainerStyle={{ flexGrow: 1 }} onLayout={onLayout}>
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
            ecl={'H'}
          />

          <BlueSpacing20 />
          <BlueCopyTextToClipboard text={wallet.secret} />
          <BlueSpacing20 />
          <BlueButton onPress={navigation.dismiss} title="OK, I have saved it." />
        </BlueCard>
      </ScrollView>
    </SafeBlueArea>
  );
};

export default PleaseBackupLNDHub;
