import React, { useState, useCallback, useEffect } from 'react';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import { View, Dimensions, StyleSheet, BackHandler, StatusBar } from 'react-native';
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
import loc from '../../loc';
const { height, width } = Dimensions.get('window');

const PleaseBackupLNDHub = () => {
  const { wallet } = useRoute().params;
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [qrCodeHeight, setQrCodeHeight] = useState(height > width ? width - 40 : width / 2);
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
    },
  });

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
      <StatusBar barStyle="default" />
      <ScrollView centerContent contentContainerStyle={styles.scrollViewContent} onLayout={onLayout}>
        <BlueCard>
          <View>
            <BlueTextCentered>{loc.pleasebackup.text_lnd}</BlueTextCentered>
          </View>
          <BlueSpacing20 />

          <QRCode
            value={wallet.secret}
            logo={require('../../img/qr-code.png')}
            logoSize={90}
            size={qrCodeHeight}
            color={colors.foregroundColor}
            logoBackgroundColor={colors.brandingColor}
            backgroundColor={colors.background}
            ecl="H"
          />

          <BlueSpacing20 />
          <BlueCopyTextToClipboard text={wallet.secret} />
          <BlueSpacing20 />
          <BlueButton onPress={() => navigation.dangerouslyGetParent().pop()} title={loc.pleasebackup.ok_lnd} />
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
