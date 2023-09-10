import React, { useContext, useState } from 'react';
import { Alert, View, StatusBar, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { useNavigation, useTheme, useRoute } from '@react-navigation/native';

import { HDSegwitBech32Wallet, WatchOnlyWallet } from '../../class';
import loc from '../../loc';
import { BlueButton, BlueFormLabel, BlueFormMultiInput, BlueSpacing20, SafeBlueArea } from '../../BlueComponents';
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
  const [importText, setImportText] = useState();
  const [import2Text, setImport2Text] = useState();
  const [walletType, setWalletType] = useState();
  const { addAndSaveWallet, sleep } = useContext(BlueStorageContext);

  const { walletID } = useRoute().params;

  const styles = StyleSheet.create({
    root: {
      paddingTop: 40,
      backgroundColor: colors.elevated,
    },
    center: {
      marginHorizontal: 16,
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
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
  });

  const importMnemonic = async () => {
    setLoading(true);
	await sleep(100);
	if (validateMnemonic(importText)) {
		navigation.navigate('WalletsAddBorderStep2', { walletLabel: loc.wallets.details_title, words: getShuffledEntropyWords(importText), importing: true, walletID: walletID });
	} else {
		alert("Invalid mnemonic!");
	}
	setLoading(false);
    return true;
  };
  
  const importPDF = async () => {
	
	let imports = import2Text.split(" ");
	if (imports.length != 11 && imports.length != 23) return;
	
	let wordList = bip39.wordlists[bip39.getDefaultWordlist()];
	
	let words = new Array(imports.length);
	outer: for (let i = 0; i < imports.length; i++) {
		
		for (let j = 0; j < wordList.length; j++) {
			let word = wordList[j];
			if (word.startsWith(imports[i])) {
				words[i] = word;
				continue outer;
			}
		}
		
		return;
		
	}
	
	navigation.navigate('WalletsAddBorderFinalWord', { walletLabel: loc.wallets.details_title, seedPhrase: words, importing: true, walletID: walletID });
	
  };

  return (
    <SafeBlueArea style={styles.root}>
      <BlueFormLabel>{"Enter Border Wallet entropy grid mnemonic:"}</BlueFormLabel>
      <BlueFormMultiInput value={importText} onChangeText={setImportText} />
	  <BlueSpacing20 />
	  <View style={styles.center}>
	  {loading ? <ActivityIndicator /> : <BlueButton title="Import" onPress={importMnemonic} />}
	  </View>
		<BlueSpacing20 />
		<BlueFormLabel>{"OR"}</BlueFormLabel>
		<BlueSpacing20 />
		<BlueFormLabel>{"From your saved PDF, enter the contents of the 11 or 23 boxes, in order, that form your pattern:"}</BlueFormLabel>
		<BlueFormMultiInput value={import2Text} onChangeText={setImport2Text} />
		<BlueSpacing20 />
	  <View style={styles.center}>
	  {loading ? <ActivityIndicator /> : <BlueButton title="Import" onPress={importPDF} />}
	  </View>
      <BlueSpacing20 />
    </SafeBlueArea>
  );
};

ImportBorder.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.wallets.import_title }));

export default ImportBorder;
