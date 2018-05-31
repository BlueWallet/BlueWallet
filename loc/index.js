import LocalizedStrings from 'react-localization';
import { AsyncStorage } from 'react-native';
import { Util } from 'expo';
import { AppStorage } from '../class';
let strings;

// first-time loading sequence
(async () => {
  // finding out whether lang preference was saved
  let lang = await AsyncStorage.getItem(AppStorage.LANG);
  if (lang) {
    strings.setLanguage(lang);
    return;
  }

  // TODO: rewrite this when Expo version is upped
  if (Util.getCurrentLocaleAsync) {
    let locale = await Util.getCurrentLocaleAsync();
    if (locale) {
      locale = locale.split('-');
      locale = locale[0];
      console.log('current locale:', locale);
      if (
        locale === 'en' ||
        locale === 'ru' ||
        locale === 'es' ||
        locale === 'pt'
      ) {
        strings.setLanguage(locale);
      } else {
        strings.setLanguage('en');
      }
    }
  }
})();

strings = new LocalizedStrings({
  en: require('./en.js'),
  ru: require('./ru.js'),
  pt: require('./pt_BR.js'),
  es: require('./es.js'),
});

strings.saveLanguage = lang => AsyncStorage.setItem(AppStorage.LANG, lang);

module.exports = strings;
