import i18n from 'i18next';
import { reactI18nextModule } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';

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
  type: 'languageDetector',
  async: false,
  detect: () => RNLocalize.getLocales()[0].languageCode,
  init: () => null,
  cacheUserLanguage: () => null,
};

i18n
  .use(languageDetector)
  .use(reactI18nextModule)
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
