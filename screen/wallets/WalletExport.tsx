import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from '../../components/Icon';
import { ActivityIndicator, LayoutChangeEvent, ScrollView, StyleSheet, Pressable, View } from 'react-native';
import { useScreenProtect } from '../../hooks/useScreenProtect';
import { validateMnemonic } from '../../blue_modules/bip39';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import BlueText from '../../components/BlueText';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';
import { WatchOnlyWallet } from '../../class/wallets/watch-only-wallet';
import HandOffComponent from '../../components/HandOffComponent';
import QRCode from '../../components/QRCode';
import SeedWords from '../../components/SeedWords';
import { useTheme } from '../../components/themes';
import { HandOffActivityType } from '../../components/types';
import { useStorage } from '../../hooks/context/useStorage';
import useAppState from '../../hooks/useAppState';
import loc from '../../loc';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { WalletExportStackParamList } from '../../navigation/WalletExportStack';

type RouteProps = RouteProp<WalletExportStackParamList, 'WalletExport'>;
type NavigationProps = NativeStackNavigationProp<DetailViewStackParamList>;

const HORIZONTAL_PADDING = 20;
const CLOSE_TRANSITION_FALLBACK_MS = 5000;

const CopyBox: React.FC<{ text: string; onPress: () => void }> = ({ text, onPress }) => {
  const { colors } = useTheme();
  const stylesHook = StyleSheet.create({
    copyRoot: { backgroundColor: colors.lightBorder },
  });

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed, styles.copyRoot, stylesHook.copyRoot]}>
      <View style={styles.copyLeft}>
        <BlueText textBreakStrategy="balanced" style={styles.copyText}>
          {text}
        </BlueText>
      </View>
      <View style={styles.copyRight}>
        <Icon name="copy" type="font-awesome-6" color={colors.foregroundColor} />
      </View>
    </Pressable>
  );
};

const DoNotDisclose: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={[styles.warningBox, { backgroundColor: colors.changeText }]}>
      <Icon type="font-awesome-6" name="circle-exclamation" size={24} color="white" />
      <BlueText style={styles.warning}>{loc.wallets.warning_do_not_disclose}</BlueText>
    </View>
  );
};

const WalletExport: React.FC = () => {
  const { wallets } = useStorage();
  const route = useRoute<RouteProps>();
  const { walletID } = route.params;
  const navigation = useNavigation<NavigationProps>();
  const { colors } = useTheme();
  const wallet = wallets.find(w => w.getID() === walletID)!;
  const [qrCodeSize, setQRCodeSize] = useState(90);
  const { lockScreenProtect, unlockScreenProtect } = useScreenProtect();
  const { currentAppState, previousAppState } = useAppState();
  const [isScreenProtectionReady, setIsScreenProtectionReady] = useState(false);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isProtectionReleased = useRef(false);
  const isScreenFocused = useRef(false);
  const isScreenMounted = useRef(false);
  const stylesHook = StyleSheet.create({
    root: { backgroundColor: colors.elevated },
  });

  const secrets: string[] = useMemo(() => {
    try {
      const secret = wallet instanceof WatchOnlyWallet ? wallet.getSecretForExport() : wallet.getSecret();
      return typeof secret === 'string' ? [secret] : Array.isArray(secret) ? secret : [];
    } catch (error) {
      console.error('Failed to get wallet secret:', error);
      return [];
    }
  }, [wallet]);

  const secretIsMnemonic: boolean = useMemo(() => {
    return validateMnemonic(wallet.getSecret());
  }, [wallet]);

  const hasSeedPhrase = secrets.length > 1 || secretIsMnemonic;

  const releaseProtection = useCallback(() => {
    if (!hasSeedPhrase || isProtectionReleased.current) return;
    isProtectionReleased.current = true;
    if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    void unlockScreenProtect().catch(error => console.warn('Failed to disable wallet export screen protection:', error));
  }, [hasSeedPhrase, unlockScreenProtect]);

  const scheduleProtectionFallback = useCallback(() => {
    if (!hasSeedPhrase || isProtectionReleased.current || fallbackTimer.current) return;
    fallbackTimer.current = setTimeout(() => {
      fallbackTimer.current = undefined;
      if (!isScreenFocused.current || !isScreenMounted.current) releaseProtection();
    }, CLOSE_TRANSITION_FALLBACK_MS);
  }, [hasSeedPhrase, releaseProtection]);

  useEffect(() => {
    if (previousAppState === 'active' && currentAppState !== 'active') {
      const timer = setTimeout(() => {
        navigation.goBack();
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAppState, previousAppState]);

  useFocusEffect(
    useCallback(() => {
      isScreenFocused.current = true;
      isProtectionReleased.current = false;
      if (fallbackTimer.current) {
        clearTimeout(fallbackTimer.current);
        fallbackTimer.current = undefined;
      }

      let isFocused = true;
      setIsScreenProtectionReady(false);
      if (hasSeedPhrase) {
        void lockScreenProtect()
          .then(() => {
            if (isFocused) setIsScreenProtectionReady(true);
          })
          .catch(error => console.warn('Failed to enable wallet export screen protection:', error));
      }

      return () => {
        isScreenFocused.current = false;
        isFocused = false;
      };
    }, [hasSeedPhrase, lockScreenProtect]),
  );

  useEffect(() => {
    isScreenMounted.current = true;
    const isClosingWalletExport = (event: { data: { closing: boolean }; target?: string }) =>
      event.data.closing && event.target === route.key;
    const unsubscribeStart = navigation.addListener('transitionStart', event => {
      if (hasSeedPhrase && isClosingWalletExport(event)) scheduleProtectionFallback();
    });
    const unsubscribeEnd = navigation.addListener('transitionEnd', event => {
      if (isClosingWalletExport(event)) releaseProtection();
    });

    return () => {
      isScreenMounted.current = false;
      unsubscribeStart();
      unsubscribeEnd();
      scheduleProtectionFallback();
    };
  }, [hasSeedPhrase, navigation, releaseProtection, route.key, scheduleProtectionFallback]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { height, width } = e.nativeEvent.layout;

    const isPortrait = height > width;
    const maxQRSize = 400;

    if (isPortrait) {
      const heightBasedSize = Math.min(height * 0.5, maxQRSize);
      const widthBasedSize = width * 0.75 - HORIZONTAL_PADDING * 2;
      setQRCodeSize(Math.min(heightBasedSize, widthBasedSize));
    } else {
      const heightBasedSize = Math.min(height * 0.6, maxQRSize);
      const widthBasedSize = width * 0.35;
      setQRCodeSize(Math.min(heightBasedSize, widthBasedSize));
    }
  }, []);

  const handleCopy = useCallback(() => {
    Clipboard.setString(secrets[0]);
    triggerHapticFeedback(HapticFeedbackTypes.Selection);
  }, [secrets]);

  const Scroll = useCallback(
    // eslint-disable-next-line react/no-unused-prop-types
    ({ children }: { children: React.ReactNode | React.ReactNode[] }) => (
      <ScrollView
        automaticallyAdjustContentInsets
        contentInsetAdjustmentBehavior="automatic"
        style={stylesHook.root}
        contentContainerStyle={styles.scrollViewContent}
        onLayout={onLayout}
        testID="WalletExportScroll"
      >
        {children}
      </ScrollView>
    ),
    [onLayout, stylesHook.root],
  );

  if (hasSeedPhrase && !isScreenProtectionReady) {
    return (
      <Scroll>
        <DoNotDisclose />
        <ActivityIndicator color={colors.foregroundColor} />
      </Scroll>
    );
  }

  // for SLIP39
  if (secrets.length !== 1) {
    return (
      <Scroll>
        <DoNotDisclose />

        <View>
          <BlueText style={styles.manualText}>{loc.wallets.write_down_header}</BlueText>
          <BlueText style={styles.writeText}>{loc.wallets.write_down}</BlueText>
        </View>

        {secrets.map((secret, index) => (
          <React.Fragment key={secret}>
            <BlueText style={styles.scanText}>{loc.formatString(loc.wallets.share_number, { number: index + 1 })}</BlueText>
            <SeedWords seed={secret} />
          </React.Fragment>
        ))}

        <BlueText style={styles.typeText}>{loc.formatString(loc.wallets.wallet_type_this, { type: wallet.typeReadable })}</BlueText>
      </Scroll>
    );
  }

  const secret = secrets[0];

  return (
    <ScrollView
      automaticallyAdjustContentInsets
      contentInsetAdjustmentBehavior="automatic"
      style={stylesHook.root}
      contentContainerStyle={styles.scrollViewContent}
      onLayout={onLayout}
      testID="WalletExportScroll"
    >
      {wallet.type !== WatchOnlyWallet.type && <DoNotDisclose />}

      <BlueText style={styles.scanText}>{loc.wallets.scan_import}</BlueText>

      <View style={styles.qrCodeContainer}>
        <QRCode isMenuAvailable={false} value={secret} size={qrCodeSize} logoSize={70} />
      </View>

      {/* Do not allow to copy mnemonic */}
      {secretIsMnemonic ? (
        <>
          <View>
            <BlueText style={styles.manualText}>{loc.wallets.write_down_header}</BlueText>
            <BlueText style={styles.writeText}>{loc.wallets.write_down}</BlueText>
          </View>
          <SeedWords seed={secret} />
        </>
      ) : (
        <>
          <BlueText style={styles.writeText}>
            {wallet.type === LightningCustodianWallet.type ? loc.wallets.copy_ln_url : loc.wallets.copy_ln_public}
          </BlueText>
          <CopyBox text={secret} onPress={handleCopy} />
        </>
      )}

      {wallet.type === WatchOnlyWallet.type && (
        <HandOffComponent title={loc.wallets.xpub_title} type={HandOffActivityType.Xpub} userInfo={{ xpub: secret }} />
      )}

      <BlueText style={styles.typeText}>{loc.formatString(loc.wallets.wallet_type_this, { type: wallet.typeReadable })}</BlueText>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollViewContent: {
    justifyContent: 'center',
    flexGrow: 1,
    gap: 32,
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 10,
    paddingBottom: 20,
  },
  warningBox: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 8,
  },
  warning: {
    fontSize: 20,
    color: 'white',
  },
  scanText: {
    textAlign: 'center',
    fontSize: 20,
  },
  writeText: {
    textAlign: 'center',
    fontSize: 17,
  },
  manualText: {
    textAlign: 'center',
    fontSize: 20,
    marginBottom: 10,
  },
  typeText: {
    textAlign: 'center',
    fontSize: 17,
    color: 'grey',
  },
  copyRoot: {
    padding: 10,
    borderRadius: 8,
    flexDirection: 'row',
  },
  copyLeft: {
    flexShrink: 1,
  },
  copyRight: {
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  copyText: {
    fontSize: 17,
  },
  qrCodeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  pressed: {
    opacity: 0.6,
  },
});

export default WalletExport;
