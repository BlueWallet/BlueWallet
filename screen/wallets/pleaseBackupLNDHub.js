import React, { useCallback, useEffect } from 'react';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import { View, useWindowDimensions, StyleSheet, BackHandler, StatusBar } from 'react-native';
import {
  SafeBlueArea,
  BlueNavigationStyle,
  BlueSpacing20,
  BlueCopyTextToClipboard,
  BlueButton,
  BlueTextCentered,
} from '../../BlueComponents';
import QRCode from 'react-native-qrcode-svg';
import Privacy from '../../Privacy';
import { ScrollView } from 'react-native-gesture-handler';
import loc from '../../loc';

const PleaseBackupLNDHub = () => {
  const { wallet } = useRoute().params;
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

  return (
    <SafeBlueArea style={styles.root}>
      <StatusBar barStyle="default" />
      <ScrollView centerContent contentContainerStyle={styles.scrollViewContent}>
        <View>
          <BlueTextCentered>{loc.pleasebackup.text_lnd}</BlueTextCentered>
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
        <BlueSpacing20 />
        <BlueCopyTextToClipboard text={wallet.secret} />
        <BlueSpacing20 />
        <BlueButton onPress={() => navigation.dangerouslyGetParent().pop()} title={loc.pleasebackup.ok_lnd} />
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
