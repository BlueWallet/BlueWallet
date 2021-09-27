import React, { useContext, useEffect, useState, useRef, useMemo } from 'react';
import { ActivityIndicator, Alert, LayoutAnimation, StatusBar, StyleSheet, Text, View, FlatList } from 'react-native';
import IdleTimerManager from 'react-native-idle-timer';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { BlueButton, BlueButtonLink, BlueFormLabel, BlueSpacing10, BlueSpacing20, SafeBlueArea } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import WalletToImport from '../../components/WalletToImport';
import loc from '../../loc';
import { HDSegwitBech32Wallet } from '../../class';
import startImport from '../../class/wallet-import';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import prompt from '../../blue_modules/prompt';

const ImportWalletDiscovery = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const route = useRoute();
  const { importText, askPassphrase, searchAccounts } = route.params;
  const task = useRef();
  const { addAndSaveWallet } = useContext(BlueStorageContext);
  const [loading, setLoading] = useState(true);
  const [wallets, setWallets] = useState([]);
  const [password, setPassword] = useState();
  const [selected, setSelected] = useState(0);
  const [progress, setProgress] = useState();
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

  const saveWallet = wallet => {
    if (importing.current) return;
    importing.current = true;
    addAndSaveWallet(wallet);
    navigation.dangerouslyGetParent().pop();
  };

  useEffect(() => {
    const onProgress = data => setProgress(data);

    const onWallet = wallet => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const id = wallet.getID();
      let subtitle;
      try {
        subtitle = wallet.getDerivationPath?.();
      } catch (e) {}
      setWallets(wallets => [...wallets, { wallet, subtitle, id }]);
    };

    const onPassword = async (title, subtitle) => {
      try {
        const pass = await prompt(title, subtitle);
        setPassword(pass);
        return pass;
      } catch (e) {
        if (e.message === 'Cancel Pressed') {
          navigation.goBack();
        }
        throw e;
      }
    };

    IdleTimerManager.setIdleTimerDisabled(true);

    task.current = startImport(importText, askPassphrase, searchAccounts, onProgress, onWallet, onPassword);

    task.current.promise
      .then(({ cancelled, wallets }) => {
        if (cancelled) return;
        if (wallets.length === 1) saveWallet(wallets[0]); // instantly save wallet if only one has been discovered
        if (wallets.length === 0) {
          ReactNativeHapticFeedback.trigger('impactLight', { ignoreAndroidSystemSettings: false });
        }
      })
      .catch(e => {
        console.warn('import error', e);
        Alert.alert('import error', e.message);
      })
      .finally(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setLoading(false);
        IdleTimerManager.setIdleTimerDisabled(false);
      });

    return () => task.current.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCustomDerivation = () => {
    task.current.stop();
    navigation.navigate('ImportCustomDerivationPath', { importText, password });
  };

  const renderItem = ({ item, index }) => (
    <WalletToImport
      key={item.id}
      title={item.wallet.typeReadable}
      subtitle={item.subtitle}
      active={selected === index}
      onPress={() => {
        setSelected(index);
        ReactNativeHapticFeedback.trigger('selection', { ignoreAndroidSystemSettings: false });
      }}
    />
  );

  const keyExtractor = w => w.id;

  return (
    <SafeBlueArea style={[styles.root, stylesHook.root]}>
      <StatusBar barStyle="light-content" />
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
            <Text>{progress}</Text>
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
          <BlueButton
            disabled={wallets.length === 0}
            title={loc.wallets.import_do_import}
            onPress={() => saveWallet(wallets[selected].wallet)}
          />
        </View>
      </View>
    </SafeBlueArea>
  );
};

const styles = StyleSheet.create({
  root: {
    paddingTop: 40,
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
  },
  noWallets: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

ImportWalletDiscovery.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.wallets.import_discovery_title }));

export default ImportWalletDiscovery;
