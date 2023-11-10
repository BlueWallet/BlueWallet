import React, { useState, useCallback, useContext, useRef, useEffect } from 'react';
import { InteractionManager, ScrollView, ActivityIndicator, View, StyleSheet, AppState } from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';

import { BlueSpacing20, SafeBlueArea, BlueText, BlueCopyTextToClipboard, BlueCard } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import Privacy from '../../blue_modules/Privacy';
import Biometric from '../../class/biometrics';
import { LegacyWallet, LightningCustodianWallet, SegwitBech32Wallet, SegwitP2SHWallet, WatchOnlyWallet } from '../../class';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import QRCodeComponent from '../../components/QRCodeComponent';
import HandoffComponent from '../../components/handoff';
import { useTheme } from '../../components/themes';

const WalletExport = () => {
  const { wallets, saveToDisk } = useContext(BlueStorageContext);
  const { walletID } = useRoute().params;
  const [isLoading, setIsLoading] = useState(true);
  const { goBack } = useNavigation();
  const { colors } = useTheme();
  const wallet = wallets.find(w => w.getID() === walletID);
  const [qrCodeSize, setQRCodeSize] = useState(90);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (!isLoading && nextAppState === 'background') {
        goBack();
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [goBack, isLoading]);

  const stylesHook = {
    loading: {
      backgroundColor: colors.elevated,
    },
    root: {
      backgroundColor: colors.elevated,
    },
    type: { color: colors.foregroundColor },
    secret: { color: colors.foregroundColor },
    warning: { color: colors.failedColor },
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
          if (!wallet.getUserHasSavedExport()) {
            wallet.setUserHasSavedExport(true);
            saveToDisk();
          }
          setIsLoading(false);
        }
      });
      return () => {
        task.cancel();
        Privacy.disableBlur();
      };
    }, [goBack, saveToDisk, wallet]),
  );

  if (isLoading || !wallet)
    return (
      <View style={[styles.loading, stylesHook.loading]}>
        <ActivityIndicator />
      </View>
    );

  // for SLIP39 we need to show all shares
  let secrets = wallet.getSecret();
  if (typeof secrets === 'string') {
    secrets = [secrets];
  }

  const onLayout = e => {
    const { height, width } = e.nativeEvent.layout;
    setQRCodeSize(height > width ? width - 40 : e.nativeEvent.layout.width / 1.8);
  };

  return (
    <SafeBlueArea style={[styles.root, stylesHook.root]} onLayout={onLayout}>
      <ScrollView contentContainerStyle={styles.scrollViewContent} testID="WalletExportScroll">
        <View>
          <BlueText style={[styles.type, stylesHook.type]}>{wallet.typeReadable}</BlueText>
        </View>

        {[LegacyWallet.type, SegwitBech32Wallet.type, SegwitP2SHWallet.type].includes(wallet.type) && (
          <BlueCard>
            <BlueText>{wallet.getAddress()}</BlueText>
          </BlueCard>
        )}
        <BlueSpacing20 />
        {secrets.map(s => (
          <React.Fragment key={s}>
            <QRCodeComponent isMenuAvailable={false} value={wallet.getSecret()} size={qrCodeSize} logoSize={70} />
            {wallet.type !== WatchOnlyWallet.type && (
              <BlueText style={[styles.warning, stylesHook.warning]}>{loc.wallets.warning_do_not_disclose}</BlueText>
            )}
            <BlueSpacing20 />
            {wallet.type === LightningCustodianWallet.type || wallet.type === WatchOnlyWallet.type ? (
              <BlueCopyTextToClipboard text={wallet.getSecret()} />
            ) : (
              <BlueText style={[styles.secret, styles.secretWritingDirection, stylesHook.secret]} testID="Secret">
                {wallet.getSecret()}
              </BlueText>
            )}
            {wallet.type === WatchOnlyWallet.type && (
              <HandoffComponent
                title={loc.wallets.xpub_title}
                type={HandoffComponent.activityTypes.Xpub}
                userInfo={{ xpub: wallet.getSecret() }}
              />
            )}
          </React.Fragment>
        ))}
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
    alignSelf: 'stretch',
    textAlign: 'center',
    paddingHorizontal: 16,
    fontSize: 16,
    lineHeight: 24,
  },
  secretWritingDirection: {
    writingDirection: 'ltr',
  },
});

WalletExport.navigationOptions = navigationStyle(
  {
    closeButton: true,
    headerHideBackButton: true,
    statusBarStyle: 'light',
  },
  opts => ({ ...opts, title: loc.wallets.export_title }),
);

export default WalletExport;
