import React, { useState } from 'react';
import { Keyboard, TextInput, View, Text } from 'react-native';

import { generateChecksumWords } from '../../blue_modules/checksumWords';
import { randomBytes } from '../../class/rng';
import Button from '../../components/Button';
import loc from '../../loc';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { useSettingsStyles } from '../../hooks/useSettingsStyles';

const GenerateWord = () => {
  const { styles } = useSettingsStyles();

  const [mnemonic, setMnemonic] = useState('');
  const [result, setResult] = useState('');

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
    <SafeAreaScrollView
      style={styles.container}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustContentInsets
      automaticallyAdjustKeyboardInsets
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.contentContainer}>
        <View style={styles.card}>
          <View style={styles.infoContainer}>
            <TextInput
              style={styles.textInput}
              multiline
              editable
              placeholder={loc.autofill_word.enter}
              placeholderTextColor="#81868e"
              value={mnemonic}
              onChangeText={handleUpdateMnemonic}
              testID="MnemonicInput"
            />
          </View>

          <View style={styles.spacingSmall} />
          <Button title={loc.send.input_clear} onPress={clearMnemonicInput} />
          <View style={styles.spacingMedium} />
          <Text style={styles.infoTextCentered} testID="Result">
            {result}
          </Text>
          <View style={styles.spacingMedium} />
          <View>
            <Button
              disabled={mnemonic.trim().length === 0}
              title={loc.autofill_word.generate_word}
              onPress={checkMnemonic}
              testID="GenerateWord"
            />
          </View>
          <View style={styles.spacingMedium} />
        </View>
      </View>
    </SafeAreaScrollView>
  );
};

export default GenerateWord;
