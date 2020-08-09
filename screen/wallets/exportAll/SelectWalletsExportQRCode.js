/* global alert */
import React, { useState, useCallback } from 'react';
import { useWindowDimensions, InteractionManager, ScrollView, ActivityIndicator, StatusBar, View, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { BlueSpacing20, SafeBlueArea, BlueNavigationStyle, BlueText, BlueCopyLongTextToClipboard } from '../../../BlueComponents';
import Privacy from '../../../Privacy';
import Biometric from '../../../class/biometrics';
import loc from '../../../loc';
import { useTheme, useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { LightningCustodianWallet } from '../../../class';
/** @type {AppStorage} */
const BlueApp = require('../../../BlueApp');

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    paddingTop: 20,
  },
  root: {
    flex: 1,
  },
  scrollViewContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  activeQrcode: { borderWidth: 6, borderRadius: 8, borderColor: '#FFFFFF' },
  type: {
    fontSize: 17,
    fontWeight: '700',
  },
  secret: {
    alignItems: 'center',
    paddingHorizontal: 16,
    fontSize: 16,
    lineHeight: 24,
  },
});

const SelectWalletsExportQRCode = () => {
  const { selectedWallets } = useRoute().params;
  const [qrData, setQRData] = useState();
  const [isLoading, setIsLoading] = useState(true);
  const { goBack } = useNavigation();
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const stylesHook = {
    loading: {
      backgroundColor: colors.elevated,
    },
    root: {
      backgroundColor: colors.elevated,
    },
    type: { color: colors.foregroundColor },
    secret: { color: colors.foregroundColor },
  };

  useFocusEffect(
    useCallback(() => {
      Privacy.enableBlur();
      const task = InteractionManager.runAfterInteractions(async () => {
        const isBiometricsEnabled = await Biometric.isBiometricUseCapableAndEnabled();

        if (isBiometricsEnabled) {
          if (!(await Biometric.unlockWithBiometrics())) {
            return goBack();
          }
        }

        const walletsForExport = [];
        BlueApp.getWallets().forEach(wallet => {
          if (selectedWallets.includes(wallet)) {
            const walletForImport = {
              label: wallet.getLabel(),
              preferredBalanceUnit: wallet.getPreferredBalanceUnit(),
              hideBalance: wallet.hideBalance,
              userHasSavedExport: true,
              _hideTransactionsInWalletsList: wallet.getHideTransactionsInWalletsList(),
              secret: wallet.getSecret(),
            };
            if (wallet.type === LightningCustodianWallet.type) {
              walletForImport.baseURI = wallet.getBaseURI();
            }
            walletsForExport.push(walletForImport);
          }
        });
        setQRData(JSON.stringify({ application: 'BlueWallet', data: walletsForExport }));
        setIsLoading(false);
      });
      return () => {
        task.cancel();
        Privacy.disableBlur();
      };
    }, [goBack, selectedWallets]),
  );

  const onError = error => {
    alert(error);
    goBack();
  };

  return isLoading ? (
    <View style={[styles.loading, stylesHook.loading]}>
      <ActivityIndicator />
    </View>
  ) : (
    <SafeBlueArea style={[styles.root, stylesHook.root]}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <BlueSpacing20 />
        <View style={styles.activeQrcode}>
          <QRCode
            value={qrData}
            logo={require('../../../img/qr-code.png')}
            size={height > width ? width - 40 : width / 2}
            logoSize={70}
            color="#000000"
            logoBackgroundColor={colors.brandingColor}
            backgroundColor="#FFFFFF"
            ecl="H"
            onError={onError}
          />
        </View>
        <BlueSpacing20 />
        <BlueCopyLongTextToClipboard text={qrData} />
      </ScrollView>
    </SafeBlueArea>
  );
};

SelectWalletsExportQRCode.navigationOptions = ({ navigation }) => ({
  ...BlueNavigationStyle(navigation, true,  () => navigation.dangerouslyGetParent().pop()),
  headerTitle: loc.wallets.export_all_title,
  
});

export default SelectWalletsExportQRCode;
