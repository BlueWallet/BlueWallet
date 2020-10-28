import React, { useCallback, useContext, useState } from 'react';
import { ActivityIndicator, InteractionManager, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { BlueNavigationStyle, BlueSpacing20, BlueText, SafeBlueArea } from '../../BlueComponents';
import { DynamicQRCode } from '../../components/DynamicQRCode';
import Privacy from '../../Privacy';
import Biometric from '../../class/biometrics';
import loc from '../../loc';
import { useFocusEffect, useNavigation, useRoute, useTheme } from '@react-navigation/native';
import { SquareButton } from '../../components/SquareButton';
import { BlueStorageContext } from '../../blue_modules/storage-context';
const fs = require('../../blue_modules/fs');

const ExportMultisigCoordinationSetup = () => {
  const walletId = useRoute().params.walletId;
  const { wallets } = useContext(BlueStorageContext);
  const wallet = wallets.find(w => w.getID() === walletId);
  const qrCodeContents = Buffer.from(wallet.getXpub(), 'ascii').toString('hex');
  const [isLoading, setIsLoading] = useState(true);
  const { goBack } = useNavigation();
  const { colors } = useTheme();
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
    exportButton: {
      backgroundColor: colors.buttonDisabledBackgroundColor,
    },
  };

  const exportTxtFile = async () => {
    await fs.writeFileAndExport(wallet.getLabel() + '.txt', wallet.getXpub());
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
          <BlueText style={stylesHook.type}>{wallet.getLabel()}</BlueText>
        </View>
        <BlueSpacing20 />
        <DynamicQRCode value={qrCodeContents} capacity={400} />
        <BlueSpacing20 />
        <SquareButton style={[styles.exportButton, stylesHook.exportButton]} onPress={exportTxtFile} title={loc.multisig.share} />
        <BlueSpacing20 />
        <BlueText style={stylesHook.secret}>{wallet.getXpub()}</BlueText>
      </ScrollView>
    </SafeBlueArea>
  );
};

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

ExportMultisigCoordinationSetup.navigationOptions = ({ navigation }) => ({
  ...BlueNavigationStyle(navigation, true),
  title: loc.multisig.export_coordination_setup,
  headerLeft: null,
});

export default ExportMultisigCoordinationSetup;
