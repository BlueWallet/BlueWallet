import React, { useState, useEffect, useCallback } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { SafeBlueArea, BlueListItem, BlueCard, BlueLoadingHook, BlueNavigationStyle, BlueText } from '../../BlueComponents';
import { AvailableLanguages } from '../../loc/languages';
import loc from '../../loc';

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});

const Language = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState(loc.getLanguage());

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const renderItem = useCallback(
    ({ item }) => {
      return (
        <BlueListItem
          onPress={() => {
            console.log('setLanguage', item.value);
            loc.saveLanguage(item.value);
            setLanguage(item.value);
          }}
          title={item.label}
          {...(language === item.value
            ? {
                rightIcon: { name: 'check', type: 'octaicon', color: '#0070FF' },
              }
            : { hideChevron: true })}
        />
      );
    },
    [language],
  );

  return isLoading ? (
    <BlueLoadingHook />
  ) : (
    <SafeBlueArea forceInset={{ horizontal: 'always' }} style={styles.flex}>
      <FlatList style={styles.flex} keyExtractor={(_item, index) => `${index}`} data={AvailableLanguages} renderItem={renderItem} />
      <BlueCard>
        <BlueText>{loc.settings.language_restart}</BlueText>
      </BlueCard>
    </SafeBlueArea>
  );
};

Language.navigationOptions = () => ({
  ...BlueNavigationStyle(),
  headerTitle: loc.settings.language,
});

export default Language;
