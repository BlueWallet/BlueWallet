import { useNavigation } from '@react-navigation/native';
import React, { useContext, useEffect, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlueStorageContext } from '../../blue_modules/storage-context';
import presentAlert from '../../components/Alert';
import ListItem from '../../components/ListItem';
import { useTheme } from '../../components/themes';
import loc, { saveLanguage } from '../../loc';
import { AvailableLanguages, TLanguage } from '../../loc/languages';

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});

const Language = () => {
  const { setLanguage, language } = useContext(BlueStorageContext);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(loc.getLanguage());
  const { setOptions } = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const stylesHook = StyleSheet.create({
    flex: {
      backgroundColor: colors.background,
    },
    content: {
      paddingBottom: insets.bottom,
    },
  });

  useEffect(() => {
    setOptions({ title: loc.settings.language });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const onLanguageSelect = (item: TLanguage) => {
    const currentLanguage = AvailableLanguages.find(l => l.value === selectedLanguage);
    saveLanguage(item.value).then(() => {
      setSelectedLanguage(item.value);
      setLanguage();
      if (currentLanguage?.isRTL !== item.isRTL) {
        presentAlert({ message: loc.settings.language_isRTL });
      }
    });
  };

  const renderItem = ({ item }: { item: TLanguage }) => {
    return <ListItem title={item.label} checkmark={selectedLanguage === item.value} onPress={() => onLanguageSelect(item)} />;
  };

  return (
    <FlatList
      style={[styles.flex, stylesHook.flex]}
      contentContainerStyle={stylesHook.content}
      keyExtractor={(_item, index) => `${index}`}
      data={AvailableLanguages}
      renderItem={renderItem}
      initialNumToRender={25}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets
    />
  );
};

export default Language;
