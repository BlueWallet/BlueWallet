import React, { useCallback, useState } from 'react';
import { Keyboard, StyleSheet, TextInput, View } from 'react-native';
import Animated, { Layout } from 'react-native-reanimated';

import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { BlueButtonLink, BlueFormLabel } from '../../BlueComponents';
import { NeuraiHDWallet } from '../../class/wallets/neurai-hd-wallet';
import { NeuraiPQWallet } from '../../class/wallets/neurai-pq-wallet';
import { NeuraiECDSAWallet } from '../../class/wallets/neurai-ecdsa-wallet';
import { chainFor, isKindAvailable, NeuraiNetwork, WalletKind } from '../../blue_modules/neurai';
import presentAlert from '../../components/Alert';
import Button from '../../components/Button';
import NeuraiLoader, { untilLoaderPainted } from '../../components/NeuraiLoader';
import SegmentedControl from '../../components/SegmentedControl';
import WalletButton from '../../components/WalletButton';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AddWalletStackParamList } from '../../navigation/AddWalletStack';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { BlueSpacing20, BlueSpacing40 } from '../../components/BlueSpacing';

type NavigationProps = NativeStackNavigationProp<AddWalletStackParamList, 'AddWallet'>;

const NETWORK_OPTIONS: NeuraiNetwork[] = ['mainnet', 'testnet'];

const WalletsAdd: React.FC = () => {
  const { colors } = useTheme();
  const { addWallet, saveToDisk } = useStorage();
  const { navigate } = useExtendedNavigation<NavigationProps>();

  const [label, setLabel] = useState('');
  const [walletKind, setWalletKind] = useState<WalletKind>('legacy');
  // Always mainnet by default, whatever network the home screen is showing:
  // creating real-money wallets is the common case and testnet is a deliberate
  // choice.
  const [network, setNetwork] = useState<NeuraiNetwork>('mainnet');
  const [isLoading, setIsLoading] = useState(false);

  const stylesHook = {
    label: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
    root: {
      backgroundColor: colors.elevated,
    },
  };

  const createWallet = useCallback(async () => {
    Keyboard.dismiss();
    setIsLoading(true);
    try {
      // Generating and deriving hold the JS thread: let the loader show first.
      await untilLoaderPainted();
      const wallet = walletKind === 'pq' ? new NeuraiPQWallet() : walletKind === 'ecdsa' ? new NeuraiECDSAWallet() : new NeuraiHDWallet();
      wallet.setNetwork(chainFor(network, walletKind));
      wallet.setLabel(label.trim() || loc.wallets.details_title);
      wallet.generate();
      await wallet.prewarmEngine();
      addWallet(wallet);
      await saveToDisk();
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      navigate('PleaseBackup', { walletID: wallet.getID() });
    } catch (err: any) {
      presentAlert({ message: err?.message ?? String(err) });
    } finally {
      setIsLoading(false);
    }
  }, [walletKind, network, label, addWallet, saveToDisk, navigate]);

  const navigateToImportWallet = useCallback(() => navigate('ImportNeurai' as never), [navigate]);
  const navigateToHardwareWallet = useCallback(() => navigate('AddHardwareWallet' as never), [navigate]);

  const networkSegmentValues = NETWORK_OPTIONS.map(n =>
    n === 'mainnet' ? loc.wallets.neurai_network_mainnet : loc.wallets.neurai_network_testnet,
  );
  const selectedNetworkIndex = NETWORK_OPTIONS.indexOf(network);

  const onNetworkChange = useCallback((idx: number) => {
    const next = NETWORK_OPTIONS[idx];
    setNetwork(next);
    // ECDSA and PQ are not available on mainnet yet — bounce the kind back
    // to legacy if the user had one of them selected.
    setWalletKind(kind => (isKindAvailable(next, kind) ? kind : 'legacy'));
  }, []);

  return (
    <Animated.View layout={Layout.springify().damping(16).stiffness(180)} style={styles.flex1}>
      <SafeAreaScrollView style={stylesHook.root} testID="ScrollView" automaticallyAdjustKeyboardInsets>
        <BlueSpacing20 />
        <BlueFormLabel>{loc.wallets.add_wallet_name}</BlueFormLabel>
        <View style={[styles.label, stylesHook.label]}>
          <TextInput
            testID="WalletNameInput"
            value={label}
            placeholderTextColor="#81868e"
            placeholder={loc.wallets.add_placeholder}
            onChangeText={setLabel}
            style={styles.textInput}
            editable={!isLoading}
            underlineColorAndroid="transparent"
          />
        </View>

        <BlueFormLabel>{loc.wallets.add_wallet_type}</BlueFormLabel>
        <View style={styles.buttons}>
          <WalletButton
            buttonType="NeuraiLegacy"
            testID="ActivateNeuraiHDButton"
            active={walletKind === 'legacy'}
            onPress={() => setWalletKind('legacy')}
            size={styles.button}
          />
          <WalletButton
            buttonType="NeuraiECDSA"
            testID="ActivateNeuraiECDSAButton"
            active={walletKind === 'ecdsa'}
            disabled={!isKindAvailable(network, 'ecdsa')}
            onPress={() => setWalletKind('ecdsa')}
            size={styles.button}
          />
          <WalletButton
            buttonType="NeuraiPQ"
            testID="ActivateNeuraiPQButton"
            active={walletKind === 'pq'}
            disabled={!isKindAvailable(network, 'pq')}
            onPress={() => setWalletKind('pq')}
            size={styles.button}
          />
        </View>

        <BlueFormLabel>{loc.wallets.neurai_network_label}</BlueFormLabel>
        <View style={styles.networkRow}>
          <SegmentedControl values={networkSegmentValues} selectedIndex={selectedNetworkIndex} onChange={onNetworkChange} />
        </View>

        <View style={styles.advanced}>
          <BlueSpacing20 />
          {!isLoading ? (
            <>
              <Button testID="Create" title={loc.wallets.add_create} onPress={createWallet} />
              <BlueSpacing20 />
              <WalletButton
                buttonType="NeuraiHardware"
                testID="ConnectHardwareWallet"
                active={false}
                onPress={navigateToHardwareWallet}
                size={styles.button}
              />
              <BlueButtonLink
                testID="ImportWallet"
                style={styles.import}
                title={loc.wallets.add_import_wallet}
                onPress={navigateToImportWallet}
              />
              <BlueSpacing40 />
            </>
          ) : (
            <NeuraiLoader label={loc.wallets.add_creating} style={styles.loader} />
          )}
        </View>
      </SafeAreaScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  label: {
    flexDirection: 'row',
    borderWidth: 1,
    borderBottomWidth: 0.5,
    minHeight: 44,
    height: 44,
    marginHorizontal: 20,
    alignItems: 'center',
    marginVertical: 16,
    borderRadius: 4,
  },
  textInput: {
    flex: 1,
    marginHorizontal: 8,
    color: '#81868e',
  },
  buttons: {
    flexDirection: 'column',
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 0,
    minHeight: 100,
  },
  button: {
    width: '100%',
    height: 'auto',
  },
  networkRow: {
    marginHorizontal: 20,
    marginVertical: 12,
  },
  advanced: {
    marginHorizontal: 20,
  },
  import: {
    marginVertical: 24,
  },
  loader: {
    paddingVertical: 24,
  },
});

export default WalletsAdd;
