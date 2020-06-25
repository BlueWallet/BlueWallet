import AsyncStorage from '@react-native-community/async-storage';
import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, View, TouchableOpacity, Alert } from 'react-native';
import RNRestart from 'react-native-restart';
import { NavigationScreenProps } from 'react-navigation';

import { icons } from 'app/assets';
import { ScreenTemplate, Header, Image } from 'app/components';
import { typography } from 'app/styles';

const i18n = require('../../../loc');

interface Language {
  label: string;
  value: string;
}

interface LanguageItemProps {
  language: Language;
  selectedLanguageValue: string;
  onLanguageSelect: (value: string) => void;
}

const LanguageItem = ({ language, selectedLanguageValue, onLanguageSelect }: LanguageItemProps) => {
  const handleLanguageSelect = () => onLanguageSelect(language.value);
  return (
    <TouchableOpacity key={language.value} onPress={handleLanguageSelect} style={styles.langaugeItemContainer}>
      <Text style={styles.languageItem}>{language.label}</Text>
      {language.value === selectedLanguageValue && (
        <View style={styles.successImageContainer}>
          <Image source={icons.success} style={styles.successImage} />
        </View>
      )}
    </TouchableOpacity>
  );
};

export const SelectLanguageScreen = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLanguageValue, setselectedLanguageValue] = useState('en');
  const availableLanguages: Language[] = [
    { label: 'English (EN)', value: 'en' },
    { label: '中文 (ZH)', value: 'zh_cn' },
    { label: 'Español (ES)', value: 'es' },
    { label: 'Indonesian (ID)', value: 'id_id' },
    { label: '日本語 (JP)', value: 'ja' },
    { label: '한국어 (KO)', value: 'ko_kr' },
    { label: 'Português (PT)', value: 'pt_pt' },
    { label: 'Tiếng (Việt)', value: 'vi_vn' },
    { label: 'Türkçe (TR)', value: 'tr_tr' },
  ];

  useEffect(() => {
    (async () => {
      const language = await AsyncStorage.getItem('lang');
      setselectedLanguageValue(language || 'en');
      setIsLoading(false);
    })();
  }, [selectedLanguageValue]);

  const onLanguageSelect = (value: string) => {
    Alert.alert(
      i18n.selectLanguage.confirmation,
      i18n.selectLanguage.alertDescription,
      [
        {
          text: i18n.selectLanguage.confirm,
          onPress: () => {
            i18n.saveLanguage(value);
            setselectedLanguageValue(value);
            RNRestart.Restart();
          },
        },
        {
          text: i18n.selectLanguage.cancel,
          style: 'cancel',
        },
      ],
      { cancelable: false },
    );
  };

  if (isLoading) {
    return null;
  }

  return (
    <ScreenTemplate>
      {availableLanguages.map(language => (
        <LanguageItem
          language={language}
          selectedLanguageValue={selectedLanguageValue}
          onLanguageSelect={onLanguageSelect}
          key={language.value}
        />
      ))}
    </ScreenTemplate>
  );
};

SelectLanguageScreen.navigationOptions = (props: NavigationScreenProps) => ({
  header: <Header isBackArrow={true} navigation={props.navigation} title={i18n.selectLanguage.header} />,
});

const styles = StyleSheet.create({
  languageItem: {
    ...typography.caption,
    width: '100%',
  },
  langaugeItemContainer: {
    marginVertical: 8,
    flexDirection: 'row',
  },
  successImageContainer: {
    width: 21,
    height: 21,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingRight: 20,
  },
  successImage: {
    width: 15,
    height: 11,
  },
});
