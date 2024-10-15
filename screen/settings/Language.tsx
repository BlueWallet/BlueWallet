import React, { useEffect, useLayoutEffect, useState } from 'react';
import { FlatList, Keyboard, NativeSyntheticEvent, StyleSheet } from 'react-native';
import presentAlert from '../../components/Alert';
import ListItem from '../../components/ListItem';
import { useTheme } from '../../components/themes';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { AvailableLanguages, TLanguage } from '../../loc/languages';
import { useSettings } from '../../hooks/context/useSettings';

const Language = () => {
  const { setLanguageStorage, language } = useSettings();
  const { setOptions } = useExtendedNavigation();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const stylesHook = StyleSheet.create({
    content: {
      backgroundColor: colors.background,
    },
  });

  useLayoutEffect(() => {
    setOptions({
      headerSearchBarOptions: {
        onChangeText: (event: NativeSyntheticEvent<{ text: string }>) => setSearch(event.nativeEvent.text),
      },
    });
  }, [setOptions]);

  useEffect(() => {
    setOptions({ title: loc.settings.language });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const onLanguageSelect = (item: TLanguage) => {
    Keyboard.dismiss();
    const currentLanguage = AvailableLanguages.find(l => l.value === language);
    setLanguageStorage(item.value).then(() => {
      if (currentLanguage?.isRTL !== item.isRTL) {
        presentAlert({ message: loc.settings.language_isRTL });
      }
    });
  };

  const renderItem = ({ item }: { item: TLanguage }) => {
    return (
      <ListItem
        disabled={language === item.value}
        title={item.label}
        checkmark={language === item.value}
        onPress={() => onLanguageSelect(item)}
        containerStyle={[styles.row, stylesHook.content]}
      />
    );
  };

  return (
    <FlatList
      style={styles.flex}
      contentContainerStyle={stylesHook.content}
      keyExtractor={(_item, index) => `${index}`}
      data={AvailableLanguages.filter(l => l.label.toLowerCase().includes(search.toLowerCase()))}
      renderItem={renderItem}
      initialNumToRender={25}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets
    />
  );
};

export default Language;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  row: { minHeight: 60 },
});
