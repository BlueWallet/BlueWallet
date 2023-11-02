import React, { useState } from 'react';
import { useTheme } from '@react-navigation/native';
import { StyleSheet, View, KeyboardAvoidingView, Platform, TextInput, Keyboard } from 'react-native';

import loc from '../../loc';
import { BlueButton, BlueCard, BlueSpacing10, BlueSpacing20, BlueText, SafeBlueArea } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';

import { randomBytes } from '../../class/rng';
import { generateChecksumWords } from '../../blue_modules/checksumWords';

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

  const handleUpdateMnemonic = nextValue => {
    setMnemonic(nextValue);
    setResult();
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
    const randomindex = Math.round((random.readUInt8(0) / 255) * (possibleWords.length - 1));

    setResult(possibleWords[randomindex]);
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
            <BlueText style={styles.center} testID="Result">
              {result}
            </BlueText>
            <BlueSpacing20 />
            <View>
              <BlueButton
                disabled={mnemonic.trim().length === 0}
                title={loc.autofill_word.generate_word}
                onPress={checkMnemonic}
                testID="GenerateWord"
              />
            </View>
            <BlueSpacing20 />
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
  center: {
    textAlign: 'center',
  },
  text: {
    padding: 8,
    minHeight: 33,
    color: '#81868e',
  },
});
