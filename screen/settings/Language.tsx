import React, { useCallback, useEffect, useRef } from 'react';
import { FlatList, Keyboard, StyleSheet } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import presentAlert from '../../components/Alert';
import loc from '../../loc';
import { AvailableLanguages, TLanguage } from '../../loc/languages';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { useSettings } from '../../hooks/context/useSettings';
import SafeAreaFlatList from '../../components/SafeAreaFlatList';
import { SettingsListItem, settingsListCard } from '../../components/SettingsSection';
import { useTheme } from '../../components/themes';

type LanguageRouteProp = RouteProp<DetailViewStackParamList, 'Language'>;

const Language = () => {
  const { setLanguageStorage, language } = useSettings();
  const route = useRoute<LanguageRouteProp>();
  const search = route.params?.search ?? '';
  const listRef = useRef<FlatList<TLanguage>>(null);
  const { colors } = useTheme();
  const stylesHook = StyleSheet.create({
    card: { backgroundColor: colors.cardSectionBackground },
  });
  // Set header options - navigation stack already handles transparent header,
  // we just need to configure the search bar and ensure title is updated when language changes
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [search]);

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
      ref={listRef}
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
