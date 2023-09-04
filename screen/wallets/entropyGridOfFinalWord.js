import React, { useState, useContext, useEffect } from 'react';
import { useRoute, useTheme, useNavigation } from '@react-navigation/native';
import { Alert, View, Text, TextInput, StyleSheet, I18nManager } from 'react-native';
import { AutoComplete } from 'react-native-element-textinput';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import navigationStyle from '../../components/navigationStyle';
import loc from '../../loc';
import { SafeBlueArea, BlueButton } from '../../BlueComponents';
import { wordList, getFinalWordNumber, generateFinalWord } from '../../class/border-wallet-grid';
import { PageTypes } from './entropyGrid';

const EntropyGridOfFinalWord = () => {
  const { goBack, dangerouslyGetParent, navigate } = useNavigation();
  const { addWallet, saveToDisk } = useContext(BlueStorageContext);
  const { wallet, patternWords, pageType } = useRoute().params;
  const [seedValues, setSeedValues] = useState([]);
  const [finalWordNumber, setFinalWordNumber] = useState('');
  const [finalWord, setFinalWord] = useState('');
  const { colors } = useTheme();
  const stylesHook = StyleSheet.create({
    flex: {
      backgroundColor: colors.elevated,
    },
    subtitle: {
      color: colors.foregroundColor,
    },
  });
  const walletSeedNum = patternWords.length + 1;
  const numberPerCol = walletSeedNum / 2;
  const validRange4FinalWordNumber = {
    12: [1, 128],
    24: [1, 8],
  };

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const init = async () => {
    let checksum = '';

    if (pageType === PageTypes.CREATE) {
      const finalwordNum = await getFinalWordNumber(walletSeedNum);
      setFinalWordNumber(finalwordNum.toString());
      const { checksum: fw, error } = await generateFinalWord(patternWords, finalwordNum);
      if (error) {
        showWarning(error);
      } else {
        checksum = fw;
      }
    }

    setSeedValues([...patternWords, checksum]);
    setFinalWord(checksum);
  };

  const showWarning = msg => Alert.alert(loc.entropy_grid.warning, msg);

  const handleCancelButton = () => {
    goBack();
  };

  const handleOKButton = async () => {
    if (seedValues.every(x => wordList.includes(x))) {
      const mnemonic = seedValues.join(' ');

      if (pageType === PageTypes.IMPORT) {
        navigate('ImportWalletDiscovery', { importText: mnemonic, askPassphrase: false, searchAccounts: false });
      } else if (pageType === PageTypes.CHECK) {
        if (mnemonic === wallet.secret) {
          Alert.alert(loc.entropy_grid.success, loc.entropy_grid.check_mnemonic_valid);
          dangerouslyGetParent().pop();
        } else {
          Alert.alert(loc.entropy_grid.failed, loc.entropy_grid.check_mnemonic_invalid);
        }
      } else {
        wallet.setSecret(mnemonic);
        addWallet(wallet);
        await saveToDisk();
        dangerouslyGetParent().pop();
      }
    } else {
      showWarning(loc.entropy_grid.final_word_not_include_bip39);
    }
  };

  const handleChangeFWN = async val => {
    if (!val.trim()) {
      setFinalWordNumber('');
      return;
    }

    // first valid number
    let error;
    let b = Number(val);

    if (isNaN(b)) {
      error = loc.entropy_grid.final_word_valid_type_error;
    } else {
      const range = validRange4FinalWordNumber[walletSeedNum];
      if (!(b >= range[0] && b <= range[1])) {
        error = loc.formatString(loc.entropy_grid.final_word_valid_range_error, { min: range[0], max: range[1] });
      }
    }

    if (!error) {
      setFinalWordNumber(val);
    } else {
      b = await getFinalWordNumber(walletSeedNum);
      setFinalWordNumber(b.toString());
      showWarning(error);
    }

    const { checksum, error: ef } = await generateFinalWord(seedValues.slice(0, -1), b);
    if (ef) {
      showWarning(ef);
    } else {
      seedValues[seedValues.length - 1] = checksum;
      setFinalWord(checksum);
    }
  };

  const handleChangeRestWords = async (word, idx) => {
    seedValues[idx] = word;
    if (seedValues.slice(0, -1).every(x => x && wordList.includes(x))) {
      const { checksum, error } = await generateFinalWord(seedValues.slice(0, -1), +finalWordNumber);
      if (error) {
        showWarning(error);
      } else {
        seedValues[seedValues.length - 1] = checksum;
        setFinalWord(checksum);
      }
    }
  };

  return (
    <SafeBlueArea style={stylesHook.flex}>
      <View style={styles.please}>
        <Text style={[styles.subtitle, stylesHook.subtitle]}>
          {loc.formatString(loc.entropy_grid.final_word_subtitle, { walletSeedNum: walletSeedNum - 1 })}
        </Text>
      </View>
      <View style={styles.container}>
        {[0, 1].map(x => (
          <View key={x} style={styles.column}>
            {Array(numberPerCol)
              .fill(undefined)
              .map((_, i) => {
                const idx = x * numberPerCol + i;
                const isReadOnly = numberPerCol === 6 ? idx === 11 : idx === 23;
                return (
                  <AutoComplete
                    key={idx}
                    value={isReadOnly ? finalWord : seedValues[idx]}
                    data={wordList}
                    style={styles.autoInput}
                    inputStyle={styles.inputStyle}
                    labelStyle={styles.labelStyle}
                    placeholderStyle={styles.placeholderStyle}
                    textErrorStyle={styles.textErrorStyle}
                    placeholder={`${idx + 1}. ${isReadOnly ? 'checksum' : ''}`}
                    placeholderTextColor="#666"
                    onChangeText={val => handleChangeRestWords(val, idx)}
                    readOnly={isReadOnly}
                    showIcon={!isReadOnly}
                  />
                );
              })}
          </View>
        ))}
      </View>
      <View>
        <Text style={[styles.finalText, stylesHook.subtitle]}>{loc.entropy_grid.final_word_number}</Text>
        <TextInput
          style={styles.finalInput}
          onChangeText={handleChangeFWN}
          value={finalWordNumber}
          placeholder={walletSeedNum === 12 ? 'range: 1-128' : 'range: 1-8'}
          keyboardType="numeric"
        />
      </View>
      <View style={styles.bottom}>
        <BlueButton testID="EntropyGridWalletSeedCancel" onPress={handleCancelButton} title={loc.entropy_grid.cancel} />
        <BlueButton testID="EntropyGridWalletSeedOK" onPress={handleOKButton} title={loc.entropy_grid.ok} />
      </View>
    </SafeBlueArea>
  );
};

EntropyGridOfFinalWord.navigationOptions = navigationStyle(
  {
    gestureEnabled: false,
    swipeEnabled: false,
    headerHideBackButton: true,
  },
  opts => ({
    ...opts,
    title: loc.entropy_grid.final_word_title,
  }),
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    // height: '80%',
  },
  column: {
    flex: 1,
    paddingHorizontal: 16,
  },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
    paddingHorizontal: 16,
    marginBottom: 5,
  },
  autoInput: {
    height: 40,
    paddingHorizontal: 12,
    // marginVertical: 8,
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  inputStyle: { fontSize: 16 },
  labelStyle: { fontSize: 14 },
  placeholderStyle: { fontSize: 16 },
  textErrorStyle: { fontSize: 16 },
  finalText: {
    marginTop: 5,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  finalInput: {
    paddingHorizontal: 16,
  },
});

export default EntropyGridOfFinalWord;
