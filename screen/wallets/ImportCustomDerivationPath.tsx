import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import debounce from '../../blue_modules/debounce';
import { BlueFormLabel, BlueSpacing20, BlueTextCentered } from '../../BlueComponents';
import { HDLegacyP2PKHWallet, HDSegwitBech32Wallet, HDSegwitP2SHWallet } from '../../class';
import { validateBip32 } from '../../class/wallet-import';
import { TWallet } from '../../class/wallets/types';
import Button from '../../components/Button';
import SafeArea from '../../components/SafeArea';
import { useTheme } from '../../components/themes';
import WalletToImport from '../../components/WalletToImport';
import { useStorage } from '../../hooks/context/useStorage';
import loc from '../../loc';
import { AddWalletStackParamList } from '../../navigation/AddWalletStack';
import { useSettings } from '../../hooks/context/useSettings';

type RouteProps = RouteProp<AddWalletStackParamList, 'ImportCustomDerivationPath'>;
type NavigationProp = NativeStackNavigationProp<AddWalletStackParamList, 'ImportCustomDerivationPath'>;

const ListEmptyComponent: React.FC = () => <BlueTextCentered>{loc.wallets.import_wrong_path}</BlueTextCentered>;

const WRONG_PATH = 'WRONG_PATH';
enum STATUS {
  WALLET_FOUND = 'WALLET_FOUND',
  WALLET_NOTFOUND = 'WALLET_NOTFOUND',
  WALLET_UNKNOWN = 'WALLET_UNKNOWN',
}
type TWalletsByType = { [type: string]: TWallet };
type TWalletsByPath = { [path: string]: TWalletsByType | 'WRONG_PATH' };

type TUsedByType = { [type: string]: STATUS };
type TUsedByPath = { [path: string]: TUsedByType };

type TItem = [type: string, typeReadable: string, STATUS | undefined];

const ImportCustomDerivationPath: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const { importText, password } = useRoute<RouteProps>().params;
  const { addAndSaveWallet } = useStorage();
  const [path, setPath] = useState<string>("m/84'/0'/0'");
  const [wallets, setWallets] = useState<TWalletsByPath>({});
  const [used, setUsed] = useState<TUsedByPath>({});
  const [selected, setSelected] = useState<string>('');
  const importing = useRef(false);
  const { isElectrumDisabled } = useSettings();

  const debouncedSavePath = useRef(
    debounce(async newPath => {
      if (!validateBip32(newPath)) {
        setWallets(ws => ({ ...ws, [newPath]: WRONG_PATH }));
        return;
      }

      // create wallets
      const newWallets: { [type: string]: TWallet } = {};
      for (const Wallet of [HDLegacyP2PKHWallet, HDSegwitP2SHWallet, HDSegwitBech32Wallet]) {
        const wallet = new Wallet();
        wallet.setSecret(importText);
        if (password) {
          wallet.setPassphrase(password);
        }
        wallet.setDerivationPath(newPath);
        newWallets[Wallet.type] = wallet;
      }
      setWallets(ws => ({ ...ws, [newPath]: newWallets }));

      if (isElectrumDisabled) {
        // do not check if electrum is disabled
        Object.values(newWallets).forEach(w => {
          setUsed(u => ({ ...u, [newPath]: { ...u[newPath], [w.type]: STATUS.WALLET_UNKNOWN } }));
        });
        return;
      }

      // discover was they ever used
      const promises = Object.values(newWallets).map(w => {
        return w.wasEverUsed().then(v => {
          const status = v ? STATUS.WALLET_FOUND : STATUS.WALLET_NOTFOUND;
          setUsed(u => ({ ...u, [newPath]: { ...u[newPath], [w.type]: status } }));
        });
      });
      try {
        await Promise.all(promises);
      } catch (e) {
        Object.values(newWallets).forEach(w => {
          setUsed(u => ({ ...u, [newPath]: { ...u[newPath], [w.type]: STATUS.WALLET_UNKNOWN } }));
        });
      }
    }, 500),
  );

  useEffect(() => {
    if (path in wallets) return;
    debouncedSavePath.current(path);
  }, [path, wallets]);

  const items: TItem[] = useMemo(() => {
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

  const saveWallet = (type: string) => {
    if (importing.current) return;
    importing.current = true;
    if (wallets[path] === WRONG_PATH) return;
    addAndSaveWallet(wallets[path][type]);
    // @ts-ignore: Navigation
    navigation.getParent().pop();
  };

  const renderItem = ({ item }: { item: TItem }) => {
    const [type, title, found] = item;
    let subtitle;
    switch (found) {
      case STATUS.WALLET_FOUND:
        subtitle = loc.wallets.import_derivation_found;
        break;
      case STATUS.WALLET_NOTFOUND:
        subtitle = loc.wallets.import_derivation_found_not;
        break;
      case STATUS.WALLET_UNKNOWN:
        subtitle = loc.wallets.import_derivation_unknown;
        break;
      default:
        subtitle = loc.wallets.import_derivation_loading;
    }

    return <WalletToImport key={type} title={title} subtitle={subtitle} active={selected === type} onPress={() => setSelected(type)} />;
  };

  const disabled = wallets[path] === WRONG_PATH || wallets[path]?.[selected] === undefined;

  return (
    <SafeArea style={[styles.root, stylesHook.root]}>
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
        ListEmptyComponent={ListEmptyComponent}
      />

      <View style={[styles.center, stylesHook.center]}>
        <View style={styles.buttonContainer}>
          <Button disabled={disabled} title={loc.wallets.import_do_import} testID="ImportButton" onPress={() => saveWallet(selected)} />
        </View>
      </View>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  root: {
    paddingTop: 10,
  },
  flatListContainer: {
    marginHorizontal: 16,
  },
  center: {
    marginHorizontal: 16,
    alignItems: 'center',
    top: -100,
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

export default ImportCustomDerivationPath;
