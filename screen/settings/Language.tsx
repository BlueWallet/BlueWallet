import React, { useLayoutEffect, useState, useCallback, useMemo } from 'react';
import { Keyboard, NativeSyntheticEvent, StyleSheet, View, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import presentAlert from '../../components/Alert';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { AvailableLanguages, TLanguage } from '../../loc/languages';
import { useSettings } from '../../hooks/context/useSettings';
import SafeAreaFlatList from '../../components/SafeAreaFlatList';
import PlatformListItem from '../../components/PlatformListItem';
import { usePlatformStyles } from '../../theme/platformStyles';

const Language = () => {
  const { setLanguageStorage, language } = useSettings();
  const { setOptions } = useExtendedNavigation();
  const { colors: platformColors, sizing, layout } = usePlatformStyles();
  const [search, setSearch] = useState('');
  const insets = useSafeAreaInsets();

  // Calculate header height for Android with transparent header
  const headerHeight = useMemo(() => {
    if (Platform.OS === 'android') {
      const statusBarHeight = StatusBar.currentHeight ?? insets.top ?? 24; // Fallback to 24dp for older Android
      return 56 + statusBarHeight;
    }
    return 0;
  }, [insets.top]);

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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: platformColors.background,
    },
    listItemContainer: {
      backgroundColor: platformColors.cardBackground,
      minHeight: 44,
      paddingHorizontal: sizing.contentContainerPaddingHorizontal,
      marginHorizontal: sizing.contentContainerMarginHorizontal,
    },

    headerOffset: {
      height: sizing.firstSectionContainerPaddingTop,
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
        ...(layout.showBorderRadius && {
          borderTopLeftRadius: isFirst ? sizing.containerBorderRadius * 1.5 : 0,
          borderTopRightRadius: isFirst ? sizing.containerBorderRadius * 1.5 : 0,
          borderBottomLeftRadius: isLast ? sizing.containerBorderRadius * 1.5 : 0,
          borderBottomRightRadius: isLast ? sizing.containerBorderRadius * 1.5 : 0,
        }),
        paddingHorizontal: 16,
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
        />
      );
    },
    [
      language,
      filteredLanguages.length,
      layout.showBorderBottom,
      layout.showBorderRadius,
      styles.listItemContainer,
      onLanguageSelect,
      sizing.containerBorderRadius,
    ],
  );

  const keyExtractor = useCallback((item: TLanguage) => item.value, []);

  const ListHeaderComponent = useCallback(() => {
    return <View style={styles.headerOffset} />;
  }, [styles.headerOffset]);

  return (
    <SafeAreaFlatList
      testID="LanguageFlatList"
      headerHeight={headerHeight}
      style={styles.container}
      data={filteredLanguages}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeaderComponent}
      removeClippedSubviews
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets
      automaticallyAdjustKeyboardInsets
    />
  );
};

export default Language;
