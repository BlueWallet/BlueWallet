import React, { useState } from 'react';
import { Keyboard, TextInput, View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { generateChecksumWords } from '../../blue_modules/checksumWords';
import { randomBytes } from '../../class/rng';
import Button from '../../components/Button';
import loc from '../../loc';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { useSettingsStyles } from '../../hooks/useSettingsStyles';
import { usePlatformTheme } from '../../components/platformThemes';

const GenerateWord = () => {
  const { styles } = useSettingsStyles();
  const { colors } = usePlatformTheme();

  const [mnemonic, setMnemonic] = useState('');
  const [result, setResult] = useState('');

  const handleUpdateMnemonic = nextValue => {
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
    const randomindex = Math.round((random.readUInt8(0) / 255) * (possibleWords.length - 1));

    setResult(possibleWords[randomindex]);
  };

  const clearMnemonicInput = () => {
    setMnemonic('');
    setResult('');
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
          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.textInput}
              multiline
              editable
              placeholder={loc.autofill_word.enter}
              placeholderTextColor={colors.subtitleColor}
              value={mnemonic}
              onChangeText={handleUpdateMnemonic}
              testID="MnemonicInput"
            />
            {mnemonic.length > 0 && (
              <TouchableOpacity onPress={clearMnemonicInput} style={styles.clearButton}>
                <Icon name="close" size={20} color={colors.subtitleColor} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.buttonSpacingSmall} />
          
          <View style={styles.buttonSpacing} />
          {result ? (
            <Text style={styles.addressOwnershipText} testID="Result">
              {result}
            </Text>
          ) : null}
          {result ? <View style={styles.buttonSpacing} /> : null}
          
          <View>
            <Button
              disabled={mnemonic.trim().length === 0}
              title={loc.autofill_word.generate_word}
              onPress={checkMnemonic}
              testID="GenerateWord"
            />
          </View>
          <View style={styles.buttonSpacing} />
        </View>
      </View>
    </SafeAreaScrollView>
  );
};

export default GenerateWord;
