import React, { useEffect, useLayoutEffect, useState, useCallback } from 'react';
import { Keyboard, NativeSyntheticEvent, StyleSheet, View } from 'react-native';
import presentAlert from '../../components/Alert';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { AvailableLanguages, TLanguage } from '../../loc/languages';
import { useSettings } from '../../hooks/context/useSettings';
import SafeAreaFlatList from '../../components/SafeAreaFlatList';
import PlatformListItem from '../../components/PlatformListItem';
import { usePlatformTheme } from '../../components/platformThemes';

const Language = () => {
  const { setLanguageStorage, language } = useSettings();
  const { setOptions } = useExtendedNavigation();
  const { colors: platformColors, sizing, layout } = usePlatformTheme();
  const [search, setSearch] = useState('');

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

  const filteredLanguages = AvailableLanguages.filter(l => l.label.toLowerCase().includes(search.toLowerCase()));

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: platformColors.background,
    },
    listItemContainer: {
      backgroundColor: platformColors.cardBackground,
      minHeight: 77,
    },
    headerOffset: {
      height: sizing.firstSectionContainerPaddingTop,
    },
    contentContainer: {
      marginHorizontal: 16,
    },
  });

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

      // Create a container style that applies corner radius only to first and last items
      const containerStyle = {
        ...styles.listItemContainer,
        borderTopLeftRadius: isFirst ? sizing.containerBorderRadius * 1.5 : 0,
        borderTopRightRadius: isFirst ? sizing.containerBorderRadius * 1.5 : 0,
        borderBottomLeftRadius: isLast ? sizing.containerBorderRadius * 1.5 : 0,
        borderBottomRightRadius: isLast ? sizing.containerBorderRadius * 1.5 : 0,
      };

      return (
        <PlatformListItem
          title={item.label}
          containerStyle={containerStyle}
          checkmark={isSelected}
          disabled={isSelected}
          onPress={() => onLanguageSelect(item)}
          isFirst={isFirst}
          isLast={isLast}
          bottomDivider={layout.showBorderBottom && !isLast}
          accessibilityLabel={item.label}
          accessibilityHint={isSelected ? language : loc.settings.tap_to_select_language}
        />
      );
    },
    [language, filteredLanguages.length, layout.showBorderBottom, styles.listItemContainer, onLanguageSelect, sizing.containerBorderRadius],
  );

  const keyExtractor = useCallback((item: TLanguage) => item.value, []);

  const ListHeaderComponent = useCallback(() => {
    return <View style={styles.headerOffset} />;
  }, [styles.headerOffset]);

  return (
    <SafeAreaFlatList
      style={styles.container}
      data={filteredLanguages}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeaderComponent}
      contentContainerStyle={styles.contentContainer}
      removeClippedSubviews
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets
      automaticallyAdjustKeyboardInsets
    />
  );
};

export default Language;
