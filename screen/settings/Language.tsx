import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Keyboard, NativeSyntheticEvent, StyleSheet, View } from 'react-native';
import presentAlert from '../../components/Alert';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { AvailableLanguages, TLanguage } from '../../loc/languages';
import { useSettings } from '../../hooks/context/useSettings';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
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

  const onLanguageSelect = (item: TLanguage) => {
    Keyboard.dismiss();
    const currentLanguage = AvailableLanguages.find(l => l.value === language);
    setLanguageStorage(item.value).then(() => {
      if (currentLanguage?.isRTL !== item.isRTL) {
        presentAlert({ message: loc.settings.language_isRTL });
      }
    });
  };

  const filteredLanguages = AvailableLanguages.filter(l => l.label.toLowerCase().includes(search.toLowerCase()));

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: platformColors.background,
    },
    sectionContainer: {
      marginHorizontal: 16,
      marginBottom: sizing.sectionContainerMarginBottom,
      paddingTop: sizing.firstSectionContainerPaddingTop,
    },
    listItemContainer: {
      backgroundColor: platformColors.cardBackground,
      minHeight: 77,
    },
  });

  return (
    <SafeAreaScrollView style={styles.container}>
      <View style={styles.sectionContainer}>
        {filteredLanguages.map((item, index) => {
          const isSelected = language === item.value;
          const isFirst = index === 0;
          const isLast = index === filteredLanguages.length - 1;

          return (
            <PlatformListItem
              key={item.value}
              title={item.label}
              containerStyle={styles.listItemContainer}
              checkmark={isSelected}
              disabled={isSelected}
              onPress={() => onLanguageSelect(item)}
              isFirst={isFirst}
              isLast={isLast}
              bottomDivider={layout.showBorderBottom}
              accessibilityLabel={item.label}
              accessibilityHint={isSelected ? language : loc.settings.tap_to_select_language}
            />
          );
        })}
      </View>
    </SafeAreaScrollView>
  );
};

export default Language;
