import React, { useState } from 'react';
import { Keyboard, StyleSheet, TextInput, View } from 'react-native';

import { generateChecksumWords } from '../../blue_modules/checksumWords';
import { randomBytes } from '../../class/rng';
import Button from '../../components/Button';
import loc from '../../loc';
import { BlueSpacing10, BlueSpacing20 } from '../../components/BlueSpacing';
import { BlueTextCentered } from '../../BlueComponents';
import { SettingsScrollView } from '../../components/platform';
import { useTheme } from '../../components/themes';

const GenerateWord = () => {
  const [mnemonic, setMnemonic] = useState('');
  const [result, setResult] = useState('');
  const { colors } = useTheme();

  const handleUpdateMnemonic = (nextValue: string) => {
    setMnemonic(nextValue);
    setResult('');
  };

  const checkMnemonic = async () => {
    Keyboard.dismiss();

    const seedPhrase = mnemonic.toString();

    const possibleWords = generateChecksumWords(seedPhrase);

    if (!possibleWords) {
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
    <SettingsScrollView keyboardShouldPersistTaps="handled">
      <View style={styles.container}>
        <TextInput
          multiline
          underlineColorAndroid="transparent"
          numberOfLines={4}
          editable
          placeholder={loc.autofill_word.enter}
          value={mnemonic}
          onChangeText={handleUpdateMnemonic}
          testID="MnemonicInput"
          autoCorrect={false}
          autoCapitalize="none"
          spellCheck={false}
          placeholderTextColor={colors.placeholderTextColor}
          style={[
            styles.textInput,
            {
              borderColor: colors.formBorder,
              borderBottomColor: colors.formBorder,
              backgroundColor: colors.inputBackgroundColor,
              color: colors.foregroundColor,
            },
          ]}
        />

        <BlueSpacing20 />

        <Button
          disabled={mnemonic.trim().length === 0}
          title={loc.autofill_word.generate_word}
          onPress={checkMnemonic}
          testID="GenerateWord"
        />

        <BlueSpacing10 />

        <Button title={loc.send.input_clear} onPress={clearMnemonicInput} />

        {result.length > 0 && (
          <>
            <BlueSpacing20 />
            <BlueTextCentered testID="Result">{result}</BlueTextCentered>
          </>
        )}

        <BlueSpacing20 />
      </View>
    </SettingsScrollView>
  );
};

export default GenerateWord;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  textInput: {
    paddingHorizontal: 8,
    paddingVertical: 16,
    borderWidth: 1,
    borderBottomWidth: 0.5,
    borderRadius: 4,
    textAlignVertical: 'top',
    minHeight: 100,
  },
});
