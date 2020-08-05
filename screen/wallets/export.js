import React, { useState, useCallback } from 'react';
import { useWindowDimensions, InteractionManager, ScrollView, ActivityIndicator, StatusBar, View, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { BlueSpacing20, SafeBlueArea, BlueNavigationStyle, BlueText, BlueCopyTextToClipboard, BlueCard } from '../../BlueComponents';
import Privacy from '../../Privacy';
import Biometric from '../../class/biometrics';
import { LegacyWallet, LightningCustodianWallet, SegwitBech32Wallet, SegwitP2SHWallet, WatchOnlyWallet } from '../../class';
import loc from '../../loc';
import { useTheme, useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
/** @type {AppStorage} */
const BlueApp = require('../../BlueApp');

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

const WalletExport = () => {
  const { wallet } = useRoute().params;
  const [isLoading, setIsLoading] = useState(true);
  const { goBack } = useNavigation();
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const stylesHook = {
    ...styles,
    loading: {
      ...styles.loading,
      backgroundColor: colors.elevated,
    },
    root: {
      ...styles.root,
      backgroundColor: colors.elevated,
    },
    type: { ...styles.type, color: colors.foregroundColor },
    secret: { ...styles.secret, color: colors.foregroundColor },
  };

  useFocusEffect(
    useCallback(() => {
      Privacy.enableBlur();
      const task = InteractionManager.runAfterInteractions(async () => {
        if (wallet) {
          const isBiometricsEnabled = await Biometric.isBiometricUseCapableAndEnabled();

          if (isBiometricsEnabled) {
            if (!(await Biometric.unlockWithBiometrics())) {
              return goBack();
            }
          }

          setIsLoading(false);
        }
      });
      return () => {
        task.cancel();
        Privacy.disableBlur();
        wallet.setUserHasSavedExport(true);
        BlueApp.saveToDisk();
      };
    }, [goBack, wallet]),
  );

  return isLoading ? (
    <View style={stylesHook.loading}>
      <ActivityIndicator />
    </View>
  ) : (
    <SafeBlueArea style={stylesHook.root}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View>
          <BlueText style={stylesHook.type}>{wallet.typeReadable}</BlueText>
        </View>

        {(() => {
          if ([LegacyWallet.type, SegwitBech32Wallet.type, SegwitP2SHWallet.type].includes(wallet.type)) {
            return (
              <BlueCard>
                <BlueText>{wallet.getAddress()}</BlueText>
              </BlueCard>
            );
          }
        })()}
        <BlueSpacing20 />
        <View style={styles.activeQrcode}>
          <QRCode
            value={wallet.getSecret()}
            logo={require('../../img/qr-code.png')}
            size={height > width ? width - 40 : width / 2}
            logoSize={70}
            color="#000000"
            logoBackgroundColor={colors.brandingColor}
            backgroundColor="#FFFFFF"
            ecl="H"
          />
        </View>
        <BlueSpacing20 />
        {wallet.type === LightningCustodianWallet.type || wallet.type === WatchOnlyWallet.type ? (
          <BlueCopyTextToClipboard text={wallet.getSecret()} />
        ) : (
          <BlueText style={stylesHook.secret}>{wallet.getSecret()}</BlueText>
        )}
      </ScrollView>
    </SafeBlueArea>
  );
};

WalletExport.navigationOptions = ({ navigation }) => ({
  ...BlueNavigationStyle(navigation, true),
  title: loc.wallets.export_title,
  headerLeft: null,
});

export default WalletExport;
