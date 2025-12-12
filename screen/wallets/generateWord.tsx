import React, { useState } from 'react';
import { Keyboard, StyleSheet, TextInput, View } from 'react-native';

import { generateChecksumWords } from '../../blue_modules/checksumWords';
import { BlueCard, BlueText } from '../../BlueComponents';
import { randomBytes } from '../../class/rng';
import Button from '../../components/Button';
import loc from '../../loc';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { BlueSpacing10, BlueSpacing20 } from '../../components/BlueSpacing';
import { useTheme } from '../../components/themes';

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

  const handleUpdateMnemonic = (nextValue: string) => {
    setMnemonic(nextValue);
    setResult('');
  };

  const checkMnemonic = async () => {
    Keyboard.dismiss();

    const seedPhrase = mnemonic.toString();

    const possibleWords = generateChecksumWords(seedPhrase);

    if (!possibleWords) {
      // likely because of an invalid mnemonic
      setResult(loc.autofill_word.error);
      return;
    }

    const random = await randomBytes(1);
    const randomindex = Math.round((random[0] / 255) * (possibleWords.length - 1));

    setResult(possibleWords[randomindex]);
  };

  const clearMnemonicInput = () => {
    setMnemonic('');
    setResult('');
  };

  return (
    <SafeAreaScrollView
      style={styles.blueArea}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustContentInsets
      automaticallyAdjustKeyboardInsets
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.wrapper}>
        <BlueCard style={styles.mainCard}>
          <View style={[styles.input, stylesHooks.input]}>
            <TextInput
              style={styles.text}
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
          <Button title={loc.send.input_clear} onPress={clearMnemonicInput} />
          <BlueSpacing20 />
          <BlueText style={styles.center} testID="Result">
            {result}
          </BlueText>
          <BlueSpacing20 />
          <View>
            <Button
              disabled={mnemonic.trim().length === 0}
              title={loc.autofill_word.generate_word}
              onPress={checkMnemonic}
              testID="GenerateWord"
            />
          </View>
          <BlueSpacing20 />
        </BlueCard>
      </View>
    </SafeAreaScrollView>
  );
};

export default GenerateWord;

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
    marginBottom: 10,
  },
  center: {
    textAlign: 'center',
  },
  text: {
    padding: 8,
    minHeight: 33,
    color: '#81868e',
    width: '100%',
    height: 150,
  },
});
