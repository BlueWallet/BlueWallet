import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, InteractionManager, ScrollView, StyleSheet, View, LayoutChangeEvent } from 'react-native';
import { BlueCard, BlueSpacing20, BlueText } from '../../BlueComponents';
import { LegacyWallet, LightningCustodianWallet, SegwitBech32Wallet, SegwitP2SHWallet, WatchOnlyWallet } from '../../class';
import CopyTextToClipboard from '../../components/CopyTextToClipboard';
import HandOffComponent from '../../components/HandOffComponent';
import QRCodeComponent from '../../components/QRCodeComponent';
import SafeArea from '../../components/SafeArea';
import { useTheme } from '../../components/themes';
import usePrivacy from '../../hooks/usePrivacy';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { HandOffActivityType } from '../../components/types';
import { WalletExportStackParamList } from '../../navigation/WalletExportStack';

type RouteProps = RouteProp<WalletExportStackParamList, 'WalletExport'>;

const WalletExport: React.FC = () => {
  const { wallets, saveToDisk } = useStorage();
  const { walletID } = useRoute<RouteProps>().params;
  const [isLoading, setIsLoading] = useState(true);
  const { goBack } = useNavigation();
  const { colors } = useTheme();
  const wallet = wallets.find(w => w.getID() === walletID);
  const [qrCodeSize, setQRCodeSize] = useState(90);
  const appState = useRef(AppState.currentState);
  const { enableBlur, disableBlur } = usePrivacy();

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
      enableBlur();
      const task = InteractionManager.runAfterInteractions(async () => {
        if (wallet) {
          if (!wallet.getUserHasSavedExport()) {
            wallet.setUserHasSavedExport(true);
            saveToDisk();
          }
          setIsLoading(false);
        }
      });
      return () => {
        task.cancel();
        disableBlur();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wallet]),
  );

  if (isLoading || !wallet)
    return (
      <View style={[styles.loading, stylesHook.loading]}>
        <ActivityIndicator />
      </View>
    );

  // for SLIP39 we need to show all shares
  const secrets: string[] = (typeof wallet.getSecret() === 'string' ? [wallet.getSecret()] : wallet.getSecret()) as string[];

  const onLayout = (e: LayoutChangeEvent) => {
    const { height, width } = e.nativeEvent.layout;
    setQRCodeSize(height > width ? width - 40 : width / 1.8);
  };

  return (
    <SafeArea style={stylesHook.root} onLayout={onLayout}>
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
            <QRCodeComponent isMenuAvailable={false} value={s} size={qrCodeSize} logoSize={70} />
            {wallet.type !== WatchOnlyWallet.type && <BlueText style={stylesHook.warning}>{loc.wallets.warning_do_not_disclose}</BlueText>}
            <BlueSpacing20 />
            {wallet.type === LightningCustodianWallet.type || wallet.type === WatchOnlyWallet.type ? (
              <CopyTextToClipboard text={s} />
            ) : (
              <BlueText style={[styles.secret, styles.secretWritingDirection, stylesHook.secret]} testID="Secret">
                {s}
              </BlueText>
            )}
            {wallet.type === WatchOnlyWallet.type && (
              <HandOffComponent title={loc.wallets.xpub_title} type={HandOffActivityType.Xpub} userInfo={{ xpub: s }} />
            )}
          </React.Fragment>
        ))}
      </ScrollView>
    </SafeArea>
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

export default WalletExport;
