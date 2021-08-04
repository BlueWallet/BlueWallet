import React, { useContext, useEffect, useState, useRef, useMemo } from 'react';
import { StatusBar, StyleSheet, TextInput, View, FlatList } from 'react-native';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';

import { BlueButton, BlueFormLabel, BlueSpacing20, SafeBlueArea } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import WalletToImport from '../../components/WalletToImport';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { HDLegacyP2PKHWallet, HDSegwitP2SHWallet, HDSegwitBech32Wallet } from '../../class';
import { discoverBIP39WithCustomDerivationPath } from '../../class/wallet-import';
import debounce from '../../blue_modules/debounce';

const ImportCustomDerivationPath = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const route = useRoute();
  const importText = route.params.importText;
  const passphrase = route.params.passphrase;
  const { addAndSaveWallet } = useContext(BlueStorageContext);
  const [path, setPath] = useState("m/84'/0'/0'");
  const [wallets, setWallets] = useState({});
  const [selected, setSelected] = useState(0);
  const importing = useRef(false);

  // save on form change. Because effect called on each event, debounce it.
  const debouncedSaveMemo = useRef(
    debounce(async path => {
      let res;
      try {
        res = await discoverBIP39WithCustomDerivationPath(importText, passphrase, path);
      } catch (e) {
        if (e.message === 'Wrong bip32 derivation path') return;
        throw e;
      }
      setWallets(ws => ({ ...ws, [path]: res }));
    }, 500),
  );
  useEffect(() => {
    if (path in wallets) return;
    debouncedSaveMemo.current(path);
  }, [path, wallets]);

  const items = useMemo(() => {
    return [
      [HDLegacyP2PKHWallet.type, HDLegacyP2PKHWallet.typeReadable, wallets[path]?.[HDLegacyP2PKHWallet.type]?.found],
      [HDSegwitP2SHWallet.type, HDSegwitP2SHWallet.typeReadable, wallets[path]?.[HDSegwitP2SHWallet.type]?.found],
      [HDSegwitBech32Wallet.type, HDSegwitBech32Wallet.typeReadable, wallets[path]?.[HDSegwitBech32Wallet.type]?.found],
    ];
  }, [wallets, path]);

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
    const wallet = wallets[path][type].wallet;
    addAndSaveWallet(wallet);
    navigation.dangerouslyGetParent().pop();
  };

  const renderItem = ({ item }) => {
    const [type, title, found] = item;
    let subtitle;
    switch (found) {
      case true:
        subtitle = loc.wallets.import_derivation_found;
        break;
      case false:
        subtitle = loc.wallets.import_derivation_found_not;
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

      <FlatList data={items} keyExtractor={w => w[0]} renderItem={renderItem} />

      <View style={[styles.center, stylesHook.center]}>
        <View style={styles.buttonContainer}>
          <BlueButton
            disabled={wallets.length === 0}
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
    paddingTop: 40,
    marginHorizontal: 16,
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
