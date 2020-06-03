import AsyncStorage from '@react-native-community/async-storage';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en';
import es from './es';
import id from './id_ID';
import jo from './jp_JP';
import ko from './ko_KR';
import pt from './pt_PT';
import tr from './tr_TR';
import vi from './vi_VN';
import zh from './zh_cn';

const languageDetector = {
  type: 'languageDetector' as any,
  async: true,
  detect: async (callback: (language: string) => void) => {
    const language = (await AsyncStorage.getItem('lang')) as string;
    callback(language);
  },
  init: () => null,
  cacheUserLanguage: () => null,
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    resources: {
      en,
      es,
      id,
      jo,
      ko,
      pt,
      tr,
      vi,
      zh,
    },
    debug: __DEV__,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
