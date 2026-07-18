import React, { useLayoutEffect, useState, useCallback } from 'react';
import { Keyboard, NativeSyntheticEvent, StyleSheet } from 'react-native';
import presentAlert from '../../components/Alert';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { AvailableLanguages, TLanguage } from '../../loc/languages';
import { useSettings } from '../../hooks/context/useSettings';
import SafeAreaFlatList from '../../components/SafeAreaFlatList';
import { SettingsListItem, settingsListCard } from '../../components/SettingsSection';
import { useTheme } from '../../components/themes';

const Language = () => {
  const { setLanguageStorage, language } = useSettings();
  const { setOptions } = useExtendedNavigation();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const stylesHook = StyleSheet.create({
    card: { backgroundColor: colors.cardSectionBackground },
  });
  // Set header options - navigation stack already handles transparent header,
  // we just need to configure the search bar and ensure title is updated when language changes
  useLayoutEffect(() => {
    setOptions({
      title: loc.settings.language,
      headerSearchBarOptions: {
        onChangeText: (event: NativeSyntheticEvent<{ text: string }>) => setSearch(event.nativeEvent.text),
      },
    });
  }, [setOptions, language]);

  const filteredLanguages = AvailableLanguages.filter(l => l.label.toLowerCase().includes(search.toLowerCase()));

  const onLanguageSelect = useCallback(
    (item: TLanguage) => {
      Keyboard.dismiss();
      const currentLanguage = AvailableLanguages.find(l => l.value === language);
      setLanguageStorage(item.value).then(() => {
        if (currentLanguage?.isRTL !== item.isRTL) {
          presentAlert({ message: loc.settings.language_isRTL });
        }
      });
    },
    [language, setLanguageStorage],
  );

  const renderItem = useCallback(
    (props: { item: TLanguage; index: number }) => {
      const { item, index } = props;
      const isSelected = language === item.value;

      return (
        <SettingsListItem
          title={item.label}
          checkmark={isSelected}
          disabled={isSelected}
          onPress={() => onLanguageSelect(item)}
          bottomDivider={index < filteredLanguages.length - 1}
        />
      );
    },
    [language, filteredLanguages.length, onLanguageSelect],
  );

  const keyExtractor = useCallback((item: TLanguage) => item.value, []);

  return (
    <SafeAreaFlatList
      testID="LanguageFlatList"
      data={filteredLanguages}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={[settingsListCard, stylesHook.card]}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets
      automaticallyAdjustKeyboardInsets
    />
  );
};

export default Language;
