import React, { useContext, useState } from 'react';
import { Alert, View, StatusBar, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';

import { HDSegwitBech32Wallet, WatchOnlyWallet } from '../../class';
import loc from '../../loc';
import { BlueButton, BlueFormLabel, BlueFormMultiInput, BlueSpacing20, SafeBlueArea } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import { BlueStorageContext } from '../../blue_modules/storage-context';

import { getShuffledEntropyWords } from '../../class/borderwallet-entropy-grid';

import alert from '../../components/Alert';

import DocumentPicker from 'react-native-document-picker';

import { validateMnemonic } from '../../blue_modules/bip39';

const ImportBorder = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [importText, setImportText] = useState();
  const [walletType, setWalletType] = useState();
  const { addAndSaveWallet, sleep } = useContext(BlueStorageContext);

  const styles = StyleSheet.create({
    root: {
      paddingTop: 40,
      backgroundColor: colors.elevated,
    },
    center: {
	  flex: 1,
      marginHorizontal: 16,
      backgroundColor: colors.elevated,
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
		navigation.navigate('WalletsAddBorderStep2', { walletLabel: loc.wallets.details_title, words: getShuffledEntropyWords(importText), importing: true });
	} else {
		alert("Invalid mnemonic!");
	}
	setLoading(false);
    return true;
  };
  
  const importPDF = async () => {
	const pickerResult = await DocumentPicker.pickSingle({
	  presentationStyle: 'fullScreen',
	  copyTo: 'cachesDirectory',
	});
	let fileLoc = pickerResult.fileCopyUri;
	
	//TODO read pdf text and etc
	
  };

  return (
    <SafeBlueArea style={styles.root}>
      <BlueFormLabel>{"Enter Border Wallet entropy grid mnemonic:"}</BlueFormLabel>
      <BlueSpacing20 />
      <BlueFormMultiInput value={importText} onChangeText={setImportText} />
	  <BlueSpacing20 />
      <View style={styles.center}>
		{loading ? <ActivityIndicator /> : <BlueButton title="Import" onPress={importMnemonic} />}
		<BlueSpacing20 />
		<BlueSpacing20 />
		<BlueFormLabel>{"OR"}</BlueFormLabel>
		<BlueSpacing20 />
		<BlueSpacing20 />
        {loading ? <ActivityIndicator /> : <BlueButton title="Load Entropy Grid PDF" onPress={importPDF} />}
	  </View>
      <BlueSpacing20 />
    </SafeBlueArea>
  );
};

ImportBorder.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.wallets.import_title }));

export default ImportBorder;
