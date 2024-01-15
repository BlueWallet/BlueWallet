import React, { useContext, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../components/themes';

import loc from '../../loc';
import { BlueFormLabel, BlueFormMultiInput, BlueSpacing20, SafeBlueArea } from '../../BlueComponents';
import Button from '../../components/Button';
import navigationStyle from '../../components/navigationStyle';
import { BlueStorageContext } from '../../blue_modules/storage-context';

import { getShuffledEntropyWords } from '../../class/borderwallet-entropy-grid';

import alert from '../../components/Alert';

import { validateMnemonic } from '../../blue_modules/bip39';

import * as bip39 from 'bip39';

const ImportBorder = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [importText, setImportText] = useState<string>();
  const [import2Text, setImport2Text] = useState<string>();
  const { sleep } = useContext(BlueStorageContext);

  const { walletID } = useRoute().params as {
    walletID: string;
  };

  const styles = StyleSheet.create({
    root: {
      paddingTop: 40,
      backgroundColor: colors.elevated,
    },
    center: {
      marginHorizontal: 16,
    },
  });

  const importMnemonic = async () => {
    setLoading(true);
    await sleep(100);
    if (importText !== undefined && validateMnemonic(importText)) {
      navigation.navigate('WalletsAddBorderStep2', {
        walletLabel: loc.wallets.details_title,
        words: getShuffledEntropyWords(importText),
        importing: true,
        walletID,
      });
    } else {
      alert(loc.border.invalid_mnemonic);
    }
    setLoading(false);
    return true;
  };

  const importPDF = async () => {
    if (import2Text === undefined) return;
    const imports = import2Text.split(' ');
    if (imports.length !== 11 && imports.length !== 23) return;

    const wordList = bip39.wordlists[bip39.getDefaultWordlist()];

    const words = new Array(imports.length);
    for (let j = 0; j < wordList.length; j++) {
      const word = wordList[j];
      for (let i = 0; i < imports.length; i++) {
        if (word.startsWith(imports[i])) {
          words[i] = word;
          continue;
        }
      }
    }

    for (let i = 0; i < words.length; i++) {
      if (wordList.indexOf(words[i]) === -1) return;
    }

    navigation.navigate('WalletsAddBorderFinalWord', {
      walletLabel: loc.wallets.details_title,
      seedPhrase: words,
      importing: true,
      walletID,
    });
  };

  return (
    <SafeBlueArea style={styles.root}>
      <BlueFormLabel>{loc.border.enter_grid_mnemonic}</BlueFormLabel>
      <BlueFormMultiInput value={importText} onChangeText={setImportText} />
      <BlueSpacing20 />
      <View style={styles.center}>
        {loading ? <ActivityIndicator /> : <Button title={loc.border.import} onPress={importMnemonic} />}
      </View>
      <BlueSpacing20 />
      <BlueFormLabel>{loc.border.or}</BlueFormLabel>
      <BlueSpacing20 />
      <BlueFormLabel>{loc.border.from_pdf}</BlueFormLabel>
      <BlueFormMultiInput value={import2Text} onChangeText={setImport2Text} />
      <BlueSpacing20 />
      <View style={styles.center}>{loading ? <ActivityIndicator /> : <Button title={loc.border.import} onPress={importPDF} />}</View>
      <BlueSpacing20 />
    </SafeBlueArea>
  );
};

ImportBorder.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.wallets.import_title }));

export default ImportBorder;
