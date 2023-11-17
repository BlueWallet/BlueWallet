import React, { useCallback, useContext, useRef, useState } from 'react';
import { ActivityIndicator, InteractionManager, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';

import { BlueSpacing20, BlueText, SafeBlueArea } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import { DynamicQRCode } from '../../components/DynamicQRCode';
import Privacy from '../../blue_modules/Privacy';
import Biometric from '../../class/biometrics';
import loc from '../../loc';
import { SquareButton } from '../../components/SquareButton';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { useTheme } from '../../components/themes';
const fs = require('../../blue_modules/fs');

const ExportMultisigCoordinationSetup = () => {
  const walletId = useRoute().params.walletId;
  const { wallets } = useContext(BlueStorageContext);
  const wallet = wallets.find(w => w.getID() === walletId);
  const qrCodeContents = useRef();
  const dynamicQRCode = useRef();
  const [isLoading, setIsLoading] = useState(true);
  const [isShareButtonTapped, setIsShareButtonTapped] = useState(false);
  const { goBack } = useNavigation();
  const { colors } = useTheme();
  const stylesHook = StyleSheet.create({
    loading: {
      backgroundColor: colors.elevated,
    },
    root: {
      backgroundColor: colors.elevated,
    },
    type: { color: colors.foregroundColor },
    secret: { color: colors.foregroundColor },
    exportButton: {
      backgroundColor: colors.buttonDisabledBackgroundColor,
    },
  });

  const exportTxtFile = async () => {
    setIsShareButtonTapped(true);
    dynamicQRCode.current?.stopAutoMove();
    setTimeout(() => {
      fs.writeFileAndExport(wallet.getLabel() + '.txt', wallet.getXpub()).finally(() => {
        setIsShareButtonTapped(false);
        dynamicQRCode.current?.startAutoMove();
      });
    }, 10);
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
          qrCodeContents.current = Buffer.from(wallet.getXpub(), 'ascii').toString('hex');
          setIsLoading(false);
        }
      });
      return () => {
        task.cancel();
        Privacy.disableBlur();
      };
    }, [goBack, wallet]),
  );

  return isLoading ? (
    <View style={[styles.loading, stylesHook.loading]}>
      <ActivityIndicator />
    </View>
  ) : (
    <SafeBlueArea style={stylesHook.root}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View>
          <BlueText style={[styles.type, stylesHook.type]}>{wallet.getLabel()}</BlueText>
        </View>
        <BlueSpacing20 />
        <DynamicQRCode value={qrCodeContents.current} ref={dynamicQRCode} />
        <BlueSpacing20 />
        {isShareButtonTapped ? (
          <ActivityIndicator />
        ) : (
          <SquareButton style={[styles.exportButton, stylesHook.exportButton]} onPress={exportTxtFile} title={loc.multisig.share} />
        )}
        <BlueSpacing20 />
        <BlueText style={[styles.secret, stylesHook.secret]}>{wallet.getXpub()}</BlueText>
      </ScrollView>
    </SafeBlueArea>
  );
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
  },
  scrollViewContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
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
  exportButton: {
    height: 48,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    width: '80%',
    maxWidth: 300,
  },
});

ExportMultisigCoordinationSetup.navigationOptions = navigationStyle(
  {
    closeButton: true,
    headerHideBackButton: true,
    statusBarStyle: 'light',
  },
  opts => ({ ...opts, title: loc.multisig.export_coordination_setup }),
);

export default ExportMultisigCoordinationSetup;
