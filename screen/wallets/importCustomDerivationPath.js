import React, { useContext, useEffect, useState, useRef, useMemo } from 'react';
import { FlatList, StatusBar, StyleSheet, TextInput, View } from 'react-native';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';

import { BlueButton, BlueFormLabel, BlueSpacing20, BlueTextCentered, SafeBlueArea } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import WalletToImport from '../../components/WalletToImport';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { HDLegacyP2PKHWallet, HDSegwitP2SHWallet, HDSegwitBech32Wallet } from '../../class';
import { validateBip32 } from '../../class/wallet-import';
import debounce from '../../blue_modules/debounce';

const WRONG_PATH = 'WRONG_PATH';
const WALLET_FOUND = 'WALLET_FOUND';
const WALLET_NOTFOUND = 'WALLET_NOTFOUND';
const WALLET_UNKNOWN = 'WALLET_UNKNOWN';

const ImportCustomDerivationPath = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const route = useRoute();
  const importText = route.params.importText;
  const password = route.params.password;
  const { addAndSaveWallet } = useContext(BlueStorageContext);
  const [path, setPath] = useState("m/84'/0'/0'");
  const [wallets, setWallets] = useState({});
  const [used, setUsed] = useState({});
  const [selected, setSelected] = useState();
  const importing = useRef(false);

  const debouncedSavePath = useRef(
    debounce(async path => {
      if (!validateBip32(path)) {
        setWallets(ws => ({ ...ws, [path]: WRONG_PATH }));
        return;
      }

      // create wallets
      const wallets = {};
      for (const Wallet of [HDLegacyP2PKHWallet, HDSegwitP2SHWallet, HDSegwitBech32Wallet]) {
        const wallet = new Wallet();
        wallet.setSecret(importText);
        wallet.setPassphrase(password);
        wallet.setDerivationPath(path);
        wallets[Wallet.type] = wallet;
      }
      setWallets(ws => ({ ...ws, [path]: wallets }));

      // discover was they ever used
      const res = {};
      const promises = Object.values(wallets).map(w => w.wasEverUsed().then(v => (res[w.type] = v ? WALLET_FOUND : WALLET_NOTFOUND)));
      try {
        await Promise.all(promises); // wait for all promises to be resolved
      } catch (e) {
        Object.values(wallets).forEach(w => (res[w.type] = WALLET_UNKNOWN));
      }
      setUsed(u => ({ ...u, [path]: res }));
    }, 500),
  );
  useEffect(() => {
    if (path in wallets) return;
    debouncedSavePath.current(path);
  }, [path, wallets]);

  const items = useMemo(() => {
    if (wallets[path] === WRONG_PATH) return [];
    return [
      [HDLegacyP2PKHWallet.type, HDLegacyP2PKHWallet.typeReadable, used[path]?.[HDLegacyP2PKHWallet.type]],
      [HDSegwitP2SHWallet.type, HDSegwitP2SHWallet.typeReadable, used[path]?.[HDSegwitP2SHWallet.type]],
      [HDSegwitBech32Wallet.type, HDSegwitBech32Wallet.typeReadable, used[path]?.[HDSegwitBech32Wallet.type]],
    ];
  }, [path, used, wallets]);

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
    center: {
      backgroundColor: colors.elevated,
    },
    pathInput: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
  });

  const saveWallet = type => {
    if (importing.current) return;
    importing.current = true;
    const wallet = wallets[path][type];
    addAndSaveWallet(wallet);
    navigation.dangerouslyGetParent().pop();
  };

  const renderItem = ({ item }) => {
    const [type, title, found] = item;
    let subtitle;
    switch (found) {
      case WALLET_FOUND:
        subtitle = loc.wallets.import_derivation_found;
        break;
      case WALLET_NOTFOUND:
        subtitle = loc.wallets.import_derivation_found_not;
        break;
      case WALLET_UNKNOWN:
        subtitle = loc.wallets.import_derivation_unknown;
        break;
      default:
        subtitle = loc.wallets.import_derivation_loading;
    }

    return <WalletToImport key={type} title={title} subtitle={subtitle} active={selected === type} onPress={() => setSelected(type)} />;
  };

  return (
    <SafeBlueArea style={[styles.root, stylesHook.root]}>
      <StatusBar barStyle="light-content" />
      <BlueSpacing20 />
      <BlueFormLabel>{loc.wallets.import_derivation_subtitle}</BlueFormLabel>
      <BlueSpacing20 />
      <TextInput
        testID="DerivationPathInput"
        placeholder={loc.send.details_note_placeholder}
        value={path}
        placeholderTextColor="#81868e"
        style={[styles.pathInput, stylesHook.pathInput]}
        onChangeText={setPath}
      />
      <FlatList
        data={items}
        keyExtractor={w => path + w[0]}
        renderItem={renderItem}
        contentContainerStyle={styles.flatListContainer}
        ListEmptyComponent={() => <BlueTextCentered>{loc.wallets.import_wrong_path}</BlueTextCentered>}
      />

      <View style={[styles.center, stylesHook.center]}>
        <View style={styles.buttonContainer}>
          <BlueButton
            disabled={wallets[path]?.[selected] === undefined}
            title={loc.wallets.import_do_import}
            testID="ImportButton"
            onPress={() => saveWallet(selected)}
          />
        </View>
      </View>
    </SafeBlueArea>
  );
};

const styles = StyleSheet.create({
  root: {
    paddingTop: 10,
  },
  flatListContainer: {
    marginHorizontal: 16,
  },
  listContainer: {
    minHeight: 100,
  },
  center: {
    marginHorizontal: 16,
    alignItems: 'center',
  },
  buttonContainer: {
    height: 45,
  },
  pathInput: {
    flexDirection: 'row',
    borderWidth: 1,
    borderBottomWidth: 0.5,
    marginHorizontal: 16,
    minHeight: 44,
    height: 44,
    alignItems: 'center',
    marginVertical: 8,
    borderRadius: 4,
    paddingHorizontal: 8,
    color: '#81868e',
  },
});

ImportCustomDerivationPath.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.wallets.import_derivation_title }));

export default ImportCustomDerivationPath;
