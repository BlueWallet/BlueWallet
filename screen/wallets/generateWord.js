import React, { useState, useRef } from 'react';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import { StyleSheet, View, KeyboardAvoidingView, Platform, TextInput, Keyboard } from 'react-native';

import loc from '../../loc';
import { BlueButton, BlueCard, BlueSpacing10, BlueSpacing20, BlueText, SafeBlueArea } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';

import { randomBytes } from '../../class/rng';
import * as bip39 from 'bip39';
import { validateMnemonic } from '../../blue_modules/bip39';
import createHash from 'create-hash';

const GenerateWord = () => {
  const { colors } = useTheme();

  const [mnemonic, setMnemonic] = useState('');
  const [result, setResult] = useState('');

  const stylesHooks = StyleSheet.create({
    input: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
  });

  const handleUpdateMnemonic = nextValue =>  {
    setMnemonic(nextValue);
    setResult();
  }

  const checkMnemonic = async () => {
    Keyboard.dismiss();
    
    const seedPhrase = mnemonic.toString().trim().split(" ");
    
    function binarySearch(arr, el, compare_fn) {
      let m = 0;
      let n = arr.length - 1;
      while (m <= n) {
        const k = (n + m) >> 1; // eslint-disable-line no-bitwise
        const cmp = compare_fn(el, arr[k]);
        if (cmp > 0) {
          m = k + 1;
        } else if (cmp < 0) {
          n = k - 1;
        } else {
          return k;
        }
      }
      return ~m; // eslint-disable-line no-bitwise
    }
    
    if ((seedPhrase.length + 1) % 3 > 0) {
      throw new Error('Previous word list size must be multiple of three words, less one.');
    }

    const wordList = bip39.wordlists[bip39.getDefaultWordlist()];

    const concatLenBits = seedPhrase.length * 11;
    const concatBits = new Array(concatLenBits);
    let wordindex = 0;
    for (let i = 0; i < seedPhrase.length; i++) {
      const word = seedPhrase[i];
      const ndx = binarySearch(wordList, word, (el, test) => {
        return el === test ? 0 : el > test ? 1 : -1;
      });
      // Set the next 11 bits to the value of the index.
      for (let ii = 0; ii < 11; ++ii) {
        concatBits[wordindex * 11 + ii] = (ndx & (1 << (10 - ii))) !== 0; // eslint-disable-line no-bitwise
      }
      ++wordindex;
    }

    const checksumLengthBits = (concatLenBits + 11) / 33;
    const entropyLengthBits = concatLenBits + 11 - checksumLengthBits;
    const varyingLengthBits = entropyLengthBits - concatLenBits;
    const numPermutations = 2 ** varyingLengthBits;

    const bitPermutations = new Array(numPermutations);

    for (let i = 0; i < numPermutations; i++) {
      if (bitPermutations[i] === undefined || bitPermutations[i] === null) bitPermutations[i] = new Array(varyingLengthBits);
      for (let j = 0; j < varyingLengthBits; j++) {
        bitPermutations[i][j] = ((i >> j) & 1) === 1; // eslint-disable-line no-bitwise
      }
    }

    const possibleWords = [];
    for (let i = 0; i < bitPermutations.length; i++) {
      const bitPermutation = bitPermutations[i];
      const entropyBits = new Array(concatLenBits + varyingLengthBits);
      entropyBits.splice(0, 0, ...concatBits);
      entropyBits.splice(concatBits.length, 0, ...bitPermutation.slice(0, varyingLengthBits));

      const entropy = new Array(entropyLengthBits / 8);
      for (let ii = 0; ii < entropy.length; ++ii) {
        for (let jj = 0; jj < 8; ++jj) {
          if (entropyBits[ii * 8 + jj]) {
            entropy[ii] |= 1 << (7 - jj); // eslint-disable-line no-bitwise
          }
        }
      }

      const hash = createHash('sha256').update(entropy).digest();

      const hashBits = new Array(hash.length * 8);
      for (let iq = 0; iq < hash.length; ++iq) for (let jq = 0; jq < 8; ++jq) hashBits[iq * 8 + jq] = (hash[iq] & (1 << (7 - jq))) !== 0; // eslint-disable-line no-bitwise

      const wordBits = new Array(11);
      wordBits.splice(0, 0, ...bitPermutation.slice(0, varyingLengthBits));
      wordBits.splice(varyingLengthBits, 0, ...hashBits.slice(0, checksumLengthBits));

      let index = 0;
      for (let j = 0; j < 11; ++j) {
        index <<= 1; // eslint-disable-line no-bitwise
        if (wordBits[j]) {
          index |= 0x1; // eslint-disable-line no-bitwise
        }
      }

      possibleWords.push(wordList[index]);
    }
    
    const random = await randomBytes(1);
    const randomindex = Math.round((random.readUInt8(0)/255) * (possibleWords.length-1));

    const selectedRandomWord = possibleWords[randomindex];
    
    seedPhrase.push(selectedRandomWord);
    
    if (validateMnemonic(seedPhrase.join(" "))) {
        setResult(selectedRandomWord);
    } else setResult();

  };

  const clearMnemonicInput = () => {
    setMnemonic('');
    setResult();
  };

  return (
    <SafeBlueArea style={styles.blueArea}>
      <KeyboardAvoidingView
        enabled={!Platform.isPad}
        behavior={Platform.OS === 'ios' ? 'position' : null}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.wrapper}>
          <BlueCard style={styles.mainCard}>
            <View style={[styles.input, stylesHooks.input]}>
              <TextInput
                style={styles.text}
                maxHeight={100}
                minHeight={100}
                maxWidth="100%"
                minWidth="100%"
                multiline
                editable
                placeholder={loc.autofill_word.enter}
                placeholderTextColor="#81868e"
                value={mnemonic}
                onChangeText={handleUpdateMnemonic}
                testID="MnemonicInput"
              />
            </View>

            <BlueSpacing10 />
            <BlueButton title={loc.send.input_clear} onPress={clearMnemonicInput} />
            <BlueSpacing20 />
            <BlueButton
              disabled={mnemonic.trim().length === 0}
              title={loc.autofill_word.generate_word}
              onPress={checkMnemonic}
              testID="GenerateWord"
            />
            <BlueSpacing20 />
            <BlueText testID="Result">{result}</BlueText>
          </BlueCard>
        </View>
      </KeyboardAvoidingView>
    </SafeBlueArea>
  );
};

export default GenerateWord;
GenerateWord.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.autofill_word.title }));

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  blueArea: {
    paddingTop: 19,
  },
  mainCard: {
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  input: {
    flexDirection: 'row',
    borderWidth: 1,
    borderBottomWidth: 0.5,
    alignItems: 'center',
    borderRadius: 4,
  },
  text: {
    padding: 8,
    minHeight: 33,
    color: '#81868e',
  },
});
