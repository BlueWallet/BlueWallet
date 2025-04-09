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
    itemContainer: {
      // Apply fixed height to ensure consistency
      minHeight: sizing.itemMinHeight,
      height: sizing.itemMinHeight,
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
              containerStyle={[
                {
                  backgroundColor: platformColors.cardBackground,
                },
                styles.itemContainer,
              ]}
              checkmark={isSelected}
              disabled={isSelected}
              onPress={() => onLanguageSelect(item)}
              isFirst={isFirst}
              isLast={isLast}
              chevron={false} // Don't show chevron to keep consistent height
              bottomDivider={layout.showBorderBottom}
            />
          );
        })}
      </View>
    </SafeAreaScrollView>
  );
};

export default Language;
