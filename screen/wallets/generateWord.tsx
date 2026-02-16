import React, { useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';

import { generateChecksumWords } from '../../blue_modules/checksumWords';
import { randomBytes } from '../../class/rng';
import Button from '../../components/Button';
import loc from '../../loc';
import { BlueSpacing10, BlueSpacing20 } from '../../components/BlueSpacing';
import { BlueFormMultiInput, BlueTextCentered } from '../../BlueComponents';
import { platformSizing, platformLayout } from '../../components/platform';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { useTheme } from '../../components/themes';

const GenerateWord = () => {
  const [mnemonic, setMnemonic] = useState('');
  const [result, setResult] = useState('');
  const { colors } = useTheme();
  const cardColor = colors.lightButton ?? colors.modal ?? colors.elevated ?? colors.background;

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
    <SafeAreaScrollView style={[styles.flex1, { backgroundColor: colors.background }]} keyboardShouldPersistTaps="handled">
      <View
        style={{
          paddingTop: platformSizing.firstSectionContainerPaddingTop,
          marginHorizontal: platformSizing.contentContainerMarginHorizontal || 0,
          marginBottom: platformSizing.sectionContainerMarginBottom,
          backgroundColor: colors.background,
        }}
      >
        <View
          style={{
            backgroundColor: cardColor,
            borderRadius: platformSizing.containerBorderRadius,
            padding: platformSizing.basePadding,
            ...platformLayout.cardShadow,
          }}
        >
          <BlueFormMultiInput
            editable
            placeholder={loc.autofill_word.enter}
            value={mnemonic}
            onChangeText={handleUpdateMnemonic}
            testID="MnemonicInput"
          />

          <BlueSpacing10 />
          <Button title={loc.send.input_clear} onPress={clearMnemonicInput} />
          <BlueSpacing20 />
          <BlueTextCentered testID="Result">{result}</BlueTextCentered>
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
        </View>
      </View>
    </SafeAreaScrollView>
  );
};

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
});

export default GenerateWord;
