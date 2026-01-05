import React, { useState, useMemo } from 'react';
import { Keyboard, StyleSheet, TextInput, View, Text, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { generateChecksumWords } from '../../blue_modules/checksumWords';
import { randomBytes } from '../../class/rng';
import Button from '../../components/Button';
import loc from '../../loc';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { BlueSpacing10, BlueSpacing20 } from '../../components/BlueSpacing';
import { useTheme } from '../../components/themes';
import { usePlatformTheme } from '../../theme';

const GenerateWord = () => {
  const { colors } = useTheme();
  const { colors: platformColors, sizing, layout } = usePlatformTheme();
  const insets = useSafeAreaInsets();

  // Calculate header height for Android with transparent header
  const headerHeight = useMemo(() => {
    if (Platform.OS === 'android' && insets.top > 0) {
      return 56 + (StatusBar.currentHeight || insets.top);
    }
    return 0;
  }, [insets.top]);

  const [mnemonic, setMnemonic] = useState('');
  const [result, setResult] = useState('');

  const localStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: platformColors.background,
    },
    contentContainer: {
      paddingHorizontal: sizing.basePadding,
    },
    card: {
      backgroundColor: platformColors.cardBackground,
      borderRadius: sizing.containerBorderRadius,
      padding: sizing.basePadding,
      ...layout.cardShadow,
    },
    input: {
      flexDirection: 'row',
      borderWidth: 1,
      borderBottomWidth: 0.5,
      alignItems: 'center',
      borderRadius: 4,
      marginBottom: 10,
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
    text: {
      flex: 1,
      padding: 8,
      minHeight: 33,
      color: colors.foregroundColor,
      height: 150,
    },
    resultText: {
      textAlign: 'center',
      color: platformColors.titleColor,
      fontSize: sizing.subtitleFontSize,
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
      style={localStyles.container}
      contentContainerStyle={localStyles.contentContainer}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustContentInsets
      automaticallyAdjustKeyboardInsets
      contentInsetAdjustmentBehavior="automatic"
      headerHeight={headerHeight}
    >
      <View style={localStyles.card}>
        <View style={localStyles.input}>
          <TextInput
            style={localStyles.text}
            multiline
            editable
            placeholder={loc.autofill_word.enter}
            placeholderTextColor={colors.placeholderTextColor}
            value={mnemonic}
            onChangeText={handleUpdateMnemonic}
            testID="MnemonicInput"
          />
        </View>

        <BlueSpacing10 />
        <Button title={loc.send.input_clear} onPress={clearMnemonicInput} />
        <BlueSpacing20 />
        <Text style={localStyles.resultText} testID="Result">
          {result}
        </Text>
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
    </SafeAreaScrollView>
  );
};

export default GenerateWord;
