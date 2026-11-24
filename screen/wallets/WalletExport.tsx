import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import Icon from '../../components/Icon';
import { LayoutChangeEvent, ScrollView, StyleSheet, View } from 'react-native';
import { useScreenProtect } from '../../hooks/useScreenProtect';
import { validateMnemonic } from '../../blue_modules/bip39';
import { BlueText } from '../../BlueComponents';
import QRCode from '../../components/QRCode';
import SeedWords from '../../components/SeedWords';
import { useTheme } from '../../components/themes';
import { useStorage } from '../../hooks/context/useStorage';
import useAppState from '../../hooks/useAppState';
import loc from '../../loc';
import { WalletExportStackParamList } from '../../navigation/WalletExportStack';
import NeuraiLoader from '../../components/NeuraiLoader';

type RouteProps = RouteProp<WalletExportStackParamList, 'WalletExport'>;

const HORIZONTAL_PADDING = 20;

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
  const { walletID } = useRoute<RouteProps>().params;
  const navigation = useNavigation();
  const { colors } = useTheme();
  const wallet = wallets.find(w => w.getID() === walletID)!;
  const [qrCodeSize, setQRCodeSize] = useState(90);
  const { enableScreenProtect, disableScreenProtect, isProtectionReady } = useScreenProtect();
  const { currentAppState, previousAppState } = useAppState();
  const stylesHook = StyleSheet.create({
    root: { backgroundColor: colors.elevated },
    secretBox: { backgroundColor: colors.lightBorder },
  });

  const secrets: string[] = useMemo(() => {
    try {
      const secret = wallet.getSecret();
      return typeof secret === 'string' ? [secret] : Array.isArray(secret) ? secret : [];
    } catch (error) {
      console.error('Failed to get wallet secret:', error);
      return [];
    }
  }, [wallet]);

  const secretIsMnemonic: boolean = useMemo(() => {
    return validateMnemonic(wallet.getSecret());
  }, [wallet]);

  // Leave on backgrounding. Protection stays on until the screen is gone, so neither the recents
  // thumbnail nor the closing frames show the secret.
  useEffect(() => {
    if (previousAppState === 'active' && currentAppState !== 'active') {
      const timer = setTimeout(() => {
        navigation.goBack();
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAppState, previousAppState]);

  // Recovery material is always protected, whatever the "Allow Screen Capture" setting says.
  useEffect(() => {
    enableScreenProtect();
    return () => {
      disableScreenProtect();
    };
  }, [enableScreenProtect, disableScreenProtect]);

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

  // Nothing secret is drawn until the window is protected.
  if (!isProtectionReady) {
    return (
      <Scroll>
        <DoNotDisclose />
        <NeuraiLoader />
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
      <DoNotDisclose />

      <BlueText style={styles.scanText}>{loc.wallets.scan_import}</BlueText>

      <View style={styles.qrCodeContainer}>
        <QRCode isMenuAvailable={false} value={secret} size={qrCodeSize} logoSize={70} />
      </View>

      {/* Never offer to copy a secret: the clipboard is readable by keyboards and kept in their history */}
      <View>
        <BlueText style={styles.manualText}>{loc.wallets.write_down_header}</BlueText>
        <BlueText style={styles.writeText}>{loc.wallets.write_down}</BlueText>
      </View>
      {secretIsMnemonic ? (
        <SeedWords seed={secret} />
      ) : (
        <View style={[styles.secretBox, stylesHook.secretBox]}>
          <BlueText style={styles.secretText}>{secret}</BlueText>
        </View>
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
  secretBox: {
    padding: 10,
    borderRadius: 8,
  },
  secretText: {
    fontSize: 17,
  },
  qrCodeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
});

export default WalletExport;
