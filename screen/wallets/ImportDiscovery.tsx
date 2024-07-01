import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRoute } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, FlatList, LayoutAnimation, StyleSheet, View } from 'react-native';
import IdleTimerManager from 'react-native-idle-timer';

import { BlueButtonLink, BlueFormLabel, BlueSpacing10, BlueSpacing20 } from '../../BlueComponents';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { HDSegwitBech32Wallet } from '../../class';
import startImport, { TImport } from '../../class/wallet-import';
import { TWallet } from '../../class/wallets/types';
import presentAlert from '../../components/Alert';
import Button from '../../components/Button';
import SafeArea from '../../components/SafeArea';
import WalletToImport from '../../components/WalletToImport';
import { useTheme } from '../../components/themes';
import prompt from '../../helpers/prompt';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { AddWalletStackParamList } from '../../typings/NavigationTypes';

type TWalletToImport = {
  wallet: TWallet;
  subtitle: string;
  id: string;
};

type Props = NativeStackScreenProps<AddWalletStackParamList, 'ImportWalletDiscovery'>;

const ImportWalletDiscovery = () => {
  const navigation = useExtendedNavigation();
  const route: Props['route'] = useRoute();
  const { importText, askPassphrase, searchAccounts } = route.params;
  const { colors } = useTheme();
  const task = useRef<TImport>();
  const { addAndSaveWallet } = useStorage();
  const [loading, setLoading] = useState(true);
  const [wallets, setWallets] = useState<TWalletToImport[]>([]);
  const [password, setPassword] = useState<string>('');
  const [selected, setSelected] = useState(0);
  const [progress, setProgress] = useState<string>('');
  const importing = useRef(false);
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

  const saveWallet = (wallet: TWallet) => {
    if (importing.current) return;
    importing.current = true;
    addAndSaveWallet(wallet);
    // @ts-ignore: this is actyally works fine
    navigation.getParent()?.pop();
  };

  useEffect(() => {
    const onProgress = (data: string) => setProgress(data);

    const onWallet = (wallet: TWallet) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const id = wallet.getID();
      let subtitle: string = '';
      try {
        subtitle = ('getDerivationPath' in wallet && wallet.getDerivationPath()) || '';
      } catch (e) {}
      setWallets(w => [...w, { wallet, subtitle, id }]);
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
        if (w.length === 1) saveWallet(w[0]); // instantly save wallet if only one has been discovered
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

    return () => task.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCustomDerivation = () => {
    task.current?.stop();
    navigation.navigate('ImportCustomDerivationPath', { importText, password });
  };

  const renderItem = ({ item, index }: { item: TWalletToImport; index: number }) => (
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

  const keyExtractor = (w: TWalletToImport) => w.id;

  return (
    <SafeArea style={[styles.root, stylesHook.root]}>
      <BlueSpacing20 />
      <BlueFormLabel>{loc.wallets.import_discovery_subtitle}</BlueFormLabel>
      <BlueSpacing20 />

      {!loading && wallets.length === 0 ? (
        <View style={styles.noWallets}>
          <BlueFormLabel>{loc.wallets.import_discovery_no_wallets}</BlueFormLabel>
        </View>
      ) : (
        <FlatList contentContainerStyle={styles.flatListContainer} data={wallets} keyExtractor={keyExtractor} renderItem={renderItem} />
      )}

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
            disabled={wallets.length === 0}
            title={loc.wallets.import_do_import}
            onPress={() => saveWallet(wallets[selected].wallet)}
          />
        </View>
      </View>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  root: {
    paddingTop: 40,
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
