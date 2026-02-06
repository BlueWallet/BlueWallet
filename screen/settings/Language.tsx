import React, { useLayoutEffect, useState, useCallback } from 'react';
import { Keyboard, NativeSyntheticEvent } from 'react-native';
import presentAlert from '../../components/Alert';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { AvailableLanguages, TLanguage } from '../../loc/languages';
import { useSettings } from '../../hooks/context/useSettings';
import { SettingsFlatList, SettingsListItem } from '../../components/platform';

const Language = () => {
  const { setLanguageStorage, language } = useSettings();
  const { setOptions } = useExtendedNavigation();
  const [search, setSearch] = useState('');
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
      const isFirst = index === 0;
      const isLast = index === filteredLanguages.length - 1;

      return (
        <SettingsListItem
          title={item.label}
          checkmark={isSelected}
          disabled={isSelected}
          onPress={() => onLanguageSelect(item)}
          position={isFirst && isLast ? 'single' : isFirst ? 'first' : isLast ? 'last' : 'middle'}
          accessibilityLabel={item.label}
        />
      );
    },
    [language, filteredLanguages.length, onLanguageSelect],
  );

  const keyExtractor = useCallback((item: TLanguage) => item.value, []);

  return (
    <SettingsFlatList
      testID="LanguageFlatList"
      data={filteredLanguages}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      removeClippedSubviews
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets
      automaticallyAdjustKeyboardInsets
    />
  );
};

export default Language;
