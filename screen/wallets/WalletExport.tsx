import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Icon } from '@rneui/themed';
import { LayoutChangeEvent, ScrollView, StyleSheet, Pressable, View } from 'react-native';
import { useScreenProtect } from '../../hooks/useScreenProtect';
import { validateMnemonic } from '../../blue_modules/bip39';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { BlueText } from '../../BlueComponents';
import { LightningCustodianWallet, WatchOnlyWallet } from '../../class';
import HandOffComponent from '../../components/HandOffComponent';
import QRCodeComponent from '../../components/QRCodeComponent';
import SeedWords from '../../components/SeedWords';
import { useTheme } from '../../components/themes';
import { HandOffActivityType } from '../../components/types';
import { useSettings } from '../../hooks/context/useSettings';
import { useStorage } from '../../hooks/context/useStorage';
import useAppState from '../../hooks/useAppState';
import loc from '../../loc';
import { WalletExportStackParamList } from '../../navigation/WalletExportStack';
import { WalletDescriptor } from '../../class/wallet-descriptor.ts';

type RouteProps = RouteProp<WalletExportStackParamList, 'WalletExport'>;

const HORIZONTAL_PADDING = 20;

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
        <Icon name="copy" type="font-awesome-5" color={colors.foregroundColor} />
      </View>
    </Pressable>
  );
};

const DoNotDisclose: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={[styles.warningBox, { backgroundColor: colors.changeText }]}>
      <Icon type="font-awesome-5" name="exclamation-circle" color="white" />
      <BlueText style={styles.warning}>{loc.wallets.warning_do_not_disclose}</BlueText>
    </View>
  );
};

const WalletExport: React.FC = () => {
  const { wallets } = useStorage();
  const { walletID } = useRoute<RouteProps>().params;
  const navigation = useNavigation();
  const { isPrivacyBlurEnabled } = useSettings();
  const { colors } = useTheme();
  const wallet = wallets.find(w => w.getID() === walletID)!;
  const [qrCodeSize, setQRCodeSize] = useState(90);
  const { enableScreenProtect, disableScreenProtect } = useScreenProtect();
  const { currentAppState, previousAppState } = useAppState();
  const stylesHook = StyleSheet.create({
    root: { backgroundColor: colors.elevated },
  });

  const secrets: string[] = useMemo(() => {
    try {
      let secret = wallet.getSecret();
      if (wallet instanceof WatchOnlyWallet) {
        try {
          const path = wallet.getDerivationPath();
          if (path?.startsWith('m/86')) {
            // for taproot watch-only HD we dont just show xpub, we show wallet descriptor
            const fp = wallet.getMasterFingerprintHex();
            secret = WalletDescriptor.getDescriptor(fp, path, secret);
          }
        } catch (e: any) {
          console.log(e.message);
        }
      }
      return typeof secret === 'string' ? [secret] : Array.isArray(secret) ? secret : [];
    } catch (error) {
      console.error('Failed to get wallet secret:', error);
      return [];
    }
  }, [wallet]);

  const secretIsMnemonic: boolean = useMemo(() => {
    return validateMnemonic(wallet.getSecret());
  }, [wallet]);

  useEffect(() => {
    if (previousAppState === 'active' && currentAppState !== 'active') {
      disableScreenProtect();
      const timer = setTimeout(() => {
        navigation.goBack();
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAppState, previousAppState]);

  useEffect(() => {
    if (isPrivacyBlurEnabled) {
      enableScreenProtect();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPrivacyBlurEnabled]);

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
    ({ children }: { children: React.ReactNode | React.ReactNodeArray }) => (
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
        <QRCodeComponent isMenuAvailable={false} value={secret} size={qrCodeSize} logoSize={70} />
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
