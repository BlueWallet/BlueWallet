import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';
import { ActivityIndicator, FlatList, LayoutAnimation, StyleSheet, View } from 'react-native';
import IdleTimerManager from 'react-native-idle-timer';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { BlueButtonLink, BlueFormLabel, BlueSpacing10, BlueSpacing20, BlueText } from '../../BlueComponents';
import { HDSegwitBech32Wallet, WatchOnlyWallet } from '../../class';
import startImport from '../../class/wallet-import';
import presentAlert from '../../components/Alert';
import Button from '../../components/Button';
import SafeArea from '../../components/SafeArea';
import { useTheme } from '../../components/themes';
import WalletToImport from '../../components/WalletToImport';
import prompt from '../../helpers/prompt';
import loc from '../../loc';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { useStorage } from '../../hooks/context/useStorage';
import { AddWalletStackParamList } from '../../navigation/AddWalletStack';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { THDWalletForWatchOnly, TWallet } from '../../class/wallets/types';
import { navigate } from '../../NavigationService';

type RouteProps = RouteProp<AddWalletStackParamList, 'ImportWalletDiscovery'>;
type NavigationProp = NativeStackNavigationProp<AddWalletStackParamList, 'ImportWalletDiscovery'>;

type TReturn = {
  cancelled?: boolean;
  stopped?: boolean;
  wallets: TWallet[];
};

type ImportTask = {
  promise: Promise<TReturn>;
  stop: () => void;
};

type WalletEntry = {
  wallet: TWallet | THDWalletForWatchOnly;
  subtitle: string;
  id: string;
};

const ImportWalletDiscovery: React.FC = () => {
  const navigation = useExtendedNavigation<NavigationProp>();
  const { colors } = useTheme();
  const route = useRoute<RouteProps>();
  const { importText, askPassphrase, searchAccounts } = route.params;
  const task = useRef<ImportTask | null>(null);
  const { addAndSaveWallet } = useStorage();
  const [loading, setLoading] = useState<boolean>(true);
  const [wallets, setWallets] = useState<WalletEntry[]>([]);
  const [password, setPassword] = useState<string | undefined>();
  const [selected, setSelected] = useState<number>(0);
  const [progress, setProgress] = useState<string | undefined>();
  const importing = useRef<boolean>(false);
  const bip39 = useMemo(() => {
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(importText);
    return hd.validateMnemonic();
  }, [importText]);

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
    center: {
      backgroundColor: colors.elevated,
    },
  });

  const saveWallet = useCallback(
    (wallet: TWallet | THDWalletForWatchOnly) => {
      if (importing.current) return;
      importing.current = true;
      addAndSaveWallet(wallet);
      navigate('WalletsList');
    },
    [addAndSaveWallet],
  );

  useEffect(() => {
    const onProgress = (data: string) => setProgress(data);

    const onWallet = (wallet: TWallet | THDWalletForWatchOnly) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const id = wallet.getID();
      let subtitle: string | undefined;

      try {
        // For watch-only wallets, display the descriptor or xpub
        if (wallet.type === WatchOnlyWallet.type) {
          if (wallet.isHd() && wallet.getSecret()) {
            subtitle = wallet.getSecret(); // Display descriptor
          } else {
            subtitle = wallet.getAddress(); // Display address
          }
        } else {
          subtitle = (wallet as THDWalletForWatchOnly).getDerivationPath?.();
        }
      } catch (e) {}

      setWallets(w => [...w, { wallet, subtitle: subtitle || '', id }]);
    };

    const onPassword = async (title: string, subtitle: string) => {
      try {
        const pass = await prompt(title, subtitle);
        setPassword(pass);
        return pass;
      } catch (e: any) {
        if (e.message === 'Cancel Pressed') {
          navigation.goBack();
        }
        throw e;
      }
    };

    IdleTimerManager.setIdleTimerDisabled(true);

    task.current = startImport(importText, askPassphrase, searchAccounts, onProgress, onWallet, onPassword);

    task.current.promise
      .then(({ cancelled, wallets: w }) => {
        if (cancelled) return;
        if (w.length === 1) saveWallet(w[0]); // Instantly save wallet if only one has been discovered
        if (w.length === 0) {
          triggerHapticFeedback(HapticFeedbackTypes.ImpactLight);
        }
      })
      .catch(e => {
        console.warn('import error', e);
        presentAlert({ title: 'Import error', message: e.message });
      })
      .finally(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setLoading(false);
        IdleTimerManager.setIdleTimerDisabled(false);
      });

    return () => {
      task.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCustomDerivation = () => {
    task.current?.stop();

    navigation.navigate('ImportCustomDerivationPath', { importText, password });
  };

  const renderItem = ({ item, index }: { item: WalletEntry; index: number }) => (
    <WalletToImport
      key={item.id}
      title={item.wallet.typeReadable}
      subtitle={item.subtitle}
      active={selected === index}
      onPress={() => {
        setSelected(index);
        triggerHapticFeedback(HapticFeedbackTypes.Selection);
      }}
    />
  );

  const keyExtractor = (w: WalletEntry) => w.id;

  const ListHeaderComponent = useMemo(
    () => (
      <>
        {wallets && wallets.length > 0 ? (
          <>
            <BlueSpacing20 />
            <BlueFormLabel>{loc.wallets.import_discovery_subtitle}</BlueFormLabel>
            <BlueSpacing10 />
          </>
        ) : null}
      </>
    ),
    [wallets],
  );

  const ListEmptyComponent = useMemo(
    () => (
      <View style={styles.noWallets}>
        <BlueText style={styles.center}>{loc.wallets.import_discovery_no_wallets}</BlueText>
        <BlueSpacing20 />
      </View>
    ),
    [],
  );

  return (
    <SafeArea style={[styles.root, stylesHook.root]}>
      <FlatList
        ListHeaderComponent={ListHeaderComponent}
        contentContainerStyle={styles.flatListContainer}
        data={wallets}
        ListEmptyComponent={ListEmptyComponent}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        automaticallyAdjustContentInsets
        contentInsetAdjustmentBehavior="always"
      />
      <View style={[styles.center, stylesHook.center]}>
        {loading && (
          <>
            <BlueSpacing10 />
            <ActivityIndicator testID="Loading" />
            <BlueSpacing10 />
            <BlueFormLabel>{progress}</BlueFormLabel>
            <BlueSpacing10 />
          </>
        )}
        {bip39 && (
          <BlueButtonLink
            title={loc.wallets.import_discovery_derivation}
            testID="CustomDerivationPathButton"
            onPress={handleCustomDerivation}
          />
        )}
        <BlueSpacing10 />
        <View style={styles.buttonContainer}>
          <Button
            disabled={wallets?.length === 0}
            title={loc.wallets.import_do_import}
            onPress={() => {
              if (wallets.length === 0) return;
              saveWallet(wallets[selected].wallet);
            }}
          />
        </View>
      </View>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flatListContainer: {
    marginHorizontal: 16,
  },
  center: {
    marginHorizontal: 16,
    alignItems: 'center',
  },
  buttonContainer: {
    height: 45,
    marginBottom: 16,
  },
  noWallets: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ImportWalletDiscovery;
