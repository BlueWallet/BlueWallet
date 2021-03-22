/* global alert */
import React, { useState, useEffect, useContext } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';

import navigationStyle from '../../components/navigationStyle';
import { SafeBlueArea, BlueListItem, BlueLoading } from '../../BlueComponents';
import loc from '../../loc';
import { AvailableLanguages } from '../../loc/languages';
import { BlueStorageContext } from '../../blue_modules/storage-context';

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});

const Language = () => {
  const { setLanguage, language } = useContext(BlueStorageContext);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState(loc.getLanguage());
  const { setOptions } = useNavigation();
  const { colors } = useTheme();
  const stylesHook = StyleSheet.create({
    flex: {
      backgroundColor: colors.background,
    },
  });
  useEffect(() => {
    setIsLoading(false);
  }, []);

  useEffect(() => {
    setOptions({ title: loc.settings.language });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const renderItem = item => {
    return (
      <BlueListItem
        onPress={() => {
          const currentLanguage = AvailableLanguages.find(language => language.value === selectedLanguage);
          if (currentLanguage.isRTL || item.item.isRTL) {
            alert(loc.settings.language_isRTL);
          }

          loc.saveLanguage(item.item.value).then(() => {
            setSelectedLanguage(item.item.value);
            setLanguage();
          });
        }}
        title={item.item.label}
        checkmark={selectedLanguage === item.item.value}
      />
    );
  };

  return isLoading ? (
    <BlueLoading />
  ) : (
    <SafeBlueArea>
      <FlatList
        style={[styles.flex, stylesHook.flex]}
        keyExtractor={(_item, index) => `${index}`}
        data={AvailableLanguages}
        renderItem={renderItem}
        initialNumToRender={25}
      />
    </SafeBlueArea>
  );
};

Language.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.settings.language }));

export default Language;
