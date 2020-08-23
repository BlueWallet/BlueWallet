/* global alert */
import React, { useState, useCallback } from 'react';
import { useWindowDimensions, InteractionManager, ScrollView, ActivityIndicator, StatusBar, View, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {
  BlueSpacing20,
  SafeBlueArea,
  BlueNavigationStyle,
  BlueCopyLongTextToClipboard,
  SecondButton,
  BlueTextHooks,
  BlueCard,
} from '../../../BlueComponents';
import Privacy from '../../../Privacy';
import Biometric from '../../../class/biometrics';
import loc from '../../../loc';
import { useTheme, useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { LightningCustodianWallet } from '../../../class';
import Share from 'react-native-share';
const encryption = require('../../../blue_modules/encryption');
const prompt = require('../../../blue_modules/prompt');

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
  const [showQRCode, setShowQRCode] = useState(false);
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

  const showPasswordAlertAndEncrypt = async data => {
    let p1 = await prompt(loc.settings.password, loc.settings.password_explain_export).catch(() => {
      p1 = undefined;
    });
    if (!p1) {
      return goBack();
    }
    const p2 = await prompt(loc.settings.password, loc.settings.retype_password).catch(() => {
      return goBack();
    });
    if (p1 === p2) {
      const encrypted = encryption.encrypt(JSON.stringify(data), p1);

      setQRData(`bluewallet:import?data=${encrypted}`);
      setShowQRCode(true);
      setIsLoading(false);
    } else {
      alert(loc.settings.passwords_do_not_match);
      goBack();
    }
  };

  const handleShareButtonPressed = () => {
    Share.open({ message: qrData }).catch(error => console.log(error));
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

        showPasswordAlertAndEncrypt(walletsForExport);
      });
      return () => {
        task.cancel();
        Privacy.disableBlur();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const onError = () => {
    setShowQRCode(false);
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
        {showQRCode ? (
          <View style={styles.activeQrcode}>
            <QRCode
              value={qrData}
              size={height > width ? width - 40 : width / 2}
              color="#000000"
              backgroundColor="#FFFFFF"
              ecl="H"
              onError={onError}
            />
          </View>
        ) : (
          <BlueCard>
            <BlueTextHooks>{loc.wallets.export_wallets_qrcode_error}</BlueTextHooks>
          </BlueCard>
        )}
        <BlueSpacing20 />
        <BlueCopyLongTextToClipboard text={qrData} />
        <View>
          <SecondButton onPress={handleShareButtonPressed} title={loc.receive.details_share} />
        </View>
      </ScrollView>
    </SafeBlueArea>
  );
};

SelectWalletsExportQRCode.navigationOptions = ({ navigation }) => ({
  ...BlueNavigationStyle(navigation, true, () => navigation.dangerouslyGetParent().pop()),
  headerTitle: loc.wallets.export_all_title,
});

export default SelectWalletsExportQRCode;
