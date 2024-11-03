import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, InteractionManager, ScrollView, StyleSheet, View, LayoutChangeEvent } from 'react-native';
import { BlueCard, BlueSpacing20, BlueText } from '../../BlueComponents';
import { LegacyWallet, LightningCustodianWallet, SegwitBech32Wallet, SegwitP2SHWallet, WatchOnlyWallet } from '../../class';
import CopyTextToClipboard from '../../components/CopyTextToClipboard';
import HandOffComponent from '../../components/HandOffComponent';
import QRCodeComponent from '../../components/QRCodeComponent';
import { useTheme } from '../../components/themes';
import { disallowScreenshot } from 'react-native-screen-capture';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { HandOffActivityType } from '../../components/types';
import { WalletExportStackParamList } from '../../navigation/WalletExportStack';
import useAppState from '../../hooks/useAppState';

type RouteProps = RouteProp<WalletExportStackParamList, 'WalletExport'>;

const WalletExport: React.FC = () => {
  const { wallets, saveToDisk } = useStorage();
  const { walletID } = useRoute<RouteProps>().params;
  const [isLoading, setIsLoading] = useState(true);
  const { goBack } = useNavigation();
  const { colors } = useTheme();
  const wallet = wallets.find(w => w.getID() === walletID);
  const [qrCodeSize, setQRCodeSize] = useState(90);
  const { currentAppState, previousAppState } = useAppState();

  useEffect(() => {
    if (previousAppState === 'active' && currentAppState !== 'active') {
      goBack();
    }
  }, [currentAppState, previousAppState, goBack, isLoading]);

  useFocusEffect(
    useCallback(() => {
      disallowScreenshot(true);
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
        disallowScreenshot(false);
      };
    }, [wallet, saveToDisk]),
  );

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

  const secrets: string[] = ((typeof wallet?.getSecret() === 'string' ? [wallet.getSecret()] : wallet?.getSecret()) as string[]) || [];

  const onLayout = (e: LayoutChangeEvent) => {
    const { height, width } = e.nativeEvent.layout;
    setQRCodeSize(height > width ? width - 40 : width / 1.8);
  };

  return (
    <ScrollView
      automaticallyAdjustContentInsets
      contentInsetAdjustmentBehavior="automatic"
      style={stylesHook.root}
      contentContainerStyle={styles.scrollViewContent}
      onLayout={onLayout}
      testID="WalletExportScroll"
      centerContent={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator />
      ) : (
        wallet && (
          <>
            <View>
              <BlueText style={[styles.type, stylesHook.type]}>{wallet.typeReadable}</BlueText>
            </View>

            {[LegacyWallet.type, SegwitBech32Wallet.type, SegwitP2SHWallet.type].includes(wallet.type) && (
              <BlueCard>
                <BlueText>{wallet.getAddress()}</BlueText>
              </BlueCard>
            )}
            <BlueSpacing20 />
            {secrets.map(secret => (
              <React.Fragment key={secret}>
                <QRCodeComponent isMenuAvailable={false} value={secret} size={qrCodeSize} logoSize={70} />
                {wallet.type !== WatchOnlyWallet.type && (
                  <>
                    <BlueSpacing20 />
                    <BlueText style={stylesHook.warning}>{loc.wallets.warning_do_not_disclose}</BlueText>
                  </>
                )}
                <BlueSpacing20 />
                {wallet.type === LightningCustodianWallet.type || wallet.type === WatchOnlyWallet.type ? (
                  <CopyTextToClipboard text={secret} />
                ) : (
                  <BlueText style={[styles.secret, styles.secretWritingDirection, stylesHook.secret]} testID="Secret">
                    {secret}
                  </BlueText>
                )}
                {wallet.type === WatchOnlyWallet.type && (
                  <HandOffComponent title={loc.wallets.xpub_title} type={HandOffActivityType.Xpub} userInfo={{ xpub: secret }} />
                )}
              </React.Fragment>
            ))}
          </>
        )
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
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
